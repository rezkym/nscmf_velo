<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf\Workflow;

use App\Domain\Nscmf\Enums\NscmfStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\Workflow\CancelRecordRequest;
use App\Http\Requests\Nscmf\Workflow\ReopenRecordRequest;
use App\Http\Requests\Nscmf\Workflow\WorkflowReasonRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfLifecycleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** POST /nscmf/{record}/cancel|reopen|archive|unarchive (12 §31, §40–42). */
final class LifecycleActionController extends Controller
{
    public function __construct(private readonly NscmfLifecycleService $lifecycle) {}

    public function cancel(CancelRecordRequest $request, int $record): RedirectResponse
    {
        $reason = $request->filled('reason') ? $request->string('reason')->toString() : null;
        $this->lifecycle->cancel(self::actor($request), $record, $request->integer('record_version'), $reason);

        return redirect("/nscmf/{$record}", 303);
    }

    public function reopen(ReopenRecordRequest $request, int $record): RedirectResponse
    {
        $destination = NscmfStatus::from($request->string('destination_status')->toString());
        $this->lifecycle->reopen(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString(), $destination);

        return redirect("/nscmf/{$record}", 303);
    }

    public function archive(WorkflowReasonRequest $request, int $record): RedirectResponse
    {
        $this->lifecycle->archive(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString());

        return redirect("/nscmf/{$record}", 303);
    }

    public function unarchive(WorkflowReasonRequest $request, int $record): RedirectResponse
    {
        $this->lifecycle->unarchive(self::actor($request), $record, $request->integer('record_version'), $request->string('reason')->toString());

        return redirect("/nscmf/{$record}", 303);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
