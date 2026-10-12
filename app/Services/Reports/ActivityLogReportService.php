<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Export\ExportFormat;
use App\Domain\Export\ExportStatus;
use App\Domain\Export\TemplateKind;
use App\Domain\Nscmf\Enums\ServiceImpactCode;
use App\Domain\Reports\ActivityLogFilters;
use App\Domain\Reports\ActivityLogMappingV1;
use App\Domain\Reports\ActivityLogSnapshot;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Infrastructure\Storage\PrivateStorage;
use App\Jobs\GenerateActivityLogExport;
use App\Models\Nscmf\NscmfRecord;
use App\Models\Reports\ActivityLogExport;
use App\Models\User;
use App\Repositories\Contracts\Reports\ActivityLogRepository;
use App\Services\Audit\AccessAuditService;
use App\Services\Export\ExportService;
use App\Services\Export\TemplateRegistryService;
use App\Support\Pagination;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;
use RuntimeException;

/**
 * The Activity Log report (12 §47.2, 02 §20A): the digital NSCMF Activity Logging Form. Every
 * entry follows record visibility (12 §17.1); Team never participates.
 *
 * @phpstan-import-type LogFilters from ActivityLogFilters
 * @phpstan-import-type LogQuery from ActivityLogFilters
 * @phpstan-import-type LogPerson from ActivityLogMappingV1
 */
