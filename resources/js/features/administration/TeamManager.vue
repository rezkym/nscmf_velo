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
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/composables/usePermissions';
import { pageDomainError } from '@/lib/apiErrors';

export interface Team {
    id: number;
    name: string;
    is_active: boolean;
}

type LifecycleAction = 'deactivate' | 'reactivate';

withDefaults(defineProps<{ teams?: Team[] }>(), { teams: () => [] });

const { can } = usePermissions();
const page = usePage();

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

        <Card class="gap-0 overflow-hidden py-0">
            <Table>
                <TableHeader class="bg-muted/50">
                    <TableRow>
                        <TableHead class="px-4 py-3">Name</TableHead>
                        <TableHead class="px-4 py-3">Status</TableHead>
                        <TableHead class="px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="team in teams" :key="team.id" :data-testid="`team-row-${team.id}`">
                        <TableCell class="px-4 py-3 font-medium">{{ team.name }}</TableCell>
                        <TableCell class="px-4 py-3">
                            <Badge :variant="team.is_active ? 'success' : 'secondary'">
                                {{ team.is_active ? 'Active' : 'Inactive' }}
                            </Badge>
                        </TableCell>
                        <TableCell class="space-x-1 px-4 py-3 text-right">
                            <Button
                                type="button"
                                v-if="can('teams.update')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`edit-team-${team.id}`"
                                @click="openForm(team)"
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                v-if="can('teams.archive')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`${team.is_active ? 'deactivate' : 'reactivate'}-team-${team.id}`"
                                @click="openLifecycle(team)"
                            >
                                {{ team.is_active ? 'Deactivate' : 'Reactivate' }}
                            </Button>
                        </TableCell>
                    </TableRow>
                    <TableEmpty v-if="teams.length === 0" :colspan="3" class="text-muted-foreground"
                        >No teams yet.</TableEmpty
                    >
                </TableBody>
            </Table>
        </Card>
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
