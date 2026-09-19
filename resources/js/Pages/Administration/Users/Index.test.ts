import { router } from '@inertiajs/vue3';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Index, { type RoleItem, type TeamItem, type UserItem } from './Index.vue';

interface MockFormInstance {
    processing: boolean;
    errors: Record<string, string>;
    hasErrors: boolean;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    clearErrors: ReturnType<typeof vi.fn>;
    [key: string]: unknown;
}

const mockForms: MockFormInstance[] = [];

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent, h } = await import('vue');

    return {
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: false } },
            setup: () => () => h('div', { class: 'inertia-head' }),
        }),
        Link: defineComponent({
            name: 'InertiaLink',
            props: { href: { type: String, required: true } },
            setup:
                (_props, { slots }) =>
                () =>
                    slots.default ? slots.default() : null,
        }),
        router: {
            post: vi.fn(
                (
                    _url: string,
                    _data: unknown,
                    options?: { onSuccess?: () => void; onError?: (e: unknown) => void; onFinish?: () => void },
                ) => {
                    if (options?.onFinish) {
                        options.onFinish();
                    }
                },
            ),
            put: vi.fn(),
            patch: vi.fn(),
            get: vi.fn(),
        },
        useForm: vi.fn((initialData: Record<string, unknown>) => {
            const f: MockFormInstance = reactive({
                ...initialData,
                processing: false,
                errors: {},
                hasErrors: false,
                post: vi.fn((_url: string, opts?: { onSuccess?: () => void; onError?: (errs: unknown) => void }) => {
                    if (opts?.onSuccess) opts.onSuccess();
                }),
                patch: vi.fn((_url: string, opts?: { onSuccess?: () => void; onError?: (errs: unknown) => void }) => {
                    if (opts?.onSuccess) opts.onSuccess();
                }),
                put: vi.fn((_url: string, opts?: { onSuccess?: () => void; onError?: (errs: unknown) => void }) => {
                    if (opts?.onSuccess) opts.onSuccess();
                }),
                reset: vi.fn(),
                clearErrors: vi.fn(),
            });
            mockForms.push(f);
            return f;
        }),
    };
});

interface ExposedIndexVm {
    createForm: {
        name: string;
        username: string;
        team_id: number | null;
        role_ids: number[];
        processing: boolean;
        errors: Record<string, string>;
        post: (url: string, opts?: unknown) => void;
        reset: () => void;
        clearErrors: () => void;
    };
    editProfileForm: {
        name: string;
        processing: boolean;
        errors: Record<string, string>;
        patch: (url: string, opts?: unknown) => void;
        reset: () => void;
        clearErrors: () => void;
    };
    editTeamForm: {
        team_id: number | null;
        processing: boolean;
        errors: Record<string, string>;
        put: (url: string, opts?: unknown) => void;
        reset: () => void;
        clearErrors: () => void;
    };
    editRolesForm: {
        role_ids: number[];
        processing: boolean;
        put: (url: string, opts?: unknown) => void;
        clearErrors: () => void;
    };
    isCreateModalOpen: boolean;
    isEditProfileModalOpen: boolean;
    isEditTeamModalOpen: boolean;
    isEditRolesModalOpen: boolean;
    isReauthDialogOpen: boolean;
    serverErrorCode: string | null;
    serverErrorMessage: string | null;
    sensitiveActionTitle: string;
    sensitiveActionDescription: string;
    selectedRoleIds: number[];
    openCreateModal: () => void;
    closeCreateModal: () => void;
    submitCreateUser: () => void;
    openEditProfileModal: (user: UserItem) => void;
    closeEditProfileModal: () => void;
    submitEditProfile: () => void;
    openEditTeamModal: (user: UserItem) => void;
    closeEditTeamModal: () => void;
    submitEditTeam: () => void;
    openEditRolesModal: (user: UserItem) => void;
    closeEditRolesModal: () => void;
    toggleUserRole: (roleId: number) => void;
    initiateRolesSave: () => void;
    initiateDisableUser: (user: UserItem) => void;
    initiateResetPassword: (user: UserItem) => void;
    handleReauthCancel: () => void;
    handleReauthSuccess: () => void;
    enableUser: (user: UserItem) => void;
}

