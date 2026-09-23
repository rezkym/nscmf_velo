import { mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NscmfDetailRecord } from '@/features/nscmf/types';
import { lastRequest, requests, resetInertia, respondToRequest } from '@/testing/inertia';

import LifecycleActions from './LifecycleActions.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const PERMISSIONS = ['nscmf.cancel', 'nscmf.reopen', 'nscmf.archive'];

const RECORD: NscmfDetailRecord = {
    id: 77,
    request_no: 'DEMO-ACT-005',
    request_date: '2026-09-05',
    business_status: 'APPROVED',
    record_version: 4,
    is_archived: false,
    owner: { id: 1, name: 'Demo Requester A' },
    team: { id: 1, name: 'Demo Team Alpha' },
    requested_by: { id: 1, name: 'Demo Requester A' },
    first_submitted_at: '2026-09-05T09:00:00+07:00',
    reviewed_by: null,
    reviewed_at: null,
    approved_by: null,
    approved_at: null,
    allowed_actions: ['nscmf.reopen', 'nscmf.archive'],
    family: 'ACTIVATION',
    subtype: 'ACTIVATION',
    activation: {},
};

const DRAFT: Partial<NscmfDetailRecord> = {
    business_status: 'DRAFT',
    requested_by: null,
    first_submitted_at: null,
    allowed_actions: ['edit_draft', 'submit', 'nscmf.cancel'],
};

function mountActions(record: Partial<NscmfDetailRecord> = {}): VueWrapper {
    return mount(LifecycleActions, { props: { record: { ...RECORD, ...record } }, attachTo: document.body });
}

async function confirm(wrapper: VueWrapper, action: string, text: string): Promise<void> {
    await wrapper.get(`[data-testid="lifecycle-${action}"]`).trigger('click');
    await wrapper.get('[role="dialog"] textarea').setValue(text);
    await wrapper.get('[data-test="confirm-button"]').trigger('click');
}

function offered(wrapper: VueWrapper): string[] {
    return wrapper.findAll('button[data-testid^="lifecycle-"]').map((button) => button.attributes('data-testid') ?? '');
}

beforeEach(() => resetInertia({ auth: { permissions: PERMISSIONS } }));

describe('Cancel Draft (FE-34)', () => {
    it('AC1: is offered for a never-submitted Draft only', () => {
        expect(offered(mountActions(DRAFT))).toEqual(['lifecycle-cancel']);
        expect(
            offered(
                mountActions({ ...DRAFT, business_status: 'REVISION_REQUIRED', requested_by: RECORD.requested_by }),
            ),
        ).toEqual([]);
        expect(offered(mountActions({ ...DRAFT, requested_by: RECORD.requested_by }))).toEqual([]);
    });

    it('AC2: the reason is optional, capped at 2000, and one confirm sends one request', async () => {
        const wrapper = mountActions(DRAFT);
        await confirm(wrapper, 'cancel', 'x'.repeat(2001));
        expect(wrapper.get('[role="dialog"]').text()).toContain('Reason cannot exceed 2000 characters');
        expect(requests).toHaveLength(0);

        await wrapper.get('[role="dialog"] textarea').setValue('');
        await wrapper.get('[data-test="confirm-button"]').trigger('click');
        await wrapper.find('[data-test="confirm-button"]').trigger('click');
        expect(requests).toHaveLength(1);
        expect(lastRequest('/nscmf/77/cancel')?.data).toEqual({ record_version: 4 });
    });

    it('AC2: explains that cancelling is final and not a delete', async () => {
        const wrapper = mountActions(DRAFT);
        await wrapper.get('[data-testid="lifecycle-cancel"]').trigger('click');

        expect(wrapper.get('[role="dialog"]').text()).toContain('Cancelled');
        expect(wrapper.get('[role="dialog"]').text()).toMatch(/cannot be submitted or reopened/i);
    });

    it('AC3: a Cancelled record offers neither cancel nor reopen', () => {
        const wrapper = mountActions({
            ...DRAFT,
            business_status: 'CANCELLED',
            allowed_actions: ['nscmf.archive'],
        });

        expect(offered(wrapper)).toEqual(['lifecycle-archive']);
    });

    it('AC4: a conflict offers a refresh and never resubmits', async () => {
        const wrapper = mountActions(DRAFT);
        await confirm(wrapper, 'cancel', '');
        await respondToRequest(lastRequest('/nscmf/77/cancel'), {
            status: 409,
            data: { code: 'NSCMF_VERSION_CONFLICT' },
        });

        expect(wrapper.get('[data-testid="lifecycle-refresh"]').exists()).toBe(true);
        expect(requests).toHaveLength(1);
    });
});

