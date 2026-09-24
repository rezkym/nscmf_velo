<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\DraftStructure;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\Enums\NumberingMode;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\RecordConflict;
use App\Domain\Nscmf\SubmissionWarnings;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Exceptions\RequestNoTakenException;
use App\Services\Audit\BusinessAuditService;
use Illuminate\Database\DatabaseManager;

/**
 * Draft/Revision save (12 §26–28, §7.4.1; 11 §55): authorize, lock, check state and version,
 * apply typed scalar/collection/site changes, increment record_version once and write one
 * Business Audit event — all in one short transaction.
 */
final readonly class NscmfDraftService
{
    public function __construct(
        private NscmfRepository $records,
        private BusinessAuditService $businessAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @param  array<string, mixed>  $payload  validated SaveDraftRequest data
     * @return array{data: array<string, mixed>, warnings: list<string>}
     */
    public function save(User $actor, int $recordId, array $payload): array
    {
        return $this->database->connection()->transaction(function () use ($actor, $recordId, $payload): array {
            $record = $this->records->lockForUpdate($recordId);

            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
                throw DomainRuleException::notFound();
            }

            if (! $actor->can('nscmf.draft.edit') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }

            $familyKey = $record->family->payloadKey();
            $otherKey = $record->family === NscmfFamily::ACTIVATION ? 'change' : 'activation';

            if (array_key_exists($otherKey, $payload)) {
                throw self::invalid([$otherKey => ['This record is not of that family.']]);
            }

            /** @var array<string, mixed> $familyPayload */
            $familyPayload = is_array($payload[$familyKey] ?? null) ? $payload[$familyKey] : [];

            if ($record->business_status === NscmfStatus::PENDING_REVIEW && array_key_exists('results', $familyPayload)) {
                throw self::invalid(["{$familyKey}.results" => ['Results are saved through the Change Result update while the record is in review.']]);
            }

            if ($record->is_archived) {
                throw RecordConflict::archived($record);
            }

            if (! $record->business_status->allowsDraftEdit()) {
                throw RecordConflict::state($record, 'This record can no longer be edited as a Draft.');
            }

            if ($payload['record_version'] !== $record->record_version) {
                throw RecordConflict::version($record, 'A newer version of this record exists. Refresh the record before saving again.');
            }

            $before = $this->records->familyState($record);
            $headerBefore = self::header($record);
            $recordChanges = $this->headerChanges($record, self::stringKeyed($payload['header'] ?? null));

            $this->applyFamilyPayload($record, $familyPayload, $before);

            try {
                $this->records->updateAndIncrementVersion($record, $recordChanges);
            } catch (RequestNoTakenException) {
                throw new DomainRuleException('REQUEST_NO_CONFLICT', 'Some fields need to be corrected.', 422, errors: ['header.request_no' => ['This request number is already used.']]);
            }

            $after = $this->records->familyState($record);
            $changes = [
                ...self::diff('header', $headerBefore, self::header($record)),
                ...self::diff($familyKey, $before, $after),
            ];

            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::DRAFT_UPDATED,
                versionBefore: $record->record_version - 1,
                versionAfter: $record->record_version,
                fromStatus: $record->business_status->value,
                toStatus: $record->business_status->value,
                workflowIterationId: $record->current_workflow_iteration_id,
                changes: $changes,
            );

            return [
                'data' => [
                    'id' => $record->id,
                    'record_version' => $record->record_version,
                    'business_status' => $record->business_status->value,
                    'updated_at' => $record->updated_at->toIso8601String(),
                ],
                'warnings' => SubmissionWarnings::for($record->family, $record->subtype, $after, 0),
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $familyPayload
     * @param  array<string, mixed>  $before
     */
    private function applyFamilyPayload(NscmfRecord $record, array $familyPayload, array $before): void
    {
        $family = $record->family;
        $root = $family->payloadKey();

        $scalars = array_intersect_key($familyPayload, DraftStructure::scalars($family));

        if ($family === NscmfFamily::CHANGE) {
            $value = array_key_exists('monitoring_period_value', $scalars) ? $scalars['monitoring_period_value'] : $before['monitoring_period_value'];
            $unit = array_key_exists('monitoring_period_unit', $scalars) ? $scalars['monitoring_period_unit'] : $before['monitoring_period_unit'];

            if (($value === null) !== ($unit === null)) {
                $message = ['Give the monitoring period amount and unit together, or leave both empty.'];
                throw self::invalid(["{$root}.monitoring_period_value" => $message, "{$root}.monitoring_period_unit" => $message]);
            }
        }

        $this->records->updateFamilyScalars($record, $scalars);

        foreach (DraftStructure::collections($family) as $name => $definition) {
            if (array_key_exists($name, $familyPayload) && is_array($familyPayload[$name])) {
                /** @var list<array<string, mixed>> $rows */
                $rows = array_values(array_filter($familyPayload[$name], 'is_array'));
                $this->records->replaceCollection($record, $name, DraftStructure::keptRows($definition, $rows));
            }
        }

        foreach (array_keys(DraftStructure::sites($family)) as $site) {
            if (array_key_exists($site, $familyPayload)) {
                $this->records->saveSite($record, $site, is_array($familyPayload[$site]) ? self::stringKeyed($familyPayload[$site]) : null);
            }
        }
    }

    /**
     * Header rules of 12 §26.1: the date while editable; the number only for a never-submitted
     * Manual record.
     *
     * @param  array<string, mixed>  $header
     * @return array<string, mixed>
     */
    private function headerChanges(NscmfRecord $record, array $header): array
    {
        $changes = [];

        if (array_key_exists('request_date', $header)) {
            $changes['request_date'] = $header['request_date'];
        }

        if (array_key_exists('request_no', $header)) {
            if ($record->numbering_mode !== NumberingMode::MANUAL || $record->business_status !== NscmfStatus::DRAFT) {
                throw self::invalid(['header.request_no' => ['The request number can only be corrected on a Manual record before its first submission.']]);
            }

            $requestNo = trim(is_string($header['request_no']) ? $header['request_no'] : '');
            $normalized = mb_strtolower($requestNo);

            if ($this->records->requestNoExists($normalized, $record->id)) {
                throw new DomainRuleException('REQUEST_NO_CONFLICT', 'Some fields need to be corrected.', 422, errors: ['header.request_no' => ['This request number is already used.']]);
            }

            $changes['request_no'] = $requestNo;
            $changes['request_no_normalized'] = $normalized;
        }

        return $changes;
    }

    /**
     * @return array<string, mixed>
     */
    private static function header(NscmfRecord $record): array
    {
        return ['request_date' => $record->request_date?->toDateString(), 'request_no' => $record->request_no];
    }

    /**
     * Field-level Business Audit changes (11 §35): scalars as text, collections and site blocks
     * as their canonical JSON.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return list<array{field_path: string, old: string|null, new: string|null, kind: string}>
     */
    private static function diff(string $root, array $before, array $after): array
    {
        $changes = [];

        foreach ($after as $key => $new) {
            $old = $before[$key] ?? null;

            if ($old === $new) {
                continue;
            }

            $kind = is_array($new) || is_array($old) ? 'json' : 'scalar';
            $changes[] = [
                'field_path' => "{$root}.{$key}",
                'old' => self::text($old),
                'new' => self::text($new),
                'kind' => $kind,
            ];
        }

        return $changes;
    }

    private static function text(mixed $value): ?string
    {
        return match (true) {
            $value === null => null,
            is_bool($value) => $value ? 'true' : 'false',
            is_array($value) => json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION),
            is_scalar($value) => (string) $value,
            default => null,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private static function stringKeyed(mixed $value): array
    {
        $out = [];

        foreach (is_array($value) ? $value : [] as $key => $item) {
            $out[(string) $key] = $item;
        }

        return $out;
    }

    /**
     * @param  array<string, list<string>>  $errors
     */
    private static function invalid(array $errors): DomainRuleException
    {
        return new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected.', 422, errors: $errors);
    }
}
