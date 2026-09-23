<script setup lang="ts">
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

export type { NscmfDetailRecord };
defineProps<{ record: NscmfDetailRecord }>();
</script>

<template>
    <AppLayout :title="record.request_no">
        <RecordDetail :record="record" />
    </AppLayout>
</template>
