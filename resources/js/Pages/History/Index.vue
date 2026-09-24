<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import { controlClass } from '@/components/ui/control';
import { usePermissions } from '@/composables/usePermissions';
import BulkExportPanel from '@/features/exports/BulkExportPanel.vue';
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import {
    FAMILY_LABELS,
    STATUS_LABELS,
    SUBTYPE_LABELS,
    SUBTYPES_BY_FAMILY,
    type NscmfFamily,
    type NscmfSubtype,
} from '@/features/nscmf/types';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
import AppLayout from '@/layouts/AppLayout.vue';

export interface HistoryItem extends Record<string, unknown> {
    id: number;
    request_no: string;
    family: NscmfFamily;
    subtype: NscmfSubtype;
    request_date: string | null;
    requester: { id: number; name: string } | null;
    team: { id: number; name: string } | null;
    business_status: BusinessStatus;
    is_archived: boolean;
}

/** The server's echo of the accepted History query (12 §13–16, §47). */
export interface HistoryQuery {
    page: number;
    per_page: number;
    sort: string;
    direction: 'asc' | 'desc';
    q: string | null;
    family: NscmfFamily | null;
    subtype: NscmfSubtype | null;
    business_status: BusinessStatus | null;
    archived: boolean | null;
    request_date_from: string | null;
    request_date_to: string | null;
    owner_user_id: number | null;
    team_id: number | null;
}

const props = defineProps<{ items: HistoryItem[]; meta: PaginationMeta; query: HistoryQuery }>();

const SORTS = ['request_no', 'request_date', 'created_at', 'updated_at', 'business_status', 'family', 'subtype'];
const { can } = usePermissions();
const selectable = can('nscmf.export.bulk');
const columns: ColumnDef[] = [
    ...(selectable ? [{ key: 'select', label: 'Select' }] : []),
    { key: 'request_no', label: 'Request No', sortable: true },
    { key: 'subtype', label: 'Type', sortable: true },
    { key: 'request_date', label: 'Request date', sortable: true },
    { key: 'requester', label: 'Requester' },
    { key: 'team', label: 'Team' },
    { key: 'business_status', label: 'Status', sortable: true },
];

const loading = ref(false);
/** Only rows on screen can be selected; a new result drops any selection it no longer shows. */
const selectedIds = ref<number[]>([]);
watch(
    () => props.items,
    (items) => {
        selectedIds.value = selectedIds.value.filter((id) => items.some((item) => item.id === id));
    },
);
const selected = computed(() =>
    props.items.filter((item) => selectedIds.value.includes(item.id)).map(({ id, request_no }) => ({ id, request_no })),
);
const subtypes = computed(() => (props.query.family ? SUBTYPES_BY_FAMILY[props.query.family] : []));
const informational = computed(() =>
    [
        props.query.team_id ? `Team #${props.query.team_id}` : null,
        props.query.owner_user_id ? `Owner #${props.query.owner_user_id}` : null,
    ].filter((label): label is string => label !== null),
);

/**
 * Every navigation goes through here: only the whitelisted keys of 12 §13–16, empty values
 * dropped, and `archived` always explicit so the default stays the active view.
 */
function visit(patch: Partial<HistoryQuery>): void {
    const next = { ...props.query, ...patch };
    const params: Record<string, string | number> = {
        page: next.page,
        per_page: next.per_page,
        sort: next.sort,
        direction: next.direction,
    };
    for (const key of [
        'q',
        'family',
        'subtype',
        'business_status',
        'request_date_from',
        'request_date_to',
        'owner_user_id',
        'team_id',
    ] as const) {
        const value = next[key];
        if (value !== null && value !== '') params[key] = value;
    }
    params.archived = next.archived ? 1 : 0;

    router.get('/history', params, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => (loading.value = true),
        onFinish: () => (loading.value = false),
    });
}

function filter(patch: Partial<HistoryQuery>): void {
    visit({ ...patch, page: 1 });
}

function onTableQuery(table: TableQuery): void {
    visit({
        page: table.page,
        per_page: table.per_page ?? props.query.per_page,
        sort: table.sort ?? props.query.sort,
        direction: table.direction ?? props.query.direction,
        q: table.q ?? null,
    });
}

function selectValue(event: Event): string | null {
    const value = (event.target as HTMLSelectElement | HTMLInputElement).value;
    return value === '' ? null : value;
}

const tableQuery = computed<TableQuery>(() => ({
    page: props.query.page,
    per_page: props.query.per_page,
    sort: props.query.sort,
    direction: props.query.direction,
    q: props.query.q ?? '',
}));
const tableMeta = computed(() => ({
    current_page: props.meta.current_page,
    per_page: props.meta.per_page,
    total: props.meta.total,
    last_page: props.meta.last_page,
    from: props.meta.from ?? undefined,
    to: props.meta.to ?? undefined,
}));
const row = (item: unknown) => item as HistoryItem;
</script>

