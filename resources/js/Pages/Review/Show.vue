<script setup lang="ts">
import { router } from '@inertiajs/vue3';

import Button from '@/components/ui/Button.vue';
import { usePermissions } from '@/composables/usePermissions';
import RecordDetail from '@/features/nscmf/RecordDetail.vue';
import ReviewAttachments, { type ReviewAttachment } from '@/features/nscmf/workflow/ReviewAttachments.vue';
import ReviewActions from '@/features/nscmf/workflow/ReviewActions.vue';
import BusinessTimeline from '@/features/nscmf/BusinessTimeline.vue';
import type { NscmfDetailRecord } from '@/features/nscmf/types';
import AppLayout from '@/layouts/AppLayout.vue';

defineProps<{
    record: NscmfDetailRecord & { forward_readiness: { ready: boolean; reason: string | null } };
    attachments: ReviewAttachment[];
}>();
const { can } = usePermissions();
</script>

<template>
    <AppLayout :title="`Review · ${record.request_no}`">
        <RecordDetail :record="record" back-href="/review" back-label="Back to review queue">
            <template #actions>
                <section aria-label="Review actions" class="space-y-3 rounded-lg border border-border bg-card p-5">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                        <h2 class="font-semibold">Review</h2>
                        <Button variant="secondary" @click="router.reload()">Refresh details</Button>
                    </div>
                    <p
                        v-if="record.is_archived || record.business_status !== 'PENDING_REVIEW'"
                        class="text-sm text-muted-foreground"
                    >
                        This record is no longer available for review. Its current details are shown below.
                    </p>
                    <p
                        v-else-if="
                            !['nscmf.review.return', 'nscmf.review.reject', 'nscmf.review.forward'].some((permission) =>
                                can(permission),
                            )
                        "
                        class="text-sm text-muted-foreground"
                    >
                        You can read this record but do not have permission to perform a review action.
                    </p>
                    <ReviewActions
                        :record-id="record.id"
                        :request-no="record.request_no"
                        :record-version="record.record_version"
                        :business-status="record.business_status"
                        :archived="record.is_archived"
                        :family="record.family"
                        :allowed-actions="record.allowed_actions ?? []"
                        :change-forward-ready="record.forward_readiness.ready"
                        :change-forward-reason="record.forward_readiness.reason"
                    />
                </section>
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
