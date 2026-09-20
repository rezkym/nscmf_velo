<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed } from 'vue';

import Badge from '@/components/ui/Badge.vue';
import { buttonVariants } from '@/components/ui/button';
import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import {
    FAMILY_LABELS,
    type NscmfFamily,
    type NscmfSubtype,
    STATUS_LABELS,
    SUBTYPE_LABELS,
} from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

export interface PersonRef {
    id: number;
    name: string;
}

export interface ReviewQueueItem extends Record<string, unknown> {
    id: number;
    request_no: string;
    family: NscmfFamily;
    subtype: NscmfSubtype;
    request_date?: string | null;
    requester?: PersonRef | null;
    team?: PersonRef | null;
    business_status: BusinessStatus;
    is_archived?: boolean;
}

export type { PaginationMeta };

const props = withDefaults(
    defineProps<{
        items?: ReviewQueueItem[];
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
    { key: 'family_subtype', label: 'Type', sortable: false },
    { key: 'request_date', label: 'Request Date', sortable: true },
    { key: 'requester', label: 'Requester', sortable: false },
    { key: 'team', label: 'Team', sortable: false },
    { key: 'status', label: 'Status', sortable: false },
];

const sortWhitelist = [
    'request_no',
    'request_date',
    'created_at',
    'updated_at',
    'business_status',
    'family',
    'subtype',
];

export interface ReviewTablePaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number;
    to?: number;
}

const tableMeta = computed<ReviewTablePaginationMeta | null>(() => {
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

function formatType(family: NscmfFamily, subtype: NscmfSubtype): string {
    const familyLabel = FAMILY_LABELS[family] ?? family;
    const subtypeLabel = SUBTYPE_LABELS[subtype] ?? subtype;
    return family === 'ACTIVATION' && subtype === 'ACTIVATION' ? 'Activation' : `${familyLabel} · ${subtypeLabel}`;
}

function onQueryChange(newQuery: TableQuery): void {
    const payload: Record<string, string | number | undefined> = {
        page: newQuery.page,
        per_page: newQuery.per_page,
        sort: newQuery.sort,
        direction: newQuery.direction,
        q: newQuery.q,
    };
    if (newQuery.filters) {
        for (const [key, value] of Object.entries(newQuery.filters)) {
            if (typeof value === 'string' || typeof value === 'number') {
                payload[key] = value;
            }
        }
    }
    router.get('/review', payload, {
        preserveState: true,
        preserveScroll: true,
    });
}

function reloadQueue(): void {
    router.reload();
}
</script>

<template>
    <AppLayout title="Review Queue">
        <div class="mx-auto max-w-6xl space-y-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="text-xl font-semibold text-foreground">Review Queue</h1>
                    <p class="text-sm text-muted-foreground">
                        Requests waiting for review. Eligibility is permission-based and shared across teams.
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="btn-refresh-queue"
                    :class="buttonVariants({ variant: 'secondary' })"
                    @click="reloadQueue"
                >
                    Refresh
                </button>
            </div>

            <ResourceTable
                :columns="columns"
                :items="items"
                :loading="loading"
                :error="error"
                :query="query"
                :meta="tableMeta"
                :sort-whitelist="sortWhitelist"
                empty-text="No records pending review"
                caption="Review Queue"
                @update:query="onQueryChange"
            >
                <template #cell-request_no="{ item }">
                    <span class="font-medium text-foreground">{{ (item as ReviewQueueItem).request_no }}</span>
                </template>

                <template #cell-family_subtype="{ item }">
                    <span>{{ formatType((item as ReviewQueueItem).family, (item as ReviewQueueItem).subtype) }}</span>
                </template>

                <template #cell-request_date="{ item }">
                    <span>{{ (item as ReviewQueueItem).request_date ?? '—' }}</span>
                </template>

                <template #cell-requester="{ item }">
                    <span>{{ (item as ReviewQueueItem).requester?.name ?? '—' }}</span>
                </template>

                <template #cell-team="{ item }">
                    <span>{{ (item as ReviewQueueItem).team?.name ?? '—' }}</span>
                </template>

                <template #cell-status="{ item }">
                    <div class="flex items-center gap-1.5">
                        <Badge variant="warning">
                            {{ STATUS_LABELS[(item as ReviewQueueItem).business_status] }}
                        </Badge>
                        <Badge
                            v-if="(item as ReviewQueueItem).is_archived"
                            :data-testid="`archived-badge-${(item as ReviewQueueItem).id}`"
                            variant="neutral"
                        >
                            Archived
                        </Badge>
                    </div>
                </template>

                <template #actions="{ item }">
                    <Link
                        :href="`/review/${(item as ReviewQueueItem).id}`"
                        :data-testid="`btn-view-${(item as ReviewQueueItem).id}`"
                        :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                    >
                        View
                    </Link>
                </template>
            </ResourceTable>
        </div>
    </AppLayout>
</template>
