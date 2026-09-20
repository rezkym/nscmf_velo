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

/** A domain/action error flashed by the server (12 §10), carrying a stable code from the 12 §12 catalog. */
export interface DomainError {
    code?: string;
    message?: string;
}

/** Reads the flashed domain error. Local view-model over the shared flash bag (gap G02). */
export function domainError(_flash: unknown): DomainError | null {
    return null;
}
