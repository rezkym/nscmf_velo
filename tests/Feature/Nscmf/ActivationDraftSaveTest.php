<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Tests\Support\Actors;
use Tests\Support\Records;

/*
 * BE-049..BE-053 / T18A–E — Activation Draft persistence over the JSON contract
 * (06 §5, §23–33; 11 §16–23; 12 §7.4.1, §26–27).
 */

/**
 * @return array<string, mixed>
 */
function canonicalActivation(): array
{
    return [
        'customer_name' => 'PT Contoh Sejahtera',
        'contact_name' => 'Contoh Kontak',
        'installation_rfs_date' => '2026-09-30',
        'lan_ip_allocation' => "10.10.0.0/24\n10.10.1.10-10.10.1.20",
        'wan_ip' => '203.0.113.8/30',
        'gateway' => '203.0.113.9',
        'pop' => 'POP Jakarta',
        'regional' => 'Jakarta',
        'preferred_upstream' => null,
        'secondary_upstream' => null,
        'primary_noc_link' => null,
        'secondary_noc_link' => null,
        'downlink_router' => null,
        'bandwidth_international_mbps' => 100.5,
        'bandwidth_domestic_iix_mbps' => null,
        'bandwidth_mixed_mbps' => null,
        'domain_name_1' => null,
        'domain_name_2' => null,
        'primary_dns' => null,
        'secondary_dns' => null,
        'mx_primary' => null,
        'mx_secondary' => null,
        'hosting_platform' => null,
        'hosting_capacity_gb' => null,
        'migrate_domain' => false,
        'migrate_hosting' => true,
        'references' => [
            ['reference_type' => 'IWO', 'specification' => null],
            ['reference_type' => 'OTHER', 'specification' => 'Nota internal 12/2026'],
        ],
        'service_blocks' => [
            ['service_context' => 'EXISTING', 'service_id' => 'SVC-000123', 'service_status' => 'ACTIVATED', 'service_description' => 'Dedicated 50', 'service_location' => 'Jl. Contoh 1'],
            ['service_context' => 'NEW', 'service_id' => 'SVC-000124', 'service_status' => 'ACTIVATED', 'service_description' => 'Dedicated 100', 'service_location' => 'Jl. Contoh 1'],
        ],
        'sla_items' => [['row_no' => 1, 'requirement_text' => 'Uptime sesuai kontrak']],
        'virtual_connections' => [['row_no' => 1, 'bandwidth_mbps' => 50]],
        'priority_destinations' => [['row_no' => 1, 'destination' => 'Google Global Cache']],
        'direct_site' => ['local_loops' => 'LL-1', 'latency_ms' => 0, 'packet_loss_percent' => 100, 'rssi' => -65.5],
        'pop_site' => ['switch_distribution' => 'SW-1', 'vlan_id' => 4094],
    ];
}

it('persists the canonical Activation payload in one version step and one Business Audit event', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');

    $response = signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => canonicalActivation()]);

    $response->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.id', $recordId)
        ->assertJsonPath('data.record_version', 2)
        ->assertJsonPath('data.business_status', 'DRAFT')
        ->assertJsonStructure(['data' => ['updated_at'], 'meta' => ['warnings']]);

    $detail = DB::table('nscmf_activation_details')->where('nscmf_record_id', $recordId)->sole();
    expect($detail->customer_name)->toBe('PT Contoh Sejahtera')
        ->and($detail->bandwidth_international_mbps)->toBe('100.500')
        ->and($detail->migrate_hosting)->toBe(1)
        ->and(DB::table('nscmf_activation_references')->where('nscmf_record_id', $recordId)->orderBy('reference_type')->pluck('reference_type')->all())->toBe(['IWO', 'OTHER'])
        ->and(DB::table('nscmf_activation_references')->where('reference_type', 'IWO')->value('specification'))->toBeNull()
        ->and(DB::table('nscmf_activation_service_blocks')->where('nscmf_record_id', $recordId)->count())->toBe(2)
        ->and(DB::table('nscmf_activation_virtual_connections')->where('nscmf_record_id', $recordId)->value('bandwidth_mbps'))->toBe('50.000')
        ->and(DB::table('nscmf_activation_direct_site_details')->where('nscmf_record_id', $recordId)->value('packet_loss_percent'))->toBe('100.00')
        ->and(DB::table('nscmf_activation_pop_site_details')->where('nscmf_record_id', $recordId)->value('vlan_id'))->toBe(4094)
        ->and(Records::version($recordId))->toBe(2);

    $audit = DB::table('business_audit_events')->sole();
    expect($audit->event_type)->toBe('DRAFT_UPDATED')
        ->and($audit->record_version_before)->toBe(1)
        ->and($audit->record_version_after)->toBe(2)
        ->and(DB::table('business_audit_changes')->where('business_audit_event_id', $audit->id)->where('field_path', 'activation.customer_name')->value('new_value_text'))->toBe('PT Contoh Sejahtera');
});

