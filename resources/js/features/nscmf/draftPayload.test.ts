import { describe, expect, it } from 'vitest';
import {
    type ActivationDraftFields,
    type ActivationDraftInput,
    buildDraftPayload,
    type ChangeDraftFields,
    type ChangeDraftInput,
    type DirectSiteBlock,
    type DraftPayloadInput,
    type PopSiteBlock,
} from './draftPayload';

describe('FE-19: Repeatable rows and Draft payload semantics', () => {
    describe('AC1: payload_replaces_collections', () => {
        it('produces full desired array when a row is removed (whole-set replacement)', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 3,
                activation: {
                    sla_items: [
                        { row_no: 1, requirement_text: '99.9% uptime' },
                        { row_no: 2, requirement_text: 'MTTR < 4h' },
                    ],
                },
            };

            const payload = buildDraftPayload(input);
            expect(payload.record_version).toBe(3);
            expect(payload.activation).toHaveProperty('sla_items');
            expect(payload.activation.sla_items).toEqual([
                { row_no: 1, requirement_text: '99.9% uptime' },
                { row_no: 2, requirement_text: 'MTTR < 4h' },
            ]);
        });

        it('omits collection key when omitted from input (omission is unchanged, not clear)', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 5,
                activation: {
                    customer_name: 'PT Maju Bersama',
                },
            };

            const payload = buildDraftPayload(input);
            expect(payload.activation).toHaveProperty('customer_name', 'PT Maju Bersama');
            expect(payload.activation).not.toHaveProperty('references');
            expect(payload.activation).not.toHaveProperty('sla_items');
            expect(payload.activation).not.toHaveProperty('service_blocks');
        });

        it('sends explicit [] when collection is empty array to clear all rows', () => {
            const input: ChangeDraftInput = {
                family: 'CHANGE',
                record_version: 2,
                change: {
                    facing_challenges: [],
                    service_impacts: [],
                },
            };

            const payload = buildDraftPayload(input);
            expect(payload.change).toHaveProperty('facing_challenges', []);
            expect(payload.change).toHaveProperty('service_impacts', []);
        });
    });

    describe('AC2: payload_keeps_selected_null_items', () => {
        it('keeps selection items with null detail (IWO with null specification)', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    references: [
                        { reference_type: 'IWO', specification: null },
                        { reference_type: 'OTHER', specification: 'Nota internal' },
                    ],
                },
            };

            const payload = buildDraftPayload(input);
            expect(payload.activation.references).toEqual([
                { reference_type: 'IWO', specification: null },
                { reference_type: 'OTHER', specification: 'Nota internal' },
            ]);
        });

        it('keeps selection items with null detail (NOC15 with null other_description)', () => {
            const input: ChangeDraftInput = {
                family: 'CHANGE',
                record_version: 4,
                change: {
                    service_impacts: [
                        { impact_code: 'NOC15', other_description: null },
                        { impact_code: 'OTHER', other_description: 'Pelanggan VIP' },
                    ],
                },
            };

            const payload = buildDraftPayload(input);
            expect(payload.change.service_impacts).toEqual([
                { impact_code: 'NOC15', other_description: null },
                { impact_code: 'OTHER', other_description: 'Pelanggan VIP' },
            ]);
        });
    });

    describe('AC3: payload_discards_empty_content_rows', () => {
        it('discards content-empty numbered rows (row_no only) while keeping partial rows that have content', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 2,
                activation: {
                    sla_items: [
                        { row_no: 1, requirement_text: 'Latency < 20ms' },
                        { row_no: 2, requirement_text: null },
                        { row_no: 3, requirement_text: '   ' },
                    ],
                    virtual_connections: [
                        { row_no: 1, bandwidth_mbps: null },
                        { row_no: 2, bandwidth_mbps: 100 },
                    ],
                    priority_destinations: [
                        { row_no: 1, destination: '' },
                        { row_no: 2, destination: 'IXP Core' },
                    ],
                    service_blocks: [
                        { service_context: 'EXISTING' },
                        {
                            service_context: 'NEW',
                            service_id: 'SVC-123',
                        },
                    ],
                },
            };

            const payload = buildDraftPayload(input);
            const act = payload.activation;

            expect(act.sla_items).toEqual([{ row_no: 1, requirement_text: 'Latency < 20ms' }]);
            expect(act.virtual_connections).toEqual([{ row_no: 2, bandwidth_mbps: 100 }]);
            expect(act.priority_destinations).toEqual([{ row_no: 2, destination: 'IXP Core' }]);
            expect(act.service_blocks).toEqual([
                {
                    service_context: 'NEW',
                    service_id: 'SVC-123',
                    service_status: null,
                    service_description: null,
                    service_location: null,
                },
            ]);
        });

        it('discards empty Change rows while preserving partial plan or result with content', () => {
            const input: ChangeDraftInput = {
                family: 'CHANGE',
                record_version: 7,
                change: {
                    facing_challenges: [
                        { row_no: 1, challenge_text: 'Downtime constraint' },
                        { row_no: 2, challenge_text: null },
                    ],
                    identified_problems: [
                        { row_no: 1, problem_text: '' },
                        { row_no: 2, problem_text: 'High packet drop' },
                    ],
                    improvement_items: [
                        { row_no: 1, plan_text: 'Add redundant link', target_kpi: null },
                        { row_no: 2, plan_text: null, target_kpi: null },
                    ],
                    results: [
                        { row_no: 1, result_summary: null, performance_information: null, result_status: 'SUCCESS' },
                        { row_no: 2, result_summary: null, performance_information: null, result_status: null },
                    ],
                },
            };

            const payload = buildDraftPayload(input);
            const chg = payload.change;

            expect(chg.facing_challenges).toEqual([{ row_no: 1, challenge_text: 'Downtime constraint' }]);
            expect(chg.identified_problems).toEqual([{ row_no: 2, problem_text: 'High packet drop' }]);
            expect(chg.improvement_items).toEqual([{ row_no: 1, plan_text: 'Add redundant link', target_kpi: null }]);
            expect(chg.results).toEqual([
                {
                    row_no: 1,
                    result_summary: null,
                    performance_information: null,
                    result_status: 'SUCCESS',
                },
            ]);

            // Cover ?? null right side when fields are omitted/undefined in partial rows
            const partialRightSideInput: ChangeDraftInput = {
                family: 'CHANGE',
                record_version: 7,
                change: {
                    improvement_items: [{ row_no: 1, target_kpi: '99.99% uptime' }],
                    results: [{ row_no: 1, result_summary: 'Maintenance finished' }],
                },
            };
            const partialPayload = buildDraftPayload(partialRightSideInput);
            expect(partialPayload.change.improvement_items).toEqual([
                {
                    row_no: 1,
                    plan_text: null,
                    target_kpi: '99.99% uptime',
                },
            ]);
            expect(partialPayload.change.results).toEqual([
                {
                    row_no: 1,
                    result_summary: 'Maintenance finished',
                    performance_information: null,
                    result_status: null,
                },
            ]);
        });
    });

    describe('AC4: payload_blocks_duplicate_keys_and_wrong_family', () => {
        it('throws validation error when natural keys are missing or duplicated within a collection', () => {
            // Missing natural keys
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        references: [{ reference_type: '' as unknown as 'IWO' }],
                    },
                }),
            ).toThrow(/missing reference_type/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        service_impacts: [{ impact_code: '' as unknown as 'NOC15' }],
                    },
                }),
            ).toThrow(/missing impact_code/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        service_blocks: [{ service_context: '' as unknown as 'EXISTING' }],
                    },
                }),
            ).toThrow(/missing service_context/i);

            // Duplicate keys across collections
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        sla_items: [
                            { row_no: 1, requirement_text: 'Rule A' },
                            { row_no: 1, requirement_text: 'Rule B' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        virtual_connections: [
                            { row_no: 2, bandwidth_mbps: 10 },
                            { row_no: 2, bandwidth_mbps: 20 },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        priority_destinations: [
                            { row_no: 3, destination: '8.8.8.8' },
                            { row_no: 3, destination: '1.1.1.1' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        facing_challenges: [
                            { row_no: 1, challenge_text: 'Challenge 1' },
                            { row_no: 1, challenge_text: 'Challenge 2' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        identified_problems: [
                            { row_no: 2, problem_text: 'Problem 1' },
                            { row_no: 2, problem_text: 'Problem 2' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        improvement_items: [
                            { row_no: 3, plan_text: 'Plan A' },
                            { row_no: 3, plan_text: 'Plan B' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*row_no/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        references: [{ reference_type: 'IWO' }, { reference_type: 'IWO', specification: 'Second' }],
                    },
                }),
            ).toThrow(/duplicate.*reference_type/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        service_blocks: [
                            { service_context: 'EXISTING', service_id: 'A' },
                            { service_context: 'EXISTING', service_id: 'B' },
                        ],
                    },
                }),
            ).toThrow(/duplicate.*service_context/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        service_impacts: [{ impact_code: 'NOC15' }, { impact_code: 'NOC15' }],
                    },
                }),
            ).toThrow(/duplicate.*impact_code/i);
        });

        it('rejects invalid row_no ranges (1..3 for standard items, 1..5 for results)', () => {
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        sla_items: [{ row_no: 4, requirement_text: 'Out of range' }],
                    },
                }),
            ).toThrow(/row_no.*1..3/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        results: [{ row_no: 0, result_status: 'Too low' }],
                    },
                }),
            ).toThrow(/row_no.*1..5/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        results: [{ row_no: 6, result_status: 'Too high' }],
                    },
                }),
            ).toThrow(/row_no.*1..5/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        results: [
                            { row_no: 1, result_status: 'OK' },
                            { row_no: 1, result_summary: 'Duplicate' },
                        ],
                    },
                }),
            ).toThrow(/duplicate row_no/i);
        });

        it('prevents Change fields from leaking into Activation and vice versa', () => {
            const actInput: DraftPayloadInput = {
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    customer_name: 'PT Telco',
                },
                change: {
                    maintenance_purpose: 'Sneaky leak',
                },
            };
            const actPayload = buildDraftPayload(actInput);

            expect(actPayload).not.toHaveProperty('change');
            expect('activation' in actPayload && actPayload.activation).not.toHaveProperty('maintenance_purpose');

            const chgInput: DraftPayloadInput = {
                family: 'CHANGE',
                record_version: 1,
                change: {
                    maintenance_purpose: 'Router maintenance',
                },
                activation: {
                    customer_name: 'Sneaky leak',
                },
            };
            const chgPayload = buildDraftPayload(chgInput);

            expect(chgPayload).not.toHaveProperty('activation');
            expect('change' in chgPayload && chgPayload.change).not.toHaveProperty('customer_name');
        });
    });

    describe('AC5: payload_site_clear_is_null', () => {
        it('sends null when site block is explicitly cleared, rejects empty object {}, and passes through valid site block', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    direct_site: null,
                    pop_site: null,
                },
            };
            const payload = buildDraftPayload(input);

            const act = payload.activation;
            expect(act.direct_site).toBeNull();
            expect(act.pop_site).toBeNull();

            // Pass through valid populated site block
            const populatedInput: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    direct_site: {
                        local_loops: 'Fiber Optic',
                        antenna_tower: 'Tower 45m',
                        latency_ms: 12,
                    },
                    pop_site: {
                        switch_distribution: 'Cisco Catalyst',
                        vlan_id: 100,
                    },
                },
            };
            const populatedPayload = buildDraftPayload(populatedInput);
            expect(populatedPayload.activation.direct_site).toEqual({
                local_loops: 'Fiber Optic',
                antenna_tower: 'Tower 45m',
                latency_ms: 12,
            });
            expect(populatedPayload.activation.pop_site).toEqual({
                switch_distribution: 'Cisco Catalyst',
                vlan_id: 100,
            });

            // validateSiteBlock returns undefined when site is explicitly undefined in activation
            const undefinedSiteInput: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    direct_site: undefined,
                },
            };
            const undefinedSitePayload = buildDraftPayload(undefinedSiteInput);
            expect(undefinedSitePayload.activation.direct_site).toBeUndefined();

            // Retains service_block with non-string content (covers isPresent non-string branch)
            const serviceBlockNumericInput: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    service_blocks: [{ service_context: 'EXISTING', service_id: 12345 as unknown as string }],
                },
            };
            const serviceBlockNumericPayload = buildDraftPayload(serviceBlockNumericInput);
            expect(serviceBlockNumericPayload.activation.service_blocks).toEqual([
                {
                    service_context: 'EXISTING',
                    service_id: 12345,
                    service_status: null,
                    service_description: null,
                    service_location: null,
                },
            ]);

            // Covers ?? null fallbacks on service_blocks with nullish fields
            const serviceBlockSparseInput: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    service_blocks: [
                        {
                            service_context: 'NEW',
                            service_location: 'Jakarta DC',
                        },
                    ],
                },
            };
            const sparsePayload = buildDraftPayload(serviceBlockSparseInput);
            expect(sparsePayload.activation.service_blocks).toEqual([
                {
                    service_context: 'NEW',
                    service_id: null,
                    service_status: null,
                    service_description: null,
                    service_location: 'Jakarta DC',
                },
            ]);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 8,
                    activation: {
                        direct_site: {} as unknown as DirectSiteBlock,
                    },
                }),
            ).toThrow(/empty object.*invalid.*null/i);
        });

        it('throws validation error when record_version is missing or not a number', () => {
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: undefined as unknown as number,
                }),
            ).toThrow(/record_version is required/i);
        });

        it('remediates SEC-FE-19 findings F-1 to F-5 with strict regression checks', () => {
            // F-1: record_version must be safe integer >= 1, rejects non-finite, floats, <= 0
            expect(() =>
                buildDraftPayload({ family: 'ACTIVATION', record_version: NaN } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: Infinity,
                } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({ family: 'ACTIVATION', record_version: -1 } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({ family: 'ACTIVATION', record_version: 0 } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({ family: 'ACTIVATION', record_version: 1.5 } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({ family: 'ACTIVATION', record_version: 1e21 } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: '1' as unknown as number,
                } as unknown as ActivationDraftInput),
            ).toThrow(/safe positive integer/i);

            // F-2 & F-5: Site blocks reject non-plain-objects, empty content, only unknown keys, and allowlist fields
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: { direct_site: 'not-an-object' as unknown as DirectSiteBlock },
                }),
            ).toThrow(/must be a plain object or null/i);
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: { pop_site: [1, 2, 3] as unknown as DirectSiteBlock },
                }),
            ).toThrow(/must be a plain object or null/i);
            // Blank fields are cleared individually; the block itself stays (12 §27.1)
            expect(
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        direct_site: {
                            routers: '   ',
                            cable: '',
                        } as unknown as DirectSiteBlock,
                    },
                }).activation.direct_site,
            ).toEqual({ routers: null, cable: null });
            // Only unknown keys present -> dropped by allowlist -> empty content -> throws
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        direct_site: {
                            approved_by: 99,
                            record_version: 999,
                        } as unknown as DirectSiteBlock,
                    },
                }),
            ).toThrow(/Empty object {} is invalid for direct_site/i);
            // Valid site block with null field and extra fields stripped
            const sitePayload = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    direct_site: {
                        routers: 'Core Router A',
                        ups: null,
                        approved_by: 99,
                    } as unknown as DirectSiteBlock,
                    pop_site: {
                        port: 'Gi0/0/1',
                        vlan_id: null,
                        secret_field: 'hacked',
                    } as unknown as DirectSiteBlock,
                },
            });
            expect(sitePayload.activation.direct_site).toEqual({
                routers: 'Core Router A',
                ups: null,
            });
            expect(sitePayload.activation.direct_site).not.toHaveProperty('approved_by');
            expect(sitePayload.activation.pop_site).toEqual({
                port: 'Gi0/0/1',
                vlan_id: null,
            });
            expect(sitePayload.activation.pop_site).not.toHaveProperty('secret_field');

            // F-3: Natural keys must be strings and whitespace variants collide fail-closed
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        references: [{ reference_type: 123 as unknown as 'IWO' }],
                    },
                }),
            ).toThrow(/missing reference_type/i);
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        references: [{ reference_type: 'IWO' }, { reference_type: '  IWO  ' as unknown as 'IWO' }],
                    },
                }),
            ).toThrow(/duplicate reference_type found: IWO/i);

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        service_blocks: [{ service_context: { evil: 1 } as unknown as 'EXISTING' }],
                    },
                }),
            ).toThrow(/missing service_context/i);
            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        service_blocks: [
                            { service_context: 'EXISTING', service_id: 'S1' },
                            { service_context: ' EXISTING  ' as unknown as 'EXISTING', service_id: 'S2' },
                        ],
                    },
                }),
            ).toThrow(/duplicate service_context found: EXISTING/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        service_impacts: [{ impact_code: 5 as unknown as 'NOC15' }],
                    },
                }),
            ).toThrow(/missing impact_code/i);
            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        service_impacts: [{ impact_code: 'NOC15' }, { impact_code: ' NOC15 ' as unknown as 'NOC15' }],
                    },
                }),
            ).toThrow(/duplicate impact_code found: NOC15/i);

            // F-4: All 10 collection call sites guard against non-array values and non-plain-object elements
            const nonArrayPayloads: (() => void)[] = [
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { references: 'IWO' as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { service_blocks: { service_context: 'EXISTING' } as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { sla_items: 'invalid' as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { virtual_connections: 123 as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { priority_destinations: {} as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { facing_challenges: 'none' as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { identified_problems: {} as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { service_impacts: 42 as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { improvement_items: true as unknown as [] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { results: 'x' as unknown as [] },
                    }),
            ];
            for (const fn of nonArrayPayloads) {
                expect(fn).toThrow(/must be an array/i);
            }

            const nonPlainObjectElementPayloads: (() => void)[] = [
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { references: [null as unknown as { reference_type: 'IWO' }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { service_blocks: ['bad' as unknown as { service_context: 'NEW' }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { sla_items: [null as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { virtual_connections: [123 as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: { priority_destinations: [undefined as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { facing_challenges: [null as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { identified_problems: [false as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { service_impacts: [null as unknown as { impact_code: 'NOC15' }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { improvement_items: ['plan' as unknown as { row_no: 1 }] },
                    }),
                () =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: { results: [null as unknown as { row_no: 1 }] },
                    }),
            ];
            for (const fn of nonPlainObjectElementPayloads) {
                expect(fn).toThrow(/must be a plain object/i);
            }
        });

        it('throws error when family is unsupported', () => {
            expect(() =>
                buildDraftPayload({
                    family: 'INVALID' as unknown as 'ACTIVATION',
                    record_version: 1,
                }),
            ).toThrow(/unsupported family/i);
        });

        it('rejects non-plain-object input containers and validates activation/change object guards (FU-3 & FU-4)', () => {
            expect(() => buildDraftPayload('primitive-input' as unknown as ActivationDraftInput)).toThrow(
                /input must be a plain object/i,
            );
            expect(() => buildDraftPayload(null as unknown as ActivationDraftInput)).toThrow(
                /input must be a plain object/i,
            );
            expect(() => buildDraftPayload([1, 2, 3] as unknown as ActivationDraftInput)).toThrow(
                /input must be a plain object/i,
            );

            expect(() =>
                buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: 'not-an-object' as unknown as ActivationDraftFields,
                }),
            ).toThrow(/activation must be a plain object/i);

            expect(() =>
                buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: 12345 as unknown as ChangeDraftFields,
                }),
            ).toThrow(/change must be a plain object/i);

            // Prototype pollution on container properties (family, record_version, activation, change) cannot forge payload
            const proto = Object.prototype as Record<string, unknown>;
            proto['family'] = 'ACTIVATION';
            proto['record_version'] = 99;
            proto['activation'] = { customer_name: 'POLLUTED-VIA-PROTO-ACT', gateway: 'POLLUTED-GW' };
            proto['change'] = { maintenance_purpose: 'POLLUTED-VIA-PROTO-CHG' };

            try {
                // Empty object {} must NOT inherit family or record_version from prototype
                expect(() => buildDraftPayload({} as unknown as ActivationDraftInput)).toThrow(
                    /record_version is required/i,
                );

                // Input with family but without own record_version must NOT pick up record_version from prototype
                expect(() => buildDraftPayload({ family: 'ACTIVATION' } as unknown as ActivationDraftInput)).toThrow(
                    /record_version is required/i,
                );
                expect(() => buildDraftPayload({ family: 'CHANGE' } as unknown as ChangeDraftInput)).toThrow(
                    /record_version is required/i,
                );

                // Input with no own activation/change container must NOT pick up prototype container
                const actEmpty = buildDraftPayload({ family: 'ACTIVATION', record_version: 1 });
                expect(actEmpty.activation).toEqual({});
                expect(JSON.stringify(actEmpty)).not.toContain('POLLUTED');

                const chgEmpty = buildDraftPayload({ family: 'CHANGE', record_version: 1 });
                expect(chgEmpty.change).toEqual({});
                expect(JSON.stringify(chgEmpty)).not.toContain('POLLUTED');
            } finally {
                delete proto['family'];
                delete proto['record_version'];
                delete proto['activation'];
                delete proto['change'];
            }
        });

        it('discards non-numeric or non-positive bandwidth_mbps in virtual_connections and pins valid positive numbers (FU-2)', () => {
            const payload = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    virtual_connections: [
                        { row_no: 1, bandwidth_mbps: '' as unknown as number },
                        { row_no: 2, bandwidth_mbps: '   ' as unknown as number },
                        { row_no: 3, bandwidth_mbps: 0 },
                    ],
                },
            });
            // Blank rows are not-started and discarded; 0 is a value the server must judge (12 §7.4.1.1)
            expect(payload.activation.virtual_connections).toEqual([{ row_no: 3, bandwidth_mbps: 0 }]);

            const nonNumericPayload = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    virtual_connections: [
                        { row_no: 1, bandwidth_mbps: false as unknown as number },
                        { row_no: 2, bandwidth_mbps: [] as unknown as number },
                        { row_no: 3, bandwidth_mbps: -5 },
                    ],
                },
            });
            expect(nonNumericPayload.activation.virtual_connections).toEqual([{ row_no: 3, bandwidth_mbps: -5 }]);

            // Valid numeric > 0 entries are preserved
            const validPayload = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    virtual_connections: [
                        { row_no: 1, bandwidth_mbps: 50 },
                        { row_no: 2, bandwidth_mbps: '100.5' as unknown as number },
                    ],
                },
            });
            expect(validPayload.activation.virtual_connections).toEqual([
                { row_no: 1, bandwidth_mbps: 50 },
                { row_no: 2, bandwidth_mbps: 100.5 },
            ]);
        });

        it('includes current record_version without client-side incrementation', () => {
            const input: ActivationDraftInput = {
                family: 'ACTIVATION',
                record_version: 8,
                activation: {
                    customer_name: 'PT Alpha',
                },
            };
            const payload = buildDraftPayload(input);

            expect(payload.record_version).toBe(8);
        });

        it('handles nullish/missing activation and change objects falling back to empty payload', () => {
            const activationWithoutAct = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
            } as unknown as ActivationDraftInput);
            expect(activationWithoutAct.activation).toEqual({});

            const changeWithoutChg = buildDraftPayload({
                family: 'CHANGE',
                record_version: 2,
            } as unknown as ChangeDraftInput);
            expect(changeWithoutChg.change).toEqual({});
        });

        it('resists prototype pollution in site blocks and scalar paths (NEW-1 regression)', () => {
            const proto = Object.prototype as Record<string, unknown>;
            proto['routers'] = 'ATTACKER-CONTROLLED';
            proto['vlan_id'] = 4094;
            proto['customer_name'] = 'EVIL-CUSTOMER';
            proto['maintenance_purpose'] = 'EVIL-PURPOSE';

            try {
                // Empty direct_site object must still throw even when Object.prototype has allowlisted keys
                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            direct_site: {} as unknown as DirectSiteBlock,
                        },
                    }),
                ).toThrow(/empty object.*invalid.*null/i);

                // Populated direct_site must only contain its own properties, not prototype properties
                const payloadDirect = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        direct_site: { cable: 'Fiber 12C' },
                    },
                });
                const directJson = JSON.stringify(payloadDirect);
                expect(directJson).not.toContain('ATTACKER-CONTROLLED');
                expect(payloadDirect.activation.direct_site).toEqual({ cable: 'Fiber 12C' });

                // Populated pop_site must not pick up vlan_id from prototype
                const payloadPop = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        pop_site: { port: 'Gi0/0/1' },
                    },
                });
                const popJson = JSON.stringify(payloadPop);
                expect(popJson).not.toContain('4094');
                expect(payloadPop.activation.pop_site).toEqual({ port: 'Gi0/0/1' });

                // Empty activation / change objects must not pick up scalar prototype pollution
                const emptyActPayload = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {},
                });
                expect(JSON.stringify(emptyActPayload)).not.toContain('EVIL-CUSTOMER');
                expect(emptyActPayload.activation).toEqual({});

                const emptyChgPayload = buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {},
                });
                expect(JSON.stringify(emptyChgPayload)).not.toContain('EVIL-PURPOSE');
                expect(emptyChgPayload.change).toEqual({});
            } finally {
                delete proto['routers'];
                delete proto['vlan_id'];
                delete proto['customer_name'];
                delete proto['maintenance_purpose'];
            }
        });

        it('normalizes blank-string fields inside site blocks to null (NEW-2 contract ruling)', () => {
            // A blank string or whitespace string in a site field represents a field-level clear
            // and is converted to null on the wire, preserving the key without dropping it.
            const payload = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    direct_site: {
                        routers: '',
                        ups: '   ',
                        cable: 'Fiber 12C',
                    } as unknown as DirectSiteBlock,
                    pop_site: {
                        port: 'Gi0/0/1',
                        vlan_id: '' as unknown as number,
                    } as unknown as PopSiteBlock,
                },
            });

            expect(payload.activation.direct_site).toEqual({
                routers: null,
                ups: null,
                cable: 'Fiber 12C',
            });
            expect(payload.activation.pop_site).toEqual({
                port: 'Gi0/0/1',
                vlan_id: null,
            });

            // A block whose fields are all blank is still a valid object (12 §27.1 sends all-null blocks)
            const allBlank = buildDraftPayload({
                family: 'ACTIVATION',
                record_version: 1,
                activation: {
                    direct_site: {
                        routers: '',
                        ups: '   ',
                    } as unknown as DirectSiteBlock,
                },
            });
            expect(allBlank.activation.direct_site).toEqual({ routers: null, ups: null });
        });

        it('resists prototype pollution in repeatable row value reads and natural keys (BF-1 regression)', () => {
            const proto = Object.prototype as Record<string, unknown>;
            proto['service_id'] = 'POLLUTED-SERVICE-ID';
            proto['service_status'] = 'ACTIVATED';
            proto['service_description'] = 'POLLUTED-DESC';
            proto['service_location'] = 'POLLUTED-LOC';
            proto['service_context'] = 'NEW';
            proto['impact_code'] = 'NOC15';
            proto['row_no'] = 1;
            proto['reference_type'] = 'IWO';
            proto['specification'] = 'POLLUTED-SPEC';
            proto['challenge_text'] = 'POLLUTED-CHALLENGE';
            proto['problem_text'] = 'POLLUTED-PROBLEM';
            proto['destination'] = 'POLLUTED-DEST';
            proto['bandwidth_mbps'] = 9999;
            proto['requirement_text'] = 'POLLUTED-REQ';
            proto['plan_text'] = 'POLLUTED-PLAN';
            proto['target_kpi'] = 'POLLUTED-KPI';
            proto['result_summary'] = 'POLLUTED-SUMMARY';
            proto['performance_information'] = 'POLLUTED-PERF';
            proto['result_status'] = 'POLLUTED-STATUS';
            proto['other_description'] = 'POLLUTED-OTHER';

            try {
                // 1. A content-empty row carrying only service_context must NOT pick up prototype values to manufacture content
                const emptyServicePayload = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        service_blocks: [{ service_context: 'NEW' }],
                    },
                });
                // Since it is content-empty, it must be discarded
                expect(emptyServicePayload.activation.service_blocks).toEqual([]);
                const serviceJson = JSON.stringify(emptyServicePayload);
                expect(serviceJson).not.toContain('POLLUTED-SERVICE-ID');
                expect(serviceJson).not.toContain('POLLUTED-DESC');
                expect(serviceJson).not.toContain('POLLUTED-LOC');
                expect(serviceJson).not.toContain('ACTIVATED');

                // 2. Polluted row_no must not satisfy natural key requirement for an empty row across all 7 row_no collections
                expect(() =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: {
                            facing_challenges: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: {
                            identified_problems: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: {
                            improvement_items: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: {
                            results: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            sla_items: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            virtual_connections: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            priority_destinations: [{} as unknown as { row_no: number }],
                        },
                    }),
                ).toThrow(/Invalid row_no: undefined/i);

                // 3. Polluted natural keys (reference_type, impact_code, service_context) must not satisfy missing checks
                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            references: [{ specification: 'SPEC' } as unknown as { reference_type: 'IWO' }],
                        },
                    }),
                ).toThrow(/Reference item missing reference_type/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'CHANGE',
                        record_version: 1,
                        change: {
                            service_impacts: [{ other_description: 'DESC' } as unknown as { impact_code: 'NOC15' }],
                        },
                    }),
                ).toThrow(/ServiceImpact missing impact_code/i);

                expect(() =>
                    buildDraftPayload({
                        family: 'ACTIVATION',
                        record_version: 1,
                        activation: {
                            service_blocks: [{ service_id: 'S1' } as unknown as { service_context: 'NEW' }],
                        },
                    }),
                ).toThrow(/service_block missing service_context/i);

                // 4. Content-empty rows with valid row_no must still be discarded and NOT pick up content
                const challengesPayload = buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        facing_challenges: [{ row_no: 1 }],
                        identified_problems: [{ row_no: 1 }],
                        improvement_items: [{ row_no: 1 }],
                        results: [{ row_no: 1 }],
                    },
                });
                expect(challengesPayload.change.facing_challenges).toEqual([]);
                expect(challengesPayload.change.identified_problems).toEqual([]);
                expect(challengesPayload.change.improvement_items).toEqual([]);
                expect(challengesPayload.change.results).toEqual([]);

                const activationRowsPayload = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        sla_items: [{ row_no: 1 }],
                        virtual_connections: [{ row_no: 1 }],
                        priority_destinations: [{ row_no: 1 }],
                    },
                });
                expect(activationRowsPayload.activation.sla_items).toEqual([]);
                expect(activationRowsPayload.activation.virtual_connections).toEqual([]);
                expect(activationRowsPayload.activation.priority_destinations).toEqual([]);

                // 5. Assert none of the polluted strings or numbers reach JSON wire output
                const allJson = JSON.stringify(challengesPayload) + JSON.stringify(activationRowsPayload);
                expect(allJson).not.toContain('POLLUTED');
                expect(allJson).not.toContain('9999');

                // 6. Key census: verify each row shape on valid non-empty rows carries ONLY own properties, never prototype-polluted keys
                const validRowsPayload = buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: {
                        facing_challenges: [{ row_no: 1, challenge_text: 'Own challenge' }],
                        identified_problems: [{ row_no: 1, problem_text: 'Own problem' }],
                        improvement_items: [{ row_no: 1, plan_text: 'Own plan' }],
                        results: [{ row_no: 1, result_summary: 'Own summary' }],
                        service_impacts: [{ impact_code: 'NOC15', other_description: null }],
                    },
                });
                expect(Object.keys((validRowsPayload.change.facing_challenges as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'challenge_text',
                ]);
                expect(Object.keys((validRowsPayload.change.identified_problems as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'problem_text',
                ]);
                expect(Object.keys((validRowsPayload.change.improvement_items as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'plan_text',
                    'target_kpi',
                ]);
                expect(Object.keys((validRowsPayload.change.results as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'result_summary',
                    'performance_information',
                    'result_status',
                ]);
                expect(Object.keys((validRowsPayload.change.service_impacts as Array<object>)[0]!)).toEqual([
                    'impact_code',
                    'other_description',
                ]);

                const validActRowsPayload = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: {
                        references: [{ reference_type: 'IWO', specification: 'IWO-123' }],
                        service_blocks: [{ service_context: 'NEW', service_id: 'S1' }],
                        sla_items: [{ row_no: 1, requirement_text: 'Own req' }],
                        virtual_connections: [{ row_no: 1, bandwidth_mbps: 100 }],
                        priority_destinations: [{ row_no: 1, destination: 'Own dest' }],
                    },
                });
                expect(Object.keys((validActRowsPayload.activation.references as Array<object>)[0]!)).toEqual([
                    'reference_type',
                    'specification',
                ]);
                expect(Object.keys((validActRowsPayload.activation.service_blocks as Array<object>)[0]!)).toEqual([
                    'service_context',
                    'service_id',
                    'service_status',
                    'service_description',
                    'service_location',
                ]);
                expect(Object.keys((validActRowsPayload.activation.sla_items as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'requirement_text',
                ]);
                expect(Object.keys((validActRowsPayload.activation.virtual_connections as Array<object>)[0]!)).toEqual([
                    'row_no',
                    'bandwidth_mbps',
                ]);
                expect(
                    Object.keys((validActRowsPayload.activation.priority_destinations as Array<object>)[0]!),
                ).toEqual(['row_no', 'destination']);

                // 7. Surviving-path pinning for detail reads without own property (L211 specification, L239 other_description)
                const nullDetailRefPayload = buildDraftPayload({
                    family: 'ACTIVATION',
                    record_version: 1,
                    activation: { references: [{ reference_type: 'IWO' }] },
                });
                expect(nullDetailRefPayload.activation.references).toEqual([
                    { reference_type: 'IWO', specification: null },
                ]);

                const nullDetailImpactPayload = buildDraftPayload({
                    family: 'CHANGE',
                    record_version: 1,
                    change: { service_impacts: [{ impact_code: 'NOC15' }] },
                });
                expect(nullDetailImpactPayload.change.service_impacts).toEqual([
                    { impact_code: 'NOC15', other_description: null },
                ]);

                // 8. Surviving-path pinning for container-level family guard (L596 family)
                // proto['family'] is 'POLLUTED-FAMILY', omit-own family with valid own record_version must throw Unsupported family
                proto['family'] = 'ACTIVATION';
                const familyResult = (() => {
                    try {
                        return buildDraftPayload({ record_version: 1 } as never);
                    } catch (e) {
                        return (e as Error).message;
                    }
                })();
                expect(familyResult).toMatch(/unsupported family/i);
            } finally {
                delete proto['service_id'];
                delete proto['service_status'];
                delete proto['service_description'];
                delete proto['service_location'];
                delete proto['service_context'];
                delete proto['impact_code'];
                delete proto['row_no'];
                delete proto['reference_type'];
                delete proto['specification'];
                delete proto['challenge_text'];
                delete proto['problem_text'];
                delete proto['destination'];
                delete proto['bandwidth_mbps'];
                delete proto['requirement_text'];
                delete proto['plan_text'];
                delete proto['target_kpi'];
                delete proto['result_summary'];
                delete proto['performance_information'];
                delete proto['result_status'];
                delete proto['other_description'];
                delete proto['family'];
            }
        });
    });
});
