# 2. Shared building blocks

> Part of the 2026-09-20 frontend handoff. Status, scope and authorities: [README](README.md).

Reuse these before writing anything new. Every signature below was read from the
file it names. Paths are relative to `resources/js/`; the alias `@` points at
that directory.

## UI primitives (`components/ui/`)

| File | API |
|---|---|
| `Button.vue` | props `variant?: 'primary' \| 'secondary' \| 'destructive' \| 'ghost'` (default `primary`), `size?: 'sm' \| 'md'` (default `md`), `type?: 'button' \| 'submit'` (default `button`). Slot is the label. |
| `button.ts` | `buttonVariants` (class-variance-authority). Use it to make an Inertia `<Link>` look like a button: `:class="buttonVariants({ variant: 'secondary' })"`. |
| `Badge.vue` | props `variant?: 'neutral' \| 'success' \| 'warning' \| 'destructive'` (default `neutral`). |
| `Alert.vue` | props `variant?: 'error' \| 'warning' \| 'info'` (default `info`), `title?: string`. `error` renders `role="alert"`, the others `role="status"`. |
| `Modal.vue` | props `open`, `title`, `description?`, `busy?`, `wide?`, `returnFocusTo?`; emits `close`; slots default and `footer`. Traps focus, labels itself with `useId()`, restores focus on close, and **ignores Escape while `busy` is true**. |
| `FormField.vue` | props `id`, `label?`, `help?`, `error?`, `required?`, `disabled?`, `readonly?`. Slot props `{ id, describedBy, disabled, readonly, hasError }`. Renders the error as `role="alert"` at `#{id}-error`, the help text at `#{id}-help`, and a required marker `[data-required]` inside the label. |
| `control.ts` | `controlClass` — the one class string for `<input>`, `<select>` and `<textarea>`. |

`Badge.vue` and `Alert.vue` are the **only** components that should carry palette
colours (amber/emerald); `components/RequestFeedback.vue` still styles its own
panels and is the one known exception (see
[05](05_open_items_and_boundaries.md)). Everywhere else uses the theme tokens
from `resources/css/app.css`
(`bg-card`, `text-muted-foreground`, `border-border`, `text-destructive`, …).
`07` §7 fixes the brand palette and the semantic mapping.

## Draft form inputs (`features/nscmf/`)

| File | API |
|---|---|
| `DraftField.vue` | `v-model` of `string \| null`. Props `id`, `label`, `type?: 'text' \| 'date'` (default `text`), `rows?` (renders a `<textarea>` when set), `maxlength?`, `help?`, `error?`, `required?`, `disabled?`. Text is stored exactly as typed; a blank or whitespace-only value becomes `null` (`toNullableText`). |
| `DraftNumberField.vue` | `v-model` of `number \| null`. Props `id`, `label`, `suffix?` (unit shown beside the control), `min?`, `max?` (native hints only), `help?`, `error?`, `required?`, `disabled?`. Blank or non-finite becomes `null`; **0 and negative values are kept** (`toNullableNumber`). |
| `RepeatableRows.vue` | generic over `T extends object`. `v-model` of `T[]`. Props `addLabel`, `newRow: () => T`, `max?`, `disabled?`, `emptyHint?`. Slot props `{ row, index, update(patch: Partial<T>) }`. Renders `[data-testid="btn-add-row"]` and `[data-testid="btn-remove-row-{index}"]`, disables adding at `max` or when `disabled`, and **renumbers `row_no` positionally** after add and remove (rows without `row_no`, such as selections, are left untouched). |
| `DetailList.vue` | read-only `<dl>`; props `items: DetailItem[]` where `DetailItem = { key, label, value }`. Each value renders at `[data-testid="field-{key}"]`. |
| `DetailTable.vue` | read-only table; props `title`, `columns: { key, label }[]`, `rows: Record<string, string>[]`. Renders `None` when `rows` is empty. Give it a `data-testid` from the caller. |
| `QueueCard.vue` | dashboard card; props `title`, `state?: QueueCount` (`{ count?, loading?, error? }`), `items?: RecordSummary[]`, `href?`; emits `retry`. |

The id you pass to `DraftField`/`DraftNumberField` is also the anchor for the
server message: the error element is `#{id}-error`. Ids use `-` (not `.`) so they
stay valid CSS selectors, while wire paths use `.` — see
[03](03_draft_section_contract.md).

