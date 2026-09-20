import { describe, expect, it } from 'vitest';

import { domainError, firstError } from './apiErrors';

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

describe('domainError', () => {
    it('reads the flashed domain error with its stable code', () => {
        expect(
            domainError({ domain_error: { code: 'PROTECTED_RESOURCE', message: 'This role is protected.' } }),
        ).toEqual({ code: 'PROTECTED_RESOURCE', message: 'This role is protected.' });
    });

    it('accepts a domain error that carries only a code', () => {
        expect(domainError({ domain_error: { code: 'REAUTH_REQUIRED' } })).toEqual({
            code: 'REAUTH_REQUIRED',
            message: undefined,
        });
    });

    it('has nothing to report when the flash bag carries no domain error', () => {
        expect(domainError(undefined)).toBeNull();
        expect(domainError({})).toBeNull();
        expect(domainError({ domain_error: null })).toBeNull();
        expect(domainError({ domain_error: 'oops' })).toBeNull();
        expect(domainError({ domain_error: { message: 'Denied.' } })).toEqual({ code: undefined, message: 'Denied.' });
    });
});
