<?php

declare(strict_types=1);

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

use function Pest\Laravel\travelTo;

/*
 * BE-064 / BE-065 / T22 — First Submit and Resubmit (05 §7–9, §14; 06 §6–7, §21–44; 12 §30).
 */

beforeEach(fn () => travelTo(CarbonImmutable::parse('2026-09-22 09:00:00', 'Asia/Jakarta')));

/**
 * @return array<string, mixed>
 */
function submittableChange(): array
{
    return [
        'maintenance_purpose' => 'Replace the optical module.',
        'target_execution_date' => '2026-09-30',
        'monitoring_period_value' => 3,
        'monitoring_period_unit' => 'DAY',
        'rollback_scenario' => 'Restore the previous module.',
        'announcement_timing' => 'ONE_WEEK_BEFORE',
        'identified_problems' => [['row_no' => 1, 'problem_text' => 'Error rate rising.']],
        'service_impacts' => [['impact_code' => 'NOC15', 'other_description' => null]],
        'improvement_items' => [['row_no' => 1, 'plan_text' => 'Replace it.', 'target_kpi' => 'Zero errors.']],
    ];
}

/**
 * @return array<string, mixed>
 */
function submittableActivation(): array
{
    return [
        'customer_name' => 'PT Contoh',
        'contact_name' => 'Kontak',
        'installation_rfs_date' => '2026-10-01',
        'service_blocks' => [
            ['service_context' => 'NEW', 'service_id' => 'SVC-1', 'service_status' => 'ACTIVATED', 'service_description' => 'Dedicated 100', 'service_location' => 'Jl. Contoh 1'],
        ],
    ];
}

/**
 * @param  array<string, mixed>  $fields
 */
function prepareRecord(User $owner, string $family, string $subtype, array $fields, string $requestDate = '2026-09-22'): int
{
    $recordId = Records::create($owner, $family, $subtype);
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", [
        'record_version' => 1,
        'header' => ['request_date' => $requestDate],
        strtolower($family) => $fields,
    ])->assertOk();

    return $recordId;
}

it('submits a complete Change Draft, opening iteration 1 and recording Requested By', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'CHANGE', 'MAINTENANCE', submittableChange());

    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])
        ->assertStatus(303)->assertRedirect("/nscmf/{$recordId}");

    $record = DB::table('nscmf_records')->where('id', $recordId)->sole();
    $iteration = DB::table('nscmf_workflow_iterations')->sole();

    expect($record->business_status)->toBe('PENDING_REVIEW')
        ->and($record->record_version)->toBe(3)
        ->and($record->requested_by_user_id)->toBe($owner->id)
        ->and($record->first_submitted_at)->not->toBeNull()
        ->and($record->current_workflow_iteration_id)->toBe($iteration->id)
        ->and($iteration->iteration_no)->toBe(1)
        ->and($iteration->started_via)->toBe('FIRST_SUBMIT')
        ->and($iteration->started_by_user_id)->toBe($owner->id)
        ->and($iteration->reviewed_by_user_id)->toBeNull();

    $audit = DB::table('business_audit_events')->where('event_type', 'SUBMITTED')->sole();
    expect($audit->from_status)->toBe('DRAFT')
        ->and($audit->to_status)->toBe('PENDING_REVIEW')
        ->and($audit->workflow_iteration_id)->toBe($iteration->id)
        ->and($audit->record_version_after)->toBe(3);
});

it('submits a complete Activation Draft', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'ACTIVATION', 'ACTIVATION', submittableActivation());

    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertStatus(303);

    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('PENDING_REVIEW');
});

