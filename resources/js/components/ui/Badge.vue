<script setup lang="ts">
import { cn } from '@/lib/utils';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'destructive';

withDefaults(defineProps<{ variant?: BadgeVariant }>(), {
    variant: 'neutral',
});

// The only place status colours outside the theme tokens are allowed.
const variantClasses: Record<BadgeVariant, string> = {
    neutral: 'border-border bg-muted text-muted-foreground',
    success:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
};
</script>

<template>
    <span
        :class="
            cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', variantClasses[variant])
        "
    >
        <slot />
    </span>
</template>
