<?php

declare(strict_types=1);

use App\Domain\Audit\Enums\AccessAuditEvent;
use App\Domain\Audit\Enums\BusinessAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditEvent;
use App\Domain\Audit\Enums\SecurityAuditOutcome;
use App\Services\Audit\AccessAuditService;
use App\Services\Audit\BusinessAuditService;
use App\Services\Audit\SecurityAuditService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-084–086 / T33, T36, T37 — Business Timeline, privileged Access/Security Audit and History
 * (07 §34–37; 12 §47–50; 11 §34–38).
 */

it('serves the Business Timeline newest first with iteration, reason and field diffs, never access rows', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner);
    $iterationId = DB::table('nscmf_records')->where('id', $recordId)->value('current_workflow_iteration_id');
    $audit = app(BusinessAuditService::class);
    $audit->record(recordId: $recordId, actorUserId: $owner->id, event: BusinessAuditEvent::DRAFT_UPDATED, versionBefore: 1, versionAfter: 2,
        changes: [['field_path' => 'change.rollback_scenario', 'old' => null, 'new' => 'Restore']]);
    $audit->record(recordId: $recordId, actorUserId: $owner->id, event: BusinessAuditEvent::SUBMITTED, versionBefore: 2, versionAfter: 3,
        fromStatus: 'DRAFT', toStatus: 'PENDING_REVIEW', workflowIterationId: is_int($iterationId) ? $iterationId : null);
    app(AccessAuditService::class)->record($owner->id, AccessAuditEvent::RECORD_VIEWED, $recordId);

    signIn(Actors::reviewer())->getJson("/nscmf/{$recordId}/timeline?per_page=1")
        ->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event_type', 'SUBMITTED')
        ->assertJsonPath('data.0.iteration_no', 1)
        ->assertJsonPath('meta.total', 2);

    signIn($owner)->getJson("/nscmf/{$recordId}/timeline?page=2&per_page=1")
        ->assertJsonPath('data.0.event_type', 'DRAFT_UPDATED')
        ->assertJsonPath('data.0.changes.0', ['field' => 'change.rollback_scenario', 'before' => null, 'after' => 'Restore']);
});

it('refuses the Timeline without the permission or for another owner never-submitted Draft', function (): void {
    $owner = Actors::requester();
    $draft = Records::create($owner);

    signIn(Actors::reviewer())->getJson("/nscmf/{$draft}/timeline")->assertNotFound();
    signIn(Actors::user(['nscmf.view']))->getJson('/nscmf/'.Records::create(Actors::requester(), overrides: ['business_status' => 'APPROVED']).'/timeline')->assertForbidden();
});

it('lists History for the visible records only, with filters that never widen visibility', function (): void {
    $owner = Actors::requester();
    $other = Actors::requester(['team_id' => Actors::team('Team Beta')->id]);
    $ownDraft = Records::create($owner);
    $othersDraft = Records::create($other);
    $approved = Records::create($other, 'ACTIVATION', 'ACTIVATION');
    Records::closed($approved, $other, Actors::approver());
    $archived = Records::create($owner);
    Records::closed($archived, $owner, Actors::approver(), 'REJECTED');
    DB::table('nscmf_records')->where('id', $archived)->update(['is_archived' => true, 'archived_at' => now(), 'archived_by_user_id' => $owner->id, 'archive_reason' => 'Done.']);

    signIn($owner)->get('/history')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('History/Index', false)
            ->where('meta.total', 3)
            ->where('items', fn (Collection $items): bool => ! $items->pluck('id')->contains($othersDraft)));

    signIn($owner)->get('/history?archived=0&family=ACTIVATION')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 1)->where('items.0.id', $approved));
    signIn($owner)->get('/history?team_id='.$other->team_id.'&business_status=DRAFT')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 0));
    signIn($owner)->get('/history?archived=1')
        ->assertInertia(fn (AssertableInertia $page) => $page->has('items', 1)->where('items.0.id', $archived)->where('items.0.is_archived', true));

    signIn(Actors::member(['nscmf.create']))->get('/history')->assertForbidden();
    signIn($owner)->getJson('/history?sort=password')->assertUnprocessable();
    unset($ownDraft);
});

it('shows the privileged Access and Security Audit read-only, filtered, and records the viewing', function (): void {
    $superadmin = Actors::superadmin();
    $subject = Actors::requester();
    $recordId = Records::create($subject);
    app(AccessAuditService::class)->record($subject->id, AccessAuditEvent::RECORD_VIEWED, $recordId);
    app(SecurityAuditService::class)->record(SecurityAuditEvent::LOGIN_FAILED, SecurityAuditOutcome::FAILURE, subjectUsername: 'someone', ipAddress: '10.0.0.1');
    app(SecurityAuditService::class)->record(SecurityAuditEvent::USER_CREATED, SecurityAuditOutcome::SUCCESS, actorUserId: $superadmin->id, targetUserId: $subject->id);

    signIn($superadmin)->get('/administration/audits/access?event_type=RECORD_VIEWED')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Audits/Access', false)
            ->has('items', 1)
            ->where('items.0.event_type', 'RECORD_VIEWED')
            ->where('items.0.actor.id', $subject->id)
            ->where('items.0.record.id', $recordId));

    signIn($superadmin)->get('/administration/audits/security?outcome=FAILURE')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Administration/Audits/Security', false)
            ->has('items', 1)
            ->where('items.0.event_type', 'LOGIN_FAILED')
            ->where('items.0.subject_username', 'someone')
            ->missing('items.0.metadata_json'));

    expect(DB::table('access_audit_events')->where('event_type', 'PRIVILEGED_AUDIT_VIEWED')->where('actor_user_id', $superadmin->id)->count())->toBe(2);

    signIn(Actors::user(['audit.access.view']))->get('/administration/audits/security')->assertForbidden();
    signIn(Actors::user(['audit.security.view']))->get('/administration/audits/access')->assertForbidden();
    signIn($superadmin)->getJson('/administration/audits/access?event_type=DROP')->assertUnprocessable();
    signIn($superadmin)->delete('/administration/audits/access')->assertStatus(405);
});
