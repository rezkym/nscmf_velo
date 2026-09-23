<?php

declare(strict_types=1);

namespace App\Domain\Export;

/**
 * Mapping `nscmf-form-3.0/v1` from an export snapshot to the official workbook's cells and
 * native checkboxes (docs/template-mapping.md, BE-106). Pure data: which sheet, which cell, which
 * control. Any change to a cell or control choice is a new mapping version, never an edit here.
 *
 * @phpstan-type Control array{ctrl_prop: int, shape: int}
 * @phpstan-type WorkbookFill array{sheet: string, hidden_sheet: string, cells: array<string, string>, controls: list<Control>, skip_pages: array{int, int}}
 */
final class NscmfFormMappingV1
{
    public const string VERSION = 'nscmf-form-3.0/v1';

    private const array SHEETS = [
        'ACTIVATION' => ['sheet' => 'sheet1', 'name' => 'NSCMF - Activation'],
        'CHANGE' => ['sheet' => 'sheet2', 'name' => 'NSCMF - Change'],
    ];

    /** Checkbox → [ctrlProp number, VML shape id]; the duplicated boxes are both set (decision 1). */
    private const array ACTIVATION_SUBTYPES = [
        'ACTIVATION' => [[2, 8194]],
        'UPGRADE_DOWNGRADE' => [[14, 8216]],
        'DEACTIVATION' => [[1, 8193], [3, 8195]],
    ];

    private const array CHANGE_SUBTYPES = [
        'MAINTENANCE' => [[16, 7269]],
        'UPGRADE' => [[27, 7317]],
        'EMERGENCY' => [[15, 7268], [17, 7270]],
    ];

    private const array REFERENCES = [
        'IWO' => [[13, 8205], 'C12'],
        'VELOSHIP' => [[4, 8196], 'O12'],
        'TICKET' => [[5, 8197], 'AA12'],
        'OTHER' => [[6, 8198], 'AM12'],
    ];

    private const array SERVICE_BLOCKS = [
        'EXISTING' => ['id' => 'B18', 'description' => 'B20', 'location' => 'B22', 'ACTIVATED' => [7, 8199], 'DEACTIVATED' => [8, 8200]],
        'NEW' => ['id' => 'Z18', 'description' => 'Z20', 'location' => 'Z22', 'ACTIVATED' => [9, 8201], 'DEACTIVATED' => [10, 8202]],
    ];

    private const array ACTIVATION_SCALARS = [
        'customer_name' => 'B15', 'contact_name' => 'Z15', 'installation_rfs_date' => 'B24',
        'lan_ip_allocation' => 'D32', 'gateway' => 'AG32',
        'pop' => 'A34', 'regional' => 'M34', 'preferred_upstream' => 'Y34', 'secondary_upstream' => 'AK34',
        'primary_noc_link' => 'A36', 'downlink_router' => 'M36', 'secondary_noc_link' => 'Y36',
        'bandwidth_international_mbps' => 'H40', 'bandwidth_domestic_iix_mbps' => 'H41', 'bandwidth_mixed_mbps' => 'H42',
        'domain_name_1' => 'F47', 'domain_name_2' => 'F48', 'primary_dns' => 'F49', 'secondary_dns' => 'F50',
        'mx_primary' => 'W47', 'mx_secondary' => 'W48', 'hosting_platform' => 'AJ47', 'hosting_capacity_gb' => 'AJ48',
    ];

    private const array ACTIVATION_ROWS = [
        'sla_items' => ['requirement_text' => ['R24', 'R25', 'R26']],
        'virtual_connections' => ['bandwidth_mbps' => ['Z40', 'Z41', 'Z42']],
        'priority_destinations' => ['destination' => ['AE40', 'AE41', 'AE42']],
    ];

    private const array SITES = [
        'direct_site' => [
            'local_loops' => 'I55', 'lastmile' => 'AM55', 'bwa' => 'I56', 'antenna_tower' => 'AM56',
            'direction' => 'I57', 'rssi' => 'W57', 'latency_ms' => 'AM57', 'packet_loss_percent' => 'AR57',
            'routers' => 'I59', 'ups' => 'AC59', 'stabilizer' => 'AC60', 'cable' => 'I61',
        ],
        'pop_site' => [
            'switch_distribution' => 'I64', 'port' => 'AB64', 'vlan_id' => 'AM64',
            'local_loops' => 'I65', 'routers' => 'I66', 'cpe_indoor' => 'I67', 'cpe_outdoor' => 'AB67',
        ],
    ];

