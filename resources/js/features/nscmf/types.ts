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

export const SUBTYPES_BY_FAMILY: Record<NscmfFamily, readonly NscmfSubtype[]> = {
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
