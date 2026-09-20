<script lang="ts">
import type { ChangeResultRow } from '@/features/nscmf/types';

export interface ChangeResultsPayload {
    record_version: number;
    results: ChangeResultRow[];
}

export type DisplayValue = string | number | boolean | null | undefined;

export function displayValue(value: DisplayValue): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

function blankToNull(value: unknown): unknown {
    return typeof value === 'string' && value.trim() === '' ? null : value;
}

/**
 * Builds the PATCH /nscmf/{record}/change-results payload (12 §29).
 * Exact keys only: record_version, results.
 * Any started row is preserved with row_no; unstarted rows (all content fields null/blank) are dropped.
 */
export function buildChangeResultsPayload(recordVersion: number, results: ChangeResultRow[]): ChangeResultsPayload {
    if (!Number.isSafeInteger(recordVersion) || recordVersion < 1) {
        throw new Error(`record_version must be a positive integer, received ${String(recordVersion)}.`);
    }
    if (!Array.isArray(results)) {
        throw new Error('results must be an array.');
    }

    const normalizedResults: ChangeResultRow[] = [];
    const seenRowNos = new Set<number>();

    for (const row of results) {
        if (!row || typeof row !== 'object') {
            throw new Error('results rows must be objects.');
        }

        const rowNo = row.row_no;
        if (!Number.isInteger(rowNo) || rowNo < 1 || rowNo > 5) {
            throw new Error(`results: invalid row_no ${String(rowNo)}.`);
        }
        if (seenRowNos.has(rowNo)) {
            throw new Error(`results: duplicate row_no ${String(rowNo)}.`);
        }
        seenRowNos.add(rowNo);

        const summary = (blankToNull(row.result_summary ?? null) as string | null) ?? null;
        const performance = (blankToNull(row.performance_information ?? null) as string | null) ?? null;
        const status = (blankToNull(row.result_status ?? null) as string | null) ?? null;

        const started = summary !== null || performance !== null || status !== null;
        if (started) {
            normalizedResults.push({
                row_no: rowNo,
                result_summary: summary,
                performance_information: performance,
                result_status: status,
            });
        }
    }

    return {
        record_version: recordVersion,
        results: normalizedResults,
    };
}
</script>

<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { buttonVariants } from '@/components/ui/button';
import RequestFeedback, { type RequestFeedbackError, type SaveStatus } from '@/components/RequestFeedback.vue';
import { usePermissions } from '@/composables/usePermissions';
import ResultsSection from '@/features/nscmf/change/ResultsSection.vue';
import DetailList, { type DetailItem } from '@/features/nscmf/DetailList.vue';
import DetailTable from '@/features/nscmf/DetailTable.vue';
import {
    ANNOUNCEMENT_TIMING_LABELS,
    FAMILY_LABELS,
    MONITORING_UNIT_LABELS,
    SERVICE_IMPACT_LABELS,
    STATUS_LABELS,
    SUBTYPE_LABELS,
} from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';
import { domainError } from '@/lib/apiErrors';
import type { NscmfDetailRecord } from '@/Pages/Nscmf/Show.vue';

const props = defineProps<{ record: NscmfDetailRecord }>();
const page = usePage();

const { user, can } = usePermissions();

const isOwner = computed(() => {
    return Boolean(user.value?.id && props.record.owner?.id && user.value.id === props.record.owner.id);
});

const isEligible = computed(() => {
    return (
        props.record.family === 'CHANGE' &&
        props.record.business_status === 'PENDING_REVIEW' &&
        isOwner.value &&
        can('nscmf.change.result.edit')
    );
});

const initialResults = (props.record.change?.results ?? []).map((r, i) => ({
    row_no: r.row_no || i + 1,
    result_summary: r.result_summary ?? null,
    performance_information: r.performance_information ?? null,
    result_status: r.result_status ?? null,
}));

const resultsModel = ref<{ results: ChangeResultRow[] }>({
    results: initialResults,
});

const fieldErrors = ref<Record<string, string>>({});
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const feedbackError = ref<RequestFeedbackError | null>(null);
const saveStatus = ref<SaveStatus>(null);
const submitting = ref(false);
const hasTerminalError = ref(false);

function resetToRecord(): void {
    resultsModel.value = {
        results: (props.record.change?.results ?? []).map((r, i) => ({
            row_no: r.row_no || i + 1,
            result_summary: r.result_summary ?? null,
            performance_information: r.performance_information ?? null,
            result_status: r.result_status ?? null,
        })),
    };
    feedbackError.value = null;
    fieldErrors.value = {};
    hasTerminalError.value = false;
}

watch(
    () => props.record.record_version,
    () => {
        if (!hasTerminalError.value) {
            resetToRecord();
        }
    },
);

