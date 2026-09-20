<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import { usePermissions } from '@/composables/usePermissions';
import {
    FAMILY_LABELS,
    type NscmfFamily,
    type NscmfSubtype,
    type NumberingMode,
    SUBTYPE_LABELS,
    SUBTYPES_BY_FAMILY,
} from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

// Manual request number rule (06 §19); the server re-validates and checks uniqueness.
const MANUAL_REQUEST_NO = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$/;

const { user } = usePermissions();

const form = useForm({
    family: 'ACTIVATION' as NscmfFamily,
    subtype: 'ACTIVATION' as NscmfSubtype,
    numbering_mode: 'AUTOMATIC' as NumberingMode,
    request_no: null as string | null,
});

const manualRequestNo = ref('');
const requestNoProblem = ref<string | null>(null);
const requestNoError = computed(() => requestNoProblem.value ?? form.errors.request_no);

watch(
    () => form.family,
    (family) => {
        form.subtype = SUBTYPES_BY_FAMILY[family][0] ?? form.subtype;
    },
);

function submit(): void {
    if (form.processing) return;
    requestNoProblem.value = null;

    if (form.numbering_mode === 'MANUAL') {
        const requestNo = manualRequestNo.value.trim();
        if (!MANUAL_REQUEST_NO.test(requestNo)) {
            requestNoProblem.value =
                'Use 3 to 64 characters: letters, numbers, dot, underscore, slash or dash, starting with a letter or number.';
            return;
        }
        form.request_no = requestNo;
    } else {
        form.request_no = null;
    }

    form.post('/nscmf');
}
</script>

<template>
    <AppLayout title="Create NSCMF">
        <div class="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Create NSCMF</h1>
                <p class="text-sm text-muted-foreground">Choose the form type. The record starts as a draft.</p>
            </div>

            <Alert v-if="!user?.team" variant="warning" title="Active team required">
                You need an active team to create records. Contact an administrator.
            </Alert>

            <form v-else class="space-y-5 rounded-lg border border-border bg-card p-6" @submit.prevent="submit">
                <FormField id="family" label="Form family" required>
                    <template #default="{ id }">
                        <select :id="id" v-model="form.family" :disabled="form.processing" :class="controlClass">
                            <option v-for="(label, family) in FAMILY_LABELS" :key="family" :value="family">
                                {{ label }}
                            </option>
                        </select>
                    </template>
                </FormField>

                <FormField id="subtype" label="Subtype" required>
                    <template #default="{ id }">
                        <select :id="id" v-model="form.subtype" :disabled="form.processing" :class="controlClass">
                            <option v-for="subtype in SUBTYPES_BY_FAMILY[form.family]" :key="subtype" :value="subtype">
                                {{ SUBTYPE_LABELS[subtype] }}
                            </option>
                        </select>
                    </template>
                </FormField>

                <fieldset class="space-y-2">
                    <legend class="text-sm font-medium text-foreground">Request number</legend>
                    <label class="flex items-center gap-2 text-sm">
                        <input
                            v-model="form.numbering_mode"
                            type="radio"
                            value="AUTOMATIC"
                            data-testid="numbering-automatic"
                            :disabled="form.processing"
                        />
                        Automatic — assigned by the system when the draft is created
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input
                            v-model="form.numbering_mode"
                            type="radio"
                            value="MANUAL"
                            data-testid="numbering-manual"
                            :disabled="form.processing"
                        />
                        Manual — enter your own number
                    </label>
                </fieldset>

                <FormField
                    v-if="form.numbering_mode === 'MANUAL'"
                    id="request-no"
                    label="Manual request number"
                    required
                    :error="requestNoError"
                >
                    <template #default="{ id, describedBy }">
                        <input
                            :id="id"
                            v-model="manualRequestNo"
                            type="text"
                            maxlength="64"
                            autocomplete="off"
                            :aria-describedby="describedBy"
                            :disabled="form.processing"
                            :class="[controlClass, 'font-mono']"
                        />
                    </template>
                </FormField>

                <div class="flex justify-end border-t border-border pt-4">
                    <Button type="submit" :disabled="form.processing">
                        {{ form.processing ? 'Creating…' : 'Create draft' }}
                    </Button>
                </div>
            </form>
        </div>
    </AppLayout>
</template>
