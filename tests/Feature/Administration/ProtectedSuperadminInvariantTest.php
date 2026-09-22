<?php

declare(strict_types=1);

use Spatie\Permission\Models\Role;
use Tests\Support\Actors;

/*
 * BE-033 / T11 — Protected Superadmin invariants without a universal bypass (02 §3, 04 §10).
 */

it('refuses to disable the protected identity or remove its Superadmin role, without partial writes', function (): void {
    $protected = Actors::superadmin();
    $admin = Actors::user(['users.view', 'users.disable', 'users.assign_roles']);
    $other = Role::findOrCreate('Something Else', 'web');
    $reauthed = fn () => signIn($admin)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]])->from('/administration/users');

    $reauthed()->post("/administration/users/{$protected->id}/disable")->assertSessionHas('inertia.flash_data.domain_error.code', 'PROTECTED_RESOURCE');
    $reauthed()->put("/administration/users/{$protected->id}/roles", ['role_ids' => [$other->id]])->assertSessionHas('inertia.flash_data.domain_error.code', 'PROTECTED_RESOURCE');

    $protected->refresh();
    expect($protected->is_active)->toBeTrue()
        ->and($protected->getRoleNames()->all())->toBe(['Superadmin']);
});

it('lets the protected identity keep Superadmin while gaining another role', function (): void {
    $protected = Actors::superadmin();
    $admin = Actors::user(['users.assign_roles']);
    $superadmin = Role::findByName('Superadmin', 'web');
    $extra = Role::findOrCreate('Extra', 'web');

    signIn($admin)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]])
        ->from('/administration/users')
        ->put("/administration/users/{$protected->id}/roles", ['role_ids' => [$superadmin->id, $extra->id]])
        ->assertRedirect('/administration/users');

    expect($protected->fresh()?->getRoleNames()->sort()->values()->all())->toBe(['Extra', 'Superadmin']);
});

it('treats a normal user holding the Superadmin role as not protected', function (): void {
    Actors::superadmin();
    $normal = Actors::user();
    $normal->assignRole('Superadmin');
    $admin = Actors::user(['users.disable']);

    signIn($admin)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]])
        ->from('/administration/users')->post("/administration/users/{$normal->id}/disable")
        ->assertRedirect('/administration/users');

    expect($normal->fresh()?->is_active)->toBeFalse();
});
