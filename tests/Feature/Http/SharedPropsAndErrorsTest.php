<?php

declare(strict_types=1);

use App\Domain\Administration\PermissionCatalog;
use App\Domain\Shared\DomainRuleException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;

use function Pest\Laravel\from;
use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

/*
 * BE-023 / T05C — shared auth props, session transport and the error envelope
 * (12 §8–12, §100–107).
 */

it('shares only the safe auth context and effective permissions', function (): void {
    $user = Actors::member(['nscmf.view', 'nscmf.create']);

    signIn($user)->get('/dashboard')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('auth.user.id', $user->id)
        ->where('auth.user.username', $user->username)
        ->where('auth.user.name', $user->name)
        ->where('auth.user.team_id', $user->team_id)
        ->where('auth.user.team.name', $user->team?->name)
        ->where('auth.user.must_change_password', false)
        ->where('auth.permissions', ['nscmf.create', 'nscmf.view'])
        ->missing('auth.user.password')
        ->missing('auth.user.remember_token')
        ->where('auth.user.is_protected_superadmin', false)
        ->etc());
});

// 07 §51: Technical Log settings exist only for the Protected Superadmin, so the shell needs to
// know whether the signed-in user is that identity. It is the user's own marker, never a grant.
it('tells the Protected Superadmin, and only them, that they are the protected identity', function (): void {
    $superadmin = Actors::superadmin();
    signIn($superadmin)->get('/administration/users')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('auth.user.is_protected_superadmin', true)
        ->etc());

    $admin = Actors::user(PermissionCatalog::all());
    signIn($admin)->get('/administration/users')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('auth.user.is_protected_superadmin', false)
        ->where('auth.permissions', fn (Collection $permissions): bool => $permissions->contains('system.settings.manage'))
        ->etc());
});

it('shares a null user and no permissions to guests', function (): void {
    get('/login')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('auth.user', null)
        ->where('auth.permissions', []));
});

it('sends unauthenticated page requests to login and JSON requests a 401 envelope', function (): void {
    get('/dashboard')->assertRedirect('/login');

    getJson('/dashboard')->assertStatus(401)->assertExactJson([
        'code' => 'AUTHENTICATION_REQUIRED',
        'message' => 'Sign in to continue.',
        'errors' => [],
        'context' => [],
    ]);
});

it('maps domain rule failures to the JSON envelope or the flashed domain_error', function (): void {
    Route::middleware('web')->post('/__test/domain-error', fn () => throw new DomainRuleException(
        'NSCMF_VERSION_CONFLICT', 'A newer version of this record exists.', 409, ['latest_record_version' => 4],
    ));

    postJson('/__test/domain-error')->assertStatus(409)->assertExactJson([
        'code' => 'NSCMF_VERSION_CONFLICT',
        'message' => 'A newer version of this record exists.',
        'errors' => [],
        'context' => ['latest_record_version' => 4],
    ]);

    from('/somewhere')->post('/__test/domain-error')
        ->assertRedirect('/somewhere')
        ->assertSessionHas('inertia.flash_data.domain_error', ['code' => 'NSCMF_VERSION_CONFLICT', 'message' => 'A newer version of this record exists.']);
});

it('never leaks SQL, paths or stack traces from an unexpected JSON failure', function (): void {
    config(['app.debug' => false]);
    Route::middleware('web')->get('/__test/boom', fn () => throw new RuntimeException('SQLSTATE[42S02] /var/secret/path.php'));

    $response = getJson('/__test/boom');

    $response->assertStatus(500)->assertExactJson([
        'code' => 'SERVER_ERROR',
        'message' => 'Something went wrong. Try again later.',
        'errors' => [],
        'context' => [],
    ]);
    expect((string) $response->getContent())->not->toContain('SQLSTATE')
        ->and((string) $response->getContent())->not->toContain('/var/secret');
});

it('keeps permission hints as hints: a handcrafted request without permission is still refused', function (): void {
    Route::middleware(['web', 'auth', 'can:nscmf.review'])->get('/__test/review-only', fn () => 'ok');

    signIn(Actors::member(['nscmf.view']))->getJson('/__test/review-only')
        ->assertForbidden()
        ->assertExactJson(['code' => 'FORBIDDEN', 'message' => 'You are not allowed to do this.', 'errors' => [], 'context' => []]);
});
