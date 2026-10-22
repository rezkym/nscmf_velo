import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import type { NscmfFamily, NscmfSubtype } from '@/features/nscmf/types';

/** One Activity Log entry as the server projects it (12 §47.2). */
export interface LogItem extends Record<string, unknown> {
    id: number;
    request_no: string;
    request_date: string | null;
    family: NscmfFamily;
    subtype: NscmfSubtype;
    customer_name: string | null;
    noc_infrastructure: string[];
    business_status: BusinessStatus;
    is_archived: boolean;
}

export type ArchiveView = 'all' | 'active' | 'archived';

/** The server's echo of the accepted Activity Log query. */
export interface LogQuery {
    page: number;
    per_page: number;
    q: string | null;
    family: NscmfFamily | null;
    subtype: NscmfSubtype | null;
    statuses: BusinessStatus[];
    archived: ArchiveView;
    request_date_from: string | null;
    request_date_to: string | null;
}

export interface LogSummary {
    total: number;
    period_from: string | null;
    period_until: string | null;
    site_defaults: { noc15: boolean; noc23: boolean };
}

export interface ActivityLogPageProps {
    items: LogItem[];
    meta: PaginationMeta;
    query: LogQuery;
    summary: LogSummary;
    pdf_available: boolean;
    max_entries: number;
}

export type LogFilters = Omit<LogQuery, 'page' | 'per_page'>;

export type LogExportStage =
    'QUEUED' | 'PREPARING' | 'FILLING' | 'RENDERING' | 'SAVING' | 'READY' | 'FAILED' | 'EXPIRED';

/** One report export as the server projects it. */
export interface LogExportJob {
    id: number;
    format: 'XLSX' | 'PDF';
    status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';
    progress_percent: number;
    stage: LogExportStage;
    entry_count: number;
    requested_at: string;
    ready_at: string | null;
    expires_at: string | null;
    failure_code: string | null;
    download_url: string | null;
}

/** Every status a record can hold after its first submission: the page default. */
export const SUBMITTED_STATUSES: BusinessStatus[] = [
    'PENDING_REVIEW',
    'REVISION_REQUIRED',
    'PENDING_APPROVAL',
    'REJECTED',
    'APPROVED',
];

export const ARCHIVE_VIEW_LABELS: Record<ArchiveView, string> = {
    all: 'Active and archived',
    active: 'Active only',
    archived: 'Archived only',
};

export const STAGE_LABELS: Record<LogExportStage, string> = {
    QUEUED: 'Queued',
    PREPARING: 'Preparing',
    FILLING: 'Filling the workbook',
    RENDERING: 'Rendering the PDF',
    SAVING: 'Saving',
    READY: 'Ready',
    FAILED: 'Failed',
    EXPIRED: 'Expired',
};

export const SERVICE_IMPACT_DISPLAY: Record<string, string> = {
    NOC15: 'NOC15',
    NOC23: 'NOC23',
    NOC361: 'NOC361',
    REGIONAL: 'Regional',
    POP: 'POP',
    CUSTOMER: 'Customer',
    OTHER: 'Other',
};

export const isLogExportSettled = (job: LogExportJob): boolean =>
    job.status === 'READY' || job.status === 'FAILED' || job.status === 'EXPIRED';

/** "1 entry", "27 entries". */
export const entryCount = (count: number): string => `${count} ${count === 1 ? 'entry' : 'entries'}`;
