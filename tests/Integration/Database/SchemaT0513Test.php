<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-019 / T05-13 — template versions, exports, snapshots, artifacts, certificates, issuances (11 §41–48).
 */

it('shapes the export and issuance evidence tables', function (): void {
    expect(Schema::uniqueIndexes('nscmf_template_versions'))->toContain(['version_label'])
        ->and(Schema::uniqueIndexes('nscmf_template_versions'))->toContain(['template_sha256'])
        ->and(Schema::columns('nscmf_export_batches'))->toHaveKeys(['requested_by_user_id', 'format', 'created_at'])
        ->and(Schema::columns('nscmf_export_requests'))->toHaveKeys(['nscmf_record_id', 'requested_by_user_id', 'export_batch_id', 'format', 'status', 'requested_at', 'started_at', 'ready_at', 'failed_at', 'expires_at', 'failure_code', 'failure_summary'])
        ->and(Schema::columns('nscmf_export_snapshots')['snapshot_json']['type'])->toBe('json')
        ->and(Schema::columns('nscmf_export_snapshots')['snapshot_sha256']['type'])->toBe('char(64)')
        ->and(Schema::uniqueIndexes('nscmf_export_snapshots'))->toContain(['export_request_id'])
        ->and(Schema::uniqueIndexes('nscmf_export_artifacts'))->toContain(['export_request_id'])
        ->and(Schema::columns('nscmf_export_artifacts'))->toHaveKeys(['private_object_key', 'expires_at', 'binary_purged_at'])
        ->and(Schema::uniqueIndexes('nscmf_signing_certificates'))->toContain(['fingerprint_sha256'])
        ->and(Schema::columns('nscmf_signing_certificates')['public_certificate_material']['type'])->toBe('mediumtext')
        ->and(Schema::uniqueIndexes('nscmf_pdf_issuances'))->toContain(['export_request_id'])
        ->and(Schema::uniqueIndexes('nscmf_pdf_issuances'))->toContain(['export_artifact_id'])
        ->and(Schema::indexes('nscmf_pdf_issuances'))->toContain(['final_pdf_sha256']);

    foreach (array_keys(Schema::columns('nscmf_signing_certificates')) as $column) {
        expect($column)->not->toContain('private')
            ->and($column)->not->toContain('passphrase');
    }
});

it('rejects unknown formats and export states', function (): void {
    $recordId = SchemaFixtures::record();
    $userId = SchemaFixtures::user('exporter.user');
    $request = fn (array $row) => DB::table('nscmf_export_requests')->insert(array_merge([
        'nscmf_record_id' => $recordId, 'requested_by_user_id' => $userId, 'format' => 'PDF', 'status' => 'QUEUED', 'requested_at' => now(),
    ], $row));

    expect(Schema::rejects(fn () => $request(['format' => 'DOCX'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $request(['status' => 'APPROVED'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $request([])))->toBeFalse()
        ->and(Schema::rejects(fn () => DB::table('nscmf_export_batches')->insert(['requested_by_user_id' => $userId, 'format' => 'CSV', 'created_at' => now()])))->toBeTrue();
});
