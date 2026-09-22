<?php

declare(strict_types=1);

use App\Services\Security\SessionService;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Sessions;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertGuest;

/*
 * BE-029 / BE-030 / T07 — 30-minute idle, 8-hour absolute lifetime, at most two active
 * sessions with deterministic oldest revocation (10 §16–22, 12 §5.1, 11 §50).
 */

it('ends a session after 30 minutes without activity', function (): void {
    $user = Actors::requester();
    $sessionId = Sessions::login($user);

    DB::table('sessions')->where('id', $sessionId)->update(['last_activity' => time() - (31 * 60)]);

    Sessions::reuse($sessionId)->get('/dashboard')->assertRedirect('/login');
});

it('keeps an active session inside the idle window', function (): void {
    $user = Actors::requester();
    $sessionId = Sessions::login($user);

    DB::table('sessions')->where('id', $sessionId)->update(['last_activity' => time() - (29 * 60)]);

    Sessions::reuse($sessionId)->get('/dashboard')->assertOk();
});

it('ends an authenticated session eight hours after login even while active', function (): void {
    $user = Actors::requester();

    signIn($user, time() - (8 * 3600) + 60)->get('/dashboard')->assertOk();
    signIn($user, time() - (8 * 3600) - 1)->get('/dashboard')->assertRedirect('/login');
    assertGuest();
});

it('answers JSON with 401 SESSION_EXPIRED when the absolute lifetime has passed', function (): void {
    signIn(Actors::requester(), time() - (8 * 3600) - 1)
        ->postJson('/account/re-authenticate', ['current_password' => Actors::PASSWORD])
        ->assertStatus(401)
        ->assertExactJson(['code' => 'SESSION_EXPIRED', 'message' => 'Your session has expired. Sign in again.', 'errors' => [], 'context' => []]);
});

it('treats an authenticated session without a lifetime anchor as expired', function (): void {
    actingAs(Actors::requester())->get('/dashboard')->assertRedirect('/login');
});

it('revokes only the oldest session when a third valid login happens', function (): void {
    $user = Actors::requester();
    $oldest = Sessions::existing($user, now()->subHours(3)->toDateTimeString());
    $newer = Sessions::existing($user, now()->subHour()->toDateTimeString());
    $unrelated = Sessions::existing(Actors::requester(), now()->subHours(5)->toDateTimeString());

    $current = Sessions::login($user);

    expect(DB::table('sessions')->where('id', $oldest)->exists())->toBeFalse()
        ->and(DB::table('sessions')->where('id', $newer)->exists())->toBeTrue()
        ->and(DB::table('sessions')->where('id', $current)->exists())->toBeTrue()
        ->and(DB::table('sessions')->where('id', $unrelated)->exists())->toBeTrue()
        ->and(DB::table('sessions')->where('user_id', $user->id)->whereNotNull('authenticated_at')->count())->toBe(2)
        ->and(DB::table('security_audit_events')->where('event_type', 'SESSION_REVOKED')->where('target_user_id', $user->id)->count())->toBe(1);

    Sessions::reuse($oldest)->get('/dashboard')->assertRedirect('/login');
});

it('does not count expired sessions toward the limit of two', function (): void {
    $user = Actors::requester();
    $stale = Sessions::existing($user, now()->subHours(9)->toDateTimeString());
    $idle = Sessions::existing($user, now()->subHours(2)->toDateTimeString(), time() - 3600);
    $active = Sessions::existing($user, now()->subHour()->toDateTimeString());

    Sessions::login($user);

    expect(DB::table('sessions')->where('id', $active)->exists())->toBeTrue()
        ->and(DB::table('security_audit_events')->where('event_type', 'SESSION_REVOKED')->count())->toBe(0);
    unset($stale, $idle);
});

it('revokes every server-side session of a user on demand', function (): void {
    $user = Actors::requester();
    $sessionId = Sessions::login($user);
    Sessions::existing($user, now()->subMinutes(5)->toDateTimeString());

    $revoked = app(SessionService::class)->revokeAllForUser($user->id);

    expect($revoked)->toBe(2)
        ->and(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0);

    Sessions::reuse($sessionId)->get('/dashboard')->assertRedirect('/login');
});