    private const array CHANGE_ROWS = [
        'facing_challenges' => ['challenge_text' => ['C14', 'C15', 'C16']],
        'identified_problems' => ['problem_text' => ['C20', 'C21', 'C22']],
        'improvement_items' => ['plan_text' => ['C34', 'C35', 'C36'], 'target_kpi' => ['Z34', 'Z35', 'Z36']],
        'results' => [
            'result_summary' => ['B50', 'B51', 'B52', 'B53', 'B54'],
            'performance_information' => ['V50', 'V51', 'V52', 'V53', 'V54'],
            'result_status' => ['AH50', 'AH51', 'AH52', 'AH53', 'AH54'],
        ],
    ];

    private const array SERVICE_IMPACTS = [
        'NOC15' => [18, 7306], 'NOC23' => [20, 7308], 'NOC361' => [21, 7309], 'REGIONAL' => [19, 7307],
        'POP' => [23, 7313], 'CUSTOMER' => [28, 7318], 'OTHER' => [22, 7310],
    ];

    private const array ANNOUNCEMENTS = [
        'ONE_WEEK_BEFORE' => [24, 7314], 'TWO_WEEKS_BEFORE' => [25, 7315], 'TWO_DAYS_BEFORE_EMERGENCY' => [26, 7316],
    ];

    /** Header and sign-off cells per family: [request_no, date, requested name, requested date, reviewed…, approved…]. */
    private const array HEADER = [
        'ACTIVATION' => ['AP4', 'AP5', 'A75', 'A77', 'Q75', 'Q77', 'AG75', 'AG77'],
        'CHANGE' => ['AQ4', 'AQ5', 'A67', 'A69', 'Q67', 'Q69', 'AG67', 'AG69'],
    ];

    /**
     * @param  array<string, mixed>  $snapshot  an export snapshot (schema nscmf-export-snapshot/1)
     * @return WorkbookFill
     */
    public static function fill(array $snapshot): array
    {
        $record = self::map($snapshot['record'] ?? []);
        $form = self::map($snapshot['form'] ?? []);
        $signoffs = self::map($snapshot['signoffs'] ?? []);
        $family = self::string($record['family'] ?? null) ?? throw new \InvalidArgumentException('Snapshot has no family.');
        $subtype = self::string($record['subtype'] ?? null);

        [$cells, $controls] = $family === 'ACTIVATION' ? self::activation($form, $subtype) : self::change($form, $subtype);

        $header = self::HEADER[$family];
        $cells[$header[0]] = self::string($record['request_no'] ?? null);
        $cells[$header[1]] = self::string($record['request_date'] ?? null);
        foreach (['requested_by', 'reviewed_by', 'approved_by'] as $index => $role) {
            $signoff = self::map($signoffs[$role] ?? []);
            $cells[$header[2 + $index * 2]] = self::string($signoff['name'] ?? null);
            $cells[$header[3 + $index * 2]] = self::string($signoff['date'] ?? null);
        }

        return [
            'sheet' => self::SHEETS[$family]['sheet'],
            'hidden_sheet' => self::SHEETS[$family === 'ACTIVATION' ? 'CHANGE' : 'ACTIVATION']['name'],
            'cells' => array_filter($cells, fn (?string $value): bool => $value !== null && $value !== ''),
            'controls' => array_map(fn (array $control): array => ['ctrl_prop' => $control[0], 'shape' => $control[1]], $controls),
            // LibreOffice prints hidden sheets; the other family's blank sheet is exactly one page.
            'skip_pages' => $family === 'ACTIVATION' ? [0, 1] : [1, 0],
        ];
    }

