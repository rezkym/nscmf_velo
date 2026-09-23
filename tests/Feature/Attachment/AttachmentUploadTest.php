<?php

declare(strict_types=1);

use App\Domain\Attachment\ScanVerdict;
use App\Infrastructure\Malware\MalwareScanner;
use App\Jobs\FinalizeAttachmentUpload;
use App\Models\User;
use App\Services\Attachment\AttachmentFinalizationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\Actors;
use Tests\Support\FakeScanner;
use Tests\Support\Records;

/*
 * BE-089–100 / T38–T45 — resumable upload, whole-file scan, CLEAN promotion, download and
 * logical removal (06 §50–53; 11A; 12 §51–63). The scanner is faked here only; real clamd
 * evidence is tests/Integration/Malware.
 */

beforeEach(function (): void {
    Storage::fake('nscmf_private');
    Queue::fake();
    app()->instance(MalwareScanner::class, new FakeScanner);
});

const PDF_BYTES = "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n";

/** @return array{int, User} */
function editableRecord(): array
{
    $owner = Actors::requester();

    return [Records::create($owner), $owner];
}

function initiateUpload(User $owner, int $recordId, string $filename, int $size, ?string $fingerprint = null): TestResponse
{
    return signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads", array_filter([
        'filename' => $filename, 'size_bytes' => $size, 'fingerprint_sha256' => $fingerprint,
    ], fn ($value) => $value !== null));
}

function putChunk(User $owner, int $recordId, string $uploadId, int $index, string $bytes): TestResponse
{
    return signIn($owner)->call('PUT', "/nscmf/{$recordId}/attachment-uploads/{$uploadId}/chunks/{$index}", [], [], [], [
        'CONTENT_TYPE' => 'application/octet-stream', 'HTTP_ACCEPT' => 'application/json',
    ], $bytes);
}

/** Uploads and completes one file, then runs the queued finalization inline. */
function uploadFile(User $owner, int $recordId, string $filename = 'evidence.pdf', string $bytes = PDF_BYTES): int
{
    $uploadId = initiateUpload($owner, $recordId, $filename, strlen($bytes))->assertCreated()->json('data.upload_id');
    foreach (str_split($bytes, 5_242_880) as $offset => $chunk) {
        putChunk($owner, $recordId, $uploadId, $offset + 1, $chunk)->assertOk();
    }
    signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}/complete")->assertStatus(202);
    $sessionId = (int) DB::table('nscmf_attachment_upload_sessions')->where('public_id', $uploadId)->value('id');
    app(AttachmentFinalizationService::class)->finalize($sessionId);

    return $sessionId;
}

it('initiates an upload with server-owned geometry and resumes the same file', function (): void {
    [$recordId, $owner] = editableRecord();
    $fingerprint = str_repeat('a', 64);

    $first = initiateUpload($owner, $recordId, 'Plan.PDF', 6_000_000, $fingerprint)->assertCreated()
        ->assertJsonPath('data.resumed', false)
        ->assertJsonPath('data.status', 'UPLOADING')
        ->assertJsonPath('data.chunk_size', 5_242_880)
        ->assertJsonPath('data.chunk_count', 2)
        ->assertJsonPath('data.accepted_chunks', [])
        ->assertJsonPath('data.missing_chunks', [1, 2])
        ->assertJsonMissingPath('data.assembly_storage_key');

    initiateUpload($owner, $recordId, 'Plan.PDF', 6_000_000, $fingerprint)->assertOk()
        ->assertJsonPath('data.resumed', true)
        ->assertJsonPath('data.upload_id', $first->json('data.upload_id'));
});

it('refuses disallowed types, empty or oversized files, a full record and ineligible actors', function (): void {
    [$recordId, $owner] = editableRecord();

    initiateUpload($owner, $recordId, 'macro.xlsm', 10)->assertUnprocessable()->assertJsonPath('code', 'ATTACHMENT_TYPE_INVALID');
    initiateUpload($owner, $recordId, 'empty.pdf', 0)->assertUnprocessable()->assertJsonPath('code', 'ATTACHMENT_ZERO_BYTE');
    initiateUpload($owner, $recordId, 'big.pdf', 20_000_001)->assertUnprocessable()->assertJsonPath('code', 'ATTACHMENT_SIZE_INVALID');
    initiateUpload($owner, $recordId, 'max.pdf', 20_000_000)->assertCreated();
    initiateUpload(Actors::requester(), $recordId, 'x.pdf', 10)->assertNotFound();

    foreach (range(1, 9) as $index) {
        initiateUpload($owner, $recordId, "file-{$index}.pdf", 10)->assertCreated();
    }
    initiateUpload($owner, $recordId, 'eleventh.pdf', 10)->assertConflict()->assertJsonPath('code', 'ATTACHMENT_LIMIT_REACHED');

    Records::submitted($submitted = Records::create($owner), $owner);
    initiateUpload($owner, $submitted, 'late.pdf', 10)->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
});

