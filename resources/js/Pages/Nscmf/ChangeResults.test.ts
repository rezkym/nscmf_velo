import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NscmfDetailRecord } from '@/features/nscmf/types';
import { type JsonResult, sendJson } from '@/lib/http';
import { resetInertia, router } from '@/testing/inertia';

import ChangeResults, { buildChangeResultsPayload, displayValue } from './ChangeResults.vue';

// PATCH /nscmf/{record}/change-results is a same-origin JSON endpoint (12 §4.2, §29).
vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
vi.mock('@/lib/http', () => ({ sendJson: vi.fn() }));

const send = vi.mocked(sendJson);

const BASE_RECORD: NscmfDetailRecord = {
    id: 42,
    request_no: 'CHG-2026-00042',
    family: 'CHANGE',
    subtype: 'MAINTENANCE',
    request_date: '2026-09-20',
    business_status: 'PENDING_REVIEW',
    record_version: 7,
    is_archived: false,
    owner: { id: 10, name: 'Alice Requester' },
    team: { id: 2, name: 'Core Network' },
    requested_by: { id: 10, name: 'Alice Requester' },
    first_submitted_at: '2026-09-20T10:00:00+07:00',
    allowed_actions: ['edit_results'],
    change: {
        maintenance_purpose: 'Upgrade core switch firmware to version 15.2',
        target_execution_date: '2026-09-21',
        monitoring_period_value: 2,
        monitoring_period_unit: 'HOUR',
        rollback_scenario: 'Revert to switch firmware 15.1 from backup partition',
        announcement_timing: 'TWO_WEEKS_BEFORE',
        facing_challenges: [{ row_no: 1, challenge_text: 'Intermittent packet drops' }],
        identified_problems: [{ row_no: 1, problem_text: 'Memory leak in routing daemon' }],
        service_impacts: [{ impact_code: 'NOC15', other_description: null }],
        improvement_items: [{ row_no: 1, plan_text: 'Flash firmware image', target_kpi: 'Zero packet drop' }],
        results: [
            {
                row_no: 1,
                result_summary: 'Firmware 15.2 applied successfully',
                performance_information: 'CPU usage stable at 12%',
                result_status: 'SUCCESS',
            },
        ],
    },
};

function mountChangeResults(
    recordOverrides: Partial<NscmfDetailRecord> = {},
    userOverrides: { id?: number; permissions?: string[] } = {},
): VueWrapper {
    resetInertia({
        auth: {
            user: {
                id: userOverrides.id ?? 10,
                username: 'alice',
                name: 'Alice Requester',
                team: { id: 2, name: 'Core Network' },
            },
            permissions: userOverrides.permissions ?? ['nscmf.change.result.edit'],
        },
    });

    return mount(ChangeResults, { props: { record: { ...BASE_RECORD, ...recordOverrides } } });
}

function okBody(version: number, results: unknown[]): JsonResult {
    return {
        ok: true,
        status: 200,
        body: {
            data: { id: 42, record_version: version, business_status: 'PENDING_REVIEW', results },
            meta: { warnings: [] },
        },
    };
}

async function save(wrapper: VueWrapper, result: JsonResult): Promise<void> {
    send.mockResolvedValueOnce(result);
    await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
    await flushPromises();
}

beforeEach(() => {
    document.body.innerHTML = '';
    send.mockReset();
});

