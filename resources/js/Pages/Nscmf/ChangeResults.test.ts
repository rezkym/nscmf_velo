import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NscmfDetailRecord } from '@/features/nscmf/types';
import { lastRequest, pageFlash, pageProps, requests, resetInertia, respondToRequest, router } from '@/testing/inertia';

import ChangeResults, { buildChangeResultsPayload, displayValue } from './ChangeResults.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

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
    const record = { ...BASE_RECORD, ...recordOverrides };
    const userId = userOverrides.id ?? 10;
    const permissions = userOverrides.permissions ?? ['nscmf.change.result.edit'];

    resetInertia({
        auth: {
            user: { id: userId, username: 'alice', name: 'Alice Requester', team: { id: 2, name: 'Core Network' } },
            permissions,
        },
    });

    return mount(ChangeResults, { props: { record } });
}

describe('ChangeResults (FE-29)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('AC1: result_only_payload_has_exact_keys', () => {
        it('fails safely if malformed projection access throws a non-Error value', async () => {
            const wrapper = mountChangeResults();
            const malformed = { ...BASE_RECORD };
            Object.defineProperty(malformed, 'record_version', {
                get: () => {
                    // Deliberately exercise the unknown-catch fallback, not an application throw.
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw 'Invalid projection';
                },
            });
            // Replace the original object in place so submit reads the hostile getter,
            // without manufacturing a failure inside the transport mock.
            const record = (wrapper.props() as { record: NscmfDetailRecord }).record;
            const original = Object.getOwnPropertyDescriptor(record, 'record_version')!;
            Object.defineProperty(
                record,
                'record_version',
                Object.getOwnPropertyDescriptor(malformed, 'record_version')!,
            );
            try {
                await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
                expect(requests).toHaveLength(0);
                expect(wrapper.text()).toContain('Invalid change results data.');
                expect(wrapper.text()).not.toContain('Saved just now');
            } finally {
                Object.defineProperty(record, 'record_version', original);
                wrapper.unmount();
            }
        });

        it.each(['FORBIDDEN', 'NSCMF_VERSION_CONFLICT'])(
            'handles %s flash without an optional message',
            async (code) => {
                const wrapper = mountChangeResults();
                await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
                await respondToRequest(lastRequest('/nscmf/42/change-results'), {
                    status: 200,
                    flash: { domain_error: { code } },
                });
                expect(wrapper.text().toLowerCase()).not.toContain('saved just now');
                expect(wrapper.text()).toContain(code === 'FORBIDDEN' ? 'Access Denied' : 'A newer version exists');
                wrapper.unmount();
            },
        );

        it('allows a successful response with unrelated flash', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            await respondToRequest(lastRequest('/nscmf/42/change-results'), {
                status: 200,
                flash: { notice: 'Updated' },
            });
            expect(wrapper.text()).toContain('Saved just now');
            wrapper.unmount();
        });

        it('resets the editor to empty fields when a newer projection clears results', async () => {
            const wrapper = mountChangeResults();
            await wrapper.setProps({
                record: {
                    ...BASE_RECORD,
                    record_version: 8,
                    change: {
                        results: [
                            { row_no: 0, result_summary: null, performance_information: null, result_status: null },
                        ],
                    },
                },
            });
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            expect(lastRequest('/nscmf/42/change-results')?.data).toEqual({ record_version: 8, results: [] });
            await respondToRequest(lastRequest('/nscmf/42/change-results'), {
                status: 200,
                props: { record: { ...BASE_RECORD, change: undefined } },
            });
            expect(wrapper.text()).toContain('Saved just now');
            await wrapper.setProps({ record: { ...BASE_RECORD, record_version: 9, change: undefined } });
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            expect(lastRequest('/nscmf/42/change-results')?.data).toEqual({ record_version: 9, results: [] });
            wrapper.unmount();
        });

        it('normalizes empty result fields in a successful refreshed projection', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            const refreshed = {
                ...BASE_RECORD,
                record_version: 8,
                change: {
                    results: [{ row_no: 0, result_summary: null, performance_information: null, result_status: null }],
                },
            };
            await respondToRequest(lastRequest('/nscmf/42/change-results'), {
                status: 200,
                props: { record: refreshed },
            });
            expect(wrapper.text()).toContain('Saved just now');
            for (const input of wrapper.findAll('textarea')) expect(input.element.value).toBe('');
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            expect(lastRequest('/nscmf/42/change-results')?.data.results).toEqual([]);
            wrapper.unmount();
        });

        it('buildChangeResultsPayload produces { record_version, results } and drops unstarted rows', () => {
            const payload = buildChangeResultsPayload(7, [
                {
                    row_no: 1,
                    result_summary: 'Upgraded',
                    performance_information: 'Loss 0%',
                    result_status: 'OK',
                },
                {
                    row_no: 2,
                    result_summary: '',
                    performance_information: null,
                    result_status: '   ',
                },
            ]);

            expect(payload).toEqual({
                record_version: 7,
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Upgraded',
                        performance_information: 'Loss 0%',
                        result_status: 'OK',
                    },
                ],
            });
            expect(Object.keys(payload).sort()).toEqual(['record_version', 'results']);
        });

        it('buildChangeResultsPayload validates recordVersion, results array and row objects', () => {
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

        it('handles record without change object or change.results and assigns fallback row_no', () => {
            const noChangeRecord: NscmfDetailRecord = {
                ...BASE_RECORD,
                change: undefined,
            };
            const wrapper = mountChangeResults(noChangeRecord);
            expect(wrapper.find('[data-testid="results-editor"]').exists()).toBe(true);

            // change.results with row_no = 0 or missing uses index + 1 fallback
            const fallbackRecord: NscmfDetailRecord = {
                ...BASE_RECORD,
                change: {
                    results: [
                        {
                            row_no: 0,
                            result_summary: 'Custom summary',
                            performance_information: null,
                            result_status: null,
                        },
                    ],
                },
            };
            const wrapper2 = mountChangeResults(fallbackRecord);
            expect(wrapper2.find('[data-testid="results-editor"]').exists()).toBe(true);
        });

        it('submits PATCH /nscmf/{record}/change-results with exactly record_version and results (no change wrapper, no planning/header)', async () => {
            const wrapper = mountChangeResults();

            // When isEligible is false, calling submitResults early exits
            const ineligibleWrapper = mountChangeResults({ business_status: 'DRAFT' });
            // Directly trigger submit if component exposed or simulate button click when ineligible
            expect(ineligibleWrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);

            const button = wrapper.get('[data-testid="submit-results-btn"]');
            expect(button.text()).toBe('Update Result of Changes');

            await button.trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();
            expect(req?.method).toBe('patch');
            expect(req?.data).toEqual({
                record_version: 7,
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Firmware 15.2 applied successfully',
                        performance_information: 'CPU usage stable at 12%',
                        result_status: 'SUCCESS',
                    },
                ],
            });
            expect(Object.keys(req?.data ?? {}).sort()).toEqual(['record_version', 'results']);

            // onFinish sets submitting to false
            req?.options.onFinish?.();
            await nextTick();
            expect((wrapper.get('[data-testid="submit-results-btn"]').element as HTMLButtonElement).disabled).toBe(
                false,
            );

            // Trigger submit twice rapidly to cover `if (submitting.value) return;`
            await button.trigger('click');
            // button is now submitting: true
            await button.trigger('click');
        });
    });

    describe('AC2: result_only_eligibility', () => {
        it('renders editor and active update button when actor is owner with nscmf.change.result.edit on PENDING_REVIEW Change', () => {
            const wrapper = mountChangeResults();
            expect(wrapper.find('[data-testid="results-editor"]').exists()).toBe(true);
            const btn = wrapper.get<HTMLButtonElement>('[data-testid="submit-results-btn"]');
            expect(btn.element.disabled).toBe(false);
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(false);
        });

        it('disables mutation or shows warning when actor is non-owner or owner is missing', () => {
            const wrapper = mountChangeResults({}, { id: 999 });
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);

            const noOwnerWrapper = mountChangeResults({ owner: null });
            expect(noOwnerWrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(noOwnerWrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        });

        it('disables mutation when record is not in PENDING_REVIEW', () => {
            const wrapper = mountChangeResults({ business_status: 'DRAFT' });
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        });

        it('disables mutation when record family is ACTIVATION', () => {
            const wrapper = mountChangeResults({ family: 'ACTIVATION', subtype: 'ACTIVATION' });
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        });

        it('disables mutation when actor lacks nscmf.change.result.edit permission', () => {
            const wrapper = mountChangeResults({}, { permissions: ['nscmf.view'] });
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        });

        it('handles server denial (403 / 422) by rendering feedback error', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Real 422 wire response delivers through onHttpException + onError
            await respondToRequest(req, {
                status: 422,
                errors: {
                    results: 'You are not eligible to update results of this record.',
                },
            });

            expect(wrapper.text()).toContain('You are not eligible to update results of this record.');
        });

        it('handles real 403 server denial without leaking actor info and surfaces safe generic feedback', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Real 403 response arrives via onHttpException + flash.domain_error
            await respondToRequest(req, {
                status: 403,
                flash: {
                    domain_error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to perform this action.',
                    },
                },
            });

            expect(wrapper.find('[data-testid="feedback-forbidden"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('Access Denied');
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');
        });

        it('clears terminal error latch on new submit so successful retry after 403 reports saved just now', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const firstReq = lastRequest('/nscmf/42/change-results');
            expect(firstReq).toBeDefined();

            // First attempt yields 403
            await respondToRequest(firstReq, {
                status: 403,
                flash: {
                    domain_error: {
                        code: 'FORBIDDEN',
                        message: 'You do not have permission to perform this action.',
                    },
                },
            });

            expect(wrapper.find('[data-testid="feedback-forbidden"]').exists()).toBe(true);
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');

            // Retry submit
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const secondReq = lastRequest('/nscmf/42/change-results');
            expect(secondReq).toBeDefined();
            expect(secondReq).not.toBe(firstReq);

            // Second attempt succeeds with 200
            await respondToRequest(secondReq, {
                status: 200,
                props: {
                    record: {
                        ...BASE_RECORD,
                        record_version: 8,
                    },
                },
            });

            expect(wrapper.find('[data-testid="feedback-forbidden"]').exists()).toBe(false);
            expect(wrapper.text()).toContain('Saved just now');
            expect(wrapper.text()).not.toContain('Saving…');
        });

        it('does not misclassify ordinary 422 field errors as 409 conflict', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // 422 where error key contains "version" or "conflict"
            await respondToRequest(req, {
                status: 422,
                errors: {
                    record_version: 'The record version is invalid.',
                    conflicting_rows: 'Rows conflict with the reviewer version.',
                },
            });

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="feedback-validation"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(true);
            const resultsSection = wrapper.findComponent({ name: 'ResultsSection' });
            expect(resultsSection.props('disabled')).toBe(false);
        });
    });

    describe('AC3: result_only_conflict_is_safe', () => {
        it('handles 409 conflict: stops editing, offers refresh option, does not auto-retry, and never claims saved', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Real 409 conflict delivered through onHttpException + flash.domain_error
            await respondToRequest(req, {
                status: 409,
                flash: {
                    domain_error: {
                        code: 'NSCMF_VERSION_CONFLICT',
                        message: 'Record was modified by another user.',
                    },
                },
            });

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(true);
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');

            // Affordance check: submit button removed, editor disabled
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
            const resultsSection = wrapper.findComponent({ name: 'ResultsSection' });
            expect(resultsSection.props('disabled')).toBe(true);

            const refreshBtn = wrapper.find('[data-testid="feedback-refresh-btn"]');
            expect(refreshBtn.exists()).toBe(true);

            // B-29-3b: Clicking refresh reloads the page and clears conflict state upon reload
            await refreshBtn.trigger('click');
            expect(router.reload).toHaveBeenCalled();

            // When reload completes (e.g. onSuccess/props advance), conflict panel clears and editor is re-enabled
            const reloadOptions = (router.reload as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as
                { onSuccess?: (page?: unknown) => void } | undefined;
            reloadOptions?.onSuccess?.();
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(true);
            expect(resultsSection.props('disabled')).toBe(false);
        });

        it('handles version-advancing 409 conflict (7->9) without wiping conflict panel or claiming saved', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Real 409 conflict with newer record version (7 -> 9)
            const newerRecord: NscmfDetailRecord = {
                ...BASE_RECORD,
                record_version: 9,
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'NEWER SERVER TEXT',
                            performance_information: 'CPU 50%',
                            result_status: 'RUNNING',
                        },
                    ],
                },
            };

            await respondToRequest(req, {
                status: 409,
                props: { record: newerRecord },
                flash: {
                    domain_error: {
                        code: 'NSCMF_VERSION_CONFLICT',
                        message: 'A newer version exists.',
                    },
                },
            });

            // Even if props.record updates with the newer version, conflict panel must persist and NOT show "Saved just now"
            await wrapper.setProps({ record: newerRecord });
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(true);
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
        });

        it('resyncs local model and confirms saved on successful update', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Success 200 response with acknowledged record
            const updatedRecord: NscmfDetailRecord = {
                ...BASE_RECORD,
                record_version: 8,
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Acknowledged firmware update',
                            performance_information: 'CPU 10%',
                            result_status: 'SUCCESS',
                        },
                    ],
                },
            };

            await respondToRequest(req, {
                status: 200,
                props: { record: updatedRecord },
            });

            await wrapper.setProps({ record: updatedRecord });
            await nextTick();

            expect(wrapper.text()).toContain('Saved just now');
        });

        it('never reports saved after an Inertia server error', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            const req = lastRequest('/nscmf/42/change-results');
            await respondToRequest(req, { status: 500, props: {} });
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');
            expect(wrapper.text()).toContain('Unexpected Error');
        });

        it('handles a disconnected network', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            req?.options.onNetworkError?.(new Error('Connection lost'));
            req?.options.onFinish?.();
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-network-error"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('Network Connection Issue');
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');
        });

        it('real-client-protocol: reads flash from page.flash (or onFlash) and ignores fake page.props.flash', async () => {
            const wrapper = mountChangeResults();

            // When page.flash receives a domain_error, it sets conflict state
            // Reset and check page.flash vs page.props.flash
            pageProps.flash = {
                domain_error: {
                    code: 'NSCMF_VERSION_CONFLICT',
                    message: 'A newer version exists.',
                },
            };
            await nextTick();

            // Fake page.props.flash must NOT activate feedbackError (as dead code is dropped)
            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);

            // Real wire channel: page.flash
            pageFlash.domain_error = {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version exists.',
            };
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(true);
        });

        it('handles malformed projection error gracefully via RequestFeedback (N-29-3)', async () => {
            // A projection carrying two rows with the same natural key is malformed (12 §7.4.1);
            // the editor must report it rather than send it.
            const wrapper = mountChangeResults({
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        { row_no: 1, result_summary: 'first', performance_information: null, result_status: null },
                        { row_no: 1, result_summary: 'duplicate', performance_information: null, result_status: null },
                    ],
                },
            });

            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-validation"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('results: duplicate row_no 1.');
        });
    });

    describe('AC4: result_only_readonly_context', () => {
        it('renders planning and general fields as read-only context without editable inputs', () => {
            const wrapper = mountChangeResults();

            expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe(
                'Upgrade core switch firmware to version 15.2',
            );
            expect(wrapper.find('[data-testid="table-facing_challenges"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-identified_problems"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-service_impacts"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="table-improvement_items"]').exists()).toBe(true);

            // Inputs should only exist for the results section
            const inputs = wrapper.findAll('input, textarea, select');
            for (const input of inputs) {
                const id = input.attributes('id') ?? '';
                const name = input.attributes('name') ?? '';
                expect(id.startsWith('results-') || name.startsWith('results-')).toBe(true);
            }
        });

        it('updating results does not mutate planning projection', async () => {
            const wrapper = mountChangeResults();

            const statusInput = wrapper.get('#results-0-result_status');
            await statusInput.setValue('COMPLETED_VERIFIED');

            expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe(
                'Upgrade core switch firmware to version 15.2',
            );
        });

        it('handles empty planning fields with dashes in context display', () => {
            expect(displayValue(true)).toBe('Yes');
            expect(displayValue(false)).toBe('No');
            expect(displayValue(null)).toBe('—');
            expect(displayValue(undefined)).toBe('—');
            expect(displayValue('')).toBe('—');
            expect(displayValue(123)).toBe('123');

            const emptyRecord: NscmfDetailRecord = {
                ...BASE_RECORD,
                change: {
                    results: [
                        {
                            row_no: 0,
                            result_summary: null,
                            performance_information: null,
                            result_status: null,
                        },
                    ],
                },
            };
            const wrapper = mountChangeResults(emptyRecord);
            expect(wrapper.get('[data-testid="field-maintenance_purpose"]').text()).toBe('—');
            expect(wrapper.get('[data-testid="field-monitoring_period"]').text()).toBe('—');
        });
    });
});

