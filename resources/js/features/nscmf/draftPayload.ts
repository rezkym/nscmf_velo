export interface ReferenceSelection {
    reference_type: 'IWO' | 'VELOSHIP' | 'TICKET' | 'OTHER';
    specification?: string | null;
}

export interface ServiceBlockRow {
    service_context: 'EXISTING' | 'NEW';
    service_id?: string | null;
    service_status?: 'ACTIVATED' | 'DEACTIVATED' | null;
    service_description?: string | null;
    service_location?: string | null;
}

export interface SlaItemRow {
    row_no: number;
    requirement_text?: string | null;
}

export interface VirtualConnectionRow {
    row_no: number;
    bandwidth_mbps?: number | null;
}

export interface PriorityDestinationRow {
    row_no: number;
    destination?: string | null;
}

export interface DirectSiteBlock {
    local_loops?: string | null;
    lastmile?: string | null;
    bwa?: string | null;
    antenna_tower?: string | null;
    direction?: string | null;
    rssi?: number | null;
    latency_ms?: number | null;
    packet_loss_percent?: number | null;
    routers?: string | null;
    ups?: string | null;
    stabilizer?: string | null;
    cable?: string | null;
}

export interface PopSiteBlock {
    switch_distribution?: string | null;
    port?: string | null;
    vlan_id?: number | null;
    local_loops?: string | null;
    routers?: string | null;
    cpe_indoor?: string | null;
    cpe_outdoor?: string | null;
}

export interface ActivationDraftFields {
    customer_name?: string | null;
    contact_name?: string | null;
    installation_rfs_date?: string | null;
    lan_ip_allocation?: string | null;
    wan_ip?: string | null;
    gateway?: string | null;
    pop?: string | null;
    regional?: string | null;
    preferred_upstream?: string | null;
    secondary_upstream?: string | null;
    primary_noc_link?: string | null;
    secondary_noc_link?: string | null;
    downlink_router?: string | null;
    bandwidth_international_mbps?: number | null;
    bandwidth_domestic_iix_mbps?: number | null;
    bandwidth_mixed_mbps?: number | null;
    domain_name_1?: string | null;
    domain_name_2?: string | null;
    primary_dns?: string | null;
    secondary_dns?: string | null;
    mx_primary?: string | null;
    mx_secondary?: string | null;
    hosting_platform?: string | null;
    hosting_capacity_gb?: number | null;
    migrate_domain?: boolean | null;
    migrate_hosting?: boolean | null;
    references?: ReferenceSelection[];
    service_blocks?: ServiceBlockRow[];
    sla_items?: SlaItemRow[];
    virtual_connections?: VirtualConnectionRow[];
    priority_destinations?: PriorityDestinationRow[];
    direct_site?: DirectSiteBlock | null;
    pop_site?: PopSiteBlock | null;
}

export interface FacingChallengeRow {
    row_no: number;
    challenge_text?: string | null;
}

export interface IdentifiedProblemRow {
    row_no: number;
    problem_text?: string | null;
}

export interface ServiceImpactSelection {
    impact_code: 'NOC15' | 'NOC23' | 'NOC361' | 'REGIONAL' | 'POP' | 'CUSTOMER' | 'OTHER';
    other_description?: string | null;
}

export interface ImprovementItemRow {
    row_no: number;
    plan_text?: string | null;
    target_kpi?: string | null;
}

export interface ChangeResultRow {
    row_no: number;
    result_summary?: string | null;
    performance_information?: string | null;
    result_status?: string | null;
}

export interface ChangeDraftFields {
    maintenance_purpose?: string | null;
    target_execution_date?: string | null;
    monitoring_period_value?: number | null;
    monitoring_period_unit?: 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | null;
    rollback_scenario?: string | null;
    announcement_timing?: 'ONE_WEEK_BEFORE' | 'TWO_WEEKS_BEFORE' | 'TWO_DAYS_BEFORE_EMERGENCY' | null;
    facing_challenges?: FacingChallengeRow[];
    identified_problems?: IdentifiedProblemRow[];
    service_impacts?: ServiceImpactSelection[];
    improvement_items?: ImprovementItemRow[];
    results?: ChangeResultRow[];
}

export interface ActivationDraftInput {
    family: 'ACTIVATION';
    record_version: number;
    activation?: ActivationDraftFields;
    change?: never;
}

export interface ChangeDraftInput {
    family: 'CHANGE';
    record_version: number;
    change?: ChangeDraftFields;
    activation?: never;
}

export type DraftPayloadInput =
    | ActivationDraftInput
    | ChangeDraftInput
    | {
          family: 'ACTIVATION' | 'CHANGE';
          record_version: number;
          activation?: ActivationDraftFields;
          change?: ChangeDraftFields;
      };

