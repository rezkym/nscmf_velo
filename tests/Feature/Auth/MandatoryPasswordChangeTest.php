<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Sessions;

use function Pest\Laravel\from;
use function Pest\Laravel\post;

/*
 * BE-035 / BE-036 / T08 — mandatory temporary-password replacement (10 §7, §11; 12 §78 as
 * synchronized 2026-09-22).
 */

it('renders the change page only while a change is required', function (): void {
    signIn(Actors::requester(['must_change_password' => true]))
        ->get('/account/temporary-password')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('Auth/ChangeTemporaryPassword')->where('auth.user.must_change_password', true));

    signIn(Actors::requester())->get('/account/temporary-password')->assertRedirect('/dashboard');
});

it('blocks every other page and JSON action until the password is replaced', function (): void {
    $user = Actors::requester(['must_change_password' => true]);

    signIn($user)->get('/dashboard')->assertRedirect('/account/temporary-password');
    signIn($user)->postJson('/account/re-authenticate', ['current_password' => Actors::PASSWORD])
        ->assertForbidden()
        ->assertJson(['code' => 'PASSWORD_CHANGE_REQUIRED']);
    signIn($user)->post('/logout')->assertRedirect('/login');
});

it('rejects five characters and a mismatched confirmation, and accepts six simple characters', function (): void {
    $user = Actors::requester(['must_change_password' => true]);

    signIn($user);
    from('/account/temporary-password')->post('/account/temporary-password/change', ['password' => 'abcde', 'password_confirmation' => 'abcde'])
        ->assertSessionHasErrors('password');
    from('/account/temporary-password')->post('/account/temporary-password/change', ['password' => 'abcdef', 'password_confirmation' => 'abcdeg'])
        ->assertSessionHasErrors('password');

    post('/account/temporary-password/change', ['password' => 'abcdef', 'password_confirmation' => 'abcdef'])->assertRedirect('/dashboard');

    $user->refresh();
    expect($user->must_change_password)->toBeFalse()
        ->and(Hash::check('abcdef', $user->password))->toBeTrue()
        ->and(Hash::check(Actors::PASSWORD, $user->password))->toBeFalse()
        ->and(DB::table('users')->where('id', $user->id)->value('password_changed_at'))->not->toBeNull()
        ->and(DB::table('security_audit_events')->where('event_type', 'TEMPORARY_PASSWORD_REPLACED')->where('target_user_id', $user->id)->count())->toBe(1);

    $audit = json_encode(DB::table('security_audit_events')->get(), JSON_THROW_ON_ERROR);
    expect($audit)->not->toContain('abcdef');
});

it('ends the other sessions of the account once the credential changes', function (): void {
    $user = Actors::requester(['must_change_password' => true]);
    $other = Sessions::existing($user, now()->subMinutes(10)->toDateTimeString());
    $current = Sessions::login($user);

    Sessions::reuse($current)->post('/account/temporary-password/change', ['password' => 'new-pass', 'password_confirmation' => 'new-pass'])
        ->assertRedirect('/dashboard');

    expect(DB::table('sessions')->where('id', $other)->exists())->toBeFalse();
});

it('refuses the change action for an account that has no pending change', function (): void {
    signIn(Actors::requester())
        ->from('/dashboard')
        ->post('/account/temporary-password/change', ['password' => 'abcdef', 'password_confirmation' => 'abcdef'])
        ->assertRedirect('/dashboard')
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'PASSWORD_CHANGE_NOT_PENDING');
});

it('sends a freshly bootstrapped account straight to the change page after login', function (): void {
    $user = Actors::requester(['must_change_password' => true]);

    post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    signIn($user)->get('/dashboard')->assertRedirect('/account/temporary-password');
});
