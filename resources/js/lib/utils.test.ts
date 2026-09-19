import { describe, expect, it } from 'vitest';

import { cn, groupBy, toggleItem } from './utils';

describe('cn', () => {
    it('lets a later Tailwind class override a conflicting earlier one', () => {
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('drops falsy conditional classes', () => {
        const isActive = false;

        expect(cn('rounded', isActive && 'bg-primary', undefined, 'text-sm')).toBe('rounded text-sm');
    });
});

describe('toggleItem', () => {
    it('adds a missing item and removes a present one without mutating the input', () => {
        const list = [1, 2];

        expect(toggleItem(list, 3)).toEqual([1, 2, 3]);
        expect(toggleItem(list, 1)).toEqual([2]);
        expect(list).toEqual([1, 2]);
    });
});

describe('groupBy', () => {
    it('groups items by the computed key, preserving order', () => {
        const items = [
            { name: 'users.view', group: 'Users' },
            { name: 'teams.view', group: 'Teams' },
            { name: 'users.create', group: 'Users' },
        ];

        expect(groupBy(items, (item) => item.group)).toEqual({
            Users: [items[0], items[2]],
            Teams: [items[1]],
        });
    });
});
