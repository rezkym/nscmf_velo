<script setup lang="ts">
import { Search } from '@lucide/vue';
import { computed, ref, watch } from 'vue';

import Alert from '@/components/ui/Alert.vue';
import { buttonVariants } from '@/components/ui/button';
import { controlClass } from '@/components/ui/control';

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
const isNextDisabled = computed(() => currentPage.value >= lastPage.value);
</script>

<template>
    <div class="resource-table-container panel overflow-hidden">
        <!-- Controls: Search & Per Page -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div class="relative w-full sm:w-72">
                <label for="table-search" class="sr-only">Search</label>
                <Search
                    class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    :stroke-width="1.75"
                    aria-hidden="true"
                />
                <input
                    id="table-search"
                    v-model="searchInput"
                    type="search"
                    data-testid="table-search-input"
                    placeholder="Search…"
                    :class="[controlClass, 'pl-9']"
                />
            </div>

            <div class="flex items-center gap-2">
                <label for="table-per-page" class="text-sm text-muted-foreground">Per page</label>
                <select
                    id="table-per-page"
                    data-testid="table-per-page-select"
                    :value="query?.per_page ?? 25"
                    :class="[controlClass, 'w-auto']"
                    @change="onPerPageChange(($event.target as HTMLSelectElement).value)"
                >
                    <option :value="10">10</option>
                    <option :value="25">25</option>
                    <option :value="50">50</option>
                    <option :value="100">100</option>
                </select>
            </div>
        </div>

        <!-- Loading indicator -->
        <div
            v-if="loading"
            data-testid="table-loading-state"
            aria-busy="true"
            class="border-b border-border px-4 py-3 text-sm text-muted-foreground"
        >
            Loading…
        </div>

        <!-- Error state -->
        <div v-if="error" data-testid="table-error-state" role="alert" class="p-4">
            <Alert variant="error">{{ error }}</Alert>
        </div>

        <!-- Table View -->
        <div data-testid="table-scroll-container" class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
                <caption class="sr-only">
                    {{
                        caption
                    }}
                </caption>
                <thead class="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            :data-testid="`header-${col.key}`"
                            :aria-sort="getHeaderAriaSort(col)"
                            class="whitespace-nowrap px-4 py-3 font-medium"
                        >
                            <button
                                v-if="col.sortable"
                                type="button"
                                :data-testid="`sort-button-${col.key}`"
                                class="inline-flex items-center gap-1 rounded-sm font-medium uppercase tracking-wide transition-colors duration-150 hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                @click="onSortChange(col.key)"
                            >
                                {{ col.label }}
                                <span v-if="query?.sort === col.key" aria-hidden="true">
                                    {{ query?.direction === 'desc' ? '↓' : '↑' }}
                                </span>
                            </button>
                            <span v-else>{{ col.label }}</span>
                        </th>
                        <th v-if="$slots.actions" class="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody v-if="!error && currentItems.length > 0" class="divide-y divide-border">
                    <tr
                        v-for="(item, idx) in currentItems"
                        :key="typeof item.id === 'string' || typeof item.id === 'number' ? item.id : idx"
                        class="transition-colors duration-150 hover:bg-muted/50"
                    >
                        <td v-for="col in columns" :key="col.key" class="px-4 py-3 align-middle">
                            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
                                {{ item[col.key] }}
                            </slot>
                        </td>
                        <td v-if="$slots.actions" class="px-4 py-3 text-right">
                            <slot name="actions" :item="item" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Empty state -->
        <div
            v-if="!error && currentItems.length === 0"
            data-testid="table-empty-state"
            class="px-4 py-12 text-center text-sm text-muted-foreground"
        >
            {{ emptyText }}
        </div>

        <!-- Pagination Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div class="text-sm text-muted-foreground">
                Page {{ currentPage }} of {{ lastPage }} ({{ meta?.total ?? 0 }}
                total)
            </div>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    data-testid="pagination-prev"
                    :disabled="isPrevDisabled"
                    :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                    @click="onPageChange(currentPage - 1)"
                >
                    Previous
                </button>
                <button
                    type="button"
                    data-testid="pagination-next"
                    :disabled="isNextDisabled"
                    :class="buttonVariants({ variant: 'secondary', size: 'sm' })"
                    @click="onPageChange(currentPage + 1)"
                >
                    Next
                </button>
            </div>
        </div>
    </div>
</template>
