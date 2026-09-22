<script setup lang="ts">
import type { BusinessStatus, PaginationMeta } from '@/features/nscmf/contracts';

export interface PersonRef {
    id: number;
    name: string;
}

export interface ApprovalQueueItem extends Record<string, unknown> {
    id: number;
    request_no: string;
    requester?: PersonRef | null;
    team?: PersonRef | null;
    business_status: BusinessStatus;
}

defineProps<{
    items?: ApprovalQueueItem[];
    meta?: PaginationMeta | null;
}>();
</script>

<template>
    <div />
</template>
