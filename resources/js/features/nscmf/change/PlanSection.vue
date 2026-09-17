<script lang="ts">
import type { ImprovementItemRow } from '../draftPayload';

export type ChangeSubtype = 'Maintenance' | 'Upgrade' | 'Emergency';
export type FormMode = 'first_submit' | 'resubmit' | 'review';

export type MonitoringPeriodUnit = 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK';
export type AnnouncementTiming = 'ONE_WEEK_BEFORE' | 'TWO_WEEKS_BEFORE' | 'TWO_DAYS_BEFORE_EMERGENCY';

export const MONITORING_UNITS: readonly MonitoringPeriodUnit[] = ['MINUTE', 'HOUR', 'DAY', 'WEEK'] as const;

export const ANNOUNCEMENT_TIMINGS: readonly { value: AnnouncementTiming; label: string }[] = [
    { value: 'ONE_WEEK_BEFORE', label: '1 week before' },
    { value: 'TWO_WEEKS_BEFORE', label: '2 weeks before' },
    { value: 'TWO_DAYS_BEFORE_EMERGENCY', label: '2 days before (emergency)' },
] as const;

export interface PlanSectionModelValue {
    improvement_items?: ImprovementItemRow[];
    target_execution_date?: string | null;
    monitoring_period_value?: number | null;
    monitoring_period_unit?: MonitoringPeriodUnit | null;
    rollback_scenario?: string | null;
    announcement_timing?: AnnouncementTiming | null;
    record_version?: number;
}

