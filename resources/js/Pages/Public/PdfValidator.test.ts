import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetInertia } from '@/testing/inertia';

import PdfValidator from './PdfValidator.vue';

vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);

const fetchMock = vi.fn();

function respond(status: number, body: unknown): void {
    fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    );
}

function pdf(size: number, name = 'form.pdf'): File {
    const file = new File(['%PDF-'], name, { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
}

function mountPage() {
    return mount(PdfValidator, { props: { max_bytes: 20_000_000 } });
}

async function choose(wrapper: ReturnType<typeof mountPage>, file: File): Promise<void> {
    const input = wrapper.get<HTMLInputElement>('[data-testid="validator-file"]');
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
}

async function verify(wrapper: ReturnType<typeof mountPage>): Promise<void> {
    await wrapper.get('[data-testid="validator-verify"]').trigger('click');
    await flushPromises();
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    resetInertia({ auth: { user: { id: 1, name: 'Signed In Person' }, permissions: ['nscmf.view'] } });
});
enableAutoUnmount(afterEach);
afterEach(() => vi.unstubAllGlobals());

describe('Public PDF validator (FE-48)', () => {
    it('AC1: accepts 1 to 20,000,000 bytes of PDF and rejects the rest before sending', async () => {
        const wrapper = mountPage();
        for (const [file, message] of [
            [pdf(0), 'The file is empty.'],
            [pdf(20_000_001), 'The file may be at most 20,000,000 bytes.'],
            [pdf(10, 'form.docx'), 'Choose a PDF file.'],
        ] as const) {
            await choose(wrapper, file);
            expect(wrapper.text()).toContain(message);
            expect(wrapper.get<HTMLButtonElement>('[data-testid="validator-verify"]').element.disabled).toBe(true);
        }
        for (const size of [19_999_999, 20_000_000]) {
            await choose(wrapper, pdf(size));
            expect(wrapper.get<HTMLButtonElement>('[data-testid="validator-verify"]').element.disabled).toBe(false);
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('AC1: shows the server refusal of an invalid file', async () => {
        const wrapper = mountPage();
        await choose(wrapper, pdf(10));
        respond(422, { code: 'VALIDATOR_FILE_INVALID', message: 'Upload one PDF file.' });
        await verify(wrapper);

        expect(wrapper.text()).toContain('Upload one PDF file.');
    });

    it('AC2: posts the file and nothing else, once', async () => {
        fetchMock.mockImplementation(() => new Promise(() => undefined));
        const wrapper = mountPage();
        await choose(wrapper, pdf(10));
        await wrapper.get('[data-testid="validator-verify"]').trigger('click');
        await wrapper.get('[data-testid="validator-verify"]').trigger('click');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/ispdfvalid/verify');
        const body = init.body as FormData;
        expect([...body.keys()]).toEqual(['file']);
        expect(wrapper.text()).toContain('Checking');
    });

    it('AC3: a standalone public page with no internal navigation or user details', () => {
        const wrapper = mountPage();

        expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual([]);
        expect(wrapper.text()).not.toContain('Signed In Person');
        expect(wrapper.text()).not.toMatch(/dashboard|history|administration|sign out/i);
    });

    it('AC4: choosing a new file clears the result, and a late answer for the old file is ignored', async () => {
        let release: (response: Response) => void = () => {};
        fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)));
        const wrapper = mountPage();
        await choose(wrapper, pdf(10, 'a.pdf'));
        await wrapper.get('[data-testid="validator-verify"]').trigger('click');
        await choose(wrapper, pdf(10, 'b.pdf'));
        release(
            new Response(JSON.stringify({ data: { result: 'UNKNOWN' } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
        );
        await flushPromises();

        expect(wrapper.find('[data-testid="validator-result"]').exists()).toBe(false);
    });

    it('AC5: a scan failure is an operational error, never a verdict', async () => {
        const wrapper = mountPage();
        await choose(wrapper, pdf(10));
        respond(503, {
            code: 'VALIDATOR_SCAN_FAILED',
            message: 'The PDF could not be checked right now. Try again later.',
        });
        await verify(wrapper);

        expect(wrapper.text()).toContain('The PDF could not be checked right now. Try again later.');
        expect(wrapper.find('[data-testid="validator-result"]').exists()).toBe(false);
    });

    it('explains the rate limit without inventing a number', async () => {
        const wrapper = mountPage();
        await choose(wrapper, pdf(10));
        respond(429, { code: 'TOO_MANY_REQUESTS', message: 'Too Many Attempts.' });
        await verify(wrapper);

        expect(wrapper.text()).toContain('Too many checks. Please wait a moment before trying again.');
    });
});

describe('Verification outcomes (FE-49)', () => {
    const ISSUED = {
        request_no: 'DEMO-CHG-006',
        family: 'CHANGE',
        issued_at: '2026-09-16T01:00:00+00:00',
        issuer: 'NSCMF Organization',
    };

    async function outcome(data: Record<string, unknown>) {
        const wrapper = mountPage();
        await choose(wrapper, pdf(10));
        respond(200, { data });
        await verify(wrapper);
        return wrapper.get('[data-testid="validator-result"]');
    }

    it('AC1: current and superseded are both valid, with different wording', async () => {
        const current = await outcome({ result: 'VALID_CURRENT', ...ISSUED });
        expect(current.text()).toContain('Valid and current');
        expect(current.text()).toContain('DEMO-CHG-006');
        expect(current.text()).toContain('2026-09-16 08:00 WIB');

        const superseded = await outcome({ result: 'VALID_SUPERSEDED', ...ISSUED });
        expect(superseded.text()).toContain('Valid, but no longer the current version');
        expect(superseded.text()).not.toMatch(/forg|fake|invalid/i);
    });

    it('AC2: modified and unknown are distinct and name no record', async () => {
        const modified = await outcome({ result: 'INVALID_MODIFIED' });
        expect(modified.text()).toContain('Modified after signing');

        const unknown = await outcome({ result: 'UNKNOWN' });
        expect(unknown.text()).toContain('Not recognised');
        expect(unknown.text()).toMatch(/does not prove/i);
        expect(unknown.text()).not.toContain('DEMO-');
    });

    it('AC3/AC4: shows only the whitelisted fields and never links inside NSCMF', async () => {
        const result = await outcome({
            result: 'VALID_CURRENT',
            ...ISSUED,
            owner: 'Private Requester Name',
            team: 'Demo Team Alpha',
            record_id: 12,
        });

        expect(result.text()).not.toContain('Private Requester Name');
        expect(result.text()).not.toContain('Demo Team Alpha');
        expect(result.findAll('a')).toHaveLength(0);
    });

    it('AC1: each outcome has an icon and a text label, not colour alone', async () => {
        const result = await outcome({ result: 'INVALID_MODIFIED' });

        expect(result.find('svg').exists()).toBe(true);
        expect(result.get('h2').text()).toBe('Modified after signing');
    });

    it('AC5: keeps nothing in browser storage', async () => {
        const setItem = vi.spyOn(Storage.prototype, 'setItem');
        await outcome({ result: 'VALID_CURRENT', ...ISSUED });

        expect(setItem).not.toHaveBeenCalled();
        setItem.mockRestore();
    });
});
