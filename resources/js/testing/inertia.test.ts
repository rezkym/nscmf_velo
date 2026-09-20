import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';

import { forms, inertiaModule, lastRequest, pageFlash, pageProps, requests, resetInertia, router } from './inertia';

describe('inertia test double', () => {
    beforeEach(() => resetInertia({ auth: { permissions: ['teams.view'] } }));

    it('records form submissions with the form data at submit time', () => {
        const form = inertiaModule.useForm({ name: 'Alpha', ids: [1] });
        form.name = 'Beta';
        form.post('/administration/teams', { preserveScroll: true });

        expect(lastRequest('/administration/teams')).toMatchObject({
            method: 'post',
            data: { name: 'Beta', ids: [1] },
            options: { preserveScroll: true },
        });
    });

    it('resets fields to their initial values and clears errors', () => {
        const form = inertiaModule.useForm({ name: 'Alpha' });
        form.name = 'Beta';
        form.errors = { name: 'Taken' };

        form.reset('name');
        form.clearErrors();

        expect(form.name).toBe('Alpha');
        expect(form.errors).toEqual({});
    });

    it('records router visits and exposes page props', () => {
        router.post('/administration/teams/1/deactivate', {});

        expect(lastRequest(/deactivate$/)?.method).toBe('post');
        expect(inertiaModule.usePage().props).toBe(pageProps);
        expect(pageProps.auth).toEqual({ permissions: ['teams.view'] });
    });

    it('renders Link as an anchor and Head as nothing', () => {
        const wrapper = mount(
            defineComponent({
                setup: () => () => [
                    h(inertiaModule.Head, { title: 'x' }),
                    h(inertiaModule.Link, { href: '/dashboard' }, () => 'Go'),
                ],
            }),
        );

        expect(wrapper.find('a').attributes('href')).toBe('/dashboard');
        expect(wrapper.text()).toBe('Go');
    });

    it('starts each test with empty state', () => {
    inertiaModule.useForm({});
    resetInertia();

    expect(forms).toHaveLength(0);
    expect(requests).toHaveLength(0);
    expect(pageProps).toEqual({});
    expect(pageFlash).toEqual({});
    });
});
