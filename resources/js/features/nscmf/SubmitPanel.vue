<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from './contracts';
import StatusBadge from './StatusBadge.vue';
import { router } from '@inertiajs/vue3';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export interface SubmitPanelProps {
    recordId: number;
    recordVersion: number;
    businessStatus: BusinessStatus;
    ownerId?: number | null;
    allowedActions?: string[];
    saveState?: SaveState;
    errors?: Record<string, string | string[]>;
    warnings?: string[];
    requestNo?: string | null;
    iteration?: number | null;
    revisionReason?: string | null;
    domainError?: {
        code?: string;
        message?: string;
    } | null;
}

const props = withDefaults(defineProps<SubmitPanelProps>(), {
    ownerId: null,
    allowedActions: () => [],
    saveState: 'clean',
    errors: () => ({}),
    warnings: () => [],
    requestNo: null,
    iteration: null,
    revisionReason: null,
    domainError: null,
});

const emit = defineEmits<{
    (e: 'navigate-error', path: string): void;
}>();

const { user, can } = usePermissions();

const isOwner = computed(() => Boolean(user.value?.id && props.ownerId === user.value.id));
const hasPermission = computed(() => can('nscmf.submit'));
const isStateEligible = computed(
    () => props.businessStatus === 'DRAFT' || props.businessStatus === 'REVISION_REQUIRED',
);
const isActionAllowed = computed(() => props.allowedActions.includes('submit'));

const isSubmitting = ref(false);

const canSubmit = computed(() => {
    return (
        !isSubmitting.value &&
        isOwner.value &&
        hasPermission.value &&
        isStateEligible.value &&
        isActionAllowed.value &&
        props.saveState !== 'dirty' &&
        props.saveState !== 'saving' &&
        props.saveState !== 'error' &&
        props.saveState !== 'conflict'
    );
});

const isRevisionMode = computed(() => props.businessStatus === 'REVISION_REQUIRED');

const saveBlockingMessage = computed(() => {
    if (props.saveState === 'dirty') {
        return 'Save pending changes before submitting';
    }
    if (props.saveState === 'saving') {
        return 'Saving in progress...';
    }
    if (props.saveState === 'conflict') {
        return 'Resolve version conflict before submitting';
    }
    if (props.saveState === 'error') {
        return 'Save failed — resolve errors before submitting';
    }
    return null;
});

// Human-friendly field path mapper
const PATH_LABELS: Record<string, string> = {
    service_id: 'Service ID',
    service_context: 'Service Context',
    service_status: 'Service Status',
    service_description: 'Service Description',
    service_location: 'Service Location',
    installation_rfs_date: 'Installation (RFS) Date',
    plan_text: 'Maintenance Plan',
    target_kpi: 'Target KPI',
    target_execution_date: 'Target Execution Date',
    rollback_scenario: 'Rollback Scenario',
    announcement_timing: 'Announcement Timing',
    customer_name: 'Customer Name',
    contact_name: 'Contact Name',
};

function formatPathLabel(path: string): string {
    const lastPart = path.split('.').at(-1);
    if (!lastPart) return '';
    return PATH_LABELS[lastPart] ?? lastPart.replace(/_/g, ' ');
}

interface MappedError {
    path: string;
    label: string;
    message: string;
}

const mappedErrors = computed<MappedError[]>(() => {
    const list: MappedError[] = [];
    for (const [path, msg] of Object.entries(props.errors)) {
        if (!msg) continue;
        const message = Array.isArray(msg) ? msg.join(', ') : msg;
        list.push({
            path,
            label: formatPathLabel(path),
            message,
        });
    }
    return list;
});

const summaryRef = ref<HTMLElement | null>(null);

watch(
    () => mappedErrors.value.length,
    (count) => {
        if (count > 0) {
            void nextTick(() => {
                summaryRef.value?.focus();
            });
        }
    },
    { immediate: true },
);

const CONTROLS = 'input, select, textarea, button';

/**
 * Finds the control a server error path belongs to. Sections publish exactly two things:
 * a `data-error-path`/`data-error-wire-path` attribute where a row needs its natural key and the
 * persisted index to agree, and otherwise a control id that is the wire path with `-` for `.` and
 * without the family prefix (the section contract). Nothing else is produced, so nothing else is
 * searched for.
 */
