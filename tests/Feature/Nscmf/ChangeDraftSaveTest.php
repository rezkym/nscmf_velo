<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-055..BE-059 / T19A–E — Change Draft persistence (06 §34–48; 11 §24–29; 12 §28).
 */

/**
 * @return array<string, mixed>
 */
function canonicalChange(): array
{
    return [
        'maintenance_purpose' => 'Penggantian modul optik.',
        'target_execution_date' => '2026-09-30',
        'monitoring_period_value' => 3,
        'monitoring_period_unit' => 'DAY',
        'rollback_scenario' => 'Kembalikan modul lama.',
        'announcement_timing' => 'ONE_WEEK_BEFORE',
        'facing_challenges' => [['row_no' => 1, 'challenge_text' => 'Jendela terbatas.']],
        'identified_problems' => [['row_no' => 1, 'problem_text' => 'Error rate naik.']],
        'service_impacts' => [
            ['impact_code' => 'NOC15', 'other_description' => null],
            ['impact_code' => 'OTHER', 'other_description' => 'Pelanggan enterprise'],
        ],
        'improvement_items' => [['row_no' => 1, 'plan_text' => 'Ganti modul.', 'target_kpi' => 'Error rate 0.']],
        'results' => [['row_no' => 1, 'result_summary' => 'Terpasang.', 'performance_information' => '0 error 72 jam.', 'result_status' => 'SUCCESS']],
    ];
}

it('persists the canonical Change payload including Draft results', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => canonicalChange()])
        ->assertOk()->assertJsonPath('data.record_version', 2);

    $detail = DB::table('nscmf_change_details')->where('nscmf_record_id', $recordId)->sole();
    expect($detail->monitoring_period_value)->toBe('3.000')
        ->and($detail->monitoring_period_unit)->toBe('DAY')
        ->and($detail->announcement_timing)->toBe('ONE_WEEK_BEFORE')
        ->and(DB::table('nscmf_change_service_impacts')->where('nscmf_record_id', $recordId)->pluck('impact_code')->sort()->values()->all())->toBe(['NOC15', 'OTHER'])
        ->and(DB::table('nscmf_change_results')->where('nscmf_record_id', $recordId)->value('result_status'))->toBe('SUCCESS')
        ->and(DB::table('nscmf_change_improvement_items')->where('nscmf_record_id', $recordId)->value('target_kpi'))->toBe('Error rate 0.');
});

it('keeps free-text result status and partially started rows, and discards not-started rows', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => [
        'results' => [
            ['row_no' => 1, 'result_summary' => 'Sebagian', 'performance_information' => null, 'result_status' => 'Selesai sebagian, dipantau'],
            ['row_no' => 2, 'result_summary' => null, 'performance_information' => null, 'result_status' => null],
        ],
        'improvement_items' => [['row_no' => 3, 'plan_text' => null, 'target_kpi' => 'Only KPI']],
    ]])->assertOk();

    expect(DB::table('nscmf_change_results')->where('nscmf_record_id', $recordId)->pluck('row_no')->all())->toBe([1])
        ->and(DB::table('nscmf_change_results')->value('result_status'))->toBe('Selesai sebagian, dipantau')
        ->and(DB::table('nscmf_change_improvement_items')->where('nscmf_record_id', $recordId)->pluck('row_no')->all())->toBe([3]);
});

it('rejects a monitoring value without its unit in the resulting Draft', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['monitoring_period_value' => 2]])
        ->assertStatus(422)->assertJsonValidationErrors('change.monitoring_period_unit', 'errors');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => ['monitoring_period_value' => 2, 'monitoring_period_unit' => 'HOUR']])->assertOk();
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'change' => ['monitoring_period_unit' => null]])
        ->assertStatus(422)->assertJsonValidationErrors('change.monitoring_period_value', 'errors');

    expect(Records::version($recordId))->toBe(2);
});

it('rejects structurally impossible Change values', function (array $change, string $errorKey): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner);

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'change' => $change])
        ->assertStatus(422)->assertJsonValidationErrors($errorKey, 'errors');

    expect(Records::version($recordId))->toBe(1);
})->with([
    'monitoring zero' => [['monitoring_period_value' => 0, 'monitoring_period_unit' => 'DAY'], 'change.monitoring_period_value'],
    'monitoring month' => [['monitoring_period_value' => 1, 'monitoring_period_unit' => 'MONTH'], 'change.monitoring_period_unit'],
    'announcement' => [['announcement_timing' => 'ONE_DAY_BEFORE'], 'change.announcement_timing'],
    'impact unknown' => [['service_impacts' => [['impact_code' => 'NOC99']]], 'change.service_impacts.0.impact_code'],
    'impact duplicate' => [['service_impacts' => [['impact_code' => 'POP'], ['impact_code' => 'POP']]], 'change.service_impacts.1.impact_code'],
    'result row 6' => [['results' => [['row_no' => 6, 'result_summary' => 'x']]], 'change.results.0.row_no'],
    'challenge row 4' => [['facing_challenges' => [['row_no' => 4, 'challenge_text' => 'x']]], 'change.facing_challenges.0.row_no'],
    'long purpose' => [['maintenance_purpose' => str_repeat('a', 4001)], 'change.maintenance_purpose'],
    'long status' => [['results' => [['row_no' => 1, 'result_status' => str_repeat('a', 256)]]], 'change.results.0.result_status'],
    'long other' => [['service_impacts' => [['impact_code' => 'OTHER', 'other_description' => str_repeat('a', 501)]]], 'change.service_impacts.0.other_description'],
]);
