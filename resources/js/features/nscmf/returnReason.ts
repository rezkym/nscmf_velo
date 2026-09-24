import { sendJson } from '@/lib/http';

interface TimelinePage {
    data: { from_status: string | null; to_status: string | null; reason: string | null }[];
    meta: { current_page: number; last_page: number };
}

/**
 * The reason of the latest return to Revision Required (07 §12 screen 9; FE-28), read from the
 * newest-first Business Timeline (12 §33). Later saves may push it past the first page, so pages
 * are read until it is found. Any failure simply yields no reason.
 */
export async function latestReturnReason(recordId: number, signal?: AbortSignal): Promise<string | null> {
    for (let page = 1; ; page++) {
        const result = await sendJson<TimelinePage>(
            'GET',
            `/nscmf/${recordId}/timeline?page=${page}&per_page=25`,
            undefined,
            { signal },
        );
        if (!result.ok || !result.body) return null;

        // A transition into revision; saves made while in revision stay REVISION_REQUIRED → REVISION_REQUIRED.
        const entry = result.body.data.find(
            (event) => event.to_status === 'REVISION_REQUIRED' && event.from_status !== 'REVISION_REQUIRED',
        );
        if (entry) return entry.reason;
        if (result.body.meta.current_page >= result.body.meta.last_page) return null;
    }
}
