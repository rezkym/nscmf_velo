<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-017 / T05-11 — Business, Access and Security Audit tables (11 §34–38).
 */

it('keeps the three authoritative audits physically separate and append-shaped', function (): void {
    expect(array_keys(Schema::columns('business_audit_events')))->toEqualCanonicalizing([
        'id', 'nscmf_record_id', 'workflow_iteration_id', 'actor_user_id', 'actor_type', 'event_type', 'from_status',
        'to_status', 'reason', 'comment', 'record_version_before', 'record_version_after', 'metadata_json', 'occurred_at',
    ])
        ->and(array_keys(Schema::columns('business_audit_changes')))->toEqualCanonicalizing([
            'id', 'business_audit_event_id', 'field_path', 'value_kind', 'old_value_text', 'new_value_text',
        ])
        ->and(Schema::columns('business_audit_changes')['old_value_text']['type'])->toBe('longtext')
        ->and(array_keys(Schema::columns('access_audit_events')))->toEqualCanonicalizing([
            'id', 'actor_user_id', 'event_type', 'nscmf_record_id', 'attachment_id', 'export_request_id', 'occurred_at',
        ])
        ->and(array_keys(Schema::columns('security_audit_events')))->toEqualCanonicalizing([
            'id', 'actor_user_id', 'target_user_id', 'subject_username', 'event_type', 'outcome', 'session_id',
            'ip_address', 'nscmf_record_id', 'attachment_id', 'export_request_id', 'metadata_json', 'occurred_at',
        ])
        ->and(Schema::columns('business_audit_events')['occurred_at']['type'])->toBe('datetime(6)')
        ->and(Schema::columns('business_audit_events')['metadata_json']['type'])->toBe('json')
        ->and(Schema::indexes('business_audit_events'))->toContain(['nscmf_record_id', 'occurred_at'])
        ->and(Schema::indexes('security_audit_events'))->toContain(['event_type', 'occurred_at']);

    foreach (['business_audit_events', 'access_audit_events', 'security_audit_events'] as $table) {
        expect(array_keys(Schema::columns($table)))->not->toContain('deleted_at')
            ->and(array_keys(Schema::columns($table)))->not->toContain('expires_at')
            ->and(array_keys(Schema::columns($table)))->not->toContain('retention_days');
    }
});

it('rejects unknown actor types, outcomes and dangling references', function (): void {
    $recordId = SchemaFixtures::record();
    $business = fn (array $row) => DB::table('business_audit_events')->insert(array_merge([
        'nscmf_record_id' => $recordId, 'actor_type' => 'USER', 'event_type' => 'RECORD_CREATED', 'occurred_at' => now(),
    ], $row));
    $security = fn (array $row) => DB::table('security_audit_events')->insert(array_merge([
        'event_type' => 'LOGIN_FAILED', 'outcome' => 'FAILURE', 'occurred_at' => now(),
    ], $row));

    expect(Schema::rejects(fn () => $business(['actor_type' => 'ROBOT'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $business(['nscmf_record_id' => 999_999])))->toBeTrue()
        ->and(Schema::rejects(fn () => $security(['outcome' => 'MAYBE'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $security(['target_user_id' => 999_999])))->toBeTrue()
        ->and(Schema::rejects(fn () => $security([])))->toBeFalse()
        ->and(Schema::rejects(fn () => DB::table('access_audit_events')->insert(['actor_user_id' => 999_999, 'event_type' => 'RECORD_VIEWED', 'occurred_at' => now()])))->toBeTrue();
});
