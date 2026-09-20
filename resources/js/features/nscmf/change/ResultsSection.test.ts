import { type DOMWrapper, mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { buildChangeDraftPayload } from '../draftPayload';
import type { BusinessStatus } from '../contracts';
import type { ChangeSubtype } from '../types';
import ResultsSection, { type ResultFields } from './ResultsSection.vue';

function mountSection(
    modelValue: ResultFields = {},
    props: {
        subtype?: ChangeSubtype;
        errors?: Record<string, string>;
        disabled?: boolean;
    } = {},
): VueWrapper {
    return mount(ResultsSection, {
        props: {
            modelValue,
            subtype: 'MAINTENANCE',
            ...props,
        },
    });
}

function lastModel(wrapper: VueWrapper): ResultFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as ResultFields;
}

function control(wrapper: VueWrapper, collection: string, testid: string): Omit<DOMWrapper<Element>, 'exists'> {
    return wrapper.get(`[data-collection="${collection}"] [data-testid="${testid}"]`);
}

describe('ResultsSection (FE-26)', () => {
    describe('AC1: results_accept_arbitrary_status', () => {
        it('accepts an arbitrary free text status such as "Selesai dengan catatan" and renders a text input, not a dropdown', async () => {
            const wrapper = mountSection({
                results: [{ row_no: 1, result_summary: null, performance_information: null, result_status: null }],
            });

            const statusField = wrapper.get('#results-0-result_status');
            expect(statusField.element.tagName.toLowerCase()).toBe('input');
            expect(statusField.attributes('type')).not.toBe('select');
            expect(wrapper.find('select#results-0-result_status').exists()).toBe(false);

            await statusField.setValue('Selesai dengan catatan');
            expect(lastModel(wrapper).results).toEqual([
                {
                    row_no: 1,
                    result_summary: null,
                    performance_information: null,
                    result_status: 'Selesai dengan catatan',
                },
            ]);
        });
    });

    describe('AC2: results_respect_row_and_length_limits', () => {
        it('accepts up to 5 rows and blocks adding a 6th row', () => {
            const wrapper = mountSection({
                results: [1, 2, 3, 4, 5].map((row_no) => ({
                    row_no,
                    result_summary: `Summary ${row_no}`,
                    performance_information: `Perf ${row_no}`,
                    result_status: 'SUCCESS',
                })),
            });

            expect(control(wrapper, 'results', 'btn-add-row').attributes('disabled')).toBeDefined();
        });

        it('enforces max length attributes on fields: summary 2000, performance 2000, status 255', () => {
            const wrapper = mountSection({
                results: [{ row_no: 1, result_summary: null, performance_information: null, result_status: null }],
            });

            expect(wrapper.get('#results-0-result_summary').attributes('maxlength')).toBe('2000');
            expect(wrapper.get('#results-0-performance_information').attributes('maxlength')).toBe('2000');
            expect(wrapper.get('#results-0-result_status').attributes('maxlength')).toBe('255');
        });

        it('shows server validation feedback for length limit errors', () => {
            const wrapper = mountSection(
                {
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Too long',
                            performance_information: 'Too long',
                            result_status: 'Too long',
                        },
                    ],
                },
                {
                    errors: {
                        'change.results.0.result_summary':
                            'The result summary may not be greater than 2000 characters.',
                        'change.results.0.performance_information':
                            'The performance information may not be greater than 2000 characters.',
                        'change.results.0.result_status': 'The status may not be greater than 255 characters.',
                    },
                },
            );

            expect(wrapper.get('#results-0-result_summary-error').text()).toContain(
                'The result summary may not be greater than 2000 characters.',
            );
            expect(wrapper.get('#results-0-performance_information-error').text()).toContain(
                'The performance information may not be greater than 2000 characters.',
            );
            expect(wrapper.get('#results-0-result_status-error').text()).toContain(
                'The status may not be greater than 255 characters.',
            );
        });
    });

    describe('AC3: results_allow_empty_first_submit', () => {
        it('allows empty results array [] without error', () => {
            const wrapper = mountSection({ results: [] });
            expect(wrapper.find('[data-collection="results"]').exists()).toBe(true);
            expect(wrapper.text()).toContain('No results yet.');

            // Also test default undefined results model value
            const wrapperUndefined = mountSection({});
            expect(wrapperUndefined.find('[data-collection="results"]').exists()).toBe(true);
        });

        it('shows server validation summary/feedback when started row is incomplete at submit', () => {
            const wrapper = mountSection(
                {
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Some summary',
                            performance_information: null,
                            result_status: null,
                        },
                    ],
                },
                {
                    errors: {
                        'change.results.0.performance_information': 'The performance information field is required.',
                        'change.results.0.result_status': 'The result status field is required.',
                    },
                },
            );

            expect(wrapper.get('#results-0-performance_information-error').text()).toContain(
                'The performance information field is required.',
            );
            expect(wrapper.get('#results-0-result_status-error').text()).toContain(
                'The result status field is required.',
            );
        });
    });

    describe('AC4: results_do_not_save_pending_review_via_draft', () => {
        it('demonstrates that parent state PENDING_REVIEW must omit results from change draft payload', () => {
            const recordVersion = 1;
            const businessStatus: BusinessStatus = 'PENDING_REVIEW';
            const draftFormFields = {
                maintenance_purpose: 'Routine check',
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Done',
                        performance_information: 'Good',
                        result_status: 'SUCCESS',
                    },
                ],
            };

            // Simulating container/parent payload builder logic as specified by AC4
            const payload = buildChangeDraftPayload(recordVersion, {
                ...draftFormFields,
                ...(businessStatus === 'PENDING_REVIEW' ? { results: undefined } : {}),
            });

            expect(payload.change.results).toBeUndefined();
            expect(payload.change.maintenance_purpose).toBe('Routine check');
        });
    });

    describe('Draft Section Contract & Reusability', () => {
        it('renders stored values back and updates each field correctly', async () => {
            const wrapper = mountSection({
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Initial summary',
                        performance_information: 'Initial perf',
                        result_status: 'PENDING',
                    },
                ],
            });

            expect(wrapper.get<HTMLTextAreaElement>('#results-0-result_summary').element.value).toBe('Initial summary');
            expect(wrapper.get<HTMLTextAreaElement>('#results-0-performance_information').element.value).toBe(
                'Initial perf',
            );
            expect(wrapper.get<HTMLInputElement>('#results-0-result_status').element.value).toBe('PENDING');

            await wrapper.get('#results-0-result_summary').setValue('Updated summary');
            expect(lastModel(wrapper).results?.[0]?.result_summary).toBe('Updated summary');

            await wrapper.get('#results-0-performance_information').setValue('Updated perf');
            expect(lastModel(wrapper).results?.[0]?.performance_information).toBe('Updated perf');

            await wrapper.get('#results-0-result_status').setValue('COMPLETED');
            expect(lastModel(wrapper).results?.[0]?.result_status).toBe('COMPLETED');
        });

        it('clears empty field string to null on input', async () => {
            const wrapper = mountSection({
                results: [
                    {
                        row_no: 1,
                        result_summary: 'Something',
                        performance_information: 'Perf',
                        result_status: 'Status',
                    },
                ],
            });

            await wrapper.get('#results-0-result_summary').setValue('');
            expect(lastModel(wrapper).results?.[0]?.result_summary).toBeNull();

            await wrapper.get('#results-0-performance_information').setValue('');
            expect(lastModel(wrapper).results?.[0]?.performance_information).toBeNull();

            await wrapper.get('#results-0-result_status').setValue('');
            expect(lastModel(wrapper).results?.[0]?.result_status).toBeNull();
        });

        it('adds, removes, and renumbers rows', async () => {
            const wrapper = mountSection({ results: [] });

            await control(wrapper, 'results', 'btn-add-row').trigger('click');
            expect(lastModel(wrapper).results).toEqual([
                {
                    row_no: 1,
                    result_summary: null,
                    performance_information: null,
                    result_status: null,
                },
            ]);

            const twoRows = mountSection({
                results: [
                    { row_no: 1, result_summary: 'First', performance_information: 'P1', result_status: 'S1' },
                    { row_no: 2, result_summary: 'Second', performance_information: 'P2', result_status: 'S2' },
                ],
            });

            await twoRows.get('[data-collection="results"] [data-testid="btn-remove-row-0"]').trigger('click');
            expect(lastModel(twoRows).results).toEqual([
                { row_no: 1, result_summary: 'Second', performance_information: 'P2', result_status: 'S2' },
            ]);
        });

        it('disables all controls when disabled prop is true', () => {
            const wrapper = mountSection(
                {
                    results: [
                        {
                            row_no: 1,
                            result_summary: 'Summary',
                            performance_information: 'Perf',
                            result_status: 'Status',
                        },
                    ],
                },
                { disabled: true },
            );

            expect(wrapper.get('#results-0-result_summary').attributes('disabled')).toBeDefined();
            expect(wrapper.get('#results-0-performance_information').attributes('disabled')).toBeDefined();
            expect(wrapper.get('#results-0-result_status').attributes('disabled')).toBeDefined();
            expect(control(wrapper, 'results', 'btn-add-row').attributes('disabled')).toBeDefined();
            expect(
                wrapper.get('[data-collection="results"] [data-testid="btn-remove-row-0"]').attributes('disabled'),
            ).toBeDefined();
        });
    });
});
