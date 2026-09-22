export interface TemporaryCredential {
    password: string;
    username: string | null;
}

/**
 * Reads the one-time credential from the JSON success body of create/reset (12 §81, §85, §96.2).
 * It is never taken from flash, page props or anything the browser keeps in history.
 */
export function temporaryCredentialFromResponse(body: unknown): TemporaryCredential | null {
    if (!body || typeof body !== 'object') return null;
    const { data, meta } = body as { data?: unknown; meta?: unknown };
    if (
        !meta ||
        typeof meta !== 'object' ||
        (meta as Record<string, unknown>).temporary_password_reveal !== 'ONE_TIME_ONLY'
    ) {
        return null;
    }
    if (!data || typeof data !== 'object') return null;

    const { temporary_password: password, user } = data as Record<string, unknown>;
    if (typeof password !== 'string' || password === '') return null;

    const username =
        user && typeof user === 'object' && typeof (user as Record<string, unknown>).username === 'string'
            ? ((user as Record<string, unknown>).username as string)
            : null;

    return { password, username };
}
