<script setup lang="ts">
import { computed } from 'vue';

import { STATUS_LABELS } from '@/features/nscmf/types';

import type { StatusCount } from './types';

const props = defineProps<{ title: string; description: string; counts: StatusCount[] }>();

const largest = computed(() => Math.max(0, ...props.counts.map((entry) => entry.count)));

function barWidth(count: number): string {
    return largest.value === 0 ? '0%' : `${(count / largest.value) * 100}%`;
}
</script>

<template>
    <section data-testid="status-panel" class="panel flex flex-col gap-5 p-5 sm:p-6">
        <div class="space-y-1">
            <h2 class="text-lg font-semibold">{{ title }}</h2>
            <p class="text-sm text-muted-foreground">{{ description }}</p>
        </div>

        <!-- One row per status: the label and number carry the meaning, the bar only its size. -->
        <ul class="space-y-3">
            <li v-for="entry in counts" :key="entry.status" class="space-y-1.5">
                <div class="flex items-baseline justify-between gap-3 text-sm">
                    <span class="text-foreground">{{ STATUS_LABELS[entry.status] }}</span>
                    <span class="font-semibold tabular-nums text-heading">{{ entry.count }}</span>
                </div>
                <div class="h-2 rounded-full bg-chart-track" aria-hidden="true">
                    <div class="h-full rounded-full bg-chart-status" :style="{ width: barWidth(entry.count) }" />
                </div>
            </li>
        </ul>
    </section>
</template>
