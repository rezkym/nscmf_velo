<script setup lang="ts">
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import LifecycleActions from '@/features/nscmf/workflow/LifecycleActions.vue';
import ReviewAttachments, { type ReviewAttachment } from '@/features/nscmf/workflow/ReviewAttachments.vue';
import BusinessTimeline from '@/features/nscmf/BusinessTimeline.vue';
import AppLayout from '@/layouts/AppLayout.vue';

export type { NscmfDetailRecord };
defineProps<{ record: NscmfDetailRecord; attachments: ReviewAttachment[] }>();
</script>

<template>
    <AppLayout :title="record.request_no">
        <RecordDetail :record="record">
            <template #actions>
                <LifecycleActions :record="record" />
            </template>
            <template #timeline>
                <BusinessTimeline :key="`${record.id}-${record.record_version}`" :record-id="record.id" />
            </template>
            <template #attachments>
                <ReviewAttachments :attachments="attachments" />
            </template>
        </RecordDetail>
    </AppLayout>
</template>
