import { describe, expect, it } from 'vitest';

import { fieldError, type FieldErrors } from './fieldErrors';

const ERRORS: FieldErrors = {
    'activation.customer_name': 'The customer name is required.',
    'activation.sla_items.0.requirement_text': 'The requirement text is required.',
    'activation.sla_items': 'At most 10 rows are allowed.',
    'change.rollback_scenario': '',
};

describe('fieldError', () => {
    it('finds the message for a plain field path', () => {
        expect(fieldError(ERRORS, 'activation.customer_name')).toBe('The customer name is required.');
    });

    it('joins segments so a row path can be written without string building', () => {
        expect(fieldError(ERRORS, 'activation.sla_items', 0, 'requirement_text')).toBe(
            'The requirement text is required.',
        );
        expect(fieldError(ERRORS, 'activation.sla_items')).toBe('At most 10 rows are allowed.');
    });

    it('has no message for an unknown or blank entry', () => {
        expect(fieldError(ERRORS, 'activation.wan_ip')).toBeUndefined();
        expect(fieldError(ERRORS, 'activation.sla_items', 1, 'requirement_text')).toBeUndefined();
        expect(fieldError(ERRORS, 'change.rollback_scenario')).toBeUndefined();
    });
});
