<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import FormField from '@/components/ui/FormField.vue';

withDefaults(
    defineProps<{
        hasActiveTeam?: boolean;
    }>(),
    {
        hasActiveTeam: true,
    },
);

export type NscmfFamily = 'ACTIVATION' | 'CHANGE';
export type ActivationSubtype = 'ACTIVATION' | 'UPGRADE_DOWNGRADE' | 'DEACTIVATION';
export type ChangeSubtype = 'MAINTENANCE' | 'UPGRADE' | 'EMERGENCY';
export type NscmfSubtype = ActivationSubtype | ChangeSubtype;
export type NumberingMode = 'AUTOMATIC' | 'MANUAL';

const ACTIVATION_SUBTYPES: { value: ActivationSubtype; label: string }[] = [
    { value: 'ACTIVATION', label: 'Activation' },
    { value: 'UPGRADE_DOWNGRADE', label: 'Upgrade / Downgrade' },
    { value: 'DEACTIVATION', label: 'Deactivation' },
];

const CHANGE_SUBTYPES: { value: ChangeSubtype; label: string }[] = [
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'UPGRADE', label: 'Upgrade' },
    { value: 'EMERGENCY', label: 'Emergency' },
];

const form = useForm({
    family: 'ACTIVATION' as NscmfFamily,
    subtype: 'ACTIVATION' as NscmfSubtype,
    numbering_mode: 'AUTOMATIC' as NumberingMode,
    request_no: '',
});

const clientError = ref<string | null>(null);

const availableSubtypes = computed(() => {
    return form.family === 'ACTIVATION' ? ACTIVATION_SUBTYPES : CHANGE_SUBTYPES;
});

const requestNoError = computed(() => {
    return clientError.value ?? (form.errors as Record<string, string | undefined>).request_no;
});

// Keep subtype synced when family changes
watch(
    () => form.family,
    (newFamily) => {
        if (newFamily === 'ACTIVATION') {
            form.subtype = 'ACTIVATION';
        } else {
            form.subtype = 'MAINTENANCE';
        }
    },
);

const MANUAL_REGEX = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$/;

function submit(): void {
    if (form.processing) return;
    clientError.value = null;

    if (form.numbering_mode === 'MANUAL') {
        const trimmed = form.request_no.trim();
        if (trimmed.length < 3 || trimmed.length > 64) {
            clientError.value = 'Request number must be between 3 and 64 characters.';
            return;
        }
        if (!MANUAL_REGEX.test(trimmed)) {
            clientError.value =
                'Request number must begin with alphanumeric and only contain alphanumeric, dot, underscore, dash, or slash.';
            return;
        }
        form.request_no = trimmed;
    } else {
        form.request_no = '';
    }

    form.post('/nscmf', {
        preserveScroll: true,
    });
}
</script>

<template>
    <Head title="Create NSCMF" />

    <div class="p-6 max-w-2xl mx-auto space-y-6">
        <div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground">Create NSCMF</h1>
            <p class="text-sm text-muted-foreground mt-1">
                Initiate a new Network Service Change Management Form Draft.
            </p>
        </div>

        <!-- Blocked user without active Team (AC4) -->
        <div
            v-if="!hasActiveTeam"
            data-testid="no-active-team-alert"
            class="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
            <p class="font-medium">Active Team required</p>
            <p class="mt-1">
                You do not have an active organizational team assigned. Please contact administrator to be assigned to
                an active team before creating records.
            </p>
        </div>

        <!-- Create Form -->
        <form v-else class="space-y-6 bg-card border border-border p-6 rounded-lg" @submit.prevent="submit">
            <!-- Family Selection (AC1) -->
            <FormField id="family-select" label="Form Family" required>
                <template #default="{ id: fieldId }">
                    <select
                        :id="fieldId"
                        v-model="form.family"
                        data-testid="family-select"
                        class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        :disabled="form.processing"
                    >
                        <option value="ACTIVATION">Activation</option>
                        <option value="CHANGE">Change</option>
                    </select>
                </template>
            </FormField>

            <!-- Subtype Selection (AC1) -->
            <FormField id="subtype-select" label="Subtype" required>
                <template #default="{ id: fieldId }">
                    <select
                        :id="fieldId"
                        v-model="form.subtype"
                        data-testid="subtype-select"
                        class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        :disabled="form.processing"
                    >
                        <option v-for="st in availableSubtypes" :key="st.value" :value="st.value">
                            {{ st.label }}
                        </option>
                    </select>
                </template>
            </FormField>

            <!-- Numbering Mode Selection (AC2, AC3) -->
            <div class="space-y-3">
                <label class="block text-sm font-medium text-foreground">
                    Numbering Mode <span class="text-destructive">*</span>
                </label>
                <div class="grid grid-cols-2 gap-4">
                    <label
                        class="flex items-start p-3 border rounded-md cursor-pointer hover:bg-muted/50"
                        :class="form.numbering_mode === 'AUTOMATIC' ? 'border-primary bg-muted/20' : 'border-input'"
                    >
                        <input
                            v-model="form.numbering_mode"
                            type="radio"
                            value="AUTOMATIC"
                            data-testid="numbering-auto-radio"
                            class="mt-1 mr-3"
                            :disabled="form.processing"
                        />
                        <div>
                            <span class="text-sm font-medium text-foreground block">Automatic</span>
                            <span class="text-xs text-muted-foreground block">
                                Server managed sequence (allocated upon creation).
                            </span>
                        </div>
                    </label>

                    <label
                        class="flex items-start p-3 border rounded-md cursor-pointer hover:bg-muted/50"
                        :class="form.numbering_mode === 'MANUAL' ? 'border-primary bg-muted/20' : 'border-input'"
                    >
                        <input
                            v-model="form.numbering_mode"
                            type="radio"
                            value="MANUAL"
                            data-testid="numbering-manual-radio"
                            class="mt-1 mr-3"
                            :disabled="form.processing"
                        />
                        <div>
                            <span class="text-sm font-medium text-foreground block">Manual</span>
                            <span class="text-xs text-muted-foreground block">
                                Specify custom reference identifier.
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Manual Request No Input (AC2) -->
            <div v-if="form.numbering_mode === 'MANUAL'">
                <FormField id="manual-request-no" label="Request Number" required :error="requestNoError">
                    <template #default="{ id: fieldId, describedBy }">
                        <input
                            :id="fieldId"
                            v-model="form.request_no"
                            type="text"
                            data-testid="manual-request-no-input"
                            placeholder="e.g. NSCMF-MANUAL-2026-001"
                            maxlength="64"
                            :aria-describedby="describedBy"
                            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                            :disabled="form.processing"
                        />
                    </template>
                </FormField>
                <span v-if="requestNoError" data-testid="request-no-error" class="sr-only">
                    {{ requestNoError }}
                </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <button
                    type="submit"
                    data-testid="create-submit-btn"
                    class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                    :disabled="form.processing"
                >
                    {{ form.processing ? 'Creating...' : 'Create Draft' }}
                </button>
            </div>
        </form>
    </div>
</template>
