<script setup lang="ts">
import type { AttachmentItem } from '@/features/attachments/AttachmentList.vue';
import AttachmentPanel from '@/features/attachments/AttachmentPanel.vue';
import ExportPanel from '@/features/exports/ExportPanel.vue';
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import LifecycleActions from '@/features/nscmf/workflow/LifecycleActions.vue';
import RecordNextSteps from '@/features/nscmf/workflow/RecordNextSteps.vue';
import BusinessTimeline from '@/features/nscmf/BusinessTimeline.vue';
import AppLayout from '@/layouts/AppLayout.vue';

export type { NscmfDetailRecord };
defineProps<{ record: NscmfDetailRecord; attachments: AttachmentItem[] }>();
</script>

<template>
    <AppLayout :title="record.request_no">
        <RecordDetail :record="record">
            <template #actions>
                <RecordNextSteps :record="record" />
                <LifecycleActions :record="record" />
                <ExportPanel
                    :record-id="record.id"
                    :business-status="record.business_status"
                    :approved-by="record.approved_by?.name ?? null"
                />
            </template>
            <template #timeline>
                <BusinessTimeline :key="`${record.id}-${record.record_version}`" :record-id="record.id" />
            </template>
            <template #attachments>
                <AttachmentPanel
                    :record-id="record.id"
                    :attachments="attachments"
                    :policy="null"
                    :editable="false"
                    :locked-reason="null"
                />
            </template>
        </RecordDetail>
    </AppLayout>
</template>
