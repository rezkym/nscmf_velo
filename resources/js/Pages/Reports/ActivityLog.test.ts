import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActivityLogPageProps, LogItem, LogQuery } from '@/features/reports/types';
import { pickDate } from '@/testing/datePicker';
import { lastRequest, resetInertia } from '@/testing/inertia';

import ActivityLog from './ActivityLog.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const QUERY: LogQuery = {
    page: 1,
    per_page: 25,
    q: null,
    family: null,
    subtype: null,
    statuses: ['PENDING_REVIEW', 'REVISION_REQUIRED', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED'],
    archived: 'all',
    request_date_from: null,
    request_date_to: null,
};

const ITEMS: LogItem[] = [
    {
        id: 5,
        request_no: 'NSCMF-202608-00001',
        request_date: '2026-08-03',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        customer_name: 'Demo Customer',
        noc_infrastructure: [],
        business_status: 'APPROVED',
        is_archived: false,
    },
    {
        id: 8,
        request_no: 'NSCMF-202608-00002',
        request_date: '2026-08-04',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        customer_name: 'Demo migration',
        noc_infrastructure: ['NOC15', 'REGIONAL'],
        business_status: 'APPROVED',
        is_archived: true,
    },
];

function props(overrides: Partial<ActivityLogPageProps> = {}): ActivityLogPageProps {
    return {
        items: ITEMS,
        meta: { current_page: 2, from: 26, last_page: 2, per_page: 25, to: 27, total: 27 },
        query: QUERY,
        summary: {
            total: 27,
            period_from: '2026-08-01',
            period_until: '2026-08-31',
            site_defaults: { noc15: true, noc23: false },
        },
        pdf_available: true,
        max_entries: 1000,
        ...overrides,
    };
}

function mountLog(overrides: Partial<ActivityLogPageProps> = {}): VueWrapper {
    return mount(ActivityLog, { props: props(overrides), attachTo: document.body });
}

beforeEach(() =>
    resetInertia({
        auth: {
            user: { id: 1, username: 'demo', name: 'Demo Person' },
            permissions: ['nscmf.view.history', 'nscmf.export'],
        },
    }),
);

describe('Activity Log page (07 §34.2)', () => {
    it('shows the log columns with running numbers, dates as d MMM yyyy and the archived badge', () => {
        const wrapper = mountLog();
        const first = wrapper.get('[data-testid="log-row-5"]').text();

        expect(first).toContain('26');
        expect(first).toContain('3 Aug 2026');
        expect(first).toContain('Activation');
        expect(first).toContain('Demo Customer');
        expect(wrapper.get('a[href="/nscmf/5"]').text()).toBe('NSCMF-202608-00001');
        const second = wrapper.get('[data-testid="log-row-8"]').text();
        expect(second).toContain('27');
        expect(second).toContain('NOC15, Regional');
        expect(second).toContain('Archived');
        expect(wrapper.get('[data-testid="log-summary"]').text()).toBe('27 entries · Period 1 Aug 2026 – 31 Aug 2026');
    });

    it('checks every submitted status by default and offers the two quick choices', async () => {
        const wrapper = mountLog();
        expect(wrapper.get('[data-testid="status-APPROVED"]').attributes('data-state')).toBe('checked');
        expect(wrapper.get('[data-testid="status-DRAFT"]').attributes('data-state')).toBe('unchecked');

        await wrapper.get('[data-testid="statuses-approved-only"]').trigger('click');
        expect(lastRequest('/reports/activity-log')?.data).toMatchObject({ statuses: ['APPROVED'], page: 1 });

        await wrapper.setProps({ query: { ...QUERY, statuses: ['APPROVED'] } });
        await wrapper.get('[data-testid="statuses-all-submitted"]').trigger('click');
        expect(lastRequest('/reports/activity-log')?.data).toMatchObject({ statuses: QUERY.statuses });
    });

    it('adds a single status, never leaves the list empty, and sends dates and the archive view', async () => {
        const wrapper = mountLog({ query: { ...QUERY, statuses: ['APPROVED'] } });
        await wrapper.get('[data-testid="status-DRAFT"]').trigger('click');
        expect(lastRequest('/reports/activity-log')?.data).toMatchObject({ statuses: ['DRAFT', 'APPROVED'] });

        expect(wrapper.get('[data-testid="status-APPROVED"]').attributes('disabled')).toBeDefined();

        await pickDate(wrapper, 'log-date-from', '2026-08-01');
        expect(lastRequest('/reports/activity-log')?.data).toMatchObject({ request_date_from: '2026-08-01', page: 1 });

        await wrapper.get('[data-testid="log-archived"]').setValue('active');
        expect(lastRequest('/reports/activity-log')?.data).toMatchObject({ archived: 'active' });
    });

    it('keeps the selection while paging and can clear it', async () => {
        const wrapper = mountLog();
        await wrapper.get('[data-testid="select-5"]').trigger('click');
        expect(wrapper.get('[data-testid="selection-count"]').text()).toBe('1 selected');

        await wrapper.setProps({ items: [{ ...ITEMS[1]!, id: 9, request_no: 'NSCMF-202608-00003' }] });
        expect(wrapper.get('[data-testid="selection-count"]').text()).toBe('1 selected');

        await wrapper.get('[data-testid="clear-selection"]').trigger('click');
        expect(wrapper.find('[data-testid="selection-count"]').exists()).toBe(false);
    });

    it('offers Export only with the export permission', () => {
        expect(mountLog().find('[data-testid="open-export"]').exists()).toBe(true);

        resetInertia({ auth: { permissions: ['nscmf.view.history'] } });
        expect(mountLog().find('[data-testid="open-export"]').exists()).toBe(false);
    });
});