it('accepts chunks idempotently, rejects bad geometry and conflicting bytes', function (): void {
    [$recordId, $owner] = editableRecord();
    $uploadId = initiateUpload($owner, $recordId, 'notes.txt', 5_242_890)->json('data.upload_id');
    $first = str_repeat('a', 5_242_880);

    putChunk($owner, $recordId, $uploadId, 1, 'short')->assertUnprocessable()->assertJsonPath('code', 'UPLOAD_CHUNK_INVALID');
    putChunk($owner, $recordId, $uploadId, 3, 'x')->assertUnprocessable()->assertJsonPath('code', 'UPLOAD_CHUNK_INVALID');
    $accepted = putChunk($owner, $recordId, $uploadId, 1, $first)->assertOk()
        ->assertJsonPath('data.duplicate', false)->assertJsonPath('data.missing_chunks', [2]);

    $this->travel(5)->minutes();
    putChunk($owner, $recordId, $uploadId, 1, $first)->assertOk()
        ->assertJsonPath('data.duplicate', true)
        ->assertJsonPath('data.expires_at', $accepted->json('data.expires_at'));
    putChunk($owner, $recordId, $uploadId, 1, str_repeat('b', 5_242_880))->assertConflict()->assertJsonPath('code', 'UPLOAD_CHUNK_CONFLICT');
    putChunk($owner, $recordId, $uploadId, 2, 'tail12345!')->assertOk()->assertJsonPath('data.missing_chunks', []);

    expect(DB::table('nscmf_attachment_upload_chunks')->count())->toBe(2)
        ->and(Storage::disk('nscmf_private')->allFiles('chunks'))->toHaveCount(2);
});

it('expires an upload 24 hours after the last new progress', function (): void {
    [$recordId, $owner] = editableRecord();
    $uploadId = initiateUpload($owner, $recordId, 'notes.txt', 10)->json('data.upload_id');

    $this->travel(24)->hours();
    $this->travel(1)->seconds();

    putChunk($owner, $recordId, $uploadId, 1, '0123456789')->assertStatus(410)->assertJsonPath('code', 'UPLOAD_SESSION_EXPIRED');
});

it('completes only a full chunk set and queues finalization', function (): void {
    [$recordId, $owner] = editableRecord();
    $uploadId = initiateUpload($owner, $recordId, 'notes.txt', 10)->json('data.upload_id');

    signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}/complete")
        ->assertConflict()->assertJsonPath('code', 'UPLOAD_INCOMPLETE')->assertJsonPath('context.missing_chunks', [1]);
    putChunk($owner, $recordId, $uploadId, 1, '0123456789')->assertOk();
    signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}/complete")
        ->assertStatus(202)->assertJsonPath('data.status', 'ASSEMBLING');

    Queue::assertPushed(FinalizeAttachmentUpload::class);
});

it('promotes an explicitly CLEAN whole file, audits it and serves it only through authorization', function (): void {
    [$recordId, $owner] = editableRecord();
    uploadFile($owner, $recordId);

    $attachment = DB::table('nscmf_attachments')->sole();
    expect($attachment->security_status)->toBe('CLEAN')
        ->and($attachment->sha256)->toBe(hash('sha256', PDF_BYTES))
        ->and($attachment->detected_mime_type)->toBe('application/pdf')
        ->and($attachment->quarantine_object_key)->toBeNull()
        ->and(Records::version($recordId))->toBe(2)
        ->and(DB::table('business_audit_events')->where('event_type', 'ATTACHMENT_ADDED')->count())->toBe(1)
        ->and(DB::table('nscmf_attachment_upload_sessions')->value('upload_status'))->toBe('COMPLETED');

    signIn($owner)->getJson("/nscmf/{$recordId}/attachments/{$attachment->id}")->assertOk()
        ->assertJsonPath('data.security_status', 'CLEAN')
        ->assertJsonMissingPath('data.private_object_key');
    expect(signIn($owner)->get("/nscmf/{$recordId}/attachments/{$attachment->id}/download")->assertOk()->streamedContent())->toBe(PDF_BYTES);
    signIn(Actors::requester())->get("/nscmf/{$recordId}/attachments/{$attachment->id}/download")->assertNotFound();
    expect(DB::table('access_audit_events')->where('event_type', 'ATTACHMENT_DOWNLOADED')->count())->toBe(1);
});