<template>
    <AppLayout title="History">
        <div class="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="History"
                description="Every NSCMF record you may see. Archived records are a separate view."
            />

            <form
                class="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="History filters"
                @submit.prevent
            >
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">View</span>
                    <select
                        data-testid="filter-archived"
                        :class="controlClass"
                        class="w-full"
                        :value="query.archived ? '1' : '0'"
                        @change="filter({ archived: selectValue($event) === '1' })"
                    >
                        <option value="0">Active records</option>
                        <option value="1">Archived records</option>
                    </select>
                </label>
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">Family</span>
                    <select
                        data-testid="filter-family"
                        :class="controlClass"
                        class="w-full"
                        :value="query.family ?? ''"
                        @change="filter({ family: selectValue($event) as NscmfFamily | null, subtype: null })"
                    >
                        <option value="">All families</option>
                        <option v-for="(label, family) in FAMILY_LABELS" :key="family" :value="family">
                            {{ label }}
                        </option>
                    </select>
                </label>
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">Subtype</span>
                    <select
                        data-testid="filter-subtype"
                        :class="controlClass"
                        class="w-full"
                        :value="query.subtype ?? ''"
                        :disabled="subtypes.length === 0"
                        @change="filter({ subtype: selectValue($event) as NscmfSubtype | null })"
                    >
                        <option value="">All subtypes</option>
                        <option v-for="subtype in subtypes" :key="subtype" :value="subtype">
                            {{ SUBTYPE_LABELS[subtype] }}
                        </option>
                    </select>
                </label>
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">Status</span>
                    <select
                        data-testid="filter-status"
                        :class="controlClass"
                        class="w-full"
                        :value="query.business_status ?? ''"
                        @change="filter({ business_status: selectValue($event) as BusinessStatus | null })"
                    >
                        <option value="">All statuses</option>
                        <option v-for="(label, status) in STATUS_LABELS" :key="status" :value="status">
                            {{ label }}
                        </option>
                    </select>
                </label>
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">Request date from</span>
                    <input
                        type="date"
                        data-testid="filter-date-from"
                        :class="controlClass"
                        class="w-full"
                        :value="query.request_date_from ?? ''"
                        @change="filter({ request_date_from: selectValue($event) })"
                    />
                </label>
                <label class="space-y-1 text-sm">
                    <span class="block text-muted-foreground">Request date to</span>
                    <input
                        type="date"
                        data-testid="filter-date-to"
                        :class="controlClass"
                        class="w-full"
                        :value="query.request_date_to ?? ''"
                        @change="filter({ request_date_to: selectValue($event) })"
                    />
                </label>
            </form>

            <p
                v-if="informational.length"
                data-testid="informational-filters"
                class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
            >
                Also filtered by {{ informational.join(', ') }} (information only, not access).
                <Button
                    variant="ghost"
                    size="sm"
                    data-testid="clear-informational"
                    @click="filter({ team_id: null, owner_user_id: null })"
                    >Clear</Button
                >
            </p>

            <BulkExportPanel v-if="selectable" :selected="selected" />

            <ResourceTable
                :columns="columns"
                :items="items"
                :loading="loading"
                :query="tableQuery"
                :meta="tableMeta"
                :sort-whitelist="SORTS"
                empty-text="No records match these filters"
                caption="NSCMF history"
                @update:query="onTableQuery"
            >
                <template #cell-select="{ item }">
                    <input
                        v-model="selectedIds"
                        type="checkbox"
                        :value="row(item).id"
                        :data-testid="`select-${row(item).id}`"
                        :aria-label="`Select ${row(item).request_no}`"
                    />
                </template>
                <template #cell-request_no="{ item }">
                    <Link
                        :href="`/nscmf/${row(item).id}`"
                        class="whitespace-nowrap font-medium text-primary hover:underline"
                        >{{ row(item).request_no }}</Link
                    >
                </template>
                <template #cell-subtype="{ item }">
                    {{ FAMILY_LABELS[row(item).family] }} · {{ SUBTYPE_LABELS[row(item).subtype] }}
                </template>
                <template #cell-request_date="{ item }">{{ row(item).request_date ?? '—' }}</template>
                <template #cell-requester="{ item }">{{ row(item).requester?.name ?? '—' }}</template>
                <template #cell-team="{ item }">{{ row(item).team?.name ?? '—' }}</template>
                <template #cell-business_status="{ item }">
                    <span :data-testid="`history-row-${row(item).id}`" class="flex flex-wrap gap-1">
                        <StatusBadge :status="row(item).business_status" />
                        <Badge v-if="row(item).is_archived" variant="warning">Archived</Badge>
                    </span>
                </template>
            </ResourceTable>
        </div>
    </AppLayout>
</template>
