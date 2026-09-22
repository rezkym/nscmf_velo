<?php

declare(strict_types=1);

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Sessions;

use function Pest\Laravel\assertAuthenticatedAs;
use function Pest\Laravel\assertGuest;
use function Pest\Laravel\from;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\travel;

/*
 * BE-027 / BE-028 / T06 — username/password login, generic failure, throttle, logout
 * (10 §6–15, 12 §5, §76–77).
 */

it('renders the login page for guests and sends signed-in users to the dashboard', function (): void {
    get('/login')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Auth/Login'));

    signIn(Actors::requester())->get('/login')->assertRedirect('/dashboard');
});

it('signs in with username and password, regenerates the session and anchors its lifetime', function (): void {
    $user = Actors::requester();
    $guestSession = session()->getId();

    $response = post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD]);

    $response->assertRedirect('/dashboard');
    assertAuthenticatedAs($user);
    expect(session()->getId())->not->toBe($guestSession)
        ->and(session('nscmf.authenticated_at'))->toBeInt();

    $row = DB::table('sessions')->where('id', session()->getId())->sole();
    expect($row->user_id)->toBe($user->id)
        ->and($row->authenticated_at)->not->toBeNull()
        ->and(DB::table('security_audit_events')->where('event_type', 'LOGIN_SUCCEEDED')->where('target_user_id', $user->id)->count())->toBe(1);
});

it('accepts the username case-insensitively', function (): void {
    $user = Actors::requester(['username' => 'mixed.case']);

    post('/login', ['username' => 'Mixed.Case', 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    assertAuthenticatedAs($user);
});

it('fails generically without revealing whether the username exists', function (): void {
    $user = Actors::requester();

    $wrongPassword = from('/login')->post('/login', ['username' => $user->username, 'password' => 'not-the-password']);
    $unknownUser = from('/login')->post('/login', ['username' => 'no.such.user', 'password' => 'not-the-password']);

    $wrongPassword->assertRedirect('/login')->assertSessionHasErrors('username');
    $unknownUser->assertRedirect('/login')->assertSessionHasErrors('username');
    $unknownUser->assertSessionHasErrors(['username' => 'These credentials do not match our records.']);
    assertGuest();

    $audits = DB::table('security_audit_events')->where('event_type', 'LOGIN_FAILED')->get();
    expect($audits)->toHaveCount(2);
    foreach ($audits as $audit) {
        expect(json_encode($audit, JSON_THROW_ON_ERROR))->not->toContain('not-the-password');
    }
});

it('refuses a disabled account with the same generic message', function (): void {
    $user = Actors::requester(['is_active' => false]);

    from('/login')->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])
        ->assertSessionHasErrors(['username' => 'These credentials do not match our records.']);

    assertGuest();
    expect(DB::table('security_audit_events')->where('event_type', 'LOGIN_ACCOUNT_DISABLED')->count())->toBe(1);
});

it('validates the login body', function (): void {
    from('/login')->post('/login', ['username' => '', 'password' => ''])->assertSessionHasErrors(['username', 'password']);
});

it('throttles after five failures per username and address without locking the account forever', function (): void {
    $user = Actors::requester();

    foreach (range(1, 5) as $attempt) {
        from('/login')->post('/login', ['username' => $user->username, 'password' => 'wrong-'.$attempt]);
    }

    from('/login')->post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])
        ->assertSessionHasErrors('throttle');
    assertGuest();
    expect(DB::table('security_audit_events')->where('event_type', 'LOGIN_THROTTLED')->count())->toBe(1);

    travel(61)->seconds();

    post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    assertAuthenticatedAs($user);
});

it('resets the failure counter after a successful login', function (): void {
    $user = Actors::requester();

    foreach (range(1, 4) as $attempt) {
        post('/login', ['username' => $user->username, 'password' => 'wrong-'.$attempt]);
    }
    post('/login', ['username' => $user->username, 'password' => Actors::PASSWORD])->assertRedirect('/dashboard');
    post('/logout');

    foreach (range(1, 4) as $attempt) {
        from('/login')->post('/login', ['username' => $user->username, 'password' => 'again-'.$attempt])->assertSessionDoesntHaveErrors('throttle');
    }
});

it('logs out by destroying the server-side session', function (): void {
    $user = Actors::requester();
    $sessionId = Sessions::login($user);

    Sessions::reuse($sessionId)->post('/logout')->assertRedirect('/login');

    assertGuest();
    expect(DB::table('sessions')->where('id', $sessionId)->exists())->toBeFalse()
        ->and(DB::table('security_audit_events')->where('event_type', 'LOGOUT')->count())->toBe(1);

    Sessions::reuse($sessionId)->get('/dashboard')->assertRedirect('/login');
});

it('keeps logout behind CSRF protection', function (): void {
    expect(app(ValidateCsrfToken::class)->getExcludedPaths())->not->toContain('logout')
        ->and(app(ValidateCsrfToken::class)->getExcludedPaths())->not->toContain('login');
});
