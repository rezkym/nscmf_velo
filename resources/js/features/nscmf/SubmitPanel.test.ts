import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

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
});
