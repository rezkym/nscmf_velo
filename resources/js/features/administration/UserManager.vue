<script setup lang="ts">
import { router, useForm, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import ReauthenticationDialog from '@/components/ReauthenticationDialog.vue';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
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
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/composables/usePermissions';
import OneTimeCredential from '@/features/administration/OneTimeCredential.vue';
import {
    type TemporaryCredential,
    temporaryCredentialFromResponse,
} from '@/features/administration/temporaryCredential';
import { firstFieldError, pageDomainError } from '@/lib/apiErrors';
import { type JsonResult, sendJson } from '@/lib/http';
import { toggleItem } from '@/lib/utils';

export interface TeamOption {
    id: number;
    name: string;
}

export interface RoleOption {
    id: number;
    name: string;
    is_protected?: boolean;
}

export interface UserRow {
    id: number;
    name: string;
    username: string;
    team_id: number | null;
    team_name: string | null;
    is_active: boolean;
    is_protected_superadmin: boolean;
    roles: Pick<RoleOption, 'id' | 'name'>[];
}

withDefaults(defineProps<{ users?: UserRow[]; teams?: TeamOption[]; roles?: RoleOption[] }>(), {
    users: () => [],
    teams: () => [],
    roles: () => [],
});

const { can } = usePermissions();
const page = usePage();

// Plain dialogs (create form, profile, team, roles) — at most one is open.
type Dialog = { kind: 'create' } | { kind: 'profile' | 'team' | 'roles'; user: UserRow };
const dialog = ref<Dialog | null>(null);
const dialogUser = computed(() => (dialog.value && 'user' in dialog.value ? dialog.value.user : null));

const createForm = useForm({ name: '', username: '', team_id: null as number | null, role_ids: [] as number[] });
const profileForm = useForm({ name: '' });
const teamForm = useForm({ team_id: null as number | null });
const rolesForm = useForm({ role_ids: [] as number[] });

function openDialog(next: Dialog): void {
    createForm.clearErrors();
    profileForm.clearErrors();
    teamForm.clearErrors();
    rolesForm.clearErrors();
    formError.value = null;
    if (next.kind === 'create') createForm.reset();
    if (next.kind === 'profile') profileForm.name = next.user.name;
    if (next.kind === 'team') teamForm.team_id = next.user.team_id;
    if (next.kind === 'roles') rolesForm.role_ids = next.user.roles.map((role) => role.id);
    dialog.value = next;
}

function closeDialog(): void {
    dialog.value = null;
}

function submitProfile(user: UserRow): void {
    profileForm.patch(`/administration/users/${user.id}`, { onSuccess: closeDialog });
}

function submitTeam(user: UserRow): void {
    teamForm.put(`/administration/users/${user.id}/team`, { onSuccess: closeDialog });
}

function enableUser(user: UserRow): void {
    pageError.value = null;
    router.post(`/administration/users/${user.id}/enable`, {});
}

// Sensitive actions need a fresh current-password confirmation first (10 §24, 12 §79).
type SensitiveAction = { kind: 'create' } | { kind: 'roles' | 'disable' | 'reset'; user: UserRow };

const SENSITIVE_COPY: Record<SensitiveAction['kind'], { title: string; description: string }> = {
    create: {
        title: 'Confirm user creation',
        description: 'A temporary password is generated and shown to you once after the user is created.',
    },
    roles: {
        title: 'Confirm role change',
        description: "Changing roles changes this user's access. They are signed out of all active sessions.",
    },
    disable: {
        title: 'Confirm disabling user',
        description: 'The user can no longer sign in and is signed out of all active sessions.',
    },
    reset: {
        title: 'Confirm password reset',
        description:
            'A new temporary password is generated and shown to you once. The user is signed out of all active sessions.',
    },
};

const pendingAction = ref<SensitiveAction | null>(null);
const isReauthOpen = ref(false);
const reauthErrorCode = ref<string | undefined>(undefined);
const formError = ref<string | null>(null);
const pageError = ref<string | null>(null);
const credential = ref<TemporaryCredential | null>(null);

function requestSensitive(action: SensitiveAction): void {
    pendingAction.value = action;
    reauthErrorCode.value = undefined;
    formError.value = null;
    pageError.value = null;
    isReauthOpen.value = true;
}

function cancelSensitive(): void {
    isReauthOpen.value = false;
    pendingAction.value = null;
}

function runSensitive(action: SensitiveAction): void {
    isReauthOpen.value = false;

    const finish = () => {
        pendingAction.value = null;
    };

    switch (action.kind) {
        case 'create':
            void createUser();
            break;
        case 'roles':
            rolesForm.put(`/administration/users/${action.user.id}/roles`, {
                onSuccess: () => {
                    finish();
                    closeDialog();
                },
            });
            break;
        case 'disable':
            router.post(
                `/administration/users/${action.user.id}/disable`,
                {},
                {
                    onSuccess: finish,
                },
            );
            break;
        case 'reset':
            void resetPassword(action.user);
            break;
    }
}

/**
 * Create and reset are the only JSON calls here: their success body is the single place the
 * one-time password ever appears (12 §81, §85, §96.2). Nothing is flashed or kept in page state.
 */
async function createUser(): Promise<void> {
    createForm.processing = true;
    createForm.clearErrors();
    const body = {
        name: createForm.name,
        username: createForm.username,
        team_id: createForm.team_id,
        role_ids: [...createForm.role_ids],
    };

    try {
        const result = await sendJson('POST', '/administration/users', body);
        if (result.ok) {
            pendingAction.value = null;
            closeDialog();
            revealCredential(result, body.username);
            router.reload({ only: ['users', 'meta'] });
            return;
        }

        handleJsonFailure(result, 'create');
    } finally {
        createForm.processing = false;
    }
}

async function resetPassword(user: UserRow): Promise<void> {
    const result = await sendJson('POST', `/administration/users/${user.id}/reset-password`, {});
    if (result.ok) {
        pendingAction.value = null;
        revealCredential(result, user.username);
        return;
    }

    handleJsonFailure(result, 'reset');
}

function handleJsonFailure(result: Extract<JsonResult, { ok: false }>, kind: 'create' | 'reset'): void {
    const code = result.error?.code;

    if (code === 'REAUTH_REQUIRED' || code === 'REAUTH_FAILED') {
        reauthErrorCode.value = code;
        isReauthOpen.value = true;
        return;
    }

    pendingAction.value = null;

    if (kind === 'create' && result.status === 422 && result.error?.errors) {
        for (const field of ['name', 'username', 'team_id', 'role_ids'] as const) {
            const message = firstFieldError(result.error, field);
            if (message) createForm.setError(field, message);
        }
        return;
    }

    const message = result.error?.message || 'The action could not be completed.';
    if (kind === 'create') {
        formError.value = message;
    } else {
        pageError.value = message;
    }
}

/**
 * Domain and action errors arrive flashed, not in the validation error bag (12 §10).
 * A re-authentication code re-opens the prompt; anything else is shown where the user is looking.
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

        pendingAction.value = null;
        const message = error.message ?? 'The action could not be completed.';
        if (dialog.value) {
            formError.value = message;
        } else {
            pageError.value = message;
        }
    },
    { deep: true },
);

function revealCredential(result: Extract<JsonResult, { ok: true }>, username: string): void {
    const revealed = temporaryCredentialFromResponse(result.body);
    if (revealed) credential.value = { ...revealed, username: revealed.username ?? username };
}
</script>

<template>
    <div class="space-y-4">
        <div v-if="can('users.create')" class="flex justify-end">
            <Button type="button" data-testid="btn-create-user" @click="openDialog({ kind: 'create' })">
                Create user
            </Button>
        </div>

        <Alert v-if="pageError" variant="destructive" data-testid="users-server-error">
            <AlertDescription>{{ pageError }}</AlertDescription>
        </Alert>

        <Card class="gap-0 overflow-hidden py-0">
            <Table>
                <TableHeader class="bg-muted/50">
                    <TableRow>
                        <TableHead class="px-4 py-3">User</TableHead>
                        <TableHead class="px-4 py-3">Team</TableHead>
                        <TableHead class="px-4 py-3">Roles</TableHead>
                        <TableHead class="px-4 py-3">Status</TableHead>
                        <TableHead class="px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="user in users" :key="user.id" :data-testid="`user-row-${user.id}`">
                        <TableCell class="px-4 py-3">
                            <div class="flex items-center gap-2 font-medium">
                                {{ user.name }}
                                <Badge v-if="user.is_protected_superadmin" variant="warning">Protected</Badge>
                            </div>
                            <div class="font-mono text-xs text-muted-foreground">{{ user.username }}</div>
                        </TableCell>
                        <TableCell class="px-4 py-3">
                            <span v-if="user.team_name">{{ user.team_name }}</span>
                            <span v-else class="text-muted-foreground">No team</span>
                        </TableCell>
                        <TableCell class="px-4 py-3">
                            <div v-if="user.roles.length > 0" class="flex flex-wrap gap-1">
                                <Badge variant="secondary" v-for="role in user.roles" :key="role.id">{{
                                    role.name
                                }}</Badge>
                            </div>
                            <span v-else class="text-muted-foreground">No roles</span>
                        </TableCell>
                        <TableCell class="px-4 py-3">
                            <Badge :variant="user.is_active ? 'success' : 'secondary'">
                                {{ user.is_active ? 'Active' : 'Disabled' }}
                            </Badge>
                        </TableCell>
                        <TableCell class="whitespace-nowrap px-4 py-3 text-right">
                            <Button
                                type="button"
                                v-if="can('users.update')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`btn-edit-profile-${user.id}`"
                                @click="openDialog({ kind: 'profile', user })"
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                v-if="can('users.assign_team') || can('teams.assign_users')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`btn-edit-team-${user.id}`"
                                @click="openDialog({ kind: 'team', user })"
                            >
                                Team
                            </Button>
                            <template v-if="!user.is_protected_superadmin">
                                <Button
                                    type="button"
                                    v-if="can('users.assign_roles')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`btn-edit-roles-${user.id}`"
                                    @click="openDialog({ kind: 'roles', user })"
                                >
                                    Roles
                                </Button>
                                <Button
                                    type="button"
                                    v-if="can('users.reset_password')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`btn-reset-password-${user.id}`"
                                    @click="requestSensitive({ kind: 'reset', user })"
                                >
                                    Reset password
                                </Button>
                                <Button
                                    type="button"
                                    v-if="user.is_active && can('users.disable')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`btn-disable-user-${user.id}`"
                                    @click="requestSensitive({ kind: 'disable', user })"
                                >
                                    Disable
                                </Button>
                                <Button
                                    type="button"
                                    v-if="!user.is_active && can('users.enable')"
                                    variant="ghost"
                                    size="sm"
                                    :data-testid="`btn-enable-user-${user.id}`"
                                    @click="enableUser(user)"
                                >
                                    Enable
                                </Button>
                            </template>
                        </TableCell>
                    </TableRow>
                    <TableEmpty v-if="users.length === 0" :colspan="5" class="text-muted-foreground"
                        >No users yet.</TableEmpty
                    >
                </TableBody>
            </Table>
        </Card>
    </div>

    <!-- The form dialog steps aside while re-authentication is asked, so only one dialog traps focus. -->
    <Dialog
        :open="dialog?.kind === 'create' && !isReauthOpen"
        @update:open="
            (open) => {
                if (!open && !createForm.processing) closeDialog();
            }
        "
    >
        <DialogContent :show-close-button="!createForm.processing">
            <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
                <DialogDescription
                    >The server generates the temporary password; you cannot set one here.</DialogDescription
                >
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="requestSensitive({ kind: 'create' })">
                <Alert v-if="formError" variant="destructive">
                    <AlertDescription>{{ formError }}</AlertDescription>
                </Alert>
                <FormField id="user-name" label="Name" required :error="createForm.errors.name">
                    <template #default="{ id, describedBy }">
                        <Input
                            :id="id"
                            v-model="createForm.name"
                            type="text"
                            maxlength="150"
                            :aria-describedby="describedBy"
                        />
                    </template>
                </FormField>
                <FormField id="user-username" label="Username" required :error="createForm.errors.username">
                    <template #default="{ id, describedBy }">
                        <Input
                            :id="id"
                            v-model="createForm.username"
                            type="text"
                            maxlength="150"
                            autocomplete="off"
                            :aria-describedby="describedBy"
                        />
                    </template>
                </FormField>
                <FormField id="user-team" label="Team" required :error="createForm.errors.team_id">
                    <template #default="{ id, describedBy }">
                        <NativeSelect
                            class="w-full"
                            :id="id"
                            v-model.number="createForm.team_id"
                            :aria-describedby="describedBy"
                        >
                            <option :value="null" disabled>Select a team</option>
                            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                        </NativeSelect>
                    </template>
                </FormField>
                <fieldset class="space-y-2">
                    <legend class="text-sm font-medium">Roles</legend>
                    <label
                        v-for="role in roles"
                        :key="role.id"
                        :data-testid="`create-role-option-${role.id}`"
                        class="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            :model-value="createForm.role_ids.includes(role.id)"
                            @update:model-value="createForm.role_ids = toggleItem(createForm.role_ids, role.id)"
                        />
                        {{ role.name }}
                        <Badge v-if="role.is_protected" variant="warning">Protected</Badge>
                    </label>
                    <p v-if="createForm.errors.role_ids" class="text-xs text-destructive">
                        {{ createForm.errors.role_ids }}
                    </p>
                </fieldset>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="createForm.processing" @click="closeDialog"
                        >Cancel</Button
                    >
                    <Button type="submit" data-testid="btn-submit-create-user" :disabled="createForm.processing">
                        {{ createForm.processing ? 'Creating…' : 'Create user' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="dialog?.kind === 'profile'"
        @update:open="
            (open) => {
                if (!open && !profileForm.processing) closeDialog();
            }
        "
    >
        <DialogContent :show-close-button="!profileForm.processing">
            <DialogHeader>
                <DialogTitle>Edit user</DialogTitle>
                <DialogDescription v-if="dialogUser?.username">{{ dialogUser?.username }}</DialogDescription>
            </DialogHeader>
            <form v-if="dialogUser" class="space-y-4" @submit.prevent="submitProfile(dialogUser)">
                <FormField id="profile-name" label="Name" required :error="profileForm.errors.name">
                    <template #default="{ id, describedBy }">
                        <Input
                            :id="id"
                            v-model="profileForm.name"
                            type="text"
                            maxlength="150"
                            :aria-describedby="describedBy"
                        />
                    </template>
                </FormField>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="profileForm.processing" @click="closeDialog"
                        >Cancel</Button
                    >
                    <Button type="submit" :disabled="profileForm.processing || !profileForm.name.trim()">
                        {{ profileForm.processing ? 'Saving…' : 'Save' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="dialog?.kind === 'team'"
        @update:open="
            (open) => {
                if (!open && !teamForm.processing) closeDialog();
            }
        "
    >
        <DialogContent :show-close-button="!teamForm.processing">
            <DialogHeader>
                <DialogTitle>Change team</DialogTitle>
                <DialogDescription
                    >The team is organizational information only; changing it does not change
                    permissions.</DialogDescription
                >
            </DialogHeader>
            <form v-if="dialogUser" class="space-y-4" @submit.prevent="submitTeam(dialogUser)">
                <FormField id="user-team-assignment" label="Team" required :error="teamForm.errors.team_id">
                    <template #default="{ id, describedBy }">
                        <NativeSelect
                            class="w-full"
                            :id="id"
                            v-model.number="teamForm.team_id"
                            :aria-describedby="describedBy"
                        >
                            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</option>
                        </NativeSelect>
                    </template>
                </FormField>
                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="teamForm.processing" @click="closeDialog"
                        >Cancel</Button
                    >
                    <Button type="submit" :disabled="teamForm.processing || teamForm.team_id === null">
                        {{ teamForm.processing ? 'Saving…' : 'Save' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="dialog?.kind === 'roles' && !isReauthOpen"
        @update:open="
            (open) => {
                if (!open && !rolesForm.processing) closeDialog();
            }
        "
    >
        <DialogContent :show-close-button="!rolesForm.processing">
            <DialogHeader>
                <DialogTitle>{{ `Roles for ${dialogUser?.name ?? ''}` }}</DialogTitle>
                <DialogDescription
                    >Changing roles changes access immediately and signs the user out of all active
                    sessions.</DialogDescription
                >
            </DialogHeader>
            <div v-if="dialogUser" class="space-y-4">
                <Alert v-if="formError" variant="destructive">
                    <AlertDescription>{{ formError }}</AlertDescription>
                </Alert>
                <fieldset class="space-y-2">
                    <legend class="sr-only">Roles</legend>
                    <label
                        v-for="role in roles"
                        :key="role.id"
                        :data-testid="`role-option-${role.id}`"
                        class="flex items-center gap-2 text-sm"
                    >
                        <Checkbox
                            :model-value="rolesForm.role_ids.includes(role.id)"
                            @update:model-value="rolesForm.role_ids = toggleItem(rolesForm.role_ids, role.id)"
                        />
                        {{ role.name }}
                        <Badge v-if="role.is_protected" variant="warning">Protected</Badge>
                    </label>
                    <p v-if="rolesForm.errors.role_ids" class="text-xs text-destructive">
                        {{ rolesForm.errors.role_ids }}
                    </p>
                </fieldset>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" :disabled="rolesForm.processing" @click="closeDialog"
                    >Cancel</Button
                >
                <Button
                    type="button"
                    data-testid="btn-save-roles"
                    :disabled="rolesForm.processing || !dialogUser"
                    @click="dialogUser && requestSensitive({ kind: 'roles', user: dialogUser })"
                >
                    {{ rolesForm.processing ? 'Saving…' : 'Save roles' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <ReauthenticationDialog
        v-if="pendingAction"
        :open="isReauthOpen"
        :target-action-title="SENSITIVE_COPY[pendingAction.kind].title"
        :target-action-description="SENSITIVE_COPY[pendingAction.kind].description"
        :error-code="reauthErrorCode"
        @success="runSensitive(pendingAction)"
        @cancel="cancelSensitive"
    />

    <OneTimeCredential
        :open="credential !== null"
        :temporary-password="credential?.password"
        :username="credential?.username"
        @dismiss="credential = null"
    />
</template>
