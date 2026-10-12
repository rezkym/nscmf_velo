import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import ActivityLogExportDialog from './ActivityLogExportDialog.vue';
import type { LogFilters, LogItem } from './types';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

enableAutoUnmount(afterEach);
const fetchMock = vi.fn();

const FILTERS: LogFilters = {
    q: null,
    family: null,
    subtype: null,
    statuses: ['APPROVED'],
    archived: 'all',
    request_date_from: '2026-08-01',
    request_date_to: '2026-08-31',
};

const SELECTED: LogItem[] = [
    {
        id: 8,
        request_no: 'NSCMF-202608-00002',
        request_date: '2026-08-04',
        family: 'CHANGE',
        subtype: 'MAINTENANCE',
        customer_name: 'Demo migration',
        noc_infrastructure: ['NOC23'],
        business_status: 'APPROVED',
        is_archived: false,
    },
];

function mountDialog(overrides: Record<string, unknown> = {}) {
    return mount(ActivityLogExportDialog, {
        props: {
            open: true,
            filters: FILTERS,
            total: 27,
            selected: [],
            siteDefaults: { noc15: true, noc23: false },
            pdfAvailable: true,
            maxEntries: 1000,
            ...overrides,
        },
        attachTo: document.body,
    });
}

function sentBody(): Record<string, unknown> {
    const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    return JSON.parse(String(init.body)) as Record<string, unknown>;
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-01T03:00:00Z'));
    resetInertia({ auth: { user: { id: 1, username: 'demo', name: 'Demo Person' }, permissions: ['nscmf.export'] } });
});

afterEach(() => vi.useRealTimers());

describe('Activity Log export dialog (07 §34.2)', () => {
    it('exports every matching entry with the prefilled header and states that the PDF is unsigned', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ data: { id: 3, status: 'QUEUED', progress_percent: 0, stage: 'QUEUED' } }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        const wrapper = mountDialog();
        expect(document.body.textContent).toContain('All 27 matching entries');
        expect(document.body.textContent).toContain('not digitally signed');
        expect(byTestId('prepared-name')).toHaveProperty('value', 'Demo Person');

        byTestId('submit-export')!.click();
        await flushPromises();

        expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/reports/activity-log/exports');
        expect(sentBody()).toEqual({
            format: 'XLSX',
            scope: 'FILTERED',
            filters: FILTERS,
            record_ids: [],
            site_location: { noc15: true, noc23: false },
            prepared_by: { name: 'Demo Person', date: '2026-09-01' },
            acknowledged_by: { name: null, date: null },
        });
        expect(wrapper.emitted('requested')?.[0]?.[0]).toMatchObject({ id: 3 });
    });

    it('defaults to the selected entries and their Site Location, as a PDF when chosen', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ data: { id: 4, status: 'QUEUED' } }), {
                status: 202,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        mountDialog({ selected: SELECTED });
        expect(document.body.textContent).toContain('Only the 1 selected entry');

        byTestId('format-PDF')!.click();
        await flushPromises();
        byTestId('submit-export')!.click();
        await flushPromises();

        expect(sentBody()).toMatchObject({
            format: 'PDF',
            scope: 'SELECTED',
            filters: null,
            record_ids: [8],
            site_location: { noc15: false, noc23: true },
        });
    });

    it('keeps PDF unavailable without a renderer and shows the server refusal', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ code: 'REPORT_TOO_LARGE', message: 'An export holds at most 1000 entries. Narrow the filters.', errors: {}, context: {} }), {
                status: 422,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        mountDialog({ pdfAvailable: false });
        expect(byTestId('format-PDF')?.getAttribute('disabled')).not.toBeNull();

        byTestId('submit-export')!.click();
        await flushPromises();
        expect(document.body.textContent).toContain('An export holds at most 1000 entries.');
    });

    it('refuses an empty Prepared By name before sending', async () => {
        mountDialog();
        const name = byTestId('prepared-name') as HTMLInputElement;
        name.value = '';
        name.dispatchEvent(new Event('input'));
        await flushPromises();

        byTestId('submit-export')!.click();
        await flushPromises();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(document.body.textContent).toContain('Prepared By needs a name');
    });
});
