<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-071–074 / T27 — Approver actions (05 §14, §18–19; 11 §32; 12 §35–39).
 */

/** @return array{int, User, User} */
function pendingApproval(): array
{
    $owner = Actors::requester();
    $reviewer = Actors::reviewer();
    $recordId = Records::create($owner);
    Records::forwarded($recordId, $owner, $reviewer);

    return [$recordId, $owner, $reviewer];
}

function currentIteration(int $recordId): stdClass
{
    return DB::table('nscmf_workflow_iterations')
        ->where('id', DB::table('nscmf_records')->where('id', $recordId)->value('current_workflow_iteration_id'))
        ->sole();
}

it('approves with a cross-Team approver, records the final sign-off and closes the iteration', function (): void {
    [$recordId] = pendingApproval();
    $approver = Actors::approver(['team_id' => Actors::team('Team Other')->id]);

    signIn($approver)->post("/nscmf/{$recordId}/approval/approve", ['record_version' => 1, 'comment' => '  Looks good.  '])
        ->assertStatus(303)->assertRedirect("/approval/{$recordId}");

    $iteration = currentIteration($recordId);
    $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('APPROVED')
        ->and(Records::version($recordId))->toBe(2)
        ->and($iteration->approved_by_user_id)->toBe($approver->id)
        ->and($iteration->approved_at)->not->toBeNull()
        ->and($iteration->closed_status)->toBe('APPROVED')
        ->and($iteration->reviewed_by_user_id)->not->toBeNull()
        ->and($audit->event_type)->toBe('APPROVED')
        ->and($audit->comment)->toBe('Looks good.')
        ->and($audit->workflow_iteration_id)->toBe($iteration->id);
});

it('returns to the reviewer and clears the effective Reviewed By', function (): void {
    [$recordId] = pendingApproval();

    signIn(Actors::approver())->post("/nscmf/{$recordId}/approval/return-reviewer", ['record_version' => 1, 'reason' => 'Check the KPI again.'])
        ->assertStatus(303);

    $iteration = currentIteration($recordId);
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW')
        ->and($iteration->reviewed_by_user_id)->toBeNull()
        ->and($iteration->reviewed_at)->toBeNull()
        ->and($iteration->closed_status)->toBeNull()
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('event_type'))->toBe('APPROVAL_RETURNED_REVIEWER');
});

it('returns to the requester in the same iteration and clears the effective Reviewed By', function (): void {
    [$recordId] = pendingApproval();
    $iterationBefore = currentIteration($recordId);

    signIn(Actors::approver())->post("/nscmf/{$recordId}/approval/return-requester", ['record_version' => 1, 'reason' => 'Please revise scope.'])
        ->assertStatus(303);

    $iteration = currentIteration($recordId);
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('REVISION_REQUIRED')
        ->and($iteration->id)->toBe($iterationBefore->id)
        ->and($iteration->reviewed_by_user_id)->toBeNull()
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('reason'))->toBe('Please revise scope.');
});

it('rejects, closes the iteration without approval sign-off and keeps Reviewed By evidence', function (): void {
    [$recordId, , $reviewer] = pendingApproval();

    signIn(Actors::approver())->post("/nscmf/{$recordId}/approval/reject", ['record_version' => 1, 'reason' => 'Out of policy.'])
        ->assertStatus(303);

    $iteration = currentIteration($recordId);
    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('REJECTED')
        ->and($iteration->closed_status)->toBe('REJECTED')
        ->and($iteration->approved_by_user_id)->toBeNull()
        ->and($iteration->reviewed_by_user_id)->toBe($reviewer->id)
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('event_type'))->toBe('APPROVAL_REJECTED');
});

it('requires the action permission, the current state, the current version and a meaningful reason', function (): void {
    [$recordId] = pendingApproval();
    $approver = Actors::approver();

    signIn(Actors::reviewer())->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 1])
        ->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    signIn($approver)->postJson("/nscmf/{$recordId}/approval/reject", ['record_version' => 1, 'reason' => '   ab  '])
        ->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_FAILED');
    signIn($approver)->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 9])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT');
    signIn($approver)->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 1, 'status' => 'APPROVED'])
        ->assertUnprocessable();

    $pendingReview = Records::create(Actors::requester());
    Records::submitted($pendingReview, Actors::requester());
    signIn($approver)->postJson("/nscmf/{$pendingReview}/approval/approve", ['record_version' => 1])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');

    expect(DB::table('business_audit_events')->count())->toBe(0);
});

it('lets only the first of two approvers win; the stale second action conflicts', function (): void {
    [$recordId] = pendingApproval();

    signIn(Actors::approver())->post("/nscmf/{$recordId}/approval/approve", ['record_version' => 1])->assertStatus(303);
    signIn(Actors::approver())->postJson("/nscmf/{$recordId}/approval/reject", ['record_version' => 1, 'reason' => 'Late rejection.'])
        ->assertConflict();

    expect(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(1);
});

it('refuses approval of a record without an effective review sign-off', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner, 'PENDING_APPROVAL');

    signIn(Actors::approver())->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 1])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
});
