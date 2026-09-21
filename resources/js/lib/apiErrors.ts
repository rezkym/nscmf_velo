/**
 * The 12 §12 codes that mean the record moved underneath the editor. All three stop editing and
 * offer a refresh (12 §11 409, 07 §23); only NSCMF_VERSION_CONFLICT may be described as a newer
 * version. Codes are matched exactly — REQUEST_NO_CONFLICT is a request-number clash, not this.
 */
export const RECORD_CONFLICT_CODES = [
    'NSCMF_VERSION_CONFLICT',
    'NSCMF_STATE_CONFLICT',
    'NSCMF_ARCHIVED_CONFLICT',
] as const;

export function isRecordConflictCode(code: string | undefined): boolean {
    return RECORD_CONFLICT_CODES.some((known) => known === code);
}

/**
 * Reads the flashed domain error from an Inertia page or from a bare flash bag (12 §10).
 *
 * The installed @inertiajs/core carries flash at `Page.flash` and hands that bag to `onFlash`, but
 * a Laravel application may equally share a `flash` prop, and no NSCMF response exists yet to say
 * which this project will use (gap G02). Reading both is the one choice that cannot be wrong, and
 * it keeps every caller on the same reader instead of each picking a channel and hoping.
 */
export function pageDomainError(pageOrFlash: unknown): DomainError | null {
    if (typeof pageOrFlash !== 'object' || pageOrFlash === null) return null;

    const { flash, props } = pageOrFlash as { flash?: unknown; props?: { flash?: unknown } };
    return domainError(flash) ?? domainError(props?.flash) ?? domainError(pageOrFlash);
}

/** Reads the flashed domain error. Local view-model over the shared flash bag (gap G02). */
export function domainError(flash: unknown): DomainError | null {
    if (typeof flash !== 'object' || flash === null) return null;

    const flashed = (flash as { domain_error?: unknown }).domain_error;
    if (typeof flashed !== 'object' || flashed === null) return null;

    const { code, message } = flashed as { code?: unknown; message?: unknown };
    return {
        code: typeof code === 'string' ? code : undefined,
        message: typeof message === 'string' ? message : undefined,
    };
}
