import {
    ANNOUNCEMENT_TIMING_LABELS,
    MONITORING_UNIT_LABELS,
    REFERENCE_TYPE_LABELS,
    SERVICE_CONTEXT_LABELS,
    SERVICE_IMPACT_LABELS,
    SERVICE_STATUS_LABELS,
} from './types';

/**
 * The fields of an NSCMF record and how each one reads to a person. Form Detail and the Timeline
 * both read labels and values from here, so a field is named and shown the same way everywhere
 * (07 §35–36).
 */

export type Format = (value: unknown) => string;

/** Missing values show a neutral dash; 0 and false are real values. */
export const display: Format = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value);
};

/** A closed code shown by its label; an unknown code stays visible as it is. */
function labelled(labels: Record<string, string>): Format {
    return (value) => display(typeof value === 'string' ? (labels[value] ?? value) : value);
}

/** A yes/no field: a boolean on the record, `true`/`false` text in the Timeline (12 §48). */
const yesNo: Format = (value) => display(value === 'true' ? true : value === 'false' ? false : value);

export interface FieldSpec {
    key: string;
    label: string;
    format?: Format;
}

export interface FieldGroup {
    title: string;
    fields: FieldSpec[];
}

/** A repeatable set. Its first column is the row's natural key (11 §16–29). */
export interface CollectionSpec {
    title: string;
    columns: FieldSpec[];
}

/** A stored record part: a family's fields, a site block or a collection row. */
export type Row = object;

/** The value a row holds for `key`; a key the row does not have reads as empty. */
export function fieldValue(row: Row | null | undefined, key: string): unknown {
    return row && key in row ? (row as Record<string, unknown>)[key] : null;
}

const field = (key: string, label: string, format?: Format): FieldSpec => ({ key, label, format });
const numbered = (title: string, ...columns: FieldSpec[]): CollectionSpec => ({
    title,
    columns: [field('row_no', '#'), ...columns],
});

export const HEADER_FIELDS: FieldSpec[] = [
    field('request_date', 'Request date'),
    field('request_no', 'Request number'),
];

export const ACTIVATION_GROUPS = {
    general: {
        title: 'General and service',
        fields: [
            field('customer_name', 'Customer name'),
            field('contact_name', 'Contact name'),
            field('installation_rfs_date', 'Installation (RFS) date'),
        ],
    },
    network: {
        title: 'NOC configuration',
        fields: [
            field('lan_ip_allocation', 'LAN IP allocation'),
            field('wan_ip', 'WAN IP'),
            field('gateway', 'Gateway'),
            field('pop', 'POP'),
            field('regional', 'Regional'),
            field('preferred_upstream', 'Preferred upstream'),
            field('secondary_upstream', 'Secondary upstream'),
            field('primary_noc_link', 'Primary link to NOC'),
            field('secondary_noc_link', 'Secondary link to NOC'),
            field('downlink_router', 'Downlink router'),
        ],
    },
    bandwidth: {
        title: 'Bandwidth',
        fields: [
            field('bandwidth_international_mbps', 'International (Mbps)'),
            field('bandwidth_domestic_iix_mbps', 'Domestic / IIX (Mbps)'),
            field('bandwidth_mixed_mbps', 'International & IIX mixed (Mbps)'),
        ],
    },
    hosting: {
        title: 'Domain, DNS and hosting',
        fields: [
            field('domain_name_1', 'Domain name 1'),
            field('domain_name_2', 'Domain name 2'),
            field('primary_dns', 'Primary DNS'),
            field('secondary_dns', 'Secondary DNS'),
            field('mx_primary', 'MX primary'),
            field('mx_secondary', 'MX secondary'),
            field('hosting_platform', 'Hosting platform'),
            field('hosting_capacity_gb', 'Hosting capacity (GB)'),
            field('migrate_domain', 'Migrate domain', yesNo),
            field('migrate_hosting', 'Migrate hosting', yesNo),
        ],
    },
} satisfies Record<string, FieldGroup>;

