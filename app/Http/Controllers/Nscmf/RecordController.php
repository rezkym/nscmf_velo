<?php

declare(strict_types=1);

namespace App\Http\Controllers\Nscmf;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Nscmf\NscmfQueryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RecordController extends Controller
{
    public function __construct(private readonly NscmfQueryService $queries) {}

    public function show(Request $request, int $record): Response
    {
        return Inertia::render('Nscmf/Show', ['record' => $this->queries->detail(self::actor($request), $record)]);
    }

    public function edit(Request $request, int $record): Response
    {
        $page = $this->queries->editPage(self::actor($request), $record);

        return Inertia::render($page['component'], $page['props']);
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
