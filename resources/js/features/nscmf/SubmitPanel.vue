<script setup lang="ts">
import { computed } from 'vue';

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
}

const props = withDefaults(defineProps<SubmitPanelProps>(), {
    ownerId: null,
    allowedActions: () => [],
    saveState: 'clean',
});

const { user, can } = usePermissions();

const isOwner = computed(() => Boolean(user.value?.id && props.ownerId === user.value.id));
const hasPermission = computed(() => can('nscmf.submit'));
const isStateEligible = computed(() => props.businessStatus === 'DRAFT' || props.businessStatus === 'REVISION_REQUIRED');
const isActionAllowed = computed(() => props.allowedActions.includes('submit'));

// Client checks for eligibility
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

function handleSubmit(): void {
    if (!canSubmit.value) return;
    router.post(`/nscmf/${props.recordId}/submit`, {
        record_version: props.recordVersion,
    });
}
</script>

<template>
    <div data-testid="submit-panel" class="space-y-4">
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