export interface PlanSectionProps {
    subtype?: ChangeSubtype;
    mode?: FormMode;
    todayJakarta?: string;
    originalTargetExecutionDate?: string | null;
    modelValue?: PlanSectionModelValue;
    disabled?: boolean;
    readonly?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { buildDraftPayload, type ChangeDraftWirePayload } from '../draftPayload';

const props = withDefaults(defineProps<PlanSectionProps>(), {
    subtype: 'Maintenance',
    mode: 'first_submit',
    todayJakarta: () => new Date().toISOString().slice(0, 10),
    originalTargetExecutionDate: null,
    modelValue: () => ({
        improvement_items: [],
        target_execution_date: null,
        monitoring_period_value: null,
        monitoring_period_unit: null,
        rollback_scenario: null,
        announcement_timing: null,
        record_version: 1,
    }),
    disabled: false,
    readonly: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: PlanSectionModelValue): void;
    (e: 'validate', errors: Record<string, string>): void;
}>();

// Internal reactive fields
const improvementItems = ref<ImprovementItemRow[]>(
    props.modelValue?.improvement_items ? JSON.parse(JSON.stringify(props.modelValue.improvement_items)) : [],
);
const targetExecutionDate = ref<string>(props.modelValue?.target_execution_date || '');
const monitoringPeriodValue = ref<number | null>(
    props.modelValue?.monitoring_period_value !== undefined ? props.modelValue.monitoring_period_value : null,
);
const monitoringPeriodUnit = ref<MonitoringPeriodUnit | null>(props.modelValue?.monitoring_period_unit || null);
const rollbackScenario = ref<string>(props.modelValue?.rollback_scenario || '');
const announcementTiming = ref<AnnouncementTiming | null>(props.modelValue?.announcement_timing || null);

// Errors state for validation
const errors = ref<Record<string, string>>({});

// Keep local state in sync when props.modelValue changes externally
watch(
    () => props.modelValue,
    (newVal) => {
        if (!newVal) return;
        improvementItems.value = newVal.improvement_items ? JSON.parse(JSON.stringify(newVal.improvement_items)) : [];
        targetExecutionDate.value = newVal.target_execution_date || '';
        monitoringPeriodValue.value =
            newVal.monitoring_period_value !== undefined ? newVal.monitoring_period_value : null;
        monitoringPeriodUnit.value = newVal.monitoring_period_unit || null;
        rollbackScenario.value = newVal.rollback_scenario || '';
        announcementTiming.value = newVal.announcement_timing || null;
    },
    { deep: true },
);

function notifyUpdate() {
    emit('update:modelValue', {
        improvement_items: improvementItems.value.map((item, idx) => ({
            row_no: item.row_no || idx + 1,
            plan_text: typeof item.plan_text === 'string' && item.plan_text.trim() ? item.plan_text : null,
            target_kpi: typeof item.target_kpi === 'string' && item.target_kpi.trim() ? item.target_kpi : null,
        })),
        target_execution_date: targetExecutionDate.value.trim() ? targetExecutionDate.value : null,
        monitoring_period_value:
            monitoringPeriodValue.value !== null &&
            monitoringPeriodValue.value !== undefined &&
            !Number.isNaN(monitoringPeriodValue.value)
                ? Number(monitoringPeriodValue.value)
                : null,
        monitoring_period_unit: monitoringPeriodUnit.value || null,
        rollback_scenario: rollbackScenario.value.trim() ? rollbackScenario.value : null,
        announcement_timing: announcementTiming.value || null,
        record_version: props.modelValue?.record_version ?? 1,
    });
}

function addImprovementItem() {
    if (props.disabled || props.readonly || improvementItems.value.length >= 3) return;
    const nextRowNo = improvementItems.value.length + 1;
    improvementItems.value.push({
        row_no: nextRowNo,
        plan_text: '',
        target_kpi: '',
    });
    notifyUpdate();
}

function removeImprovementItem(index: number) {
    if (props.disabled || props.readonly) return;
    improvementItems.value.splice(index, 1);
    // Re-index row_no
    improvementItems.value.forEach((item, idx) => {
        item.row_no = idx + 1;
    });
    notifyUpdate();
}

// Non-blocking warning computation
const announcementWarning = computed<string | null>(() => {
    if (!announcementTiming.value) return null;
    if (props.subtype === 'Emergency' && announcementTiming.value !== 'TWO_DAYS_BEFORE_EMERGENCY') {
        return 'Emergency change typically uses 2 days before timing.';
    }
    if (
        (props.subtype === 'Maintenance' || props.subtype === 'Upgrade') &&
        announcementTiming.value === 'TWO_DAYS_BEFORE_EMERGENCY'
    ) {
        return '2 days before timing is typically reserved for emergency changes.';
    }
    return null;
});

function validateSubmit(): boolean {
    const newErrors: Record<string, string> = {};

    // AC1: Improvement items complete pairs validation at submit
    let completeCount = 0;
    for (let i = 0; i < improvementItems.value.length; i++) {
        const item = improvementItems.value[i];
        if (!item) continue;
        const rowNo = item.row_no || i + 1;
        const planText = item.plan_text?.trim() || '';
        const targetKpi = item.target_kpi?.trim() || '';

        const hasPlan = planText.length > 0;
        const hasKpi = targetKpi.length > 0;

        if (hasPlan && !hasKpi) {
            newErrors[`improvement_pair_${rowNo}`] = `Both plan text and target KPI are required for row ${rowNo}`;
        } else if (!hasPlan && hasKpi) {
            newErrors[`improvement_pair_${rowNo}`] = `Both plan text and target KPI are required for row ${rowNo}`;
        } else if (hasPlan && hasKpi) {
            completeCount++;
        }

        if (item.plan_text && item.plan_text.length > 1000) {
            newErrors[`plan_text_${rowNo}`] = 'Plan text must not exceed 1000 characters';
        }
        if (item.target_kpi && item.target_kpi.length > 1000) {
            newErrors[`target_kpi_${rowNo}`] = 'Target KPI must not exceed 1000 characters';
        }
    }

    if (completeCount === 0 && Object.keys(newErrors).length === 0) {
        newErrors.improvement_items = 'At least 1 complete improvement plan and target KPI pair is required';
    }

    // AC2: Target Execution Date validation
    const targetDate = targetExecutionDate.value.trim();
    if (!targetDate) {
        newErrors.target_execution_date = 'Target execution date is required';
    } else {
        // Validation rules per AC2 & 06 §40:
        // Reopen review does NOT block on past target date
        if (props.mode !== 'review') {
            const today = props.todayJakarta;
            if (props.mode === 'resubmit') {
                // If unchanged from originalTargetExecutionDate, past target is accepted
                const isUnchanged =
                    props.originalTargetExecutionDate && targetDate === props.originalTargetExecutionDate;
                if (!isUnchanged && targetDate < today) {
                    newErrors.target_execution_date = 'Target execution date must be today or in the future';
                }
            } else {
                // first_submit: must be today or future
                if (targetDate < today) {
                    newErrors.target_execution_date = 'Target execution date must be today or in the future';
                }
            }
        }
    }

    // AC3: Monitoring Period pair validation
    const hasValue =
        monitoringPeriodValue.value !== null &&
        monitoringPeriodValue.value !== undefined &&
        !Number.isNaN(monitoringPeriodValue.value);
    const hasUnit = !!monitoringPeriodUnit.value;

    if (hasValue && !hasUnit) {
        newErrors.monitoring_period = 'Monitoring period value and unit must be provided together or both empty';
    } else if (!hasValue && hasUnit) {
        newErrors.monitoring_period = 'Monitoring period value and unit must be provided together or both empty';
    } else if (hasValue && hasUnit) {
        if (Number(monitoringPeriodValue.value) <= 0) {
            newErrors.monitoring_period = 'Monitoring period value must be greater than 0';
        }
    } else {
        // Both empty: at submit stage, 06 §41 requires monitoring period
        newErrors.monitoring_period = 'Monitoring period is required at submit';
    }

    // AC4: Rollback Scenario validation
    const rollback = rollbackScenario.value.trim();
    if (!rollback) {
        newErrors.rollback_scenario = 'Rollback scenario is required';
    } else if (/^N\/?A$/i.test(rollback)) {
        newErrors.rollback_scenario = 'Rollback scenario cannot be a plain N/A placeholder';
    } else if (rollback.length > 4000) {
        newErrors.rollback_scenario = 'Rollback scenario must not exceed 4000 characters';
    }

    // Announcement timing required at submit
    if (!announcementTiming.value) {
        newErrors.announcement_timing = 'Announcement timing is required';
    }

    errors.value = newErrors;
    emit('validate', newErrors);
    return Object.keys(newErrors).length === 0;
}

// Method to get wire draft payload using buildDraftPayload helper from draftPayload.ts
function getDraftPayload(): ChangeDraftWirePayload['change'] {
    const payload = buildDraftPayload({
        family: 'CHANGE',
        record_version: props.modelValue?.record_version ?? 1,
        change: {
            target_execution_date: targetExecutionDate.value.trim() ? targetExecutionDate.value : null,
            monitoring_period_value:
                monitoringPeriodValue.value !== null &&
                monitoringPeriodValue.value !== undefined &&
                !Number.isNaN(monitoringPeriodValue.value)
                    ? Number(monitoringPeriodValue.value)
                    : null,
            monitoring_period_unit: monitoringPeriodUnit.value || null,
            rollback_scenario: rollbackScenario.value.trim() ? rollbackScenario.value : null,
            announcement_timing: announcementTiming.value || null,
            improvement_items: improvementItems.value.map((item, idx) => ({
                row_no: item.row_no || idx + 1,
                plan_text: typeof item.plan_text === 'string' && item.plan_text.trim() ? item.plan_text : null,
                target_kpi: typeof item.target_kpi === 'string' && item.target_kpi.trim() ? item.target_kpi : null,
            })),
        },
    });
    return payload.change;
}

defineExpose({
    validateSubmit,
    getDraftPayload,
    errors,
    targetExecutionDate,
    monitoringPeriodValue,
    monitoringPeriodUnit,
    rollbackScenario,
    announcementTiming,
});
</script>

<template>
    <div class="plan-section space-y-6">
        <!-- Section Header -->
        <div class="section-header flex items-center justify-between pb-2 border-b">
            <div>
                <h3 class="text-lg font-semibold text-foreground">Change Plan, Schedule & Rollback</h3>
                <p class="text-sm text-muted-foreground">
                    Subtype: <span class="font-medium text-foreground">{{ subtype }}</span>
                </p>
            </div>
            <!-- Test trigger button for submit validation -->
            <button type="button" data-testid="validate-submit-btn" class="hidden" @click="validateSubmit">
                Validate Submit
            </button>
        </div>

