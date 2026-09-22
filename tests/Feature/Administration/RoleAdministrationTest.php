<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\Support\Actors;
use Tests\Support\Sessions;

use function Pest\Laravel\seed;

/*
 * BE-041 / T14 — role and permission administration (04 §17, 10 §22, 12 §88–92, §96.2).
 */

beforeEach(fn () => seed(ReferenceDataSeeder::class));

it('lists roles with their permissions and the grouped explicit catalog', function (): void {
    signIn(Actors::user(['roles.view']))->get('/administration/roles')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Roles/Index')
            ->has('roles', 5)
            ->where('roles', fn ($roles) => collect($roles)->firstWhere('name', 'Superadmin')['is_protected'] === true
                && collect($roles)->firstWhere('name', 'Requester')['is_protected'] === false)
            ->has('permissionCatalog', count(PermissionCatalog::all()))
            ->where('permissionCatalog.0.name', 'nscmf.create')
            ->where('permissionCatalog.0.group', 'NSCMF'));

    signIn(Actors::user(['roles.view']))->getJson('/administration/permissions')
        ->assertOk()->assertJsonCount(count(PermissionCatalog::all()), 'data');
});

it('creates and renames custom roles but never renames Superadmin', function (): void {
    $admin = Actors::user(['roles.view', 'roles.create', 'roles.update']);

    signIn($admin)->from('/administration/roles')->post('/administration/roles', ['name' => 'Night Shift'])->assertRedirect('/administration/roles');
    $role = Role::findByName('Night Shift', 'web');
    signIn($admin)->from('/administration/roles')->patch("/administration/roles/{$role->id}", ['name' => 'Night Duty'])->assertRedirect('/administration/roles');
    signIn($admin)->from('/administration/roles')->post('/administration/roles', ['name' => 'night duty'])->assertSessionHasErrors('name');

    $superadmin = Role::findByName('Superadmin', 'web');
    signIn($admin)->from('/administration/roles')->patch("/administration/roles/{$superadmin->id}", ['name' => 'Boss'])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'PROTECTED_RESOURCE');

    expect(Role::query()->where('name', 'Night Duty')->exists())->toBeTrue()
        ->and($superadmin->fresh()?->name)->toBe('Superadmin');
});

it('replaces permissions with re-authentication and revokes sessions of affected users only', function (): void {
    $admin = Actors::user(['roles.view', 'permissions.assign']);
    $role = Role::findOrCreate('Night Shift', 'web');
    $role->syncPermissions(['nscmf.view']);
    $affected = Actors::member();
    $affected->assignRole($role);
    $bystander = Actors::requester();
    $affectedSession = Sessions::existing($affected, now()->subMinutes(5)->toDateTimeString());
    $bystanderSession = Sessions::existing($bystander, now()->subMinutes(5)->toDateTimeString());

    signIn($admin)->from('/administration/roles')->put("/administration/roles/{$role->id}/permissions", ['permissions' => ['nscmf.view', 'nscmf.review']])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'REAUTH_REQUIRED');

    signIn($admin)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]])
        ->from('/administration/roles')->put("/administration/roles/{$role->id}/permissions", ['permissions' => ['nscmf.view', 'nscmf.review']])
        ->assertRedirect('/administration/roles');

    expect($role->fresh()?->permissions->pluck('name')->sort()->values()->all())->toBe(['nscmf.review', 'nscmf.view'])
        ->and(DB::table('sessions')->where('id', $affectedSession)->exists())->toBeFalse()
        ->and(DB::table('sessions')->where('id', $bystanderSession)->exists())->toBeTrue()
        ->and(DB::table('security_audit_events')->where('event_type', 'ROLE_PERMISSIONS_CHANGED')->count())->toBe(1);
});

it('rejects wildcard, unknown and session permissions and protects the Superadmin bundle', function (): void {
    $admin = Actors::user(['roles.view', 'permissions.assign']);
    $role = Role::findOrCreate('Night Shift', 'web');
    $reauthed = fn () => signIn($admin)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]])->from('/administration/roles');

    $reauthed()->put("/administration/roles/{$role->id}/permissions", ['permissions' => ['nscmf.*']])->assertSessionHasErrors('permissions.0');
    $reauthed()->put("/administration/roles/{$role->id}/permissions", ['permissions' => ['session.login']])->assertSessionHasErrors('permissions.0');

    $superadmin = Role::findByName('Superadmin', 'web');
    $reauthed()->put("/administration/roles/{$superadmin->id}/permissions", ['permissions' => ['nscmf.view']])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'PROTECTED_RESOURCE');
    expect($superadmin->fresh()?->permissions)->toHaveCount(count(PermissionCatalog::all()));
});
