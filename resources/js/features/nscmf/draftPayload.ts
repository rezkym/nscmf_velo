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

function own<T = unknown>(obj: object, key: string): T | undefined {
    return Object.hasOwn(obj, key) ? ((obj as Record<string, unknown>)[key] as T) : undefined;
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
        if (!isPlainObject(row)) {
            throw new Error('Reference row must be a plain object.');
        }
        const referenceType = own<string>(row, 'reference_type');
        if (typeof referenceType !== 'string' || referenceType.trim().length === 0) {
            throw new Error('Reference item missing reference_type.');
        }
        const trimmedType = referenceType.trim();
        if (seen.has(trimmedType)) {
            throw new Error(`Duplicate reference_type found: ${trimmedType}.`);
        }
        seen.add(trimmedType);

        const specification = own<string | null>(row, 'specification');
        result.push({
            reference_type: trimmedType as ReferenceSelection['reference_type'],
            specification: specification !== undefined ? specification : null,
        });
    }

    return result;
}

function processServiceImpacts(rows: ServiceImpactSelection[]): ServiceImpactSelection[] {
    const seen = new Set<string>();
    const result: ServiceImpactSelection[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('ServiceImpact row must be a plain object.');
        }
        const impactCode = own<string>(row, 'impact_code');
        if (typeof impactCode !== 'string' || impactCode.trim().length === 0) {
            throw new Error('ServiceImpact missing impact_code.');
        }
        const trimmedCode = impactCode.trim();
        if (seen.has(trimmedCode)) {
            throw new Error(`Duplicate impact_code found: ${trimmedCode}.`);
        }
        seen.add(trimmedCode);

        const otherDescription = own<string | null>(row, 'other_description');
        result.push({
            impact_code: trimmedCode as ServiceImpactSelection['impact_code'],
            other_description: otherDescription !== undefined ? otherDescription : null,
        });
    }

    return result;
}

function processServiceBlocks(rows: ServiceBlockRow[]): ServiceBlockRow[] {
    const seen = new Set<string>();
    const result: ServiceBlockRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('ServiceBlock row must be a plain object.');
        }
        const serviceContext = own<string>(row, 'service_context');
        if (typeof serviceContext !== 'string' || serviceContext.trim().length === 0) {
            throw new Error('service_block missing service_context.');
        }
        const trimmedContext = serviceContext.trim();
        if (seen.has(trimmedContext)) {
            throw new Error(`Duplicate service_context found: ${trimmedContext}.`);
        }
        seen.add(trimmedContext);

        const serviceId = own<string | null>(row, 'service_id');
        const serviceStatus = own<ServiceBlockRow['service_status']>(row, 'service_status');
        const serviceDescription = own<string | null>(row, 'service_description');
        const serviceLocation = own<string | null>(row, 'service_location');

        const hasContent =
            isPresent(serviceId) ||
            isPresent(serviceStatus) ||
            isPresent(serviceDescription) ||
            isPresent(serviceLocation);

        if (!hasContent) {
            continue; // Discard content-empty row carrying only natural key
        }

        result.push({
            service_context: trimmedContext as ServiceBlockRow['service_context'],
            service_id: serviceId ?? null,
            service_status: serviceStatus ?? null,
            service_description: serviceDescription ?? null,
            service_location: serviceLocation ?? null,
        });
    }

    return result;
}

function assertArrayCollection<T>(rows: unknown, name: string): T[] {
    if (!Array.isArray(rows)) {
        throw new Error(`${name} must be an array.`);
    }
    return rows as T[];
}

function processSlaItems(rows: SlaItemRow[]): SlaItemRow[] {
    const seen = new Set<number>();
    const result: SlaItemRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('SlaItem row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const requirementText = own<string | null>(row, 'requirement_text');
        if (isNonEmptyString(requirementText)) {
            result.push({
                row_no: rowNo,
                requirement_text: requirementText,
            });
        }
    }

    return result;
}

function processVirtualConnections(rows: VirtualConnectionRow[]): VirtualConnectionRow[] {
    const seen = new Set<number>();
    const result: VirtualConnectionRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('VirtualConnection row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const bandwidthMbps = own<number | null>(row, 'bandwidth_mbps');
        if (bandwidthMbps !== null && bandwidthMbps !== undefined && !Number.isNaN(bandwidthMbps)) {
            result.push({
                row_no: rowNo,
                bandwidth_mbps: Number(bandwidthMbps),
            });
        }
    }

    return result;
}

