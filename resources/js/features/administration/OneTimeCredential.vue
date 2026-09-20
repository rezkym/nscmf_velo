<script setup lang="ts">
import { ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';

/**
 * Shows a server-generated temporary password exactly once. The parent owns the secret and must
 * clear it when `dismiss` is emitted; this component never stores or re-fetches it.
 */
const props = withDefaults(
    defineProps<{
        open: boolean;
        temporaryPassword?: string | null;
        username?: string | null;
    }>(),
    { temporaryPassword: null, username: null },
);

const emit = defineEmits<{ dismiss: [] }>();

const copyState = ref<'idle' | 'copied' | 'failed'>('idle');

watch(
    () => props.open,
    () => {
        copyState.value = 'idle';
    },
);

async function copyPassword(password: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(password);
        copyState.value = 'copied';
    } catch {
        copyState.value = 'failed';
    }
}
</script>

<template>
    <Modal
        :open="open"
        title="Temporary password"
        data-testid="one-time-credential-container"
        :description="username ? `For ${username}` : undefined"
        @close="emit('dismiss')"
    >
        <div v-if="temporaryPassword" class="space-y-4">
            <div class="flex items-center gap-2">
                <code
                    data-testid="temporary-password-display"
                    class="flex-1 select-all break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm"
                    >{{ temporaryPassword }}</code
                >
                <Button
                    variant="secondary"
                    size="sm"
                    data-testid="btn-copy-credential"
                    @click="copyPassword(temporaryPassword)"
                >
                    {{ copyState === 'copied' ? 'Copied' : 'Copy' }}
                </Button>
            </div>

            <Alert v-if="copyState === 'failed'" variant="error" data-testid="clipboard-feedback">
                Copy failed. Select the password and copy it manually.
            </Alert>

            <Alert variant="warning">
                This password is shown only once and cannot be retrieved later. Give it to the user through an internal
                channel; they must replace it at their first sign-in.
            </Alert>
        </div>

        <Alert v-else variant="info" data-testid="credential-lost-advisory">
            This temporary password is no longer available and cannot be shown again. Reset password again to generate a
            new one.
        </Alert>

        <template #footer>
            <Button data-testid="btn-dismiss-credential" @click="emit('dismiss')">Done</Button>
        </template>
    </Modal>
</template>
