<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-018 / T05-12 — attachments and resumable upload metadata (11 §39–40, 11A §23–24).
 */

it('keeps transport status and file-security status in separate tables and columns', function (): void {
    expect(Schema::columns('nscmf_attachments'))->toHaveKeys([
        'nscmf_record_id', 'uploaded_by_user_id', 'original_filename', 'extension', 'detected_mime_type', 'size_bytes',
        'sha256', 'quarantine_object_key', 'private_object_key', 'security_status', 'scanned_at', 'scanner_engine',
        'removed_at', 'removed_by_user_id',
    ])
        ->and(Schema::columns('nscmf_attachments')['sha256']['type'])->toBe('char(64)')
        ->and(Schema::columns('nscmf_attachment_upload_sessions'))->toHaveKeys([
            'public_id', 'nscmf_record_id', 'initiated_by_user_id', 'original_filename', 'normalized_extension',
            'client_declared_mime', 'expected_size_bytes', 'chunk_size_bytes', 'expected_chunk_count',
            'client_fingerprint_sha256', 'upload_status', 'last_activity_at', 'expires_at', 'assembly_storage_key',
            'failure_code', 'attachment_id',
        ])
        ->and(array_keys(Schema::columns('nscmf_attachment_upload_sessions')))->not->toContain('security_status')
        ->and(Schema::uniqueIndexes('nscmf_attachment_upload_sessions'))->toContain(['public_id'])
        ->and(Schema::uniqueIndexes('nscmf_attachment_upload_chunks'))->toContain(['upload_session_id', 'chunk_index'])
        ->and(Schema::foreignKeys('nscmf_attachment_upload_chunks'))->toBe(['upload_session_id' => ['nscmf_attachment_upload_sessions', 'id', 'CASCADE']])
        ->and(Schema::foreignKeys('nscmf_attachment_upload_sessions')['nscmf_record_id'])->toBe(['nscmf_records', 'id', 'RESTRICT']);
});

it('rejects invalid security and upload states, empty files and duplicate chunk indexes', function (): void {
    $recordId = SchemaFixtures::record();
    $userId = SchemaFixtures::user('uploader.user');
    $attachment = fn (array $row) => DB::table('nscmf_attachments')->insert(array_merge([
        'nscmf_record_id' => $recordId, 'uploaded_by_user_id' => $userId, 'original_filename' => 'a.pdf', 'extension' => 'pdf',
        'detected_mime_type' => 'application/pdf', 'size_bytes' => 10, 'sha256' => str_repeat('a', 64),
        'security_status' => 'PENDING', 'created_at' => now(), 'updated_at' => now(),
    ], $row));
    $session = fn (array $row) => DB::table('nscmf_attachment_upload_sessions')->insertGetId(array_merge([
        'public_id' => (string) \Illuminate\Support\Str::ulid(), 'nscmf_record_id' => $recordId, 'initiated_by_user_id' => $userId,
        'original_filename' => 'a.pdf', 'normalized_extension' => 'pdf', 'expected_size_bytes' => 10,
        'chunk_size_bytes' => 5_242_880, 'expected_chunk_count' => 1, 'upload_status' => 'UPLOADING',
        'last_activity_at' => now(), 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now(),
    ], $row));

    expect(Schema::rejects(fn () => $attachment(['security_status' => 'SAFE'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $attachment(['size_bytes' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $session(['upload_status' => 'CLEAN'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $session(['upload_status' => 'DRAFT'])))->toBeTrue();

    $sessionId = $session([]);
    $chunk = fn () => DB::table('nscmf_attachment_upload_chunks')->insert([
        'upload_session_id' => $sessionId, 'chunk_index' => 1, 'size_bytes' => 10, 'storage_key' => 'chunks/x/1',
        'accepted_at' => now(), 'created_at' => now(),
    ]);
    $chunk();

    expect(Schema::rejects($chunk))->toBeTrue();
});
