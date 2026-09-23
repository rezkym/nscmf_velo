<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\RecordConflict;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\WorkflowRepository;
use App\Services\Audit\BusinessAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;

/**
 * Lifecycle actions outside the Review/Approval stages (05 §13, §21–22; 12 §31, §40–42): Cancel,
 * Reopen and the archive flag. Same lock → revalidate → mutate → audit shape as the workflow.
 */
final readonly class NscmfLifecycleService
{
    private const array ARCHIVABLE = [NscmfStatus::APPROVED, NscmfStatus::REJECTED, NscmfStatus::CANCELLED];

    public function __construct(
        private NscmfRepository $records,
        private WorkflowRepository $workflow,
        private BusinessAuditService $businessAudit,
        private DatabaseManager $database,
    ) {}

    public function cancel(User $actor, int $recordId, int $expectedVersion, ?string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lock($actor, $recordId, $expectedVersion, 'nscmf.cancel');
            if (! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }
            if ($record->business_status !== NscmfStatus::DRAFT || $record->requested_by_user_id !== null) {
                throw RecordConflict::state($record, 'Only a never-submitted Draft can be cancelled.');
            }

            $this->transition($actor, $record, BusinessAuditEvent::CANCELLED, ['business_status' => NscmfStatus::CANCELLED->value], $reason);
        });
    }

    /** Reopen supersedes the closed iteration and starts the next one (05 §16, STATE-ITER-003). */
    public function reopen(User $actor, int $recordId, int $expectedVersion, string $reason, NscmfStatus $destination): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason, $destination): void {
            $record = $this->lock($actor, $recordId, $expectedVersion, 'nscmf.reopen');
            if (! in_array($record->business_status, [NscmfStatus::APPROVED, NscmfStatus::REJECTED], true)) {
                throw RecordConflict::state($record, 'Only an Approved or Rejected record can be reopened.');
            }
            $closed = $this->workflow->currentIteration($record)
                ?? throw new \LogicException('A closed record has no current workflow iteration.');

            $now = CarbonImmutable::now();
            $this->workflow->updateIteration($closed, ['superseded_at' => $now]);
            $next = $this->workflow->createIteration($record, [
                'iteration_no' => $closed->iteration_no + 1,
                'predecessor_iteration_id' => $closed->id,
                'started_via' => 'REOPEN',
                'started_by_user_id' => $actor->id,
                'started_at' => $now,
            ]);

            $this->transition($actor, $record, BusinessAuditEvent::REOPENED, [
                'business_status' => $destination->value,
                'current_workflow_iteration_id' => $next->id,
            ], $reason, $next->id);
        });
    }

    public function archive(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lock($actor, $recordId, $expectedVersion, 'nscmf.archive');
            if (! in_array($record->business_status, self::ARCHIVABLE, true)) {
                throw RecordConflict::state($record, 'Only an Approved, Rejected or Cancelled record can be archived.');
            }

            $this->transition($actor, $record, BusinessAuditEvent::ARCHIVED, [
                'is_archived' => true,
                'archived_at' => CarbonImmutable::now(),
                'archived_by_user_id' => $actor->id,
                'archive_reason' => trim($reason),
            ], $reason);
        });
    }

    public function unarchive(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lock($actor, $recordId, $expectedVersion, 'nscmf.archive', allowArchived: true);
            if (! $record->is_archived) {
                throw RecordConflict::state($record, 'This record is not archived.');
            }

            $this->transition($actor, $record, BusinessAuditEvent::UNARCHIVED, [
                'is_archived' => false,
                'archived_at' => null,
                'archived_by_user_id' => null,
                'archive_reason' => null,
            ], $reason);
        });
    }

    private function lock(User $actor, int $recordId, int $expectedVersion, string $permission, bool $allowArchived = false): NscmfRecord
    {
        $record = $this->records->lockForUpdate($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can($permission)) {
            throw DomainRuleException::forbidden();
        }
        if ($record->is_archived && ! $allowArchived) {
            throw RecordConflict::archived($record);
        }
        if ($expectedVersion !== $record->record_version) {
            throw RecordConflict::version($record);
        }

        return $record;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function transition(User $actor, NscmfRecord $record, BusinessAuditEvent $event, array $attributes, ?string $reason, ?int $iterationId = null): void
    {
        $fromStatus = $record->business_status->value;
        $versionBefore = $record->record_version;
        $this->records->updateAndIncrementVersion($record, $attributes);

        $this->businessAudit->record(
            recordId: $record->id,
            actorUserId: $actor->id,
            event: $event,
            versionBefore: $versionBefore,
            versionAfter: $record->record_version,
            fromStatus: $fromStatus,
            toStatus: $record->business_status->value,
            reason: $reason === null || trim($reason) === '' ? null : trim($reason),
            workflowIterationId: $iterationId ?? $record->current_workflow_iteration_id,
        );
    }
}
