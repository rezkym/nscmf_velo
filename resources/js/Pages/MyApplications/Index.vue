<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

import PageHeader from '@/components/PageHeader.vue';
import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { useTableVisit } from '@/composables/useTableVisit';
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
import { FAMILY_LABELS, STATUS_LABELS, SUBTYPE_LABELS } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';
import type { HistoryItem } from '@/Pages/History/Index.vue';

/** The server's echo of the accepted My Applications query (12 §47.1). */
export interface MyApplicationsQuery {
    page: number;
    per_page: number;
    sort: string;
    direction: 'asc' | 'desc';
    q: string | null;
    business_status: BusinessStatus | null;
}

const props = defineProps<{ items: HistoryItem[]; meta: PaginationMeta; query: MyApplicationsQuery }>();

const columns: ColumnDef[] = [
    { key: 'request_no', label: 'Request No', sortable: true },
    { key: 'subtype', label: 'Type', sortable: true },
    { key: 'request_date', label: 'Request date', sortable: true },
    { key: 'business_status', label: 'Status', sortable: true },
];

const { loading, visit: get } = useTableVisit('/my-applications');

/** Only the keys of 12 §47.1 are sent; the server fixes the owner and leaves archived records out. */
function visit(patch: Partial<MyApplicationsQuery>): void {
    const next = { ...props.query, ...patch };
    get({
        page: next.page,
        per_page: next.per_page,
        sort: next.sort,
        direction: next.direction,
        q: next.q,
        business_status: next.business_status,
    });
}

const tableQuery = computed<TableQuery>(() => ({
    page: props.query.page,
    per_page: props.query.per_page,
    sort: props.query.sort,
    direction: props.query.direction,
    q: props.query.q ?? '',
}));

function onTableQuery(table: TableQuery): void {
    visit({
        page: table.page,
        per_page: table.per_page ?? props.query.per_page,
        sort: table.sort ?? props.query.sort,
        direction: table.direction ?? props.query.direction,
        q: table.q ?? null,
    });
}

function filterStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    visit({ business_status: value === '' ? null : (value as BusinessStatus), page: 1 });
}

const row = (item: unknown) => item as HistoryItem;
</script>

<template>
    <AppLayout title="My Applications">
        <div class="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="My Applications"
                description="Every NSCMF record you created, in any status. Archived records stay in History."
            />

            <ResourceTable
                :columns="columns"
                :items="items"
                :loading="loading"
                :query="tableQuery"
                :meta="meta"
                empty-text="No applications match"
                caption="My applications"
                @update:query="onTableQuery"
            >
                <template #filters>
                    <Field class="w-full sm:w-48">
                        <FieldLabel for="filter-status">Status</FieldLabel>
                        <NativeSelect
                            id="filter-status"
                            class="w-full"
                            data-testid="filter-status"
                            :model-value="query.business_status ?? ''"
                            @change="filterStatus"
                        >
                            <option value="">All statuses</option>
                            <option v-for="(label, status) in STATUS_LABELS" :key="status" :value="status">
                                {{ label }}
                            </option>
                        </NativeSelect>
                    </Field>
                </template>
                <template #cell-request_no="{ item }">
                    <Link
                        :href="`/nscmf/${row(item).id}`"
                        class="font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline"
                        >{{ row(item).request_no }}</Link
                    >
                </template>
                <template #cell-subtype="{ item }">
                    {{ FAMILY_LABELS[row(item).family] }} · {{ SUBTYPE_LABELS[row(item).subtype] }}
                </template>
                <template #cell-request_date="{ item }">{{ row(item).request_date ?? '—' }}</template>
                <template #cell-business_status="{ item }">
                    <StatusBadge :status="row(item).business_status" />
                </template>
            </ResourceTable>
        </div>
    </AppLayout>
</template>
