<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\Workflow\WorkflowCommentRequest;
use App\Http\Requests\Nscmf\Workflow\WorkflowReasonRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** POST /nscmf/{record}/approval/* — Approver actions (12 §35–38). */
final class ApprovalActionController extends Controller
{
    public function __construct(private readonly NscmfWorkflowService $workflow) {}

    public function approve(WorkflowCommentRequest $request, int $record): RedirectResponse
    {
        $comment = $request->filled('comment') ? $request->string('comment')->toString() : null;
        $this->workflow->approve(self::actor($request), $record, $request->integer('record_version'), $comment);

        return self::afterAction($request, $record);
    }

    public function returnToReviewer(WorkflowReasonRequest $request, int $record): RedirectResponse
    {
        $this->workflow->returnToReviewer(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString());

        return self::afterAction($request, $record);
    }

    public function returnToRequester(WorkflowReasonRequest $request, int $record): RedirectResponse
    {
        $this->workflow->returnToRequester(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString());

        return self::afterAction($request, $record);
    }

    public function reject(WorkflowReasonRequest $request, int $record): RedirectResponse
    {
        $this->workflow->rejectApproval(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString());

        return self::afterAction($request, $record);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }

    private static function afterAction(Request $request, int $record): RedirectResponse
    {
        $user = self::actor($request);

        return redirect($user->can('nscmf.approve') ? "/approval/{$record}" : ($user->can('nscmf.view') ? "/nscmf/{$record}" : '/dashboard'), 303);
    }
}
