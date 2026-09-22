# FE-26..30 Closure Report

## Branch
`fix/fe-26-30-closure` (HEAD: 3f76f86)
Based on: `main` (0563233) via merges of feat/fe-26, feat/fe-27, feat/fe-28, feat/fe-29, feat/fe-30.

## Fix Commits (on top of feature merges)

### FE-28: 808bada
- GeneralServiceSection: computed `blockIndex` from `service_context` natural key instead of model array index
- DraftField: accepts `errorPath`/`errorWirePath` props for stable error wire
- SubmitPanel: navigates via `data-error-path` attribute, removed `__vueParentComponent`
- Removed `v8 ignore` guards that hid coverage

### FE-29: 3f76f86
- `inertia.ts` test double: `onHttpException(false)` stops processing; `onFlash` dispatched for non-empty flash; non-Inertia HTTP response is NOT a network failure
- `ChangeResults.vue`: `hasTerminalError` covers ALL HTTP exceptions (not just 403/409) — prevents "Saved just now" after HTTP 500
- `useDraftSave.test.ts`: aligned with typed `onHttpException`/`onNetworkError` signatures; covered null-response and non-Error fallback branches

## Verification Evidence

### Tests
- 444 / 444 passed (46 test files)
- 0 failed, 0 skipped

### Coverage (v8, all project-owned application files)
| Metric     | Result |
|------------|--------|
| Statements | 100%   |
| Branches   | 100%   |
| Functions  | 100%   |
| Lines      | 100%   |

### Gates
| Gate       | Status |
|------------|--------|
| ESLint     | PASS   |
| Prettier   | PASS   |
| vue-tsc    | PASS   |
| vite build | PASS   |

## Self Security Review (not independent)
| Check                      | Result |
|----------------------------|--------|
| v-html usage               | None   |
| innerHTML/outerHTML         | None   |
| eval/Function()            | None   |
| localStorage/sessionStorage| None   |
| Secret/credential patterns | None   |
| Actor info leak in errors  | None   |
| Prototype pollution         | None   |
| Client state as authority  | None   |

## Bugs Found and Fixed During Closure

1. **F-28-R2-1 HIGH**: Server index mismatch — `data-error-path` used model array index instead of persisted block index. Fix: natural key via `service_context` computed.

2. **FE-29 Inertia test double wrong dispatch order**: `onHttpException` did not stop processing when returning false; non-Inertia HTTP responses were falsely classified as network errors; `onFlash` was never dispatched.

3. **FE-29 ChangeResults "Saved just now" after HTTP 500**: `hasTerminalError` only covered 403 and 409, so `onSuccess` fired after the 500's `onHttpException`. Fix: set `hasTerminalError` for all HTTP exceptions.

4. **FE-27 useDraftSave.test.ts type mismatch**: Tests used untyped `onHttpException(undefined)` and `onNetworkError('string')` incompatible with the corrected typed signatures.

## Cleanup
- Worktree `t_6cb88e49` (feat/fe-29-f29r12) removed
- Worktree `t_efda00ac` removed earlier in session
- Only 1 worktree remains (main repo)

## Task Status
| Task ID       | Description             | Status |
|---------------|-------------------------|--------|
| t_1daf5d59    | FE-28 child (duplicate) | Archive candidate |
| t_ac78cb2d    | FE-28 child (duplicate) | Archive candidate |
| t_6cb88e49    | FE-29 mutant            | DONE (fixed in this closure) |

## Limitations
- This is a self-review, not an independent security review.
- `js/types/auth.ts` and `js/types/feedback.ts` show 0% coverage — these are type-only files with no runtime code (expected by v8).
- No kanban tasks were created or assigned. No work was delegated to other profiles.
- Branch is NOT merged to main. Human review and merge required per AGENTS.md rules.

## Next Steps
1. Human review of `fix/fe-26-30-closure` branch
2. Archive duplicate tasks t_1daf5d59 and t_ac78cb2d
3. Merge to main after approval
