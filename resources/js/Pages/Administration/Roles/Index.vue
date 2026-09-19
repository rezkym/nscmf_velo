<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { ShieldAlert, ShieldCheck } from '@lucide/vue';
import { computed, ref, watch } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import FormField from '@/components/ui/FormField.vue';

export interface PermissionCatalogItem {
    name: string;
    group: string;
    description?: string;
}

export interface RoleItem {
    id: number;
    name: string;
    is_protected?: boolean;
    permissions: string[];
}

const props = withDefaults(
    defineProps<{
        roles?: RoleItem[];
        permissionCatalog?: PermissionCatalogItem[];
        userPermissions?: string[];
    }>(),
    {
        roles: () => [],
        permissionCatalog: () => [],
        userPermissions: () => [],
    },
);

const userPermissionsList = computed(() => props.userPermissions ?? []);
const canCreateRoles = computed(() => userPermissionsList.value.includes('roles.create'));
const canUpdateRoles = computed(() => userPermissionsList.value.includes('roles.update'));
const canAssignPermissions = computed(() => userPermissionsList.value.includes('permissions.assign'));

// Grouping of canonical permissions from server catalog
const groupedPermissions = computed(() => {
    const groups: Record<string, PermissionCatalogItem[]> = {};
    for (const item of props.permissionCatalog) {
        if (!groups[item.group]) {
            groups[item.group] = [];
        }
        groups[item.group]!.push(item);
    }
    return groups;
});

// Role metadata editing
const isMetadataModalOpen = ref(false);
const editingRole = ref<RoleItem | null>(null);
const metadataForm = useForm({
    name: '',
});

function openCreateModal(): void {
    editingRole.value = null;
    metadataForm.reset();
    metadataForm.clearErrors();
    metadataForm.name = '';
    isMetadataModalOpen.value = true;
}

function openEditMetadataModal(role: RoleItem): void {
    editingRole.value = role;
    metadataForm.reset();
    metadataForm.clearErrors();
    metadataForm.name = role.name;
    isMetadataModalOpen.value = true;
}

function closeMetadataModal(): void {
    isMetadataModalOpen.value = false;
    editingRole.value = null;
    metadataForm.reset();
    metadataForm.clearErrors();
}

function submitMetadataForm(): void {
    if (metadataForm.processing) return;

    if (editingRole.value) {
        metadataForm.patch(`/administration/roles/${editingRole.value.id}`, {
            onSuccess: () => closeMetadataModal(),
        });
    } else {
        metadataForm.post('/administration/roles', {
            onSuccess: () => closeMetadataModal(),
        });
    }
}

// Permission Assignment with Sensitive Re-Auth Flow
const isPermissionsModalOpen = ref(false);
const selectedRoleForPermissions = ref<RoleItem | null>(null);
const selectedPermissions = ref<string[]>([]);
const isReauthDialogOpen = ref(false);
const serverErrorCode = ref<string | null>(null);
const serverErrorMessage = ref<string | null>(null);

const permissionsForm = useForm({
    permissions: [] as string[],
});

const permissionsError = computed(() => {
    const errors = permissionsForm.errors as Record<string, string | undefined>;
    return errors.permissions;
});

const metadataNameError = computed(() => {
    const errors = metadataForm.errors as Record<string, string | undefined>;
    return errors.name;
});

const permissionsDisplayError = computed(() => {
    return serverErrorMessage.value || permissionsError.value || null;
});

watch(
    () => serverErrorCode.value,
    (code) => {
        if (code === 'REAUTH_REQUIRED' || code === 'REAUTH_FAILED') {
            isReauthDialogOpen.value = true;
        }
    },
);

function openAssignPermissionsModal(role: RoleItem): void {
    if (role.is_protected) return;
    selectedRoleForPermissions.value = role;
    selectedPermissions.value = [...role.permissions];
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
    permissionsForm.clearErrors();
    isPermissionsModalOpen.value = true;
}

function closePermissionsModal(): void {
    if (permissionsForm.processing) return;
    isPermissionsModalOpen.value = false;
    selectedRoleForPermissions.value = null;
    selectedPermissions.value = [];
    isReauthDialogOpen.value = false;
    serverErrorCode.value = null;
    serverErrorMessage.value = null;
    permissionsForm.clearErrors();
}

