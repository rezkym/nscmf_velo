<script setup lang="ts">
import { Head, router, useForm } from '@inertiajs/vue3';
import { computed, ref } from 'vue';

import FormField from '@/components/ui/FormField.vue';

export interface Team {
    id: number;
    name: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface HistoricalSnapshotRecord {
    id: number;
    request_no: string;
    team_id: number;
    team_snapshot_name: string;
}

const props = withDefaults(
    defineProps<{
        teams?: Team[];
        historicalSnapshots?: HistoricalSnapshotRecord[];
        permissions?: string[];
    }>(),
    {
        teams: () => [],
        historicalSnapshots: () => [],
        permissions: () => [],
    },
);

const permissionsList = computed(() => props.permissions ?? []);

const canCreate = computed(() => permissionsList.value.includes('teams.create'));
const canUpdate = computed(() => permissionsList.value.includes('teams.update'));
const canArchive = computed(() => permissionsList.value.includes('teams.archive'));

// Form state
const isFormModalOpen = ref(false);
const editingTeam = ref<Team | null>(null);

const form = useForm({
    name: '',
});

const nameError = computed(() => {
    const errors = form.errors as Record<string, string | undefined>;
    return errors.name;
});

function openCreateModal(): void {
    editingTeam.value = null;
    form.reset();
    form.clearErrors();
    form.name = '';
    isFormModalOpen.value = true;
}

function openEditModal(team: Team): void {
    editingTeam.value = team;
    form.reset();
    form.clearErrors();
    form.name = team.name;
    isFormModalOpen.value = true;
}

function closeFormModal(): void {
    isFormModalOpen.value = false;
    editingTeam.value = null;
    form.reset();
    form.clearErrors();
}

function submitForm(): void {
    if (form.processing) return;

    if (editingTeam.value) {
        form.patch(`/administration/teams/${editingTeam.value.id}`, {
            onSuccess: () => closeFormModal(),
        });
    } else {
        form.post('/administration/teams', {
            onSuccess: () => closeFormModal(),
        });
    }
}

// Lifecycle action state (Deactivate / Reactivate)
const isLifecycleDialogOpen = ref(false);
const pendingLifecycleTeam = ref<Team | null>(null);
const pendingLifecycleAction = ref<'deactivate' | 'reactivate'>('deactivate');
const lifecyclePending = ref(false);

function openDeactivateDialog(team: Team): void {
    pendingLifecycleTeam.value = team;
    pendingLifecycleAction.value = 'deactivate';
    isLifecycleDialogOpen.value = true;
}

function openReactivateDialog(team: Team): void {
    pendingLifecycleTeam.value = team;
    pendingLifecycleAction.value = 'reactivate';
    isLifecycleDialogOpen.value = true;
}

function confirmLifecycleAction(): void {
    if (lifecyclePending.value || !pendingLifecycleTeam.value) return;

    lifecyclePending.value = true;
    const teamId = pendingLifecycleTeam.value.id;
    const action = pendingLifecycleAction.value;

    router.post(
        `/administration/teams/${teamId}/${action}`,
        {},
        {
            onFinish: () => {
                lifecyclePending.value = false;
                isLifecycleDialogOpen.value = false;
                pendingLifecycleTeam.value = null;
            },
        },
    );
}

function cancelLifecycleAction(): void {
    if (lifecyclePending.value) return;
    isLifecycleDialogOpen.value = false;
    pendingLifecycleTeam.value = null;
}
</script>

<template>
    <Head title="Team Administration - NSCMF" />

    <div class="p-6 max-w-7xl mx-auto space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Team Administration</h1>
                <p class="text-sm text-muted-foreground">
                    Manage organizational teams. Team membership is organizational metadata only and does not filter or
                    grant workflow authority.
                </p>
            </div>
            <button
                v-if="canCreate"
                type="button"
                data-testid="create-team-btn"
                class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                @click="openCreateModal"
            >
                Create Team
            </button>
        </div>

