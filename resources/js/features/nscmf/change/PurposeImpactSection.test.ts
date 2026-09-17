import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PurposeImpactSection from './PurposeImpactSection.vue';

describe('FE-24: Change purpose, problems and service impacts (PurposeImpactSection)', () => {
    describe('AC1 — change_purpose_subtype_matrix', () => {
        it('requires maintenance_purpose for Maintenance subtype upon submit validation', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: '',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Issue 1' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });

            // Trigger submit validation
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Maintenance purpose is required for Maintenance');
            expect(wrapper.emitted('validate')).toBeTruthy();

            // When maintenance_purpose is provided, error clears
            await wrapper.setProps({
                modelValue: {
                    maintenance_purpose: 'Routine router check',
                    facing_challenges: [],
                    identified_problems: [{ row_no: 1, problem_text: 'Issue 1' }],
                    service_impacts: [{ impact_code: 'POP', other_description: null }],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Maintenance purpose is required for Maintenance');
        });

        it('requires facing_challenges for Upgrade and Emergency upon submit validation, but optional on Maintenance', async () => {
            // Upgrade with empty challenges
            const wrapperUpgrade = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Upgrade',
                    modelValue: {
                        maintenance_purpose: null,
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Core issue' }],
                        service_impacts: [{ impact_code: 'NOC15', other_description: null }],
                    },
                },
            });

            await wrapperUpgrade.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperUpgrade.text()).toContain('At least one challenge is required');

            // Emergency with empty challenges
            const wrapperEmergency = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Emergency',
                    modelValue: {
                        maintenance_purpose: null,
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Core issue' }],
                        service_impacts: [{ impact_code: 'NOC23', other_description: null }],
                    },
                },
            });

            await wrapperEmergency.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperEmergency.text()).toContain('At least one challenge is required');

            // Empty challenges on Maintenance does NOT trigger challenges error
            const wrapperMaint = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Firmware upgrade',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Core issue' }],
                        service_impacts: [{ impact_code: 'NOC23', other_description: null }],
                    },
                },
            });
            await wrapperMaint.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperMaint.text()).not.toContain('At least one challenge is required');
        });

        it('requires >=1 identified problem and >=1 impact for all subtypes upon submit validation', async () => {
            for (const subtype of ['Maintenance', 'Upgrade', 'Emergency'] as const) {
                const wrapper = mount(PurposeImpactSection, {
                    props: {
                        subtype,
                        modelValue: {
                            maintenance_purpose: subtype === 'Maintenance' ? 'Valid purpose' : null,
                            facing_challenges: subtype !== 'Maintenance' ? [{ row_no: 1, challenge_text: 'Ch 1' }] : [],
                            identified_problems: [],
                            service_impacts: [],
                        },
                    },
                });

                await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
                expect(wrapper.text()).toContain('At least one identified problem is required');
                expect(wrapper.text()).toContain('At least one service impact must be selected');
            }
        });

        it('validates 4000 character limit on maintenance_purpose and 1000 limit on challenges/problems', async () => {
            const longPurpose = 'a'.repeat(4001);
            const longChallenge = 'b'.repeat(1001);
            const longProblem = 'c'.repeat(1001);

            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: longPurpose,
                        facing_challenges: [{ row_no: 1, challenge_text: longChallenge }],
                        identified_problems: [{ row_no: 1, problem_text: longProblem }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Maintenance purpose must not exceed 4000 characters');
            expect(wrapper.text()).toContain('Each facing challenge must not exceed 1000 characters');
            expect(wrapper.text()).toContain('Each identified problem must not exceed 1000 characters');
        });
    });

    describe('AC2 — change_impact_full_enum', () => {
        it('renders all 7 impacts including NOC361 and serializes selected NOC15 with null other_description', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Purpose',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                        service_impacts: [],
                    },
                },
            });

            const expectedEnums = ['NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER'];
            for (const code of expectedEnums) {
                const checkbox = wrapper.find(`[data-testid="impact-${code}"]`);
                expect(checkbox.exists()).toBe(true);
            }

            // Click NOC15 to select
            await wrapper.find('[data-testid="impact-NOC15"]').trigger('click');
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeTruthy();
            expect(emitted!.length).toBeGreaterThan(0);
            const lastPayload = emitted![emitted!.length - 1]![0] as {
                service_impacts: Array<{ impact_code: string; other_description: string | null }>;
            };
            expect(lastPayload.service_impacts).toContainEqual({
                impact_code: 'NOC15',
                other_description: null,
            });

            // Click NOC15 again to toggle off
            await wrapper.find('[data-testid="impact-NOC15"]').trigger('click');
            const toggleOffPayload = emitted![emitted!.length - 1]![0] as {
                service_impacts: Array<{ impact_code: string; other_description: string | null }>;
            };
            expect(toggleOffPayload.service_impacts.some((i) => i.impact_code === 'NOC15')).toBe(false);
        });
    });

    describe('AC3 — change_other_limit', () => {
        it('accepts 500 characters for OTHER, rejects 501 characters', async () => {
            const str500 = 'a'.repeat(500);
            const str501 = 'a'.repeat(501);

            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: str500 }],
                    },
                },
            });

            // 500 characters should have no length error
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Other description must not exceed 500 characters');

            // 501 characters should display length error
            await wrapper.setProps({
                modelValue: {
                    maintenance_purpose: 'Valid',
                    facing_challenges: [],
                    identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                    service_impacts: [{ impact_code: 'OTHER', other_description: str501 }],
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Other description must not exceed 500 characters');
        });

        it('keeps OTHER without description valid for draft, but flags error on submit validation', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: '',
                        facing_challenges: [],
                        identified_problems: [],
                        service_impacts: [{ impact_code: 'OTHER', other_description: '' }],
                    },
                },
            });

            // Draft export / serialization should NOT throw; draft preserves selection
            const draftPayload = wrapper.vm.getDraftPayload();
            expect(draftPayload.service_impacts).toEqual([{ impact_code: 'OTHER', other_description: null }]);

            // Submit validation flags error
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Other description is required when OTHER impact is selected');
        });

        it('allows updating other description input directly', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: 'Initial' }],
                    },
                },
            });

            const input = wrapper.find('[data-testid="other-description-input"]');
            await input.setValue('Updated customer impact');
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeTruthy();
            expect(emitted!.length).toBeGreaterThan(0);
            const lastPayload = emitted![emitted!.length - 1]![0] as {
                service_impacts: Array<{ impact_code: string; other_description: string | null }>;
            };
            expect(lastPayload.service_impacts).toContainEqual({
                impact_code: 'OTHER',
                other_description: 'Updated customer impact',
            });
        });
    });

    describe('AC4 — change_keeps_partial_rows', () => {
        it('permits draft with 0 rows or partial rows with natural keys capped at 3', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: null,
                        facing_challenges: [{ row_no: 1, challenge_text: 'Partial challenge' }],
                        identified_problems: [{ row_no: 1, problem_text: '' }],
                        service_impacts: [],
                    },
                },
            });

            const draftPayload = wrapper.vm.getDraftPayload();
            expect(draftPayload.facing_challenges).toEqual([{ row_no: 1, challenge_text: 'Partial challenge' }]);
            // empty problem is discarded in draftPayload per AC3 of FE-19
            expect(draftPayload.identified_problems).toEqual([]);

            // Adding rows interactively
            const addChallengeBtn = wrapper.find('[data-testid="add-challenge-btn"]');
            await addChallengeBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="challenge-input-"]').length).toBe(2);

            // Removing row
            const removeBtn = wrapper.find('[data-testid="remove-challenge-btn-0"]');
            await removeBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="challenge-input-"]').length).toBe(1);

            // Adding problem interactively
            const addProblemBtn = wrapper.find('[data-testid="add-problem-btn"]');
            await addProblemBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="problem-input-"]').length).toBe(2);

            // Removing problem
            const removeProblemBtn = wrapper.find('[data-testid="remove-problem-btn-0"]');
            await removeProblemBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="problem-input-"]').length).toBe(1);

            // Cannot add more than 3 rows
            await wrapper.setProps({
                modelValue: {
                    maintenance_purpose: null,
                    facing_challenges: [
                        { row_no: 1, challenge_text: 'C1' },
                        { row_no: 2, challenge_text: 'C2' },
                        { row_no: 3, challenge_text: 'C3' },
                    ],
                    identified_problems: [
                        { row_no: 1, problem_text: 'P1' },
                        { row_no: 2, problem_text: 'P2' },
                        { row_no: 3, problem_text: 'P3' },
                    ],
                    service_impacts: [],
                },
            });

            expect(wrapper.find('[data-testid="add-challenge-btn"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="add-problem-btn"]').attributes('disabled')).toBeDefined();
        });

        it('supports disabled and readonly props', () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Upgrade',
                    disabled: true,
                    readonly: true,
                    modelValue: {
                        maintenance_purpose: 'Test purpose',
                        facing_challenges: [{ row_no: 1, challenge_text: 'Ch 1' }],
                        identified_problems: [{ row_no: 1, problem_text: 'Pr 1' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: 'Detail' }],
                    },
                },
            });

            expect(wrapper.find('[data-testid="maintenance-purpose-input"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="challenge-input-0"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="problem-input-0"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="impact-NOC15"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="other-description-input"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="remove-challenge-btn-0"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="remove-problem-btn-0"]').exists()).toBe(false);
        });
    });
});
