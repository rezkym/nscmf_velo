<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import { FAMILY_LABELS, type NscmfFamily, type NscmfSubtype, SUBTYPE_LABELS } from '@/features/nscmf/types';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
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
    return family === 'ACTIVATION' && subtype === 'ACTIVATION'
        ? 'Activation'
        : `${FAMILY_LABELS[family]} · ${SUBTYPE_LABELS[subtype]}`;
}

/**
 * The queue sends what FE-30 and the list contract name: search, sort and pagination. ResourceTable
 * has already bounded them (FE-05), so nothing is re-clamped here.
 *
 * No filter parameters are forwarded. 12 §45 says the queue is permission-driven and that Team may
 * be an informational filter, but it names no filter parameter, and the page renders no filter
 * control. Gap G02: record the approved response before binding any, rather than inventing names.
 */
function onQueryChange(newQuery: TableQuery): void {
    router.get(
        '/review',
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
    <AppLayout title="Review Queue">
        <div class="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Review Queue"
                description="Requests waiting for review. Eligibility is permission-based and shared across teams."
            >
                <template #actions>
                    <Button type="button" data-testid="btn-refresh-queue" variant="outline" @click="reloadQueue">
                        Refresh
                    </Button>
                </template>
            </PageHeader>

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
                    <span class="whitespace-nowrap font-medium text-heading">{{
                        (item as ReviewQueueItem).request_no
                    }}</span>
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
                        <StatusBadge :status="(item as ReviewQueueItem).business_status" />
                        <Badge
                            v-if="(item as ReviewQueueItem).is_archived"
                            :data-testid="`archived-badge-${(item as ReviewQueueItem).id}`"
                            variant="secondary"
                        >
                            Archived
                        </Badge>
                    </div>
                </template>

                <!-- The record detail page is the destination that exists; the Review detail page
                     with its actions is FE-31. -->
                <template #actions="{ item }">
                    <Button as-child variant="outline" size="sm">
                        <Link
                            :href="`/review/${(item as ReviewQueueItem).id}`"
                            :data-testid="`btn-view-${(item as ReviewQueueItem).id}`"
                        >
                            View
                        </Link>
                    </Button>
                </template>
            </ResourceTable>
        </div>
    </AppLayout>
</template>