export interface ActivationDraftWirePayload {
    record_version: number;
    activation: Record<string, unknown>;
}

export interface ChangeDraftWirePayload {
    record_version: number;
    change: Record<string, unknown>;
}

export type DraftWirePayload = ActivationDraftWirePayload | ChangeDraftWirePayload;

function isNonEmptyString(val: unknown): boolean {
    return typeof val === 'string' && val.trim().length > 0;
}

function isPresent(val: unknown): boolean {
    if (val === null || val === undefined) {
        return false;
    }
    if (typeof val === 'string') {
        return val.trim().length > 0;
    }
    return true;
}

function assertValidRowNo(rowNo: unknown, max: number = 3): number {
    if (typeof rowNo !== 'number' || !Number.isInteger(rowNo) || rowNo < 1 || rowNo > max) {
        throw new Error(`Invalid row_no: ${String(rowNo)}. Must be an integer between 1..${max}.`);
    }
    return rowNo;
}

function processReferences(rows: ReferenceSelection[]): ReferenceSelection[] {
    const seen = new Set<string>();
    const result: ReferenceSelection[] = [];

    for (const row of rows) {
        if (!row.reference_type) {
            throw new Error('Reference item missing reference_type.');
        }
        if (seen.has(row.reference_type)) {
            throw new Error(`Duplicate reference_type found: ${row.reference_type}.`);
        }
        seen.add(row.reference_type);

        result.push({
            reference_type: row.reference_type,
            specification: row.specification !== undefined ? row.specification : null,
        });
    }

    return result;
}

function processServiceImpacts(rows: ServiceImpactSelection[]): ServiceImpactSelection[] {
    const seen = new Set<string>();
    const result: ServiceImpactSelection[] = [];

    for (const row of rows) {
        if (!row.impact_code) {
            throw new Error('ServiceImpact missing impact_code.');
        }
        if (seen.has(row.impact_code)) {
            throw new Error(`Duplicate impact_code found: ${row.impact_code}.`);
        }
        seen.add(row.impact_code);

        result.push({
            impact_code: row.impact_code,
            other_description: row.other_description !== undefined ? row.other_description : null,
        });
    }

    return result;
}

function processServiceBlocks(rows: ServiceBlockRow[]): ServiceBlockRow[] {
    const seen = new Set<string>();
    const result: ServiceBlockRow[] = [];

    for (const row of rows) {
        if (!row.service_context) {
            throw new Error('service_block missing service_context.');
        }
        if (seen.has(row.service_context)) {
            throw new Error(`Duplicate service_context found: ${row.service_context}.`);
        }
        seen.add(row.service_context);

        const hasContent =
            isPresent(row.service_id) ||
            isPresent(row.service_status) ||
            isPresent(row.service_description) ||
            isPresent(row.service_location);

        if (!hasContent) {
            continue; // Discard content-empty row carrying only natural key
        }

        result.push({
            service_context: row.service_context,
            service_id: row.service_id ?? null,
            service_status: row.service_status ?? null,
            service_description: row.service_description ?? null,
            service_location: row.service_location ?? null,
        });
    }

    return result;
}

function processSlaItems(rows: SlaItemRow[]): SlaItemRow[] {
    const seen = new Set<number>();
    const result: SlaItemRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        if (isNonEmptyString(row.requirement_text)) {
            result.push({
                row_no: rowNo,
                requirement_text: row.requirement_text!,
            });
        }
    }

    return result;
}

function processVirtualConnections(rows: VirtualConnectionRow[]): VirtualConnectionRow[] {
    const seen = new Set<number>();
    const result: VirtualConnectionRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        if (row.bandwidth_mbps !== null && row.bandwidth_mbps !== undefined && !Number.isNaN(row.bandwidth_mbps)) {
            result.push({
                row_no: rowNo,
                bandwidth_mbps: Number(row.bandwidth_mbps),
            });
        }
    }

    return result;
}

function processPriorityDestinations(rows: PriorityDestinationRow[]): PriorityDestinationRow[] {
    const seen = new Set<number>();
    const result: PriorityDestinationRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        if (isNonEmptyString(row.destination)) {
            result.push({
                row_no: rowNo,
                destination: row.destination!,
            });
        }
    }

    return result;
}

function processFacingChallenges(rows: FacingChallengeRow[]): FacingChallengeRow[] {
    const seen = new Set<number>();
    const result: FacingChallengeRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        if (isNonEmptyString(row.challenge_text)) {
            result.push({
                row_no: rowNo,
                challenge_text: row.challenge_text!,
            });
        }
    }

    return result;
}

function processIdentifiedProblems(rows: IdentifiedProblemRow[]): IdentifiedProblemRow[] {
    const seen = new Set<number>();
    const result: IdentifiedProblemRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        if (isNonEmptyString(row.problem_text)) {
            result.push({
                row_no: rowNo,
                problem_text: row.problem_text!,
            });
        }
    }

    return result;
}

