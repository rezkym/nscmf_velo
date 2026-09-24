<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-010 / T05-4 — nscmf_records and nscmf_number_sequences (11 §13–15).
 */

it('shapes nscmf_records with owner, captured Team, status, version and archive metadata', function (): void {
    $columns = Schema::columns('nscmf_records');

    expect(array_keys($columns))->toEqualCanonicalizing([
        'id', 'request_no', 'request_no_normalized', 'numbering_mode', 'family', 'subtype', 'request_date',
        'owner_user_id', 'team_id', 'business_status', 'record_version', 'requested_by_user_id',
        'first_submitted_at', 'current_workflow_iteration_id', 'is_archived', 'archived_at',
        'archived_by_user_id', 'archive_reason', 'created_at', 'updated_at',
    ])
        ->and($columns['request_no']['type'])->toBe('varchar(64)')
        ->and($columns['request_date']['type'])->toBe('date')
        ->and($columns['request_date']['nullable'])->toBeTrue()
        ->and($columns['record_version']['type'])->toBe('bigint unsigned')
        ->and($columns['record_version']['default'])->toBe('1')
        ->and($columns['team_id']['nullable'])->toBeFalse()
        ->and(Schema::uniqueIndexes('nscmf_records'))->toContain(['request_no_normalized'])
        ->and(Schema::foreignKeys('nscmf_records'))->toMatchArray([
            'owner_user_id' => ['users', 'id', 'RESTRICT'],
            'team_id' => ['teams', 'id', 'RESTRICT'],
            'requested_by_user_id' => ['users', 'id', 'RESTRICT'],
            'archived_by_user_id' => ['users', 'id', 'RESTRICT'],
        ])
        ->and(array_keys($columns))->not->toContain('deleted_at');
});

it('accepts exactly the seven canonical business states', function (): void {
    foreach (['DRAFT', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'CANCELLED'] as $status) {
        expect(Schema::rejects(fn () => SchemaFixtures::record(['business_status' => $status])))->toBeFalse();
    }

    foreach (['ARCHIVED', 'COMPLETED', 'SUBMITTED', 'UNDER_REVIEW', 'draft'] as $status) {
        expect(Schema::rejects(fn () => SchemaFixtures::record(['business_status' => $status])))->toBeTrue();
    }
});

it('accepts only family-valid subtypes and numbering modes', function (): void {
    expect(Schema::rejects(fn () => SchemaFixtures::record(['family' => 'ACTIVATION', 'subtype' => 'UPGRADE_DOWNGRADE'])))->toBeFalse()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['family' => 'ACTIVATION', 'subtype' => 'MAINTENANCE'])))->toBeTrue()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['family' => 'CHANGE', 'subtype' => 'DEACTIVATION'])))->toBeTrue()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['family' => 'OTHER', 'subtype' => 'MAINTENANCE'])))->toBeTrue()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['numbering_mode' => 'RANDOM'])))->toBeTrue();
});

it('allows archive only for Approved, Rejected or Cancelled records', function (): void {
    expect(Schema::rejects(fn () => SchemaFixtures::record(['business_status' => 'APPROVED', 'is_archived' => true])))->toBeFalse()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['business_status' => 'DRAFT', 'is_archived' => true])))->toBeTrue()
        ->and(Schema::rejects(fn () => SchemaFixtures::record(['business_status' => 'PENDING_APPROVAL', 'is_archived' => true])))->toBeTrue();
});

it('keeps request numbers globally unique after normalization', function (): void {
    SchemaFixtures::record(['request_no' => 'ABC-1', 'request_no_normalized' => 'abc-1']);

    expect(Schema::rejects(fn () => SchemaFixtures::record(['request_no' => 'abc-1', 'request_no_normalized' => 'abc-1'])))->toBeTrue();
});

it('keeps one monthly sequence row per YYYYMM', function (): void {
    $columns = Schema::columns('nscmf_number_sequences');
    expect(array_keys($columns))->toEqualCanonicalizing(['year_month', 'last_value', 'updated_at'])
        ->and($columns['year_month']['type'])->toBe('char(6)')
        ->and($columns['last_value']['type'])->toBe('int unsigned');

    DB::table('nscmf_number_sequences')->insert(['year_month' => '202609', 'last_value' => 1, 'updated_at' => now()]);

    expect(Schema::rejects(fn () => DB::table('nscmf_number_sequences')->insert(['year_month' => '202609', 'last_value' => 2, 'updated_at' => now()])))->toBeTrue();
});