        <!-- 1. Improvement Items (Plan / Target KPI pairs) -->
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-sm font-semibold text-foreground">Improvement Plan & Target KPI</h4>
                    <p class="text-xs text-muted-foreground">
                        Max 3 paired items. At submit, at least 1 complete pair is required.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="add-improvement-btn"
                    :disabled="disabled || readonly || improvementItems.length >= 3"
                    class="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="addImprovementItem"
                >
                    Add Improvement Item
                </button>
            </div>

            <div v-if="errors.improvement_items" class="text-xs text-destructive">
                {{ errors.improvement_items }}
            </div>

            <div class="space-y-3">
                <div
                    v-for="(item, index) in improvementItems"
                    :key="item.row_no || index"
                    class="p-4 border rounded-lg bg-card space-y-3"
                    :data-testid="`improvement-row-${item.row_no || index + 1}`"
                >
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-muted-foreground"
                            >Row {{ item.row_no || index + 1 }}</span
                        >
                        <button
                            v-if="!readonly && !disabled"
                            type="button"
                            class="text-xs text-destructive hover:underline"
                            @click="removeImprovementItem(index)"
                        >
                            Remove
                        </button>
                    </div>

                    <div v-if="errors[`improvement_pair_${item.row_no || index + 1}`]" class="text-xs text-destructive">
                        {{ errors[`improvement_pair_${item.row_no || index + 1}`] }}
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-foreground mb-1">
                                Plan Text <span class="text-muted-foreground">(max 1000)</span>
                            </label>
                            <textarea
                                v-model="item.plan_text"
                                rows="2"
                                :disabled="disabled || readonly"
                                class="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                placeholder="Describe the improvement plan..."
                                @input="notifyUpdate"
                            />
                            <div
                                v-if="errors[`plan_text_${item.row_no || index + 1}`]"
                                class="text-xs text-destructive mt-1"
                            >
                                {{ errors[`plan_text_${item.row_no || index + 1}`] }}
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-foreground mb-1">
                                Target KPI <span class="text-muted-foreground">(free text, max 1000)</span>
                            </label>
                            <textarea
                                v-model="item.target_kpi"
                                rows="2"
                                :disabled="disabled || readonly"
                                class="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                placeholder="e.g. Error rate 0 selama monitoring..."
                                @input="notifyUpdate"
                            />
                            <div
                                v-if="errors[`target_kpi_${item.row_no || index + 1}`]"
                                class="text-xs text-destructive mt-1"
                            >
                                {{ errors[`target_kpi_${item.row_no || index + 1}`] }}
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="improvementItems.length === 0" class="text-xs text-muted-foreground italic py-2">
                    No improvement items added yet. Click "Add Improvement Item" above.
                </div>
            </div>
        </div>

