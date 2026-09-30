<script setup lang="ts">
import { router, useForm, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FormField from '@/components/FormField.vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ResourceTable, { type ColumnDef, type TablePaginationMeta } from '@/components/ResourceTable.vue';
import RowActionsMenu, { type RowAction } from '@/components/RowActionsMenu.vue';
import { usePermissions } from '@/composables/usePermissions';
import { type SearchQuery, useSearchTable } from '@/composables/useTableVisit';
import { pageDomainError } from '@/lib/apiErrors';

export interface Team extends Record<string, unknown> {
    id: number;
    name: string;
    is_active: boolean;
}

type LifecycleAction = 'deactivate' | 'reactivate';

const props = withDefaults(defineProps<{ teams?: Team[]; meta?: TablePaginationMeta; query?: SearchQuery }>(), {
    teams: () => [],
});

const { can } = usePermissions();
const page = usePage();

const columns: ColumnDef[] = [
    { key: 'name', label: 'Name' },
    { key: 'is_active', label: 'Status' },
];
const { loading, paged, tableQuery, onQuery } = useSearchTable('/administration/teams', () => props.query);
const row = (item: unknown) => item as Team;

function teamActions(team: Team): RowAction[] {
    return [
        { label: 'Edit', testId: `edit-team-${team.id}`, visible: can('teams.update'), run: () => openForm(team) },
        {
            label: team.is_active ? 'Deactivate' : 'Reactivate',
            testId: `${team.is_active ? 'deactivate' : 'reactivate'}-team-${team.id}`,
            visible: can('teams.archive'),
            run: () => openLifecycle(team),
        },
    ];
}

const LIFECYCLE_COPY: Record<LifecycleAction, { title: string; description: string }> = {
    deactivate: {
        title: 'Deactivate team',
        description:
            'Members of a deactivated team cannot create new records until they move to an active team. Existing records keep their team, and this does not change who can review or approve.',
    },
    reactivate: {
        title: 'Reactivate team',
        description: 'Members of this team will be able to create new records again.',
    },
};

const form = useForm({ name: '' });
const isFormOpen = ref(false);
const editingTeam = ref<Team | null>(null);

function openForm(team: Team | null): void {
    editingTeam.value = team;
    form.clearErrors();
    form.name = team?.name ?? '';
    isFormOpen.value = true;
}

function closeForm(): void {
    isFormOpen.value = false;
    editingTeam.value = null;
    form.reset();
    form.clearErrors();
}

/** Domain and action errors arrive flashed, not in the validation error bag (12 §10). */
// Deep: the page-root bag is mutated in place, so watching its identity alone would miss it.
watch(
    [() => page.flash, () => page.props.flash],
    () => {
        const error = pageDomainError(page);
        if (!error) return;

        lifecycleError.value = error.message ?? 'The team could not be updated.';
        lifecyclePending.value = false;
    },
    { deep: true },
);

function submitForm(): void {
    if (form.processing) return;

    const options = { onSuccess: closeForm };
    if (editingTeam.value) {
        form.patch(`/administration/teams/${editingTeam.value.id}`, options);
    } else {
        form.post('/administration/teams', options);
    }
}

const lifecycle = ref<{ team: Team; action: LifecycleAction } | null>(null);
const lifecyclePending = ref(false);
const lifecycleError = ref<string | null>(null);
const lifecycleCopy = computed(() => (lifecycle.value ? LIFECYCLE_COPY[lifecycle.value.action] : null));

function openLifecycle(team: Team): void {
    lifecycle.value = { team, action: team.is_active ? 'deactivate' : 'reactivate' };
    lifecycleError.value = null;
}

function closeLifecycle(): void {
    lifecycle.value = null;
}

function confirmLifecycle(entry: { team: Team; action: LifecycleAction }): void {
    const { team, action } = entry;
    lifecyclePending.value = true;
    lifecycleError.value = null;

    router.post(
        `/administration/teams/${team.id}/${action}`,
        {},
        {
            onSuccess: () => {
                // A flashed domain error comes back on a successful redirect; the dialog stays open for it.
                if (pageDomainError(page)) return;
                lifecycle.value = null;
            },
            onFinish: () => {
                lifecyclePending.value = false;
            },
        },
    );
}
</script>

<template>
    <div class="space-y-4">
        <div v-if="can('teams.create')" class="flex justify-end">
            <Button type="button" data-testid="create-team-btn" @click="openForm(null)"> Create team </Button>
        </div>

        <ResourceTable
            :columns="columns"
            :items="teams"
            :loading="loading"
            :query="tableQuery"
            :meta="meta"
            :searchable="paged"
            :paged="paged"
            row-test-id="team-row"
            empty-text="No teams yet."
            caption="Teams"
            @update:query="onQuery"
        >
            <template #cell-name="{ item }">
                <span class="font-medium">{{ row(item).name }}</span>
            </template>
            <template #cell-is_active="{ item }">
                <Badge :variant="row(item).is_active ? 'success' : 'secondary'">
                    {{ row(item).is_active ? 'Active' : 'Inactive' }}
                </Badge>
            </template>
            <template #actions="{ item }">
                <RowActionsMenu
                    :label="`Actions for ${row(item).name}`"
                    :actions="teamActions(row(item))"
                    :data-testid="`row-actions-${row(item).id}`"
                />
            </template>
        </ResourceTable>
    </div>

    <Dialog
        :open="isFormOpen"
        @update:open="
            (open) => {
                if (!open && !form.processing) closeForm();
            }
        "
    >
        <DialogContent :show-close-button="!form.processing">
            <DialogHeader>
                <DialogTitle>{{ editingTeam ? 'Edit team' : 'Create team' }}</DialogTitle>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="submitForm">
                <FormField id="team-name" label="Name" required :error="form.errors.name">
                    <template #default="{ id, describedBy }">
                        <Input
                            :id="id"
                            v-model="form.name"
                            type="text"
                            maxlength="150"
                            required
                            :aria-describedby="describedBy"
                            :disabled="form.processing"
                        />
                    </template>
                </FormField>

                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="form.processing" @click="closeForm"
                        >Cancel</Button
                    >
                    <Button type="submit" data-testid="save-team-btn" :disabled="form.processing || !form.name.trim()">
                        {{ form.processing ? 'Saving…' : 'Save' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="lifecycle !== null"
        @update:open="
            (open) => {
                if (!open && !lifecyclePending) closeLifecycle();
            }
        "
    >
        <DialogContent :show-close-button="!lifecyclePending">
            <DialogHeader>
                <DialogTitle>{{ lifecycleCopy?.title ?? '' }}</DialogTitle>
                <DialogDescription v-if="lifecycleCopy?.description">{{
                    lifecycleCopy?.description
                }}</DialogDescription>
            </DialogHeader>
            <Alert v-if="lifecycleError" variant="destructive">
                <AlertDescription>{{ lifecycleError }}</AlertDescription>
            </Alert>
            <DialogFooter>
                <Button type="button" variant="outline" :disabled="lifecyclePending" @click="closeLifecycle"
                    >Cancel</Button
                >
                <Button
                    type="button"
                    v-if="lifecycle"
                    data-testid="confirm-lifecycle-action"
                    :disabled="lifecyclePending"
                    @click="confirmLifecycle(lifecycle)"
                >
                    {{ lifecyclePending ? 'Saving…' : 'Confirm' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
