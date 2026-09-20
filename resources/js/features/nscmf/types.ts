import type { BusinessStatus } from './contracts';

// Canonical closed sets (06 §15-16, 11 §13, 12 §27-28). Wire values are uppercase.

export type NscmfFamily = 'ACTIVATION' | 'CHANGE';
export type ActivationSubtype = 'ACTIVATION' | 'UPGRADE_DOWNGRADE' | 'DEACTIVATION';
export type ChangeSubtype = 'MAINTENANCE' | 'UPGRADE' | 'EMERGENCY';
export type NscmfSubtype = ActivationSubtype | ChangeSubtype;
export type NumberingMode = 'AUTOMATIC' | 'MANUAL';

export const FAMILY_LABELS: Record<NscmfFamily, string> = {
    ACTIVATION: 'Activation',
    CHANGE: 'Change',
};

export const SUBTYPE_LABELS: Record<NscmfSubtype, string> = {
    ACTIVATION: 'Activation',
    UPGRADE_DOWNGRADE: 'Upgrade / Downgrade',
    DEACTIVATION: 'Deactivation',
    MAINTENANCE: 'Maintenance',
    UPGRADE: 'Upgrade',
    EMERGENCY: 'Emergency',
};

export const SUBTYPES_BY_FAMILY: Record<NscmfFamily, readonly [NscmfSubtype, ...NscmfSubtype[]]> = {
    ACTIVATION: ['ACTIVATION', 'UPGRADE_DOWNGRADE', 'DEACTIVATION'],
    CHANGE: ['MAINTENANCE', 'UPGRADE', 'EMERGENCY'],
};

/** Business status labels (07 §33). Archived is a separate flag, never a status. */
export const STATUS_LABELS: Record<BusinessStatus, string> = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Pending Review',
    REVISION_REQUIRED: 'Revision Required',
    PENDING_APPROVAL: 'Pending Approval',
    REJECTED: 'Rejected',
    APPROVED: 'Approved',
    CANCELLED: 'Cancelled',
};

/** Record summary row (12 §23); only the fields list views need. */
export interface RecordSummary {
    id: number;
    request_no: string;
    family: NscmfFamily;
    subtype: NscmfSubtype;
    team?: { id: number; name: string } | null;
}

// Draft form fields (11 §16-29, 12 §27-28). Every field is optional: omitted means "unchanged",
// null clears a nullable value, and a collection is always replaced as a whole set (12 §7.4.1).

export type ReferenceType = 'IWO' | 'VELOSHIP' | 'TICKET' | 'OTHER';
export type ServiceContext = 'EXISTING' | 'NEW';
export type ServiceStatus = 'ACTIVATED' | 'DEACTIVATED';
export type ServiceImpactCode = 'NOC15' | 'NOC23' | 'NOC361' | 'REGIONAL' | 'POP' | 'CUSTOMER' | 'OTHER';
export type MonitoringUnit = 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK';
export type AnnouncementTiming = 'ONE_WEEK_BEFORE' | 'TWO_WEEKS_BEFORE' | 'TWO_DAYS_BEFORE_EMERGENCY';

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
    IWO: 'IWO',
    VELOSHIP: 'VELOShip',
    TICKET: 'Ticket',
    OTHER: 'Other',
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
    ACTIVATED: 'Activated',
    DEACTIVATED: 'Deactivated',
};

export const SERVICE_IMPACT_LABELS: Record<ServiceImpactCode, string> = {
    NOC15: 'NOC15',
    NOC23: 'NOC23',
    NOC361: 'NOC361',
    REGIONAL: 'Regional',
    POP: 'POP',
    CUSTOMER: 'Customer',
    OTHER: 'Other',
};

export const MONITORING_UNIT_LABELS: Record<MonitoringUnit, string> = {
    MINUTE: 'Minutes',
    HOUR: 'Hours',
    DAY: 'Days',
    WEEK: 'Weeks',
};

export const ANNOUNCEMENT_TIMING_LABELS: Record<AnnouncementTiming, string> = {
    ONE_WEEK_BEFORE: '1 week before',
    TWO_WEEKS_BEFORE: '2 weeks before',
    TWO_DAYS_BEFORE_EMERGENCY: '2 days before (emergency)',
};

export interface ReferenceSelection {
    reference_type: ReferenceType;
    specification?: string | null;
}

export interface ServiceBlockRow {
    service_context: ServiceContext;
    service_id?: string | null;
    service_status?: ServiceStatus | null;
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
    migrate_domain?: boolean;
    migrate_hosting?: boolean;
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
    impact_code: ServiceImpactCode;
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
    /** Free text (06 §48), not an enum. */
    result_status?: string | null;
}

export interface ChangeDraftFields {
    maintenance_purpose?: string | null;
    target_execution_date?: string | null;
    monitoring_period_value?: number | null;
    monitoring_period_unit?: MonitoringUnit | null;
    rollback_scenario?: string | null;
    announcement_timing?: AnnouncementTiming | null;
    facing_challenges?: FacingChallengeRow[];
    identified_problems?: IdentifiedProblemRow[];
    service_impacts?: ServiceImpactSelection[];
    improvement_items?: ImprovementItemRow[];
    results?: ChangeResultRow[];
}
