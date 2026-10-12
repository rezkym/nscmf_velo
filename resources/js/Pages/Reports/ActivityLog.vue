<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import { Download, FolderDown } from '@lucide/vue';
import { computed, ref } from 'vue';

import DatePicker from '@/components/DatePicker.vue';
import PageHeader from '@/components/PageHeader.vue';
import ResourceTable, { type ColumnDef, type TableQuery } from '@/components/ResourceTable.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { usePermissions } from '@/composables/usePermissions';
import type { BusinessStatus } from '@/features/nscmf/contracts';
import StatusBadge from '@/features/nscmf/StatusBadge.vue';
import {
    FAMILY_LABELS,
    STATUS_LABELS,
    SUBTYPE_LABELS,
    SUBTYPES_BY_FAMILY,
    type NscmfFamily,
    type NscmfSubtype,
} from '@/features/nscmf/types';
import ActivityLogExportDialog from '@/features/reports/ActivityLogExportDialog.vue';
import ActivityLogExports from '@/features/reports/ActivityLogExports.vue';
import {
    ARCHIVE_VIEW_LABELS,
    SERVICE_IMPACT_DISPLAY,
    SUBMITTED_STATUSES,
    entryCount,
    type ActivityLogPageProps,
    type ArchiveView,
    type LogExportJob,
    type LogFilters,
    type LogItem,
    type LogQuery,
} from '@/features/reports/types';
import AppLayout from '@/layouts/AppLayout.vue';
import { formatBusinessDate } from '@/lib/datetime';

/**
 * The Activity Log report (07 §34.2, 12 §47.2): the digital NSCMF Activity Logging Form as a data
 * table. The order is fixed by the server; the selection survives paging so an export can span
 * pages. Every value shown comes from the server; access is decided there.
 */
const props = defineProps<ActivityLogPageProps>();

const { can } = usePermissions();
const canExport = can('nscmf.export');
const ALL_STATUSES = Object.keys(STATUS_LABELS) as BusinessStatus[];

const columns: ColumnDef[] = [
    ...(canExport ? [{ key: 'select', label: 'Select' }] : []),
    { key: 'no', label: 'No' },
    { key: 'request_date', label: 'Date' },
    { key: 'request_no', label: 'NSCMF No' },
    { key: 'subtype', label: 'Purpose' },
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'noc_infrastructure', label: 'NOC Infrastructure' },
    { key: 'business_status', label: 'Status' },
];

const loading = ref(false);
const selected = ref<Record<number, LogItem>>({});
const selectedItems = computed(() => Object.values(selected.value));
const exportOpen = ref(false);
/** The exports strip and panel; a requested job is handed to it to follow. */
const exports = ref<{ track: (job: LogExportJob) => void; activeCount: number } | null>(null);
const exportsPanelOpen = ref(false);
const running = computed(() => exports.value?.activeCount ?? 0);

const subtypes = computed(() => (props.query.family ? SUBTYPES_BY_FAMILY[props.query.family] : []));
const filters = computed<LogFilters>(() => ({
    q: props.query.q,
    family: props.query.family,
    subtype: props.query.subtype,
    statuses: props.query.statuses,
    archived: props.query.archived,
    request_date_from: props.query.request_date_from,
    request_date_to: props.query.request_date_to,
}));
const period = computed(() => {
    const { period_from: from, period_until: until } = props.summary;
    return from && until ? ` · Period ${formatBusinessDate(from)} – ${formatBusinessDate(until)}` : '';
});

/** Every navigation sends the whole accepted query; empty values are dropped. */
function visit(patch: Partial<LogQuery>): void {
    const next = { ...props.query, ...patch };
    const params: Record<string, string | number | string[]> = {
        page: next.page,
        per_page: next.per_page,
        statuses: next.statuses,
        archived: next.archived,
    };
    for (const key of ['q', 'family', 'subtype', 'request_date_from', 'request_date_to'] as const) {
        const value = next[key];
        if (value !== null && value !== '') params[key] = value;
    }

    router.get('/reports/activity-log', params, {
        preserveState: true,
        preserveScroll: true,
        onStart: () => (loading.value = true),
        onFinish: () => (loading.value = false),
    });
}

function filter(patch: Partial<LogQuery>): void {
    visit({ ...patch, page: 1 });
}

