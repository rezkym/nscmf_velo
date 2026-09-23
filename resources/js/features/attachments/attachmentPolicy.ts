/** The server's attachment policy (12 §52; 06 §50), passed to the editor as a prop. */
export interface AttachmentPolicy {
    max_files: number;
    max_bytes: number;
    chunk_bytes: number;
    extensions: string[];
}

export function fileProblem(
    _file: { name: string; size: number },
    _policy: AttachmentPolicy,
    _active: number,
): string | null {
    return null;
}

export function chunkPlan(_size: number, _chunkBytes: number): { index: number; start: number; end: number }[] {
    return [];
}
