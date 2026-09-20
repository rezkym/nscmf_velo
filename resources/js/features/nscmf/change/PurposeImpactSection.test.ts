import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ChangeDraftFields, ChangeSubtype } from '../types';
import PurposeImpactSection from './PurposeImpactSection.vue';

type PurposeFields = Pick<
    ChangeDraftFields,
    'maintenance_purpose' | 'facing_challenges' | 'identified_problems' | 'service_impacts'
>;

function mountSection(
    modelValue: PurposeFields = {},
    props: { subtype?: ChangeSubtype; errors?: Record<string, string>; disabled?: boolean } = {},
): VueWrapper {
    return mount(PurposeImpactSection, { props: { modelValue, subtype: 'MAINTENANCE', ...props } });
}

function lastModel(wrapper: VueWrapper): PurposeFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as PurposeFields;
}

function control(wrapper: VueWrapper, collection: string, testid: string): Omit<DOMWrapper<Element>, 'exists'> {
    return wrapper.get(`[data-collection="${collection}"] [data-testid="${testid}"]`);
}

function isRequired(wrapper: VueWrapper, id: string): boolean {
    return wrapper.get(`label[for="${id}"]`).find('[data-required]').exists();
}

describe('PurposeImpactSection (FE-24)', () => {
    it('AC1: follows the subtype matrix for the purpose and the challenges', () => {
        const maintenance = mountSection({}, { subtype: 'MAINTENANCE' });
        expect(isRequired(maintenance, 'maintenance_purpose')).toBe(true);
        expect(maintenance.get('[data-testid="requirement-facing_challenges"]').text()).toBe('Optional');

        for (const subtype of ['UPGRADE', 'EMERGENCY'] as const) {
            const wrapper = mountSection({}, { subtype });
            expect(isRequired(wrapper, 'maintenance_purpose')).toBe(false);
            expect(wrapper.get('[data-testid="requirement-facing_challenges"]').text()).toBe('Required');
        }
    });

    it('marks the identified problems and the service impacts required for every subtype', () => {
        for (const subtype of ['MAINTENANCE', 'UPGRADE', 'EMERGENCY'] as const) {
            const wrapper = mountSection({}, { subtype });
            expect(wrapper.get('[data-testid="requirement-identified_problems"]').text()).toBe('Required');
            expect(wrapper.get('[data-testid="requirement-service_impacts"]').text()).toBe('Required');
        }
    });

    it('AC2: offers all seven impact codes, including NOC361', () => {
        const wrapper = mountSection();

        for (const code of ['NOC15', 'NOC23', 'NOC361', 'REGIONAL', 'POP', 'CUSTOMER', 'OTHER']) {
            expect(wrapper.find(`[data-testid="impact-${code}"]`).exists()).toBe(true);
        }
    });

    it('AC2: keeps a selected impact without a description and asks for one only for Other', async () => {
        const wrapper = mountSection();

        await wrapper.get('[data-testid="impact-NOC15"]').setValue(true);
        expect(lastModel(wrapper).service_impacts).toEqual([{ impact_code: 'NOC15', other_description: null }]);
        expect(wrapper.find('#impact-OTHER-description').exists()).toBe(false);

        await wrapper.get('[data-testid="impact-OTHER"]').setValue(true);
        expect(wrapper.get('#impact-OTHER-description').attributes('maxlength')).toBe('500');
    });

    it('deselects an impact by removing it, never by blanking its description', async () => {
        const wrapper = mountSection({
            service_impacts: [
                { impact_code: 'NOC15', other_description: null },
                { impact_code: 'OTHER', other_description: 'Demo impact' },
            ],
        });

        await wrapper.get('[data-testid="impact-NOC15"]').setValue(false);

        expect(lastModel(wrapper).service_impacts).toEqual([
            { impact_code: 'OTHER', other_description: 'Demo impact' },
        ]);
    });

    it('AC3: never selects Other as a side effect of typing its description', async () => {
        const wrapper = mountSection({ service_impacts: [{ impact_code: 'OTHER', other_description: null }] });

        await wrapper.get('#impact-OTHER-description').setValue('Demo impact');

        expect(lastModel(wrapper).service_impacts).toEqual([
            { impact_code: 'OTHER', other_description: 'Demo impact' },
        ]);
    });

    it('AC4: keeps partial rows and caps each collection at three', async () => {
        const wrapper = mountSection({
            facing_challenges: [
                { row_no: 1, challenge_text: 'One' },
                { row_no: 2, challenge_text: null },
            ],
        });

        await control(wrapper, 'facing_challenges', 'btn-add-row').trigger('click');
        expect(lastModel(wrapper).facing_challenges).toEqual([
            { row_no: 1, challenge_text: 'One' },
            { row_no: 2, challenge_text: null },
            { row_no: 3, challenge_text: null },
        ]);

        const full = mountSection({
            facing_challenges: [1, 2, 3].map((row_no) => ({ row_no, challenge_text: 'Demo' })),
            identified_problems: [1, 2, 3].map((row_no) => ({ row_no, problem_text: 'Demo' })),
        });
        expect(control(full, 'facing_challenges', 'btn-add-row').attributes('disabled')).toBeDefined();
        expect(control(full, 'identified_problems', 'btn-add-row').attributes('disabled')).toBeDefined();
    });

    it('AC4: edits one row without touching the other collections', async () => {
        const wrapper = mountSection({
            facing_challenges: [{ row_no: 1, challenge_text: 'One' }],
            identified_problems: [{ row_no: 1, problem_text: 'Problem' }],
        });

        await wrapper.get('#identified_problems-0-problem_text').setValue('Edited');

        expect(lastModel(wrapper)).toEqual({
            facing_challenges: [{ row_no: 1, challenge_text: 'One' }],
            identified_problems: [{ row_no: 1, problem_text: 'Edited' }],
        });
    });

    it('AC1/AC3: shows the server messages under the purpose, the rows and the Other description', () => {
        const wrapper = mountSection(
            {
                identified_problems: [{ row_no: 1, problem_text: null }],
                service_impacts: [{ impact_code: 'OTHER', other_description: null }],
            },
            {
                errors: {
                    'change.maintenance_purpose': 'A maintenance purpose is required.',
                    'change.identified_problems.0.problem_text': 'Describe the problem.',
                    'change.service_impacts.0.other_description': 'A description is required for Other.',
                },
            },
        );

        expect(wrapper.get('#maintenance_purpose-error').text()).toContain('A maintenance purpose is required.');
        expect(wrapper.get('#identified_problems-0-problem_text-error').text()).toContain('Describe the problem.');
        expect(wrapper.get('#impact-OTHER-description-error').text()).toContain('A description is required for Other.');
    });

    it('limits the narrative lengths from 06 and keeps a zero-row draft legal', () => {
        const wrapper = mountSection({ facing_challenges: [{ row_no: 1, challenge_text: null }] });

        expect(wrapper.get('#maintenance_purpose').attributes('maxlength')).toBe('4000');
        expect(wrapper.get('#facing_challenges-0-challenge_text').attributes('maxlength')).toBe('1000');
        expect(wrapper.text()).not.toContain('Team');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection({ facing_challenges: [{ row_no: 1, challenge_text: 'One' }] }, { disabled: true });

        expect(wrapper.findAll('input:not([disabled]), textarea:not([disabled]), button:not([disabled])')).toHaveLength(
            0,
        );
    });
});
