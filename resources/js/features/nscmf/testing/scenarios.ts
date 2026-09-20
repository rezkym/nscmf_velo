import type { BusinessStatus } from '../contracts';

export const FIXED_TEST_CLOCK = '2026-09-16T09:00:00+07:00';

export const DEMO_TEAMS: string[] = ['Demo Team Alpha', 'Demo Team Beta', 'Demo Team Gamma'];

export interface DemoUserIdentity {
    id: number;
    username: string;
    name: string;
    team: string;
    roles: string[];
    is_active: boolean;
}

export const DEMO_IDENTITIES: DemoUserIdentity[] = [
    {
        id: 1,
        username: 'demo.requester.a',
        name: 'Demo Requester A',
        team: 'Demo Team Alpha',
        roles: ['Requester'],
        is_active: true,
    },
    {
        id: 2,
        username: 'demo.requester.b',
        name: 'Demo Requester B',
        team: 'Demo Team Beta',
        roles: ['Requester'],
        is_active: true,
    },
    {
        id: 3,
        username: 'demo.reviewer',
        name: 'Demo Reviewer',
        team: 'Demo Team Gamma',
        roles: ['Reviewer'],
        is_active: true,
    },
    {
        id: 4,
        username: 'demo.approver',
        name: 'Demo Approver',
        team: 'Demo Team Alpha',
        roles: ['Approver'],
        is_active: true,
    },
    {
        id: 5,
        username: 'demo.multi',
        name: 'Demo Multi Role',
        team: 'Demo Team Beta',
        roles: ['Reviewer', 'Approver'],
        is_active: true,
    },
    {
        id: 6,
        username: 'demo.disabled',
        name: 'Demo Disabled User',
        team: 'Demo Team Gamma',
        roles: ['Requester'],
        is_active: false,
    },
];

export function getDemoIdentity(username: string): DemoUserIdentity {
    const identity = DEMO_IDENTITIES.find((u) => u.username === username);
    if (!identity) {
        throw new Error(`Demo identity not found: ${username}`);
    }
    return { ...identity, roles: [...identity.roles] };
}

