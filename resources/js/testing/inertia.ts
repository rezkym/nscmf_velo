/**
 * Shared test double for `@inertiajs/vue3`.
 *
 * Usage in a test file:
 *   vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
 *   beforeEach(() => resetInertia({ auth: { permissions: ['teams.create'] } }));
 */
import { defineComponent, h, nextTick, reactive, toRaw } from 'vue';
import { type Mock, vi } from 'vitest';

type VisitOptions = {
    onSuccess?: (page?: unknown) => void;
    onError?: (errors: Record<string, string>) => void;
    onHttpException?: (response: {
        status: number;
        data?: unknown;
        headers?: Record<string, string>;
    }) => boolean | void;
    onFlash?: (flash: unknown) => void;
    onNetworkError?: (error: Error) => boolean | void;
    onFinish?: () => void;
    [key: string]: unknown;
};

type RequestMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type FormSubmit = Mock<(url: string, options?: VisitOptions) => void>;

export interface MockForm {
    [field: string]: unknown;
    processing: boolean;
    errors: Record<string, string>;
    get: FormSubmit;
    post: FormSubmit;
    put: FormSubmit;
    patch: FormSubmit;
    delete: FormSubmit;
    reset: Mock<(...fields: string[]) => void>;
    clearErrors: Mock<() => void>;
    setError: Mock<(field: string, message: string) => void>;
}

export interface RecordedRequest {
    method: RequestMethod;
    url: string;
    data: Record<string, unknown>;
    options: VisitOptions;
}

export const pageProps = reactive<Record<string, unknown>>({});
export const pageFlash = reactive<Record<string, unknown>>({});
export const forms: MockForm[] = [];
export const requests: RecordedRequest[] = [];

function recordRouterCall(method: RequestMethod) {
    return vi.fn((url: string, data: Record<string, unknown> = {}, options: VisitOptions = {}) => {
        requests.push({ method, url, data, options });
    });
}

export const router = {
    get: recordRouterCall('get'),
    post: recordRouterCall('post'),
    put: recordRouterCall('put'),
    patch: recordRouterCall('patch'),
    delete: recordRouterCall('delete'),
    visit: vi.fn(),
    reload: vi.fn(),
};

function createForm(initial: Record<string, unknown>): MockForm {
    const defaults = structuredClone(initial);
    const form = reactive({
        ...structuredClone(initial),
        processing: false,
        errors: {},
    }) as MockForm;

    function data(): Record<string, unknown> {
        return Object.fromEntries(Object.keys(defaults).map((key) => [key, structuredClone(toRaw(form[key]))]));
    }

    /**
     * Real useForm wraps the caller's options and maintains the form itself before handing over:
     * on error it does clearErrors().setError(errors), on success it clears them
     * (@inertiajs/vue3 submit). A component can therefore read form.errors without supplying an
     * onError of its own, and the double has to do the same or that path is never exercised.
     */
    function withFormLifecycle(options: VisitOptions): VisitOptions {
        return {
            ...options,
            onError: (errors) => {
                form.errors = { ...errors };
                options.onError?.(errors);
            },
            onSuccess: (page) => {
                form.errors = {};
                options.onSuccess?.(page);
            },
            onFinish: () => {
                form.processing = false;
                options.onFinish?.();
            },
        };
    }

    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        form[method] = vi.fn((url: string, options: VisitOptions = {}) => {
            // Real useForm flips processing on onStart, which happens as the request is sent.
            form.processing = true;
            requests.push({ method, url, data: data(), options: withFormLifecycle(options) });
        });
    }
    form.reset = vi.fn((...fields: string[]) => {
        for (const key of fields.length > 0 ? fields : Object.keys(defaults)) {
            form[key] = structuredClone(defaults[key]);
        }
    });
    form.clearErrors = vi.fn(() => {
        form.errors = {};
    });
    // Mirrors useForm().setError(field, message) from @inertiajs/vue3.
    form.setError = vi.fn((field: string, message: string) => {
        form.errors = { ...form.errors, [field]: message };
    });

    forms.push(form);
    return form;
}

