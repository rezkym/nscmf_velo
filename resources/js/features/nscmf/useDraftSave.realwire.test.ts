import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { http, router } from '@inertiajs/vue3';
import { useDraftSave } from './useDraftSave';
import type { ActivationDraftFields } from './types';

interface FakeXHRRequest {
    method: string;
    url: string;
    requestHeaders: Record<string, string>;
    body: string | null;
    respond: (status: number, headers: Record<string, string>, body: string) => void;
    error: () => void;
}

let capturedRequests: FakeXHRRequest[] = [];

class FakeXHR {
    public method = '';
    public url = '';
    public requestHeaders: Record<string, string> = {};
    public responseText = '';
    public status = 0;
    public statusText = '';
    public responseHeaders: Record<string, string> = {};
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public onabort: (() => void) | null = null;
    public upload = { onprogress: null };

    open(method: string, url: string) {
        this.method = method;
        this.url = url;
    }

    setRequestHeader(header: string, value: string) {
        this.requestHeaders[header.toLowerCase()] = value;
    }

    getResponseHeader(header: string) {
        return this.responseHeaders[header.toLowerCase()] ?? null;
    }

    getAllResponseHeaders() {
        return Object.entries(this.responseHeaders)
            .map(([k, v]) => `${k}: ${v}\r\n`)
            .join('');
    }

    send(body: string | null = null) {
        const req: FakeXHRRequest = {
            method: this.method,
            url: this.url,
            requestHeaders: this.requestHeaders,
            body,
            respond: (status: number, headers: Record<string, string>, responseBody: string) => {
                this.status = status;
                this.statusText = status === 200 ? 'OK' : status === 409 ? 'Conflict' : 'Error';
                this.responseHeaders = Object.fromEntries(
                    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
                );
                this.responseText = responseBody;
                this.onload?.();
            },
            error: () => {
                this.onerror?.();
            },
        };
        capturedRequests.push(req);
    }

    abort() {
        this.onabort?.();
    }
}

