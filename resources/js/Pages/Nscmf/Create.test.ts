import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forms, lastRequest, requests, resetInertia } from '@/testing/inertia';

import Create from './Create.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

function mountCreate(team: { id: number; name: string } | null = { id: 1, name: 'Demo Team Alpha' }): VueWrapper {
    resetInertia({
        auth: {
            user: { id: 5, username: 'demo.requester.a', name: 'Demo Requester A', team },
            permissions: ['nscmf.create'],
        },
    });
    return mount(Create);
}

function subtypeOptions(wrapper: VueWrapper): string[] {
    return wrapper.findAll('#subtype option').map((option) => option.attributes('value') ?? '');
}

async function submit(wrapper: VueWrapper): Promise<void> {
    await wrapper.get('form').trigger('submit');
}

describe('Create NSCMF (FE-17)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders inside the authenticated shell', () => {
        expect(mountCreate().find('#sidebar-navigation').exists()).toBe(true);
    });

    it('AC1: offers the subtypes of the chosen family and resets the subtype when the family changes', async () => {
        const wrapper = mountCreate();
        expect(subtypeOptions(wrapper)).toEqual(['ACTIVATION', 'UPGRADE_DOWNGRADE', 'DEACTIVATION']);

        await wrapper.get('#family').setValue('CHANGE');
        expect(subtypeOptions(wrapper)).toEqual(['MAINTENANCE', 'UPGRADE', 'EMERGENCY']);
        expect(wrapper.get<HTMLSelectElement>('#subtype').element.value).toBe('MAINTENANCE');
    });

    it('AC3/AC4: posts only family, subtype, numbering mode and a null request number for automatic numbering', async () => {
        const wrapper = mountCreate();
        await wrapper.get('#family').setValue('CHANGE');
        await wrapper.get('#subtype').setValue('EMERGENCY');
        await submit(wrapper);

        expect(lastRequest('/nscmf')).toMatchObject({
            method: 'post',
            data: { family: 'CHANGE', subtype: 'EMERGENCY', numbering_mode: 'AUTOMATIC', request_no: null },
        });
        expect(Object.keys(lastRequest('/nscmf')?.data ?? {})).toEqual([
            'family',
            'subtype',
            'numbering_mode',
            'request_no',
        ]);
        expect(wrapper.find('#request-no').exists()).toBe(false);
    });

    it('AC2: rejects manual numbers that are too short, too long or contain spaces, before any request', async () => {
        const wrapper = mountCreate();
        await wrapper.get('[data-testid="numbering-manual"]').setValue(true);

        for (const invalid of ['AB', 'A'.repeat(65), 'AB CD']) {
            await wrapper.get('#request-no').setValue(invalid);
            await submit(wrapper);
            expect(wrapper.get('#request-no-error').text()).not.toBe('');
        }
        expect(requests).toHaveLength(0);
    });

    it('AC2: accepts trimmed manual numbers of 3 and 64 characters', async () => {
        const wrapper = mountCreate();
        await wrapper.get('[data-testid="numbering-manual"]').setValue(true);

        await wrapper.get('#request-no').setValue('  ABC  ');
        await submit(wrapper);
        expect(lastRequest('/nscmf')?.data).toMatchObject({ numbering_mode: 'MANUAL', request_no: 'ABC' });

        await wrapper.get('#request-no').setValue('A'.repeat(64));
        await submit(wrapper);
        expect(lastRequest('/nscmf')?.data.request_no).toBe('A'.repeat(64));
    });

    it('AC2: shows a request number conflict from the server next to the field', async () => {
        const wrapper = mountCreate();
        await wrapper.get('[data-testid="numbering-manual"]').setValue(true);

        const form = forms[0];
        if (!form) throw new Error('create form missing');
        form.errors = { request_no: 'This request number is already used.' };
        await nextTick();

        expect(wrapper.get('#request-no-error').text()).toBe('This request number is already used.');
    });

    it('AC4: does not submit twice while the request is in flight', async () => {
        const wrapper = mountCreate();
        const form = forms[0];
        if (!form) throw new Error('create form missing');
        form.processing = true;
        await nextTick();

        await submit(wrapper);

        expect(requests).toHaveLength(0);
        expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('AC4: blocks users without an active team and asks them to contact an administrator', () => {
        const wrapper = mountCreate(null);

        expect(wrapper.find('form').exists()).toBe(false);
        expect(wrapper.text()).toContain('Contact an administrator');
    });

    it('AC4: switching back to automatic numbering drops the manual number', async () => {
        const wrapper = mountCreate();
        await wrapper.get('[data-testid="numbering-manual"]').setValue(true);
        await wrapper.get('#request-no').setValue('DEMO-ACT-099');

        await wrapper.get('[data-testid="numbering-automatic"]').setValue(true);
        await submit(wrapper);

        expect(lastRequest('/nscmf')?.data).toMatchObject({ numbering_mode: 'AUTOMATIC', request_no: null });
    });
});
