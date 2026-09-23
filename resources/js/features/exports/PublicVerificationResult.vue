<script setup lang="ts">
import { CircleHelp, ShieldAlert, ShieldCheck, ShieldEllipsis } from '@lucide/vue';
import { computed } from 'vue';

import { formatJakarta } from '@/lib/datetime';

import type { VerificationAnswer } from './verification';


const props = defineProps<{ answer: VerificationAnswer }>();

const OUTCOMES = {
    VALID_CURRENT: {
        icon: ShieldCheck,
        title: 'Valid and current',
        text: 'This PDF was issued by NSCMF, has not been changed, and is the current approved version.',
        tone: 'border-emerald-600/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
    },
    VALID_SUPERSEDED: {
        icon: ShieldEllipsis,
        title: 'Valid, but no longer the current version',
        text: 'This PDF was issued by NSCMF and has not been changed, but the request was reopened or re-approved since.',
        tone: 'border-amber-600/40 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
    },
    INVALID_MODIFIED: {
        icon: ShieldAlert,
        title: 'Modified after signing',
        text: 'The signature no longer matches the content. Do not rely on this file.',
        tone: 'border-destructive/40 bg-destructive/10 text-destructive',
    },
    UNKNOWN: {
        icon: CircleHelp,
        title: 'Not recognised',
        text: 'This PDF is not one NSCMF issued and signed. This does not prove the file is harmful or forged.',
        tone: 'border-border bg-muted text-foreground',
    },
} as const;

const outcome = computed(() => OUTCOMES[props.answer.result]);
const issued = computed(() =>
    props.answer.result === 'VALID_CURRENT' || props.answer.result === 'VALID_SUPERSEDED'
        ? [
              ['Request No', props.answer.request_no],
              [
                  'Form',
                  props.answer.family === 'ACTIVATION'
                      ? 'Activation'
                      : props.answer.family === 'CHANGE'
                        ? 'Change'
                        : null,
              ],
              ['Issued', props.answer.issued_at ? formatJakarta(props.answer.issued_at) : null],
              ['Signed by', props.answer.issuer],
          ].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1] !== '')
        : [],
);
</script>

<template>
    <section data-testid="validator-result" role="status" :class="['space-y-3 rounded-lg border p-5', outcome.tone]">
        <div class="flex items-center gap-3">
            <component :is="outcome.icon" class="h-6 w-6 shrink-0" aria-hidden="true" />
            <h2 class="text-lg font-semibold">{{ outcome.title }}</h2>
        </div>
        <p class="text-sm">{{ outcome.text }}</p>
        <dl v-if="issued.length" class="grid gap-2 text-sm sm:grid-cols-2">
            <div v-for="[label, value] in issued" :key="label">
                <dt class="text-xs opacity-80">{{ label }}</dt>
                <dd class="font-medium">{{ value }}</dd>
            </div>
        </dl>
    </section>
</template>
