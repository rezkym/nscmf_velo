import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import ExportPanel from './ExportPanel.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const fetchMock = vi.fn();
const navigate = vi.fn();

function job(overrides: Record<string, unknown> = {}) {
    return {
        id: 31,
        record_id: 5,
        format: 'XLSX',
        status: 'QUEUED',
        requested_at: '2026-09-24T01:00:00+00:00',
        ready_at: null,
        expires_at: null,
        failure_code: null,
        signed: false,
        download_url: null,
        ...overrides,
    };
}

function respond(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function mountPanel(props: Record<string, unknown> = {}) {
    return mount(ExportPanel, {
        props: {
            recordId: 5,
            businessStatus: 'DRAFT',
            approvedBy: null,
            pollMs: 0,
            navigate,
            ...props,
        },
    });
}

function calls(): [string, string][] {
    return fetchMock.mock.calls.map(([url, init]) => [(init as RequestInit).method ?? 'GET', String(url)]);
}

beforeEach(() => {
    fetchMock.mockReset();
    navigate.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.view', 'nscmf.export'] } });
});
enableAutoUnmount(afterEach);
afterEach(() => vi.unstubAllGlobals());

describe('Export request (FE-44)', () => {
    it('AC1/AC2: posts only the chosen format and shows Queued, not a download', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        respond(202, { data: job() });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/nscmf/5/exports');
        expect(JSON.parse(init.body as string)).toEqual({ format: 'XLSX' });
        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Queued');
        expect(wrapper.find('[data-testid="export-download-31"]').exists()).toBe(false);
        expect(wrapper.text()).not.toMatch(/CSV|HTML/);
    });

    it('AC1: a double click sends one request', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-PDF"]').trigger('click');
        await wrapper.get('[data-testid="export-PDF"]').trigger('click');

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('AC3: a job keeps the request time the server bound it to', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        respond(202, { data: job() });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();
        await wrapper.setProps({ businessStatus: 'PENDING_REVIEW' });

        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Requested 2026-09-24 08:00 WIB');
    });

    it('AC3: a job shows the record version and iteration it was bound to, even after the record moves on', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        respond(202, { data: job({ snapshot: { record_version: 8, iteration_no: 2, template: 'NSCMF-Form-3.0' } }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();
        await wrapper.setProps({ businessStatus: 'APPROVED' });

        const row = wrapper.get('[data-testid="export-job-31"]').text();
        expect(row).toContain('Version 8');
        expect(row).toContain('iteration 2');
        expect(row).toContain('NSCMF-Form-3.0');
    });

    it('AC3: shows no snapshot context the server did not send', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        respond(202, { data: job({ snapshot: null }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="export-job-31"]').text()).not.toMatch(/version|iteration/i);
    });

    it('AC4/AC5: an unavailable capability or a denial is explained and gives no file', async () => {
        const wrapper = mountPanel({ businessStatus: 'APPROVED' });
        respond(409, { code: 'SIGNING_NOT_READY', message: 'Approved PDFs cannot be signed right now.' });
        await wrapper.get('[data-testid="export-PDF"]').trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('Approved PDFs cannot be signed right now.');

        respond(403, { code: 'FORBIDDEN', message: 'Forbidden.' });
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('You do not have access to export this record.');
        expect(wrapper.find('[data-testid^="export-download-"]').exists()).toBe(false);
    });

    it('is hidden without the export permission', () => {
        resetInertia({ auth: { permissions: ['nscmf.view'] } });

        expect(mountPanel().find('[data-testid="export-XLSX"]').exists()).toBe(false);
    });
});

describe('Export status (FE-45)', () => {
    it('AC1/AC2: follows the job to READY and shows the server expiry in Jakarta time', async () => {
        respond(202, { data: job() });
        respond(200, { data: job({ status: 'PROCESSING' }) });
        respond(200, {
            data: job({
                status: 'READY',
                ready_at: '2026-09-24T01:01:00+00:00',
                expires_at: '2026-10-01T01:01:00+00:00',
                download_url: '/nscmf/exports/31/download',
            }),
        });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await vi.waitFor(() => expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Ready'));

        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Available until 2026-10-01 08:01 WIB');
        expect(calls()).toEqual([
            ['POST', '/nscmf/5/exports'],
            ['GET', '/nscmf/exports/31'],
            ['GET', '/nscmf/exports/31'],
        ]);
    });

    it('AC1/AC5: the download is re-checked and an expired job loses its link', async () => {
        respond(202, { data: job({ status: 'READY', download_url: '/nscmf/exports/31/download' }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();

        respond(200, { data: job({ status: 'READY', download_url: '/nscmf/exports/31/download' }) });
        await wrapper.get('[data-testid="export-download-31"]').trigger('click');
        await flushPromises();
        expect(navigate).toHaveBeenCalledWith('/nscmf/exports/31/download');

        navigate.mockReset();
        respond(410, { code: 'EXPORT_EXPIRED', message: 'This export expired.' });
        await wrapper.get('[data-testid="export-download-31"]').trigger('click');
        await flushPromises();
        expect(navigate).not.toHaveBeenCalled();
        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Expired');
        expect(wrapper.find('[data-testid="export-download-31"]').exists()).toBe(false);
    });

    it('AC3: exporting again is a new request; the earlier job stays as it was', async () => {
        respond(202, { data: job({ status: 'READY', download_url: '/nscmf/exports/31/download' }) });
        respond(202, { data: job({ id: 32 }) });
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Ready');
        expect(wrapper.get('[data-testid="export-job-32"]').text()).toContain('Queued');
    });

    it('AC4: a late non-terminal response never replaces a terminal state', async () => {
        respond(202, { data: job() });
        respond(200, { data: job({ status: 'FAILED', failure_code: 'RENDER_FAILED' }) });
        respond(200, { data: job({ status: 'PROCESSING' }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await vi.waitFor(() => expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Failed'));
        await flushPromises();

        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Failed');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('AC4: a late PROCESSING answer to the download re-check leaves the settled job as it was', async () => {
        respond(202, { data: job({ status: 'READY', download_url: '/nscmf/exports/31/download' }) });
        respond(200, { data: job({ status: 'PROCESSING' }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();
        await wrapper.get('[data-testid="export-download-31"]').trigger('click');
        await flushPromises();

        expect(navigate).not.toHaveBeenCalled();
        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain('Ready');
        expect(wrapper.get('[data-testid="export-job-31"]').text()).not.toContain('Processing');
    });

    it('stops polling when unmounted', async () => {
        fetchMock.mockImplementation(() =>
            Promise.resolve(
                new Response(JSON.stringify({ data: job({ status: 'PROCESSING' }) }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
            ),
        );
        const wrapper = mountPanel({ pollMs: 5 });
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
        wrapper.unmount();
        const count = fetchMock.mock.calls.length;
        await new Promise((resolve) => setTimeout(resolve, 30));

        expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(count + 1);
    });
});

describe('Approved PDF trust (FE-47)', () => {
    it('AC1/AC3: keeps the human approver apart from the Organization signature, shown only from server evidence', async () => {
        const wrapper = mountPanel({ businessStatus: 'APPROVED', approvedBy: 'Demo Approver' });
        expect(wrapper.text()).toContain('Approved by Demo Approver');
        expect(wrapper.text()).not.toMatch(/signed by/i);

        respond(202, {
            data: job({ format: 'PDF', status: 'READY', signed: true, download_url: '/nscmf/exports/31/download' }),
        });
        await wrapper.get('[data-testid="export-PDF"]').trigger('click');
        await flushPromises();
        const text = wrapper.get('[data-testid="export-job-31"]').text();
        expect(text).toContain('Signed with the NSCMF Organization certificate');
        expect(text).not.toContain('Demo Approver');
        expect(wrapper.get('a[href="/ispdfvalid"]').text()).toContain('Verify a PDF');
    });

    it('AC2: a failed signing gives no file and the NSCMF stays Approved', async () => {
        respond(202, { data: job({ format: 'PDF', status: 'FAILED', failure_code: 'SIGNING_FAILED' }) });
        const wrapper = mountPanel({ businessStatus: 'APPROVED', approvedBy: 'Demo Approver' });
        await wrapper.get('[data-testid="export-PDF"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="export-job-31"]').text()).toContain(
            'The PDF could not be signed, so no file was issued. The NSCMF stays Approved.',
        );
        expect(wrapper.find('[data-testid="export-download-31"]').exists()).toBe(false);
    });

    it('AC4: never shows a raw failure code beyond a safe message', async () => {
        respond(202, { data: job({ status: 'FAILED', failure_code: '/var/keys/org.p12 passphrase wrong' }) });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="export-XLSX"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).not.toContain('/var/keys');
        expect(wrapper.text()).toContain('The export could not be generated.');
    });
});