export const inertiaModule = {
    Head: defineComponent({ name: 'InertiaHead', props: { title: String }, setup: () => () => null }),
    Link: defineComponent({
        name: 'InertiaLink',
        props: { href: { type: String, required: true } },
        setup:
            (props, { slots }) =>
            () =>
                h('a', { href: props.href }, slots.default?.()),
    }),
    router,
    useForm: (initial: Record<string, unknown>) => createForm(initial),
    // Real Inertia pages always carry their URL; the shell reads it to mark the current link.
    usePage: () => ({ props: pageProps, flash: pageFlash, url: '/' }),
};

export function resetInertia(props: Record<string, unknown> = {}, flash: Record<string, unknown> = {}): void {
    for (const key of Object.keys(pageProps)) delete pageProps[key];
    for (const key of Object.keys(pageFlash)) delete pageFlash[key];
    Object.assign(pageProps, props);
    Object.assign(pageFlash, flash);
    forms.length = 0;
    requests.length = 0;
    vi.clearAllMocks();
}

/**
 * Which flash channel a response arrives on. The installed @inertiajs/core carries flash at
 * `Page.flash`, but a Laravel application may also share a `flash` prop, and no NSCMF response
 * exists yet to settle it (gap G02). Filling both by default would hide a component that reads
 * only one, so a test can name a single channel and prove that channel on its own.
 */
export type FlashChannel = 'page' | 'props' | 'both';

/** Simulates the server flashing a domain error (12 §10) and the page rendering the new props. */
export async function flashDomainError(
    error: { code?: string; message?: string },
    channel: FlashChannel = 'both',
): Promise<void> {
    if (channel !== 'page') {
        pageProps.flash = { ...(pageProps.flash as Record<string, unknown> | undefined), domain_error: error };
    }
    if (channel !== 'props') {
        pageFlash.domain_error = error;
    }
    await nextTick();
}

/**
 * Dispatches an Inertia response through the recorded request's callbacks,
 * Models ordinary responses, not redirects or transport failures.
 * HTTP exception cancellation stops page processing. Otherwise an Inertia
 * page dispatches flash followed by field errors or success, then finish.
 * A received non-Inertia HTTP response is not a network failure.
 */
export async function respondToRequest(
    request: RecordedRequest | undefined,
    response: {
        status: number;
        isInertia?: boolean;
        data?: Record<string, unknown>;
        props?: Record<string, unknown>;
        flash?: Record<string, unknown>;
        errors?: Record<string, string>;
    },
): Promise<void> {
    if (!request) throw new Error('Cannot respond to undefined request');
    const { status, isInertia = true, data, props = {}, flash, errors } = response;
    const headers: Record<string, string> = isInertia ? { 'x-inertia': 'true' } : {};
    const httpResponse = {
        status,
        data: data ?? (isInertia ? { props, flash } : {}),
        headers,
    };

    // A response without the x-inertia header never becomes a page, whatever its status: real
    // Inertia sends it to handleNonInertiaResponse, which always calls onHttpException. The
    // expired-session redirect to a 200 login page is exactly this case.
    if (!isInertia || status >= 400) {
        const handled = request.options.onHttpException?.(httpResponse);
        if (!isInertia || handled === false) {
            request.options.onFinish?.();
            await nextTick();
            return;
        }
    }

    // Only an Inertia page reaches here; a headerless response already returned above.
    // Real Inertia replaces the whole page on every navigation (CurrentPage.set), so flash
    // never survives into the next response. Anything sticky here would hide a stale message.
    for (const key of Object.keys(pageFlash)) delete pageFlash[key];
    delete pageProps.flash;
    if (flash) {
        Object.assign(pageFlash, flash);
        if (Object.keys(flash).length > 0) request.options.onFlash?.(flash);
    }

    // Props are merged rather than replaced. Real Inertia replaces them, but a real response
    // also carries every shared prop, while these fixtures supply only what a test cares
    // about. Replacing would force `auth` into every fixture and catch no frontend defect.
    Object.assign(pageProps, props);
    if (errors && Object.keys(errors).length > 0) {
        request.options.onError?.(errors);
    } else {
        // onSuccess is handed a page, not a bag of props. `component` and `version` are not
        // modelled because the double has no honest value for them.
        request.options.onSuccess?.({ props: { ...pageProps, ...props }, flash, url: request.url });
    }

    request.options.onFinish?.();
    await nextTick();
}

/** The most recent request whose URL matches, or undefined. */
export function lastRequest(url: string | RegExp): RecordedRequest | undefined {
    return [...requests]
        .reverse()
        .find((request) => (typeof url === 'string' ? request.url === url : url.test(request.url)));
}
