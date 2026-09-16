<script setup lang="ts">
import { computed } from 'vue';

export interface RequestFeedbackError {
    status?: number;
    code?: string;
    message?: string;
    errors?: Record<string, string[] | string>;
    context?: Record<string, unknown>;
    isNetworkError?: boolean;
}

export type SaveStatus = 'saving' | 'saved' | 'error' | null;

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

const isValidation = computed(() => {
    return props.error?.status === 422 || props.error?.code === 'NSCMF_VALIDATION_FAILED';
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
    // AC2: If session is revoked/expired, NEVER claim saved or in-progress save
    if (isSessionRevoked.value) return false;
    return Boolean(props.saveStatus);
});

function handleRefresh(): void {
    emit('refresh');
}

function handleRetry(): void {
    emit('retry');
}

function handleLogin(): void {
    emit('login');
}
</script>

<template>
    <div data-testid="request-feedback" class="space-y-4 text-sm">
        <!-- Save status indicator (suppressed when session is revoked) -->
        <div v-if="canShowSaveStatus" data-testid="save-status-indicator" class="flex items-center gap-2">
            <span v-if="saveStatus === 'saving'" class="text-muted-foreground flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-primary"></span>
                Saving…
            </span>
            <span v-else-if="saveStatus === 'saved'" class="text-emerald-700 flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-emerald-600"></span>
                Saved just now
            </span>
            <span v-else-if="saveStatus === 'error'" class="text-destructive flex items-center gap-1.5">
                <span class="inline-block h-2 w-2 rounded-full bg-destructive"></span>
                Save failed — retry
            </span>
        </div>

        <!-- 401 Session Revoked / Expired (AC2) -->
        <div
            v-if="isSessionRevoked"
            role="alert"
            class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
            data-testid="feedback-session-revoked"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-semibold text-amber-900">Your session has expired. Please sign in again.</h4>
                    <p class="mt-1 text-xs text-amber-800">
                        Your session was terminated or expired. Unsaved changes were not persisted.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="feedback-login-btn"
                    class="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    @click="handleLogin"
                >
                    Sign in again
                </button>
            </div>
        </div>

        <!-- 409 Version Conflict (AC1) -->
        <div
            v-else-if="isConflict"
            role="alert"
            class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
            data-testid="feedback-conflict"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-semibold text-amber-900">A newer version exists</h4>
                    <p class="mt-1 text-xs text-amber-800">
                        This record was modified by another user or transaction. Please refresh to load the latest
                        record and avoid overwriting newer data.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="feedback-refresh-btn"
                    class="rounded bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-950 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    @click="handleRefresh"
                >
                    Refresh
                </button>
            </div>
        </div>

        <!-- 422 Validation Error (AC1) -->
        <div
            v-else-if="isValidation"
            role="alert"
            class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
            data-testid="feedback-validation"
        >
            <h4 class="font-semibold text-destructive">Validation Error</h4>
            <p class="mt-1 text-xs">
                Please review the highlighted fields and correct your input. Your current input has been preserved.
            </p>
            <ul v-if="validationErrorList.length > 0" class="mt-2 list-inside list-disc space-y-0.5 text-xs">
                <li v-for="(msg, idx) in validationErrorList" :key="idx">
                    {{ msg }}
                </li>
            </ul>
        </div>

        <!-- 403 Forbidden - Generic & safe (AC3) -->
        <div
            v-else-if="isForbidden"
            role="alert"
            class="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-foreground"
            data-testid="feedback-forbidden"
        >
            <h4 class="font-semibold text-destructive">Access Denied</h4>
            <p class="mt-1 text-xs text-muted-foreground">You do not have permission to perform this action.</p>
        </div>

        <!-- 404 Not Found - Generic & safe (AC3) -->
        <div
            v-else-if="isNotFound"
            role="alert"
            class="rounded-lg border border-border bg-muted/40 p-4 text-foreground"
            data-testid="feedback-not-found"
        >
            <h4 class="font-semibold text-foreground">Not Found</h4>
            <p class="mt-1 text-xs text-muted-foreground">The requested resource was not found or is unavailable.</p>
        </div>

        <!-- 429 Throttled (AC4) -->
        <div
            v-else-if="isThrottled"
            role="alert"
            class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
            data-testid="feedback-throttled"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-semibold text-amber-900">Too Many Requests</h4>
                    <p class="mt-1 text-xs text-amber-800">Rate limit exceeded. Please wait before retrying.</p>
                </div>
                <button
                    type="button"
                    data-testid="feedback-retry-btn"
                    class="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    @click="handleRetry"
                >
                    Retry
                </button>
            </div>
        </div>

        <!-- 503 Service Unavailable (AC1) -->
        <div
            v-else-if="isServiceUnavailable"
            role="alert"
            class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
            data-testid="feedback-service-unavailable"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-semibold text-amber-900">Service Temporarily Unavailable</h4>
                    <p class="mt-1 text-xs text-amber-800">
                        The service is temporarily unavailable. You may retry safely.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="feedback-retry-btn"
                    class="rounded bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-950 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    @click="handleRetry"
                >
                    Retry
                </button>
            </div>
        </div>

        <!-- Network connection issue (AC4) -->
        <div
            v-else-if="isNetworkFailure"
            role="alert"
            class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
            data-testid="feedback-network-error"
        >
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h4 class="font-semibold text-amber-900">Network Connection Issue</h4>
                    <p class="mt-1 text-xs text-amber-800">Unable to reach server. Please check your connection.</p>
                </div>
                <button
                    type="button"
                    data-testid="feedback-retry-btn"
                    class="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    @click="handleRetry"
                >
                    Retry
                </button>
            </div>
        </div>

        <!-- Generic / 500 error -->
        <div
            v-else-if="error"
            role="alert"
            class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
            data-testid="feedback-generic-error"
        >
            <h4 class="font-semibold text-destructive">Unexpected Error</h4>
            <p class="mt-1 text-xs">An unexpected error occurred. Please try again later.</p>
        </div>
    </div>
</template>
