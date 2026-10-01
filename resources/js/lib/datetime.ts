/** The application timezone every business date and "today" follow (12 §7.2). */
export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

const JAKARTA = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/** An ISO-8601 instant as Jakarta wall time, e.g. `2026-09-05 08:00 WIB` (07 §date/time). */
export function formatJakarta(iso: string | null | undefined): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        JAKARTA.formatToParts(date).find((piece) => piece.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')} WIB`;
}

const CALENDAR_DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * A server calendar date (`YYYY-MM-DD`, already a Jakarta business day) as `Sep 24`. It is read and
 * printed in UTC so the browser's own timezone never moves it to another day.
 */
export function formatCalendarDay(date: string): string {
    return CALENDAR_DAY.format(new Date(`${date}T00:00:00Z`));
}

const BUSINESS_DATE = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

/**
 * A server business date (`YYYY-MM-DD`) as `30 Sep 2026` (07 §22.1). Like `formatCalendarDay`, it is
 * read and printed in UTC so the browser's own timezone never moves it to another day.
 */
export function formatBusinessDate(date: string): string {
    const parts = BUSINESS_DATE.formatToParts(new Date(`${date}T00:00:00Z`));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((piece) => piece.type === type)?.value ?? '';
    return `${part('day')} ${part('month')} ${part('year')}`;
}
