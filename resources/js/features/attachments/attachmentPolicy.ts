/** The server's attachment policy (12 §52; 06 §50), passed to the editor as a prop. */
export interface AttachmentPolicy {
    max_files: number;
    max_bytes: number;
    chunk_bytes: number;
    extensions: string[];
}

/**
 * The known limits checked before any request (06 §50). The server re-checks all of them; this
 * only spares the user a pointless upload. The file picker's accept list is a hint, not a check.
 */
export function fileProblem(
    file: { name: string; size: number },
    policy: AttachmentPolicy,
    active: number,
): string | null {
    const dot = file.name.lastIndexOf('.');
    const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';

    if (active >= policy.max_files) return `A record may have at most ${policy.max_files} attachments.`;
    if (file.name.length > 255) return 'The file name may be at most 255 characters.';
    if (!policy.extensions.includes(extension)) return 'This file type is not allowed.';
    if (file.size === 0) return 'An empty file cannot be attached.';
    if (file.size > policy.max_bytes) return `A file may be at most ${policy.max_bytes.toLocaleString('en-US')} bytes.`;
    return null;
}

/** 1-based chunks of exactly chunkBytes, the remainder last, never an empty chunk (11A). */
export function chunkPlan(size: number, chunkBytes: number): { index: number; start: number; end: number }[] {
    const count = Math.ceil(size / chunkBytes);
    return Array.from({ length: count }, (_, offset) => ({
        index: offset + 1,
        start: offset * chunkBytes,
        end: Math.min(size, (offset + 1) * chunkBytes),
    }));
}
