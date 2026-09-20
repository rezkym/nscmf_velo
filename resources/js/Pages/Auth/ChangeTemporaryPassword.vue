<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { AlertCircle, KeyRound, Lock } from '@lucide/vue';
import { computed, onBeforeUnmount, ref } from 'vue';

import FormField from '@/components/ui/FormField.vue';

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

    <div
        class="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-background text-foreground"
    >
        <div class="w-full max-w-md space-y-8">
            <!-- Product Identity / Gate Header -->
            <div class="text-center space-y-2">
                <div class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl text-primary mb-2">
                    <KeyRound class="w-8 h-8" aria-hidden="true" />
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">Create New Password</h1>
                <p class="text-sm text-muted-foreground">
                    Your account has a mandatory temporary password change required before accessing the system.
                </p>
            </div>

            <!-- Card -->
            <div class="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
                <!-- Generic Error / Server / Client Error Alert -->
                <div
                    v-if="activeError"
                    role="alert"
                    data-testid="auth-error"
                    class="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-sm font-medium leading-relaxed"
                >
                    <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{{ activeError }}</span>
                </div>

                <form class="space-y-5" @submit.prevent="submit">
                    <!-- New Password Field -->
                    <FormField
                        id="password"
                        label="New Password"
                        help="Minimum 6 characters"
                        required
                        :disabled="form.processing"
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
                                    v-model="form.password"
                                    type="password"
                                    name="password"
                                    autocomplete="new-password"
                                    required
                                    :disabled="disabled"
                                    :aria-describedby="describedBy"
                                    class="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter new password"
                                />
                            </div>
                        </template>
                    </FormField>

                    <!-- Confirm Password Field -->
                    <FormField
                        id="password_confirmation"
                        label="Confirm New Password"
                        required
                        :disabled="form.processing"
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
                                    v-model="form.password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    autocomplete="new-password"
                                    required
                                    :disabled="disabled"
                                    :aria-describedby="describedBy"
                                    class="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </template>
                    </FormField>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="form.processing"
                        class="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span v-if="form.processing">Updating Password...</span>
                        <span v-else>Update Password</span>
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>
