# Handoff proyek Alya / NSCMF

Handoff terbaru: [2026-09-25 — Ringkasan sesi redesign NSCMF](2026-09-25-session-summary.md) di branch `feat/redesign`. Detailnya ada di [2026-09-24 — UI pindah ke komponen shadcn-vue](2026-09-24-shadcn-vue.md) dan [2026-09-24 — Redesign UI dan analitik Dashboard](2026-09-24-redesign.md). Sebelumnya: [2026-09-23 — Merge FE-31, cleanup dan posisi microtask](2026-09-23-merge-fe31-status.md).
Implementasi FE-31 dan backend Review sudah digabung ke checkout utama. FE-32 baru UI parsial; FE-33–40 belum diimplementasikan. Tes integrasi terbaru ditunda sesuai instruksi pengguna; tidak ada klaim Feature Done atau human review selesai.

Bukti historis FE-01–30 tersedia di [handoff backend](2026-09-23-backend-fe01-30.md); detail perubahan FE-31 di [handoff implementasi](2026-09-23-fe31-implementation.md). Angka tes historis tidak membuktikan hasil merge terbaru.

Bagian berikut adalah handoff FE historis pada tanggal yang tercantum. Status
branch, cakupan dan test di dalamnya bukan status repository terbaru.

## Frontend handoff — after the FE-11..25 cleanup

> **Date:** 2026-09-20
> **Branch:** `main` (merged locally, **not pushed**, no Pull Request opened)
> **Scope completed:** `microtask_fe/` FE-01 … FE-25, plus a full cleanup pass over FE-11..25
> **Scope NOT started:** FE-26 … FE-30 and everything after them
> **Evidence level:** UI isolated verified — no NSCMF backend route exists yet

This folder records what already exists so the next agent does not have to
rediscover it. It is a status record. It does **not** define product, business,
security or architecture rules: `project_doc/`, `AGENTS.md`, `SOUL.md` and
`microtask_fe/` remain the only authorities, and when this folder disagrees with
them, **they win and this folder is wrong** — fix it.

Every statement here was checked against the repository or a document at handoff
time, and each rule names its source, for example `12 §29`.

## Start here

Work from **`main`** (`8955921` at handoff), one scoped branch per slice, for
example `feat/fe-26`. Every FE-01..25 branch, including `review/fe-11-25`, is
already merged into `main` and is history only — see
[01_repository_state.md](01_repository_state.md#where-to-start-read-this-first).

## Read in this order

| File                                                               | What it answers                                                                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| [2026-09-16-phase-0-bootstrap.md](2026-09-16-phase-0-bootstrap.md) | the earlier handoff: toolchain, versions, local infrastructure, CI, Phase 0/T04 decisions                                         |
| [01_repository_state.md](01_repository_state.md)                   | what is on `main` now, how it got there, which gates pass, how to verify it yourself                                              |
| [02_shared_building_blocks.md](02_shared_building_blocks.md)       | the exact API of every shared component, composable and helper to reuse                                                           |
| [03_draft_section_contract.md](03_draft_section_contract.md)       | the contract the six draft sections follow: props, naming, ids, test ids, test skeleton                                           |
| [04_fe_26_30_readiness.md](04_fe_26_30_readiness.md)               | per task FE-26..30: what exists, what is missing, which contract rules bite                                                       |
| [05_open_items_and_boundaries.md](05_open_items_and_boundaries.md) | open gaps, deliberate removals that must not come back, honest limitations                                                        |
| [06_fe_26_30_review.md](06_fe_26_30_review.md)                     | the 2026-09-21 review of FE-26..30 on `fix/fe-26-30-closure`: defects found, patches, gates, what stays open                      |
| [07_fe_26_30_silent_bug_audit.md](07_fe_26_30_silent_bug_audit.md) | the 2026-09-22 mutation-proved silent-bug audit: the flash-channel split, the unfaithful Inertia double, per-file mutation scores |

## The three sentences that matter most

1. **The server decides.** Sections and pages send intent and render what comes
   back; requiredness, ranges, permissions and state transitions are validated
   server-side (`06` §10). The UI shows markers and the server's message.
2. **Field errors and domain errors travel differently.** Field errors arrive in
   the Inertia validation error bag, domain and action errors arrive flashed as
   `flash.domain_error` with a stable code (`12` §10, catalogue in `12` §12).
3. **Collections are whole sets.** A collection key that is present replaces the
   whole set, omitting it means unchanged, and `[]` clears it (`12` §7.4.1, matrix
   in `12` §129.1). `resources/js/features/nscmf/draftPayload.ts` implements this
   and its test file is that matrix.

## State of the work being handed over

- Gates on `main`: lint, format, typecheck, **338 tests**, **100% coverage**
  (statements, branches, functions, lines), build — all exit 0.
- The six draft sections and the shared field components have **no page that
  mounts them yet**. FE-27 is their first consumer.
- Nothing is integration-verified: no NSCMF backend route exists, so every
  response and flash shape used by the UI is still an assumption (gaps **G01**,
  **G02**, **G09** in `microtask_fe/06_KONTRAK_DAN_GAP.md`).
