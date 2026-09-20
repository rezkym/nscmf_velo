import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';

import SubmitPanel from './SubmitPanel.vue';
import type { BusinessStatus } from './contracts';
import GeneralServiceSection, { type GeneralFields } from './activation/GeneralServiceSection.vue';
import PlanSection from './change/PlanSection.vue';
import type { ChangeDraftFields } from './types';
import { resetInertia, router } from '@/testing/inertia';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

describe('SubmitPanel (FE-28)', () => {
    beforeEach(() => {
        resetInertia({
            auth: {
                user: { id: 10, name: 'Alice Requester' },
                permissions: ['nscmf.submit'],
            },
        });
    });

    describe('AC1: submit_blocks_until_save_ack', () => {
        it('disables submit button and prevents submission when save state is dirty', async () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'dirty',
                },
            });

            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.exists()).toBe(true);
            expect(submitBtn.attributes('disabled')).toBeDefined();

            await submitBtn.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
            expect(wrapper.text()).toContain('Save pending changes before submitting');
        });

        it('disables submit button and blocks transition when save state is saving (in-flight)', async () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'saving',
                },
            });

            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.attributes('disabled')).toBeDefined();

            await submitBtn.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
        });

        it('disables submit button and displays error when save state is error or conflict', async () => {
            const conflictWrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'conflict',
                },
            });

            const conflictBtn = conflictWrapper.find('[data-testid="submit-button"]');
            expect(conflictBtn.attributes('disabled')).toBeDefined();

            await conflictBtn.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
            expect(conflictWrapper.text()).toContain('Resolve version conflict before submitting');

            const errorWrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'error',
                },
            });

            const errorBtn = errorWrapper.find('[data-testid="submit-button"]');
            expect(errorBtn.attributes('disabled')).toBeDefined();

            await errorBtn.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
            expect(errorWrapper.text()).toContain('Save failed — resolve errors before submitting');
        });
    });

    describe('AC2: submit_maps_nested_errors', () => {
        it('renders summary error list and maps nested wire paths to human-readable field labels and focuses target', () => {
            const serverErrors = {
                'activation.service_blocks.0.service_id': 'Service ID is required for activated blocks',
                'change.improvement_items.0.plan_text': 'Maintenance plan text is required',
            };

            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'clean',
                    errors: serverErrors,
                },
                attachTo: document.body,
            });

            const errorSummary = wrapper.find('[data-testid="error-summary"]');
            expect(errorSummary.exists()).toBe(true);
            expect(errorSummary.attributes('role')).toBe('alert');
            expect(errorSummary.attributes('tabindex')).toBe('-1');

            const errorItems = wrapper.findAll('[data-testid="error-summary-item"]');
            expect(errorItems.length).toBe(2);

            const firstItem = errorItems[0];
            expect(firstItem).toBeDefined();
            const firstLink = firstItem?.find('button, a');
            expect(firstLink?.exists()).toBe(true);
            expect(firstItem?.text()).toContain('Service ID');
            expect(firstItem?.text()).toContain('Service ID is required for activated blocks');

            const secondItem = errorItems[1];
            expect(secondItem?.text()).toContain('plan text');
            expect(secondItem?.text()).toContain('Maintenance plan text is required');

            // Target field element in DOM: test with real sections mounted in DOM
            const generalModel = ref<GeneralFields>({
                service_blocks: [
                    {
                        service_context: 'NEW',
                        service_id: null,
                    },
                ],
            });
            const planModel = ref<Partial<ChangeDraftFields>>({
                improvement_items: [
                    {
                        row_no: 1,
                        plan_text: null,
                        target_kpi: null,
                    },
                ],
            });

            const harness = mount(
                defineComponent({
                    setup() {
                        return () =>
                            h('div', [
                                h(GeneralServiceSection, {
                                    modelValue: generalModel.value,
                                    subtype: 'ACTIVATION',
                                    errors: serverErrors,
                                }),
                                h(PlanSection, {
                                    modelValue: planModel.value,
                                    subtype: 'MAINTENANCE',
                                    errors: serverErrors,
                                }),
                                h(SubmitPanel, {
                                    recordId: 42,
                                    recordVersion: 3,
                                    businessStatus: 'DRAFT',
                                    ownerId: 10,
                                    allowedActions: ['submit'],
                                    saveState: 'clean',
                                    errors: serverErrors,
                                }),
                            ]);
                    },
                }),
                { attachTo: document.body },
            );

            const panel = harness.findComponent(SubmitPanel);
            const panelSummary = panel.find('[data-testid="error-summary"]');
            expect(panelSummary.exists()).toBe(true);

            const errorButtons = panel.findAll('[data-testid="error-summary-item"] button');
            expect(errorButtons.length).toBe(2);

            // Click first error: activation.service_blocks.0.service_id
            // Real element in DOM is #service-new-service_id
            const btn1 = errorButtons[0]?.element as HTMLElement;
            btn1.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            expect(panel.emitted('navigate-error')?.[0]).toEqual(['activation.service_blocks.0.service_id']);
            expect(document.activeElement?.id).toBe('service-new-service_id');

            // Click second error: change.improvement_items.0.plan_text
            // Real element in DOM is #improvement_items-0-plan_text
            const btn2 = errorButtons[1]?.element as HTMLElement;
            btn2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            expect(panel.emitted('navigate-error')?.[1]).toEqual(['change.improvement_items.0.plan_text']);
            expect(document.activeElement?.id).toBe('improvement_items-0-plan_text');

            harness.unmount();
            wrapper.unmount();
        });
    });

    describe('AC3: submit_distinguishes_warning', () => {
        it('renders warnings separately without blocking submit when optional attachment missing or announcement timing mismatched', async () => {
            const warnings = [
                'Upgrade change has no attachment uploaded. Attachments remain optional.',
                'Announcement timing is atypical for Emergency change.',
            ];

            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'clean',
                    warnings,
                },
            });

            const warningBox = wrapper.find('[data-testid="warning-summary"]');
            expect(warningBox.exists()).toBe(true);
            expect(warningBox.attributes('role')).toBe('status');
            expect(warningBox.classes()).toContain('border-amber-500');

            const warningItems = wrapper.findAll('[data-testid="warning-summary-item"]');
            expect(warningItems.length).toBe(2);
            expect(warningItems[0]?.text()).toContain('Upgrade change has no attachment uploaded');
            expect(warningItems[1]?.text()).toContain('Announcement timing is atypical');

            // Submit button MUST remain enabled and submit must proceed
            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.attributes('disabled')).toBeUndefined();

            await submitBtn.trigger('click');
            expect(router.post).toHaveBeenCalledWith(
                '/nscmf/42/submit',
                {
                    record_version: 3,
                },
                expect.any(Object),
            );
        });

        it('prevents double-submit while submission request is in-flight', async () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'clean',
                },
            });

            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.attributes('disabled')).toBeUndefined();

            await submitBtn.trigger('click');
            expect(router.post).toHaveBeenCalledTimes(1);

            // Button should now be disabled and further clicks blocked
            expect(submitBtn.attributes('disabled')).toBeDefined();
            await submitBtn.trigger('click');
            expect(router.post).toHaveBeenCalledTimes(1);

            // Exercise onFinish and onError callbacks passed to router.post
            const postCall = vi.mocked(router.post).mock.calls[0];
            const options = postCall?.[2] as { onFinish?: () => void; onError?: () => void };
            expect(options?.onFinish).toBeDefined();
            expect(options?.onError).toBeDefined();

            options?.onError?.();
            await wrapper.vm.$nextTick();
            expect(submitBtn.attributes('disabled')).toBeUndefined();

            await submitBtn.trigger('click');
            expect(router.post).toHaveBeenCalledTimes(2);

            const secondPostCall = vi.mocked(router.post).mock.calls[1];
            const secondOptions = secondPostCall?.[2] as { onFinish?: () => void };
            secondOptions?.onFinish?.();
            await wrapper.vm.$nextTick();
            expect(submitBtn.attributes('disabled')).toBeUndefined();
        });
    });

    describe('AC4: resubmit_preserves_number_and_iteration', () => {
        it('renders in revision mode with return reason and immutable request number, and button is "Submit for Review"', async () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 5,
                    businessStatus: 'REVISION_REQUIRED' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'clean',
                    requestNo: 'NSCMF-202609-00042',
                    iteration: 1,
                    revisionReason: 'Please clarify service impact on NOC15 and update the rollback steps.',
                },
            });

            // Revision notice with return reason
            const revisionNotice = wrapper.find('[data-testid="revision-notice"]');
            expect(revisionNotice.exists()).toBe(true);
            expect(revisionNotice.text()).toContain('Revision Required');
            expect(revisionNotice.text()).toContain('Please clarify service impact on NOC15');

            // Request number is displayed as read-only / immutable, iteration shown
            const metaInfo = wrapper.find('[data-testid="submit-meta-info"]');
            expect(metaInfo.exists()).toBe(true);
            expect(metaInfo.text()).toContain('NSCMF-202609-00042');
            expect(metaInfo.text()).toContain('Iteration: 1');

            // Exact button label (§62): "Submit for Review"
            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.text()).toBe('Submit for Review');

            await submitBtn.trigger('click');
            expect(router.post).toHaveBeenCalledWith(
                '/nscmf/42/submit',
                {
                    record_version: 5,
                },
                expect.any(Object),
            );
        });
    });

    describe('AC5: submit_denial_keeps_data', () => {
        it('keeps business badge unchanged on 403, 409 or 422 denial and displays domain error message without premature optimistic badge transition', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'clean',
                    domainError: {
                        code: 'NSCMF_VERSION_CONFLICT',
                        message: 'The record was modified by another user. Please reload.',
                    },
                },
            });

            // Badge or status display MUST show Draft, not Pending Review
            const statusDisplay = wrapper.find('[data-testid="submit-status-badge"]');
            expect(statusDisplay.exists()).toBe(true);
            expect(statusDisplay.text()).toBe('Draft');

            // Domain error alert rendered
            const alert = wrapper.find('[data-testid="domain-error-alert"]');
            expect(alert.exists()).toBe(true);
            expect(alert.attributes('role')).toBe('alert');
            expect(alert.text()).toContain('The record was modified by another user. Please reload.');
        });
    });

    describe('Coverage edge paths and formatting', () => {
        it('handles formatPathLabel fallback when path part is not in PATH_LABELS', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    errors: {
                        custom_field: 'Custom error',
                        'nested.unknown_prop': 'Nested unknown',
                        '': 'Blank path error',
                    },
                },
            });

            expect(wrapper.text()).toContain('custom field');
            expect(wrapper.text()).toContain('unknown prop');
        });

        it('handles array errors and empty error values in mappedErrors', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    errors: {
                        service_id: ['First error', 'Second error'],
                        service_context: '',
                    },
                },
            });

            expect(wrapper.text()).toContain('First error, Second error');
            expect(wrapper.text()).not.toContain('Service Context');
        });

        it('handles missing element when navigating to error', async () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    errors: {
                        'nonexistent.field': 'Some error',
                    },
                },
            });

            const link = wrapper.find('[data-testid="error-summary-item"] button');
            await link.trigger('click');
            expect(wrapper.emitted('navigate-error')?.[0]).toEqual(['nonexistent.field']);

            // Direct ID fallback lookup branch
            const directTarget = document.createElement('input');
            directTarget.id = 'direct-field-id';
            document.body.appendChild(directTarget);
            const focusSpy = vi.spyOn(directTarget, 'focus');

            const wrapperWithDirect = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    errors: {
                        'direct-field-id': 'Error without matching alert',
                    },
                },
            });

            const directLink = wrapperWithDirect.find('[data-testid="error-summary-item"] button');
            await directLink.trigger('click');
            expect(focusSpy).toHaveBeenCalled();
            directTarget.remove();
        });

        it('does not submit when canSubmit is false and handleSubmit is called directly', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    allowedActions: [],
                },
            });

            // Even if click event somehow triggers or handler is invoked directly on the element
            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            submitBtn.element.dispatchEvent(new Event('click'));
            expect(router.post).not.toHaveBeenCalled();
        });

        it('handles meta info variations: requestNo only and iteration only', () => {
            const wrapperWithReq = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    requestNo: 'NSCMF-001',
                    iteration: null,
                },
            });
            expect(wrapperWithReq.text()).toContain('NSCMF-001');
            expect(wrapperWithReq.text()).not.toContain('Iteration:');

            const wrapperWithIter = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    requestNo: null,
                    iteration: 2,
                },
            });
            expect(wrapperWithIter.text()).toContain('Iteration: 2');
        });

        it('handles revision mode without revisionReason', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'REVISION_REQUIRED' as BusinessStatus,
                    revisionReason: null,
                },
            });
            expect(wrapper.text()).toContain('Revision Required');
            expect(wrapper.text()).not.toContain('Return Reason:');
        });

        it('handles domainError without code', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    domainError: {
                        message: 'General domain failure',
                    },
                },
            });
            expect(wrapper.text()).toContain('General domain failure');
        });

        it('falls back to businessStatus when not in STATUS_LABELS', () => {
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'UNKNOWN_STATUS' as unknown as BusinessStatus,
                },
            });
            expect(wrapper.find('[data-testid="submit-status-badge"]').text()).toBe('UNKNOWN_STATUS');
        });
    });
});
