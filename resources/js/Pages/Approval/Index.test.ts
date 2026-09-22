import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginationMeta } from '@/features/nscmf/contracts';
import { resetInertia, router } from '@/testing/inertia';
import Index, { type ApprovalQueueItem } from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const sampleItems: ApprovalQueueItem[] = [
    {
        id: 201,
        request_no: 'NSCMF-202609-00011',
        requester: { id: 10, name: 'Alice Requester' },
        team: { id: 1, name: 'Team Alpha' },
        business_status: 'PENDING_APPROVAL',
    },
    {
        id: 202,
        request_no: 'NSCMF-202609-00012',
        requester: { id: 20, name: 'Bob Requester' },
        team: { id: 2, name: 'Team Beta' },
        business_status: 'PENDING_APPROVAL',
    },
];

const sampleMeta: PaginationMeta = {
    current_page: 1,
    per_page: 25,
    total: 2,
    last_page: 1,
    from: 1,
    to: 2,
};

function mountApprovalQueue({
    items = sampleItems,
    meta = sampleMeta,
    loading = false,
    error = null,
}: {
    items?: ApprovalQueueItem[];
    meta?: PaginationMeta | null;
    loading?: boolean;
    error?: string | null;
} = {}): VueWrapper {
    resetInertia({
        auth: {
            user: {
                id: 5,
                username: 'reviewer.approver',
                name: 'Reviewer and Approver',
                team: { id: 3, name: 'Team Gamma' },
            },
            permissions: ['nscmf.review', 'nscmf.approve'],
        },
    });

    return mount(Index, { props: { items, meta, loading, error } });
}

describe('Approval Queue — Index.vue (FE-32)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('AC1: renders the shared Approval Queue table with server-supplied records from other Teams', () => {
        const wrapper = mountApprovalQueue();

        expect(wrapper.findAll('table')).toHaveLength(1);
        expect(wrapper.get('caption').text()).toBe('Approval Queue');
        expect(wrapper.text()).toContain('NSCMF-202609-00011');
        expect(wrapper.text()).toContain('Alice Requester');
        expect(wrapper.text()).toContain('Team Alpha');
        expect(wrapper.text()).toContain('NSCMF-202609-00012');
        expect(wrapper.text()).toContain('Bob Requester');
        expect(wrapper.text()).toContain('Team Beta');
        expect(wrapper.get('[data-testid="btn-view-201"]').attributes('href')).toBe('/approval/201');
        expect(wrapper.get('[data-testid="btn-view-202"]').attributes('href')).toBe('/approval/202');
    });

    it('AC2: does not filter a reviewer-approver by role, Team, or segregation of duties and exposes no queue mutation', () => {
        const wrapper = mountApprovalQueue();

        expect(wrapper.text()).toContain('NSCMF-202609-00011');
        expect(wrapper.text()).toContain('NSCMF-202609-00012');
        expect(wrapper.find('[data-testid="btn-claim-201"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-assign-201"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-approve-201"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Claim');
        expect(wrapper.text()).not.toContain('Assign');
        expect(wrapper.text()).not.toContain('Quorum');
        expect(wrapper.text()).not.toContain('Vote');
    });

    it('AC2: opens a queue item through GET only', async () => {
        const wrapper = mountApprovalQueue();

        await wrapper.get('[data-testid="btn-view-201"]').trigger('click');

        expect(router.post).not.toHaveBeenCalled();
        expect(router.put).not.toHaveBeenCalled();
        expect(router.patch).not.toHaveBeenCalled();
    });

    it('AC4: refreshes explicitly and keeps rows until replacement server props remove a terminal record', async () => {
        const wrapper = mountApprovalQueue();

        await wrapper.get('[data-testid="btn-refresh-queue"]').trigger('click');

        expect(router.reload).toHaveBeenCalledTimes(1);
        expect(router.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('NSCMF-202609-00011');

        await wrapper.setProps({ items: [sampleItems[1]] });

        expect(wrapper.text()).not.toContain('NSCMF-202609-00011');
        expect(wrapper.text()).toContain('NSCMF-202609-00012');
    });

    it('sends only canonical table query keys to the approval GET endpoint', () => {
        const wrapper = mountApprovalQueue();
        const table = wrapper.findComponent({ name: 'ResourceTable' });

        table.vm.$emit('update:query', {
            page: 2,
            per_page: 50,
            sort: 'request_no',
            direction: 'desc',
            q: 'approval search',
            filters: { team_id: 9, reviewer_id: 5 },
            unsupported: 'not forwarded',
        });

        expect(router.get).toHaveBeenCalledWith(
            '/approval',
            { page: 2, per_page: 50, sort: 'request_no', direction: 'desc', q: 'approval search' },
            expect.objectContaining({ preserveState: true, preserveScroll: true }),
        );
    });

    it('renders the loading state distinctly', () => {
        const wrapper = mountApprovalQueue({ loading: true });

        expect(wrapper.get('[data-testid="table-loading-state"]').attributes('aria-busy')).toBe('true');
    });

    it('renders the error state distinctly', () => {
        const wrapper = mountApprovalQueue({ error: 'Unable to load approval queue.' });

        expect(wrapper.get('[data-testid="table-error-state"]').text()).toContain('Unable to load approval queue.');
    });

    it('renders the empty state distinctly', () => {
        const wrapper = mountApprovalQueue({
            items: [],
            meta: { current_page: 1, per_page: 25, total: 0, last_page: 1, from: null, to: null },
        });

        expect(wrapper.get('[data-testid="table-empty-state"]').text()).toContain('No records pending approval');
    });

    it('escapes server-supplied queue text', () => {
        const wrapper = mountApprovalQueue({
            items: [
                {
                    id: 203,
                    request_no: '<img src=x onerror=alert(1)>',
                    requester: { id: 30, name: '<b>Unsafe requester</b>' },
                    team: { id: 4, name: '<script>unsafe</script>' },
                    business_status: 'PENDING_APPROVAL',
                },
            ],
        });

        expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>');
        expect(wrapper.text()).toContain('<b>Unsafe requester</b>');
        expect(wrapper.text()).toContain('<script>unsafe</script>');
        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.find('b').exists()).toBe(false);
    });
});
