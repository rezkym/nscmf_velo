<?php

declare(strict_types=1);

use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Models\User;
use App\Repositories\Contracts\Audit\BusinessAuditRepository;
use App\Services\Audit\BusinessAuditService;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

function reviewRejectUrl(int $recordId): string
{
    return "/nscmf/{$recordId}/review/reject";
}

/** @return array{int, User} */
function rejectableRecord(string $family = 'CHANGE'): array
{
    $owner = Actors::requester();
    $recordId = Records::create($owner, $family, $family === 'CHANGE' ? 'MAINTENANCE' : 'ACTIVATION');
    Records::submitted($recordId, $owner);

    return [$recordId, $owner];
}

it('closes the current iteration and records exactly one rejection without rewriting history', function (string $actorKind, string $family): void {
    [$recordId, $owner] = rejectableRecord($family);
    $actor = match ($actorKind) {
        'owner' => $owner,
        'other team' => Actors::reviewer(),
        // A Team-less reviewer: the queue permission reveals the record (12 §17.1), Team never does.
        'no team' => Actors::user(['nscmf.review', 'nscmf.review.reject'], ['team_id' => null]),
        default => throw new InvalidArgumentException('Unknown actor kind.'),
    };
    if ($actorKind === 'owner') {
        $owner->givePermissionTo('nscmf.review.reject');
    }

    $before = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iterationBefore = DB::table('nscmf_workflow_iterations')->where('id', $before->current_workflow_iteration_id)->sole();
    if (! is_int($iterationBefore->id)) {
        throw new RuntimeException('Submitted fixture has no workflow iteration.');
    }
    $historyId = app(BusinessAuditService::class)->record(
        recordId: $recordId, actorUserId: $owner->id, event: BusinessAuditEvent::SUBMITTED,
        versionBefore: 0, versionAfter: 1, fromStatus: 'DRAFT', toStatus: 'PENDING_REVIEW',
        workflowIterationId: $iterationBefore->id,
    );

    signIn($actor)->post(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => '  Insufficient evidence.  '])
        ->assertStatus(303)->assertRedirect(reviewActionDestination($actor, $recordId));

    $after = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iteration = DB::table('nscmf_workflow_iterations')->where('id', $iterationBefore->id)->sole();
    $audit = DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->where('event_type', 'REVIEW_REJECTED')->sole();
    expect($after->business_status)->toBe('REJECTED')
        ->and($after->record_version)->toBe(2)
        ->and($after->current_workflow_iteration_id)->toBe($before->current_workflow_iteration_id)
        ->and($after->requested_by_user_id)->toBe($before->requested_by_user_id)
        ->and($after->first_submitted_at)->toBe($before->first_submitted_at)
        ->and($iteration->iteration_no)->toBe($iterationBefore->iteration_no)
        ->and($iteration->started_by_user_id)->toBe($iterationBefore->started_by_user_id)
        ->and($iteration->started_at)->toBe($iterationBefore->started_at)
        ->and($iteration->closed_status)->toBe('REJECTED')
        ->and($iteration->closed_at)->not->toBeNull()
        ->and($iteration->reviewed_by_user_id)->toBeNull()
        ->and($iteration->approved_by_user_id)->toBeNull()
        ->and(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1)
        ->and($audit->actor_user_id)->toBe($actor->id)
        ->and($audit->actor_type)->toBe('USER')
        ->and($audit->reason)->toBe('Insufficient evidence.')
        ->and($audit->workflow_iteration_id)->toBe($iteration->id)
        ->and($audit->from_status)->toBe('PENDING_REVIEW')
        ->and($audit->to_status)->toBe('REJECTED')
        ->and($audit->record_version_before)->toBe(1)
        ->and($audit->record_version_after)->toBe(2)
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->count())->toBe(2)
        ->and(DB::table('business_audit_events')->where('id', $historyId)->value('event_type'))->toBe('SUBMITTED');
})->with([
    'owner' => ['owner', 'CHANGE'],
    'cross-team' => ['other team', 'CHANGE'],
    'null-team' => ['no team', 'CHANGE'],
    'Activation' => ['other team', 'ACTIVATION'],
]);

