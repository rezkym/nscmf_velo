<script setup lang="ts">
import { ref, watch } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

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

/** Closing by Escape, the overlay or the close button is a cancel, except while the action is in flight. */
function onOpenChange(open: boolean): void {
    if (!open && !props.pending) handleCancel();
}

/** The dialog opens on the text field; closing returns focus to the action that opened it. */
function returnFocus(event: Event): void {
    if (!props.triggerElement) return;
    event.preventDefault();
    props.triggerElement.focus();
}

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) validationError.value = null;
    },
);
</script>

<template>
    <Dialog :open="open" @update:open="onOpenChange">
        <DialogContent :show-close-button="false" @close-auto-focus="returnFocus">
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription v-if="requestNo">Request No: {{ requestNo }}</DialogDescription>
            </DialogHeader>

            <div v-if="consequence || destination" class="space-y-1 text-muted-foreground">
                <p v-if="consequence">{{ consequence }}</p>
                <p v-if="destination">Target: {{ destination }}</p>
            </div>

            <Alert v-if="error" variant="destructive">
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <Field :data-invalid="validationError ? true : undefined">
                <FieldLabel for="dialog-reason">
                    {{ reasonRequired ? 'Reason' : `${optionalLabel} (optional)` }}
                    <span v-if="reasonRequired" class="text-destructive" aria-hidden="true">*</span>
                </FieldLabel>
                <Textarea
                    id="dialog-reason"
                    v-model="reason"
                    class="min-h-24"
                    :disabled="pending"
                    :aria-invalid="validationError ? true : undefined"
                    :aria-describedby="validationError ? 'dialog-reason-error' : undefined"
                    :placeholder="
                        reasonRequired ? 'Enter reason...' : `Enter optional ${optionalLabel.toLowerCase()}...`
                    "
                />
                <FieldError v-if="validationError" id="dialog-reason-error">{{ validationError }}</FieldError>
            </Field>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    data-test="cancel-button"
                    :disabled="pending"
                    @click="handleCancel"
                >
                    Cancel
                </Button>
                <Button type="button" data-test="confirm-button" :disabled="pending" @click="handleConfirm">
                    {{ pending ? 'Submitting...' : confirmLabel }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
