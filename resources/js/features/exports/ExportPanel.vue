<script setup lang="ts">
import type { BusinessStatus } from '@/features/nscmf/contracts';

defineProps<{
    recordId: number;
    businessStatus: BusinessStatus;
    approvedBy: string | null;
    pollMs?: number;
    navigate?: (url: string) => void;
}>();
</script>

<template>
    <div />
</template>
