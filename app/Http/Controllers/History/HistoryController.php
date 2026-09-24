<?php

declare(strict_types=1);

namespace App\Http\Controllers\History;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\ListRecordsRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /history — every record the actor may see, filtered and paginated (12 §47). */
final class HistoryController extends Controller
{
    public function __invoke(ListRecordsRequest $request, NscmfQueryService $queries): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('History/Index', $queries->history($user, $request->listQuery()));
    }
}
