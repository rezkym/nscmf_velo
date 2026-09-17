<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { ShieldAlert, ShieldCheck, UserCheck } from '@lucide/vue';
import { computed, ref } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import FormField from '@/components/ui/FormField.vue';

export interface TeamItem {
    id: number;
    name: string;
    is_active?: boolean;
}

export interface RoleItem {
    id: number;
    name: string;
    is_protected?: boolean;
}

export interface UserItem {
    id: number;
    name: string;
    username: string;
    team_id: number | null;
    team_name?: string | null;
    is_active: boolean;
    is_protected_superadmin: boolean;
    must_change_password?: boolean;
    roles: RoleItem[];
    created_at?: string;
    updated_at?: string;
}

const props = withDefaults(
    defineProps<{
        users?: UserItem[];
        teams?: TeamItem[];
        roles?: RoleItem[];
        userPermissions?: string[];
    }>(),
    {
        users: () => [],
        teams: () => [],
        roles: () => [],
        userPermissions: () => [],
    },
);

const permissionsList = computed(() => props.userPermissions ?? []);

const canView = computed(() => permissionsList.value.includes('users.view'));
const canCreate = computed(() => permissionsList.value.includes('users.create'));
const canUpdate = computed(() => permissionsList.value.includes('users.update'));
const canEnable = computed(() => permissionsList.value.includes('users.enable'));
const canDisable = computed(() => permissionsList.value.includes('users.disable'));
const canResetPassword = computed(() => permissionsList.value.includes('users.reset_password'));
const canAssignRoles = computed(() => permissionsList.value.includes('users.assign_roles'));
const canAssignTeam = computed(() => permissionsList.value.includes('users.assign_team'));

// --- Create User Modal & Form (AC1) ---
const isCreateModalOpen = ref(false);
const createForm = useForm({
    name: '',
    username: '',
    team_id: null as number | null,
    role_ids: [] as number[],
});

function openCreateModal(): void {
    createForm.reset();
    createForm.clearErrors();
    createForm.name = '';
    createForm.username = '';
    createForm.team_id = null;
    createForm.role_ids = [];
    isCreateModalOpen.value = true;
}

function closeCreateModal(): void {
    if (createForm.processing) return;
    isCreateModalOpen.value = false;
    createForm.reset();
    createForm.clearErrors();
}

function toggleCreateRole(roleId: number): void {
    if (createForm.role_ids.includes(roleId)) {
        createForm.role_ids = createForm.role_ids.filter((id) => id !== roleId);
    } else {
        createForm.role_ids.push(roleId);
    }
}

function submitCreateUser(): void {
    if (!canCreate.value || createForm.processing) return;

    createForm.post('/administration/users', {
        onSuccess: () => {
            closeCreateModal();
        },
        onError: (errs) => {
            const errMap = errs as Record<string, string | string[] | undefined>;
            const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
            if (msg) {
                serverErrorMessage.value = msg;
            }
            if (typeof errMap.error_code === 'string') {
                serverErrorCode.value = errMap.error_code;
            }
        },
    });
}

// --- Edit Profile Modal & Form (AC1: PATCH /{user} - strictly name only, no is_protected_superadmin or password) ---
const isEditProfileModalOpen = ref(false);
const editingProfileUser = ref<UserItem | null>(null);
const editProfileForm = useForm({
    name: '',
});

function openEditProfileModal(user: UserItem): void {
    editingProfileUser.value = user;
    editProfileForm.reset();
    editProfileForm.clearErrors();
    editProfileForm.name = user.name;
    isEditProfileModalOpen.value = true;
}

function closeEditProfileModal(): void {
    if (editProfileForm.processing) return;
    isEditProfileModalOpen.value = false;
    editingProfileUser.value = null;
    editProfileForm.reset();
    editProfileForm.clearErrors();
}

function submitEditProfile(): void {
    if (!canUpdate.value || editProfileForm.processing || !editingProfileUser.value) return;

    editProfileForm.patch(`/administration/users/${editingProfileUser.value.id}`, {
        onSuccess: () => {
            closeEditProfileModal();
        },
    });
}

// --- Edit Team Modal & Form (AC4: PUT /{user}/team - metadata only, not access change) ---
const isEditTeamModalOpen = ref(false);
const editingTeamUser = ref<UserItem | null>(null);
const editTeamForm = useForm({
    team_id: null as number | null,
});

