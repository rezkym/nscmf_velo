<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed } from 'vue';

import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { buttonVariants } from '@/components/ui/button';
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import { STATUS_LABELS } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

export interface PersonRef {
    id: number;
    name: string;
}

export interface ApprovalQueueItem extends Record<string, unknown> {
    id: number;
    request_no: string;
    requester?: PersonRef | null;
    team?: PersonRef | null;
    business_status: BusinessStatus;
}

const props = withDefaults(
    defineProps<{
        items?: ApprovalQueueItem[];
        meta?: PaginationMeta | null;
        loading?: boolean;
        error?: string | null;
        query?: TableQuery;
    }>(),
    {
        items: () => [],
        meta: null,
        loading: false,
        error: null,
        query: () => ({ page: 1, per_page: 25 }),
    },
);

const columns: ColumnDef[] = [
    { key: 'request_no', label: 'Request No', sortable: true },
    { key: 'requester', label: 'Requester', sortable: false },
    { key: 'team', label: 'Team', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
];

const sortWhitelist = ['request_no', 'created_at', 'updated_at', 'business_status'];

interface ApprovalTablePaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number;
    to?: number;
}

const tableMeta = computed<ApprovalTablePaginationMeta | null>(() => {
    if (!props.meta) return null;

    return {
        current_page: props.meta.current_page,
        per_page: props.meta.per_page,
        total: props.meta.total,
        last_page: props.meta.last_page,
        from: props.meta.from ?? undefined,
        to: props.meta.to ?? undefined,
    };
});

function onQueryChange(newQuery: TableQuery): void {
    router.get(
        '/approval',
        {
            page: newQuery.page,
            per_page: newQuery.per_page,
            sort: newQuery.sort,
            direction: newQuery.direction,
            q: newQuery.q,
        },
        { preserveState: true, preserveScroll: true },
    );
}

function reloadQueue(): void {
    router.reload();
}
</script>

<template>
    <AppLayout title="Approval Queue">
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="text-xl font-semibold text-foreground">Approval Queue</h1>
                    <p class="text-sm text-muted-foreground">
                        Requests waiting for approval. Eligibility is permission-based and shared across teams.
                    </p>
                </div>
                <Button data-testid="btn-refresh-queue" variant="secondary" @click="reloadQueue"> Refresh </Button>
            </div>

            <ResourceTable
                :columns="columns"
                :items="items"
                :loading="loading"
                :error="error"
                :query="query"
                :meta="tableMeta"
                :sort-whitelist="sortWhitelist"
                empty-text="No records pending approval"
                caption="Approval Queue"
                @update:query="onQueryChange"
            >
                <template #cell-request_no="{ item }">
                    <span class="font-medium text-foreground">{{ (item as ApprovalQueueItem).request_no }}</span>
                </template>

                <template #cell-requester="{ item }">
                    <span>{{ (item as ApprovalQueueItem).requester?.name ?? '—' }}</span>
                </template>

                <template #cell-team="{ item }">
                    <span>{{ (item as ApprovalQueueItem).team?.name ?? '—' }}</span>
                </template>

                <template #cell-status="{ item }">
                    <Badge variant="warning">
                        {{ STATUS_LABELS[(item as ApprovalQueueItem).business_status] }}
                    </Badge>
                </template>

                <template #actions="{ item }">
                    <Link
                        :href="`/approval/${(item as ApprovalQueueItem).id}`"
                        :data-testid="`btn-view-${(item as ApprovalQueueItem).id}`"
                        :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                    >
                        View
                    </Link>
                </template>
            </ResourceTable>
        </div>
    </AppLayout>
</template>