        <!-- 2. Target Execution Date & Schedule -->
        <div class="space-y-4 pt-4 border-t">
            <h4 class="text-sm font-semibold text-foreground">Execution Schedule</h4>
            <div>
                <label class="block text-xs font-medium text-foreground mb-1">
                    Target Execution Date <span class="text-destructive">*</span>
                </label>
                <input
                    v-model="targetExecutionDate"
                    type="date"
                    :disabled="disabled || readonly"
                    class="w-full max-w-xs text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    @input="notifyUpdate"
                />
                <div v-if="errors.target_execution_date" class="text-xs text-destructive mt-1">
                    {{ errors.target_execution_date }}
                </div>
            </div>
        </div>

        <!-- 3. Monitoring Period -->
        <div class="space-y-4 pt-4 border-t">
            <h4 class="text-sm font-semibold text-foreground">Monitoring Period</h4>
            <p class="text-xs text-muted-foreground">Value (>0) and unit must be paired, or both empty in draft.</p>
            <div class="flex items-center gap-3">
                <div class="w-32">
                    <label class="block text-xs font-medium text-foreground mb-1">Amount</label>
                    <input
                        v-model.number="monitoringPeriodValue"
                        type="number"
                        min="1"
                        step="any"
                        :disabled="disabled || readonly"
                        class="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        placeholder="e.g. 24"
                        @input="notifyUpdate"
                    />
                </div>
                <div class="w-40">
                    <label class="block text-xs font-medium text-foreground mb-1">Unit</label>
                    <select
                        v-model="monitoringPeriodUnit"
                        :disabled="disabled || readonly"
                        class="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        @change="notifyUpdate"
                    >
                        <option :value="null">-- Select unit --</option>
                        <option v-for="unit in MONITORING_UNITS" :key="unit" :value="unit">
                            {{ unit }}
                        </option>
                    </select>
                </div>
            </div>
            <div v-if="errors.monitoring_period" class="text-xs text-destructive mt-1">
                {{ errors.monitoring_period }}
            </div>
        </div>

        <!-- 4. Rollback Scenario -->
        <div class="space-y-4 pt-4 border-t">
            <h4 class="text-sm font-semibold text-foreground">Rollback Scenario</h4>
            <p class="text-xs text-muted-foreground">
                Required at submit, max 4000 characters. Meaningful procedure required (plain "N/A" is disallowed).
            </p>
            <textarea
                v-model="rollbackScenario"
                rows="3"
                :disabled="disabled || readonly"
                class="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="Detail the rollback procedure..."
                @input="notifyUpdate"
            />
            <div v-if="errors.rollback_scenario" class="text-xs text-destructive mt-1">
                {{ errors.rollback_scenario }}
            </div>
        </div>

        <!-- 5. Maintenance Announcement Timing -->
        <div class="space-y-4 pt-4 border-t">
            <h4 class="text-sm font-semibold text-foreground">Maintenance Announcement</h4>
            <div class="space-y-2">
                <label class="block text-xs font-medium text-foreground mb-1">
                    Announcement Timing <span class="text-destructive">*</span>
                </label>
                <div class="space-y-1.5">
                    <label
                        v-for="opt in ANNOUNCEMENT_TIMINGS"
                        :key="opt.value"
                        class="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                    >
                        <input
                            v-model="announcementTiming"
                            type="radio"
                            name="announcement_timing"
                            :value="opt.value"
                            :disabled="disabled || readonly"
                            class="text-primary focus:ring-ring"
                            @change="notifyUpdate"
                        />
                        <span>{{ opt.label }}</span>
                    </label>
                </div>
                <div v-if="errors.announcement_timing" class="text-xs text-destructive mt-1">
                    {{ errors.announcement_timing }}
                </div>
                <!-- Non-blocking Warning -->
                <div
                    v-if="announcementWarning"
                    class="p-3 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md"
                >
                    <span class="font-semibold">Notice:</span> {{ announcementWarning }}
                </div>
            </div>
        </div>
    </div>
</template>