it('leaves omitted keys unchanged, clears explicit nulls and keeps zero and false as values', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => canonicalActivation()])->assertOk();

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'activation' => ['contact_name' => null, 'migrate_hosting' => false]])->assertOk();

    $detail = DB::table('nscmf_activation_details')->where('nscmf_record_id', $recordId)->sole();
    expect($detail->customer_name)->toBe('PT Contoh Sejahtera')
        ->and($detail->contact_name)->toBeNull()
        ->and($detail->migrate_hosting)->toBe(0)
        ->and(DB::table('nscmf_activation_references')->where('nscmf_record_id', $recordId)->count())->toBe(2)
        ->and(DB::table('nscmf_activation_direct_site_details')->where('nscmf_record_id', $recordId)->value('latency_ms'))->toBe('0.000');
});

it('replaces whole collections, clears with [] and discards not-started rows but keeps selections', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => canonicalActivation()])->assertOk();

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'activation' => [
        'references' => [['reference_type' => 'TICKET', 'specification' => null]],
        'sla_items' => [['row_no' => 2, 'requirement_text' => 'Kedua'], ['row_no' => 3, 'requirement_text' => null]],
        'service_blocks' => [['service_context' => 'NEW', 'service_id' => null, 'service_status' => null, 'service_description' => null, 'service_location' => null]],
        'virtual_connections' => [],
    ]])->assertOk();

    expect(DB::table('nscmf_activation_references')->where('nscmf_record_id', $recordId)->pluck('reference_type')->all())->toBe(['TICKET'])
        ->and(DB::table('nscmf_activation_sla_items')->where('nscmf_record_id', $recordId)->pluck('row_no')->all())->toBe([2])
        ->and(DB::table('nscmf_activation_service_blocks')->where('nscmf_record_id', $recordId)->count())->toBe(0)
        ->and(DB::table('nscmf_activation_virtual_connections')->where('nscmf_record_id', $recordId)->count())->toBe(0)
        ->and(DB::table('nscmf_activation_priority_destinations')->where('nscmf_record_id', $recordId)->count())->toBe(1);
});

it('clears a site block with null and rejects an empty object', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => canonicalActivation()])->assertOk();

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'activation' => ['direct_site' => new stdClass]])
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors('activation.direct_site', 'errors');
    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 2, 'activation' => ['direct_site' => null]])->assertOk();

    expect(DB::table('nscmf_activation_direct_site_details')->where('nscmf_record_id', $recordId)->exists())->toBeFalse()
        ->and(DB::table('nscmf_activation_pop_site_details')->where('nscmf_record_id', $recordId)->exists())->toBeTrue();
});

it('rejects structurally impossible Activation values with 422 and no change', function (array $activation, string $errorKey): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'ACTIVATION');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => $activation])
        ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_FAILED')->assertJsonValidationErrors($errorKey, 'errors');

    expect(Records::version($recordId))->toBe(1)
        ->and(DB::table('business_audit_events')->count())->toBe(0);
})->with([
    'zero bandwidth' => [['bandwidth_international_mbps' => 0], 'activation.bandwidth_international_mbps'],
    'negative capacity' => [['hosting_capacity_gb' => -1], 'activation.hosting_capacity_gb'],
    'long customer' => [['customer_name' => str_repeat('a', 151)], 'activation.customer_name'],
    'bad date' => [['installation_rfs_date' => '2026-02-30'], 'activation.installation_rfs_date'],
    'string boolean' => [['migrate_domain' => 'yes'], 'activation.migrate_domain'],
    'unknown reference' => [['references' => [['reference_type' => 'EMAIL', 'specification' => null]]], 'activation.references.0.reference_type'],
    'duplicate reference' => [['references' => [['reference_type' => 'IWO'], ['reference_type' => 'IWO']]], 'activation.references.1.reference_type'],
    'row out of range' => [['sla_items' => [['row_no' => 4, 'requirement_text' => 'x']]], 'activation.sla_items.0.row_no'],
    'duplicate row' => [['sla_items' => [['row_no' => 1, 'requirement_text' => 'a'], ['row_no' => 1, 'requirement_text' => 'b']]], 'activation.sla_items.1.row_no'],
    'row database id' => [['sla_items' => [['id' => 7, 'row_no' => 1, 'requirement_text' => 'a']]], 'activation.sla_items.0.id'],
    'unknown field' => [['favourite_colour' => 'blue'], 'activation.favourite_colour'],
    'vlan 0' => [['pop_site' => ['vlan_id' => 0]], 'activation.pop_site.vlan_id'],
    'packet loss 101' => [['direct_site' => ['packet_loss_percent' => 101]], 'activation.direct_site.packet_loss_percent'],
    'negative latency' => [['direct_site' => ['latency_ms' => -1]], 'activation.direct_site.latency_ms'],
    'site unknown key' => [['pop_site' => ['vlan' => 12]], 'activation.pop_site.vlan'],
    'control character' => [['pop' => "POP\u{0007}"], 'activation.pop'],
    'service status' => [['service_blocks' => [['service_context' => 'NEW', 'service_status' => 'SUSPENDED']]], 'activation.service_blocks.0.service_status'],
]);

it('accepts an incomplete Draft: submission-only rules are not applied while saving', function (): void {
    $owner = Actors::requester();
    $recordId = Records::create($owner, 'ACTIVATION', 'UPGRADE_DOWNGRADE');

    signIn($owner)->patchJson("/nscmf/{$recordId}/draft", ['record_version' => 1, 'activation' => [
        'customer_name' => null, 'wan_ip' => 'not an ip yet', 'domain_name_1' => 'half.typed', 'service_blocks' => [],
    ]])->assertOk();
});
