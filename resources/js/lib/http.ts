import { type ApiErrorEnvelope, parseApiErrorEnvelope } from '@/features/nscmf/contracts';

/**
 * Same-origin JSON transport for the structured endpoints of 12 §4.2 (Draft save, Change Result,
 * re-authentication, one-time credential results). It rides the Laravel session cookie and CSRF
 * (XSRF-TOKEN cookie → X-XSRF-TOKEN header), is never cached, and never turns a failure into a
 * success: every non-2xx comes back with its status and the parsed 12 §9 envelope when present.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type JsonResult<TBody = unknown> =
    { ok: true; status: number; body: TBody | null } | { ok: false; status: number; error: ApiErrorEnvelope | null };

function xsrfToken(): string | null {
    const match = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
    if (!match) return null;
    const value = match.slice('XSRF-TOKEN='.length);
    return value === '' ? null : decodeURIComponent(value);
}

async function readJson(response: Response): Promise<unknown> {
    if (response.status === 204 || !response.headers.get('Content-Type')?.includes('application/json')) {
        return null;
    }

    try {
        return (await response.json()) as unknown;
    } catch {
        return null;
    }
}

export async function sendJson<TBody = unknown>(
    method: HttpMethod,
    url: string,
    body?: unknown,
    init: { signal?: AbortSignal } = {},
): Promise<JsonResult<TBody>> {
    const headers = new Headers({ Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' });
    const token = xsrfToken();
    if (token) headers.set('X-XSRF-TOKEN', token);
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    let response: Response;
    try {
        response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: 'same-origin',
            cache: 'no-store',
            signal: init.signal,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        return { ok: false, status: 0, error: null };
    }

    const payload = await readJson(response);

    if (response.ok) {
        return { ok: true, status: response.status, body: payload as TBody | null };
    }

    return { ok: false, status: response.status, error: payload === null ? null : parseApiErrorEnvelope(payload) };
}
