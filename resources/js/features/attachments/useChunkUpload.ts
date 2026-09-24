import { reactive } from 'vue';

import { sendBytes, sendJson, type JsonResult } from '@/lib/http';

import { chunkPlan } from './attachmentPolicy';

export type UploadPhase =
    | 'preparing'
    | 'uploading'
    | 'interrupted'
    | 'conflict'
    | 'expired'
    | 'scanning'
    | 'done'
    | 'failed'
    | 'cancelled'
    | 'cancel-failed';

export interface UploadState {
    filename: string;
    phase: UploadPhase;
    accepted: number;
    total: number;
    message: string | null;
    uploadId: string | null;
    expiresAt: string | null;
    securityStatus: string | null;
}

/** The server's upload session (12 §52–56); the only authority on progress and missing chunks. */
interface Session {
    upload_id: string;
    status: string;
    chunk_size: number;
    chunk_count: number;
    accepted_chunks: number[];
    missing_chunks: number[];
    expires_at: string;
    attachment?: { id: number; security_status: string };
}

const INTERRUPTED = 'The connection was lost. Choose the same file again to resume.';
const SETTLED = ['CLEAN', 'INFECTED', 'FAILED'];

async function fingerprint(file: File): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * One resumable upload (11A; 12 §52–56): initiate (which resumes a matching session), send only
 * the chunks the server reports missing, complete, then follow the scan until a verdict. Chunks
 * go one at a time; transport completion is never shown as a clean file.
 */
export function useChunkUpload(recordId: number, file: File, options: { pollMs?: number } = {}) {
    const pollMs = options.pollMs ?? 2000;
    const base = `/nscmf/${recordId}/attachment-uploads`;
    const state = reactive<UploadState>({
        filename: file.name,
        phase: 'preparing',
        accepted: 0,
        total: 0,
        message: null,
        uploadId: null,
        expiresAt: null,
        securityStatus: null,
    });
    let stopped = false;
    let chunkSize = 0;

    function adopt(session: Session): void {
        state.uploadId = session.upload_id;
        state.total = session.chunk_count;
        state.accepted = session.accepted_chunks.length;
        state.expiresAt = session.expires_at;
        chunkSize = session.chunk_size;
        if (session.attachment) state.securityStatus = session.attachment.security_status;
    }

    /** Maps a refused request onto a phase; returns false so callers can stop in one line. */
    function refuse(result: Extract<JsonResult, { ok: false }>): false {
        const code = result.error?.code;
        if (result.status === 0) {
            state.phase = 'interrupted';
            state.message = INTERRUPTED;
        } else if (result.status === 410 || code === 'UPLOAD_SESSION_EXPIRED') {
            state.phase = 'expired';
            state.message = 'This upload expired. Choose the file again to start a new upload.';
        } else if (code === 'UPLOAD_CHUNK_CONFLICT') {
            state.phase = 'conflict';
            state.message = 'The server already holds different data for this file. Start a new upload.';
        } else {
            state.phase = 'failed';
            state.message = result.error?.message || 'The upload could not be completed.';
        }
        return false;
    }

    async function sendMissing(missing: number[]): Promise<boolean> {
        state.phase = 'uploading';
        const plan = chunkPlan(file.size, chunkSize);
        for (const index of missing) {
            if (stopped || !state.uploadId) return false;
            const chunk = plan[index - 1];
            if (!chunk) {
                state.phase = 'failed';
                state.message = 'This file does not match the upload. Start a new upload.';
                return false;
            }
            const result = await sendBytes<{ data: Session }>(
                'PUT',
                `${base}/${state.uploadId}/chunks/${index}`,
                file.slice(chunk.start, chunk.end),
            );
            if (!result.ok) return refuse(result);
            if (result.body) adopt(result.body.data);
        }
        return !stopped;
    }

    async function complete(): Promise<boolean> {
        for (let attempt = 0; attempt < 3; attempt++) {
            const result = await sendJson<{ data: Session }>('POST', `${base}/${state.uploadId}/complete`);
            if (result.ok) return true;
            const missing = result.error?.context?.missing_chunks;
            if (result.error?.code !== 'UPLOAD_INCOMPLETE' || !Array.isArray(missing)) return refuse(result);
            if (!(await sendMissing(missing.filter((index): index is number => typeof index === 'number'))))
                return false;
        }
        return refuse({ ok: false, status: 409, error: null });
    }

    async function followScan(): Promise<void> {
        state.phase = 'scanning';
        while (!stopped) {
            const result = await sendJson<{ data: Session }>('GET', `${base}/${state.uploadId}`);
            if (!result.ok) {
                refuse(result);
                return;
            }
            if (result.body) adopt(result.body.data);
            const status = result.body?.data.status;
            if ((state.securityStatus && SETTLED.includes(state.securityStatus)) || status === 'FAILED') {
                state.phase = status === 'FAILED' && !state.securityStatus ? 'failed' : 'done';
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, pollMs));
        }
    }

    async function start(): Promise<void> {
        stopped = false;
        state.phase = 'preparing';
        state.message = null;
        const initiated = await sendJson<{ data: Session }>('POST', base, {
            filename: file.name,
            size_bytes: file.size,
            mime_type: file.type || null,
            fingerprint_sha256: await fingerprint(file),
        });
        if (!initiated.ok) {
            refuse(initiated);
            return;
        }
        if (!initiated.body) return;
        adopt(initiated.body.data);

        if (!(await sendMissing(initiated.body.data.missing_chunks))) return;
        if (!(await complete())) return;
        await followScan();
    }

    async function cancel(): Promise<void> {
        if (!state.uploadId) return;
        stopped = true;
        const result = await sendJson('DELETE', `${base}/${state.uploadId}`);
        if (result.ok) {
            state.phase = 'cancelled';
            state.message = null;
        } else {
            state.phase = 'cancel-failed';
            state.message = result.error?.message || 'The upload could not be cancelled. Try again.';
        }
    }

    return {
        state,
        start,
        cancel,
        stop: () => {
            stopped = true;
        },
    };
}
