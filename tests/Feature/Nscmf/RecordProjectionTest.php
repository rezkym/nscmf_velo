<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-054 / BE-060 / T18F, T19F — read/detail projection and the edit route (12 §17.1, §23–24,
 * §29 page decision, §44; 11 §36 Access Audit).
 */

it('renders the detail projection with sign-offs, form data and server action hints', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-09-21'], 'activation' => [
        'customer_name' => 'PT Uji', 'bandwidth_international_mbps' => 100, 'migrate_domain' => false,
        'references' => [['reference_type' => 'IWO', 'specification' => null]],
        'direct_site' => ['latency_ms' => 0],
    ]])->assertOk();

    signIn($owner)->get("/nscmf/{$recordId}")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Nscmf/Show')
            ->where('record.id', $recordId)
            ->where('record.family', 'ACTIVATION')
            ->where('record.subtype', 'ACTIVATION')
            ->where('record.business_status', 'DRAFT')
            ->where('record.record_version', 2)
            ->where('record.request_date', '2026-09-21')
            ->where('record.is_archived', false)
            ->where('record.owner', ['id' => $owner->id, 'name' => $owner->name])
            ->where('record.team.id', $owner->team_id)
            ->where('record.requested_by', null)
            ->where('record.iteration_no', null)
            ->where('record.allowed_actions', ['edit_draft', 'submit'])
            ->where('record.activation.customer_name', 'PT Uji')
            ->where('record.activation.bandwidth_international_mbps', 100)
            ->where('record.activation.migrate_domain', false)
            ->where('record.activation.references', [['reference_type' => 'IWO', 'specification' => null]])
            ->where('record.activation.direct_site.latency_ms', 0)
            ->where('record.activation.pop_site', null)
            ->missing('record.change')
            ->missing('record.request_no_normalized'));
});

it('writes Access Audit for a detail view but never a Business Timeline row', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->get("/nscmf/{$recordId}")->assertOk();

    expect(DB::table('access_audit_events')->where('event_type', 'RECORD_VIEWED')->where('nscmf_record_id', $recordId)->count())->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
});

it('conceals another user\'s never-submitted Draft and shows submitted records to readers of any Team', function (): void {
    $owner = Actors::requester();
    $draftId = Records::create($owner);
    $submittedId = Records::create($owner);
    Records::submitted($submittedId, $owner);
    $reviewer = Actors::reviewer();

    signIn($reviewer)->get("/nscmf/{$draftId}")->assertNotFound();
    signIn($reviewer)->get("/nscmf/{$submittedId}")->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->where('record.allowed_actions', [])->where('record.iteration_no', 1)->where('record.requested_by.id', $owner->id));
    signIn(Actors::superadmin())->get("/nscmf/{$draftId}")->assertNotFound();
    signIn(Actors::member(['nscmf.create']))->get("/nscmf/{$submittedId}")->assertForbidden();
    signIn($owner)->get('/nscmf/999999')->assertNotFound();
});

it('serves the Draft editor to the owner of an editable record, with warnings', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'CHANGE', 'EMERGENCY');

    signIn($owner)->get("/nscmf/{$recordId}/edit")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Nscmf/Edit')
            ->where('record.id', $recordId)
            ->where('record.change.results', [])
            ->where('record.change.monitoring_period_unit', null)
            ->has('warnings', 1));

    Records::submitted($recordId, $owner, 'REVISION_REQUIRED');
    signIn($owner)->get("/nscmf/{$recordId}/edit")->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Nscmf/Edit'));
});

it('serves the Result-only editor on the same route for an owned Change in review', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);
    Records::submitted($recordId, $owner, 'PENDING_REVIEW');

    signIn($owner)->get("/nscmf/{$recordId}/edit")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Nscmf/ChangeResults')
            ->where('record.business_status', 'PENDING_REVIEW')
            ->where('record.allowed_actions', ['edit_results']));
});

it('refuses the edit route to everyone else', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    Records::submitted($recordId, $owner, 'PENDING_REVIEW');
    $draftId = Records::create($owner);

    signIn($owner)->get("/nscmf/{$recordId}/edit")->assertForbidden();
    signIn(Actors::reviewer())->get("/nscmf/{$recordId}/edit")->assertForbidden();
    signIn(Actors::requester())->get("/nscmf/{$draftId}/edit")->assertNotFound();
    signIn(Actors::member(['nscmf.view']))->get("/nscmf/{$draftId}/edit")->assertNotFound();
});
