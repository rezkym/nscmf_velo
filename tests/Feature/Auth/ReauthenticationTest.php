<?php

declare(strict_types=1);

use App\Services\Security\CredentialService;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;

/*
 * BE-031 / T09 — current-password re-authentication with a 15-minute server-side proof
 * (10 §23–26, 12 §79).
 */

it('issues a session-bound proof without returning anything reusable to JavaScript', function (): void {
    $user = Actors::requester();

    $response = signIn($user)->postJson('/account/re-authenticate', ['current_password' => Actors::PASSWORD]);

    $response->assertNoContent();
    expect($response->getContent())->toBe('')
        ->and(session('nscmf.reauthenticated_at'))->toBeInt()
        ->and(DB::table('security_audit_events')->where('event_type', 'REAUTH_SUCCEEDED')->count())->toBe(1);
});

it('refuses a wrong current password with 403 REAUTH_FAILED and no proof', function (): void {
    signIn(Actors::requester())
        ->postJson('/account/re-authenticate', ['current_password' => 'wrong-password'])
        ->assertStatus(403)
        ->assertJson(['code' => 'REAUTH_FAILED', 'errors' => [], 'context' => []]);

    expect(session('nscmf.reauthenticated_at'))->toBeNull()
        ->and(DB::table('security_audit_events')->where('event_type', 'REAUTH_FAILED')->count())->toBe(1);
});

it('validates the re-authentication body with the JSON envelope', function (): void {
    signIn(Actors::requester())
        ->postJson('/account/re-authenticate', [])
        ->assertStatus(422)
        ->assertJson(['code' => 'VALIDATION_FAILED'])
        ->assertJsonStructure(['code', 'message', 'errors' => ['current_password'], 'context']);
});

it('keeps the proof valid for less than fifteen minutes only', function (): void {
    $user = Actors::requester();
    $credentials = app(CredentialService::class);

    signIn($user)->postJson('/account/re-authenticate', ['current_password' => Actors::PASSWORD])->assertNoContent();

    $this->travel(14)->minutes();
    $this->travel(59)->seconds();
    expect($credentials->hasFreshReauthentication(session()->driver()))->toBeTrue();

    $this->travel(1)->seconds();
    expect($credentials->hasFreshReauthentication(session()->driver()))->toBeFalse();
});

it('requires authentication', function (): void {
    $this->postJson('/account/re-authenticate', ['current_password' => 'x'])
        ->assertStatus(401)
        ->assertJson(['code' => 'AUTHENTICATION_REQUIRED']);
});
