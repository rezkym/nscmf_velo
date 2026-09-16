<script setup lang="ts">
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

withDefaults(defineProps<RequestFeedbackProps>(), {
    error: null,
    saveStatus: null,
});

defineEmits<{
    (e: 'refresh'): void;
    (e: 'retry'): void;
    (e: 'login'): void;
}>();
</script>

<template>
    <div data-testid="request-feedback" class="request-feedback">
        <!-- Stub for meaningful RED verification -->
    </div>
</template>