/** The two site blocks, each stored as one object (11 §22–23). */
export const SITE_BLOCKS = {
    direct_site: {
        title: 'Customer site (direct)',
        fields: [
            field('local_loops', 'Local loops'),
            field('lastmile', 'Last mile'),
            field('bwa', 'BWA'),
            field('antenna_tower', 'Antenna / tower'),
            field('direction', 'Direction'),
            field('rssi', 'RSSI'),
            field('latency_ms', 'Latency (ms)'),
            field('packet_loss_percent', 'Packet loss (%)'),
            field('routers', 'Routers'),
            field('ups', 'UPS'),
            field('stabilizer', 'Stabilizer'),
            field('cable', 'Cable'),
        ],
    },
    pop_site: {
        title: 'Customer site at POP',
        fields: [
            field('switch_distribution', 'Switch distribution'),
            field('port', 'Port'),
            field('vlan_id', 'VLAN ID'),
            field('local_loops', 'Local loops'),
            field('routers', 'Routers'),
            field('cpe_indoor', 'CPE indoor'),
            field('cpe_outdoor', 'CPE outdoor'),
        ],
    },
} satisfies Record<string, FieldGroup>;

export const CHANGE_GROUPS = {
    purpose: { title: 'Purpose of changes', fields: [field('maintenance_purpose', 'Maintenance purpose')] },
    plan: {
        title: 'Plan, schedule and rollback',
        fields: [
            field('target_execution_date', 'Target execution date'),
            field('monitoring_period_value', 'Monitoring period'),
            field('monitoring_period_unit', 'Monitoring unit', labelled(MONITORING_UNIT_LABELS)),
            field('announcement_timing', 'Maintenance announcement', labelled(ANNOUNCEMENT_TIMING_LABELS)),
            field('rollback_scenario', 'Rollback scenario'),
        ],
    },
} satisfies Record<string, FieldGroup>;

export const ACTIVATION_COLLECTIONS = {
    references: {
        title: 'References',
        columns: [
            field('reference_type', 'Type', labelled(REFERENCE_TYPE_LABELS)),
            field('specification', 'Specification'),
        ],
    },
    service_blocks: {
        title: 'Services',
        columns: [
            field('service_context', 'Service', labelled(SERVICE_CONTEXT_LABELS)),
            field('service_id', 'Service ID'),
            field('service_status', 'Status', labelled(SERVICE_STATUS_LABELS)),
            field('service_description', 'Description'),
            field('service_location', 'Location'),
        ],
    },
    sla_items: numbered('Specific requirements (SLA)', field('requirement_text', 'Description')),
    virtual_connections: numbered('Virtual connections', field('bandwidth_mbps', 'Bandwidth (Mbps)')),
    priority_destinations: numbered('Priority destinations', field('destination', 'Destination')),
} satisfies Record<string, CollectionSpec>;

export const CHANGE_COLLECTIONS = {
    facing_challenges: numbered('Facing challenges', field('challenge_text', 'Description')),
    identified_problems: numbered('Identified problems', field('problem_text', 'Description')),
    service_impacts: {
        title: 'Service impact',
        columns: [
            field('impact_code', 'Impact', labelled(SERVICE_IMPACT_LABELS)),
            field('other_description', 'Description'),
        ],
    },
    improvement_items: numbered(
        'Improvement plan and target KPI',
        field('plan_text', 'Plan'),
        field('target_kpi', 'Target KPI'),
    ),
    results: numbered(
        'Results',
        field('result_summary', 'Result summary'),
        field('performance_information', 'Performance information'),
        field('result_status', 'Status'),
    ),
} satisfies Record<string, CollectionSpec>;

/** A field's value as a person reads it. */
export function formatValue(spec: FieldSpec, value: unknown): string {
    return (spec.format ?? display)(value);
}

/** Label/value pairs of `fields` read from `source`, for a definition list. */
export function detailItems(source: Row | null | undefined, fields: FieldSpec[], prefix = '') {
    return fields.map((spec) => ({
        key: `${prefix}${spec.key}`,
        label: spec.label,
        value: formatValue(spec, fieldValue(source, spec.key)),
    }));
}

/** The rows of a collection as display text keyed by column, for a table. */
export function tableRows(spec: CollectionSpec, rows: Row[] | null | undefined): Record<string, string>[] {
    return (rows ?? []).map((row) =>
        Object.fromEntries(
            spec.columns.map((column) => [column.key, formatValue(column, fieldValue(row, column.key))]),
        ),
    );
}
