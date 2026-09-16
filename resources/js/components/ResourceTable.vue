<script setup lang="ts">
export interface ColumnDef<T = Record<string, unknown>> {
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
    columns: ColumnDef<T>[];
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

withDefaults(defineProps<ResourceTableProps>(), {
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

defineEmits<{
    (e: 'update:query', query: TableQuery): void;
}>();

defineExpose({
    onPerPageChange: (_perPage: number) => {},
    onSortChange: (_sort: string) => {},
});
</script>

<template>
    <div class="resource-table-container">
        <!-- Minimal placeholder for initial TDD -->
    </div>
</template>
