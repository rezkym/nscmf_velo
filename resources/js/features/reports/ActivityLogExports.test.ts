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
        download_url: status === 'READY' ? `/reports/activity-log/exports/${extra.id ?? 7}/download` : null,
        ...extra,
    };
}

function respond(body: unknown, status = 200): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

type Exposed = { track: (job: LogExportJob) => void; activeCount: number };

function mountExports(props: Record<string, unknown> = {}) {
    return mount(ActivityLogExports, { props: { pollMs: 0, ...props }, attachTo: document.body });
}

const panel = () => document.body.querySelector<HTMLElement>('[data-testid="log-exports-panel"]');
const panelRow = (id: number) => document.body.querySelector<HTMLElement>(`[data-testid="log-export-${id}"]`);

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.view.history', 'nscmf.export'] } });
});

describe('Activity Log exports panel (07 §34.2)', () => {
    it('lists every retained export in the side panel, newest first, and follows a running one to READY', async () => {
        respond({ data: [job('PROCESSING', { progress_percent: 45 }), job('READY', { id: 6, progress_percent: 100 })] });
        respond({ data: job('PROCESSING', { progress_percent: 70, stage: 'RENDERING' }) });
        respond({ data: job('READY', { progress_percent: 100, expires_at: '2026-09-08T03:00:00+00:00' }) });

        const navigate = vi.fn();
        mountExports({ navigate, panelOpen: true });
        await flushPromises();

        expect(panel()?.textContent).toContain('Files are kept for 7 days.');
        await vi.waitFor(() => expect(panelRow(7)?.textContent).toContain('Ready'));
        const ids = [...panel()!.querySelectorAll('[data-testid^="log-export-"][data-export-id]')].map((row) =>
            row.getAttribute('data-export-id'),
        );
        expect(ids).toEqual(['7', '6']);
        expect(panelRow(7)?.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
        expect(panelRow(7)?.textContent).toContain('100%');
        expect(panelRow(7)?.textContent).toContain('29 entries');

        respond({ data: job('READY', { progress_percent: 100 }) });
        panelRow(7)!.querySelector<HTMLButtonElement>('[data-testid="log-export-download-7"]')!.click();
        await flushPromises();
        expect(navigate).toHaveBeenCalledWith('/reports/activity-log/exports/7/download');
    });

    it('keeps the page clean: only the latest export is shown, as one strip with its stage and percentage', async () => {
        respond({ data: [] });
        const wrapper = mountExports({ pollMs: 60_000 });
        await flushPromises();
        expect(wrapper.find('[data-testid="log-export-latest"]').exists()).toBe(false);

        const exposed = wrapper.vm as unknown as Exposed;
        exposed.track(job('PROCESSING', { progress_percent: 45 }));
        await flushPromises();
        let strip = wrapper.get('[data-testid="log-export-latest"]');
        expect(strip.text()).toContain('Filling the workbook');
        expect(strip.text()).toContain('45%');
        expect(strip.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('45');

        exposed.track(job('QUEUED', { id: 8, format: 'XLSX', entry_count: 3 }));
        await flushPromises();
        expect(wrapper.findAll('[data-testid="log-export-latest"]')).toHaveLength(1);
        strip = wrapper.get('[data-testid="log-export-latest"]');
        expect(strip.text()).toContain('XLSX · 3 entries');
        expect(strip.text()).toContain('Queued');
        expect(exposed.activeCount).toBe(2);
        expect(panel()).toBeNull();
    });

    it('spotlights the newest running export when the page opens, but never a settled one', async () => {
        respond({ data: [job('READY', { id: 6, progress_percent: 100 })] });
        const settled = mountExports();
        await flushPromises();
        expect(settled.find('[data-testid="log-export-latest"]').exists()).toBe(false);
        expect((settled.vm as unknown as Exposed).activeCount).toBe(0);
        settled.unmount();

        respond({ data: [job('PROCESSING', { progress_percent: 10 }), job('READY', { id: 6, progress_percent: 100 })] });
        const running = mountExports({ pollMs: 60_000 });
        await flushPromises();
        expect(running.get('[data-testid="log-export-latest"]').attributes('data-export-id')).toBe('7');
        expect((running.vm as unknown as Exposed).activeCount).toBe(1);
    });

    it('keeps a finished export in the strip until dismissed and opens the panel from it', async () => {
        respond({ data: [] });
        const navigate = vi.fn();
        const wrapper = mountExports({ navigate });
        await flushPromises();

        (wrapper.vm as unknown as Exposed).track(
            job('READY', { progress_percent: 100, expires_at: '2026-09-08T03:00:00+00:00' }),
        );
        await flushPromises();
        const strip = wrapper.get('[data-testid="log-export-latest"]');
        expect(strip.text()).toContain('Ready');
        expect(strip.text()).toContain('Available until');

        respond({ data: job('READY', { progress_percent: 100 }) });
        await strip.get('[data-testid="log-export-latest-download"]').trigger('click');
        await flushPromises();
        expect(navigate).toHaveBeenCalledWith('/reports/activity-log/exports/7/download');

        await wrapper.get('[data-testid="log-export-view-all"]').trigger('click');
        expect(wrapper.emitted('update:panelOpen')).toEqual([[true]]);

        await wrapper.get('[data-testid="log-export-dismiss"]').trigger('click');
        expect(wrapper.find('[data-testid="log-export-latest"]').exists()).toBe(false);
    });

    it('explains a failed export without showing its code', async () => {
        respond({ data: [job('FAILED', { failure_code: 'REPORT_RENDER_FAILED' })] });
        const wrapper = mountExports({ panelOpen: true });
        await flushPromises();

        expect(panelRow(7)?.textContent).toContain('The report could not be generated. Request a new export.');
        expect(panelRow(7)?.textContent).not.toContain('REPORT_RENDER_FAILED');

        (wrapper.vm as unknown as Exposed).track(job('FAILED', { id: 9, failure_code: 'REPORT_RENDER_FAILED' }));
        await flushPromises();
        const strip = wrapper.get('[data-testid="log-export-latest"]');
        expect(strip.text()).toContain('The report could not be generated.');
        expect(strip.text()).not.toContain('REPORT_RENDER_FAILED');
    });

    it('tells the user when nothing has been exported yet', async () => {
        respond({ data: [] });
        mountExports({ panelOpen: true });
        await flushPromises();

        expect(panel()?.textContent).toContain('No exports yet');
    });
});
