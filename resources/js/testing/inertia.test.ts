import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    forms,
    inertiaModule,
    lastRequest,
    pageFlash,
    pageProps,
    requests,
    resetInertia,
    respondToRequest,
    router,
} from './inertia';

describe('inertia test double', () => {
    beforeEach(() => resetInertia({ auth: { permissions: ['teams.view'] } }));

    it('stops page updates and callbacks when an HTTP exception is handled', async () => {
        const onFlash = vi.fn();
        const onSuccess = vi.fn();
        const onError = vi.fn();
        const onNetworkError = vi.fn();
        const onFinish = vi.fn();
        router.patch(
            '/record',
            {},
            {
                onHttpException: () => false,
                onFlash,
                onSuccess,
                onError,
                onNetworkError,
                onFinish,
            },
        );
        await respondToRequest(lastRequest('/record'), {
            status: 409,
            flash: { domain_error: { code: 'CONFLICT' } },
            props: { record_version: 99 },
            errors: { results: 'Conflict' },
        });
        expect(pageFlash).toEqual({});
        expect(pageProps.record_version).toBeUndefined();
        expect(onFlash).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
        expect(onNetworkError).not.toHaveBeenCalled();
        expect(onFinish).toHaveBeenCalledOnce();
    });

    it('dispatches an unhandled Inertia HTTP response through flash and success in order', async () => {
        const calls: string[] = [];
        router.patch(
            '/record',
            {},
            {
                onHttpException: () => {
                    calls.push('http');
                },
                onFlash: () => {
                    calls.push('flash');
                },
                onSuccess: () => {
                    calls.push('success');
                },
                onError: () => {
                    calls.push('error');
                },
                onFinish: () => {
                    calls.push('finish');
                },
            },
        );
        await respondToRequest(lastRequest('/record'), {
            status: 409,
            props: { record_version: 4 },
            flash: { notice: 'Changed' },
        });
        expect(calls).toEqual(['http', 'flash', 'success', 'finish']);
        expect(pageProps.record_version).toBe(4);
    });

    it('does not turn a received non-Inertia HTTP response into a network failure', async () => {
        const onNetworkError = vi.fn();
        const onHttpException = vi.fn();
        router.patch('/record', {}, { onNetworkError, onHttpException });
        await respondToRequest(lastRequest('/record'), { status: 503, isInertia: false });
        expect(onHttpException).toHaveBeenCalledOnce();
        expect(onNetworkError).not.toHaveBeenCalled();
    });

    it('rejects an absent request rather than manufacturing a response', async () => {
        await expect(respondToRequest(undefined, { status: 200 })).rejects.toThrow(
            'Cannot respond to undefined request',
        );
    });

    it('does not dispatch an empty flash payload', async () => {
        pageFlash.notice = 'Previous response';
        const onFlash = vi.fn();
        const onSuccess = vi.fn();
        router.patch('/record', {}, { onFlash, onSuccess });
        await respondToRequest(lastRequest('/record'), { status: 200, flash: {} });
        expect(onFlash).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledOnce();
        expect(pageFlash).toEqual({});
    });

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
