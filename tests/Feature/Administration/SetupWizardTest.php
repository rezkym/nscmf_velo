<?php

declare(strict_types=1);

use Database\Seeders\ReferenceDataSeeder;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\Support\Actors;

use function Pest\Laravel\seed;

/*
 * BE-042 / BE-043 / T15 — derived setup readiness, no setup column (12 §96.1).
 */

beforeEach(fn () => seed(ReferenceDataSeeder::class));

it('derives readiness from data and resumes where setup stopped', function (): void {
    $superadmin = Actors::superadmin();

    signIn($superadmin)->get('/administration/setup')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Setup')
            ->where('readiness', [
                'roles_configured' => true,
                'teams_configured' => false,
                'users_configured' => false,
                'setup_completed' => false,
                'signing_ready' => false,
            ])
            ->has('roles')->has('teams')->has('users')->has('permissionCatalog'));

    $team = Actors::team('Ops');
    $member = Actors::user([], ['team_id' => $team->id]);
    $member->assignRole(Role::findByName('Requester', 'web'));

    signIn($superadmin)->get('/administration/setup')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('readiness.teams_configured', true)
        ->where('readiness.users_configured', true)
        ->where('readiness.setup_completed', true));
});

it('sends the protected identity to setup from the dashboard until setup is complete', function (): void {
    $superadmin = Actors::superadmin();

    signIn($superadmin)->get('/dashboard')->assertRedirect('/administration/setup');
    signIn(Actors::requester())->get('/dashboard')->assertOk();
});

it('requires the three administration view permissions', function (): void {
    signIn(Actors::user(['roles.view', 'teams.view']))->get('/administration/setup')->assertForbidden();
});
