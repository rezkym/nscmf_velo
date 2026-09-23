<script setup lang="ts">
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import type { ReviewAttachment } from '@/features/nscmf/workflow/ReviewAttachments.vue';
import AppLayout from '@/layouts/AppLayout.vue';

defineProps<{ record: NscmfDetailRecord; attachments: ReviewAttachment[] }>();
</script>

<template>
    <AppLayout :title="`Approval · ${record.request_no}`">
        <RecordDetail :record="record" back-href="/approval" back-label="Back to approval queue" />
    </AppLayout>
</template>
