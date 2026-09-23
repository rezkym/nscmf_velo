<?php

declare(strict_types=1);

use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

function reviewReturnUrl(int $recordId): string
{
    return "/nscmf/{$recordId}/review/return";
}

/** @return array{int, int} */
function pendingReviewRecord(string $family = 'CHANGE'): array
{
    $owner = Actors::requester();
    $recordId = Records::create($owner, $family, $family === 'CHANGE' ? 'MAINTENANCE' : 'ACTIVATION');
    Records::submitted($recordId, $owner);

    return [$recordId, $owner->id];
}

it('returns a submitted record for revision without changing its iteration or sign-offs', function (string $actorKind, string $family): void {
    [$recordId, $ownerId] = pendingReviewRecord($family);
    $owner = \App\Models\User::query()->findOrFail($ownerId);
    $actor = match ($actorKind) {
        'owner' => $owner,
        'other team' => Actors::reviewer(),
        'no team' => Actors::user(['nscmf.review.return'], ['team_id' => null]),
    };
    if ($actorKind === 'owner') {
        $owner->givePermissionTo('nscmf.review.return');
    }

    $before = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iterationBefore = DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    $reason = '  Need revised details.  ';

    signIn($actor)->post(reviewReturnUrl($recordId), ['record_version' => 1, 'reason' => $reason])
        ->assertStatus(303)->assertRedirect("/nscmf/{$recordId}");

    $after = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iterationAfter = DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    expect($after->business_status)->toBe('REVISION_REQUIRED')
        ->and($after->record_version)->toBe(2)
        ->and($after->current_workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
        ->and($after->requested_by_user_id)->toBe($before->requested_by_user_id)
        ->and($after->first_submitted_at)->toBe($before->first_submitted_at)
        ->and((array) $iterationAfter)->toBe((array) $iterationBefore)
        ->and($iterationAfter->reviewed_by_user_id)->toBeNull()
        ->and($iterationAfter->approved_by_user_id)->toBeNull()
        ->and(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1);

    $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole();
    expect($audit->event_type)->toBe('REVIEW_RETURNED')
        ->and($audit->actor_user_id)->toBe($actor->id)
        ->and($audit->actor_type)->toBe('USER')
        ->and($audit->workflow_iteration_id)->toBe($iterationAfter->id)
        ->and($audit->reason)->toBe('Need revised details.')
        ->and($audit->from_status)->toBe('PENDING_REVIEW')
        ->and($audit->to_status)->toBe('REVISION_REQUIRED')
        ->and($audit->record_version_before)->toBe(1)
        ->and($audit->record_version_after)->toBe(2);
})->with([
    'owner' => ['owner', 'CHANGE'],
    'other team' => ['other team', 'CHANGE'],
    'no team' => ['no team', 'CHANGE'],
    'Activation' => ['other team', 'ACTIVATION'],
]);

it('rejects missing permission even for a protected Superadmin, without mutation', function (bool $protected): void {
    [$recordId] = pendingReviewRecord();
    $actor = $protected ? Actors::superadmin() : Actors::user(['nscmf.view']);
    if ($protected) {
        $actor->revokePermissionTo('nscmf.review.return');
        $actor->roles()->detach();
    }

    signIn($actor)->postJson(reviewReturnUrl($recordId), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW')
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([false, true]);

it('conceals nonexistent and another owner\'s never-submitted Draft', function (): void {
    $draftId = Records::create(Actors::requester());
    $reviewer = Actors::reviewer();

    signIn($reviewer)->postJson(reviewReturnUrl(99999999), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertNotFound()->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
    signIn($reviewer)->postJson(reviewReturnUrl($draftId), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertNotFound()->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect(Records::version($draftId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('rejects every ineligible canonical state with safe current context', function (string $status): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    if (in_array($status, ['DRAFT', 'CANCELLED'], true)) {
        $owner->givePermissionTo('nscmf.review.return');
        if ($status === 'CANCELLED') {
            DB::table('nscmf_records')->where('id', $recordId)->update(['business_status' => $status]);
        }
        $actor = $owner;
    } else {
        Records::submitted($recordId, $owner, $status);
        $actor = Actors::reviewer();
    }

    signIn($actor)->postJson(reviewReturnUrl($recordId), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', $status);

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with(['DRAFT', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'CANCELLED']);

it('rejects an archived submitted record and a stale version without mutation', function (): void {
    [$archivedId] = pendingReviewRecord();
    DB::table('nscmf_records')->where('id', $archivedId)->update(['business_status' => 'REJECTED', 'is_archived' => true]);
    [$staleId] = pendingReviewRecord();
    $reviewer = Actors::reviewer();

    signIn($reviewer)->postJson(reviewReturnUrl($archivedId), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_ARCHIVED_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', 'REJECTED');
    signIn($reviewer)->postJson(reviewReturnUrl($staleId), ['record_version' => 2, 'reason' => 'Needs revision'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', 'PENDING_REVIEW');

    expect(Records::version($archivedId))->toBe(1)
        ->and(Records::version($staleId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('validates exact payload, positive version and reason character bounds', function (array $payload, string $errorKey): void {
    [$recordId] = pendingReviewRecord();

    signIn(Actors::reviewer())->postJson(reviewReturnUrl($recordId), $payload)
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors($errorKey, 'errors');

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([
    'missing version' => [['reason' => 'Valid reason'], 'record_version'],
    'zero version' => [['record_version' => 0, 'reason' => 'Valid reason'], 'record_version'],
    'negative version' => [['record_version' => -1, 'reason' => 'Valid reason'], 'record_version'],
    'wrong version' => [['record_version' => 'wrong', 'reason' => 'Valid reason'], 'record_version'],
    'decimal version' => [['record_version' => 1.5, 'reason' => 'Valid reason'], 'record_version'],
    'missing reason' => [['record_version' => 1], 'reason'],
    'nonstring reason' => [['record_version' => 1, 'reason' => ['valid']], 'reason'],
    'blank reason' => [['record_version' => 1, 'reason' => '   '], 'reason'],
    'four chars after trim' => [['record_version' => 1, 'reason' => '  four  '], 'reason'],
    '2001 unicode chars' => [['record_version' => 1, 'reason' => str_repeat('é', 2001)], 'reason'],
    'extra business key' => [['record_version' => 1, 'reason' => 'Valid reason', 'business_status' => 'APPROVED'], 'business_status'],
]);

it('accepts five and 2000 Unicode characters after trimming', function (int $length): void {
    [$recordId] = pendingReviewRecord();
    $reason = str_repeat('é', $length);

    signIn(Actors::reviewer())->postJson(reviewReturnUrl($recordId), ['record_version' => 1, 'reason' => "  {$reason}  "])
        ->assertStatus(303)->assertRedirect("/nscmf/{$recordId}");

    expect(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('reason'))->toBe($reason);
})->with([5, 2000]);

it('rolls back state and version if the audit append fails', function (): void {
    [$recordId] = pendingReviewRecord();
    app()->instance(BusinessAuditRepository::class, new class implements BusinessAuditRepository
    {
        public function appendEvent(array $event, array $changes): int
        {
            throw new RuntimeException('audit storage unavailable');
        }
    });

    signIn(Actors::reviewer())->postJson(reviewReturnUrl($recordId), ['record_version' => 1, 'reason' => 'Needs revision'])
        ->assertStatus(500)->assertJsonPath('code', 'SERVER_ERROR');

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW')
        ->and(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});
