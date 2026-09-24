import { describe, expect, it } from 'vitest';

import { formatCalendarDay, formatJakarta } from './datetime';

describe('formatCalendarDay', () => {
    it('shows a server calendar date as short month and day without shifting the day', () => {
        expect(formatCalendarDay('2026-08-28')).toBe('Aug 28');
        expect(formatCalendarDay('2026-09-24')).toBe('Sep 24');
    });
});

describe('formatJakarta', () => {
    it('shows an instant as Jakarta wall time and a missing one as a dash', () => {
        expect(formatJakarta('2026-09-05T01:00:00Z')).toBe('2026-09-05 08:00 WIB');
        expect(formatJakarta(null)).toBe('—');
    });
});