function togglePermission(permName: string): void {
    if (selectedPermissions.value.includes(permName)) {
        selectedPermissions.value = selectedPermissions.value.filter((p) => p !== permName);
    } else {
        selectedPermissions.value.push(permName);
    }
}

function initiateSavePermissions(): void {
    if (permissionsForm.processing || !selectedRoleForPermissions.value) return;
    // Sensitive action reauth trigger (AC3)
    isReauthDialogOpen.value = true;
}

function handleReauthCancel(): void {
    isReauthDialogOpen.value = false;
}

function handleReauthSuccess(): void {
    isReauthDialogOpen.value = false;
    if (!selectedRoleForPermissions.value) return;

    permissionsForm.permissions = [...selectedPermissions.value];
    permissionsForm.put(`/administration/roles/${selectedRoleForPermissions.value.id}/permissions`, {
        onSuccess: () => {
            closePermissionsModal();
        },
        onError: (errs) => {
            const errMap = (errs ?? {}) as Record<string, string | string[] | undefined>;
            const msg = Array.isArray(errMap.message) ? errMap.message.join(', ') : errMap.message;
            const permErr = Array.isArray(errMap.permissions) ? errMap.permissions.join(', ') : errMap.permissions;
            serverErrorMessage.value = msg || permErr || 'Server rejected permission update.';

            const rawCode = errMap.error_code ?? errMap.code;
            serverErrorCode.value = typeof rawCode === 'string' ? rawCode : 'DENIED';
        },
    });
}

defineExpose({
    serverErrorCode,
    serverErrorMessage,
    isMetadataModalOpen,
    isPermissionsModalOpen,
    isReauthDialogOpen,
    selectedPermissions,
    editingRole,
    metadataForm,
    permissionsForm,
    openCreateModal,
    openEditMetadataModal,
    closeMetadataModal,
    submitMetadataForm,
    openAssignPermissionsModal,
    closePermissionsModal,
    togglePermission,
    initiateSavePermissions,
    handleReauthCancel,
    handleReauthSuccess,
});
</script>

