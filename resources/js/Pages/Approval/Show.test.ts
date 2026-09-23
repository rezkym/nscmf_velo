import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NscmfDetailRecord } from '@/features/nscmf/types';
import { lastRequest, requests, resetInertia, respondToRequest } from '@/testing/inertia';

import Show from './Show.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const APPROVAL = [
    'nscmf.approve',
    'nscmf.approval.return_reviewer',
    'nscmf.approval.return_requester',
    'nscmf.approval.reject',
];

const RECORD: NscmfDetailRecord = {
    id: 55,
    request_no: 'DEMO-CHG-005',
    request_date: '2026-09-15',
    business_status: 'PENDING_APPROVAL',
    record_version: 9,
    is_archived: false,
    owner: { id: 1, name: 'Demo Requester A' },
    team: { id: 1, name: 'Demo Team Alpha' },
    requested_by: { id: 1, name: 'Demo Requester A' },
    first_submitted_at: '2026-09-15T09:00:00+07:00',
    reviewed_by: { id: 5, name: 'Demo Multi Role' },
    reviewed_at: '2026-09-15T10:00:00+07:00',
    approved_by: null,
    approved_at: null,
    allowed_actions: APPROVAL,
    family: 'CHANGE',
    subtype: 'MAINTENANCE',
    change: {},
};

function mountShow(record: Partial<NscmfDetailRecord> = {}): VueWrapper {
    return mount(Show, {
        props: { record: { ...RECORD, ...record }, attachments: [] },
        attachTo: document.body,
    });
}

async function confirm(wrapper: VueWrapper, action: string, text: string): Promise<void> {
    await wrapper.get(`[data-testid="approval-${action}"]`).trigger('click');
    await wrapper.get('[role="dialog"] textarea').setValue(text);
    await wrapper.get('[data-test="confirm-button"]').trigger('click');
}

beforeEach(() => resetInertia({ auth: { permissions: ['nscmf.view', 'nscmf.timeline.view', ...APPROVAL] } }));

describe('Approval detail (FE-33)', () => {
    it('AC1: four decisions post to their own endpoints with an exact body and destination', async () => {
        const wrapper = mountShow();

        await wrapper.get('[data-testid="approval-approve"]').trigger('click');
        expect(wrapper.get('[role="dialog"]').text()).toContain('Approved');
        await wrapper.get('[data-test="confirm-button"]').trigger('click');
        expect(lastRequest('/nscmf/55/approval/approve')?.data).toEqual({ record_version: 9, comment: '' });
        await respondToRequest(lastRequest('/nscmf/55/approval/approve'), { status: 200 });

        for (const [key, path, destination] of [
            ['return-reviewer', 'return-reviewer', 'Pending Review'],
            ['return-requester', 'return-requester', 'Revision Required'],
            ['reject', 'reject', 'Rejected'],
        ] as const) {
            await wrapper.get(`[data-testid="approval-${key}"]`).trigger('click');
            expect(wrapper.get('[role="dialog"]').text()).toContain(destination);
            await wrapper.get('[role="dialog"] textarea').setValue('Needs another look.');
            await wrapper.get('[data-test="confirm-button"]').trigger('click');
            expect(lastRequest(`/nscmf/55/approval/${path}`)?.data).toEqual({
                record_version: 9,
                reason: 'Needs another look.',
            });
            await respondToRequest(lastRequest(`/nscmf/55/approval/${path}`), { status: 200 });
        }
        expect(requests.map((request) => request.url)).not.toContain('/nscmf/55/status');
    });

    it('AC1: a return or reject needs a reason of at least five characters', async () => {
        const wrapper = mountShow();
        await confirm(wrapper, 'reject', 'no');

        expect(wrapper.get('[role="dialog"]').text()).toContain('Reason must be at least 5 characters');
        expect(requests).toHaveLength(0);
    });

    it('AC2: the reviewer of this record may approve it when the server allows it', () => {
        resetInertia({ auth: { user: { id: 5 }, permissions: APPROVAL } });
        const wrapper = mountShow();

        expect(wrapper.find('[data-testid="approval-approve"]').exists()).toBe(true);
    });

    it('AC2: shows only what the server allows and the actor holds', () => {
        resetInertia({ auth: { permissions: ['nscmf.approve', 'nscmf.approval.reject'] } });
        const wrapper = mountShow({ allowed_actions: ['nscmf.approve', 'nscmf.approval.return_reviewer'] });

        expect(wrapper.find('[data-testid="approval-approve"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="approval-reject"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="approval-return-reviewer"]').exists()).toBe(false);
    });

    it('AC2: offers nothing once the record left Pending Approval or was archived', () => {
        for (const change of [{ business_status: 'APPROVED' as const }, { is_archived: true }]) {
            const wrapper = mountShow(change);
            expect(wrapper.find('[data-testid="approval-approve"]').exists()).toBe(false);
            expect(wrapper.text()).toContain('no longer available for approval');
            wrapper.unmount();
        }
    });

    it('AC3: shows the effective sign-offs the server projects, including a cleared review', () => {
        const wrapper = mountShow({ reviewed_by: null, reviewed_at: null });

        expect(wrapper.get('[data-testid="signoff-reviewed-by"]').text()).toContain('—');
        expect(wrapper.get('[data-testid="signoff-reviewed-by"]').text()).not.toContain('Demo Multi Role');
    });

    it('AC4: a lost race is a conflict with a refresh, never a success or a retry', async () => {
        const wrapper = mountShow();
        await confirm(wrapper, 'approve', '');
        await respondToRequest(lastRequest('/nscmf/55/approval/approve'), {
            status: 409,
            data: { code: 'NSCMF_STATE_CONFLICT' },
        });

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="approval-refresh"]').text()).toBe('Refresh record');
        expect(wrapper.get<HTMLButtonElement>('[data-testid="approval-approve"]').element.disabled).toBe(true);
        expect(requests).toHaveLength(1);
        expect(wrapper.text()).not.toMatch(/signed/i);
    });

    it('AC5: a validation error keeps the dialog and the typed reason', async () => {
        const wrapper = mountShow();
        await confirm(wrapper, 'return-requester', 'Please attach the plan.');
        await respondToRequest(lastRequest('/nscmf/55/approval/return-requester'), {
            status: 200,
            errors: { reason: 'The reason is too vague.' },
        });

        expect(wrapper.get('[role="dialog"]').text()).toContain('The reason is too vague.');
        expect(wrapper.get<HTMLTextAreaElement>('[role="dialog"] textarea').element.value).toBe(
            'Please attach the plan.',
        );
    });

    it('links back to the approval queue', () => {
        const wrapper = mountShow();

        expect(wrapper.get('#main-content a[href="/approval"]').text()).toBe('Back to approval queue');
    });
});
