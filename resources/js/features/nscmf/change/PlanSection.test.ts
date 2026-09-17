import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlanSection, { type PlanSectionModelValue } from './PlanSection.vue';

describe('FE-25: Change improvement, KPI, schedule dan rollback (PlanSection)', () => {
    describe('AC1 — plan_requires_complete_pairs_only_at_submit', () => {
        it('allows half pair to persist in draft, but flags missing pair on submit validation and requires >= 1 complete pair', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [
                            { row_no: 1, plan_text: 'Upgrade router OS', target_kpi: '' }, // half pair
                        ],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert to previous OS image and restore startup configuration',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            // In draft, half-pair is preserved in wire draft payload
            const draftPayload = wrapper.vm.getDraftPayload();
            expect(draftPayload.improvement_items).toEqual([
                { row_no: 1, plan_text: 'Upgrade router OS', target_kpi: null },
            ]);

            // Submit validation flags incomplete pair
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Both plan text and target KPI are required for row 1');
            expect(wrapper.emitted('validate')).toBeTruthy();

            // When no pairs are complete
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [],
                    target_execution_date: '2026-10-01',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Revert to previous OS image and restore startup configuration',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('At least 1 complete improvement plan and target KPI pair is required');

            // Completing the pair clears the error
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [
                        { row_no: 1, plan_text: 'Upgrade router OS', target_kpi: 'Zero packet drop during cutover' },
                    ],
                    target_execution_date: '2026-10-01',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Revert to previous OS image and restore startup configuration',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Both plan text and target KPI are required');
            expect(wrapper.text()).not.toContain('At least 1 complete improvement plan');
        });

        it('handles adding, typing, removing improvement items, and reactive updates', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [],
                        target_execution_date: null,
                        monitoring_period_value: null,
                        monitoring_period_unit: null,
                        rollback_scenario: null,
                        announcement_timing: null,
                    },
                },
            });

            // Add item 1
            const addBtn = wrapper.find('[data-testid="add-improvement-btn"]');
            await addBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);

            // Add item 2
            await addBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="improvement-row-"]')).toHaveLength(2);

            // Type into plan and KPI
            const planInputs = wrapper.findAll('textarea[placeholder*="Describe the improvement plan"]');
            const kpiInputs = wrapper.findAll('textarea[placeholder*="e.g. Error rate 0"]');
            await planInputs[0]!.setValue('Configured ospf interface');
            await kpiInputs[0]!.setValue('Convergence time < 1s');

            // Type into date, monitoring amount, unit, rollback, announcement
            const dateInput = wrapper.find('input[type="date"]');
            await dateInput.setValue('2026-10-05');

            const amountInput = wrapper.find('input[type="number"]');
            await amountInput.setValue('48');

            const unitSelect = wrapper.find('select');
            await unitSelect.setValue('HOUR');

            const rollbackTextarea = wrapper.find('textarea[placeholder*="Detail the rollback procedure"]');
            await rollbackTextarea.setValue('Fallback to static routes');

            const announcementRadios = wrapper.findAll('input[name="announcement_timing"]');
            await announcementRadios[0]!.setValue(true); // ONE_WEEK_BEFORE

            // Verify update:modelValue emission
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeTruthy();
            const lastEmission = emitted![emitted!.length - 1]![0] as PlanSectionModelValue;
            expect(lastEmission.target_execution_date).toBe('2026-10-05');
            expect(lastEmission.monitoring_period_value).toBe(48);
            expect(lastEmission.monitoring_period_unit).toBe('HOUR');
            expect(lastEmission.rollback_scenario).toBe('Fallback to static routes');
            expect(lastEmission.announcement_timing).toBe('ONE_WEEK_BEFORE');

            // Remove item 2
            const removeBtns = wrapper.findAll('button.text-destructive');
            await removeBtns[1]!.trigger('click');
            expect(wrapper.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);

            // Test watch on modelValue prop
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Watch test', target_kpi: 'KPI watch' }],
                    target_execution_date: '2026-10-06',
                    monitoring_period_value: 12,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Rollback watch',
                    announcement_timing: 'TWO_WEEKS_BEFORE',
                },
            });
            expect(wrapper.vm.targetExecutionDate).toBe('2026-10-06');
            expect(wrapper.vm.monitoringPeriodValue).toBe(12);
            expect(wrapper.vm.monitoringPeriodUnit).toBe('HOUR');
            expect(wrapper.vm.rollbackScenario).toBe('Rollback watch');
            expect(wrapper.vm.announcementTiming).toBe('TWO_WEEKS_BEFORE');
        });

        it('limits improvement items to max 3 rows and enforces 1000 char limits on plan_text and target_kpi', async () => {
            const longPlan = 'p'.repeat(1001);
            const longKpi = 'k'.repeat(1001);

            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [
                            { row_no: 1, plan_text: longPlan, target_kpi: 'Valid KPI' },
                            { row_no: 2, plan_text: 'Valid Plan', target_kpi: longKpi },
                            { row_no: 3, plan_text: 'Valid 3', target_kpi: 'Valid 3' },
                        ],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert configuration',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Plan text must not exceed 1000 characters');
            expect(wrapper.text()).toContain('Target KPI must not exceed 1000 characters');

            // Cannot add beyond 3 rows
            const addBtn = wrapper.find('[data-testid="add-improvement-btn"]');
            expect(addBtn.attributes('disabled')).toBeDefined();
        });
    });

    describe('AC2 — plan_handles_revision_date_history', () => {
        it('accepts unchanged past date on resubmit, but rejects changed past date; preserves date format without browser timezone shift', async () => {
            // First submit with past date -> rejected
            const wrapperFirstSubmit = mount(PlanSection, {
                props: {
                    mode: 'first_submit',
                    todayJakarta: '2026-09-20',
                    originalTargetExecutionDate: null,
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-19', // Past in Jakarta
                        monitoring_period_value: 1,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Restore baseline config',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapperFirstSubmit.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperFirstSubmit.text()).toContain('Target execution date must be today or in the future');

            // Resubmit with UNCHANGED past date -> accepted
            const wrapperResubmitUnchanged = mount(PlanSection, {
                props: {
                    mode: 'resubmit',
                    todayJakarta: '2026-09-20',
                    originalTargetExecutionDate: '2026-09-15',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-15', // Same past date
                        monitoring_period_value: 1,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Restore baseline config',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapperResubmitUnchanged.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperResubmitUnchanged.text()).not.toContain(
                'Target execution date must be today or in the future',
            );

            // Resubmit with CHANGED past date -> rejected
            const wrapperResubmitChanged = mount(PlanSection, {
                props: {
                    mode: 'resubmit',
                    todayJakarta: '2026-09-20',
                    originalTargetExecutionDate: '2026-09-15',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-18', // Changed to a different past date
                        monitoring_period_value: 1,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Restore baseline config',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapperResubmitChanged.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperResubmitChanged.text()).toContain('Target execution date must be today or in the future');

            // Date string YYYY-MM-DD preserved in payload without timezone shift
            const payload = wrapperResubmitChanged.vm.getDraftPayload();
            expect(payload.target_execution_date).toBe('2026-09-18');
        });

        it('does not block reopen review because historical target date has passed', async () => {
            const wrapperReview = mount(PlanSection, {
                props: {
                    mode: 'review',
                    todayJakarta: '2026-09-20',
                    originalTargetExecutionDate: '2026-09-10',
                    readonly: true,
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-10',
                        monitoring_period_value: 1,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Restore baseline config',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapperReview.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperReview.text()).not.toContain('Target execution date must be today or in the future');
        });
    });

    describe('AC3 — plan_monitoring_pair', () => {
        it('validates monitoring period value > 0 and unit in MINUTE/HOUR/DAY/WEEK, or both null', async () => {
            // Both present and positive -> valid
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 3,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Restore config',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Monitoring period value and unit must be paired');
            expect(wrapper.text()).not.toContain('Monitoring period value must be greater than 0');

            // Value provided without unit -> error
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: 3,
                    monitoring_period_unit: null,
                    rollback_scenario: 'Restore config',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain(
                'Monitoring period value and unit must be provided together or both empty',
            );

            // Unit provided without value -> error
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: null,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Restore config',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain(
                'Monitoring period value and unit must be provided together or both empty',
            );

            // Value <= 0 -> error
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: 0,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Restore config',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Monitoring period value must be greater than 0');

            // Both null in draft -> allowed in draft payload
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: null,
                    monitoring_period_unit: null,
                    rollback_scenario: 'Restore config',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            const draftPayload = wrapper.vm.getDraftPayload();
            expect(draftPayload.monitoring_period_value).toBeNull();
            expect(draftPayload.monitoring_period_unit).toBeNull();

            // But required at submit stage per 06 §41
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Monitoring period is required at submit');
        });
    });

    describe('AC4 — plan_keeps_kpi_and_warning', () => {
        it('accepts free meaningful text for KPI like "Error rate 0 selama monitoring" without forcing numeric-only', () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [
                            {
                                row_no: 1,
                                plan_text: 'Tune BGP keepalive',
                                target_kpi: 'Error rate 0 selama monitoring',
                            },
                        ],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 24,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert keepalive interval back to 30s',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            const valid = wrapper.vm.validateSubmit();
            expect(valid).toBe(true);
            expect(wrapper.vm.errors.target_kpi_1).toBeUndefined();
        });

        it('shows non-blocking warning for announcement mismatch without disabling submit', () => {
            // Emergency with ONE_WEEK_BEFORE -> warning
            const wrapperEmergency = mount(PlanSection, {
                props: {
                    subtype: 'Emergency',
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [
                            { row_no: 1, plan_text: 'Fix power unit', target_kpi: 'PSU voltage normal' },
                        ],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 12,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert secondary power feed and notify operations center',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            expect(wrapperEmergency.text()).toContain('Emergency change typically uses 2 days before timing');
            const submitValidEmergency = wrapperEmergency.vm.validateSubmit();
            expect(submitValidEmergency).toBe(true); // Warning is non-blocking!
            expect(wrapperEmergency.find('[data-testid="validate-submit-btn"]').attributes('disabled')).toBeUndefined();

            // Maintenance with TWO_DAYS_BEFORE_EMERGENCY -> warning
            const wrapperMaintenance = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Routine service', target_kpi: 'No packet loss' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'Revert all routing configuration',
                        announcement_timing: 'TWO_DAYS_BEFORE_EMERGENCY',
                    },
                },
            });

            expect(wrapperMaintenance.text()).toContain(
                '2 days before timing is typically reserved for emergency changes',
            );
            const submitValidMaint = wrapperMaintenance.vm.validateSubmit();
            expect(submitValidMaint).toBe(true); // Non-blocking!
        });

        it('rejects rollback_scenario when blank or placeholder N/A without explanation, and enforces 4000 char limit', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'DAY',
                        rollback_scenario: 'N/A', // Disallowed placeholder
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Rollback scenario cannot be a plain N/A placeholder');

            // Blank
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'DAY',
                    rollback_scenario: '   ',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Rollback scenario is required');

            // Over 4000 chars
            const longRollback = 'r'.repeat(4001);
            await wrapper.setProps({
                modelValue: {
                    improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                    target_execution_date: '2026-09-21',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'DAY',
                    rollback_scenario: longRollback,
                    announcement_timing: 'ONE_WEEK_BEFORE',
                },
            });
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Rollback scenario must not exceed 4000 characters');
        });
    });
});
