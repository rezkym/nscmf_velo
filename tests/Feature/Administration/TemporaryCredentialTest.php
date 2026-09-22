<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\Models\Role;
use Tests\Support\Actors;
use Tests\Support\Sessions;
use Tests\TestCase;

/*
 * BE-034 / BE-039 / T08, T13 — server-generated one-time temporary credential over the JSON
 * no-store channel (10 §11–12, 12 §81, §85, §96.2, §105, §122).
 */

function reauthed(User $user): TestCase
{
    return signIn($user)->withSession(['nscmf' => ['authenticated_at' => time(), 'reauthenticated_at' => time()]]);
}

/**
 * @return array<string, mixed>
 */
function createBody(int $teamId, int $roleId, array $overrides = []): array
{
    return ['name' => 'Example User', 'username' => 'example.user', 'team_id' => $teamId, 'role_ids' => [$roleId], ...$overrides];
}

it('creates a user and reveals the generated password once, no-store, hash only', function (): void {
    Actors::catalog();
    $log = Log::spy();
    $admin = Actors::user(['users.view', 'users.create']);
    $team = Actors::team('Gamma');
    $role = Role::findOrCreate('Requester Duty', 'web');

    $response = reauthed($admin)->postJson('/administration/users', createBody($team->id, (int) $role->id));

    $response->assertCreated()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('meta.temporary_password_reveal', 'ONE_TIME_ONLY')
        ->assertJsonPath('data.user.username', 'example.user')
        ->assertJsonPath('data.user.must_change_password', true);

    $plain = $response->json('data.temporary_password');
    expect($plain)->toBeString()->and(strlen((string) $plain))->toBeGreaterThanOrEqual(12);

    $user = User::query()->where('username', 'example.user')->sole();
    expect(Hash::check((string) $plain, $user->password))->toBeTrue()
        ->and($user->must_change_password)->toBeTrue()
        ->and($user->team_id)->toBe($team->id)
        ->and($user->hasRole('Requester Duty'))->toBeTrue();

    $everything = json_encode([
        DB::table('users')->get(), DB::table('security_audit_events')->get(), DB::table('sessions')->get(), DB::table('cache')->get(), session()->all(),
    ], JSON_THROW_ON_ERROR);
    expect($everything)->not->toContain((string) $plain);
    foreach (['info', 'warning', 'error', 'debug', 'notice', 'log'] as $level) {
        $log->shouldNotHaveReceived($level);
    }
});

it('refuses an admin-chosen password and unknown keys', function (): void {
    Actors::catalog();
    $admin = Actors::user(['users.create']);
    $role = Role::findOrCreate('R', 'web');
    $team = Actors::team();

    reauthed($admin)->postJson('/administration/users', createBody($team->id, (int) $role->id, ['password' => 'chosen-by-admin']))
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors('password', 'errors');
    reauthed($admin)->postJson('/administration/users', createBody($team->id, (int) $role->id, ['is_protected_superadmin' => true]))
        ->assertStatus(422);
    expect(User::query()->where('username', 'example.user')->exists())->toBeFalse();
});

it('requires users.create, fresh re-authentication, an active Team and a unique username', function (): void {
    Actors::catalog();
    $role = Role::findOrCreate('R', 'web');
    $team = Actors::team();
    $inactive = Actors::team('Old', false);
    $admin = Actors::user(['users.create']);

    reauthed(Actors::user(['users.view']))->postJson('/administration/users', createBody($team->id, (int) $role->id))->assertForbidden();
    signIn($admin)->postJson('/administration/users', createBody($team->id, (int) $role->id))->assertForbidden()->assertJsonPath('code', 'REAUTH_REQUIRED');
    reauthed($admin)->postJson('/administration/users', createBody($inactive->id, (int) $role->id))->assertStatus(422)->assertJsonValidationErrors('team_id', 'errors');

    Actors::user([], ['username' => 'Example.User']);
    reauthed($admin)->postJson('/administration/users', createBody($team->id, (int) $role->id))->assertStatus(422)->assertJsonValidationErrors('username', 'errors');
});

it('resets a password with a new secret, revokes the target sessions and offers no retrieval', function (): void {
    $admin = Actors::user(['users.view', 'users.reset_password']);
    $target = Actors::requester();
    $session = Sessions::existing($target, now()->subMinutes(5)->toDateTimeString());

    $first = reauthed($admin)->postJson("/administration/users/{$target->id}/reset-password")
        ->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.user_id', $target->id)
        ->assertJsonPath('data.must_change_password', true)
        ->assertJsonPath('meta.temporary_password_reveal', 'ONE_TIME_ONLY')
        ->json('data.temporary_password');

    $target->refresh();
    expect(Hash::check((string) $first, $target->password))->toBeTrue()
        ->and(Hash::check(Actors::PASSWORD, $target->password))->toBeFalse()
        ->and($target->must_change_password)->toBeTrue()
        ->and(DB::table('sessions')->where('id', $session)->exists())->toBeFalse();

    $second = reauthed($admin)->postJson("/administration/users/{$target->id}/reset-password")->json('data.temporary_password');
    expect($second)->not->toBe($first)
        ->and(Hash::check((string) $first, (string) $target->fresh()?->password))->toBeFalse();

    signIn($admin)->getJson("/administration/users/{$target->id}/temporary-password")->assertNotFound();
});

it('never resets the protected identity through administration', function (): void {
    $protected = Actors::superadmin();
    $admin = Actors::user(['users.reset_password']);
    $hash = $protected->password;

    reauthed($admin)->postJson("/administration/users/{$protected->id}/reset-password")
        ->assertForbidden()->assertJsonPath('code', 'PROTECTED_RESOURCE');

    expect($protected->fresh()?->password)->toBe($hash);
});
