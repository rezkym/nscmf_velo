<?php

declare(strict_types=1);

use App\Models\Team;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;

/*
 * BE-038 / T12 — Team administration as organizational metadata (04 §18, 12 §93–96, §96.2).
 */

it('lists Teams for teams.view only', function (): void {
    $team = Actors::team('Alpha');

    signIn(Actors::user(['teams.view']))->get('/administration/teams')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Teams/Index')
            ->has('teams', 1)
            ->where('teams.0', ['id' => $team->id, 'name' => $team->name, 'is_active' => true]));

    signIn(Actors::user(['users.view']))->get('/administration/teams')->assertForbidden();
});

it('creates and renames a Team with exact bodies and case-insensitive uniqueness', function (): void {
    $admin = Actors::user(['teams.view', 'teams.create', 'teams.update']);

    signIn($admin)->from('/administration/teams')->post('/administration/teams', ['name' => '  Team Ops  '])
        ->assertRedirect('/administration/teams');
    $team = Team::query()->where('name', 'Team Ops')->sole();

    signIn($admin)->from('/administration/teams')->post('/administration/teams', ['name' => 'team ops'])
        ->assertSessionHasErrors('name');
    signIn($admin)->from('/administration/teams')->post('/administration/teams', ['name' => 'X', 'is_active' => false])
        ->assertSessionHasErrors('is_active');
    signIn($admin)->from('/administration/teams')->patch("/administration/teams/{$team->id}", ['name' => 'Team Operations'])
        ->assertRedirect('/administration/teams');

    expect($team->fresh()?->name)->toBe('Team Operations')
        ->and(DB::table('security_audit_events')->whereIn('event_type', ['TEAM_CREATED', 'TEAM_UPDATED'])->count())->toBe(2);
});

it('deactivates and reactivates without any permission side effect', function (): void {
    $admin = Actors::user(['teams.view', 'teams.archive']);
    $member = Actors::reviewer();
    $team = $member->team;
    assert($team instanceof Team);
    $before = $member->getAllPermissions()->pluck('name')->sort()->values()->all();

    signIn($admin)->from('/administration/teams')->post("/administration/teams/{$team->id}/deactivate")->assertRedirect('/administration/teams');
    expect($team->fresh()?->is_active)->toBeFalse()
        ->and($member->fresh()?->getAllPermissions()->pluck('name')->sort()->values()->all())->toBe($before);

    signIn($admin)->from('/administration/teams')->post("/administration/teams/{$team->id}/deactivate")
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'TEAM_STATE_CONFLICT');

    signIn($admin)->from('/administration/teams')->post("/administration/teams/{$team->id}/reactivate")->assertRedirect('/administration/teams');
    expect($team->fresh()?->is_active)->toBeTrue();
});

it('refuses Team mutations without their permission', function (): void {
    $team = Actors::team();
    $viewer = Actors::user(['teams.view']);

    signIn($viewer)->post('/administration/teams', ['name' => 'Nope'])->assertForbidden();
    signIn($viewer)->patch("/administration/teams/{$team->id}", ['name' => 'Nope'])->assertForbidden();
    signIn($viewer)->post("/administration/teams/{$team->id}/deactivate")->assertForbidden();
    expect(Team::query()->where('name', 'Nope')->exists())->toBeFalse();
});
