import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lastRequest, resetInertia } from '@/testing/inertia';

import Index, { type MyApplicationsQuery } from './Index.vue';
import type { HistoryItem } from '../History/Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const QUERY: MyApplicationsQuery = {
    page: 1,
    per_page: 25,
    sort: 'created_at',
    direction: 'asc',
    q: null,
    business_status: null,
};

const ITEMS: HistoryItem[] = [
    {
        id: 4,
        request_no: 'NS-2026-0004',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        request_date: null,
        requester: null,
        team: { id: 1, name: 'Demo Team Alpha' },
        business_status: 'DRAFT',
        is_archived: false,
    },
];

function mountPage(query: Partial<MyApplicationsQuery> = {}, items: HistoryItem[] = ITEMS): VueWrapper {
    return mount(Index, {
        props: {
            items,
            meta: { current_page: 1, from: 1, last_page: 2, per_page: 25, to: 25, total: 30 },
            query: { ...QUERY, ...query },
        },
    });
}

beforeEach(() => resetInertia({ auth: { permissions: ['nscmf.view'] } }));

describe('My Applications (FE-67)', () => {
    it('lists the own records with Request No, Type, Request date and Status', () => {
        const wrapper = mountPage();

        expect(wrapper.find('h1').text()).toBe('My Applications');
        expect(wrapper.findAll('thead th').map((cell) => cell.text())).toEqual([
            'Request No',
            'Type',
            'Request date',
            'Status',
        ]);
        const cells = wrapper.findAll('tbody tr td').map((cell) => cell.text());
        expect(cells).toEqual(['NS-2026-0004', 'Change · Maintenance', '—', 'Draft']);
        expect(wrapper.get('a[href="/nscmf/4"]').text()).toBe('NS-2026-0004');
        expect(wrapper.get('[data-testid="table-range"]').text()).toBe('1–25 of 30');
    });

    it('searches, filters by status, sorts and pages through /my-applications with only its own keys', async () => {
        const wrapper = mountPage({ q: 'ns', business_status: 'DRAFT' });

        const status = wrapper.get('[data-testid="table-controls"]').get('[data-testid="filter-status"]');
        expect(status.findAll('option').map((option) => option.text())).toContain('Pending Review');
        await status.setValue('PENDING_REVIEW');
        expect(lastRequest('/my-applications')?.data).toEqual({
            page: 1,
            per_page: 25,
            sort: 'created_at',
            direction: 'asc',
            q: 'ns',
            business_status: 'PENDING_REVIEW',
        });

        await wrapper.get('[data-testid="sort-button-request_no"]').trigger('click');
        expect(lastRequest('/my-applications')?.data).toMatchObject({ sort: 'request_no', direction: 'asc', page: 1 });

        await wrapper.get('[data-testid="pagination-page-2"]').trigger('click');
        expect(lastRequest('/my-applications')?.data).toMatchObject({ page: 2, q: 'ns', business_status: 'DRAFT' });

        await wrapper.get('[data-testid="table-search-input"]').setValue('');
        expect(lastRequest('/my-applications')?.data).not.toHaveProperty('q');
    });

    it('says so when there are no applications', () => {
        expect(mountPage({}, []).get('[data-testid="table-empty-state"]').text()).toBe('No applications match');
    });
});