async function waitForRequest(): Promise<FakeXHRRequest> {
    for (let i = 0; i < 50; i++) {
        if (capturedRequests.length > 0) {
            return capturedRequests[capturedRequests.length - 1]!;
        }
        await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('Timeout waiting for request');
}

async function waitForRequestCount(count: number): Promise<void> {
    for (let i = 0; i < 50; i++) {
        if (capturedRequests.length >= count) {
            return;
        }
        await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error(`Timeout waiting for ${count} requests; got ${capturedRequests.length}`);
}

describe('useDraftSave real wire tests (B-27-5..B-27-9)', () => {
    const OriginalXMLHttpRequest = globalThis.XMLHttpRequest;

    beforeEach(() => {
        capturedRequests = [];
        vi.stubGlobal('XMLHttpRequest', FakeXHR);
        http.setClient({});
        document.cookie = 'XSRF-TOKEN=probe-csrf-token; path=/';

        // jsdom does not implement HTMLDialogElement.prototype.showModal
        if (!HTMLDialogElement.prototype.showModal) {
            HTMLDialogElement.prototype.showModal = function () {};
        }
        if (!HTMLDialogElement.prototype.close) {
            HTMLDialogElement.prototype.close = function () {};
        }

        // Initialize Inertia router page state so router.visit/patch can read currentPageUrl
        router.init({
            initialPage: {
                component: 'Nscmf/Show',
                props: { errors: {} },
                url: '/nscmf/42/edit',
                version: '1',
                flash: {},
                rescuedProps: [],
                rememberedState: {},
            },
            resolveComponent: () => ({ name: 'Test' }),
            swapComponent: async () => {},
        });
    });

    afterEach(() => {
        globalThis.XMLHttpRequest = OriginalXMLHttpRequest;
    });

    it('B-27-5: recognizes 409 conflict delivered via page-root flash in real Inertia response', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
            autosaveInterval: 3000,
        });

        const savePromise = draft.save();
        const req = await waitForRequest();
        expect(capturedRequests.length).toBe(1);

        // Real 409 + x-inertia + flash at root
        const responseBody = JSON.stringify({
            component: 'Nscmf/Show',
            props: {
                errors: {},
                record: { id: 42, record_version: 9 },
            },
            url: '/nscmf/42/draft',
            version: '1',
            flash: {
                domain_error: {
                    code: 'NSCMF_VERSION_CONFLICT',
                    message: 'A newer version of this record exists.',
                },
            },
        });

        req.respond(409, { 'x-inertia': 'true', 'content-type': 'application/json' }, responseBody);
        await savePromise;

        expect(draft.isConflict.value).toBe(true);
        expect(draft.conflictError.value).toMatchObject({
            status: 409,
            code: 'NSCMF_VERSION_CONFLICT',
            message: 'A newer version of this record exists.',
        });
        expect(draft.saveStatus.value).toBe('error');
        // currentVersion MUST NOT advance to 9 on conflict
        expect(draft.currentVersion.value).toBe(8);

        // B-27-9: Typing after conflict must NOT schedule another save
        fields.value.customer_name = 'PT Additional Typing';
        await new Promise((r) => setTimeout(r, 50));
        expect(capturedRequests.length).toBe(1);
    });

    it('B-27-6: recognizes 422 validation failure delivered via 12 §9 JSON envelope without x-inertia', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
        });

        const savePromise = draft.save();
        const req = await waitForRequest();
        expect(capturedRequests.length).toBe(1);

        // 422 + application/json (no x-inertia header)
        const responseBody = JSON.stringify({
            code: 'VALIDATION_FAILED',
            message: 'Some fields need to be corrected.',
            errors: {
                'change.service_impacts': ['Select at least one Service Impact.'],
            },
            context: {},
        });

        req.respond(422, { 'content-type': 'application/json' }, responseBody);
        await savePromise;

        expect(draft.saveStatus.value).toBe('error');
        expect(draft.validationErrors.value).toMatchObject({
            'change.service_impacts': ['Select at least one Service Impact.'],
        });
        expect(draft.feedbackError.value).toMatchObject({
            status: 422,
            code: 'VALIDATION_FAILED',
        });
    });

    it('B-27-7: ensures single-flight serialization and does not clear isSaving prematurely when queued request dispatches', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'Initial 1',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
            autosaveInterval: 50,
        });

        // Trigger first save
        const p1 = draft.save();
        const req1 = await waitForRequest();
        expect(capturedRequests.length).toBe(1);
        expect(draft.isSaving.value).toBe(true);

        // While request 1 is in-flight, mutate and queue save 2
        fields.value.customer_name = 'Initial 2';
        const p2 = draft.save();
        expect(capturedRequests.length).toBe(1); // queued, not dispatched yet

        // Respond to request 1
        req1.respond(
            200,
            { 'x-inertia': 'true', 'content-type': 'application/json' },
            JSON.stringify({
                component: 'Nscmf/Show',
                props: { record: { id: 42, record_version: 9 } },
                url: '/nscmf/42/draft',
                version: '1',
            }),
        );
        await p1;

        // Request 2 should now be in-flight
        await waitForRequestCount(2);
        expect(capturedRequests.length).toBe(2);
        // Crucial B-27-7 fix: isSaving MUST remain true while request 2 is in flight
        expect(draft.isSaving.value).toBe(true);

        // An autosave tick while request 2 is in-flight must NOT dispatch a 3rd request
        await new Promise((r) => setTimeout(r, 100));
        expect(capturedRequests.length).toBe(2);

        // Respond to request 2
        const req2 = capturedRequests[1]!;
        req2.respond(
            200,
            { 'x-inertia': 'true', 'content-type': 'application/json' },
            JSON.stringify({
                component: 'Nscmf/Show',
                props: { record: { id: 42, record_version: 10 } },
                url: '/nscmf/42/draft',
                version: '1',
            }),
        );
        await p2;

        expect(draft.isSaving.value).toBe(false);
        expect(draft.currentVersion.value).toBe(10);
    });

    it('B-27-8: parses context.latest_record_version from 409 JSON envelope and re-syncs version via resolveConflict()', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
        });

        const savePromise = draft.save();
        const req = await waitForRequest();
        expect(capturedRequests.length).toBe(1);

        // 409 JSON envelope with context.latest_record_version
        const responseBody = JSON.stringify({
            code: 'NSCMF_VERSION_CONFLICT',
            message: 'A newer version of this record exists. Refresh the record before saving again.',
            errors: {},
            context: {
                latest_record_version: 14,
                current_business_status: 'PENDING_REVIEW',
            },
        });

        req.respond(409, { 'content-type': 'application/json' }, responseBody);
        await savePromise;

        expect(draft.isConflict.value).toBe(true);
        expect(draft.conflictError.value?.context?.latest_record_version).toBe(14);
        expect(draft.currentVersion.value).toBe(8);

        // Calling resolveConflict() without arguments re-syncs from context.latest_record_version
        draft.resolveConflict();
        expect(draft.isConflict.value).toBe(false);
        expect(draft.currentVersion.value).toBe(14);
    });

    it('B-27-10: 422 with x-inertia surfaces validationErrors without being suppressed by onHttpException return false', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
        });

        const savePromise = draft.save();
        const req = await waitForRequest();
        expect(capturedRequests.length).toBe(1);

        // 422 response with x-inertia header and field errors in props.errors
        const responseBody = JSON.stringify({
            component: 'Nscmf/Show',
            props: {
                errors: {
                    customer_name: 'Customer name is invalid',
                },
                record: { id: 42, record_version: 8 },
            },
            url: '/nscmf/42/draft',
            version: '1',
            flash: {},
        });

        req.respond(422, { 'x-inertia': 'true', 'content-type': 'application/json' }, responseBody);
        await new Promise((r) => setTimeout(r, 50));
        await savePromise;

        expect(draft.saveStatus.value).toBe('error');
        expect(draft.validationErrors.value).toEqual({
            customer_name: 'Customer name is invalid',
        });
        expect(draft.feedbackError.value).toMatchObject({
            status: 422,
            code: 'NSCMF_VALIDATION_FAILED',
            errors: {
                customer_name: 'Customer name is invalid',
            },
        });
    });

    it('B-27-10: 500 error does not return false from onHttpException and preserves global httpException event', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 8,
            fields,
        });

        let globalHttpExceptionFired = false;
        const removeListener = router.on('httpException', () => {
            globalHttpExceptionFired = true;
        });

        try {
            const savePromise = draft.save();
            const req = await waitForRequest();
            expect(capturedRequests.length).toBe(1);

            req.respond(500, { 'content-type': 'text/html' }, 'Internal Server Error');
            await savePromise;

            expect(draft.saveStatus.value).toBe('error');
            expect(globalHttpExceptionFired).toBe(true);
        } finally {
            removeListener();
        }
    });

    it('N-R3-1: non-2xx x-inertia response does not fall through to onSuccess (status 500, 401, 403, 503)', async () => {
        const testStatuses = [
            { status: 500, statusText: 'Internal Server Error' },
            { status: 401, statusText: 'Unauthorized' },
            { status: 403, statusText: 'Forbidden' },
            { status: 503, statusText: 'Service Unavailable' },
        ];

        for (let i = 0; i < testStatuses.length; i++) {
            const { status } = testStatuses[i]!;
            const fields = ref<ActivationDraftFields>({
                customer_name: `PT Client ${status}`,
            });

            const draft = useDraftSave({
                recordId: 42,
                family: 'ACTIVATION',
                recordVersion: 8,
                fields,
            });

            // Mutate fields so draft is dirty before saving
            fields.value.customer_name = `PT Modified Client ${status}`;
            expect(draft.isDirty.value).toBe(true);

            const initialReqCount = capturedRequests.length;
            const savePromise = draft.save();
            await waitForRequestCount(initialReqCount + 1);
            const req = capturedRequests[capturedRequests.length - 1]!;

            // Non-2xx + x-inertia with record prop bumping record_version to 99
            const responseBody = JSON.stringify({
                component: 'Error',
                props: {
                    errors: {},
                    record: { id: 42, record_version: 99 },
                },
                url: '/nscmf/42/draft',
                version: '1',
            });

            req.respond(status, { 'x-inertia': 'true', 'content-type': 'application/json' }, responseBody);
            await savePromise;

            expect(draft.saveStatus.value).toBe('error');
            expect(draft.isDirty.value).toBe(true);
            expect(draft.currentVersion.value).toBe(8);
            expect(draft.isSaving.value).toBe(false);

            // Retry must still dispatch
            const retryPromise = draft.retry();
            await waitForRequestCount(initialReqCount + 2);
            const req2 = capturedRequests[capturedRequests.length - 1]!;
            req2.respond(
                200,
                { 'x-inertia': 'true', 'content-type': 'application/json' },
                JSON.stringify({
                    component: 'Nscmf/Show',
                    props: { record: { id: 42, record_version: 9 } },
                    url: '/nscmf/42/draft',
                    version: '1',
                }),
            );
            await retryPromise;
            expect(draft.saveStatus.value).toBe('saved');
            expect(draft.currentVersion.value).toBe(9);
        }
    });

    it('B-27-11: payload-build throw does not wedge the hook (resets isSaving and inFlightCount)', async () => {
        const fields = ref<ActivationDraftFields>({
            customer_name: 'PT Initial Client',
        });

        // recordVersion 0 violates positive integer requirement in buildActivationDraftPayload
        const draft = useDraftSave({
            recordId: 42,
            family: 'ACTIVATION',
            recordVersion: 0,
            fields,
        });

        expect(draft.isSaving.value).toBe(false);

        // Attempting to save will throw inside buildPayload
        await expect(draft.save()).rejects.toThrow(/record_version/);

        // Crucial B-27-11 fix: Hook must NOT be wedged!
        expect(draft.isSaving.value).toBe(false);
        expect(draft.saveStatus.value).toBe('error');

        // Now fix version to a valid integer; next save must be able to dispatch
        draft.currentVersion.value = 8;
        const savePromise = draft.save();
        const req = await waitForRequest();
        expect(capturedRequests.length).toBe(1);

        req.respond(
            200,
            { 'x-inertia': 'true', 'content-type': 'application/json' },
            JSON.stringify({
                component: 'Nscmf/Show',
                props: { record: { id: 42, record_version: 9 } },
                url: '/nscmf/42/draft',
                version: '1',
            }),
        );
        await savePromise;

        expect(draft.isSaving.value).toBe(false);
        expect(draft.currentVersion.value).toBe(9);
    });
});
