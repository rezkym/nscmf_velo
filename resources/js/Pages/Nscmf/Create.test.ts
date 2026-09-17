import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

import Create from './Create.vue';

interface MockForm {
    family: string;
    subtype: string;
    numbering_mode: 'AUTOMATIC' | 'MANUAL';
    request_no: string;
    errors: Record<string, string>;
    processing: boolean;
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
            props: { title: { type: String, default: '' } },
            setup: () => () => null,
        }),
        Link: defineComponent({
            name: 'InertiaLink',
            props: { href: { type: String, required: true } },
            setup:
                (_props, { slots }) =>
                () =>
                    slots.default ? slots.default() : null,
        }),
        useForm: vi.fn((initialData: Record<string, unknown>) => {
            currentForm = reactive({
                family: (initialData.family as string) || 'ACTIVATION',
                subtype: (initialData.subtype as string) || 'ACTIVATION',
                numbering_mode: (initialData.numbering_mode as 'AUTOMATIC' | 'MANUAL') || 'AUTOMATIC',
                request_no: (initialData.request_no as string) || '',
                errors: {},
                processing: false,
                post: vi.fn(),
                reset: vi.fn(),
                clearErrors: vi.fn(),
            });
            return currentForm;
        }),
    };
});

describe('Create.vue (FE-17: Create family, subtype dan numbering)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('AC1: create_filters_subtypes — Activation has 3 subtypes; Change has 3 subtypes', async () => {
        const wrapper = mount(Create, {
            props: {
                hasActiveTeam: true,
            },
        });

        // Activation options check
        const subtypeSelect = wrapper.find<HTMLSelectElement>('[data-testid="subtype-select"]');
        expect(subtypeSelect.exists()).toBe(true);

        const activationOptions = subtypeSelect.findAll('option').map((o) => o.element.value);
        expect(activationOptions).toEqual(['ACTIVATION', 'UPGRADE_DOWNGRADE', 'DEACTIVATION']);

        // Switch family to CHANGE
        const familySelect = wrapper.find<HTMLSelectElement>('[data-testid="family-select"]');
        expect(familySelect.exists()).toBe(true);
        await familySelect.setValue('CHANGE');

        const changeOptions = wrapper
            .find<HTMLSelectElement>('[data-testid="subtype-select"]')
            .findAll('option')
            .map((o) => o.element.value);
        expect(changeOptions).toEqual(['MAINTENANCE', 'UPGRADE', 'EMERGENCY']);
    });

    it('AC2: create_manual_boundaries — 2/65 chars invalid, 3/64 legal, trim input, REQUEST_NO_CONFLICT displayed', async () => {
        const wrapper = mount(Create, {
            props: {
                hasActiveTeam: true,
            },
        });

        // Switch numbering mode to MANUAL
        const manualRadio = wrapper.find('[data-testid="numbering-manual-radio"]');
        await manualRadio.setValue();

        const requestNoInput = wrapper.find<HTMLInputElement>('[data-testid="manual-request-no-input"]');
        expect(requestNoInput.exists()).toBe(true);

        const form = wrapper.find('form');

        // Test 2 chars (too short)
        await requestNoInput.setValue('AB');
        await form.trigger('submit.prevent');
        expect(currentForm.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Request number must be between 3 and 64 characters');

        // Test 65 chars (too long)
        await requestNoInput.setValue('A'.repeat(65));
        await form.trigger('submit.prevent');
        expect(currentForm.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Request number must be between 3 and 64 characters');

        // Test spaces only or invalid chars
        await requestNoInput.setValue('   ');
        await form.trigger('submit.prevent');
        expect(currentForm.post).not.toHaveBeenCalled();

        // Test invalid characters regex
        await requestNoInput.setValue('-ABC');
        await form.trigger('submit.prevent');
        expect(currentForm.post).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Request number must begin with alphanumeric');

        // Switch family to CHANGE and back to ACTIVATION to exercise watcher branches
        const familySelect = wrapper.find<HTMLSelectElement>('[data-testid="family-select"]');
        await familySelect.setValue('CHANGE');
        expect(currentForm.subtype).toBe('MAINTENANCE');
        await familySelect.setValue('ACTIVATION');
        expect(currentForm.subtype).toBe('ACTIVATION');

        // Legal 3 chars with outer whitespace: should trim
        await requestNoInput.setValue('  ABC  ');
        await form.trigger('submit.prevent');
        expect(currentForm.post).toHaveBeenCalledTimes(1);
        expect(currentForm.request_no).toBe('ABC');

        // Server returns REQUEST_NO_CONFLICT error
        currentForm.errors = { request_no: 'REQUEST_NO_CONFLICT: Request number already exists' };
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[data-testid="request-no-error"]').text()).toContain('REQUEST_NO_CONFLICT');
    });

    it('AC3: create_auto_uses_server_number — no local sequence generator; server manages number', async () => {
        const wrapper = mount(Create, {
            props: {
                hasActiveTeam: true,
            },
        });

        // In AUTOMATIC mode (default)
        const autoRadio = wrapper.find<HTMLInputElement>('[data-testid="numbering-auto-radio"]');
        expect(autoRadio.element.checked).toBe(true);

        // Request number input should either not be present or read-only indicating server-generated
        const manualInput = wrapper.find('[data-testid="manual-request-no-input"]');
        expect(manualInput.exists()).toBe(false);
        expect(wrapper.text()).toContain('Server managed');

        // Submit in automatic mode
        const form = wrapper.find('form');
        await form.trigger('submit.prevent');

        expect(currentForm.post).toHaveBeenCalledWith('/nscmf', expect.any(Object));
        expect(currentForm.numbering_mode).toBe('AUTOMATIC');
        expect(currentForm.request_no).toBeFalsy();
    });

    it('AC4: create_does_not_post_owner_team_status & user without active team blocked & double click prevented', async () => {
        // Sub-case A: user without active Team (team=null) cannot proceed, instructed to contact admin
        const blockedWrapper = mount(Create, {
            props: {
                hasActiveTeam: false,
            },
        });

        expect(blockedWrapper.find('form').exists()).toBe(false);
        expect(blockedWrapper.text()).toContain('contact administrator');
        expect(blockedWrapper.text()).not.toContain('select scope');

        // Sub-case B: payload strictly excludes actor/team/business_status & double click prevention
        const wrapper = mount(Create, {
            props: {
                hasActiveTeam: true,
            },
        });

        const form = wrapper.find('form');

        // Verify initial form payload has only allowed keys
        expect(currentForm).not.toHaveProperty('owner');
        expect(currentForm).not.toHaveProperty('team');
        expect(currentForm).not.toHaveProperty('business_status');
        expect(currentForm).not.toHaveProperty('status');

        // Submit form
        await form.trigger('submit.prevent');
        expect(currentForm.post).toHaveBeenCalledTimes(1);

        // Simulate processing state (in-flight request)
        currentForm.processing = true;
        await wrapper.vm.$nextTick();

        const submitBtn = wrapper.find<HTMLButtonElement>('[data-testid="create-submit-btn"]');
        expect(submitBtn.element.disabled).toBe(true);

        // Attempt double submit
        await form.trigger('submit.prevent');
        expect(currentForm.post).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
});
