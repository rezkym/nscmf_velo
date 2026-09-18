import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import OneTimeCredential from './OneTimeCredential.vue';

describe('OneTimeCredential (FE-13)', () => {
    beforeEach(() => {
        // Clear cross-instance test pollution so each unit test begins with an isolated session state
        const g = globalThis as unknown as Record<string, Set<string>>;
        g.__alyaOneTimeConsumedTokens?.clear();
    });
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

    it('AC1 edge case: new temporaryPassword updates transient state even after dismissal', async () => {
        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: 'synthetic-pass-1',
                username: 'alice.test',
            },
        });

        await wrapper.find('[data-testid="btn-dismiss-credential"]').trigger('click');
        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);

        // When a new password is provided from a subsequent server action
        await wrapper.setProps({
            open: true,
            temporaryPassword: 'synthetic-pass-2-new',
        });
        await nextTick();

        expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="temporary-password-display"]').text()).toContain('synthetic-pass-2-new');
    });

    // AC2: credential_is_not_in_user_detail: subsequent GET user tidak memiliki 'Show temporary password' action.
    it('AC2: credential_is_not_in_user_detail - component provides no retrieve or show-again trigger and advises one-time nature', () => {
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

    it('AC3 success case: clipboard copy succeeds and renders feedback', async () => {
        const writeTextSpy = vi.fn().mockResolvedValue(undefined);
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

        const copyBtn = wrapper.find('[data-testid="btn-copy-credential"]');
        await copyBtn.trigger('click');
        await nextTick();

        expect(writeTextSpy).toHaveBeenCalledWith('synthetic-temp-pass-1234');
        expect(wrapper.find('[data-testid="clipboard-feedback"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="clipboard-feedback"]').text()).toContain('berhasil disalin ke clipboard');
    });

    it('AC3 failure without internalCredential does nothing', () => {
        const writeTextSpy = vi.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextSpy,
            },
        });

        const wrapper = mount(OneTimeCredential, {
            props: {
                open: true,
                temporaryPassword: null,
                username: 'empty.test',
            },
        });

        expect(wrapper.find('[data-testid="btn-copy-credential"]').exists()).toBe(false);
        expect(writeTextSpy).not.toHaveBeenCalled();
    });

    // AC4: credential_reset_requires_new_server_result: lost value menyarankan reset baru dengan reauth bukan retrieve.
    it('AC4: credential_reset_requires_new_server_result - lost value menyarankan reset baru dengan reauth bukan retrieve', () => {
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

    // Regressions covering SEC-FE-13 audit findings (F-13-1, F-13-2, F-13-3, F-13-7, F-13-8)
    describe('Lifecycle & state replay regressions (SEC-FE-13)', () => {
        it('R1: close via open prop only (no dismiss button click) purges credential on reopen', async () => {
            const wrapper = mount(OneTimeCredential, {
                props: {
                    open: true,
                    temporaryPassword: 'synthetic-temp-pass-1234',
                    username: 'alice.test',
                },
            });

            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('synthetic-temp-pass-1234');

            // Close via open prop ONLY without clicking dismiss
            await wrapper.setProps({ open: false });
            await nextTick();
            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('synthetic-temp-pass-1234');

            // Reopen with the same unchanged prop payload
            await wrapper.setProps({ open: true });
            await nextTick();

            // Credential MUST NOT be re-displayed; advisory rendered instead
            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('synthetic-temp-pass-1234');
            expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);
        });

        it('R2: unmount purges internal state so no plaintext residue remains in vm or DOM', () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const w1 = mount(OneTimeCredential, {
                attachTo: el,
                props: {
                    open: true,
                    temporaryPassword: 'synthetic-temp-pass-1234',
                    username: 'alice.test',
                },
            });
            expect(el.innerHTML).toContain('synthetic-temp-pass-1234');
            w1.unmount();
            expect(el.innerHTML).not.toContain('synthetic-temp-pass-1234');
            expect(el.innerHTML).toBe('');
            el.remove();
        });

        it('R3: reopen with new username but old password prop does not display old password under new label', async () => {
            const wrapper = mount(OneTimeCredential, {
                props: {
                    open: true,
                    temporaryPassword: 'synthetic-temp-pass-1234',
                    username: 'alice.test',
                },
            });

            // Close via prop
            await wrapper.setProps({ open: false });
            await nextTick();

            // Reopen with new username but old password
            await wrapper.setProps({ open: true, username: 'bob.test' });
            await nextTick();

            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('synthetic-temp-pass-1234');
        });

        it('R4: copyError and copySuccess are reset on every transition through watch (F-13-2)', async () => {
            const writeTextSpy = vi.fn().mockRejectedValue(new Error('denied'));
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

            // Trigger copy failure
            await wrapper.find('[data-testid="btn-copy-credential"]').trigger('click');
            await nextTick();
            expect(wrapper.find('[data-testid="clipboard-feedback"]').text()).toContain('Gagal menyalin ke clipboard');

            // Close dialog
            await wrapper.setProps({ open: false });
            await nextTick();

            // Reopen dialog (lands on advisory branch)
            await wrapper.setProps({ open: true });
            await nextTick();

            // Stale copyError must NOT leak
            expect(wrapper.find('[data-testid="clipboard-feedback"]').exists()).toBe(false);
            expect(wrapper.text()).not.toContain('Gagal menyalin ke clipboard');
        });

        // RE-SEC-FE-13 regressions (N-13-1, N-13-2, N-13-3, N-13-4)
        it('R5 (N-13-1): dismiss click then username swap while dialog is open does NOT re-display old password under new label', async () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const wrapper = mount(OneTimeCredential, {
                attachTo: el,
                props: {
                    open: true,
                    temporaryPassword: 'synthetic-temp-pass-user1',
                    username: 'user1.test',
                },
            });

            expect(el.innerHTML).toContain('synthetic-temp-pass-user1');

            // Click dismiss button
            await wrapper.find('[data-testid="btn-dismiss-credential"]').trigger('click');
            await nextTick();
            expect(el.innerHTML).not.toContain('synthetic-temp-pass-user1');
            expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);

            // Parent swaps username while open
            await wrapper.setProps({ username: 'user2.test' });
            await nextTick();

            // Must NOT re-display old password under new label
            expect(el.innerHTML).not.toContain('synthetic-temp-pass-user1');
            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);
            el.remove();
        });

        it('R6 (N-13-1): dismiss click then null username does NOT re-display old password', async () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const wrapper = mount(OneTimeCredential, {
                attachTo: el,
                props: {
                    open: true,
                    temporaryPassword: 'synthetic-temp-pass-user1',
                    username: 'user1.test',
                },
            });

            await wrapper.find('[data-testid="btn-dismiss-credential"]').trigger('click');
            await nextTick();

            await wrapper.setProps({ username: null });
            await nextTick();

            expect(el.innerHTML).not.toContain('synthetic-temp-pass-user1');
            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            el.remove();
        });

        it('R7 (N-13-2): unmount and fresh mount with stale prop does NOT re-display previously revealed credential', () => {
            const el1 = document.createElement('div');
            document.body.appendChild(el1);
            const w1 = mount(OneTimeCredential, {
                attachTo: el1,
                props: {
                    open: true,
                    temporaryPassword: 'stale-recreated-pw-5678',
                    username: 'user1.test',
                },
            });
            expect(el1.innerHTML).toContain('stale-recreated-pw-5678');
            w1.unmount();
            el1.remove();

            // Fresh instance created with the same stale prop held by parent
            const el2 = document.createElement('div');
            document.body.appendChild(el2);
            const w2 = mount(OneTimeCredential, {
                attachTo: el2,
                props: {
                    open: true,
                    temporaryPassword: 'stale-recreated-pw-5678',
                    username: 'user2.test',
                },
            });

            expect(el2.innerHTML).not.toContain('stale-recreated-pw-5678');
            expect(w2.find('[data-testid="temporary-password-display"]').exists()).toBe(false);
            expect(w2.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);
            w2.unmount();
            el2.remove();
        });

        it('R8 (N-13-3): close via open:false then genuinely new payload reveals new plaintext exactly once', async () => {
            const el = document.createElement('div');
            document.body.appendChild(el);
            const wrapper = mount(OneTimeCredential, {
                attachTo: el,
                props: {
                    open: true,
                    temporaryPassword: 'initial-temp-password-1',
                    username: 'alice.test',
                },
            });

            expect(el.innerHTML).toContain('initial-temp-password-1');

            // Close via prop only (ESC/backdrop)
            await wrapper.setProps({ open: false });
            await nextTick();
            expect(el.innerHTML).not.toContain('initial-temp-password-1');

            // Reopen with genuinely new payload
            await wrapper.setProps({
                open: true,
                temporaryPassword: 'new-temp-password-2',
                username: 'alice.test',
            });
            await nextTick();

            // Must reveal the new password exactly once
            expect(el.innerHTML).toContain('new-temp-password-2');
            expect(wrapper.find('[data-testid="temporary-password-display"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(false);

            // Re-closing and reopening with that same new password must now refuse
            await wrapper.setProps({ open: false });
            await nextTick();
            await wrapper.setProps({ open: true });
            await nextTick();
            expect(el.innerHTML).not.toContain('new-temp-password-2');
            expect(wrapper.find('[data-testid="credential-lost-advisory"]').exists()).toBe(true);

            el.remove();
        });

        it('R9 (N-13-4): consumed-key set contains no plaintext substring of the password after dismiss', async () => {
            const secretPassword = 'super-secret-probe-password-xyz';
            const wrapper = mount(OneTimeCredential, {
                props: {
                    open: true,
                    temporaryPassword: secretPassword,
                    username: 'secret.user',
                },
            });

            await wrapper.find('[data-testid="btn-dismiss-credential"]').trigger('click');
            await nextTick();

            const vm = wrapper.vm as unknown as Record<string, unknown>;
            const consumedDump = JSON.stringify([...((vm.consumedCredentialKeys as Set<string>) || [])]);
            expect(consumedDump.includes(secretPassword)).toBe(false);
        });
    });
});
