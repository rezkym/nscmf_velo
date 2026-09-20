import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SubmitPanel from './SubmitPanel.vue';
import type { BusinessStatus } from './contracts';
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
            const wrapper = mount(SubmitPanel, {
                props: {
                    recordId: 42,
                    recordVersion: 3,
                    businessStatus: 'DRAFT' as BusinessStatus,
                    ownerId: 10,
                    allowedActions: ['submit'],
                    saveState: 'conflict',
                },
            });

            const submitBtn = wrapper.find('[data-testid="submit-button"]');
            expect(submitBtn.attributes('disabled')).toBeDefined();

            await submitBtn.trigger('click');
            expect(router.post).not.toHaveBeenCalled();
            expect(wrapper.text()).toContain('Resolve version conflict before submitting');
        });
    });

    describe('AC2: submit_maps_nested_errors', () => {
        it('renders summary error list and maps nested wire paths to human-readable field labels and focuses target', async () => {
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

            // Target field element in DOM
            const targetInput = document.createElement('input');
            targetInput.id = 'field-activation-service_blocks-0-service_id';
            document.body.appendChild(targetInput);
            const focusSpy = vi.spyOn(targetInput, 'focus');

            await firstLink?.trigger('click');
            expect(wrapper.emitted('navigate-error')).toBeTruthy();
            expect(wrapper.emitted('navigate-error')?.[0]).toEqual(['activation.service_blocks.0.service_id']);
            expect(focusSpy).toHaveBeenCalled();

            targetInput.remove();
            wrapper.unmount();
        });
    });
});
