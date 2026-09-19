import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GeneralServiceSection from './GeneralServiceSection.vue';
import type { ActivationDraftFields } from '../draftPayload';

describe('FE-20: Activation general, references dan service blocks (GeneralServiceSection)', () => {
    const validActivationData: ActivationDraftFields = {
        customer_name: 'PT Telco Nusantara',
        contact_name: 'Budi Santoso',
        installation_rfs_date: '2026-10-01',
        references: [{ reference_type: 'IWO', specification: 'IWO-9912' }],
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

        it('F-20-3: handles canonical machine values and fails closed for unrecognized subtype', async () => {
            // Canonical machine value 'ACTIVATION' maps to Activation requirement
            const wrapperCanonicalAct = mount(GeneralServiceSection, {
                props: {
                    subtype: 'ACTIVATION' as unknown as 'Activation',
                    modelValue: {
                        customer_name: 'C',
                        contact_name: 'K',
                        installation_rfs_date: '2026-01-01',
                        references: [],
                        service_blocks: [],
                    },
                },
            });
            expect(wrapperCanonicalAct.find('[data-testid="indicator-new-service"]').text()).toContain('Required');
            await wrapperCanonicalAct.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperCanonicalAct.emitted('submit-valid')).toBeFalsy();
            expect(wrapperCanonicalAct.find('[data-testid="error-service-NEW"]').text()).toContain(
                'NEW service block is required',
            );

            // Canonical machine value 'UPGRADE_DOWNGRADE' maps to Upgrade/Downgrade requirement
            const wrapperCanonicalUD = mount(GeneralServiceSection, {
                props: {
                    subtype: 'UPGRADE_DOWNGRADE' as unknown as 'Activation',
                    modelValue: {
                        customer_name: 'C',
                        contact_name: 'K',
                        installation_rfs_date: '2026-01-01',
                        references: [],
                        service_blocks: [],
                    },
                },
            });
            expect(wrapperCanonicalUD.find('[data-testid="indicator-existing-service"]').text()).toContain('Required');
            expect(wrapperCanonicalUD.find('[data-testid="indicator-new-service"]').text()).toContain('Required');

            // Unrecognized / bogus subtype fails closed (emits submit-invalid with unrecognized subtype error)
            const wrapperBogus = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Bogus' as unknown as 'Activation',
                    modelValue: {
                        customer_name: 'C',
                        contact_name: 'K',
                        installation_rfs_date: '2026-01-01',
                        references: [],
                        service_blocks: [],
                    },
                },
            });
            await wrapperBogus.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperBogus.emitted('submit-valid')).toBeFalsy();
            expect(wrapperBogus.emitted('submit-invalid')).toBeTruthy();
            const errs = wrapperBogus.emitted('submit-invalid')?.[0]?.[0] as Record<string, string>;
            expect(errs.subtype).toBe('Unrecognized subtype: Bogus');
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
                        references: [{ reference_type: 'OTHER', specification: null }],
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

        it('retains entered specification when a reference is unticked and re-ticked (anti-clobber)', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        customer_name: 'PT Telco',
                        contact_name: 'Budi',
                        installation_rfs_date: '2026-10-01',
                        references: [{ reference_type: 'OTHER', specification: 'Custom Spec 123' }],
                    },
                },
            });

            // Untick OTHER
            const otherCheckbox = wrapper.find('[data-testid="ref-checkbox-OTHER"]');
            await otherCheckbox.setValue(false);
            expect(wrapper.vm.getDraftPayload().references).toEqual([]);

            // Re-tick OTHER: specification must still be 'Custom Spec 123'
            await otherCheckbox.setValue(true);
            expect(wrapper.vm.getDraftPayload().references).toEqual([
                { reference_type: 'OTHER', specification: 'Custom Spec 123' },
            ]);
        });

        it('F-20-4: exposes isDirty and does not let stale modelValue clobber in-flight user edits', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        customer_name: 'Server Initial',
                        contact_name: 'Contact 1',
                        installation_rfs_date: '2026-10-01',
                    },
                },
            });

            expect(wrapper.vm.isDirty).toBe(false);

            // User types dirty edit into customer name
            const custInput = wrapper.find('[data-testid="input-customer-name"]');
            await custInput.setValue('Dirty Local Edit');

            expect(wrapper.vm.isDirty).toBe(true);
            expect(wrapper.vm.getDraftPayload().customer_name).toBe('Dirty Local Edit');

            // Stale modelValue arrives from parent re-render
            await wrapper.setProps({
                modelValue: {
                    customer_name: 'Server Initial',
                    contact_name: 'Contact 1',
                    installation_rfs_date: '2026-10-01',
                },
            });

            // Must NOT clobber in-flight dirty edit!
            expect(wrapper.vm.isDirty).toBe(true);
            expect(wrapper.vm.getDraftPayload().customer_name).toBe('Dirty Local Edit');
            expect((custInput.element as HTMLInputElement).value).toBe('Dirty Local Edit');

            // resetDirty allows parent to explicitly clear dirty state if needed
            wrapper.vm.resetDirty();
            expect(wrapper.vm.isDirty).toBe(false);
        });

        it('F-20-5: does not emit empty collections if modelValue omitted them and form has no content for them', () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Deactivation',
                    modelValue: {
                        customer_name: 'Seeded Customer',
                        contact_name: 'Seeded Contact',
                        // references and service_blocks omitted!
                    },
                },
            });

            const draft = wrapper.vm.getDraftPayload();
            // Should NOT fabricate empty references array or not-started service blocks
            expect(draft.references).toBeUndefined();
            expect(draft.service_blocks).toBeUndefined();
        });

        it('F-20-10: builds draft from an explicit allowlist and does not echo unmodelled props', () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        customer_name: 'Customer',
                        contact_name: 'Contact',
                        installation_rfs_date: '2026-10-01',
                        password: 'SECRET_PASSWORD',
                        token: 'SECRET_TOKEN',
                        internal_notes: 'CONFIDENTIAL',
                    } as unknown as ActivationDraftFields,
                },
            });

            const draft = wrapper.vm.getDraftPayload() as Record<string, unknown>;
            expect(draft.password).toBeUndefined();
            expect(draft.token).toBeUndefined();
            expect(draft.internal_notes).toBeUndefined();
            expect(Object.keys(draft).sort()).toEqual(['contact_name', 'customer_name', 'installation_rfs_date']);
        });

        it('F-20-11: mounts safely when modelValue is null', () => {
            expect(() => {
                mount(GeneralServiceSection, {
                    props: {
                        subtype: 'Activation',
                        modelValue: null as unknown as ActivationDraftFields,
                    },
                });
            }).not.toThrow();
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

            // M1/M2/M3 defense: assert maxlength attributes on DOM inputs
            expect(wrapper.find('[data-testid="input-customer-name"]').attributes('maxlength')).toBe('150');
            expect(wrapper.find('[data-testid="input-contact-name"]').attributes('maxlength')).toBe('150');
            expect(wrapper.find('[data-testid="input-service-EXISTING-service_id"]').attributes('maxlength')).toBe(
                '100',
            );
            expect(wrapper.find('[data-testid="input-service-NEW-service_id"]').attributes('maxlength')).toBe('100');
            expect(wrapper.find('[data-testid="input-service-NEW-service_description"]').attributes('maxlength')).toBe(
                '2000',
            );
            expect(wrapper.find('[data-testid="input-service-NEW-service_location"]').attributes('maxlength')).toBe(
                '500',
            );

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

            // M12 defense: whitespace-only customer name must be rejected as required
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    customer_name: '     ',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-customer-name"]').text()).toContain('Customer name is required');
        });

        it('requires specification max 255 for OTHER reference upon submit, but OTHER specification is not required in draft', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        references: [{ reference_type: 'OTHER', specification: '' }],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').text()).toContain(
                'Specification is required for OTHER',
            );

            // > 255 chars on OTHER
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    references: [{ reference_type: 'OTHER', specification: 'x'.repeat(256) }],
                },
            });
            expect(wrapper.find('[data-testid="ref-spec-input-OTHER"]').attributes('maxlength')).toBe('255');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').text()).toContain('max 255 characters');

            // 255 chars valid on OTHER
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    references: [{ reference_type: 'OTHER', specification: 'x'.repeat(255) }],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-OTHER"]').exists()).toBe(false);

            // Optional reference (IWO) with > 255 chars specification fails submit validation
            await wrapper.setProps({
                modelValue: {
                    ...validActivationData,
                    references: [{ reference_type: 'IWO', specification: 'y'.repeat(256) }],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.find('[data-testid="error-ref-IWO"]').text()).toContain('max 255 characters');
        });

        it('F-20-9: surfaces error for unknown/prototype-chain reference_type instead of silently dropping', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        references: [
                            { reference_type: 'toString' as unknown as 'OTHER', specification: 'Custom Spec' },
                        ],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-valid')).toBeFalsy();
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            const errs = wrapper.emitted('submit-invalid')?.[0]?.[0] as Record<string, string>;
            expect(errs.references).toBe('Invalid reference_type: toString');
        });

        it('F-20-7: gates validateSubmit when disabled or readonly is set', () => {
            const wrapperReadonly = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    readonly: true,
                    modelValue: validActivationData,
                },
            });

            // validateSubmit must fail closed when readonly
            expect(wrapperReadonly.vm.validateSubmit()).toBe(false);
            expect(wrapperReadonly.emitted('submit-valid')).toBeFalsy();
            expect(wrapperReadonly.emitted('submit-invalid')).toBeTruthy();
            const errsRO = wrapperReadonly.emitted('submit-invalid')?.[0]?.[0] as Record<string, string>;
            expect(errsRO.form).toBe('Form is readonly or disabled');

            const wrapperDisabled = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    disabled: true,
                    modelValue: validActivationData,
                },
            });

            // validateSubmit must fail closed when disabled
            expect(wrapperDisabled.vm.validateSubmit()).toBe(false);
            expect(wrapperDisabled.emitted('submit-valid')).toBeFalsy();
            expect(wrapperDisabled.emitted('submit-invalid')).toBeTruthy();
            const errsDis = wrapperDisabled.emitted('submit-invalid')?.[0]?.[0] as Record<string, string>;
            expect(errsDis.form).toBe('Form is readonly or disabled');

            // Hidden trigger button has aria-hidden and tabindex -1
            const btn = wrapperDisabled.find('[data-testid="validate-submit-btn"]');
            expect(btn.attributes('aria-hidden')).toBe('true');
            expect(btn.attributes('tabindex')).toBe('-1');
        });

        it('F-20-2: enforces max length limits in value path and prevents over-long payload submission', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        ...validActivationData,
                        customer_name: 'a'.repeat(151),
                        contact_name: 'b'.repeat(151),
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

            // validateSubmit rejects over-long values with submit-invalid
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-valid')).toBeFalsy();
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            const errs = wrapper.emitted('submit-invalid')?.[0]?.[0] as Record<string, string>;
            expect(errs.customer_name).toContain('max 150 characters');
            expect(errs.contact_name).toContain('max 150 characters');
            expect(errs.service_NEW_service_id).toContain('max 100 characters');
            expect(errs.service_NEW_service_description).toContain('max 2000 characters');
            expect(errs.service_NEW_service_location).toContain('max 500 characters');
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
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_status"]').text()).toContain(
                'Service status is required',
            );
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_description"]').text()).toContain(
                'Service description is required',
            );
            expect(wrapper.find('[data-testid="error-service-EXISTING-service_location"]').text()).toContain(
                'Service location is required',
            );
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
            expect(wrapper.find('[data-testid="error-service-NEW-service_description"]').text()).toContain(
                'max 2000 characters',
            );
            expect(wrapper.find('[data-testid="error-service-NEW-service_location"]').text()).toContain(
                'max 500 characters',
            );
        });

        it('emits submit-invalid with errors dictionary when submit validation fails', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    modelValue: {
                        customer_name: '',
                        contact_name: '',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            const emittedErrors = wrapper.emitted('submit-invalid')![0]![0] as Record<string, string>;
            expect(emittedErrors.customer_name).toBeDefined();
            expect(emittedErrors.contact_name).toBeDefined();
        });

        it('handles direct input event triggering and emits update:modelValue', async () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Upgrade/Downgrade',
                    modelValue: {
                        ...validActivationData,
                        service_blocks: [
                            {
                                service_context: 'EXISTING',
                                service_id: 'EX-1',
                                service_status: 'ACTIVATED',
                                service_description: 'Desc',
                                service_location: 'Loc',
                            },
                            {
                                service_context: 'NEW',
                                service_id: 'NEW-1',
                                service_status: 'ACTIVATED',
                                service_description: 'Desc',
                                service_location: 'Loc',
                            },
                        ],
                    },
                },
            });

            const custInput = wrapper.find('[data-testid="input-customer-name"]');
            await custInput.setValue('Updated Customer Name');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const rfsInput = wrapper.find('[data-testid="input-installation-rfs-date"]');
            await rfsInput.setValue('2026-11-15');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const exIdInput = wrapper.find('[data-testid="input-service-EXISTING-service_id"]');
            await exIdInput.setValue('EX-MODIFIED');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const exStatusSelect = wrapper.find('[data-testid="select-service-EXISTING-service_status"]');
            await exStatusSelect.setValue('DEACTIVATED');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const exDescInput = wrapper.find('[data-testid="input-service-EXISTING-service_description"]');
            await exDescInput.setValue('Updated existing desc');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const exLocInput = wrapper.find('[data-testid="input-service-EXISTING-service_location"]');
            await exLocInput.setValue('Updated existing loc');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const statusSelect = wrapper.find('[data-testid="select-service-NEW-service_status"]');
            await statusSelect.setValue('DEACTIVATED');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const descInput = wrapper.find('[data-testid="input-service-NEW-service_description"]');
            await descInput.setValue('Updated description');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const locInput = wrapper.find('[data-testid="input-service-NEW-service_location"]');
            await locInput.setValue('Updated location');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            const specInput = wrapper.find('[data-testid="ref-spec-input-IWO"]');
            await specInput.setValue('IWO-SPEC-UPDATED');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            // Direct input event on status select and service id for NEW
            const newIdInput = wrapper.find('[data-testid="input-service-NEW-service_id"]');
            await newIdInput.setValue('NEW-MODIFIED');
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();

            // Toggle reference off
            const refCheckbox = wrapper.find('[data-testid="ref-checkbox-IWO"]');
            await refCheckbox.setValue(false);
            expect(wrapper.emitted('update:modelValue')).toBeTruthy();
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
            expect(wrapperActivation.find('[data-testid="error-installation-rfs-date"]').text()).toContain(
                'Installation date (RFS) is required',
            );

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

            // M13 defense: Upgrade/Downgrade subtype MUST require RFS date
            const wrapperUpgrade = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Upgrade/Downgrade',
                    modelValue: {
                        ...validActivationData,
                        installation_rfs_date: '',
                    },
                },
            });
            expect(wrapperUpgrade.find('[data-testid="indicator-rfs-date"]').text()).toContain('Required');
            await wrapperUpgrade.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperUpgrade.find('[data-testid="error-installation-rfs-date"]').text()).toContain(
                'Installation date (RFS) is required',
            );
        });

        it('M5/M6 defense: verifies disabled/readonly attributes on inputs and reference checkboxes', () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    readonly: true,
                    modelValue: validActivationData,
                },
            });

            // Text inputs must have readonly attribute
            expect(wrapper.find('[data-testid="input-customer-name"]').attributes('readonly')).toBeDefined();
            expect(wrapper.find('[data-testid="input-contact-name"]').attributes('readonly')).toBeDefined();

            // Checkboxes must be disabled when readonly is true
            expect(wrapper.find('[data-testid="ref-checkbox-IWO"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="ref-checkbox-OTHER"]').attributes('disabled')).toBeDefined();
        });

        it('M4 defense: ensures requestDate header renders as text and does not use raw HTML sink', () => {
            const wrapper = mount(GeneralServiceSection, {
                props: {
                    subtype: 'Activation',
                    requestDate: '<img src=x onerror=1>',
                    modelValue: validActivationData,
                },
            });
            const header = wrapper.find('[data-testid="request-date-header"]');
            expect(header.find('img').exists()).toBe(false);
            expect(header.text()).toContain('<img src=x onerror=1>');
        });
    });
});
