export interface TemporaryCredential {
    password: string;
    username: string | null;
}

/**
 * Reads the one-time credential the server flashes after creating a user or resetting a password.
 * The flash key names are not fixed by the API contract yet (gap G09); this is the single place to
 * adjust them once the backend defines the response.
 */
export function temporaryCredentialFromFlash(flash: unknown): TemporaryCredential | null {
    if (!flash || typeof flash !== 'object') return null;
    const { temporary_password: password, username } = flash as Record<string, unknown>;
    if (typeof password !== 'string' || password === '') return null;
    return { password, username: typeof username === 'string' ? username : null };
}
