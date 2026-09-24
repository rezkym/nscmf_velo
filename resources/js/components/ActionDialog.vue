<script setup lang="ts">
import { ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
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
        // 06 §54: five meaningful characters, i.e. characters other than whitespace.
        if (trimmed.replace(/\s+/gu, '').length < 5) {
            validationError.value = 'Reason must be at least 5 characters, not counting spaces';
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4 transition-opacity duration-200 ease-out starting:opacity-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
    >
        <div
            ref="panelRef"
            class="panel w-full max-w-lg space-y-4 p-6 shadow-xl transition-[opacity,scale] duration-200 ease-out starting:scale-96 starting:opacity-0"
        >
            <div class="space-y-1">
                <h2 id="action-dialog-title" class="text-lg font-semibold">
                    {{ title }}
                </h2>
                <p v-if="requestNo" class="text-sm text-muted-foreground">Request No: {{ requestNo }}</p>
            </div>

            <div v-if="consequence" class="text-sm text-muted-foreground">
                {{ consequence }}
            </div>

            <div v-if="destination" class="text-sm text-muted-foreground">Target: {{ destination }}</div>

            <Alert v-if="error" variant="error">{{ error }}</Alert>

            <div class="space-y-2">
                <label for="dialog-reason" class="block text-sm font-medium text-foreground">
                    {{ reasonRequired ? 'Reason' : `${optionalLabel} (optional)` }}
                    <span v-if="reasonRequired" class="text-destructive">*</span>
                </label>
                <textarea
                    id="dialog-reason"
                    ref="textareaRef"
                    v-model="reason"
                    :class="[controlClass, 'min-h-[100px]']"
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
                <Button variant="secondary" data-test="cancel-button" :disabled="pending" @click="handleCancel">
                    Cancel
                </Button>
                <Button data-test="confirm-button" :disabled="pending" @click="handleConfirm">
                    {{ pending ? 'Submitting...' : confirmLabel }}
                </Button>
            </div>
        </div>
    </div>
</template>
