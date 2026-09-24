<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\SubmitRecordRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfWorkflowService;
use Illuminate\Http\RedirectResponse;

/** POST /nscmf/{record}/submit — Inertia workflow action (12 §4.1, §30). */
final class SubmitRecordController extends Controller
{
    public function __invoke(SubmitRecordRequest $request, int $record, NscmfWorkflowService $workflow): RedirectResponse
    {
        $user = $request->user();
        assert($user instanceof User);

        $workflow->submit($user, $record, $request->integer('record_version'));

        return redirect("/nscmf/{$record}", 303);
    }
}
