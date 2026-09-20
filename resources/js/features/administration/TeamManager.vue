<script setup lang="ts">
import { router, useForm, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import { controlClass } from '@/components/ui/control';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import FormField from '@/components/ui/FormField.vue';
import Modal from '@/components/ui/Modal.vue';
import { usePermissions } from '@/composables/usePermissions';
import { domainError } from '@/lib/apiErrors';

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
watch(
    () => page.props.flash,
    (flash) => {
        const error = domainError(flash);
        if (!error) return;

        lifecycleError.value = error.message ?? 'The team could not be updated.';
        lifecyclePending.value = false;
    },
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
    if (!lifecyclePending.value) lifecycle.value = null;
}

function confirmLifecycle(): void {
    if (!lifecycle.value || lifecyclePending.value) return;

    const { team, action } = lifecycle.value;
    lifecyclePending.value = true;
    lifecycleError.value = null;

    router.post(
        `/administration/teams/${team.id}/${action}`,
        {},
        {
            onSuccess: () => {
                // A flashed domain error comes back on a successful redirect; the dialog stays open for it.
                if (domainError(page.props.flash)) return;
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
            <Button data-testid="create-team-btn" @click="openForm(null)"> Create team </Button>
        </div>

        <div class="overflow-hidden rounded-lg border border-border bg-card">
            <table class="min-w-full divide-y divide-border text-left text-sm">
                <thead class="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                        <th scope="col" class="px-4 py-3">Name</th>
                        <th scope="col" class="px-4 py-3">Status</th>
                        <th scope="col" class="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    <tr v-for="team in teams" :key="team.id" :data-testid="`team-row-${team.id}`">
                        <td class="px-4 py-3 font-medium text-foreground">{{ team.name }}</td>
                        <td class="px-4 py-3">
                            <Badge :variant="team.is_active ? 'success' : 'neutral'">
                                {{ team.is_active ? 'Active' : 'Inactive' }}
                            </Badge>
                        </td>
                        <td class="space-x-1 px-4 py-3 text-right">
                            <Button
                                v-if="can('teams.update')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`edit-team-${team.id}`"
                                @click="openForm(team)"
                            >
                                Edit
                            </Button>
                            <Button
                                v-if="can('teams.archive')"
                                variant="ghost"
                                size="sm"
                                :data-testid="`${team.is_active ? 'deactivate' : 'reactivate'}-team-${team.id}`"
                                @click="openLifecycle(team)"
                            >
                                {{ team.is_active ? 'Deactivate' : 'Reactivate' }}
                            </Button>
                        </td>
                    </tr>
                    <tr v-if="teams.length === 0">
                        <td colspan="3" class="px-4 py-8 text-center text-muted-foreground">No teams yet.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Modal
        :open="isFormOpen"
        :title="editingTeam ? 'Edit team' : 'Create team'"
        :busy="form.processing"
        @close="closeForm"
    >
        <form class="space-y-4" @submit.prevent="submitForm">
            <FormField id="team-name" label="Name" required :error="form.errors.name">
                <template #default="{ id, describedBy }">
                    <input
                        :id="id"
                        v-model="form.name"
                        type="text"
                        maxlength="150"
                        required
                        :aria-describedby="describedBy"
                        :disabled="form.processing"
                        :class="controlClass"
                    />
                </template>
            </FormField>

            <div class="flex justify-end gap-2 pt-2">
                <Button variant="secondary" :disabled="form.processing" @click="closeForm">Cancel</Button>
                <Button type="submit" data-testid="save-team-btn" :disabled="form.processing || !form.name.trim()">
                    {{ form.processing ? 'Saving…' : 'Save' }}
                </Button>
            </div>
        </form>
    </Modal>

    <Modal
        :open="lifecycle !== null"
        :title="lifecycleCopy?.title ?? ''"
        :description="lifecycleCopy?.description"
        :busy="lifecyclePending"
        @close="closeLifecycle"
    >
        <Alert v-if="lifecycleError" variant="error">{{ lifecycleError }}</Alert>

        <template #footer>
            <Button variant="secondary" :disabled="lifecyclePending" @click="closeLifecycle">Cancel</Button>
            <Button data-testid="confirm-lifecycle-action" :disabled="lifecyclePending" @click="confirmLifecycle">
                {{ lifecyclePending ? 'Saving…' : 'Confirm' }}
            </Button>
        </template>
    </Modal>
</template>
