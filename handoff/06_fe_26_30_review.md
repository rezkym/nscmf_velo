# 6. Independent review and patch of FE-26 … FE-30

> **Date:** 2026-09-21
> **Branch:** `fix/fe-26-30-closure` — **not merged, not pushed, no Pull Request**
> **Base:** `main` @ `0563233`
> **Evidence level:** UI isolated verified. No NSCMF backend route exists.

This is a review of work delivered by another team, plus the patches that review
produced. It is **not** an independent security review: one agent both reviewed
and patched. A human implementation review and a human security review are still
required (`microtask_fe/02_ATURAN_EKSEKUSI_TDD.md` §7), and the agent has not
merged its own work.

Authorities used: `microtask_fe/FE-26..30` and `01..07`, `project_doc` 04, 05,
06, 07, 12, `AGENTS.md`, `SOUL.md`. Where the Inertia wire mattered, the
installed `@inertiajs/core` was read directly rather than trusted from prose.

## Gates

| Gate | Before (as received) | After |
|---|---|---|
| Tests | 444 passed, 46 files | **461 passed, 46 files** |
| Statements | 100% (1783/1783) | **100% (1737/1737)** |
| Branches | 100% (1774/1774) | **100% (1671/1671)** |
| Functions | 100% (663/663) | **100% (678/678)** |
| Lines | 100% (1647/1647) | **100% (1592/1592)** |
| ESLint / Prettier / vue-tsc / vite build | PASS | **PASS** |

The incoming claim of 444 tests at 100% reproduced exactly. The defects below
were all sitting behind that green. `coverage.exclude` is unchanged, there is no
`v8 ignore` anywhere in `resources/js`, and no commit carries an AI
co-author or generated-by trailer.

