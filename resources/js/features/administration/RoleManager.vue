<script setup lang="ts">
import { useForm, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FormField from '@/components/FormField.vue';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { usePermissions } from '@/composables/usePermissions';
import { pageDomainError } from '@/lib/apiErrors';
import { groupBy, toggleItem } from '@/lib/utils';

export interface PermissionCatalogItem {
    name: string;
    group: string;
    description?: string;
}

export interface RoleRow {
    id: number;
    name: string;
    is_protected?: boolean;
    permissions: string[];
}

const props = withDefaults(defineProps<{ roles?: RoleRow[]; permissionCatalog?: PermissionCatalogItem[] }>(), {
    roles: () => [],
    permissionCatalog: () => [],
});

const { can } = usePermissions();
const page = usePage();

const permissionGroups = computed(() => groupBy(props.permissionCatalog, (item) => item.group));

// Create or rename a role.
const nameForm = useForm({ name: '' });
const isNameFormOpen = ref(false);
const renamingRole = ref<RoleRow | null>(null);

function openNameForm(role: RoleRow | null): void {
    renamingRole.value = role;
    nameForm.clearErrors();
    nameForm.name = role?.name ?? '';
    isNameFormOpen.value = true;
}

function closeNameForm(): void {
    isNameFormOpen.value = false;
    renamingRole.value = null;
}

function submitNameForm(): void {
    const options = { onSuccess: closeNameForm };
    if (renamingRole.value) {
        nameForm.patch(`/administration/roles/${renamingRole.value.id}`, options);
    } else {
        nameForm.post('/administration/roles', options);
    }
}

// Replace a role's permission set. This changes effective access, so it needs re-authentication.
const permissionsForm = useForm({ permissions: [] as string[] });
const permissionsRole = ref<RoleRow | null>(null);
const permissionsError = ref<string | null>(null);
const isReauthOpen = ref(false);
const reauthErrorCode = ref<string | undefined>(undefined);

function openPermissions(role: RoleRow): void {
    permissionsRole.value = role;
    permissionsForm.permissions = [...role.permissions];
    permissionsForm.clearErrors();
    permissionsError.value = null;
}

function closePermissions(): void {
    permissionsRole.value = null;
}

function requestSavePermissions(): void {
    reauthErrorCode.value = undefined;
    permissionsError.value = null;
    isReauthOpen.value = true;
}

/**
 * Domain and action errors arrive flashed, not in the validation error bag (12 §10).
 * A re-authentication code re-opens the prompt; a rejection keeps the dialog and the selection.
 */
// Deep: the page-root bag is mutated in place, so watching its identity alone would miss it.
watch(
    [() => page.flash, () => page.props.flash],
    () => {
        const error = pageDomainError(page);
        if (!error) return;

        if (error.code === 'REAUTH_REQUIRED' || error.code === 'REAUTH_FAILED') {
            reauthErrorCode.value = error.code;
            isReauthOpen.value = true;
            return;
        }

        permissionsError.value = error.message ?? 'The permissions could not be saved.';
    },
    { deep: true },
);

function savePermissions(role: RoleRow): void {
    isReauthOpen.value = false;

    permissionsForm.put(`/administration/roles/${role.id}/permissions`, {
        onSuccess: () => {
            permissionsRole.value = null;
        },
    });
}
</script>

<template>
    <div class="space-y-4">
        <div v-if="can('roles.create')" class="flex justify-end">
            <Button type="button" data-testid="create-role-btn" @click="openNameForm(null)"> Create role </Button>
        </div>

        <div class="overflow-hidden panel">
            <table class="min-w-full divide-y divide-border text-left text-sm">
                <thead class="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                        <th scope="col" class="px-4 py-3">Role</th>
                        <th scope="col" class="px-4 py-3">Permissions</th>
                        <th scope="col" class="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    <tr v-for="role in roles" :key="role.id" :data-testid="`role-row-${role.id}`">
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-2 font-medium text-foreground">
                                {{ role.name }}
                                <Badge v-if="role.is_protected" variant="warning">Protected</Badge>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-muted-foreground">{{ role.permissions.length }} permissions</td>
                        <td class="whitespace-nowrap px-4 py-3 text-right">
                            <template v-if="!role.is_protected">
                                <Button
                                    type="button"
                                    v-if="can('roles.update')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`edit-role-${role.id}`"
                                    @click="openNameForm(role)"
                                >
                                    Rename
                                </Button>
                                <Button
                                    type="button"
                                    v-if="can('permissions.assign')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`assign-permissions-${role.id}`"
                                    @click="openPermissions(role)"
                                >
                                    Permissions
                                </Button>
                            </template>
                        </td>
                    </tr>
                    <tr v-if="roles.length === 0">
                        <td colspan="3" class="px-4 py-8 text-center text-muted-foreground">No roles yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Dialog
        :open="isNameFormOpen"
        @update:open="
            (open) => {
                if (!open && !nameForm.processing) closeNameForm();
            }
        "
    >
        <DialogContent :show-close-button="!nameForm.processing">
            <DialogHeader>
                <DialogTitle>{{ renamingRole ? 'Rename role' : 'Create role' }}</DialogTitle>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="submitNameForm">
                <FormField id="role-name" label="Name" required :error="nameForm.errors.name">
                    <template #default="{ id, describedBy }">
                        <Input
                            :id="id"
                            v-model="nameForm.name"
                            type="text"
                            maxlength="255"
                            required
                            :aria-describedby="describedBy"
                            :disabled="nameForm.processing"
                        />
                    </template>
                </FormField>
                <div class="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" :disabled="nameForm.processing" @click="closeNameForm"
                        >Cancel</Button
                    >
                    <Button
                        type="submit"
                        data-testid="save-role-btn"
                        :disabled="nameForm.processing || !nameForm.name.trim()"
                    >
                        {{ nameForm.processing ? 'Saving…' : 'Save' }}
                    </Button>
                </div>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="permissionsRole !== null && !isReauthOpen"
        @update:open="
            (open) => {
                if (!open && !permissionsForm.processing) closePermissions();
            }
        "
    >
        <DialogContent class="sm:max-w-2xl" :show-close-button="!permissionsForm.processing">
            <DialogHeader>
                <DialogTitle>{{ `Permissions for ${permissionsRole?.name ?? ''}` }}</DialogTitle>
                <DialogDescription
                    >Saving changes access for everyone with this role and signs them out of active
                    sessions.</DialogDescription
                >
            </DialogHeader>
            <div class="space-y-4">
                <Alert v-if="permissionsError" variant="destructive"
                    ><AlertDescription>{{ permissionsError }}</AlertDescription></Alert
                >
                <fieldset v-for="(items, group) in permissionGroups" :key="group" class="space-y-2">
                    <legend class="text-xs font-semibold uppercase text-muted-foreground">{{ group }}</legend>
                    <label v-for="item in items" :key="item.name" class="flex items-start gap-2 text-sm">
                        <Checkbox
                            class="mt-0.5"
                            :data-testid="`permission-${item.name}`"
                            :model-value="permissionsForm.permissions.includes(item.name)"
                            @update:model-value="
                                permissionsForm.permissions = toggleItem(permissionsForm.permissions, item.name)
                            "
                        />
                        <span>
                            <span class="font-mono text-foreground">{{ item.name }}</span>
                            <span v-if="item.description" class="block text-xs text-muted-foreground">
                                {{ item.description }}
                            </span>
                        </span>
                    </label>
                </fieldset>
            </div>
            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    :disabled="permissionsForm.processing"
                    @click="closePermissions"
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    data-testid="save-permissions-btn"
                    :disabled="permissionsForm.processing"
                    @click="requestSavePermissions"
                >
                    {{ permissionsForm.processing ? 'Saving…' : 'Save permissions' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <ReauthenticationDialog
        v-if="permissionsRole"
        :open="isReauthOpen"
        target-action-title="Confirm permission change"
        target-action-description="Everyone with this role gets the new permissions and is signed out of active sessions."
        :error-code="reauthErrorCode"
        @success="savePermissions(permissionsRole)"
        @cancel="isReauthOpen = false"
    />
</template>
