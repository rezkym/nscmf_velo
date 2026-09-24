<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronsUpDown } from '@lucide/vue';
import { computed, ref, useSlots, watch } from 'vue';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface ColumnDef {
    key: string;
    label: string;
    sortable?: boolean;
    class?: string;
}

export interface TableQuery {
    page: number;
    /** Optional: the table falls back to the contract default of 25. */
    per_page?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
    q?: string;
    filters?: Record<string, unknown>;
}

export interface TablePaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from?: number;
    to?: number;
}

export interface ResourceTableProps<T = Record<string, unknown>> {
    columns: ColumnDef[];
    items?: T[];
    loading?: boolean;
    error?: string | null;
    query?: TableQuery;
    meta?: TablePaginationMeta | null;
    sortWhitelist?: string[];
    emptyText?: string;
    caption?: string;
    requestId?: number | string;
}

const props = withDefaults(defineProps<ResourceTableProps>(), {
    items: () => [],
    loading: false,
    error: null,
    query: () => ({ page: 1, per_page: 25 }),
    meta: null,
    sortWhitelist: () => [],
    emptyText: 'No data',
    caption: 'Data Table',
    requestId: undefined,
});

const emit = defineEmits<{
    (e: 'update:query', query: TableQuery): void;
}>();

// Stale response handling
const lastAcceptedRequestId = ref<number | string | undefined>(props.requestId);
const currentItems = ref<Record<string, unknown>[]>([...props.items]);

/** Numeric ids compare by value, anything else in their own order. */
function isOlder(incoming: number | string, accepted: number | string): boolean {
    const a = Number(incoming);
    const b = Number(accepted);
    return Number.isFinite(a) && Number.isFinite(b) ? a < b : incoming < accepted;
}

watch(
    () => [props.items, props.requestId] as const,
    ([newItems, newRequestId]) => {
        const accepted = lastAcceptedRequestId.value;
        if (newRequestId !== undefined && accepted !== undefined && isOlder(newRequestId, accepted)) {
            return;
        }

        if (newRequestId !== undefined) lastAcceptedRequestId.value = newRequestId;
        currentItems.value = [...newItems];
    },
    { immediate: true, deep: true },
);

/**
 * Every emitted query goes through here, so the per_page bounds from the list contract
 * (default 25, minimum 1, maximum 100) also hold for a value the parent supplied, as whole rows.
 */
function emitQuery(patch: Partial<TableQuery>) {
    const merged = { ...props.query, ...patch };
    const perPage = Number(merged.per_page);
    emit('update:query', {
        ...merged,
        per_page: Math.trunc(Math.min(100, Math.max(1, Number.isFinite(perPage) ? perPage : 25))),
    });
}

// Search input handling
const searchInput = computed({
    get: () => props.query?.q ?? '',
    set: (val: string) => {
        emitQuery({ q: val, page: 1 });
    },
});

// Per-page change handling; emitQuery applies the contract bounds
function onPerPageChange(perPageVal: string) {
    emitQuery({ per_page: Number(perPageVal), page: 1 });
}

// Sort change handling
function onSortChange(sortField: string) {
    if (props.sortWhitelist && props.sortWhitelist.length > 0) {
        if (!props.sortWhitelist.includes(sortField)) {
            return;
        }
    }

    const currentSort = props.query?.sort;
    const currentDirection = props.query?.direction ?? 'asc';
    let nextDirection: 'asc' | 'desc' = 'asc';

    if (currentSort === sortField) {
        nextDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    }

    emitQuery({ sort: sortField, direction: nextDirection, page: 1 });
}

function onPageChange(targetPage: number) {
    emitQuery({ page: Math.min(lastPage.value, Math.max(1, targetPage)) });
}

function getHeaderAriaSort(col: ColumnDef): 'ascending' | 'descending' | 'none' | undefined {
    if (!col.sortable) return undefined;
    if (props.query?.sort === col.key) {
        return props.query?.direction === 'desc' ? 'descending' : 'ascending';
    }
    return 'none';
}

