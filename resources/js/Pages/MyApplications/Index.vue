<script setup lang="ts">
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
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

defineProps<{ items: HistoryItem[]; meta: PaginationMeta; query: MyApplicationsQuery }>();
</script>

<template>
    <div />
</template>
