import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    flashDomainError,
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

describe('flashDomainError channels', () => {
    beforeEach(() => resetInertia());

    it('fills both channels by default', async () => {
        await flashDomainError({ code: 'FORBIDDEN' });

        expect(pageFlash.domain_error).toEqual({ code: 'FORBIDDEN' });
        expect((pageProps.flash as { domain_error?: unknown }).domain_error).toEqual({ code: 'FORBIDDEN' });
    });

    it('fills only the page root when asked, so a props-only reader stays blind', async () => {
        await flashDomainError({ code: 'FORBIDDEN' }, 'page');

        expect(pageFlash.domain_error).toEqual({ code: 'FORBIDDEN' });
        expect(pageProps.flash).toBeUndefined();
    });

    it('fills only the shared props when asked, so a page-root reader stays blind', async () => {
        await flashDomainError({ code: 'FORBIDDEN' }, 'props');

        expect((pageProps.flash as { domain_error?: unknown }).domain_error).toEqual({ code: 'FORBIDDEN' });
        expect(pageFlash.domain_error).toBeUndefined();
    });
});

describe('useForm mirrors the real submit lifecycle', () => {
    beforeEach(() => resetInertia());

    it('populates form.errors from the response even when the caller passes no onError', async () => {
        const form = inertiaModule.useForm({ request_no: '' });
        form.post('/nscmf');

        await respondToRequest(lastRequest('/nscmf'), {
            status: 422,
            errors: { request_no: 'The request number is already taken.' },
        });

        // Real useForm wires this itself (@inertiajs/vue3 submit -> onError -> setError), which is
        // why Create.vue can read form.errors while passing no onError of its own.
        expect(form.errors).toEqual({ request_no: 'The request number is already taken.' });
    });

    it('clears stale errors when a later submit succeeds', async () => {
        const form = inertiaModule.useForm({ request_no: '' });

        form.post('/nscmf');
        await respondToRequest(lastRequest('/nscmf'), { status: 422, errors: { request_no: 'Taken.' } });
        expect(form.errors).toEqual({ request_no: 'Taken.' });

        form.post('/nscmf');
        await respondToRequest(lastRequest('/nscmf'), { status: 200 });

        expect(form.errors).toEqual({});
    });

    it('still hands the errors to a caller-supplied onError', async () => {
        const form = inertiaModule.useForm({ request_no: '' });
        const seen: unknown[] = [];
        form.post('/nscmf', { onError: (errors) => seen.push(errors) });

        await respondToRequest(lastRequest('/nscmf'), { status: 422, errors: { request_no: 'Taken.' } });

        expect(seen).toEqual([{ request_no: 'Taken.' }]);
    });
});

describe('useForm tracks processing across the request', () => {
    beforeEach(() => resetInertia());

    it('is processing from submit until the response finishes', async () => {
        const form = inertiaModule.useForm({ name: 'Alpha' });

        expect(form.processing).toBe(false);
        form.post('/administration/teams');
        // Real useForm sets processing on onStart, before the response arrives.
        expect(form.processing).toBe(true);

        await respondToRequest(lastRequest('/administration/teams'), { status: 200 });

        expect(form.processing).toBe(false);
    });

    it('stops processing after a failed response too', async () => {
        const form = inertiaModule.useForm({ name: '' });
        form.post('/administration/teams');

        await respondToRequest(lastRequest('/administration/teams'), {
            status: 422,
            errors: { name: 'The name field is required.' },
        });

        expect(form.processing).toBe(false);
    });
});