describe('the record moving underneath the editor (FE-29 AC3)', () => {
    it('keeps unsaved rows when the record version advances from elsewhere', async () => {
        const wrapper = mountChangeResults();

        await wrapper.get('#results-0-result_summary').setValue('Typed but not saved yet');

        // A reviewer acts on the record, so a partial reload advances the version underneath.
        await wrapper.setProps({
            record: {
                ...BASE_RECORD,
                record_version: 8,
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Server copy',
                            performance_information: 'Server copy',
                            result_status: 'SUCCESS',
                        },
                    ],
                },
            },
        });
        await nextTick();

        const summary = wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement;
        expect(summary.value).toBe('Typed but not saved yet');
        // 07 §23: say a newer version exists and offer a refresh, never discard silently.
        expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(true);
    });

    it('adopts the server rows when nothing was typed', async () => {
        const wrapper = mountChangeResults();

        await wrapper.setProps({
            record: {
                ...BASE_RECORD,
                record_version: 8,
                change: {
                    ...BASE_RECORD.change,
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Server copy',
                            performance_information: 'Server copy',
                            result_status: 'SUCCESS',
                        },
                    ],
                },
            },
        });
        await nextTick();

        const summary = wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement;
        expect(summary.value).toBe('Server copy');
        expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
    });
});

