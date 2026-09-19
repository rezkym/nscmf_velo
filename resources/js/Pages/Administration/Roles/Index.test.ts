import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

import Index, { type RoleItem } from './Index.vue';

interface MockForm<T = Record<string, unknown>> {
    name?: string;
    permissions?: string[];
    current_password?: string;
    data: T;
    processing: boolean;
    errors: Record<string, string>;
    hasErrors: boolean;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    clearErrors: ReturnType<typeof vi.fn>;
}

let activeMetadataForm: MockForm | null = null;
let activePermissionsForm: MockForm | null = null;
let activeReauthForm: MockForm | null = null;

const { mockRouter } = vi.hoisted(() => {
    return {
        mockRouter: {
            get: vi.fn(),
            post: vi.fn(),
            patch: vi.fn(),
            put: vi.fn(),
        },
    };
});

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent } = await import('vue');

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
                (_props, { slots }) =>
                () =>
                    slots.default ? slots.default() : null,
        }),
        router: mockRouter,
        useForm: vi.fn((initialData: Record<string, unknown>) => {
            const formInstance = reactive({
                ...initialData,
                data: initialData,
                processing: false,
                errors: {},
                hasErrors: false,
                post: vi.fn(),
                patch: vi.fn(),
                put: vi.fn(),
                reset: vi.fn(),
                clearErrors: vi.fn(),
            });
            if ('permissions' in initialData) {
                activePermissionsForm = formInstance;
            } else if ('current_password' in initialData) {
                activeReauthForm = formInstance;
            } else {
                activeMetadataForm = formInstance;
            }
            return formInstance;
        }),
    };
});

const defaultRoles = [
    {
        id: 1,
        name: 'Superadmin',
        is_protected: true,
        permissions: [
            'nscmf.create',
            'nscmf.draft.edit',
            'nscmf.submit',
            'nscmf.cancel',
            'nscmf.change.result.edit',
            'nscmf.view',
            'nscmf.view.history',
            'nscmf.attachment.manage',
            'nscmf.export',
            'nscmf.export.bulk',
            'nscmf.timeline.view',
            'nscmf.review',
            'nscmf.review.forward',
            'nscmf.review.return',
            'nscmf.review.reject',
            'nscmf.approve',
            'nscmf.approval.return_reviewer',
            'nscmf.approval.return_requester',
            'nscmf.approval.reject',
            'nscmf.reopen',
            'nscmf.archive',
            'users.view',
            'users.create',
            'users.update',
            'users.enable',
            'users.disable',
            'users.reset_password',
            'users.assign_roles',
            'users.assign_team',
            'roles.view',
            'roles.create',
            'roles.update',
            'permissions.assign',
            'teams.view',
            'teams.create',
            'teams.update',
            'teams.archive',
            'teams.assign_users',
            'system.settings.manage',
            'audit.access.view',
            'audit.security.view',
        ],
    },
    {
        id: 2,
        name: 'Requester',
        is_protected: false,
        permissions: [
            'nscmf.create',
            'nscmf.view',
            'nscmf.view.history',
            'nscmf.draft.edit',
            'nscmf.submit',
            'nscmf.cancel',
            'nscmf.change.result.edit',
            'nscmf.attachment.manage',
            'nscmf.timeline.view',
            'nscmf.export',
            'nscmf.export.bulk',
        ],
    },
    {
        id: 3,
        name: 'Reviewer',
        is_protected: false,
        permissions: [
            'nscmf.view',
            'nscmf.view.history',
            'nscmf.review',
            'nscmf.review.forward',
            'nscmf.review.return',
            'nscmf.review.reject',
            'nscmf.timeline.view',
            'nscmf.export',
            'nscmf.export.bulk',
        ],
    },
    {
        id: 4,
        name: 'Approver',
        is_protected: false,
        permissions: [
            'nscmf.view',
            'nscmf.view.history',
            'nscmf.approve',
            'nscmf.approval.return_reviewer',
            'nscmf.approval.return_requester',
            'nscmf.approval.reject',
            'nscmf.timeline.view',
            'nscmf.export',
            'nscmf.export.bulk',
        ],
    },
];

