<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { AlertCircle, Lock, LogIn, User } from '@lucide/vue';
import { computed, onBeforeUnmount } from 'vue';

import FormField from '@/components/ui/FormField.vue';

const form = useForm({
    username: '',
    password: '',
});

// Generic failure / throttle error computation
const errorMessage = computed(() => {
    // Generic failure / throttle error computation
    // Covers generic auth failure on username/password or throttle
    const errors = form.errors as Record<string, string | undefined>;
    if (errors.throttle) {
        return errors.throttle;
    }
    return errors.username || errors.password || null;
});

function submit(): void {
    if (form.processing) {
        return;
    }

    form.post('/login', {
        onFinish: () => {
            // Clears password when done / failed while preserving nonsecret username
            form.reset('password');
        },
    });
}

onBeforeUnmount(() => {
    // Clean up secret when leaving / unmounting component
    form.reset('password');
});
</script>

<template>
    <Head title="Login - NSCMF" />

    <div
        class="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 bg-background text-foreground"
    >
        <div class="w-full max-w-md space-y-8">
            <!-- Product Identity -->
            <div class="text-center space-y-2">
                <div class="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl text-primary mb-2">
                    <Lock class="w-8 h-8" aria-hidden="true" />
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground">NSCMF Portal</h1>
                <p class="text-sm text-muted-foreground">Sign in to access your account and workflow approvals</p>
            </div>

            <!-- Card -->
            <div class="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
                <!-- Generic Error / Throttle Alert -->
                <div
                    v-if="errorMessage"
                    role="alert"
                    data-testid="auth-error"
                    class="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 text-sm font-medium leading-relaxed"
                >
                    <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{{ errorMessage }}</span>
                </div>

                <form class="space-y-5" @submit.prevent="submit">
                    <!-- Username Field -->
                    <FormField id="username" label="Username" required :disabled="form.processing">
                        <template #default="{ id: fieldId, describedBy, disabled }">
                            <div class="relative">
                                <div
                                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"
                                >
                                    <User class="h-4 w-4" aria-hidden="true" />
                                </div>
                                <input
                                    :id="fieldId"
                                    v-model="form.username"
                                    type="text"
                                    name="username"
                                    autocomplete="username"
                                    required
                                    :disabled="disabled"
                                    :aria-describedby="describedBy"
                                    class="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </template>
                    </FormField>

                    <!-- Password Field -->
                    <FormField id="password" label="Password" required :disabled="form.processing">
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
                                    autocomplete="current-password"
                                    required
                                    :disabled="disabled"
                                    :aria-describedby="describedBy"
                                    class="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </template>
                    </FormField>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="form.processing"
                        class="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <LogIn class="w-4 h-4" aria-hidden="true" />
                        <span>{{ form.processing ? 'Signing in...' : 'Sign in' }}</span>
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>
