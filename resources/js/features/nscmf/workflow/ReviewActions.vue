<script setup lang="ts">
import { computed } from 'vue';

import type { BusinessStatus } from '@/features/nscmf/contracts';
import RecordActions, { type RecordActionSpec } from '@/features/nscmf/workflow/RecordActions.vue';

export interface ReviewActionsProps {
    recordId: number;
    requestNo: string;
    recordVersion: number;
    businessStatus: BusinessStatus;
    archived: boolean;
    allowedActions: string[];
}

const props = defineProps<ReviewActionsProps>();

const reviewable = computed(() => props.businessStatus === 'PENDING_REVIEW' && !props.archived);

const actions = computed<RecordActionSpec[]>(() =>
    reviewable.value
        ? [
              {
                  key: 'return',
                  permission: 'nscmf.review.return',
                  label: 'Return for Revision',
                  path: 'review/return',
                  consequence: 'The requester can revise and resubmit this NSCMF.',
                  destination: 'Revision Required',
                  variant: 'outline',
                  input: 'reason',
              },
              {
                  key: 'reject',
                  permission: 'nscmf.review.reject',
                  label: 'Reject NSCMF',
                  path: 'review/reject',
                  consequence: 'This NSCMF will be rejected.',
                  destination: 'Rejected',
                  variant: 'destructive',
                  input: 'reason',
              },
              {
                  key: 'forward',
                  permission: 'nscmf.review.forward',
                  label: 'Forward to Approval',
                  path: 'review/forward',
                  consequence: 'The approver pool can review this NSCMF.',
                  destination: 'Pending Approval',
                  input: 'comment',
              },
          ]
        : [],
);
</script>

<template>
    <RecordActions
        :record-id="recordId"
        :request-no="requestNo"
        :record-version="recordVersion"
        :allowed-actions="allowedActions"
        :actions="actions"
        testid-prefix="review"
        failure-message="The review action could not be completed."
    />
</template>
