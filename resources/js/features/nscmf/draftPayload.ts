import type { ActivationDraftFields, ChangeDraftFields } from './types';

/**
 * Builds the PATCH /nscmf/{record}/draft body (12 §26-28) from the edit form's draft fields.
 *
 * Rules applied (12 §7.4.1):
 * - only known keys are sent; an omitted key means "unchanged";
 * - blank strings are sent as null;
 * - collections are sent as the whole desired set, keyed by their natural key, never by database id;
 * - a row whose content fields are all blank is "not started" and dropped, except selection rows
 *   (references, service impacts) where choosing the option is the content;
 * - site blocks are an object or null (clear); a literal {} is invalid;
 * - record_version is passed through unchanged; the server increments it.
 *
 * Requiredness and value ranges are validated by the server at the action stage (06), not here.
 */

export interface ActivationDraftPayload {
    record_version: number;
    activation: ActivationDraftFields;
}

export interface ChangeDraftPayload {
    record_version: number;
    change: ChangeDraftFields;
}

interface CollectionRule {
    /** Natural key of a row: `row_no` for ordered rows, the option code for selections. */
    key: string;
    maxRowNo?: number;
    fields: readonly string[];
    keepWithoutContent?: boolean;
}

type Fields = Record<string, unknown>;

const ACTIVATION_SCALARS = [
    'customer_name',
    'contact_name',
    'installation_rfs_date',
    'lan_ip_allocation',
    'wan_ip',
    'gateway',
    'pop',
    'regional',
    'preferred_upstream',
    'secondary_upstream',
    'primary_noc_link',
    'secondary_noc_link',
    'downlink_router',
    'bandwidth_international_mbps',
    'bandwidth_domestic_iix_mbps',
    'bandwidth_mixed_mbps',
    'domain_name_1',
    'domain_name_2',
    'primary_dns',
    'secondary_dns',
    'mx_primary',
    'mx_secondary',
    'hosting_platform',
    'hosting_capacity_gb',
    'migrate_domain',
    'migrate_hosting',
] as const satisfies readonly (keyof ActivationDraftFields)[];

const ACTIVATION_COLLECTIONS: Record<string, CollectionRule> = {
    references: { key: 'reference_type', fields: ['specification'], keepWithoutContent: true },
    service_blocks: {
        key: 'service_context',
        fields: ['service_id', 'service_status', 'service_description', 'service_location'],
    },
    sla_items: { key: 'row_no', maxRowNo: 3, fields: ['requirement_text'] },
    virtual_connections: { key: 'row_no', maxRowNo: 3, fields: ['bandwidth_mbps'] },
    priority_destinations: { key: 'row_no', maxRowNo: 3, fields: ['destination'] },
};

const ACTIVATION_SITES: Record<string, readonly string[]> = {
    direct_site: [
        'local_loops',
        'lastmile',
        'bwa',
        'antenna_tower',
        'direction',
        'rssi',
        'latency_ms',
        'packet_loss_percent',
        'routers',
        'ups',
        'stabilizer',
        'cable',
    ],
    pop_site: ['switch_distribution', 'port', 'vlan_id', 'local_loops', 'routers', 'cpe_indoor', 'cpe_outdoor'],
};

const CHANGE_SCALARS = [
    'maintenance_purpose',
    'target_execution_date',
    'monitoring_period_value',
    'monitoring_period_unit',
    'rollback_scenario',
    'announcement_timing',
] as const satisfies readonly (keyof ChangeDraftFields)[];

const CHANGE_COLLECTIONS: Record<string, CollectionRule> = {
    facing_challenges: { key: 'row_no', maxRowNo: 3, fields: ['challenge_text'] },
    identified_problems: { key: 'row_no', maxRowNo: 3, fields: ['problem_text'] },
    service_impacts: { key: 'impact_code', fields: ['other_description'], keepWithoutContent: true },
    improvement_items: { key: 'row_no', maxRowNo: 3, fields: ['plan_text', 'target_kpi'] },
    results: {
        key: 'row_no',
        maxRowNo: 5,
        fields: ['result_summary', 'performance_information', 'result_status'],
    },
};

export function buildActivationDraftPayload(
    recordVersion: number,
    activation: ActivationDraftFields,
): ActivationDraftPayload {
    return {
        record_version: checkedRecordVersion(recordVersion),
        activation: pickFields(activation, ACTIVATION_SCALARS, ACTIVATION_COLLECTIONS, ACTIVATION_SITES),
    };
}

export function buildChangeDraftPayload(recordVersion: number, change: ChangeDraftFields): ChangeDraftPayload {
    return {
        record_version: checkedRecordVersion(recordVersion),
        change: pickFields(change, CHANGE_SCALARS, CHANGE_COLLECTIONS, {}),
    };
}

function checkedRecordVersion(recordVersion: number): number {
    if (!Number.isSafeInteger(recordVersion) || recordVersion < 1) {
        throw new Error(`record_version must be a positive integer, received ${String(recordVersion)}.`);
    }
    return recordVersion;
}

function pickFields<T extends object>(
    source: T,
    scalars: readonly string[],
    collections: Record<string, CollectionRule>,
    sites: Record<string, readonly string[]>,
): T {
    const input = source as Fields;
    const output: Fields = {};

    for (const key of scalars) {
        if (Object.hasOwn(input, key)) output[key] = blankToNull(input[key]);
    }
    for (const [name, rule] of Object.entries(collections)) {
        if (input[name] !== undefined) output[name] = normalizeRows(name, input[name], rule);
    }
    for (const [name, fields] of Object.entries(sites)) {
        if (Object.hasOwn(input, name)) output[name] = normalizeSite(name, input[name], fields);
    }

    return output as T;
}

function normalizeRows(name: string, rows: unknown, rule: CollectionRule): Fields[] {
    if (!Array.isArray(rows)) throw new Error(`${name} must be an array.`);

    const seenKeys = new Set<unknown>();
    const normalized: Fields[] = [];

    for (const row of rows as unknown[]) {
        if (!isObject(row)) throw new Error(`${name} rows must be objects.`);

        const naturalKey = row[rule.key];
        if (!isValidNaturalKey(naturalKey, rule)) {
            throw new Error(`${name}: invalid ${rule.key} ${String(naturalKey)}.`);
        }
        if (seenKeys.has(naturalKey)) throw new Error(`${name}: duplicate ${rule.key} ${String(naturalKey)}.`);
        seenKeys.add(naturalKey);

        const content = Object.fromEntries(rule.fields.map((field) => [field, blankToNull(row[field] ?? null)]));
        const started = Object.values(content).some((value) => value !== null);
        if (started || rule.keepWithoutContent) normalized.push({ [rule.key]: naturalKey, ...content });
    }

    return normalized;
}

function normalizeSite(name: string, site: unknown, fields: readonly string[]): Fields | null {
    if (site === null) return null;
    if (!isObject(site)) throw new Error(`${name} must be an object or null.`);

    const present = fields.filter((field) => Object.hasOwn(site, field));
    if (present.length === 0) throw new Error(`${name} must not be an empty object; send null to clear it.`);

    return Object.fromEntries(present.map((field) => [field, blankToNull(site[field])]));
}

function isValidNaturalKey(value: unknown, rule: CollectionRule): boolean {
    if (rule.maxRowNo !== undefined) {
        return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= rule.maxRowNo;
    }
    return typeof value === 'string' && value !== '';
}

function blankToNull(value: unknown): unknown {
    return typeof value === 'string' && value.trim() === '' ? null : value;
}

function isObject(value: unknown): value is Fields {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
