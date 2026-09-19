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
    });
});
