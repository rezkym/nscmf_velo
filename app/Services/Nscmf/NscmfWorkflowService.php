<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\ReviewForwardRules;
use App\Domain\Nscmf\SubmissionRules;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
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
    ) {}

    /** First Submit establishes iteration 1 and Requested By; a Resubmit keeps both (05 §16). */
    public function submit(User $actor, int $recordId, int $expectedVersion): void
    {
        $this->database->connection()->transaction(function () use ($actor, $recordId, $expectedVersion): void {
            $record = $this->records->lockForUpdate($recordId);

            if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
                throw DomainRuleException::notFound();
            }

            if (! $actor->can('nscmf.submit') || ! RecordAccess::isOwnedBy($record, $actor->id)) {
                throw DomainRuleException::forbidden();
            }

            if ($record->is_archived) {
                throw new DomainRuleException('NSCMF_ARCHIVED_CONFLICT', 'This record is archived.', 409, self::context($record));
            }

            if (! $record->business_status->allowsDraftEdit()) {
                throw new DomainRuleException('NSCMF_STATE_CONFLICT', 'This record is not in a state that can be submitted.', 409, self::context($record));
            }

            if ($expectedVersion !== $record->record_version) {
                throw new DomainRuleException('NSCMF_VERSION_CONFLICT', 'A newer version of this record exists. Refresh the record before submitting.', 409, self::context($record));
            }

            $isFirstSubmit = $record->requested_by_user_id === null;
            $errors = SubmissionRules::errors(
                $record->family,
                $record->subtype,
                $this->records->familyState($record),
                $record->request_date?->toDateString(),
                $isFirstSubmit,
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
            $iteration = $this->workflow->currentIteration($record);
            if ($iteration === null) {
                throw new \LogicException('Submitted record has no current workflow iteration.');
            }

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
            $iteration = $this->workflow->currentIteration($record);
            if ($iteration === null) {
                throw new \LogicException('Submitted record has no current workflow iteration.');
            }

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
                comment: $comment === null || trim($comment) === '' ? null : trim($comment),
                workflowIterationId: $iteration->id,
            );
        });
    }

    private function lockPendingReview(User $actor, int $recordId, int $expectedVersion, string $permission): NscmfRecord
    {
        $record = $this->records->lockForUpdate($recordId);
        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }
        if (! $actor->can($permission)) {
            throw DomainRuleException::forbidden();
        }
        if ($record->is_archived) {
            throw new DomainRuleException('NSCMF_ARCHIVED_CONFLICT', 'This record is archived.', 409, self::context($record));
        }
        if ($record->business_status !== NscmfStatus::PENDING_REVIEW) {
            throw new DomainRuleException('NSCMF_STATE_CONFLICT', 'This record is not pending review.', 409, self::context($record));
        }
        if ($expectedVersion !== $record->record_version) {
            throw new DomainRuleException('NSCMF_VERSION_CONFLICT', 'A newer version of this record exists. Refresh the record before taking this review action.', 409, self::context($record));
        }

        return $record;
    }

    /**
     * @return array<string, mixed>
     */
    private static function context(NscmfRecord $record): array
    {
        return ['latest_record_version' => $record->record_version, 'current_business_status' => $record->business_status->value];
    }
}
