<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use App\Models\Team;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;

use function Pest\Laravel\seed;

/*
 * BE-154 / G25 — Users, Roles and Teams lists take page, per_page and q (12 §13, §80, §88, §93).
 */

it('searches users by name or username and echoes the query', function (): void {
    $admin = Actors::user(['users.view'], ['name' => 'Zed Admin']);
    $byName = Actors::user([], ['name' => 'Alice Wonder']);
    $byUsername = Actors::user([], ['name' => 'Bob', 'username' => 'wonder.bob']);

    signIn($admin)->get('/administration/users?q=wonder')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Users/Index')
            ->where('users', fn (Collection $users): bool => $users->pluck('id')->all() === [$byName->id, $byUsername->id])
            ->where('meta.total', 2)
            ->where('query', ['page' => 1, 'per_page' => 25, 'q' => 'wonder'])
            ->has('teams')
            ->has('roles'));
});

it('pages teams by name with meta and a search', function (): void {
    foreach (['Alpha', 'Bravo', 'Charlie'] as $name) {
        Team::query()->create(['name' => $name, 'is_active' => true]);
    }
    $viewer = Actors::user(['teams.view']);

    signIn($viewer)->get('/administration/teams?per_page=2&page=2')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Teams/Index')
            ->where('teams', [['id' => Team::query()->where('name', 'Charlie')->value('id'), 'name' => 'Charlie', 'is_active' => true]])
            ->where('meta', ['current_page' => 2, 'from' => 3, 'last_page' => 2, 'per_page' => 2, 'to' => 3, 'total' => 3])
            ->where('query', ['page' => 2, 'per_page' => 2, 'q' => null]));

    signIn($viewer)->get('/administration/teams?q=rav')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('teams.0.name', 'Bravo')
            ->where('meta.total', 1));
});

it('pages roles by name and keeps the whole permission catalog', function (): void {
    seed(ReferenceDataSeeder::class);

    signIn(Actors::user(['roles.view']))->get('/administration/roles?q=requester&per_page=1')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Roles/Index')
            ->has('roles', 1)
            ->where('roles.0.name', PermissionCatalog::ROLE_REQUESTER)
            ->where('meta.total', 1)
            ->where('query', ['page' => 1, 'per_page' => 1, 'q' => 'requester'])
            ->has('permissionCatalog', count(PermissionCatalog::all())));
});

it('rejects an invalid list query and a missing view permission', function (string $path, string $permission): void {
    $viewer = Actors::user([$permission]);

    signIn($viewer)->get("{$path}?per_page=101")->assertSessionHasErrors('per_page');
    signIn($viewer)->get("{$path}?page=0")->assertSessionHasErrors('page');
    signIn($viewer)->get("{$path}?q=".str_repeat('x', 65))->assertSessionHasErrors('q');
    signIn(Actors::user(['audit.access.view']))->get($path)->assertForbidden();
})->with([
    'users' => ['/administration/users', 'users.view'],
    'roles' => ['/administration/roles', 'roles.view'],
    'teams' => ['/administration/teams', 'teams.view'],
]);
