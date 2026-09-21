export interface RequestFeedbackError {
    status?: number;
    code?: string;
    message?: string;
    errors?: Record<string, string[] | string>;
    context?: Record<string, unknown>;
    isNetworkError?: boolean;
}

export type SaveStatus = 'saving' | 'saved' | 'error' | null;
