<?php

declare(strict_types=1);

use Tests\Support\Schema;

/*
 * BE-008 / T05-2 — Spatie package tables from the installed 8.x migration (11 §10–11).
 */

it('creates the five standard Spatie tables without Team columns', function (): void {
    foreach (['roles', 'permissions', 'model_has_roles', 'model_has_permissions', 'role_has_permissions'] as $table) {
        expect(Schema::tableExists($table))->toBeTrue()
            ->and(array_keys(Schema::columns($table)))->not->toContain('team_id')
            ->and(array_keys(Schema::columns($table)))->not->toContain('team_foreign_key');
    }

    expect(Schema::uniqueIndexes('roles'))->toContain(['name', 'guard_name'])
        ->and(Schema::uniqueIndexes('permissions'))->toContain(['name', 'guard_name'])
        ->and(Schema::columns('model_has_roles')['model_id']['type'])->toBe('bigint unsigned');
});

it('keeps Spatie Teams and wildcard permissions disabled', function (): void {
    expect(config('permission.teams'))->toBeFalse()
        ->and(config('permission.enable_wildcard_permission'))->toBeFalse();
});

it('creates no duplicate RBAC tables', function (): void {
    foreach (['user_roles', 'user_permissions', 'role_permissions', 'effective_permissions', 'reviewer_roles', 'approver_roles'] as $table) {
        expect(Schema::tableExists($table))->toBeFalse();
    }
});

it('rejects a duplicate permission name on the same guard', function (): void {
    $insert = fn () => \Illuminate\Support\Facades\DB::table('permissions')->insert([
        'name' => 'nscmf.view', 'guard_name' => 'web', 'created_at' => now(), 'updated_at' => now(),
    ]);
    $insert();

    expect(Schema::rejects($insert))->toBeTrue();
});