/** Statuses keep the canonical order; the last checked status cannot be removed. */
function toggleStatus(status: BusinessStatus): void {
    const current = props.query.statuses;
    const next = current.includes(status) ? current.filter((value) => value !== status) : [...current, status];
    if (next.length === 0) return;
    filter({ statuses: ALL_STATUSES.filter((value) => next.includes(value)) });
}

function selectValue(event: Event): string | null {
    const value = (event.target as HTMLSelectElement).value;
    return value === '' ? null : value;
}

function toggleSelected(item: LogItem): void {
    const next = { ...selected.value };
    if (next[item.id]) delete next[item.id];
    else next[item.id] = item;
    selected.value = next;
}

function onTableQuery(table: TableQuery): void {
    visit({ page: table.page, per_page: table.per_page ?? props.query.per_page, q: table.q ? table.q : null });
}

function onRequested(job: LogExportJob): void {
    exportOpen.value = false;
    exports.value?.track(job);
}

const tableQuery = computed<TableQuery>(() => ({
    page: props.query.page,
    per_page: props.query.per_page,
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
const row = (item: unknown) => item as LogItem;
const rowNumber = (item: unknown) =>
    (props.meta.from ?? 1) + props.items.findIndex((entry) => entry.id === row(item).id);
const impacts = (item: unknown) =>
    row(item)
        .noc_infrastructure.map((code) => SERVICE_IMPACT_DISPLAY[code] ?? code)
        .join(', ');
</script>

<template>
    <AppLayout title="Activity Log">
        <div class="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title="Activity Log"
                description="The NSCMF Activity Logging Form, filled from the records. Export it as the official log workbook or PDF."
            />

            <Card>
                <CardContent>
                    <form
                        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        aria-label="Activity Log filters"
                        @submit.prevent
                    >
                        <Field>
                            <FieldLabel for="log-date-from">Request date from</FieldLabel>
                            <DatePicker
                                id="log-date-from"
                                data-testid="log-date-from"
                                placeholder="Any date"
                                :model-value="query.request_date_from ?? null"
                                @update:model-value="filter({ request_date_from: $event })"
                            />
                        </Field>
                        <Field>
                            <FieldLabel for="log-date-to">Request date to</FieldLabel>
                            <DatePicker
                                id="log-date-to"
                                data-testid="log-date-to"
                                placeholder="Any date"
                                :model-value="query.request_date_to ?? null"
                                @update:model-value="filter({ request_date_to: $event })"
                            />
                        </Field>
                        <Field>
                            <FieldLabel for="log-family">Family</FieldLabel>
                            <NativeSelect
                                id="log-family"
                                class="w-full"
                                data-testid="log-family"
                                :model-value="query.family ?? ''"
                                @change="filter({ family: selectValue($event) as NscmfFamily | null, subtype: null })"
                            >
                                <option value="">All families</option>
                                <option v-for="(label, family) in FAMILY_LABELS" :key="family" :value="family">
                                    {{ label }}
                                </option>
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel for="log-subtype">Purpose</FieldLabel>
                            <NativeSelect
                                id="log-subtype"
                                class="w-full"
                                data-testid="log-subtype"
                                :model-value="query.subtype ?? ''"
                                :disabled="subtypes.length === 0"
                                @change="filter({ subtype: selectValue($event) as NscmfSubtype | null })"
                            >
                                <option value="">All purposes</option>
                                <option v-for="subtype in subtypes" :key="subtype" :value="subtype">
                                    {{ SUBTYPE_LABELS[subtype] }}
                                </option>
                            </NativeSelect>
                        </Field>
                        <Field>
                            <FieldLabel for="log-archived">View</FieldLabel>
                            <NativeSelect
                                id="log-archived"
                                class="w-full"
                                data-testid="log-archived"
                                :model-value="query.archived"
                                @change="filter({ archived: (selectValue($event) ?? 'all') as ArchiveView })"
                            >
                                <option v-for="(label, view) in ARCHIVE_VIEW_LABELS" :key="view" :value="view">
                                    {{ label }}
                                </option>
                            </NativeSelect>
                        </Field>
                        <FieldSet class="sm:col-span-2 lg:col-span-3">
                            <FieldLegend variant="label">Status</FieldLegend>
                            <div class="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    data-testid="statuses-all-submitted"
                                    @click="filter({ statuses: [...SUBMITTED_STATUSES] })"
                                    >All submitted</Button
                                >
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    data-testid="statuses-approved-only"
                                    @click="filter({ statuses: ['APPROVED'] })"
                                    >Approved only</Button
                                >
                            </div>
                            <div class="flex flex-wrap gap-x-4 gap-y-2">
                                <label
                                    v-for="status in ALL_STATUSES"
                                    :key="status"
                                    class="flex items-center gap-2 text-sm"
                                >
                                    <Checkbox
                                        :model-value="query.statuses.includes(status)"
                                        :data-testid="`status-${status}`"
                                        :disabled="query.statuses.length === 1 && query.statuses.includes(status)"
                                        @update:model-value="toggleStatus(status)"
                                    />
                                    {{ STATUS_LABELS[status] }}
                                </label>
                            </div>
                        </FieldSet>
                    </form>
                </CardContent>
            </Card>

            <div class="flex flex-wrap items-center justify-between gap-3">
                <p data-testid="log-summary" class="text-muted-foreground">
                    {{ entryCount(summary.total) }}{{ period }}
                </p>
                <div class="flex flex-wrap items-center gap-2">
                    <template v-if="selectedItems.length">
                        <span data-testid="selection-count">{{ selectedItems.length }} selected</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid="clear-selection"
                            @click="selected = {}"
                            >Clear selection</Button
                        >
                    </template>
                    <Button
                        v-if="canExport"
                        type="button"
                        variant="outline"
                        data-testid="open-exports"
                        :aria-label="running > 0 ? `Exports, ${running} running` : 'Exports'"
                        @click="exportsPanelOpen = true"
                    >
                        <FolderDown aria-hidden="true" />
                        Exports
                        <Badge v-if="running > 0" variant="secondary" data-testid="exports-running">{{
                            running
                        }}</Badge>
                    </Button>
                    <Button
                        v-if="canExport"
                        type="button"
                        data-testid="open-export"
                        :disabled="summary.total === 0 && selectedItems.length === 0"
                        @click="exportOpen = true"
                    >
                        <Download aria-hidden="true" />
                        Export
                    </Button>
                </div>
            </div>

            <ActivityLogExports v-if="canExport" ref="exports" v-model:panel-open="exportsPanelOpen" />

            <ResourceTable
                :columns="columns"
                :items="items"
                :loading="loading"
                :query="tableQuery"
                :meta="tableMeta"
                :sort-whitelist="[]"
                row-test-id="log-row"
                empty-text="No entry matches these filters"
                caption="NSCMF Activity Log"
                @update:query="onTableQuery"
            >
                <template #cell-select="{ item }">
                    <Checkbox
                        :model-value="Boolean(selected[row(item).id])"
                        :data-testid="`select-${row(item).id}`"
                        :aria-label="`Select ${row(item).request_no}`"
                        @update:model-value="toggleSelected(row(item))"
                    />
                </template>
                <template #cell-no="{ item }">{{ rowNumber(item) }}</template>
                <template #cell-request_date="{ item }">
                    <span class="whitespace-nowrap">{{
                        row(item).request_date ? formatBusinessDate(row(item).request_date!) : '—'
                    }}</span>
                </template>
                <template #cell-request_no="{ item }">
                    <Link
                        :href="`/nscmf/${row(item).id}`"
                        class="whitespace-nowrap font-medium text-primary underline-offset-4 hover:underline"
                        >{{ row(item).request_no }}</Link
                    >
                </template>
                <template #cell-subtype="{ item }">{{ SUBTYPE_LABELS[row(item).subtype] }}</template>
                <template #cell-customer_name="{ item }">{{ row(item).customer_name ?? '—' }}</template>
                <template #cell-noc_infrastructure="{ item }">{{ impacts(item) || '—' }}</template>
                <template #cell-business_status="{ item }">
                    <span class="flex flex-wrap gap-1">
                        <StatusBadge :status="row(item).business_status" />
                        <Badge v-if="row(item).is_archived" variant="warning">Archived</Badge>
                    </span>
                </template>
            </ResourceTable>

            <ActivityLogExportDialog
                v-if="canExport"
                :open="exportOpen"
                :filters="filters"
                :total="summary.total"
                :selected="selectedItems"
                :site-defaults="summary.site_defaults"
                :pdf-available="pdf_available"
                :max-entries="max_entries"
                @close="exportOpen = false"
                @requested="onRequested"
            />
        </div>
    </AppLayout>
</template>
