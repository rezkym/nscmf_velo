<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import DatePicker from '@/components/DatePicker.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePermissions } from '@/composables/usePermissions';
import { BUSINESS_TIME_ZONE } from '@/lib/datetime';
import { sendJson } from '@/lib/http';

import type { LogExportJob, LogFilters, LogItem } from './types';

/**
 * Requests one Activity Log export (07 §34.2, 12 §47.2): every matching entry or only the selected
 * ones, as XLSX or PDF, with the Site Location and signature block the exporter confirms. The
 * server binds what is sent here into an immutable snapshot.
 */
const props = defineProps<{
    open: boolean;
    filters: LogFilters;
    total: number;
    selected: LogItem[];
    siteDefaults: { noc15: boolean; noc23: boolean };
    pdfAvailable: boolean;
    maxEntries: number;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'requested', job: LogExportJob): void;
}>();

type Scope = 'FILTERED' | 'SELECTED';

const { user } = usePermissions();
const scope = ref<Scope>('FILTERED');
const format = ref<'XLSX' | 'PDF'>('XLSX');
const noc15 = ref(false);
const noc23 = ref(false);
const preparedName = ref('');
const preparedDate = ref<string | null>(null);
const acknowledgedName = ref('');
const acknowledgedDate = ref<string | null>(null);
const sending = ref(false);
const error = ref<string | null>(null);
const nameError = ref<string | null>(null);

/** Today as a business date in Asia/Jakarta (07 §22.1). */
function today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(new Date());
}

function siteFor(chosen: Scope): { noc15: boolean; noc23: boolean } {
    if (chosen === 'FILTERED') return props.siteDefaults;
    const codes = props.selected.flatMap((item) => item.noc_infrastructure);
    return { noc15: codes.includes('NOC15'), noc23: codes.includes('NOC23') };
}

function reset(): void {
    scope.value = props.selected.length > 0 ? 'SELECTED' : 'FILTERED';
    format.value = 'XLSX';
    ({ noc15: noc15.value, noc23: noc23.value } = siteFor(scope.value));
    preparedName.value = user.value?.name ?? '';
    preparedDate.value = today();
    acknowledgedName.value = '';
    acknowledgedDate.value = null;
    error.value = null;
    nameError.value = null;
}

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) reset();
    },
    { immediate: true },
);
watch(scope, (chosen) => ({ noc15: noc15.value, noc23: noc23.value } = siteFor(chosen)));

const count = computed(() => (scope.value === 'SELECTED' ? props.selected.length : props.total));
const tooMany = computed(() => count.value > props.maxEntries);
const selectedLabel = computed(() =>
    props.selected.length === 1 ? 'Only the 1 selected entry' : `Only the ${props.selected.length} selected entries`,
);

async function submit(): Promise<void> {
    if (sending.value) return;
    nameError.value = preparedName.value.trim() === '' ? 'Prepared By needs a name.' : null;
    if (nameError.value || tooMany.value) return;

    sending.value = true;
    error.value = null;
    const result = await sendJson<{ data: LogExportJob }>('POST', '/reports/activity-log/exports', {
        format: format.value,
        scope: scope.value,
        filters: scope.value === 'FILTERED' ? props.filters : null,
        record_ids: scope.value === 'SELECTED' ? props.selected.map((item) => item.id) : [],
        site_location: { noc15: noc15.value, noc23: noc23.value },
        prepared_by: { name: preparedName.value.trim(), date: preparedDate.value },
        acknowledged_by: {
            name: acknowledgedName.value.trim() === '' ? null : acknowledgedName.value.trim(),
            date: acknowledgedDate.value,
        },
    });
    sending.value = false;
    if (!result.ok) {
        error.value =
            result.status === 403
                ? 'You do not have access to export the Activity Log.'
                : result.error?.message || 'The export could not be requested.';
        return;
    }
    if (result.body) emit('requested', result.body.data);
}

function onOpenChange(open: boolean): void {
    if (!open && !sending.value) emit('close');
}
</script>