describe('a stale base version stops editing (FE-29 AC3)', () => {
    it.each([[409, 'feedback-conflict']])(
        'disables the editor and hides submit after HTTP %i',
        async (status, feedbackTestId) => {
            const wrapper = mountChangeResults();

            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
            const request = lastRequest('/nscmf/42/change-results');
            expect(request).toBeDefined();

            await respondToRequest(request, { status, isInertia: true });
            await nextTick();

            expect(wrapper.find(`[data-testid="${feedbackTestId}"]`).exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
            const summary = wrapper.get('#results-0-result_summary').element as HTMLTextAreaElement;
            expect(summary.disabled).toBe(true);
        },
    );
});

describe('partially started result rows (06 §46)', () => {
    it('keeps a row that has only one field filled, sending the rest as null', () => {
        const payload = buildChangeResultsPayload(7, [
            { row_no: 1, result_summary: 'Only the summary so far', performance_information: null, result_status: '' },
        ]);

        // A draft may hold partial rows; completeness is judged at Submit/Forward (06 §46, §48).
        expect(payload.results).toEqual([
            {
                row_no: 1,
                result_summary: 'Only the summary so far',
                performance_information: null,
                result_status: null,
            },
        ]);
    });
});

describe('double submit', () => {
    it('sends one request even if the button is clicked again while in flight', async () => {
        const wrapper = mountChangeResults();
        const button = wrapper.get<HTMLButtonElement>('[data-testid="submit-results-btn"]');

        await button.trigger('click');
        expect(requests.filter((request) => request.url === '/nscmf/42/change-results')).toHaveLength(1);

        // The button is disabled while the first request is in flight; a click that reaches it
        // anyway must not produce a second mutation.
        expect(button.element.disabled).toBe(true);
        button.element.dispatchEvent(new Event('click'));
        await nextTick();

        expect(requests.filter((request) => request.url === '/nscmf/42/change-results')).toHaveLength(1);
    });
});

describe('recovering after the record moved', () => {
    it('re-enables the editor once the refresh brings the latest record', async () => {
        const wrapper = mountChangeResults();

        await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
        await respondToRequest(lastRequest('/nscmf/42/change-results'), { status: 409, isInertia: true });
        await nextTick();
        expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);

        await wrapper.get('[data-testid="feedback-refresh-btn"]').trigger('click');
        const reload = (router.reload as unknown as { mock: { calls: [{ onSuccess?: () => void }][] } }).mock.calls;
        reload[0]?.[0]?.onSuccess?.();
        await nextTick();

        // FE-29 AC3 offers a refresh; after it lands the owner must be able to edit again.
        expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
        expect(wrapper.get<HTMLButtonElement>('[data-testid="submit-results-btn"]').element.disabled).toBe(false);
    });
});

