<?php

declare(strict_types=1);

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Models\Audit\AccessAuditEventRecord;
use App\Models\Audit\BusinessAuditEventRecord;
use App\Models\Audit\SecurityAuditEventRecord;
use App\Services\Audit\AccessAuditService;
use App\Services\Audit\BusinessAuditService;
use App\Services\Audit\SecurityAuditService;
use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;

/*
 * BE-024..BE-026 / T32, T34, T35 minimum writers (11 §34–38, 10 §8, 12 §107).
 */

it('writes a Business Audit event with actor, versions and field changes', function (): void {
    $recordId = SchemaFixtures::record();
    $actorId = SchemaFixtures::user('audit.actor');

    app(BusinessAuditService::class)->record(
        recordId: $recordId,
        actorUserId: $actorId,
        event: BusinessAuditEvent::DRAFT_UPDATED,
        versionBefore: 3,
        versionAfter: 4,
        fromStatus: 'DRAFT',
        toStatus: 'DRAFT',
        changes: [
            ['field_path' => 'change.rollback_scenario', 'old' => null, 'new' => 'Restore config'],
            ['field_path' => 'change.monitoring_period_value', 'old' => '1.000', 'new' => '3.000'],
        ],
    );

    $event = DB::table('business_audit_events')->sole();
    $changes = DB::table('business_audit_changes')->orderBy('id')->get();

    expect($event->actor_type)->toBe('USER')
        ->and($event->actor_user_id)->toBe($actorId)
        ->and($event->event_type)->toBe('DRAFT_UPDATED')
        ->and($event->record_version_before)->toBe(3)
        ->and($event->record_version_after)->toBe(4)
        ->and($changes)->toHaveCount(2)
        ->and($changes[0]->field_path)->toBe('change.rollback_scenario')
        ->and($changes[0]->old_value_text)->toBeNull()
        ->and($changes[0]->new_value_text)->toBe('Restore config');
});

it('never commits audit evidence for a rolled-back mutation', function (): void {
    $recordId = SchemaFixtures::record();
    $actorId = SchemaFixtures::user('rollback.actor');

    try {
        DB::transaction(function () use ($recordId, $actorId): void {
            app(BusinessAuditService::class)->record(recordId: $recordId, actorUserId: $actorId, event: BusinessAuditEvent::DRAFT_UPDATED);
            app(AccessAuditService::class)->record(actorUserId: $actorId, event: AccessAuditEvent::RECORD_VIEWED, recordId: $recordId);
            app(SecurityAuditService::class)->record(event: SecurityAuditEvent::USER_ROLES_CHANGED, outcome: SecurityAuditOutcome::SUCCESS, actorUserId: $actorId);

            throw new RuntimeException('business mutation failed after the audit write');
        });
    } catch (RuntimeException) {
        // expected
    }

    expect(DB::table('business_audit_events')->count())->toBe(0)
        ->and(DB::table('access_audit_events')->count())->toBe(0)
        ->and(DB::table('security_audit_events')->count())->toBe(0);
});

it('writes Access Audit separately from the Business Timeline', function (): void {
    $recordId = SchemaFixtures::record();
    $actorId = SchemaFixtures::user('viewer.actor');

    app(AccessAuditService::class)->record(actorUserId: $actorId, event: AccessAuditEvent::RECORD_VIEWED, recordId: $recordId);

    expect(DB::table('access_audit_events')->sole()->event_type)->toBe('RECORD_VIEWED')
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('refuses secret-bearing Security Audit metadata', function (string $key): void {
    $write = fn () => app(SecurityAuditService::class)->record(
        event: SecurityAuditEvent::LOGIN_FAILED,
        outcome: SecurityAuditOutcome::FAILURE,
        subjectUsername: 'someone',
        metadata: [$key => 'value'],
    );

    expect($write)->toThrow(InvalidArgumentException::class)
        ->and(DB::table('security_audit_events')->count())->toBe(0);
})->with(['password', 'current_password', 'new_password', 'temporary_password', 'password_confirmation', 'token', 'secret', 'passphrase', 'private_key']);

it('stores safe Security Audit context', function (): void {
    $actorId = SchemaFixtures::user('security.actor');

    app(SecurityAuditService::class)->record(
        event: SecurityAuditEvent::LOGIN_FAILED,
        outcome: SecurityAuditOutcome::FAILURE,
        actorUserId: null,
        targetUserId: $actorId,
        subjectUsername: 'security.actor',
        sessionId: 'session-id',
        ipAddress: '127.0.0.1',
        metadata: ['reason' => 'INVALID_CREDENTIALS'],
    );

    $row = DB::table('security_audit_events')->sole();

    expect($row->outcome)->toBe('FAILURE')
        ->and($row->subject_username)->toBe('security.actor')
        ->and(json_decode((string) $row->metadata_json, true))->toBe(['reason' => 'INVALID_CREDENTIALS']);
});

it('offers no way to edit or delete authoritative audit rows', function (string $model): void {
    $recordId = SchemaFixtures::record();
    $actorId = SchemaFixtures::user('immutable.actor');
    app(BusinessAuditService::class)->record(recordId: $recordId, actorUserId: $actorId, event: BusinessAuditEvent::RECORD_CREATED);
    app(AccessAuditService::class)->record(actorUserId: $actorId, event: AccessAuditEvent::RECORD_VIEWED, recordId: $recordId);
    app(SecurityAuditService::class)->record(event: SecurityAuditEvent::LOGOUT, outcome: SecurityAuditOutcome::SUCCESS, actorUserId: $actorId);

    $row = $model::query()->firstOrFail();

    expect(fn () => $row->update(['event_type' => 'TAMPERED']))->toThrow(LogicException::class)
        ->and(fn () => $row->delete())->toThrow(LogicException::class);
})->with([BusinessAuditEventRecord::class, AccessAuditEventRecord::class, SecurityAuditEventRecord::class]);
