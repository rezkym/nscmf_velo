<script setup lang="ts">
import { computed } from 'vue';

import { formatCalendarDay } from '@/lib/datetime';

import type { ActivityMetric } from './types';

type MetricCounts = Partial<Record<ActivityMetric, number>>;

const props = defineProps<{
    title: string;
    description: string;
    totals: MetricCounts;
    weekly: Array<{ from: string; through: string } & MetricCounts>;
}>();

/** Every metric in its fixed order and colour; the colour follows the metric in every view. */
const METRICS: ReadonlyArray<{ key: ActivityMetric; label: string; swatch: string }> = [
    { key: 'created', label: 'Created', swatch: 'bg-chart-created' },
    { key: 'first_submitted', label: 'First submissions', swatch: 'bg-chart-submitted' },
    { key: 'approval_decisions', label: 'Approval decisions', swatch: 'bg-chart-decisions' },
];

// Only the metrics the server sent for this scope (the organization has no "created").
const metrics = computed(() => METRICS.filter((metric) => props.totals[metric.key] !== undefined));

const peak = computed(() =>
    Math.max(0, ...props.weekly.flatMap((week) => metrics.value.map((metric) => week[metric.key] ?? 0))),
);

function barHeight(value: number | undefined): string {
    return peak.value === 0 ? '0%' : `${((value ?? 0) / peak.value) * 100}%`;
}
</script>

<template>
    <section data-testid="activity-panel" class="panel flex flex-col gap-5 p-5 sm:p-6">
        <div class="space-y-1">
            <h2 class="text-lg font-semibold">{{ title }}</h2>
            <p class="text-sm text-muted-foreground">{{ description }}</p>
        </div>

        <!-- Totals double as the legend: the colour sits beside the label, never on the text. -->
        <dl data-testid="activity-legend" class="flex flex-wrap gap-x-8 gap-y-3">
            <div v-for="metric in metrics" :key="metric.key" class="space-y-0.5">
                <dt class="flex items-center gap-2 text-sm text-muted-foreground">
                    <span :class="['size-2.5 rounded-sm', metric.swatch]" aria-hidden="true" />
                    {{ metric.label }}
                </dt>
                <dd data-testid="activity-total" class="text-2xl font-semibold tabular-nums text-heading">
                    {{ totals[metric.key] }}
                </dd>
            </div>
        </dl>

        <!-- The bars show the shape; the exact values are in the table below. -->
        <div aria-hidden="true" class="flex gap-3">
            <div class="flex h-44 flex-col justify-between pb-6 text-right text-xs tabular-nums text-muted-foreground">
                <span :class="{ invisible: peak === 0 }">{{ peak }}</span>
                <span>0</span>
            </div>
            <div class="flex flex-1 gap-2 sm:gap-4">
                <div v-for="week in weekly" :key="week.from" class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex h-38 items-end justify-center gap-0.5 border-b border-border">
                        <div
                            v-for="metric in metrics"
                            :key="metric.key"
                            :class="['w-full max-w-6 rounded-t-[4px]', metric.swatch]"
                            :style="{ height: barHeight(week[metric.key]) }"
                        />
                    </div>
                    <span class="truncate text-center text-xs text-muted-foreground">{{
                        formatCalendarDay(week.from)
                    }}</span>
                </div>
            </div>
        </div>

        <details class="group rounded-lg border border-border">
            <summary
                class="cursor-pointer select-none rounded-lg px-4 py-2.5 text-sm font-medium text-heading hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                Weekly values
            </summary>
            <div class="overflow-x-auto border-t border-border">
                <table class="min-w-full text-sm">
                    <caption class="sr-only">
                        {{
                            title
                        }}
                        per week
                    </caption>
                    <thead class="text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th scope="col" class="px-4 py-2 text-left font-medium">Week</th>
                            <th
                                v-for="metric in metrics"
                                :key="metric.key"
                                scope="col"
                                class="px-4 py-2 text-right font-medium"
                            >
                                {{ metric.label }}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        <tr v-for="week in weekly" :key="week.from">
                            <th scope="row" class="whitespace-nowrap px-4 py-2 text-left font-normal">
                                {{ formatCalendarDay(week.from) }} – {{ formatCalendarDay(week.through) }}
                            </th>
                            <td
                                v-for="metric in metrics"
                                :key="metric.key"
                                class="px-4 py-2 text-right tabular-nums text-heading"
                            >
                                {{ week[metric.key] }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </details>
    </section>
</template>