it('leaves a prior closed iteration intact when rejecting a reopened record', function (): void {
    [$recordId, $owner] = rejectableRecord();
    $previous = DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->sole();
    DB::table('nscmf_workflow_iterations')->where('id', $previous->id)->update([
        'closed_status' => 'REJECTED', 'closed_at' => now(), 'superseded_at' => now(),
    ]);
    $previous = DB::table('nscmf_workflow_iterations')->where('id', $previous->id)->sole();
    $currentId = DB::table('nscmf_workflow_iterations')->insertGetId([
        'nscmf_record_id' => $recordId, 'iteration_no' => 2, 'predecessor_iteration_id' => $previous->id,
        'started_via' => 'REOPEN', 'started_by_user_id' => $owner->id, 'started_at' => now(),
        'created_at' => now(), 'updated_at' => now(),
    ]);
    DB::table('nscmf_records')->where('id', $recordId)->update(['current_workflow_iteration_id' => $currentId]);

    signIn(Actors::reviewer())->postJson(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'Repeat rejection'])
        ->assertStatus(303);

    $current = DB::table('nscmf_workflow_iterations')->where('id', $currentId)->sole();
    expect((array) DB::table('nscmf_workflow_iterations')->where('id', $previous->id)->sole())->toBe((array) $previous)
        ->and($current->iteration_no)->toBe(2)
        ->and($current->predecessor_iteration_id)->toBe($previous->id)
        ->and($current->closed_status)->toBe('REJECTED')
        ->and($current->closed_at)->not->toBeNull()
        ->and(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->sole()->workflow_iteration_id)->toBe($currentId);
});

