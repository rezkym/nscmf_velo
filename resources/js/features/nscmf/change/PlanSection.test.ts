import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PlanSection, { type PlanSectionModelValue, type MonitoringPeriodUnit } from './PlanSection.vue';

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
                    readonly: false,
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
        it('flags missing plan text when only target KPI is provided in a pair (line 172)', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: '', target_kpi: 'Zero packet loss' }],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert to previous OS image and restore startup configuration',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Both plan text and target KPI are required for row 1');
            expect(wrapper.vm.errors.improvement_pair_1).toBe('Both plan text and target KPI are required for row 1');
        });

        it('flags required target execution date when empty or whitespace-only on submit (line 192)', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [
                            { row_no: 1, plan_text: 'Upgrade router OS', target_kpi: 'Zero packet loss' },
                        ],
                        target_execution_date: '',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert to previous OS image',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Target execution date is required');
            expect(wrapper.vm.errors.target_execution_date).toBe('Target execution date is required');
        });

        it('flags required announcement timing when not selected on submit (line 246)', async () => {
            const wrapper = mount(PlanSection, {
                props: {
                    subtype: 'Maintenance',
                    modelValue: {
                        improvement_items: [
                            { row_no: 1, plan_text: 'Upgrade router OS', target_kpi: 'Zero packet loss' },
                        ],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert to previous OS image',
                        announcement_timing: null,
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Announcement timing is required');
            expect(wrapper.vm.errors.announcement_timing).toBe('Announcement timing is required');
        });

        it('covers edge cases for default props, disabled/readonly add/remove guards, and draft payload fallbacks', async () => {
            // 1. Mount with empty modelValue (improvement_items undefined) to exercise line 68 fallback to []
            const wrapperEmptyModelValue = mount(PlanSection, {
                props: {
                    modelValue: {
                        record_version: 1,
                    },
                },
            });
            expect(wrapperEmptyModelValue.vm.targetExecutionDate).toBe('');

            // Mount with minimal/empty props to exercise default prop fallbacks
            const wrapperDefault = mount(PlanSection);
            expect(wrapperDefault.vm.targetExecutionDate).toBe('');
            expect(wrapperDefault.vm.monitoringPeriodValue).toBeNull();
            expect(wrapperDefault.vm.monitoringPeriodUnit).toBeNull();

            // 2. Disabled / readonly cannot add or remove, item without row_no (row_no falsy / 0) to hit fallback idx+1
            const wrapperDisabled = mount(PlanSection, {
                props: {
                    disabled: true,
                    modelValue: {
                        improvement_items: [
                            {
                                row_no: 0,
                                plan_text: null as unknown as string,
                                target_kpi: 'KPI only',
                            },
                        ],
                        target_execution_date: null,
                        monitoring_period_value: null,
                        monitoring_period_unit: null,
                        rollback_scenario: null,
                        announcement_timing: null,
                    },
                },
            });
            const vmDisabled = wrapperDisabled.vm as unknown as {
                addImprovementItem: () => void;
                removeImprovementItem: (i: number) => void;
            };
            vmDisabled.addImprovementItem();
            expect(wrapperDisabled.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);
            vmDisabled.removeImprovementItem(0);
            expect(wrapperDisabled.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);

            const wrapperReadonly = mount(PlanSection, {
                props: {
                    readonly: true,
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan', target_kpi: 'KPI' }],
                    },
                },
            });
            const vmReadonly = wrapperReadonly.vm as unknown as {
                addImprovementItem: () => void;
                removeImprovementItem: (i: number) => void;
            };
            vmReadonly.addImprovementItem();
            expect(wrapperReadonly.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);
            vmReadonly.removeImprovementItem(0);
            expect(wrapperReadonly.findAll('[data-testid^="improvement-row-"]')).toHaveLength(1);

            // 3. Draft payload with null/empty values to exercise all ternary and fallback branches
            const draftPayload = wrapperDisabled.vm.getDraftPayload();
            expect(draftPayload.target_execution_date).toBeNull();
            expect(draftPayload.monitoring_period_value).toBeNull();
            expect(draftPayload.monitoring_period_unit).toBeNull();
            expect(draftPayload.rollback_scenario).toBeNull();
            expect(draftPayload.announcement_timing).toBeNull();
            expect(draftPayload.improvement_items).toEqual([{ row_no: 1, plan_text: null, target_kpi: 'KPI only' }]);

            // 4. Exercise watch with empty/falsy/null fields and Upgrade subtype warning
            await wrapperDefault.setProps({
                subtype: 'Upgrade',
                modelValue: {
                    improvement_items: undefined,
                    target_execution_date: null,
                    monitoring_period_value: undefined,
                    monitoring_period_unit: null,
                    rollback_scenario: null,
                    announcement_timing: 'TWO_DAYS_BEFORE_EMERGENCY',
                },
            });
            expect(wrapperDefault.text()).toContain(
                '2 days before timing is typically reserved for emergency changes.',
            );

            // Watcher with announcement_timing: null to cover branch 12 (announcement_timing || null fallback)
            await wrapperDefault.setProps({
                modelValue: {
                    improvement_items: [],
                    target_execution_date: '',
                    monitoring_period_value: null,
                    monitoring_period_unit: null,
                    rollback_scenario: '',
                    announcement_timing: null,
                },
            });

            // Falsy newVal in watcher (line 85: if (!newVal) return;)
            // Passing null bypasses withDefaults (which only triggers on undefined)
            await wrapperDefault.setProps({
                modelValue: null as unknown as PlanSectionModelValue,
            });

            // 5. Items with row_no: 0 / falsy to cover rowNo = item.row_no || i + 1 (line 162) and notifyUpdate line 100
            // Also item with both empty plan and kpi (neither hasPlan nor hasKpi) to cover else branch of line 173
            // Also trigger errors with row_no = 0 to cover template binary-expr fallback `item.row_no || index + 1` (lines 354, 374, 394)
            // Also notice that for line 354 error `improvement_pair_${item.row_no || index + 1}`, row 1 has incomplete pair
            const wrapperFalsyRowNo = mount(PlanSection, {
                props: {
                    modelValue: {
                        improvement_items: [
                            { row_no: 0, plan_text: '', target_kpi: '' }, // line 173: neither hasPlan nor hasKpi
                            { row_no: 0, plan_text: 'Incomplete plan only', target_kpi: '' }, // triggers improvement_pair_2 error
                            { row_no: 0, plan_text: 'p'.repeat(1001), target_kpi: 'k'.repeat(1001) }, // errors on plan_text, target_kpi, and incomplete pair
                        ],
                    },
                },
            });
            // Trigger notifyUpdate while improvementItems have row_no = 0 to hit line 100 fallback (item.row_no || idx + 1)
            const textareas = wrapperFalsyRowNo.findAll('textarea');
            await textareas[0]!.trigger('input');

            // Trigger submit validation
            await wrapperFalsyRowNo.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapperFalsyRowNo.text()).toContain('Plan text must not exceed 1000 characters');
            expect(wrapperFalsyRowNo.text()).toContain('Target KPI must not exceed 1000 characters');
            expect(wrapperFalsyRowNo.text()).toContain('Both plan text and target KPI are required for row 2');

            // 6. Cover line 161 (if (!item) continue;)
            const wrapperHole = mount(PlanSection, {
                props: {
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Revert procedure',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });
            wrapperHole.unmount();
            // With component unmounted, render effect is stopped so null item won't trigger template render error
            const vmWithInternal = wrapperHole.vm as unknown as {
                improvementItems: Array<Record<string, unknown> | null>;
                validateSubmit: () => boolean;
            };
            vmWithInternal.improvementItems = [null, { row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }];
            const resultWithHole = vmWithInternal.validateSubmit();
            expect(resultWithHole).toBe(true);
        });
    });

    describe('Remediation — SEC-FE-25 Security Findings F-25-1..F-25-4', () => {
        it('F-25-1: rejects non-finite monitoring_period_value (Infinity, NaN, 1e21 ceiling, <=0) and does not clear field into null', () => {
            // 1. Infinity supplied via prop/modelValue -> rejected at submit validation, does NOT fail open
            const wrapperInfinity = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: Infinity,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            expect(wrapperInfinity.vm.validateSubmit()).toBe(false);
            expect(wrapperInfinity.vm.errors.monitoring_period).toBe(
                'Monitoring period value must be a finite number greater than 0',
            );
            const draftInf = wrapperInfinity.vm.getDraftPayload();
            // Draft must NOT carry Infinity which serializes to null in JSON.stringify
            expect(draftInf.monitoring_period_value).toBeNull();

            // 2. Plausibility ceiling: 1e21 or unreasonably large duration rejected (e.g. max 999999 or Number.MAX_SAFE_INTEGER)
            const wrapperLarge = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 1e21,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });
            expect(wrapperLarge.vm.validateSubmit()).toBe(false);
            expect(wrapperLarge.vm.errors.monitoring_period).toBe('Monitoring period value must not exceed 999999');

            // 3. Negative / 0 rejected
            const wrapperZero = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 0,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });
            expect(wrapperZero.vm.validateSubmit()).toBe(false);
            expect(wrapperZero.vm.errors.monitoring_period).toBe('Monitoring period value must be greater than 0');

            // 4. Valid finite value passes
            const wrapperValid = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 24,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });
            expect(wrapperValid.vm.validateSubmit()).toBe(true);
            expect(wrapperValid.vm.getDraftPayload().monitoring_period_value).toBe(24);
        });

        it('F-25-2: gates validateSubmit when disabled or readonly and enforces trigger button disabled/aria-hidden/tabindex', () => {
            for (const flag of ['disabled', 'readonly'] as const) {
                const wrapper = mount(PlanSection, {
                    props: {
                        [flag]: true,
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: 'Rollback scenario text',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                // validateSubmit must return false and record form error
                expect(wrapper.vm.validateSubmit()).toBe(false);
                expect(wrapper.vm.errors.form).toBe('Form is readonly or disabled');

                // Emits validate with form error
                expect(wrapper.emitted('validate')).toBeTruthy();
                const emits = wrapper.emitted('validate')!;
                expect(emits[emits.length - 1]![0]).toEqual({ form: 'Form is readonly or disabled' });

                // Hidden trigger button has disabled, aria-hidden="true", tabindex="-1"
                const btn = wrapper.find('[data-testid="validate-submit-btn"]');
                expect(btn.attributes('disabled')).toBeDefined();
                expect(btn.attributes('aria-hidden')).toBe('true');
                expect(btn.attributes('tabindex')).toBe('-1');
            }
        });

        it('F-25-3: adds maxlength attributes to textareas and clamps at serialization in getDraftPayload', () => {
            const wrapper = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'x'.repeat(1005), target_kpi: 'y'.repeat(1005) }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'z'.repeat(4005),
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            // 1. Textareas have correct DOM maxlength attributes
            const textareas = wrapper.findAll('textarea');
            // Improvement row 1 plan_text and target_kpi
            expect(textareas[0]!.attributes('maxlength')).toBe('1000');
            expect(textareas[1]!.attributes('maxlength')).toBe('1000');
            // Rollback scenario textarea
            expect(textareas[2]!.attributes('maxlength')).toBe('4000');

            // 2. Clamped at serialization in getDraftPayload
            const draft = wrapper.vm.getDraftPayload() as {
                improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                rollback_scenario?: string | null;
            };
            expect(draft.improvement_items?.[0]?.plan_text?.length).toBe(1000);
            expect(draft.improvement_items?.[0]?.target_kpi?.length).toBe(1000);
            expect(draft.rollback_scenario?.length).toBe(4000);
        });

        it('F-25-4: enforces closed-set validation for monitoring_period_unit and announcement_timing', () => {
            // 1. Bogus/unrecognized monitoring_period_unit fails validation and is not transported
            const wrapperInvalidUnit = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'FORTNIGHT' as unknown as 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                },
            });

            expect(wrapperInvalidUnit.vm.validateSubmit()).toBe(false);
            expect(wrapperInvalidUnit.vm.errors.monitoring_period_unit).toContain('Invalid monitoring period unit');
            expect(wrapperInvalidUnit.vm.getDraftPayload().monitoring_period_unit).toBeNull();

            // 2. Bogus/unrecognized announcement_timing fails validation and is not transported
            const wrapperInvalidTiming = mount(PlanSection, {
                props: {
                    todayJakarta: '2026-09-20',
                    modelValue: {
                        improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                        target_execution_date: '2026-09-21',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: 'Rollback scenario text',
                        announcement_timing: 'BOGUS_TIMING' as unknown as 'ONE_WEEK_BEFORE',
                    },
                },
            });

            expect(wrapperInvalidTiming.vm.validateSubmit()).toBe(false);
            expect(wrapperInvalidTiming.vm.errors.announcement_timing).toContain('Invalid announcement timing');
            expect(wrapperInvalidTiming.vm.getDraftPayload().announcement_timing).toBeNull();
        });

        describe('Remediation — RE-SEC-FE-25 Findings N-25-1, N-25-2, R-25-1', () => {
            const LONE_SURROGATE_REGEX = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

            it('N-25-1: clamps astral characters by code point without creating lone surrogates', async () => {
                // 999 ASCII + 10 emoji -> 1009 characters, 1019 UTF-16 code units
                // If clamped by UTF-16 slice(0, 1000), character 1000 is split into a lone high surrogate.
                const astralPlanText = 'a'.repeat(999) + '😀'.repeat(10);
                const astralTargetKpi = 'k'.repeat(999) + '🚀'.repeat(10);
                const astralRollback = 'r'.repeat(3999) + '🛡️'.repeat(10);

                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [
                                {
                                    row_no: 1,
                                    plan_text: astralPlanText,
                                    target_kpi: astralTargetKpi,
                                },
                            ],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: astralRollback,
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                // 1. Emitted payload from getDraftPayload()
                const draft = wrapper.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                    rollback_scenario?: string | null;
                };

                const emittedPlan = draft.improvement_items?.[0]?.plan_text;
                const emittedKpi = draft.improvement_items?.[0]?.target_kpi;
                const emittedRollback = draft.rollback_scenario;

                expect(emittedPlan).toBeDefined();
                expect(emittedKpi).toBeDefined();
                expect(emittedRollback).toBeDefined();

                // Characters count (code points), not UTF-16 code units
                expect([...emittedPlan!].length).toBe(1000);
                expect([...emittedKpi!].length).toBe(1000);
                expect([...emittedRollback!].length).toBe(4000);

                // Emitted strings must contain no lone surrogates and must be strictly valid JSON
                expect(LONE_SURROGATE_REGEX.test(emittedPlan!)).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(emittedKpi!)).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(emittedRollback!)).toBe(false);

                expect(() => JSON.parse(JSON.stringify(draft))).not.toThrow();

                // 2. notifyUpdate emission via modelValue update upon textarea input
                const textareas = wrapper.findAll('textarea');
                await textareas[0]!.setValue(astralPlanText);
                const emittedEvents = wrapper.emitted('update:modelValue');
                expect(emittedEvents).toBeDefined();
                const lastModelValue = emittedEvents![emittedEvents!.length - 1]![0] as typeof draft;
                const emittedPlanFromModelValue = lastModelValue.improvement_items?.[0]?.plan_text;
                expect(emittedPlanFromModelValue).toBeDefined();
                expect(emittedPlanFromModelValue).toBe(astralPlanText);

                // Wire payload from getDraftPayload() clamps code points safely
                const wireFromInput = wrapper.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                };
                const wirePlanFromInput = wireFromInput.improvement_items?.[0]?.plan_text;
                expect(wirePlanFromInput).toBeDefined();
                expect(LONE_SURROGATE_REGEX.test(wirePlanFromInput ?? '')).toBe(false);
                expect([...(wirePlanFromInput ?? '')].length).toBe(1000);

                // 3. Discriminating fixture: 501 characters ('a' + 500 emoji) is 1001 UTF-16 code units.
                // Under server 1000 character limit, it should NOT be clamped to 1000 code units (which splits a surrogate).
                const legalAstralPlan = 'a' + '😀'.repeat(500); // 501 chars, 1001 UTF-16 code units
                const wrapperLegalAstral = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [
                                {
                                    row_no: 1,
                                    plan_text: legalAstralPlan,
                                    target_kpi: 'Valid KPI',
                                },
                            ],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: 'Valid rollback scenario',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                const legalDraft = wrapperLegalAstral.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                };
                const legalEmittedPlan = legalDraft.improvement_items?.[0]?.plan_text;
                expect([...legalEmittedPlan!].length).toBe(501);
                expect(LONE_SURROGATE_REGEX.test(legalEmittedPlan!)).toBe(false);
            });

            it('N-25-2: preserves pairing invariant on the wire (value and unit together or both null)', async () => {
                // When amount is cleared / nulled by user, wire draft payload must NOT send {value: null, unit: 'HOUR'}
                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: 'Rollback scenario text',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                // Initially paired
                let draft = wrapper.vm.getDraftPayload();
                expect(draft.monitoring_period_value).toBe(2);
                expect(draft.monitoring_period_unit).toBe('HOUR');

                // Case 1: User clears the amount input field
                const amountInput = wrapper.find('input[type="number"]');
                await amountInput.setValue('');
                draft = wrapper.vm.getDraftPayload();

                // Wire invariant: if value is null/empty, unit must also be null on the wire
                expect(draft.monitoring_period_value).toBeNull();
                expect(draft.monitoring_period_unit).toBeNull();

                // update:modelValue emission preserves the operator's live local state (amount null, unit still 'HOUR')
                const lastEmitted = wrapper.emitted('update:modelValue')!.slice(-1)[0]![0] as PlanSectionModelValue;
                expect(lastEmitted.monitoring_period_value).toBeNull();
                expect(lastEmitted.monitoring_period_unit).toBe('HOUR');

                // Case 2: User sets value but leaves unit empty
                await amountInput.setValue('5');
                const unitSelect = wrapper.find('select');
                await unitSelect.setValue('');
                draft = wrapper.vm.getDraftPayload();

                expect(draft.monitoring_period_value).toBeNull();
                expect(draft.monitoring_period_unit).toBeNull();

                // Case 3: Both set and valid
                await unitSelect.setValue('DAY');
                draft = wrapper.vm.getDraftPayload();
                expect(draft.monitoring_period_value).toBe(5);
                expect(draft.monitoring_period_unit).toBe('DAY');
            });

            it('R-25-1: renders monitoring_period_unit error and form error in the DOM', async () => {
                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'FORTNIGHT' as unknown as MonitoringPeriodUnit,
                            rollback_scenario: 'Rollback scenario text',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                const valid = wrapper.vm.validateSubmit();
                expect(valid).toBe(false);
                await wrapper.vm.$nextTick();

                // Check error message in DOM
                const unitErr = wrapper.find('[data-testid="error-monitoring-period-unit"]');
                expect(unitErr.exists()).toBe(true);
                expect(unitErr.text()).toContain('Invalid monitoring period unit: FORTNIGHT');

                // Readonly/disabled form error rendered in DOM
                const wrapperReadonly = mount(PlanSection, {
                    props: {
                        readonly: true,
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [{ row_no: 1, plan_text: 'Plan A', target_kpi: 'KPI A' }],
                            target_execution_date: '2026-09-21',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: 'Rollback scenario text',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                expect(wrapperReadonly.vm.validateSubmit()).toBe(false);
                await wrapperReadonly.vm.$nextTick();

                const formErr = wrapperReadonly.find('[data-testid="error-form"]');
                expect(formErr.exists()).toBe(true);
                expect(formErr.text()).toContain('Form is readonly or disabled');
            });

            it('N-25-4 & N-25-5: prop-echoing parent preserves live local state, enables typing monitoring period, and reaches validateSubmit === true', async () => {
                // Controlled prop-echoing parent simulating v-model / 12 §7.4 draft-autosave pattern
                let parentModelValue: PlanSectionModelValue = {
                    improvement_items: [{ row_no: 1, plan_text: 'Valid Plan', target_kpi: 'Valid KPI' }],
                    target_execution_date: '2026-10-01',
                    monitoring_period_value: null,
                    monitoring_period_unit: null,
                    rollback_scenario: 'Revert changes immediately',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                    record_version: 1,
                };

                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: parentModelValue,
                        'onUpdate:modelValue': async (val: PlanSectionModelValue) => {
                            parentModelValue = { ...val };
                            await wrapper.setProps({ modelValue: parentModelValue });
                        },
                    },
                });

                const amountInput = wrapper.find('input[type="number"]');
                const unitSelect = wrapper.find('select');

                // 1. Operator types 24 into Amount
                await amountInput.setValue('24');
                // Value should NOT be wiped back to empty string by prop echo!
                expect((amountInput.element as HTMLInputElement).value).toBe('24');
                expect(wrapper.vm.monitoringPeriodValue).toBe(24);

                // 2. Operator selects HOUR for Unit
                await unitSelect.setValue('HOUR');
                // Value and Unit must both be visible and preserved
                expect((amountInput.element as HTMLInputElement).value).toBe('24');
                expect((unitSelect.element as HTMLSelectElement).value).toBe('HOUR');
                expect(wrapper.vm.monitoringPeriodValue).toBe(24);
                expect(wrapper.vm.monitoringPeriodUnit).toBe('HOUR');

                // 3. Validation succeeds under echoing parent
                const isValid = wrapper.vm.validateSubmit();
                expect(isValid).toBe(true);
                expect(wrapper.vm.errors.monitoring_period).toBeUndefined();

                // 4. Wire draft payload contains the live values (no silent draft loss N-25-5)
                const wire = wrapper.vm.getDraftPayload();
                expect(wire.monitoring_period_value).toBe(24);
                expect(wire.monitoring_period_unit).toBe('HOUR');
            });

            it('N-25-6: over-limit text with prop-echoing parent reports visible errors and blocks submit', async () => {
                let parentModelValue: PlanSectionModelValue = {
                    improvement_items: [{ row_no: 1, plan_text: 'Initial plan', target_kpi: 'Initial KPI' }],
                    target_execution_date: '2026-10-01',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'Initial rollback procedure',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                    record_version: 1,
                };

                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: parentModelValue,
                        'onUpdate:modelValue': async (val: PlanSectionModelValue) => {
                            parentModelValue = { ...val };
                            await wrapper.setProps({ modelValue: parentModelValue });
                        },
                    },
                });

                // Input over 1000 characters into plan_text (1005 chars)
                const longPlan = 'A'.repeat(1005);
                const planTextarea = wrapper.find('textarea[placeholder*="Describe the improvement plan"]');
                await planTextarea.setValue(longPlan);

                // Input over 4000 characters into rollback_scenario (4005 chars)
                const longRollback = 'R'.repeat(4005);
                const rollbackTextarea = wrapper.find('textarea[placeholder*="Detail the rollback procedure"]');
                await rollbackTextarea.setValue(longRollback);

                // Validation must report errors and block submit
                const isValid = wrapper.vm.validateSubmit();
                expect(isValid).toBe(false);
                expect(wrapper.vm.errors['plan_text_1']).toBe('Plan text must not exceed 1000 characters');
                expect(wrapper.vm.errors['rollback_scenario']).toBe(
                    'Rollback scenario must not exceed 4000 characters',
                );
                await wrapper.vm.$nextTick();
                expect(wrapper.text()).toContain('Plan text must not exceed 1000 characters');
                expect(wrapper.text()).toContain('Rollback scenario must not exceed 4000 characters');
            });

            it('N-25-7: pins surviving mutants (hasLoneSurrogate branch and code-point length validators)', () => {
                // 1. Mutant N1-lonesurr: test hasLoneSurrogate when string is within max length but has a lone surrogate
                // A lone high surrogate (\uD800) followed by 'a' (length 2 code points)
                const loneSurrogateStr = '\uD800abc';
                const wrapperSurr = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [{ row_no: 1, plan_text: loneSurrogateStr, target_kpi: 'KPI' }],
                            target_execution_date: '2026-10-01',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: 'Rollback scenario',
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                // The emission / draft payload must sanitize lone surrogate
                const wire = wrapperSurr.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                };
                const planWire = wire.improvement_items?.[0]?.plan_text;
                expect(planWire).toBeDefined();
                expect(LONE_SURROGATE_REGEX.test(planWire ?? '')).toBe(false);

                // 2. Mutant N1-validator-cp & N1-validator-rb:
                // String with 999 characters + 1 astral emoji = 1000 characters (code points), but 1001 UTF-16 code units.
                // Under code-point counting [...str].length is 1000 -> VALID!
                // If mutated back to str.length > 1000, 1001 > 1000 would falsely flag an error!
                const exact1000CodePoints = 'a'.repeat(999) + '😀'; // 1000 code points, 1001 code units
                const exact1000Kpi = 'k'.repeat(999) + '🚀';
                const exact4000Rollback = 'r'.repeat(3999) + '🔥'; // 4000 code points, 4001 code units ('🔥' is single astral code point U+1F525)

                const wrapperCodePoints = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: {
                            improvement_items: [
                                { row_no: 1, plan_text: exact1000CodePoints, target_kpi: exact1000Kpi },
                            ],
                            target_execution_date: '2026-10-01',
                            monitoring_period_value: 2,
                            monitoring_period_unit: 'HOUR',
                            rollback_scenario: exact4000Rollback,
                            announcement_timing: 'ONE_WEEK_BEFORE',
                        },
                    },
                });

                const isValid = wrapperCodePoints.vm.validateSubmit();
                expect(isValid).toBe(true);
                expect(wrapperCodePoints.vm.errors['plan_text_1']).toBeUndefined();
                expect(wrapperCodePoints.vm.errors['target_kpi_1']).toBeUndefined();
                expect(wrapperCodePoints.vm.errors['rollback_scenario']).toBeUndefined();
            });

            it('N-25-11 & N-25-12: emission is surrogate-safe without truncation under prop-echoing parent, and notifyUpdate length mutants are pinned', async () => {
                // Section 1: N-25-11 3-clause discriminating regression test under live prop-echoing parent
                let parentModelValue: PlanSectionModelValue = {
                    improvement_items: [
                        {
                            row_no: 1,
                            plan_text: 'abc\uD800def',
                            target_kpi: 'kpi\uDC00safe',
                        },
                    ],
                    target_execution_date: '2026-10-01',
                    monitoring_period_value: 2,
                    monitoring_period_unit: 'HOUR',
                    rollback_scenario: 'rollback\uDBFFtest',
                    announcement_timing: 'ONE_WEEK_BEFORE',
                    record_version: 1,
                };

                let lastEmitted: PlanSectionModelValue | null = null;
                const wrapper = mount(PlanSection, {
                    props: {
                        todayJakarta: '2026-09-20',
                        modelValue: parentModelValue,
                        'onUpdate:modelValue': async (val: PlanSectionModelValue) => {
                            lastEmitted = { ...val };
                            parentModelValue = { ...val };
                            await wrapper.setProps({ modelValue: parentModelValue });
                        },
                    },
                });

                // Clause 1: a prop-supplied lone surrogate ends with NO lone surrogate in emitted object,
                // NO lone surrogate in parent state, and JSON.parse/stringify succeeds
                const amountInput = wrapper.find('input[type="number"]');
                await amountInput.setValue('3'); // triggers notifyUpdate -> emit update:modelValue

                expect(lastEmitted).not.toBeNull();
                const emittedNonNull = lastEmitted as unknown as PlanSectionModelValue;
                const emittedPlan = emittedNonNull.improvement_items?.[0]?.plan_text;
                const emittedKpi = emittedNonNull.improvement_items?.[0]?.target_kpi;
                const emittedRollback = emittedNonNull.rollback_scenario;

                expect(emittedPlan).toBe('abcdef');
                expect(emittedKpi).toBe('kpisafe');
                expect(emittedRollback).toBe('rollbacktest');

                expect(LONE_SURROGATE_REGEX.test(emittedPlan ?? '')).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(emittedKpi ?? '')).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(emittedRollback ?? '')).toBe(false);

                // Parent state must also have no lone surrogates
                const parentPlan = parentModelValue.improvement_items?.[0]?.plan_text;
                const parentKpi = parentModelValue.improvement_items?.[0]?.target_kpi;
                const parentRollback = parentModelValue.rollback_scenario;
                expect(LONE_SURROGATE_REGEX.test(parentPlan ?? '')).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(parentKpi ?? '')).toBe(false);
                expect(LONE_SURROGATE_REGEX.test(parentRollback ?? '')).toBe(false);

                // JSON.parse of parent committed draft succeeds (strict JSON safe)
                const stringifiedDraft = JSON.stringify(parentModelValue);
                expect(() => JSON.parse(stringifiedDraft)).not.toThrow();
                expect(stringifiedDraft).not.toContain('\\ud800');
                expect(stringifiedDraft).not.toContain('\\udc00');
                expect(stringifiedDraft).not.toContain('\\udbff');

                // Clause 2: a well-formed 1005-code-point value is NOT truncated in the emission,
                // while remaining clamped to 1000 in the wire object
                const longPlan1005 = 'p'.repeat(1005);
                const planTextarea = wrapper.find('textarea[placeholder*="Describe the improvement plan"]');
                await planTextarea.setValue(longPlan1005);

                const emittedAfterPlan = lastEmitted as unknown as PlanSectionModelValue;
                expect(emittedAfterPlan.improvement_items?.[0]?.plan_text).toBe(longPlan1005);
                expect(emittedAfterPlan.improvement_items?.[0]?.plan_text?.length).toBe(1005);
                // Wire object remains clamped to 1000
                const wirePayload = wrapper.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                };
                expect(wirePayload.improvement_items?.[0]?.plan_text?.length).toBe(1000);
                expect(wirePayload.improvement_items?.[0]?.plan_text).toBe('p'.repeat(1000));

                // Clause 3: astral fixture where characters != code units ('a'.repeat(999) + '😀'.repeat(10)),
                // asserted with explicit surrogate-well-formedness check
                // 999 + 10 = 1009 code points, 999 + 20 = 1019 UTF-16 code units
                const astralFixture = 'a'.repeat(999) + '😀'.repeat(10);
                await planTextarea.setValue(astralFixture);
                const emittedAfterAstral = lastEmitted as unknown as PlanSectionModelValue;
                const emittedAstralPlan = emittedAfterAstral.improvement_items?.[0]?.plan_text;
                expect(emittedAstralPlan).toBe(astralFixture);
                expect([...(emittedAstralPlan ?? '')].length).toBe(1009);
                expect(emittedAstralPlan?.length).toBe(1019);
                // Explicit surrogate well-formedness: no lone surrogates
                expect(LONE_SURROGATE_REGEX.test(emittedAstralPlan ?? '')).toBe(false);

                // Wire object clamps to 1000 code points without corrupting astral pairs
                const wireAstral = wrapper.vm.getDraftPayload() as {
                    improvement_items?: Array<{ plan_text?: string | null; target_kpi?: string | null }>;
                };
                const wireAstralPlan = wireAstral.improvement_items?.[0]?.plan_text;
                expect([...(wireAstralPlan ?? '')].length).toBe(1000);
                expect(wireAstralPlan).toBe('a'.repeat(999) + '😀');
                expect(LONE_SURROGATE_REGEX.test(wireAstralPlan ?? '')).toBe(false);

                // Section 2: N-25-12 discriminating assertions for notifyUpdate length blocks & mutants
                // 1) Test notifyUpdate error setting & clearing for plan_text, target_kpi, and rollback_scenario
                // When exact 1000 code points with 1001 UTF-16 code units (astral), notifyUpdate must NOT set error
                // (kills N7-validator-cp-NOTIFY & N7-kpi-NOTIFY)
                const exact1000Cp = 'x'.repeat(999) + '🎉'; // 1000 code points, 1001 code units
                const exact4000Cp = 'y'.repeat(3999) + '🔥'; // 4000 code points, 4001 code units ('🔥' is single astral code point U+1F525)
                await planTextarea.setValue(exact1000Cp);
                expect(wrapper.vm.errors['plan_text_1']).toBeUndefined();

                const kpiInput = wrapper.find('textarea[placeholder*="Error rate 0"]');
                await kpiInput.setValue(exact1000Cp);
                expect(wrapper.vm.errors['target_kpi_1']).toBeUndefined();

                // When 1001 code points, target_kpi notifyUpdate must set error
                await kpiInput.setValue('k'.repeat(1001));
                expect(wrapper.vm.errors['target_kpi_1']).toBe('Target KPI must not exceed 1000 characters');
                // When reduced back, clear error
                await kpiInput.setValue('Valid KPI');
                expect(wrapper.vm.errors['target_kpi_1']).toBeUndefined();

                const rollbackTextarea = wrapper.find('textarea[placeholder*="Detail the rollback procedure"]');
                await rollbackTextarea.setValue(exact4000Cp);
                expect(wrapper.vm.errors['rollback_scenario']).toBeUndefined();

                // When 1001 code points, notifyUpdate must set the error (kills N6-lenerr-plan, N6-lenerr-rb)
                await planTextarea.setValue('x'.repeat(1001));
                expect(wrapper.vm.errors['plan_text_1']).toBe('Plan text must not exceed 1000 characters');
                // When reduced back to <= 1000, notifyUpdate must delete error (exercises else branch)
                await planTextarea.setValue('x'.repeat(100));
                expect(wrapper.vm.errors['plan_text_1']).toBeUndefined();

                // Rollback: when 4001 code points, notifyUpdate sets error
                await rollbackTextarea.setValue('y'.repeat(4001));
                expect(wrapper.vm.errors['rollback_scenario']).toBe(
                    'Rollback scenario must not exceed 4000 characters',
                );
                // When reduced back to <= 4000, notifyUpdate deletes error (exercises line 153-156)
                await rollbackTextarea.setValue('Valid rollback scenario');
                expect(wrapper.vm.errors['rollback_scenario']).toBeUndefined();

                // Test null/undefined/empty string branch of sanitizeEmitString
                await wrapper.setProps({
                    modelValue: {
                        improvement_items: [
                            {
                                row_no: 1,
                                plan_text: null,
                                target_kpi: undefined,
                            },
                        ],
                        target_execution_date: '2026-10-01',
                        monitoring_period_value: 2,
                        monitoring_period_unit: 'HOUR',
                        rollback_scenario: null,
                        announcement_timing: 'ONE_WEEK_BEFORE',
                    },
                });
                await amountInput.setValue('4');
                const emittedNulls = lastEmitted as unknown as PlanSectionModelValue;
                expect(emittedNulls.improvement_items?.[0]?.plan_text).toBeNull();
                expect(emittedNulls.improvement_items?.[0]?.target_kpi).toBeNull();
                expect(emittedNulls.rollback_scenario).toBeNull();
            });
        });
    });
});
