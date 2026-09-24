<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\Workflow\WorkflowReasonRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use Illuminate\Http\RedirectResponse;
use LogicException;

/** POST /nscmf/{record}/review/return (12 §33). */
final class ReviewReturnController extends Controller
{
    public function __invoke(WorkflowReasonRequest $request, int $record, NscmfWorkflowService $workflow): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);
        $input = $request->validated();
        $version = $input['record_version'];
        $reason = $input['reason'];
        if ((! is_int($version) && ! is_string($version)) || ! is_string($reason)) {
            throw new LogicException('Validated reviewer return input has an unexpected type.');
        }

        $workflow->returnForRevision($user, $record, (int) $version, $reason);

        return redirect($user->can('nscmf.review') ? "/review/{$record}" : ($user->can('nscmf.view') ? "/nscmf/{$record}" : '/dashboard'), 303);
    }
}
