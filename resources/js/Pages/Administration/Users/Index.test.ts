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
        post: (url: string, opts?: unknown) => void;
        reset: () => void;
        clearErrors: () => void;
    };
    editProfileForm: {
        name: string;
        processing: boolean;
        patch: (url: string, opts?: unknown) => void;
        reset: () => void;
        clearErrors: () => void;
    };
    editTeamForm: {
        team_id: number | null;
        processing: boolean;
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
                userPermissions: ['users.view', 'users.disable', 'users.assign_roles', 'users.reset_password'],
            },
        });

        // Protected Superadmin displays badge and accepts team_id null
        expect(wrapper.find('[data-testid="protected-badge-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="user-team-1"]').text()).toContain('None (Bootstrap Protected)');

        // Prohibited actions must not be available for Protected Superadmin
        expect(wrapper.find('[data-testid="btn-disable-user-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-edit-roles-1"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-reset-password-1"]').exists()).toBe(false);

        // Server denial error handling check
        const vm = wrapper.vm as unknown as ExposedIndexVm;
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
        await wrapper.find('[data-testid="btn-edit-roles-20"]').trigger('click');
        expect(wrapper.find('[data-testid="modal-edit-roles"]').exists()).toBe(true);

        await wrapper.find('[data-testid="btn-save-roles"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Role Assignment');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');

        // Cancel does not mutate
        const rolesPutSpy = vi.spyOn(vm.editRolesForm, 'put');
        vm.handleReauthCancel();
        expect(vm.isReauthDialogOpen).toBe(false);
        expect(rolesPutSpy).not.toHaveBeenCalled();

        // 3. Disable user requires sensitive re-auth flow and clarifies session revocation
        await wrapper.find('[data-testid="btn-disable-user-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Disable User');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');

        // Confirm success invokes router.post
        const routerPostSpy = vi.spyOn(router, 'post');
        vm.handleReauthSuccess();
        expect(routerPostSpy).toHaveBeenCalledWith('/administration/users/20/disable', {}, expect.any(Object));

        // 4. Reset password requires sensitive re-auth flow and clarifies session revocation
        await wrapper.find('[data-testid="btn-reset-password-20"]').trigger('click');
        expect(vm.isReauthDialogOpen).toBe(true);
        expect(vm.sensitiveActionTitle).toBe('Confirm Reset Password');
        expect(vm.sensitiveActionDescription).toContain('revoke all active sessions');

        vm.handleReauthSuccess();
        expect(routerPostSpy).toHaveBeenCalledWith('/administration/users/20/reset-password', {}, expect.any(Object));
    });
});
