import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChunkUpload } from './useChunkUpload';

const CHUNK = 5_242_880;

interface Call {
    method: string;
    url: string;
    body: unknown;
    contentType: string | null;
}

let calls: Call[] = [];
let handler: (call: Call) => Response | Promise<Response> | 'network';

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function session(overrides: Record<string, unknown> = {}) {
    return {
        upload_id: '01j0000000000000000000000a',
        status: 'UPLOADING',
        chunk_size: CHUNK,
        chunk_count: 2,
        accepted_chunks: [],
        missing_chunks: [1, 2],
        expires_at: '2026-09-25T08:00:00+07:00',
        ...overrides,
    };
}

function fileOf(size: number, name = 'plan.pdf'): File {
    return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

const BASE = '/nscmf/7/attachment-uploads';

beforeEach(() => {
    calls = [];
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
            const headers = new Headers(init.headers);
            const call = {
                method: init.method ?? 'GET',
                url,
                body: init.body instanceof Blob ? init.body : init.body ? JSON.parse(String(init.body)) : undefined,
                contentType: headers.get('Content-Type'),
            };
            calls.push(call);
            const response = await handler(call);
            if (response === 'network') throw new TypeError('Failed to fetch');
            return response;
        }),
    );
});
afterEach(() => vi.unstubAllGlobals());

/** A server that accepts every chunk and completes, then reports the scan verdict. */
function happyServer(verdict = 'CLEAN') {
    const accepted: number[] = [];
    return (call: Call): Response => {
        if (call.method === 'POST' && call.url === BASE) return json(201, { data: session() });
        if (call.method === 'PUT') {
            accepted.push(Number(call.url.split('/').pop()));
            return json(200, {
                data: session({
                    accepted_chunks: [...accepted],
                    missing_chunks: [1, 2].filter((i) => !accepted.includes(i)),
                }),
            });
        }
        if (call.url.endsWith('/complete'))
            return json(202, { data: session({ status: 'ASSEMBLING', missing_chunks: [] }) });
        return json(200, {
            data: session({ status: 'COMPLETED', missing_chunks: [], attachment: { id: 3, security_status: verdict } }),
        });
    };
}

describe('Chunk upload (FE-41)', () => {
    it('AC1/AC5: initiates from real metadata, then PUTs octet-stream chunks 1..n of the server session', async () => {
        handler = happyServer();
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(calls[0]).toMatchObject({ method: 'POST', url: BASE });
        expect(calls[0]?.body).toMatchObject({
            filename: 'plan.pdf',
            size_bytes: CHUNK + 1,
            mime_type: 'application/pdf',
        });
        expect((calls[0]?.body as { fingerprint_sha256: string }).fingerprint_sha256).toMatch(/^[0-9a-f]{64}$/);
        const puts = calls.filter((call) => call.method === 'PUT');
        expect(puts.map((call) => call.url)).toEqual([
            `${BASE}/01j0000000000000000000000a/chunks/1`,
            `${BASE}/01j0000000000000000000000a/chunks/2`,
        ]);
        expect(puts.map((call) => (call.body as Blob).size)).toEqual([CHUNK, 1]);
        expect(puts.every((call) => call.contentType === 'application/octet-stream')).toBe(true);
    });

    it('AC2: progress counts only chunks the server acknowledged', async () => {
        let release: (response: Response) => void = () => {};
        handler = (call) => {
            if (call.method === 'POST') return json(201, { data: session() });
            return new Promise<Response>((resolve) => (release = resolve));
        };
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        void upload.start();
        await vi.waitFor(() => expect(calls.some((call) => call.method === 'PUT')).toBe(true));

        expect(upload.state.accepted).toBe(0);
        release(json(422, { code: 'UPLOAD_CHUNK_INVALID', message: 'The chunk size does not match this upload.' }));
        await vi.waitFor(() => expect(upload.state.phase).toBe('failed'));
        expect(upload.state.accepted).toBe(0);
        expect(upload.state.message).toBe('The chunk size does not match this upload.');
    });

    it('AC3: a chunk conflict pauses the upload and never resends different bytes', async () => {
        handler = (call) =>
            call.method === 'POST'
                ? json(201, { data: session() })
                : json(409, { code: 'UPLOAD_CHUNK_CONFLICT', message: 'Different bytes were already accepted.' });
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(upload.state.phase).toBe('conflict');
        expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
    });

    it('AC4: completed transport is scanning, and only an explicit CLEAN is ready', async () => {
        handler = happyServer('INFECTED');
        const infected = useChunkUpload(7, fileOf(10), { pollMs: 0 });
        await infected.start();
        expect(infected.state.phase).toBe('done');
        expect(infected.state.securityStatus).toBe('INFECTED');

        handler = happyServer('CLEAN');
        const clean = useChunkUpload(7, fileOf(10), { pollMs: 0 });
        await clean.start();
        expect(clean.state.securityStatus).toBe('CLEAN');
    });

    it('AC4: keeps polling the server while the scan is pending', async () => {
        let polls = 0;
        const server = happyServer();
        handler = (call) => {
            if (call.method === 'GET' && ++polls < 3) {
                return json(200, {
                    data: session({
                        status: 'COMPLETED',
                        missing_chunks: [],
                        attachment: { id: 3, security_status: 'PENDING' },
                    }),
                });
            }
            return server(call);
        };
        const upload = useChunkUpload(7, fileOf(10), { pollMs: 0 });
        await upload.start();

        expect(polls).toBe(3);
        expect(upload.state.securityStatus).toBe('CLEAN');
    });
});