function processPriorityDestinations(rows: PriorityDestinationRow[]): PriorityDestinationRow[] {
    const seen = new Set<number>();
    const result: PriorityDestinationRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('PriorityDestination row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const destination = own<string | null>(row, 'destination');
        if (isNonEmptyString(destination)) {
            result.push({
                row_no: rowNo,
                destination: destination,
            });
        }
    }

    return result;
}

function processFacingChallenges(rows: FacingChallengeRow[]): FacingChallengeRow[] {
    const seen = new Set<number>();
    const result: FacingChallengeRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('FacingChallenge row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const challengeText = own<string | null>(row, 'challenge_text');
        if (isNonEmptyString(challengeText)) {
            result.push({
                row_no: rowNo,
                challenge_text: challengeText,
            });
        }
    }

    return result;
}

function processIdentifiedProblems(rows: IdentifiedProblemRow[]): IdentifiedProblemRow[] {
    const seen = new Set<number>();
    const result: IdentifiedProblemRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('IdentifiedProblem row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const problemText = own<string | null>(row, 'problem_text');
        if (isNonEmptyString(problemText)) {
            result.push({
                row_no: rowNo,
                problem_text: problemText,
            });
        }
    }

    return result;
}

function processImprovementItems(rows: ImprovementItemRow[]): ImprovementItemRow[] {
    const seen = new Set<number>();
    const result: ImprovementItemRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('ImprovementItem row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 3);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const planText = own<string | null>(row, 'plan_text');
        const targetKpi = own<string | null>(row, 'target_kpi');

        const hasContent = isNonEmptyString(planText) || isNonEmptyString(targetKpi);
        if (!hasContent) {
            continue;
        }

        result.push({
            row_no: rowNo,
            plan_text: planText ?? null,
            target_kpi: targetKpi ?? null,
        });
    }

    return result;
}

function processChangeResults(rows: ChangeResultRow[]): ChangeResultRow[] {
    const seen = new Set<number>();
    const result: ChangeResultRow[] = [];

    for (const row of rows) {
        if (!isPlainObject(row)) {
            throw new Error('ChangeResult row must be a plain object.');
        }
        const rowNo = assertValidRowNo(own(row, 'row_no'), 5);
        if (seen.has(rowNo)) {
            throw new Error(`Duplicate row_no found: ${rowNo}.`);
        }
        seen.add(rowNo);

        const resultSummary = own<string | null>(row, 'result_summary');
        const performanceInformation = own<string | null>(row, 'performance_information');
        const resultStatus = own<string | null>(row, 'result_status');

        const hasContent =
            isNonEmptyString(resultSummary) ||
            isNonEmptyString(performanceInformation) ||
            isNonEmptyString(resultStatus);

        if (!hasContent) {
            continue;
        }

        result.push({
            row_no: rowNo,
            result_summary: resultSummary ?? null,
            performance_information: performanceInformation ?? null,
            result_status: resultStatus ?? null,
        });
    }

    return result;
}

const DIRECT_SITE_KEYS: readonly (keyof DirectSiteBlock)[] = [
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
] as const;

const POP_SITE_KEYS: readonly (keyof PopSiteBlock)[] = [
    'switch_distribution',
    'port',
    'vlan_id',
    'local_loops',
    'routers',
    'cpe_indoor',
    'cpe_outdoor',
] as const;

function isPlainObject(val: unknown): val is Record<string, unknown> {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
        return false;
    }
    const proto = Object.getPrototypeOf(val);
    return proto === null || proto === Object.prototype;
}

function processSiteBlock<T extends DirectSiteBlock | PopSiteBlock>(
    site: unknown,
    allowedKeys: readonly (keyof T)[],
    name: string,
): T | null | undefined {
    if (site === undefined) {
        return undefined;
    }
    if (site === null) {
        return null;
    }
    if (!isPlainObject(site)) {
        throw new Error(`${name} must be a plain object or null.`);
    }

    const built: Record<string, unknown> = {};
    let hasContent = false;

    for (const key of allowedKeys) {
        const strKey = key as string;
        if (Object.hasOwn(site, strKey)) {
            const val = site[strKey];
            if (isPresent(val)) {
                hasContent = true;
                built[strKey] = val;
            } else if (val === null || (typeof val === 'string' && val.trim().length === 0)) {
                built[strKey] = null;
            }
        }
    }

    if (!hasContent) {
        throw new Error(`Empty object {} is invalid for ${name}; use null to clear the block.`);
    }

    return built as T;
}