watch(
    () => (page as unknown as { flash?: unknown })?.flash,
    (flash) => {
        const dError = domainError(flash);
        if (dError?.code === 'NSCMF_VERSION_CONFLICT') {
            hasTerminalError.value = true;
            feedbackError.value = {
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: dError.message ?? 'A newer version exists.',
            };
            saveStatus.value = null;
        } else if (dError?.code === 'FORBIDDEN') {
            hasTerminalError.value = true;
            feedbackError.value = {
                status: 403,
                code: 'FORBIDDEN',
                message: dError.message ?? 'Access Denied',
            };
            saveStatus.value = null;
        }
    },
    { deep: true },
);

function display(value: DisplayValue): string {
    return displayValue(value);
}

function items<T extends object>(
    source: T | null | undefined,
    fields: [keyof T & string, string][],
    prefix = '',
): DetailItem[] {
    return fields.map(([key, label]) => ({
        key: `${prefix}${key}`,
        label,
        value: display((source?.[key] ?? null) as DisplayValue),
    }));
}

const change = computed(() => {
    const c = props.record.change ?? {};
    const monitoring =
        c.monitoring_period_value === null || c.monitoring_period_value === undefined
            ? '—'
            : `${c.monitoring_period_value} ${display(c.monitoring_period_unit && MONITORING_UNIT_LABELS[c.monitoring_period_unit])}`;
    return {
        purpose: items(c, [['maintenance_purpose', 'Maintenance purpose']]),
        plan: [
            ...items(c, [['target_execution_date', 'Target execution date']]),
            { key: 'monitoring_period', label: 'Monitoring period', value: monitoring },
            {
                key: 'announcement_timing',
                label: 'Maintenance announcement',
                value: display(c.announcement_timing && ANNOUNCEMENT_TIMING_LABELS[c.announcement_timing]),
            },
            ...items(c, [['rollback_scenario', 'Rollback scenario']]),
        ],
        challenges: (c.facing_challenges ?? []).map((row) => ({
            no: String(row.row_no),
            text: display(row.challenge_text),
        })),
        problems: (c.identified_problems ?? []).map((row) => ({
            no: String(row.row_no),
            text: display(row.problem_text),
        })),
        impacts: (c.service_impacts ?? []).map((row) => ({
            impact: SERVICE_IMPACT_LABELS[row.impact_code],
            description: display(row.other_description),
        })),
        improvements: (c.improvement_items ?? []).map((row) => ({
            no: String(row.row_no),
            plan: display(row.plan_text),
            kpi: display(row.target_kpi),
        })),
    };
});

const NUMBERED_TEXT = [
    { key: 'no', label: '#' },
    { key: 'text', label: 'Description' },
];

function submitResults(): void {
    if (!isEligible.value || submitting.value) return;

    fieldErrors.value = {};
    feedbackError.value = null;
    hasTerminalError.value = false;
    saveStatus.value = 'saving';

    let payload: ReturnType<typeof buildChangeResultsPayload>;
    try {
        payload = buildChangeResultsPayload(props.record.record_version, resultsModel.value.results);
    } catch (err: unknown) {
        saveStatus.value = 'error';
        feedbackError.value = {
            status: 422,
            code: 'NSCMF_VALIDATION_FAILED',
            message: err instanceof Error ? err.message : 'Invalid change results data.',
            errors: {
                results: [err instanceof Error ? err.message : 'Invalid change results data.'],
            },
        };
        return;
    }

    submitting.value = true;

    router.patch(`/nscmf/${props.record.id}/change-results`, payload as unknown as Parameters<typeof router.patch>[1], {
        preserveScroll: true,
        onSuccess: (newPage) => {
            if (hasTerminalError.value) {
                return;
            }
            saveStatus.value = 'saved';
            const pageRecord = (newPage as { props?: { record?: NscmfDetailRecord } })?.props?.record;
            if (pageRecord) {
                resultsModel.value = {
                    results: (pageRecord.change?.results ?? []).map((r, i) => ({
                        row_no: r.row_no || i + 1,
                        result_summary: r.result_summary ?? null,
                        performance_information: r.performance_information ?? null,
                        result_status: r.result_status ?? null,
                    })),
                };
            }
        },
        onError: (errs) => {
            saveStatus.value = 'error';
            fieldErrors.value = errs;
            feedbackError.value = {
                status: 422,
                code: 'NSCMF_VALIDATION_FAILED',
                errors: errs,
            };
        },
        onHttpException: (response) => {
            saveStatus.value = null;
            if (response.status === 403) {
                hasTerminalError.value = true;
                feedbackError.value = {
                    status: 403,
                    code: 'FORBIDDEN',
                    message: 'Access Denied',
                };
            } else if (response.status === 409) {
                hasTerminalError.value = true;
                feedbackError.value = {
                    status: 409,
                    code: 'NSCMF_VERSION_CONFLICT',
                    message: 'A newer version exists.',
                };
            } else {
                feedbackError.value = {
                    status: response.status,
                    code: 'HTTP_EXCEPTION',
                    message: 'A server error occurred.',
                };
            }
        },
        onFlash: (flash) => {
            const dError = domainError(flash);
            if (dError?.code === 'FORBIDDEN') {
                hasTerminalError.value = true;
                saveStatus.value = null;
                feedbackError.value = {
                    status: 403,
                    code: 'FORBIDDEN',
                    message: dError.message ?? 'Access Denied',
                };
            } else if (dError?.code === 'NSCMF_VERSION_CONFLICT') {
                hasTerminalError.value = true;
                saveStatus.value = null;
                feedbackError.value = {
                    status: 409,
                    code: 'NSCMF_VERSION_CONFLICT',
                    message: dError.message ?? 'A newer version exists.',
                };
            }
        },
        onNetworkError: () => {
            saveStatus.value = 'error';
            feedbackError.value = {
                isNetworkError: true,
                status: 0,
                message: 'Network connection failed.',
            };
        },
        onFinish: () => {
            submitting.value = false;
        },
    });
}

