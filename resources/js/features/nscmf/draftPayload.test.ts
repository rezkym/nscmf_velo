import { describe, expect, it } from 'vitest';

import { buildActivationDraftPayload, buildChangeDraftPayload } from './draftPayload';
import type { ActivationDraftFields, ChangeDraftFields } from './types';

function activation(fields: ActivationDraftFields): ActivationDraftFields {
    return buildActivationDraftPayload(8, fields).activation;
}

function change(fields: ChangeDraftFields): ChangeDraftFields {
    return buildChangeDraftPayload(8, fields).change;
}

describe('draft payload (12 §129.1)', () => {
    it('passes the record version through without touching it', () => {
        expect(buildActivationDraftPayload(8, {})).toEqual({ record_version: 8, activation: {} });
        expect(buildChangeDraftPayload(1, {})).toEqual({ record_version: 1, change: {} });
        expect(() => buildActivationDraftPayload(0, {})).toThrow(/record_version/);
    });

    it('omits an untouched key and sends an explicit null to clear a field', () => {
        expect(activation({ customer_name: 'Demo Customer' })).toEqual({ customer_name: 'Demo Customer' });
        expect(activation({ wan_ip: null })).toEqual({ wan_ip: null });
        expect(activation({})).toEqual({});
    });

    it('sends a blank string as null and keeps zero, false and negative values', () => {
        expect(
            activation({
                customer_name: '   ',
                bandwidth_mixed_mbps: 0,
                hosting_capacity_gb: 0,
                migrate_domain: false,
            }),
        ).toEqual({ customer_name: null, bandwidth_mixed_mbps: 0, hosting_capacity_gb: 0, migrate_domain: false });

        expect(activation({ direct_site: { latency_ms: 0, rssi: -67 } })).toEqual({
            direct_site: { latency_ms: 0, rssi: -67 },
        });
    });

    it('drops an unknown key instead of sending it to the server', () => {
        const fields = { customer_name: 'Demo Customer', nickname: 'nope' } as ActivationDraftFields;

        expect(activation(fields)).toEqual({ customer_name: 'Demo Customer' });
    });

    it('leaves an omitted collection alone and clears one with an empty set', () => {
        expect(activation({ customer_name: 'Demo Customer' })).not.toHaveProperty('sla_items');
        expect(activation({ sla_items: [] })).toEqual({ sla_items: [] });
    });

    it('sends a collection as the exact set, in the order given', () => {
        expect(
            activation({
                sla_items: [
                    { row_no: 2, requirement_text: 'Second' },
                    { row_no: 1, requirement_text: 'First' },
                ],
            }),
        ).toEqual({
            sla_items: [
                { row_no: 2, requirement_text: 'Second' },
                { row_no: 1, requirement_text: 'First' },
            ],
        });
    });

    it('discards a row that carries only its natural key', () => {
        expect(
            activation({
                sla_items: [
                    { row_no: 1, requirement_text: 'First' },
                    { row_no: 2, requirement_text: null },
                    { row_no: 3, requirement_text: '   ' },
                ],
            }),
        ).toEqual({ sla_items: [{ row_no: 1, requirement_text: 'First' }] });

        expect(change({ improvement_items: [{ row_no: 1, plan_text: null, target_kpi: null }] })).toEqual({
            improvement_items: [],
        });
    });

    it('keeps a half-filled row, because completeness is judged at submit', () => {
        expect(change({ improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: null }] })).toEqual({
            improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: null }],
        });
    });

    it('keeps a selection row that has no description', () => {
        expect(activation({ references: [{ reference_type: 'IWO', specification: null }] })).toEqual({
            references: [{ reference_type: 'IWO', specification: null }],
        });

        expect(change({ service_impacts: [{ impact_code: 'NOC15', other_description: null }] })).toEqual({
            service_impacts: [{ impact_code: 'NOC15', other_description: null }],
        });
    });

    it('keeps a service block that has any content and drops an untouched one', () => {
        expect(
            activation({
                service_blocks: [{ service_context: 'EXISTING', service_id: 'SVC-1' }, { service_context: 'NEW' }],
            }),
        ).toEqual({
            service_blocks: [
                {
                    service_context: 'EXISTING',
                    service_id: 'SVC-1',
                    service_status: null,
                    service_description: null,
                    service_location: null,
                },
            ],
        });
    });

    it('rejects a duplicate natural key in any collection', () => {
        expect(() =>
            activation({
                sla_items: [
                    { row_no: 1, requirement_text: 'First' },
                    { row_no: 1, requirement_text: 'Again' },
                ],
            }),
        ).toThrow(/duplicate row_no/);

        expect(() =>
            activation({
                references: [
                    { reference_type: 'IWO', specification: null },
                    { reference_type: 'IWO', specification: 'Again' },
                ],
            }),
        ).toThrow(/duplicate reference_type/);

        expect(() =>
            change({
                service_impacts: [
                    { impact_code: 'NOC15', other_description: null },
                    { impact_code: 'NOC15', other_description: null },
                ],
            }),
        ).toThrow(/duplicate impact_code/);
    });

    it('rejects a row number outside its range', () => {
        expect(() => activation({ sla_items: [{ row_no: 0, requirement_text: 'Zero' }] })).toThrow(/invalid row_no/);
        expect(() => activation({ sla_items: [{ row_no: 4, requirement_text: 'Fourth' }] })).toThrow(/invalid row_no/);
        expect(() => change({ results: [{ row_no: 6, result_summary: 'Sixth' }] })).toThrow(/invalid row_no/);
        expect(change({ results: [{ row_no: 5, result_summary: 'Fifth' }] }).results).toHaveLength(1);
    });

    it('never sends a database id for a row', () => {
        const fields = {
            sla_items: [{ id: 42, row_no: 1, requirement_text: 'First' }],
        } as unknown as ActivationDraftFields;

        expect(activation(fields)).toEqual({ sla_items: [{ row_no: 1, requirement_text: 'First' }] });
    });

    it('sends a site block as an object or null, never as an empty object', () => {
        expect(activation({ direct_site: null })).toEqual({ direct_site: null });
        expect(activation({ direct_site: { cable: 'Demo cable' } })).toEqual({
            direct_site: { cable: 'Demo cable' },
        });
        expect(activation({ pop_site: { vlan_id: 100, port: '   ' } })).toEqual({
            pop_site: { vlan_id: 100, port: null },
        });
        expect(() => activation({ direct_site: {} })).toThrow(/empty object/);
    });

    it('keeps a site block whose values are all null, since null is a stored value', () => {
        expect(activation({ direct_site: { cable: null, rssi: null } })).toEqual({
            direct_site: { cable: null, rssi: null },
        });
    });

    it('rejects a collection or a row of the wrong shape instead of guessing', () => {
        expect(() => activation({ sla_items: 'nope' as unknown as [] })).toThrow(/must be an array/);
        expect(() => activation({ sla_items: ['nope'] as unknown as [] })).toThrow(/must be objects/);
        expect(() => activation({ direct_site: 'nope' as unknown as null })).toThrow(/must be an object or null/);
    });

    it('builds the full change payload the contract shows', () => {
        expect(
            buildChangeDraftPayload(3, {
                maintenance_purpose: 'Demo purpose',
                target_execution_date: '2026-10-10',
                monitoring_period_value: 3,
                monitoring_period_unit: 'DAY',
                rollback_scenario: 'Demo rollback',
                announcement_timing: 'ONE_WEEK_BEFORE',
                facing_challenges: [{ row_no: 1, challenge_text: 'Demo challenge' }],
                identified_problems: [{ row_no: 1, problem_text: 'Demo problem' }],
                service_impacts: [{ impact_code: 'OTHER', other_description: 'Demo impact' }],
                improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: 'Error rate 0' }],
                results: [],
            }),
        ).toEqual({
            record_version: 3,
            change: {
                maintenance_purpose: 'Demo purpose',
                target_execution_date: '2026-10-10',
                monitoring_period_value: 3,
                monitoring_period_unit: 'DAY',
                rollback_scenario: 'Demo rollback',
                announcement_timing: 'ONE_WEEK_BEFORE',
                facing_challenges: [{ row_no: 1, challenge_text: 'Demo challenge' }],
                identified_problems: [{ row_no: 1, problem_text: 'Demo problem' }],
                service_impacts: [{ impact_code: 'OTHER', other_description: 'Demo impact' }],
                improvement_items: [{ row_no: 1, plan_text: 'Demo plan', target_kpi: 'Error rate 0' }],
                results: [],
            },
        });
    });
});
