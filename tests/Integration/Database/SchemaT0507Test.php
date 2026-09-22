<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-013 / T05-7 — Activation direct and POP site details (11 §22–23).
 */

it('keeps both site blocks 1:1 with typed optional columns', function (): void {
    $direct = Schema::columns('nscmf_activation_direct_site_details');
    $pop = Schema::columns('nscmf_activation_pop_site_details');

    expect(array_diff(array_keys($direct), ['nscmf_record_id', 'created_at', 'updated_at']))->toEqualCanonicalizing([
        'local_loops', 'lastmile', 'bwa', 'antenna_tower', 'direction', 'rssi', 'latency_ms',
        'packet_loss_percent', 'routers', 'ups', 'stabilizer', 'cable',
    ])
        ->and($direct['rssi']['type'])->toBe('decimal(12,3)')
        ->and($direct['latency_ms']['type'])->toBe('decimal(14,3)')
        ->and($direct['packet_loss_percent']['type'])->toBe('decimal(5,2)')
        ->and(array_diff(array_keys($pop), ['nscmf_record_id', 'created_at', 'updated_at']))->toEqualCanonicalizing([
            'switch_distribution', 'port', 'vlan_id', 'local_loops', 'routers', 'cpe_indoor', 'cpe_outdoor',
        ])
        ->and($pop['vlan_id']['type'])->toBe('smallint unsigned')
        ->and(Schema::indexes('nscmf_activation_direct_site_details')['PRIMARY'])->toBe(['nscmf_record_id'])
        ->and(Schema::indexes('nscmf_activation_pop_site_details')['PRIMARY'])->toBe(['nscmf_record_id']);
});

it('enforces latency, packet-loss and VLAN ranges without inventing an RSSI range', function (): void {
    $recordId = SchemaFixtures::record(['family' => 'ACTIVATION', 'subtype' => 'ACTIVATION']);
    $direct = fn (array $row) => DB::table('nscmf_activation_direct_site_details')->insert(array_merge(['nscmf_record_id' => $recordId, 'created_at' => now(), 'updated_at' => now()], $row));
    $pop = fn (array $row) => DB::table('nscmf_activation_pop_site_details')->insert(array_merge(['nscmf_record_id' => $recordId, 'created_at' => now(), 'updated_at' => now()], $row));

    expect(Schema::rejects(fn () => $direct(['latency_ms' => -0.001])))->toBeTrue()
        ->and(Schema::rejects(fn () => $direct(['packet_loss_percent' => 100.01])))->toBeTrue()
        ->and(Schema::rejects(fn () => $direct(['packet_loss_percent' => -1])))->toBeTrue()
        ->and(Schema::rejects(fn () => $direct(['latency_ms' => 0, 'packet_loss_percent' => 100, 'rssi' => -95.5])))->toBeFalse()
        ->and(Schema::rejects(fn () => $pop(['vlan_id' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $pop(['vlan_id' => 4095])))->toBeTrue()
        ->and(Schema::rejects(fn () => $pop(['vlan_id' => 1])))->toBeFalse()
        ->and(Schema::rejects(fn () => $pop(['vlan_id' => 4094])))->toBeFalse();
});