describe('AC1: result_only_payload_has_exact_keys', () => {
    it('builds { record_version, results } and drops unstarted rows', () => {
        const payload = buildChangeResultsPayload(7, [
            { row_no: 1, result_summary: 'Upgraded', performance_information: 'Loss 0%', result_status: 'OK' },
            { row_no: 2, result_summary: '', performance_information: null, result_status: '   ' },
        ]);

        expect(payload).toEqual({
            record_version: 7,
            results: [
                { row_no: 1, result_summary: 'Upgraded', performance_information: 'Loss 0%', result_status: 'OK' },
            ],
        });
        expect(Object.keys(payload).sort()).toEqual(['record_version', 'results']);
    });

    it('validates the version, the array and each row', () => {
        expect(() => buildChangeResultsPayload(0, [])).toThrow('record_version must be a positive integer');
        expect(() => buildChangeResultsPayload(1.5, [])).toThrow('record_version must be a positive integer');
        expect(() => (buildChangeResultsPayload as (v: number, r: unknown) => unknown)(1, null)).toThrow(
            'results must be an array',
        );
        expect(() => (buildChangeResultsPayload as (v: number, r: unknown) => unknown)(1, [null])).toThrow(
            'results rows must be objects',
        );
        expect(() => buildChangeResultsPayload(1, [{ row_no: 0 }])).toThrow('results: invalid row_no 0');
        expect(() => buildChangeResultsPayload(1, [{ row_no: 6 }])).toThrow('results: invalid row_no 6');
        expect(() => buildChangeResultsPayload(1, [{ row_no: 1 }, { row_no: 1 }])).toThrow(
            'results: duplicate row_no 1',
        );
    });

    it('sends exactly the two keys over JSON, with no change wrapper, planning or header field', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_status').setValue('COMPLETED_VERIFIED');
        await save(
            wrapper,
            okBody(8, [
                {
                    row_no: 1,
                    result_summary: 'Firmware 15.2 applied successfully',
                    performance_information: 'CPU usage stable at 12%',
                    result_status: 'COMPLETED_VERIFIED',
                },
            ]),
        );

        expect(send).toHaveBeenCalledTimes(1);
        const [method, url, body] = send.mock.calls[0] ?? [];
        expect(method).toBe('PATCH');
        expect(url).toBe('/nscmf/42/change-results');
        expect(Object.keys(body as object).sort()).toEqual(['record_version', 'results']);
        expect((body as { record_version: number }).record_version).toBe(7);
        expect(wrapper.text()).toContain('Saved');
    });

    it('adopts the rows the server persisted and is clean again', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_summary').setValue('Typed');
        await save(
            wrapper,
            okBody(8, [
                {
                    row_no: 1,
                    result_summary: 'Typed',
                    performance_information: 'CPU usage stable at 12%',
                    result_status: 'SUCCESS',
                },
            ]),
        );

        expect((wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe('Typed');

        await save(wrapper, okBody(9, []));
        expect(wrapper.findAll('[id^="results-"][id$="result_summary"]')).toHaveLength(0);
    });

    it('keeps a row that has only one field filled, sending the rest as null', async () => {
        const wrapper = mountChangeResults({ change: { ...BASE_RECORD.change, results: [] } });
        await wrapper.get('[data-testid="btn-add-row"]').trigger('click');
        await wrapper.get('#results-0-result_status').setValue('Only the status');
        await save(wrapper, okBody(8, []));

        expect((send.mock.calls[0]?.[2] as { results: unknown[] }).results).toEqual([
            { row_no: 1, result_summary: null, performance_information: null, result_status: 'Only the status' },
        ]);
    });
});

describe('AC2: eligibility is presentation; the server decides', () => {
    it('shows the editor for the owner with the permission on a Change in review', () => {
        const wrapper = mountChangeResults();
        expect(wrapper.find('[data-testid="results-editor"]').exists()).toBe(true);
        expect(wrapper.get<HTMLButtonElement>('[data-testid="submit-results-btn"]').element.disabled).toBe(false);
        expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(false);
    });

    it.each([
        ['a non-owner', {}, { id: 999 }],
        ['a record without an owner', { owner: null }, {}],
        ['a Draft', { business_status: 'DRAFT' as const }, {}],
        ['an Activation', { family: 'ACTIVATION' as const, subtype: 'ACTIVATION' as const }, {}],
        ['a missing permission', {}, { permissions: ['nscmf.view'] }],
    ])('offers no editor for %s', (_label, recordOverrides, userOverrides) => {
        const wrapper = mountChangeResults(recordOverrides, userOverrides);

        expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
    });
});

