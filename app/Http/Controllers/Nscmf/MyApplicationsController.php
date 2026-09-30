<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nscmf\ListRecordsRequest;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use Inertia\Inertia;
use Inertia\Response;

/** GET /my-applications — the actor's own records, searched and paginated (12 §47.1). */
final class MyApplicationsController extends Controller
{
    public function __invoke(ListRecordsRequest $request, NscmfQueryService $queries): Response
    {
        $user = $request->user();
        assert($user instanceof User);

        return Inertia::render('MyApplications/Index', $queries->mine($user, $request->listQuery()));
    }
}
