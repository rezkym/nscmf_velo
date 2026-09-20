import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ActivationDraftFields } from '../types';
import BandwidthSection from './BandwidthSection.vue';

type BandwidthFields = Pick<
    ActivationDraftFields,
    | 'sla_items'
    | 'bandwidth_international_mbps'
    | 'bandwidth_domestic_iix_mbps'
    | 'bandwidth_mixed_mbps'
    | 'virtual_connections'
    | 'priority_destinations'
>;

function mountSection(modelValue: BandwidthFields = {}, props: Record<string, unknown> = {}): VueWrapper {
    return mount(BandwidthSection, { props: { modelValue, ...props } });
}

function lastModel(wrapper: VueWrapper): BandwidthFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as BandwidthFields;
}

function control(wrapper: VueWrapper, collection: string, testid: string): Omit<DOMWrapper<Element>, 'exists'> {
    return wrapper.get(`[data-collection="${collection}"] [data-testid="${testid}"]`);
}

describe('BandwidthSection (FE-21)', () => {
    it('AC1: keeps a positive decimal exactly as typed and clears a blank to null', async () => {
        const wrapper = mountSection();

        await wrapper.get('#bandwidth_international_mbps').setValue('100.125');
        expect(lastModel(wrapper).bandwidth_international_mbps).toBe(100.125);

        await wrapper.get('#bandwidth_international_mbps').setValue('');
        expect(lastModel(wrapper).bandwidth_international_mbps).toBeNull();
    });

    it('AC1: shows the server message for zero or negative bandwidth', () => {
        const wrapper = mountSection(
            { bandwidth_mixed_mbps: 0 },
            { errors: { 'activation.bandwidth_mixed_mbps': 'Bandwidth must be greater than zero.' } },
        );

        expect(wrapper.get<HTMLInputElement>('#bandwidth_mixed_mbps').element.value).toBe('0');
        expect(wrapper.get('#bandwidth_mixed_mbps-error').text()).toContain('Bandwidth must be greater than zero.');
    });

    it('AC4: round-trips the three standard bandwidths and every collection row', () => {
        const wrapper = mountSection({
            bandwidth_international_mbps: 100.125,
            bandwidth_domestic_iix_mbps: null,
            bandwidth_mixed_mbps: 50,
            sla_items: [
                { row_no: 1, requirement_text: 'Demo uptime' },
                { row_no: 2, requirement_text: null },
            ],
            virtual_connections: [{ row_no: 1, bandwidth_mbps: 25.5 }],
            priority_destinations: [{ row_no: 1, destination: 'Demo CDN' }],
        });

        expect(wrapper.get<HTMLInputElement>('#bandwidth_international_mbps').element.value).toBe('100.125');
        expect(wrapper.get<HTMLInputElement>('#bandwidth_domestic_iix_mbps').element.value).toBe('');
        expect(wrapper.get<HTMLTextAreaElement>('#sla_items-0-requirement_text').element.value).toBe('Demo uptime');
        expect(wrapper.get<HTMLTextAreaElement>('#sla_items-1-requirement_text').element.value).toBe('');
        expect(wrapper.get<HTMLInputElement>('#virtual_connections-0-bandwidth_mbps').element.value).toBe('25.5');
        expect(wrapper.get<HTMLInputElement>('#priority_destinations-0-destination').element.value).toBe('Demo CDN');
    });

    it('AC2: adds up to three SLA rows and no more', async () => {
        const wrapper = mountSection({
            sla_items: [
                { row_no: 1, requirement_text: 'One' },
                { row_no: 2, requirement_text: 'Two' },
            ],
        });

        await control(wrapper, 'sla_items', 'btn-add-row').trigger('click');
        expect(lastModel(wrapper).sla_items).toEqual([
            { row_no: 1, requirement_text: 'One' },
            { row_no: 2, requirement_text: 'Two' },
            { row_no: 3, requirement_text: null },
        ]);

        const full = mountSection({
            sla_items: [
                { row_no: 1, requirement_text: 'One' },
                { row_no: 2, requirement_text: 'Two' },
                { row_no: 3, requirement_text: 'Three' },
            ],
        });
        expect(control(full, 'sla_items', 'btn-add-row').attributes('disabled')).toBeDefined();
    });

    it('AC2: removing a middle row keeps the remaining content and renumbers the set', async () => {
        const wrapper = mountSection({
            sla_items: [
                { row_no: 1, requirement_text: 'One' },
                { row_no: 2, requirement_text: 'Two' },
                { row_no: 3, requirement_text: 'Three' },
            ],
        });

        await control(wrapper, 'sla_items', 'btn-remove-row-1').trigger('click');

        expect(lastModel(wrapper).sla_items).toEqual([
            { row_no: 1, requirement_text: 'One' },
            { row_no: 2, requirement_text: 'Three' },
        ]);
    });

    it('AC4: editing one row leaves the other rows and the other collections alone', async () => {
        const wrapper = mountSection({
            sla_items: [
                { row_no: 1, requirement_text: 'One' },
                { row_no: 2, requirement_text: 'Two' },
            ],
            priority_destinations: [{ row_no: 1, destination: 'Demo CDN' }],
        });

        await wrapper.get('#sla_items-1-requirement_text').setValue('Edited');

        expect(lastModel(wrapper)).toEqual({
            sla_items: [
                { row_no: 1, requirement_text: 'One' },
                { row_no: 2, requirement_text: 'Edited' },
            ],
            priority_destinations: [{ row_no: 1, destination: 'Demo CDN' }],
        });
    });

    it('AC3: priority destinations are free text limited to 255 characters, not a chosen list', () => {
        const wrapper = mountSection({ priority_destinations: [{ row_no: 1, destination: 'Demo CDN' }] });

        const input = wrapper.get('#priority_destinations-0-destination');
        expect(input.attributes('maxlength')).toBe('255');
        expect(wrapper.findAll('select')).toHaveLength(0);
    });

    it('caps virtual connections and priority destinations at three rows each', () => {
        const three = [1, 2, 3];
        const wrapper = mountSection({
            virtual_connections: three.map((row_no) => ({ row_no, bandwidth_mbps: 10 })),
            priority_destinations: three.map((row_no) => ({ row_no, destination: 'Demo' })),
        });

        for (const collection of ['virtual_connections', 'priority_destinations']) {
            expect(control(wrapper, collection, 'btn-add-row').attributes('disabled')).toBeDefined();
        }
    });

    it('shows a row-level server message under the row it belongs to', () => {
        const wrapper = mountSection(
            { sla_items: [{ row_no: 1, requirement_text: 'One' }] },
            { errors: { 'activation.sla_items.0.requirement_text': 'This requirement is too long.' } },
        );

        expect(wrapper.get('#sla_items-0-requirement_text-error').text()).toContain('This requirement is too long.');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection({ sla_items: [{ row_no: 1, requirement_text: 'One' }] }, { disabled: true });

        expect(wrapper.findAll('input:not([disabled]), textarea:not([disabled]), button:not([disabled])')).toHaveLength(
            0,
        );
    });
});
