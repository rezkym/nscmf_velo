import { describe, expect, it } from 'vitest';
import { isBusinessStatus, parseApiErrorEnvelope, parseChangeResult, parseDateOnly } from './contracts';

describe('FE-01: Typed contracts and transport boundaries', () => {
    describe('AC1: contracts_preserve_free_text_result_status', () => {
        it('preserves free-text result_status such as "Selesai dengan pemantauan"', () => {
            const raw = {
                row_no: 1,
                result_summary: 'Modul terpasang',
                performance_information: 'Error rate 0',
                result_status: 'Selesai dengan pemantauan',
            };

            const parsed = parseChangeResult(raw);

            expect(parsed.result_status).toBe('Selesai dengan pemantauan');
        });

        it('does not restrict result_status to an enum like SUCCESS or FAILED', () => {
            const raw = {
                row_no: 2,
                result_status: 'Dalam investigasi vendor pihak ketiga',
            };
            const parsed = parseChangeResult(raw);
            expect(parsed.result_status).toBe('Dalam investigasi vendor pihak ketiga');
        });

        it('rejects a missing or non-numeric row_no instead of silently defaulting to 1 (natural-key safety)', () => {
            expect(() => parseChangeResult({ result_status: 'No row_no supplied' })).toThrow();
            expect(() => parseChangeResult({ row_no: '2', result_status: 'String row_no' })).toThrow();
        });
    });

    describe('AC2: contracts_keep_date_only_without_timezone_shift', () => {
        it('preserves YYYY-MM-DD string without timezone offset shifting the date', () => {
            const rawDate = '2026-09-20';
            const parsedDate = parseDateOnly(rawDate);
            expect(parsedDate).toBe('2026-09-20');
        });
    });

    describe('AC3: contracts_keep_business_and_technical_status_separate', () => {
        it('validates canonical business status and excludes technical/archive states (READY, CLEAN, ARCHIVED)', () => {
            expect(isBusinessStatus('DRAFT')).toBe(true);
            expect(isBusinessStatus('PENDING_REVIEW')).toBe(true);
            expect(isBusinessStatus('REVISION_REQUIRED')).toBe(true);
            expect(isBusinessStatus('PENDING_APPROVAL')).toBe(true);
            expect(isBusinessStatus('REJECTED')).toBe(true);
            expect(isBusinessStatus('APPROVED')).toBe(true);
            expect(isBusinessStatus('CANCELLED')).toBe(true);

            // Technical, artifact, or archive statuses MUST NOT be considered business statuses
            expect(isBusinessStatus('READY')).toBe(false);
            expect(isBusinessStatus('CLEAN')).toBe(false);
            expect(isBusinessStatus('ARCHIVED')).toBe(false);
            expect(isBusinessStatus('INFECTED')).toBe(false);
            expect(isBusinessStatus('QUEUED')).toBe(false);
        });

        it('safely handles unknown status without crashing', () => {
            expect(isBusinessStatus(undefined)).toBe(false);
            expect(isBusinessStatus(null)).toBe(false);
            expect(isBusinessStatus('UNKNOWN_STATUS')).toBe(false);
            expect(isBusinessStatus(123)).toBe(false);
        });
    });

    describe('AC4: contracts_preserve_error_context', () => {
        it('preserves latest_record_version from 409 conflict error payload context without computing own version', () => {
            const conflict409Payload = {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists. Refresh the record before saving again.',
                errors: {},
                context: {
                    latest_record_version: 14,
                    current_business_status: 'PENDING_REVIEW',
                },
            };

            const parsedError = parseApiErrorEnvelope(conflict409Payload);

            expect(parsedError.code).toBe('NSCMF_VERSION_CONFLICT');
            expect(parsedError.context).toBeDefined();
            expect(parsedError.context?.latest_record_version).toBe(14);
            expect(parsedError.context?.current_business_status).toBe('PENDING_REVIEW');
        });

        it('does not let an untyped context field bypass validation of latest_record_version', () => {
            const malformedPayload = {
                code: 'NSCMF_VERSION_CONFLICT',
                message: 'A newer version of this record exists.',
                context: {
                    latest_record_version: '14', // wrong type: string instead of number
                },
            };

            const parsedError = parseApiErrorEnvelope(malformedPayload);

            expect(parsedError.context?.latest_record_version).toBeUndefined();
        });
    });
});
