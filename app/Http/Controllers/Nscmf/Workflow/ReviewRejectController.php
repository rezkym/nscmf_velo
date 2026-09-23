<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\Workflow\ReviewReasonRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use Illuminate\Http\RedirectResponse;
use LogicException;

/** POST /nscmf/{record}/review/reject (12 §34). */
final class ReviewRejectController extends Controller
{
    public function __invoke(ReviewReasonRequest $request, int $record, NscmfWorkflowService $workflow): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);
        $input = $request->validated();
        $version = $input['record_version'];
        $reason = $input['reason'];
        if ((! is_int($version) && ! is_string($version)) || ! is_string($reason)) {
            throw new LogicException('Validated reviewer rejection input has an unexpected type.');
        }

        $workflow->reject($user, $record, (int) $version, $reason);

        return redirect("/nscmf/{$record}", 303);
    }
}
