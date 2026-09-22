<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration\Teams;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administration\EmptyBodyRequest;
use App\Http\Requests\Administration\TeamNameRequest;
use App\Models\User;
use App\Services\Administration\TeamAdministrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class TeamController extends Controller
{
    public function __construct(private readonly TeamAdministrationService $teams) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Administration/Teams/Index', ['teams' => $this->teams->list(self::actor($request))]);
    }

    public function store(TeamNameRequest $request): RedirectResponse
    {
        $this->teams->create(self::actor($request), $request->string('name')->toString());

        return back();
    }

    public function update(TeamNameRequest $request, int $team): RedirectResponse
    {
        $this->teams->rename(self::actor($request), $team, $request->string('name')->toString());

        return back();
    }

    public function deactivate(EmptyBodyRequest $request, int $team): RedirectResponse
    {
        $this->teams->setActive(self::actor($request), $team, false);

        return back();
    }

    public function reactivate(EmptyBodyRequest $request, int $team): RedirectResponse
    {
        $this->teams->setActive(self::actor($request), $team, true);

        return back();
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
