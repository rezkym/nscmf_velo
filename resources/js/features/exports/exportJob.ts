/** One export request as the server projects it (12 §64–71). */
export interface ExportJob {
    id: number;
    record_id: number;
    format: 'XLSX' | 'PDF';
    status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';
    requested_at: string;
    ready_at: string | null;
    expires_at: string | null;
    failure_code: string | null;
    signed: boolean;
    download_url: string | null;
}

export const EXPORT_STATUS_LABELS: Record<ExportJob['status'], string> = {
    QUEUED: 'Queued',
    PROCESSING: 'Processing',
    READY: 'Ready',
    FAILED: 'Failed',
    EXPIRED: 'Expired',
};

export const isSettled = (job: ExportJob) => ['READY', 'FAILED', 'EXPIRED'].includes(job.status);

/** A safe sentence for a failed job; the stored failure code is never shown as such. */
export function failureMessage(job: ExportJob): string {
    return job.failure_code === 'SIGNING_FAILED'
        ? 'The PDF could not be signed, so no file was issued. The NSCMF stays Approved.'
        : 'The export could not be generated.';
}
