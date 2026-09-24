<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

import { Button } from '@/components/ui/button';
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
    <section
        v-if="canEdit || canUpdateResults || canReview || canApprove || waitingForRequester"
        aria-label="Next step"
        class="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
        <p class="font-medium text-heading">Next step</p>
        <Button v-if="canEdit" as-child>
            <Link data-testid="next-step-edit" :href="editPath">
                {{ record.business_status === 'REVISION_REQUIRED' ? 'Revise and Resubmit' : 'Edit Draft' }}
            </Link>
        </Button>
        <Button v-if="canUpdateResults" as-child>
            <Link data-testid="next-step-results" :href="editPath">Update Result of Changes</Link>
        </Button>
        <Button v-if="canReview" as-child>
            <Link data-testid="next-step-review" :href="`/review/${record.id}`">Open Review</Link>
        </Button>
        <Button v-if="canApprove" as-child>
            <Link data-testid="next-step-approval" :href="`/approval/${record.id}`">Open Approval</Link>
        </Button>
        <p v-if="waitingForRequester" data-testid="next-step-waiting" class="text-muted-foreground">
            Waiting for the requester to revise and resubmit this record.
        </p>
    </section>
</template>
