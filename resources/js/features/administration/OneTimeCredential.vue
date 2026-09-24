<script setup lang="ts">
import { ref, watch } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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
    <Dialog
        :open="open"
        @update:open="
            (open) => {
                if (!open) emit('dismiss');
            }
        "
    >
        <DialogContent data-testid="one-time-credential-container">
            <DialogHeader>
                <DialogTitle>Temporary password</DialogTitle>
                <DialogDescription v-if="username ? `For ${username}` : undefined">{{
                    username ? `For ${username}` : undefined
                }}</DialogDescription>
            </DialogHeader>
            <div v-if="temporaryPassword" class="space-y-4">
                <div class="flex items-center gap-2">
                    <code
                        data-testid="temporary-password-display"
                        class="flex-1 select-all break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm"
                        >{{ temporaryPassword }}</code
                    >
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-testid="btn-copy-credential"
                        @click="copyPassword(temporaryPassword)"
                    >
                        {{ copyState === 'copied' ? 'Copied' : 'Copy' }}
                    </Button>
                </div>

                <Alert v-if="copyState === 'failed'" variant="destructive" data-testid="clipboard-feedback"
                    ><AlertDescription>Copy failed. Select the password and copy it manually.</AlertDescription></Alert
                >

                <Alert variant="warning"
                    ><AlertDescription
                        >This password is shown only once and cannot be retrieved later. Give it to the user through an
                        internal channel; they must replace it at their first sign-in.</AlertDescription
                    ></Alert
                >
            </div>

            <Alert v-else data-testid="credential-lost-advisory"
                ><AlertDescription
                    >This temporary password is no longer available and cannot be shown again. Reset password again to
                    generate a new one.</AlertDescription
                ></Alert
            >
            <DialogFooter>
                <Button type="button" data-testid="btn-dismiss-credential" @click="emit('dismiss')">Done</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
