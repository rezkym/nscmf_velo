<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { computed, onBeforeUnmount } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/FormField.vue';
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
        <div class="grid gap-6">
            <!-- Generic failure / throttle message; never says which credential was wrong. -->
            <Alert v-if="errorMessage" variant="destructive" data-testid="auth-error">
                <AlertDescription>{{ errorMessage }}</AlertDescription>
            </Alert>

            <form class="grid gap-5" @submit.prevent="submit">
                <FormField id="username" label="Username" required :disabled="form.processing">
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <Input
                            :id="fieldId"
                            v-model="form.username"
                            type="text"
                            name="username"
                            autocomplete="username"
                            required
                            :disabled="disabled"
                            :aria-describedby="describedBy"
                            placeholder="Enter your username"
                        />
                    </template>
                </FormField>

                <FormField id="password" label="Password" required :disabled="form.processing">
                    <template #default="{ id: fieldId, describedBy, disabled }">
                        <Input
                            :id="fieldId"
                            v-model="form.password"
                            type="password"
                            name="password"
                            autocomplete="current-password"
                            required
                            :disabled="disabled"
                            :aria-describedby="describedBy"
                            placeholder="Enter your password"
                        />
                    </template>
                </FormField>

                <Button type="submit" class="w-full" :disabled="form.processing">
                    {{ form.processing ? 'Signing in…' : 'Sign in' }}
                </Button>
            </form>
        </div>
    </CenteredLayout>
</template>
