<script setup lang="ts">
import { cn } from '@/lib/utils';

import type { Tone } from './tone';

withDefaults(defineProps<{ variant?: Tone }>(), {
    variant: 'neutral',
});

// The only place status colours outside the theme tokens are allowed. A badge always carries its
// label, so meaning never depends on colour alone (07 §7).
const variantClasses: Record<Tone, string> = {
    neutral: 'border-border bg-muted text-muted-foreground',
    info: 'border-brand-200 bg-accent text-brand-700 dark:border-brand-400/30 dark:text-brand-200',
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
};
</script>

<template>
    <span
        :class="
            cn(
                'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
                variantClasses[variant],
            )
        "
    >
        <slot />
    </span>
</template>
