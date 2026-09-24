<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\Actors;
use Tests\Support\Concurrency\WorkflowRace;
use Tests\Support\Records;

/*
 * BE-080 / T31 — contending workflow actions on real separate MySQL connections (05 §27–29,
 * 12 §116–117). Exactly one action commits; every loser gets a state/version conflict.
 */

/**
 * The baseline users migration restores a unique legacy email during rollback, so each case
 * removes its users before DatabaseMigrations reverses the schema.
 *
 * @param  list<User>  $users
 */
function forgetRaceUsers(array $users): void
{
    Schema::withoutForeignKeyConstraints(fn () => DB::table('users')->whereIn('id', array_map(fn (User $user): int => $user->id, $users))->delete());
}

/**
 * @param  list<array{actor_id: int, action: string, outcome: string, code: string|null}>  $results
 * @return array{actor_id: int, action: string, outcome: string, code: string|null}
 */
function soleWinner(array $results): array
{
    $winners = array_values(array_filter($results, fn (array $result): bool => $result['outcome'] === 'committed'));
    expect($winners)->toHaveCount(1);
    foreach ($results as $result) {
        if ($result['outcome'] === 'conflict') {
            expect($result['code'])->toBeIn(['NSCMF_STATE_CONFLICT', 'NSCMF_VERSION_CONFLICT', 'NSCMF_ARCHIVED_CONFLICT']);
        }
    }

    return $winners[0];
}

it('commits exactly one of competing Reviewer actions', function (string $first, string $second, array $destinations): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $reviewers = [Actors::reviewer(), Actors::reviewer()];

    try {
        $winner = soleWinner(WorkflowRace::run($recordId, 1, [
            ['actor' => $reviewers[0]->id, 'action' => $first, 'reason' => 'First reviewer decision.'],
            ['actor' => $reviewers[1]->id, 'action' => $second, 'reason' => 'Second reviewer decision.'],
        ]));

        $record = DB::table('nscmf_records')->where('id', $recordId)->sole();
        $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
        expect($record->business_status)->toBe($destinations[$winner['action']])
            ->and($record->record_version)->toBe(2)
            ->and($audit->actor_user_id)->toBe($winner['actor_id'])
            ->and(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1);
    } finally {
        forgetRaceUsers([$owner, ...$reviewers]);
    }
})->with([
    'return / return' => ['return', 'return', ['return' => 'REVISION_REQUIRED']],
    'reject / return' => ['reject', 'return', ['reject' => 'REJECTED', 'return' => 'REVISION_REQUIRED']],
]);

it('commits exactly one of competing Approver actions', function (string $first, string $second, array $destinations): void {
    $owner = Actors::requester();
    $reviewer = Actors::reviewer();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, $reviewer);
    $approvers = [Actors::approver(), Actors::approver()];

    try {
        $winner = soleWinner(WorkflowRace::run($recordId, 1, [
            ['actor' => $approvers[0]->id, 'action' => $first],
            ['actor' => $approvers[1]->id, 'action' => $second],
        ]));

        $iteration = DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->sole();
        expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe($destinations[$winner['action']])
            ->and($iteration->approved_by_user_id)->toBe($winner['action'] === 'approve' ? $winner['actor_id'] : null)
            ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(1);
    } finally {
        forgetRaceUsers([$owner, $reviewer, ...$approvers]);
    }
})->with([
    'approve / approve' => ['approve', 'approve', ['approve' => 'APPROVED']],
    'approve / reject' => ['approve', 'approval-reject', ['approve' => 'APPROVED', 'approval-reject' => 'REJECTED']],
    'approve / return reviewer' => ['approve', 'return-reviewer', ['approve' => 'APPROVED', 'return-reviewer' => 'PENDING_REVIEW']],
]);

it('commits exactly one of a competing Reopen and Archive', function (): void {
    $owner = Actors::requester();
    $approver = Actors::approver();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, $approver);
    $actor = Actors::user(['nscmf.reopen', 'nscmf.archive', 'nscmf.view']);

    try {
        $winner = soleWinner(WorkflowRace::run($recordId, 1, [
            ['actor' => $actor->id, 'action' => 'reopen'],
            ['actor' => $actor->id, 'action' => 'archive'],
        ]));

        $record = DB::table('nscmf_records')->where('id', $recordId)->sole();
        expect($winner['action'] === 'reopen'
            ? $record->business_status === 'REVISION_REQUIRED' && $record->is_archived === 0
            : $record->business_status === 'APPROVED' && $record->is_archived === 1)->toBeTrue()
            ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(1);
    } finally {
        forgetRaceUsers([$owner, $approver, $actor]);
    }
});