const currentPage = computed(() => props.meta?.current_page ?? props.query.page);
const lastPage = computed(() => props.meta?.last_page ?? 1);

const isPrevDisabled = computed(() => currentPage.value <= 1);
const slots = useSlots();
const columnCount = computed(() => props.columns.length + (slots.actions ? 1 : 0));
const isNextDisabled = computed(() => currentPage.value >= lastPage.value);
</script>

<template>
    <Card class="gap-0 overflow-hidden py-0">
        <!-- Controls: Search & Per Page -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div class="w-full sm:w-72">
                <Label for="table-search" class="sr-only">Search</Label>
                <Input
                    id="table-search"
                    v-model="searchInput"
                    type="search"
                    data-testid="table-search-input"
                    placeholder="Search…"
                />
            </div>

            <div class="flex items-center gap-2">
                <Label for="table-per-page" class="font-normal whitespace-nowrap text-muted-foreground">Per page</Label>
                <NativeSelect
                    id="table-per-page"
                    data-testid="table-per-page-select"
                    :model-value="query?.per_page ?? 25"
                    @change="onPerPageChange(($event.target as HTMLSelectElement).value)"
                >
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                </NativeSelect>
            </div>
        </div>

        <p
            v-if="loading"
            data-testid="table-loading-state"
            aria-busy="true"
            class="border-b px-4 py-3 text-muted-foreground"
        >
            Loading…
        </p>

        <div v-if="error" data-testid="table-error-state" role="alert" class="p-4">
            <Alert variant="destructive">
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>
        </div>

        <Table data-testid="table-scroll-container">
            <TableCaption class="sr-only">{{ caption }}</TableCaption>
            <TableHeader class="bg-muted/50">
                <TableRow>
                    <TableHead
                        v-for="col in columns"
                        :key="col.key"
                        :data-testid="`header-${col.key}`"
                        :aria-sort="getHeaderAriaSort(col)"
                        class="px-4"
                    >
                        <Button
                            v-if="col.sortable"
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="-ml-2.5"
                            :data-testid="`sort-button-${col.key}`"
                            @click="onSortChange(col.key)"
                        >
                            {{ col.label }}
                            <ArrowDown
                                v-if="query?.sort === col.key && query?.direction === 'desc'"
                                aria-hidden="true"
                            />
                            <ArrowUp v-else-if="query?.sort === col.key" aria-hidden="true" />
                            <ChevronsUpDown v-else class="text-muted-foreground" aria-hidden="true" />
                        </Button>
                        <template v-else>{{ col.label }}</template>
                    </TableHead>
                    <TableHead v-if="$slots.actions" class="px-4 text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody v-if="!error">
                <TableRow
                    v-for="(item, idx) in currentItems"
                    :key="typeof item.id === 'string' || typeof item.id === 'number' ? item.id : idx"
                >
                    <TableCell v-for="col in columns" :key="col.key" class="px-4 py-3">
                        <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                            {{ item[col.key] }}
                        </slot>
                    </TableCell>
                    <TableCell v-if="$slots.actions" class="px-4 py-3 text-right">
                        <slot name="actions" :item="item" />
                    </TableCell>
                </TableRow>
                <TableEmpty
                    v-if="currentItems.length === 0"
                    data-testid="table-empty-state"
                    :colspan="columnCount"
                    class="text-muted-foreground"
                >
                    {{ emptyText }}
                </TableEmpty>
            </TableBody>
        </Table>

        <!-- Pagination Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p class="text-muted-foreground">Page {{ currentPage }} of {{ lastPage }} ({{ meta?.total ?? 0 }} total)</p>
            <div class="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="pagination-prev"
                    :disabled="isPrevDisabled"
                    @click="onPageChange(currentPage - 1)"
                >
                    Previous
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="pagination-next"
                    :disabled="isNextDisabled"
                    @click="onPageChange(currentPage + 1)"
                >
                    Next
                </Button>
            </div>
        </div>
    </Card>
</template>