it('requires the reject permission even for protected Superadmin', function (bool $protected): void {
    [$recordId] = rejectableRecord();
    $actor = $protected ? Actors::superadmin() : Actors::user(['nscmf.view']);
    if ($protected) {
        $actor->revokePermissionTo('nscmf.review.reject');
        $actor->roles()->detach();
        // Still able to read the record (12 §17.1), so only the action permission is missing.
        $actor->givePermissionTo('nscmf.view');
    }

    signIn($actor)->postJson(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([false, true]);

it('conceals absent and other owners private never-submitted records', function (string $status): void {
    $recordId = Records::create(Actors::requester());
    if ($status === 'CANCELLED') {
        DB::table('nscmf_records')->where('id', $recordId)->update(['business_status' => 'CANCELLED']);
    }

    signIn(Actors::reviewer())->postJson(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertNotFound()->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
    signIn(Actors::reviewer())->postJson(reviewRejectUrl(99999999), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertNotFound()->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with(['DRAFT', 'CANCELLED']);

it('rejects ineligible states with safe conflict context', function (string $status): void {
    [$recordId, $owner] = rejectableRecord();
    DB::table('nscmf_records')->where('id', $recordId)->update(['business_status' => $status]);
    $actor = $status === 'DRAFT' || $status === 'CANCELLED' ? $owner : Actors::reviewer();
    if ($actor === $owner) {
        $owner->givePermissionTo('nscmf.review.reject');
    }

    signIn($actor)->postJson(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_STATE_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', $status);
    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with(['DRAFT', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED', 'CANCELLED']);

it('rejects archive and stale version without changing the iteration', function (): void {
    [$archivedId] = rejectableRecord();
    [$staleId] = rejectableRecord();
    DB::table('nscmf_records')->where('id', $archivedId)->update(['business_status' => 'REJECTED', 'is_archived' => true]);
    $actor = Actors::reviewer();

    signIn($actor)->postJson(reviewRejectUrl($archivedId), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_ARCHIVED_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', 'REJECTED');
    signIn($actor)->postJson(reviewRejectUrl($staleId), ['record_version' => 2, 'reason' => 'Valid reason'])
        ->assertStatus(409)->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT')
        ->assertJsonPath('context.latest_record_version', 1)
        ->assertJsonPath('context.current_business_status', 'PENDING_REVIEW');
    expect(DB::table('nscmf_workflow_iterations')->whereNotNull('closed_at')->count())->toBe(0)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('uses Inertia redirects for conflicts and validation errors', function (): void {
    [$recordId] = rejectableRecord();
    $origin = "/nscmf/{$recordId}";
    $actor = Actors::reviewer();
    signIn($actor)->from($origin)->post(reviewRejectUrl($recordId), ['record_version' => 2, 'reason' => 'Valid reason'])
        ->assertRedirect($origin)->assertSessionHas('inertia.flash_data.domain_error.code', 'NSCMF_VERSION_CONFLICT');
    signIn($actor)->from($origin)->post(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'four'])
        ->assertRedirect($origin)->assertSessionHasErrors('reason');
    expect(Records::version($recordId))->toBe(1);
});

it('validates exact input types and trimmed Unicode reason bounds', function (array $payload, string $errorKey, int $jsonOptions = 0): void {
    [$recordId] = rejectableRecord();
    signIn(Actors::reviewer())->postJson(reviewRejectUrl($recordId), $payload, [], $jsonOptions)
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors($errorKey, 'errors');
    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([
    'missing version' => [['reason' => 'Valid reason'], 'record_version'],
    'zero version' => [['record_version' => 0, 'reason' => 'Valid reason'], 'record_version'],
    'negative version' => [['record_version' => -1, 'reason' => 'Valid reason'], 'record_version'],
    'wrong type' => [['record_version' => [], 'reason' => 'Valid reason'], 'record_version'],
    'decimal' => [['record_version' => 1.5, 'reason' => 'Valid reason'], 'record_version'],
    'boolean' => [['record_version' => true, 'reason' => 'Valid reason'], 'record_version'],
    'integral float' => [['record_version' => 1.0, 'reason' => 'Valid reason'], 'record_version', JSON_PRESERVE_ZERO_FRACTION],
    'missing reason' => [['record_version' => 1], 'reason'],
    'array reason' => [['record_version' => 1, 'reason' => []], 'reason'],
    'blank reason' => [['record_version' => 1, 'reason' => '   '], 'reason'],
    'short trim' => [['record_version' => 1, 'reason' => '  four  '], 'reason'],
    'long unicode' => [['record_version' => 1, 'reason' => str_repeat('é', 2001)], 'reason'],
    'extra key' => [['record_version' => 1, 'reason' => 'Valid reason', 'business_status' => 'APPROVED'], 'business_status'],
]);

it('accepts form integer strings and both Unicode reason boundaries', function (int $length): void {
    [$recordId] = rejectableRecord();
    $reason = str_repeat('é', $length);
    signIn(Actors::reviewer())->post(reviewRejectUrl($recordId), ['record_version' => '1', 'reason' => "  {$reason}  "])
        ->assertStatus(303)->assertRedirect("/review/{$recordId}");
    expect(DB::table('business_audit_events')->where('nscmf_record_id', $recordId)->value('reason'))->toBe($reason);
})->with([5, 2000]);

it('rolls back record, iteration closure and audit together on audit failure', function (): void {
    [$recordId] = rejectableRecord();
    $before = DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->sole();
    app()->instance(BusinessAuditRepository::class, new class implements BusinessAuditRepository
    {
        public function appendEvent(array $event, array $changes): int
        {
            throw new RuntimeException('audit storage unavailable');
        }
    });

    signIn(Actors::reviewer())->postJson(reviewRejectUrl($recordId), ['record_version' => 1, 'reason' => 'Valid reason'])
        ->assertStatus(500)->assertJsonPath('code', 'SERVER_ERROR');
    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW')
        ->and((array) DB::table('nscmf_workflow_iterations')->where('id', $before->id)->sole())->toBe((array) $before)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});
