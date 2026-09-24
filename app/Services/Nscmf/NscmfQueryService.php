<?php

declare(strict_types=1);

namespace App\Services\Nscmf;

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Nscmf\Enums\NscmfFamily;
use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Domain\Nscmf\RecordAccess;
use App\Domain\Nscmf\ReviewForwardRules;
use App\Domain\Nscmf\SubmissionWarnings;
use App\Domain\Shared\DomainRuleException;
use App\Models\Nscmf\NscmfRecord;
use App\Models\Team;
use App\Models\User;
use App\Repositories\Contracts\Nscmf\NscmfRepository;
use App\Services\Audit\AccessAuditService;

/**
 * Authorized record read projections (12 §23–24): the family form data in the same canonical shape
 * the Draft save accepts, current sign-offs, and server-derived action hints that never replace
 * the authorization every action repeats.
 *
 * @phpstan-import-type ListQuery from \App\Http\Requests\Nscmf\ListRecordsRequest
 */
final readonly class NscmfQueryService
{
    public const string EDIT_DRAFT = 'edit_draft';

    public const string EDIT_RESULTS = 'edit_results';

    private const int DASHBOARD_ITEMS = 5;

    private const array REVIEW_ACTIONS = ['nscmf.review.return', 'nscmf.review.reject', 'nscmf.review.forward'];

    private const array APPROVAL_ACTIONS = ['nscmf.approve', 'nscmf.approval.return_reviewer', 'nscmf.approval.return_requester', 'nscmf.approval.reject'];

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
     * Queue membership changes after an action; the authorized detail remains readable.
     *
     * @return array<string, mixed>
     */
    public function reviewDetail(User $actor, int $recordId): array
    {
        $record = $this->visibleRecord($actor, $recordId);
        if (! $actor->can('nscmf.review')) {
            throw DomainRuleException::forbidden();
        }
        $this->accessAudit->record(actorUserId: $actor->id, event: AccessAuditEvent::RECORD_VIEWED, recordId: $record->id);
        $state = $this->records->familyState($record);
        $errors = ReviewForwardRules::errors($record->family, $state);

        return [
            ...$this->project($actor, $record, $state),
            'forward_readiness' => [
                'ready' => $errors === [],
                'reason' => $errors === [] ? null : array_values($errors)[0][0],
            ],
        ];
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

        $stagePermissions = match (true) {
            $record->is_archived => [],
            $record->business_status === NscmfStatus::PENDING_REVIEW => self::REVIEW_ACTIONS,
            $record->business_status === NscmfStatus::PENDING_APPROVAL => self::APPROVAL_ACTIONS,
            default => [],
        };
        foreach ($stagePermissions as $permission) {
            if ($actor->can($permission)) {
                $actions[] = $permission;
            }
        }

        $status = $record->business_status;
        if ($owner && $status === NscmfStatus::DRAFT && $record->requested_by_user_id === null && $actor->can('nscmf.cancel')) {
            $actions[] = 'nscmf.cancel';
        }
        if (! $record->is_archived && in_array($status, [NscmfStatus::APPROVED, NscmfStatus::REJECTED], true) && $actor->can('nscmf.reopen')) {
            $actions[] = 'nscmf.reopen';
        }
        if ($actor->can('nscmf.archive') && in_array($status, [NscmfStatus::APPROVED, NscmfStatus::REJECTED, NscmfStatus::CANCELLED], true)) {
            $actions[] = $record->is_archived ? 'nscmf.unarchive' : 'nscmf.archive';
        }

        return $actions;
    }

    /**
     * The Team-neutral Review queue (12 §45): every permitted reviewer sees the same candidates,
     * and opening the queue claims nothing.
     *
     * @param  ListQuery  $query
     * @return array<string, mixed>
     */
    public function reviewQueue(User $actor, array $query): array
    {
        return $this->queue($actor, 'nscmf.review', NscmfStatus::PENDING_REVIEW, $query);
    }

    /**
     * The shared, non-exclusive Approval queue (12 §46).
     *
     * @param  ListQuery  $query
     * @return array<string, mixed>
     */
    public function approvalQueue(User $actor, array $query): array
    {
        return $this->queue($actor, 'nscmf.approve', NscmfStatus::PENDING_APPROVAL, $query);
    }

    /**
     * History (12 §47): visibility per 12 §17.1; archived stays a separate filter, off by default.
     *
     * @param  ListQuery  $query
     * @return array<string, mixed>
     */
    public function history(User $actor, array $query): array
    {
        if (! $actor->can('nscmf.view.history')) {
            throw DomainRuleException::forbidden();
        }
        // Archived records are a separate, explicit view (07 §451).
        $query['archived'] ??= false;

        return $this->paginated($actor, $query, $query);
    }

    /**
     * @return array<string, mixed>
     */
    public function approvalDetail(User $actor, int $recordId): array
    {
        $record = $this->visibleRecord($actor, $recordId);
        if (! $actor->can('nscmf.approve')) {
            throw DomainRuleException::forbidden();
        }
        $this->accessAudit->record(actorUserId: $actor->id, event: AccessAuditEvent::RECORD_VIEWED, recordId: $record->id);

        return $this->project($actor, $record, $this->records->familyState($record));
    }

    /**
     * Dashboard cards (07 §17): the actor's own editable work, plus the shared pools only for the
     * permissions they hold. Team never widens or narrows a pool.
     *
     * @return array<string, mixed>
     */
    public function dashboard(User $actor): array
    {
        $ownCounts = $this->records->countOwnByStatus($actor->id, NscmfStatus::DRAFT, NscmfStatus::REVISION_REQUIRED);
        // A pool the actor may not see is omitted, not null: the card then shows its own empty state.
        $counts = [
            'drafts' => ['count' => $ownCounts[NscmfStatus::DRAFT->value] ?? 0],
            'revisions' => ['count' => $ownCounts[NscmfStatus::REVISION_REQUIRED->value] ?? 0],
        ];
        $items = [
            'drafts' => $this->summaries($this->records->recentOwnByStatus($actor->id, NscmfStatus::DRAFT, self::DASHBOARD_ITEMS)),
            'revisions' => $this->summaries($this->records->recentOwnByStatus($actor->id, NscmfStatus::REVISION_REQUIRED, self::DASHBOARD_ITEMS)),
        ];

        if ($actor->can('nscmf.review')) {
            $counts['reviews'] = ['count' => $this->records->countByStatus(NscmfStatus::PENDING_REVIEW)];
            $items['reviews'] = $this->summaries($this->records->recentByStatus(NscmfStatus::PENDING_REVIEW, self::DASHBOARD_ITEMS));
        }

        if ($actor->can('nscmf.approve')) {
            $counts['approvals'] = ['count' => $this->records->countByStatus(NscmfStatus::PENDING_APPROVAL)];
            $items['approvals'] = $this->summaries($this->records->recentByStatus(NscmfStatus::PENDING_APPROVAL, self::DASHBOARD_ITEMS));
        }

        return ['counts' => $counts, 'items' => $items];
    }

    /**
     * @param  ListQuery  $query
     * @return array<string, mixed>
     */
    private function queue(User $actor, string $permission, NscmfStatus $status, array $query): array
    {
        if (! $actor->can($permission)) {
            throw DomainRuleException::forbidden();
        }

        return $this->paginated($actor, [...$query, 'business_status' => $status->value, 'archived' => false], $query);
    }

    /**
     * @param  ListQuery  $filters
     * @param  ListQuery  $query  the query echoed back to the page
     * @return array<string, mixed>
     */
    private function paginated(User $actor, array $filters, array $query): array
    {
        $paginator = $this->records->paginateVisible($actor->id, $filters);

        return [
            'items' => array_map(fn (NscmfRecord $record): array => self::queueRow($record), $paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
            'query' => $query,
        ];
    }

    /**
     * @param  list<NscmfRecord>  $records
     * @return list<array<string, mixed>>
     */
    private function summaries(array $records): array
    {
        return array_map(fn (NscmfRecord $record): array => [
            'id' => $record->id,
            'request_no' => $record->request_no,
            'family' => $record->family->value,
            'subtype' => $record->subtype->value,
            'team' => self::teamRef($record->team),
        ], $records);
    }

    /**
     * @return array<string, mixed>
     */
    private static function queueRow(NscmfRecord $record): array
    {
        return [
            'id' => $record->id,
            'request_no' => $record->request_no,
            'family' => $record->family->value,
            'subtype' => $record->subtype->value,
            'request_date' => $record->request_date?->toDateString(),
            'requester' => $record->requestedBy === null ? null : ['id' => $record->requestedBy->id, 'name' => $record->requestedBy->name],
            'team' => self::teamRef($record->team),
            'business_status' => $record->business_status->value,
            'is_archived' => $record->is_archived,
        ];
    }

    /**
     * @return array{id: int, name: string}|null
     */
    private static function teamRef(?Team $team): ?array
    {
        return $team === null ? null : ['id' => $team->id, 'name' => $team->name];
    }

    private function visibleRecord(User $actor, int $recordId): NscmfRecord
    {
        $record = $this->records->findForProjection($recordId);

        if ($record === null || ! RecordAccess::isVisibleTo($record, $actor)) {
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
