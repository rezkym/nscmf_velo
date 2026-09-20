<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from './contracts';
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
}

const props = withDefaults(defineProps<SubmitPanelProps>(), {
    ownerId: null,
    allowedActions: () => [],
    saveState: 'clean',
    errors: () => ({}),
});

const emit = defineEmits<{
    (e: 'navigate-error', path: string): void;
}>();

const { user, can } = usePermissions();

const isOwner = computed(() => Boolean(user.value?.id && props.ownerId === user.value.id));
const hasPermission = computed(() => can('nscmf.submit'));
const isStateEligible = computed(() => props.businessStatus === 'DRAFT' || props.businessStatus === 'REVISION_REQUIRED');
const isActionAllowed = computed(() => props.allowedActions.includes('submit'));

const canSubmit = computed(() => {
    return (
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
    const parts = path.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart && PATH_LABELS[lastPart]) {
        return PATH_LABELS[lastPart];
    }
    return lastPart ? lastPart.replace(/_/g, ' ') : path;
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

    // ID convention: field-<sanitized path>
    const elementId = `field-${path.replace(/\./g, '-')}`;
    const el = document.getElementById(elementId);
    if (el) {
        el.focus();
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
}

function handleSubmit(): void {
    if (!canSubmit.value) return;
    router.post(`/nscmf/${props.recordId}/submit`, {
        record_version: props.recordVersion,
    });
}
</script>

<template>
    <div data-testid="submit-panel" class="space-y-4">
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
                <li
                    v-for="err in mappedErrors"
                    :key="err.path"
                    data-testid="error-summary-item"
                >
                    <button
                        type="button"
                        class="underline hover:opacity-80 font-medium inline-block text-left"
                        @click="navigateToError(err.path)"
                    >
                        {{ err.label }}:
                    </button>
                    <span> {{ err.message }}</span>
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
