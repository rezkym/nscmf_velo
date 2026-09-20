import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flashDomainError, forms, lastRequest, pageProps, requests, resetInertia } from '@/testing/inertia';

import { type RoleOption, type TeamOption, type UserRow } from '@/features/administration/UserManager.vue';

import Index from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const teams: TeamOption[] = [
    { id: 1, name: 'Demo Team Alpha' },
    { id: 2, name: 'Demo Team Beta' },
];

const roles: RoleOption[] = [
    { id: 1, name: 'Superadmin', is_protected: true },
    { id: 2, name: 'Requester' },
    { id: 3, name: 'Reviewer' },
];

const users: UserRow[] = [
    {
        id: 1,
        name: 'Protected Superadmin',
        username: 'superadmin',
        team_id: null,
        team_name: null,
        is_active: true,
        is_protected_superadmin: true,
        roles: [{ id: 1, name: 'Superadmin' }],
    },
    {
        id: 2,
        name: 'Demo Requester A',
        username: 'demo.requester.a',
        team_id: 1,
        team_name: 'Demo Team Alpha',
        is_active: true,
        is_protected_superadmin: false,
        roles: [{ id: 2, name: 'Requester' }],
    },
    {
        id: 3,
        name: 'Demo Disabled User',
        username: 'demo.disabled',
        team_id: 2,
        team_name: 'Demo Team Beta',
        is_active: false,
        is_protected_superadmin: false,
        roles: [],
    },
];

const ALL_USER_PERMISSIONS = [
    'users.view',
    'users.create',
    'users.update',
    'users.enable',
    'users.disable',
    'users.reset_password',
    'users.assign_roles',
    'users.assign_team',
];

function mountPage(permissions: string[] = ALL_USER_PERMISSIONS): VueWrapper {
    resetInertia({ auth: { user: { id: 9, username: 'admin', name: 'Admin' }, permissions } });
    return mount(Index, { props: { users, teams, roles }, attachTo: document.body });
}

/** The single-field dialog form, told apart from the create form, which carries every field. */
function dialogForm(field: string) {
    const form = forms.find((candidate) => field in candidate && !('username' in candidate));
    if (!form) throw new Error(`no dialog form with field ${field}`);
    return form;
}

function formWith(field: string) {
    const form = forms.find((candidate) => field in candidate);
    if (!form) throw new Error(`no form with field ${field}`);
    return form;
}

/** Fills and submits the re-authentication dialog, then simulates the server accepting it. */
async function confirmReauth(wrapper: VueWrapper): Promise<void> {
    await wrapper.get('input[type="password"]').setValue('my-own-password');
    await wrapper.get('[role="dialog"] form').trigger('submit');
    lastRequest('/account/re-authenticate')?.options.onSuccess?.();
    await nextTick();
}

