import type { BusinessStatus } from '../contracts';

export const FIXED_TEST_CLOCK = '2026-09-16T09:00:00+07:00';

export const DEMO_TEAMS: string[] = [];

export interface DemoUserIdentity {
    id: number;
    username: string;
    name: string;
    team: string;
    roles: string[];
    is_active: boolean;
}

export const DEMO_IDENTITIES: DemoUserIdentity[] = [];

export function getDemoIdentity(username: string): DemoUserIdentity {
    throw new Error(`Demo identity not found: ${username}`);
}

export interface NscmfScenarioRecord {
    id: number;
    request_number: string;
    subtype: string;
    business_status: BusinessStatus;
    title: string;
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

export function getScenarios(): NscmfScenarioRecord[] {
    return [];
}

export function getScenarioByRequestNo(requestNumber: string): NscmfScenarioRecord {
    throw new Error(`Scenario not found: ${requestNumber}`);
}
