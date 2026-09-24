import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import AttachmentList, { type AttachmentItem } from './AttachmentList.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const fetchMock = vi.fn();
const assign = vi.fn();

function item(overrides: Partial<AttachmentItem> = {}): AttachmentItem {
    return {
        id: 4,
        filename: 'plan.pdf',
        size_bytes: 2048,
        security_status: 'CLEAN',
        download_url: '/nscmf/7/attachments/4/download',
        ...overrides,
    };
}

function respond(status: number, body: unknown = { data: {} }): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function mountList(attachments: AttachmentItem[], manageable = false) {
    return mount(AttachmentList, { props: { recordId: 7, attachments, manageable, navigate: assign } });
}

beforeEach(() => {
    fetchMock.mockReset();
    assign.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.view'] } });
});
afterEach(() => vi.unstubAllGlobals());

describe('Attachment list (FE-43)', () => {
    it('AC1: only an explicit CLEAN file offers a download', () => {
        const wrapper = mountList([
            item({ id: 1, security_status: 'PENDING', download_url: null }),
            item({ id: 2, security_status: 'INFECTED', download_url: null }),
            item({ id: 3, security_status: 'FAILED', download_url: null }),
            item({ id: 4 }),
        ]);

        expect(
            wrapper.findAll('[data-testid^="attachment-download-"]').map((b) => b.attributes('data-testid')),
        ).toEqual(['attachment-download-4']);
        expect(wrapper.get('[data-testid="attachment-1"]').text()).toContain('Scanning');
        expect(wrapper.get('[data-testid="attachment-2"]').text()).toContain('Blocked');
        expect(wrapper.get('[data-testid="attachment-3"]').text()).toContain('Scan failed');
        expect(wrapper.get('[data-testid="attachment-4"]').text()).toContain('Ready');
    });

    it('AC2: a .pdf name or a download URL on a non-clean file is never trusted', () => {
        const wrapper = mountList([
            item({ security_status: 'PENDING', download_url: '/nscmf/7/attachments/4/download' }),
        ]);

        expect(wrapper.find('[data-testid="attachment-download-4"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Download unavailable');
    });

    it('AC2: an empty list is a normal state, not an error', () => {
        expect(mountList([]).text()).toContain('No attachments on this record.');
    });

    it('AC3: removal is offered only when the context allows it, and asks for confirmation', async () => {
        expect(mountList([item()]).find('[data-testid="attachment-remove-4"]').exists()).toBe(false);

        const wrapper = mountList([item()], true);
        await wrapper.get('[data-testid="attachment-remove-4"]').trigger('click');
        expect(fetchMock).not.toHaveBeenCalled();
        respond(200, { data: { id: 4, removed: true } });
        await wrapper.get('[data-testid="attachment-confirm-remove-4"]').trigger('click');
        await flushPromises();

        expect(fetchMock.mock.calls[0]?.[0]).toBe('/nscmf/7/attachments/4');
        expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe('DELETE');
        expect(wrapper.emitted('changed')).toHaveLength(1);
    });

    it('AC3: a refused removal keeps the file and says why', async () => {
        const wrapper = mountList([item()], true);
        await wrapper.get('[data-testid="attachment-remove-4"]').trigger('click');
        respond(409, {
            code: 'NSCMF_STATE_CONFLICT',
            message: 'Attachments can only change while the record is editable.',
        });
        await wrapper.get('[data-testid="attachment-confirm-remove-4"]').trigger('click');
        await flushPromises();

        expect(wrapper.text()).toContain('Attachments can only change while the record is editable.');
        expect(wrapper.emitted('changed')).toBeUndefined();
        expect(wrapper.find('[data-testid="attachment-4"]').exists()).toBe(true);
    });

    it('AC4: the download is re-checked first and a revoked file disables its link', async () => {
        const wrapper = mountList([item()]);
        respond(200, { data: item() });
        await wrapper.get('[data-testid="attachment-download-4"]').trigger('click');
        await flushPromises();
        expect(fetchMock.mock.calls[0]?.[0]).toBe('/nscmf/7/attachments/4');
        expect(assign).toHaveBeenCalledWith('/nscmf/7/attachments/4/download');

        for (const status of [403, 404, 410]) {
            assign.mockReset();
            const revoked = mountList([item()]);
            respond(status, { code: 'NOT_FOUND', message: 'x' });
            await revoked.get('[data-testid="attachment-download-4"]').trigger('click');
            await flushPromises();
            expect(assign).not.toHaveBeenCalled();
            expect(revoked.get<HTMLButtonElement>('[data-testid="attachment-download-4"]').element.disabled).toBe(true);
            expect(revoked.text()).toContain('This file is no longer available.');
        }
    });

    it('renders file names as text', () => {
        const wrapper = mountList([item({ filename: '<img src=x onerror=alert(1)>.pdf' })]);

        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>.pdf');
    });
});
