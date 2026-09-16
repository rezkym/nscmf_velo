import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReauthenticationDialog from './ReauthenticationDialog.vue';

interface MockForm {
    current_password: string;
    processing: boolean;
    errors: Record<string, string>;
    post: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    clearErrors: ReturnType<typeof vi.fn>;
}

let currentForm: MockForm;

vi.mock('@inertiajs/vue3', () => {
    return {
        useForm: vi.fn((initialData: { current_password?: string }) => {
            currentForm = reactive({
                current_password: initialData.current_password || '',
                processing: false,
                errors: {},
                post: vi.fn(),
                reset: vi.fn((...fields: string[]) => {
                    if (fields.length === 0 || fields.includes('current_password')) {
                        currentForm.current_password = '';
                    }
                }),
                clearErrors: vi.fn(),
            });
            return currentForm;
        }),
    };
});

describe('ReauthenticationDialog.vue (FE-10)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('AC1: reauth_posts_only_current_password — sends current_password to POST /account/re-authenticate, no reusable proof or target password', async () => {
        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: true,
                targetActionTitle: 'Reset User Password',
                targetActionDescription: 'Reset password for user John Doe',
            },
        });

        const passwordInput = wrapper.find<HTMLInputElement>('input[type="password"]');
        expect(passwordInput.exists()).toBe(true);
        expect(passwordInput.attributes('name')).toBe('current_password');
        expect(passwordInput.attributes('autocomplete')).toBe('current-password');

        // Ensure no other inputs exist (no token input, no target password input, no hidden proof inputs)
        const inputs = wrapper.findAll('input');
        expect(inputs.length).toBe(1);
        expect(inputs[0]?.attributes('name')).toBe('current_password');

        await passwordInput.setValue('MyCurrentSecretPassword123');
        await wrapper.find('form').trigger('submit.prevent');

        expect(currentForm.post).toHaveBeenCalledTimes(1);
        expect(currentForm.post).toHaveBeenCalledWith('/account/re-authenticate', expect.any(Object));
        expect(currentForm.current_password).toBe('MyCurrentSecretPassword123');
    });

    it('AC2: reauth_never_executes_mutation_automatically — success re-auth displays confirmation intent and emits success, does not trigger mutation directly', async () => {
        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: true,
                targetActionTitle: 'Change User Role',
                targetActionDescription: 'Change role of user Alice to Approver',
            },
        });

        const passwordInput = wrapper.find<HTMLInputElement>('input[type="password"]');
        await passwordInput.setValue('MyCurrentSecretPassword123');

        // Submit form
        await wrapper.find('form').trigger('submit.prevent');

        // Simulate onSuccess callback from post
        const postOptions = (
            currentForm.post.mock.calls[0] as [string, { onSuccess?: () => void; onFinish?: () => void }]
        )[1];
        postOptions.onSuccess?.();
        postOptions.onFinish?.();

        await wrapper.vm.$nextTick();

        // Confirms intent: emits success event for parent to confirm intent
        expect(wrapper.emitted('success')).toBeTruthy();
        expect(wrapper.emitted('success')?.length).toBe(1);
        // Reauth dialog MUST NOT emit execute or mutation payload directly
        expect(wrapper.emitted('execute')).toBeFalsy();
        expect(wrapper.emitted('mutate')).toBeFalsy();

        // Displays intent confirmation details
        expect(wrapper.text()).toContain('Change User Role');
        expect(wrapper.text()).toContain('Change role of user Alice to Approver');
    });

    it('AC3: reauth_cancel_is_safe — cancel clears password and emits cancel without altering state or mutation', async () => {
        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: true,
                targetActionTitle: 'Disable User',
                targetActionDescription: 'Disable user account bob',
            },
        });

        const passwordInput = wrapper.find<HTMLInputElement>('input[type="password"]');
        await passwordInput.setValue('EnteredPassword');

        const cancelBtn = wrapper.find('[data-test="cancel-button"]');
        await cancelBtn.trigger('click');

        expect(wrapper.emitted('cancel')).toBeTruthy();
        expect(currentForm.reset).toHaveBeenCalledWith('current_password');
        expect(wrapper.emitted('success')).toBeFalsy();
        expect(wrapper.emitted('execute')).toBeFalsy();
    });

    it('AC4: reauth_expired_proof_is_server_driven — REAUTH_REQUIRED error triggers dialog reopen/error presentation regardless of client timer', async () => {
        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: false,
                targetActionTitle: 'Update Security Settings',
                targetActionDescription: 'Update system authentication settings',
                errorCode: 'REAUTH_REQUIRED',
                serverErrorMessage: 'Re-authentication is required to perform this action.',
            },
        });

        // When errorCode is REAUTH_REQUIRED or server error occurs, message should be safely presented
        // Now open the dialog as triggered by server-driven REAUTH_REQUIRED
        await wrapper.setProps({ open: true });

        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
        expect(wrapper.find('[role="alert"]').text()).toContain('Re-authentication is required');

        // Generic error on failure: when server returns 403 REAUTH_FAILED or generic error
        await wrapper.setProps({
            errorCode: 'REAUTH_FAILED',
            serverErrorMessage: 'Invalid current password.',
        });

        expect(wrapper.find('[role="alert"]').text()).toContain('Invalid current password.');

        // When serverErrorMessage is absent, falls back to canonical REAUTH_FAILED text
        await wrapper.setProps({
            serverErrorMessage: undefined,
        });
        expect(wrapper.find('[role="alert"]').text()).toContain(
            'Re-authentication failed. Please check your password.',
        );

        // When serverErrorMessage is absent with REAUTH_REQUIRED
        await wrapper.setProps({
            errorCode: 'REAUTH_REQUIRED',
        });
        expect(wrapper.find('[role="alert"]').text()).toContain(
            'Re-authentication is required to perform this action.',
        );

        // Form error takes precedence
        currentForm.errors = { current_password: 'Password must not be empty.' };
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[role="alert"]').text()).toContain('Password must not be empty.');
    });

    it('handles keyboard escape and trigger focus restoration on close', async () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        const focusSpy = vi.spyOn(trigger, 'focus');

        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: true,
                triggerElement: trigger,
            },
            attachTo: document.body,
        });

        // Press Escape
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(wrapper.emitted('cancel')).toBeTruthy();

        // While open is false, focus restores to triggerElement
        await wrapper.setProps({ open: false });
        expect(focusSpy).toHaveBeenCalled();

        // Unmount cleans up event listener
        wrapper.unmount();
        document.body.removeChild(trigger);
    });

    it('handles form submission error and finish callback properly', async () => {
        const wrapper = mount(ReauthenticationDialog, {
            props: {
                open: true,
            },
        });

        const passwordInput = wrapper.find<HTMLInputElement>('input[type="password"]');
        await passwordInput.setValue('WrongPassword');

        await wrapper.find('form').trigger('submit.prevent');

        const postOptions = (
            currentForm.post.mock.calls[0] as [string, { onError?: () => void; onFinish?: () => void }]
        )[1];
        postOptions.onError?.();
        postOptions.onFinish?.();

        expect(currentForm.reset).toHaveBeenCalledWith('current_password');
    });
});
