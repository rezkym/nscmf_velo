<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Sessions;

/*
 * BE-027 / BE-028 / T06 — username/password login, generic failure, throttle, logout
 * (10 §6–15, 12 §5, §76–77).
 */


it('renders the login page for guests and sends signed-in users to the dashboard', function (): void {
    $this->get('/login')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Auth/Login'));

    signIn(Actors::requester())->get('/login')->assertRedirect('/dashboard');
});

it('signs in with username and password, regenerates the session and anchors its lifetime', function (): void {
    $user = Actors::requester();
    $guestSession = session()->getId();

    $response = $this->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD]);

    $response->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
    expect(session()->getId())->not->toBe($guestSession)
        ->and(session('nscmf.authenticated_at'))->toBeInt();

    $row = DB::table('sessions')->where('id', session()->getId())->sole();
    expect($row->user_id)->toBe($user->id)
        ->and($row->authenticated_at)->not->toBeNull()
        ->and(DB::table('security_audit_events')->where('event_type', 'LOGIN_SUCCEEDED')->where('target_user_id', $user->id)->count())->toBe(1);
});

it('accepts the username case-insensitively', function (): void {
    $user = Actors::requester(['username' => 'mixed.case']);

    $this->post('/login', ['username' => 'Mixed.Case', 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
});

it('fails generically without revealing whether the username exists', function (): void {
    $user = Actors::requester();

    $wrongPassword = $this->from('/login')->post('/login', ['username' => $user->username, 'password' => 'not-the-password']);
    $unknownUser = $this->from('/login')->post('/login', ['username' => 'no.such.user', 'password' => 'not-the-password']);

    $wrongPassword->assertRedirect('/login')->assertSessionHasErrors('username');
    $unknownUser->assertRedirect('/login')->assertSessionHasErrors('username');
    expect(session('errors')->get('username'))->toBe(['These credentials do not match our records.']);
    $this->assertGuest();

    $audits = DB::table('security_audit_events')->where('event_type', 'LOGIN_FAILED')->get();
    expect($audits)->toHaveCount(2);
    foreach ($audits as $audit) {
        expect((string) $audit->metadata_json)->not->toContain('not-the-password');
    }
});

it('refuses a disabled account with the same generic message', function (): void {
    $user = Actors::requester(['is_active' => false]);

    $this->from('/login')->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])
        ->assertSessionHasErrors(['username' => 'These credentials do not match our records.']);

    $this->assertGuest();
    expect(DB::table('security_audit_events')->where('event_type', 'LOGIN_ACCOUNT_DISABLED')->count())->toBe(1);
});

it('validates the login body', function (): void {
    $this->from('/login')->post('/login', ['username' => '', 'password' => ''])->assertSessionHasErrors(['username', 'password']);
});

it('throttles after five failures per username and address without locking the account forever', function (): void {
    $user = Actors::requester();

    foreach (range(1, 5) as $attempt) {
        $this->from('/login')->post('/login', ['username' => $user->username, 'password' => 'wrong-'.$attempt]);
    }

    $this->from('/login')->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])
        ->assertSessionHasErrors('throttle');
    $this->assertGuest();
    expect(DB::table('security_audit_events')->where('event_type', 'LOGIN_THROTTLED')->count())->toBe(1);

    $this->travel(61)->seconds();

    $this->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($user);
});

it('resets the failure counter after a successful login', function (): void {
    $user = Actors::requester();

    foreach (range(1, 4) as $attempt) {
        $this->post('/login', ['username' => $user->username, 'password' => 'wrong-'.$attempt]);
    }
    $this->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    $this->post('/logout');

    foreach (range(1, 4) as $attempt) {
        $this->from('/login')->post('/login', ['username' => $user->username, 'password' => 'again-'.$attempt])->assertSessionDoesntHaveErrors('throttle');
    }
});

it('logs out by destroying the server-side session', function (): void {
    $user = Actors::requester();
    $sessionId = Sessions::login($this, $user);

    $this->post('/logout')->assertRedirect('/login');

    $this->assertGuest();
    expect(DB::table('sessions')->where('id', $sessionId)->exists())->toBeFalse()
        ->and(DB::table('security_audit_events')->where('event_type', 'LOGOUT')->count())->toBe(1);

    Sessions::reuse($this, $sessionId)->get('/dashboard')->assertRedirect('/login');
});

it('keeps logout behind CSRF protection', function (): void {
    expect(app(Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class)->getExcludedPaths())->not->toContain('logout')
        ->and(app(Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class)->getExcludedPaths())->not->toContain('login');
});
