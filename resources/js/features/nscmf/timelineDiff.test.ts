import { describe, expect, it } from 'vitest';

import { diffRows } from './timelineDiff';

const change = (field: string, before: unknown, after: unknown) => ({
    field,
    before: before === null || typeof before === 'string' ? before : JSON.stringify(before),
    after: after === null || typeof after === 'string' ? after : JSON.stringify(after),
});

describe('Timeline diff (FE-62, 07 §36)', () => {
    it('names a field as Form Detail does and shows an empty side as a dash', () => {
        expect(diffRows(change('activation.customer_name', 'PT Lama', 'PT Baru'))).toEqual([
            { label: 'Customer name', before: 'PT Lama', after: 'PT Baru' },
        ]);
        expect(diffRows(change('change.rollback_scenario', null, 'Restore'))).toEqual([
            { label: 'Rollback scenario', before: '—', after: 'Restore' },
        ]);
        expect(diffRows(change('header.request_date', null, '2026-09-30'))).toEqual([
            { label: 'Request date', before: '—', after: '2026-09-30' },
        ]);
    });

    it('reads codes by their labels and keeps 0, false and empty apart', () => {
        expect(diffRows(change('change.announcement_timing', 'ONE_WEEK_BEFORE', 'TWO_WEEKS_BEFORE'))).toEqual([
            { label: 'Maintenance announcement', before: '1 week before', after: '2 weeks before' },
        ]);
        expect(diffRows(change('activation.migrate_domain', 'false', 'true'))).toEqual([
            { label: 'Migrate domain', before: 'No', after: 'Yes' },
        ]);
        expect(diffRows(change('activation.bandwidth_mixed_mbps', '0', '5'))).toEqual([
            { label: 'International & IIX mixed (Mbps)', before: '0', after: '5' },
        ]);
    });

    it('diffs a collection row by row, matched by its natural key, and cell by cell', () => {
        const before = [{ service_context: 'EXISTING', service_id: 'SVC-0', service_status: 'ACTIVATED' }];
        const after = [
            { service_context: 'EXISTING', service_id: 'SVC-9', service_status: 'ACTIVATED' },
            { service_context: 'NEW', service_id: 'SVC-1', service_status: 'DEACTIVATED' },
        ];

        expect(diffRows(change('activation.service_blocks', before, after))).toEqual([
            { label: 'Services › Existing service › Service ID', before: 'SVC-0', after: 'SVC-9' },
            { label: 'Services', before: null, after: 'New service' },
            { label: 'Services › New service › Service ID', before: null, after: 'SVC-1' },
            { label: 'Services › New service › Status', before: null, after: 'Deactivated' },
        ]);
    });

    it('names a numbered row by its number and shows a removed row on the Before side only', () => {
        const row = { row_no: 2, plan_text: 'Swap the module', target_kpi: null };

        expect(diffRows(change('change.improvement_items', [row], []))).toEqual([
            { label: 'Improvement plan and target KPI › Row 2 › Plan', before: 'Swap the module', after: null },
        ]);
    });

    it('reads escaped Result text and a selection without its description', () => {
        const results =
            '[{"row_no":1,"result_summary":"Caf\\u00e9 link","performance_information":null,"result_status":"Done"}]';

        expect(diffRows({ field: 'change.results', before: null, after: results })).toEqual([
            { label: 'Results › Row 1 › Result summary', before: null, after: 'Café link' },
            { label: 'Results › Row 1 › Status', before: null, after: 'Done' },
        ]);
        expect(
            diffRows(change('change.service_impacts', [], [{ impact_code: 'OTHER', other_description: null }])),
        ).toEqual([{ label: 'Service impact', before: null, after: 'Other' }]);
    });

    it('diffs a site block field by field, also when the block itself appears', () => {
        expect(diffRows(change('activation.direct_site', null, { latency_ms: 5, routers: 'R1', ups: null }))).toEqual([
            { label: 'Customer site (direct) › Latency (ms)', before: null, after: '5' },
            { label: 'Customer site (direct) › Routers', before: null, after: 'R1' },
        ]);
        expect(diffRows(change('activation.pop_site', { vlan_id: 10 }, { vlan_id: 20 }))).toEqual([
            { label: 'Customer site at POP › VLAN ID', before: '10', after: '20' },
        ]);
    });

    it('shows a field it does not know by its stored path and text, never failing', () => {
        expect(diffRows(change('activation.future_field', 'a', 'b'))).toEqual([
            { label: 'activation.future_field', before: 'a', after: 'b' },
        ]);
    });
});
