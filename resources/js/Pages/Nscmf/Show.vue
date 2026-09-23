<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions';
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import LifecycleActions from '@/features/nscmf/workflow/LifecycleActions.vue';
import ReviewAttachments, { type ReviewAttachment } from '@/features/nscmf/workflow/ReviewAttachments.vue';
import BusinessTimeline from '@/features/nscmf/BusinessTimeline.vue';
import AppLayout from '@/layouts/AppLayout.vue';

export type { NscmfDetailRecord };
defineProps<{ record: NscmfDetailRecord; attachments: ReviewAttachment[] }>();
const { can } = usePermissions();
</script>

<template>
    <AppLayout :title="record.request_no">
        <RecordDetail :record="record">
            <template #actions>
                <LifecycleActions :record="record" />
            </template>
            <template #timeline>
                <BusinessTimeline
                    v-if="can('nscmf.timeline.view')"
                    :key="`${record.id}-${record.record_version}`"
                    :record-id="record.id"
                />
                <p v-else class="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                    You do not have permission to view this timeline.
                </p>
            </template>
            <template #attachments>
                <ReviewAttachments :attachments="attachments" />
            </template>
        </RecordDetail>
    </AppLayout>
</template>