function openEditTeamModal(user: UserItem): void {
    editingTeamUser.value = user;
    editTeamForm.reset();
    editTeamForm.clearErrors();
    editTeamForm.team_id = user.team_id;
    isEditTeamModalOpen.value = true;
}

function closeEditTeamModal(): void {
    if (editTeamForm.processing) return;
    isEditTeamModalOpen.value = false;
    editingTeamUser.value = null;
    editTeamForm.reset();
    editTeamForm.clearErrors();
}

function submitEditTeam(): void {
    if (!canAssignTeam.value || editTeamForm.processing || !editingTeamUser.value) return;

    editTeamForm.put(`/administration/users/${editingTeamUser.value.id}/team`, {
        onSuccess: () => {
            closeEditTeamModal();
        },
    });
}

// --- Edit Roles Modal & Form (AC2, AC3, AC4: PUT /{user}/roles - Sensitive Action Re-Auth) ---
const isEditRolesModalOpen = ref(false);
const editingRolesUser = ref<UserItem | null>(null);
const selectedRoleIds = ref<number[]>([]);
const editRolesForm = useForm({
    role_ids: [] as number[],
});

function openEditRolesModal(user: UserItem): void {
    if (user.is_protected_superadmin) return;
    editingRolesUser.value = user;
    selectedRoleIds.value = user.roles.map((r) => r.id);
    editRolesForm.clearErrors();
    isEditRolesModalOpen.value = true;
}

function closeEditRolesModal(): void {
    if (editRolesForm.processing) return;
    isEditRolesModalOpen.value = false;
    editingRolesUser.value = null;
    selectedRoleIds.value = [];
    editRolesForm.clearErrors();
}

function toggleUserRole(roleId: number): void {
    if (selectedRoleIds.value.includes(roleId)) {
        selectedRoleIds.value = selectedRoleIds.value.filter((id) => id !== roleId);
    } else {
        selectedRoleIds.value.push(roleId);
    }
}

// --- Sensitive Operations & Re-Auth Wiring ---
type SensitiveActionType = 'roles' | 'disable' | 'reset-password';

const isReauthDialogOpen = ref(false);
const pendingSensitiveAction = ref<SensitiveActionType | null>(null);
const pendingSensitiveUser = ref<UserItem | null>(null);
const serverErrorCode = ref<string | null>(null);
const serverErrorMessage = ref<string | null>(null);

const sensitiveActionTitle = computed(() => {
    switch (pendingSensitiveAction.value) {
        case 'roles':
            return 'Confirm Role Assignment';
        case 'disable':
            return 'Confirm Disable User';
        case 'reset-password':
            return 'Confirm Reset Password';
        default:
            return 'Confirm Sensitive Action';
    }
});

const sensitiveActionDescription = computed(() => {
    switch (pendingSensitiveAction.value) {
        case 'roles':
            return 'Changing assigned roles immediately alters the effective access of the user and causes the server to revoke all active sessions for this account. Current password confirmation is required.';
        case 'disable':
            return 'Disabling this account immediately prevents login and causes the server to revoke all active sessions for this user. Current password confirmation is required.';
        case 'reset-password':
            return 'Resetting password will generate a server-side one-time temporary credential and immediately revoke all active sessions for this user. Current password confirmation is required.';
        default:
            return 'Please verify your current password before proceeding with this protected administrative action.';
    }
});

function initiateRolesSave(): void {
    if (!canAssignRoles.value || !editingRolesUser.value || editRolesForm.processing) return;
    pendingSensitiveAction.value = 'roles';
    pendingSensitiveUser.value = editingRolesUser.value;
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
    isReauthDialogOpen.value = true;
}

function initiateDisableUser(user: UserItem): void {
    if (!canDisable.value || user.is_protected_superadmin) return;
    pendingSensitiveAction.value = 'disable';
    pendingSensitiveUser.value = user;
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
    isReauthDialogOpen.value = true;
}

function initiateResetPassword(user: UserItem): void {
    if (!canResetPassword.value || user.is_protected_superadmin) return;
    pendingSensitiveAction.value = 'reset-password';
    pendingSensitiveUser.value = user;
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
    isReauthDialogOpen.value = true;
}

