<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { controlClass } from '@/components/ui/control';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import FormField from '@/components/ui/FormField.vue';
import Modal from '@/components/ui/Modal.vue';
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

const passwordInputRef = ref<HTMLInputElement | null>(null);
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
    (isOpen) => {
        currentPassword.value = '';
        submitError.value = null;
        if (isOpen) void nextTick(() => passwordInputRef.value?.focus());
    },
);

onBeforeUnmount(() => {
    currentPassword.value = '';
});
</script>

<template>
    <Modal
        :open="open"
        :title="targetActionTitle"
        :description="targetActionDescription"
        :busy="processing"
        :return-focus-to="triggerElement"
        @close="handleCancel"
    >
        <form class="space-y-4" @submit.prevent="void submit()">
            <Alert v-if="displayError" variant="error" data-testid="reauth-error">{{ displayError }}</Alert>

            <FormField
                id="current_password"
                label="Current Password"
                required
                :disabled="processing"
                help="Enter your existing account password to confirm"
            >
                <template #default="{ id: fieldId, describedBy, disabled }">
                    <input
                        :id="fieldId"
                        ref="passwordInputRef"
                        v-model="currentPassword"
                        type="password"
                        name="current_password"
                        autocomplete="current-password"
                        required
                        :disabled="disabled"
                        :aria-describedby="describedBy"
                        :class="controlClass"
                    />
                </template>
            </FormField>

            <div class="flex justify-end gap-2 pt-2">
                <Button variant="secondary" data-test="cancel-button" :disabled="processing" @click="handleCancel">
                    Cancel
                </Button>
                <Button type="submit" data-test="confirm-button" :disabled="processing || !currentPassword">
                    {{ processing ? 'Verifying…' : 'Confirm' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>