function processImprovementItems(rows: ImprovementItemRow[]): ImprovementItemRow[] {
    const seen = new Set<number>();
    const result: ImprovementItemRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const hasContent = isNonEmptyString(row.plan_text) || isNonEmptyString(row.target_kpi);
        if (!hasContent) {
            continue;
        }

        result.push({
            row_no: rowNo,
            plan_text: row.plan_text ?? null,
            target_kpi: row.target_kpi ?? null,
        });
    }

    return result;
}

function processChangeResults(rows: ChangeResultRow[]): ChangeResultRow[] {
    const seen = new Set<number>();
    const result: ChangeResultRow[] = [];

    for (const row of rows) {
        const rowNo = assertValidRowNo(row.row_no, 5);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const hasContent =
            isNonEmptyString(row.result_summary) ||
            isNonEmptyString(row.performance_information) ||
            isNonEmptyString(row.result_status);

        if (!hasContent) {
            continue;
        }

        result.push({
            row_no: rowNo,
            result_summary: row.result_summary ?? null,
            performance_information: row.performance_information ?? null,
            result_status: row.result_status ?? null,
        });
    }

    return result;
}

function validateSiteBlock(site: DirectSiteBlock | PopSiteBlock | null | undefined, name: string): unknown {
    if (site === undefined) {
        return undefined;
    }
    if (site === null) {
        return null;
    }
    if (typeof site === 'object' && Object.keys(site).length === 0) {
        throw new Error(`Empty object {} is invalid for ${name}; use null to clear the block.`);
    }
    return site;
}

export function buildDraftPayload(input: ActivationDraftInput): ActivationDraftWirePayload;
export function buildDraftPayload(input: ChangeDraftInput): ChangeDraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload {
    if (typeof input.record_version !== 'number') {
        throw new Error('record_version is required and must be a number');
    }

    if (input.family === 'ACTIVATION') {
        const wireActivation: Record<string, unknown> = {};
        const act = input.activation ?? {};

        const scalarKeys: (keyof ActivationDraftFields)[] = [
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
        ];

        for (const key of scalarKeys) {
            if (key in act) {
                wireActivation[key] = act[key];
            }
        }

        if ('references' in act && act.references !== undefined) {
            wireActivation.references = processReferences(act.references);
        }
        if ('service_blocks' in act && act.service_blocks !== undefined) {
            wireActivation.service_blocks = processServiceBlocks(act.service_blocks);
        }
        if ('sla_items' in act && act.sla_items !== undefined) {
            wireActivation.sla_items = processSlaItems(act.sla_items);
        }
        if ('virtual_connections' in act && act.virtual_connections !== undefined) {
            wireActivation.virtual_connections = processVirtualConnections(act.virtual_connections);
        }
        if ('priority_destinations' in act && act.priority_destinations !== undefined) {
            wireActivation.priority_destinations = processPriorityDestinations(act.priority_destinations);
        }

        if ('direct_site' in act) {
            wireActivation.direct_site = validateSiteBlock(act.direct_site, 'direct_site');
        }
        if ('pop_site' in act) {
            wireActivation.pop_site = validateSiteBlock(act.pop_site, 'pop_site');
        }

        return {
            record_version: input.record_version,
            activation: wireActivation,
        };
    }

    if (input.family === 'CHANGE') {
        const wireChange: Record<string, unknown> = {};
        const chg = input.change ?? {};

        const scalarKeys: (keyof ChangeDraftFields)[] = [
            'maintenance_purpose',
            'target_execution_date',
            'monitoring_period_value',
            'monitoring_period_unit',
            'rollback_scenario',
            'announcement_timing',
        ];

        for (const key of scalarKeys) {
            if (key in chg) {
                wireChange[key] = chg[key];
            }
        }

        if ('facing_challenges' in chg && chg.facing_challenges !== undefined) {
            wireChange.facing_challenges = processFacingChallenges(chg.facing_challenges);
        }
        if ('identified_problems' in chg && chg.identified_problems !== undefined) {
            wireChange.identified_problems = processIdentifiedProblems(chg.identified_problems);
        }
        if ('service_impacts' in chg && chg.service_impacts !== undefined) {
            wireChange.service_impacts = processServiceImpacts(chg.service_impacts);
        }
        if ('improvement_items' in chg && chg.improvement_items !== undefined) {
            wireChange.improvement_items = processImprovementItems(chg.improvement_items);
        }
        if ('results' in chg && chg.results !== undefined) {
            wireChange.results = processChangeResults(chg.results);
        }

        return {
            record_version: input.record_version,
            change: wireChange,
        };
    }

    throw new Error(`Unsupported family: ${String((input as { family: unknown }).family)}`);
}
