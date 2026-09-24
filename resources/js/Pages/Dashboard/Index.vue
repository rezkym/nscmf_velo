<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { ClipboardCheck, FilePlus2, History, Stamp } from '@lucide/vue';
import { computed } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import { buttonVariants } from '@/components/ui/button';
import { usePermissions } from '@/composables/usePermissions';
import AnalyticsSection from '@/features/dashboard/AnalyticsSection.vue';
import NeedsAttention from '@/features/dashboard/NeedsAttention.vue';
import QuickActions, { type QuickAction } from '@/features/dashboard/QuickActions.vue';
import { type AttentionEntry, needsAttention, QUEUES, recordHref } from '@/features/dashboard/queues';
import type { DashboardAnalytics, DashboardCounts, DashboardItems, Queue } from '@/features/dashboard/types';
import QueueCard from '@/features/nscmf/QueueCard.vue';
import type { RecordSummary } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

const props = withDefaults(
    defineProps<{ counts?: DashboardCounts; items?: DashboardItems; analytics?: DashboardAnalytics }>(),
    {
        counts: () => ({}),
        items: () => ({}),
        analytics: undefined,
    },
);

const { user, can } = usePermissions();

const canCreate = computed(() => can('nscmf.create') && Boolean(user.value?.team));

// Own queues always show; a shared pool only with its permission (07 §17). Order never changes.
const cards = computed(() => QUEUES.filter((queue) => !queue.permission || can(queue.permission)));

// As many desktop columns as there are cards, so a hidden card never leaves a gap (07 §17.1).
const DESKTOP_COLUMNS: Record<number, string> = {
    1: 'lg:grid-cols-1 lg:max-w-md',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
};

// Own Drafts and returned records open in the editor; queued records open where they are decided.
const hrefIn =
    (queue: Queue) =>
    (item: RecordSummary): string =>
        recordHref(queue, item.id, can('nscmf.draft.edit'));

const attention = computed(() => needsAttention(props.items));
const attentionHref = (entry: AttentionEntry): string => hrefIn(entry.queue)(entry.record);

const quickActions = computed<QuickAction[]>(() =>
    [
        {
            label: 'Create NSCMF',
            description: 'Start a new Activation or Change draft',
            href: '/nscmf/create',
            icon: FilePlus2,
            visible: canCreate.value,
        },
        {
            label: 'History',
            description: 'Find any record you may see',
            href: '/history',
            icon: History,
            visible: can('nscmf.view.history'),
        },
        {
            label: 'Review queue',
            description: 'Requests waiting for review',
            href: '/review',
            icon: ClipboardCheck,
            visible: can('nscmf.review'),
        },
        {
            label: 'Approval queue',
            description: 'Requests waiting for approval',
            href: '/approval',
            icon: Stamp,
            visible: can('nscmf.approve'),
        },
    ].filter((action) => action.visible),
);

function reloadCounts(): void {
    router.reload({ only: ['counts'] });
}
</script>

<template>
    <AppLayout title="Dashboard">
        <div class="mx-auto max-w-7xl space-y-6">
            <PageHeader title="Dashboard" description="What needs your attention.">
                <template #actions>
                    <template v-if="can('nscmf.create')">
                        <Link v-if="canCreate" href="/nscmf/create" :class="buttonVariants()">
                            <FilePlus2 class="size-4" :stroke-width="2" aria-hidden="true" />
                            Create NSCMF
                        </Link>
                        <p v-else class="text-sm text-muted-foreground">
                            You need an active team to create records. Contact an administrator.
                        </p>
                    </template>
                    <Link href="/history" :class="buttonVariants({ variant: 'secondary' })">History</Link>
                </template>
            </PageHeader>

            <div
                data-testid="attention-cards"
                :class="['grid grid-cols-1 gap-4 sm:grid-cols-2', DESKTOP_COLUMNS[cards.length]]"
            >
                <QueueCard
                    v-for="(queue, index) in cards"
                    :key="queue.key"
                    :data-testid="`card-${queue.key}`"
                    :title="queue.title"
                    :caption="queue.caption"
                    :featured="index === 0"
                    :href="queue.listHref"
                    :state="counts[queue.key]"
                    :items="items[queue.key]"
                    :item-href="hrefIn(queue.key)"
                    @retry="reloadCounts"
                />
            </div>

            <AnalyticsSection v-if="analytics" :analytics="analytics" />

            <div class="grid gap-4 lg:grid-cols-3 lg:items-start">
                <NeedsAttention
                    :class="quickActions.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'"
                    :entries="attention"
                    :href-for="attentionHref"
                />
                <QuickActions v-if="quickActions.length > 0" :actions="quickActions" />
            </div>
        </div>
    </AppLayout>
</template>
