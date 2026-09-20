# 3. The draft section contract

> Part of the 2026-09-20 frontend handoff. Status, scope and authorities: [README](README.md).

The six draft sections were rewritten to one shape. A new section — for example
the Change Result editor of FE-26 — should follow it exactly, because the edit
page of FE-27 will compose them all the same way.

## The shape

```vue
<script setup lang="ts">
import DraftField from '../DraftField.vue';
import { fieldError, type FieldErrors } from '../fieldErrors';
import type { ChangeDraftFields, ChangeSubtype } from '../types';

/** What this section owns, and the authority that defines it. */
export type ResultFields = Pick<ChangeDraftFields, 'results'>;

const model = defineModel<ResultFields>({ required: true });

const props = withDefaults(
    defineProps<{ subtype: ChangeSubtype; errors?: FieldErrors; disabled?: boolean }>(),
    { errors: () => ({}) },
);

function update(patch: Partial<ResultFields>): void {
    model.value = { ...model.value, ...patch };
}

function error(...segments: (string | number)[]): string | undefined {
    return fieldError(props.errors, 'change', ...segments);
}
</script>
```

Rules that hold for every section:

1. **`defineModel` of a `Pick<>` slice of `ActivationDraftFields` or
   `ChangeDraftFields`, and the slice type is exported.** A section writes only its
   own keys and spreads the rest through untouched, so the parent can bind the
   whole draft object to several sections at once.
2. **Props are exactly `subtype?`, `errors?` and `disabled?`.** `subtype` appears
   only where a rule depends on it (see the table below). `errors` defaults to
   `{}` and is keyed by wire path. `disabled` disables every control.
3. **No requests.** A section never calls `router`/`useForm`; the parent owns
   saving. The tests assert this.
4. **No client submit validation.** Requiredness is shown as a marker and the
   message comes from the server 422 (`06` §10: server-side validation is
   mandatory and owns requiredness). What stays is light, non-blocking help:
   `maxlength`, `type="number"`/`date`, native `min`/`max` hints, required markers
   per subtype, and the announcement mismatch warning of `06` §43.
5. **Selection is presence.** Selecting adds the row, deselecting removes it —
   never blank a dependent description to "deselect" (`06` §14). Typing in a
   description never selects the option behind the user's back.
6. **Nothing is auto-cleared.** A whole optional block is cleared only by an
   explicit control, and it is cleared to `null`, never to `{}` (`12` §27.1).

## Inventory

| Section | Slice it owns (exported) | `subtype` | Collections |
|---|---|---|---|
| `activation/GeneralServiceSection.vue` | `GeneralFields`: `customer_name`, `contact_name`, `installation_rfs_date`, `references`, `service_blocks` | `ActivationSubtype` | references (selection), service blocks (one per `service_context`) |
| `activation/BandwidthSection.vue` | `BandwidthFields`: `sla_items`, the three `bandwidth_*`, `virtual_connections`, `priority_destinations` | – | three, max 3 rows each |
| `activation/NetworkHostingSection.vue` | `NetworkFields`: the ten NOC identifiers, domain/DNS/MX, `hosting_platform`, `hosting_capacity_gb`, `migrate_domain`, `migrate_hosting` | – | none |
| `activation/SiteSection.vue` | `SiteFields`: `direct_site`, `pop_site` | – | none (two 1:1 blocks) |
| `change/PurposeImpactSection.vue` | `PurposeFields`: `maintenance_purpose`, `facing_challenges`, `identified_problems`, `service_impacts` | `ChangeSubtype` | two row lists (max 3) + impacts (selection) |
| `change/PlanSection.vue` | `PlanFields`: `improvement_items`, `target_execution_date`, `monitoring_period_value`, `monitoring_period_unit`, `rollback_scenario`, `announcement_timing` | `ChangeSubtype` | improvement items (max 3) |

`change.results` is owned by **no section yet** — that is FE-26.

## Naming conventions

**Control id = the wire path with `-` instead of `.`,** so the id stays a valid CSS
selector while the error key keeps the dotted form:

| Kind | id | wire path used with `fieldError` |
|---|---|---|
| scalar | `customer_name` | `activation.customer_name` |
| nested block | `direct_site-latency_ms` | `activation.direct_site.latency_ms` |
| collection row | `sla_items-0-requirement_text` | `activation.sla_items.0.requirement_text` |
| dependent field | `impact-OTHER-description` | `change.service_impacts.{index}.other_description` |

`FormField` derives the message element from the id, so a server message always
lands at `#{id}-error`.

**Test ids in the existing sections** (follow these patterns):

| Pattern | Where |
|---|---|
| `data-collection="{collection}"` on a `RepeatableRows` | scopes `btn-add-row` / `btn-remove-row-{i}` when a section has several lists |
| `requirement-{key}` | the Required/Optional badge (`requirement-existing`, `requirement-new`, `requirement-facing_challenges`, `requirement-identified_problems`, `requirement-service_impacts`) |
| `reference-{TYPE}` / `impact-{CODE}` | selection checkboxes, using the canonical uppercase code |
| `btn-clear-direct-site`, `btn-clear-pop-site`, `btn-clear-service-{existing\|new}` | explicit clears |
| `migrate_domain`, `migrate_hosting` | the two migration checkboxes |
| `announcement-warning` | the non-blocking `06` §43 warning |

## Layout and copy

- Section root is a `<div class="space-y-6">` holding one or more
  `<section class="space-y-4 rounded-lg border border-border bg-card p-6">`.
- `h2` is `text-base font-semibold`; helper text is `text-sm text-muted-foreground`.
- Fields sit in `grid grid-cols-1 gap-4 sm:grid-cols-2` (three columns where the
  fields are short). Narrative fields use `rows`.
- No shadows, gradients, decorative icons or emoji. The only icon in a section is
  the remove `X` inside `RepeatableRows`.
- **All UI copy is English** (a decision the project owner made during the
  cleanup). Business terms keep their document spelling: "Specific requirements
  (SLA)", "Performance information", "Target KPI".

## How the sections are tested

Each section has a test file next to it following the same skeleton:

```ts
import Section, { type XFields } from './Section.vue';

function mountSection(modelValue: XFields = {}, props: Record<string, unknown> = {}) {
    return mount(Section, { props: { modelValue, subtype: 'MAINTENANCE', ...props } });
}

function lastModel(wrapper: VueWrapper): XFields {
    const updates = wrapper.emitted('update:modelValue');
    if (!updates || updates.length === 0) throw new Error('no update emitted');
    return updates[updates.length - 1]?.[0] as XFields;
}
```

What every section test proves, and what a new one should prove too:

1. stored values render back, including `0` and `false`;
2. **every field writes its own key** — a loop over the section's full field list
   that sets a value through the DOM and asserts the emitted patch (this is the
   test that catches a mistyped key, which is otherwise a silent bug);
3. a blank input clears that key to `null`;
4. collections add, remove and renumber, and stop at their maximum;
5. selections add and remove rows, and a description never selects its option;
6. server messages appear under the right field and the right row;
7. requiredness markers follow the subtype matrix;
8. `disabled` disables every control and the section sends no request.
