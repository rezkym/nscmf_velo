<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import FormField from '@/components/FormField.vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { firstFieldError } from '@/lib/apiErrors';
import { sendJson } from '@/lib/http';

export interface ReauthenticationDialogProps {
    open: boolean;
    targetActionTitle?: string;
    targetActionDescription?: string;
    errorCode?: string;
    serverErrorMessage?: string;
    triggerElement?: HTMLElement | null;
}

const props = withDefaults(defineProps<ReauthenticationDialogProps>(), {
    targetActionTitle: 'Confirm Sensitive Action',
    targetActionDescription: 'Please confirm your identity by re-entering your current password.',
    errorCode: undefined,
    serverErrorMessage: undefined,
    triggerElement: null,
});

const emit = defineEmits<{
    (e: 'success'): void;
    (e: 'cancel'): void;
}>();

const currentPassword = ref('');
const processing = ref(false);
/** The outcome of this dialog's own submission; it replaces whatever the parent passed in. */
const submitError = ref<string | null>(null);

const displayError = computed(() => {
    if (submitError.value) return submitError.value;
    if (props.serverErrorMessage) return props.serverErrorMessage;
    if (props.errorCode === 'REAUTH_REQUIRED') return 'Re-authentication is required to perform this action.';
    if (props.errorCode === 'REAUTH_FAILED') return 'Re-authentication failed. Please check your password.';
    return null;
});

/**
 * POST /account/re-authenticate is same-origin JSON (12 §79, §109): 204 means the server now holds a
 * 15-minute proof in the session. Nothing reusable comes back to the browser, and the password is
 * cleared whatever the outcome.
 */
async function submit(): Promise<void> {
    if (processing.value || !currentPassword.value.trim()) return;

    processing.value = true;
    submitError.value = null;
    const password = currentPassword.value;
    currentPassword.value = '';

    try {
        const result = await sendJson('POST', '/account/re-authenticate', { current_password: password });

        if (result.ok) {
            emit('success');
            return;
        }

        submitError.value =
            firstFieldError(result.error, 'current_password') ??
            (result.error?.message || 'Re-authentication could not be completed. Try again.');
    } finally {
        processing.value = false;
    }
}

function handleCancel(): void {
    if (processing.value) return;
    currentPassword.value = '';
    submitError.value = null;
    emit('cancel');
}

watch(
    () => props.open,
    () => {
        currentPassword.value = '';
        submitError.value = null;
    },
);

/** The dialog opens on the password field; closing returns focus to the control that asked for it. */
function returnFocus(event: Event): void {
    if (!props.triggerElement) return;
    event.preventDefault();
    props.triggerElement.focus();
}

onBeforeUnmount(() => {
    currentPassword.value = '';
});
</script>

<template>
    <Dialog
        :open="open"
        @update:open="
            (open) => {
                if (!open && !processing) handleCancel();
            }
        "
    >
        <DialogContent :show-close-button="false" @close-auto-focus="returnFocus">
            <DialogHeader>
                <DialogTitle>{{ targetActionTitle }}</DialogTitle>
                <DialogDescription v-if="targetActionDescription">{{ targetActionDescription }}</DialogDescription>
            </DialogHeader>
            <form class="space-y-4" @submit.prevent="void submit()">
                <Alert v-if="displayError" variant="destructive" data-testid="reauth-error"
                    ><AlertDescription>{{ displayError }}</AlertDescription></Alert
                >

                <FormField
                    id="current_password"
                    label="Current Password"
                    required
                    :disabled="processing"
                    help="Enter your existing account password to confirm"
                >
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <Input
                            :id="fieldId"
                            v-model="currentPassword"
                            type="password"
                            name="current_password"
                            autocomplete="current-password"
                            required
                            :disabled="disabled"
                            :aria-describedby="describedBy"
                        />
                    </template>
                </FormField>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        data-test="cancel-button"
                        :disabled="processing"
                        @click="handleCancel"
                    >
                        Cancel
                    </Button>
                    <Button type="submit" data-test="confirm-button" :disabled="processing || !currentPassword">
                        {{ processing ? 'Verifying…' : 'Confirm' }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
