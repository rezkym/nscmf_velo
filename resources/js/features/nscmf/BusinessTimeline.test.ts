import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import BusinessTimeline from './BusinessTimeline.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

function event(overrides: Record<string, unknown>) {
    return {
        id: 1,
        event_type: 'SUBMITTED',
        actor: 'Demo Requester A',
        iteration_no: 1,
        from_status: 'DRAFT',
        to_status: 'PENDING_REVIEW',
        reason: null,
        comment: null,
        version_before: 1,
        version_after: 2,
        occurred_at: '2026-09-05T01:00:00+00:00',
        attachment_filename: null,
        changes: [],
        ...overrides,
    };
}

const fetchMock = vi.fn();

function respond(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function page(data: unknown[]) {
    return { data, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length } };
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.timeline.view'] } });
});
afterEach(() => vi.unstubAllGlobals());

describe('Business timeline (FE-38)', () => {
    it('AC1: groups events by workflow iteration, newest first, with a pre-submission group', async () => {
        respond(
            200,
            page([
                event({ id: 4, event_type: 'REOPENED', iteration_no: 2, actor: 'Protected Superadmin' }),
                event({ id: 3, event_type: 'APPROVED', iteration_no: 1, actor: 'Demo Approver' }),
                event({ id: 2, event_type: 'SUBMITTED', iteration_no: 1 }),
                event({
                    id: 1,
                    event_type: 'RECORD_CREATED',
                    iteration_no: null,
                    from_status: null,
                    to_status: 'DRAFT',
                }),
            ]),
        );
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        const groups = wrapper.findAll('[data-testid="timeline-group"]');
        expect(groups.map((group) => group.get('h3').text())).toEqual([
            'Iteration 2',
            'Iteration 1',
            'Before first submission',
        ]);
        expect(groups[1]?.findAll('li').map((item) => item.get('p').text())).toEqual(['Approved', 'Submitted']);
    });

    it('AC2: names the actor recorded on each event, never inferring one', async () => {
        respond(200, page([event({ event_type: 'REVIEW_FORWARDED', actor: 'Demo Multi Role' })]));
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(wrapper.text()).toContain('Review forwarded');
        expect(wrapper.text()).toContain('Demo Multi Role');
        expect(wrapper.text()).not.toContain('Reviewed by');
    });

    it('AC3: shows times in Jakarta time and each change open in a Field / Before / After table', async () => {
        respond(
            200,
            page([
                event({
                    event_type: 'DRAFT_UPDATED',
                    from_status: 'DRAFT',
                    to_status: 'DRAFT',
                    changes: [
                        { field: 'activation.customer_name', before: '<b>Old</b>', after: 'New' },
                        { field: 'activation.bandwidth_mixed_mbps', before: null, after: '0' },
                        { field: 'activation.migrate_domain', before: 'true', after: 'false' },
                    ],
                }),
            ]),
        );
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(wrapper.text()).toContain('2026-09-05 08:00 WIB');
        expect(wrapper.find('details').exists()).toBe(false);
        const table = wrapper.get('[data-testid="timeline-changes"]');
        expect(table.findAll('th').map((cell) => cell.text())).toEqual(['Field', 'Before', 'After']);

        const rows = table.findAll('[data-testid="diff-row"]');
        expect(rows.map((row) => row.get('[data-diff="field"]').text())).toEqual([
            'Customer name',
            'International & IIX mixed (Mbps)',
            'Migrate domain',
        ]);
        expect(rows[0]!.get('[data-diff="removed"]').text()).toContain('<b>Old</b>');
        expect(wrapper.find('b').exists()).toBe(false);
        expect(rows[1]!.get('[data-diff="removed"]').text()).toContain('—');
        expect(rows[1]!.get('[data-diff="added"]').text()).toContain('0');
        expect(rows[2]!.get('[data-diff="removed"]').text()).toContain('Yes');
        expect(rows[2]!.get('[data-diff="added"]').text()).toContain('No');
    });

    it('AC3: marks every side with − or + and words it for screen readers, never by colour alone', async () => {
        respond(
            200,
            page([
                event({
                    event_type: 'DRAFT_UPDATED',
                    changes: [{ field: 'change.rollback_scenario', before: 'Old', after: 'New' }],
                }),
            ]),
        );
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        const removed = wrapper.get('[data-diff="removed"]');
        const added = wrapper.get('[data-diff="added"]');
        expect(removed.text()).toMatch(/^−/);
        expect(added.text()).toMatch(/^\+/);
        expect(removed.get('.sr-only').text()).toBe('Removed:');
        expect(added.get('.sr-only').text()).toBe('Added:');
    });

    it('names the event and its statuses in words, and the file of an attachment event', async () => {
        respond(
            200,
            page([
                event({
                    id: 3,
                    event_type: 'ATTACHMENT_REMOVED',
                    attachment_filename: 'plan.pdf',
                    from_status: null,
                    to_status: null,
                }),
                event({
                    id: 2,
                    event_type: 'ATTACHMENT_ADDED',
                    attachment_filename: 'plan.pdf',
                    from_status: null,
                    to_status: null,
                }),
                event({
                    id: 1,
                    event_type: 'APPROVAL_RETURNED_REVIEWER',
                    from_status: 'PENDING_APPROVAL',
                    to_status: 'PENDING_REVIEW',
                }),
            ]),
        );
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        const items = wrapper.findAll('li');
        expect(items.map((item) => item.get('p').text())).toEqual([
            'Attachment removed',
            'Attachment added',
            'Returned to Reviewer',
        ]);
        expect(items[0]!.get('[data-diff="removed"]').text()).toContain('plan.pdf');
        expect(items[0]!.find('[data-diff="added"]').text()).not.toContain('plan.pdf');
        expect(items[1]!.get('[data-diff="added"]').text()).toContain('plan.pdf');
        expect(items[2]!.text()).toContain('Pending Approval → Pending Review');
    });

    it('AC4: reads only the business timeline endpoint', async () => {
        respond(200, page([]));
        mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/nscmf/9/timeline?page=1&per_page=25');
    });

    it('AC5: without the timeline permission it never fetches', async () => {
        resetInertia({ auth: { permissions: ['nscmf.view'] } });
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('You do not have permission to view this timeline.');
    });

    it('AC5: a 403 shows a generic denial and no events', async () => {
        respond(403, { code: 'FORBIDDEN', message: 'Forbidden.' });
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(wrapper.text()).toContain('You do not have access to this timeline.');
        expect(wrapper.findAll('li')).toHaveLength(0);
    });
});
