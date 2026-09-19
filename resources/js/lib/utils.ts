import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Returns a new list with `item` added, or removed if it was already present. */
export function toggleItem<T>(list: readonly T[], item: T): T[] {
    return list.includes(item) ? list.filter((existing) => existing !== item) : [...list, item];
}

export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of items) {
        (groups[keyOf(item)] ??= []).push(item);
    }
    return groups;
}
