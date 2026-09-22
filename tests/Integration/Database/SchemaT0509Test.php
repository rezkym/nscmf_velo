<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-015 / T05-9 — Change collections (11 §25–29).
 */

it('shapes the Change collections and keeps planning fields out of results', function (): void {
    expect(Schema::columns('nscmf_change_facing_challenges')['challenge_text']['type'])->toBe('varchar(1000)')
        ->and(Schema::columns('nscmf_change_identified_problems')['problem_text']['type'])->toBe('varchar(1000)')
        ->and(Schema::columns('nscmf_change_service_impacts')['other_description']['type'])->toBe('varchar(500)')
        ->and(Schema::uniqueIndexes('nscmf_change_service_impacts'))->toContain(['nscmf_record_id', 'impact_code'])
        ->and(Schema::columns('nscmf_change_improvement_items')['plan_text']['nullable'])->toBeTrue()
        ->and(Schema::columns('nscmf_change_improvement_items')['target_kpi']['nullable'])->toBeTrue()
        ->and(array_keys(Schema::columns('nscmf_change_results')))->toEqualCanonicalizing([
            'id', 'nscmf_record_id', 'row_no', 'result_summary', 'performance_information', 'result_status', 'created_at', 'updated_at',
        ])
        ->and(Schema::columns('nscmf_change_results')['result_status']['type'])->toBe('varchar(255)');

    foreach (['nscmf_change_facing_challenges', 'nscmf_change_identified_problems', 'nscmf_change_improvement_items', 'nscmf_change_results'] as $table) {
        expect(Schema::uniqueIndexes($table))->toContain(['nscmf_record_id', 'row_no']);
    }
});

it('enforces row ranges, the impact closed set and natural-key uniqueness', function (): void {
    $recordId = SchemaFixtures::record();
    $row = fn (string $table, int $rowNo, array $extra = []) => DB::table($table)->insert(array_merge(['nscmf_record_id' => $recordId, 'row_no' => $rowNo], $extra));
    $impact = fn (string $code) => DB::table('nscmf_change_service_impacts')->insert(['nscmf_record_id' => $recordId, 'impact_code' => $code]);
    $result = fn (int $rowNo) => $row('nscmf_change_results', $rowNo, ['created_at' => now(), 'updated_at' => now()]);

    foreach (['nscmf_change_facing_challenges', 'nscmf_change_identified_problems', 'nscmf_change_improvement_items'] as $table) {
        expect(Schema::rejects(fn () => $row($table, 0)))->toBeTrue()
            ->and(Schema::rejects(fn () => $row($table, 4)))->toBeTrue();
    }

    expect(Schema::rejects(fn () => $result(5)))->toBeFalse()
        ->and(Schema::rejects(fn () => $result(6)))->toBeTrue()
        ->and(Schema::rejects(fn () => $impact('NOC99')))->toBeTrue();

    $impact('NOC15');

    expect(Schema::rejects(fn () => $impact('NOC15')))->toBeTrue()
        ->and(Schema::rejects(fn () => $impact('OTHER')))->toBeFalse();
});
