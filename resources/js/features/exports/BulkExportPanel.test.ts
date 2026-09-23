import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import BulkExportPanel from './BulkExportPanel.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const fetchMock = vi.fn();
const SELECTED = [
    { id: 5, request_no: 'DEMO-ACT-005' },
    { id: 8, request_no: 'DEMO-ACT-008' },
];

function respond(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function exportJob(id: number, recordId: number, status: string, extra: Record<string, unknown> = {}) {
    return {
        id,
        record_id: recordId,
        format: 'XLSX',
        status,
        requested_at: '2026-09-24T01:00:00+00:00',
        ready_at: null,
        expires_at: null,
        failure_code: null,
        signed: false,
        download_url: status === 'READY' ? `/nscmf/exports/${id}/download` : null,
        ...extra,
    };
}

function mountPanel(selected = SELECTED) {
    return mount(BulkExportPanel, { props: { selected, pollMs: 0 } });
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.export', 'nscmf.export.bulk'] } });
});
enableAutoUnmount(afterEach);
afterEach(() => vi.unstubAllGlobals());

describe('Bulk export (FE-46)', () => {
    it('AC1: needs the bulk permission; single export alone is not enough', () => {
        resetInertia({ auth: { permissions: ['nscmf.export'] } });

        expect(mountPanel().find('[data-testid="bulk-export"]').exists()).toBe(false);
    });

    it('AC2: nothing selected sends nothing', async () => {
        const wrapper = mountPanel([]);

        expect(wrapper.get<HTMLButtonElement>('[data-testid="bulk-export-start"]').element.disabled).toBe(true);
        await wrapper.get('[data-testid="bulk-export-start"]').trigger('click');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('AC2: confirms the exact selection, then posts only those record ids and the format', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="bulk-export-format"]').setValue('PDF');
        await wrapper.get('[data-testid="bulk-export-start"]').trigger('click');

        const confirm = wrapper.get('[data-testid="bulk-export-confirm"]');
        expect(confirm.text()).toContain('2 records');
        expect(confirm.text()).toContain('DEMO-ACT-005');
        expect(fetchMock).not.toHaveBeenCalled();

        await wrapper.get('[data-testid="bulk-export-submit"]').trigger('click');
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/nscmf/exports/bulk');
        expect(JSON.parse(init.body as string)).toEqual({ format: 'PDF', record_ids: [5, 8] });
    });

    it('AC3: shows each record on its own: a refusal stays a refusal, no overall success', async () => {
        respond(202, {
            data: {
                id: 3,
                format: 'XLSX',
                items: [
                    { record_id: 5, ...exportJob(40, 5, 'READY') },
                    { record_id: 8, error: { code: 'FORBIDDEN', message: 'You cannot export this record.' } },
                ],
            },
        });
        const wrapper = mountPanel();
        await wrapper.get('[data-testid="bulk-export-start"]').trigger('click');
        await wrapper.get('[data-testid="bulk-export-submit"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-testid="bulk-item-5"]').text()).toContain('Ready');
        expect(wrapper.get('[data-testid="bulk-item-8"]').text()).toContain('You cannot export this record.');
        expect(wrapper.find('[data-testid="bulk-item-8"] button').exists()).toBe(false);
        expect(wrapper.text()).not.toMatch(/all .*(succeeded|exported)/i);
    });

    it('AC3: follows the batch until every export settles', async () => {
        respond(202, {
            data: { id: 3, format: 'XLSX', items: [{ record_id: 5, ...exportJob(40, 5, 'QUEUED') }] },
        });
        respond(200, { data: { id: 3, format: 'XLSX', exports: [exportJob(40, 5, 'FAILED')] } });
        const wrapper = mountPanel([SELECTED[0]!]);
        await wrapper.get('[data-testid="bulk-export-start"]').trigger('click');
        await wrapper.get('[data-testid="bulk-export-submit"]').trigger('click');
        await vi.waitFor(() => expect(wrapper.get('[data-testid="bulk-item-5"]').text()).toContain('Failed'));

        expect(fetchMock.mock.calls[1]?.[0]).toBe('/nscmf/export-batches/3');
    });

    it('AC4: offers no ZIP or download-all', () => {
        expect(mountPanel().text()).not.toMatch(/zip|download all/i);
    });
});
