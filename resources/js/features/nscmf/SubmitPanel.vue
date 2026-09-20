<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from './contracts';
import { STATUS_LABELS } from './types';
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
const statusLabel = computed(() => STATUS_LABELS[props.businessStatus] ?? props.businessStatus);

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
const PATH_LABELS: Record<string, string> = Object.assign(Object.create(null) as Record<string, string>, {
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
});

function formatPathLabel(path: string): string {
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart && Object.prototype.hasOwnProperty.call(PATH_LABELS, lastPart)) {
        return PATH_LABELS[lastPart]!;
    }
    return lastPart ? lastPart.replace(/_/g, ' ') : '';
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

function navigateToError(path: string): void {
    emit('navigate-error', path);

    const message = props.errors[path];
    if (message) {
        const textToFind = Array.isArray(message) ? message[0] : message;
        if (textToFind) {
            const alerts = Array.from(document.querySelectorAll('.form-field [role="alert"]'));
            for (const alert of alerts) {
                if (alert.textContent?.trim().includes(textToFind.trim())) {
                    const formField = alert.closest('.form-field');
                    const control = formField?.querySelector<HTMLElement>('input, textarea, select, button');
                    if (control) {
                        control.focus();
                        control.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                        return;
                    }
                }
            }
        }
    }

    // Fallback: direct ID matching or sanitized path ID
    const sanitizedId = path.replace(/\./g, '-');
    const directEl =
        document.getElementById(path) ??
        document.getElementById(sanitizedId) ??
        document.getElementById(`field-${sanitizedId}`);
    if (directEl) {
        directEl.focus();
        directEl.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
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
                <Badge data-testid="submit-status-badge" variant="neutral">
                    {{ statusLabel }}
                </Badge>
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
        <div
            v-if="isRevisionMode"
            data-testid="revision-notice"
            role="note"
            class="p-4 rounded-md bg-blue-500/10 border border-blue-500 text-blue-950 dark:text-blue-200 space-y-1"
        >
            <h3 class="text-sm font-semibold">Revision Required</h3>
            <p v-if="revisionReason" class="text-sm">
                <span class="font-medium">Return Reason:</span> {{ revisionReason }}
            </p>
        </div>

        <!-- Domain Error Alert (403/409/422/etc) -->
        <div
            v-if="domainError?.message"
            data-testid="domain-error-alert"
            role="alert"
            class="p-4 rounded-md bg-destructive/10 border border-destructive text-destructive space-y-1 text-sm"
        >
            <div v-if="domainError.code" class="font-mono text-xs font-semibold">
                {{ domainError.code }}
            </div>
            <div>{{ domainError.message }}</div>
        </div>

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
                        type="button"
                        class="underline hover:opacity-80 font-medium inline-block text-left"
                        @click="navigateToError(err.path)"
                    >
                        <template v-if="err.label">{{ err.label }}:</template>
                    </button>
                    <span> {{ err.message }}</span>
                </li>
            </ul>
        </div>

        <!-- Warning Summary (Visually distinct from error, non-blocking) -->
        <div
            v-if="warnings.length > 0"
            data-testid="warning-summary"
            role="status"
            class="p-4 rounded-md bg-amber-500/10 border border-amber-500 text-amber-900 dark:text-amber-200"
        >
            <h3 class="text-sm font-semibold mb-2">Submission Warnings</h3>
            <ul class="list-disc list-inside space-y-1 text-sm">
                <li v-for="(warn, idx) in warnings" :key="idx" data-testid="warning-summary-item">
                    {{ warn }}
                </li>
            </ul>
        </div>

        <div v-if="saveBlockingMessage" data-testid="save-blocking-message" class="text-sm text-destructive">
            {{ saveBlockingMessage }}
        </div>

        <button
            type="button"
            data-testid="submit-button"
            :disabled="!canSubmit"
            class="px-4 py-2 font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
        >
            Submit for Review
        </button>
    </div>
</template>
