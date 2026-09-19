/** Inertia error bag: field name -> message. */
export type ErrorBag = Record<string, string | undefined>;

/**
 * The message to show for a failed request: the first of `preferredKeys` that has a message,
 * otherwise the first message in the bag, otherwise `fallback`.
 */
export function firstError(errors: ErrorBag, fallback: string, preferredKeys: readonly string[] = []): string {
    for (const key of preferredKeys) {
        const message = errors[key];
        if (message) return message;
    }
    return Object.values(errors).find((message) => Boolean(message)) ?? fallback;
}

/** Stable machine code sent alongside a domain error, if any (12 §12). */
export function errorCode(errors: ErrorBag): string | undefined {
    return errors.error_code ?? errors.code;
}
