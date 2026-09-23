import { reactive } from 'vue';

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

export function useChunkUpload(_recordId: number, file: File, _options: { pollMs?: number } = {}) {
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

    return { state, start: async () => {}, cancel: async () => {}, stop: () => {} };
}