it('resubmits a returned record into the same iteration without touching Requested By', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'CHANGE', 'MAINTENANCE', submittableChange());
    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertStatus(303);
    $firstSubmittedAt = DB::table('nscmf_records')->where('id', $recordId)->value('first_submitted_at');
    DB::table('nscmf_records')->where('id', $recordId)->update(['business_status' => 'REVISION_REQUIRED']);

    travelTo(CarbonImmutable::parse('2026-09-24 09:00:00', 'Asia/Jakarta'));
    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 3])->assertStatus(303);

    $record = DB::table('nscmf_records')->where('id', $recordId)->sole();
    expect($record->business_status)->toBe('PENDING_REVIEW')
        ->and($record->record_version)->toBe(4)
        ->and($record->first_submitted_at)->toBe($firstSubmittedAt)
        ->and(DB::table('nscmf_workflow_iterations')->count())->toBe(1)
        ->and(DB::table('business_audit_events')->where('event_type', 'SUBMITTED')->count())->toBe(2);
});

it('refuses submission by anyone but the owner with the permission, in an eligible state', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'CHANGE', 'MAINTENANCE', submittableChange());

    signIn(Actors::requester())->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertNotFound();
    signIn(Actors::member(['nscmf.view', 'nscmf.draft.edit']))->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertNotFound();

    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertStatus(303);
    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 3])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'NSCMF_STATE_CONFLICT');

    expect(DB::table('business_audit_events')->where('event_type', 'SUBMITTED')->count())->toBe(1);
});

it('refuses a stale version without changing the record', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'CHANGE', 'MAINTENANCE', submittableChange());

    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 1])
        ->assertSessionHas('inertia.flash_data.domain_error.code', 'NSCMF_VERSION_CONFLICT');

    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('DRAFT')
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('record_version'))->toBe(2);
});

it('keeps the Draft and reports every submission rule that failed', function (array $overrides, array $expected): void {
    $owner = Actors::requester();
    $fields = array_merge(submittableChange(), $overrides);
    $recordId = Records::create($owner, 'CHANGE', 'MAINTENANCE');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-09-22'], 'change' => $fields])->assertOk();

    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 2])
        ->assertRedirect("/nscmf/{$recordId}/edit")
        ->assertSessionHasErrors($expected);

    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('DRAFT')
        ->and(DB::table('nscmf_records')->where('id', $recordId)->value('record_version'))->toBe(2)
        ->and(DB::table('nscmf_workflow_iterations')->count())->toBe(0)
        ->and(DB::table('business_audit_events')->where('event_type', 'SUBMITTED')->count())->toBe(0);
})->with([
    'missing purpose for Maintenance' => [['maintenance_purpose' => null], ['change.maintenance_purpose']],
    'no identified problem' => [['identified_problems' => []], ['change.identified_problems']],
    'no service impact' => [['service_impacts' => []], ['change.service_impacts']],
    'impact OTHER without description' => [['service_impacts' => [['impact_code' => 'OTHER', 'other_description' => null]]], ['change.service_impacts.0.other_description']],
    'half-started improvement pair' => [['improvement_items' => [['row_no' => 1, 'plan_text' => 'Only plan', 'target_kpi' => null]]], ['change.improvement_items.0.target_kpi']],
    'no improvement pair' => [['improvement_items' => []], ['change.improvement_items']],
    'missing target date' => [['target_execution_date' => null], ['change.target_execution_date']],
    'past target date on first submit' => [['target_execution_date' => '2026-09-21'], ['change.target_execution_date']],
    'missing monitoring period' => [['monitoring_period_value' => null, 'monitoring_period_unit' => null], ['change.monitoring_period_value']],
    'missing rollback' => [['rollback_scenario' => null], ['change.rollback_scenario']],
    'missing announcement' => [['announcement_timing' => null], ['change.announcement_timing']],
    'started but incomplete result row' => [['results' => [['row_no' => 1, 'result_summary' => 'Partial', 'performance_information' => null, 'result_status' => null]]], ['change.results.0.performance_information', 'change.results.0.result_status']],
]);

it('requires the header date, and refuses a future date on first submit', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'CHANGE', 'MAINTENANCE');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => submittableChange()])->assertOk();

    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 2])
        ->assertSessionHasErrors(['header.request_date']);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'header' => ['request_date' => '2026-09-23']])->assertOk();
    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 3])
        ->assertSessionHasErrors(['header.request_date']);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 3, 'header' => ['request_date' => '2026-09-22']])->assertOk();
    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 4])->assertStatus(303);
});

