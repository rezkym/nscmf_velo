import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lastRequest, pageProps, requests, resetInertia } from '@/testing/inertia';

import Setup, { type SetupReadiness } from './Setup.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const NOTHING_CONFIGURED: SetupReadiness = {
    roles_configured: false,
    teams_configured: false,
    users_configured: false,
    setup_completed: false,
    signing_ready: false,
};

const SUPERADMIN_PERMISSIONS = [
    'roles.view',
    'roles.create',
    'roles.update',
    'permissions.assign',
    'teams.view',
    'teams.create',
    'users.view',
    'users.create',
];

const roles = [
    { id: 1, name: 'Superadmin', is_protected: true, permissions: ['users.view'] },
    { id: 2, name: 'Requester', permissions: ['nscmf.create'] },
];

function mountSetup(readiness: Partial<SetupReadiness> = {}): VueWrapper {
    resetInertia({ auth: { user: { id: 1, username: 'superadmin', name: 'Admin' }, permissions: SUPERADMIN_PERMISSIONS } });
    return mount(Setup, {
        props: {
            readiness: { ...NOTHING_CONFIGURED, ...readiness },
            roles,
            teams: [{ id: 1, name: 'Demo Team Alpha', is_active: true }],
            users: [],
            permissionCatalog: [{ name: 'users.view', group: 'Users' }],
        },
        attachTo: document.body,
    });
}

function stepTitles(wrapper: VueWrapper): string[] {
    return wrapper.findAll('[data-testid="stepper-step"]').map((step) => step.text());
}

describe('Initial setup wizard (FE-15)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('AC1: has exactly the four supported steps and no scope or personal-signature setup', () => {
        const wrapper = mountSetup();

        expect(stepTitles(wrapper)).toEqual(['1Role setup', '2Team setup', '3Users and roles', '4Complete']);
        const text = wrapper.text().toLowerCase();
        for (const forbidden of ['unit', 'division', 'scope', 'signature upload']) {
            expect(text).not.toContain(forbidden);
        }
        expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    });

    it('AC4: resumes at the first step the server reports as not configured', () => {
        expect(mountSetup().get('[aria-current="step"]').text()).toContain('Role setup');
        expect(mountSetup({ roles_configured: true }).get('[aria-current="step"]').text()).toContain('Team setup');
        expect(
            mountSetup({ roles_configured: true, teams_configured: true }).get('[aria-current="step"]').text(),
        ).toContain('Users and roles');
        expect(mountSetup({ setup_completed: true }).get('[aria-current="step"]').text()).toContain('Complete');
    });

    it('AC2: only moves forward once the server reports the current step as configured', async () => {
        const wrapper = mountSetup();
        expect(wrapper.get('[data-testid="btn-next-step"]').attributes('disabled')).toBeDefined();

        await wrapper.setProps({ readiness: { ...NOTHING_CONFIGURED, roles_configured: true } });
        await wrapper.get('[data-testid="btn-next-step"]').trigger('click');
        expect(wrapper.get('[aria-current="step"]').text()).toContain('Team setup');

        await wrapper.get('[data-testid="btn-prev-step"]').trigger('click');
        expect(wrapper.get('[aria-current="step"]').text()).toContain('Role setup');
    });

    it('AC2: moves back when the server no longer reports an earlier step as configured', async () => {
        const wrapper = mountSetup({ roles_configured: true, teams_configured: true });

        await wrapper.setProps({ readiness: { ...NOTHING_CONFIGURED, roles_configured: true } });
        await nextTick();

        expect(wrapper.get('[aria-current="step"]').text()).toContain('Team setup');
    });

    it('role setup offers the provided default roles or manual configuration without an invented template endpoint', async () => {
        const wrapper = mountSetup();

        expect(wrapper.get('[data-testid="default-roles"]').text()).toContain('Requester');
        expect(wrapper.find('[data-testid="create-role-btn"]').exists()).toBe(false);

        await wrapper.get('[data-testid="role-mode-manual"]').setValue(true);
        expect(wrapper.find('[data-testid="create-role-btn"]').exists()).toBe(true);
        expect(requests).toHaveLength(0);
    });

    it('reuses the team and user administration forms in their steps', () => {
        expect(mountSetup({ roles_configured: true }).find('[data-testid="create-team-btn"]').exists()).toBe(true);
        expect(
            mountSetup({ roles_configured: true, teams_configured: true }).find('[data-testid="btn-create-user"]').exists(),
        ).toBe(true);
    });

    it('AC3: does not keep a revealed temporary password in the wizard after it is dismissed', async () => {
        const wrapper = mountSetup({ roles_configured: true, teams_configured: true });
        await wrapper.get('[data-testid="btn-create-user"]').trigger('click');
        await wrapper.get('#user-name').setValue('Demo Reviewer');
        await wrapper.get('#user-username').setValue('demo.reviewer');
        await wrapper.get('[role="dialog"] form').trigger('submit');
        await wrapper.get('input[type="password"]').setValue('my-own-password');
        await wrapper.get('[role="dialog"] form').trigger('submit');
        lastRequest('/account/re-authenticate')?.options.onSuccess?.();
        await nextTick();

        pageProps.flash = { temporary_password: 'test-only-secret' };
        lastRequest('/administration/users')?.options.onSuccess?.();
        await nextTick();
        await wrapper.get('[data-testid="btn-dismiss-credential"]').trigger('click');

        await wrapper.setProps({
            readiness: { ...NOTHING_CONFIGURED, roles_configured: true, teams_configured: true, users_configured: true },
        });
        await wrapper.get('[data-testid="btn-next-step"]').trigger('click');
        expect(wrapper.text()).not.toContain('test-only-secret');
    });

    it('complete step summarises server readiness, including signing, in plain English', () => {
        const wrapper = mountSetup({ roles_configured: true, teams_configured: true, users_configured: true });
        const summary = wrapper.get('[data-testid="step-complete"]');

        expect(summary.get('[data-testid="readiness-roles"]').text()).toContain('Done');
        expect(summary.get('[data-testid="signing-readiness-status"]').text()).toContain('Not configured');
    });

    it('AC2: offers the dashboard only after the server marks setup completed, without a completion request', async () => {
        const wrapper = mountSetup({ roles_configured: true, teams_configured: true, users_configured: true });
        expect(wrapper.find('[data-testid="btn-go-dashboard"]').exists()).toBe(false);

        await wrapper.setProps({
            readiness: {
                roles_configured: true,
                teams_configured: true,
                users_configured: true,
                setup_completed: true,
                signing_ready: true,
            },
        });

        expect(wrapper.get('[data-testid="btn-go-dashboard"]').attributes('href')).toBe('/dashboard');
        expect(wrapper.get('[data-testid="signing-readiness-status"]').text()).toContain('Ready');
        expect(requests).toHaveLength(0);
    });
});
