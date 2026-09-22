import { describe, expect, it } from 'vitest';

import { RECORD_CONFLICT_CODES, domainError, isRecordConflictCode, pageDomainError } from './apiErrors';

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

describe('pageDomainError across both flash channels', () => {
    const flashed = { domain_error: { code: 'FORBIDDEN', message: 'Denied.' } };
    const expected = { code: 'FORBIDDEN', message: 'Denied.' };

    // The installed @inertiajs/core carries flash at Page.flash, but a Laravel application may also
    // share a `flash` prop. Until a real NSCMF response exists (gap G02) the reader accepts both,
    // so no part of the UI can read the wrong one and silently never fire.
    it('reads flash from the page root', () => {
        expect(pageDomainError({ flash: flashed })).toEqual(expected);
    });

    it('reads flash from the shared props', () => {
        expect(pageDomainError({ props: { flash: flashed } })).toEqual(expected);
    });

    it('reads a bare flash bag, which is what onFlash hands over', () => {
        expect(pageDomainError(flashed)).toEqual(expected);
    });

    it('prefers the page root when a page carries both', () => {
        expect(
            pageDomainError({
                flash: { domain_error: { code: 'NSCMF_VERSION_CONFLICT' } },
                props: { flash: flashed },
            }),
        ).toEqual({ code: 'NSCMF_VERSION_CONFLICT', message: undefined });
    });

    it('falls through to the props channel when the page root has no domain error', () => {
        expect(pageDomainError({ flash: {}, props: { flash: flashed } })).toEqual(expected);
    });
});

describe('firstFieldError', () => {
    it('reads the first message of an array or string field and nothing else', async () => {
        const { firstFieldError } = await import('./apiErrors');
        expect(
            firstFieldError({ code: 'VALIDATION_FAILED', message: '', errors: { name: ['First', 'Second'] } }, 'name'),
        ).toBe('First');
        expect(firstFieldError({ code: 'VALIDATION_FAILED', message: '', errors: { name: 'Only' } }, 'name')).toBe(
            'Only',
        );
        expect(firstFieldError({ code: 'VALIDATION_FAILED', message: '' }, 'name')).toBeUndefined();
        expect(firstFieldError(null, 'name')).toBeUndefined();
    });
});
