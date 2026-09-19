/**
 * Shared test double for `@inertiajs/vue3`.
 *
 * Usage in a test file:
 *   vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
 *   beforeEach(() => resetInertia({ auth: { permissions: ['teams.create'] } }));
 */
import { defineComponent, h, reactive, toRaw } from 'vue';
import { type Mock, vi } from 'vitest';

type VisitOptions = {
    onSuccess?: (page?: unknown) => void;
    onError?: (errors: Record<string, string>) => void;
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
}

export interface RecordedRequest {
    method: RequestMethod;
    url: string;
    data: Record<string, unknown>;
    options: VisitOptions;
}

export const pageProps = reactive<Record<string, unknown>>({});
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

    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        form[method] = vi.fn((url: string, options: VisitOptions = {}) => {
            requests.push({ method, url, data: data(), options });
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
    usePage: () => ({ props: pageProps }),
};

export function resetInertia(props: Record<string, unknown> = {}): void {
    for (const key of Object.keys(pageProps)) delete pageProps[key];
    Object.assign(pageProps, props);
    forms.length = 0;
    requests.length = 0;
    vi.clearAllMocks();
}

/** The most recent request whose URL matches, or undefined. */
export function lastRequest(url: string | RegExp): RecordedRequest | undefined {
    return [...requests]
        .reverse()
        .find((request) => (typeof url === 'string' ? request.url === url : url.test(request.url)));
}
