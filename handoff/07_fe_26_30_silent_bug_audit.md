# 7. Silent-bug audit of FE-26 … FE-30 and the foundation it leans on

> **Date:** 2026-09-22
> **Branch:** `fix/fe-26-30-closure` — **not merged, not pushed, no Pull Request**
> **Follows:** [06_fe_26_30_review.md](06_fe_26_30_review.md)
> **Evidence level:** UI isolated verified. No NSCMF backend route exists.

The previous review closed with "I cannot guarantee zero silent bugs". The project
owner rejected that and asked for the work to be re-examined until it is actually
guaranteed, still strictly within `AGENTS.md`, `SOUL.md`, `project_doc` and
`microtask_fe`, and with the standing rule: **when unsure, stop and ask, never
invent**.

Two decisions were taken before starting: proof by a purpose-built mutation harness
rather than a new dependency, and a scope of FE-26..30 **plus the foundation files
directly implicated in the same defects**.

## What can now be claimed, and what cannot

**Claimed, with numbers below:** every line of production code in scope was
deliberately broken, one mutation at a time, and the tests that claim to cover it
were run. Where the tests stayed green, the line was not protected — that gap was
closed, or the code was removed. What remains alive is listed and shown to be
*equivalent*: a mutation no input can distinguish.

**Not claimed, and it would be dishonest to:** behaviour against the NSCMF backend,
which does not exist. Every response shape, flash channel, projection and
`allowed_actions` value is still an assumption (G01, G02, G03, G07). That is not a
weakness of this audit; it is the boundary `microtask_fe` itself draws with rule R.

## Gates

| Gate | Start of this pass | Now |
|---|---|---|
| Tests | 461 | **540** |
| Statements / Branches / Functions / Lines | 100% | **100% / 100% / 100% / 100%** |
| ESLint · Prettier · vue-tsc · vite build | PASS | **PASS** |

No `v8 ignore`, no `defineExpose`, no `as any`, no `@ts-ignore`, no AI commit
trailers, `coverage.exclude` untouched. The single `eslint-disable` left is in a
test that deliberately throws a non-Error value.

## Mutation results

| File | Mutants | Killed | Alive |
|---|---|---|---|
| `lib/apiErrors.ts` | 14 | **14** | 0 |
| `features/nscmf/draftPayload.ts` | 52 | **52** | 0 |
| `components/RequestFeedback.vue` | 25 | **25** | 0 |
| `features/nscmf/useDraftSave.ts` | 132 | **131** | 1 |
| `features/nscmf/change/ResultsSection.vue` | 10 | **9** | 1 |
| `features/nscmf/SubmitPanel.vue` | 33 | **29** | 4 |
| `Pages/Review/Index.vue` | 16 | **13** | 3 |
| `Pages/Nscmf/ChangeResults.vue` | 56 | **39** | 17 |
| `components/ResourceTable.vue` | 35 | **24** | 11 |

The survivors are equivalent mutations, of four kinds:

- **`?? x` → `|| x` on a value that can never be falsy-but-present** — arrays,
  objects and label strings. No input distinguishes them.
- **Type-level positions**, such as the `1` in `Parameters<typeof router.patch>[1]`.
- **A Vue prop declaration**, `defineModel({ required: true })`, which is a
  development-time warning rather than runtime behaviour.
- **Cosmetic visit options**, `preserveScroll` and `preserveState`, on requests
  whose assertion would pin scrolling rather than behaviour.

The harness itself needed two corrections along the way, both of which had been
manufacturing false survivors: it was mutating `>` inside HTML markup, and `<`/`>`
inside TypeScript generics such as `ref<HTMLElement | null>`.

## Defects found and fixed

### 1. Two halves of the codebase disagreed about where `flash` lives

The admin managers read `page.props.flash`; `ChangeResults` read `page.flash`.
Against a real backend only one carries anything, and the other would **never fire**
— no error, no failing test. It could not be seen because the test double's
`flashDomainError` wrote to **both channels at once**.

`12` §10 says only "shared/flash" and no route exists, so the channel is not
decidable from the documents and **was not guessed**. `pageDomainError` reads the
page root, then the shared props, then a bare bag; every consumer goes through it.
The double can now drive one channel at a time, which is how the blindness was
proven in the first place.

### 2. An undone edit still sent a save

Typing and then undoing left the timer armed by the first keystroke pending. It
fired and PATCHed data identical to what the server already held — spending a
`record_version` increment on nothing. Found by mutation, confirmed by reverting
the fix and watching the test fail.

### 3. "Saved just now" could sit above the failure that prevented it