describe('Resume, expiry and cancel (FE-42)', () => {
    it('AC1: sends only what the server says is missing', async () => {
        handler = (call) => {
            if (call.method === 'POST' && call.url === BASE) {
                return json(200, { data: session({ resumed: true, accepted_chunks: [1], missing_chunks: [2] }) });
            }
            return happyServer()(call);
        };
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(calls.filter((call) => call.method === 'PUT').map((call) => call.url.split('/').pop())).toEqual(['2']);
    });

    it('AC1: re-sends chunks the server reports missing at completion', async () => {
        let completes = 0;
        const server = happyServer();
        handler = (call) => {
            if (call.url.endsWith('/complete') && ++completes === 1) {
                return json(409, { code: 'UPLOAD_INCOMPLETE', message: 'Missing.', context: { missing_chunks: [1] } });
            }
            return server(call);
        };
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(calls.filter((call) => call.method === 'PUT').map((call) => call.url.split('/').pop())).toEqual([
            '1',
            '2',
            '1',
        ]);
        expect(upload.state.phase).toBe('done');
    });

    it('AC2: a different file is identified by its own fingerprint, so it never joins another session', async () => {
        handler = happyServer();
        const first = useChunkUpload(7, new File(['aaaa'], 'plan.pdf'), { pollMs: 0 });
        await first.start();
        const second = useChunkUpload(7, new File(['bbbb'], 'plan.pdf'), { pollMs: 0 });
        await second.start();

        const fingerprints = calls
            .filter((call) => call.method === 'POST' && call.url === BASE)
            .map((call) => (call.body as { fingerprint_sha256: string }).fingerprint_sha256);
        expect(new Set(fingerprints).size).toBe(2);
    });

    it('AC3: shows the server expiry and never extends it locally', async () => {
        handler = happyServer();
        const upload = useChunkUpload(7, fileOf(10), { pollMs: 0 });
        await upload.start();

        expect(upload.state.expiresAt).toBe('2026-09-25T08:00:00+07:00');
    });

    it('AC4: a lost connection is Interrupted and says how to resume', async () => {
        handler = (call) => (call.method === 'POST' ? json(201, { data: session() }) : 'network');
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(upload.state.phase).toBe('interrupted');
        expect(upload.state.message).toMatch(/choose the same file again/i);
    });

    it('AC4: cancelling uses the official endpoint and a failed cancel is not a success', async () => {
        handler = (call) => (call.method === 'POST' ? json(201, { data: session() }) : 'network');
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        handler = () =>
            json(409, { code: 'UPLOAD_SESSION_STATE_CONFLICT', message: 'This upload can no longer be cancelled.' });
        await upload.cancel();
        expect(calls.at(-1)).toMatchObject({ method: 'DELETE', url: `${BASE}/01j0000000000000000000000a` });
        expect(upload.state.phase).toBe('cancel-failed');

        handler = () => json(200, { data: session({ status: 'CANCELLED' }) });
        await upload.cancel();
        expect(upload.state.phase).toBe('cancelled');
    });

    it('AC5: an expired session stops sending and needs a new upload', async () => {
        handler = (call) =>
            call.method === 'POST'
                ? json(201, { data: session() })
                : json(410, { code: 'UPLOAD_SESSION_EXPIRED', message: 'This upload expired. Start it again.' });
        const upload = useChunkUpload(7, fileOf(CHUNK + 1), { pollMs: 0 });
        await upload.start();

        expect(upload.state.phase).toBe('expired');
        expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(1);
    });

    it('stop() ends polling without further requests', async () => {
        handler = (call) =>
            call.method === 'GET'
                ? json(200, {
                      data: session({
                          status: 'COMPLETED',
                          missing_chunks: [],
                          attachment: { id: 3, security_status: 'PENDING' },
                      }),
                  })
                : happyServer()(call);
        const upload = useChunkUpload(7, fileOf(10), { pollMs: 5 });
        const running = upload.start();
        await vi.waitFor(() => expect(calls.some((call) => call.method === 'GET')).toBe(true));
        upload.stop();
        await running;
        const count = calls.length;
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(calls.length).toBe(count);
    });
});
