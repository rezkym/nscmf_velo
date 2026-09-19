import { describe, expect, it } from 'vitest';

import { toNullableNumber, toNullableText } from './formInputs';

describe('toNullableText', () => {
    it('turns blank input into null and keeps other text untouched', () => {
        expect(toNullableText('')).toBeNull();
        expect(toNullableText('   ')).toBeNull();
        expect(toNullableText(' Demo Customer ')).toBe(' Demo Customer ');
    });
});

describe('toNullableNumber', () => {
    it('parses decimals without rounding and keeps zero', () => {
        expect(toNullableNumber('100.125')).toBe(100.125);
        expect(toNullableNumber('0')).toBe(0);
        expect(toNullableNumber('-1')).toBe(-1);
    });

    it('turns blank or non-numeric input into null', () => {
        expect(toNullableNumber('')).toBeNull();
        expect(toNullableNumber('  ')).toBeNull();
        expect(toNullableNumber('abc')).toBeNull();
        expect(toNullableNumber('Infinity')).toBeNull();
    });
});
