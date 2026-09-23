<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\Workflow\ReviewForwardRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use Illuminate\Http\RedirectResponse;
use LogicException;

final class ReviewForwardController extends Controller
{
    public function __invoke(ReviewForwardRequest $request, int $record, NscmfWorkflowService $workflow): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);
        $input = $request->validated();
        $version = $input['record_version'];
        $comment = $input['comment'] ?? null;
        if ((! is_int($version) && ! is_string($version)) || ($comment !== null && ! is_string($comment))) {
            throw new LogicException('Validated reviewer forward input has an unexpected type.');
        }

        $workflow->forward($user, $record, (int) $version, $comment);

        return redirect($user->can('nscmf.review') ? "/review/{$record}" : ($user->can('nscmf.view') ? "/nscmf/{$record}" : '/dashboard'), 303);
    }
}
