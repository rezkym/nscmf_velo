import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GeneralServiceSection from './GeneralServiceSection.vue';
import type { ActivationDraftFields } from '../draftPayload';

describe('FE-20: Activation general, references dan service blocks (GeneralServiceSection)', () => {
    const validActivationData: ActivationDraftFields = {
        customer_name: 'PT Telco Nusantara',
        contact_name: 'Budi Santoso',
        installation_rfs_date: '2026-10-01',
        references: [
            { reference_type: 'IWO', specification: 'IWO-9912' },
        ],
        service_blocks: [
            {
                service_context: 'NEW',
                service_id: 'SID-NEW-01',
                service_status: 'ACTIVATED',
                service_description: 'High-speed fiber link',
                service_location: 'Gedung Cyber Lt 5',
            },
        ],
    };

    describe('AC1 — activation_subtype_service_matrix', () => {
        it('requires NEW service block for Activation subtype, but EXISTING is optional and not an error when omitted', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        service_blocks: [
                            {
                                service_context: 'NEW',
                                service_id: 'SID-01',
                                service_status: 'ACTIVATED',
                                service_description: 'Desc',
                                service_location: 'Loc',
                            },
                        ],
                    },
                },
            });

            // Indicators
            expect(wrapper.find('[data-testid="indicator-new-service"]').text()).toContain('Required');
            expect(wrapper.find('[data-testid="indicator-existing-service"]').text()).toContain('Optional');

            // Trigger submit validation
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('EXISTING service block is required');
            expect(wrapper.emitted('submit-valid')).toBeTruthy();

            // When NEW service is missing for Activation subtype, validation fails
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    service_blocks: [],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('NEW service block is required for Activation');
        });

        it('requires both EXISTING and NEW service blocks for Upgrade/Downgrade subtype', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Upgrade/Downgrade',
                    modelValue: {
                        ...validActivationData,
                        service_blocks: [
                            {
                                service_context: 'NEW',
                                service_id: 'SID-NEW-01',
                                service_status: 'ACTIVATED',
                                service_description: 'Desc',
                                service_location: 'Loc',
                            },
                        ],
                    },
                },
            });

            expect(wrapper.find('[data-testid="indicator-existing-service"]').text()).toContain('Required');
            expect(wrapper.find('[data-testid="indicator-new-service"]').text()).toContain('Required');

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('EXISTING service block is required for Upgrade/Downgrade');

            // Add EXISTING block
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    service_blocks: [
                        {
                            service_context: 'EXISTING',
                            service_id: 'SID-EX-01',
                            service_status: 'ACTIVATED',
                            service_description: 'Existing Desc',
                            service_location: 'Loc A',
                        },
                        {
                            service_context: 'NEW',
                            service_id: 'SID-NEW-01',
                            service_status: 'ACTIVATED',
                            service_description: 'New Desc',
                            service_location: 'Loc B',
                        },
                    ],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('EXISTING service block is required');
            expect(wrapper.text()).not.toContain('NEW service block is required');
        });

        it('requires EXISTING service block for Deactivation subtype, while NEW is optional and not an error when omitted', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Deactivation',
                    modelValue: {
                        customer_name: 'PT Telco Nusantara',
                        contact_name: 'Budi Santoso',
                        installation_rfs_date: null,
                        references: [],
                        service_blocks: [],
                    },
                },
            });

            expect(wrapper.find('[data-testid="indicator-existing-service"]').text()).toContain('Required');
            expect(wrapper.find('[data-testid="indicator-new-service"]').text()).toContain('Optional');

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('EXISTING service block is required for Deactivation');
            expect(wrapper.text()).not.toContain('NEW service block is required');

            // Add EXISTING block
            await wrapper.setProps({
                modelValue: {
                    customer_name: 'PT Telco Nusantara',
                    contact_name: 'Budi Santoso',
                    installation_rfs_date: null,
                    references: [],
                    service_blocks: [
                        {
                            service_context: 'EXISTING',
                            service_id: 'SID-EX-01',
                            service_status: 'DEACTIVATED',
                            service_description: 'To deactivate',
                            service_location: 'Loc',
                        },
                    ],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('EXISTING service block is required');
        });
    });

    describe('AC2 — activation_keeps_partial_draft', () => {
        it('allows empty customer, OTHER reference without detail, and half block in safe draft without clearing entered values on option toggling', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    requestDate: '2026-09-17',
                    modelValue: {
                        customer_name: '',
                        contact_name: '',
                        installation_rfs_date: null,
                        references: [
                            { reference_type: 'OTHER', specification: null },
                        ],
                        service_blocks: [
                            {
                                service_context: 'NEW',
                                service_id: 'SID-PARTIAL',
                                service_status: null,
                                service_description: null,
                                service_location: null,
                            },
                        ],
                    },
                },
            });

            // getDraftPayload exposes the current draft state compatible with buildDraftPayload
            const draft = wrapper.vm.getDraftPayload();
            expect(draft.customer_name).toBe('');
            expect(draft.contact_name).toBe('');
            expect(draft.references).toEqual([{ reference_type: 'OTHER', specification: null }]);
            expect(draft.service_blocks).toEqual([
                {
                    service_context: 'NEW',
                    service_id: 'SID-PARTIAL',
                    service_status: null,
                    service_description: null,
                    service_location: null,
                },
            ]);

            // Ensure no wire field is quietly added to draft payload (e.g. request_date must not leak into activation wire draft per G03)
            expect(draft).not.toHaveProperty('request_date');
            expect(draft).not.toHaveProperty('requestDate');

            // Toggling UI option: check/uncheck another reference must NOT auto-clear entered values (e.g. entered NEW service_id)
            const iwoCheckbox = wrapper.find('[data-testid="ref-checkbox-IWO"]');
            await iwoCheckbox.setValue(true);

            expect(wrapper.vm.getDraftPayload().service_blocks?.[0]?.service_id).toBe('SID-PARTIAL');
        });
    });

    describe('AC3 — activation_submit_errors_are_specific', () => {
        it('validates customer and contact names (required, max 150 chars)', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        customer_name: '',
                        contact_name: '   ',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-customer-name"]').text()).toContain('Customer name is required');
            expect(wrapper.find('[data-testid="error-contact-name"]').text()).toContain('Contact name is required');

            // 151 chars length check
            const longName = 'a'.repeat(151);
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    customer_name: longName,
                    contact_name: longName,
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-customer-name"]').text()).toContain('max 150 characters');
            expect(wrapper.find('[data-testid="error-contact-name"]').text()).toContain('max 150 characters');

            // 150 chars is valid
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    customer_name: 'a'.repeat(150),
                    contact_name: 'a'.repeat(150),
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-customer-name"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="error-contact-name"]').exists()).toBe(false);
        });

        it('requires specification max 255 for OTHER reference upon submit, but OTHER specification is not required in draft', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        references: [
                            { reference_type: 'OTHER', specification: '' },
                        ],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').text()).toContain('Specification is required for OTHER');

            // > 255 chars
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    references: [
                        { reference_type: 'OTHER', specification: 'x'.repeat(256) },
                    ],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').text()).toContain('max 255 characters');

            // 255 chars valid
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    references: [
                        { reference_type: 'OTHER', specification: 'x'.repeat(255) },
                    ],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').exists()).toBe(false);
        });

        it('requires all core fields if an optional service block is started upon submit', async () => {
            // Activation subtype: EXISTING block is optional.
            // If started (e.g. only service_id filled), service_status, description, and location must be validated!
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        service_blocks: [
                            {
                                service_context: 'NEW',
                                service_id: 'SID-01',
                                service_status: 'ACTIVATED',
                                service_description: 'Desc',
                                service_location: 'Loc',
                            },
                            {
                                service_context: 'EXISTING',
                                service_id: 'SID-EX-PARTIAL',
                                service_status: null,
                                service_description: null,
                                service_location: null,
                            },
                        ],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_status"]').text()).toContain('Service status is required');
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_description"]').text()).toContain('Service description is required');
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_location"]').text()).toContain('Service location is required');
        });

        it('validates service field limits: service_id 100, description 2000, location 500', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        service_blocks: [
                            {
                                service_context: 'NEW',
                                service_id: 's'.repeat(101),
                                service_status: 'ACTIVATED',
                                service_description: 'd'.repeat(2001),
                                service_location: 'l'.repeat(501),
                            },
                        ],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-service-NEW-service_id"]').text()).toContain('max 100 characters');
            expect(wrapper.find('[data-testid="error-service-NEW-service_description"]').text()).toContain('max 2000 characters');
            expect(wrapper.find('[data-testid="error-service-NEW-service_location"]').text()).toContain('max 500 characters');
        });
    });

    describe('AC4 — activation_rfs_rules', () => {
        it('requires RFS date for Activation and Upgrade/Downgrade, but optional for Deactivation; does not enforce future-only date', async () => {
            // Activation with empty RFS date
            const wrapperActivation = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        installation_rfs_date: '',
                    },
                },
            });

            await wrapperActivation.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperActivation.find('[data-testid="error-installation-rfs-date"]').text()).toContain('Installation date (RFS) is required');

            // RFS date in past (e.g. 2020-01-01) is valid and MUST NOT be rejected
            await wrapperActivation.setProps({
                modelValue: {
                    ...validActivationData,
                    installation_rfs_date: '2020-01-01',
                },
            });
            await wrapperActivation.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperActivation.find('[data-testid="error-installation-rfs-date"]').exists()).toBe(false);

            // Deactivation with empty RFS date is valid and optional
            const wrapperDeactivation = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Deactivation',
                    modelValue: {
                        customer_name: 'PT Telco Nusantara',
                        contact_name: 'Budi Santoso',
                        installation_rfs_date: null,
                        references: [],
                        service_blocks: [
                            {
                                service_context: 'EXISTING',
                                service_id: 'SID-EX-01',
                                service_status: 'DEACTIVATED',
                                service_description: 'To deactivate',
                                service_location: 'Loc',
                            },
                        ],
                    },
                },
            });

            expect(wrapperDeactivation.find('[data-testid="indicator-rfs-date"]').text()).toContain('Optional');
            await wrapperDeactivation.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperDeactivation.find('[data-testid="error-installation-rfs-date"]').exists()).toBe(false);
        });
    });
});
