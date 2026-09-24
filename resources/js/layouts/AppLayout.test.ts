import { Head, Link } from '@inertiajs/vue3';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import AppLayout from './AppLayout.vue';

// Mock Inertia Head, Link, and usePage
const mockPageProps = ref<{
    auth?: {
        user?: {
            id: number;
            username: string;
            name: string;
            team_id?: number | null;
            team?: { id: number; name: string } | null;
            must_change_password?: boolean;
            is_protected_superadmin?: boolean;
        } | null;
        permissions?: string[];
        roles?: string[];
    };
    [key: string]: unknown;
}>({
    auth: {
        user: {
            id: 1,
            username: 'demo.user',
            name: 'Demo User',
            team_id: 1,
            team: { id: 1, name: 'Team Alpha' },
            must_change_password: false,
        },
        permissions: [],
        roles: [],
    },
});

const routerPost = vi.fn();

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent } = await import('vue');

    return {
        router: { post: (...args: unknown[]) => routerPost(...args) },
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: false } },
            setup: () => () => null,
        }),
        Link: defineComponent({
            name: 'InertiaLink',
            props: {
                href: { type: String, required: true },
                as: { type: String, default: 'a' },
            },
            template: '<a :href="href"><slot /></a>',
        }),
        usePage: () => ({
            props: mockPageProps.value,
        }),
    };
});

