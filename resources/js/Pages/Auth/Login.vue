<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { Lock, LogIn, User } from '@lucide/vue';
import { computed, onBeforeUnmount } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import FormField from '@/components/ui/FormField.vue';
import CenteredLayout from '@/layouts/CenteredLayout.vue';

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

    <CenteredLayout title="NSCMF Portal" description="Sign in to access your account and workflow approvals">
        <div class="panel space-y-6 p-6 sm:p-8">
            <!-- Generic failure / throttle message; never says which credential was wrong. -->
            <Alert v-if="errorMessage" variant="error" data-testid="auth-error">{{ errorMessage }}</Alert>

            <form class="space-y-5" @submit.prevent="submit">
                <FormField id="username" label="Username" required :disabled="form.processing">
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <div class="relative">
                            <User
                                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                :stroke-width="1.75"
                                aria-hidden="true"
                            />
                            <input
                                :id="fieldId"
                                v-model="form.username"
                                type="text"
                                name="username"
                                autocomplete="username"
                                required
                                :disabled="disabled"
                                :aria-describedby="describedBy"
                                :class="[controlClass, 'pl-9']"
                                placeholder="Enter your username"
                            />
                        </div>
                    </template>
                </FormField>

                <FormField id="password" label="Password" required :disabled="form.processing">
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
                                autocomplete="current-password"
                                required
                                :disabled="disabled"
                                :aria-describedby="describedBy"
                                :class="[controlClass, 'pl-9']"
                                placeholder="Enter your password"
                            />
                        </div>
                    </template>
                </FormField>

                <Button type="submit" class="w-full" :disabled="form.processing">
                    <LogIn class="size-4" :stroke-width="2" aria-hidden="true" />
                    <span>{{ form.processing ? 'Signing in...' : 'Sign in' }}</span>
                </Button>
            </form>
        </div>
    </CenteredLayout>
</template>
