<script setup lang="ts">
import { ref, watch } from 'vue';

import { useFocusTrap } from '@/composables/useFocusTrap';

export interface ActionDialogProps {
    open: boolean;
    title: string;
    requestNo?: string;
    reasonRequired?: boolean;
    pending?: boolean;
    error?: string;
    consequence?: string;
    destination?: string;
    confirmLabel?: string;
    /** Label of the optional text when no reason is required. */
    optionalLabel?: string;
    triggerElement?: HTMLElement | null;
}

const props = withDefaults(defineProps<ActionDialogProps>(), {
    requestNo: undefined,
    reasonRequired: false,
    pending: false,
    error: undefined,
    consequence: undefined,
    destination: undefined,
    confirmLabel: 'Confirm',
    optionalLabel: 'Comment',
    triggerElement: null,
});

const emit = defineEmits<{
    (e: 'confirm', payload: { reason: string }): void;
    (e: 'cancel'): void;
}>();

const reason = ref('');
const validationError = ref<string | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

function validate(): boolean {
    const trimmed = reason.value.trim();

    if (props.reasonRequired) {
        if (!trimmed) {
            validationError.value = 'Reason is required';
            return false;
        }
        if (trimmed.length < 5) {
            validationError.value = 'Reason must be at least 5 characters';
            return false;
        }
        if (trimmed.length > 2000) {
            validationError.value = 'Reason cannot exceed 2000 characters';
            return false;
        }
    } else {
        if (reason.value.length > 2000) {
            validationError.value = `${props.optionalLabel} cannot exceed 2000 characters`;
            return false;
        }
    }

    validationError.value = null;
    return true;
}

function handleConfirm(): void {
    if (!validate()) {
        return;
    }

    emit('confirm', { reason: reason.value });
}

function handleCancel(): void {
    emit('cancel');
}

useFocusTrap(panelRef, () => props.open, {
    onEscape: () => {
        if (!props.pending) handleCancel();
    },
    initialFocus: textareaRef,
    returnFocusTo: () => props.triggerElement,
});

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) validationError.value = null;
    },
);
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
    >
        <div
            ref="panelRef"
            class="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg border border-border space-y-4"
        >
            <div class="space-y-1">
                <h2 id="action-dialog-title" class="text-lg font-semibold text-foreground">
                    {{ title }}
                </h2>
                <p v-if="requestNo" class="text-sm text-muted-foreground">Request No: {{ requestNo }}</p>
            </div>

            <div v-if="consequence" class="text-sm text-muted-foreground">
                {{ consequence }}
            </div>

            <div v-if="destination" class="text-sm text-muted-foreground">Target: {{ destination }}</div>

            <div
                v-if="error"
                role="alert"
                class="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20"
            >
                {{ error }}
            </div>

            <div class="space-y-2">
                <label for="dialog-reason" class="block text-sm font-medium text-foreground">
                    {{ reasonRequired ? 'Reason' : `${optionalLabel} (optional)` }}
                    <span v-if="reasonRequired" class="text-destructive">*</span>
                </label>
                <textarea
                    id="dialog-reason"
                    ref="textareaRef"
                    v-model="reason"
                    class="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="pending"
                    :placeholder="
                        reasonRequired ? 'Enter reason...' : `Enter optional ${optionalLabel.toLowerCase()}...`
                    "
                ></textarea>
                <p v-if="validationError" class="text-xs text-destructive">
                    {{ validationError }}
                </p>
            </div>

            <div class="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    data-test="cancel-button"
                    class="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent disabled:opacity-50"
                    :disabled="pending"
                    @click="handleCancel"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    data-test="confirm-button"
                    class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    :disabled="pending"
                    @click="handleConfirm"
                >
                    {{ pending ? 'Submitting...' : confirmLabel }}
                </button>
            </div>
        </div>
    </div>
</template>