        <!-- Teams Table -->
        <div class="bg-card border border-border rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-border">
                <thead class="bg-muted/50">
                    <tr>
                        <th
                            scope="col"
                            class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                            Team Name
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
                    <tr v-for="team in teams" :key="team.id">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {{ team.name }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                                :class="[
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                    team.is_active
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-muted text-muted-foreground',
                                ]"
                            >
                                {{ team.is_active ? 'Active' : 'Inactive' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                            <button
                                v-if="canUpdate"
                                type="button"
                                :data-testid="`edit-team-${team.id}`"
                                class="text-primary hover:text-primary/80 focus:outline-none underline"
                                @click="openEditModal(team)"
                            >
                                Edit
                            </button>
                            <button
                                v-if="canArchive && team.is_active"
                                type="button"
                                :data-testid="`deactivate-team-${team.id}`"
                                class="text-amber-600 hover:text-amber-500 focus:outline-none underline"
                                @click="openDeactivateDialog(team)"
                            >
                                Deactivate
                            </button>
                            <button
                                v-if="canArchive && !team.is_active"
                                type="button"
                                :data-testid="`reactivate-team-${team.id}`"
                                class="text-emerald-600 hover:text-emerald-500 focus:outline-none underline"
                                @click="openReactivateDialog(team)"
                            >
                                Reactivate
                            </button>
                        </td>
                    </tr>
                    <tr v-if="teams.length === 0">
                        <td colspan="3" class="px-6 py-8 text-center text-sm text-muted-foreground">
                            No teams configured.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Historical Snapshot Section (AC4) -->
        <div v-if="historicalSnapshots.length > 0" class="mt-8 space-y-3">
            <h2 class="text-lg font-semibold text-foreground">Historical Snapshot Verification</h2>
            <p class="text-xs text-muted-foreground">
                Verified that historical record snapshots preserve original team metadata regardless of master data
                lifecycle changes.
            </p>
            <div class="bg-card border border-border rounded-lg p-4">
                <ul class="divide-y divide-border">
                    <li v-for="rec in historicalSnapshots" :key="rec.id" class="py-2 text-sm flex justify-between">
                        <span class="font-mono text-xs">{{ rec.request_no }}</span>
                        <span class="text-foreground">{{ rec.team_snapshot_name }}</span>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Create / Edit Modal (AC1 & AC3: Only name field max 150, no code/desc, no scope selector) -->
        <div
            v-if="isFormModalOpen"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6">
                <div>
                    <h3 class="text-lg font-semibold text-foreground">
                        {{ editingTeam ? 'Edit Team' : 'Create Team' }}
                    </h3>
                    <p class="text-xs text-muted-foreground mt-1">
                        Team represents organizational categorization only.
                    </p>
                </div>

                <form @submit.prevent="submitForm" class="space-y-4">
                    <FormField id="team-name" label="Team Name" required :error="nameError">
                        <input
                            id="team-name"
                            v-model="form.name"
                            type="text"
                            name="name"
                            maxlength="150"
                            required
                            placeholder="e.g. Team NOC"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            :disabled="form.processing"
                        />
                    </FormField>
                    <p v-if="nameError" data-testid="team-name-error" class="text-xs text-destructive mt-1">
                        {{ nameError }}
                    </p>

                    <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                            :disabled="form.processing"
                            @click="closeFormModal"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            data-testid="save-team-btn"
                            class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            :disabled="form.processing || !form.name.trim()"
                        >
                            {{ form.processing ? 'Saving...' : 'Save' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Lifecycle Confirm Dialog (AC2) -->
        <div
            v-if="isLifecycleDialogOpen"
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div class="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
                <h3 class="text-lg font-semibold text-foreground">
                    {{ pendingLifecycleAction === 'deactivate' ? 'Deactivate Team' : 'Reactivate Team' }}
                </h3>
                <p class="text-sm text-muted-foreground">
                    {{
                        pendingLifecycleAction === 'deactivate'
                            ? 'Deactivating this team affects active Team eligibility during new record creation. Deactivated teams cannot be selected for new requests, but historical records remain unchanged. This does not alter review or approval authority.'
                            : 'Reactivating this team restores active Team eligibility for new record creation.'
                    }}
                </p>

                <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                    <button
                        type="button"
                        class="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80 focus:outline-none"
                        :disabled="lifecyclePending"
                        @click="cancelLifecycleAction"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        data-testid="confirm-lifecycle-action"
                        class="px-4 py-2 text-sm font-medium text-white rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2"
                        :class="
                            pendingLifecycleAction === 'deactivate'
                                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                                : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                        "
                        :disabled="lifecyclePending"
                        @click="confirmLifecycleAction"
                    >
                        {{ lifecyclePending ? 'Processing...' : 'Confirm' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