const canonicalPermissions = [
    { name: 'nscmf.create', group: 'NSCMF Core', description: 'Create new NSCMF record' },
    { name: 'nscmf.draft.edit', group: 'NSCMF Core', description: 'Edit eligible Draft/Revision' },
    { name: 'nscmf.submit', group: 'NSCMF Core', description: 'Submit eligible record' },
    { name: 'nscmf.cancel', group: 'NSCMF Core', description: 'Cancel eligible Draft' },
    { name: 'nscmf.change.result.edit', group: 'NSCMF Core', description: 'Edit Change Result' },
    { name: 'nscmf.view', group: 'NSCMF Core', description: 'View authorized records' },
    { name: 'nscmf.view.history', group: 'NSCMF Core', description: 'View record history' },
    { name: 'nscmf.attachment.manage', group: 'NSCMF Core', description: 'Manage attachments' },
    { name: 'nscmf.export', group: 'NSCMF Core', description: 'Export authorized record' },
    { name: 'nscmf.export.bulk', group: 'NSCMF Core', description: 'Bulk export authorized records' },
    { name: 'nscmf.timeline.view', group: 'NSCMF Core', description: 'View Business Timeline' },
    { name: 'nscmf.review', group: 'Review', description: 'Review eligible record' },
    { name: 'nscmf.review.forward', group: 'Review', description: 'Forward review' },
    { name: 'nscmf.review.return', group: 'Review', description: 'Return review' },
    { name: 'nscmf.review.reject', group: 'Review', description: 'Reject in review' },
    { name: 'nscmf.approve', group: 'Approval', description: 'Approve eligible record' },
    { name: 'nscmf.approval.return_reviewer', group: 'Approval', description: 'Return to Reviewer' },
    { name: 'nscmf.approval.return_requester', group: 'Approval', description: 'Return to Requester' },
    { name: 'nscmf.approval.reject', group: 'Approval', description: 'Reject in approval' },
    { name: 'nscmf.reopen', group: 'Lifecycle', description: 'Reopen eligible record' },
    { name: 'nscmf.archive', group: 'Lifecycle', description: 'Archive/unarchive record' },
    { name: 'users.view', group: 'User Administration', description: 'View users' },
    { name: 'users.create', group: 'User Administration', description: 'Create users' },
    { name: 'users.update', group: 'User Administration', description: 'Update users' },
    { name: 'users.enable', group: 'User Administration', description: 'Enable users' },
    { name: 'users.disable', group: 'User Administration', description: 'Disable users' },
    { name: 'users.reset_password', group: 'User Administration', description: 'Reset user password' },
    { name: 'users.assign_roles', group: 'User Administration', description: 'Assign roles to user' },
    { name: 'users.assign_team', group: 'User Administration', description: 'Assign team to user' },
    { name: 'roles.view', group: 'Role Administration', description: 'View roles' },
    { name: 'roles.create', group: 'Role Administration', description: 'Create roles' },
    { name: 'roles.update', group: 'Role Administration', description: 'Update roles' },
    { name: 'permissions.assign', group: 'Role Administration', description: 'Assign permissions to role' },
    { name: 'teams.view', group: 'Team Administration', description: 'View teams' },
    { name: 'teams.create', group: 'Team Administration', description: 'Create teams' },
    { name: 'teams.update', group: 'Team Administration', description: 'Update teams' },
    { name: 'teams.archive', group: 'Team Administration', description: 'Archive teams' },
    { name: 'teams.assign_users', group: 'Team Administration', description: 'Assign users to team' },
    { name: 'system.settings.manage', group: 'Core Settings', description: 'Manage core system settings' },
    { name: 'audit.access.view', group: 'Privileged Audit', description: 'View access audits' },
    { name: 'audit.security.view', group: 'Privileged Audit', description: 'View security audits' },
];

