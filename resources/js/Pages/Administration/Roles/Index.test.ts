import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flashDomainError, forms, lastRequest, requests, resetInertia, respondToRequest } from '@/testing/inertia';

import { type PermissionCatalogItem, type RoleRow } from '@/features/administration/RoleManager.vue';

import Index from './Index.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
// Re-authentication is a same-origin JSON endpoint answering 204 (12 §79, §109).
vi.mock('@/lib/http', () => ({ sendJson: vi.fn(() => Promise.resolve({ ok: true, status: 204, body: null })) }));

const permissionCatalog: PermissionCatalogItem[] = [
    { name: 'nscmf.create', group: 'NSCMF' },
    { name: 'nscmf.view', group: 'NSCMF' },
    { name: 'nscmf.review', group: 'Review' },
    { name: 'users.view', group: 'Users', description: 'View users' },
];

const roles: RoleRow[] = [
    { id: 1, name: 'Superadmin', is_protected: true, permissions: permissionCatalog.map((item) => item.name) },
    { id: 2, name: 'Requester', permissions: ['nscmf.create', 'nscmf.view'] },
];

const ALL_ROLE_PERMISSIONS = ['roles.view', 'roles.create', 'roles.update', 'permissions.assign'];

function mountPage(permissions: string[] = ALL_ROLE_PERMISSIONS): VueWrapper {
    resetInertia({ auth: { user: { id: 9, username: 'admin', name: 'Admin' }, permissions } });
    return mount(Index, { props: { roles, permissionCatalog }, attachTo: document.body });
}

async function confirmReauth(wrapper: VueWrapper): Promise<void> {
    await wrapper.get('input[type="password"]').setValue('my-own-password');
    await wrapper.get('[role="dialog"] form').trigger('submit');
    await flushPromises();
}

