<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Integration\Database\SchemaFixtures;
use Tests\Support\Schema;

/*
 * BE-011 / T05-5 — nscmf_activation_details (11 §16).
 */

it('keeps Activation detail 1:1 with every Draft field nullable except the migration booleans', function (): void {
    $columns = Schema::columns('nscmf_activation_details');
    $businessColumns = array_values(array_diff(array_keys($columns), ['nscmf_record_id', 'created_at', 'updated_at']));

    expect($businessColumns)->toEqualCanonicalizing([
        'customer_name', 'contact_name', 'installation_rfs_date', 'lan_ip_allocation', 'wan_ip', 'gateway', 'pop',
        'regional', 'preferred_upstream', 'secondary_upstream', 'primary_noc_link', 'secondary_noc_link',
        'downlink_router', 'bandwidth_international_mbps', 'bandwidth_domestic_iix_mbps', 'bandwidth_mixed_mbps',
        'domain_name_1', 'domain_name_2', 'primary_dns', 'secondary_dns', 'mx_primary', 'mx_secondary',
        'hosting_platform', 'hosting_capacity_gb', 'migrate_domain', 'migrate_hosting',
    ]);

    foreach ($businessColumns as $column) {
        $expectNullable = ! in_array($column, ['migrate_domain', 'migrate_hosting'], true);
        expect($columns[$column]['nullable'])->toBe($expectNullable, $column);
    }

    expect($columns['migrate_domain']['default'])->toBe('0')
        ->and($columns['bandwidth_international_mbps']['type'])->toBe('decimal(14,3)')
        ->and($columns['lan_ip_allocation']['type'])->toBe('text')
        ->and($columns['domain_name_1']['type'])->toBe('varchar(253)')
        ->and(Schema::indexes('nscmf_activation_details'))->toHaveKey('PRIMARY')
        ->and(Schema::indexes('nscmf_activation_details')['PRIMARY'])->toBe(['nscmf_record_id'])
        ->and(Schema::foreignKeys('nscmf_activation_details'))->toBe(['nscmf_record_id' => ['nscmf_records', 'id', 'RESTRICT']]);
});

it('rejects a second detail row, an orphan and non-positive bandwidth or capacity', function (): void {
    $recordId = SchemaFixtures::record(['family' => 'ACTIVATION', 'subtype' => 'ACTIVATION']);
    $insert = fn (array $row) => DB::table('nscmf_activation_details')->insert(array_merge(
        ['nscmf_record_id' => $recordId, 'created_at' => now(), 'updated_at' => now()],
        $row,
    ));

    expect(Schema::rejects(fn () => $insert(['bandwidth_international_mbps' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['bandwidth_mixed_mbps' => -1])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['hosting_capacity_gb' => 0])))->toBeTrue()
        ->and(Schema::rejects(fn () => $insert(['nscmf_record_id' => 999_999])))->toBeTrue();

    $insert(['bandwidth_international_mbps' => 0.001]);

    expect(Schema::rejects(fn () => $insert([])))->toBeTrue();
});
