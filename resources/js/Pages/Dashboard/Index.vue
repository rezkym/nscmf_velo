<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';

import { buttonVariants } from '@/components/ui/button';
import { usePermissions } from '@/composables/usePermissions';
import QueueCard, { type QueueCount } from '@/features/nscmf/QueueCard.vue';
import type { RecordSummary } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

type Queue = 'drafts' | 'revisions' | 'reviews' | 'approvals';

export type DashboardCounts = Partial<Record<Queue, QueueCount>>;
export type DashboardItems = Partial<Record<Queue, RecordSummary[]>>;

withDefaults(defineProps<{ counts?: DashboardCounts; items?: DashboardItems }>(), {
    counts: () => ({}),
    items: () => ({}),
});

const { user, can } = usePermissions();

function reloadCounts(): void {
    router.reload({ only: ['counts'] });
}
</script>

<template>
    <AppLayout title="Dashboard">
        <div class="mx-auto max-w-5xl space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="text-xl font-semibold text-foreground">Dashboard</h1>
                    <p class="text-sm text-muted-foreground">What needs your attention.</p>
                </div>
                <div class="flex items-center gap-2">
                    <template v-if="can('nscmf.create')">
                        <Link v-if="user?.team" href="/nscmf/create" :class="buttonVariants()">Create NSCMF</Link>
                        <p v-else class="text-sm text-muted-foreground">
                            You need an active team to create records. Contact an administrator.
                        </p>
                    </template>
                    <Link href="/history" :class="buttonVariants({ variant: 'secondary' })">History</Link>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QueueCard
                    data-testid="card-drafts"
                    title="My drafts"
                    :state="counts.drafts"
                    :items="items.drafts"
                    @retry="reloadCounts"
                />
                <QueueCard
                    data-testid="card-revisions"
                    title="Revision required"
                    :state="counts.revisions"
                    :items="items.revisions"
                    @retry="reloadCounts"
                />
                <QueueCard
                    v-if="can('nscmf.review')"
                    data-testid="card-reviews"
                    title="Pending review"
                    href="/review"
                    :state="counts.reviews"
                    :items="items.reviews"
                    @retry="reloadCounts"
                />
                <QueueCard
                    v-if="can('nscmf.approve')"
                    data-testid="card-approvals"
                    title="Pending approval"
                    href="/approval"
                    :state="counts.approvals"
                    :items="items.approvals"
                    @retry="reloadCounts"
                />
            </div>
        </div>
    </AppLayout>
</template>
