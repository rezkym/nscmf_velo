<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

/*
 * BE-132 / T66 — production-safe reference data (17 §12–17): canonical permissions, four
 * default role bundles, typed settings singleton only when missing, no Team rows.
 */

it('materializes the canonical catalog and bundles exactly once', function (): void {
    seed(ReferenceDataSeeder::class);
    seed(ReferenceDataSeeder::class);

    expect(DB::table('permissions')->orderBy('name')->pluck('name')->all())->toBe(collect(PermissionCatalog::all())->sort()->values()->all())
        ->and(DB::table('permissions')->where('guard_name', '!=', 'web')->count())->toBe(0)
        ->and(DB::table('roles')->pluck('name')->sort()->values()->all())->toBe(['Approver', 'Requester', 'Reviewer', 'Superadmin']);

    foreach (PermissionCatalog::defaultRoleBundles() as $role => $permissions) {
        expect(Role::findByName($role, 'web')->permissions->pluck('name')->sort()->values()->all())
            ->toBe(collect($permissions)->sort()->values()->all());
    }
});

it('creates the Technical Log setting only when missing and never overwrites a runtime change', function (): void {
    seed(ReferenceDataSeeder::class);

    expect((array) DB::table('system_settings')->sole(['id', 'technical_log_auto_cleanup_enabled', 'technical_log_retention_value', 'technical_log_retention_unit', 'updated_by_user_id']))
        ->toBe(['id' => 1, 'technical_log_auto_cleanup_enabled' => 1, 'technical_log_retention_value' => 30, 'technical_log_retention_unit' => 'DAY', 'updated_by_user_id' => null]);

    DB::table('system_settings')->update(['technical_log_auto_cleanup_enabled' => false, 'technical_log_retention_value' => 3, 'technical_log_retention_unit' => 'MONTH']);
    seed(ReferenceDataSeeder::class);

    expect(DB::table('system_settings')->count())->toBe(1)
        ->and(DB::table('system_settings')->value('technical_log_retention_unit'))->toBe('MONTH')
        ->and(DB::table('system_settings')->value('technical_log_retention_value'))->toBe(3);
});

it('seeds no Team, no user and no credential', function (): void {
    seed(ReferenceDataSeeder::class);

    expect(DB::table('teams')->count())->toBe(0)
        ->and(DB::table('users')->count())->toBe(0);
});

it('restores a missing bundle permission without touching custom roles', function (): void {
    seed(ReferenceDataSeeder::class);
    $custom = Role::findOrCreate('Custom Ops', 'web');
    $custom->syncPermissions(['nscmf.view']);
    Role::findByName('Requester', 'web')->revokePermissionTo('nscmf.submit');

    seed(ReferenceDataSeeder::class);

    expect(Role::findByName('Requester', 'web')->hasPermissionTo('nscmf.submit'))->toBeTrue()
        ->and($custom->fresh()?->permissions->pluck('name')->all())->toBe(['nscmf.view']);
});
