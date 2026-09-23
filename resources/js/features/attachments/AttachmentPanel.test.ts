import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia, router } from '@/testing/inertia';

import type { AttachmentItem } from './AttachmentList.vue';
import AttachmentPanel from './AttachmentPanel.vue';
import type { AttachmentPolicy } from './attachmentPolicy';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const POLICY: AttachmentPolicy = {
    max_files: 10,
    max_bytes: 20_000_000,
    chunk_bytes: 5_242_880,
    extensions: ['pdf', 'png', 'txt'],
};

const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));

function mountPanel(
    props: Partial<{
        attachments: AttachmentItem[];
        policy: AttachmentPolicy | null;
        editable: boolean;
        lockedReason: string | null;
    }> = {},
) {
    return mount(AttachmentPanel, {
        props: { recordId: 7, attachments: [], policy: POLICY, editable: true, lockedReason: null, ...props },
    });
}

async function choose(wrapper: ReturnType<typeof mountPanel>, file: File): Promise<void> {
    const input = wrapper.get<HTMLInputElement>('[data-testid="attachment-input"]');
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
}

beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { permissions: ['nscmf.attachment.manage'] } });
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('Attachment panel (FE-40)', () => {
    it('AC1: without a ready pipeline the picker is disabled with a reason and nothing is sent', () => {
        const wrapper = mountPanel({ policy: null });

        expect(wrapper.get<HTMLInputElement>('[data-testid="attachment-input"]').element.disabled).toBe(true);
        expect(wrapper.text()).toContain('Attachments are not available right now.');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('AC2: attachments are optional: no files is a normal state', () => {
        const wrapper = mountPanel();

        expect(wrapper.text()).toContain('Attachments are optional.');
        expect(wrapper.text()).toContain('No attachments on this record.');
    });

    it('AC3: a file breaking a known limit is refused before any request', async () => {
        const wrapper = mountPanel();
        await choose(wrapper, new File(['x'], 'macro.xlsm'));

        expect(wrapper.text()).toContain('This file type is not allowed.');
        expect(fetchMock).not.toHaveBeenCalled();

        const full = mountPanel({
            attachments: Array.from({ length: 10 }, (_, index) => ({
                id: index + 1,
                filename: `f${index}.pdf`,
                size_bytes: 1,
                security_status: 'CLEAN' as const,
                download_url: null,
            })),
        });
        await choose(full, new File(['x'], 'eleven.pdf'));
        expect(full.text()).toContain('A record may have at most 10 attachments.');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('AC3: an accepted file starts an upload and shows it in progress', async () => {
        const wrapper = mountPanel();
        await choose(wrapper, new File(['hello'], 'notes.txt'));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

        expect(wrapper.get('[data-testid="upload-notes.txt"]').text()).toContain('notes.txt');
        expect(wrapper.get('input[type="file"]').attributes('accept')).toBe('.pdf,.png,.txt');
    });

    it('AC4: a read-only or locked context offers no upload and no removal', () => {
        const readonly = mountPanel({
            editable: false,
            attachments: [{ id: 1, filename: 'a.pdf', size_bytes: 1, security_status: 'CLEAN', download_url: null }],
        });
        expect(readonly.find('[data-testid="attachment-input"]').exists()).toBe(false);
        expect(readonly.find('[data-testid="attachment-remove-1"]').exists()).toBe(false);

        const locked = mountPanel({ lockedReason: 'Save your changes before adding or removing attachments.' });
        expect(locked.get<HTMLInputElement>('[data-testid="attachment-input"]').element.disabled).toBe(true);
        expect(locked.text()).toContain('Save your changes before adding or removing attachments.');
    });

    it('FE-43 AC5: refreshes while a scan is pending and stops when unmounted', async () => {
        vi.useFakeTimers();
        const wrapper = mountPanel({
            attachments: [{ id: 1, filename: 'a.pdf', size_bytes: 1, security_status: 'PENDING', download_url: null }],
        });
        await vi.advanceTimersByTimeAsync(3000);
        expect(router.reload).toHaveBeenCalledWith(expect.objectContaining({ only: ['attachments'] }));

        const calls = router.reload.mock.calls.length;
        wrapper.unmount();
        await vi.advanceTimersByTimeAsync(9000);
        expect(router.reload.mock.calls.length).toBe(calls);
    });
});
