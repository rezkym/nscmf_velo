<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-016 / T05-10 — nscmf_workflow_iterations and sign-off columns (11 §30–33).
 */

/**
 * @param  array<mixed>  $overrides
 * @return array<mixed>
 */
function iterationRow(int $recordId, int $userId, array $overrides = []): array
{
    return array_merge([
        'nscmf_record_id' => $recordId,
        'iteration_no' => 1,
        'started_via' => 'FIRST_SUBMIT',
        'started_by_user_id' => $userId,
        'started_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides);
}

it('shapes iterations with sign-off columns and links the current iteration from the record', function (): void {
    $columns = Schema::columns('nscmf_workflow_iterations');

    expect(array_keys($columns))->toEqualCanonicalizing([
        'id', 'nscmf_record_id', 'iteration_no', 'predecessor_iteration_id', 'started_via', 'started_by_user_id',
        'started_at', 'reviewed_by_user_id', 'reviewed_at', 'approved_by_user_id', 'approved_at', 'closed_status',
        'closed_at', 'superseded_at', 'created_at', 'updated_at',
    ])
        ->and($columns['started_at']['type'])->toBe('datetime(6)')
        ->and($columns['iteration_no']['type'])->toBe('int unsigned')
        ->and(Schema::uniqueIndexes('nscmf_workflow_iterations'))->toContain(['nscmf_record_id', 'iteration_no'])
        ->and(Schema::foreignKeys('nscmf_workflow_iterations'))->toMatchArray([
            'nscmf_record_id' => ['nscmf_records', 'id', 'RESTRICT'],
            'predecessor_iteration_id' => ['nscmf_workflow_iterations', 'id', 'RESTRICT'],
            'reviewed_by_user_id' => ['users', 'id', 'RESTRICT'],
            'approved_by_user_id' => ['users', 'id', 'RESTRICT'],
        ])
        ->and(Schema::foreignKeys('nscmf_records'))->toHaveKey('current_workflow_iteration_id');

    foreach (['nscmf_review_assignments', 'nscmf_approver_assignments'] as $forbidden) {
        expect(Schema::tableExists($forbidden))->toBeFalse();
    }
});

it('rejects invalid iteration numbers, start reasons and closures', function (): void {
    $recordId = SchemaFixtures::record(['business_status' => 'PENDING_REVIEW']);
    $userId = SchemaFixtures::user('iteration.actor');
    $insert = fn (array $overrides) => DB::table('nscmf_workflow_iterations')->insert(iterationRow($recordId, $userId, $overrides));

    expect(Schema::rejects(fn () => $insert(['iteration_no' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['started_via' => 'RESUBMIT'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['closed_status' => 'CANCELLED', 'closed_at' => now()])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['approved_by_user_id' => $userId, 'approved_at' => now()])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['closed_status' => 'APPROVED', 'closed_at' => now(), 'approved_by_user_id' => $userId, 'approved_at' => now()])))->toBeFalse(Schema::$lastRejection ?? '');
});

it('allows at most one open iteration per record', function (): void {
    $recordId = SchemaFixtures::record(['business_status' => 'PENDING_REVIEW']);
    $userId = SchemaFixtures::user('iteration.opener');
    DB::table('nscmf_workflow_iterations')->insert(iterationRow($recordId, $userId));

    expect(Schema::rejects(fn () => DB::table('nscmf_workflow_iterations')->insert(iterationRow($recordId, $userId, ['iteration_no' => 2, 'started_via' => 'REOPEN']))))->toBeTrue();

    DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->update(['closed_status' => 'REJECTED', 'closed_at' => now()]);

    expect(Schema::rejects(fn () => DB::table('nscmf_workflow_iterations')->insert(iterationRow($recordId, $userId, ['iteration_no' => 2, 'started_via' => 'REOPEN']))))->toBeFalse();
});
