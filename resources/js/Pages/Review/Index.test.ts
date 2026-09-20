import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia, router } from '@/testing/inertia';
import Index, { type ReviewQueueItem } from './Index.vue';
import type { PaginationMeta } from '@/features/nscmf/contracts';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const sampleItems: ReviewQueueItem[] = [
    {
        id: 101,
        request_no: 'NSCMF-202609-00001',
        family: 'ACTIVATION',
        subtype: 'ACTIVATION',
        request_date: '2026-09-15',
        requester: { id: 10, name: 'Alice Requester' },
        team: { id: 1, name: 'Demo Team Alpha' },
        business_status: 'PENDING_REVIEW',
        is_archived: false,
    },
    {
        id: 102,
        request_no: 'NSCMF-202609-00002',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        request_date: '2026-09-16',
        requester: { id: 20, name: 'Bob Requester' },
        team: { id: 2, name: 'Demo Team Beta' },
        business_status: 'PENDING_REVIEW',
        is_archived: false,
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

function mountReviewQueue({
    items = sampleItems,
    meta = sampleMeta,
    permissions = ['nscmf.review'],
    userTeam = { id: 3, name: 'Demo Team Gamma' },
    loading = false,
    error = null,
}: {
    items?: ReviewQueueItem[];
    meta?: PaginationMeta | null;
    permissions?: string[];
    userTeam?: { id: number; name: string } | null;
    loading?: boolean;
    error?: string | null;
} = {}): VueWrapper {
    resetInertia({
        auth: {
            user: { id: 5, username: 'demo.reviewer', name: 'Demo Reviewer Gamma', team: userTeam },
            permissions,
        },
    });

    return mount(Index, {
        props: {
            items,
            meta,
            loading,
            error,
        },
    });
}

describe('Review Queue — Index.vue (FE-30)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('AC1: review_queue_is_team_neutral', () => {
        it('renders data table (not card grid) with Alpha and Beta records for Gamma reviewer', () => {
            const wrapper = mountReviewQueue({
                userTeam: { id: 3, name: 'Demo Team Gamma' },
            });

            // Table check
            expect(wrapper.find('table').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-scroll-container"]').exists()).toBe(true);

            // Informational columns check: request no, family/subtype, date, requester, team, status, actions
            const text = wrapper.text();
            expect(text).toContain('NSCMF-202609-00001');
            expect(text).toContain('Activation');
            expect(text).toContain('2026-09-15');
            expect(text).toContain('Alice Requester');
            expect(text).toContain('Demo Team Alpha');

            expect(text).toContain('NSCMF-202609-00002');
            expect(text).toContain('Change · Maintenance');
            expect(text).toContain('2026-09-16');
            expect(text).toContain('Bob Requester');
            expect(text).toContain('Demo Team Beta');

            // Status label check
            expect(text).toContain('Pending Review');
        });

        it('handles null / missing dates, requester, and team gracefully with dash', () => {
            const partialItem: ReviewQueueItem = {
                id: 104,
                request_no: 'NSCMF-202609-00004',
                family: 'ACTIVATION',
                subtype: 'DEACTIVATION',
                request_date: null,
                requester: null,
                team: null,
                business_status: 'PENDING_REVIEW',
            };

            const wrapper = mountReviewQueue({ items: [partialItem] });
            expect(wrapper.text()).toContain('Activation · Deactivation');
            expect(wrapper.text()).toContain('—');
        });

        it('formats Activation type and Change subtypes correctly', () => {
            const activationItem: ReviewQueueItem = {
                id: 105,
                request_no: 'NSCMF-202609-00005',
                family: 'ACTIVATION',
                subtype: 'ACTIVATION',
                request_date: '2026-09-18',
                requester: null,
                team: null,
                business_status: 'PENDING_REVIEW',
            };
            const changeItem: ReviewQueueItem = {
                id: 106,
                request_no: 'NSCMF-202609-00006',
                family: 'CHANGE',
                subtype: 'EMERGENCY',
                request_date: '2026-09-19',
                requester: null,
                team: null,
                business_status: 'PENDING_REVIEW',
            };

            const wrapper = mountReviewQueue({ items: [activationItem, changeItem] });
            expect(wrapper.text()).toContain('Activation');
            expect(wrapper.text()).toContain('Change · Emergency');
        });

        it('handles null meta gracefully without pagination metadata', () => {
            const wrapper = mountReviewQueue({ meta: null });
            expect(wrapper.find('table').exists()).toBe(true);
        });

        it('displays separate Archived badge if is_archived is true', () => {
            const archivedItem: ReviewQueueItem = {
                id: 103,
                request_no: 'NSCMF-202609-00003',
                family: 'CHANGE',
                subtype: 'EMERGENCY',
                request_date: '2026-09-17',
                requester: { id: 30, name: 'Charlie' },
                team: null,
                business_status: 'PENDING_REVIEW',
                is_archived: true,
            };

            const wrapper = mountReviewQueue({ items: [archivedItem] });
            expect(wrapper.get('[data-testid="archived-badge-103"]').text()).toBe('Archived');
        });
    });

    describe('AC2: review_queue_open_has_no_mutation', () => {
        it('renders View as a Link / anchor pointing to /review/{record}, performing no mutation request', async () => {
            const wrapper = mountReviewQueue();

            const viewLink = wrapper.get('[data-testid="btn-view-101"]');
            expect(viewLink.element.tagName.toLowerCase()).toBe('a');
            expect(viewLink.attributes('href')).toBe('/review/101');

            // Clicking does not trigger any router post/put/patch
            await viewLink.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
            expect(router.put).not.toHaveBeenCalled();
            expect(router.patch).not.toHaveBeenCalled();
        });
    });

    describe('AC3: review_queue_does_not_imply_action_permission', () => {
        it('does not display Forward, Return, or Reject row action buttons even if user has nscmf.review', () => {
            const wrapper = mountReviewQueue({
                permissions: ['nscmf.review'],
            });

            expect(wrapper.find('[data-testid="btn-forward-101"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="btn-return-101"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="btn-reject-101"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('Forward');
            expect(wrapper.text()).not.toContain('Reject');
        });

        it('does not display Forward in table rows even if user possesses nscmf.review.forward (action belongs on detail)', () => {
            const wrapper = mountReviewQueue({
                permissions: ['nscmf.review', 'nscmf.review.forward', 'nscmf.review.return', 'nscmf.review.reject'],
            });

            // Even with action permissions, queue rows only offer View, not inline workflow mutations
            expect(wrapper.find('[data-testid="btn-forward-101"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="btn-return-101"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="btn-reject-101"]').exists()).toBe(false);
        });
    });

    describe('AC4: review_queue_handles_stale_row', () => {
        it('provides a refresh / reload action to update stale queue without fake claims', async () => {
            const wrapper = mountReviewQueue();

            const reloadBtn = wrapper.find('[data-testid="btn-refresh-queue"]');
            expect(reloadBtn.exists()).toBe(true);

            await reloadBtn.trigger('click');
            expect(router.reload).toHaveBeenCalled();
        });

        it('handles query emission when user searches or paginates via ResourceTable', async () => {
            const wrapper = mountReviewQueue();

            const searchInput = wrapper.get('[data-testid="table-search-input"]');
            await searchInput.setValue('NSCMF-202609');

            expect(router.get).toHaveBeenCalledWith(
                '/review',
                expect.objectContaining({ q: 'NSCMF-202609', page: 1 }),
                expect.any(Object),
            );
        });

        it('forwards filters from query emission when filters are provided', () => {
            const wrapper = mountReviewQueue();

            const resourceTable = wrapper.findComponent({ name: 'ResourceTable' });
            resourceTable.vm.$emit('update:query', {
                page: 2,
                per_page: 50,
                sort: 'request_no',
                direction: 'desc',
                q: 'filter-test',
                filters: {
                    family: 'CHANGE',
                    team_id: 2,
                    unsupported_object: { ignored: true },
                },
            });

            expect(router.get).toHaveBeenCalledWith(
                '/review',
                expect.objectContaining({
                    page: 2,
                    per_page: 50,
                    sort: 'request_no',
                    direction: 'desc',
                    q: 'filter-test',
                    family: 'CHANGE',
                    team_id: 2,
                }),
                expect.any(Object),
            );
        });

        it('does not allow filters to override reserved keys (page, per_page, sort, direction, q)', () => {
            const wrapper = mountReviewQueue();

            const resourceTable = wrapper.findComponent({ name: 'ResourceTable' });
            resourceTable.vm.$emit('update:query', {
                page: 1,
                per_page: 25,
                sort: 'request_no',
                direction: 'asc',
                q: 'legit-search',
                filters: {
                    page: 99,
                    per_page: 9999,
                    sort: 'injected_column',
                    direction: 'desc',
                    q: 'injected-search',
                    family: 'CHANGE',
                },
            });

            expect(router.get).toHaveBeenCalledWith(
                '/review',
                expect.objectContaining({
                    page: 1,
                    per_page: 25,
                    sort: 'request_no',
                    direction: 'asc',
                    q: 'legit-search',
                    family: 'CHANGE',
                }),
                expect.any(Object),
            );
        });

        it('rejects or ignores non-allowlisted filter keys from filters object', () => {
            const wrapper = mountReviewQueue();

            const resourceTable = wrapper.findComponent({ name: 'ResourceTable' });
            resourceTable.vm.$emit('update:query', {
                page: 1,
                per_page: 25,
                filters: {
                    family: 'ACTIVATION',
                    team_id: 5,
                    admin_override: 1,
                    injected_sql: 'SELECT 1',
                    evil_param: 'malicious',
                },
            });

            const emittedPayload = vi.mocked(router.get).mock.calls.at(-1)?.[1] as Record<string, unknown>;
            expect(emittedPayload).toBeDefined();
            expect(emittedPayload.family).toBe('ACTIVATION');
            expect(emittedPayload.team_id).toBe(5);
            expect(emittedPayload.admin_override).toBeUndefined();
            expect(emittedPayload.injected_sql).toBeUndefined();
            expect(emittedPayload.evil_param).toBeUndefined();
        });

        it('clamps per_page between 1 and 100, and page >= 1 when emitted from parent handler', () => {
            const wrapper = mountReviewQueue();

            const resourceTable = wrapper.findComponent({ name: 'ResourceTable' });
            // Test upper bound clamping
            resourceTable.vm.$emit('update:query', {
                page: 0,
                per_page: 9999,
            });

            expect(router.get).toHaveBeenCalledWith(
                '/review',
                expect.objectContaining({
                    page: 1,
                    per_page: 100,
                }),
                expect.any(Object),
            );

            // Test lower bound clamping & default fallback
            resourceTable.vm.$emit('update:query', {
                page: -5,
                per_page: 0,
            });

            expect(router.get).toHaveBeenCalledWith(
                '/review',
                expect.objectContaining({
                    page: 1,
                    per_page: 1,
                }),
                expect.any(Object),
            );
        });

        it('renders empty state correctly when queue has no pending items', () => {
            const wrapper = mountReviewQueue({
                items: [],
                meta: { current_page: 1, per_page: 25, total: 0, last_page: 1, from: null, to: null },
            });

            expect(wrapper.find('[data-testid="table-empty-state"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('No records pending review');
        });

        it('renders error state correctly when server fails', () => {
            const wrapper = mountReviewQueue({
                error: 'Failed to load review queue.',
            });

            expect(wrapper.find('[data-testid="table-error-state"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('Failed to load review queue.');
        });
    });
});
