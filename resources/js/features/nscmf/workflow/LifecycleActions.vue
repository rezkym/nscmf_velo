<script setup lang="ts">
import { computed } from 'vue';

import { usePermissions } from '@/composables/usePermissions';
import { STATUS_LABELS, type NscmfDetailRecord } from '@/features/nscmf/types';
import RecordActions, { type RecordActionSpec } from '@/features/nscmf/workflow/RecordActions.vue';

/**
 * Cancel, Reopen and Archive/Unarchive on a record (05; 12 §31, §40–42). Each is offered only in
 * the state it applies to and only when the server lists it in allowed_actions.
 */
const props = defineProps<{ record: NscmfDetailRecord }>();
const { can } = usePermissions();

const TERMINAL = ['APPROVED', 'REJECTED', 'CANCELLED'];
const REOPEN_CONSEQUENCE =
    'A new workflow iteration starts under the same Request No. Earlier sign-offs stay in the Timeline.';

const status = computed(() => props.record.business_status);
const neverSubmitted = computed(() => status.value === 'DRAFT' && props.record.requested_by === null);
const reopenable = computed(() => ['APPROVED', 'REJECTED'].includes(status.value));

const actions = computed<RecordActionSpec[]>(() => {
    const offered: RecordActionSpec[] = [];
    if (neverSubmitted.value) {
        offered.push({
            key: 'cancel',
            permission: 'nscmf.cancel',
            label: 'Cancel Draft',
            path: 'cancel',
            consequence:
                'The Draft becomes Cancelled and cannot be submitted or reopened. It is not deleted. Unsaved changes in an open editor are not saved.',
            destination: 'Cancelled',
            variant: 'destructive',
            input: 'optional-reason',
        });
    }
    if (reopenable.value && !props.record.is_archived) {
        offered.push(
            {
                key: 'reopen-revision',
                permission: 'nscmf.reopen',
                label: 'Reopen for Revision',
                path: 'reopen',
                consequence: REOPEN_CONSEQUENCE,
                destination: 'Revision Required',
                variant: 'secondary',
                input: 'reason',
                payload: { destination_status: 'REVISION_REQUIRED' },
            },
            {
                key: 'reopen-review',
                permission: 'nscmf.reopen',
                label: 'Reopen for Review',
                path: 'reopen',
                consequence: REOPEN_CONSEQUENCE,
                destination: 'Pending Review',
                variant: 'secondary',
                input: 'reason',
                payload: { destination_status: 'PENDING_REVIEW' },
            },
        );
    }
    if (TERMINAL.includes(status.value)) {
        const label = STATUS_LABELS[status.value];
        offered.push(
            props.record.is_archived
                ? {
                      key: 'unarchive',
                      permission: 'nscmf.archive',
                      hint: 'nscmf.unarchive',
                      label: 'Unarchive',
                      path: 'unarchive',
                      consequence: `The record returns to the default History view. The status stays ${label}.`,
                      variant: 'secondary',
                      input: 'reason',
                  }
                : {
                      key: 'archive',
                      permission: 'nscmf.archive',
                      label: 'Archive',
                      path: 'archive',
                      consequence: `The status stays ${label}. The record leaves the default History view; it is not deleted.`,
                      variant: 'secondary',
                      input: 'reason',
                  },
        );
    }
    return offered;
});
</script>

<template>
    <div class="space-y-2">
        <RecordActions
            :record-id="record.id"
            :request-no="record.request_no"
            :record-version="record.record_version"
            :allowed-actions="record.allowed_actions ?? []"
            :actions="actions"
            testid-prefix="lifecycle"
        />
        <p
            v-if="record.is_archived && reopenable && can('nscmf.reopen')"
            data-testid="lifecycle-unarchive-first"
            class="text-sm text-muted-foreground"
        >
            Unarchive this record before you reopen it.
        </p>
    </div>
</template>