Reproduce:

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build
```

## What was wrong, and what was done

### 1. FE-26 AC4 had no implementation and a test that proved nothing

`ResultsSection.test.ts` built `{ ...fields, results: undefined }` itself and
then asserted the payload had no `results`. It proved its own literal and never
mounted the component. No production code withheld `results`:
`buildChangeDraftPayload` sent them whenever present, and `useDraftSave` did not
know the record's status. The only attempt at a guard lives on `wt/t_d71c0afa`,
which was never merged.

`12` §28.2: a `results` key sent to `PATCH /nscmf/{record}/draft` outside
`DRAFT`/`REVISION_REQUIRED` is **rejected with 422, not silently dropped**.

Fixed in `7a2914f`. `buildChangeDraftPayload(recordVersion, change, businessStatus)`
omits the key — omitted, never `[]`, which would delete every stored row
(`12` §7.4.1). The parameter is **required**, not optional, so a caller cannot
skip the guard; that is exactly how the earlier attempt stayed dormant.
`useDraftSave` gained the matching required option and passes it through.

### 2. A queued save could hang forever

`handleNextQueued()` discarded the queued save's resolver instead of calling it
when the in-flight request conflicted, so `save()` never settled. FE-28 AC1
gates Submit on that promise: one conflict would wedge the submit button
permanently, with no error shown. The RED test did not merely fail — it timed
out.

Fixed in `e11d6d5`. The resolver is always released; only the follow-up save is
cancelled.

### 3. Conflict classification by substring, and invented error codes

`code?.includes('CONFLICT')` also matched `REQUEST_NO_CONFLICT`,
`NSCMF_STATE_CONFLICT` and `NSCMF_ARCHIVED_CONFLICT` — four distinct `12` §12
codes answered with one remedy and the words "a newer version exists".
`ChangeResults` invented `HTTP_EXCEPTION`, which is in no catalogue, and both
files fabricated `NSCMF_VALIDATION_FAILED` for errors the server had not named.

Fixed in `fd590d0`, `e11d6d5`, `bbcd438`. `RECORD_CONFLICT_CODES` in
`lib/apiErrors.ts` is an exact allowlist of the three codes that mean the record
moved; only `NSCMF_VERSION_CONFLICT` is described as a newer version. No code is
claimed that the server did not send — the HTTP status carries the meaning and
`RequestFeedback` already classifies on it (`12` §10, gap **G07**).

Not a defect: `UNKNOWN_ERROR` is the sentinel `parseApiErrorEnvelope` in
`contracts.ts` returns for a body without a code. `useDraftSave` filtering it out
was correct; my first reading called it invented, and that was wrong.

### 4. The Inertia flash channel was guessed

The installed `@inertiajs/core` carries flash at `Page.flash`
(`types/types.d.ts:154`), `onHttpException` returning `false` cancels page
processing, and `onError` and `onSuccess` are mutually exclusive
(`dist/index.js`, `Response.process`). `useDraftSave` fell back to
`page.props.flash` — dead against the real library — and then to treating the
whole object as a flash bag. `ChangeResults` used the right channel through an
`as unknown as` double cast.

Fixed in `fd590d0`. One `pageDomainError` reader, used by both.

> The dispatch description in `handoff/mc-26-30-closure.md` §FE-29 is **not
> accurate**. The installed library is the authority.

### 5. ChangeResults discarded unsaved work silently

Any advance of `props.record.record_version` called `resetToRecord()`, replacing
the editable rows with the server copy. A reviewer acting on the record advances
the version through a partial reload, so the owner's typed text vanished without
a word.

Fixed in `bbcd438`. The page keeps the rows it last loaded, so local typing is
told apart from a server change. When the record moves while rows are unsaved it
states the conflict and offers the refresh `07` §23 and FE-29 AC3 ask for; with
nothing typed it still resyncs.

### 6. Review queue invented its filter parameters

The page allowlisted `archived`, `request_date_from`, `request_date_to`,
`owner_user_id` and `team_id`. `12` §45 says the queue is permission-driven and
that Team may be an informational filter, but it **names no filter parameter**,
and the page renders no filter control, so nothing could produce them. Gap
**G02** asks for the approved response to be recorded before binding.

Fixed in `4cbcfb4`. The queue sends only what FE-30 names — search, sort,
pagination — so nothing unexpected can reach the query string at all, which is a
stronger guarantee than the allowlist it replaces. The `RESERVED_QUERY_KEYS`
guard that could never match (the two sets were disjoint) is gone with it.

### 7. Duplication, dead code and UI drift

- The Change result row rule existed **four** times (`draftPayload.ts`,
  `buildChangeResultsPayload`, an inline mapper repeated 3× in one file,
  `parseChangeResult`), and `blankToNull` verbatim twice. The narrow
  `/change-results` payload now reuses the shared normaliser, which happens to
  produce identical messages; only the envelope differs (`12` §29). `resultRowsOf`
  replaces the triplicated mapper.
- `SubmitPanel` had drifted off the standard locked during the FE-11..25 cleanup:
  a raw `<button>`, hand-picked blue and amber utilities, and the raw `12` §12
  error code printed to the user in monospace (`06` §67 asks for an actionable
  message, not developer output). It is back on `Alert` and `Button`.
- `resolveControlByPath` searched eight id spellings across three tiers,
  including `field-` prefixes and dotted ids **no section has ever produced**. It
  now looks for the two things sections actually publish. A new test proves the
  scalar path against a real mounted section instead of a hand-built fixture.
- `PATH_LABELS` dropped its `Object.create(null)` + `hasOwnProperty` guard — a
  static module-scope literal needs no prototype shield, and that pattern was
  removed once already in the earlier cleanup.
- `inFlightSnapshot` in `useDraftSave` was write-only once its single read could
  use the snapshot already in scope; it and its five assignments are gone.
- Pagination bounds were applied twice. Truncation moved into
  `ResourceTable.emitQuery` (FE-05 owns the bounds), and the page passes through.

### 8. Test integrity

- Two `ChangeResults` tests reached script-setup bindings through `wrapper.vm`.
  The FE-11..25 cleanup removed every `defineExpose` so tests would stop driving
  internals; `.vm` is the same thing through another door. Both now run through
  props and real clicks. The malformed-projection case is genuinely reachable —
  a server projection *can* carry a duplicate natural key — so it arrives that
  way instead of being assigned into the model.
- `RequestFeedback.test.ts` passed `showSaveStatus`, a prop that does not exist
  and which Vue silently ignored.
- Six `Review/Index` tests drove `ResourceTable.vm.$emit` with values
  `ResourceTable` cannot emit, testing the page's compensation rather than
  behaviour. One stronger forwarding test replaces them.
- Four `useDraftSave` tests pinned removed guesswork; one pinned the dead
  `page.props.flash` branch with a hand-built `usePage` and an invented
  `VERSION_CONFLICT` code, and was removed.

Every removal is recorded in its commit body with a reason, in the format used
during the FE-11..25 cleanup.

## Corrections to my own review

Two of my initial findings were wrong, and are recorded rather than quietly
dropped:

1. **The editor gate was not inconsistent.** I claimed `ChangeResults` disabled
   the editor and hid the submit button on different conditions from its latch.
   They were already consistent with each other, both keyed on the version
   conflict; `hasTerminalError` is a separate concern — suppressing a late
   `onSuccess`. Tying the gate to it would have made a 422 or a 403 lock the
   form, which two existing tests correctly rejected. A stale base version stays
   the gate, now behind a named computed.
2. **`UNKNOWN_ERROR` was not invented by FE-27** — see §3.

## Still open, and honest limitations

- **Evidence is UI isolated.** No NSCMF backend route exists. Every response,
  flash, projection and `allowed_actions` shape is still an assumption:
  **G01** (no dedicated GET path for the result-only page), **G02** (record and
  pagination projections are representative, not exact), **G03** (no transport
  for header/request-date correction), **G07** (`VALIDATION_FAILED` vs
  `NSCMF_VALIDATION_FAILED` — handled without hardcoding either).
- **`SubmitPanel` has no consumer.** `Pages/Nscmf/Edit.vue` is FE-27's page and
  does not exist. The panel's whole error surface depends on props from a parent
  nobody has written, and `handleSubmit` subscribes to neither
  `onHttpException` nor `onNetworkError`. Building that page was out of scope for
  a review; whoever writes `Edit.vue` must supply `errors`, `domainError`,
  `warnings` and `saveState`, and should revisit the panel's error handling then.
- **`allowed_actions` token values are assumed.** `isActionAllowed` tests for the
  literal `'submit'`. `12` §24 and §101 say `allowed_actions` is a server-derived
  presentation hint but do not enumerate its values (**G02**).
- **`RequestFeedback.vue` still uses amber and emerald utilities** instead of
  `Alert`. This predates FE-26..30, belongs to FE-07, and is already recorded in
  [05_open_items_and_boundaries.md](05_open_items_and_boundaries.md). Left alone
  deliberately rather than widening this scope.
- **Playwright is still blocked by G08.** No browser journey was run.

## Branch inventory (reported, nothing deleted)

Already merged into `main`, history only: `chore/bootstrap-application`,
`docs/handoff-fe-11-25`, `docs/handoff-merge-record`, `docs/handoff-starting-point`,
`docs/sync-local-specification-updates`, `feat/fe-11`–`feat/fe-17`,
`feat/fe-20`–`feat/fe-25`, `fix/fe-05-resource-table-per-page`,
`refactor/export-section-field-types`, `refactor/fe-11-25-cleanup`,
`review/fe-11-25`, `test/fe-01-10-coverage`, `wt/t_ae7e825c`, `wt/t_f8977219`,
`wt/t_fe500dec`.

Still carrying unique commits:

| Branch | Ahead of `main` | Note |
|---|---|---|
| `fix/fe-26-30-closure` | 66 | this work |
| `feat/fe-26` … `feat/fe-30` | 2–15 | folded into the closure branch |
| `feat/fe-29-f29r12` | 12 | same tip as `feat/fe-29`; duplicate |
| `wt/t_d71c0afa` | 4 | the unmerged AC4 guard attempt, now superseded |
| `wt/t_1000e51f`, `wt/t_1f4972ff` | 3, 13 | worker branches folded in |

`main` is still unpushed (207 ahead of `origin/main`); publishing it is the
project owner's decision.

## If something needs to be undone

Each patch is a separate commit on `fix/fe-26-30-closure` and can be reverted on
its own: `fd590d0` (shared classifier), `e11d6d5` (useDraftSave),
`7a2914f` (FE-26 AC4), `bbcd438` (ChangeResults), `493601a` (SubmitPanel),
`4cbcfb4` (Review queue), `8f3c0c2` (test integrity). Each is preceded by its
`test:` commit.
