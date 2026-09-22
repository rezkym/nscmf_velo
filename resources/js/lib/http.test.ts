import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendJson } from './http';

/*
 * Same-origin JSON transport (12 §4.2, §5, §8–9): session cookie + Laravel CSRF, JSON envelopes,
 * never cached, and every failure surfaced with its status and parsed error envelope.
 */

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
}

describe('sendJson', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        document.cookie = 'XSRF-TOKEN=abc%3D%3D; path=/';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('sends a same-origin, uncached JSON request carrying the decoded XSRF token', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 1 }, meta: {} }));

        const result = await sendJson('PATCH', '/nscmf/1/draft', { record_version: 3 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe('/nscmf/1/draft');
        expect(init).toMatchObject({ method: 'PATCH', credentials: 'same-origin', cache: 'no-store' });
        expect(init?.body).toBe(JSON.stringify({ record_version: 3 }));
        const headers = new Headers(init?.headers);
        expect(headers.get('Accept')).toBe('application/json');
        expect(headers.get('Content-Type')).toBe('application/json');
        expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
        expect(headers.get('X-XSRF-TOKEN')).toBe('abc==');
        expect(result).toEqual({ ok: true, status: 200, body: { data: { id: 1 }, meta: {} } });
    });

    it('treats 204 as success without a body and omits the body for bodiless requests', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

        const result = await sendJson('POST', '/account/re-authenticate');

        expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined();
        expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Content-Type')).toBeNull();
        expect(result).toEqual({ ok: true, status: 204, body: null });
    });

    it('returns the parsed error envelope with its status and never claims success', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(409, {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
                errors: {},
                context: { latest_record_version: 5, current_business_status: 'DRAFT' },
            }),
        );

        const result = await sendJson('PATCH', '/nscmf/1/draft', {});

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.status).toBe(409);
        expect(result.error?.code).toBe('NSCMF_VERSION_CONFLICT');
        expect(result.error?.context?.latest_record_version).toBe(5);
    });

    it('reports a non-JSON failure (such as an HTML error page) with a null envelope', async () => {
        fetchMock.mockResolvedValue(
            new Response('<html>419</html>', { status: 419, headers: { 'Content-Type': 'text/html' } }),
        );

        const result = await sendJson('POST', '/x', {});

        expect(result).toEqual({ ok: false, status: 419, error: null });
    });

    it('reports a network failure as status 0 instead of throwing', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        expect(await sendJson('POST', '/x', {})).toEqual({ ok: false, status: 0, error: null });
    });

    it('lets an abort propagate so callers can tell cancellation from failure', async () => {
        fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));

        await expect(sendJson('POST', '/x', {})).rejects.toThrow('aborted');
    });

    it('works without an XSRF cookie', async () => {
        document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        fetchMock.mockResolvedValue(jsonResponse(200, { data: null }));

        await sendJson('GET', '/x');

        expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-XSRF-TOKEN')).toBeNull();
    });
});
