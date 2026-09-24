<script setup lang="ts">
import type { AttachmentItem } from '@/features/attachments/AttachmentList.vue';
import AttachmentPanel from '@/features/attachments/AttachmentPanel.vue';
import { router } from '@inertiajs/vue3';
import { computed } from 'vue';

import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import { APPROVAL_ACTIONS } from '@/features/nscmf/workflow/approvalActions';
import RecordActions from '@/features/nscmf/workflow/RecordActions.vue';
import BusinessTimeline from '@/features/nscmf/BusinessTimeline.vue';
import AppLayout from '@/layouts/AppLayout.vue';

const props = defineProps<{ record: NscmfDetailRecord; attachments: AttachmentItem[] }>();
const { can } = usePermissions();

const approvable = computed(() => props.record.business_status === 'PENDING_APPROVAL' && !props.record.is_archived);
const permitted = computed(() => APPROVAL_ACTIONS.some((action) => can(action.permission)));
</script>

<template>
    <AppLayout :title="`Approval · ${record.request_no}`">
        <RecordDetail :record="record" back-href="/approval" back-label="Back to approval queue">
            <template #actions>
                <section aria-label="Approval actions" class="space-y-3 panel p-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <h2 class="font-semibold">Approval</h2>
                        <Button variant="secondary" @click="router.reload()">Refresh details</Button>
                    </div>
                    <p v-if="!approvable" class="text-sm text-muted-foreground">
                        This record is no longer available for approval. Its current details are shown below.
                    </p>
                    <p v-else-if="!permitted" class="text-sm text-muted-foreground">
                        You can read this record but do not have permission to perform an approval action.
                    </p>
                    <RecordActions
                        :record-id="record.id"
                        :request-no="record.request_no"
                        :record-version="record.record_version"
                        :allowed-actions="record.allowed_actions ?? []"
                        :actions="approvable ? APPROVAL_ACTIONS : []"
                        testid-prefix="approval"
                        failure-message="The approval action could not be completed."
                    />
                </section>
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
