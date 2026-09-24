<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Support\Schema;

/*
 * BE-009 / T05-3 — typed system_settings singleton (11 §12).
 */

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function settingsRow(array $overrides = []): array
{
    return array_merge([
        'id' => 1,
        'technical_log_auto_cleanup_enabled' => true,
        'technical_log_retention_value' => 30,
        'technical_log_retention_unit' => 'DAY',
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides);
}

it('stores the Technical Log setting in typed columns only', function (): void {
    $columns = Schema::columns('system_settings');

    expect(array_keys($columns))->toEqualCanonicalizing([
        'id', 'technical_log_auto_cleanup_enabled', 'technical_log_retention_value',
        'technical_log_retention_unit', 'updated_by_user_id', 'created_at', 'updated_at',
    ])
        ->and($columns['technical_log_auto_cleanup_enabled']['default'])->toBe('1')
        ->and($columns['technical_log_retention_value']['type'])->toBe('int unsigned')
        ->and($columns['technical_log_retention_value']['default'])->toBe('30')
        ->and($columns['technical_log_retention_unit']['type'])->toBe('varchar(8)')
        ->and($columns['technical_log_retention_unit']['default'])->toBe('DAY')
        ->and(Schema::foreignKeys('system_settings'))->toBe(['updated_by_user_id' => ['users', 'id', 'RESTRICT']]);

    foreach (['settings', 'config_values'] as $forbidden) {
        expect(Schema::tableExists($forbidden))->toBeFalse();
    }
});

it('enforces a single row, a positive retention and the DAY|MONTH unit', function (): void {
    DB::table('system_settings')->insert(settingsRow());

    expect(Schema::rejects(fn () => DB::table('system_settings')->insert(settingsRow(['id' => 2]))))->toBeTrue()
        ->and(Schema::rejects(fn () => DB::table('system_settings')->update(['technical_log_retention_value' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => DB::table('system_settings')->update(['technical_log_retention_unit' => 'WEEK'])))->toBeTrue()
        ->and(Schema::rejects(fn () => DB::table('system_settings')->update(['technical_log_retention_unit' => 'MONTH', 'technical_log_retention_value' => 120])))->toBeFalse();
});