export interface NscmfScenarioRecord {
    id: number;
    request_number: string;
    family: 'ACTIVATION' | 'CHANGE';
    subtype: string;
    business_status: BusinessStatus;
    title: string;
    team: string;
    is_archived: boolean;
    current_workflow_iteration: number | null;
    requested_by_user_id: number | null;
    first_submitted_at: string | null;
    reviewed_by_user_id: number | null;
    reviewed_at: string | null;
    approved_by_user_id: number | null;
    approved_at: string | null;
    reopened_by_user_id: number | null;
    reopened_at: string | null;
    change_results?: Array<{
        row_no: number;
        result_summary: string | null;
        performance_information: string | null;
        result_status: string | null;
    }>;
    attachments?: Array<{
        id: number;
        file_name: string;
        scan_status?: string;
        [key: string]: unknown;
    }>;
    exports?: Array<{
        id: number;
        status: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}

const RAW_SCENARIOS: NscmfScenarioRecord[] = [
    // 10 Activation records
    {
        id: 1,
        request_number: 'DEMO-ACT-001',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        business_status: 'DRAFT',
        title: 'Draft Incomplete Activation',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: null,
        requested_by_user_id: null,
        first_submitted_at: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 2,
        request_number: 'DEMO-ACT-002',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        business_status: 'PENDING_REVIEW',
        title: 'New Activation Submitted for Review',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-10T10:00:00+07:00',
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 3,
        request_number: 'DEMO-ACT-003',
        family: 'ACTIVATION',
        subtype: 'UPGRADE_DOWNGRADE',
        business_status: 'REVISION_REQUIRED',
        title: 'Upgrade Revision Requested by Reviewer',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-11T11:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-12T09:30:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 4,
        request_number: 'DEMO-ACT-004',
        family: 'ACTIVATION',
        subtype: 'UPGRADE_DOWNGRADE',
        business_status: 'PENDING_APPROVAL',
        title: 'Collaborative Review Forwarded to Approver',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-11T14:00:00+07:00',
        reviewed_by_user_id: 5,
        reviewed_at: '2026-09-13T16:00:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 5,
        request_number: 'DEMO-ACT-005',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        business_status: 'APPROVED',
        title: 'Standard Path Activation Approved',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-08T09:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-08T14:00:00+07:00',
        approved_by_user_id: 4,
        approved_at: '2026-09-09T10:30:00+07:00',
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 6,
        request_number: 'DEMO-ACT-006',
        family: 'ACTIVATION',
        subtype: 'DEACTIVATION',
        business_status: 'REJECTED',
        title: 'Deactivation Rejected by Reviewer',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-12T08:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-12T11:00:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 7,
        request_number: 'DEMO-ACT-007',
        family: 'ACTIVATION',
        subtype: 'DEACTIVATION',
        business_status: 'CANCELLED',
        title: 'Deactivation Cancelled Prior to Submit',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: null,
        requested_by_user_id: null,
        first_submitted_at: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 8,
        request_number: 'DEMO-ACT-008',
        family: 'ACTIVATION',
        subtype: 'UPGRADE_DOWNGRADE',
        business_status: 'APPROVED',
        title: 'Archived Approved Upgrade Request',
        team: 'Demo Team Beta',
        is_archived: true,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-08-01T10:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-08-02T11:00:00+07:00',
        approved_by_user_id: 4,
        approved_at: '2026-08-03T15:00:00+07:00',
        reopened_by_user_id: null,
        reopened_at: null,
    },
    {
        id: 9,
        request_number: 'DEMO-ACT-009',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        business_status: 'REVISION_REQUIRED',
        title: 'Reopened Activation in Iteration 2',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 2,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-01T09:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-14T10:00:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: 1,
        reopened_at: '2026-09-14T08:30:00+07:00',
    },
    {
        id: 10,
        request_number: 'DEMO-ACT-010',
        family: 'ACTIVATION',
        subtype: 'DEACTIVATION',
        business_status: 'PENDING_REVIEW',
        title: 'Reopened Rejected Deactivation Direct to Review',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 2,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-05T10:00:00+07:00',
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: 2,
        reopened_at: '2026-09-15T11:00:00+07:00',
    },

    // 10 Change records
    {
        id: 11,
        request_number: 'DEMO-CHG-001',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        business_status: 'DRAFT',
        title: 'Draft Routine Maintenance Work',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: null,
        requested_by_user_id: null,
        first_submitted_at: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
    {
        id: 12,
        request_number: 'DEMO-CHG-002',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        business_status: 'PENDING_REVIEW',
        title: 'First Submitted Maintenance with Zero Initial Results',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-12T13:00:00+07:00',
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
    {
        id: 13,
        request_number: 'DEMO-CHG-003',
        family: 'CHANGE',
        subtype: 'UPGRADE',
        business_status: 'PENDING_REVIEW',
        title: 'Upgrade Change with Completed Execution Results',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-13T09:30:00+07:00',
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [
            {
                row_no: 1,
                result_summary: 'Firmware upgraded to v4.12 across all core edge switches',
                performance_information: 'Port latency stable at < 1.2ms under peak load',
                result_status: 'SUCCESS',
            },
        ],
    },
    {
        id: 14,
        request_number: 'DEMO-CHG-004',
        family: 'CHANGE',
        subtype: 'EMERGENCY',
        business_status: 'REVISION_REQUIRED',
        title: 'Emergency Core Routing Patch Returned for Clarification',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-14T02:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-14T03:15:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
    {
        id: 15,
        request_number: 'DEMO-CHG-005',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        business_status: 'PENDING_APPROVAL',
        title: 'Maintenance Change Reviewed and Forwarded with Results',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-14T10:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-14T15:00:00+07:00',
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [
            {
                row_no: 1,
                result_summary: 'SFP+ transceivers cleaned and optical level calibrated',
                performance_information: 'Rx optical power improved from -18dBm to -11dBm',
                result_status: 'SUCCESS',
            },
        ],
    },
    {
        id: 16,
        request_number: 'DEMO-CHG-006',
        family: 'CHANGE',
        subtype: 'UPGRADE',
        business_status: 'APPROVED',
        title: 'Upgrade Change Approved with Multi-Role Actor',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-10T11:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-11T09:00:00+07:00',
        approved_by_user_id: 5,
        approved_at: '2026-09-11T16:45:00+07:00',
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [
            {
                row_no: 1,
                result_summary: 'Capacity expansion completed on upstream uplink interface',
                performance_information: 'Bandwidth ceiling doubled to 20Gbps',
                result_status: 'SUCCESS',
            },
        ],
    },
    {
        id: 17,
        request_number: 'DEMO-CHG-007',
        family: 'CHANGE',
        subtype: 'EMERGENCY',
        business_status: 'REJECTED',
        title: 'Emergency Change Rejected at Approval Stage',
        team: 'Demo Team Alpha',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-09-13T01:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-09-13T02:00:00+07:00',
        approved_by_user_id: 4,
        approved_at: '2026-09-13T03:30:00+07:00',
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
    {
        id: 18,
        request_number: 'DEMO-CHG-008',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        business_status: 'CANCELLED',
        title: 'Archived Cancelled Maintenance Draft',
        team: 'Demo Team Beta',
        is_archived: true,
        current_workflow_iteration: null,
        requested_by_user_id: null,
        first_submitted_at: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
    {
        id: 19,
        request_number: 'DEMO-CHG-009',
        family: 'CHANGE',
        subtype: 'EMERGENCY',
        business_status: 'APPROVED',
        title: 'Archived Emergency Work with Full Review and Approval',
        team: 'Demo Team Alpha',
        is_archived: true,
        current_workflow_iteration: 1,
        requested_by_user_id: 1,
        first_submitted_at: '2026-08-20T04:00:00+07:00',
        reviewed_by_user_id: 3,
        reviewed_at: '2026-08-20T05:00:00+07:00',
        approved_by_user_id: 4,
        approved_at: '2026-08-20T06:00:00+07:00',
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [
            {
                row_no: 1,
                result_summary: 'BGP filter reconfigured under DDoS mitigation procedure',
                performance_information: 'Normal traffic restored within 15 minutes',
                result_status: 'SUCCESS',
            },
        ],
    },
    {
        id: 20,
        request_number: 'DEMO-CHG-010',
        family: 'CHANGE',
        subtype: 'UPGRADE',
        business_status: 'PENDING_REVIEW',
        title: 'Approver Returned to Reviewer with Effective Reviewed By Cleared',
        team: 'Demo Team Beta',
        is_archived: false,
        current_workflow_iteration: 1,
        requested_by_user_id: 2,
        first_submitted_at: '2026-09-15T08:00:00+07:00',
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        reopened_by_user_id: null,
        reopened_at: null,
        change_results: [],
    },
];

function cloneRecord<T>(record: T): T {
    return JSON.parse(JSON.stringify(record)) as T;
}

export function getScenarios(): NscmfScenarioRecord[] {
    return cloneRecord(RAW_SCENARIOS);
}

export function getScenarioByRequestNo(requestNumber: string): NscmfScenarioRecord {
    const item = RAW_SCENARIOS.find((s) => s.request_number === requestNumber);
    if (!item) {
        throw new Error(`Scenario not found: ${requestNumber}`);
    }
    return cloneRecord(item);
}
