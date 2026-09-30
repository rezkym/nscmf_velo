/** One stored field change of a Business Timeline event (12 §48). */
export interface TimelineChange {
    field: string;
    before: string | null;
    after: string | null;
}

/** One line of the split diff; a side is null when that side has nothing (an added or removed row). */
export interface DiffRow {
    label: string;
    before: string | null;
    after: string | null;
}

/** Skeleton only: the per-field and per-row diff arrives with FE-62. */
export function diffRows(change: TimelineChange): DiffRow[] {
    return [{ label: change.field, before: change.before, after: change.after }];
}
