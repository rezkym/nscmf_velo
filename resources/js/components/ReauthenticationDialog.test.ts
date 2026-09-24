import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendJson } from '@/lib/http';

import ReauthenticationDialog from './ReauthenticationDialog.vue';

// POST /account/re-authenticate is a same-origin JSON endpoint: 204 proof, 403 REAUTH_FAILED (12 §79, §109).
vi.mock('@/lib/http', () => ({ sendJson: vi.fn() }));

const send = vi.mocked(sendJson);

function mountDialog(props: Record<string, unknown> = {}) {
    return mount(ReauthenticationDialog, { props: { open: true, ...props }, attachTo: document.body });
}

async function submitPassword(wrapper: ReturnType<typeof mountDialog>, password = 'MyCurrentSecret'): Promise<void> {
    await wrapper.get('input[type="password"]').setValue(password);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
}

describe('ReauthenticationDialog.vue (FE-10)', () => {
    beforeEach(() => {
        send.mockReset();
        document.body.innerHTML = '';
    });

    it('AC1: posts only current_password as JSON and exposes a single password input', async () => {
        send.mockResolvedValue({ ok: true, status: 204, body: null });
        const wrapper = mountDialog({ targetActionTitle: 'Reset User Password' });

        const inputs = wrapper.findAll('input');
        expect(inputs).toHaveLength(1);
        expect(inputs[0]?.attributes('name')).toBe('current_password');
        expect(inputs[0]?.attributes('autocomplete')).toBe('current-password');

        await submitPassword(wrapper);

        expect(send).toHaveBeenCalledWith('POST', '/account/re-authenticate', { current_password: 'MyCurrentSecret' });
    });

    it('AC2: emits success only after the server answers 204 and never triggers the protected mutation itself', async () => {
        send.mockResolvedValue({ ok: true, status: 204, body: null });
        const wrapper = mountDialog();

        await submitPassword(wrapper);

        expect(wrapper.emitted('success')).toHaveLength(1);
        expect(send).toHaveBeenCalledTimes(1);
        expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('');
    });

    it('withholds success and shows the canonical message on 403 REAUTH_FAILED', async () => {
        send.mockResolvedValue({
            ok: false,
            status: 403,
            error: { code: 'REAUTH_FAILED', message: 'Re-authentication failed. Check your password.' },
        });
        const wrapper = mountDialog();

        await submitPassword(wrapper, 'wrong');

        expect(wrapper.emitted('success')).toBeFalsy();
        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe(
            'Re-authentication failed. Check your password.',
        );
        expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('');
    });

    it('shows the field error from a 422 envelope', async () => {
        send.mockResolvedValue({
            ok: false,
            status: 422,
            error: {
                code: 'VALIDATION_FAILED',
                message: 'Some fields need to be corrected.',
                errors: { current_password: ['The current password field is required.'] },
            },
        });
        const wrapper = mountDialog();

        await submitPassword(wrapper, 'x');

        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe('The current password field is required.');
    });

    it('explains an expired session and a throttle instead of claiming a wrong password', async () => {
        send.mockResolvedValueOnce({
            ok: false,
            status: 401,
            error: { code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' },
        });
        const wrapper = mountDialog();
        await submitPassword(wrapper);
        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe('Your session has expired. Sign in again.');

        send.mockResolvedValueOnce({
            ok: false,
            status: 429,
            error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a minute.' },
        });
        await submitPassword(wrapper);
        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe('Too many attempts. Try again in a minute.');

        send.mockResolvedValueOnce({ ok: false, status: 0, error: null });
        await submitPassword(wrapper);
        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe(
            'Re-authentication could not be completed. Try again.',
        );
        expect(wrapper.emitted('success')).toBeFalsy();
    });

    it('AC4: presents a server-driven REAUTH_REQUIRED passed by the parent', () => {
        const wrapper = mountDialog({ errorCode: 'REAUTH_REQUIRED' });

        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe(
            'Re-authentication is required to perform this action.',
        );
    });

    it('prefers an explicit server message passed by the parent', () => {
        const wrapper = mountDialog({ errorCode: 'REAUTH_FAILED', serverErrorMessage: 'Invalid current password.' });

        expect(wrapper.get('[data-testid="reauth-error"]').text()).toBe('Invalid current password.');
    });

    it('does not submit while a request is pending or when the password is empty', async () => {
        let resolve: (value: Awaited<ReturnType<typeof sendJson>>) => void = () => {};
        send.mockReturnValue(new Promise((done) => (resolve = done)));
        const wrapper = mountDialog();

        await wrapper.get('form').trigger('submit');
        expect(send).not.toHaveBeenCalled();

        await wrapper.get('input[type="password"]').setValue('secret');
        await wrapper.get('form').trigger('submit');
        await wrapper.get('form').trigger('submit');
        expect(send).toHaveBeenCalledTimes(1);

        await wrapper.get('[data-test="cancel-button"]').trigger('click');
        expect(wrapper.emitted('cancel')).toBeFalsy();

        resolve({ ok: true, status: 204, body: null });
        await flushPromises();
        expect(wrapper.emitted('success')).toHaveLength(1);
    });

    it('AC3: cancel clears the password and emits cancel without any request', async () => {
        const wrapper = mountDialog();
        await wrapper.get('input[type="password"]').setValue('typed');

        await wrapper.get('[data-test="cancel-button"]').trigger('click');

        expect(wrapper.emitted('cancel')).toHaveLength(1);
        expect(send).not.toHaveBeenCalled();
        expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('');
    });

    it('clears the typed password when the dialog closes', async () => {
        const wrapper = mountDialog();
        await wrapper.get('input[type="password"]').setValue('typed');

        await wrapper.setProps({ open: false });
        await wrapper.setProps({ open: true });

        expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('');
    });

    it('renders the password field helper text', () => {
        expect(mountDialog().text()).toContain('Enter your existing account password to confirm');
    });

    it('handles keyboard escape and restores focus to the trigger on close', async () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        const focusSpy = vi.spyOn(trigger, 'focus');
        const wrapper = mountDialog({ triggerElement: trigger });

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(wrapper.emitted('cancel')).toBeTruthy();

        await wrapper.setProps({ open: false });
        await flushPromises();
        expect(focusSpy).toHaveBeenCalled();
        wrapper.unmount();
    });

    it('traps Tab focus inside the dialog', async () => {
        const wrapper = mountDialog();
        await wrapper.get('input[type="password"]').setValue('EnteredPassword');

        const passwordInput = wrapper.get('input[type="password"]').element as HTMLInputElement;
        const confirmBtn = wrapper.get('[data-test="confirm-button"]').element as HTMLButtonElement;

        confirmBtn.focus();
        const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        confirmBtn.dispatchEvent(forward);
        expect(document.activeElement).toBe(passwordInput);
        expect(forward.defaultPrevented).toBe(true);

        passwordInput.focus();
        const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
        passwordInput.dispatchEvent(backward);
        expect(document.activeElement).toBe(confirmBtn);
        wrapper.unmount();
    });
});
