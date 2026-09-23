<?php

declare(strict_types=1);

namespace App\Http\Controllers\Approval;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\ListRecordsRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /approval — the shared, Team-neutral Approval queue page (12 §44, §46). */
final class ApprovalQueueController extends Controller
{
    public function __invoke(ListRecordsRequest $request, NscmfQueryService $queries): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('Approval/Index', $queries->approvalQueue($user, $request->listQuery()));
    }
}
