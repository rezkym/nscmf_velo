<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\Support\Actors;
use Tests\Support\Sessions;
use Tests\TestCase;

/*
 * BE-039 / BE-040 / T13 — user list/profile, enable/disable, role and Team assignment
 * (04 §16, 10 §22, 12 §80–87, §96.2).
 */

function reauthenticated(User $user): TestCase
{
    return signIn($user)->withSession([
        'nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()],
    ]);
}

it('lists users with a safe, paginated projection', function (): void {
    $admin = Actors::user(['users.view']);
    $member = Actors::reviewer();

    signIn($admin)->get('/administration/users?per_page=100')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Users/Index')
            ->where('meta.per_page', 100)
            ->where('meta.total', 2)
            ->where('users', fn (Collection $users): bool => $users->contains(fn (array $row): bool => $row['id'] === $member->id
                && $row['username'] === $member->username
                && $row['team_id'] === $member->team_id
                && $row['team_name'] === $member->team?->name
                && $row['is_active'] === true
                && $row['is_protected_superadmin'] === false
                && ! array_key_exists('password', $row)))
            ->has('teams')
            ->has('roles'));

    signIn($admin)->get('/administration/users?per_page=101')->assertSessionHasErrors('per_page');
    signIn(Actors::user(['teams.view']))->get('/administration/users')->assertForbidden();
});

it('updates only the profile name through PATCH', function (): void {
    $admin = Actors::user(['users.view', 'users.update']);
    $target = Actors::requester();

    signIn($admin)->from('/administration/users')->patch("/administration/users/{$target->id}", ['name' => 'Renamed Person'])
        ->assertRedirect('/administration/users');
    signIn($admin)->from('/administration/users')->patch("/administration/users/{$target->id}", ['name' => 'X', 'is_active' => false])
        ->assertSessionHasErrors('is_active');

    expect($target->fresh()?->name)->toBe('Renamed Person')->and($target->fresh()?->is_active)->toBeTrue();
});

it('disables with re-authentication, revokes every target session, and enables again', function (): void {
    $admin = Actors::user(['users.view', 'users.disable', 'users.enable']);
    $target = Actors::requester();
    $targetSession = Sessions::existing($target, now()->subMinutes(5)->toDateTimeString());

    signIn($admin)->from('/administration/users')->post("/administration/users/{$target->id}/disable")
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'REAUTH_REQUIRED');
    expect($target->fresh()?->is_active)->toBeTrue();

    reauthenticated($admin)->from('/administration/users')->post("/administration/users/{$target->id}/disable")->assertRedirect('/administration/users');
    expect($target->fresh()?->is_active)->toBeFalse()
        ->and(DB::table('sessions')->where('id', $targetSession)->exists())->toBeFalse()
        ->and(DB::table('security_audit_events')->where('event_type', 'USER_DISABLED')->where('target_user_id', $target->id)->count())->toBe(1);

    signIn($admin)->from('/administration/users')->post("/administration/users/{$target->id}/enable")->assertRedirect('/administration/users');
    expect($target->fresh()?->is_active)->toBeTrue();
});

it('replaces roles with re-authentication and revokes the target sessions when access changes', function (): void {
    Actors::catalog();
    $admin = Actors::user(['users.view', 'users.assign_roles']);
    $target = Actors::requester();
    $reviewer = Role::findOrCreate('Reviewer Duty', 'web');
    $reviewer->syncPermissions(['nscmf.review']);
    $session = Sessions::existing($target, now()->subMinutes(5)->toDateTimeString());

    reauthenticated($admin)->from('/administration/users')->put("/administration/users/{$target->id}/roles", ['role_ids' => [$reviewer->id]])
        ->assertRedirect('/administration/users');

    expect($target->fresh()?->getRoleNames()->all())->toBe(['Reviewer Duty'])
        ->and(DB::table('sessions')->where('id', $session)->exists())->toBeFalse()
        ->and(DB::table('security_audit_events')->where('event_type', 'USER_ROLES_CHANGED')->count())->toBe(1);

    reauthenticated($admin)->from('/administration/users')->put("/administration/users/{$target->id}/roles", ['role_ids' => [999999]])
        ->assertSessionHasErrors('role_ids.0');
    reauthenticated($admin)->from('/administration/users')->put("/administration/users/{$target->id}/roles", ['role_ids' => [$reviewer->id], 'permissions' => ['nscmf.approve']])
        ->assertSessionHasErrors('permissions');
});

it('moves a user to another active Team with either Team permission and without revoking sessions', function (string $permission): void {
    $admin = Actors::user(['users.view', $permission]);
    $target = Actors::reviewer();
    $newTeam = Actors::team('Beta');
    $session = Sessions::existing($target, now()->subMinutes(5)->toDateTimeString());
    $before = $target->getAllPermissions()->pluck('name')->sort()->values()->all();

    signIn($admin)->from('/administration/users')->put("/administration/users/{$target->id}/team", ['team_id' => $newTeam->id])
        ->assertRedirect('/administration/users');

    expect($target->fresh()?->team_id)->toBe($newTeam->id)
        ->and(DB::table('sessions')->where('id', $session)->exists())->toBeTrue()
        ->and($target->fresh()?->getAllPermissions()->pluck('name')->sort()->values()->all())->toBe($before);
})->with(['users.assign_team', 'teams.assign_users']);

it('refuses Team assignment without either Team permission or to an inactive Team', function (): void {
    $target = Actors::reviewer();
    $inactive = Actors::team('Retired', false);

    signIn(Actors::user(['users.view', 'users.update']))->put("/administration/users/{$target->id}/team", ['team_id' => $inactive->id])->assertForbidden();
    signIn(Actors::user(['users.assign_team']))->from('/administration/users')->put("/administration/users/{$target->id}/team", ['team_id' => $inactive->id])
        ->assertSessionHasErrors('team_id');
});

it('answers 404 for an unknown user id', function (): void {
    signIn(Actors::user(['users.update']))->patch('/administration/users/999999', ['name' => 'Ghost'])->assertNotFound();
});