`RequestFeedback` suppressed the save indicator only for a revoked session, so a
409, 422, 403 or 503 rendered the claim directly above the panel explaining the
failure — against `07` §23. Today's callers happened to escape it by clearing
`saveStatus` themselves; the component allowed the contradiction, and `Edit.vue`
for FE-27 is still unwritten.

### 4. Row limits and a zero that had stopped being protected

Five collections could have their three-row cap raised to four with nothing
failing, and `blankToNull(row[field] ?? null)` could become `|| null` unnoticed —
which turns a stored `0` into `null` and drops the row as not-started. That is the
`bandwidth_mbps: 0` defect fixed during the FE-11..25 cleanup, and **nothing was
holding it fixed**.

### 5. The test double was more forgiving than the library

Verified line by line against the installed `@inertiajs/core` and
`@inertiajs/vue3`. Six differences, each able to hide a defect, now closed:

| | Was | Now |
|---|---|---|
| `form.errors` | never populated from a response | filled before the caller's `onError`, as real `useForm` does |
| `form.processing` | never touched | set at submit, cleared at finish |
| `flash` | survived into the next response | replaced on every response |
| headerless response | only an exception at status ≥ 400 | always an exception, which is the 200-login-page case |
| `onSuccess` | received a bag of props | receives a page carrying its url |
| `props` | merged | **still merged, deliberately** — a real response carries every shared prop while fixtures carry only what a test needs, so replacing would force `auth` into every fixture and catch no frontend defect |

Making it faithful broke two tests, and both were leaning on the forgiveness rather
than exposing a product bug: one submitted twice without answering the first
request, which `Create.vue` refuses to do; the other simulated a response by calling
`onSuccess` alone, when a real response always finishes and that is what releases
the form. Both components had behaved correctly all along.

### 6. Invented codes and duplicated guards

`ChangeResults` built error codes out of HTTP statuses — 403 became `FORBIDDEN`,
409 became `NSCMF_VERSION_CONFLICT` — the same invention removed from
`useDraftSave` in the previous pass. A status is not a name (`12` §12). The handler
now passes the status, which is what `RequestFeedback` classifies on (`12` §11), and
wording comes from the server's flash.

Several guards existed twice and so masked each other's breakage: `startAutosave`
repeated `scheduleAutosave`'s decision; the autosave conditions were checked
identically before and after the timer; `handleRefresh` cleared a latch
`resetToRecord` clears; `inFlightCount` was a counter that can only be 0 or 1. Each
is now stated once.

### 7. Tests that could not fail

Nine assignments to `isConflict.value`, `isSaving.value` and `currentVersion.value`
forced branches by writing the composable's own return values, proving the scheduler
reads the flags but nothing about the wiring that sets them. One was testing a
different branch than it claimed. A 204-line test holding ten scenarios meant a
failure in the second stopped the other eight from running at all; it is thirteen
named tests now.

## Corrections to my own findings

Recorded rather than quietly dropped:

1. **`parseChangeResult` was not a duplicate and was not removed.** I had called it
   a fourth copy of the result-row rule. It parses an *inbound* wire row while
   `normalizeResultRows` prepares *outbound* rows — opposite directions, different
   rules — and it is the proof of **FE-01 AC1**. Deleting it would have removed an
   acceptance criterion from a merged slice.
2. **`res?.statusText` was dead, not untested.** Inertia's `HttpExceptionResponse` is
   `{status, headers, data}`; there is no `statusText`, so that fallback could never
   produce anything. Removed instead of covered.
3. **One "RED" was my own harness error.** A test placed outside the describe that
   installs fake timers failed for the wrong reason. Fixed, then the defect was
   re-confirmed by reverting the production change.

## Still open — do not read this as finished

- **Nothing is integration-verified.** No NSCMF route exists, so G01, G02, G03 and
  G07 remain assumptions. In particular the flash channel is handled by accepting
  both shapes; when the backend lands, confirm which one it actually sends.
- **`SubmitPanel` still has no consumer.** `Pages/Nscmf/Edit.vue` (FE-27) does not
  exist, so its error surface depends on props from a parent nobody has written.
- **`allowed_actions` token values are assumed** — `isActionAllowed` tests for the
  literal `'submit'`; `12` §24/§101 do not enumerate them.
- **Playwright remains blocked by G08.** No browser journey was run.
- **This is still not an independent security review.** One agent both reviewed and
  patched. A human implementation review and a human security review remain required
  (`microtask_fe/02_ATURAN_EKSEKUSI_TDD.md` §7), and the agent has not merged its own
  work.

## Reproducing

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build
```

The mutation harness was a throwaway script in the session scratchpad, deliberately
not committed: it rewrites tracked files and is only safe against a clean tree. Its
method is described above and is a few dozen lines to rebuild — mutate one line,
run the tests that claim to cover it, restore with `git checkout --`, and require a
clean `git status` after every mutant.
