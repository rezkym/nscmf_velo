import { describe, expect, it } from 'vitest';
import {
    type ActivationDraftInput,
    buildDraftPayload,
    type ChangeDraftInput,
    type DirectSiteBlock,
    type DraftPayloadInput,
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

        it('throws error when family is unsupported', () => {
            expect(() =>
                buildDraftPayload({
                    family: 'INVALID' as unknown as 'ACTIVATION',
                    record_version: 1,
                }),
            ).toThrow(/unsupported family/i);
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
    });
});
