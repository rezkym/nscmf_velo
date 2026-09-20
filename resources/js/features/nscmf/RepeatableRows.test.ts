import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import RepeatableRows from './RepeatableRows.vue';

interface Row {
    row_no: number;
    text?: string | null;
}

function mountRows(rows: Row[], extra: Record<string, unknown> = {}): VueWrapper {
    return mount(RepeatableRows, {
        props: {
            modelValue: rows,
            addLabel: 'Add requirement',
            newRow: (): Row => ({ row_no: 0, text: null }),
            ...extra,
        },
        slots: {
            default: `
                <template #default="{ row, index, update }">
                    <input
                        :data-testid="'row-input-' + index"
                        :value="row.text ?? ''"
                        @input="update({ text: $event.target.value === '' ? null : $event.target.value })"
                    />
                </template>
            `,
        },
    });
}

function lastRows(wrapper: VueWrapper): Row[] {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as Row[];
}

describe('RepeatableRows', () => {
    it('renders one slot per row and a hint when there are none', () => {
        const wrapper = mountRows([], { emptyHint: 'No requirements yet.' });
        expect(wrapper.find('[data-testid="row-input-0"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('No requirements yet.');

        const filled = mountRows([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: 'Second' },
        ]);
        expect(filled.get<HTMLInputElement>('[data-testid="row-input-1"]').element.value).toBe('Second');
        expect(filled.text()).not.toContain('No requirements yet.');
    });

    it('appends a new row and numbers it', async () => {
        const wrapper = mountRows([{ row_no: 1, text: 'First' }]);

        await wrapper.get('[data-testid="btn-add-row"]').trigger('click');

        expect(lastRows(wrapper)).toEqual([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: null },
        ]);
    });

    it('removes a row and renumbers the rest', async () => {
        const wrapper = mountRows([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: 'Second' },
            { row_no: 3, text: 'Third' },
        ]);

        await wrapper.get('[data-testid="btn-remove-row-1"]').trigger('click');

        expect(lastRows(wrapper)).toEqual([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: 'Third' },
        ]);
    });

    it('updates only the edited row', async () => {
        const wrapper = mountRows([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: 'Second' },
        ]);

        await wrapper.get('[data-testid="row-input-1"]').setValue('Edited');

        expect(lastRows(wrapper)).toEqual([
            { row_no: 1, text: 'First' },
            { row_no: 2, text: 'Edited' },
        ]);
    });

    it('stops adding at the maximum', async () => {
        const wrapper = mountRows([{ row_no: 1, text: 'First' }], { max: 1 });

        const add = wrapper.get('[data-testid="btn-add-row"]');
        expect(add.attributes('disabled')).toBeDefined();
        await add.trigger('click');

        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('disables adding and removing while the form is disabled', () => {
        const wrapper = mountRows([{ row_no: 1, text: 'First' }], { disabled: true });

        expect(wrapper.get('[data-testid="btn-add-row"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-testid="btn-remove-row-0"]').attributes('disabled')).toBeDefined();
    });

    it('keeps rows without a row_no untouched when renumbering', async () => {
        const wrapper = mount(RepeatableRows, {
            props: {
                modelValue: [{ reference_type: 'IWO' }, { reference_type: 'TICKET' }],
                addLabel: 'Add reference',
                newRow: () => ({ reference_type: 'OTHER' }),
            },
            slots: { default: '<span>row</span>' },
        });

        await wrapper.get('[data-testid="btn-remove-row-0"]').trigger('click');

        expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([{ reference_type: 'TICKET' }]);
    });
});
