/** An attachment's security lifecycle (11A §9; 12 §58). Only CLEAN is usable. */
export type SecurityStatus = 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED';

/** The scan states of 07 §28, word for word, shared by the uploader and the attachment list. */
export const SECURITY_LABELS: Record<SecurityStatus, string> = {
    PENDING: 'Scanning for malware…',
    CLEAN: 'Ready',
    INFECTED: 'Rejected — malware detected',
    FAILED: 'Security scan failed — file not available',
};