describe('AC3: failures never claim success', () => {
    it('shows 422 field errors and keeps the typed rows', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_summary').setValue('Typed');
        await save(wrapper, {
            ok: false,
            status: 422,
            error: {
                code: 'VALIDATION_FAILED',
                message: 'Some fields need to be corrected.',
                errors: { 'results.0.result_status': ['Complete every field of a started result row.'] },
            },
        });

        expect(wrapper.get('[data-testid="feedback-validation"]').text()).toContain('Complete every field');
        expect(wrapper.text()).not.toContain('Saved');
        expect((wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe('Typed');
    });

    it('shows a safe 403 denial without leaking actor information', async () => {
        const wrapper = mountChangeResults();
        await save(wrapper, {
            ok: false,
            status: 403,
            error: { code: 'FORBIDDEN', message: 'You are not allowed to do this.' },
        });

        expect(wrapper.get('[data-testid="feedback-forbidden"]').text()).not.toContain('Alice');
        expect(wrapper.text()).not.toContain('Saved');
    });

    it('stops editing on 409, offers a refresh, never auto-retries and never claims saved', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_summary').setValue('Mine');
        await save(wrapper, {
            ok: false,
            status: 409,
            error: {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
                context: { latest_record_version: 9 },
            },
        });

        expect(wrapper.get('[data-testid="feedback-conflict"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        expect(send).toHaveBeenCalledTimes(1);
        expect((wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe('Mine');

        await wrapper.get('[data-testid="feedback-refresh-btn"]').trigger('click');
        expect(router.reload).toHaveBeenCalled();
    });

    it('reports a dropped connection', async () => {
        const wrapper = mountChangeResults();
        await save(wrapper, { ok: false, status: 0, error: null });

        expect(wrapper.get('[data-testid="request-feedback"]').text()).not.toContain('Saved');
        expect(wrapper.text()).toContain('connection');
    });

    it('reports a malformed local projection without sending anything', async () => {
        const wrapper = mountChangeResults({ record_version: 0 });
        await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
        await flushPromises();

        expect(send).not.toHaveBeenCalled();
        expect(wrapper.get('[data-testid="feedback-validation"]').exists()).toBe(true);
    });

    it('allows a retry after a denial and then reports saved', async () => {
        const wrapper = mountChangeResults();
        await save(wrapper, {
            ok: false,
            status: 403,
            error: { code: 'FORBIDDEN', message: 'You are not allowed to do this.' },
        });
        await wrapper.get('[data-testid="feedback-refresh-btn"]').trigger('click');
        await flushPromises();
        await save(wrapper, okBody(8, BASE_RECORD.change?.results ?? []));

        expect(wrapper.text()).toContain('Saved');
    });
});

describe('the record moving underneath the editor (FE-29 AC3)', () => {
    it('keeps unsaved rows and says the record moved', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_summary').setValue('Typed but not saved yet');

        await wrapper.setProps({ record: { ...BASE_RECORD, record_version: 9 } });
        await flushPromises();

        expect((wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe(
            'Typed but not saved yet',
        );
        expect(wrapper.get('[data-testid="feedback-conflict"]').exists()).toBe(true);
    });

    it('adopts the server rows when nothing was typed', async () => {
        const wrapper = mountChangeResults();

        await wrapper.setProps({
            record: {
                ...BASE_RECORD,
                record_version: 9,
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'From the server',
                            performance_information: 'p',
                            result_status: 's',
                        },
                    ],
                },
            },
        });
        await flushPromises();

        expect((wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe('From the server');
        expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
    });

    it('resets the editor when a newer projection clears the rows', async () => {
        const wrapper = mountChangeResults();

        await wrapper.setProps({
            record: { ...BASE_RECORD, record_version: 9, change: { ...BASE_RECORD.change, results: [] } },
        });
        await flushPromises();

        expect(wrapper.findAll('[id^="results-"][id$="result_summary"]')).toHaveLength(0);
    });
});

describe('the planning context stays read-only', () => {
    it('renders planning fields as text and only result inputs', () => {
        const wrapper = mountChangeResults();

        expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe(
            'Upgrade core switch firmware to version 15.2',
        );
        for (const table of ['facing_challenges', 'identified_problems', 'service_impacts', 'improvement_items']) {
            expect(wrapper.find(`[data-testid="table-${table}"]`).exists()).toBe(true);
        }
        for (const input of wrapper.findAll('input, textarea, select')) {
            const id = input.attributes('id') ?? '';
            const name = input.attributes('name') ?? '';
            expect(id.startsWith('results-') || name.startsWith('results-')).toBe(true);
        }
    });

    it('does not touch the planning projection while typing a result', async () => {
        const wrapper = mountChangeResults();
        await wrapper.get('#results-0-result_status').setValue('COMPLETED_VERIFIED');

        expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe(
            'Upgrade core switch firmware to version 15.2',
        );
    });

    it('shows dashes for empty planning values', () => {
        expect(displayValue(true)).toBe('Yes');
        expect(displayValue(false)).toBe('No');
        expect(displayValue(null)).toBe('—');
        expect(displayValue(undefined)).toBe('—');
        expect(displayValue('')).toBe('—');
        expect(displayValue(123)).toBe('123');

        const wrapper = mountChangeResults({
            change: {
                results: [{ row_no: 0, result_summary: null, performance_information: null, result_status: null }],
            },
        });
        expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe('—');
        expect(wrapper.get('[data-testid="field-monitoring_period"]').text()).toBe('—');
    });

    it('works for a record without a change object and gives a fallback row number', () => {
        expect(mountChangeResults({ change: undefined }).find('[data-testid="results-editor"]').exists()).toBe(true);
        const fallback = mountChangeResults({
            change: {
                results: [
                    { row_no: 0, result_summary: 'Custom summary', performance_information: null, result_status: null },
                ],
            },
        });
        expect((fallback.get('#results-0-result_summary').element as HTMLTextAreaElement).value).toBe('Custom summary');
    });
});