## Domain helpers (`features/nscmf/`)

### `types.ts` — canonical values and draft shapes

Closed sets as string unions with uppercase wire values, each with a label map:
`NscmfFamily`, `ActivationSubtype`, `ChangeSubtype`, `NscmfSubtype`,
`NumberingMode`, `ReferenceType`, `ServiceContext`, `ServiceStatus`,
`ServiceImpactCode`, `MonitoringUnit`, `AnnouncementTiming`; label maps
`FAMILY_LABELS`, `SUBTYPE_LABELS`, `STATUS_LABELS`, `REFERENCE_TYPE_LABELS`,
`SERVICE_STATUS_LABELS`, `SERVICE_IMPACT_LABELS`, `MONITORING_UNIT_LABELS`,
`ANNOUNCEMENT_TIMING_LABELS`; plus `SUBTYPES_BY_FAMILY` (a non-empty tuple per
family) and `RecordSummary`.

Row and block types: `ReferenceSelection`, `ServiceBlockRow`, `SlaItemRow`,
`VirtualConnectionRow`, `PriorityDestinationRow`, `DirectSiteBlock`,
`PopSiteBlock`, `FacingChallengeRow`, `IdentifiedProblemRow`,
`ServiceImpactSelection`, `ImprovementItemRow`, **`ChangeResultRow`**, and the two
aggregates `ActivationDraftFields` and `ChangeDraftFields`. Every field is
optional, because omission means "unchanged" (`12` §27).

`ChangeResultRow` is `{ row_no: number; result_summary?: string | null;
performance_information?: string | null; result_status?: string | null }`, and the
comment on `result_status` records that `06` §48 makes it free text, not an enum.

### `contracts.ts` — transport guards (FE-01)

`CANONICAL_BUSINESS_STATUSES`, `BusinessStatus`, `isBusinessStatus`,
`parseChangeResult`, `parseDateOnly` (keeps `YYYY-MM-DD` as a string so no
timezone can shift it), `ApiErrorEnvelope`, `parseApiErrorEnvelope`,
`SuccessEnvelope`, `PaginationMeta`.

### `draftPayload.ts` — the PATCH body

```ts
buildActivationDraftPayload(recordVersion: number, activation: ActivationDraftFields): ActivationDraftPayload
buildChangeDraftPayload(recordVersion: number, change: ChangeDraftFields): ChangeDraftPayload
```

They produce `{ record_version, activation }` / `{ record_version, change }` exactly
as `12` §27.1 and §28.1 show. Behaviour, all covered by `draftPayload.test.ts`
(written as the `12` §129.1 matrix):

- only known keys are copied; an unknown key is dropped, never forwarded;
- a key that is absent stays absent (unchanged); an explicit `null` clears;
- blank strings become `null`; `0`, `false` and negative numbers survive;
- a collection that is present is sent as the whole set; `[]` clears it;
- a row whose content fields are all blank is dropped, **except** selection rows
  (`references` keyed by `reference_type`, `service_impacts` keyed by
  `impact_code`), which survive without a description;
- duplicate natural key → throws; `row_no` outside its range → throws
  (`sla_items`, `virtual_connections`, `priority_destinations`,
  `facing_challenges`, `identified_problems`, `improvement_items` are 1..3;
  **`results` is 1..5**);
- a site block is an object or `null`; `{}` throws (`12` §27.1);
- `record_version` is passed through and never incremented; a value that is not a
  positive safe integer throws.

The caller decides which keys to include. That is how the
`results`-in-`PENDING_REVIEW` rule is honoured — see
[04](04_fe_26_30_readiness.md).

### `fieldErrors.ts` — server messages by wire path

```ts
type FieldErrors = Record<string, string | undefined>;
fieldError(errors, ...segments: (string | number)[]): string | undefined
```

Segments are joined with `.`, so a row message is
`fieldError(errors, 'change.results', index, 'result_summary')`. A blank message
counts as no message.

## Cross-cutting helpers

