<script setup lang="ts">
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';
import type { NscmfFamily, NscmfSubtype } from '@/features/nscmf/types';

export interface PersonRef {
    id: number;
    name: string;
}

export interface ReviewQueueItem {
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

export type { PaginationMeta };

defineProps<{
    items?: ReviewQueueItem[];
    meta?: PaginationMeta | null;
    loading?: boolean;
    error?: string | null;
}>();
</script>

<template>
    <div></div>
</template>
