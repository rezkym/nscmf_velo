<?php

declare(strict_types=1);

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\travelTo;

/*
 * BE-088 / T72 — backend round trip behind the FE-53 journey: Draft save, Submit, Return,
 * Resubmit, Forward, Approve, then History and Timeline reflect only committed state.
 */

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-09-22 09:00:00', 'Asia/Jakarta')));

it('carries one Activation from Draft to Approved through the real endpoints', function (): void {
    $owner = Actors::requester();
    $reviewer = Actors::reviewer(['team_id' => Actors::team('Team Review')->id]);
    $approver = Actors::approver(['team_id' => Actors::team('Team Approve')->id]);
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", [
        'record_version' => 1,
        'header' => ['request_date' => '2026-09-22'],
        'activation' => [
            'customer_name' => 'PT Contoh',
            'contact_name' => 'Kontak',
            'installation_rfs_date' => '2026-10-01',
            'service_blocks' => [
                ['service_context' => 'NEW', 'service_id' => 'SVC-1', 'service_status' => 'ACTIVATED', 'service_description' => 'Dedicated 100', 'service_location' => 'Jl. Contoh 1'],
            ],
        ],
    ])->assertOk()->assertHeader('Content-Type', 'application/json')->assertJsonPath('data.record_version', 2);

    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertStatus(303);
    signIn($reviewer)->post("/nscmf/{$recordId}/review/return", ['record_version' => 3, 'reason' => 'Add the contact phone.'])->assertStatus(303);
    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 4])->assertStatus(303);

    // A stale browser replays the old Forward: it conflicts and changes nothing.
    signIn($reviewer)->postJson("/nscmf/{$recordId}/review/forward", ['record_version' => 3])
        ->assertConflict()->assertJsonPath('code', 'NSCMF_VERSION_CONFLICT')->assertJsonPath('context.latest_record_version', 5);
    signIn($reviewer)->post("/nscmf/{$recordId}/review/forward", ['record_version' => 5])->assertStatus(303);

    // The Requester is not an Approver, even by handcrafted request.
    signIn($owner)->postJson("/nscmf/{$recordId}/approval/approve", ['record_version' => 6])->assertForbidden();
    signIn($approver)->post("/nscmf/{$recordId}/approval/approve", ['record_version' => 6])->assertStatus(303);

    signIn($owner)->get("/nscmf/{$recordId}")->assertInertia(fn (AssertableInertia $page) => $page
        ->where('record.business_status', 'APPROVED')
        ->where('record.record_version', 7)
        ->where('record.iteration_no', 1)
        ->where('record.requested_by.id', $owner->id)
        ->where('record.reviewed_by.id', $reviewer->id)
        ->where('record.approved_by.id', $approver->id));

    signIn($approver)->get('/history?business_status=APPROVED')
        ->assertInertia(fn (AssertableInertia $page) => $page->component('History/Index', false)->has('items', 1)->where('items.0.id', $recordId));

    signIn($owner)->getJson("/nscmf/{$recordId}/timeline")
        ->assertOk()
        ->assertJsonPath('data.*.event_type', ['APPROVED', 'REVIEW_FORWARDED', 'SUBMITTED', 'REVIEW_RETURNED', 'SUBMITTED', 'DRAFT_UPDATED']);

    expect(DB::table('nscmf_workflow_iterations')->where('nscmf_record_id', $recordId)->count())->toBe(1);
});
