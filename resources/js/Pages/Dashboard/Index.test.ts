import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Index from './Index.vue';

// Mock Inertia Head, Link, usePage, router
let mockPageProps: Record<string, unknown> = {};

const { mockReload } = vi.hoisted(() => ({
    mockReload: vi.fn(),
}));

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: false } },
            setup: () => () => null,
        }),
        Link: defineComponent({
            name: 'InertiaLink',
            props: { href: { type: String, required: true } },
            setup:
                (props, { slots, attrs }) =>
                () =>
                    h('a', { href: props.href, ...attrs }, slots.default ? slots.default() : []),
        }),
        usePage: () => ({
            props: mockPageProps,
        }),
        router: {
            visit: vi.fn(),
            reload: mockReload,
            get: vi.fn(),
        },
    };
});

describe('Dashboard/Index.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPageProps = {
            auth: {
                user: {
                    id: 1,
                    username: 'demo.requester.a',
                    name: 'Demo Requester A',
                    team: { id: 1, name: 'Demo Team Alpha' },
                },
                permissions: ['nscmf.create', 'nscmf.draft.edit', 'nscmf.view'],
                roles: ['Requester'],
            },
        };
    });

    // AC1 — dashboard_shows_actor_relevant_cards
    // Requester own draft/revision; multi-role review+approval; permissions missing hide relevant action.
    it('AC1: dashboard_shows_actor_relevant_cards — displays draft and revision cards for requester, review and approval cards for multi-role, and hides cards when permissions missing', () => {
        // Case 1: Requester with create and draft permissions
        mockPageProps = {
            auth: {
                user: { id: 1, username: 'requester', name: 'Requester' },
                permissions: ['nscmf.create', 'nscmf.draft.edit', 'nscmf.view'],
            },
        };

        const wrapper = mount(Index, {
            props: {
                counts: {
                    drafts: { count: 3, loading: false, error: null },
                    revisions: { count: 1, loading: false, error: null },
                    reviews: { count: 0, loading: false, error: null },
                    approvals: { count: 0, loading: false, error: null },
                },
                items: {
                    drafts: [
                        { id: 101, request_number: 'REQ-DRAFT-1', title: 'Draft record', updated_at: '2026-09-16' },
                    ],
                    revisions: [
                        { id: 102, request_number: 'REQ-REV-1', title: 'Revision record', updated_at: '2026-09-16' },
                    ],
                },
            },
        });

        // Should display Drafts and Revisions cards
        expect(wrapper.find('[data-testid="card-drafts"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="card-revisions"]').exists()).toBe(true);
        // Review and Approvals cards should NOT be shown because user lacks nscmf.review and nscmf.approve permissions
        expect(wrapper.find('[data-testid="card-reviews"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="card-approvals"]').exists()).toBe(false);

        // Case 2: Multi-role user with both nscmf.review and nscmf.approve
        mockPageProps = {
            auth: {
                user: { id: 5, username: 'multi', name: 'Multi Role' },
                permissions: ['nscmf.review', 'nscmf.approve', 'nscmf.view', 'nscmf.view.history'],
            },
        };
        const multiWrapper = mount(Index, {
            props: {
                counts: {
                    reviews: { count: 5, loading: false, error: null },
                    approvals: { count: 2, loading: false, error: null },
                },
                items: {
                    approvals: [
                        { id: 301, request_number: 'REQ-APPR-1', team: 'Demo Team Gamma', title: 'Approval Request' },
                    ],
                },
            },
        });

        expect(multiWrapper.find('[data-testid="card-reviews"]').exists()).toBe(true);
        expect(multiWrapper.find('[data-testid="card-approvals"]').exists()).toBe(true);
        // Lacks nscmf.create / nscmf.draft.edit -> hides draft card
        expect(multiWrapper.find('[data-testid="card-drafts"]').exists()).toBe(false);
    });

    // AC2 — dashboard_does_not_infer_zero
    // loading bukan 0, failed count safe retry bukan empty result.
    it('AC2: dashboard_does_not_infer_zero — renders loading state rather than 0 when counts are pending, and renders error/retry when counts fail', async () => {
        const wrapper = mount(Index, {
            props: {
                counts: {
                    drafts: { count: null, loading: true, error: null },
                    revisions: { count: null, loading: false, error: 'Network timeout' },
                    reviews: { count: null, loading: false, error: 'Failed to load reviews' },
                    approvals: { count: null, loading: false, error: 'Failed to load approvals' },
                },
                items: {
                    drafts: [{ id: 101, request_number: 'REQ-DRAFT-1', title: 'Draft record' }],
                    revisions: [{ id: 102, request_number: 'REQ-REV-1', title: 'Revision record' }],
                    reviews: [{ id: 103, request_number: 'REQ-REVW-1', title: 'Review record' }],
                    approvals: [{ id: 104, request_number: 'REQ-APPR-1', title: 'Approval record' }],
                },
            },
        });

        const draftCard = wrapper.find('[data-testid="card-drafts"]');
        expect(draftCard.exists()).toBe(true);
        // Loading state should show a loading indicator / skeleton or text, NOT '0'
        expect(draftCard.find('[data-testid="loading-indicator"]').exists()).toBe(true);
        expect(draftCard.text()).not.toContain('0 items');
        expect(draftCard.find('[data-testid="count-value"]').exists()).toBe(false);

        const revisionCard = wrapper.find('[data-testid="card-revisions"]');
        expect(revisionCard.exists()).toBe(true);
        // Error state should show error text and a safe retry trigger, NOT an empty result state ("0" or "No items")
        expect(revisionCard.find('[data-testid="error-message"]').exists()).toBe(true);
        const retryBtn = revisionCard.find('[data-testid="retry-button"]');
        expect(retryBtn.exists()).toBe(true);
        expect(revisionCard.find('[data-testid="count-value"]').exists()).toBe(false);

        // Click retry
        await retryBtn.trigger('click');
        expect(mockReload).toHaveBeenCalledWith({ only: ['counts'] });
    });

    // AC3 — dashboard_team_is_information_only
    // TeamBeta reviewer count dari server tetap tampil untuk TeamAlpha records (Team is info only)
    it('AC3: dashboard_team_is_information_only — server projection count displays cross-team records as Team is informational only', () => {
        mockPageProps = {
            auth: {
                user: {
                    id: 3,
                    username: 'demo.reviewer',
                    name: 'Demo Reviewer',
                    team: { id: 2, name: 'Demo Team Beta' },
                },
                permissions: ['nscmf.review', 'nscmf.view'],
            },
        };

        const wrapper = mount(Index, {
            props: {
                counts: {
                    reviews: { count: 8, loading: false, error: null },
                },
                items: {
                    reviews: [
                        {
                            id: 201,
                            request_number: 'REQ-ALPHA-1',
                            team: 'Demo Team Alpha',
                            title: 'Team Alpha Request',
                        },
                        { id: 202, request_number: 'REQ-BETA-1', team: 'Demo Team Beta', title: 'Team Beta Request' },
                    ],
                },
            },
        });

        const reviewCard = wrapper.find('[data-testid="card-reviews"]');
        expect(reviewCard.exists()).toBe(true);
        // Displays full count (8) regardless of reviewer being in Team Beta and records from Team Alpha
        expect(reviewCard.text()).toContain('8');
        // Both Team Alpha and Team Beta items are displayed in the short list
        expect(reviewCard.text()).toContain('REQ-ALPHA-1');
        expect(reviewCard.text()).toContain('Demo Team Alpha');
        expect(reviewCard.text()).toContain('REQ-BETA-1');
    });

    // AC4 — dashboard_links_canonical_destinations
    // Create, Review, Approval, History correct href tanpa action mutation.
    it('AC4: dashboard_links_canonical_destinations — links navigate to canonical destinations without action mutations', () => {
        mockPageProps = {
            auth: {
                user: {
                    id: 5,
                    username: 'multi',
                    name: 'Multi Role User',
                    team: { id: 1, name: 'Team Alpha' },
                },
                permissions: [
                    'nscmf.create',
                    'nscmf.draft.edit',
                    'nscmf.review',
                    'nscmf.approve',
                    'nscmf.view',
                    'nscmf.view.history',
                ],
            },
        };

        const wrapper = mount(Index, {
            props: {
                counts: {
                    drafts: { count: 2, loading: false, error: null },
                    revisions: { count: 1, loading: false, error: null },
                    reviews: { count: 3, loading: false, error: null },
                    approvals: { count: 4, loading: false, error: null },
                },
            },
        });

        // Quick Create link
        const createLink = wrapper.find('[data-testid="quick-create-link"]');
        expect(createLink.exists()).toBe(true);
        expect(createLink.attributes('href')).toBe('/nscmf/create');

        // Review queue link
        const reviewLink = wrapper.find('[data-testid="card-reviews"] [data-testid="view-canonical-link"]');
        expect(reviewLink.exists()).toBe(true);
        expect(reviewLink.attributes('href')).toBe('/review');

        // Approval queue link
        const approvalLink = wrapper.find('[data-testid="card-approvals"] [data-testid="view-canonical-link"]');
        expect(approvalLink.exists()).toBe(true);
        expect(approvalLink.attributes('href')).toBe('/approval');

        // History link
        const historyLink = wrapper.find('[data-testid="quick-history-link"]');
        expect(historyLink.exists()).toBe(true);
        expect(historyLink.attributes('href')).toBe('/history');

        // When user has no active team, Quick Create provides friendly notice prerequisite
        mockPageProps = {
            auth: {
                user: {
                    id: 6,
                    username: 'noteam',
                    name: 'No Team User',
                    team: null,
                },
                permissions: ['nscmf.create'],
            },
        };

        const noTeamWrapper = mount(Index, {
            props: {
                counts: {},
            },
        });

        expect(noTeamWrapper.find('[data-testid="team-prerequisite-notice"]').exists()).toBe(true);
        expect(noTeamWrapper.text()).toContain('Active Team prerequisite');
    });
});
