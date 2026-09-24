<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\DraftStructure;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\RecordConflict;
use App\Domain\Shared\DomainRuleException;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\BusinessAuditService;
use Illuminate\Database\DatabaseManager;

/**
 * The narrow Result-only mutation while the Change is in review (06 §45–48, 12 §29). It touches
 * result rows only, increments the parent record_version once and audits the change.
 */
final readonly class NscmfChangeResultService
{
    public function __construct(
        private NscmfRepository $records,
        private BusinessAuditService $businessAudit,
        private DatabaseManager $database,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    public function update(User $actor, int $recordId, int $expectedVersion, array $rows): array
    {
        return $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $rows): array {
            $record = $this->records->lockForUpdate($recordId);

            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
                throw DomainRuleException::notFound();
            }

            if (! $actor->can('nscmf.change.result.edit') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }

            if ($record->is_archived) {
                throw RecordConflict::archived($record);
            }

            if ($record->family !== NscmfFamily::CHANGE || $record->business_status !== NscmfStatus::PENDING_REVIEW) {
                throw RecordConflict::state($record, 'Results can only be captured on a Change in review.');
            }

            if ($expectedVersion !== $record->record_version) {
                throw RecordConflict::version($record, 'A newer version of this record exists. Refresh the record before saving again.');
            }

            $definition = DraftStructure::collections(NscmfFamily::CHANGE)['results'];
            $before = $this->records->familyState($record)['results'] ?? [];
            $versionBefore = $record->record_version;

            $this->records->replaceCollection($record, 'results', DraftStructure::keptRows($definition, $rows));
            $this->records->updateAndIncrementVersion($record, []);

            $after = $this->records->familyState($record)['results'] ?? [];

            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::RESULT_UPDATED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: $record->business_status->value,
                toStatus: $record->business_status->value,
                workflowIterationId: $record->current_workflow_iteration_id,
                changes: $before === $after ? [] : [[
                    'field_path' => 'change.results',
                    'old' => json_encode($before, JSON_THROW_ON_ERROR),
                    'new' => json_encode($after, JSON_THROW_ON_ERROR),
                    'kind' => 'json',
                ]],
            );

            return [
                'id' => $record->id,
                'record_version' => $record->record_version,
                'business_status' => $record->business_status->value,
                'results' => $after,
            ];
        });
    }
}
