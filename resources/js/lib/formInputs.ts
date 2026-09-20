/** Blank text means "no value" on the wire; anything else is kept exactly as typed. */
export function toNullableText(value: string): string | null {
    return value.trim() === '' ? null : value;
}

/** Blank or non-numeric input means "no value". Zero and negatives are kept so the server can judge them. */
export function toNullableNumber(value: string): number | null {
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
