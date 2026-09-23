<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\SubmissionWarnings;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\AccessAuditService;

/**
 * Authorized record read projections (12 §23–24): the family form data in the same canonical shape
 * the Draft save accepts, current sign-offs, and server-derived action hints that never replace
 * the authorization every action repeats.
 */
final readonly class NscmfQueryService
{
    public const string EDIT_DRAFT = 'edit_draft';

    public const string EDIT_RESULTS = 'edit_results';

    public function __construct(
        private NscmfRepository $records,
        private AccessAuditService $accessAudit,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function detail(User $actor, int $recordId): array
    {
        $record = $this->visibleRecord($actor, $recordId);

        if (! $actor->can('nscmf.view')) {
            throw DomainRuleException::forbidden();
        }

        $this->accessAudit->record(actorUserId: $actor->id, event: AccessAuditEvent::RECORD_VIEWED, recordId: $record->id);

        return $this->project($actor, $record, $this->records->familyState($record));
    }

    /**
     * The canonical edit route (12 §44): the Draft editor for an editable own record, the
     * Result-only editor for an owned Change in review (12 §29), 403 otherwise.
     *
     * @return array{component: string, props: array<string, mixed>}
     */
    public function editPage(User $actor, int $recordId): array
    {
        $record = $this->visibleRecord($actor, $recordId);
        $actions = $this->allowedActions($actor, $record);

        if (in_array(self::EDIT_DRAFT, $actions, true)) {
            $component = 'Nscmf/Edit';
        } elseif (in_array(self::EDIT_RESULTS, $actions, true)) {
            $component = 'Nscmf/ChangeResults';
        } else {
            throw DomainRuleException::forbidden('This record cannot be edited by you in its current state.');
        }

        $this->accessAudit->record(actorUserId: $actor->id, event: AccessAuditEvent::RECORD_VIEWED, recordId: $record->id);
        $familyState = $this->records->familyState($record);

        return [
            'component' => $component,
            'props' => [
                'record' => $this->project($actor, $record, $familyState),
                'warnings' => SubmissionWarnings::for($record->family, $record->subtype, $familyState, 0),
            ],
        ];
    }

    /**
     * Presentation hints only (12 §24, §101).
     *
     * @return list<string>
     */
    public function allowedActions(User $actor, NscmfRecord $record): array
    {
        $owner = RecordAccess::isOwnedBy($record, $actor->id);
        $actions = [];

        if ($owner && ! $record->is_archived && $record->business_status->allowsDraftEdit() && $actor->can('nscmf.draft.edit')) {
            $actions[] = self::EDIT_DRAFT;
        }

        if ($owner && ! $record->is_archived && $record->business_status->allowsDraftEdit() && $actor->can('nscmf.submit')) {
            $actions[] = 'submit';
        }

        if ($owner && ! $record->is_archived && $record->family === NscmfFamily::CHANGE
            && $record->business_status === NscmfStatus::PENDING_REVIEW && $actor->can('nscmf.change.result.edit')) {
            $actions[] = self::EDIT_RESULTS;
        }

        return $actions;
    }

    private function visibleRecord(User $actor, int $recordId): NscmfRecord
    {
        $record = $this->records->findForProjection($recordId);

        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor->id)) {
            throw DomainRuleException::notFound();
        }

        return $record;
    }

    /**
     * @param  array<string, mixed>  $familyState
     * @return array<string, mixed>
     */
    private function project(User $actor, NscmfRecord $record, array $familyState): array
    {
        $iteration = $record->currentIteration;

        return [
            'id' => $record->id,
            'request_no' => $record->request_no,
            'numbering_mode' => $record->numbering_mode->value,
            'family' => $record->family->value,
            'subtype' => $record->subtype->value,
            'request_date' => $record->request_date?->toDateString(),
            'business_status' => $record->business_status->value,
            'record_version' => $record->record_version,
            'is_archived' => $record->is_archived,
            'owner' => ['id' => $record->owner->id, 'name' => $record->owner->name],
            'team' => ['id' => $record->team->id, 'name' => $record->team->name],
            'requested_by' => $record->requestedBy === null ? null : ['id' => $record->requestedBy->id, 'name' => $record->requestedBy->name],
            'first_submitted_at' => $record->first_submitted_at?->toIso8601String(),
            'iteration_no' => $iteration?->iteration_no,
            'reviewed_by' => $iteration?->reviewedBy === null ? null : ['id' => $iteration->reviewedBy->id, 'name' => $iteration->reviewedBy->name],
            'reviewed_at' => $iteration?->reviewed_at?->toIso8601String(),
            'approved_by' => $iteration?->approvedBy === null ? null : ['id' => $iteration->approvedBy->id, 'name' => $iteration->approvedBy->name],
            'approved_at' => $iteration?->approved_at?->toIso8601String(),
            'created_at' => $record->created_at->toIso8601String(),
            'updated_at' => $record->updated_at->toIso8601String(),
            'allowed_actions' => $this->allowedActions($actor, $record),
            $record->family->payloadKey() => $familyState,
        ];
    }
}
