<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import ActionDialog from '@/components/ActionDialog.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from '@/features/nscmf/contracts';
import { isRecordConflictCode, pageDomainError } from '@/lib/apiErrors';

type ReviewAction = 'return' | 'reject' | 'forward';

const actions = {
    return: {
        permission: 'nscmf.review.return',
        label: 'Return for Revision',
        consequence: 'The requester can revise and resubmit this NSCMF.',
        destination: 'Revision Required',
    },
    reject: {
        permission: 'nscmf.review.reject',
        label: 'Reject NSCMF',
        consequence: 'This NSCMF will be rejected.',
        destination: 'Rejected',
    },
    forward: {
        permission: 'nscmf.review.forward',
        label: 'Forward to Approval',
        consequence: 'The approver pool can review this NSCMF.',
        destination: 'Pending Approval',
    },
} as const;

export interface ReviewActionsProps {
    recordId: number;
    requestNo: string;
    recordVersion: number;
    businessStatus: BusinessStatus;
    archived: boolean;
    family: 'ACTIVATION' | 'CHANGE';
    allowedActions: string[];
    changeForwardReady?: boolean;
    changeForwardReason?: string | null;
}

const props = withDefaults(defineProps<ReviewActionsProps>(), {
    changeForwardReady: false,
    changeForwardReason: null,
});

const { can } = usePermissions();
const selected = ref<ReviewAction | null>(null);
const trigger = ref<HTMLElement | null>(null);
const pending = ref(false);
const error = ref<string | null>(null);
const conflict = ref(false);

const reviewable = computed(() => props.businessStatus === 'PENDING_REVIEW' && !props.archived);
const forwardReady = computed(() => props.family !== 'CHANGE' || props.changeForwardReady);
const forwardReason = computed(() =>
    props.family === 'CHANGE' && !forwardReady.value
        ? props.changeForwardReason?.trim() || 'Complete at least one Result and all started Results before forwarding.'
        : null,
);

function eligible(action: ReviewAction): boolean {
    return (
        reviewable.value && can(actions[action].permission) && props.allowedActions.includes(actions[action].permission)
    );
}

function available(action: ReviewAction): boolean {
    return eligible(action) && !pending.value && !conflict.value && (action !== 'forward' || forwardReady.value);
}

watch(
    () => selected.value !== null && !eligible(selected.value),
    (invalid) => {
        if (invalid && !pending.value) selected.value = null;
    },
);

function open(action: ReviewAction, event: Event): void {
    if (selected.value || !available(action)) return;
    trigger.value = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    error.value = null;
    selected.value = action;
}

function close(): void {
    if (pending.value) return;
    selected.value = null;
    error.value = null;
}

function showDomainError(domain: { code?: string; message?: string } | null): boolean {
    if (!domain) return false;
    if (isRecordConflictCode(domain.code)) {
        conflict.value = true;
        error.value = domain.message || 'This record changed. Refresh it before another action.';
        selected.value = null;
    } else if (domain.code === 'FORBIDDEN') {
        error.value = 'Access denied. You do not have permission for this action.';
    } else {
        error.value = domain.message || 'The review action could not be completed.';
    }
    return true;
}

function submit({ reason }: { reason: string }): void {
    const action = selected.value;
    if (!action || !available(action)) return;

    pending.value = true;
    error.value = null;
    let responseFailed = false;
    const payload =
        action === 'forward'
            ? { record_version: props.recordVersion, comment: reason.trim() }
            : { record_version: props.recordVersion, reason: reason.trim() };

    router.post(`/nscmf/${props.recordId}/review/${action}`, payload, {
        onFlash: (flash) => {
            if (showDomainError(pageDomainError(flash))) responseFailed = true;
        },
        onError: (errors) => {
            responseFailed = true;
            error.value = Object.values(errors)[0] || 'The review action could not be completed.';
            pending.value = false;
        },
        onSuccess: (page) => {
            if (showDomainError(pageDomainError(page))) responseFailed = true;
            if (!responseFailed) closeAfterSuccess();
        },
        onHttpException: (response) => {
            responseFailed = true;
            const body = response.data;
            const code =
                typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
                    ? body.code
                    : undefined;
            if (response.status === 409 || isRecordConflictCode(code)) {
                conflict.value = true;
                error.value = 'This record changed. Refresh it before another action.';
                selected.value = null;
            } else if (response.status === 403 || response.status === 401) {
                error.value = 'Access denied. You do not have permission for this action.';
            } else {
                error.value = 'The review action could not be completed.';
            }
            pending.value = false;
            return false;
        },
        onNetworkError: () => {
            responseFailed = true;
            error.value = 'Network connection lost. The review action was not confirmed.';
            pending.value = false;
            return false;
        },
        onFinish: () => {
            pending.value = false;
        },
    });
}

function closeAfterSuccess(): void {
    selected.value = null;
    error.value = null;
}

function refresh(): void {
    if (pending.value) return;
    router.reload({
        onSuccess: () => {
            conflict.value = false;
            error.value = null;
            selected.value = null;
        },
    });
}
</script>

<template>
    <div data-testid="review-actions" class="space-y-3">
        <div v-if="reviewable" class="flex flex-wrap gap-3">
            <Button
                v-if="eligible('return')"
                variant="secondary"
                data-testid="review-return"
                :disabled="!available('return')"
                @click="open('return', $event)"
            >
                Return for Revision
            </Button>
            <Button
                v-if="eligible('reject')"
                variant="destructive"
                data-testid="review-reject"
                :disabled="!available('reject')"
                @click="open('reject', $event)"
            >
                Reject NSCMF
            </Button>
            <Button
                v-if="eligible('forward')"
                data-testid="review-forward"
                :disabled="!available('forward')"
                :aria-describedby="forwardReason ? 'review-forward-reason' : undefined"
                @click="open('forward', $event)"
            >
                Forward to Approval
            </Button>
        </div>
        <p v-if="eligible('forward') && forwardReason" id="review-forward-reason" class="text-sm text-muted-foreground">
            {{ forwardReason }}
        </p>
        <Alert v-if="conflict" variant="error" title="Record changed" class="space-y-2">
            <p>{{ error }}</p>
            <Button variant="secondary" data-testid="review-refresh" @click="refresh">Refresh record</Button>
        </Alert>
        <ActionDialog
            v-if="selected"
            :key="selected"
            :open="true"
            :title="actions[selected].label"
            :confirm-label="actions[selected].label"
            :request-no="requestNo"
            :reason-required="selected !== 'forward'"
            :consequence="actions[selected].consequence"
            :destination="actions[selected].destination"
            :pending="pending || conflict"
            :error="error ?? undefined"
            :trigger-element="trigger"
            @confirm="submit"
            @cancel="close"
        />
    </div>
</template>
