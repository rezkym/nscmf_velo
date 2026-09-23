<script setup lang="ts">
import type { NscmfDetailRecord } from '@/features/nscmf/types';

defineProps<{ record: NscmfDetailRecord }>();
</script>

<template>
    <div data-testid="lifecycle-actions"></div>
</template>
