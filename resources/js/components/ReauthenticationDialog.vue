<script setup lang="ts">
import { useForm } from '@inertiajs/vue3';
import { AlertCircle, KeyRound, Lock, ShieldAlert } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import FormField from '@/components/ui/FormField.vue';

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
const panelRef = ref<HTMLElement | null>(null);

const form = useForm({
    current_password: '',
});

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(): HTMLElement[] {
    if (!panelRef.value) return [];
    return Array.from(panelRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

function trapFocus(event: KeyboardEvent): void {
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (event.shiftKey) {
        if (document.activeElement === first || !panelRef.value?.contains(document.activeElement)) {
            event.preventDefault();
            last.focus();
        }
    } else {
        if (document.activeElement === last || !panelRef.value?.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
        }
    }
}

const displayError = computed(() => {
    // Form validation errors or server-driven error message
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
    if (form.processing) {
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

function handleKeydown(event: KeyboardEvent): void {
    if (!props.open) return;
    if (event.key === 'Escape') {
        handleCancel();
        return;
    }
    if (event.key === 'Tab') {
        trapFocus(event);
    }
}

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            window.addEventListener('keydown', handleKeydown);
            void nextTick(() => {
                passwordInputRef.value?.focus();
            });
        } else {
            window.removeEventListener('keydown', handleKeydown);
            form.reset('current_password');
            if (props.triggerElement) {
                props.triggerElement.focus();
            }
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    form.reset('current_password');
});
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reauth-dialog-title"
        aria-describedby="reauth-dialog-desc"
    >
        <div
            ref="panelRef"
            class="relative w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-lg space-y-6 text-foreground animate-in fade-in zoom-in-95 duration-150"
        >
            <!-- Header & Context -->
            <div class="space-y-2">
                <div class="inline-flex items-center justify-center p-2.5 bg-primary/10 rounded-lg text-primary mb-1">
                    <KeyRound class="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 id="reauth-dialog-title" class="text-xl font-bold tracking-tight text-foreground">
                    {{ targetActionTitle }}
                </h2>
                <p id="reauth-dialog-desc" class="text-sm text-muted-foreground leading-relaxed">
                    {{ targetActionDescription }}
                </p>
            </div>

            <!-- Intent re-confirmation card -->
            <div class="rounded-lg bg-muted/50 border border-border p-3.5 flex items-start gap-3 text-xs">
                <ShieldAlert class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div class="space-y-1">
                    <p class="font-semibold text-foreground">Security Confirmation</p>
                    <p class="text-muted-foreground">
                        This protected administrative action requires verifying your current password. No target
                        passwords or unauthorized changes will be applied automatically.
                    </p>
                </div>
            </div>

            <!-- Safe Alert Message -->
            <div
                v-if="displayError"
                role="alert"
                data-testid="reauth-error"
                class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-sm font-medium leading-relaxed"
            >
                <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{{ displayError }}</span>
            </div>

            <!-- Form -->
            <form class="space-y-4" @submit.prevent="submit">
                <FormField
                    id="current_password"
                    label="Current Password"
                    required
                    :disabled="form.processing"
                    help="Enter your existing account password to confirm"
                >
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <div class="relative">
                            <div
                                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"
                            >
                                <Lock class="h-4 w-4" aria-hidden="true" />
                            </div>
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
                                class="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Enter current password"
                            />
                        </div>
                    </template>
                </FormField>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        data-test="cancel-button"
                        :disabled="form.processing"
                        class="px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-muted text-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        @click="handleCancel"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        data-test="confirm-button"
                        :disabled="form.processing || !form.current_password"
                        class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                    >
                        <Lock v-if="!form.processing" class="w-4 h-4" aria-hidden="true" />
                        <span>{{ form.processing ? 'Verifying...' : 'Verify Password' }}</span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>
