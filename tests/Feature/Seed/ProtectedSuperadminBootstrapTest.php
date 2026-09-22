<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

use function Pest\Laravel\artisan;
use function Pest\Laravel\seed;

/*
 * BE-133 / T67 — operator-controlled Protected Superadmin bootstrap (17 §20–25).
 */

beforeEach(fn () => seed(ReferenceDataSeeder::class));

it('creates the canonical protected identity and reveals a random password exactly once', function (): void {
    Log::spy();
    $output = '';

    artisan('nscmf:bootstrap-superadmin')
        ->expectsOutputToContain('Temporary password (shown once):')
        ->assertSuccessful();

    $user = User::query()->where('username', 'superadmin')->sole();
    expect($user->name)->toBe('Protected Superadmin')
        ->and($user->team_id)->toBeNull()
        ->and($user->is_active)->toBeTrue()
        ->and($user->is_protected_superadmin)->toBeTrue()
        ->and($user->must_change_password)->toBeTrue()
        ->and($user->hasRole('Superadmin'))->toBeTrue()
        ->and(Hash::needsRehash($user->password))->toBeFalse();

    foreach (['admin123', 'superadmin', 'password', 'changeme'] as $weak) {
        expect(Hash::check($weak, $user->password))->toBeFalse();
    }

    expect(DB::table('security_audit_events')->where('event_type', 'USER_CREATED')->where('target_user_id', $user->id)->count())->toBe(1);
    Log::shouldNotHaveReceived('info');
    unset($output);
});

it('never resets or re-reveals on rerun', function (): void {
    artisan('nscmf:bootstrap-superadmin')->assertSuccessful();
    $hash = User::query()->where('username', 'superadmin')->value('password');

    artisan('nscmf:bootstrap-superadmin')
        ->doesntExpectOutputToContain('Temporary password')
        ->expectsOutputToContain('already exists')
        ->assertSuccessful();

    expect(User::query()->where('username', 'superadmin')->value('password'))->toBe($hash)
        ->and(User::query()->where('username', 'superadmin')->count())->toBe(1);
});

it('fails visibly when an incompatible superadmin username already exists', function (): void {
    User::query()->create(['name' => 'Impostor', 'username' => 'SuperAdmin', 'password' => 'whatever-1']);

    artisan('nscmf:bootstrap-superadmin')
        ->expectsOutputToContain('not the protected identity')
        ->doesntExpectOutputToContain('Temporary password')
        ->assertFailed();

    expect(User::query()->where('username', 'superadmin')->value('is_protected_superadmin'))->toBeFalse();
});

it('refuses to run before the reference roles exist', function (): void {
    DB::table('role_has_permissions')->delete();
    DB::table('roles')->delete();

    artisan('nscmf:bootstrap-superadmin')->assertFailed();

    expect(User::query()->count())->toBe(0);
});
