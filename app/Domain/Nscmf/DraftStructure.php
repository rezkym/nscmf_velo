<?php

declare(strict_types=1);

namespace App\Domain\Nscmf;

use App\Domain\Nscmf\Enums\NscmfFamily;

/**
 * The typed Draft form structure shared by validation, persistence and projection
 * (11 §16–29, 12 §7.4.1, §27–28). Keys are exactly the 11 column names.
 */
final class DraftStructure
{
    public const string TEXT = 'text';

    public const string DATE = 'date';

    public const string DECIMAL = 'decimal';

    public const string INTEGER = 'integer';

    public const string BOOLEAN = 'boolean';

    /**
     * Scalar fields of the family detail row, with their value kind.
     *
     * @return array<string, string>
     */
    public static function scalars(NscmfFamily $family): array
    {
        return match ($family) {
            NscmfFamily::ACTIVATION => [
                'customer_name' => self::TEXT,
                'contact_name' => self::TEXT,
                'installation_rfs_date' => self::DATE,
                'lan_ip_allocation' => self::TEXT,
                'wan_ip' => self::TEXT,
                'gateway' => self::TEXT,
                'pop' => self::TEXT,
                'regional' => self::TEXT,
                'preferred_upstream' => self::TEXT,
                'secondary_upstream' => self::TEXT,
                'primary_noc_link' => self::TEXT,
                'secondary_noc_link' => self::TEXT,
                'downlink_router' => self::TEXT,
                'bandwidth_international_mbps' => self::DECIMAL,
                'bandwidth_domestic_iix_mbps' => self::DECIMAL,
                'bandwidth_mixed_mbps' => self::DECIMAL,
                'domain_name_1' => self::TEXT,
                'domain_name_2' => self::TEXT,
                'primary_dns' => self::TEXT,
                'secondary_dns' => self::TEXT,
                'mx_primary' => self::TEXT,
                'mx_secondary' => self::TEXT,
                'hosting_platform' => self::TEXT,
                'hosting_capacity_gb' => self::DECIMAL,
                'migrate_domain' => self::BOOLEAN,
                'migrate_hosting' => self::BOOLEAN,
            ],
            NscmfFamily::CHANGE => [
                'maintenance_purpose' => self::TEXT,
                'target_execution_date' => self::DATE,
                'monitoring_period_value' => self::DECIMAL,
                'monitoring_period_unit' => self::TEXT,
                'rollback_scenario' => self::TEXT,
                'announcement_timing' => self::TEXT,
            ],
        };
    }

    /**
     * Repeatable collections (12 §7.4.1). `selection` rows are never "not started"; row
     * collections drop a row whose content fields are all null. `order` lists the canonical
     * order of selection keys; row collections order by row_no.
     *
     * @return array<string, array{key: string, selection: bool, max_row: int|null, fields: array<string, string>, order: list<string>}>
     */
    public static function collections(NscmfFamily $family): array
    {
        return match ($family) {
            NscmfFamily::ACTIVATION => [
                'references' => ['key' => 'reference_type', 'selection' => true, 'max_row' => null, 'fields' => ['specification' => self::TEXT], 'order' => ['IWO', 'VELOSHIP', 'TICKET', 'OTHER']],
                'service_blocks' => ['key' => 'service_context', 'selection' => false, 'max_row' => null, 'order' => ['EXISTING', 'NEW'], 'fields' => [
                    'service_id' => self::TEXT, 'service_status' => self::TEXT, 'service_description' => self::TEXT, 'service_location' => self::TEXT,
                ]],
                'sla_items' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['requirement_text' => self::TEXT], 'order' => []],
                'virtual_connections' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['bandwidth_mbps' => self::DECIMAL], 'order' => []],
                'priority_destinations' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['destination' => self::TEXT], 'order' => []],
            ],
            NscmfFamily::CHANGE => [
                'facing_challenges' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['challenge_text' => self::TEXT], 'order' => []],
                'identified_problems' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['problem_text' => self::TEXT], 'order' => []],
                'service_impacts' => ['key' => 'impact_code', 'selection' => true, 'max_row' => null, 'fields' => ['other_description' => self::TEXT], 'order' => [
                    'NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER',
                ]],
                'improvement_items' => ['key' => 'row_no', 'selection' => false, 'max_row' => 3, 'fields' => ['plan_text' => self::TEXT, 'target_kpi' => self::TEXT], 'order' => []],
                'results' => ['key' => 'row_no', 'selection' => false, 'max_row' => 5, 'order' => [], 'fields' => [
                    'result_summary' => self::TEXT, 'performance_information' => self::TEXT, 'result_status' => self::TEXT,
                ]],
            ],
        };
    }

    /**
     * Optional 1:1 site blocks (11 §22–23); Activation only.
     *
     * @return array<string, array<string, string>>
     */
    public static function sites(NscmfFamily $family): array
    {
        if ($family === NscmfFamily::CHANGE) {
            return [];
        }

        return [
            'direct_site' => [
                'local_loops' => self::TEXT, 'lastmile' => self::TEXT, 'bwa' => self::TEXT, 'antenna_tower' => self::TEXT,
                'direction' => self::TEXT, 'rssi' => self::DECIMAL, 'latency_ms' => self::DECIMAL, 'packet_loss_percent' => self::DECIMAL,
                'routers' => self::TEXT, 'ups' => self::TEXT, 'stabilizer' => self::TEXT, 'cable' => self::TEXT,
            ],
            'pop_site' => [
                'switch_distribution' => self::TEXT, 'port' => self::TEXT, 'vlan_id' => self::INTEGER, 'local_loops' => self::TEXT,
                'routers' => self::TEXT, 'cpe_indoor' => self::TEXT, 'cpe_outdoor' => self::TEXT,
            ],
        ];
    }

    /**
     * Applies the persistence discard rule (12 §7.4.1.1) and fills omitted content fields with null.
     *
     * @param  array{key: string, selection: bool, max_row: int|null, fields: array<string, string>, order: list<string>}  $definition
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    public static function keptRows(array $definition, array $rows): array
    {
        $kept = [];

        foreach ($rows as $row) {
            $normalized = [$definition['key'] => $row[$definition['key']] ?? null];
            $started = false;

            foreach (array_keys($definition['fields']) as $field) {
                $value = $row[$field] ?? null;
                $normalized[$field] = $value;
                $started = $started || $value !== null;
            }

            if ($definition['selection'] || $started) {
                $kept[] = $normalized;
            }
        }

        return $kept;
    }
}
