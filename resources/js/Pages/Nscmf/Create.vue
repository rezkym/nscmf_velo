<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import FormField from '@/components/FormField.vue';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
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
        form.subtype = SUBTYPES_BY_FAMILY[family][0];
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
            <PageHeader title="Create NSCMF" description="Choose the form type. The record starts as a draft." />

            <Alert v-if="!user?.team" variant="warning">
                <AlertTitle>Active team required</AlertTitle>
                <AlertDescription
                    >You need an active team to create records. Contact an administrator.</AlertDescription
                >
            </Alert>

            <Card v-else>
                <CardContent>
                    <form class="grid gap-5" @submit.prevent="submit">
                        <FormField id="family" label="Form family" required>
                            <template #default="{ id }">
                                <NativeSelect class="w-full" :id="id" v-model="form.family" :disabled="form.processing">
                                    <option v-for="(label, family) in FAMILY_LABELS" :key="family" :value="family">
                                        {{ label }}
                                    </option>
                                </NativeSelect>
                            </template>
                        </FormField>

                        <FormField id="subtype" label="Subtype" required>
                            <template #default="{ id }">
                                <NativeSelect
                                    class="w-full"
                                    :id="id"
                                    v-model="form.subtype"
                                    :disabled="form.processing"
                                >
                                    <option
                                        v-for="subtype in SUBTYPES_BY_FAMILY[form.family]"
                                        :key="subtype"
                                        :value="subtype"
                                    >
                                        {{ SUBTYPE_LABELS[subtype] }}
                                    </option>
                                </NativeSelect>
                            </template>
                        </FormField>

                        <FieldSet>
                            <FieldLegend variant="label">Request number</FieldLegend>
                            <RadioGroup v-model="form.numbering_mode" :disabled="form.processing">
                                <Field orientation="horizontal">
                                    <RadioGroupItem
                                        id="numbering-automatic"
                                        value="AUTOMATIC"
                                        data-testid="numbering-automatic"
                                    />
                                    <FieldLabel for="numbering-automatic" class="font-normal">
                                        Automatic — assigned by the system when the draft is created
                                    </FieldLabel>
                                </Field>
                                <Field orientation="horizontal">
                                    <RadioGroupItem
                                        id="numbering-manual"
                                        value="MANUAL"
                                        data-testid="numbering-manual"
                                    />
                                    <FieldLabel for="numbering-manual" class="font-normal"
                                        >Manual — enter your own number</FieldLabel
                                    >
                                </Field>
                            </RadioGroup>
                        </FieldSet>

                        <FormField
                            v-if="form.numbering_mode === 'MANUAL'"
                            id="request-no"
                            label="Manual request number"
                            required
                            :error="requestNoError"
                        >
                            <template #default="{ id, describedBy }">
                                <Input
                                    class="font-mono"
                                    :id="id"
                                    v-model="manualRequestNo"
                                    type="text"
                                    maxlength="64"
                                    autocomplete="off"
                                    :aria-describedby="describedBy"
                                    :disabled="form.processing"
                                />
                            </template>
                        </FormField>

                        <div class="flex justify-end border-t pt-4">
                            <Button type="submit" :disabled="form.processing">
                                {{ form.processing ? 'Creating…' : 'Create draft' }}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    </AppLayout>
</template>
