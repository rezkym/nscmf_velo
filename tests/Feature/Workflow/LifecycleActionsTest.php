<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-077–079 / T28–T30 — Cancel, Reopen, Archive/Unarchive (05 §13, §21–22; 12 §31, §40–42).
 */

function recordRow(int $recordId): stdClass
{
    return DB::table('nscmf_records')->where('id', $recordId)->sole();
}

it('cancels an own never-submitted Draft with an optional reason', function (?string $reason): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->post("/nscmf/{$recordId}/cancel", array_filter(['record_version' => 1, 'reason' => $reason]))
        ->assertStatus(303)->assertRedirect("/nscmf/{$recordId}");

    $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
    expect(recordRow($recordId)->business_status)->toBe('CANCELLED')
        ->and(Records::version($recordId))->toBe(2)
        ->and($audit->event_type)->toBe('CANCELLED')
        ->and($audit->reason)->toBe($reason === null ? null : trim($reason));
})->with([null, '  No longer needed.  ']);

it('refuses to cancel another owner record, a submitted record or without permission', function (): void {
    $owner = Actors::requester();
    $draft = Records::create($owner);
    $revision = Records::create($owner);
    Records::submitted($revision, $owner, 'REVISION_REQUIRED');

    signIn(Actors::requester())->postJson("/nscmf/{$draft}/cancel", ['record_version' => 1])->assertNotFound();
    signIn(Actors::user(['nscmf.view'], ['team_id' => $owner->team_id]))->postJson("/nscmf/{$draft}/cancel", ['record_version' => 1])->assertNotFound();
    signIn($owner)->postJson("/nscmf/{$revision}/cancel", ['record_version' => 1])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');

    expect(recordRow($draft)->business_status)->toBe('DRAFT');
});

it('reopens an Approved or Rejected record into a new iteration and keeps prior sign-offs', function (string $source, string $destination): void {
    $owner = Actors::requester();
    $approver = Actors::approver();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, $approver, $source);
    $before = recordRow($recordId);
    $actor = Actors::user(['nscmf.reopen', 'nscmf.view'], ['team_id' => Actors::team('Team Other')->id]);

    signIn($actor)->post("/nscmf/{$recordId}/reopen", ['record_version' => 1, 'reason' => 'Needs another look.', 'destination_status' => $destination])
        ->assertStatus(303)->assertRedirect("/nscmf/{$recordId}");

    $after = recordRow($recordId);
    $old = DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    $new = DB::table('nscmf_workflow_iterations')->where('id', $after->current_workflow_iteration_id)->sole();
    expect($after->business_status)->toBe($destination)
        ->and($after->requested_by_user_id)->toBe($before->requested_by_user_id)
        ->and($old->closed_status)->toBe($source)
        ->and($old->superseded_at)->not->toBeNull()
        ->and($old->approved_by_user_id)->toBe($source === 'APPROVED' ? $approver->id : null)
        ->and($new->iteration_no)->toBe(2)
        ->and($new->predecessor_iteration_id)->toBe($old->id)
        ->and($new->started_via)->toBe('REOPEN')
        ->and($new->reviewed_by_user_id)->toBeNull()
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('workflow_iteration_id'))->toBe($new->id);
})->with([
    ['APPROVED', 'REVISION_REQUIRED'],
    ['REJECTED', 'PENDING_REVIEW'],
]);

it('rejects Reopen for other states, archived records, bad destinations and missing permission', function (): void {
    $owner = Actors::requester();
    $actor = Actors::user(['nscmf.reopen', 'nscmf.view']);
    $approved = Records::create($owner);
    Records::closed($approved, $owner, Actors::approver());
    $pending = Records::create($owner);
    Records::submitted($pending, $owner);
    $body = ['record_version' => 1, 'reason' => 'Needs another look.', 'destination_status' => 'PENDING_REVIEW'];

    signIn($actor)->postJson("/nscmf/{$approved}/reopen", [...$body, 'destination_status' => 'DRAFT'])->assertUnprocessable();
    signIn($actor)->postJson("/nscmf/{$approved}/reopen", [...$body, 'extra' => 1])->assertUnprocessable();
    signIn(Actors::user(['nscmf.view']))->postJson("/nscmf/{$approved}/reopen", $body)->assertForbidden();
    signIn($actor)->postJson("/nscmf/{$pending}/reopen", $body)->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');

    DB::table('nscmf_records')->where('id', $approved)->update(['is_archived' => true, 'archived_at' => now(), 'archived_by_user_id' => $owner->id, 'archive_reason' => 'Done.']);
    signIn($actor)->postJson("/nscmf/{$approved}/reopen", $body)->assertConflict()->assertJsonPath('code', 'NSCMF_ARCHIVED_CONFLICT');
});

it('archives and unarchives terminal records without touching the business status', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::closed($recordId, $owner, Actors::approver(), 'REJECTED');
    $archivist = Actors::user(['nscmf.archive', 'nscmf.view']);

    signIn($archivist)->post("/nscmf/{$recordId}/archive", ['record_version' => 1, 'reason' => 'Closed out.'])->assertStatus(303);
    $archived = recordRow($recordId);
    expect($archived->is_archived)->toBe(1)
        ->and($archived->business_status)->toBe('REJECTED')
        ->and($archived->archived_by_user_id)->toBe($archivist->id)
        ->and($archived->archive_reason)->toBe('Closed out.');

    signIn($archivist)->postJson("/nscmf/{$recordId}/archive", ['record_version' => 2, 'reason' => 'Again please.'])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_ARCHIVED_CONFLICT');

    signIn($archivist)->post("/nscmf/{$recordId}/unarchive", ['record_version' => 2, 'reason' => 'Reference needed.'])->assertStatus(303);
    $restored = recordRow($recordId);
    expect($restored->is_archived)->toBe(0)
        ->and($restored->archived_at)->toBeNull()
        ->and($restored->business_status)->toBe('REJECTED')
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->pluck('event_type')->all())->toBe(['ARCHIVED', 'UNARCHIVED']);
});

it('refuses to archive a record that is still in workflow or without a reason', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $archivist = Actors::user(['nscmf.archive', 'nscmf.view']);

    signIn($archivist)->postJson("/nscmf/{$recordId}/archive", ['record_version' => 1, 'reason' => 'Closed out.'])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
    signIn($archivist)->postJson("/nscmf/{$recordId}/archive", ['record_version' => 1])->assertUnprocessable();
    signIn($archivist)->postJson("/nscmf/{$recordId}/unarchive", ['record_version' => 1, 'reason' => 'Not archived.'])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_STATE_CONFLICT');
});
