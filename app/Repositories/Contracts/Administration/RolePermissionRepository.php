<?php

declare(strict_types=1);

namespace App\Repositories\Contracts\Administration;

use App\Models\User;
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
}
