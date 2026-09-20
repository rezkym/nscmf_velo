# 1. Repository state on handoff

> Part of the 2026-09-20 frontend handoff. Status, scope and authorities: [README](README.md).

## Where to start (read this first)

**Branch off `main`.** At handoff `main` is at `8955921` and carries everything
described here. Every branch used during FE-01..25 — `review/fe-11-25`,
`refactor/fe-11-25-cleanup`, `test/fe-01-10-coverage`,
`fix/fe-05-resource-table-per-page`, `docs/handoff-fe-11-25` and the older
`feat/fe-11` … `feat/fe-25` — is **already merged into `main` and is history
only**. Do not continue work on any of them; anything you need is on `main`.

```bash
git checkout main
git pull            # only if main has been pushed by then; it was local at handoff
git checkout -b feat/fe-26        # one scoped branch per slice
```

The naming used so far is `feat/fe-NN` for a slice, `fix/…` for a defect and
`docs/…` for documentation, which follows the flow in `AGENTS.md`:
`main → scoped branch → Conventional Commits → Pull Request → CI/review → human
final merge`. The agent may create the branch and the PR and fix review
findings, but **must not approve or merge its own PR**.

`microtask_fe/02_ATURAN_EKSEKUSI_TDD.md` adds that one FE file is one reviewable
slice, so keep FE-26, FE-27, FE-28, FE-29 and FE-30 on separate branches instead
of one large one.

## Where the work landed

`main` carries FE-01..25 plus the cleanup. It was built from merge commits, each
one a review unit the project owner approved:

| Merge | Brings |
|---|---|
| `882af2b` Merge FE-11..25 cleanup into main | the FE-11..25 implementation and its cleanup |
| `26efc7a` Merge FE-01..10 coverage into main | the missing tests for the foundation slices |
| `da7cd28` Merge FE-05 table fix into main | the `per_page` bound fix in `ResourceTable` |
| `3456144` Merge section field slice exports into main | each section exports the slice it owns |
| `1de03bc` Merge the FE-11..25 handoff into main | this folder, plus two corrected document citations in code comments |

Any merge made after this document was written is visible with
`git log --first-parent main`.

The commit before all of this is tagged **`safety/main-before-fe-11-25-merge`**
(`d74cf3f`). Comparing that tag with `main` over `resources/js` shows the whole
frontend as it was added: 94 files.

`main` has **not been pushed**. The source branches (`review/fe-11-25`,
`refactor/fe-11-25-cleanup`, `test/fe-01-10-coverage`,
`fix/fe-05-resource-table-per-page`, `refactor/export-section-field-types`,
and the older `feat/fe-*` branches) are still present and fully merged.

## Commit style used throughout

Conventional Commits, and behaviour changes came in pairs: a `test:` commit with a
verified failing test, then the `fix:`/`refactor:`/`feat:` commit that makes it
pass. Pure refactors leaned on the existing green tests. **No AI co-author or
generated-by trailers** — `AGENTS.md` forbids them; keep it that way.

Because the history contains deliberate RED commits, a CI that runs per commit
will see red at those points. The head of every branch is green.

## Gates

There is no helper script; run the npm scripts (`package.json`):

```bash
npm run lint          # eslint .
npm run format:check  # prettier --check .
npm run typecheck     # vue-tsc --noEmit
npm run test:coverage # vitest run --coverage
npm run build         # vite build
```

State on `main` at handoff: all five exit 0, **338 tests**, and coverage:

```
Statements   : 100% ( 1283/1283 )
Branches     : 100% ( 1324/1324 )
Functions    : 100% ( 549/549 )
Lines        : 100% ( 1170/1170 )
```

`vitest.config.ts` counts `resources/js/**/*.{ts,vue}` and excludes only `*.d.ts`
and `*.test.ts`. The configured threshold is `lines: 80` (`16` requires ≥80%), so
100% is the current state, not a configured gate. The project owner asked for
100% to be kept; if a new slice cannot reach it, say so explicitly instead of
widening `coverage.exclude` — `microtask_fe/02_ATURAN_EKSEKUSI_TDD.md` forbids
widening exclusions.

