import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { lastRequest, requests, resetInertia, respondToRequest, router } from '@/testing/inertia';
import ReviewActions from './ReviewActions.vue';
import type { ReviewActionsProps } from './ReviewActions.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const permissions = ['nscmf.review.return', 'nscmf.review.reject', 'nscmf.review.forward'];
const baseProps: ReviewActionsProps = {
    recordId: 42,
    requestNo: 'NSCMF-2026-042',
    recordVersion: 7,
    businessStatus: 'PENDING_REVIEW',
    archived: false,
    family: 'ACTIVATION',
    allowedActions: permissions,
};

function mountActions(overrides: Partial<ReviewActionsProps> = {}) {
    return mount(ReviewActions, { props: { ...baseProps, ...overrides }, attachTo: document.body });
}

async function openAction(wrapper: ReturnType<typeof mountActions>, action: 'return' | 'reject' | 'forward') {
    await wrapper.get(`[data-testid="review-${action}"]`).trigger('click');
    return wrapper.get('[role="dialog"]');
}

beforeEach(() => resetInertia({ auth: { permissions } }));

describe('ReviewActions (FE-31)', () => {
    it('shows exact actions only for effective permission, allowed hint, current review state and no archive', async () => {
        const wrapper = mountActions();
        expect(wrapper.text()).toContain('Return for Revision');
        expect(wrapper.text()).toContain('Reject NSCMF');
        expect(wrapper.text()).toContain('Forward to Approval');
        await wrapper.setProps({ allowedActions: ['nscmf.review.return'] });
        expect(wrapper.find('[data-testid="review-reject"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="review-forward"]').exists()).toBe(false);
        await wrapper.setProps({ archived: true });
        expect(wrapper.find('[data-testid="review-return"]').exists()).toBe(false);
        wrapper.unmount();

        resetInertia({ auth: { permissions: ['nscmf.review.reject'] } });
        const permissionWrapper = mountActions();
        expect(permissionWrapper.find('[data-testid="review-return"]').exists()).toBe(false);
        expect(permissionWrapper.find('[data-testid="review-reject"]').exists()).toBe(true);
        permissionWrapper.unmount();

        const stateWrapper = mountActions({ businessStatus: 'PENDING_APPROVAL' });
        expect(stateWrapper.find('[data-testid="review-reject"]').exists()).toBe(false);
        stateWrapper.unmount();
    });

    it.each([
        ['return', 'Return for Revision', 'Revision Required'],
        ['reject', 'Reject NSCMF', 'Rejected'],
    ] as const)('posts %s with only record version and trimmed required reason', async (action, label, destination) => {
        const wrapper = mountActions();
        const dialog = await openAction(wrapper, action);
        expect(dialog.text()).toContain('Request No: NSCMF-2026-042');
        expect(dialog.text()).toContain(destination);
        expect(dialog.get('[data-test="confirm-button"]').text()).toBe(label);
        await dialog.get('textarea').setValue('  valid reason  ');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(lastRequest(`/nscmf/42/review/${action}`)).toMatchObject({
            method: 'post',
            data: { record_version: 7, reason: 'valid reason' },
        });
        expect(requests).toHaveLength(1);
        wrapper.unmount();
    });

    it('keeps required validation in the dialog and accepts the 5 and 2000 character boundaries', async () => {
        const wrapper = mountActions();
        const dialog = await openAction(wrapper, 'reject');
        for (const input of ['   ', 'abcd', 'a'.repeat(2001)]) {
            await dialog.get('textarea').setValue(input);
            await dialog.get('[data-test="confirm-button"]').trigger('click');
            expect(requests).toHaveLength(0);
        }
        await dialog.get('textarea').setValue('abcde');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(requests).toHaveLength(1);
        await respondToRequest(lastRequest('/nscmf/42/review/reject'), {
            status: 200,
            errors: { reason: 'Try again' },
        });
        await dialog.get('textarea').setValue('a'.repeat(2000));
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(requests).toHaveLength(2);
        wrapper.unmount();
    });

    it('posts Forward with an optional trimmed comment and blocks oversized comment in the dialog', async () => {
        const wrapper = mountActions();
        const dialog = await openAction(wrapper, 'forward');
        await dialog.get('textarea').setValue('a'.repeat(2001));
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(requests).toHaveLength(0);
        await dialog.get('textarea').setValue('  Ready  ');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(lastRequest('/nscmf/42/review/forward')?.data).toEqual({ record_version: 7, comment: 'Ready' });
        await respondToRequest(lastRequest('/nscmf/42/review/forward'), { status: 200, errors: { comment: 'Retry' } });
        await dialog.get('textarea').setValue('');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(lastRequest('/nscmf/42/review/forward')?.data).toEqual({ record_version: 7, comment: '' });
        wrapper.unmount();
    });

    it('uses parent Change readiness only for Forward while Activation can forward', () => {
        const change = mountActions({
            family: 'CHANGE',
            changeForwardReady: false,
            changeForwardReason: 'Complete a Result row first.',
        });
        expect(change.get<HTMLButtonElement>('[data-testid="review-forward"]').element.disabled).toBe(true);
        expect(change.text()).toContain('Complete a Result row first.');
        expect(change.get<HTMLButtonElement>('[data-testid="review-return"]').element.disabled).toBe(false);
        change.unmount();
        const ready = mountActions({ family: 'CHANGE', changeForwardReady: true });
        expect(ready.get<HTMLButtonElement>('[data-testid="review-forward"]').element.disabled).toBe(false);
        ready.unmount();
        const activation = mountActions({ family: 'ACTIVATION', changeForwardReady: false });
        expect(activation.get<HTMLButtonElement>('[data-testid="review-forward"]').element.disabled).toBe(false);
        activation.unmount();
    });

    it('does not submit on opening or cancelling and does not reuse text between actions', async () => {
        const wrapper = mountActions();
        let dialog = await openAction(wrapper, 'return');
        await dialog.get('textarea').setValue('old reason');
        await dialog.get('[data-test="cancel-button"]').trigger('click');
        expect(requests).toHaveLength(0);
        dialog = await openAction(wrapper, 'reject');
        expect((dialog.get('textarea').element as HTMLTextAreaElement).value).toBe('');
        wrapper.unmount();
    });

    it('guards stale permission and state while a dialog is open', async () => {
        const wrapper = mountActions();
        const dialog = await openAction(wrapper, 'return');
        await dialog.get('textarea').setValue('valid reason');
        await wrapper.setProps({ businessStatus: 'REJECTED' });
        if (wrapper.find('[data-test="confirm-button"]').exists()) {
            await wrapper.get('[data-test="confirm-button"]').trigger('click');
        }
        expect(requests).toHaveLength(0);
        wrapper.unmount();

        const second = mountActions();
        await openAction(second, 'forward');
        resetInertia({ auth: { permissions: [] } });
        await nextTick();
        if (second.find('[data-test="confirm-button"]').exists()) {
            await second.get('[data-test="confirm-button"]').trigger('click');
        }
        expect(requests).toHaveLength(0);
        second.unmount();
    });

    it('permits one pending mutation and retains text plus safe field error after validation redirect', async () => {
        const wrapper = mountActions();
        const dialog = await openAction(wrapper, 'return');
        await dialog.get('textarea').setValue('valid reason');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        expect(wrapper.get<HTMLButtonElement>('[data-testid="review-reject"]').element.disabled).toBe(true);
        expect(dialog.get<HTMLButtonElement>('[data-test="confirm-button"]').element.disabled).toBe(true);
        await respondToRequest(lastRequest('/nscmf/42/review/return'), {
            status: 200,
            errors: { reason: '<script>alert(1)</script>' },
        });
        expect((dialog.get('textarea').element as HTMLTextAreaElement).value).toBe('valid reason');
        expect(dialog.text()).toContain('<script>alert(1)</script>');
        expect(dialog.find('script').exists()).toBe(false);
        expect(requests).toHaveLength(1);
        wrapper.unmount();
    });

    it.each(['NSCMF_VERSION_CONFLICT', 'NSCMF_STATE_CONFLICT', 'NSCMF_ARCHIVED_CONFLICT'])(
        'latches %s and refreshes without replay',
        async (code) => {
            const wrapper = mountActions();
            const dialog = await openAction(wrapper, 'forward');
            await dialog.get('[data-test="confirm-button"]').trigger('click');
            await respondToRequest(lastRequest('/nscmf/42/review/forward'), {
                status: 200,
                flash: { domain_error: { code, message: 'Record changed. Refresh it.' } },
            });
            expect(wrapper.text()).toContain('Record changed. Refresh it.');
            await wrapper.get('[data-testid="review-refresh"]').trigger('click');
            expect(router.reload).toHaveBeenCalledTimes(1);
            const reloadOptions = router.reload.mock.calls[0]?.[0];
            reloadOptions?.onSuccess?.();
            await nextTick();
            expect(requests).toHaveLength(1);
            wrapper.unmount();
        },
    );

    it('handles a real HTTP exception and network failure without claiming success', async () => {
        const wrapper = mountActions();
        let dialog = await openAction(wrapper, 'forward');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        await respondToRequest(lastRequest('/nscmf/42/review/forward'), {
            status: 403,
            isInertia: false,
            data: { code: 'FORBIDDEN', message: 'Private reason' },
        });
        expect(dialog.text()).toContain('Access denied');
        expect(dialog.text()).not.toContain('Private reason');
        expect(dialog.get<HTMLButtonElement>('[data-test="confirm-button"]').element.disabled).toBe(false);
        await dialog.get('[data-test="cancel-button"]').trigger('click');
        dialog = await openAction(wrapper, 'reject');
        await dialog.get('textarea').setValue('valid reason');
        await dialog.get('[data-test="confirm-button"]').trigger('click');
        const request = lastRequest('/nscmf/42/review/reject');
        request?.options.onNetworkError?.(new Error('secret network trace'));
        request?.options.onFinish?.();
        await nextTick();
        expect(dialog.text()).toContain('Network connection lost');
        expect(dialog.text()).not.toContain('secret network trace');
        expect(dialog.get<HTMLButtonElement>('[data-test="confirm-button"]').element.disabled).toBe(false);
        wrapper.unmount();
    });
});
