import type { VueWrapper } from '@vue/test-utils';

import DatePicker from '@/components/DatePicker.vue';

/** The Date Picker whose trigger carries this id, so a test can read or set its business date. */
export function datePicker(wrapper: VueWrapper, id: string) {
    const picker = wrapper.findAllComponents(DatePicker).find((candidate) => candidate.props('id') === id);
    if (!picker) throw new Error(`No date picker #${id}`);
    return picker;
}

/** Picks a business date the way the calendar does, by emitting it from the picker. */
export async function pickDate(wrapper: VueWrapper, id: string, date: string | null): Promise<void> {
    datePicker(wrapper, id).vm.$emit('update:modelValue', date);
    await wrapper.vm.$nextTick();
}
