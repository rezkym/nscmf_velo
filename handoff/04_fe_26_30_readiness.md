# 4. What FE-26 … FE-30 will find, and what will bite

> Part of the 2026-09-20 frontend handoff. Status, scope and authorities: [README](README.md).

Each section below lists the target files named by the microtask, the authority
sections that task tells you to re-read, what already exists in the codebase, and
the rules that are easy to get wrong. Nothing here replaces reading
`microtask_fe/FE-xx.md` and the documents it cites.

---

## FE-26 — Change Result editor while Draft/Revision

- **Target files** (`microtask_fe/FE-26.md`): `resources/js/features/nscmf/change/ResultsSection.vue`, test adjacent.
- **Re-read**: `06` §46–48; `11` §29; `12` §28–29; `07` §25–26.
- **Route it feeds**: `PATCH /nscmf/{record}/draft`, only while `DRAFT` / `REVISION_REQUIRED`.

### Already in place

| Need | Where |
|---|---|
| Row type | `ChangeResultRow` in `features/nscmf/types.ts` (`row_no`, `result_summary`, `performance_information`, `result_status`) |
| Payload rule | `results` in `draftPayload.ts`: natural key `row_no`, **max 5**, content fields the three above |
| Row UI | `RepeatableRows` with `:max="5"`, renumbering `row_no` for you |
| Field UI | `DraftField` with `rows` for the two narratives and a plain input for the status |
| Error lookup | `fieldError(errors, 'change.results', index, 'result_summary')` |
| Read-only view | `Pages/Nscmf/Show.vue` already renders the results table (`[data-testid="table-results"]`) |

### Rules that bite

- **`result_status` is free text, max 255** (`06` §48). `12` §28.1 shows `"SUCCESS"`
  in its example and `12` §28.2 says in writing that it is *not* an enum and must
  not be narrowed into one. Do not build a dropdown.
- Limits per used row: summary 2,000, performance information 2,000, status 255
  (`06` §48). Up to 5 rows (`06` §46, `12` §28.2 `row_no results 1..5`).
- A draft may hold partial rows and zero rows; completeness is judged at
  Submit/Forward (`06` §46, §48). `draftPayload` keeps a row as soon as one
  content field is filled, and drops a row that carries only its `row_no`, so a
  started-but-incomplete row still reaches the server.
- **`results` must not be sent to `/draft` in `PENDING_REVIEW`.** `12` §28.2: in
  that state it goes through `12` §29 only, and a `results` key sent to `/draft`
  is *rejected with 422, not silently dropped*. `buildChangeDraftPayload` sends
  only the keys the caller passes, so the container must omit `results` when the
  record is not `DRAFT`/`REVISION_REQUIRED`. That is FE-26 AC4.
- Editing results while `PENDING_REVIEW` also needs `nscmf.change.result.edit`
  plus ownership and `family=CHANGE` (`06` §45, `04` §12) — but the eligibility
  itself is the server's call; the UI only decides what to show.

---

## FE-27 — Save Draft, autosave and optimistic conflict

- **Target files**: `resources/js/features/nscmf/useDraftSave.ts`, test adjacent.
- **Re-read**: `07` §21–23; `11` §14; `12` §21, §27–28; `19` T20.
- **Routes**: `GET /nscmf/{record}/edit`; `PATCH /nscmf/{record}/draft`.

### Already in place

- `buildActivationDraftPayload(recordVersion, fields)` and
  `buildChangeDraftPayload(recordVersion, fields)` produce the exact bodies of
  `12` §27.1 / §28.1 and **never increment `record_version`** — which is what
  FE-27 AC1 asks for: send the version the server acknowledged, not `version++`.
- Whole-set collection semantics (AC5) are already implemented and covered by the
  `12` §129.1 matrix in `draftPayload.test.ts`.
- The six sections emit model updates only, so a composable can own dirty state,
  debouncing and in-flight tracking without fighting them.
- Error routing is decided: field errors from the validation bag through
  `fieldError`, domain errors from `flash.domain_error` through `domainError`
  (`12` §10). `409 NSCMF_VERSION_CONFLICT` (`12` §21) is a domain error.
- `components/RequestFeedback.vue` already renders 409/422/503/network states and
  a save indicator, and it never claims "Saved" while the session is revoked.

### Rules that bite

- `12` §21: draft, revision and result mutations all carry the current expected
  `record_version`; a mismatch is `409 NSCMF_VERSION_CONFLICT`, and the UI must
  not auto-retry or silently merge.
- Omission means "unchanged" (`12` §27). If you send a key you did not intend to
  change, you overwrite; if you drop a collection key, you leave it alone. Decide
  deliberately which sections contribute keys to a given save.
- The edit page will mount the six sections; bind the same draft object to each
  and use the exported slice types (`GeneralFields`, `BandwidthFields`,
  `NetworkFields`, `SiteFields`, `PurposeFields`, `PlanFields`).

---

## FE-28 — Submit, resubmit and Revision Mode

- **Target files**: `resources/js/features/nscmf/SubmitPanel.vue`, test adjacent.
- **Re-read**: `06` action validation; `05` submit/resubmit; `07` §22, §60, §62; `12` §30; `19` T22.
- **Route**: `POST /nscmf/{record}/submit`, carrying `record_version`.

