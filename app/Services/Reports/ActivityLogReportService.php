<?php

declare(strict_types=1);

namespace App\Services\Reports;

use App\Domain\Nscmf\Enums\ServiceImpactCode;
use App\Domain\Reports\ActivityLogFilters;
use App\Domain\Reports\ActivityLogMappingV1;
use App\Domain\Shared\DomainRuleException;
use App\Infrastructure\Pdf\SpreadsheetRenderer;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Reports\ActivityLogRepository;
use App\Support\Pagination;

/**
 * The Activity Log report (12 §47.2, 02 §20A): the digital NSCMF Activity Logging Form. Every
 * entry follows record visibility (12 §17.1); Team never participates.
 *
 * @phpstan-import-type LogFilters from ActivityLogFilters
 * @phpstan-import-type LogQuery from ActivityLogFilters
 */
final readonly class ActivityLogReportService
{
    public function __construct(
        private ActivityLogRepository $entries,
        private SpreadsheetRenderer $renderer,
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
     * @param  list<NscmfRecord>  $records
     * @return list<array<string, mixed>>
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
