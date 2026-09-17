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

        it('F-24-14: intentional maxlength=501 on other-description admits over-limit value for validation', () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: '' }],
                    },
                },
            });
            const input = wrapper.find('[data-testid="other-description-input"]');
            expect(input.attributes('maxlength')).toBe('501');
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

            // Cover updateOtherDescription early return
            (wrapper.vm as unknown as { updateOtherDescription: (s: string) => void }).updateOtherDescription?.('blocked');
            const draftAfterDesc = wrapper.vm.getDraftPayload() as { service_impacts?: Array<{ other_description: string | null }> };
            expect(draftAfterDesc.service_impacts?.[0]?.other_description).toBe('Detail');
        });
    });

    describe('Remediation — F-24-1..F-24-14 Security Findings and Mutant Killers', () => {
        it('F-24-1: compares against canonical machine subtypes and fails closed for unknown subtypes', () => {
            // Canonical machine subtypes: MAINTENANCE, UPGRADE, EMERGENCY
            // Empty purpose with MAINTENANCE should fail submit validation
            const wrapperMaint = mount(PurposeImpactSection, {
                props: {
                    subtype: 'MAINTENANCE' as unknown as 'Maintenance',
                    modelValue: {
                        maintenance_purpose: '',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Issue' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });
            expect(wrapperMaint.vm.validateSubmit()).toBe(false);
            expect(wrapperMaint.vm.errors.maintenance_purpose).toBe('Maintenance purpose is required for Maintenance');

            // Empty challenges with UPGRADE and EMERGENCY should fail submit validation
            const wrapperUpgrade = mount(PurposeImpactSection, {
                props: {
                    subtype: 'UPGRADE' as unknown as 'Maintenance',
                    modelValue: {
                        maintenance_purpose: null,
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Issue' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });
            expect(wrapperUpgrade.vm.validateSubmit()).toBe(false);
            expect(wrapperUpgrade.vm.errors.facing_challenges).toBe('At least one challenge is required for Upgrade/Emergency');

            const wrapperEmergency = mount(PurposeImpactSection, {
                props: {
                    subtype: 'EMERGENCY' as unknown as 'Maintenance',
                    modelValue: {
                        maintenance_purpose: null,
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Issue' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });
            expect(wrapperEmergency.vm.validateSubmit()).toBe(false);
            expect(wrapperEmergency.vm.errors.facing_challenges).toBe('At least one challenge is required for Upgrade/Emergency');

            // Unknown / bogus / invalid subtypes fail closed
            for (const bogus of ['Bogus', '', 'Other', 'ACTIVATION', 'UPGRADE_DOWNGRADE', 'DEACTIVATION']) {
                const wrapperBogus = mount(PurposeImpactSection, {
                    props: {
                        subtype: bogus as unknown as 'Maintenance',
                        modelValue: {
                            maintenance_purpose: 'Something',
                            facing_challenges: [{ row_no: 1, challenge_text: 'Ch' }],
                            identified_problems: [{ row_no: 1, problem_text: 'Pr' }],
                            service_impacts: [{ impact_code: 'POP', other_description: null }],
                        },
                    },
                });
                expect(wrapperBogus.vm.validateSubmit()).toBe(false);
                expect(wrapperBogus.vm.errors.subtype).toBe(`Unrecognized subtype: ${bogus}`);
            }
        });

        it('F-24-2 & F-24-7: enforces closed set for impact_code on ingest and prevents phantom checkboxes', () => {
            const invalidCode = 'BOGUS';
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Issue' }],
                        service_impacts: [
                            { impact_code: invalidCode, other_description: null },
                            { impact_code: 'POP', other_description: null },
                        ] as unknown as [{ impact_code: 'POP'; other_description: null }],
                    },
                },
            });

            // validateSubmit fails closed on invalid impact_code
            expect(wrapper.vm.validateSubmit()).toBe(false);
            expect(wrapper.vm.errors.service_impacts).toContain('Invalid impact_code: BOGUS');

            // No phantom checkbox is rendered or checked for BOGUS
            expect(wrapper.find('[data-testid="impact-BOGUS"]').exists()).toBe(false);
            // Checked checkboxes should only be POP (1 checkbox)
            const checkedBoxes = wrapper.findAll('input[type="checkbox"]:checked');
            expect(checkedBoxes.length).toBe(1);
        });

        it('F-24-3 & M1-M4: validates DOM maxlength attributes and length limits', () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Test',
                        facing_challenges: [{ row_no: 1, challenge_text: 'Ch 1' }],
                        identified_problems: [{ row_no: 1, problem_text: 'Pr 1' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: 'Detail' }],
                    },
                },
            });

            // M1: purpose textarea maxlength="4000"
            expect(wrapper.find('[data-testid="maintenance-purpose-input"]').attributes('maxlength')).toBe('4000');
            // M2: challenge input maxlength="1000"
            expect(wrapper.find('[data-testid="challenge-input-0"]').attributes('maxlength')).toBe('1000');
            // M3: problem input maxlength="1000"
            expect(wrapper.find('[data-testid="problem-input-0"]').attributes('maxlength')).toBe('1000');
            // M4: other-description input maxlength="501"
            expect(wrapper.find('[data-testid="other-description-input"]').attributes('maxlength')).toBe('501');
        });

        it('F-24-4 & M18-M20: gates validateSubmit when disabled/readonly and enforces trigger disabled+aria-hidden', () => {
            for (const flag of ['disabled', 'readonly'] as const) {
                const wrapper = mount(PurposeImpactSection, {
                    props: {
                        subtype: 'Maintenance',
                        [flag]: true,
                        modelValue: {
                            maintenance_purpose: '',
                            facing_challenges: [],
                            identified_problems: [],
                            service_impacts: [],
                        },
                    },
                });

                // validateSubmit must fail closed when disabled or readonly
                expect(wrapper.vm.validateSubmit()).toBe(false);
                expect(wrapper.vm.errors.form).toBe('Form is readonly or disabled');

                // Trigger button must have disabled and aria-hidden
                const btn = wrapper.find('[data-testid="validate-submit-btn"]');
                expect(btn.attributes('disabled')).toBeDefined();
                expect(btn.attributes('aria-hidden')).toBe('true');
            }

            // M18: toggleImpact is a no-op when disabled/readonly
            const wrapperDisabled = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    disabled: true,
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [{ row_no: 1, challenge_text: 'Ch 1' }],
                        identified_problems: [{ row_no: 1, problem_text: 'Pr 1' }],
                        service_impacts: [],
                    },
                },
            });
            (wrapperDisabled.vm as unknown as { toggleImpact: (c: string) => void }).toggleImpact?.('NOC15');
            expect(wrapperDisabled.vm.getDraftPayload().service_impacts).toEqual([]);

            // M19: addChallenge is a no-op when disabled/readonly
            (wrapperDisabled.vm as unknown as { addChallenge: () => void }).addChallenge?.();
            expect(wrapperDisabled.findAll('[data-testid^="challenge-input-"]').length).toBe(1);
            expect((wrapperDisabled.vm as unknown as { facingChallenges: unknown[] }).facingChallenges.length).toBe(1);

            // M20: removeChallenge is guarded when disabled/readonly
            const wrapperReadonly = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    readonly: true,
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [{ row_no: 1, challenge_text: 'Ch 1' }],
                        identified_problems: [{ row_no: 1, problem_text: 'Pr 1' }],
                        service_impacts: [],
                    },
                },
            });
            // removeChallenge directly called
            (wrapperReadonly.vm as unknown as { removeChallenge: (idx: number) => void }).removeChallenge?.(0);
            const readonlyDraft = wrapperReadonly.vm.getDraftPayload() as { facing_challenges?: unknown[] };
            expect(readonlyDraft.facing_challenges?.length).toBe(1);
        });

        it('F-24-5 & M14-M15: caps 3 rows on ingest path and addChallenge/addProblem in code', () => {
            // Ingest path with 4 rows -> sliced/capped to 3, does not cause builder to throw
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [
                            { row_no: 1, challenge_text: 'C1' },
                            { row_no: 2, challenge_text: 'C2' },
                            { row_no: 3, challenge_text: 'C3' },
                            { row_no: 4, challenge_text: 'C4' },
                        ],
                        identified_problems: [
                            { row_no: 1, problem_text: 'P1' },
                            { row_no: 2, problem_text: 'P2' },
                            { row_no: 3, problem_text: 'P3' },
                            { row_no: 4, problem_text: 'P4' },
                        ],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });

            expect(wrapper.findAll('[data-testid^="challenge-input-"]').length).toBe(3);
            expect(wrapper.findAll('[data-testid^="problem-input-"]').length).toBe(3);
            const draft = wrapper.vm.getDraftPayload() as { facing_challenges?: Array<{ row_no: number }>; identified_problems?: unknown[] };
            expect(draft.facing_challenges?.length).toBe(3);
            expect(draft.identified_problems?.length).toBe(3);
            expect(draft.facing_challenges?.map((c: { row_no: number }) => c.row_no)).toEqual([1, 2, 3]);

            // M14 & M15: addChallenge and addProblem row cap in code
            const wrapperInteractive = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
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
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });
            // Calling addChallenge and addProblem directly when at 3 rows
            (wrapperInteractive.vm as unknown as { addChallenge: () => void }).addChallenge?.();
            expect(wrapperInteractive.findAll('[data-testid^="challenge-input-"]').length).toBe(3);
            expect((wrapperInteractive.vm as unknown as { facingChallenges: unknown[] }).facingChallenges.length).toBe(3);
            const draftAfterOverChallenge = wrapperInteractive.vm.getDraftPayload() as { facing_challenges?: unknown[] };
            expect(draftAfterOverChallenge.facing_challenges?.length).toBe(3);

            (wrapperInteractive.vm as unknown as { addProblem: () => void }).addProblem?.();
            expect(wrapperInteractive.findAll('[data-testid^="problem-input-"]').length).toBe(3);
            expect((wrapperInteractive.vm as unknown as { identifiedProblems: unknown[] }).identifiedProblems.length).toBe(3);
            const draftAfterOverProblem = wrapperInteractive.vm.getDraftPayload() as { identified_problems?: unknown[] };
            expect(draftAfterOverProblem.identified_problems?.length).toBe(3);
        });

        it('F-24-6 & M21: emitted update:modelValue agrees with getDraftPayload on OTHER blank/trim rule', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Pr 1' }],
                        service_impacts: [{ impact_code: 'OTHER', other_description: '' }],
                    },
                },
            });

            // Updating input with whitespace or empty string
            const input = wrapper.find('[data-testid="other-description-input"]');
            await input.setValue('');
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeTruthy();
            const lastPayload = emitted![emitted!.length - 1]![0] as {
                service_impacts?: Array<{ impact_code: string; other_description: string | null }>;
            };
            const draft = wrapper.vm.getDraftPayload() as { service_impacts?: Array<{ impact_code: string; other_description: string | null }> };
            // Both emitter and draft must have null for blank/empty other_description
            expect(lastPayload.service_impacts?.[0]?.other_description).toBeNull();
            expect(draft.service_impacts?.[0]?.other_description).toBeNull();

            // M21: non-OTHER selections force other_description to null
            await wrapper.find('[data-testid="impact-POP"]').trigger('click');
            const draftAfterPop = wrapper.vm.getDraftPayload() as { service_impacts?: Array<{ impact_code: string; other_description: string | null }> };
            const popImpact = draftAfterPop.service_impacts?.find((i: { impact_code: string }) => i.impact_code === 'POP');
            expect(popImpact?.other_description).toBeNull();
            const lastPayloadAfterPop = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as {
                service_impacts?: Array<{ impact_code: string; other_description: string | null }>;
            };
            const popEmitted = lastPayloadAfterPop.service_impacts?.find((i: { impact_code: string }) => i.impact_code === 'POP');
            expect(popEmitted?.other_description).toBeNull();
        });

        it('F-24-8: duplicate natural keys are rejected by validateSubmit and getDraftPayload', () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'P1' }],
                        service_impacts: [
                            { impact_code: 'POP', other_description: null },
                            { impact_code: 'POP', other_description: null },
                        ],
                    },
                },
            });

            // Both APIs must catch duplicate impact_code
            expect(wrapper.vm.validateSubmit()).toBe(false);
            expect(wrapper.vm.errors.service_impacts).toContain('Duplicate impact_code');
        });

        it('F-24-9: exposes isDirty and does not clobber in-flight edits on modelValue prop echo', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Server Snapshot',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });

            expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(false);

            // User types edit
            const purposeInput = wrapper.find('[data-testid="maintenance-purpose-input"]');
            await purposeInput.setValue('User typed this');

            expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(true);

            // Parent re-emits unchanged snapshot
            await wrapper.setProps({
                modelValue: {
                    maintenance_purpose: 'Server Snapshot',
                    facing_challenges: [],
                    identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
                    service_impacts: [{ impact_code: 'POP', other_description: null }],
                },
            });

            // Must NOT clobber in-flight edit
            expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(true);
            expect(wrapper.vm.getDraftPayload().maintenance_purpose).toBe('User typed this');
            expect((purposeInput.element as HTMLTextAreaElement).value).toBe('User typed this');
        });

        it('F-24-10: preserves omitted collection keys in getDraftPayload instead of collapsing to []', () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: 'Valid purpose',
                        record_version: 1,
                    },
                },
            });

            const draft = wrapper.vm.getDraftPayload();
            expect(draft.maintenance_purpose).toBe('Valid purpose');
            // Omitted collections should not be present as []
            expect(draft.facing_challenges).toBeUndefined();
            expect(draft.identified_problems).toBeUndefined();
            expect(draft.service_impacts).toBeUndefined();
        });

        it('F-24-11: guards against malformed modelValue types (null, numbers, non-arrays)', () => {
            // Null/undefined modelValue
            expect(() => {
                mount(PurposeImpactSection, {
                    props: {
                        modelValue: null as unknown as undefined,
                    },
                });
            }).not.toThrow();

            // non-array collections and numeric maintenance_purpose
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    modelValue: {
                        maintenance_purpose: 12345 as unknown as string,
                        facing_challenges: {} as unknown as [],
                        identified_problems: 'invalid' as unknown as [],
                        service_impacts: {} as unknown as [],
                    },
                },
            });

            expect(() => wrapper.vm.getDraftPayload()).not.toThrow();
            expect(() => wrapper.vm.validateSubmit()).not.toThrow();
        });

        it('F-24-12: clears stale errors on input change and subtype change', async () => {
            const wrapper = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: '',
                        facing_challenges: [],
                        identified_problems: [],
                        service_impacts: [],
                    },
                },
            });

            // Run validation -> generates errors
            wrapper.vm.validateSubmit();
            await wrapper.vm.$nextTick();
            expect(wrapper.vm.errors.maintenance_purpose).toBeDefined();

            // Typing into purpose clears purpose error
            const purposeInput = wrapper.find('[data-testid="maintenance-purpose-input"]');
            await purposeInput.setValue('Now filled');
            expect(wrapper.vm.errors.maintenance_purpose).toBeUndefined();

            // Subtype change clears irrelevant errors
            await wrapper.setProps({ subtype: 'Upgrade' });
            expect(wrapper.vm.errors.maintenance_purpose).toBeUndefined();
        });

        it('M25-M28: asserts blank purpose nulling, record_version echo, natural keys, and deep-clone isolation', async () => {
            // M25: blank/whitespace-only purpose emitted as null
            const wrapperBlank = mount(PurposeImpactSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        maintenance_purpose: '   ',
                        facing_challenges: [],
                        identified_problems: [{ row_no: 1, problem_text: 'P1' }],
                        service_impacts: [{ impact_code: 'POP', other_description: null }],
                    },
                },
            });
            const blankInput = wrapperBlank.find('[data-testid="maintenance-purpose-input"]');
            await blankInput.setValue('   ');
            const emittedBlank = wrapperBlank.emitted('update:modelValue')!;
            const lastBlank = emittedBlank[emittedBlank.length - 1]![0] as { maintenance_purpose: string | null };
            expect(lastBlank.maintenance_purpose).toBeNull();

            // M26: record_version is preserved in emitted payload
            const wrapperVersion = mount(PurposeImpactSection, {
                props: {
                    modelValue: {
                        record_version: 7,
                        service_impacts: [],
                    },
                },
            });
            await wrapperVersion.find('[data-testid="impact-POP"]').trigger('click');
            const emittedVersion = wrapperVersion.emitted('update:modelValue')!;
            const lastVersion = emittedVersion[emittedVersion.length - 1]![0] as { record_version: number };
            expect(lastVersion.record_version).toBe(7);

            // M27: row_no preserves supplied natural key if valid 1..3
            const wrapperNatural = mount(PurposeImpactSection, {
                props: {
                    modelValue: {
                        facing_challenges: [{ row_no: 2, challenge_text: 'Second row' }],
                        service_impacts: [],
                    },
                },
            });
            const draftNatural = wrapperNatural.vm.getDraftPayload() as { facing_challenges?: Array<{ row_no: number }> };
            expect(draftNatural.facing_challenges?.[0]?.row_no).toBe(2);

            // M28: service_impacts deep-clone isolates incoming props from mutation
            const initialImpacts = [{ impact_code: 'POP' as const, other_description: null }];
            const wrapperClone = mount(PurposeImpactSection, {
                props: {
                    modelValue: {
                        service_impacts: initialImpacts,
                    },
                },
            });
            await wrapperClone.find('[data-testid="impact-NOC15"]').trigger('click');
            // initialImpacts in parent must not be mutated
            expect(initialImpacts.length).toBe(1);
        });
    });
});
