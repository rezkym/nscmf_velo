<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

import { buttonVariants } from '@/components/ui/button';
import type { NscmfDetailRecord } from '@/features/nscmf/types';

/**
 * The way from the read-only detail to the page where the record's next step happens (03
 * UF-DRAFT-003, UF-REVIEW-005; 07 §26, §30, §31, §60). Only what the server lists in
 * allowed_actions is offered (12 §24); the pages themselves re-check everything.
 */
const props = defineProps<{ record: NscmfDetailRecord }>();

const allowed = computed(() => props.record.allowed_actions ?? []);
const has = (action: string): boolean => allowed.value.includes(action);
const hasAny = (prefixes: string[]): boolean =>
    allowed.value.some((action) => prefixes.some((prefix) => action === prefix || action.startsWith(`${prefix}.`)));

const editPath = computed(() => `/nscmf/${props.record.id}/edit`);
const canEdit = computed(() => has('edit_draft'));
const canUpdateResults = computed(() => has('edit_results'));
const canReview = computed(() => hasAny(['nscmf.review']));
const canApprove = computed(() => hasAny(['nscmf.approve', 'nscmf.approval']));
const waitingForRequester = computed(() => props.record.business_status === 'REVISION_REQUIRED' && !canEdit.value);
</script>

<template>
    <div
        v-if="canEdit || canUpdateResults || canReview || canApprove || waitingForRequester"
        class="flex flex-wrap items-center gap-2"
    >
        <Link v-if="canEdit" data-testid="next-step-edit" :href="editPath" :class="buttonVariants()">
            {{ record.business_status === 'REVISION_REQUIRED' ? 'Revise and Resubmit' : 'Edit Draft' }}
        </Link>
        <Link v-if="canUpdateResults" data-testid="next-step-results" :href="editPath" :class="buttonVariants()">
            Update Result of Changes
        </Link>
        <Link v-if="canReview" data-testid="next-step-review" :href="`/review/${record.id}`" :class="buttonVariants()">
            Open Review
        </Link>
        <Link
            v-if="canApprove"
            data-testid="next-step-approval"
            :href="`/approval/${record.id}`"
            :class="buttonVariants()"
        >
            Open Approval
        </Link>
        <p v-if="waitingForRequester" data-testid="next-step-waiting" class="text-sm text-muted-foreground">
            Waiting for the requester to revise and resubmit this record.
        </p>
    </div>
</template>