function handleReauthCancel(): void {
    isReauthDialogOpen.value = false;
    pendingSensitiveAction.value = null;
    pendingSensitiveUser.value = null;
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
}

function handleReauthSuccess(): void {
    isReauthDialogOpen.value = false;
    const action = pendingSensitiveAction.value;
    const user = pendingSensitiveUser.value;

    if (!action || !user) return;

    if (action === 'roles') {
        editRolesForm.role_ids = [...selectedRoleIds.value];
        editRolesForm.put(`/administration/users/${user.id}/roles`, {
            onSuccess: () => {
                closeEditRolesModal();
                pendingSensitiveAction.value = null;
                pendingSensitiveUser.value = null;
            },
            onError: (errs) => {
                const errMap = errs as Record<string, string | string[] | undefined>;
                const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
                const roleErr = Array.isArray(errMap.role_ids) ? errMap.role_ids.join(', ') : errMap.role_ids;
                serverErrorMessage.value = msg || roleErr || 'Server rejected role assignment.';
                serverErrorCode.value = typeof errMap.error_code === 'string' ? errMap.error_code : 'DENIED';
            },
        });
    } else if (action === 'disable') {
        router.post(
            `/administration/users/${user.id}/disable`,
            {},
            {
                onError: (errs) => {
                    const errMap = errs as Record<string, string | string[] | undefined>;
                    const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
                    serverErrorMessage.value = msg || 'Server rejected disabling user.';
                    serverErrorCode.value = typeof errMap.error_code === 'string' ? errMap.error_code : 'DENIED';
                },
                onFinish: () => {
                    pendingSensitiveAction.value = null;
                    pendingSensitiveUser.value = null;
                },
            },
        );
    } else if (action === 'reset-password') {
        router.post(
            `/administration/users/${user.id}/reset-password`,
            {},
            {
                onError: (errs) => {
                    const errMap = errs as Record<string, string | string[] | undefined>;
                    const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
                    serverErrorMessage.value = msg || 'Server rejected password reset.';
                    serverErrorCode.value = typeof errMap.error_code === 'string' ? errMap.error_code : 'DENIED';
                },
                onFinish: () => {
                    pendingSensitiveAction.value = null;
                    pendingSensitiveUser.value = null;
                },
            },
        );
    }
}

// Enable User (Non-sensitive or sensitive-checked if needed, but per spec enable is standard POST)
function enableUser(user: UserItem): void {
    if (!canEnable.value || user.is_protected_superadmin) return;
    router.post(
        `/administration/users/${user.id}/enable`,
        {},
        {
            onError: (errs) => {
                const errMap = errs as Record<string, string | string[] | undefined>;
                const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
                serverErrorMessage.value = msg || 'Server rejected enabling user.';
                serverErrorCode.value = typeof errMap.error_code === 'string' ? errMap.error_code : 'DENIED';
            },
            onFinish: () => {
                // finished
            },
        },
    );
}

defineExpose({
    canView,
    canCreate,
    canUpdate,
    canEnable,
    canDisable,
    canResetPassword,
    canAssignRoles,
    canAssignTeam,
    createForm,
    editProfileForm,
    editTeamForm,
    editRolesForm,
    isCreateModalOpen,
    isEditProfileModalOpen,
    isEditTeamModalOpen,
    isEditRolesModalOpen,
    isReauthDialogOpen,
    serverErrorCode,
    serverErrorMessage,
    sensitiveActionTitle,
    sensitiveActionDescription,
    selectedRoleIds,
    openCreateModal,
    closeCreateModal,
    submitCreateUser,
    openEditProfileModal,
    closeEditProfileModal,
    submitEditProfile,
    openEditTeamModal,
    closeEditTeamModal,
    submitEditTeam,
    openEditRolesModal,
    closeEditRolesModal,
    toggleUserRole,
    initiateRolesSave,
    initiateDisableUser,
    initiateResetPassword,
    handleReauthCancel,
    handleReauthSuccess,
    enableUser,
});
</script>

