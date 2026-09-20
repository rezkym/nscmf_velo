# 5. Open items, deliberate removals and boundaries

> Part of the 2026-09-20 frontend handoff. Status, scope and authorities: [README](README.md).

## Open gaps that touch FE-26..30

These are rows of the register in `microtask_fe/06_KONTRAK_DAN_GAP.md`. None of
them is closed, and the register's own instruction is quoted, not paraphrased.

| Gap | What is not final | Safe action from the register |
|---|---|---|
| **G01** | Dedicated GET paths for setup / temporary-password / result-only pages are not all explicit in `12` | "Mount isolated; bind approved existing render flow saat BE menyediakan, jangan invent URL/handler" |
| **G02** | `12` §24, §100–101 shared props and record projection are representative, not exact TypeScript shapes | "Pisahkan local view-model; catat sanitized actual approved response sebelum binding" |
| **G03** | Header / request-date / number-correction behaviour exists in `06`, but the `12` §27–28 draft body has no explicit transport for it | "Jangan menambah request_date/subtype/number fields ke PATCH secara diam-diam" |
| **G05** | Numeric rate-limit buckets and scanner timeouts are not fixed | show the server's 429/503; do not hardcode a countdown |
| **G07** | `12` §27 uses `NSCMF_VALIDATION_FAILED` while the common catalogue also has `VALIDATION_FAILED` | "Handle 422 errors envelope tanpa hardcode single name" |
| **G08** | Playwright runs against the `.env` database; no isolated disposable runtime yet | no mutating browser journeys until that exists |
| **G09** | Several action request/response keys are not explicit, including the temporary-password keys | "Tentukan view-model lokal saja … approved exact request fixtures diperlukan" |

What this means concretely for the code that was handed over:

- `Pages/Administration/Setup.vue` derives its step position from a `readiness`
  prop and links to `/dashboard`; it invents no route (G01).
- `lib/apiErrors.ts` `domainError()` and
  `features/administration/temporaryCredential.ts` are **local view-models** over
  shapes that `12` describes in prose (G02, G09). Confirm them against the real
  responses before trusting them in integration.
- Nothing adds `request_date`, `subtype` or the request number to the draft PATCH
  body (G03).

## Things that were removed on purpose — do not bring them back

The cleanup deleted these because no specification asks for them and each one
hid a bug or faked evidence:

| Removed | Why |
|---|---|
| Client submit validation inside the sections, with `submit-valid` / `submit-invalid` emits and a hidden `validate-submit-btn` | requiredness belongs to the server (`06` §10); the hidden button existed only so a test could trigger validation |
| `defineExpose` in production components | tests drove internals instead of the DOM; there is now zero `defineExpose` in `resources/js` |
| A hand-rolled hash and a `globalThis.__alyaOneTimeConsumedTokens` registry in the credential dialog | security theatre around a value the parent already owns |
| A prototype-pollution guard inside the payload builder | the builder copies a fixed list of known keys, so nothing inherited can reach the payload |
| An invented `999999` bandwidth cap and a lone-surrogate "cleaner" in the plan section | no document defines either |
| `toISOString().slice(...)` to compute "today" | it computes the UTC day, which can differ from the business day (`06` §12 uses the application timezone) |
| `POST /administration/roles/template` and `/administration/setup/complete` | invented routes; `12` has neither (G01) |
| `count ?? 0` on the dashboard and permission gates on the draft/revision cards | showing `0` for an unknown count is a lie; `07` §17 gates only Review and Approval |
| `errorCode()` reading a code out of the validation error bag | `12` §10 puts the code in `flash.domain_error` |
| Guards duplicating what the UI already enforces (`if (pending) return` behind a disabled button, `if (!processing)` behind a busy modal, null checks behind a `v-if`) | dead branches that hide intent |
| Indonesian UI copy | the project owner chose English for the whole UI during the cleanup |

## Decisions the project owner locked during the cleanup

1. Setup uses **contract routes only**; step position and completion come from the
   `readiness` prop. G01 stays open.
2. Sections **do not validate the submit**; they take an `errors` prop keyed by
   wire path and render the server's message. Light, non-blocking hints stay.
3. **All UI copy is English.**
4. The FE-01..10 foundation may be touched, but minimally.

## Honest status and limitations

- Evidence level is **UI isolated verified**. No NSCMF backend route exists, so no
  client has been proven against an actual contract, and every flash/props shape
  above is an assumption until integration.
- The six draft sections and the two draft field components are **not mounted by
  any page yet**. FE-27 is their first consumer and the first real test of the
  section contract; expect to adjust it once, deliberately.
- `features/nscmf/testing/scenarios.ts` (the canonical 20-record fixture from
  FE-02) is imported only by its own test. That is correct:
  `microtask_fe/03_MOCK_DATA.md` says production must never import the fixture.
- `components/RequestFeedback.vue` and `components/ResourceTable.vue` have no page
  consumer yet. FE-29 lists FE-07 as a prerequisite and FE-30 lists FE-05, so both
  get consumers in the slices being handed over.
- `RequestFeedback.vue` still styles its panels with amber and emerald utility
  classes instead of going through `Alert.vue`. `07` §7 permits amber for warning
  semantics, so this is an internal inconsistency rather than a defect; it was
  left alone because the file belongs to FE-07, whose slice is not in this scope.
- Accessibility target is WCAG-AA-like, not certified (`AGENTS.md`). Modals trap
  focus, restore it, and close on Escape unless busy; every field has a label and
  an `aria-describedby` wired to help and error text.

## If something needs to be undone

The tag `safety/main-before-fe-11-25-merge` points at the commit before the first
merge. Each review unit is a single first-parent commit on `main`
(`882af2b`, `26efc7a`, `da7cd28`, `3456144`, `1de03bc`; list them with
`git log --first-parent main`), so one unit can be reverted with
`git revert -m 1 <merge>` without touching the others. The source branches still
exist.

`main` has not been pushed; publishing it is the project owner's decision.
