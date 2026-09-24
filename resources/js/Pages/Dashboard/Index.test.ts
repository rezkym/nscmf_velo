import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requests, resetInertia, router } from '@/testing/inertia';

import type { DashboardAnalytics, DashboardCounts, DashboardItems } from '@/features/dashboard/types';

import Index from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const TEAM_ALPHA = { id: 1, name: 'Demo Team Alpha' };

function mountDashboard(
    permissions: string[],
    {
        counts = {},
        items = {},
        analytics = undefined,
        team = TEAM_ALPHA,
    }: {
        counts?: DashboardCounts;
        items?: DashboardItems;
        analytics?: DashboardAnalytics;
        team?: typeof TEAM_ALPHA | null;
    } = {},
): VueWrapper {
    resetInertia({
        auth: { user: { id: 5, username: 'demo.requester.a', name: 'Demo Requester A', team }, permissions },
    });
    return mount(Index, { props: { counts, items, analytics } });
}

const week = (from: string, through: string) => ({ from, through });
const WEEKS = [
    week('2026-08-28', '2026-09-03'),
    week('2026-09-04', '2026-09-10'),
    week('2026-09-11', '2026-09-17'),
    week('2026-09-18', '2026-09-24'),
];

const MINE: DashboardAnalytics['mine'] = {
    totals_28d: { created: 5, first_submitted: 3, approval_decisions: 2 },
    weekly: [
        { ...WEEKS[0]!, created: 1, first_submitted: 0, approval_decisions: 0 },
        { ...WEEKS[1]!, created: 2, first_submitted: 1, approval_decisions: 1 },
        { ...WEEKS[2]!, created: 0, first_submitted: 1, approval_decisions: 0 },
        { ...WEEKS[3]!, created: 2, first_submitted: 1, approval_decisions: 1 },
    ],
    active_status_counts: [
        { status: 'DRAFT', count: 2 },
        { status: 'PENDING_REVIEW', count: 1 },
        { status: 'REVISION_REQUIRED', count: 0 },
        { status: 'PENDING_APPROVAL', count: 0 },
        { status: 'REJECTED', count: 0 },
        { status: 'APPROVED', count: 4 },
        { status: 'CANCELLED', count: 0 },
    ],
};

const ORGANIZATION: NonNullable<DashboardAnalytics['organization']> = {
    totals_28d: { first_submitted: 11, approval_decisions: 7 },
    weekly: WEEKS.map((range, index) => ({ ...range, first_submitted: index + 2, approval_decisions: index })),
    active_status_counts: [
        { status: 'PENDING_REVIEW', count: 6 },
        { status: 'REVISION_REQUIRED', count: 1 },
        { status: 'PENDING_APPROVAL', count: 2 },
        { status: 'REJECTED', count: 0 },
        { status: 'APPROVED', count: 9 },
    ],
};

