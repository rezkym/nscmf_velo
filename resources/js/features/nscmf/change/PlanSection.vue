<script setup lang="ts">
import Alert from '@/components/ui/Alert.vue';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import { computed } from 'vue';

import DraftField from '../DraftField.vue';
import DraftNumberField from '../DraftNumberField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import RepeatableRows from '../RepeatableRows.vue';
import type {
    AnnouncementTiming,
    ChangeDraftFields,
    ChangeSubtype,
    ImprovementItemRow,
    MonitoringUnit,
} from '../types';
import { ANNOUNCEMENT_TIMING_LABELS, MONITORING_UNIT_LABELS } from '../types';

/** Improvement plan, schedule, monitoring, rollback and announcement (06 §39-43). */
type PlanFields = Pick<
    ChangeDraftFields,
    | 'improvement_items'
    | 'target_execution_date'
    | 'monitoring_period_value'
    | 'monitoring_period_unit'
    | 'rollback_scenario'
    | 'announcement_timing'
>;

const model = defineModel<PlanFields>({ required: true });

const props = withDefaults(defineProps<{ subtype: ChangeSubtype; errors?: FieldErrors; disabled?: boolean }>(), {
    errors: () => ({}),
});

const MAX_ROWS = 3;

function update(patch: Partial<PlanFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'change', ...segments);
}

function onUnitChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    update({ monitoring_period_unit: value === '' ? null : (value as MonitoringUnit) });
}

function onTimingChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    update({ announcement_timing: value === '' ? null : (value as AnnouncementTiming) });
}

/** Non-blocking mismatch warning (06 §43); the server decides what may be submitted. */
const announcementWarning = computed<string | null>(() => {
    const timing = model.value.announcement_timing;
    if (!timing) return null;

    if (props.subtype === 'EMERGENCY' && timing !== 'TWO_DAYS_BEFORE_EMERGENCY') {
        return 'Emergency changes usually announce 2 days before. Check the timing before submitting.';
    }
    if (props.subtype !== 'EMERGENCY' && timing === 'TWO_DAYS_BEFORE_EMERGENCY') {
        return 'The 2-day timing is meant for emergency changes. Check the timing before submitting.';
    }
    return null;
});
</script>

<template>
    <div class="space-y-6">
        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <div>
                <h2 class="text-base font-semibold">Improvement plan and target KPI</h2>
                <p class="text-sm text-muted-foreground">Up to three pairs. Both sides belong together at submit.</p>
            </div>

            <RepeatableRows
                data-collection="improvement_items"
                add-label="Add improvement"
                empty-hint="No improvements yet."
                :model-value="model.improvement_items ?? []"
                :max="MAX_ROWS"
                :disabled="disabled"
                :new-row="(): ImprovementItemRow => ({ row_no: 0, plan_text: null, target_kpi: null })"
                @update:model-value="(rows) => update({ improvement_items: rows })"
            >
                <template #default="{ row, index, update: updateRow }">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DraftField
                            :id="`improvement_items-${index}-plan_text`"
                            :label="`Plan ${index + 1}`"
                            :rows="3"
                            :maxlength="1000"
                            :model-value="row.plan_text ?? null"
                            :error="error('improvement_items', index, 'plan_text')"
                            :disabled="disabled"
                            @update:model-value="(value) => updateRow({ plan_text: value })"
                        />
                        <DraftField
                            :id="`improvement_items-${index}-target_kpi`"
                            :label="`Target KPI ${index + 1}`"
                            :rows="3"
                            :maxlength="1000"
                            :model-value="row.target_kpi ?? null"
                            :error="error('improvement_items', index, 'target_kpi')"
                            :disabled="disabled"
                            @update:model-value="(value) => updateRow({ target_kpi: value })"
                        />
                    </div>
                </template>
            </RepeatableRows>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">Schedule and monitoring</h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DraftField
                    id="target_execution_date"
                    label="Target execution date"
                    type="date"
                    required
                    :model-value="model.target_execution_date ?? null"
                    :error="error('target_execution_date')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ target_execution_date: value })"
                />
                <DraftNumberField
                    id="monitoring_period_value"
                    label="Monitoring period"
                    required
                    :model-value="model.monitoring_period_value ?? null"
                    :error="error('monitoring_period_value')"
                    :disabled="disabled"
                    @update:model-value="(value) => update({ monitoring_period_value: value })"
                />
                <FormField
                    id="monitoring_period_unit"
                    label="Monitoring unit"
                    required
                    :error="error('monitoring_period_unit')"
                >
                    <template #default="{ id, describedBy }">
                        <select
                            :id="id"
                            :value="model.monitoring_period_unit ?? ''"
                            :disabled="disabled"
                            :aria-describedby="describedBy"
                            :class="controlClass"
                            @change="onUnitChange"
                        >
                            <option value="">Not selected</option>
                            <option v-for="(label, unit) in MONITORING_UNIT_LABELS" :key="unit" :value="unit">
                                {{ label }}
                            </option>
                        </select>
                    </template>
                </FormField>
            </div>
        </section>

        <section class="space-y-4 rounded-lg border border-border bg-card p-6">
            <h2 class="text-base font-semibold">Rollback and announcement</h2>

            <DraftField
                id="rollback_scenario"
                label="Rollback scenario"
                required
                help="Describe what happens if the change has to be reverted."
                :rows="4"
                :maxlength="4000"
                :model-value="model.rollback_scenario ?? null"
                :error="error('rollback_scenario')"
                :disabled="disabled"
                @update:model-value="(value) => update({ rollback_scenario: value })"
            />

            <FormField
                id="announcement_timing"
                label="Maintenance announcement"
                required
                :error="error('announcement_timing')"
            >
                <template #default="{ id, describedBy }">
                    <select
                        :id="id"
                        :value="model.announcement_timing ?? ''"
                        :disabled="disabled"
                        :aria-describedby="describedBy"
                        :class="[controlClass, 'sm:max-w-md']"
                        @change="onTimingChange"
                    >
                        <option value="">Not selected</option>
                        <option v-for="(label, timing) in ANNOUNCEMENT_TIMING_LABELS" :key="timing" :value="timing">
                            {{ label }}
                        </option>
                    </select>
                </template>
            </FormField>

            <Alert v-if="announcementWarning" variant="warning" data-testid="announcement-warning">
                {{ announcementWarning }}
            </Alert>
        </section>
    </div>
</template>
