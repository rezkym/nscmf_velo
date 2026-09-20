import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChangeTemporaryPassword from './ChangeTemporaryPassword.vue';

// Mock Inertia useForm and Head
interface MockForm {
    password: string;
    password_confirmation: string;
    processing: boolean;
    errors: Record<string, string>;
    hasErrors: boolean;
    post: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    clearErrors: ReturnType<typeof vi.fn>;
}

let currentForm: MockForm;

vi.mock('@inertiajs/vue3', async () => {
    const { defineComponent } = await import('vue');

    return {
        Head: defineComponent({
            name: 'InertiaHead',
            props: { title: { type: String, required: false } },
            setup: () => () => null,
        }),
        useForm: vi.fn(
            (
                rememberKeyOrData: string | { password?: string; password_confirmation?: string },
                dataMaybe?: { password?: string; password_confirmation?: string },
            ) => {
                // Ensure no remember key is passed (must not use Inertia remember)
                if (typeof rememberKeyOrData === 'string') {
                    throw new Error('Inertia remember key MUST NOT be used for password forms');
                }
                const initialData = (typeof rememberKeyOrData === 'object' ? rememberKeyOrData : dataMaybe) || {};
                currentForm = reactive({
                    password: initialData.password || '',
                    password_confirmation: initialData.password_confirmation || '',
                    processing: false,
                    errors: {},
                    hasErrors: false,
                    post: vi.fn(),
                    reset: vi.fn((...fields: string[]) => {
                        if (fields.length === 0 || fields.includes('password')) {
                            currentForm.password = '';
                        }
                        if (fields.length === 0 || fields.includes('password_confirmation')) {
                            currentForm.password_confirmation = '';
                        }
                    }),
                    clearErrors: vi.fn(),
                });
                return currentForm;
            },
        ),
    };
});