<template>
    <Head title="Role and Permission Administration - NSCMF" />

    <div class="p-6 max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Role and Permission Administration</h1>
                <p class="text-sm text-muted-foreground mt-1">
                    Manage roles and assign permissions from canonical server catalog. Users with multiple roles receive
                    the effective union across assigned roles. Changing role permissions revokes active sessions for
                    affected users.
                </p>
            </div>
            <button
                v-if="canCreateRoles"
                type="button"
                data-testid="create-role-btn"
                class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                @click="openCreateModal"
            >
                Create Role
            </button>
        </div>

        <!-- Multi-role union explanation banner -->
        <div class="bg-muted/40 border border-border rounded-lg p-4 flex items-start space-x-3">
            <ShieldCheck class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div class="text-sm">
                <span class="font-semibold text-foreground">Multi-Role Authorization Principle:</span>
                <span class="text-muted-foreground ml-1">
                    Effective permissions are computed as the union across assigned roles. Role labels do not bypass
                    domain invariants. Protected Superadmin rules are enforced server-side.
                </span>
            </div>
        </div>

        <!-- Roles Table -->
        <div class="bg-card border border-border rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-border">
                <thead class="bg-muted/50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Role Name
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Type
                        </th>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Assigned Permissions
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
                    <tr v-for="role in roles" :key="role.id" :data-testid="`role-row-${role.id}`">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {{ role.name }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                                v-if="role.is_protected"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            >
                                Protected
                            </span>
                            <span
                                v-else
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                            >
                                Standard
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-muted-foreground">
                            <span class="font-medium text-foreground">{{ role.permissions.length }}</span> permissions
                            assigned
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            <button
                                v-if="canUpdateRoles && !role.is_protected"
                                type="button"
                                :data-testid="`edit-role-${role.id}`"
                                class="text-primary hover:text-primary/80 focus:outline-none underline"
                                @click="openEditMetadataModal(role)"
                            >
                                Edit Role
                            </button>
                            <button
                                v-if="canAssignPermissions"
                                type="button"
                                :data-testid="`assign-permissions-${role.id}`"
                                :disabled="role.is_protected"
                                class="text-primary hover:text-primary/80 focus:outline-none underline disabled:opacity-50 disabled:cursor-not-allowed"
                                @click="openAssignPermissionsModal(role)"
                            >
                                Assign Permissions
                            </button>
                        </td>
                    </tr>
                    <tr v-if="roles.length === 0">
                        <td colspan="4" class="px-6 py-8 text-center text-sm text-muted-foreground">
                            No roles available.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Role Metadata Modal (AC2: roles.update without permissions.assign) -->
        <div
            v-if="isMetadataModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">
                        {{ editingRole ? 'Edit Role' : 'Create Role' }}
                    </h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Configure role identification. Permission assignments are managed separately.
                    </p>
                </div>

                <form data-testid="role-metadata-form" @submit.prevent="submitMetadataForm" class="space-y-4">
                    <FormField id="role-name" label="Role Name" required :error="metadataNameError">
                        <input
                            id="role-name"
                            v-model="metadataForm.name"
                            type="text"
                            name="name"
                            maxlength="100"
                            required
                            placeholder="e.g. Auditor"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="metadataForm.processing"
                        />
                    </FormField>

                    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="metadataForm.processing"
                            @click="closeMetadataModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="save-role-btn"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="metadataForm.processing || !metadataForm.name.trim()"
                        >
                            {{ metadataForm.processing ? 'Saving...' : 'Save' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Permission Assignment Modal (AC1, AC3, AC4) -->
        <div
            v-if="isPermissionsModalOpen"
            data-testid="permissions-modal"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="bg-card border border-border rounded-xl shadow-lg w-full max-w-3xl p-6 space-y-6 max-h-[90vh] flex flex-col"
            >
                <div class="border-b border-border pb-4">
                    <h3 class="text-lg font-semibold text-foreground">
                        Assign Permissions: {{ selectedRoleForPermissions?.name }}
                    </h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Select permissions from the server catalog. Effective user capabilities equal the union across
                        assigned roles. Changes require password re-authentication and immediately revoke active
                        sessions of affected users.
                    </p>
                </div>

                <!-- Server Error Alert (e.g. PROTECTED_RESOURCE) -->
                <div
                    v-if="permissionsDisplayError"
                    class="p-4 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-start space-x-2"
                >
                    <ShieldAlert class="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <div class="font-medium">Update Rejected</div>
                        <div class="text-xs mt-0.5">
                            {{ permissionsDisplayError }}
                        </div>
                    </div>
                </div>

                <!-- Grouped Permission Selector from Server Catalog -->
                <div class="overflow-y-auto space-y-6 pr-2 flex-1">
                    <div v-for="(items, groupName) in groupedPermissions" :key="groupName" class="space-y-2">
                        <h4
                            class="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-1"
                        >
                            {{ groupName }}
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <label
                                v-for="item in items"
                                :key="item.name"
                                :data-testid="`perm-label-${item.name}`"
                                class="flex items-start space-x-2 p-2 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    :data-testid="`perm-checkbox-${item.name}`"
                                    :checked="selectedPermissions.includes(item.name)"
                                    class="mt-1 rounded border-input text-primary focus:ring-primary h-4 w-4"
                                    @change="togglePermission(item.name)"
                                />
                                <div class="text-xs">
                                    <div class="font-mono text-foreground">{{ item.name }}</div>
                                    <div v-if="item.description" class="text-muted-foreground text-[11px]">
                                        {{ item.description }}
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="flex items-center justify-between pt-4 border-t border-border">
                    <div class="text-xs text-muted-foreground">
                        <span class="font-medium text-foreground">{{ selectedPermissions.length }}</span> permissions
                        selected
                    </div>
                    <div class="flex items-center space-x-3">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="permissionsForm.processing"
                            @click="closePermissionsModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            data-testid="save-permissions-btn"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="permissionsForm.processing"
                            @click="initiateSavePermissions"
                        >
                            {{ permissionsForm.processing ? 'Saving...' : 'Save Permissions' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Explicit Sensitive Re-Authentication Dialog (FE-10 / AC3) -->
        <ReauthenticationDialog
            :open="isReauthDialogOpen"
            target-action-title="Confirm Sensitive Action"
            target-action-description="Modifying role permissions changes the effective permissions of all assigned users and causes immediate session revocation for affected active accounts. Current password confirmation is required."
            :error-code="serverErrorCode ?? undefined"
            :server-error-message="serverErrorMessage ?? undefined"
            @cancel="handleReauthCancel"
            @success="handleReauthSuccess"
        />
    </div>
</template>
