/** Server validation errors for a draft save, keyed by wire path (12 §11), e.g. `activation.sla_items.0.requirement_text`. */
export type FieldErrors = Record<string, string | undefined>;

/** The message for one wire path. Segments are joined with a dot so row paths stay readable at the call site. */
export function fieldError(errors: FieldErrors, ...segments: (string | number)[]): string | undefined {
    return errors[segments.join('.')] || undefined;
}
