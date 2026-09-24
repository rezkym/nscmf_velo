import type { Queue } from './types';

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