function handleRefresh(): void {
    router.reload({
        onSuccess: () => {
            hasTerminalError.value = false;
            resetToRecord();
        },
    });
}
</script>

<template>
    <AppLayout :title="record.request_no">
        <div class="mx-auto max-w-5xl space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <h1 data-testid="request-no" class="text-xl font-semibold text-foreground">
                            {{ record.request_no }}
                        </h1>
                        <Badge data-testid="business-status-badge">{{ STATUS_LABELS[record.business_status] }}</Badge>
                    </div>
                    <p data-testid="family-subtype" class="text-sm text-muted-foreground">
                        {{ FAMILY_LABELS[record.family] }} · {{ SUBTYPE_LABELS[record.subtype] }}
                    </p>
                </div>
                <Link :href="`/nscmf/${record.id}`" :class="buttonVariants({ variant: 'secondary' })">
                    Back to detail
                </Link>
            </div>

            <!-- Ineligibility warning alert -->
            <Alert
                v-if="!isEligible"
                variant="warning"
                data-testid="ineligible-alert"
                title="Result editing unavailable"
            >
                Result of changes can only be updated by the record owner while in Pending Review for Change records
                with the required permission.
            </Alert>

            <!-- Read-only Planning and General context -->
            <section class="space-y-4 rounded-lg border border-border bg-card p-6">
                <h2 class="text-base font-semibold">Purpose of changes</h2>
                <DetailList :items="change.purpose" />
                <DetailTable
                    data-testid="table-facing_challenges"
                    title="Facing challenges"
                    :columns="NUMBERED_TEXT"
                    :rows="change.challenges"
                />
                <DetailTable
                    data-testid="table-identified_problems"
                    title="Identified problems"
                    :columns="NUMBERED_TEXT"
                    :rows="change.problems"
                />
                <DetailTable
                    data-testid="table-service_impacts"
                    title="Service impact"
                    :columns="[
                        { key: 'impact', label: 'Impact' },
                        { key: 'description', label: 'Description' },
                    ]"
                    :rows="change.impacts"
                />
            </section>

            <section class="space-y-4 rounded-lg border border-border bg-card p-6">
                <h2 class="text-base font-semibold">Plan, schedule and rollback</h2>
                <DetailTable
                    data-testid="table-improvement_items"
                    title="Improvement plan and target KPI"
                    :columns="[
                        { key: 'no', label: '#' },
                        { key: 'plan', label: 'Plan' },
                        { key: 'kpi', label: 'Target KPI' },
                    ]"
                    :rows="change.improvements"
                />
                <DetailList :items="change.plan" />
            </section>

            <!-- Results editor and submit button -->
            <div v-if="isEligible" data-testid="results-editor" class="space-y-6">
                <ResultsSection
                    v-model="resultsModel"
                    :errors="fieldErrors"
                    :disabled="submitting || feedbackError?.code === 'NSCMF_VERSION_CONFLICT'"
                />

                <RequestFeedback :error="feedbackError" :save-status="saveStatus" @refresh="handleRefresh" />

                <div v-if="feedbackError?.code !== 'NSCMF_VERSION_CONFLICT'" class="flex justify-end">
                    <Button
                        type="button"
                        data-testid="submit-results-btn"
                        :disabled="submitting"
                        @click="submitResults"
                    >
                        Update Result of Changes
                    </Button>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
