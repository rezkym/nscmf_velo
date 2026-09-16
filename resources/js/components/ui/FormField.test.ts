import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FormField from './FormField.vue';

describe('FormField.vue', () => {
    describe('AC1: field_links_label_help_error', () => {
        it('links label for to control id and sets aria-describedby for help text', () => {
            const wrapper = mount(FormField, {
                props: {
                    id: 'test-field',
                    label: 'Application Name',
                    help: 'Enter the registered name',
                },
                slots: {
                    default: ({ id, describedBy }: { id: string; describedBy?: string }) => `
                        <input id="${id}" aria-describedby="${describedBy}" />
                    `,
                },
            });

            const label = wrapper.find('label');
            expect(label.exists()).toBe(true);
            expect(label.attributes('for')).toBe('test-field');
            expect(label.text()).toContain('Application Name');

            const help = wrapper.find('#test-field-help');
            expect(help.exists()).toBe(true);
            expect(help.text()).toContain('Enter the registered name');

            const input = wrapper.find('input');
            expect(input.attributes('id')).toBe('test-field');
            expect(input.attributes('aria-describedby')).toBe('test-field-help');
        });

        it('includes error id in aria-describedby and displays error message with alert role', () => {
            const wrapper = mount(FormField, {
                props: {
                    id: 'test-field',
                    label: 'Application Name',
                    help: 'Enter the registered name',
                    error: 'Name is required',
                },
                slots: {
                    default: ({ id, describedBy }: { id: string; describedBy?: string }) => `
                        <input id="${id}" aria-describedby="${describedBy}" />
                    `,
                },
            });

            const error = wrapper.find('#test-field-error');
            expect(error.exists()).toBe(true);
            expect(error.attributes('role')).toBe('alert');
            expect(error.text()).toContain('Name is required');

            const input = wrapper.find('input');
            expect(input.attributes('aria-describedby')).toBe('test-field-help test-field-error');
        });
    });

    describe('AC2: field_keeps_draft_optional', () => {
        it('renders required visual indicator only when required is true', () => {
            const wrapperOptional = mount(FormField, {
                props: {
                    id: 'optional-field',
                    label: 'Remarks',
                    required: false,
                },
            });
            expect(wrapperOptional.find('.text-destructive, [data-required]').exists()).toBe(false);

            const wrapperRequired = mount(FormField, {
                props: {
                    id: 'required-field',
                    label: 'Target KPI',
                    required: true,
                },
            });
            const indicator = wrapperRequired.find('[data-required]');
            expect(indicator.exists()).toBe(true);
            expect(indicator.text()).toContain('*');
        });

        it('does not render error styling or error state merely because value is empty draft without explicit error', () => {
            const wrapper = mount(FormField, {
                props: {
                    id: 'draft-field',
                    label: 'Description',
                    required: true,
                    // error is not provided (draft incomplete save permitted)
                },
            });

            expect(wrapper.find('#draft-field-error').exists()).toBe(false);
            expect(wrapper.classes()).not.toContain('has-error');
            expect(wrapper.find('[data-invalid="true"]').exists()).toBe(false);
        });
    });

    describe('AC3: field_supports_keyboard_and_disabled', () => {
        it('passes disabled and readonly states to slot and applies container styling', () => {
            const wrapperDisabled = mount(FormField, {
                props: {
                    id: 'disabled-field',
                    label: 'Disabled Input',
                    disabled: true,
                },
                slots: {
                    default: ({ disabled }: { disabled: boolean }) => `
                        <button :disabled="${disabled}">Action</button>
                    `,
                },
            });

            expect(wrapperDisabled.classes()).toContain('opacity-50');
            expect(wrapperDisabled.classes()).toContain('pointer-events-none');

            const wrapperReadonly = mount(FormField, {
                props: {
                    id: 'readonly-field',
                    label: 'Readonly Summary',
                    readonly: true,
                },
                slots: {
                    default: ({ readonly }: { readonly: boolean }) => `
                        <input readonly="${readonly}" value="Readonly content" />
                    `,
                },
            });

            expect(wrapperReadonly.classes()).not.toContain('pointer-events-none');
            const input = wrapperReadonly.find('input');
            expect(input.attributes('readonly')).toBeDefined();
        });
    });

    describe('AC4: field_escapes_untrusted_text', () => {
        it('renders raw HTML markup in label, help, and error as literal escaped text', () => {
            const maliciousPayload = '<script>alert("xss")</script><b id="injected">bold</b>';
            const wrapper = mount(FormField, {
                props: {
                    id: 'safe-field',
                    label: maliciousPayload,
                    help: maliciousPayload,
                    error: maliciousPayload,
                },
            });

            expect(wrapper.find('#injected').exists()).toBe(false);
            expect(wrapper.html()).not.toContain('<b id="injected">');
            expect(wrapper.text()).toContain('<script>alert("xss")</script>');
            expect(wrapper.text()).toContain('<b id="injected">bold</b>');
        });
    });
});