<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Export the Activity Log</DialogTitle>
                <DialogDescription>
                    The file uses the NSCMF Activity Logging Form: 40 entries per page, the signature block on the last
                    page. The PDF is not digitally signed.
                </DialogDescription>
            </DialogHeader>

            <Alert v-if="error" variant="destructive">
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <form class="grid gap-5" aria-label="Activity Log export" @submit.prevent="submit">
                <FieldSet>
                    <FieldLegend variant="label">Entries</FieldLegend>
                    <RadioGroup v-model="scope" class="grid gap-2">
                        <label class="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="FILTERED" data-testid="scope-FILTERED" :disabled="total === 0" />
                            All {{ total }} matching entries
                        </label>
                        <label class="flex items-center gap-2 text-sm">
                            <RadioGroupItem
                                value="SELECTED"
                                data-testid="scope-SELECTED"
                                :disabled="selected.length === 0"
                            />
                            {{ selectedLabel }}
                        </label>
                    </RadioGroup>
                    <p v-if="tooMany" role="alert" class="text-sm text-destructive">
                        An export holds at most {{ maxEntries }} entries. Narrow the filters or the selection.
                    </p>
                </FieldSet>

                <FieldSet>
                    <FieldLegend variant="label">Format</FieldLegend>
                    <RadioGroup v-model="format" class="flex gap-4">
                        <label class="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="XLSX" data-testid="format-XLSX" />
                            Excel (XLSX)
                        </label>
                        <label class="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="PDF" data-testid="format-PDF" :disabled="!pdfAvailable" />
                            PDF
                        </label>
                    </RadioGroup>
                    <p v-if="!pdfAvailable" class="text-sm text-muted-foreground">PDF export is not available yet.</p>
                </FieldSet>

                <FieldSet>
                    <FieldLegend variant="label">Site Location</FieldLegend>
                    <div class="flex gap-6">
                        <label class="flex items-center gap-2 text-sm">
                            <Checkbox v-model="noc15" data-testid="site-noc15" />
                            NOC15
                        </label>
                        <label class="flex items-center gap-2 text-sm">
                            <Checkbox v-model="noc23" data-testid="site-noc23" />
                            NOC23
                        </label>
                    </div>
                </FieldSet>

                <FieldSet>
                    <FieldLegend variant="label">Prepared By</FieldLegend>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <Field :data-invalid="nameError ? true : undefined">
                            <FieldLabel for="prepared-name">Name</FieldLabel>
                            <Input
                                id="prepared-name"
                                v-model="preparedName"
                                data-testid="prepared-name"
                                maxlength="150"
                                :aria-invalid="nameError ? true : undefined"
                                :aria-describedby="nameError ? 'prepared-name-error' : undefined"
                            />
                            <FieldError v-if="nameError" id="prepared-name-error">{{ nameError }}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel for="prepared-date">Date</FieldLabel>
                            <DatePicker
                                id="prepared-date"
                                data-testid="prepared-date"
                                :model-value="preparedDate"
                                @update:model-value="preparedDate = $event ?? today()"
                            />
                        </Field>
                    </div>
                </FieldSet>

                <FieldSet>
                    <FieldLegend variant="label">Acknowledge By (optional)</FieldLegend>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <Field>
                            <FieldLabel for="acknowledged-name">Name</FieldLabel>
                            <Input
                                id="acknowledged-name"
                                v-model="acknowledgedName"
                                data-testid="acknowledged-name"
                                maxlength="150"
                            />
                        </Field>
                        <Field>
                            <FieldLabel for="acknowledged-date">Date</FieldLabel>
                            <DatePicker
                                id="acknowledged-date"
                                data-testid="acknowledged-date"
                                placeholder="No date"
                                :model-value="acknowledgedDate"
                                @update:model-value="acknowledgedDate = $event"
                            />
                        </Field>
                    </div>
                </FieldSet>

                <DialogFooter>
                    <Button type="button" variant="outline" :disabled="sending" @click="emit('close')">Cancel</Button>
                    <Button type="submit" data-testid="submit-export" :disabled="sending || count === 0 || tooMany">
                        {{ sending ? 'Requesting…' : `Export ${format}` }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
