import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DraftField from './DraftField.vue';

function mountField(props: Record<string, unknown>): VueWrapper {
    return mount(DraftField, { props: { id: 'customer_name', label: 'Customer name', modelValue: null, ...props } });
}

function emittedValue(wrapper: VueWrapper): unknown {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0];
}

describe('DraftField', () => {
    it('labels the control and marks it as required', () => {
        const wrapper = mountField({ required: true, maxlength: 150 });

        expect(wrapper.get('label').text()).toContain('Customer name');
        expect(wrapper.get('label').attributes('for')).toBe('customer_name');
        expect(wrapper.get('#customer_name').attributes('maxlength')).toBe('150');
        expect(wrapper.get('[data-required]').exists()).toBe(true);
    });

    it('sends text as typed and blank text as null', async () => {
        const wrapper = mountField({ modelValue: 'Demo Customer' });
        expect(wrapper.get<HTMLInputElement>('#customer_name').element.value).toBe('Demo Customer');

        await wrapper.get('#customer_name').setValue('  Edited  ');
        expect(emittedValue(wrapper)).toBe('  Edited  ');

        await wrapper.get('#customer_name').setValue('   ');
        expect(emittedValue(wrapper)).toBeNull();
    });

    it('parses numbers, keeping zero and clearing blank input', async () => {
        const wrapper = mountField({ id: 'latency_ms', label: 'Latency', type: 'number', modelValue: 12 });
        expect(wrapper.get('#latency_ms').attributes('type')).toBe('number');

        await wrapper.get('#latency_ms').setValue('0');
        expect(emittedValue(wrapper)).toBe(0);

        await wrapper.get('#latency_ms').setValue('');
        expect(emittedValue(wrapper)).toBeNull();
    });

    it('uses a date control and a textarea when asked', () => {
        expect(mountField({ type: 'date' }).get('#customer_name').attributes('type')).toBe('date');

        const narrative = mountField({ id: 'rollback', label: 'Rollback scenario', rows: 4, modelValue: 'Demo' });
        expect(narrative.get<HTMLTextAreaElement>('textarea#rollback').element.value).toBe('Demo');
    });

    it('shows the unit next to the control and the server error below it', () => {
        const wrapper = mountField({
            id: 'bandwidth',
            label: 'International',
            type: 'number',
            suffix: 'Mbps',
            error: 'Must be greater than zero.',
        });

        expect(wrapper.text()).toContain('Mbps');
        expect(wrapper.get('#bandwidth-error').text()).toContain('Must be greater than zero.');
    });

    it('disables the control', () => {
        expect(mountField({ disabled: true }).get('#customer_name').attributes('disabled')).toBeDefined();
    });
});
