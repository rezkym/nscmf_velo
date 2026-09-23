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
                event({ id: 1, event_type: 'CREATED', iteration_no: null, from_status: null, to_status: 'DRAFT' }),
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

    it('AC3: shows times in Jakarta time and field values as escaped text, keeping 0, false and empty apart', async () => {
        respond(
            200,
            page([
                event({
                    event_type: 'DRAFT_SAVED',
                    changes: [
                        { field: 'customer_name', before: '<b>Old</b>', after: 'New' },
                        { field: 'bandwidth_mixed_mbps', before: null, after: '0' },
                        { field: 'migrate_domain', before: 'true', after: 'false' },
                    ],
                }),
            ]),
        );
        const wrapper = mount(BusinessTimeline, { props: { recordId: 9 } });
        await flushPromises();

        expect(wrapper.text()).toContain('2026-09-05 08:00 WIB');
        expect(wrapper.find('b').exists()).toBe(false);
        expect(wrapper.text()).toContain('<b>Old</b>');
        const changes = wrapper.get('[data-testid="timeline-changes"]').text();
        expect(changes).toContain('Before: (empty)');
        expect(changes).toContain('After: 0');
        expect(changes).toContain('After: false');
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
