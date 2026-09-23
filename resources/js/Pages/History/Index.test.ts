import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lastRequest, requests, resetInertia } from '@/testing/inertia';

import Index, { type HistoryItem, type HistoryQuery } from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const QUERY: HistoryQuery = {
    page: 2,
    per_page: 25,
    sort: 'created_at',
    direction: 'asc',
    q: null,
    family: null,
    subtype: null,
    business_status: null,
    archived: false,
    request_date_from: null,
    request_date_to: null,
    owner_user_id: null,
    team_id: null,
};

const ITEMS: HistoryItem[] = [
    {
        id: 5,
        request_no: 'DEMO-ACT-005',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        request_date: '2026-09-05',
        requester: { id: 1, name: 'Demo Requester A' },
        team: { id: 1, name: 'Demo Team Alpha' },
        business_status: 'APPROVED',
        is_archived: false,
    },
    {
        id: 8,
        request_no: 'DEMO-ACT-008',
        family: 'ACTIVATION',
        subtype: 'UPGRADE_DOWNGRADE',
        request_date: '2026-09-08',
        requester: null,
        team: null,
        business_status: 'APPROVED',
        is_archived: true,
    },
];

function mountHistory(query: Partial<HistoryQuery> = {}, items: HistoryItem[] = ITEMS): VueWrapper {
    return mount(Index, {
        props: {
            items,
            meta: { current_page: 2, from: 26, last_page: 3, per_page: 25, to: 50, total: 60 },
            query: { ...QUERY, ...query },
        },
    });
}

beforeEach(() => resetInertia({ auth: { permissions: ['nscmf.view', 'nscmf.view.history'] } }));

describe('History (FE-37)', () => {
    it('AC1: shows the active view by default and archived only as a separate flag, never a status', () => {
        const wrapper = mountHistory();

        expect(wrapper.get<HTMLSelectElement>('[data-testid="filter-archived"]').element.value).toBe('0');
        const archivedRow = wrapper.get('[data-testid="history-row-8"]').text();
        expect(archivedRow).toContain('Approved');
        expect(archivedRow).toContain('Archived');
        expect(wrapper.get('[data-testid="history-row-5"]').text()).not.toContain('Archived');
        expect(wrapper.get('a[href="/nscmf/5"]').text()).toBe('DEMO-ACT-005');
    });

    it('AC1: switching to the archived view asks the server for it', async () => {
        const wrapper = mountHistory();
        await wrapper.get('[data-testid="filter-archived"]').setValue('1');

        expect(lastRequest('/history')?.data).toMatchObject({ archived: 1, page: 1 });
    });

    it('AC2: sends only whitelisted keys, drops empty ones, and resets to page 1 on a filter change', async () => {
        const wrapper = mountHistory();
        await wrapper.get('[data-testid="filter-family"]').setValue('CHANGE');

        const request = lastRequest('/history');
        expect(request?.data).toEqual({
            page: 1,
            per_page: 25,
            sort: 'created_at',
            direction: 'asc',
            family: 'CHANGE',
            archived: 0,
        });
    });

    it('AC2: offers only the subtypes of the chosen family and every canonical status', async () => {
        const wrapper = mountHistory({ family: 'CHANGE' });
        const subtypes = wrapper.findAll('[data-testid="filter-subtype"] option').map((option) => option.text());
        expect(subtypes).toEqual(['All subtypes', 'Maintenance', 'Upgrade', 'Emergency']);
        expect(wrapper.findAll('[data-testid="filter-status"] option')).toHaveLength(8);
    });

    it('AC2: a date range and a search are sent as they are', async () => {
        const wrapper = mountHistory();
        await wrapper.get('[data-testid="filter-date-from"]').setValue('2026-09-01');
        await wrapper.get('[data-testid="filter-date-to"]').setValue('2026-09-30');

        expect(lastRequest('/history')?.data).toMatchObject({
            request_date_from: '2026-09-01',
            request_date_to: '2026-09-30',
            page: 1,
        });
    });

    it('AC3: a Team or owner filter from the URL is shown as informational and can be cleared', async () => {
        const wrapper = mountHistory({ team_id: 3, owner_user_id: 4 });
        expect(wrapper.get('[data-testid="informational-filters"]').text()).toContain('Team #3');

        await wrapper.get('[data-testid="clear-informational"]').trigger('click');
        const data = lastRequest('/history')?.data ?? {};
        expect('team_id' in data).toBe(false);
        expect('owner_user_id' in data).toBe(false);
    });

    it('AC4: navigation keeps the query in the URL and history state', async () => {
        const wrapper = mountHistory({ q: 'DEMO', family: 'ACTIVATION' });
        await wrapper.get('[data-testid="table-search-input"]').setValue('DEMO-ACT');

        const request = lastRequest('/history');
        expect(request?.data).toMatchObject({ q: 'DEMO-ACT', family: 'ACTIVATION', page: 1 });
        expect(request?.options).toMatchObject({ preserveState: true, preserveScroll: true });
        expect(request?.options.replace).toBeFalsy();
    });

    it('AC4: loading and an empty result are distinct states', async () => {
        const wrapper = mountHistory({}, []);
        expect(wrapper.text()).toContain('No records match these filters');

        await wrapper.get('[data-testid="filter-family"]').setValue('CHANGE');
        (requests.at(-1)?.options.onStart as (() => void) | undefined)?.();
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[data-testid="table-loading-state"]').exists()).toBe(true);
        requests.at(-1)?.options.onFinish?.();
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[data-testid="table-loading-state"]').exists()).toBe(false);
    });
});
