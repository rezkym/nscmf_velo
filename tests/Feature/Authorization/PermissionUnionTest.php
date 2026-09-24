<?php

declare(strict_types=1);

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Support\Actors;

/*
 * BE-032 / T10 — permission-centric authorization: union across roles, role names are not
 * authority, Team never changes eligibility (04 §3, §27, 10 §32).
 */

it('grants the union of every assigned role and nothing else', function (): void {
    $user = Actors::member(['nscmf.view']);
    $reviewing = Role::findOrCreate('Reviewing Duty', 'web');
    $reviewing->syncPermissions(['nscmf.review', 'nscmf.review.forward']);
    $user->assignRole($reviewing);

    expect($user->fresh()?->can('nscmf.view'))->toBeTrue()
        ->and($user->fresh()?->can('nscmf.review.forward'))->toBeTrue()
        ->and($user->fresh()?->can('nscmf.approve'))->toBeFalse();
});

it('does not infer a permission from a role name', function (): void {
    Actors::catalog();
    $lookalike = Role::findOrCreate('Approver Team NOC', 'web');
    $user = Actors::member();
    $user->assignRole($lookalike);

    expect($user->fresh()?->can('nscmf.approve'))->toBeFalse();
});

it('keeps eligibility unchanged when the Team changes', function (): void {
    $user = Actors::reviewer();
    $before = $user->getAllPermissions()->pluck('name')->sort()->values()->all();

    $user->update(['team_id' => Actors::team('Other Team')->id]);

    expect($user->fresh()?->getAllPermissions()->pluck('name')->sort()->values()->all())->toBe($before);
});

it('has no session.login or session.logout permission and no wildcard evaluation', function (): void {
    Actors::catalog();
    $user = Actors::member(['nscmf.review']);

    expect(Permission::query()->whereIn('name', ['session.login', 'session.logout'])->count())->toBe(0)
        ->and($user->can('nscmf.review.forward'))->toBeFalse();
});
