<script setup lang="ts">
import DraftField from '../DraftField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import RepeatableRows from '../RepeatableRows.vue';
import type { ChangeDraftFields, ChangeResultRow, ChangeSubtype } from '../types';

/** What this section owns (06 §46-48, 12 §28.2). */
export type ResultFields = Pick<ChangeDraftFields, 'results'>;

const model = defineModel<ResultFields>({ required: true });

const props = withDefaults(
    defineProps<{
        subtype?: ChangeSubtype;
        errors?: FieldErrors;
        disabled?: boolean;
    }>(),
    { errors: () => ({}) },
);

const MAX_ROWS = 5;

function update(patch: Partial<ResultFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'change', ...segments);
}
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 panel p-6">
            <div>
                <h2 class="text-base font-semibold">Result of changes</h2>
                <p class="text-sm text-muted-foreground">
                    Up to five rows. Status is free text (not an enum). Started rows must be complete at submit.
                </p>
            </div>

            <RepeatableRows
                data-collection="results"
                add-label="Add result"
                empty-hint="No results yet."
                :model-value="model.results ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="
                    (): ChangeResultRow => ({
                        row_no: 0,
                        result_summary: null,
                        performance_information: null,
                        result_status: null,
                    })
                "
                @update:model-value="(rows) => update({ results: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <div class="space-y-4">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DraftField
                                :id="`results-${index}-result_summary`"
                                :label="`Result summary ${index + 1}`"
                                :rows="3"
                                :maxlength="2000"
                                :model-value="row.result_summary ?? null"
                                :error="error('results', index, 'result_summary')"
                                :disabled="disabled"
                                @update:model-value="(value) => updateRow({ result_summary: value })"
                            />
                            <DraftField
                                :id="`results-${index}-performance_information`"
                                :label="`Performance information ${index + 1}`"
                                :rows="3"
                                :maxlength="2000"
                                :model-value="row.performance_information ?? null"
                                :error="error('results', index, 'performance_information')"
                                :disabled="disabled"
                                @update:model-value="(value) => updateRow({ performance_information: value })"
                            />
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DraftField
                                :id="`results-${index}-result_status`"
                                :label="`Status ${index + 1}`"
                                :maxlength="255"
                                :model-value="row.result_status ?? null"
                                :error="error('results', index, 'result_status')"
                                :disabled="disabled"
                                @update:model-value="(value) => updateRow({ result_status: value })"
                            />
                        </div>
                    </div>
                </template>
            </RepeatableRows>
        </section>
    </div>
</template>