describe('Reopen (FE-35)', () => {
    it('AC1: offers exactly two destinations, each with a mandatory reason and the exact body', async () => {
        const wrapper = mountActions();
        expect(offered(wrapper)).toEqual(['lifecycle-reopen-revision', 'lifecycle-reopen-review', 'lifecycle-archive']);

        await confirm(wrapper, 'reopen-review', 'Scope');
        expect(wrapper.get('[role="dialog"]').text()).toContain('Reason must be at least 5 characters');
        await wrapper.get('[role="dialog"] textarea').setValue('Customer changed the scope.');
        await wrapper.get('[data-test="confirm-button"]').trigger('click');
        expect(lastRequest('/nscmf/77/reopen')?.data).toEqual({
            record_version: 4,
            reason: 'Customer changed the scope.',
            destination_status: 'PENDING_REVIEW',
        });
        await respondToRequest(lastRequest('/nscmf/77/reopen'), { status: 200 });

        await confirm(wrapper, 'reopen-revision', 'Customer changed the scope.');
        expect(lastRequest('/nscmf/77/reopen')?.data).toMatchObject({ destination_status: 'REVISION_REQUIRED' });
    });

    it('AC1: tells the actor a new workflow iteration starts under the same Request No', async () => {
        const wrapper = mountActions();
        await wrapper.get('[data-testid="lifecycle-reopen-revision"]').trigger('click');

        expect(wrapper.get('[role="dialog"]').text()).toMatch(/new workflow iteration/i);
        expect(wrapper.get('[role="dialog"]').text()).toContain('DEMO-ACT-005');
    });

    it('AC2: an archived record must be unarchived first, with no chained request', () => {
        const wrapper = mountActions({ is_archived: true, allowed_actions: ['nscmf.unarchive'] });

        expect(offered(wrapper)).toEqual(['lifecycle-unarchive']);
        expect(wrapper.get('[data-testid="lifecycle-unarchive-first"]').text()).toMatch(/unarchive.*before.*reopen/i);
        expect(requests).toHaveLength(0);
    });

    it('AC4: never offers reopen for a Cancelled or Draft record, even if a hint says so', () => {
        for (const status of ['CANCELLED', 'DRAFT'] as const) {
            const wrapper = mountActions({ business_status: status, allowed_actions: ['nscmf.reopen'] });
            expect(offered(wrapper)).toEqual([]);
            wrapper.unmount();
        }
    });
});

describe('Archive and unarchive (FE-36)', () => {
    it('AC1: archiving posts only the archive request and says the status stays as it is', async () => {
        const wrapper = mountActions();
        await wrapper.get('[data-testid="lifecycle-archive"]').trigger('click');
        expect(wrapper.get('[role="dialog"]').text()).toMatch(/status stays approved/i);
        expect(wrapper.get('[role="dialog"]').text()).toMatch(/not deleted/i);
        await wrapper.get('[role="dialog"] textarea').setValue('Filed after closure.');
        await wrapper.get('[data-test="confirm-button"]').trigger('click');

        expect(requests.map((request) => request.url)).toEqual(['/nscmf/77/archive']);
        expect(lastRequest('/nscmf/77/archive')?.data).toEqual({ record_version: 4, reason: 'Filed after closure.' });
    });

    it('AC2: a reason of 5 to 2000 characters is required in both directions', async () => {
        for (const [record, action] of [
            [{}, 'archive'],
            [{ is_archived: true, allowed_actions: ['nscmf.unarchive'] }, 'unarchive'],
        ] as const) {
            const wrapper = mountActions(record);
            await confirm(wrapper, action, 'abcd');
            expect(wrapper.get('[role="dialog"]').text()).toContain('Reason must be at least 5 characters');
            await wrapper.get('[role="dialog"] textarea').setValue('x'.repeat(2001));
            await wrapper.get('[data-test="confirm-button"]').trigger('click');
            expect(wrapper.get('[role="dialog"]').text()).toContain('Reason cannot exceed 2000 characters');
            await wrapper.get('[role="dialog"] textarea').setValue('abcde');
            await wrapper.get('[data-test="confirm-button"]').trigger('click');
            expect(lastRequest(`/nscmf/77/${action}`)?.data).toEqual({ record_version: 4, reason: 'abcde' });
            wrapper.unmount();
        }
    });

    it('AC3: unarchiving is not reopening', async () => {
        const wrapper = mountActions({ is_archived: true, allowed_actions: ['nscmf.unarchive'] });
        await confirm(wrapper, 'unarchive', 'Needed again.');

        expect(requests.map((request) => request.url)).toEqual(['/nscmf/77/unarchive']);
    });

    it('AC4: records in progress offer no archive, and a conflict is shown safely', async () => {
        for (const status of ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'REVISION_REQUIRED'] as const) {
            const wrapper = mountActions({ business_status: status, allowed_actions: ['nscmf.archive'] });
            expect(offered(wrapper)).toEqual([]);
            wrapper.unmount();
        }

        const wrapper = mountActions();
        await confirm(wrapper, 'archive', 'Filed after closure.');
        await respondToRequest(lastRequest('/nscmf/77/archive'), {
            status: 409,
            data: { code: 'NSCMF_STATE_CONFLICT' },
        });
        expect(wrapper.text()).toContain('This record changed. Refresh it before another action.');
    });
});
