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
                const lastEmit = emitted?.[emitted.length - 1];
                const payload = (lastEmit ? lastEmit[0] : {}) as { direct_site?: { rssi?: number } };
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

            const payload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
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

            const payload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
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

            const payload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
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

        it('never produces an empty object {} on wire when a block is cleared or partially filled', () => {
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: null,
                        pop_site: null,
                    },
                },
            });

            const payload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
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
        it('retains numeric 0 for latency_ms, packet_loss_percent, rssi without truthy filtering dropping them', () => {
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

        it('roundtrips all Direct Site and POP Site fields correctly', () => {
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

            const payload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
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

        describe('SEC-FE-23 remediation verification', () => {
            function vmOf(wrapper: ReturnType<typeof mount>) {
                return wrapper.vm as unknown as {
                    getDraftPayload: () => ActivationDraftFields;
                    validateSubmit: () => boolean;
                };
            }

            const NULL_DIRECT = {
                local_loops: null,
                lastmile: null,
                bwa: null,
                antenna_tower: null,
                direction: null,
                rssi: null,
                latency_ms: null,
                packet_loss_percent: null,
                routers: null,
                ups: null,
                stabilizer: null,
                cable: null,
            };
            const NULL_POP = {
                switch_distribution: null,
                port: null,
                vlan_id: null,
                local_loops: null,
                routers: null,
                cpe_indoor: null,
                cpe_outdoor: null,
            };

            // A1 — F-23-1
            it('A1 getDraftPayload returns only owned keys (no props echo)', async () => {
                const wrapper = mount(SiteSection, {
                    props: {
                        modelValue: {
                            customer_name: 'PT Contoh',
                            lan_ip_allocation: '10.0.0.0/24',
                            service_blocks: [{ service_context: 'NEW', service_id: 'SVC-1' }],
                            sla_items: [{ row_no: 1, requirement_text: 'uptime' }],
                            priority_destinations: [{ row_no: 1, destination: 'GGC' }],
                            virtual_connections: [{ row_no: 1, bandwidth_mbps: 50 }],
                            references: [{ reference_type: 'IWO', specification: null }],
                            host_name: 'ORPHAN',
                            unknown_key: 'ORPHAN2',
                        } as never,
                    },
                });
                await wrapper.find('[data-testid="direct-site-local_loops"]').setValue('Loop A');
                const payload = vmOf(wrapper).getDraftPayload() as Record<string, unknown>;
                const ALLOWED = ['direct_site', 'pop_site'];
                const foreign = Object.keys(payload).filter((k) => !ALLOWED.includes(k));
                expect(foreign).toEqual([]);
            });

            // A2 — F-23-1b (12 §7.4.1 clobber)
            it('A2 stale foreign collections are not echoed to the wire', async () => {
                const wrapper = mount(SiteSection, {
                    props: {
                        modelValue: {
                            service_blocks: [
                                { service_context: 'NEW', service_id: 'SVC-STALE-1' },
                                { service_context: 'EXISTING', service_id: 'SVC-STALE-2' },
                            ],
                            sla_items: [{ row_no: 1, requirement_text: 'stale' }],
                        } as never,
                    },
                });
                await wrapper.find('[data-testid="pop-site-port"]').setValue('Te1/0/7');
                const payload = vmOf(wrapper).getDraftPayload();
                const wire = buildDraftPayload({ family: 'ACTIVATION', record_version: 1, activation: payload });
                expect(Object.keys(wire.activation).sort()).toEqual(['pop_site']);
            });

            // A3/A4 — F-23-2
            it('A3 validateSubmit refuses in readonly mode', () => {
                const wrapper = mount(SiteSection, {
                    props: { readonly: true, modelValue: { direct_site: { local_loops: 'Loop 1' } } },
                });
                expect(vmOf(wrapper).validateSubmit()).toBe(false);
                expect(wrapper.emitted('submit-valid')).toBeFalsy();
                expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            });

            it('A4 validateSubmit refuses in disabled mode', () => {
                const wrapper = mount(SiteSection, {
                    props: { disabled: true, modelValue: { pop_site: { port: 'Te1/0/1' } } },
                });
                expect(vmOf(wrapper).validateSubmit()).toBe(false);
                expect(wrapper.emitted('submit-valid')).toBeFalsy();
                expect(wrapper.emitted('submit-invalid')).toBeTruthy();
            });

            it('A5 hidden validate button is non-interactive in readonly/disabled', () => {
                for (const flags of [{ readonly: true }, { disabled: true }]) {
                    const wrapper = mount(SiteSection, {
                        props: { ...flags, modelValue: { direct_site: { local_loops: 'L' } } },
                    });
                    const btn = wrapper.find('[data-testid="validate-submit-btn"]');
                    expect(btn.attributes('disabled')).toBeDefined();
                    expect(btn.attributes('aria-hidden')).toBe('true');
                }
            });

            // A6 — F-23-4
            it('A6 serialisation clamps string fields to 255 and inputs have maxlength 255', async () => {
                const wrapper = mount(SiteSection, { props: { modelValue: {} } });
                const input = wrapper.find('[data-testid="direct-site-local_loops"]');
                expect(input.attributes('maxlength')).toBe('255');
                (input.element as HTMLInputElement).value = 'A'.repeat(5000);
                await input.trigger('input');
                const payload = vmOf(wrapper).getDraftPayload();
                expect(
                    ((payload.direct_site as { local_loops?: string })?.local_loops ?? '').length,
                ).toBeLessThanOrEqual(255);
                const wire = buildDraftPayload({ family: 'ACTIVATION', record_version: 1, activation: payload });
                expect(
                    ((wire.activation.direct_site as { local_loops?: string })?.local_loops ?? '').length,
                ).toBeLessThanOrEqual(255);
            });

            // A7 — F-23-5
            it('A7 non-finite numeric input fails closed', async () => {
                for (const [testid, field, blockKey] of [
                    ['direct-site-rssi', 'rssi', 'direct_site'],
                    ['direct-site-latency_ms', 'latency_ms', 'direct_site'],
                ] as const) {
                    const wrapper = mount(SiteSection, { props: { modelValue: {} } });
                    await wrapper.find(`[data-testid="${testid}"]`).setValue('1e999');
                    const ok = vmOf(wrapper).validateSubmit();
                    const payload = vmOf(wrapper).getDraftPayload();
                    const raw = (payload[blockKey] as Record<string, unknown> | null | undefined)?.[field];
                    expect(ok).toBe(false);
                    expect(raw === null || raw === undefined).toBe(true);
                }
            });

            // A8/A9 — F-23-3
            it('A8 editing one block does not clear the other null-filled block', async () => {
                const wrapper = mount(SiteSection, {
                    props: { modelValue: { direct_site: NULL_DIRECT, pop_site: { port: 'Te1/0/1' } } as never },
                });
                await wrapper.find('[data-testid="pop-site-port"]').setValue('Te1/0/2');
                const payload = vmOf(wrapper).getDraftPayload() as Record<string, unknown>;
                expect(payload.direct_site).not.toBeNull();
                const wire = buildDraftPayload({ family: 'ACTIVATION', record_version: 1, activation: payload });
                expect(wire.activation.direct_site).not.toBeNull();
            });

            it('A9 empty-string-only incoming block does not become an explicit clear', async () => {
                const wrapper = mount(SiteSection, {
                    props: {
                        modelValue: {
                            direct_site: { local_loops: '', lastmile: null, rssi: Infinity },
                            pop_site: NULL_POP,
                        } as never,
                    },
                });
                await wrapper.find('[data-testid="pop-site-port"]').setValue('Te1/0/1');
                const payload = vmOf(wrapper).getDraftPayload() as Record<string, unknown>;
                expect(payload.direct_site).not.toBeNull();
            });

            // A10 — F-23-9
            it('A10 own __proto__ key never reaches the payload', async () => {
                const hostile = JSON.parse('{"__proto__":{"isAdmin":true},"direct_site":{"local_loops":"L"}}') as never;
                const wrapper = mount(SiteSection, { props: { modelValue: hostile } });
                await wrapper.find('[data-testid="pop-site-port"]').setValue('Te1/0/1');
                const payload = vmOf(wrapper).getDraftPayload() as Record<string, unknown>;
                expect(Object.hasOwn(payload, '__proto__')).toBe(false);
                expect(Object.hasOwn(payload, 'constructor')).toBe(false);
                const merged: Record<string, unknown> = {};
                Object.assign(merged, payload);
                expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
            });
        });

        it('handles direct_site / pop_site explicit undefined or empty input correctly', async () => {
            // Test explicit undefined in props (covers branch direct_site !== undefined else path)
            const wrapper = mount(SiteSection, {
                props: {
                    modelValue: {
                        direct_site: undefined,
                        pop_site: undefined,
                    },
                },
            });
            expect(wrapper.exists()).toBe(true);

            // Test setting inputs directly (covers v-model input updates for all inputs)
            const inputsToTest: Record<string, string> = {
                'direct-site-local_loops': 'LL1',
                'direct-site-lastmile': 'LM1',
                'direct-site-bwa': 'BWA1',
                'direct-site-antenna_tower': 'Tower1',
                'direct-site-direction': 'Dir1',
                'direct-site-routers': 'Router1',
                'direct-site-ups': 'UPS1',
                'direct-site-stabilizer': 'Stab1',
                'direct-site-cable': 'Cable1',
                'pop-site-switch_distribution': 'Switch1',
                'pop-site-port': 'Port1',
                'pop-site-local_loops': 'PopLL1',
                'pop-site-routers': 'PopRouter1',
                'pop-site-cpe_indoor': 'Indoor1',
                'pop-site-cpe_outdoor': 'Outdoor1',
            };

            for (const [testId, val] of Object.entries(inputsToTest)) {
                const el = wrapper.find(`[data-testid="${testId}"]`);
                await el.setValue(val);
            }

            // Test invalid numeric values for latency, packet_loss, vlan to cover isNaN(n) ? null branch in payload builder
            const latencyInput = wrapper.find('[data-testid="direct-site-latency_ms"]');
            await latencyInput.setValue('invalid');
            const lossInput = wrapper.find('[data-testid="direct-site-packet_loss_percent"]');
            await lossInput.setValue('invalid');
            const vlanInput = wrapper.find('[data-testid="pop-site-vlan_id"]');
            await vlanInput.setValue('invalid');

            const payloadWithInvalidNum = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
            expect(payloadWithInvalidNum.direct_site?.latency_ms).toBeNull();
            expect(payloadWithInvalidNum.direct_site?.packet_loss_percent).toBeNull();
            expect(payloadWithInvalidNum.pop_site?.vlan_id).toBeNull();

            // Test clearing all fields to blank when active to cover !hasAnyField -> return null
            for (const testId of Object.keys(inputsToTest)) {
                await wrapper.find(`[data-testid="${testId}"]`).setValue('');
            }
            await latencyInput.setValue('');
            await lossInput.setValue('');
            await vlanInput.setValue('');

            const clearedFieldsPayload = (
                wrapper.vm as unknown as { getDraftPayload: () => ActivationDraftFields }
            ).getDraftPayload();
            expect(clearedFieldsPayload.direct_site).toBeNull();
            expect(clearedFieldsPayload.pop_site).toBeNull();

            // Test setting modelValue prop to undefined/null to cover if (val) false branch
            // Note: withDefaults provides default {} if undefined is passed on mount or setProps,
            // so pass null or undefined via wrapper.vm or wrapper.setProps({ modelValue: undefined as any })
            await wrapper.setProps({
                modelValue: null as unknown as ActivationDraftFields,
            });
            await wrapper.vm.$nextTick();
        });
    });
});
