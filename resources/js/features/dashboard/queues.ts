import type { RecordSummary } from '@/features/nscmf/types';

import type { DashboardItems, Queue } from './types';

export interface QueueDefinition {
    key: Queue;
    title: string;
    caption: string;
    /** The full list page, where one exists. */
    listHref?: string;
    /** The permission that makes this shared pool visible; own queues need none (07 §17). */
    permission?: string;
}

/** The attention cards in their fixed order (07 §17.1). */
export const QUEUES: readonly QueueDefinition[] = [
    { key: 'drafts', title: 'My drafts', caption: 'Not submitted yet' },
    { key: 'revisions', title: 'Revision required', caption: 'Returned to you for changes' },
    {
        key: 'reviews',
        title: 'Pending review',
        caption: 'Waiting for a reviewer',
        listHref: '/review',
        permission: 'nscmf.review',
    },
    {
        key: 'approvals',
        title: 'Pending approval',
        caption: 'Waiting for an approver',
        listHref: '/approval',
        permission: 'nscmf.approve',
    },
];

export const QUEUE_TITLES = Object.fromEntries(QUEUES.map((queue) => [queue.key, queue.title])) as Record<
    Queue,
    string
>;

/** Own queues open in the editor when the actor may edit; shared queues open where they are decided. */
export function recordHref(queue: Queue, id: number, canEditOwn: boolean): string {
    switch (queue) {
        case 'reviews':
            return `/review/${id}`;
        case 'approvals':
            return `/approval/${id}`;
        default:
            return canEditOwn ? `/nscmf/${id}/edit` : `/nscmf/${id}`;
    }
}

export interface AttentionEntry {
    queue: Queue;
    record: RecordSummary;
}

/** Returned work first, then what others wait on, then the actor's own drafts (07 §17.1). */
const ATTENTION_ORDER: readonly Queue[] = ['revisions', 'reviews', 'approvals', 'drafts'];
const ATTENTION_LIMIT = 6;

/** The records already sent for the cards, merged into one short list without repeats. */
export function needsAttention(items: DashboardItems): AttentionEntry[] {
    const entries: AttentionEntry[] = [];
    const listed = new Set<number>();

    for (const queue of ATTENTION_ORDER) {
        for (const record of items[queue] ?? []) {
            if (entries.length === ATTENTION_LIMIT) return entries;
            if (listed.has(record.id)) continue;
            listed.add(record.id);
            entries.push({ queue, record });
        }
    }

    return entries;
}
