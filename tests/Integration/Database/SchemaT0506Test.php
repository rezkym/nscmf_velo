<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-012 / T05-6 — Activation collections (11 §17–21).
 */

function activationRecord(): int
{
    return SchemaFixtures::record(['family' => 'ACTIVATION', 'subtype' => 'ACTIVATION']);
}

it('shapes the five Activation collections with their natural keys', function (): void {
    expect(Schema::columns('nscmf_activation_references'))->toHaveKeys(['id', 'nscmf_record_id', 'reference_type', 'specification'])
        ->and(Schema::columns('nscmf_activation_references')['specification']['type'])->toBe('varchar(255)')
        ->and(Schema::uniqueIndexes('nscmf_activation_references'))->toContain(['nscmf_record_id', 'reference_type'])
        ->and(Schema::columns('nscmf_activation_service_blocks'))->toHaveKeys(['service_context', 'service_id', 'service_status', 'service_description', 'service_location', 'created_at', 'updated_at'])
        ->and(Schema::columns('nscmf_activation_service_blocks')['service_id']['type'])->toBe('varchar(100)')
        ->and(Schema::uniqueIndexes('nscmf_activation_service_blocks'))->toContain(['nscmf_record_id', 'service_context'])
        ->and(Schema::columns('nscmf_activation_sla_items')['requirement_text']['type'])->toBe('varchar(1000)')
        ->and(Schema::columns('nscmf_activation_sla_items')['row_no']['type'])->toBe('tinyint unsigned')
        ->and(Schema::columns('nscmf_activation_virtual_connections')['bandwidth_mbps']['type'])->toBe('decimal(14,3)')
        ->and(Schema::columns('nscmf_activation_priority_destinations')['destination']['type'])->toBe('varchar(255)');

    foreach (['nscmf_activation_sla_items', 'nscmf_activation_virtual_connections', 'nscmf_activation_priority_destinations'] as $table) {
        expect(Schema::uniqueIndexes($table))->toContain(['nscmf_record_id', 'row_no'])
            ->and(Schema::foreignKeys($table))->toBe(['nscmf_record_id' => ['nscmf_records', 'id', 'RESTRICT']]);
    }
});

it('rejects unknown closed-set values and duplicate natural keys', function (): void {
    $recordId = activationRecord();
    $reference = fn (string $type) => DB::table('nscmf_activation_references')->insert(['nscmf_record_id' => $recordId, 'reference_type' => $type]);
    $block = fn (array $row) => DB::table('nscmf_activation_service_blocks')->insert(array_merge(
        ['nscmf_record_id' => $recordId, 'service_context' => 'EXISTING', 'created_at' => now(), 'updated_at' => now()],
        $row,
    ));

    expect(Schema::rejects(fn () => $reference('EMAIL')))->toBeTrue()
        ->and(Schema::rejects(fn () => $block(['service_context' => 'LEGACY'])))->toBeTrue()
        ->and(Schema::rejects(fn () => $block(['service_status' => 'SUSPENDED'])))->toBeTrue();

    $reference('IWO');
    $block(['service_status' => 'ACTIVATED']);

    expect(Schema::rejects(fn () => $reference('IWO')))->toBeTrue()
        ->and(Schema::rejects(fn () => $block([])))->toBeTrue()
        ->and(Schema::rejects(fn () => $block(['service_context' => 'NEW'])))->toBeFalse();
});

it('limits row numbers to 1..3 and keeps virtual bandwidth positive', function (): void {
    $recordId = activationRecord();
    $sla = fn (int $rowNo) => DB::table('nscmf_activation_sla_items')->insert(['nscmf_record_id' => $recordId, 'row_no' => $rowNo, 'requirement_text' => 'x']);
    $vc = fn (int $rowNo, ?float $bw) => DB::table('nscmf_activation_virtual_connections')->insert(['nscmf_record_id' => $recordId, 'row_no' => $rowNo, 'bandwidth_mbps' => $bw]);
    $dest = fn (int $rowNo) => DB::table('nscmf_activation_priority_destinations')->insert(['nscmf_record_id' => $recordId, 'row_no' => $rowNo, 'destination' => 'x']);

    expect(Schema::rejects(fn () => $sla(0)))->toBeTrue()
        ->and(Schema::rejects(fn () => $sla(4)))->toBeTrue()
        ->and(Schema::rejects(fn () => $sla(3)))->toBeFalse()
        ->and(Schema::rejects(fn () => $vc(4, 10.0)))->toBeTrue()
        ->and(Schema::rejects(fn () => $vc(1, 0.0)))->toBeTrue()
        ->and(Schema::rejects(fn () => $vc(1, null)))->toBeFalse()
        ->and(Schema::rejects(fn () => $dest(4)))->toBeTrue();

    $sla(1);

    expect(Schema::rejects(fn () => $sla(1)))->toBeTrue();
});
