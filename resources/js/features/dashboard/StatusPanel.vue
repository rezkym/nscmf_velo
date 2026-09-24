<script setup lang="ts">
import { computed } from 'vue';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUS_LABELS } from '@/features/nscmf/types';

import type { StatusCount } from './types';

const props = defineProps<{ title: string; description: string; counts: StatusCount[] }>();

const largest = computed(() => Math.max(0, ...props.counts.map((entry) => entry.count)));

function barWidth(count: number): string {
    return largest.value === 0 ? '0%' : `${(count / largest.value) * 100}%`;
}
</script>

<template>
    <Card data-testid="status-panel">
        <CardHeader>
            <CardTitle>{{ title }}</CardTitle>
            <CardDescription>{{ description }}</CardDescription>
        </CardHeader>
        <CardContent>
            <!-- One row per status: the label and number carry the meaning, the bar only its size. -->
            <ul class="grid gap-3.5">
                <li v-for="entry in counts" :key="entry.status" class="grid gap-1.5">
                    <div class="flex items-baseline justify-between gap-3">
                        <span>{{ STATUS_LABELS[entry.status] }}</span>
                        <span class="font-medium tabular-nums text-heading">{{ entry.count }}</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-chart-track" aria-hidden="true">
                        <div class="h-full rounded-full bg-chart-status" :style="{ width: barWidth(entry.count) }" />
                    </div>
                </li>
            </ul>
        </CardContent>
    </Card>
</template>
