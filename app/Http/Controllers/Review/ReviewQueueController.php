<?php

declare(strict_types=1);

namespace App\Http\Controllers\Review;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\ListRecordsRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /review — the Team-neutral Review queue page (12 §44–45). */
final class ReviewQueueController extends Controller
{
    public function __invoke(ListRecordsRequest $request, NscmfQueryService $queries): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('Review/Index', $queries->reviewQueue($user, $request->listQuery()));
    }
}