it('reports the Activation submission rules, including dependencies and formats', function (array $overrides, array $expected): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'header' => ['request_date' => '2026-09-22'], 'activation' => array_merge(submittableActivation(), $overrides)])->assertOk();

    signIn($owner)->from("/nscmf/{$recordId}/edit")->post("/nscmf/{$recordId}/submit", ['record_version' => 2])
        ->assertSessionHasErrors($expected);

    expect(DB::table('nscmf_records')->where('id', $recordId)->value('business_status'))->toBe('DRAFT');
})->with([
    'missing customer' => [['customer_name' => null], ['activation.customer_name']],
    'missing contact' => [['contact_name' => null], ['activation.contact_name']],
    'missing RFS date' => [['installation_rfs_date' => null], ['activation.installation_rfs_date']],
    'no new service block' => [['service_blocks' => []], ['activation.service_blocks']],
    'incomplete new service block' => [['service_blocks' => [['service_context' => 'NEW', 'service_id' => 'SVC-1', 'service_status' => null, 'service_description' => null, 'service_location' => null]]], ['activation.service_blocks.0.service_status']],
    // The persisted set is canonical (EXISTING before NEW), so the started EXISTING block is index 0.
    'started optional existing block' => [['service_blocks' => [['service_context' => 'NEW', 'service_id' => 'SVC-1', 'service_status' => 'ACTIVATED', 'service_description' => 'd', 'service_location' => 'l'], ['service_context' => 'EXISTING', 'service_id' => 'SVC-0']]], ['activation.service_blocks.0.service_status']],
    'reference OTHER without specification' => [['references' => [['reference_type' => 'OTHER', 'specification' => null]]], ['activation.references.0.specification']],
    'invalid WAN IP' => [['wan_ip' => 'not-an-ip'], ['activation.wan_ip']],
    'invalid gateway' => [['gateway' => '203.0.113.300'], ['activation.gateway']],
    'invalid LAN allocation' => [['lan_ip_allocation' => "10.10.0.0/24\nnonsense"], ['activation.lan_ip_allocation']],
    'invalid domain' => [['domain_name_1' => 'not a domain'], ['activation.domain_name_1']],
    'invalid DNS' => [['primary_dns' => 'dns.example.com'], ['activation.primary_dns']],
    'domain migration without domain' => [['migrate_domain' => true, 'domain_name_1' => null], ['activation.domain_name_1']],
    'hosting migration without platform' => [['migrate_hosting' => true], ['activation.hosting_platform', 'activation.hosting_capacity_gb']],
]);

it('accepts optional network values that are well formed', function (): void {
    $owner = Actors::requester();
    $recordId = prepareRecord($owner, 'ACTIVATION', 'UPGRADE_DOWNGRADE', array_merge(submittableActivation(), [
        'service_blocks' => [
            ['service_context' => 'NEW', 'service_id' => 'SVC-1', 'service_status' => 'ACTIVATED', 'service_description' => 'd', 'service_location' => 'l'],
            ['service_context' => 'EXISTING', 'service_id' => 'SVC-0', 'service_status' => 'DEACTIVATED', 'service_description' => 'd', 'service_location' => 'l'],
        ],
        'wan_ip' => '2001:db8::1/64',
        'gateway' => '203.0.113.9',
        'lan_ip_allocation' => "10.10.0.0/24\n10.10.1.10-10.10.1.20, 192.168.1.5",
        'domain_name_1' => 'example.co.id',
        'primary_dns' => '2001:db8::53',
        'mx_primary' => '10 mail.example.co.id',
        'migrate_domain' => true,
        'migrate_hosting' => true,
        'hosting_platform' => 'cPanel',
        'hosting_capacity_gb' => 50,
    ]));

    signIn($owner)->post("/nscmf/{$recordId}/submit", ['record_version' => 2])->assertStatus(303);
});
