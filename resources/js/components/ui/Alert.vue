<script setup lang="ts">
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'warning' | 'info';

withDefaults(defineProps<{ variant?: AlertVariant; title?: string }>(), {
    variant: 'info',
    title: undefined,
});

const variantClasses: Record<AlertVariant, string> = {
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    info: 'border-border bg-muted/50 text-foreground',
};
</script>

<template>
    <div
        :role="variant === 'error' ? 'alert' : 'status'"
        :class="cn('rounded-md border px-4 py-3 text-sm', variantClasses[variant])"
    >
        <p v-if="title" class="font-medium">{{ title }}</p>
        <div :class="title ? 'mt-1' : undefined"><slot /></div>
    </div>
</template>