<template>
    <Head title="User Administration - NSCMF" />

    <div class="p-6 max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">User Administration</h1>
                <p class="text-sm text-muted-foreground mt-1">
                    Manage users, profile metadata, Team associations, and role assignments. Permissions are granted
                    strictly through roles; multiple roles provide the effective union of permissions.
                </p>
            </div>
            <button
                v-if="canCreate"
                type="button"
                data-testid="btn-create-user"
                class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                @click="openCreateModal"
            >
                Create User
            </button>
        </div>

        <!-- Global Server Error Display -->
        <div
            v-if="serverErrorMessage"
            data-testid="users-server-error"
            role="alert"
            class="p-4 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-start space-x-2"
        >
            <ShieldAlert class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
                <div class="font-medium">Action Rejected</div>
                <div class="text-xs mt-0.5">{{ serverErrorMessage }}</div>
            </div>
        </div>

        <!-- Principles Banner -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-muted/40 border border-border rounded-lg p-4 flex items-start space-x-3">
                <ShieldCheck class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div class="text-sm">
                    <span class="font-semibold text-foreground">Role-Based Authorization & Session Revocation:</span>
                    <p class="text-muted-foreground mt-0.5">
                        Direct-user permissions are absent. Capabilities derive solely from assigned roles (union
                        model). Access-changing actions (roles, disable, password reset) cause server-side active
                        session revocation.
                    </p>
                </div>
            </div>
            <div class="bg-muted/40 border border-border rounded-lg p-4 flex items-start space-x-3">
                <UserCheck class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div class="text-sm">
                    <span class="font-semibold text-foreground">Team Scope Separation:</span>
                    <p class="text-muted-foreground mt-0.5">
                        Team affiliation is purely organizational metadata. Changing a user's Team does not alter
                        authorization or trigger session revocation.
                    </p>
                </div>
            </div>
        </div>

        <!-- Users Table -->
        <div v-if="canView" class="bg-card border border-border rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-border">
                <thead class="bg-muted/50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            User / Username
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Team
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Assigned Roles
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Status
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border bg-card">
                    <tr v-for="user in users" :key="user.id" :data-testid="`user-row-${user.id}`">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-foreground flex items-center space-x-2">
                                <span>{{ user.name }}</span>
                                <span
                                    v-if="user.is_protected_superadmin"
                                    :data-testid="`protected-badge-${user.id}`"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                >
                                    Protected Superadmin
                                </span>
                            </div>
                            <div class="text-xs text-muted-foreground font-mono mt-0.5">{{ user.username }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <span v-if="user.team_name" :data-testid="`user-team-${user.id}`">
                                {{ user.team_name }}
                            </span>
                            <span
                                v-else-if="user.is_protected_superadmin && user.team_id === null"
                                :data-testid="`user-team-${user.id}`"
                                class="text-muted-foreground italic"
                            >
                                None (Bootstrap Protected)
                            </span>
                            <span v-else :data-testid="`user-team-${user.id}`" class="text-muted-foreground italic">
                                Unassigned
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-foreground">
                            <div class="flex flex-wrap gap-1">
                                <span
                                    v-for="role in user.roles"
                                    :key="role.id"
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                                >
                                    {{ role.name }}
                                </span>
                                <span v-if="user.roles.length === 0" class="text-xs text-muted-foreground italic">
                                    No roles
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                                v-if="user.is_active"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            >
                                Active
                            </span>
                            <span
                                v-else
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/15 text-destructive"
                            >
                                Disabled
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <!-- Edit Profile (Name only) -->
                            <button
                                v-if="canUpdate"
                                type="button"
                                :data-testid="`btn-edit-profile-${user.id}`"
                                class="text-primary hover:text-primary/80 focus:outline-none underline text-xs"
                                @click="openEditProfileModal(user)"
                            >
                                Edit Profile
                            </button>

                            <!-- Assign Team -->
                            <button
                                v-if="canAssignTeam"
                                type="button"
                                :data-testid="`btn-edit-team-${user.id}`"
                                class="text-primary hover:text-primary/80 focus:outline-none underline text-xs"
                                @click="openEditTeamModal(user)"
                            >
                                Assign Team
                            </button>

                            <!-- Assign Roles (Forbidden for Protected Superadmin) -->
                            <button
                                v-if="canAssignRoles && !user.is_protected_superadmin"
                                type="button"
                                :data-testid="`btn-edit-roles-${user.id}`"
                                class="text-primary hover:text-primary/80 focus:outline-none underline text-xs"
                                @click="openEditRolesModal(user)"
                            >
                                Assign Roles
                            </button>

                            <!-- Enable / Disable (Forbidden for Protected Superadmin) -->
                            <template v-if="!user.is_protected_superadmin">
                                <button
                                    v-if="user.is_active && canDisable"
                                    type="button"
                                    :data-testid="`btn-disable-user-${user.id}`"
                                    class="text-destructive hover:text-destructive/80 focus:outline-none underline text-xs"
                                    @click="initiateDisableUser(user)"
                                >
                                    Disable
                                </button>
                                <button
                                    v-else-if="!user.is_active && canEnable"
                                    type="button"
                                    :data-testid="`btn-enable-user-${user.id}`"
                                    class="text-emerald-600 hover:text-emerald-500 focus:outline-none underline text-xs"
                                    @click="enableUser(user)"
                                >
                                    Enable
                                </button>

                                <!-- Reset Password -->
                                <button
                                    v-if="canResetPassword"
                                    type="button"
                                    :data-testid="`btn-reset-password-${user.id}`"
                                    class="text-amber-600 hover:text-amber-500 focus:outline-none underline text-xs"
                                    @click="initiateResetPassword(user)"
                                >
                                    Reset Password
                                </button>
                            </template>
                        </td>
                    </tr>
                    <tr v-if="users.length === 0">
                        <td colspan="5" class="px-6 py-8 text-center text-sm text-muted-foreground">No users found.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Create User Modal (AC1) -->
        <div
            v-if="isCreateModalOpen"
            data-testid="modal-create-user"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Create User</h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Server generates a temporary password upon creation. Password input is strictly prohibited here.
                    </p>
                </div>

                <form data-testid="form-create-user" @submit.prevent="submitCreateUser" class="space-y-4">
                    <FormField
                        id="create-name"
                        label="Full Name"
                        required
                        :error="(createForm.errors as Record<string, string>).name"
                    >
                        <input
                            id="create-name"
                            v-model="createForm.name"
                            type="text"
                            name="name"
                            maxlength="150"
                            required
                            placeholder="e.g. Jane Doe"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="createForm.processing"
                        />
                    </FormField>

                    <FormField
                        id="create-username"
                        label="Username"
                        required
                        :error="(createForm.errors as Record<string, string>).username"
                    >
                        <input
                            id="create-username"
                            v-model="createForm.username"
                            type="text"
                            name="username"
                            maxlength="150"
                            required
                            placeholder="e.g. jane.doe"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="createForm.processing"
                        />
                    </FormField>

                    <FormField
                        id="create-team"
                        label="Team"
                        :error="(createForm.errors as Record<string, string>).team_id"
                    >
                        <select
                            id="create-team"
                            v-model="createForm.team_id"
                            name="team_id"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="createForm.processing"
                        >
                            <option :value="null">-- Select Team --</option>
                            <option v-for="team in teams" :key="team.id" :value="team.id">
                                {{ team.name }}
                            </option>
                        </select>
                    </FormField>

                    <!-- Role Multi-select -->
                    <div>
                        <label class="block text-xs font-medium text-foreground mb-1.5">Assign Roles</label>
                        <div class="space-y-2 border border-border rounded-md p-3 max-h-40 overflow-y-auto">
                            <label
                                v-for="role in roles"
                                :key="role.id"
                                :data-testid="`create-role-option-${role.id}`"
                                class="flex items-center space-x-2 text-xs cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    :value="role.id"
                                    :checked="createForm.role_ids.includes(role.id)"
                                    class="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                    :disabled="createForm.processing"
                                    @change="toggleCreateRole(role.id)"
                                />
                                <span class="flex items-center space-x-1.5">
                                    <span>{{ role.name }}</span>
                                    <span
                                        v-if="role.is_protected"
                                        :data-testid="`create-role-protected-${role.id}`"
                                        class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    >
                                        Protected
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="createForm.processing"
                            @click="closeCreateModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-submit-create-user"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="createForm.processing || !createForm.name.trim() || !createForm.username.trim()"
                        >
                            {{ createForm.processing ? 'Creating...' : 'Create User' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Profile Modal (AC1: PATCH /{user} - name only) -->
        <div
            v-if="isEditProfileModalOpen"
            data-testid="modal-edit-profile"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Edit User Profile</h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Update basic display name. Team, roles, and status are managed through dedicated operations.
                    </p>
                </div>

                <form data-testid="form-edit-profile" @submit.prevent="submitEditProfile" class="space-y-4">
                    <FormField
                        id="edit-name"
                        label="Full Name"
                        required
                        :error="(editProfileForm.errors as Record<string, string>).name"
                    >
                        <input
                            id="edit-name"
                            v-model="editProfileForm.name"
                            type="text"
                            name="name"
                            maxlength="150"
                            required
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="editProfileForm.processing"
                        />
                    </FormField>

                    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="editProfileForm.processing"
                            @click="closeEditProfileModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-submit-edit-profile"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="editProfileForm.processing || !editProfileForm.name.trim()"
                        >
                            {{ editProfileForm.processing ? 'Saving...' : 'Save Changes' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Team Modal (AC4: PUT /{user}/team) -->
        <div
            v-if="isEditTeamModalOpen"
            data-testid="modal-edit-team"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Assign User Team</h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Team assignment is organizational metadata. Changing Team does not alter permissions or revoke
                        sessions.
                    </p>
                </div>

                <form data-testid="form-edit-team" @submit.prevent="submitEditTeam" class="space-y-4">
                    <FormField
                        id="edit-team-select"
                        label="Team"
                        :error="(editTeamForm.errors as Record<string, string>).team_id"
                    >
                        <select
                            id="edit-team-select"
                            v-model="editTeamForm.team_id"
                            name="team_id"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="editTeamForm.processing"
                        >
                            <option :value="null">-- None / Unassigned --</option>
                            <option v-for="team in teams" :key="team.id" :value="team.id">
                                {{ team.name }}
                            </option>
                        </select>
                    </FormField>

                    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="editTeamForm.processing"
                            @click="closeEditTeamModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="btn-submit-edit-team"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="editTeamForm.processing"
                        >
                            {{ editTeamForm.processing ? 'Saving...' : 'Save Team' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Roles Modal (AC2, AC3, AC4: PUT /{user}/roles) -->
        <div
            v-if="isEditRolesModalOpen"
            data-testid="modal-edit-roles"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">Assign Roles: {{ editingRolesUser?.name }}</h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Permissions are granted through roles using union semantics. Saving changes requires password
                        re-authentication and revokes all active sessions for this account.
                    </p>
                </div>

                <div class="space-y-2 border border-border rounded-md p-3 max-h-60 overflow-y-auto">
                    <label
                        v-for="role in roles"
                        :key="role.id"
                        :data-testid="`role-checkbox-label-${role.id}`"
                        class="flex items-center space-x-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/40"
                    >
                        <input
                            type="checkbox"
                            :value="role.id"
                            :checked="selectedRoleIds.includes(role.id)"
                            class="rounded border-input text-primary focus:ring-primary h-4 w-4"
                            @change="toggleUserRole(role.id)"
                        />
                        <span class="flex items-center space-x-1.5 font-medium text-foreground">
                            <span>{{ role.name }}</span>
                            <span
                                v-if="role.is_protected"
                                :data-testid="`role-protected-${role.id}`"
                                class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            >
                                Protected
                            </span>
                        </span>
                    </label>
                </div>

                <div class="flex items-center justify-between pt-4 border-t border-border">
                    <span class="text-xs text-muted-foreground"> {{ selectedRoleIds.length }} role(s) selected </span>
                    <div class="flex items-center space-x-3">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="editRolesForm.processing"
                            @click="closeEditRolesModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            data-testid="btn-save-roles"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="editRolesForm.processing"
                            @click="initiateRolesSave"
                        >
                            {{ editRolesForm.processing ? 'Saving...' : 'Save Roles' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Explicit Sensitive Re-Authentication Dialog (FE-10 / AC3, AC4) -->
        <ReauthenticationDialog
            :open="isReauthDialogOpen"
            :target-action-title="sensitiveActionTitle"
            :target-action-description="sensitiveActionDescription"
            :error-code="serverErrorCode ?? undefined"
            :server-error-message="serverErrorMessage ?? undefined"
            @cancel="handleReauthCancel"
            @success="handleReauthSuccess"
        />
    </div>
</template>