describe('FE-12: User list, profile, roles, Team dan active status', () => {
    const teams: TeamItem[] = [
        { id: 1, name: 'Operations' },
        { id: 2, name: 'Finance' },
    ];
    const roles: RoleItem[] = [
        { id: 1, name: 'Superadmin', is_protected: true },
        { id: 2, name: 'Operator' },
        { id: 3, name: 'Auditor' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockForms.length = 0;
    });

    it('AC1 — users_send_allowlisted_fields: create sends {name, username, team_id, role_ids} and profile edit does not leak is_protected_superadmin or password', async () => {
        const users: UserItem[] = [
            {
                id: 10,
                name: 'Existing User',
                username: 'existing.user',
                team_id: 1,
                team_name: 'Operations',
                is_active: true,
                is_protected_superadmin: false,
                roles: [{ id: 2, name: 'Operator' }],
            },
        ];

        const wrapper = mount(Index, {
            props: {
                users,
                teams,
                roles,
                userPermissions: ['users.view', 'users.create', 'users.update'],
            },
        });

        // 1. Create User
        expect(wrapper.find('[data-testid="btn-create-user"]').exists()).toBe(true);
        await wrapper.find('[data-testid="btn-create-user"]').trigger('click');
        expect(wrapper.find('[data-testid="modal-create-user"]').exists()).toBe(true);

        const vm = wrapper.vm as unknown as ExposedIndexVm;
        vm.createForm.name = 'New User';
        vm.createForm.username = 'new.user';
        vm.createForm.team_id = 1;
        vm.createForm.role_ids = [2];

        // Toggle role in create modal
        expect(wrapper.find('[data-testid="create-role-protected-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="create-role-protected-1"]').text()).toBe('Protected');
        expect(wrapper.find('[data-testid="create-role-protected-2"]').exists()).toBe(false);

        await wrapper.find('[data-testid="create-role-option-3"] input').trigger('change');
        expect(vm.createForm.role_ids).toContain(3);
        await wrapper.find('[data-testid="create-role-option-3"] input').trigger('change');
        expect(vm.createForm.role_ids).not.toContain(3);

        // Ensure createForm does not carry password or is_protected_superadmin in its keys
        const createKeys = Object.keys(vm.createForm);
        expect(createKeys).not.toContain('password');
        expect(createKeys).not.toContain('is_protected_superadmin');

        // Submit create form
        const postSpy = vi.spyOn(vm.createForm, 'post');
        await wrapper.find('[data-testid="form-create-user"]').trigger('submit.prevent');
        expect(postSpy).toHaveBeenCalledWith('/administration/users', expect.any(Object));

        // 2. Edit Profile
        expect(wrapper.find('[data-testid="btn-edit-profile-10"]').exists()).toBe(true);
        await wrapper.find('[data-testid="btn-edit-profile-10"]').trigger('click');
        expect(wrapper.find('[data-testid="modal-edit-profile"]').exists()).toBe(true);

        const editKeys = Object.keys(vm.editProfileForm);
        expect(editKeys).toContain('name');
        expect(editKeys).not.toContain('password');
        expect(editKeys).not.toContain('is_protected_superadmin');
        expect(editKeys).not.toContain('roles');
        expect(editKeys).not.toContain('team_id');

        vm.editProfileForm.name = 'Updated User Name';
        const patchSpy = vi.spyOn(vm.editProfileForm, 'patch');
        await wrapper.find('[data-testid="form-edit-profile"]').trigger('submit.prevent');
        expect(patchSpy).toHaveBeenCalledWith('/administration/users/10', expect.any(Object));
    });

    it('AC2 — users_gate_each_operation: users.view without assign_roles cannot edit roles; role name Superadmin is not bypass', () => {
        const users: UserItem[] = [
            {
                id: 10,
                name: 'Normal Admin',
                username: 'normal.admin',
                team_id: 1,
                team_name: 'Operations',
                is_active: true,
                is_protected_superadmin: false,
                roles: [{ id: 99, name: 'Superadmin' }], // Role name Superadmin is NOT a bypass
            },
        ];

        const wrapper = mount(Index, {
            props: {
                users,
                teams,
                roles: [{ id: 99, name: 'Superadmin' }],
                userPermissions: ['users.view'], // no users.assign_roles
            },
        });

        expect(wrapper.find('[data-testid="user-row-10"]').exists()).toBe(true);
        // Without users.assign_roles, button must not exist
        expect(wrapper.find('[data-testid="btn-edit-roles-10"]').exists()).toBe(false);
    });

    it('AC3 — users_protect_bootstrap_identity: team null protected is accepted, disable/downgrade not available; server denial is handled', async () => {
        const users: UserItem[] = [
            {
                id: 1,
                name: 'Protected Superadmin',
                username: 'superadmin',
                team_id: null,
                team_name: null,
                is_active: true,
                is_protected_superadmin: true,
                roles: [{ id: 1, name: 'Superadmin', is_protected: true }],
            },
        ];

        const wrapper = mount(Index, {
            props: {
                users,
                teams: [],
                roles: [{ id: 1, name: 'Superadmin', is_protected: true }],
                userPermissions: [
                    'users.view',
                    'users.enable',
                    'users.disable',
                    'users.assign_roles',
                    'users.reset_password',
                ],
            },
        });

        // Protected Superadmin displays badge and accepts team_id null
        expect(wrapper.find('[data-testid="protected-badge-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="user-team-1"]').text()).toContain('None (Bootstrap Protected)');

        // Prohibited actions must not be available for Protected Superadmin
        expect(wrapper.find('[data-testid="btn-disable-user-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-edit-roles-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-reset-password-1"]').exists()).toBe(false);

        // Defence-in-depth: direct calls on protected superadmin must early-return with zero network requests
        const vm = wrapper.vm as unknown as ExposedIndexVm;
        const routerPostSpy = vi.spyOn(router, 'post');
        const rolesPutSpy = vi.spyOn(vm.editRolesForm, 'put');
        const protectedUser = users[0];
        if (!protectedUser) throw new Error('fixture must contain the protected superadmin');

        vm.enableUser(protectedUser);
        expect(routerPostSpy).not.toHaveBeenCalled();

        vm.initiateDisableUser(protectedUser);
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        vm.initiateResetPassword(protectedUser);
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        vm.openEditRolesModal(protectedUser);
        expect(vm.isEditRolesModalOpen).toBe(false);
        expect(rolesPutSpy).not.toHaveBeenCalled();

        // Server denial error handling check
        vm.serverErrorMessage = 'Server invariant violated: Protected Superadmin cannot be modified.';
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[data-testid="users-server-error"]').text()).toContain(
            'Protected Superadmin cannot be modified.',
        );
    });

    it('AC4 — users_distinguish_team_and_access_change: Team-only does not claim session revocation, role/disable/reset require sensitive re-auth flow', async () => {
        const users: UserItem[] = [
            {
                id: 20,
                name: 'Staff',
                username: 'staff',
                team_id: 1,
                team_name: 'Operations',
                is_active: true,
                is_protected_superadmin: false,
                roles: [{ id: 2, name: 'Operator' }],
            },
        ];

        const wrapper = mount(Index, {
            props: {
                users,
                teams,
                roles,
                userPermissions: [
                    'users.view',
                    'users.assign_team',
                    'users.assign_roles',
                    'users.reset_password',
                    'users.disable',
                ],
            },
        });

        const vm = wrapper.vm as unknown as ExposedIndexVm;

        // 1. Team-only assignment (PUT /{user}/team) does NOT trigger re-auth or session revocation claim
        expect(wrapper.find('[data-testid="btn-edit-team-20"]').exists()).toBe(true);
        await wrapper.find('[data-testid="btn-edit-team-20"]').trigger('click');
        expect(wrapper.find('[data-testid="modal-edit-team"]').exists()).toBe(true);

        vm.editTeamForm.team_id = 2;
        const teamPutSpy = vi.spyOn(vm.editTeamForm, 'put');
        await wrapper.find('[data-testid="form-edit-team"]').trigger('submit.prevent');
        expect(teamPutSpy).toHaveBeenCalledWith('/administration/users/20/team', expect.any(Object));
        expect(vm.isReauthDialogOpen).toBe(false);

        // 2. Role assignment requires sensitive re-auth flow and clarifies session revocation
        const rolesPutSpy = vi.spyOn(vm.editRolesForm, 'put');
        await wrapper.find('[data-testid="btn-edit-roles-20"]').trigger('click');
        expect(wrapper.find('[data-testid="modal-edit-roles"]').exists()).toBe(true);

        // Toggle user role checkbox
        await wrapper.find('[data-testid="role-checkbox-label-3"] input').trigger('change');
        expect(vm.selectedRoleIds).toContain(3);
        await wrapper.find('[data-testid="role-checkbox-label-3"] input').trigger('change');
        expect(vm.selectedRoleIds).not.toContain(3);

        // Protected role badge in role selection modal
        expect(wrapper.find('[data-testid="role-protected-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="role-protected-1"]').text()).toBe('Protected');
        expect(wrapper.find('[data-testid="role-protected-2"]').exists()).toBe(false);

        await wrapper.find('[data-testid="btn-save-roles"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Role Assignment');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');
        // Crucial assertion: PUT must NOT be dispatched upon opening dialog (M5 catch)
        expect(rolesPutSpy).not.toHaveBeenCalled();

        // Cancel does not mutate
        vm.handleReauthCancel();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(rolesPutSpy).not.toHaveBeenCalled();

        // 3. Disable user requires sensitive re-auth flow and clarifies session revocation
        const routerPostSpy = vi.spyOn(router, 'post');
        await wrapper.find('[data-testid="btn-disable-user-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Disable User');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');
        // Crucial assertion: POST /disable must NOT be dispatched upon opening dialog (M4 catch)
        expect(routerPostSpy).not.toHaveBeenCalled();

        // Cancel does not mutate
        vm.handleReauthCancel();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        // Re-initiate and confirm success invokes router.post
        await wrapper.find('[data-testid="btn-disable-user-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(routerPostSpy).not.toHaveBeenCalled();
        vm.handleReauthSuccess();
        expect(routerPostSpy).toHaveBeenCalledWith('/administration/users/20/disable', {}, expect.any(Object));

        // 4. Reset password requires sensitive re-auth flow and clarifies session revocation
        routerPostSpy.mockClear();
        await wrapper.find('[data-testid="btn-reset-password-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Reset Password');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');
        // Crucial assertion: POST /reset-password must NOT be dispatched upon opening dialog (M4b catch)
        expect(routerPostSpy).not.toHaveBeenCalled();

        // Cancel does not mutate
        vm.handleReauthCancel();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        // Re-initiate and confirm success invokes router.post
        await wrapper.find('[data-testid="btn-reset-password-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(routerPostSpy).not.toHaveBeenCalled();
        vm.handleReauthSuccess();
        expect(routerPostSpy).toHaveBeenCalledWith('/administration/users/20/reset-password', {}, expect.any(Object));
    });

    it('covers empty users state and enable user flow', async () => {
        const wrapper = mount(Index, {
            props: {
                users: [],
                teams: [],
                roles: [],
                userPermissions: ['users.view', 'users.enable'],
            },
        });

        expect(wrapper.text()).toContain('No users found.');

        // Test enableUser
        const disabledUser: UserItem = {
            id: 30,
            name: 'Disabled User',
            username: 'disabled.user',
            team_id: null,
            is_active: false,
            is_protected_superadmin: false,
            roles: [],
        };
        const wrapperWithDisabled = mount(Index, {
            props: {
                users: [disabledUser],
                userPermissions: ['users.view', 'users.enable'],
            },
        });

        const enableBtn = wrapperWithDisabled.find('[data-testid="btn-enable-user-30"]');
        expect(enableBtn.exists()).toBe(true);
        const routerPostSpy = vi.spyOn(router, 'post');
        await enableBtn.trigger('click');
        expect(routerPostSpy).toHaveBeenCalledWith('/administration/users/30/enable', {}, expect.any(Object));

        // Enable user error handling
        const vmDisabled = wrapperWithDisabled.vm as unknown as ExposedIndexVm;
        vi.spyOn(router, 'post').mockImplementation((_url: unknown, _data?: unknown, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void; onFinish?: () => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({ message: 'Enable failed', error_code: 'DENIED' });
            }
            if (castOpts?.onFinish) castOpts.onFinish();
        });
        vmDisabled.enableUser(disabledUser);
        expect(vmDisabled.serverErrorMessage).toBe('Enable failed');
        expect(vmDisabled.serverErrorCode).toBe('DENIED');
    });

    it('covers cancel and modal closing for all dialogs', () => {
        const testUser: UserItem = {
            id: 40,
            name: 'Test User',
            username: 'test.user',
            team_id: null,
            is_active: true,
            is_protected_superadmin: false,
            roles: [],
        };
        const wrapper = mount(Index, {
            props: {
                users: [testUser],
                userPermissions: [
                    'users.view',
                    'users.create',
                    'users.update',
                    'users.assign_team',
                    'users.assign_roles',
                ],
            },
        });

        const vm = wrapper.vm as unknown as ExposedIndexVm;

        // Close handlers when modal state is already open
        vm.openCreateModal();
        expect(vm.isCreateModalOpen).toBe(true);
        vm.closeCreateModal();
        expect(vm.isCreateModalOpen).toBe(false);

        // Edit profile modal close
        vm.openEditProfileModal(testUser);
        expect(vm.isEditProfileModalOpen).toBe(true);
        vm.closeEditProfileModal();
        expect(vm.isEditProfileModalOpen).toBe(false);

        // Edit team modal close
        vm.openEditTeamModal(testUser);
        expect(vm.isEditTeamModalOpen).toBe(true);
        vm.closeEditTeamModal();
        expect(vm.isEditTeamModalOpen).toBe(false);

        // Edit roles modal close
        vm.openEditRolesModal(testUser);
        expect(vm.isEditRolesModalOpen).toBe(true);
        vm.closeEditRolesModal();
        expect(vm.isEditRolesModalOpen).toBe(false);

        // Reauth handler safety check when no action is pending
        vm.handleReauthSuccess();
        expect(vm.isReauthDialogOpen).toBe(false);
    });

    it('covers error handling during sensitive actions and server error propagation', () => {
        const targetUser: UserItem = {
            id: 50,
            name: 'Test Target',
            username: 'target',
            team_id: 1,
            is_active: true,
            is_protected_superadmin: false,
            roles: [{ id: 2, name: 'Operator' }],
        };
        const wrapper = mount(Index, {
            props: {
                users: [targetUser],
                userPermissions: ['users.view', 'users.assign_roles', 'users.disable', 'users.reset_password'],
            },
        });

        const vm = wrapper.vm as unknown as ExposedIndexVm;

        // 1. Roles save server rejection
        vm.openEditRolesModal(targetUser);
        vm.initiateRolesSave();
        // Mock put to trigger onError
        vi.spyOn(vm.editRolesForm, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void; onSuccess?: () => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({ message: 'Role assign failed', error_code: 'DENIED' });
            }
        });
        vm.handleReauthSuccess();
        expect(vm.serverErrorMessage).toBe('Role assign failed');
        expect(vm.serverErrorCode).toBe('DENIED');

        // 1b. Roles save success callback
        vi.spyOn(vm.editRolesForm, 'put').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void; onSuccess?: () => void } | undefined;
            if (castOpts?.onSuccess) {
                castOpts.onSuccess();
            }
        });
        vm.initiateRolesSave();
        vm.handleReauthSuccess();
        expect(vm.isEditRolesModalOpen).toBe(false);

        // 1c. Create user server rejection callback
        const wrapperWithCreate = mount(Index, {
            props: {
                users: [targetUser],
                teams,
                roles,
                userPermissions: ['users.view', 'users.create'],
            },
        });
        const vmCreate = wrapperWithCreate.vm as unknown as ExposedIndexVm;
        vmCreate.openCreateModal();
        vi.spyOn(vmCreate.createForm, 'post').mockImplementation((_url: string, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({ message: ['Create rejected', 'Invalid'], error_code: 'DENIED' });
            }
        });
        vmCreate.submitCreateUser();
        expect(vmCreate.serverErrorMessage).toBe('Create rejected, Invalid');
        expect(vmCreate.serverErrorCode).toBe('DENIED');

        // 2. Disable server rejection
        vm.initiateDisableUser(targetUser);
        vi.spyOn(router, 'post').mockImplementation((_url: unknown, _data?: unknown, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void; onFinish?: () => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({ message: 'Cannot disable', error_code: 'PROTECTED_RESOURCE' });
            }
            if (castOpts?.onFinish) castOpts.onFinish();
        });
        vm.handleReauthSuccess();
        expect(vm.serverErrorMessage).toBe('Cannot disable');
        expect(vm.serverErrorCode).toBe('PROTECTED_RESOURCE');

        // 3. Reset password server rejection
        vm.initiateResetPassword(targetUser);
        vi.spyOn(router, 'post').mockImplementation((_url: unknown, _data?: unknown, opts?: unknown) => {
            const castOpts = opts as { onError?: (errs: unknown) => void; onFinish?: () => void } | undefined;
            if (castOpts?.onError) {
                castOpts.onError({ message: 'Password reset failed', error_code: 'DENIED' });
            }
            if (castOpts?.onFinish) castOpts.onFinish();
        });
        vm.handleReauthSuccess();
        expect(vm.serverErrorMessage).toBe('Password reset failed');
    });

    it('covers XSS protection on text rendering and users.view table gating', () => {
        const hostile = '<img src=x onerror="window.__xss=1">';
        const hostile2 = '<svg onload="window.__xss=2"></svg>';
        const users: UserItem[] = [
            {
                id: 77,
                name: hostile,
                username: hostile2,
                team_id: 1,
                team_name: hostile,
                is_active: true,
                is_protected_superadmin: false,
                roles: [{ id: 5, name: hostile2 }],
            },
        ];

        // 1. Table rendered when users.view is present; hostile text rendered safely as text
        const wrapperWithView = mount(Index, {
            props: {
                users,
                teams,
                roles: [{ id: 5, name: hostile2 }],
                userPermissions: ['users.view'],
            },
        });

        const row = wrapperWithView.find('[data-testid="user-row-77"]');
        expect(row.exists()).toBe(true);
        expect(wrapperWithView.find('img').exists()).toBe(false);
        expect(wrapperWithView.findAll('[onerror]')).toHaveLength(0);
        expect(wrapperWithView.findAll('[onload]')).toHaveLength(0);
        expect(row.findAll('svg, img, iframe, script')).toHaveLength(0);
        expect(row.text()).toContain(hostile);
        expect(row.text()).toContain(hostile2);
        expect(wrapperWithView.html()).not.toContain('<img src=x');
        expect(wrapperWithView.html()).not.toContain('<svg onload');

        // 2. Table hidden when users.view is absent (F-12-7)
        const wrapperWithoutView = mount(Index, {
            props: {
                users,
                teams,
                roles: [],
                userPermissions: ['users.create'], // lacks users.view
            },
        });
        expect(wrapperWithoutView.find('[data-testid="user-row-77"]').exists()).toBe(false);
        expect(wrapperWithoutView.find('table').exists()).toBe(false);
    });

    it('covers defence-in-depth permission guards on dispatch functions (F-12-2)', () => {
        const targetUser: UserItem = {
            id: 88,
            name: 'Perm Target',
            username: 'perm.target',
            team_id: 1,
            is_active: true,
            is_protected_superadmin: false,
            roles: [{ id: 2, name: 'Operator' }],
        };

        // Mount with NO permissions
        const wrapper = mount(Index, {
            props: {
                users: [targetUser],
                teams,
                roles,
                userPermissions: [],
            },
        });

        const vm = wrapper.vm as unknown as ExposedIndexVm;
        const routerPostSpy = vi.spyOn(router, 'post');
        const createPostSpy = vi.spyOn(vm.createForm, 'post');
        const profilePatchSpy = vi.spyOn(vm.editProfileForm, 'patch');
        const teamPutSpy = vi.spyOn(vm.editTeamForm, 'put');
        const rolesPutSpy = vi.spyOn(vm.editRolesForm, 'put');

        // None of the dispatch functions fire requests without permissions
        vm.submitCreateUser();
        expect(createPostSpy).not.toHaveBeenCalled();

        vm.openEditProfileModal(targetUser);
        vm.submitEditProfile();
        expect(profilePatchSpy).not.toHaveBeenCalled();

        vm.openEditTeamModal(targetUser);
        vm.submitEditTeam();
        expect(teamPutSpy).not.toHaveBeenCalled();

        vm.openEditRolesModal(targetUser);
        vm.initiateRolesSave();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(rolesPutSpy).not.toHaveBeenCalled();

        vm.initiateDisableUser(targetUser);
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        vm.initiateResetPassword(targetUser);
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(routerPostSpy).not.toHaveBeenCalled();

        vm.enableUser(targetUser);
        expect(routerPostSpy).not.toHaveBeenCalled();
    });

    it('covers processing guards on form submissions', () => {
        const targetUser: UserItem = {
            id: 60,
            name: 'Guard Target',
            username: 'guard',
            team_id: 1,
            is_active: true,
            is_protected_superadmin: false,
            roles: [],
        };
        const wrapper = mount(Index, {
            props: {
                users: [targetUser],
                userPermissions: [
                    'users.view',
                    'users.create',
                    'users.update',
                    'users.assign_team',
                    'users.assign_roles',
                ],
            },
        });

        const vm = wrapper.vm as unknown as ExposedIndexVm;

        // 1. Create modal processing guard
        vm.openCreateModal();
        vm.createForm.processing = true;
        const postSpy = vi.spyOn(vm.createForm, 'post');
        vm.submitCreateUser();
        expect(postSpy).not.toHaveBeenCalled();
        vm.closeCreateModal();
        expect(vm.isCreateModalOpen).toBe(true);
        vm.createForm.processing = false;
        vm.closeCreateModal();
        expect(vm.isCreateModalOpen).toBe(false);

        // 2. Edit Profile processing guard
        vm.openEditProfileModal(targetUser);
        vm.editProfileForm.processing = true;
        const patchSpy = vi.spyOn(vm.editProfileForm, 'patch');
        vm.submitEditProfile();
        expect(patchSpy).not.toHaveBeenCalled();
        vm.closeEditProfileModal();
        expect(vm.isEditProfileModalOpen).toBe(true);
        vm.editProfileForm.processing = false;
        vm.closeEditProfileModal();
        expect(vm.isEditProfileModalOpen).toBe(false);

        // 3. Edit Team processing guard
        vm.openEditTeamModal(targetUser);
        vm.editTeamForm.processing = true;
        const putSpy = vi.spyOn(vm.editTeamForm, 'put');
        vm.submitEditTeam();
        expect(putSpy).not.toHaveBeenCalled();
        vm.closeEditTeamModal();
        expect(vm.isEditTeamModalOpen).toBe(true);
        vm.editTeamForm.processing = false;
        vm.closeEditTeamModal();
        expect(vm.isEditTeamModalOpen).toBe(false);

        // 4. Edit Roles processing guard
        vm.openEditRolesModal(targetUser);
        vm.editRolesForm.processing = true;
        const rolesPutSpy = vi.spyOn(vm.editRolesForm, 'put');
        vm.initiateRolesSave();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(rolesPutSpy).not.toHaveBeenCalled();
        vm.closeEditRolesModal();
        expect(vm.isEditRolesModalOpen).toBe(true);
        vm.editRolesForm.processing = false;
        vm.closeEditRolesModal();
        expect(vm.isEditRolesModalOpen).toBe(false);
    });
});
