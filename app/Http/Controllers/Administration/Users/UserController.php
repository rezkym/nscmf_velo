<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administration\CreateUserRequest;
use App\Http\Requests\Administration\EmptyBodyRequest;
use App\Http\Requests\Administration\ListUsersRequest;
use App\Http\Requests\Administration\RoleIdsRequest;
use App\Http\Requests\Administration\UserProfileRequest;
use App\Http\Requests\Administration\UserTeamRequest;
use App\Models\User;
use App\Services\Administration\UserAdministrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class UserController extends Controller
{
    public function __construct(private readonly UserAdministrationService $users) {}

    public function index(ListUsersRequest $request): Response
    {
        return Inertia::render('Administration/Users/Index', $this->users->list(self::actor($request), $request->page(), $request->perPage()));
    }

    /** JSON, no-store: the only channel that ever carries the one-time password (12 §96.2). */
    public function store(CreateUserRequest $request): JsonResponse
    {
        $result = $this->users->create(
            self::actor($request),
            $request->string('name')->toString(),
            $request->string('username')->toString(),
            $request->integer('team_id'),
            $request->roleIds(),
            $request->session(),
        );

        return self::oneTime([
            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'username' => $result['user']->username,
                'must_change_password' => true,
            ],
            'temporary_password' => $result['temporary_password'],
        ], 201);
    }

    public function update(UserProfileRequest $request, int $user): RedirectResponse
    {
        $this->users->updateProfile(self::actor($request), $user, $request->string('name')->toString());

        return back();
    }

    public function enable(EmptyBodyRequest $request, int $user): RedirectResponse
    {
        $this->users->enable(self::actor($request), $user);

        return back();
    }

    public function disable(EmptyBodyRequest $request, int $user): RedirectResponse
    {
        $this->users->disable(self::actor($request), $user, $request->session());

        return back();
    }

    public function resetPassword(EmptyBodyRequest $request, int $user): JsonResponse
    {
        $password = $this->users->resetPassword(self::actor($request), $user, $request->session());

        return self::oneTime(['user_id' => $user, 'must_change_password' => true, 'temporary_password' => $password], 200);
    }

    public function roles(RoleIdsRequest $request, int $user): RedirectResponse
    {
        $this->users->replaceRoles(self::actor($request), $user, $request->roleIds(), $request->session());

        return back();
    }

    public function team(UserTeamRequest $request, int $user): RedirectResponse
    {
        $this->users->changeTeam(self::actor($request), $user, $request->integer('team_id'));

        return back();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function oneTime(array $data, int $status): JsonResponse
    {
        return new JsonResponse(
            ['data' => $data, 'meta' => ['temporary_password_reveal' => 'ONE_TIME_ONLY']],
            $status,
            ['Cache-Control' => 'no-store, private', 'Pragma' => 'no-cache'],
        );
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
