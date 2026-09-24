<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\RecordConflict;
use App\Domain\Nscmf\ReviewForwardRules;
use App\Domain\Nscmf\SubmissionRules;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\Nscmf\WorkflowIteration;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Repositories\Contracts\Nscmf\RecordEvidenceRepository;
use App\Repositories\Contracts\Nscmf\WorkflowRepository;
use App\Services\Audit\BusinessAuditService;
use Carbon\CarbonImmutable;
use Illuminate\Database\DatabaseManager;

/**
 * Workflow transitions (05 §14, 11 §56, 12 §30): row-locked, current-state revalidated, one
 * version increment and one Business Audit event per successful action.
 */
final readonly class NscmfWorkflowService
{
    public function __construct(
        private NscmfRepository $records,
        private WorkflowRepository $workflow,
        private BusinessAuditService $businessAudit,
        private DatabaseManager $database,
        private RecordEvidenceRepository $evidence,
    ) {}

    /**
     * Whether the Change target date now differs from the value it had when the record last
     * came back for revision (06 §40). Changed and restored counts as unchanged.
     *
     * @param  array<string, mixed>  $state
     */
    private function targetDateChangedInRevision(NscmfRecord $record, array $state): bool
    {
        if ($record->family !== NscmfFamily::CHANGE) {
            return false;
        }
        $accepted = $this->evidence->valueAtLastReturnIfChanged($record->id, 'change.target_execution_date');

        return $accepted !== null && $accepted['value'] !== ($state['target_execution_date'] ?? null);
    }

    /** First Submit establishes iteration 1 and Requested By; a Resubmit keeps both (05 §16). */
    public function submit(User $actor, int $recordId, int $expectedVersion): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion): void {
            $record = $this->records->lockForUpdate($recordId);

            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
                throw DomainRuleException::notFound();
            }

            if (! $actor->can('nscmf.submit') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }

            if ($record->is_archived) {
                throw RecordConflict::archived($record);
            }

            if (! $record->business_status->allowsDraftEdit()) {
                throw RecordConflict::state($record, 'This record is not in a state that can be submitted.');
            }

            if ($expectedVersion !== $record->record_version) {
                throw RecordConflict::version($record, 'A newer version of this record exists. Refresh the record before submitting.');
            }

            $isFirstSubmit = $record->requested_by_user_id === null;
            $state = $this->records->familyState($record);
            $errors = SubmissionRules::errors(
                $record->family,
                $record->subtype,
                $state,
                $record->request_date?->toDateString(),
                $isFirstSubmit,
                ! $isFirstSubmit && $this->targetDateChangedInRevision($record, $state),
            );

            if ($errors !== []) {
                throw new DomainRuleException('VALIDATION_FAILED', 'Some fields need to be corrected before submitting.', 422, errors: $errors);
            }

            $now = CarbonImmutable::now();
            $iteration = $this->workflow->currentIteration($record);
            $attributes = ['business_status' => NscmfStatus::PENDING_REVIEW->value];

            if ($isFirstSubmit) {
                $iteration = $this->workflow->createIteration($record, [
                    'iteration_no' => 1,
                    'started_via' => 'FIRST_SUBMIT',
                    'started_by_user_id' => $actor->id,
                    'started_at' => $now,
                ]);
                $attributes['requested_by_user_id'] = $actor->id;
                $attributes['first_submitted_at'] = $now;
                $attributes['current_workflow_iteration_id'] = $iteration->id;
            }

            $versionBefore = $record->record_version;
            $this->records->updateAndIncrementVersion($record, $attributes);

            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::SUBMITTED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: $isFirstSubmit ? NscmfStatus::DRAFT->value : NscmfStatus::REVISION_REQUIRED->value,
                toStatus: NscmfStatus::PENDING_REVIEW->value,
                workflowIterationId: $iteration?->id,
                metadata: ['first_submit' => $isFirstSubmit],
            );
        });
    }

    /** Reviewer Return keeps the active iteration and its existing sign-off evidence (05 §16, §32). */
    public function returnForRevision(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lockPendingReview($actor, $recordId, $expectedVersion, 'nscmf.review.return');

            $versionBefore = $record->record_version;
            $this->records->updateAndIncrementVersion($record, ['business_status' => NscmfStatus::REVISION_REQUIRED->value]);

            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::REVIEW_RETURNED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_REVIEW->value,
                toStatus: NscmfStatus::REVISION_REQUIRED->value,
                reason: trim($reason),
                workflowIterationId: $record->current_workflow_iteration_id,
            );
        });
    }

    /** Reviewer Reject closes the current iteration without creating a successor (05 §16, 11 §31). */
    public function reject(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lockPendingReview($actor, $recordId, $expectedVersion, 'nscmf.review.reject');
            $iteration = $this->requireCurrentIteration($record);

            $versionBefore = $record->record_version;
            $this->workflow->updateIteration($iteration, [
                'closed_status' => NscmfStatus::REJECTED->value,
                'closed_at' => CarbonImmutable::now(),
            ]);
            $this->records->updateAndIncrementVersion($record, ['business_status' => NscmfStatus::REJECTED->value]);

            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::REVIEW_REJECTED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_REVIEW->value,
                toStatus: NscmfStatus::REJECTED->value,
                reason: trim($reason),
                workflowIterationId: $iteration->id,
            );
        });
    }

    /** Forward establishes the effective reviewer only after the persisted Result gate passes. */
    public function forward(User $actor, int $recordId, int $expectedVersion, ?string $comment): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $comment): void {
            $record = $this->lockPendingReview($actor, $recordId, $expectedVersion, 'nscmf.review.forward');
            $errors = ReviewForwardRules::errors($record->family, $this->records->familyState($record));
            if ($errors !== []) {
                throw new DomainRuleException('VALIDATION_FAILED', 'Complete the Results before forwarding.', 422, errors: $errors);
            }
            $iteration = $this->requireCurrentIteration($record);

            $versionBefore = $record->record_version;
            $this->workflow->updateIteration($iteration, [
                'reviewed_by_user_id' => $actor->id,
                'reviewed_at' => CarbonImmutable::now(),
            ]);
            $this->records->updateAndIncrementVersion($record, ['business_status' => NscmfStatus::PENDING_APPROVAL->value]);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::REVIEW_FORWARDED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_REVIEW->value,
                toStatus: NscmfStatus::PENDING_APPROVAL->value,
                comment: self::optionalText($comment),
                workflowIterationId: $iteration->id,
            );
        });
    }

    /** One successful Approve is final for the iteration; it needs a current effective Review (12 §35). */
    public function approve(User $actor, int $recordId, int $expectedVersion, ?string $comment): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $comment): void {
            $record = $this->lockPendingApproval($actor, $recordId, $expectedVersion, 'nscmf.approve');
            $iteration = $this->requireCurrentIteration($record);
            if ($iteration->reviewed_by_user_id === null) {
                throw RecordConflict::state($record, 'This record has no current review sign-off.');
            }

            $now = CarbonImmutable::now();
            $versionBefore = $record->record_version;
            $this->workflow->updateIteration($iteration, [
                'approved_by_user_id' => $actor->id,
                'approved_at' => $now,
                'closed_status' => NscmfStatus::APPROVED->value,
                'closed_at' => $now,
            ]);
            $this->records->updateAndIncrementVersion($record, ['business_status' => NscmfStatus::APPROVED->value]);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::APPROVED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_APPROVAL->value,
                toStatus: NscmfStatus::APPROVED->value,
                comment: self::optionalText($comment),
                workflowIterationId: $iteration->id,
            );
        });
    }

    public function returnToReviewer(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->approverReturn($actor, $recordId, $expectedVersion, $reason, 'nscmf.approval.return_reviewer', NscmfStatus::PENDING_REVIEW, BusinessAuditEvent::APPROVAL_RETURNED_REVIEWER);
    }

    public function returnToRequester(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->approverReturn($actor, $recordId, $expectedVersion, $reason, 'nscmf.approval.return_requester', NscmfStatus::REVISION_REQUIRED, BusinessAuditEvent::APPROVAL_RETURNED_REQUESTER);
    }

    /** Approver Reject closes the iteration; the review sign-off stays as evidence (05 §14). */
    public function rejectApproval(User $actor, int $recordId, int $expectedVersion, string $reason): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason): void {
            $record = $this->lockPendingApproval($actor, $recordId, $expectedVersion, 'nscmf.approval.reject');
            $iteration = $this->requireCurrentIteration($record);

            $versionBefore = $record->record_version;
            $this->workflow->updateIteration($iteration, [
                'closed_status' => NscmfStatus::REJECTED->value,
                'closed_at' => CarbonImmutable::now(),
            ]);
            $this->records->updateAndIncrementVersion($record, ['business_status' => NscmfStatus::REJECTED->value]);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: BusinessAuditEvent::APPROVAL_REJECTED,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_APPROVAL->value,
                toStatus: NscmfStatus::REJECTED->value,
                reason: trim($reason),
                workflowIterationId: $iteration->id,
            );
        });
    }

    private function lockPendingReview(User $actor, int $recordId, int $expectedVersion, string $permission): NscmfRecord
    {
        return $this->lockInState($actor, $recordId, $expectedVersion, $permission, NscmfStatus::PENDING_REVIEW, 'review');
    }

    private function lockPendingApproval(User $actor, int $recordId, int $expectedVersion, string $permission): NscmfRecord
    {
        return $this->lockInState($actor, $recordId, $expectedVersion, $permission, NscmfStatus::PENDING_APPROVAL, 'approval');
    }

    private function lockInState(User $actor, int $recordId, int $expectedVersion, string $permission, NscmfStatus $status, string $stage): NscmfRecord
    {
        $record = $this->records->lockForUpdate($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can($permission)) {
            throw DomainRuleException::forbidden();
        }
        if ($record->is_archived) {
            throw RecordConflict::archived($record);
        }
        if ($record->business_status !== $status) {
            throw RecordConflict::state($record, "This record is not pending {$stage}.");
        }
        if ($expectedVersion !== $record->record_version) {
            throw RecordConflict::version($record, "A newer version of this record exists. Refresh the record before taking this {$stage} action.");
        }

        return $record;
    }

    private function requireCurrentIteration(NscmfRecord $record): WorkflowIteration
    {
        return $this->workflow->currentIteration($record)
            ?? throw new \LogicException('Submitted record has no current workflow iteration.');
    }

    /** Both Approver returns clear the effective review sign-off; the Forward stays in the audit (11 §32). */
    private function approverReturn(User $actor, int $recordId, int $expectedVersion, string $reason, string $permission, NscmfStatus $destination, BusinessAuditEvent $event): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion, $reason, $permission, $destination, $event): void {
            $record = $this->lockPendingApproval($actor, $recordId, $expectedVersion, $permission);
            $iteration = $this->requireCurrentIteration($record);

            $versionBefore = $record->record_version;
            $this->workflow->updateIteration($iteration, ['reviewed_by_user_id' => null, 'reviewed_at' => null]);
            $this->records->updateAndIncrementVersion($record, ['business_status' => $destination->value]);
            $this->businessAudit->record(
                recordId: $record->id,
                actorUserId: $actor->id,
                event: $event,
                versionBefore: $versionBefore,
                versionAfter: $record->record_version,
                fromStatus: NscmfStatus::PENDING_APPROVAL->value,
                toStatus: $destination->value,
                reason: trim($reason),
                workflowIterationId: $iteration->id,
            );
        });
    }

    private static function optionalText(?string $text): ?string
    {
        return $text === null || trim($text) === '' ? null : trim($text);
    }
}
