import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ChangeDraftFields, ChangeSubtype } from '../types';
import PlanSection from './PlanSection.vue';

type PlanFields = Pick<
    ChangeDraftFields,
    | 'improvement_items'
    | 'target_execution_date'
    | 'monitoring_period_value'
    | 'monitoring_period_unit'
    | 'rollback_scenario'
    | 'announcement_timing'
>;

function mountSection(
    modelValue: PlanFields = {},
    props: { subtype?: ChangeSubtype; errors?: Record<string, string>; disabled?: boolean } = {},
): VueWrapper {
    return mount(PlanSection, { props: { modelValue, subtype: 'MAINTENANCE', ...props } });
}

function lastModel(wrapper: VueWrapper): PlanFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as PlanFields;
}

function control(wrapper: VueWrapper, collection: string, testid: string): Omit<DOMWrapper<Element>, 'exists'> {
    return wrapper.get(`[data-collection="${collection}"] [data-testid="${testid}"]`);
}

describe('PlanSection (FE-25)', () => {
    it('AC1: keeps a half-filled improvement pair and caps the list at three', async () => {
        const wrapper = mountSection({ improvement_items: [{ row_no: 1, plan_text: null, target_kpi: null }] });

        await wrapper.get('#improvement_items-0-plan_text').setValue('Demo plan');
        expect(lastModel(wrapper).improvement_items).toEqual([{ row_no: 1, plan_text: 'Demo plan', target_kpi: null }]);

        const full = mountSection({
            improvement_items: [1, 2, 3].map((row_no) => ({ row_no, plan_text: 'Demo', target_kpi: 'Demo' })),
        });
        expect(control(full, 'improvement_items', 'btn-add-row').attributes('disabled')).toBeDefined();
    });

    it('AC4: accepts a narrative KPI of up to 1,000 characters', async () => {
        const wrapper = mountSection({ improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: null }] });

        const kpi = wrapper.get('#improvement_items-0-target_kpi');
        expect(kpi.attributes('maxlength')).toBe('1000');

        await kpi.setValue('Error rate 0 during monitoring');
        expect(lastModel(wrapper).improvement_items).toEqual([
            { row_no: 1, plan_text: 'Demo plan', target_kpi: 'Error rate 0 during monitoring' },
        ]);
    });

    it('AC2: the target date is a plain date field with no limit computed in the browser', async () => {
        const wrapper = mountSection({ target_execution_date: '2020-01-01' });

        const date = wrapper.get('#target_execution_date');
        expect(date.attributes('type')).toBe('date');
        expect(date.attributes('min')).toBeUndefined();
        expect(date.attributes('max')).toBeUndefined();
        expect(wrapper.get<HTMLInputElement>('#target_execution_date').element.value).toBe('2020-01-01');

        await date.setValue('2026-10-10');
        expect(lastModel(wrapper).target_execution_date).toBe('2026-10-10');
    });

    it('AC2: shows the server message for a target date that is no longer allowed', () => {
        const wrapper = mountSection(
            { target_execution_date: '2020-01-01' },
            { errors: { 'change.target_execution_date': 'The target date must be today or later.' } },
        );

        expect(wrapper.get('#target_execution_date-error').text()).toContain('The target date must be today or later.');
    });

    it('AC3: sends the monitoring amount and unit as typed, including an empty amount', async () => {
        const wrapper = mountSection();

        await wrapper.get('#monitoring_period_unit').setValue('DAY');
        expect(lastModel(wrapper)).toEqual({ monitoring_period_unit: 'DAY' });

        await wrapper.get('#monitoring_period_value').setValue('3');
        expect(lastModel(wrapper)).toEqual({ monitoring_period_unit: 'DAY', monitoring_period_value: 3 });

        await wrapper.get('#monitoring_period_value').setValue('');
        expect(lastModel(wrapper).monitoring_period_value).toBeNull();
    });

    it('AC3: offers the four canonical units and shows the server message for the pair', () => {
        const wrapper = mountSection(
            { monitoring_period_value: 0 },
            { errors: { 'change.monitoring_period_value': 'The amount must be greater than zero.' } },
        );

        expect(wrapper.findAll('#monitoring_period_unit option').map((option) => option.attributes('value'))).toEqual([
            '',
            'MINUTE',
            'HOUR',
            'DAY',
            'WEEK',
        ]);
        expect(wrapper.get('#monitoring_period_value-error').text()).toContain('The amount must be greater than zero.');
    });

    it('offers the three canonical announcement timings with readable labels', () => {
        const wrapper = mountSection();

        const options = wrapper.findAll('#announcement_timing option');
        expect(options.map((option) => option.attributes('value'))).toEqual([
            '',
            'ONE_WEEK_BEFORE',
            'TWO_WEEKS_BEFORE',
            'TWO_DAYS_BEFORE_EMERGENCY',
        ]);
        expect(options[1]?.text()).toBe('1 week before');
    });

    it('AC4: warns about a mismatched announcement without blocking anything', async () => {
        const emergency = mountSection({ announcement_timing: 'ONE_WEEK_BEFORE' }, { subtype: 'EMERGENCY' });
        expect(emergency.get('[data-testid="announcement-warning"]').text()).toContain('Emergency');
        expect(emergency.findAll('[disabled]')).toHaveLength(0);

        const maintenance = mountSection(
            { announcement_timing: 'TWO_DAYS_BEFORE_EMERGENCY' },
            { subtype: 'MAINTENANCE' },
        );
        expect(maintenance.find('[data-testid="announcement-warning"]').exists()).toBe(true);

        const matched = mountSection({ announcement_timing: 'ONE_WEEK_BEFORE' }, { subtype: 'MAINTENANCE' });
        expect(matched.find('[data-testid="announcement-warning"]').exists()).toBe(false);

        const unset = mountSection({}, { subtype: 'EMERGENCY' });
        expect(unset.find('[data-testid="announcement-warning"]').exists()).toBe(false);
    });

    it('keeps the rollback scenario as a required narrative of 4,000 characters', async () => {
        const wrapper = mountSection();

        const rollback = wrapper.get('#rollback_scenario');
        expect(rollback.attributes('maxlength')).toBe('4000');
        expect(wrapper.get('label[for="rollback_scenario"]').find('[data-required]').exists()).toBe(true);

        await rollback.setValue('Demo rollback');
        expect(lastModel(wrapper).rollback_scenario).toBe('Demo rollback');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection(
            { improvement_items: [{ row_no: 1, plan_text: 'Demo', target_kpi: null }] },
            { disabled: true },
        );

        expect(
            wrapper.findAll(
                'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
            ),
        ).toHaveLength(0);
    });
});
