<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ActivityLogQueryRequest;
use App\Models\User;
use App\Services\Reports\ActivityLogReportService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /reports/activity-log — the Activity Log report page (12 §47.2). */
final class ActivityLogController extends Controller
{
    public function __invoke(ActivityLogQueryRequest $request, ActivityLogReportService $reports): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('Reports/ActivityLog', $reports->page($user, $request->logQuery()));
    }
}
