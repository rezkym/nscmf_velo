<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { controlClass } from '@/components/ui/control';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import FormField from '@/components/ui/FormField.vue';
import Modal from '@/components/ui/Modal.vue';

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

const form = useForm({
    current_password: '',
});

const displayError = computed(() => {
    const errors = form.errors as Record<string, string | undefined>;
    if (errors.current_password) {
        return errors.current_password;
    }
    if (props.serverErrorMessage) {
        return props.serverErrorMessage;
    }
    if (props.errorCode === 'REAUTH_REQUIRED') {
        return 'Re-authentication is required to perform this action.';
    }
    if (props.errorCode === 'REAUTH_FAILED') {
        return 'Re-authentication failed. Please check your password.';
    }
    return null;
});

function submit(): void {
    if (form.processing || !form.current_password.trim()) {
        return;
    }

    form.post('/account/re-authenticate', {
        onSuccess: () => {
            form.reset('current_password');
            emit('success');
        },
        onError: () => {
            form.reset('current_password');
        },
        onFinish: () => {
            form.reset('current_password');
        },
    });
}

function handleCancel(): void {
    if (form.processing) {
        return;
    }
    form.reset('current_password');
    emit('cancel');
}

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            void nextTick(() => passwordInputRef.value?.focus());
        } else {
            form.reset('current_password');
        }
    },
);

onBeforeUnmount(() => form.reset('current_password'));
</script>

<template>
    <Modal
        :open="open"
        :title="targetActionTitle"
        :description="targetActionDescription"
        :busy="form.processing"
        :return-focus-to="triggerElement"
        @close="handleCancel"
    >
        <form class="space-y-4" @submit.prevent="submit">
            <Alert v-if="displayError" variant="error" data-testid="reauth-error">{{ displayError }}</Alert>

            <FormField
                id="current_password"
                label="Current Password"
                required
                :disabled="form.processing"
                help="Enter your existing account password to confirm"
            >
                <template #default="{ id: fieldId, describedBy, disabled }">
                    <input
                        :id="fieldId"
                        ref="passwordInputRef"
                        v-model="form.current_password"
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
                <Button variant="secondary" data-test="cancel-button" :disabled="form.processing" @click="handleCancel">
                    Cancel
                </Button>
                <Button type="submit" data-test="confirm-button" :disabled="form.processing || !form.current_password">
                    {{ form.processing ? 'Verifying…' : 'Confirm' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>
