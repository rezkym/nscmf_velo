<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role;

interface RolePermissionRepository
{
    public function findRoleByName(string $name): ?Role;

    public function findRole(int $id): ?Role;

    /**
     * @param  list<int>  $roleIds
     */
    public function syncUserRoles(User $user, array $roleIds): void;

    public function forgetPermissionCache(): void;

    /**
     * @return Collection<int, Role>
     */
    public function allRolesWithPermissions(): Collection;

    public function createRole(string $name): Role;

    public function renameRole(Role $role, string $name): void;

    /**
     * @param  list<string>  $permissions
     */
    public function syncRolePermissions(Role $role, array $permissions): void;

    /**
     * @return list<int>
     */
    public function userIdsWithRole(Role $role): array;

    /** Setup readiness: a role other than Superadmin that carries at least one permission. */
    public function hasConfiguredNonSuperadminRole(): bool;
}
