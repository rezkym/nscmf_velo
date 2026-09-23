<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { ref } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import PublicVerificationResult from '@/features/exports/PublicVerificationResult.vue';
import type { VerificationAnswer } from '@/features/exports/verification';
import { sendForm } from '@/lib/http';

/**
 * /ispdfvalid, the only public NSCMF page (10 §73; 12 §72–75; 20 public ingress). Standalone: no
 * application shell, no signed-in details, no links into NSCMF. The server does every check.
 */
const props = defineProps<{ max_bytes: number }>();

const file = ref<File | null>(null);
const problem = ref<string | null>(null);
const error = ref<string | null>(null);
const answer = ref<VerificationAnswer | null>(null);
const checking = ref(false);
let attempt = 0;

function choose(event: Event): void {
    const chosen = (event.target as HTMLInputElement).files?.[0] ?? null;
    attempt++;
    checking.value = false;
    answer.value = null;
    error.value = null;
    file.value = chosen;
    problem.value = !chosen
        ? null
        : !chosen.name.toLowerCase().endsWith('.pdf')
          ? 'Choose a PDF file.'
          : chosen.size === 0
            ? 'The file is empty.'
            : chosen.size > props.max_bytes
              ? `The file may be at most ${props.max_bytes.toLocaleString('en-US')} bytes.`
              : null;
}

async function verify(): Promise<void> {
    if (!file.value || problem.value || checking.value) return;
    const mine = ++attempt;
    checking.value = true;
    error.value = null;
    const form = new FormData();
    form.append('file', file.value);
    const result = await sendForm<{ data: VerificationAnswer }>('/ispdfvalid/verify', form);
    if (mine !== attempt) return;
    checking.value = false;
    if (result.ok && result.body) {
        answer.value = result.body.data;
    } else if (!result.ok && result.status === 429) {
        error.value = 'Too many checks. Please wait a moment before trying again.';
    } else if (!result.ok && result.status === 0) {
        error.value = 'Network connection lost. Try again.';
    } else {
        error.value = (!result.ok && result.error?.message) || 'The PDF could not be checked. Try again later.';
    }
}
</script>

<template>
    <Head title="Verify an NSCMF PDF" />
    <main class="min-h-screen bg-background px-4 py-12 text-foreground">
        <div class="mx-auto max-w-xl space-y-6">
            <div class="space-y-2">
                <h1 class="text-2xl font-semibold">Verify an NSCMF PDF</h1>
                <p class="text-sm text-muted-foreground">
                    Check whether a PDF was issued and signed by NSCMF and whether it has been changed since. The file
                    is checked and then discarded; nothing about it is kept on this page.
                </p>
            </div>
            <form class="space-y-3 rounded-lg border border-border bg-card p-5" @submit.prevent="verify">
                <label for="validator-file" class="block text-sm font-medium">PDF file</label>
                <input
                    id="validator-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    data-testid="validator-file"
                    class="block w-full text-sm"
                    :aria-describedby="problem ? 'validator-problem' : undefined"
                    @change="choose"
                />
                <p v-if="problem" id="validator-problem" role="alert" class="text-sm text-destructive">{{ problem }}</p>
                <Button data-testid="validator-verify" :disabled="!file || !!problem || checking" @click="verify">
                    {{ checking ? 'Checking…' : 'Verify PDF' }}
                </Button>
            </form>
            <Alert v-if="error" variant="error" title="Not checked">{{ error }}</Alert>
            <PublicVerificationResult v-if="answer" :answer="answer" />
        </div>
    </main>
</template>
