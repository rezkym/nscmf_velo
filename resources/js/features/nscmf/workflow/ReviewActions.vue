<script setup lang="ts">
import type { BusinessStatus } from '@/features/nscmf/contracts';

export interface ReviewActionsProps {
    recordId: number;
    requestNo: string;
    recordVersion: number;
    businessStatus: BusinessStatus;
    archived: boolean;
    family: 'ACTIVATION' | 'CHANGE';
    allowedActions: string[];
    changeForwardReady?: boolean;
    changeForwardReason?: string | null;
}

defineProps<ReviewActionsProps>();
</script>

<template>
    <div data-testid="review-actions"></div>
</template>