function assertValidRecordVersion(recordVersion: unknown): number {
    if (typeof recordVersion !== 'number' || !Number.isSafeInteger(recordVersion) || recordVersion < 1) {
        throw new Error('record_version is required and must be a safe positive integer (>= 1)');
    }
    return recordVersion;
}

export function buildDraftPayload(input: ActivationDraftInput): ActivationDraftWirePayload;
export function buildDraftPayload(input: ChangeDraftInput): ChangeDraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload {
    const recordVersion = assertValidRecordVersion(input.record_version);

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
            if (Object.hasOwn(act, key)) {
                wireActivation[key] = act[key];
            }
        }

        if (Object.hasOwn(act, 'references') && act.references !== undefined) {
            wireActivation.references = processReferences(
                assertArrayCollection<ReferenceSelection>(act.references, 'references'),
            );
        }
        if (Object.hasOwn(act, 'service_blocks') && act.service_blocks !== undefined) {
            wireActivation.service_blocks = processServiceBlocks(
                assertArrayCollection<ServiceBlockRow>(act.service_blocks, 'service_blocks'),
            );
        }
        if (Object.hasOwn(act, 'sla_items') && act.sla_items !== undefined) {
            wireActivation.sla_items = processSlaItems(assertArrayCollection<SlaItemRow>(act.sla_items, 'sla_items'));
        }
        if (Object.hasOwn(act, 'virtual_connections') && act.virtual_connections !== undefined) {
            wireActivation.virtual_connections = processVirtualConnections(
                assertArrayCollection<VirtualConnectionRow>(act.virtual_connections, 'virtual_connections'),
            );
        }
        if (Object.hasOwn(act, 'priority_destinations') && act.priority_destinations !== undefined) {
            wireActivation.priority_destinations = processPriorityDestinations(
                assertArrayCollection<PriorityDestinationRow>(act.priority_destinations, 'priority_destinations'),
            );
        }

        if (Object.hasOwn(act, 'direct_site')) {
            wireActivation.direct_site = processSiteBlock<DirectSiteBlock>(
                act.direct_site,
                DIRECT_SITE_KEYS,
                'direct_site',
            );
        }
        if (Object.hasOwn(act, 'pop_site')) {
            wireActivation.pop_site = processSiteBlock<PopSiteBlock>(act.pop_site, POP_SITE_KEYS, 'pop_site');
        }

        return {
            record_version: recordVersion,
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
            if (Object.hasOwn(chg, key)) {
                wireChange[key] = chg[key];
            }
        }

        if (Object.hasOwn(chg, 'facing_challenges') && chg.facing_challenges !== undefined) {
            wireChange.facing_challenges = processFacingChallenges(
                assertArrayCollection<FacingChallengeRow>(chg.facing_challenges, 'facing_challenges'),
            );
        }
        if (Object.hasOwn(chg, 'identified_problems') && chg.identified_problems !== undefined) {
            wireChange.identified_problems = processIdentifiedProblems(
                assertArrayCollection<IdentifiedProblemRow>(chg.identified_problems, 'identified_problems'),
            );
        }
        if (Object.hasOwn(chg, 'service_impacts') && chg.service_impacts !== undefined) {
            wireChange.service_impacts = processServiceImpacts(
                assertArrayCollection<ServiceImpactSelection>(chg.service_impacts, 'service_impacts'),
            );
        }
        if (Object.hasOwn(chg, 'improvement_items') && chg.improvement_items !== undefined) {
            wireChange.improvement_items = processImprovementItems(
                assertArrayCollection<ImprovementItemRow>(chg.improvement_items, 'improvement_items'),
            );
        }
        if (Object.hasOwn(chg, 'results') && chg.results !== undefined) {
            wireChange.results = processChangeResults(assertArrayCollection<ChangeResultRow>(chg.results, 'results'));
        }

        return {
            record_version: recordVersion,
            change: wireChange,
        };
    }

    throw new Error(`Unsupported family: ${String((input as { family: unknown }).family)}`);
}
