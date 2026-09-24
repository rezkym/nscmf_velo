const JAKARTA = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
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
