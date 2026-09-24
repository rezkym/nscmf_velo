<script setup lang="ts">
import { computed } from 'vue';

import { Card, CardContent } from '@/components/ui/card';
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
const props = defineProps<{ record: NscmfDetailRecord; attachments: AttachmentItem[] }>();

// Both action groups follow the server's allowed_actions; a returned record also says who acts next.
const hasActions = computed(
    () => (props.record.allowed_actions ?? []).length > 0 || props.record.business_status === 'REVISION_REQUIRED',
);
</script>

<template>
    <AppLayout :title="record.request_no">
        <RecordDetail :record="record">
            <template #actions>
                <!-- What can be done with the record now: the next step first, then its lifecycle actions. -->
                <Card v-if="hasActions" size="sm">
                    <CardContent class="flex flex-wrap items-center justify-between gap-3">
                        <RecordNextSteps :record="record" />
                        <LifecycleActions :record="record" />
                    </CardContent>
                </Card>
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
