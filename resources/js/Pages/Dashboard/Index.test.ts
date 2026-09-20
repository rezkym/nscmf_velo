import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requests, resetInertia, router } from '@/testing/inertia';

import Index, { type DashboardCounts, type DashboardItems } from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const TEAM_ALPHA = { id: 1, name: 'Demo Team Alpha' };

function mountDashboard(
    permissions: string[],
    {
        counts = {},
        items = {},
        team = TEAM_ALPHA,
    }: { counts?: DashboardCounts; items?: DashboardItems; team?: typeof TEAM_ALPHA | null } = {},
): VueWrapper {
    resetInertia({
        auth: { user: { id: 5, username: 'demo.requester.a', name: 'Demo Requester A', team }, permissions },
    });
    return mount(Index, { props: { counts, items } });
}

describe('Dashboard (FE-16)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('AC1: always shows My drafts and Revision required, and review/approval queues only with their permissions', () => {
        const reviewerOnly = mountDashboard(['nscmf.review']);
        expect(reviewerOnly.find('[data-testid="card-drafts"]').exists()).toBe(true);
        expect(reviewerOnly.find('[data-testid="card-revisions"]').exists()).toBe(true);
        expect(reviewerOnly.find('[data-testid="card-reviews"]').exists()).toBe(true);
        expect(reviewerOnly.find('[data-testid="card-approvals"]').exists()).toBe(false);

        const multiRole = mountDashboard(['nscmf.review', 'nscmf.approve']);
        expect(multiRole.find('[data-testid="card-approvals"]').exists()).toBe(true);

        const requester = mountDashboard(['nscmf.create']);
        expect(requester.find('[data-testid="card-reviews"]').exists()).toBe(false);
        expect(requester.find('[data-testid="card-approvals"]').exists()).toBe(false);
    });

    it('AC2: shows a loading state instead of zero while a count is pending', () => {
        const wrapper = mountDashboard([], { counts: { drafts: { loading: true } } });

        const card = wrapper.get('[data-testid="card-drafts"]');
        expect(card.text()).toContain('Loading');
        expect(card.find('[data-testid="count-value"]').exists()).toBe(false);
    });

    it('AC2: never turns an unknown count into zero', () => {
        const wrapper = mountDashboard([], { counts: { drafts: { count: null }, revisions: { count: 0 } } });

        expect(wrapper.get('[data-testid="card-drafts"] [data-testid="count-value"]').text()).toBe('—');
        expect(wrapper.get('[data-testid="card-revisions"] [data-testid="count-value"]').text()).toBe('0');
    });

    it('AC2: shows a failed count with a retry that reloads the counts only', async () => {
        const wrapper = mountDashboard([], { counts: { drafts: { error: 'Counts are unavailable right now.' } } });

        const card = wrapper.get('[data-testid="card-drafts"]');
        expect(card.text()).toContain('Counts are unavailable right now.');
        expect(card.find('[data-testid="count-value"]').exists()).toBe(false);

        await card.get('[data-testid="retry-button"]').trigger('click');
        expect(router.reload).toHaveBeenCalledWith({ only: ['counts'] });
    });

    it('AC3: shows the server count and the record team as information only', () => {
        const wrapper = mountDashboard(['nscmf.review'], {
            team: { id: 2, name: 'Demo Team Beta' },
            counts: { reviews: { count: 3 } },
            items: {
                reviews: [
                    {
                        id: 12,
                        request_no: 'DEMO-ACT-002',
                        family: 'ACTIVATION',
                        subtype: 'ACTIVATION',
                        team: TEAM_ALPHA,
                    },
                ],
            },
        });

        const card = wrapper.get('[data-testid="card-reviews"]');
        expect(card.get('[data-testid="count-value"]').text()).toBe('3');
        expect(card.text()).toContain('DEMO-ACT-002');
        expect(card.text()).toContain('Demo Team Alpha');
    });

    it('AC4: links to canonical pages and records without triggering any request', () => {
        const wrapper = mountDashboard(['nscmf.create', 'nscmf.review', 'nscmf.approve'], {
            items: { drafts: [{ id: 7, request_no: 'DEMO-ACT-001', family: 'ACTIVATION', subtype: 'ACTIVATION' }] },
        });

        const hrefs = wrapper.findAll('#main-content a').map((link) => link.attributes('href'));
        expect(hrefs).toEqual(
            expect.arrayContaining(['/nscmf/create', '/history', '/review', '/approval', '/nscmf/7']),
        );
        expect(requests).toHaveLength(0);
    });

    it('asks users without an active team to contact an administrator instead of offering Create', () => {
        const wrapper = mountDashboard(['nscmf.create'], { team: null });

        expect(wrapper.find('#main-content a[href="/nscmf/create"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('active team');
    });
});
