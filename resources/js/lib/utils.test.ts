import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
    it('lets a later Tailwind class override a conflicting earlier one', () => {
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('drops falsy conditional classes', () => {
        const isActive = false;

        expect(cn('rounded', isActive && 'bg-primary', undefined, 'text-sm')).toBe('rounded text-sm');
    });
});
