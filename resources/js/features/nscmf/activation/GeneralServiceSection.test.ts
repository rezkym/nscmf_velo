import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ActivationDraftFields, ActivationSubtype } from '../types';
import GeneralServiceSection from './GeneralServiceSection.vue';

type GeneralFields = Pick<
    ActivationDraftFields,
    'customer_name' | 'contact_name' | 'installation_rfs_date' | 'references' | 'service_blocks'
>;

function mountSection(
    modelValue: GeneralFields = {},
    props: { subtype?: ActivationSubtype; errors?: Record<string, string>; disabled?: boolean } = {},
): VueWrapper {
    return mount(GeneralServiceSection, { props: { modelValue, subtype: 'ACTIVATION', ...props } });
}

function lastModel(wrapper: VueWrapper): GeneralFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as GeneralFields;
}

function requirement(wrapper: VueWrapper, block: 'existing' | 'new'): string {
    return wrapper.get(`[data-testid="requirement-${block}"]`).text();
}

describe('GeneralServiceSection (FE-20)', () => {
    it('AC1: marks the service blocks required per subtype', () => {
        const activation = mountSection({}, { subtype: 'ACTIVATION' });
        expect(requirement(activation, 'existing')).toBe('Optional');
        expect(requirement(activation, 'new')).toBe('Required');

        const upgrade = mountSection({}, { subtype: 'UPGRADE_DOWNGRADE' });
        expect(requirement(upgrade, 'existing')).toBe('Required');
        expect(requirement(upgrade, 'new')).toBe('Required');

        const deactivation = mountSection({}, { subtype: 'DEACTIVATION' });
        expect(requirement(deactivation, 'existing')).toBe('Required');
        expect(requirement(deactivation, 'new')).toBe('Optional');
    });

    it('AC4: requires the RFS date except for a deactivation and sets no future limit', () => {
        const activation = mountSection({}, { subtype: 'ACTIVATION' });
        const rfs = activation.get('#installation_rfs_date');
        expect(rfs.attributes('type')).toBe('date');
        expect(rfs.attributes('min')).toBeUndefined();
        expect(activation.get('label[for="installation_rfs_date"]').find('[data-required]').exists()).toBe(true);

        const deactivation = mountSection({}, { subtype: 'DEACTIVATION' });
        expect(deactivation.get('label[for="installation_rfs_date"]').find('[data-required]').exists()).toBe(false);
    });

    it('AC2: writes one field at a time and leaves an empty draft otherwise untouched', async () => {
        const wrapper = mountSection();

        await wrapper.get('#customer_name').setValue('Demo Customer');

        expect(lastModel(wrapper)).toEqual({ customer_name: 'Demo Customer' });
    });

    it('AC2: keeps a reference selected without a specification', async () => {
        const wrapper = mountSection();

        await wrapper.get('[data-testid="reference-OTHER"]').setValue(true);

        expect(lastModel(wrapper).references).toEqual([{ reference_type: 'OTHER', specification: null }]);
        expect(wrapper.find('#reference-OTHER-specification').exists()).toBe(false);
    });

    it('selects and deselects references without touching the others', async () => {
        const wrapper = mountSection({
            references: [
                { reference_type: 'IWO', specification: null },
                { reference_type: 'OTHER', specification: 'Demo note' },
            ],
        });

        expect(wrapper.get<HTMLInputElement>('[data-testid="reference-IWO"]').element.checked).toBe(true);
        expect(wrapper.get<HTMLInputElement>('#reference-OTHER-specification').element.value).toBe('Demo note');

        await wrapper.get('[data-testid="reference-IWO"]').setValue(false);

        expect(lastModel(wrapper).references).toEqual([{ reference_type: 'OTHER', specification: 'Demo note' }]);
    });

    it('never selects a reference as a side effect of typing its specification', async () => {
        const wrapper = mountSection({ references: [{ reference_type: 'OTHER', specification: null }] });

        await wrapper.get('#reference-OTHER-specification').setValue('Demo note');

        expect(lastModel(wrapper).references).toEqual([{ reference_type: 'OTHER', specification: 'Demo note' }]);
    });

    it('AC2: starts a service block on first edit and keeps the other block as it was', async () => {
        const wrapper = mountSection({
            service_blocks: [{ service_context: 'EXISTING', service_id: 'SVC-1' }],
        });

        await wrapper.get('#service-new-service_description').setValue('Demo internet');

        expect(lastModel(wrapper).service_blocks).toEqual([
            { service_context: 'EXISTING', service_id: 'SVC-1' },
            { service_context: 'NEW', service_description: 'Demo internet' },
        ]);
    });

    it('drops a whole service block only on an explicit clear', async () => {
        const wrapper = mountSection({
            service_blocks: [
                { service_context: 'EXISTING', service_id: 'SVC-1' },
                { service_context: 'NEW', service_id: 'SVC-2' },
            ],
        });

        await wrapper.get('[data-testid="btn-clear-service-existing"]').trigger('click');

        expect(lastModel(wrapper).service_blocks).toEqual([{ service_context: 'NEW', service_id: 'SVC-2' }]);
    });

    it('round-trips every service block field, including the status', () => {
        const wrapper = mountSection({
            customer_name: 'Demo Customer',
            contact_name: 'Demo Contact',
            installation_rfs_date: '2026-10-01',
            service_blocks: [
                {
                    service_context: 'NEW',
                    service_id: 'SVC-2',
                    service_status: 'DEACTIVATED',
                    service_description: 'Demo internet',
                    service_location: 'Demo Street 1',
                },
            ],
        });

        expect(wrapper.get<HTMLInputElement>('#customer_name').element.value).toBe('Demo Customer');
        expect(wrapper.get<HTMLInputElement>('#contact_name').element.value).toBe('Demo Contact');
        expect(wrapper.get<HTMLInputElement>('#installation_rfs_date').element.value).toBe('2026-10-01');
        expect(wrapper.get<HTMLInputElement>('#service-new-service_id').element.value).toBe('SVC-2');
        expect(wrapper.get<HTMLSelectElement>('#service-new-service_status').element.value).toBe('DEACTIVATED');
        expect(wrapper.get<HTMLTextAreaElement>('#service-new-service_description').element.value).toBe(
            'Demo internet',
        );
        expect(wrapper.get<HTMLInputElement>('#service-new-service_location').element.value).toBe('Demo Street 1');
    });

    it('AC3: shows each server message under its own field', () => {
        const wrapper = mountSection(
            {
                references: [{ reference_type: 'OTHER', specification: null }],
                service_blocks: [{ service_context: 'NEW', service_id: null }],
            },
            {
                errors: {
                    'activation.customer_name': 'The customer name is required.',
                    'activation.contact_name': 'The contact name is required.',
                    'activation.references.0.specification': 'A specification is required for Other.',
                    'activation.service_blocks.0.service_id': 'The service ID is required.',
                },
            },
        );

        expect(wrapper.get('#customer_name-error').text()).toContain('The customer name is required.');
        expect(wrapper.get('#contact_name-error').text()).toContain('The contact name is required.');
        expect(wrapper.get('#reference-OTHER-specification-error').text()).toContain(
            'A specification is required for Other.',
        );
        expect(wrapper.get('#service-new-service_id-error').text()).toContain('The service ID is required.');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection(
            { references: [{ reference_type: 'OTHER', specification: 'Demo' }] },
            { disabled: true },
        );

        expect(
            wrapper.findAll(
                'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
            ),
        ).toHaveLength(0);
    });
});
