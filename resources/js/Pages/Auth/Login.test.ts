import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from './Login.vue';

// Mock Inertia useForm and Head
interface MockForm {
    username: string;
    password: string;
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
        useForm: vi.fn((initialData: { username?: string; password?: string }) => {
            currentForm = reactive({
                username: initialData.username || '',
                password: initialData.password || '',
                processing: false,
                errors: {},
                hasErrors: false,
                post: vi.fn(),
                reset: vi.fn((...fields: string[]) => {
                    if (fields.length === 0 || fields.includes('password')) {
                        currentForm.password = '';
                    }
                    if (fields.includes('username')) {
                        currentForm.username = '';
                    }
                }),
                clearErrors: vi.fn(),
            });
            return currentForm;
        }),
    };
});

describe('Login.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // AC1: login_posts_username_not_email — nilai form dikirim ke POST /login, satu request saat pending
    it('AC1: login_posts_username_not_email — sends username and password to POST /login, only one request while pending, autocomplete attributes set', async () => {
        const wrapper = mount(Login);

        // Verify elements exist
        const usernameInput = wrapper.find<HTMLInputElement>('input#username');
        const passwordInput = wrapper.find<HTMLInputElement>('input#password');
        const submitBtn = wrapper.find<HTMLButtonElement>('button[type="submit"]');

        expect(usernameInput.exists()).toBe(true);
        expect(passwordInput.exists()).toBe(true);
        expect(submitBtn.exists()).toBe(true);

        // Verify input types and autocomplete according to spec
        expect(usernameInput.attributes('type')).toBe('text');
        expect(usernameInput.attributes('autocomplete')).toBe('username');
        expect(passwordInput.attributes('type')).toBe('password');
        expect(passwordInput.attributes('autocomplete')).toBe('current-password');

        // Verify there is NO email input or email field
        expect(wrapper.find('input[type="email"]').exists()).toBe(false);
        expect(wrapper.find('input[name="email"]').exists()).toBe(false);

        // Type username and password
        await usernameInput.setValue('superadmin');
        await passwordInput.setValue('ValidSecret123');

        // Submit form
        await wrapper.find('form').trigger('submit.prevent');

        // Form post called with POST /login
        expect(currentForm.post).toHaveBeenCalledTimes(1);
        expect(currentForm.post).toHaveBeenCalledWith('/login', expect.any(Object));

        // When processing (pending request), form prevents multiple submissions / button disabled
        currentForm.processing = true;
        await wrapper.vm.$nextTick();

        expect(submitBtn.attributes('disabled')).toBeDefined();
        await wrapper.find('form').trigger('submit.prevent');
        expect(currentForm.post).toHaveBeenCalledTimes(1); // Still 1, not duplicated
    });

    // AC2: login_shows_generic_authentication_failure — unknown user/wrong password/disabled = pesan enumeration-resistant
    it('AC2: login_shows_generic_authentication_failure — unknown user, wrong password, or disabled account shows enumeration-resistant generic message', async () => {
        const wrapper = mount(Login);

        // Simulate server error return via form errors or error prop
        currentForm.errors.username = 'These credentials do not match our records.';
        await wrapper.vm.$nextTick();

        const alert = wrapper.find('[role="alert"], [data-testid="auth-error"]');
        expect(alert.exists()).toBe(true);
        // Generic failure text must not disclose user existence or disabled status
        expect(alert.text()).toContain('These credentials do not match our records.');
        expect(alert.text().toLowerCase()).not.toContain('user does not exist');
        expect(alert.text().toLowerCase()).not.toContain('unknown account');
        expect(alert.text().toLowerCase()).not.toContain('account disabled');
    });

    // AC3: login_handles_throttle_and_network — input nonsecret tetap, password tidak dipersist; button kembali setelah gagal
    it('AC3: login_handles_throttle_and_network — keeps nonsecret username input, clears password on failure/unmount, restores submit button', async () => {
        const wrapper = mount(Login);

        const usernameInput = wrapper.find<HTMLInputElement>('input#username');
        const passwordInput = wrapper.find<HTMLInputElement>('input#password');
        const submitBtn = wrapper.find<HTMLButtonElement>('button[type="submit"]');

        await usernameInput.setValue('officer.one');
        await passwordInput.setValue('SecretPassword');

        // Submit form
        await wrapper.find('form').trigger('submit.prevent');

        // Capture post options passed to Inertia post
        const postOptions = (
            currentForm.post.mock.calls[0] as [string, { onError?: () => void; onFinish?: () => void }]
        )[1];
        expect(postOptions).toBeDefined();

        // Simulate failed request: onError or onFinish triggers password reset while keeping username
        if (postOptions.onFinish) {
            postOptions.onFinish();
        } else if (postOptions.onError) {
            postOptions.onError();
        }

        // Form reset('password') should have been called
        expect(currentForm.reset).toHaveBeenCalledWith('password');

        // Simulate throttle/delay error message displayed from server response without hardcoding bucket
        currentForm.errors.throttle = 'Too many login attempts. Please try again in 45 seconds.';
        currentForm.processing = false;
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('Too many login attempts. Please try again in 45 seconds.');
        expect(submitBtn.attributes('disabled')).toBeUndefined();

        // Test unmount clears secret / resets password
        wrapper.unmount();
        expect(currentForm.reset).toHaveBeenCalledWith('password');
    });

    // AC4: login_has_no_unapproved_auth_features — tidak ada self-register/reset-public/MFA/composition UI
    it('AC4: login_has_no_unapproved_auth_features — has no self-registration, public reset, MFA, or password-composition UI', () => {
        const wrapper = mount(Login);
        const text = wrapper.text().toLowerCase();

        // Must NOT have self-register / sign up
        expect(text).not.toContain('register');
        expect(text).not.toContain('sign up');
        expect(text).not.toContain('create account');
        expect(wrapper.find('a[href*="register"]').exists()).toBe(false);

        // Must NOT have forgot password / reset password public links
        expect(text).not.toContain('forgot password');
        expect(text).not.toContain('reset password');
        expect(wrapper.find('a[href*="password/reset"]').exists()).toBe(false);

        // Must NOT have MFA / 2FA / OTP inputs or labels
        expect(text).not.toContain('authenticator');
        expect(text).not.toContain('two-factor');
        expect(text).not.toContain('otp');
        expect(wrapper.find('input[name="otp"]').exists()).toBe(false);
        expect(wrapper.find('input[name="code"]').exists()).toBe(false);

        // Must NOT have password composition checklist (uppercase, lowercase, number, symbol)
        expect(text).not.toContain('at least one uppercase');
        expect(text).not.toContain('special character');
        expect(text).not.toContain('number required');
        expect(wrapper.find('[data-testid="password-checklist"]').exists()).toBe(false);
    });
});
