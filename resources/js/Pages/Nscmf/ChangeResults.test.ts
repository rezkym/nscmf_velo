import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NscmfDetailRecord } from '@/Pages/Nscmf/Show.vue';
import { lastRequest, resetInertia, router } from '@/testing/inertia';

import ChangeResults, { buildChangeResultsPayload } from './ChangeResults.vue';

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
        announcement_timing: 'SEVEN_DAYS',
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

        it('submits PATCH /nscmf/{record}/change-results with exactly record_version and results (no change wrapper, no planning/header)', async () => {
            const wrapper = mountChangeResults();

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

        it('disables mutation or shows warning when actor is non-owner', () => {
            const wrapper = mountChangeResults({}, { id: 999 });
            expect(wrapper.find('[data-testid="ineligible-alert"]').exists()).toBe(true);
            expect(wrapper.find('[data-testid="submit-results-btn"]').exists()).toBe(false);
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

            req?.options.onError?.({
                results: 'You are not eligible to update results of this record.',
            });
            await nextTick();

            expect(wrapper.text()).toContain('You are not eligible to update results of this record.');
        });
    });

    describe('AC3: result_only_conflict_is_safe', () => {
        it('handles 409 conflict: stops editing, offers refresh option, does not auto-retry, and never claims saved', async () => {
            const wrapper = mountChangeResults();
            await wrapper.get('[data-testid="submit-results-btn"]').trigger('click');

            const req = lastRequest('/nscmf/42/change-results');
            expect(req).toBeDefined();

            // Simulate server returning 409 conflict
            req?.options.onError?.({
                conflict: 'NSCMF_VERSION_CONFLICT: Record was modified by reviewer',
            });
            await nextTick();

            expect(wrapper.find('[data-testid="feedback-conflict"]').exists()).toBe(true);
            expect(wrapper.text().toLowerCase()).not.toContain('saved just now');

            const refreshBtn = wrapper.find('[data-testid="feedback-refresh-btn"]');
            expect(refreshBtn.exists()).toBe(true);

            // Clicking refresh reloads the page
            await refreshBtn.trigger('click');
            expect(router.reload).toHaveBeenCalled();
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
    });
});
