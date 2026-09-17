import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import OneTimeCredential from './OneTimeCredential.vue';

describe('OneTimeCredential (FE-13)', () => {
    // AC1: credential_is_once_only: dismiss lalu reopen component tidak menampilkan credential lama.
    it('AC1: credential_is_once_only - dismiss lalu reopen component tidak menampilkan credential lama', async () => {
        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: 'synthetic-temp-pass-1234',
                username: 'alice.test',
            },
        });

        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="temporary-password-display"]').text()).toContain('synthetic-temp-pass-1234');

        // Dismiss the modal
        const dismissBtn = wrapper.find('[data-testid="btn-dismiss-credential"]');
        expect(dismissBtn.exists()).toBe(true);
        await dismissBtn.trigger('click');

        // Emits dismiss/close
        expect(wrapper.emitted('dismiss')).toBeTruthy();

        // Simulate reopening with open: true, but no new password passed (or re-mount / state reset)
        await wrapper.setProps({ open: false });
        await nextTick();
        await wrapper.setProps({ open: true });
        await nextTick();

        // The transient credential MUST be purged / cleared internally once dismissed
        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('synthetic-temp-pass-1234');
    });

    // AC2: credential_is_not_in_user_detail: subsequent GET user tidak memiliki 'Show temporary password' action.
    it('AC2: credential_is_not_in_user_detail - component provides no retrieve or show-again trigger and advises one-time nature', async () => {
        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: 'synthetic-temp-pass-1234',
                username: 'bob.test',
            },
        });

        // Must display authoritative warning that it cannot be retrieved again
        expect(wrapper.text()).toContain('tidak dapat diambil atau ditampilkan kembali');
        expect(wrapper.find('[data-testid="btn-retrieve-credential"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="btn-show-temporary-password"]').exists()).toBe(false);
    });

    // AC3: credential_copy_handles_failure: clipboard rejection tampil pesan safe, tidak menyalin diam-diam saat mount.
    it('AC3: credential_copy_handles_failure - clipboard rejection tampil pesan safe, tidak menyalin diam-diam saat mount', async () => {
        const writeTextSpy = vi.fn().mockRejectedValue(new Error('Permission denied'));
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextSpy,
            },
        });

        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: 'synthetic-temp-pass-1234',
                username: 'charlie.test',
            },
        });

        // Must NOT copy quietly on mount
        expect(writeTextSpy).not.toHaveBeenCalled();

        // Explicit user click
        const copyBtn = wrapper.find('[data-testid="btn-copy-credential"]');
        expect(copyBtn.exists()).toBe(true);
        await copyBtn.trigger('click');
        await nextTick();

        expect(writeTextSpy).toHaveBeenCalledWith('synthetic-temp-pass-1234');
        // Error state shown safely
        expect(wrapper.find('[data-testid="clipboard-feedback"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="clipboard-feedback"]').text()).toContain('Gagal menyalin ke clipboard');
    });

    // AC4: credential_reset_requires_new_server_result: lost value menyarankan reset baru dengan reauth bukan retrieve.
    it('AC4: credential_reset_requires_new_server_result - lost value menyarankan reset baru dengan reauth bukan retrieve', async () => {
        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: null,
                username: 'dave.test',
            },
        });

        // When opened without active temporary credential, advise initiating a new reset with reauth
        expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('Lakukan reset password baru');
        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
    });
});
