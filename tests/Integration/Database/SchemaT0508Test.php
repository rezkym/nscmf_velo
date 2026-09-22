<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-014 / T05-8 — nscmf_change_details (11 §24).
 */

it('keeps Change detail 1:1 with nullable Draft fields', function (): void {
    $columns = Schema::columns('nscmf_change_details');

    expect(array_diff(array_keys($columns), ['nscmf_record_id', 'created_at', 'updated_at']))->toEqualCanonicalizing([
        'maintenance_purpose', 'target_execution_date', 'monitoring_period_value', 'monitoring_period_unit',
        'rollback_scenario', 'announcement_timing',
    ])
        ->and($columns['maintenance_purpose']['type'])->toBe('varchar(4000)')
        ->and($columns['monitoring_period_value']['type'])->toBe('decimal(14,3)')
        ->and($columns['monitoring_period_unit']['type'])->toBe('varchar(32)')
        ->and($columns['announcement_timing']['type'])->toBe('varchar(40)')
        ->and(Schema::indexes('nscmf_change_details')['PRIMARY'])->toBe(['nscmf_record_id']);

    foreach (['maintenance_purpose', 'target_execution_date', 'monitoring_period_value', 'monitoring_period_unit', 'rollback_scenario', 'announcement_timing'] as $column) {
        expect($columns[$column]['nullable'])->toBeTrue();
    }
});

it('accepts only the closed sets and a paired positive monitoring period', function (): void {
    $recordId = SchemaFixtures::record();
    $insert = fn (array $row) => DB::table('nscmf_change_details')->insert(array_merge(['nscmf_record_id' => $recordId, 'created_at' => now(), 'updated_at' => now()], $row));

    expect(Schema::rejects(fn () => $insert(['announcement_timing' => 'ONE_DAY_BEFORE'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['monitoring_period_value' => 1, 'monitoring_period_unit' => 'MONTH'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['monitoring_period_value' => 1, 'monitoring_period_unit' => null])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['monitoring_period_value' => null, 'monitoring_period_unit' => 'DAY'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['monitoring_period_value' => 0, 'monitoring_period_unit' => 'DAY'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['monitoring_period_value' => 3, 'monitoring_period_unit' => 'WEEK', 'announcement_timing' => 'TWO_DAYS_BEFORE_EMERGENCY'])))->toBeFalse();
});
