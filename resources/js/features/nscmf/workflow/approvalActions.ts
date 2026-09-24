import type { RecordActionSpec } from '@/features/nscmf/workflow/RecordActions.vue';

/** The four Approval decisions (05 approval transitions; 12 §35–39): one endpoint each. */
export const APPROVAL_ACTIONS: readonly RecordActionSpec[] = [
    {
        key: 'approve',
        permission: 'nscmf.approve',
        label: 'Approve NSCMF',
        path: 'approval/approve',
        consequence: 'One approval is enough. This NSCMF becomes Approved.',
        destination: 'Approved',
        input: 'comment',
    },
    {
        key: 'return-reviewer',
        permission: 'nscmf.approval.return_reviewer',
        label: 'Return to Reviewer',
        path: 'approval/return-reviewer',
        consequence: 'The reviewer pool reviews it again; the current Reviewed By is cleared.',
        destination: 'Pending Review',
        variant: 'secondary',
        input: 'reason',
    },
    {
        key: 'return-requester',
        permission: 'nscmf.approval.return_requester',
        label: 'Return to Requester',
        path: 'approval/return-requester',
        consequence: 'The requester can revise and resubmit this NSCMF.',
        destination: 'Revision Required',
        variant: 'secondary',
        input: 'reason',
    },
    {
        key: 'reject',
        permission: 'nscmf.approval.reject',
        label: 'Reject NSCMF',
        path: 'approval/reject',
        consequence: 'This NSCMF will be rejected.',
        destination: 'Rejected',
        variant: 'destructive',
        input: 'reason',
    },
];
