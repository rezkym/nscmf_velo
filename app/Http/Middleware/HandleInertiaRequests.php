<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * Safe shared auth context (12 §100): no password hash, session payload, protected flag or
     * Team authorization scope. Permissions are UI hints; every action re-authorizes.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => function () use ($request): array {
                $user = $request->user();

                if (! $user instanceof User) {
                    return ['user' => null, 'permissions' => []];
                }

                $team = $user->team;

                return [
                    'user' => [
                        'id' => $user->id,
                        'username' => $user->username,
                        'name' => $user->name,
                        'team_id' => $user->team_id,
                        'team' => $team === null ? null : ['id' => $team->id, 'name' => $team->name, 'is_active' => $team->is_active],
                        'must_change_password' => $user->must_change_password,
                    ],
                    'permissions' => $user->getAllPermissions()->pluck('name')->sort()->values()->all(),
                ];
            },
        ];
    }
}