it('keeps infected or unscanned files unusable and records the security outcome', function (?ScanVerdict $verdict, string $status, string $event): void {
    app()->instance(MalwareScanner::class, new FakeScanner($verdict));
    [$recordId, $owner] = editableRecord();
    uploadFile($owner, $recordId);

    $attachment = DB::table('nscmf_attachments')->sole();
    expect($attachment->security_status)->toBe($status)
        ->and($attachment->private_object_key)->toBeNull()
        ->and(Storage::disk('nscmf_private')->allFiles('quarantine'))->toBe([])
        ->and(DB::table('security_audit_events')->where('event_type', $event)->where('attachment_id', $attachment->id)->count())->toBe(1)
        ->and(Records::version($recordId))->toBe(1);
    signIn($owner)->getJson("/nscmf/{$recordId}/attachments/{$attachment->id}/download")->assertConflict()->assertJsonPath('code', 'ATTACHMENT_NOT_CLEAN');
})->with([
    'infected' => [ScanVerdict::INFECTED, 'INFECTED', 'MALWARE_DETECTED'],
    'scanner unavailable' => [null, 'FAILED', 'MALWARE_SCAN_FAILED'],
]);

it('never attaches a file whose record left the editable state during the scan', function (): void {
    [$recordId, $owner] = editableRecord();
    $uploadId = initiateUpload($owner, $recordId, 'evidence.pdf', strlen(PDF_BYTES))->json('data.upload_id');
    putChunk($owner, $recordId, $uploadId, 1, PDF_BYTES)->assertOk();
    signIn($owner)->postJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}/complete")->assertStatus(202);
    Records::submitted($recordId, $owner);

    app(AttachmentFinalizationService::class)->finalize((int) DB::table('nscmf_attachment_upload_sessions')->value('id'));

    expect(DB::table('nscmf_attachments')->value('security_status'))->toBe('FAILED')
        ->and(DB::table('business_audit_events')->where('event_type', 'ATTACHMENT_ADDED')->count())->toBe(0);
});

it('fails an upload whose content does not match its extension', function (): void {
    [$recordId, $owner] = editableRecord();
    uploadFile($owner, $recordId, 'fake.pdf', 'just some text');

    expect(DB::table('nscmf_attachment_upload_sessions')->value('upload_status'))->toBe('FAILED')
        ->and(DB::table('nscmf_attachment_upload_sessions')->value('failure_code'))->toBe('UPLOAD_INTEGRITY_FAILED')
        ->and(DB::table('nscmf_attachments')->count())->toBe(0);
});

it('removes a final attachment logically in an editable record only', function (): void {
    [$recordId, $owner] = editableRecord();
    uploadFile($owner, $recordId);
    $attachmentId = (int) DB::table('nscmf_attachments')->value('id');

    signIn(Actors::requester())->deleteJson("/nscmf/{$recordId}/attachments/{$attachmentId}")->assertNotFound();
    signIn($owner)->deleteJson("/nscmf/{$recordId}/attachments/{$attachmentId}")->assertOk();

    $row = DB::table('nscmf_attachments')->sole();
    expect($row->removed_at)->not->toBeNull()
        ->and($row->removed_by_user_id)->toBe($owner->id)
        ->and($row->private_object_key)->not->toBeNull()
        ->and(DB::table('business_audit_events')->where('event_type', 'ATTACHMENT_REMOVED')->count())->toBe(1);
    signIn($owner)->getJson("/nscmf/{$recordId}/attachments/{$attachmentId}")->assertStatus(410);
});

it('cancels an unfinished upload and discards its chunk bytes', function (): void {
    [$recordId, $owner] = editableRecord();
    $uploadId = initiateUpload($owner, $recordId, 'notes.txt', 10)->json('data.upload_id');
    putChunk($owner, $recordId, $uploadId, 1, '0123456789')->assertOk();

    signIn($owner)->deleteJson("/nscmf/{$recordId}/attachment-uploads/{$uploadId}")->assertOk()->assertJsonPath('data.status', 'CANCELLED');

    expect(Storage::disk('nscmf_private')->allFiles('chunks'))->toBe([]);
    putChunk($owner, $recordId, $uploadId, 1, '0123456789')->assertConflict()->assertJsonPath('code', 'UPLOAD_SESSION_STATE_CONFLICT');
});
