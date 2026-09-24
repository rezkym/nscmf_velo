<script setup lang="ts">
import { CircleHelp, ShieldAlert, ShieldCheck, ShieldEllipsis } from '@lucide/vue';
import { computed } from 'vue';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { formatJakarta } from '@/lib/datetime';

import type { VerificationAnswer } from './verification';

const props = defineProps<{ answer: VerificationAnswer }>();

const OUTCOMES = {
    VALID_CURRENT: {
        icon: ShieldCheck,
        title: 'Valid and current',
        text: 'This PDF was issued by NSCMF, has not been changed, and is the current approved version.',
        variant: 'success',
    },
    VALID_SUPERSEDED: {
        icon: ShieldEllipsis,
        title: 'Valid, but no longer the current version',
        text: 'This PDF was issued by NSCMF and has not been changed, but the request was reopened or re-approved since.',
        variant: 'warning',
    },
    INVALID_MODIFIED: {
        icon: ShieldAlert,
        title: 'Modified after signing',
        text: 'The signature no longer matches the content. Do not rely on this file.',
        variant: 'destructive',
    },
    UNKNOWN: {
        icon: CircleHelp,
        title: 'Not recognised',
        text: 'This PDF is not one NSCMF issued and signed. This does not prove the file is harmful or forged.',
        variant: 'default',
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
    <!-- Every outcome is reported politely; the title and icon say which one it is. -->
    <Alert data-testid="validator-result" role="status" :variant="outcome.variant">
        <component :is="outcome.icon" aria-hidden="true" />
        <AlertTitle
            ><h2>{{ outcome.title }}</h2></AlertTitle
        >
        <AlertDescription class="grid gap-3">
            <p>{{ outcome.text }}</p>
            <dl v-if="issued.length" class="grid gap-2 sm:grid-cols-2">
                <div v-for="[label, value] in issued" :key="label">
                    <dt class="text-xs text-muted-foreground">{{ label }}</dt>
                    <dd class="font-medium">{{ value }}</dd>
                </div>
            </dl>
        </AlertDescription>
    </Alert>
</template>