const PERIOD: DashboardAnalytics['period'] = { from: '2026-08-28', through: '2026-09-24', timezone: 'Asia/Jakarta' };

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
        expect(hrefs).toEqual(expect.arrayContaining(['/nscmf/create', '/history', '/review', '/approval']));
        expect(requests).toHaveLength(0);
    });

    /*
     * Each attention card leads to the page where its work is done, not to a read-only detail:
     * resume a Draft (03 UF-DRAFT-003), revise a returned record (03 UF-REVIEW-005; 07 §60),
     * decide a review (07 §30) or an approval (07 §31).
     */
    it('opens each queued record where its next step happens', () => {
        const record = (id: number) =>
            ({ id, request_no: `DEMO-${id}`, family: 'CHANGE', subtype: 'MAINTENANCE' }) as const;
        const wrapper = mountDashboard(['nscmf.draft.edit', 'nscmf.review', 'nscmf.approve'], {
            items: { drafts: [record(7)], revisions: [record(8)], reviews: [record(9)], approvals: [record(10)] },
        });

        const itemHref = (card: string) => wrapper.get(`[data-testid="${card}"] li a`).attributes('href');
        expect(itemHref('card-drafts')).toBe('/nscmf/7/edit');
        expect(itemHref('card-revisions')).toBe('/nscmf/8/edit');
        expect(itemHref('card-reviews')).toBe('/review/9');
        expect(itemHref('card-approvals')).toBe('/approval/10');
    });

    it('falls back to the record detail for an own record the actor may not edit', () => {
        const wrapper = mountDashboard([], {
            items: { revisions: [{ id: 8, request_no: 'DEMO-8', family: 'CHANGE', subtype: 'MAINTENANCE' }] },
        });

        expect(wrapper.get('[data-testid="card-revisions"] li a').attributes('href')).toBe('/nscmf/8');
    });

    it('asks users without an active team to contact an administrator instead of offering Create', () => {
        const wrapper = mountDashboard(['nscmf.create'], { team: null });

        expect(wrapper.find('#main-content a[href="/nscmf/create"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('active team');
    });

    it('lays the attention cards out in as many desktop columns as there are cards', () => {
        const columns = (permissions: string[]) =>
            mountDashboard(permissions).get('[data-testid="attention-cards"]').classes();

        expect(columns([])).toContain('lg:grid-cols-2');
        expect(columns(['nscmf.review'])).toContain('lg:grid-cols-3');
        expect(columns(['nscmf.review', 'nscmf.approve'])).toContain('lg:grid-cols-4');
        // Tablets never get more than two columns, phones one.
        expect(columns(['nscmf.review', 'nscmf.approve'])).toEqual(
            expect.arrayContaining(['grid-cols-1', 'sm:grid-cols-2']),
        );
    });

    describe('analytics (12 §44.1, 07 §17.1)', () => {
        it("shows the actor's activity of the last 28 days as totals and weekly values", () => {
            const panel = mountDashboard([], { analytics: { period: PERIOD, mine: MINE } }).get(
                '[data-testid="activity-panel"]',
            );

            const legend = panel.get('[data-testid="activity-legend"]').text();
            expect(legend).toContain('Created');
            expect(legend).toContain('First submissions');
            expect(legend).toContain('Approval decisions');
            expect(panel.findAll('[data-testid="activity-total"]').map((total) => total.text())).toEqual([
                '5',
                '3',
                '2',
            ]);

            const rows = panel.findAll('tbody tr');
            expect(rows).toHaveLength(4);
            expect(rows[0]!.text()).toContain('Aug 28 – Sep 3');
            expect(rows[1]!.findAll('td').map((cell) => cell.text())).toEqual(['2', '1', '1']);
        });

        it('lists every business status with its count, a true zero included', () => {
            const rows = mountDashboard([], { analytics: { period: PERIOD, mine: MINE } }).findAll(
                '[data-testid="status-panel"] li',
            );

            expect(rows).toHaveLength(7);
            expect(rows[5]!.text()).toContain('Approved');
            expect(rows[5]!.text()).toContain('4');
            expect(rows[6]!.text()).toContain('Cancelled');
            expect(rows[6]!.text()).toContain('0');
        });

        it('offers no Organization view when the server did not send one', () => {
            const wrapper = mountDashboard(['nscmf.view.history'], { analytics: { period: PERIOD, mine: MINE } });

            expect(wrapper.find('[data-testid="analytics-scope"]').exists()).toBe(false);
        });

        it('switches to the organization aggregates the server sent', async () => {
            const wrapper = mountDashboard([], {
                analytics: { period: PERIOD, mine: MINE, organization: ORGANIZATION },
            });
            const scope = wrapper.get('[data-testid="analytics-scope"]');
            expect(scope.attributes('role')).toBe('tablist');
            expect(scope.attributes('aria-label')).toBe('Analytics scope');
            const organization = scope.get('[role="tab"]:last-child');
            expect(organization.text()).toBe('Organization');
            expect(organization.attributes('aria-selected')).toBe('false');

            await organization.trigger('mousedown', { button: 0 });

            expect(organization.attributes('aria-selected')).toBe('true');
            const activity = wrapper.get('[data-testid="activity-panel"]');
            expect(activity.get('[data-testid="activity-legend"]').text()).not.toContain('Created');
            expect(activity.findAll('[data-testid="activity-total"]').map((total) => total.text())).toEqual([
                '11',
                '7',
            ]);
            const statuses = wrapper.findAll('[data-testid="status-panel"] li');
            expect(statuses).toHaveLength(5);
            expect(statuses[0]!.text()).toContain('Pending Review');
            expect(statuses[0]!.text()).toContain('6');
        });

        it('leaves the analytics panels out when the prop is absent', () => {
            const wrapper = mountDashboard([]);

            expect(wrapper.find('[data-testid="activity-panel"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="status-panel"]').exists()).toBe(false);
        });
    });

    it('lists what needs attention in the order returned, review, approval, draft', () => {
        const record = (id: number) =>
            ({ id, request_no: `DEMO-${id}`, family: 'CHANGE', subtype: 'MAINTENANCE' }) as const;
        const wrapper = mountDashboard(['nscmf.draft.edit', 'nscmf.review', 'nscmf.approve'], {
            items: { drafts: [record(7)], revisions: [record(8)], reviews: [record(9)], approvals: [record(10)] },
        });

        const links = wrapper.findAll('[data-testid="needs-attention"] li a');
        expect(links.map((link) => link.attributes('href'))).toEqual([
            '/nscmf/8/edit',
            '/review/9',
            '/approval/10',
            '/nscmf/7/edit',
        ]);
        expect(links[0]!.text()).toContain('DEMO-8');
        expect(links[0]!.text()).toContain('Revision required');
    });

    it('says so when nothing needs attention', () => {
        expect(mountDashboard([]).get('[data-testid="needs-attention"]').text()).toContain(
            'Nothing needs your attention',
        );
    });

    it('offers only the quick actions the actor can take', () => {
        const actions = (permissions: string[], team: typeof TEAM_ALPHA | null = TEAM_ALPHA) =>
            mountDashboard(permissions, { team })
                .findAll('[data-testid="quick-actions"] a')
                .map((link) => link.attributes('href'));

        expect(actions(['nscmf.create', 'nscmf.view.history'])).toEqual(['/nscmf/create', '/history']);
        expect(actions(['nscmf.create'], null)).toEqual([]);
        expect(actions(['nscmf.review', 'nscmf.approve'])).toEqual(['/review', '/approval']);
        expect(mountDashboard([]).find('[data-testid="quick-actions"]').exists()).toBe(false);
    });
});
