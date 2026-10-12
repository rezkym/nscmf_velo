import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import ActivityLogExports from './ActivityLogExports.vue';
import type { LogExportJob } from './types';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

enableAutoUnmount(afterEach);
const fetchMock = vi.fn();

function job(status: LogExportJob['status'], extra: Partial<LogExportJob> = {}): LogExportJob {
    return {
        id: 7,
        format: 'PDF',
        status,
        progress_percent: 0,
        stage: status === 'PROCESSING' ? 'FILLING' : status,
        entry_count: 29,
        requested_at: '2026-09-01T03:00:00+00:00',
        ready_at: null,
        expires_at: null,
        failure_code: null,
        download_url: status === 'READY' ? '/reports/activity-log/exports/7/download' : null,
        ...extra,
    };
}

function respond(body: unknown, status = 200): void {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.view.history', 'nscmf.export'] } });
});

describe('Activity Log export progress (07 §34.2)', () => {
    it('lists recent exports and follows a running one to READY with a visible percentage', async () => {
        respond({ data: [job('PROCESSING', { progress_percent: 45 })] });
        respond({ data: job('PROCESSING', { progress_percent: 70, stage: 'RENDERING' }) });
        respond({ data: job('READY', { progress_percent: 100, expires_at: '2026-09-08T03:00:00+00:00' }) });

        const navigate = vi.fn();
        const wrapper = mount(ActivityLogExports, { props: { pollMs: 0, navigate } });
        await flushPromises();
        const bar = () => wrapper.get('[data-testid="log-export-7"] [role="progressbar"]');

        await vi.waitFor(() => expect(wrapper.get('[data-testid="log-export-7"]').text()).toContain('Ready'));
        expect(bar().attributes('aria-valuenow')).toBe('100');
        expect(wrapper.get('[data-testid="log-export-7"]').text()).toContain('100%');
        expect(wrapper.get('[data-testid="log-export-7"]').text()).toContain('29 entries');

        respond({ data: job('READY', { progress_percent: 100 }) });
        await wrapper.get('[data-testid="log-export-download-7"]').trigger('click');
        await flushPromises();
        expect(navigate).toHaveBeenCalledWith('/reports/activity-log/exports/7/download');
    });

    it('shows the stage in words with the percentage while running', async () => {
        respond({ data: [] });
        const wrapper = mount(ActivityLogExports, { props: { pollMs: 60_000 } });
        await flushPromises();

        (wrapper.vm as unknown as { track: (job: LogExportJob) => void }).track(job('PROCESSING', { progress_percent: 45 }));
        await flushPromises();

        const text = wrapper.get('[data-testid="log-export-7"]').text();
        expect(text).toContain('Filling the workbook');
        expect(text).toContain('45%');
        expect(wrapper.get('[data-testid="log-export-7"] [role="progressbar"]').attributes('aria-valuenow')).toBe('45');
    });

    it('explains a failed export without showing its code', async () => {
        respond({ data: [job('FAILED', { failure_code: 'REPORT_RENDER_FAILED' })] });
        const wrapper = mount(ActivityLogExports, { props: { pollMs: 0 } });
        await flushPromises();

        const text = wrapper.get('[data-testid="log-export-7"]').text();
        expect(text).toContain('The report could not be generated. Request a new export.');
        expect(text).not.toContain('REPORT_RENDER_FAILED');
    });
});
