import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BandwidthSection from './BandwidthSection.vue';
import type { ActivationDraftFields } from '../draftPayload';

describe('FE-21: Activation SLA, bandwidth dan priority destinations (BandwidthSection)', () => {
    const sampleData: ActivationDraftFields = {
        bandwidth_international_mbps: 100.125,
        bandwidth_domestic_iix_mbps: 200.5,
        bandwidth_mixed_mbps: 50,
        sla_items: [
            { row_no: 1, requirement_text: 'SLA 99.9% uptime requirement' },
            { row_no: 2, requirement_text: 'MTTR < 4 hours' },
        ],
        virtual_connections: [
            { row_no: 1, bandwidth_mbps: 10.5 },
            { row_no: 2, bandwidth_mbps: 25.125 },
        ],
        priority_destinations: [
            { row_no: 1, destination: 'Singapore IX' },
            { row_no: 2, destination: 'Tokyo Equinix' },
        ],
    };

    describe('AC1 — bandwidth_preserves_positive_decimal', () => {
        it('100.125 survives serialization, blank yields null/omit, 0 or negative gets validation feedback', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {
                        bandwidth_international_mbps: 100.125,
                    },
                },
            });

            // Initial input value displays 100.125
            const intlInput = wrapper.find<HTMLInputElement>('[data-testid="input-bandwidth-international"]');
            expect(intlInput.element.value).toBe('100.125');

            // Decimal units are visible
            expect(wrapper.find('[data-testid="unit-bandwidth-international"]').text()).toContain('Mbps');
            expect(wrapper.find('[data-testid="unit-bandwidth-domestic-iix"]').text()).toContain('Mbps');
            expect(wrapper.find('[data-testid="unit-bandwidth-mixed"]').text()).toContain('Mbps');

            // Edit decimal to positive value
            await intlInput.setValue('150.875');
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeDefined();
            const latest = emitted![emitted!.length - 1]![0] as ActivationDraftFields;
            expect(latest.bandwidth_international_mbps).toBe(150.875);

            // Blank input converts to null
            await intlInput.setValue('');
            const emittedBlank = wrapper.emitted('update:modelValue');
            expect(emittedBlank).toBeDefined();
            const latestBlank = emittedBlank![emittedBlank!.length - 1]![0] as ActivationDraftFields;
            expect(latestBlank.bandwidth_international_mbps).toBeNull();

            // Zero gets validation feedback
            await intlInput.setValue('0');
            expect(wrapper.find('[data-testid="error-bandwidth-international"]').text()).toContain('greater than 0');

            // Negative gets validation feedback
            await intlInput.setValue('-5.25');
            expect(wrapper.find('[data-testid="error-bandwidth-international"]').text()).toContain('greater than 0');

            // Domestic IIX and Mixed positive decimals and invalid values
            const iixInput = wrapper.find<HTMLInputElement>('[data-testid="input-bandwidth-domestic-iix"]');
            await iixInput.setValue('200.75');
            const emittedIix = wrapper.emitted('update:modelValue');
            expect(emittedIix).toBeDefined();
            const latestIix = emittedIix![emittedIix!.length - 1]![0] as ActivationDraftFields;
            expect(latestIix.bandwidth_domestic_iix_mbps).toBe(200.75);

            await iixInput.setValue('-1');
            expect(wrapper.find('[data-testid="error-bandwidth-domestic-iix"]').text()).toContain('greater than 0');

            const mixedInput = wrapper.find<HTMLInputElement>('[data-testid="input-bandwidth-mixed"]');
            await mixedInput.setValue('300.123');
            const emittedMixed = wrapper.emitted('update:modelValue');
            expect(emittedMixed).toBeDefined();
            const latestMixed = emittedMixed![emittedMixed!.length - 1]![0] as ActivationDraftFields;
            expect(latestMixed.bandwidth_mixed_mbps).toBe(300.123);

            await mixedInput.setValue('0');
            expect(wrapper.find('[data-testid="error-bandwidth-mixed"]').text()).toContain('greater than 0');

            // Virtual connections also preserve positive decimals and reject <= 0
            const vc1Input = wrapper.find<HTMLInputElement>('[data-testid="input-vc-1"]');
            await vc1Input.setValue('12.345');
            const emittedVc = wrapper.emitted('update:modelValue');
            expect(emittedVc).toBeDefined();
            const latestVc = emittedVc![emittedVc!.length - 1]![0] as ActivationDraftFields;
            expect(latestVc.virtual_connections?.find((vc) => vc.row_no === 1)?.bandwidth_mbps).toBe(12.345);

            await vc1Input.setValue('0');
            expect(wrapper.find('[data-testid="error-vc-1"]').text()).toContain('greater than 0');
        });
    });

    describe('AC2 — sla_caps_rows_without_losing_content', () => {
        it('caps SLA rows at 3, prevents adding 4th, and remove from middle maintains contiguous 1..3 row_no with intact content', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {
                        sla_items: [
                            { row_no: 1, requirement_text: 'SLA Row 1' },
                            { row_no: 2, requirement_text: 'SLA Row 2' },
                        ],
                    },
                },
            });

            // Initial rows: 2
            let slaRows = wrapper.findAll('[data-testid^="sla-row-"]');
            expect(slaRows.length).toBe(2);

            // Add 3rd row
            const addBtn = wrapper.find('[data-testid="add-sla-row-btn"]');
            await addBtn.trigger('click');
            slaRows = wrapper.findAll('[data-testid^="sla-row-"]');
            expect(slaRows.length).toBe(3);

            // 4th row cannot be added; button is disabled
            expect(addBtn.attributes('disabled')).toBeDefined();
            await addBtn.trigger('click');
            slaRows = wrapper.findAll('[data-testid^="sla-row-"]');
            expect(slaRows.length).toBe(3);

            // Type content into row 3
            const row3Input = wrapper.find<HTMLInputElement>('[data-testid="input-sla-3"]');
            await row3Input.setValue('SLA Row 3');

            // Remove middle row (row 2)
            const removeRow2Btn = wrapper.find('[data-testid="remove-sla-row-2"]');
            await removeRow2Btn.trigger('click');

            // Should now have 2 rows re-indexed to row_no 1 and 2, with content intact ('SLA Row 1' and 'SLA Row 3')
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeDefined();
            const latest = emitted![emitted!.length - 1]![0] as ActivationDraftFields;
            expect(latest.sla_items).toEqual([
                { row_no: 1, requirement_text: 'SLA Row 1' },
                { row_no: 2, requirement_text: 'SLA Row 3' },
            ]);
        });
    });

    describe('AC3 — priority_destinations_are_free_text', () => {
        it('priority destinations are free text inputs with 255 char boundary and max 3 rows, not dropdowns', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {
                        priority_destinations: [
                            { row_no: 1, destination: 'Singapore Singtel IX' },
                        ],
                    },
                },
            });

            // Is input text, not select/dropdown
            const destInput = wrapper.find('[data-testid="input-priority-dest-1"]');
            expect(destInput.element.tagName.toLowerCase()).toBe('input');
            expect(destInput.attributes('type')).toBe('text');
            expect(destInput.attributes('maxlength')).toBe('255');

            // Add up to 3 rows
            const addBtn = wrapper.find('[data-testid="add-priority-dest-btn"]');
            await addBtn.trigger('click');
            await addBtn.trigger('click');
            expect(wrapper.findAll('[data-testid^="priority-dest-row-"]').length).toBe(3);
            expect(addBtn.attributes('disabled')).toBeDefined();

            // Removing row preserves free-text data
            const dest2Input = wrapper.find<HTMLInputElement>('[data-testid="input-priority-dest-2"]');
            await dest2Input.setValue('Custom Edge Server 2');
            const dest3Input = wrapper.find<HTMLInputElement>('[data-testid="input-priority-dest-3"]');
            await dest3Input.setValue('Custom Edge Server 3');

            await wrapper.find('[data-testid="remove-priority-dest-1"]').trigger('click');
            const emitted = wrapper.emitted('update:modelValue');
            expect(emitted).toBeDefined();
            const latest = emitted![emitted!.length - 1]![0] as ActivationDraftFields;
            expect(latest.priority_destinations).toEqual([
                { row_no: 1, destination: 'Custom Edge Server 2' },
                { row_no: 2, destination: 'Custom Edge Server 3' },
            ]);
        });
    });

    describe('AC4 — sla_draft_partial_is_allowed', () => {
        it('does not require all 3 SLA rows to be filled in draft; preserves partial and roundtrips accurately', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {
                        sla_items: [
                            { row_no: 1, requirement_text: 'Single SLA item only' },
                        ],
                        virtual_connections: [
                            { row_no: 2, bandwidth_mbps: 15.5 },
                        ],
                    },
                },
            });

            // Trigger submit validation helper
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');

            // No error forcing rows 2 and 3
            expect(wrapper.find('[data-testid="error-sla-items"]').exists()).toBe(false);
            expect(wrapper.emitted('submit-valid')).toBeTruthy();

            // Sla requirement text max length is 1000
            const sla1Input = wrapper.find('[data-testid="input-sla-1"]');
            expect(sla1Input.attributes('maxlength')).toBe('1000');
        });

        it('emits submit-invalid when bandwidth values are non-positive on validateSubmit', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {
                        bandwidth_international_mbps: 100,
                    },
                },
            });

            const intlInput = wrapper.find<HTMLInputElement>('[data-testid="input-bandwidth-international"]');
            await intlInput.setValue('-50');

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            const emittedErr = wrapper.emitted('submit-invalid');
            expect(emittedErr).toBeDefined();
            const errs = emittedErr![0]![0] as Record<string, string>;
            expect(errs.bandwidth_international).toBeDefined();
        });
    });

    describe('Accessibility and readonly / disabled controls', () => {
        it('honors disabled and readonly props across inputs and control buttons', () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    disabled: true,
                    modelValue: sampleData,
                },
            });

            expect(wrapper.find('[data-testid="input-bandwidth-international"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="input-bandwidth-domestic-iix"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="input-bandwidth-mixed"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="input-vc-1"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="add-sla-row-btn"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="remove-sla-row-1"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="add-priority-dest-btn"]').attributes('disabled')).toBeDefined();
            expect(wrapper.find('[data-testid="remove-priority-dest-1"]').attributes('disabled')).toBeDefined();
        });

        it('displays empty state placeholders when sla and priority destinations are empty and reacts to external prop updates', async () => {
            const wrapper = mount(BandwidthSection, {
                props: {
                    modelValue: {},
                },
            });

            expect(wrapper.text()).toContain('No specific SLA requirements added yet.');
            expect(wrapper.text()).toContain('No priority destinations added yet.');

            await wrapper.setProps({
                modelValue: {
                    bandwidth_international_mbps: 250.5,
                    sla_items: [{ row_no: 1, requirement_text: 'Updated SLA' }],
                    priority_destinations: [{ row_no: 1, destination: 'Updated Dest' }],
                },
            });

            expect(wrapper.text()).not.toContain('No specific SLA requirements added yet.');
            expect(wrapper.text()).not.toContain('No priority destinations added yet.');
            expect(wrapper.find<HTMLTextAreaElement>('[data-testid="input-sla-1"]').element.value).toBe('Updated SLA');
            expect(wrapper.find<HTMLInputElement>('[data-testid="input-priority-dest-1"]').element.value).toBe('Updated Dest');
        });
    });
});