function resolveControlByPath(path: string): HTMLElement | null {
    const byDataAttr = document.querySelector<HTMLElement>(
        `[data-error-path="${CSS.escape(path)}"], [data-error-wire-path="${CSS.escape(path)}"]`,
    );
    if (byDataAttr) {
        return byDataAttr.matches(CONTROLS)
            ? byDataAttr
            : (byDataAttr.querySelector<HTMLElement>(CONTROLS) ?? byDataAttr);
    }

    const controlId = path.replace(/^(?:activation|change)\./, '').replace(/\./g, '-');
    return document.getElementById(controlId);
}

function navigateToError(path: string): void {
    emit('navigate-error', path);

    const control = resolveControlByPath(path);
    if (control) {
        control.focus();
        control.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
}

function handleSubmit(): void {
    if (!canSubmit.value) return;
    isSubmitting.value = true;
    router.post(
        `/nscmf/${props.recordId}/submit`,
        {
            record_version: props.recordVersion,
        },
        {
            onFinish: () => {
                isSubmitting.value = false;
            },
            onError: () => {
                isSubmitting.value = false;
            },
        },
    );
}
</script>

<template>
    <div data-testid="submit-panel" class="space-y-4">
        <!-- Status indicator (always derived from authoritative server props, never locally mutated prematurely) -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground font-medium">Current Status:</span>
                <StatusBadge data-testid="submit-status-badge" :status="businessStatus" />
            </div>

            <!-- Request Meta info (immutable request_no, server iteration) -->
            <div
                v-if="requestNo || iteration"
                data-testid="submit-meta-info"
                class="flex items-center gap-4 text-xs text-muted-foreground"
            >
                <span v-if="requestNo" class="font-mono font-medium">
                    {{ requestNo }}
                </span>
                <span v-if="iteration !== null && iteration !== undefined"> Iteration: {{ iteration }} </span>
            </div>
        </div>

        <!-- Revision Notice (Shown in Revision Mode with reviewer return reason) -->
        <Alert v-if="isRevisionMode" data-testid="revision-notice" variant="info" title="Revision Required">
            <p v-if="revisionReason"><span class="font-medium">Return Reason:</span> {{ revisionReason }}</p>
        </Alert>

        <!-- Domain Error Alert (403/409/422/etc) -->
        <Alert v-if="domainError?.message" data-testid="domain-error-alert" variant="error">
            {{ domainError.message }}
        </Alert>

        <!-- Error Summary (Focus summary first, links to target fields) -->
        <div
            v-if="mappedErrors.length > 0"
            ref="summaryRef"
            data-testid="error-summary"
            role="alert"
            tabindex="-1"
            class="p-4 rounded-md bg-destructive/10 border border-destructive text-destructive focus:outline-none focus:ring-2 focus:ring-destructive"
        >
            <h3 class="text-sm font-semibold mb-2">There are errors preventing submission</h3>
            <ul class="list-disc list-inside space-y-1 text-sm">
                <li v-for="err in mappedErrors" :key="err.path" data-testid="error-summary-item">
                    <button
                        v-if="err.label"
                        type="button"
                        class="underline hover:opacity-80 font-medium inline-block text-left"
                        @click="navigateToError(err.path)"
                    >
                        {{ err.label }}:
                    </button>
                    <span v-else class="font-medium inline-block text-left"> </span>
                    <span> {{ err.message }}</span>
                </li>
            </ul>
        </div>

        <!-- Warning Summary (Visually distinct from error, non-blocking) -->
        <Alert v-if="warnings.length > 0" data-testid="warning-summary" variant="warning" title="Submission Warnings">
            <ul class="list-disc list-inside space-y-1">
                <li v-for="(warn, idx) in warnings" :key="idx" data-testid="warning-summary-item">
                    {{ warn }}
                </li>
            </ul>
        </Alert>

        <div v-if="saveBlockingMessage" data-testid="save-blocking-message" class="text-sm text-destructive">
            {{ saveBlockingMessage }}
        </div>

        <Button data-testid="submit-button" :disabled="!canSubmit" @click="handleSubmit"> Submit for Review </Button>
    </div>
</template>