| File | API |
|---|---|
| `composables/usePermissions.ts` | `usePermissions()` → `{ user, can(permission), canAny(permissions) }`, read from the shared auth props. Permissions are the only authorization input the UI reads (`04`); Team never authorizes anything. |
| `composables/useFocusTrap.ts` | `useFocusTrap(panelRef, isOpen, { onEscape, initialFocus?, returnFocusTo? })`. `Modal.vue` already uses it; you rarely need it directly. |
| `types/auth.ts` | `AuthUser`, `SharedAuthProps`. |
| `lib/apiErrors.ts` | `ErrorBag`; `firstError(errors, fallback, preferredKeys?)`; `DomainError = { code?, message? }`; `domainError(flash)` reads `flash.domain_error` defensively and returns `null` when there is none. |
| `lib/formInputs.ts` | `toNullableText`, `toNullableNumber` (the field components already apply them). |
| `lib/utils.ts` | `cn` (class merge), `toggleItem(list, item)` (immutable toggle), `groupBy(items, keyOf)`. |
| `lib/inertia.ts` | `resolvePage` used by `app.ts`. |

## Table, dialogs and admin pieces

| File | Notes |
|---|---|
| `components/ResourceTable.vue` | Exports `ColumnDef`, `TableQuery` (`page` required, `per_page` optional), `TablePaginationMeta`, `ResourceTableProps`. Emits `update:query`. Every emitted query passes one place that bounds `per_page` to 1..100 and falls back to 25, so a value coming from the parent or the URL cannot break the list contract. A sort on a column outside `sortWhitelist` emits nothing. Stale responses are rejected by comparing `requestId` (numeric ids compare by value, others in their own order). Test ids: `table-search-input`, `table-per-page-select`, `table-loading-state`, `table-error-state`, `table-empty-state`, `header-{key}`, `sort-button-{key}`, `pagination-prev`, `pagination-next`. |
| `components/ReauthenticationDialog.vue` | props `open`, `targetActionTitle?`, `targetActionDescription?`, `errorCode?`, `serverErrorMessage?`, `triggerElement?`; emits `success`, `cancel`. Show it before a sensitive action and run the action on `success` (`10` §24, `12` §79). |
| `components/ActionDialog.vue` | props `open`, `title`, `requestNo?`, `reasonRequired?`, `pending?`, `error?`, `consequence?`, `destination?`, `triggerElement?`; emits `confirm({ reason })`, `cancel`. Intended for workflow actions that need a reason. |
| `components/RequestFeedback.vue` | FE-07 feedback surface for 401/403/404/409/422/429/503 and network failures, plus the save indicator. Not mounted by any page yet; FE-29 lists FE-07 as a prerequisite. |
| `features/administration/*Manager.vue` | The Teams, Users and Roles page bodies, reused by `Pages/Administration/*` and by `Pages/Administration/Setup.vue`. They export `Team`, `UserRow`, `TeamOption`, `RoleOption`, `RoleRow`, `PermissionCatalogItem`. |
| `features/administration/OneTimeCredential.vue` | Shows a server-generated temporary password once; props `open`, `temporaryPassword?`, `username?`; emits `dismiss`. The parent owns the secret and clears it. |
| `features/administration/temporaryCredential.ts` | `temporaryCredentialFromFlash(flash)` → `{ password, username }` or `null`. |

## The Inertia test double (`testing/inertia.ts`)

Use it in every test that mounts something touching Inertia:

```ts
vi.mock('@inertiajs/vue3', async () => (await import('@/testing/inertia')).inertiaModule);
```

Exports:

| Name | Use |
|---|---|
| `resetInertia(props)` | Reset page props, recorded forms and requests. Call it in `beforeEach`. |
| `pageProps` | The reactive page props object the mocked `usePage()` returns. |
| `forms` | Every `useForm()` created, in creation order, with `processing`, `errors`, `reset`, `clearErrors` and recording `get/post/put/patch/delete`. |
| `requests` | Every recorded request: `{ method, url, data, options }`. |
| `lastRequest(url \| RegExp)` | The most recent matching request; call `options.onSuccess?.()` / `options.onError?.(bag)` to simulate the server. |
| `flashDomainError({ code, message })` | Simulates the server flashing a domain error and awaits the re-render. |
| `router` | `vi.fn()`-backed `get/post/put/patch/delete/visit/reload`. |
| `Link`, `Head` | `Link` renders an `<a href>`; `Head` renders nothing. |

A component under test that uses `defineModel` runs in local mode when the test
passes only `modelValue`: the component updates its own copy **and** emits
`update:modelValue`, so assert on `wrapper.emitted('update:modelValue')`.
