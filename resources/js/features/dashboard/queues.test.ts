import { describe, expect, it } from 'vitest';

import type { RecordSummary } from '@/features/nscmf/types';

import { needsAttention, recordHref } from './queues';

const record = (id: number): RecordSummary => ({
    id,
    request_no: `NSCMF-${id}`,
    family: 'CHANGE',
    subtype: 'MAINTENANCE',
});

describe('recordHref', () => {
    it('opens each record where its next step happens', () => {
        expect(recordHref('drafts', 7, true)).toBe('/nscmf/7/edit');
        expect(recordHref('revisions', 8, true)).toBe('/nscmf/8/edit');
        expect(recordHref('reviews', 9, true)).toBe('/review/9');
        expect(recordHref('approvals', 10, true)).toBe('/approval/10');
    });

    it('falls back to the detail for an own record the actor may not edit', () => {
        expect(recordHref('drafts', 7, false)).toBe('/nscmf/7');
        expect(recordHref('revisions', 8, false)).toBe('/nscmf/8');
    });
});

describe('needsAttention', () => {
    it('lists returned records first, then reviews, approvals and drafts', () => {
        const list = needsAttention({
            drafts: [record(1)],
            revisions: [record(2)],
            reviews: [record(3)],
            approvals: [record(4)],
        });

        expect(list.map((entry) => [entry.queue, entry.record.id])).toEqual([
            ['revisions', 2],
            ['reviews', 3],
            ['approvals', 4],
            ['drafts', 1],
        ]);
    });

    it('stops at six records and lists a record only once', () => {
        const list = needsAttention({
            revisions: [record(1), record(2), record(3)],
            reviews: [record(3), record(4), record(5)],
            drafts: [record(6), record(7)],
        });

        expect(list.map((entry) => entry.record.id)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('is empty when the server sent no records', () => {
        expect(needsAttention({})).toEqual([]);
    });
});