describe('Index.vue (FE-14: Role and Permission Administration)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeMetadataForm = null;
        activePermissionsForm = null;
        activeReauthForm = null;
    });

    it('AC1: roles_use_catalog_not_invented_permissions — tidak ada session.login/roles.archive/wildcard scope', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.create', 'roles.update', 'permissions.assign'],
            },
        });

        // Verify catalog items rendered in grouped permission selector or inspection
        expect(wrapper.text()).toContain('Role and Permission Administration');

        // Open permission selector for custom/editable role
        const openAssignBtn = wrapper.find('[data-testid="assign-permissions-2"]');
        expect(openAssignBtn.exists()).toBe(true);
        await openAssignBtn.trigger('click');

        // Check rendered permission names in dialog/modal
        const pageText = wrapper.text();
        expect(pageText).not.toContain('session.login');
        expect(pageText).not.toContain('session.logout');
        expect(pageText).not.toContain('roles.archive');
        expect(pageText).not.toContain('*');
        expect(pageText).not.toContain('wildcard');

        // Check multi-role union explanation exists
        expect(pageText).toContain('union across assigned roles');
    });

    it('AC2: roles_separate_edit_and_assign — roles.update tanpa permissions.assign dapat ubah metadata tetapi tidak permission set', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.update'], // lacks permissions.assign
            },
        });

        // Edit metadata button must exist for custom/editable role
        const editMetadataBtn = wrapper.find('[data-testid="edit-role-2"]');
        expect(editMetadataBtn.exists()).toBe(true);

        // But assign-permissions button must NOT be available without permissions.assign
        const assignPermsBtn = wrapper.find('[data-testid="assign-permissions-2"]');
        expect(assignPermsBtn.exists()).toBe(false);

        // Open edit metadata modal
        await editMetadataBtn.trigger('click');
        const vm = wrapper.vm as unknown as {
            isMetadataModalOpen: boolean;
            submitMetadataForm: () => void;
            serverErrorCode: string | null;
            serverErrorMessage: string | null;
        };
        expect(vm.isMetadataModalOpen).toBe(true);

        vm.submitMetadataForm();
        expect(activeMetadataForm?.patch).toHaveBeenCalledWith('/administration/roles/2', expect.any(Object));
    });

    it('AC3: roles_require_explicit_sensitive_confirmation — permission change memakai reauth flow dan tidak submit saat cancel', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.update', 'permissions.assign'],
            },
        });

        // Open permission assignment modal for Requester (id: 2)
        const openAssignBtn = wrapper.find('[data-testid="assign-permissions-2"]');
        await openAssignBtn.trigger('click');

        // Toggle a permission
        const permCheckbox = wrapper.find('[data-testid="perm-checkbox-nscmf.reopen"]');
        expect(permCheckbox.exists()).toBe(true);
        await permCheckbox.setValue(true);

        // Click Save Permissions -> Should trigger ReauthenticationDialog rather than directly submitting PUT
        const savePermsBtn = wrapper.find('[data-testid="save-permissions-btn"]');
        await savePermsBtn.trigger('click');

        // Reauth dialog should be open and require current password
        const passwordInput = wrapper.find<HTMLInputElement>('input[type="password"]');
        expect(passwordInput.exists()).toBe(true);
        expect(passwordInput.attributes('name')).toBe('current_password');

        // Verify ReauthenticationDialog title/context is displayed
        expect(wrapper.text()).toContain('Confirm Sensitive Action');

        // PUT request and reauth POST must NOT have been called yet
        expect(activePermissionsForm?.put).not.toHaveBeenCalled();
        expect(activeReauthForm?.post).not.toHaveBeenCalled();

        // Cancel reauth
        const cancelReauthBtn = wrapper.find('[data-test="cancel-button"]');
        expect(cancelReauthBtn.exists()).toBe(true);
        await cancelReauthBtn.trigger('click');

        // Still not called
        expect(activePermissionsForm?.put).not.toHaveBeenCalled();
        expect(activeReauthForm?.post).not.toHaveBeenCalled();

        // Trigger save again
        await savePermsBtn.trigger('click');

        // Confirming without password must NOT dispatch PUT or succeed
        const confirmBtn = wrapper.find('[data-test="confirm-button"]');
        expect(confirmBtn.exists()).toBe(true);
        // With empty password, button should be disabled
        expect(confirmBtn.attributes('disabled')).toBeDefined();

        // Fill password and submit reauth form
        await wrapper.find<HTMLInputElement>('input[type="password"]').setValue('SecretPassword123');
        const reauthFormEl = wrapper.find('input[type="password"]').element.closest('form');
        expect(reauthFormEl).not.toBeNull();
        await wrapper.findComponent({ name: 'ReauthenticationDialog' }).find('form').trigger('submit.prevent');

        // POST /account/re-authenticate must be called
        expect(activeReauthForm?.post).toHaveBeenCalledWith('/account/re-authenticate', expect.any(Object));

        // PUT request must STILL be withheld until reauth POST succeeds
        expect(activePermissionsForm?.put).not.toHaveBeenCalled();

        // Simulate reauth POST failure callback (re-auth GAGAL) -> PUT request must STILL be withheld
        const postCalls = activeReauthForm?.post.mock.calls;
        const lastPostCall = postCalls?.[postCalls.length - 1];
        const postOptions = lastPostCall?.[1] as { onSuccess?: () => void; onError?: (errs?: unknown) => void };
        postOptions.onError?.({ current_password: 'Password incorrect' });
        await wrapper.vm.$nextTick();

        // Invariant: PUT /administration/roles/2/permissions must NOT be called on failure
        expect(activePermissionsForm?.put).not.toHaveBeenCalled();

        // Now simulate reauth POST success callback
        postOptions.onSuccess?.();
        await wrapper.vm.$nextTick();

        // Now PUT /administration/roles/2/permissions should be called with selected permissions
        expect(activePermissionsForm?.put).toHaveBeenCalledWith(
            '/administration/roles/2/permissions',
            expect.any(Object),
        );
    });

    it('AC4: roles_handle_protected_resource — PROTECTED_RESOURCE menjaga selection dan menampilkan error, tidak sukses optimistik', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.update', 'permissions.assign'],
            },
        });

        // Superadmin is protected
        const superadminRow = wrapper.find('[data-testid="role-row-1"]');
        expect(superadminRow.text()).toContain('Protected');

        // Attempting to edit Superadmin permissions should show protected warning/disabled
        const editSuperadminPerms = wrapper.find('[data-testid="assign-permissions-1"]');
        expect(editSuperadminPerms.attributes('disabled')).toBeDefined();

        // If a server response returns error envelope with code PROTECTED_RESOURCE for a role
        const openAssignBtn = wrapper.find('[data-testid="assign-permissions-2"]');
        await openAssignBtn.trigger('click');

        const vm = wrapper.vm as unknown as {
            serverErrorCode: string | null;
            serverErrorMessage: string | null;
            isReauthDialogOpen: boolean;
            handleReauthSuccess: () => void;
        };

        // 1. Simulate server error response with code PROTECTED_RESOURCE via onError callback
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    error_code: 'PROTECTED_RESOURCE',
                    message: 'This role or permission bundle is protected from modification.',
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();

        // Verify onError callback populated serverErrorCode and serverErrorMessage
        expect(vm.serverErrorCode).toBe('PROTECTED_RESOURCE');
        expect(vm.serverErrorMessage).toBe('This role or permission bundle is protected from modification.');

        // Check error display near modal
        expect(wrapper.text()).toContain('This role or permission bundle is protected from modification.');
        // Modal must not close optimistically
        expect(wrapper.find('[data-testid="permissions-modal"]').exists()).toBe(true);

        // Fail-safe handling for server error codes:
        // 2. REAUTH_REQUIRED via onError callback opens reauth dialog and passes error
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    error_code: 'REAUTH_REQUIRED',
                    message: 'Re-authentication is required to perform this action.',
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorCode).toBe('REAUTH_REQUIRED');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(wrapper.text()).toContain('Re-authentication is required to perform this action.');

        // 3. REAUTH_FAILED via onError callback opens reauth dialog and passes error
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    error_code: 'REAUTH_FAILED',
                    message: 'Re-authentication failed. Please check your password.',
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorCode).toBe('REAUTH_FAILED');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(wrapper.text()).toContain('Re-authentication failed. Please check your password.');

        // 4. Default message fallback when message is omitted
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    code: 'FORBIDDEN',
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorCode).toBe('FORBIDDEN');
        expect(vm.serverErrorMessage).toBe('Server rejected permission update.');

        // 5. Test array message and array permissions handling
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    message: ['Error msg 1', 'Error msg 2'],
                    permissions: ['perm 1', 'perm 2'],
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorMessage).toBe('Error msg 1, Error msg 2');

        // 6. Test array permissions and no message
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({
                    permissions: ['perm A', 'perm B'],
                });
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorMessage).toBe('perm A, perm B');

        // 7. Test null/undefined error envelope fallback
        vi.spyOn(activePermissionsForm!, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs?: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError();
            }
        });

        vm.handleReauthSuccess();
        await wrapper.vm.$nextTick();
        expect(vm.serverErrorMessage).toBe('Server rejected permission update.');
        expect(vm.serverErrorCode).toBe('DENIED');
    });

    it('covers role creation, modal closures, and toggling logic', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.create', 'roles.update', 'permissions.assign'],
            },
        });

        const vm = wrapper.vm as unknown as {
            openCreateModal: () => void;
            closeMetadataModal: () => void;
            closePermissionsModal: () => void;
            submitMetadataForm: () => void;
            togglePermission: (name: string) => void;
            selectedPermissions: string[];
            openAssignPermissionsModal: (role: RoleItem) => void;
        };

        // Open create modal
        const createBtn = wrapper.find('[data-testid="create-role-btn"]');
        expect(createBtn.exists()).toBe(true);
        await createBtn.trigger('click');

        // Submit new role creation
        vm.submitMetadataForm();
        expect(activeMetadataForm?.post).toHaveBeenCalledWith('/administration/roles', expect.any(Object));

        // Close metadata modal
        vm.closeMetadataModal();

        // Test assign permissions on protected role (guard return)
        vm.openAssignPermissionsModal(defaultRoles[0]!);

        // Open assign permissions on normal role
        vm.openAssignPermissionsModal(defaultRoles[1]!);

        // Toggle existing permission (uncheck)
        expect(vm.selectedPermissions.includes('nscmf.create')).toBe(true);
        vm.togglePermission('nscmf.create');
        expect(vm.selectedPermissions.includes('nscmf.create')).toBe(false);

        // Close permissions modal
        vm.closePermissionsModal();
    });

    it('covers onSuccess callbacks for metadata patch, post, and permissions put, plus v-model input', async () => {
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.create', 'roles.update', 'permissions.assign'],
            },
        });

        const vm = wrapper.vm as unknown as {
            openCreateModal: () => void;
            openEditMetadataModal: (role: RoleItem) => void;
            openAssignPermissionsModal: (role: RoleItem) => void;
            handleReauthSuccess: () => void;
            isMetadataModalOpen: boolean;
            isPermissionsModalOpen: boolean;
        };

        // 1. Cover L319 (v-model metadataForm.name input event) and L90 (post onSuccess)
        vm.openCreateModal();
        await wrapper.vm.$nextTick();

        const nameInput = wrapper.find<HTMLInputElement>('input#role-name');
        expect(nameInput.exists()).toBe(true);
        await nameInput.setValue('Custom Manager');
        expect(nameInput.element.value).toBe('Custom Manager');

        const form = wrapper.find('[data-testid="role-metadata-form"]');
        await form.trigger('submit.prevent');

        expect(activeMetadataForm?.post).toHaveBeenCalledWith(
            '/administration/roles',
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
        const postOptions = activeMetadataForm?.post.mock.calls[0]?.[1] as { onSuccess?: () => void };
        expect(vm.isMetadataModalOpen).toBe(true);
        postOptions.onSuccess?.();
        expect(vm.isMetadataModalOpen).toBe(false);

        // 2. Cover L86 (patch onSuccess)
        vm.openEditMetadataModal(defaultRoles[1]!);
        await wrapper.vm.$nextTick();
        expect(vm.isMetadataModalOpen).toBe(true);

        await form.trigger('submit.prevent');
        expect(activeMetadataForm?.patch).toHaveBeenCalledWith(
            '/administration/roles/2',
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
        const patchOptions = activeMetadataForm?.patch.mock.calls[0]?.[1] as { onSuccess?: () => void };
        patchOptions.onSuccess?.();
        expect(vm.isMetadataModalOpen).toBe(false);

        // 3. Cover L153 (put onSuccess closePermissionsModal)
        vm.openAssignPermissionsModal(defaultRoles[1]!);
        await wrapper.vm.$nextTick();
        expect(vm.isPermissionsModalOpen).toBe(true);

        vm.handleReauthSuccess();
        expect(activePermissionsForm?.put).toHaveBeenCalledWith(
            '/administration/roles/2/permissions',
            expect.objectContaining({ onSuccess: expect.any(Function) }),
        );
        const putOptions = activePermissionsForm?.put.mock.calls[0]?.[1] as { onSuccess?: () => void };
        putOptions.onSuccess?.();
        expect(vm.isPermissionsModalOpen).toBe(false);
    });

    it('covers remaining branches, statements, and functions to achieve 100% coverage', async () => {
        // 1. Mount with empty roles, undefined userPermissions, and permission catalog item with no description
        const catalogWithNoDesc = [
            { name: 'custom.perm', group: 'Custom Group' },
            { name: 'custom.perm2', group: 'Custom Group', description: 'Has description' },
        ];
        const emptyWrapper = mount(Index, {
            props: {
                roles: [],
                permissionCatalog: catalogWithNoDesc,
                userPermissions: null as unknown as string[],
            },
        });

        // Verify empty table state (L284, L288 branch)
        expect(emptyWrapper.text()).toContain('No roles available.');

        // Verify grouped permission selector rendering with and without description (L387-409, L407)
        const emptyVm = emptyWrapper.vm as unknown as {
            openAssignPermissionsModal: (role: RoleItem) => void;
            isPermissionsModalOpen: boolean;
        };
        emptyVm.openAssignPermissionsModal({
            id: 99,
            name: 'Test Role',
            is_protected: false,
            permissions: [],
        });
        await emptyWrapper.vm.$nextTick();
        expect(emptyWrapper.text()).toContain('Custom Group');
        expect(emptyWrapper.text()).toContain('custom.perm');
        expect(emptyWrapper.text()).toContain('Has description');

        // 2. Test metadataForm.processing branches and guards
        const wrapper = mount(Index, {
            props: {
                roles: defaultRoles,
                permissionCatalog: canonicalPermissions,
                userPermissions: ['roles.view', 'roles.create', 'roles.update', 'permissions.assign'],
            },
        });

        const vm = wrapper.vm as unknown as {
            openCreateModal: () => void;
            openAssignPermissionsModal: (role: RoleItem) => void;
            closeMetadataModal: () => void;
            closePermissionsModal: () => void;
            submitMetadataForm: () => void;
            initiateSavePermissions: () => void;
            handleReauthCancel: () => void;
            handleReauthSuccess: () => void;
            isMetadataModalOpen: boolean;
            isPermissionsModalOpen: boolean;
            isReauthDialogOpen: boolean;
            serverErrorCode: string | null;
            serverErrorMessage: string | null;
        };

        // Open metadata modal and test metadataForm.processing ternary (L345) & guard (L82)
        vm.openCreateModal();
        await wrapper.vm.$nextTick();
        if (activeMetadataForm) {
            activeMetadataForm.processing = true;
        }
        await wrapper.vm.$nextTick();
        const saveRoleBtn = wrapper.find('[data-testid="save-role-btn"]');
        expect(saveRoleBtn.text()).toBe('Saving...');

        // Guard: submitMetadataForm when processing is true does nothing
        vm.submitMetadataForm();
        expect(activeMetadataForm?.post).not.toHaveBeenCalled();

        if (activeMetadataForm) {
            activeMetadataForm.processing = false;
        }
        vm.closeMetadataModal();

        // 3. Test permissionsForm.processing branches, ternary, and guards (L118, L137, L437)
        vm.openAssignPermissionsModal(defaultRoles[1]!);
        await wrapper.vm.$nextTick();
        expect(vm.isPermissionsModalOpen).toBe(true);

        if (activePermissionsForm) {
            activePermissionsForm.processing = true;
        }
        await wrapper.vm.$nextTick();

        // Ternary on save permissions button (L437)
        const savePermsBtn = wrapper.find('[data-testid="save-permissions-btn"]');
        expect(savePermsBtn.text()).toBe('Saving...');

        // Guard: closePermissionsModal when processing is true does not close
        vm.closePermissionsModal();
        expect(vm.isPermissionsModalOpen).toBe(true);

        // Guard: initiateSavePermissions when processing is true does not open reauth dialog
        vm.initiateSavePermissions();
        expect(vm.isReauthDialogOpen).toBe(false);

        if (activePermissionsForm) {
            activePermissionsForm.processing = false;
        }

        // Guard: initiateSavePermissions when selectedRoleForPermissions is null (L137)
        vm.closePermissionsModal(); // now it closes and nulls selectedRoleForPermissions
        expect(vm.isPermissionsModalOpen).toBe(false);
        vm.initiateSavePermissions();
        expect(vm.isReauthDialogOpen).toBe(false);

        // Guard: handleReauthSuccess when selectedRoleForPermissions is null (L148)
        vm.handleReauthSuccess();
        expect(activePermissionsForm?.put).not.toHaveBeenCalled();

        // 4. Test handleReauthCancel and handleReauthSuccess dialog closing & execution (L142-144, L146-150)
        vm.openAssignPermissionsModal(defaultRoles[1]!);
        await wrapper.vm.$nextTick();
        vm.initiateSavePermissions();
        expect(vm.isReauthDialogOpen).toBe(true);

        vm.handleReauthCancel();
        expect(vm.isReauthDialogOpen).toBe(false);

        vm.initiateSavePermissions();
        expect(vm.isReauthDialogOpen).toBe(true);

        vm.handleReauthSuccess();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(activePermissionsForm?.put).toHaveBeenCalledWith(
            '/administration/roles/2/permissions',
            expect.objectContaining({ onError: expect.any(Function) }),
        );

        // 5. Test L380 fallback branch: permissionsForm.errors.permissions when serverErrorMessage is null
        // Re-open permissions modal which legitimately resets serverErrorMessage and serverErrorCode
        vm.openAssignPermissionsModal(defaultRoles[1]!);
        if (activePermissionsForm) {
            activePermissionsForm.errors = {
                permissions: 'Validation error: permissions cannot be empty',
            };
        }
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('Validation error: permissions cannot be empty');
    });
});
