<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent\Administration;

use App\Domain\Administration\PermissionCatalog;
use App\Models\User;
use App\Repositories\Contracts\Administration\RolePermissionRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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

    public function allRolesWithPermissions(): Collection
    {
        return Role::query()->where('guard_name', 'web')->with('permissions')->orderBy('name')->get();
    }

    public function createRole(string $name): Role
    {
        $role = Role::query()->create(['name' => $name, 'guard_name' => 'web']);
        $this->forgetPermissionCache();

        return $role;
    }

    public function renameRole(Role $role, string $name): void
    {
        $role->forceFill(['name' => $name])->save();
        $this->forgetPermissionCache();
    }

    public function syncRolePermissions(Role $role, array $permissions): void
    {
        $role->syncPermissions($permissions);
        $this->forgetPermissionCache();
    }

    public function userIdsWithRole(Role $role): array
    {
        return array_values(DB::table(config()->string('permission.table_names.model_has_roles'))
            ->where('role_id', $role->id)
            ->pluck('model_id')
            ->map(fn (mixed $id): int => is_numeric($id) ? (int) $id : 0)
            ->filter(fn (int $id): bool => $id > 0)
            ->all());
    }

    public function hasConfiguredNonSuperadminRole(): bool
    {
        return Role::query()
            ->where('guard_name', 'web')
            ->where('name', '!=', PermissionCatalog::ROLE_SUPERADMIN)
            ->whereHas('permissions')
            ->exists();
    }
}
