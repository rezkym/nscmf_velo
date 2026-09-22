<?php

declare(strict_types=1);

namespace App\Http\Controllers\Administration\Roles;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administration\RoleNameRequest;
use App\Http\Requests\Administration\RolePermissionsRequest;
use App\Models\User;
use App\Services\Administration\RolePermissionAdministrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RoleController extends Controller
{
    public function __construct(private readonly RolePermissionAdministrationService $roles) {}

    public function index(Request $request): Response
    {
        $actor = self::actor($request);

        return Inertia::render('Administration/Roles/Index', [
            'roles' => $this->roles->list($actor),
            'permissionCatalog' => $this->roles->catalog($actor),
        ]);
    }

    public function catalog(Request $request): JsonResponse
    {
        return new JsonResponse(['data' => $this->roles->catalog(self::actor($request)), 'meta' => (object) []]);
    }

    public function store(RoleNameRequest $request): RedirectResponse
    {
        $this->roles->create(self::actor($request), $request->string('name')->toString());

        return back();
    }

    public function update(RoleNameRequest $request, int $role): RedirectResponse
    {
        $this->roles->rename(self::actor($request), $role, $request->string('name')->toString());

        return back();
    }

    public function permissions(RolePermissionsRequest $request, int $role): RedirectResponse
    {
        $this->roles->replacePermissions(self::actor($request), $role, $request->permissions(), $request->session());

        return back();
    }

    private static function actor(Request $request): User
    {
        $user = $request->user();
        assert($user instanceof User);

        return $user;
    }
}
