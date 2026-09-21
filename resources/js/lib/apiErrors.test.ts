import { describe, expect, it } from 'vitest';

import { RECORD_CONFLICT_CODES, domainError, isRecordConflictCode, pageDomainError } from './apiErrors';

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

describe('isRecordConflictCode', () => {
    it('matches only the conflict codes the catalogue actually defines (12 §12)', () => {
        expect(RECORD_CONFLICT_CODES).toEqual([
            'NSCMF_VERSION_CONFLICT',
            'NSCMF_STATE_CONFLICT',
            'NSCMF_ARCHIVED_CONFLICT',
        ]);
        for (const code of RECORD_CONFLICT_CODES) {
            expect(isRecordConflictCode(code)).toBe(true);
        }
    });

    it('does not treat every code containing CONFLICT as a record conflict', () => {
        // REQUEST_NO_CONFLICT is a request-number clash (12 §12), not the record moving underneath.
        expect(isRecordConflictCode('REQUEST_NO_CONFLICT')).toBe(false);
        expect(isRecordConflictCode('SOME_OTHER_CONFLICT')).toBe(false);
        expect(isRecordConflictCode(undefined)).toBe(false);
        expect(isRecordConflictCode('FORBIDDEN')).toBe(false);
    });
});

describe('pageDomainError', () => {
    it('reads the flash bag off an Inertia page, where the library puts it', () => {
        expect(pageDomainError({ flash: { domain_error: { code: 'NSCMF_VERSION_CONFLICT' } } })).toEqual({
            code: 'NSCMF_VERSION_CONFLICT',
            message: undefined,
        });
    });

    it('also accepts a bare flash bag, which is what onFlash hands over', () => {
        expect(pageDomainError({ domain_error: { code: 'FORBIDDEN', message: 'Denied.' } })).toEqual({
            code: 'FORBIDDEN',
            message: 'Denied.',
        });
    });

    it('reports nothing when there is no flashed domain error', () => {
        expect(pageDomainError(undefined)).toBeNull();
        expect(pageDomainError(null)).toBeNull();
        expect(pageDomainError({})).toBeNull();
        expect(pageDomainError({ flash: {} })).toBeNull();
        expect(pageDomainError('oops')).toBeNull();
    });
});
