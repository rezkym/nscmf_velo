<script setup lang="ts">
import { computed, ref, watch } from 'vue';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ColumnDef<T = unknown> {
    key: string;
    label: string;
    sortable?: boolean;
    class?: string;
}

export interface TableQuery {
    page: number;
    per_page: number;
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
    errorText?: string;
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
    emptyText: 'Tidak ada data',
    errorText: 'Terjadi kesalahan memuat data',
    caption: 'Data Table',
    requestId: undefined,
});

const emit = defineEmits<{
    (e: 'update:query', query: TableQuery): void;
}>();

// Stale response handling (AC3)
const lastAcceptedRequestId = ref<number | string | undefined>(props.requestId);
const currentItems = ref<Record<string, unknown>[]>([...props.items]);

watch(
    () => [props.items, props.requestId] as const,
    ([newItems, newReqId]) => {
        if (newReqId !== undefined) {
            if (lastAcceptedRequestId.value === undefined) {
                lastAcceptedRequestId.value = newReqId;
                currentItems.value = [...newItems];
            } else {
                const prev = Number(lastAcceptedRequestId.value);
                const next = Number(newReqId);
                if (!isNaN(prev) && !isNaN(next)) {
                    if (next >= prev) {
                        lastAcceptedRequestId.value = newReqId;
                        currentItems.value = [...newItems];
                    }
                } else if (newReqId >= lastAcceptedRequestId.value) {
                    lastAcceptedRequestId.value = newReqId;
                    currentItems.value = [...newItems];
                }
            }
        } else {
            currentItems.value = [...newItems];
        }
    },
    { immediate: true, deep: true },
);

// Search input handling (AC2)
const searchInput = computed({
    get: () => props.query?.q ?? '',
    set: (val: string) => {
        emit('update:query', {
            ...props.query,
            q: val,
            page: 1,
        });
    },
});

function onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:query', {
        ...props.query,
        q: target.value,
        page: 1,
    });
}

// Per-page change handling (AC2)
function onPerPageChange(perPageVal: number | string) {
    const parsed = typeof perPageVal === 'string' ? parseInt(perPageVal, 10) : perPageVal;
    const clamped = Math.min(100, Math.max(1, isNaN(parsed) ? 25 : parsed));
    emit('update:query', {
        ...props.query,
        per_page: clamped,
        page: 1,
    });
}

// Sort change handling (AC2 & AC4)
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

    emit('update:query', {
        ...props.query,
        sort: sortField,
        direction: nextDirection,
        page: 1,
    });
}

function onPageChange(targetPage: number) {
    const maxPage = props.meta?.last_page ?? 1;
    const clampedPage = Math.min(maxPage, Math.max(1, targetPage));
    emit('update:query', {
        ...props.query,
        page: clampedPage,
    });
}

function getHeaderAriaSort(col: ColumnDef): 'ascending' | 'descending' | 'none' | undefined {
    if (!col.sortable) return undefined;
    if (props.query?.sort === col.key) {
        return props.query?.direction === 'desc' ? 'descending' : 'ascending';
    }
    return 'none';
}

const isPrevDisabled = computed(() => {
    const current = props.meta?.current_page ?? props.query?.page ?? 1;
    return current <= 1;
});

const isNextDisabled = computed(() => {
    const current = props.meta?.current_page ?? props.query?.page ?? 1;
    const last = props.meta?.last_page ?? 1;
    return current >= last;
});

defineExpose({
    onPerPageChange,
    onSortChange,
    onPageChange,
});
</script>

<template>
    <div class="resource-table-container space-y-4">
        <!-- Controls: Search & Per Page -->
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2">
                <label for="table-search" class="sr-only">Cari</label>
                <input
                    id="table-search"
                    :value="searchInput"
                    type="search"
                    data-testid="table-search-input"
                    placeholder="Cari..."
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    @input="onSearchInput"
                />
            </div>

            <div class="flex items-center gap-2">
                <label for="table-per-page" class="text-sm text-gray-600">Per halaman:</label>
                <select
                    id="table-per-page"
                    data-testid="table-per-page-select"
                    :value="query?.per_page ?? 25"
                    class="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
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
            class="rounded bg-blue-50 p-3 text-sm text-blue-700"
        >
            Memuat data...
        </div>

        <!-- Error state -->
        <div
            v-if="error"
            data-testid="table-error-state"
            role="alert"
            class="rounded bg-red-50 p-4 text-sm text-red-700"
        >
            {{ error || errorText }}
        </div>

        <!-- Loading state overlay/row -->
        <div v-if="loading" data-testid="table-loading-state" class="py-4 text-center text-sm text-gray-500">
            Memuat data...
        </div>

        <!-- Table View -->
        <div data-testid="table-scroll-container" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-left text-sm">
                <caption class="sr-only">
                    {{
                        caption
                    }}
                </caption>
                <thead class="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                        <th
                            v-for="col in columns"
                            :key="col.key"
                            :data-testid="`header-${col.key}`"
                            :aria-sort="getHeaderAriaSort(col)"
                            class="px-4 py-3"
                        >
                            <button
                                v-if="col.sortable"
                                type="button"
                                :data-testid="`sort-button-${col.key}`"
                                class="flex items-center gap-1 font-semibold hover:text-blue-600 focus:outline-none"
                                @click="onSortChange(col.key)"
                            >
                                {{ col.label }}
                                <span v-if="query?.sort === col.key" aria-hidden="true">
                                    {{ query?.direction === 'desc' ? '↓' : '↑' }}
                                </span>
                            </button>
                            <span v-else>{{ col.label }}</span>
                        </th>
                        <th v-if="$slots.actions" class="px-4 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody v-if="!error && currentItems.length > 0" class="divide-y divide-gray-200 bg-white">
                    <tr
                        v-for="(item, idx) in currentItems"
                        :key="typeof item.id === 'string' || typeof item.id === 'number' ? item.id : idx"
                        class="hover:bg-gray-50"
                    >
                        <td v-for="col in columns" :key="col.key" class="px-4 py-3">
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
            class="py-8 text-center text-sm text-gray-500"
        >
            {{ emptyText }}
        </div>

        <!-- Pagination Bar -->
        <div class="flex items-center justify-between border-t border-gray-200 pt-3">
            <div class="text-sm text-gray-500">
                Halaman {{ meta?.current_page ?? query?.page ?? 1 }} dari {{ meta?.last_page ?? 1 }} (Total:
                {{ meta?.total ?? 0 }})
            </div>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    data-testid="pagination-prev"
                    :disabled="isPrevDisabled"
                    class="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    @click="onPageChange((meta?.current_page ?? query?.page ?? 1) - 1)"
                >
                    Sebelumnya
                </button>
                <button
                    type="button"
                    data-testid="pagination-next"
                    :disabled="isNextDisabled"
                    class="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    @click="onPageChange((meta?.current_page ?? query?.page ?? 1) + 1)"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    </div>
</template>