    /**
     * @param  array<string, mixed>  $form
     * @return array{array<string, string|null>, list<array{int, int}>}
     */
    private static function activation(array $form, ?string $subtype): array
    {
        $cells = [];
        $controls = self::ACTIVATION_SUBTYPES[$subtype ?? ''] ?? [];
        // WAN IP has its own "/" prefix-length cell (decision 4).
        $wan = explode('/', self::text($form['wan_ip'] ?? null) ?? '', 2);
        $cells['M32'] = $wan[0];
        $cells['W32'] = $wan[1] ?? null;

        foreach (self::ACTIVATION_SCALARS as $field => $cell) {
            $cells[$cell] = self::text($form[$field] ?? null);
        }
        foreach (['migrate_domain' => [11, 8203], 'migrate_hosting' => [12, 8204]] as $field => $control) {
            if (($form[$field] ?? false) === true) {
                $controls[] = $control;
            }
        }
        foreach (self::rows($form['references'] ?? []) as $row) {
            [$control, $cell] = self::REFERENCES[self::string($row['reference_type'] ?? null) ?? ''] ?? [null, null];
            if ($control !== null && $cell !== null) {
                $controls[] = $control;
                $cells[$cell] = self::text($row['specification'] ?? null);
            }
        }
        foreach (self::rows($form['service_blocks'] ?? []) as $row) {
            $block = self::SERVICE_BLOCKS[self::string($row['service_context'] ?? null) ?? ''] ?? null;
            if ($block === null) {
                continue;
            }
            $cells[$block['id']] = self::text($row['service_id'] ?? null);
            $cells[$block['description']] = self::text($row['service_description'] ?? null);
            $cells[$block['location']] = self::text($row['service_location'] ?? null);
            $status = self::string($row['service_status'] ?? null);
            if ($status === 'ACTIVATED' || $status === 'DEACTIVATED') {
                $controls[] = $block[$status];
            }
        }
        $cells = [...$cells, ...self::numberedRows($form, self::ACTIVATION_ROWS)];
        foreach (self::SITES as $site => $fields) {
            $values = self::map($form[$site] ?? []);
            foreach ($fields as $field => $cell) {
                $cells[$cell] = self::text($values[$field] ?? null);
            }
        }

        return [$cells, $controls];
    }

    /**
     * @param  array<string, mixed>  $form
     * @return array{array<string, string|null>, list<array{int, int}>}
     */
    private static function change(array $form, ?string $subtype): array
    {
        $controls = self::CHANGE_SUBTYPES[$subtype ?? ''] ?? [];
        $unit = self::string($form['monitoring_period_unit'] ?? null);
        $cells = [
            'Z14' => self::text($form['maintenance_purpose'] ?? null),
            'L39' => self::text($form['target_execution_date'] ?? null),
            'AF39' => $unit === null ? null : self::text($form['monitoring_period_value'] ?? null).' '.$unit,
            'J40' => self::text($form['rollback_scenario'] ?? null),
            ...self::numberedRows($form, self::CHANGE_ROWS),
        ];

        foreach (self::rows($form['service_impacts'] ?? []) as $row) {
            $code = self::string($row['impact_code'] ?? null) ?? '';
            if (isset(self::SERVICE_IMPACTS[$code])) {
                $controls[] = self::SERVICE_IMPACTS[$code];
            }
            if ($code === 'OTHER') {
                $cells['H31'] = self::text($row['other_description'] ?? null);
            }
        }
        $announcement = self::ANNOUNCEMENTS[self::string($form['announcement_timing'] ?? null) ?? ''] ?? null;
        if ($announcement !== null) {
            $controls[] = $announcement;
        }

        return [$cells, $controls];
    }

    /**
     * Rows with a 1-based `row_no` written into the cell column for that row.
     *
     * @param  array<string, mixed>  $form
     * @param  array<string, array<string, list<string>>>  $layout
     * @return array<string, string|null>
     */
    private static function numberedRows(array $form, array $layout): array
    {
        $cells = [];
        foreach ($layout as $collection => $columns) {
            foreach (self::rows($form[$collection] ?? []) as $row) {
                $index = (is_int($row['row_no'] ?? null) ? $row['row_no'] : 0) - 1;
                foreach ($columns as $field => $column) {
                    if (isset($column[$index])) {
                        $cells[$column[$index]] = self::text($row[$field] ?? null);
                    }
                }
            }
        }

        return $cells;
    }

    /** @return list<array<string, mixed>> */
    private static function rows(mixed $value): array
    {
        return is_array($value) ? array_values(array_map(self::map(...), $value)) : [];
    }

    /** @return array<string, mixed> */
    private static function map(mixed $value): array
    {
        return is_array($value) ? array_filter($value, is_string(...), ARRAY_FILTER_USE_KEY) : [];
    }

    private static function string(mixed $value): ?string
    {
        return is_string($value) ? $value : null;
    }

    /** Numbers without trailing zeros; booleans have no cell text (decision 3). */
    private static function text(mixed $value): ?string
    {
        return match (true) {
            is_int($value) => (string) $value,
            is_float($value) => rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.'),
            is_string($value) && is_numeric($value) && str_contains($value, '.') => rtrim(rtrim($value, '0'), '.'),
            is_string($value) => $value,
            default => null,
        };
    }
}