final readonly class ActivityLogReportService
{
    public function __construct(
        private ActivityLogRepository $entries,
        private SpreadsheetRenderer $renderer,
        private TemplateRegistryService $templates,
        private PrivateStorage $storage,
        private AccessAuditService $accessAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @param  LogQuery  $query
     * @return array<string, mixed>
     */
    public function page(User $actor, array $query): array
    {
        if (! $actor->can('nscmf.view.history')) {
            throw DomainRuleException::forbidden();
        }
        $filters = self::filtersOf($query);
        $paginator = $this->entries->paginateEntries($actor->id, $filters, $query['page'], $query['per_page']);
        $summary = $this->entries->summary($actor->id, $filters);

        return [
            'items' => $this->rows(array_values($paginator->items())),
            'meta' => Pagination::meta($paginator),
            'query' => $query,
            'summary' => [
                'total' => $summary['total'],
                'period_from' => $filters['request_date_from'] ?? $summary['first_date'],
                'period_until' => $filters['request_date_to'] ?? $summary['last_date'],
                'site_defaults' => ['noc15' => $summary['noc15'], 'noc23' => $summary['noc23']],
            ],
            'pdf_available' => $this->renderer->isAvailable(),
            'max_entries' => ActivityLogFilters::MAX_ENTRIES,
        ];
    }

    /**
     * Binds the entries and header as an immutable snapshot in one short transaction and queues
     * the worker after commit (12 §47.2, 11 §44A).
     *
     * @param  LogFilters|null  $filters  the FILTERED scope, or null for SELECTED
     * @param  list<int>  $recordIds  the SELECTED scope
     * @param  array{noc15: bool, noc23: bool}  $site
     * @param  LogPerson  $preparedBy
     * @param  LogPerson  $acknowledgedBy
     */
    public function request(User $actor, ExportFormat $format, ?array $filters, array $recordIds, array $site, array $preparedBy, array $acknowledgedBy): ActivityLogExport
    {
        self::authorizeExport($actor);
        $template = $this->templates->activeVerified(TemplateKind::ACTIVITY_LOG);
        if ($format === ExportFormat::PDF && ! $this->renderer->isAvailable()) {
            throw new DomainRuleException('EXPORT_NOT_READY', 'PDF export is not available yet.', 409);
        }

        return $this->database->connection()->transaction(function () use ($actor, $format, $filters, $recordIds, $site, $preparedBy, $acknowledgedBy, $template): ActivityLogExport {
            $records = $filters === null ? $this->selected($actor, $recordIds) : $this->entries->entries($actor->id, $filters, ActivityLogFilters::MAX_ENTRIES + 1);
            if ($records === []) {
                throw new DomainRuleException('REPORT_EMPTY', 'No entry matches. Change the filters or the selection.', 422);
            }
            if (count($records) > ActivityLogFilters::MAX_ENTRIES) {
                throw new DomainRuleException('REPORT_TOO_LARGE', 'An export holds at most '.ActivityLogFilters::MAX_ENTRIES.' entries. Narrow the filters.', 422);
            }

            $entries = $this->rows($records);
            $dates = array_values(array_filter(array_column($entries, 'request_date'), 'is_string'));
            $snapshot = [
                'schema' => ActivityLogSnapshot::SCHEMA,
                'header' => [
                    'period_from' => $filters['request_date_from'] ?? ($dates === [] ? null : min($dates)),
                    'period_until' => $filters['request_date_to'] ?? ($dates === [] ? null : max($dates)),
                    'site' => $site,
                    'prepared_by' => $preparedBy,
                    'acknowledged_by' => $acknowledgedBy,
                ],
                'entries' => array_map(fn (array $row): array => [
                    'record_id' => $row['id'],
                    'request_no' => $row['request_no'],
                    'request_date' => $row['request_date'],
                    'family' => $row['family'],
                    'subtype' => $row['subtype'],
                    'customer_name' => $row['customer_name'],
                    'noc_infrastructure' => $row['noc_infrastructure'],
                ], $entries),
            ];
            $export = $this->entries->createExport([
                'requested_by_user_id' => $actor->id,
                'format' => $format,
                'status' => ExportStatus::QUEUED,
                'progress_percent' => 0,
                'template_version_id' => $template->id,
                'snapshot_schema_version' => ActivityLogSnapshot::SCHEMA,
                'snapshot_json' => $snapshot,
                'snapshot_sha256' => hash('sha256', ExportService::canonicalJson($snapshot)),
                'entry_count' => count($entries),
                'requested_at' => CarbonImmutable::now(),
            ]);
            $this->accessAudit->record($actor->id, AccessAuditEvent::ACTIVITY_LOG_EXPORT_REQUESTED, activityLogExportId: $export->id);
            GenerateActivityLogExport::dispatch($export->id)->afterCommit();

            return $export;
        });
    }

    /** @return array<string, mixed> */
    public function show(User $actor, int $exportId): array
    {
        return self::project($this->ownExport($actor, $exportId));
    }

    /**
     * The actor's own report exports still inside the retention window, newest first.
     *
     * @return list<array<string, mixed>>
     */
    public function recent(User $actor): array
    {
        self::authorizeExport($actor);
        $now = CarbonImmutable::now();
        $since = $now->subHours(config()->integer('nscmf.exports.retention_hours'));

        return array_map(self::project(...), $this->entries->recentOwnExports($actor->id, $since, $now));
    }

    /** @return array{stream: resource, filename: string, mime: string} */
    public function download(User $actor, int $exportId): array
    {
        $export = $this->ownExport($actor, $exportId);
        if ($export->status === ExportStatus::EXPIRED || $export->binary_purged_at !== null || ($export->expires_at !== null && $export->expires_at->isPast())) {
            throw new DomainRuleException('EXPORT_EXPIRED', 'This export expired. Request a new one.', 410);
        }
        if ($export->status === ExportStatus::FAILED) {
            throw new DomainRuleException('EXPORT_FAILED', 'This export failed. Request a new one.', 409);
        }
        if ($export->status !== ExportStatus::READY || $export->private_object_key === null) {
            throw new DomainRuleException('EXPORT_NOT_READY', 'This export is not ready yet.', 409);
        }
        try {
            $stream = $this->storage->readStream($export->private_object_key);
        } catch (RuntimeException) {
            throw new DomainRuleException('EXPORT_EXPIRED', 'This export is no longer available. Request a new one.', 410);
        }
        $this->accessAudit->record($actor->id, AccessAuditEvent::ACTIVITY_LOG_EXPORT_DOWNLOADED, activityLogExportId: $export->id);

        return ['stream' => $stream, 'filename' => self::fileName($export), 'mime' => $export->format->mimeType()];
    }

    /** @return array<string, mixed> */
    public static function project(ActivityLogExport $export): array
    {
        return [
            'id' => $export->id,
            'format' => $export->format->value,
            'status' => $export->status->value,
            'progress_percent' => $export->progress_percent,
            'stage' => self::stage($export),
            'entry_count' => $export->entry_count,
            'requested_at' => $export->requested_at->toIso8601String(),
            'ready_at' => $export->ready_at?->toIso8601String(),
            'expires_at' => $export->expires_at?->toIso8601String(),
            'failure_code' => $export->failure_code,
            'download_url' => $export->status === ExportStatus::READY ? "/reports/activity-log/exports/{$export->id}/download" : null,
        ];
    }

    /** The stage in words, derived from status, format and progress (12 §47.2). */
    private static function stage(ActivityLogExport $export): string
    {
        if ($export->status !== ExportStatus::PROCESSING) {
            return $export->status->value;
        }

        return match (true) {
            $export->progress_percent < 10 => 'PREPARING',
            $export->progress_percent < 70 => 'FILLING',
            $export->progress_percent < 90 && $export->format === ExportFormat::PDF => 'RENDERING',
            default => 'SAVING',
        };
    }

    private static function fileName(ActivityLogExport $export): string
    {
        $header = is_array($export->snapshot_json['header'] ?? null) ? $export->snapshot_json['header'] : [];
        $from = is_string($header['period_from'] ?? null) ? $header['period_from'] : 'undated';
        $until = is_string($header['period_until'] ?? null) ? $header['period_until'] : 'undated';

        return (string) preg_replace('/[^A-Za-z0-9._-]+/', '-', "nscmf-activity-log-{$from}-{$until}").'.'.strtolower($export->format->value);
    }

    private function ownExport(User $actor, int $exportId): ActivityLogExport
    {
        $export = $this->entries->findExport($exportId);
        if ($export === null || $export->requested_by_user_id !== $actor->id) {
            throw DomainRuleException::notFound();
        }
        self::authorizeExport($actor);

        return $export;
    }

    private static function authorizeExport(User $actor): void
    {
        if (! $actor->can('nscmf.view.history') || ! $actor->can('nscmf.export')) {
            throw DomainRuleException::forbidden();
        }
    }

    /**
     * Every selected record, visible to the actor; a missing or invisible id refuses the whole
     * request with one message, so existence never leaks (10 §61A).
     *
     * @param  list<int>  $recordIds
     * @return list<NscmfRecord>
     */
    private function selected(User $actor, array $recordIds): array
    {
        $records = $this->entries->entriesByIds($actor->id, $recordIds);
        if (count($records) !== count(array_unique($recordIds))) {
            throw new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, errors: [
                'record_ids' => ['Some selected entries are not available any more.'],
            ]);
        }

        return $records;
    }

    /**
     * @param  list<NscmfRecord>  $records
     * @return list<array{id: int, request_no: string, request_date: string|null, family: string, subtype: string, customer_name: string|null, noc_infrastructure: list<string>, business_status: string, is_archived: bool}>
     */
    private function rows(array $records): array
    {
        $impacts = $this->entries->serviceImpacts(array_map(fn (NscmfRecord $record): int => $record->id, $records));

        return array_map(fn (NscmfRecord $record): array => [
            'id' => $record->id,
            'request_no' => $record->request_no,
            'request_date' => $record->request_date?->toDateString(),
            'family' => $record->family->value,
            'subtype' => $record->subtype->value,
            'customer_name' => ActivityLogMappingV1::customerName(
                $record->family->value,
                self::stringAttribute($record, 'log_customer_name'),
                self::stringAttribute($record, 'log_maintenance_purpose'),
            ),
            'noc_infrastructure' => self::catalogOrder($impacts[$record->id] ?? []),
            'business_status' => $record->business_status->value,
            'is_archived' => $record->is_archived,
        ], $records);
    }

    /**
     * Service Impact codes in the form's catalog order.
     *
     * @param  list<string>  $codes
     * @return list<string>
     */
    private static function catalogOrder(array $codes): array
    {
        return array_values(array_filter(
            array_map(fn (ServiceImpactCode $code): string => $code->value, ServiceImpactCode::cases()),
            fn (string $code): bool => in_array($code, $codes, true),
        ));
    }

    private static function stringAttribute(NscmfRecord $record, string $key): ?string
    {
        $value = $record->getAttribute($key);

        return is_string($value) ? $value : null;
    }

    /**
     * @param  LogQuery  $query
     * @return LogFilters
     */
    private static function filtersOf(array $query): array
    {
        return [
            'q' => $query['q'],
            'family' => $query['family'],
            'subtype' => $query['subtype'],
            'statuses' => $query['statuses'],
            'archived' => $query['archived'],
            'request_date_from' => $query['request_date_from'],
            'request_date_to' => $query['request_date_to'],
        ];
    }
}
