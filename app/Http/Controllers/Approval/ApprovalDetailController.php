<?php

declare(strict_types=1);

namespace App\Http\Controllers\Approval;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use App\Services\Nscmf\RecordEvidenceService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** GET /approval/{record} — opening the detail claims nothing (12 §44). */
final class ApprovalDetailController extends Controller
{
    public function __invoke(Request $request, int $record, NscmfQueryService $queries, RecordEvidenceService $evidence): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('Approval/Show', [
            'record' => $queries->approvalDetail($user, $record),
            'attachments' => $evidence->attachments($user, $record),
        ]);
    }
}
