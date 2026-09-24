<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue';
import type { AlertVariants } from '.';
import { cn } from '@/lib/utils';
import { alertVariants } from '.';

const props = defineProps<{
    class?: HTMLAttributes['class'];
    variant?: AlertVariants['variant'];
}>();

// NSCMF: only errors interrupt assistive technology; other alerts are announced politely.
const role = computed(() => (props.variant === 'destructive' ? 'alert' : 'status'));
</script>

<template>
    <div data-slot="alert" :class="cn(alertVariants({ variant }), props.class)" :role="role">
        <slot />
    </div>
</template>
