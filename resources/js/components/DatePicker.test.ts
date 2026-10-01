import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import DatePicker from './DatePicker.vue';

function mountPicker(modelValue: string | null = null) {
    return mount(DatePicker, {
        props: { modelValue, id: 'target' },
        attrs: { 'aria-describedby': 'target-error', 'data-testid': 'target-picker' },
        attachTo: document.body,
    });
}

async function open(wrapper: ReturnType<typeof mountPicker>): Promise<void> {
    await wrapper.get('#target').trigger('click');
    await flushPromises();
}

function day(date: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-value="${date}"]`);
}

afterEach(() => {
    document.body.innerHTML = '';
});

describe('DatePicker (FE-61, 07 §22.1)', () => {
    it('shows the chosen business date as "30 Sep 2026", and a placeholder when empty', () => {
        expect(mountPicker('2026-09-30').get('#target').text()).toContain('30 Sep 2026');
        expect(mountPicker().get('#target').text()).toContain('Pick a date');
    });

    it('keeps the label, the description and the test id on its trigger', () => {
        const trigger = mountPicker().get('#target');
        expect(trigger.element.tagName).toBe('BUTTON');
        expect(trigger.attributes('type')).toBe('button');
        expect(trigger.attributes('aria-describedby')).toBe('target-error');
        expect(trigger.attributes('data-testid')).toBe('target-picker');
    });

    it('opens a calendar on the chosen month and sends the picked day as YYYY-MM-DD', async () => {
        const wrapper = mountPicker('2026-09-30');
        await open(wrapper);

        day('2026-09-15')?.click();
        await flushPromises();

        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2026-09-15']);
    });

    it('never hides a past date, so an accepted past target date stays visible (06 §40)', async () => {
        const wrapper = mountPicker('2020-01-15');
        await open(wrapper);

        expect(day('2020-01-10')).not.toBeNull();
        expect(day('2020-01-10')?.hasAttribute('data-disabled')).toBe(false);
    });

    it('jumps to another month and year with labelled selects instead of paging', async () => {
        const wrapper = mountPicker('2026-09-30');
        await open(wrapper);

        const select = (label: string) => document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);
        expect(select('Month')).not.toBeNull();
        expect(select('Year')).not.toBeNull();

        select('Year')!.value = '2020';
        select('Year')!.dispatchEvent(new Event('change'));
        await flushPromises();
        select('Month')!.value = '1';
        select('Month')!.dispatchEvent(new Event('change'));
        await flushPromises();

        day('2020-01-15')?.click();
        await flushPromises();
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2020-01-15']);
    });

    it('can be cleared, which sends null', async () => {
        const wrapper = mountPicker('2026-09-30');
        await open(wrapper);

        [...document.querySelectorAll<HTMLButtonElement>('button')]
            .find((button) => button.textContent?.trim() === 'Clear')
            ?.click();
        await flushPromises();

        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null]);
    });
});