describe('Role administration (FE-14)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders inside the authenticated shell and lists roles with their permission counts', () => {
        const wrapper = mountPage();

        expect(wrapper.find('#sidebar-navigation').exists()).toBe(true);
        expect(wrapper.get('[data-testid="role-row-2"]').text()).toContain('Requester');
        expect(wrapper.get('[data-testid="role-row-2"]').text()).toContain('2 permissions');
        expect(wrapper.get('[data-testid="role-row-1"]').text()).toContain('Protected');
    });

    it('explains that several roles combine their permissions', () => {
        expect(mountPage().text()).toContain('all of their permissions');
    });

    it('AC1: offers only permissions from the server catalog, grouped, with no archive or wildcard options', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');

        const dialog = wrapper.get('[role="dialog"]');
        const offered = dialog.findAll('input[type="checkbox"]').map((input) => input.attributes('value'));
        expect(offered).toEqual(['nscmf.create', 'nscmf.view', 'nscmf.review', 'users.view']);
        expect(dialog.text()).toContain('Review');
        expect(dialog.text()).not.toContain('roles.archive');
        expect(dialog.text()).not.toContain('*');
        expect(wrapper.find('[data-testid="archive-role-2"]').exists()).toBe(false);
    });

    it('AC2: lets roles.update edit the name but not the permission set', () => {
        const wrapper = mountPage(['roles.view', 'roles.update']);

        expect(wrapper.find('[data-testid="edit-role-2"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="assign-permissions-2"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="create-role-btn"]').exists()).toBe(false);
    });

    it('does not offer editing the protected role', () => {
        const wrapper = mountPage();

        expect(wrapper.find('[data-testid="edit-role-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="assign-permissions-1"]').exists()).toBe(false);
    });

    it('creates a role by name and renames a role with PATCH', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-role-btn"]').trigger('click');
        await wrapper.get('#role-name').setValue('Auditor');
        await wrapper.get('[role="dialog"] form').trigger('submit');
        expect(lastRequest('/administration/roles')).toMatchObject({ method: 'post', data: { name: 'Auditor' } });

        // A real response always finishes, which is what releases the form again.
        await respondToRequest(lastRequest('/administration/roles'), { status: 200 });
        await wrapper.get('[data-testid="edit-role-2"]').trigger('click');
        await wrapper.get('#role-name').setValue('Requester Plus');
        await wrapper.get('[role="dialog"] form').trigger('submit');
        expect(lastRequest('/administration/roles/2')).toMatchObject({
            method: 'patch',
            data: { name: 'Requester Plus' },
        });
    });

    it('shows the role name error from the server next to the field', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-role-btn"]').trigger('click');

        const form = forms.find((candidate) => 'name' in candidate);
        if (!form) throw new Error('role form missing');
        form.errors = { name: 'The name has already been taken.' };
        await nextTick();

        expect(wrapper.get('#role-name-error').text()).toBe('The name has already been taken.');
    });

    it('AC3: saves the permission set only after re-authentication', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');
        await wrapper.get('input[value="nscmf.review"]').setValue(true);
        await wrapper.get('input[value="nscmf.view"]').setValue(false);
        await wrapper.get('[data-testid="save-permissions-btn"]').trigger('click');

        expect(lastRequest('/administration/roles/2/permissions')).toBeUndefined();
        expect(wrapper.get('[role="dialog"]').text()).toContain('signed out');

        await confirmReauth(wrapper);

        expect(lastRequest('/administration/roles/2/permissions')).toMatchObject({
            method: 'put',
            data: { permissions: ['nscmf.create', 'nscmf.review'] },
        });
    });

    it('AC3: does not submit when re-authentication is cancelled and keeps the selection', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');
        await wrapper.get('input[value="users.view"]').setValue(true);
        await wrapper.get('[data-testid="save-permissions-btn"]').trigger('click');
        await wrapper.get('[data-test="cancel-button"]').trigger('click');

        expect(requests).toHaveLength(0);
        expect(wrapper.get<HTMLInputElement>('input[value="users.view"]').element.checked).toBe(true);
    });

    it('AC4: keeps the selection and shows the error when the server rejects a protected resource', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');
        await wrapper.get('input[value="users.view"]').setValue(true);
        await wrapper.get('[data-testid="save-permissions-btn"]').trigger('click');
        await confirmReauth(wrapper);

        await flashDomainError({ code: 'PROTECTED_RESOURCE', message: 'This role is protected.' });

        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.get('[role="alert"]').text()).toBe('This role is protected.');
        expect(wrapper.get<HTMLInputElement>('input[value="users.view"]').element.checked).toBe(true);
    });

    it('asks for the password again when the server reports an expired re-authentication', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');
        await wrapper.get('[data-testid="save-permissions-btn"]').trigger('click');
        await confirmReauth(wrapper);

        await flashDomainError({ code: 'REAUTH_REQUIRED' });

        expect(wrapper.get('[data-testid="reauth-error"]').text()).toContain('Re-authentication is required');
    });

    it('shows an empty state when no roles exist', () => {
        resetInertia({ auth: { permissions: ALL_ROLE_PERMISSIONS } });
        expect(mount(Index, { props: { roles: [], permissionCatalog } }).text()).toContain('No roles yet.');
    });

    it('keeps the permissions dialog open while the save is in flight, then closes it on success', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');
        await wrapper.get('[data-testid="save-permissions-btn"]').trigger('click');
        await confirmReauth(wrapper);

        const form = forms.find((candidate) => 'permissions' in candidate);
        if (!form) throw new Error('permissions form missing');
        form.processing = true;
        await nextTick();

        await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
        expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

        form.processing = false;
        lastRequest('/administration/roles/2/permissions')?.options.onSuccess?.();
        await nextTick();
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('closes the permissions dialog on Escape when nothing is in flight', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');

        await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('falls back to its own wording when a denial carries only a code', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="assign-permissions-2"]').trigger('click');

        await flashDomainError({ code: 'FORBIDDEN' });

        expect(wrapper.get('[role="dialog"]').text()).toContain('The permissions could not be saved.');
    });

    it('shows the in-flight label while a role name is saving', async () => {
        const wrapper = mountPage();
        await wrapper.get('[data-testid="create-role-btn"]').trigger('click');

        const form = forms.find((candidate) => 'name' in candidate);
        if (!form) throw new Error('role name form missing');
        form.processing = true;
        await nextTick();

        expect(wrapper.get('[data-testid="save-role-btn"]').text()).toBe('Saving…');
    });

    it('hides the permissions action without the assign permission', () => {
        resetInertia({ auth: { permissions: ['roles.view'] } });
        const wrapper = mount(Index, { props: { roles, permissionCatalog } });

        expect(wrapper.find('[data-testid="assign-permissions-2"]').exists()).toBe(false);
    });
});
