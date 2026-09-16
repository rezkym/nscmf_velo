export interface SuccessEnvelope<TData, TMeta = Record<string, unknown>> {
    data: TData;
    meta?: TMeta;
}

export interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
}

export interface ChangeResultWire {
    row_no: number;
    result_summary?: string | null;
    performance_information?: string | null;
    result_status?: string | null;
}

export function parseChangeResult(input: unknown): ChangeResultWire {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid ChangeResult payload');
    }

    const raw = input as Record<string, unknown>;

    return {
        row_no: typeof raw.row_no === 'number' ? raw.row_no : 1,
        result_summary: typeof raw.result_summary === 'string' ? raw.result_summary : null,
        performance_information: typeof raw.performance_information === 'string' ? raw.performance_information : null,
        result_status: typeof raw.result_status === 'string' ? raw.result_status : null,
    };
}

export type DateOnlyString = string;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(input: unknown): DateOnlyString {
    if (typeof input !== 'string' || !DATE_ONLY_REGEX.test(input)) {
        throw new Error(`Invalid DateOnly string: ${String(input)}. Expected format YYYY-MM-DD.`);
    }

    // Keep the string intact as YYYY-MM-DD to prevent browser timezone shifts
    return input;
}

export const CANONICAL_BUSINESS_STATUSES = [
    'DRAFT',
    'PENDING_REVIEW',
    'REVISION_REQUIRED',
    'PENDING_APPROVAL',
    'REJECTED',
    'APPROVED',
    'CANCELLED',
] as const;

export type BusinessStatus = (typeof CANONICAL_BUSINESS_STATUSES)[number];

export function isBusinessStatus(status: unknown): status is BusinessStatus {
    return typeof status === 'string' && (CANONICAL_BUSINESS_STATUSES as readonly string[]).includes(status);
}

export interface ApiErrorContext {
    latest_record_version?: number;
    current_business_status?: string;
    [key: string]: unknown;
}

export interface ApiErrorEnvelope {
    code: string;
    message: string;
    errors?: Record<string, string[] | string>;
    context?: ApiErrorContext;
}

export function parseApiErrorEnvelope(input: unknown): ApiErrorEnvelope {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid ApiErrorEnvelope payload');
    }

    const raw = input as Record<string, unknown>;

    let context: ApiErrorContext | undefined = undefined;
    if (raw.context && typeof raw.context === 'object') {
        const rawContext = raw.context as Record<string, unknown>;
        context = {
            latest_record_version:
                typeof rawContext.latest_record_version === 'number' ? rawContext.latest_record_version : undefined,
            current_business_status:
                typeof rawContext.current_business_status === 'string' ? rawContext.current_business_status : undefined,
            ...rawContext,
        };
    }

    return {
        code: typeof raw.code === 'string' ? raw.code : 'UNKNOWN_ERROR',
        message: typeof raw.message === 'string' ? raw.message : '',
        errors:
            raw.errors && typeof raw.errors === 'object'
                ? (raw.errors as Record<string, string[] | string>)
                : undefined,
        context,
    };
}
