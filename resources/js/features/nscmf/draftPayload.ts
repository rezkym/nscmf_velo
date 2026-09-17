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

export function buildDraftPayload(input: ActivationDraftInput): ActivationDraftWirePayload;
export function buildDraftPayload(input: ChangeDraftInput): ChangeDraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload;
export function buildDraftPayload(input: DraftPayloadInput): DraftWirePayload {
    throw new Error('Not implemented');
}
