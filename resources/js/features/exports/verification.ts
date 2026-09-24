/** The public validator answer (12 §72–75); only these fields are ever shown. */
export interface VerificationAnswer {
    result: 'VALID_CURRENT' | 'VALID_SUPERSEDED' | 'INVALID_MODIFIED' | 'UNKNOWN';
    request_no?: string | null;
    family?: string | null;
    issued_at?: string | null;
    issuer?: string | null;
}
