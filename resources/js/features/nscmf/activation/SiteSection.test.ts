import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SiteSection from './SiteSection.vue';
import { buildDraftPayload } from '../draftPayload';
import type { ActivationDraftFields } from '../draftPayload';

describe('FE-23: Activation Direct Site and POP Site (SiteSection.vue)', () => {
    describe('AC1 — sites_validate_boundaries', () => {
        it('validates latency_ms boundary: >= 0 is valid, negative is invalid', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: {
                            latency_ms: -1,
                        },
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Latency must be greater than or equal to 0 ms');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();

            // Set latency to 0 (valid lower bound)
            const latencyInput = wrapper.find('[data-testid="direct-site-latency_ms"]');
            await latencyInput.setValue('0');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Latency must be greater than or equal to 0 ms');
            expect(wrapper.emitted('submit-valid')).toBeTruthy();
        });

        it('validates packet_loss_percent boundary: 0 and 100 are valid, > 100 or < 0 is invalid', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: {
                            packet_loss_percent: 101,
                        },
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Packet loss must be between 0% and 100%');

            // Set packet_loss_percent to 100 (valid upper bound)
            const lossInput = wrapper.find('[data-testid="direct-site-packet_loss_percent"]');
            await lossInput.setValue('100');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Packet loss must be between 0% and 100%');

            // Set packet_loss_percent to 0 (valid lower bound)
            await lossInput.setValue('0');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('Packet loss must be between 0% and 100%');

            // Set packet_loss_percent to -0.01 (invalid lower bound)
            await lossInput.setValue('-0.01');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Packet loss must be between 0% and 100%');
        });

        it('validates vlan_id boundary: integer 1..4094 is valid; 0, 4095, non-integer are invalid', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        pop_site: {
                            vlan_id: 0,
                        },
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('VLAN ID must be an integer between 1 and 4094');

            const vlanInput = wrapper.find('[data-testid="pop-site-vlan_id"]');

            // 4095 is invalid (above max)
            await vlanInput.setValue('4095');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('VLAN ID must be an integer between 1 and 4094');

            // 1 is valid (lower bound)
            await vlanInput.setValue('1');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('VLAN ID must be an integer between 1 and 4094');

            // 4094 is valid (upper bound)
            await vlanInput.setValue('4094');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).not.toContain('VLAN ID must be an integer between 1 and 4094');

            // Non-integer float 100.5 is invalid
            await vlanInput.setValue('100.5');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('VLAN ID must be an integer between 1 and 4094');
        });
    });

    describe('AC2 — sites_accept_rssi_without_guessed_range', () => {
        it('accepts any valid numeric RSSI without imposing invented min/max range', async () => {
            const testRssiValues = [-120.5, -65, 0, 15.25, 999.999];

            for (const rssiVal of testRssiValues) {
                const wrapper = mount(SiteSection, {
                    props: {
                        modelValue: {
                            direct_site: {
                                rssi: rssiVal,
                            },
                        },
                    },
                });

                await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
                expect(wrapper.text()).not.toContain('RSSI must be');
                const emitted = wrapper.emitted('submit-valid');
                expect(emitted).toBeTruthy();
                const payload = emitted![emitted!.length - 1][0] as { direct_site?: { rssi?: number } };
                expect(payload.direct_site?.rssi).toBe(rssiVal);
            }
        });

        it('rejects non-numeric RSSI when input is not a parseable number', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: null,
                    },
                },
            });

            const rssiInput = wrapper.find('[data-testid="direct-site-rssi"]');
            await rssiInput.setValue('invalid-number');
            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('RSSI must be a valid number');
        });
    });

    describe('AC3 — sites_clear_with_null', () => {
        it('allows explicit user clear of Direct Site to produce null, leaving POP Site intact', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: {
                            local_loops: 'Loop 1',
                            cable: 'Fiber 24 core',
                        },
                        pop_site: {
                            switch_distribution: 'SW-DIST-01',
                            vlan_id: 100,
                        },
                    },
                },
            });

            // Click Clear Direct Site button
            const clearDirectBtn = wrapper.find('[data-testid="clear-direct-site-btn"]');
            expect(clearDirectBtn.exists()).toBe(true);
            await clearDirectBtn.trigger('click');

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }).getDraftPayload();
            expect(payload.direct_site).toBeNull();
            expect(payload.pop_site).toEqual({
                switch_distribution: 'SW-DIST-01',
                vlan_id: 100,
            });

            // Pass through buildDraftPayload to verify wire contract: direct_site is null, NOT {}
            const wire = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: payload,
            });
            expect(wire.activation.direct_site).toBeNull();
            expect(wire.activation.pop_site).toEqual({
                switch_distribution: 'SW-DIST-01',
                vlan_id: 100,
            });
        });

        it('allows explicit user clear of POP Site to produce null, leaving Direct Site intact', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: {
                            direction: 'North-East',
                            latency_ms: 12.5,
                        },
                        pop_site: {
                            cpe_indoor: 'Router 1',
                        },
                    },
                },
            });

            // Click Clear POP Site button
            const clearPopBtn = wrapper.find('[data-testid="clear-pop-site-btn"]');
            expect(clearPopBtn.exists()).toBe(true);
            await clearPopBtn.trigger('click');

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }).getDraftPayload();
            expect(payload.pop_site).toBeNull();
            expect(payload.direct_site).toEqual({
                direction: 'North-East',
                latency_ms: 12.5,
            });

            const wire = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: payload,
            });
            expect(wire.activation.pop_site).toBeNull();
            expect(wire.activation.direct_site).toEqual({
                direction: 'North-East',
                latency_ms: 12.5,
            });
        });

        it('leaves omitted site blocks omitted/undefined when never modified or entered', () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {},
                },
            });

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }).getDraftPayload();
            expect(payload.direct_site).toBeUndefined();
            expect(payload.pop_site).toBeUndefined();

            const wire = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: payload,
            });
            expect(wire.activation).not.toHaveProperty('direct_site');
            expect(wire.activation).not.toHaveProperty('pop_site');
        });

        it('never produces an empty object {} on wire when a block is cleared or partially filled', async () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: null,
                        pop_site: null,
                    },
                },
            });

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }).getDraftPayload();
            expect(payload.direct_site).toBeNull();
            expect(payload.pop_site).toBeNull();

            const wire = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: payload,
            });
            expect(wire.activation.direct_site).toBeNull();
            expect(wire.activation.pop_site).toBeNull();
        });
    });

    describe('AC4 — sites_roundtrip_all_fields', () => {
        it('retains numeric 0 for latency_ms, packet_loss_percent, rssi without truthy filtering dropping them', async () => {
            const model: ActivationDraftFields = {
                direct_site: {
                    latency_ms: 0,
                    packet_loss_percent: 0,
                    rssi: 0,
                    local_loops: 'Loop A',
                },
                pop_site: {
                    switch_distribution: 'Dist-1',
                    vlan_id: 10,
                },
            };

            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: model,
                },
            });

            const latencyInput = wrapper.find<HTMLInputElement>('[data-testid="direct-site-latency_ms"]');
            const lossInput = wrapper.find<HTMLInputElement>('[data-testid="direct-site-packet_loss_percent"]');
            const rssiInput = wrapper.find<HTMLInputElement>('[data-testid="direct-site-rssi"]');

            expect(latencyInput.element.value).toBe('0');
            expect(lossInput.element.value).toBe('0');
            expect(rssiInput.element.value).toBe('0');

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => typeof model }).getDraftPayload();
            expect(payload.direct_site?.latency_ms).toBe(0);
            expect(payload.direct_site?.packet_loss_percent).toBe(0);
            expect(payload.direct_site?.rssi).toBe(0);

            // Wire payload also preserves 0
            const wire = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 2,
                activation: payload,
            });
            expect((wire.activation.direct_site as Record<string, unknown>).latency_ms).toBe(0);
            expect((wire.activation.direct_site as Record<string, unknown>).packet_loss_percent).toBe(0);
            expect((wire.activation.direct_site as Record<string, unknown>).rssi).toBe(0);
        });

        it('roundtrips all Direct Site and POP Site fields correctly', async () => {
            const fullDirectSite = {
                local_loops: 'Fiber Loop West',
                lastmile: 'FO 100m',
                bwa: 'Point-to-Point 5GHz',
                antenna_tower: 'Tower Monopole 30m',
                direction: '270 deg azimuth',
                rssi: -68.5,
                latency_ms: 15.2,
                packet_loss_percent: 0.5,
                routers: 'Cisco ISR 4331',
                ups: 'APC Smart-UPS 3000VA',
                stabilizer: 'Matsunaga 5000W',
                cable: 'Cat6 UTP + Drop Core',
            };

            const fullPopSite = {
                switch_distribution: 'Cisco Catalyst 3850',
                port: 'Te1/0/24',
                vlan_id: 2048,
                local_loops: 'Metro-E Ring 2',
                routers: 'MikroTik CCR1036',
                cpe_indoor: 'Huawei HG8245H5',
                cpe_outdoor: 'Cambium ePMP 3000',
            };

            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: fullDirectSite,
                        pop_site: fullPopSite,
                    },
                },
            });

            // Check that all inputs render their corresponding values
            for (const [key, val] of Object.entries(fullDirectSite)) {
                const el = wrapper.find<HTMLInputElement>(`[data-testid="direct-site-${key}"]`);
                expect(el.exists()).toBe(true);
                expect(el.element.value).toBe(String(val));
            }

            for (const [key, val] of Object.entries(fullPopSite)) {
                const el = wrapper.find<HTMLInputElement>(`[data-testid="pop-site-${key}"]`);
                expect(el.exists()).toBe(true);
                expect(el.element.value).toBe(String(val));
            }

            const payload = (wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }).getDraftPayload();
            expect(payload.direct_site).toEqual(fullDirectSite);
            expect(payload.pop_site).toEqual(fullPopSite);
        });

        it('enforces 255 character limit on all string fields', async () => {
            const longString = 'a'.repeat(256);
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: {
                            local_loops: longString,
                        },
                        pop_site: {
                            port: longString,
                        },
                    },
                },
            });

            await wrapper.find('[data-testid="validate-submit-btn"]').trigger('click');
            expect(wrapper.text()).toContain('Local loops must be max 255 characters');
            expect(wrapper.text()).toContain('Port must be max 255 characters');
            expect(wrapper.emitted('submit-invalid')).toBeTruthy();
        });

        it('renders units visibly alongside numeric fields (ms, %, dBm/unit hint)', () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {},
                },
            });

            expect(wrapper.find('[data-testid="unit-latency_ms"]').text()).toBe('ms');
            expect(wrapper.find('[data-testid="unit-packet_loss_percent"]').text()).toBe('%');
            expect(wrapper.find('[data-testid="unit-rssi"]').text()).toBeTruthy();
        });

        it('supports disabled and readonly props', () => {
            const wrapper = mount(SiteSection, {
                props: {
                    disabled: true,
                    readonly: true,
                    modelValue: {
                        direct_site: { local_loops: 'Loop 1' },
                    },
                },
            });

            const input = wrapper.find<HTMLInputElement>('[data-testid="direct-site-local_loops"]');
            expect(input.attributes('disabled')).toBeDefined();
            expect(input.attributes('readonly')).toBeDefined();
        });
    });
});