describe('ChangeTemporaryPassword.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // AC1: temporary_change_requires_minimum_six — 5 karakter memberi feedback, 6 tanpa uppercase/symbol diterima client
    it('AC1: temporary_change_requires_minimum_six — shows minimum 6 characters feedback when 5 chars, accepts 6 characters without uppercase/symbol requirements', async () => {
        const wrapper = mount(ChangeTemporaryPassword);

        // Verify title / heading and helper
        expect(wrapper.text()).toContain('Create New Password');
        // Helper text strictly mentions minimum 6 characters only, no composition checklist
        expect(wrapper.text()).toMatch(/minimum 6 characters/i);
        expect(wrapper.text()).not.toMatch(/uppercase|special character|symbol|number/i);

        const passwordInput = wrapper.find<HTMLInputElement>('input#password');
        const confirmInput = wrapper.find<HTMLInputElement>('input#password_confirmation');
        const submitBtn = wrapper.find<HTMLButtonElement>('button[type="submit"]');

        expect(passwordInput.exists()).toBe(true);
        expect(confirmInput.exists()).toBe(true);
        expect(submitBtn.exists()).toBe(true);

        expect(passwordInput.attributes('type')).toBe('password');
        expect(passwordInput.attributes('autocomplete')).toBe('new-password');
        expect(confirmInput.attributes('type')).toBe('password');
        expect(confirmInput.attributes('autocomplete')).toBe('new-password');

        // Test with 5 characters
        await passwordInput.setValue('12345');
        await confirmInput.setValue('12345');
        await wrapper.find('form').trigger('submit.prevent');

        // Should give client-side validation feedback about minimum 6 characters and NOT submit
        expect(wrapper.text()).toMatch(/at least 6 characters|minimum 6 characters/i);
        expect(currentForm.post).not.toHaveBeenCalled();

        // Test with 6 characters without uppercase or symbols (e.g. 'abcdef' or '123456')
        await passwordInput.setValue('abcdef');
        await confirmInput.setValue('abcdef');
        await wrapper.find('form').trigger('submit.prevent');

        // Should be accepted by client and submitted to POST /account/temporary-password/change
        expect(currentForm.post).toHaveBeenCalledTimes(1);
        expect(currentForm.post).toHaveBeenCalledWith('/account/temporary-password/change', expect.any(Object));

        // When form.processing is true, subsequent submit is ignored
        currentForm.processing = true;
        await wrapper.find('form').trigger('submit.prevent');
        expect(currentForm.post).toHaveBeenCalledTimes(1);
        currentForm.processing = false;

        // Test mismatched confirmation gives feedback
        await passwordInput.setValue('abcdef');
        await confirmInput.setValue('different');
        await wrapper.find('form').trigger('submit.prevent');
        expect(wrapper.text()).toContain('Password confirmation does not match.');
    });

    // AC2: temporary_change_blocks_normal_navigation — shell menu/action bisnis tidak tersedia selama mandatory gate
    it('AC2: temporary_change_blocks_normal_navigation — normal shell navigation, links, and business actions are not rendered', () => {
        const wrapper = mount(ChangeTemporaryPassword);

        // Verify no business navigation elements exist
        expect(wrapper.find('nav').exists()).toBe(false);
        expect(wrapper.find('aside').exists()).toBe(false);
        expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(false);
        expect(wrapper.find('a[href="/nscmf/create"]').exists()).toBe(false);
        expect(wrapper.find('a[href="/review"]').exists()).toBe(false);
        expect(wrapper.find('a[href="/approval"]').exists()).toBe(false);
        expect(wrapper.find('a[href="/history"]').exists()).toBe(false);
        expect(wrapper.find('a[href="/administration"]').exists()).toBe(false);

        // Verify no bypass or cancel button
        expect(wrapper.find('button[data-testid="cancel-btn"]').exists()).toBe(false);
        expect(wrapper.text()).not.toMatch(/cancel|skip/i);
    });

    // AC3: temporary_change_waits_for_server — reject tidak membuka Dashboard, success memakai redirect/projection server
    it('AC3: temporary_change_waits_for_server — rejection preserves gate and displays server error safely without password exposure, while success delegates to server response', async () => {
        const wrapper = mount(ChangeTemporaryPassword);

        const passwordInput = wrapper.find<HTMLInputElement>('input#password');
        const confirmInput = wrapper.find<HTMLInputElement>('input#password_confirmation');

        await passwordInput.setValue('secret6');
        await confirmInput.setValue('secret6');
        await wrapper.find('form').trigger('submit.prevent');

        expect(currentForm.post).toHaveBeenCalledWith(
            '/account/temporary-password/change',
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );

        // Invoke callbacks to verify handling
        const postOptions = currentForm.post.mock.calls[0]?.[1];
        if (postOptions) {
            postOptions.onSuccess();
            postOptions.onError();
        }

        // Server rejection / 422 error
        currentForm.errors = {
            password: 'The password has been previously used.',
        };
        await wrapper.vm.$nextTick();

        const alert = wrapper.find('[role="alert"]');
        expect(alert.exists()).toBe(true);
        expect(alert.text()).toContain('The password has been previously used.');

        // Critical safety check: neither alert nor page contains user submitted password
        expect(wrapper.html()).not.toContain('secret6');

        // Verify user remains on gate (form is still present, no dashboard navigation)
        expect(wrapper.find('form').exists()).toBe(true);
        expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(false);
    });

    // AC4: temporary_change_clears_sensitive_values — unmount/success menghapus fields; tidak ada history persistence
    it('AC4: temporary_change_clears_sensitive_values — unmount and submission completion clears sensitive fields, no localStorage/sessionStorage persistence', async () => {
        const localStorageSetSpy = vi.spyOn(Storage.prototype, 'setItem');
        const sessionStorageSetSpy = vi.spyOn(sessionStorage, 'setItem');

        const wrapper = mount(ChangeTemporaryPassword);

        const passwordInput = wrapper.find<HTMLInputElement>('input#password');
        const confirmInput = wrapper.find<HTMLInputElement>('input#password_confirmation');

        await passwordInput.setValue('mysecret123');
        await confirmInput.setValue('mysecret123');

        // Trigger submission
        await wrapper.find('form').trigger('submit.prevent');

        // Extract and invoke onFinish callback from post call options
        const postOptions = currentForm.post.mock.calls[0]?.[1];
        if (postOptions && typeof postOptions.onFinish === 'function') {
            postOptions.onFinish();
        }

        // Verify form reset called for sensitive password fields
        expect(currentForm.reset).toHaveBeenCalledWith('password', 'password_confirmation');

        // Verify unmount also resets fields
        currentForm.password = 'leftover';
        currentForm.password_confirmation = 'leftover';
        wrapper.unmount();

        expect(currentForm.reset).toHaveBeenCalledWith('password', 'password_confirmation');

        // Verify no localStorage or sessionStorage persistence was used
        expect(localStorageSetSpy).not.toHaveBeenCalled();
        expect(sessionStorageSetSpy).not.toHaveBeenCalled();

        localStorageSetSpy.mockRestore();
        sessionStorageSetSpy.mockRestore();
    });
});
