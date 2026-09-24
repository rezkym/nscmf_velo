<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { Lock } from '@lucide/vue';
import { computed, onBeforeUnmount, ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import CenteredLayout from '@/layouts/CenteredLayout.vue';

// Local view-model per G09 / API contract §78
// Form does NOT use Inertia remember, Vuex/Pinia, or localStorage
const form = useForm({
    password: '',
    password_confirmation: '',
});

const clientError = ref<string | null>(null);

const serverError = computed(() => {
    const errors = form.errors as Record<string, string | undefined>;
    return errors.password || errors.password_confirmation || errors.message || null;
});

const activeError = computed(() => {
    return clientError.value || serverError.value || null;
});

function submit(): void {
    if (form.processing) {
        return;
    }

    clientError.value = null;

    // Client-side minimum 6 characters validation
    if (form.password.length < 6) {
        clientError.value = 'Password must be at least 6 characters.';
        return;
    }

    if (form.password !== form.password_confirmation) {
        clientError.value = 'Password confirmation does not match.';
        return;
    }

    form.post('/account/temporary-password/change', {
        onSuccess: () => {
            // Server response handles redirect / projection
        },
        onError: () => {
            // Errors rendered safely without password exposure
        },
        onFinish: () => {
            // Clear sensitive values when done / failed
            form.reset('password', 'password_confirmation');
        },
    });
}

onBeforeUnmount(() => {
    // Clean up secrets when unmounting component
    form.reset('password', 'password_confirmation');
});
</script>

<template>
    <Head title="Create New Password - NSCMF" />

    <CenteredLayout
        title="Create New Password"
        description="Your account has a mandatory temporary password change required before accessing the system."
    >
        <div class="panel space-y-6 p-6 sm:p-8">
            <Alert v-if="activeError" variant="error" data-testid="auth-error">{{ activeError }}</Alert>

            <form class="space-y-5" @submit.prevent="submit">
                <FormField
                    id="password"
                    label="New Password"
                    help="Minimum 6 characters"
                    required
                    :disabled="form.processing"
                >
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <div class="relative">
                            <Lock
                                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                :stroke-width="1.75"
                                aria-hidden="true"
                            />
                            <input
                                :id="fieldId"
                                v-model="form.password"
                                type="password"
                                name="password"
                                autocomplete="new-password"
                                required
                                :disabled="disabled"
                                :aria-describedby="describedBy"
                                :class="[controlClass, 'pl-9']"
                                placeholder="Enter new password"
                            />
                        </div>
                    </template>
                </FormField>

                <FormField id="password_confirmation" label="Confirm New Password" required :disabled="form.processing">
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <div class="relative">
                            <Lock
                                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                :stroke-width="1.75"
                                aria-hidden="true"
                            />
                            <input
                                :id="fieldId"
                                v-model="form.password_confirmation"
                                type="password"
                                name="password_confirmation"
                                autocomplete="new-password"
                                required
                                :disabled="disabled"
                                :aria-describedby="describedBy"
                                :class="[controlClass, 'pl-9']"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </template>
                </FormField>

                <Button type="submit" class="w-full" :disabled="form.processing">
                    <span v-if="form.processing">Updating Password...</span>
                    <span v-else>Update Password</span>
                </Button>
            </form>
        </div>
    </CenteredLayout>
</template>
