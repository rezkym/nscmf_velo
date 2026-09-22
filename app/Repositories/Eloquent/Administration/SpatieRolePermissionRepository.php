<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Administration;

use App\Models\User;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/** Spatie stays the RBAC primitive (04 §4); this only wraps its persistence. */
final class SpatieRolePermissionRepository implements RolePermissionRepository
{
    public function findRoleByName(string $name): ?Role
    {
        return Role::query()->where('name', $name)->where('guard_name', 'web')->first();
    }

    public function findRole(int $id): ?Role
    {
        return Role::query()->where('guard_name', 'web')->find($id);
    }

    public function syncUserRoles(User $user, array $roleIds): void
    {
        $user->syncRoles($roleIds);
        $this->forgetPermissionCache();
    }

    public function forgetPermissionCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
