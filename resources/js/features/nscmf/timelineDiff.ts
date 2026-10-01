import {
    ACTIVATION_COLLECTIONS,
    ACTIVATION_GROUPS,
    CHANGE_COLLECTIONS,
    CHANGE_GROUPS,
    type CollectionSpec,
    type FieldGroup,
    type FieldSpec,
    fieldValue,
    formatValue,
    HEADER_FIELDS,
    type Row,
    SITE_BLOCKS,
} from './recordFields';

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

const SEPARATOR = ' › ';

const fieldsOf = (groups: Record<string, FieldGroup>): FieldSpec[] =>
    Object.values(groups).flatMap((group) => group.fields);

// Stored paths are `<root>.<key>` (12 §48); these say what each key holds.
const SCALARS: Record<string, FieldSpec[]> = {
    header: HEADER_FIELDS,
    activation: fieldsOf(ACTIVATION_GROUPS),
    change: fieldsOf(CHANGE_GROUPS),
};
const BLOCKS: Record<string, Record<string, FieldGroup>> = { activation: SITE_BLOCKS };
const COLLECTIONS: Record<string, Record<string, CollectionSpec>> = {
    activation: ACTIVATION_COLLECTIONS,
    change: CHANGE_COLLECTIONS,
};

/**
 * A stored change as the lines of a split diff (07 §36): a field reads with its Form Detail label and
 * format, and a site block or a collection is compared field by field and row by row, never shown as
 * raw JSON. A path this client does not know keeps its stored text.
 */
export function diffRows(change: TimelineChange): DiffRow[] {
    const [root = '', key = ''] = change.field.split('.');
    const scalar = SCALARS[root]?.find((spec) => spec.key === key);
    if (scalar)
        return [
            {
                label: scalar.label,
                before: formatValue(scalar, change.before),
                after: formatValue(scalar, change.after),
            },
        ];

    const before = parse(change.before);
    const after = parse(change.after);
    const block = BLOCKS[root]?.[key];
    if (block && before !== undefined && after !== undefined) return blockRows(block, asRow(before), asRow(after));
    const collection = COLLECTIONS[root]?.[key];
    if (collection && before !== undefined && after !== undefined)
        return collectionRows(collection, asRows(before), asRows(after));

    return [{ label: change.field, before: change.before, after: change.after }];
}

/** A stored JSON value; undefined when the text is not JSON, so the change keeps its raw text. */
function parse(text: string | null): unknown {
    if (text === null) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return undefined;
    }
}

const asRow = (value: unknown): Row | null => (typeof value === 'object' && value !== null ? value : null);
const asRows = (value: unknown): Row[] => (Array.isArray(value) ? value.flatMap((row) => asRow(row) ?? []) : []);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The changed fields of `spec` between two rows; a missing row leaves its side empty. */
function cellRows(label: string, fields: FieldSpec[], before: Row | null, after: Row | null): DiffRow[] {
    return fields
        .filter((spec) => !same(fieldValue(before, spec.key), fieldValue(after, spec.key)))
        .map((spec) => ({
            label: `${label}${SEPARATOR}${spec.label}`,
            before: before ? formatValue(spec, fieldValue(before, spec.key)) : null,
            after: after ? formatValue(spec, fieldValue(after, spec.key)) : null,
        }));
}

function blockRows(block: FieldGroup, before: Row | null, after: Row | null): DiffRow[] {
    return cellRows(block.title, block.fields, before, after);
}

/**
 * Rows are matched by their natural key, the first column. A numbered row is named by its number;
 * any other key is a choice in its own right, so adding or removing it is a line of its own.
 */
function collectionRows(spec: CollectionSpec, before: Row[], after: Row[]): DiffRow[] {
    const [identity, ...cells] = spec.columns;
    if (!identity) return [];
    const numbered = identity.key === 'row_no';
    const keyOf = (row: Row) => JSON.stringify(fieldValue(row, identity.key));
    const nameOf = (row: Row) =>
        numbered
            ? `Row ${formatValue(identity, fieldValue(row, identity.key))}`
            : formatValue(identity, fieldValue(row, identity.key));
    const olds = new Map(before.map((row) => [keyOf(row), row]));
    const news = new Map(after.map((row) => [keyOf(row), row]));

    return [...new Set([...olds.keys(), ...news.keys()])].flatMap((key) => {
        const old = olds.get(key) ?? null;
        const now = news.get(key) ?? null;
        const name = nameOf(now ?? old ?? {});
        const choice = numbered || (old && now) ? [] : [{ label: spec.title, before: old && name, after: now && name }];
        return [...choice, ...cellRows(`${spec.title}${SEPARATOR}${name}`, cells, old, now)];
    });
}