### Already in place

- `fieldError` maps nested 422 paths such as
  `activation.service_blocks.0.service_id` and
  `change.improvement_items.0.target_kpi` straight onto the control that owns them
  — the sections already render them that way, which is FE-28 AC2.
- `components/ActionDialog.vue` handles a confirm dialog with an optional reason.
- `STATUS_LABELS` and the badge separation on `Show.vue` keep business status and
  the archived flag apart, so a submit must not fake a status change locally
  (AC5).

### Rules that bite

- `12` §30: `DRAFT → PENDING_REVIEW` and `REVISION_REQUIRED → PENDING_REVIEW`;
  the first successful submit establishes iteration 1 and `Requested By`, and a
  resubmit keeps the iteration. The client never computes sign-offs or iteration.
- Warnings are not blockers: `06` §43 announcement mismatch and `06` §44 missing
  attachment for Upgrade/Emergency are warnings only.
- The permission is `nscmf.submit` (`04` §12), and the request number and family
  are immutable after the first submit (`06` §20).

---

## FE-29 — Narrow Change Result-only update

- **Target files**: `resources/js/Pages/Nscmf/ChangeResults.vue`, test adjacent.
- **Re-read**: `04` `nscmf.change.result.edit`; `06` result gating; `07` §26; `12` §29; `19` T25.
- **Route**: `PATCH /nscmf/{record}/change-results`.

### Already in place

- The row type, the row component and the field components are the same ones
  FE-26 uses, so the editor itself should be reused rather than rebuilt (the
  microtask says the same: "Reuse editor di result-only nanti dengan
  container/request berbeda").

### Rules that bite

- **A new, separate payload builder is required.** `12` §29 accepts exactly
  `{ record_version, results }`. `buildChangeDraftPayload` wraps everything in
  `change: { … }`, so it is the wrong shape here — do not reuse it. Any other key,
  including planning, header, service impact, attachment or workflow fields, is
  rejected with 422 (`12` §29). That is FE-29 AC1.
- `results` still follows whole-set replacement over `row_no` 1..5 (`12` §29,
  `12` §7.4.1), so the same normalisation rules apply; consider extracting the
  row normaliser from `draftPayload.ts` rather than writing a second one.
- Eligibility is `family=CHANGE` + `business_status=PENDING_REVIEW` + owner +
  `nscmf.change.result.edit` (`12` §29, `06` §45). Only the three result fields
  are editable in that state; planning is read-only context (`06` §47) — render it
  with `DetailList`/`DetailTable`, which is what `Show.vue` already does.
- A `409` means the reviewer moved the record; stop editing, offer a refresh, and
  never claim the work was saved (AC3).

---

## FE-30 — Shared Review Queue

- **Target files**: `resources/js/Pages/Review/Index.vue`, test adjacent.
- **Re-read**: `04` review eligibility; `07` §29; `12` review page/list; `19` T23.
- **Routes**: `GET /review`; `GET /review/{record}` (both listed in `12` §44).

### Already in place

- `components/ResourceTable.vue` provides search, per-page, sorting with a
  whitelist, pagination and stale-response handling, and it emits a bounded
  query — the parent owns the query and does the fetching.
- `usePermissions()` gives `can`/`canAny` over the effective permissions; the
  layout already gates the Review nav item on `nscmf.review`.
- `RecordSummary` in `types.ts` holds `id`, `request_no`, `family`, `subtype` and
  `team`. The queue will need more columns (status, requester, submitted at):
  extend the type from the real projection, and note gap **G02** — `12` §24/§100
  shapes are representative, not an exact TypeScript contract.

### Rules that bite

- The queue is **Team-neutral** (`04` §13, `12` §45): no Team scoping, no claim,
  no lock, no assignment. Opening a record is a `GET`/link and must not mutate
  anything (AC2).
- Read permission and action permission are separate: `nscmf.review` lets someone
  see the queue, while `nscmf.review.forward` / `.return` / `.reject` are separate
  permissions (`04` §13). Do not show a Forward row action just because the queue
  is visible (AC3).
- The permission names are exactly those in `04` §12–§14; there is no seeded
  wildcard such as `nscmf.review.*` (`04` line 136).

---

## Cross-cutting reminders for all five

1. Follow the TDD order in `microtask_fe/02_ATURAN_EKSEKUSI_TDD.md`: a failing
   test that fails for the right reason, a `test:` commit, then the minimum
   implementation, then the gates. A missing import is not a RED.
2. Run all five gates per slice; keep coverage where it is (100% today, threshold
   80%) and never widen `coverage.exclude`.
3. No new npm dependency without explicit approval (`AGENTS.md`).
4. Never invent a route, a permission name, an error code or a field. If the
   contract is silent, that is a gap to report, not a blank to fill.
5. A human review is required before merge, and a **human security review** for
   anything touching auth, permission, session, credential, upload, export,
   signing, public privacy, audit or admin-sensitive surfaces
   (`microtask_fe/02_ATURAN_EKSEKUSI_TDD.md` §7). An agent must not approve or
   merge its own work.