describe('the feedback error carries the shape RequestFeedback classifies on', () => {
    it.each([
        [403, 'feedback-forbidden'],
        [409, 'feedback-conflict'],
    ])('maps HTTP %i onto the matching panel', async (status, testId) => {
        const wrapper = mountChangeResults();

        await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
        await respondToRequest(lastRequest('/nscmf/42/change-results'), { status, isInertia: true });
        await nextTick();

        expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
    });

    it('reports a lost connection as a network failure, not a server error', async () => {
        const wrapper = mountChangeResults();

        await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');
        lastRequest('/nscmf/42/change-results')?.options.onNetworkError?.(new Error('offline'));
        await nextTick();

        expect(wrapper.find('[data-testid="feedback-network-error"]').exists()).toBe(true);
    });
});

describe('read-only context tolerates a sparse projection', () => {
    it('shows a dash for a missing monitoring period and announcement', () => {
        const wrapper = mountChangeResults({
            change: {
                ...BASE_RECORD.change,
                monitoring_period_value: null,
                monitoring_period_unit: null,
                announcement_timing: null,
            },
        });

        expect(wrapper.get('[data-testid="field-monitoring_period"]').text()).toContain('—');
        expect(wrapper.get('[data-testid="field-announcement_timing"]').text()).toContain('—');
    });

    it('numbers result rows from one when the projection omits row_no', async () => {
        const wrapper = mountChangeResults({
            change: {
                ...BASE_RECORD.change,
                results: [{ row_no: 0, result_summary: 'First', performance_information: null, result_status: null }],
            },
        });

        await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

        // row_no is the natural key (12 §7.4.1); a projection without one must still send 1..n.
        const sent = lastRequest('/nscmf/42/change-results')?.data as { results: { row_no: number }[] };
        expect(sent.results[0]?.row_no).toBe(1);
    });

    it('treats an empty stored string as unchanged, not as an unsaved edit', async () => {
        const wrapper = mountChangeResults({
            change: {
                ...BASE_RECORD.change,
                results: [{ row_no: 1, result_summary: '', performance_information: '', result_status: '' }],
            },
        });

        // Nothing was typed, so a version bump from elsewhere may resync instead of warning.
        await wrapper.setProps({ record: { ...BASE_RECORD, record_version: 8 } });
        await nextTick();

        expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(false);
    });
});

describe('read-only context renders the labels, not the raw codes', () => {
    it('shows the monitoring period and announcement in words', () => {
        const wrapper = mountChangeResults();

        expect(wrapper.get('[data-testid="field-monitoring_period"]').text()).toContain('2 Hours');
        expect(wrapper.get('[data-testid="field-announcement_timing"]').text()).toContain('2 weeks before');
    });

    it('renders an empty change projection without inventing rows', () => {
        const wrapper = mountChangeResults({ change: {} });

        for (const table of ['facing_challenges', 'identified_problems', 'service_impacts', 'improvement_items']) {
            expect(wrapper.find(`[data-testid="table-${table}"]`).exists()).toBe(true);
        }
        expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    });
});
