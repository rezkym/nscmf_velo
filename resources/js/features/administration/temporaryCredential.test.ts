import { describe, expect, it } from 'vitest';

import { temporaryCredentialFromFlash } from './temporaryCredential';

describe('temporaryCredentialFromFlash', () => {
    it('reads the flashed password and username', () => {
        expect(temporaryCredentialFromFlash({ temporary_password: 'test-secret', username: 'demo.reviewer' })).toEqual({
            password: 'test-secret',
            username: 'demo.reviewer',
        });
    });

    it('returns null when no password was flashed', () => {
        expect(temporaryCredentialFromFlash(undefined)).toBeNull();
        expect(temporaryCredentialFromFlash({})).toBeNull();
        expect(temporaryCredentialFromFlash({ temporary_password: '' })).toBeNull();
    });

    it('allows a missing username', () => {
        expect(temporaryCredentialFromFlash({ temporary_password: 'test-secret' })).toEqual({
            password: 'test-secret',
            username: null,
        });
    });
});
