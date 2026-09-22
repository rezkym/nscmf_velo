<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domain\Administration\PermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Production-safe, idempotent reference data (17 §12–16): the canonical permission catalog,
 * the four default role bundles and the Technical Log setting singleton when missing.
 * It creates no Team, no user and no credential.
 */
final class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionCatalog::all() as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (PermissionCatalog::defaultRoleBundles() as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $granted = $role->permissions->pluck('name')->map(fn (mixed $name): string => is_string($name) ? $name : '')->all();
            $role->givePermissionTo(array_values(array_diff($permissions, $granted)));
        }

        DB::table('system_settings')->insertOrIgnore([
            'id' => 1,
            'technical_log_auto_cleanup_enabled' => true,
            'technical_log_retention_value' => 30,
            'technical_log_retention_unit' => 'DAY',
            'updated_by_user_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