describe('User administration (FE-12)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders inside the authenticated shell with team, roles and status per user', () => {
        const wrapper = mountPage();

        expect(wrapper.find('#sidebar-navigation').exists()).toBe(true);
        expect(wrapper.get('[data-testid="user-row-2"]').text()).toContain('demo.requester.a');
        expect(wrapper.get('[data-testid="user-row-2"]').text()).toContain('Demo Team Alpha');
        expect(wrapper.get('[data-testid="user-row-2"]').text()).toContain('Requester');
        expect(wrapper.get('[data-testid="user-row-3"]').text()).toContain('Disabled');
        expect(wrapper.get('[data-testid="user-row-3"]').text()).toContain('No roles');
    });

    it('AC3: marks the protected superadmin, accepts a null team and offers no downgrade or disable actions', () => {
        const wrapper = mountPage();
        const row = wrapper.get('[data-testid="user-row-1"]');

        expect(row.text()).toContain('Protected');
        expect(row.text()).toContain('No team');
        expect(wrapper.find('[data-testid="btn-edit-roles-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-disable-user-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-reset-password-1"]').exists()).toBe(false);
    });

    it('AC2: shows each action only with its own permission, regardless of role names', () => {
        const wrapper = mountPage(['users.view', 'users.update']);

        expect(wrapper.find('[data-testid="btn-create-user"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-edit-profile-2"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="btn-edit-roles-2"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-edit-team-2"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-disable-user-2"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-enable-user-3"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-reset-password-2"]').exists()).toBe(false);
    });

    it('AC1: creates a user with only name, username, team and roles after re-authentication, then reveals the credential once', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-create-user"]').trigger('click');

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.find('input[type="password"]').exists()).toBe(false);
        await dialog.get('#user-name').setValue('Demo Reviewer');
        await dialog.get('#user-username').setValue('demo.reviewer');
        await dialog.get('#user-team').setValue('2');
        await dialog.get('[data-testid="create-role-option-3"] input').setValue(true);
        await dialog.get('form').trigger('submit');

        expect(lastRequest('/administration/users')).toBeUndefined();
        expect(wrapper.get('[role="dialog"]').text()).toContain('Confirm user creation');

        await confirmReauth(wrapper);

        const request = lastRequest('/administration/users');
        expect(request).toMatchObject({
            method: 'post',
            data: { name: 'Demo Reviewer', username: 'demo.reviewer', team_id: 2, role_ids: [3] },
        });

        pageProps.flash = { temporary_password: 'test-only-secret', username: 'demo.reviewer' };
        request?.options.onSuccess?.();
        await nextTick();

        expect(wrapper.get('[data-testid="temporary-password-display"]').text()).toBe('test-only-secret');

        await wrapper.get('[data-testid="btn-dismiss-credential"]').trigger('click');
        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('test-only-secret');
    });

    it('AC1: edits only the profile name with PATCH and no protected fields', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-edit-profile-2"]').trigger('click');
        await wrapper.get('#profile-name').setValue('Demo Requester A2');
        await wrapper.get('[role="dialog"] form').trigger('submit');

        const request = lastRequest('/administration/users/2');
        expect(request?.method).toBe('patch');
        expect(request?.data).toEqual({ name: 'Demo Requester A2' });
    });

    it('AC4: changes the team without re-authentication and without claiming an access change', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-edit-team-2"]').trigger('click');

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.text()).toContain('does not change permissions');
        expect(dialog.text()).not.toContain('session');

        await dialog.get('#user-team-assignment').setValue('2');
        await dialog.get('form').trigger('submit');

        expect(lastRequest('/administration/users/2/team')).toMatchObject({ method: 'put', data: { team_id: 2 } });
        expect(lastRequest('/account/re-authenticate')).toBeUndefined();
    });

    it('AC4: replaces roles only after re-authentication and explains session revocation', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-edit-roles-2"]').trigger('click');
        await wrapper.get('[data-testid="role-option-3"] input').setValue(true);
        await wrapper.get('[data-testid="btn-save-roles"]').trigger('click');

        expect(lastRequest('/administration/users/2/roles')).toBeUndefined();
        expect(wrapper.get('[role="dialog"]').text()).toContain('signed out');

        await confirmReauth(wrapper);

        expect(lastRequest('/administration/users/2/roles')).toMatchObject({
            method: 'put',
            data: { role_ids: [2, 3] },
        });
    });

    it('AC4: disables a user after re-authentication', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-disable-user-2"]').trigger('click');
        expect(lastRequest('/administration/users/2/disable')).toBeUndefined();

        await confirmReauth(wrapper);

        expect(lastRequest('/administration/users/2/disable')?.method).toBe('post');
    });

    it('enables a disabled user directly', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-enable-user-3"]').trigger('click');

        expect(lastRequest('/administration/users/3/enable')?.method).toBe('post');
    });

    it('AC4: resets a password after re-authentication and reveals the new credential for that user', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-reset-password-2"]').trigger('click');
        await confirmReauth(wrapper);

        const request = lastRequest('/administration/users/2/reset-password');
        expect(request?.method).toBe('post');

        pageProps.flash = { temporary_password: 'test-only-reset' };
        request?.options.onSuccess?.();
        await nextTick();

        expect(wrapper.get('[data-testid="temporary-password-display"]').text()).toBe('test-only-reset');
        expect(wrapper.get('[role="dialog"]').text()).toContain('demo.requester.a');
    });

    it('does not send the sensitive request when re-authentication is cancelled', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-reset-password-2"]').trigger('click');
        await wrapper.get('[data-test="cancel-button"]').trigger('click');

        expect(requests).toHaveLength(0);
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('asks for the password again when the server reports an expired re-authentication', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-disable-user-2"]').trigger('click');
        await confirmReauth(wrapper);

        await flashDomainError({ code: 'REAUTH_REQUIRED' });

        expect(wrapper.get('[data-testid="reauth-error"]').text()).toContain('Re-authentication is required');
    });

    it('AC3: shows a server denial for a sensitive action without claiming success', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-disable-user-2"]').trigger('click');
        await confirmReauth(wrapper);

        await flashDomainError({ code: 'PROTECTED_RESOURCE', message: 'Protected identity cannot be changed.' });

        expect(wrapper.get('[data-testid="users-server-error"]').text()).toBe('Protected identity cannot be changed.');
    });

    it('shows create-form field errors from the server next to the fields', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-create-user"]').trigger('click');

        formWith('username').errors = { username: 'The username has already been taken.' };
        await nextTick();

        expect(wrapper.get('#user-username-error').text()).toBe('The username has already been taken.');
    });

    it('shows an empty state when there are no users', () => {
        resetInertia({ auth: { permissions: ALL_USER_PERMISSIONS } });
        const wrapper = mount(Index, { props: { users: [], teams, roles } });

        expect(wrapper.text()).toContain('No users yet.');
    });

    it('closes the roles dialog once the server accepts the change', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-edit-roles-2"]').trigger('click');
        await wrapper.get('[data-testid="btn-save-roles"]').trigger('click');
        await confirmReauth(wrapper);

        lastRequest('/administration/users/2/roles')?.options.onSuccess?.();
        await nextTick();

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('shows a flashed denial inside the open dialog, not on the page behind it', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-create-user"]').trigger('click');

        await flashDomainError({ code: 'FORBIDDEN', message: 'You may not create users.' });

        expect(wrapper.get('[role="dialog"]').text()).toContain('You may not create users.');
        expect(wrapper.find('[data-testid="users-server-error"]').exists()).toBe(false);
    });

    it('shows a flashed denial inside the roles dialog', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="btn-edit-roles-2"]').trigger('click');

        await flashDomainError({ code: 'PROTECTED_RESOURCE', message: 'This role cannot be removed.' });

        expect(wrapper.get('[role="dialog"]').text()).toContain('This role cannot be removed.');
    });

    it('falls back to its own wording when a denial carries only a code', async () => {
        const wrapper = mountPage();

        await flashDomainError({ code: 'FORBIDDEN' });

        expect(wrapper.get('[data-testid="users-server-error"]').text()).toBe('The action could not be completed.');
    });

    it('shows the role field error and the in-flight labels of every dialog', async () => {
        const wrapper = mountPage();

        await wrapper.get('[data-testid="btn-create-user"]').trigger('click');
        const createForm = formWith('username');
        createForm.errors = { role_ids: 'Select at least one role.' };
        createForm.processing = true;
        await nextTick();
        expect(wrapper.get('[role="dialog"]').text()).toContain('Select at least one role.');
        expect(wrapper.get('[data-testid="btn-submit-create-user"]').text()).toBe('Creating…');

        await wrapper.get('[data-testid="btn-edit-profile-2"]').trigger('click');
        dialogForm('name').processing = true;
        await nextTick();
        expect(wrapper.get('[role="dialog"]').text()).toContain('Saving…');

        await wrapper.get('[data-testid="btn-edit-team-2"]').trigger('click');
        dialogForm('team_id').processing = true;
        await nextTick();
        expect(wrapper.get('[role="dialog"]').text()).toContain('Saving…');

        await wrapper.get('[data-testid="btn-edit-roles-2"]').trigger('click');
        const rolesForm = dialogForm('role_ids');
        rolesForm.errors = { role_ids: 'Select at least one role.' };
        rolesForm.processing = true;
        await nextTick();
        expect(wrapper.get('[role="dialog"]').text()).toContain('Select at least one role.');
        expect(wrapper.get('[data-testid="btn-save-roles"]').text()).toBe('Saving…');
    });
});
