<script lang="ts">
import { checkedRecordVersion, normalizeResultRows } from '@/features/nscmf/draftPayload';
import type { ChangeResultRow } from '@/features/nscmf/types';

export interface ChangeResultsPayload {
    record_version: number;
    results: ChangeResultRow[];
}

/** The editable rows this page owns, read off a record projection. */
export function resultRowsOf(record: { change?: { results?: ChangeResultRow[] | null } | null }): ChangeResultRow[] {
    return (record.change?.results ?? []).map((row, index) => ({
        row_no: row.row_no || index + 1,
        result_summary: row.result_summary ?? null,
        performance_information: row.performance_information ?? null,
        result_status: row.result_status ?? null,
    }));
}

export type DisplayValue = string | number | boolean | null | undefined;

export function displayValue(value: DisplayValue): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

/**
 * Builds the PATCH /nscmf/{record}/change-results payload (12 §29).
 * Exact keys only: record_version, results.
 *
 * The rows themselves follow the same whole-set rules as every other collection (12 §7.4.1), so the
 * normalisation is the shared one; only the envelope differs from the draft payload, which wraps
 * everything in `change`.
 */
export function buildChangeResultsPayload(recordVersion: number, results: ChangeResultRow[]): ChangeResultsPayload {
    return {
        record_version: checkedRecordVersion(recordVersion),
        results: normalizeResultRows(results),
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
import RequestFeedback from '@/components/RequestFeedback.vue';
// Types come from their canonical module, not through the SFC: a type re-exported from a .vue file
// resolves to `any` for eslint, which is what the suppression here used to paper over.
import type { RequestFeedbackError, SaveStatus } from '@/types/feedback';
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
import { pageDomainError } from '@/lib/apiErrors';
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

const resultsModel = ref<{ results: ChangeResultRow[] }>({ results: resultRowsOf(props.record) });

const fieldErrors = ref<Record<string, string>>({});
const feedbackError = ref<RequestFeedbackError | null>(null);
const saveStatus = ref<SaveStatus>(null);
const submitting = ref(false);
/** Latched once the record moved or access was refused: editing stops until an explicit refresh. */
const hasTerminalError = ref(false);

/** Only a stale base version makes further editing pointless; other errors are reported, not locked. */
const isVersionConflict = computed(() => feedbackError.value?.code === 'NSCMF_VERSION_CONFLICT');

/** The rows as last loaded from the server, so local typing can be told apart from a server change. */
const loadedRows = ref(JSON.stringify(resultsModel.value.results));
const hasUnsavedRows = computed(() => JSON.stringify(resultsModel.value.results) !== loadedRows.value);

function adoptRows(rows: ChangeResultRow[]): void {
    resultsModel.value = { results: rows };
    loadedRows.value = JSON.stringify(rows);
}

function resetToRecord(): void {
    adoptRows(resultRowsOf(props.record));
    feedbackError.value = null;
    fieldErrors.value = {};
    hasTerminalError.value = false;
}

function latchTerminal(error: RequestFeedbackError): void {
    hasTerminalError.value = true;
    feedbackError.value = error;
    saveStatus.value = null;
}

/** 12 §12 codes this page can be told about through flash (12 §10). */
function terminalFromDomainError(dError: { code?: string; message?: string } | null): RequestFeedbackError | null {
    if (dError?.code === 'NSCMF_VERSION_CONFLICT') {
        return { status: 409, code: dError.code, message: dError.message ?? 'A newer version of this record exists.' };
    }
    if (dError?.code === 'FORBIDDEN') {
        return { status: 403, code: dError.code, message: dError.message ?? 'Access Denied' };
    }
    return null;
}

watch(
    () => props.record.record_version,
    () => {
        if (hasTerminalError.value) return;

        // The record moved underneath the editor. Discarding the owner's typing here would lose
        // work silently, so say so and let them choose a refresh instead (07 §23, FE-29 AC3).
        if (hasUnsavedRows.value) {
            latchTerminal({
                status: 409,
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
            });
            return;
        }

        resetToRecord();
    },
);

watch(
    () => page.flash,
    (flash) => {
        const terminal = terminalFromDomainError(pageDomainError(flash));
        if (terminal) latchTerminal(terminal);
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
    // Eligibility is enforced by `v-if="isEligible"` around the editor, so it is not re-checked
    // here; a second submit is blocked by the button's disabled state.
    if (submitting.value) return;

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
                adoptRows(resultRowsOf(pageRecord));
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
            // No code is claimed that the server did not send (12 §12); the status carries the
            // meaning and RequestFeedback classifies on it.
            latchTerminal(
                response.status === 403
                    ? { status: 403, code: 'FORBIDDEN', message: 'Access Denied' }
                    : response.status === 409
                      ? {
                            status: 409,
                            code: 'NSCMF_VERSION_CONFLICT',
                            message: 'A newer version of this record exists.',
                        }
                      : { status: response.status, message: 'A server error occurred.' },
            );
        },
        onFlash: (flash) => {
            const terminal = terminalFromDomainError(pageDomainError(flash));
            if (terminal) latchTerminal(terminal);
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
                    :disabled="submitting || isVersionConflict"
                />

                <RequestFeedback :error="feedbackError" :save-status="saveStatus" @refresh="handleRefresh" />

                <div v-if="!isVersionConflict" class="flex justify-end">
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
