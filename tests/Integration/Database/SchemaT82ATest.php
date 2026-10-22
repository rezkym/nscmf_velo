<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * T82A / G26 — template kinds, the Activity Log report export table and its Access Audit link
 * (11 §36, §41, §44A).
 */

function activityLogTemplate(string $kind = 'ACTIVITY_LOG'): int
{
    return (int) DB::table('nscmf_template_versions')->insertGetId([
        'version_label' => 'log-'.uniqid(), 'private_object_key' => 'templates/x.xlsx',
        'template_sha256' => hash('sha256', uniqid()), 'mapping_version' => 'nscmf-activity-log/v1',
        'template_kind' => $kind, 'is_active' => true, 'created_at' => now(),
    ]);
}

it('gives every template version a kind, NSCMF_FORM by default, and only two kinds exist', function (): void {
    $column = Schema::columns('nscmf_template_versions')['template_kind'];
    expect($column['type'])->toBe('varchar(32)')
        ->and($column['nullable'])->toBeFalse()
        ->and($column['default'])->toBe('NSCMF_FORM')
        ->and(Schema::indexes('nscmf_template_versions'))->toContain(['template_kind', 'is_active']);

    expect(Schema::rejects(fn () => activityLogTemplate('OTHER')))->toBeTrue()
        ->and(Schema::rejects(fn () => activityLogTemplate()))->toBeFalse();
});

it('shapes the Activity Log export table with its snapshot, progress and artifact columns', function (): void {
    expect(Schema::columns('nscmf_activity_log_exports'))->toHaveKeys([
        'requested_by_user_id', 'format', 'status', 'progress_percent', 'template_version_id',
        'snapshot_schema_version', 'snapshot_json', 'snapshot_sha256', 'entry_count',
        'requested_at', 'started_at', 'ready_at', 'failed_at', 'expires_at', 'failure_code', 'failure_summary',
        'private_object_key', 'mime_type', 'size_bytes', 'artifact_sha256', 'binary_purged_at',
    ])
        ->and(Schema::columns('nscmf_activity_log_exports')['snapshot_json']['type'])->toBe('json')
        ->and(Schema::columns('nscmf_activity_log_exports')['progress_percent']['type'])->toBe('tinyint unsigned')
        ->and(Schema::foreignKeys('nscmf_activity_log_exports'))->toMatchArray([
            'requested_by_user_id' => ['users', 'id', 'RESTRICT'],
            'template_version_id' => ['nscmf_template_versions', 'id', 'RESTRICT'],
        ])
        ->and(Schema::indexes('nscmf_activity_log_exports'))->toContain(['requested_by_user_id', 'requested_at'])
        ->and(Schema::indexes('nscmf_activity_log_exports'))->toContain(['status', 'requested_at'])
        ->and(Schema::indexes('nscmf_activity_log_exports'))->toContain(['expires_at', 'binary_purged_at']);
});

it('rejects unknown formats, states, progress outside 0–100 and empty or oversized exports', function (): void {
    $userId = SchemaFixtures::user('log.exporter');
    $templateId = activityLogTemplate();
    $export = fn (array $row) => DB::table('nscmf_activity_log_exports')->insert(array_merge([
        'requested_by_user_id' => $userId, 'format' => 'XLSX', 'status' => 'QUEUED', 'progress_percent' => 0,
        'template_version_id' => $templateId, 'snapshot_schema_version' => 'nscmf-activity-log-snapshot/1',
        'snapshot_json' => '{}', 'snapshot_sha256' => str_repeat('a', 64), 'entry_count' => 1, 'requested_at' => now(),
    ], $row));

    expect(Schema::rejects(fn () => $export([])))->toBeFalse()
        ->and(Schema::rejects(fn () => $export(['format' => 'CSV'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $export(['status' => 'APPROVED'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $export(['progress_percent' => 101])))->toBeTrue()
        ->and(Schema::rejects(fn () => $export(['entry_count' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $export(['entry_count' => 1001])))->toBeTrue();
});

it('links an Access Audit event to the Activity Log export it concerns', function (): void {
    expect(Schema::foreignKeys('access_audit_events'))->toHaveKey('activity_log_export_id')
        ->and(Schema::foreignKeys('access_audit_events')['activity_log_export_id'])->toBe(['nscmf_activity_log_exports', 'id', 'RESTRICT'])
        ->and(Schema::columns('access_audit_events')['activity_log_export_id']['nullable'])->toBeTrue();
});
