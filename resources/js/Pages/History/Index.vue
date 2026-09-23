<script setup lang="ts">
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import type { NscmfFamily, NscmfSubtype } from '@/features/nscmf/types';
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

defineProps<{ items: HistoryItem[]; meta: PaginationMeta; query: HistoryQuery }>();
</script>

<template>
    <AppLayout title="History"><div /></AppLayout>
</template>
