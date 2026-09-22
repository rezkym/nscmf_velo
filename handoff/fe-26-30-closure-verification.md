# FE-26..30 closure verification — in progress

This is evidence from local execution, not SEC approval or Feature Done.

## FE-28

Branch inspected: fix/fe-26-30-closure, based on eedd4e8.

- Reproduced persisted index 0 incorrectly focusing EXISTING instead of NEW when the first model row is not started.
- Production change computes wire aliases from buildActivationDraftPayload and exposes stable service-context data-error-path on controls.
- Inline service errors use the same payload-set index.
- Reorder test now actually reverses the array after mount.
- Container focus assertion now checks document.activeElement on a focusable fixture.
- Removed the unreachable empty-path guard and its v8 ignore directive; this is removal of dead code, not test execution of that guard.
- Added reference-OTHER-specification navigation regression: initially failed by keeping focus on summary; passed after adding natural-key path plus wire alias.
- Latest targeted run: 36 tests passed across SubmitPanel and GeneralServiceSection; vue-tsc passed.
- Earlier full run before the reference regression: 356 tests passed, aggregate statements/branches/functions/lines all 100%; ESLint, formatting, typecheck and build passed. Must rerun full gates on final changes.

## FE-29: handoff dispatch description is not authoritative

Inspected installed node_modules/@inertiajs/core/dist/index.js:2478–2523 and 2535–2558.

Actual Response.process flow:

1. Non-Inertia response enters handleNonInertiaResponse.
2. Inertia HTTP exception invokes onHttpException; return false stops page processing.
3. Otherwise setPage runs, nonempty flash triggers onFlash.
4. Nonempty page.props.errors triggers onError; otherwise onSuccess runs, including an HTTP exception not cancelled above.
5. Non-Inertia HTTP responses use onHttpException and optional dialog; they are not network failures merely because status >= 400.

Therefore the pending worker patch at /Users/rezky/.hermes/kanban/workspaces/t_6cb88e49/resources/js/testing/inertia.ts is NOT accepted as verified. It ignores the onHttpException cancellation return, suppresses onFlash indiscriminately, and invents onNetworkError for received HTTP responses. Do not use the old handoff dispatch bullets as a replacement for the installed library contract.

Main worktree currently has the earlier shared double without respondToRequest; the richer helper and FE-29 consumers are on the FE-29 branch/worktree. Preserve that worktree's uncommitted edits until explicitly incorporated or safely archived. No cleanup or closure claimed for it.

## Still required

- Finish FE-28 review and tests for absent/unknown paths without inventing server contracts.
- Correct FE-29 test double against actual installed Inertia, test callback cancellation/order and component regressions; mutation evidence still outstanding.
- Verify FE-26..30 together; current branch is not a consolidated batch.
- Safe task duplicate cleanup and worktree cleanup.
- Human review/security review remain required by project policy; self-review is not independent review.
- No commits, pushes or main merges made during these edits. No fabricated RED commit chronology.
