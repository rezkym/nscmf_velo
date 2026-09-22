import { describe, expect, it } from 'vitest';

import { temporaryCredentialFromResponse } from './temporaryCredential';

// The one-time password arrives only in the JSON success body (12 §81, §85, §96.2), never in flash.
describe('temporaryCredentialFromResponse', () => {
    it('reads a create response with the user username', () => {
        expect(
            temporaryCredentialFromResponse({
                data: { user: { id: 44, username: 'demo.reviewer' }, temporary_password: 'test-secret' },
                meta: { temporary_password_reveal: 'ONE_TIME_ONLY' },
            }),
        ).toEqual({ password: 'test-secret', username: 'demo.reviewer' });
    });

    it('reads a reset response, which carries no username', () => {
        expect(
            temporaryCredentialFromResponse({
                data: { user_id: 2, temporary_password: 'test-reset' },
                meta: { temporary_password_reveal: 'ONE_TIME_ONLY' },
            }),
        ).toEqual({ password: 'test-reset', username: null });
    });

    it('returns null without a one-time marker or password', () => {
        expect(temporaryCredentialFromResponse(null)).toBeNull();
        expect(temporaryCredentialFromResponse({ data: { temporary_password: 'x' }, meta: {} })).toBeNull();
        expect(
            temporaryCredentialFromResponse({
                data: { temporary_password: '' },
                meta: { temporary_password_reveal: 'ONE_TIME_ONLY' },
            }),
        ).toBeNull();
        expect(
            temporaryCredentialFromResponse({ data: 'nope', meta: { temporary_password_reveal: 'ONE_TIME_ONLY' } }),
        ).toBeNull();
    });
});