## Test layout and tooling

- Tests live next to the code as `*.test.ts` (40 files).
- Vitest 4 + `@vue/test-utils` + jsdom. Component tests mount the real component
  and drive the DOM; they assert emitted payloads and rendered text, never
  internal state. `defineExpose` is not used anywhere in production code.
- Inertia is mocked at the module boundary through the shared double in
  `resources/js/testing/inertia.ts` (see [02](02_shared_building_blocks.md)).
- Playwright exists (`npm run test:e2e`) but no browser journey is part of this
  work; `microtask_fe/06_KONTRAK_DAN_GAP.md` gap **G08** blocks mutating browser
  runs until an isolated disposable runtime exists.

## Production file inventory (`resources/js`, excluding tests)

```
app.ts                          lib/apiErrors.ts           components/ui/Alert.vue
lib/inertia.ts                  lib/formInputs.ts          components/ui/Badge.vue
types/auth.ts                   lib/utils.ts               components/ui/Button.vue
types/env.d.ts                  composables/useFocusTrap.ts components/ui/button.ts
layouts/AppLayout.vue           composables/usePermissions.ts components/ui/control.ts
                                                            components/ui/FormField.vue
components/ActionDialog.vue     components/ResourceTable.vue components/ui/Modal.vue
components/ReauthenticationDialog.vue
components/RequestFeedback.vue

Pages/Auth/Login.vue                    Pages/Administration/Setup.vue
Pages/Auth/ChangeTemporaryPassword.vue  Pages/Administration/Teams/Index.vue
Pages/Dashboard/Index.vue               Pages/Administration/Users/Index.vue
Pages/Nscmf/Create.vue                  Pages/Administration/Roles/Index.vue
Pages/Nscmf/Show.vue                    Pages/Welcome.vue

features/administration/TeamManager.vue      features/nscmf/types.ts
features/administration/UserManager.vue      features/nscmf/contracts.ts
features/administration/RoleManager.vue      features/nscmf/draftPayload.ts
features/administration/OneTimeCredential.vue features/nscmf/fieldErrors.ts
features/administration/temporaryCredential.ts features/nscmf/DraftField.vue
                                              features/nscmf/DraftNumberField.vue
features/nscmf/activation/GeneralServiceSection.vue  features/nscmf/RepeatableRows.vue
features/nscmf/activation/BandwidthSection.vue       features/nscmf/DetailList.vue
features/nscmf/activation/NetworkHostingSection.vue  features/nscmf/DetailTable.vue
features/nscmf/activation/SiteSection.vue            features/nscmf/QueueCard.vue
features/nscmf/change/PurposeImpactSection.vue
features/nscmf/change/PlanSection.vue
```

`features/nscmf/testing/scenarios.ts` also exists: the canonical 20-record fixture
from FE-02, described by `microtask_fe/03_MOCK_DATA.md`. It is test-only on
purpose — production code must never import it.

## Which page exists for which route

Only these pages exist today, and none of them is wired to a live backend route:

| Page | Contract route (`microtask_fe/06_KONTRAK_DAN_GAP.md` inventory) |
|---|---|
| `Pages/Auth/Login.vue` | `POST /login` |
| `Pages/Auth/ChangeTemporaryPassword.vue` | `POST /account/temporary-password/change` |
| `Pages/Dashboard/Index.vue` | `GET /dashboard` |
| `Pages/Nscmf/Create.vue` | `GET /nscmf/create`, `POST /nscmf` |
| `Pages/Nscmf/Show.vue` | `GET /nscmf/{record}` |
| `Pages/Administration/Teams/Index.vue` | `GET/POST /administration/teams`, … |
| `Pages/Administration/Users/Index.vue` | `GET/POST /administration/users`, … |
| `Pages/Administration/Roles/Index.vue` | `GET/POST /administration/roles`, … |
| `Pages/Administration/Setup.vue` | no dedicated route in `12` — see gap **G01** |

There is **no edit page** (`GET /nscmf/{record}/edit`): that is FE-27.