describe('AppLayout.vue', () => {
    // AC1: shell_uses_permissions_not_roles_or_team
    // role name bukan gate; Reviewer TeamGamma melihat Review untuk TeamAlpha bila permissions ada
    it('AC1: shell_uses_permissions_not_roles_or_team — shows Review navigation based solely on permissions even if role is not Reviewer or team is TeamGamma', () => {
        mockPageProps.value = {
            auth: {
                user: {
                    id: 3,
                    username: 'reviewer.gamma',
                    name: 'Reviewer Gamma',
                    team_id: 3,
                    team: { id: 3, name: 'Team Gamma' },
                    must_change_password: false,
                },
                // No 'Reviewer' role assigned in roles array, but has nscmf.review permission
                roles: ['CustomRole'],
                permissions: ['nscmf.review'],
            },
        };

        const wrapper = mount(AppLayout, {
            props: { title: 'Dashboard' },
            slots: { default: '<div data-testid="page-content">Content</div>' },
        });

        // Should render Review nav link
        const navLinks = wrapper.findAllComponents(Link);
        const navHrefs = navLinks.map((link) => link.props('href'));
        expect(navHrefs).toContain('/review');

        // Should not have Team switcher or authorization scope selector
        expect(wrapper.find('[data-testid="team-switcher"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="reviewer-scope"]').exists()).toBe(false);
    });

    // AC2: shell_combines_multi_role_permissions
    // Review dan Approval tampil bersama tanpa all-powerful bypass
    it('AC2: shell_combines_multi_role_permissions — displays Review and Approval simultaneously when user has both permissions without requiring Superadmin bypass', () => {
        mockPageProps.value = {
            auth: {
                user: {
                    id: 4,
                    username: 'dual.actor',
                    name: 'Dual Actor',
                    team_id: 1,
                    team: { id: 1, name: 'Team Alpha' },
                    must_change_password: false,
                },
                roles: ['Reviewer', 'Approver'],
                permissions: ['nscmf.review', 'nscmf.approve', 'nscmf.create'],
            },
        };

        const wrapper = mount(AppLayout, {
            props: { title: 'Workflow Overview' },
        });

        const navLinks = wrapper.findAllComponents(Link);
        const navHrefs = navLinks.map((link) => link.props('href'));

        // Both review and approval navigation present
        expect(navHrefs).toContain('/review');
        expect(navHrefs).toContain('/approval');
        expect(navHrefs).toContain('/nscmf/create');
        expect(navHrefs).toContain('/dashboard');

        // Superadmin bypass UI (like "All Tenant Access" or wildcard bypass) must not exist
        expect(wrapper.find('[data-testid="superadmin-bypass"]').exists()).toBe(false);
    });

    // AC3: shell_hides_unavailable_navigation
    // revoked permissions memperbarui nav; bukan sekadar cache login awal
    it('AC3: shell_hides_unavailable_navigation — hides navigation items when permissions are absent or revoked', () => {
        // User with no create, review, approval, or admin permissions
        mockPageProps.value = {
            auth: {
                user: {
                    id: 5,
                    username: 'viewer.only',
                    name: 'Viewer Only',
                    team_id: 2,
                    team: { id: 2, name: 'Team Beta' },
                    must_change_password: false,
                },
                roles: ['Auditor'],
                permissions: ['nscmf.view.history'], // only history
            },
        };

        const wrapper = mount(AppLayout, {
            props: { title: 'History' },
        });

        const navLinks = wrapper.findAllComponents(Link);
        const navHrefs = navLinks.map((link) => link.props('href'));

        expect(navHrefs).toContain('/dashboard');
        expect(navHrefs).toContain('/history');
        expect(navHrefs).not.toContain('/nscmf/create');
        expect(navHrefs).not.toContain('/review');
        expect(navHrefs).not.toContain('/approval');
        expect(navHrefs).not.toContain('/administration');
    });

    // Administration links go to the real pages (12 §114); there is no /administration landing route,
    // and audit pages are not part of FE-01..30, so an audit-only user gets no dead link.
    it('links each administration page by its own view permission and never a dead landing page', () => {
        const hrefsFor = (permissions: string[]) => {
            mockPageProps.value = {
                auth: {
                    user: {
                        id: 6,
                        username: 'admin.user',
                        name: 'Admin User',
                        team_id: null,
                        team: null,
                        must_change_password: false,
                    },
                    permissions,
                },
            };
            return mount(AppLayout, { props: { title: 'Administration' } })
                .findAllComponents(Link)
                .map((link) => link.props('href'));
        };

        expect(hrefsFor(['users.view'])).toContain('/administration/users');
        expect(hrefsFor(['roles.view'])).toContain('/administration/roles');
        expect(hrefsFor(['teams.view'])).toContain('/administration/teams');
        expect(hrefsFor(['roles.view', 'teams.view', 'users.view'])).toContain('/administration/setup');
        expect(hrefsFor(['roles.view', 'teams.view'])).not.toContain('/administration/setup');
        expect(hrefsFor(['audit.access.view'])).not.toContain('/administration');
        expect(
            hrefsFor(['audit.access.view']).filter(
                (href) => typeof href === 'string' && href.startsWith('/administration'),
            ),
        ).toEqual(['/administration/audits/access']);
    });

    // 07 §51: the protected Core Setting is only for the Protected Superadmin; holding
    // system.settings.manage alone (for example through a copied Superadmin role) is not enough.
    it('links Technical Logs only for the Protected Superadmin holding the settings permission', () => {
        const hrefsFor = (isProtected: boolean, permissions: string[]) => {
            mockPageProps.value = {
                auth: {
                    user: {
                        id: 1,
                        username: 'admin',
                        name: 'Admin',
                        team_id: null,
                        team: null,
                        must_change_password: false,
                        is_protected_superadmin: isProtected,
                    },
                    permissions,
                },
            };
            return mount(AppLayout, { props: { title: 'Administration' } })
                .findAllComponents(Link)
                .map((link) => link.props('href'));
        };

        expect(hrefsFor(true, ['system.settings.manage'])).toContain('/administration/settings/technical-logs');
        expect(hrefsFor(false, ['system.settings.manage'])).not.toContain('/administration/settings/technical-logs');
        expect(hrefsFor(true, [])).not.toContain('/administration/settings/technical-logs');
    });

    it('signs out with a POST to /logout', async () => {
        routerPost.mockClear();
        mockPageProps.value = {
            auth: {
                user: {
                    id: 7,
                    username: 'demo.user',
                    name: 'Demo User',
                    team_id: 1,
                    team: { id: 1, name: 'Team Alpha' },
                    must_change_password: false,
                },
                permissions: [],
            },
        };
        const wrapper = mount(AppLayout, { props: { title: 'Dashboard' } });

        await wrapper.get('[data-testid="btn-logout"]').trigger('click');

        expect(routerPost).toHaveBeenCalledWith('/logout');
    });

    // AC4: shell_is_keyboard_operable
    // skip link, toggle aria-expanded, focus menu mobile dan title bekerja
    it('AC4: shell_is_keyboard_operable — provides skip link, accessible landmarks, and keyboard operable sidebar toggle', async () => {
        mockPageProps.value = {
            auth: {
                user: {
                    id: 1,
                    username: 'demo.user',
                    name: 'Demo User',
                    team_id: 1,
                    team: { id: 1, name: 'Team Alpha' },
                    must_change_password: false,
                },
                permissions: ['nscmf.create', 'nscmf.review'],
                roles: ['Requester', 'Reviewer'],
            },
        };

        const wrapper = mount(AppLayout, {
            props: { title: 'Dashboard' },
            slots: {
                default: '<p>Main content area</p>',
            },
        });

        // 1. Skip to main content link exists and targets #main-content
        const skipLink = wrapper.find('a[href="#main-content"]');
        expect(skipLink.exists()).toBe(true);
        expect(skipLink.text()).toMatch(/skip to content|skip to main/i);

        // 2. Main content landmark with id="main-content"
        const main = wrapper.find('main#main-content');
        expect(main.exists()).toBe(true);

        // 3. Document title set through Inertia Head
        const head = wrapper.findComponent(Head);
        expect(head.exists()).toBe(true);
        expect(head.props('title')).toBe('Dashboard');

        // 4. Sidebar toggle button with aria-expanded and aria-controls
        const toggleBtn = wrapper.find('[data-testid="sidebar-toggle"]');
        expect(toggleBtn.exists()).toBe(true);
        expect(toggleBtn.attributes('aria-expanded')).toBe('true');

        // Click toggle button collapses sidebar
        await toggleBtn.trigger('click');
        expect(toggleBtn.attributes('aria-expanded')).toBe('false');

        // Click toggle button re-expands sidebar
        await toggleBtn.trigger('click');
        expect(toggleBtn.attributes('aria-expanded')).toBe('true');
    });

    // Detail requirement: Setup/temp-password gate does not show normal shell
    it('guards against displaying normal shell when user must change password', () => {
        mockPageProps.value = {
            auth: {
                user: {
                    id: 9,
                    username: 'temp.user',
                    name: 'Temp User',
                    must_change_password: true,
                },
                permissions: ['nscmf.review'],
                roles: ['Reviewer'],
            },
        };

        const wrapper = mount(AppLayout, {
            props: { title: 'Password Change Required' },
            slots: { default: '<div>Must change password form</div>' },
        });

        // Normal sidebar and nav should not be rendered
        expect(wrapper.find('nav').exists()).toBe(false);
        expect(wrapper.find('[data-testid="sidebar"]').exists()).toBe(false);

        // But slot content is rendered in a minimalist/isolated container
        expect(wrapper.text()).toContain('Must change password form');
    });

    it('shows the page title next to the product name, and only when it adds something', () => {
        mockPageProps.value = {
            auth: {
                user: { id: 1, username: 'demo.requester.a', name: 'Demo Requester A', must_change_password: false },
                permissions: [],
            },
        };

        const titled = mount(AppLayout, { props: { title: 'Dashboard' } });
        expect(titled.get('header').text()).toContain('/ Dashboard');

        const untitled = mount(AppLayout, { props: { title: 'NSCMF' } });
        expect(untitled.get('header').text()).not.toContain('/');
    });
});
