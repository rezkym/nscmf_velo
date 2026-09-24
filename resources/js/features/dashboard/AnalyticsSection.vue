<script setup lang="ts">
import { computed, ref } from 'vue';

import { formatCalendarDay } from '@/lib/datetime';

import ActivityPanel from './ActivityPanel.vue';
import StatusPanel from './StatusPanel.vue';
import type { DashboardAnalytics } from './types';

const props = defineProps<{ analytics: DashboardAnalytics }>();

type Scope = 'mine' | 'organization';

// Presentation only: the server already decided which aggregates this actor receives (04 §12.1).
const scope = ref<Scope>('mine');

const period = computed(
    () => `${formatCalendarDay(props.analytics.period.from)} – ${formatCalendarDay(props.analytics.period.through)}`,
);

const view = computed(() => {
    const organization = props.analytics.organization;

    return scope.value === 'organization' && organization
        ? {
              data: organization,
              activity: 'Submitted records across the organization.',
              status: 'Submitted records now, archived ones excluded.',
          }
        : {
              data: props.analytics.mine,
              activity: 'Records you own.',
              status: 'Your records now, archived ones excluded.',
          };
});

const SCOPES: ReadonlyArray<{ key: Scope; label: string }> = [
    { key: 'mine', label: 'Mine' },
    { key: 'organization', label: 'Organization' },
];
</script>

<template>
    <section aria-labelledby="analytics-heading" class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="space-y-1">
                <h2 id="analytics-heading" class="text-lg font-semibold">Last 28 days</h2>
                <p class="text-sm text-muted-foreground">{{ period }} · {{ analytics.period.timezone }}</p>
            </div>
            <div
                v-if="analytics.organization"
                data-testid="analytics-scope"
                role="group"
                aria-label="Analytics scope"
                class="inline-flex rounded-lg bg-card p-1 shadow-panel"
            >
                <button
                    v-for="option in SCOPES"
                    :key="option.key"
                    type="button"
                    :aria-pressed="scope === option.key ? 'true' : 'false'"
                    :class="[
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        scope === option.key
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-heading',
                    ]"
                    @click="scope = option.key"
                >
                    {{ option.label }}
                </button>
            </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
            <ActivityPanel
                class="lg:col-span-2"
                title="Activity"
                :description="view.activity"
                :totals="view.data.totals_28d"
                :weekly="view.data.weekly"
            />
            <StatusPanel title="Status" :description="view.status" :counts="view.data.active_status_counts" />
        </div>
    </section>
</template>
