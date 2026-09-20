import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { ActivationDraftFields } from '../types';
import SiteSection from './SiteSection.vue';

type SiteFields = Pick<ActivationDraftFields, 'direct_site' | 'pop_site'>;

function mountSection(modelValue: SiteFields = {}, props: Record<string, unknown> = {}): VueWrapper {
    return mount(SiteSection, { props: { modelValue, ...props } });
}

function lastModel(wrapper: VueWrapper): SiteFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as SiteFields;
}

describe('SiteSection (FE-23)', () => {
    it('AC4: shows every stored value back, including a numeric zero', () => {
        const wrapper = mountSection({
            direct_site: {
                local_loops: 'Demo loop',
                lastmile: 'Demo lastmile',
                bwa: 'Demo BWA',
                antenna_tower: 'Demo tower',
                direction: 'North',
                rssi: -67,
                latency_ms: 0,
                packet_loss_percent: 0,
                routers: 'Demo router',
                ups: 'Demo UPS',
                stabilizer: 'Demo stabilizer',
                cable: 'Demo cable',
            },
            pop_site: {
                switch_distribution: 'Demo switch',
                port: 'Gi0/1',
                vlan_id: 100,
                local_loops: 'Demo pop loop',
                routers: 'Demo pop router',
                cpe_indoor: 'Demo indoor',
                cpe_outdoor: 'Demo outdoor',
            },
        });

        expect(wrapper.get<HTMLInputElement>('#direct_site-latency_ms').element.value).toBe('0');
        expect(wrapper.get<HTMLInputElement>('#direct_site-packet_loss_percent').element.value).toBe('0');
        expect(wrapper.get<HTMLInputElement>('#direct_site-rssi').element.value).toBe('-67');
        expect(wrapper.get<HTMLInputElement>('#direct_site-cable').element.value).toBe('Demo cable');
        expect(wrapper.get<HTMLInputElement>('#pop_site-vlan_id').element.value).toBe('100');
        expect(wrapper.get<HTMLInputElement>('#pop_site-cpe_outdoor').element.value).toBe('Demo outdoor');
    });

    it('writes one key at a time and leaves the other block alone', async () => {
        const wrapper = mountSection({ direct_site: { cable: 'Demo cable' }, pop_site: { port: 'Gi0/1' } });

        await wrapper.get('#direct_site-latency_ms').setValue('12');

        expect(lastModel(wrapper)).toEqual({
            direct_site: { cable: 'Demo cable', latency_ms: 12 },
            pop_site: { port: 'Gi0/1' },
        });
    });

    it('clears a single field to null instead of dropping the key', async () => {
        const wrapper = mountSection({ direct_site: { cable: 'Demo cable' } });

        await wrapper.get('#direct_site-cable').setValue('   ');

        expect(lastModel(wrapper).direct_site).toEqual({ cable: null });
    });

    it('AC3: clearing a block sends null for it, never an empty object, and keeps the other block', async () => {
        const wrapper = mountSection({ direct_site: { cable: 'Demo cable' }, pop_site: { port: 'Gi0/1' } });

        await wrapper.get('[data-testid="btn-clear-direct-site"]').trigger('click');

        expect(lastModel(wrapper)).toEqual({ direct_site: null, pop_site: { port: 'Gi0/1' } });
        expect(JSON.stringify(lastModel(wrapper))).not.toContain('{}');
    });

    it('AC3: typing after a clear starts a fresh block', async () => {
        const wrapper = mountSection({ direct_site: null, pop_site: { port: 'Gi0/1' } });

        await wrapper.get('#direct_site-routers').setValue('Demo router');

        expect(lastModel(wrapper)).toEqual({ direct_site: { routers: 'Demo router' }, pop_site: { port: 'Gi0/1' } });
    });

    it('AC1/AC2: hints the numeric boundaries and invents no RSSI range', () => {
        const wrapper = mountSection();

        const latency = wrapper.get('#direct_site-latency_ms');
        expect(latency.attributes('min')).toBe('0');
        expect(latency.attributes('max')).toBeUndefined();

        const loss = wrapper.get('#direct_site-packet_loss_percent');
        expect(loss.attributes('min')).toBe('0');
        expect(loss.attributes('max')).toBe('100');

        const vlan = wrapper.get('#pop_site-vlan_id');
        expect(vlan.attributes('min')).toBe('1');
        expect(vlan.attributes('max')).toBe('4094');

        const rssi = wrapper.get('#direct_site-rssi');
        expect(rssi.attributes('min')).toBeUndefined();
        expect(rssi.attributes('max')).toBeUndefined();
    });

    it('AC1: shows the server message for an out-of-range value under its own field', () => {
        const wrapper = mountSection(
            { direct_site: { latency_ms: -1 }, pop_site: { vlan_id: 4095 } },
            {
                errors: {
                    'activation.direct_site.latency_ms': 'Latency must be zero or more.',
                    'activation.pop_site.vlan_id': 'VLAN ID must be between 1 and 4094.',
                },
            },
        );

        expect(wrapper.get('#direct_site-latency_ms-error').text()).toContain('Latency must be zero or more.');
        expect(wrapper.get('#pop_site-vlan_id-error').text()).toContain('VLAN ID must be between 1 and 4094.');
    });

    it('sends no request of its own and disables every control when asked', () => {
        const wrapper = mountSection({}, { disabled: true });

        expect(wrapper.findAll('input:not([disabled])')).toHaveLength(0);
        expect(wrapper.get('[data-testid="btn-clear-direct-site"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-testid="btn-clear-pop-site"]').attributes('disabled')).toBeDefined();
    });

    it('writes every field into its own key, for both blocks', async () => {
        const directText = [
            'local_loops',
            'lastmile',
            'bwa',
            'antenna_tower',
            'direction',
            'routers',
            'ups',
            'stabilizer',
            'cable',
        ];
        const directNumbers = ['rssi', 'latency_ms', 'packet_loss_percent'];
        const popText = ['switch_distribution', 'port', 'local_loops', 'routers', 'cpe_indoor', 'cpe_outdoor'];

        for (const key of directText) {
            const wrapper = mountSection();
            await wrapper.get(`#direct_site-${key}`).setValue('Demo value');
            expect(lastModel(wrapper)).toEqual({ direct_site: { [key]: 'Demo value' } });
        }

        for (const key of directNumbers) {
            const wrapper = mountSection();
            await wrapper.get(`#direct_site-${key}`).setValue('7');
            expect(lastModel(wrapper)).toEqual({ direct_site: { [key]: 7 } });
        }

        for (const key of popText) {
            const wrapper = mountSection();
            await wrapper.get(`#pop_site-${key}`).setValue('Demo value');
            expect(lastModel(wrapper)).toEqual({ pop_site: { [key]: 'Demo value' } });
        }

        const vlan = mountSection();
        await vlan.get('#pop_site-vlan_id').setValue('100');
        expect(lastModel(vlan)).toEqual({ pop_site: { vlan_id: 100 } });
    });

    it('clears the POP block on its own explicit clear', async () => {
        const wrapper = mountSection({ direct_site: { cable: 'Demo cable' }, pop_site: { port: 'Gi0/1' } });

        await wrapper.get('[data-testid="btn-clear-pop-site"]').trigger('click');

        expect(lastModel(wrapper)).toEqual({ direct_site: { cable: 'Demo cable' }, pop_site: null });
    });

    it('shows each server message under the field it belongs to', () => {
        const wrapper = mountSection(
            {},
            {
                errors: {
                    'activation.direct_site.cable': 'Cable is too long.',
                    'activation.pop_site.port': 'Port is too long.',
                },
            },
        );

        expect(wrapper.get('#direct_site-cable-error').text()).toContain('Cable is too long.');
        expect(wrapper.get('#pop_site-port-error').text()).toContain('Port is too long.');
    });
});
