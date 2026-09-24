<script setup lang="ts">
import { computed } from 'vue';

import { Alert, AlertAction, AlertDescription, AlertTitle, type AlertVariants } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { RequestFeedbackError, SaveStatus } from '@/types/feedback';

export type { RequestFeedbackError, SaveStatus };

export interface RequestFeedbackProps {
    error?: RequestFeedbackError | null;
    saveStatus?: SaveStatus;
}

const props = withDefaults(defineProps<RequestFeedbackProps>(), {
    error: null,
    saveStatus: null,
});

const emit = defineEmits<{
    (e: 'refresh'): void;
    (e: 'retry'): void;
    (e: 'login'): void;
}>();

const isSessionRevoked = computed(() => {
    return props.error?.status === 401 || props.error?.code === 'SESSION_EXPIRED';
});

const isConflict = computed(() => {
    return props.error?.status === 409 || props.error?.code === 'NSCMF_VERSION_CONFLICT';
});

// Gap G07: 12 §27 uses NSCMF_VALIDATION_FAILED while the common catalogue also carries
// VALIDATION_FAILED. Both are accepted rather than betting on one name before the contract binds.
const VALIDATION_CODES = ['NSCMF_VALIDATION_FAILED', 'VALIDATION_FAILED'];

const isValidation = computed(() => {
    return props.error?.status === 422 || VALIDATION_CODES.some((code) => code === props.error?.code);
});

const isForbidden = computed(() => {
    return props.error?.status === 403;
});

const isNotFound = computed(() => {
    return props.error?.status === 404;
});

const isThrottled = computed(() => {
    return props.error?.status === 429;
});

const isServiceUnavailable = computed(() => {
    return props.error?.status === 503;
});

const isNetworkFailure = computed(() => {
    return Boolean(props.error?.isNetworkError || props.error?.status === 0);
});

// Normalized validation error list
const validationErrorList = computed(() => {
    if (!props.error?.errors) return [];
    const list: string[] = [];
    for (const val of Object.values(props.error.errors)) {
        if (Array.isArray(val)) {
            list.push(...val);
        } else if (typeof val === 'string') {
            list.push(val);
        }
    }
    return list;
});

const canShowSaveStatus = computed(() => {
    // 07 §23: never claim a save alongside a failure. A stale 'saved' from a parent must not sit
    // above the panel explaining why the save did not happen, and a revoked session least of all.
    if (props.error) return false;
    return Boolean(props.saveStatus);
});

type FeedbackAction = 'refresh' | 'retry' | 'login';

interface Notice {
    testid: string;
    variant: AlertVariants['variant'];
    title: string;
    text: string;
    details?: string[];
    action?: { event: FeedbackAction; label: string; testid: string };
}

const RETRY = { event: 'retry', label: 'Retry', testid: 'feedback-retry-btn' } as const;

/** The one message for the current failure; the checks run in the order of precedence. */
const notice = computed<Notice | null>(() => {
    if (!props.error) return null;
    if (isSessionRevoked.value)
        return {
            testid: 'feedback-session-revoked',
            variant: 'warning',
            title: 'Your session has expired. Please sign in again.',
            text: 'Your session was terminated or expired. Unsaved changes were not persisted.',
            action: { event: 'login', label: 'Sign in again', testid: 'feedback-login-btn' },
        };
    if (isConflict.value)
        return {
            testid: 'feedback-conflict',
            variant: 'warning',
            title: 'A newer version exists',
            text: 'This record was modified by another user or transaction. Please refresh to load the latest record and avoid overwriting newer data.',
            action: { event: 'refresh', label: 'Refresh', testid: 'feedback-refresh-btn' },
        };
    if (isValidation.value)
        return {
            testid: 'feedback-validation',
            variant: 'destructive',
            title: 'Validation Error',
            text: 'Please review the highlighted fields and correct your input. Your current input has been preserved.',
            details: validationErrorList.value,
        };
    if (isForbidden.value)
        return {
            testid: 'feedback-forbidden',
            variant: 'destructive',
            title: 'Access Denied',
            text: 'You do not have permission to perform this action.',
        };
    if (isNotFound.value)
        return {
            testid: 'feedback-not-found',
            variant: 'default',
            title: 'Not Found',
            text: 'The requested resource was not found or is unavailable.',
        };
    if (isThrottled.value)
        return {
            testid: 'feedback-throttled',
            variant: 'warning',
            title: 'Too Many Requests',
            text: 'Rate limit exceeded. Please wait before retrying.',
            action: RETRY,
        };
    if (isServiceUnavailable.value)
        return {
            testid: 'feedback-service-unavailable',
            variant: 'warning',
            title: 'Service Temporarily Unavailable',
            text: 'The service is temporarily unavailable. You may retry safely.',
            action: RETRY,
        };
    if (isNetworkFailure.value)
        return {
            testid: 'feedback-network-error',
            variant: 'warning',
            title: 'Network Connection Issue',
            text: 'Unable to reach server. Please check your connection.',
            action: RETRY,
        };
    return {
        testid: 'feedback-generic-error',
        variant: 'destructive',
        title: 'Unexpected Error',
        text: 'An unexpected error occurred. Please try again later.',
    };
});

function act(event: FeedbackAction): void {
    if (event === 'refresh') emit('refresh');
    else if (event === 'retry') emit('retry');
    else emit('login');
}
</script>

<template>
    <div data-testid="request-feedback" class="grid gap-4">
        <!-- Save status indicator (suppressed when session is revoked) -->
        <p v-if="canShowSaveStatus" data-testid="save-status-indicator" class="flex items-center gap-2">
            <template v-if="saveStatus === 'saving'">
                <span class="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
                <span class="text-muted-foreground">Saving…</span>
            </template>
            <template v-else-if="saveStatus === 'saved'">
                <span class="size-2 rounded-full bg-success" aria-hidden="true" />
                <span class="text-success">Saved just now</span>
            </template>
            <template v-else>
                <span class="size-2 rounded-full bg-destructive" aria-hidden="true" />
                <span class="text-destructive">Save failed — retry</span>
            </template>
        </p>

        <!-- Every failure is announced at once, whatever its tone. -->
        <Alert v-if="notice" :variant="notice.variant" role="alert" :data-testid="notice.testid">
            <AlertTitle>{{ notice.title }}</AlertTitle>
            <AlertDescription>
                <p>{{ notice.text }}</p>
                <ul v-if="notice.details?.length" class="list-disc pl-4">
                    <li v-for="(message, index) in notice.details" :key="index">{{ message }}</li>
                </ul>
            </AlertDescription>
            <AlertAction v-if="notice.action">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :data-testid="notice.action.testid"
                    @click="act(notice.action.event)"
                >
                    {{ notice.action.label }}
                </Button>
            </AlertAction>
        </Alert>
    </div>
</template>
