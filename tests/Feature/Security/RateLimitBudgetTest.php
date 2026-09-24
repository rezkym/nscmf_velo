<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\from;
use function Pest\Laravel\travel;

/*
 * G05 — the approved rate-limit buckets (10 §13, §48; 12 §133). Each bucket belongs to one actor
 * (user, or username + address for login, or address for the public validator): one actor using
 * up its budget never slows down another, and the budget returns after a minute.
 */

const UNKNOWN_UPLOAD = '00000000000000000000000000';

beforeEach(fn () => Storage::fake('nscmf_runtime_tmp'));

it('uses the approved buckets', function (): void {
    expect(config('security.login_throttle'))->toBe(['max_attempts' => 5, 'decay_seconds' => 60])
        ->and(config('security.upload_throttle'))->toBe(['per_minute' => 120, 'finalize_per_minute' => 20])
        ->and(config('security.pdf_validator_throttle'))->toBe(['per_minute' => 10]);
});

it('lets a user fill a record with maximum-size files inside one minute of upload budget', function (): void {
    $chunks = (int) ceil(config()->integer('nscmf.attachments.max_bytes') / config()->integer('nscmf.attachments.chunk_bytes'));
    // Per file: start (or resume) the session, send every chunk, and check the server state once.
    $requestsPerFile = 1 + $chunks + 1;

    expect(config()->integer('nscmf.attachments.max_active') * $requestsPerFile)
        ->toBeLessThanOrEqual(config()->integer('security.upload_throttle.per_minute'))
        ->and(config()->integer('nscmf.attachments.max_active'))
        ->toBeLessThanOrEqual(config()->integer('security.upload_throttle.finalize_per_minute'));
});

it('limits upload traffic per user, leaves other users alone and recovers after a minute', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $other = Actors::requester();
    $otherRecord = Records::create($other);
    $path = fn (int $record): string => "/nscmf/{$record}/attachment-uploads/".UNKNOWN_UPLOAD;

    foreach (range(1, 120) as $request) {
        signIn($owner)->getJson($path($recordId))->assertNotFound();
    }
    signIn($owner)->getJson($path($recordId))->assertStatus(429)->assertJsonPath('code', 'RATE_LIMITED');
    signIn($other)->getJson($path($otherRecord))->assertNotFound();

    travel(61)->seconds();
    signIn($owner)->getJson($path($recordId))->assertNotFound();
});

it('limits upload completion separately, per user', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    $other = Actors::requester();
    $otherRecord = Records::create($other);
    $complete = fn (int $record): string => "/nscmf/{$record}/attachment-uploads/".UNKNOWN_UPLOAD.'/complete';

    foreach (range(1, 20) as $request) {
        signIn($owner)->postJson($complete($recordId))->assertNotFound();
    }
    signIn($owner)->postJson($complete($recordId))->assertStatus(429)->assertJsonPath('code', 'RATE_LIMITED');
    signIn($other)->postJson($complete($otherRecord))->assertNotFound();
    // Chunk traffic has its own bucket and is still open.
    signIn($owner)->getJson("/nscmf/{$recordId}/attachment-uploads/".UNKNOWN_UPLOAD)->assertNotFound();
});

it('limits the public validator per address only', function (): void {
    $verify = fn (string $ip) => asGuest()->withServerVariables(['REMOTE_ADDR' => $ip])
        ->post('/ispdfvalid/verify', ['file' => UploadedFile::fake()->createWithContent('notes.txt', 'x')], ['Accept' => 'application/json']);

    foreach (range(1, 10) as $request) {
        $verify('203.0.113.10')->assertUnprocessable();
    }
    $verify('203.0.113.10')->assertStatus(429)->assertJsonPath('code', 'RATE_LIMITED');
    $verify('203.0.113.20')->assertUnprocessable();
});

it('throttles login per username and address, not the account everywhere', function (): void {
    $user = Actors::requester();
    $attempt = fn (string $ip, string $password) => from('/login')->withServerVariables(['REMOTE_ADDR' => $ip])
        ->post('/login', ['username' => $user->username, 'password' => $password]);

    foreach (range(1, 5) as $failure) {
        $attempt('198.51.100.1', 'wrong-'.$failure);
    }
    $attempt('198.51.100.1', Actors::PASSWORD)->assertSessionHasErrors('throttle');
    $attempt('198.51.100.2', Actors::PASSWORD)->assertRedirect('/dashboard');
});
