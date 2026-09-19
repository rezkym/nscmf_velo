import { describe, expect, it } from 'vitest';

import { errorCode, firstError } from './apiErrors';

describe('firstError', () => {
    it('prefers the requested keys in order', () => {
        expect(firstError({ name: 'Name taken', message: 'Denied' }, 'Failed', ['message', 'name'])).toBe('Denied');
    });

    it('falls back to the first message, then to the fallback text', () => {
        expect(firstError({ role_ids: 'Invalid role' }, 'Failed', ['message'])).toBe('Invalid role');
        expect(firstError({}, 'Failed')).toBe('Failed');
        expect(firstError({ message: '' }, 'Failed')).toBe('Failed');
    });
});

describe('errorCode', () => {
    it('reads error_code first, then code', () => {
        expect(errorCode({ error_code: 'PROTECTED_RESOURCE', code: 'X' })).toBe('PROTECTED_RESOURCE');
        expect(errorCode({ code: 'REAUTH_REQUIRED' })).toBe('REAUTH_REQUIRED');
        expect(errorCode({})).toBeUndefined();
    });
});
