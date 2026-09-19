import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import OneTimeCredential from './OneTimeCredential.vue';

const SYNTHETIC_PASSWORD = 'test-only-not-a-real-password';

function mockClipboard(writeText: (text: string) => Promise<void>) {
    const spy = vi.fn(writeText);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: spy }, configurable: true });
    return spy;
}

function mountOpen(temporaryPassword: string | null = SYNTHETIC_PASSWORD) {
    return mount(OneTimeCredential, {
        props: { open: true, temporaryPassword, username: 'demo.requester.a' },
        attachTo: document.body,
    });
}

describe('OneTimeCredential (FE-13)', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('shows the temporary password once, for the named user, with handling instructions', () => {
        const wrapper = mountOpen();

        expect(wrapper.get('[data-testid="temporary-password-display"]').text()).toBe(SYNTHETIC_PASSWORD);
        expect(wrapper.text()).toContain('demo.requester.a');
        expect(wrapper.text()).toContain('shown only once');
        expect(wrapper.text()).toContain('internal channel');
    });

    it('renders nothing while closed', () => {
        const wrapper = mount(OneTimeCredential, { props: { open: false, temporaryPassword: SYNTHETIC_PASSWORD } });

        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain(SYNTHETIC_PASSWORD);
    });

    it('AC1: emits dismiss from the Done button and Escape, and never shows a cleared password again', async () => {
        const wrapper = mountOpen();

        await wrapper.get('[data-testid="btn-dismiss-credential"]').trigger('click');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(wrapper.emitted('dismiss')).toHaveLength(2);

        await wrapper.setProps({ temporaryPassword: null });
        expect(wrapper.text()).not.toContain(SYNTHETIC_PASSWORD);
        expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);
    });

    it('AC3: copies only on request and reports success', async () => {
        const writeText = mockClipboard(() => Promise.resolve());
        const wrapper = mountOpen();
        expect(writeText).not.toHaveBeenCalled();

        await wrapper.get('[data-testid="btn-copy-credential"]').trigger('click');
        await flushPromises();

        expect(writeText).toHaveBeenCalledWith(SYNTHETIC_PASSWORD);
        expect(wrapper.get('[data-testid="btn-copy-credential"]').text()).toBe('Copied');
    });

    it('AC3: shows a safe message when copying fails', async () => {
        mockClipboard(() => Promise.reject(new Error('denied')));
        const wrapper = mountOpen();

        await wrapper.get('[data-testid="btn-copy-credential"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="clipboard-feedback"]').text()).toBe(
            'Copy failed. Select the password and copy it manually.',
        );
        expect(wrapper.get('[data-testid="clipboard-feedback"]').text()).not.toContain('denied');
    });

    it('clears copy feedback when the dialog is opened again', async () => {
        mockClipboard(() => Promise.reject(new Error('denied')));
        const wrapper = mountOpen();
        await wrapper.get('[data-testid="btn-copy-credential"]').trigger('click');
        await flushPromises();

        await wrapper.setProps({ open: false });
        await wrapper.setProps({ open: true, temporaryPassword: 'another-test-password' });
        await nextTick();

        expect(wrapper.find('[data-testid="clipboard-feedback"]').exists()).toBe(false);
    });

    it('AC2/AC4: without a password it explains that a new reset is required instead of offering retrieval', () => {
        const wrapper = mountOpen(null);

        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-copy-credential"]').exists()).toBe(false);
        expect(wrapper.get('[data-testid="credential-lost-advisory"]').text()).toContain('Reset password again');
    });
});
