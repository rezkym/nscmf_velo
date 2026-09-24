<script setup lang="ts">
import { computed } from 'vue';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCalendarDay } from '@/lib/datetime';

import ActivityPanel from './ActivityPanel.vue';
import StatusPanel from './StatusPanel.vue';
import type { DashboardAnalytics } from './types';

const props = defineProps<{ analytics: DashboardAnalytics }>();

const period = computed(
    () => `${formatCalendarDay(props.analytics.period.from)} – ${formatCalendarDay(props.analytics.period.through)}`,
);

// Presentation only: the server already decided which aggregates this actor receives (04 §12.1).
const views = computed(() => {
    const { mine, organization } = props.analytics;

    return [
        {
            key: 'mine',
            label: 'Mine',
            data: mine,
            activity: 'Records you own.',
            status: 'Your records now, archived ones excluded.',
        },
        ...(organization
            ? [
                  {
                      key: 'organization',
                      label: 'Organization',
                      data: organization,
                      activity: 'Submitted records across the organization.',
                      status: 'Submitted records now, archived ones excluded.',
                  },
              ]
            : []),
    ];
});
</script>

<template>
    <section aria-labelledby="analytics-heading">
        <Tabs default-value="mine" class="gap-4">
            <div class="flex flex-wrap items-end justify-between gap-3">
                <div class="grid gap-1">
                    <h2 id="analytics-heading" class="text-lg font-semibold">Last 28 days</h2>
                    <p class="text-sm text-muted-foreground">{{ period }} · {{ analytics.period.timezone }}</p>
                </div>
                <TabsList v-if="views.length > 1" data-testid="analytics-scope" aria-label="Analytics scope">
                    <TabsTrigger v-for="view in views" :key="view.key" :value="view.key">{{ view.label }}</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent v-for="view in views" :key="view.key" :value="view.key" class="grid gap-4 lg:grid-cols-3">
                <ActivityPanel
                    class="lg:col-span-2"
                    title="Activity"
                    :description="view.activity"
                    :totals="view.data.totals_28d"
                    :weekly="view.data.weekly"
                />
                <StatusPanel title="Status" :description="view.status" :counts="view.data.active_status_counts" />
            </TabsContent>
        </Tabs>
    </section>
</template>
