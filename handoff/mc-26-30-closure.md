# Handoff — Microtask FE-26..30 Closure

> Tanggal: 21 September 2026
> Dibuat oleh: Liu (orchestrator)
> Repo: /Users/rezky/Documents/Alya
> Branch: main @ 0563233 (ahead 207, belum push ke remote)
> Tujuan: Diberikan ke AI Agent yang lebih capable untuk menyelesaikan seluruh masalah tersisa

---

## 1. Status Per Feature

### FE-26 — ResultsSection.vue (feat/fe-26 @ 4f43832) ✅ SELESAI

- DEV: DONE, coverage 100% semua metrik
- SEC: PASS (SEC-FE-26 t_fdca067d)
- FIX-FE-26-RESID (t_d71c0afa): DONE — guard ownership + tautological AC4 test
- Commits (2 di atas main):
  - e5caa30 test: specify FE-26 behavior
  - 4f43832 feat: implement FE-26 interface
- **Tidak ada pekerjaan tersisa.**

### FE-27 — useDraftSave.ts (feat/fe-27 @ 7477f42) ✅ SELESAI

- DEV: DONE, coverage 100% semua metrik
- SEC: PASS round 5 (RE-SEC-FE-27-R4 t_141857b7)
- Commits (14 di atas main, termasuk 5 round perbaikan):
  - 9313d0c test: specify FE-27 behavior
  - 3904946 feat: implement FE-27 interface
  - 718f83d fix: clean 100% coverage
  - 650d6b1..427acb5 fix: real Inertia wire (onError flat bag, 409 flash, onHttpException)
  - 78b8353 fix: error handlers, honor enabled
  - 6d6fb64 fix: remediate B-27-5..B-27-9
  - 132d3e0 test: achieve 100% coverage
  - 903a6e4 fix: B-27-10 + B-27-11
  - 7477f42 fix: N-R3-1 (ignore onSuccess when settled by onHttpException)
- Root cause iterasi: test double inertia.ts salah memodelkan wire contract asli @inertiajs/vue3
  (flash di page.props.flash vs page.flash, onSuccess pada non-2xx)
- **Tidak ada pekerjaan tersisa.**

### FE-28 — SubmitPanel.vue (feat/fe-28 @ eedd4e8) ❌ BELUM SELESAI

- DEV: DONE, coverage 100% (tapi ada `/* v8 ignore next */` yang menyembunyikan 1 line uncovered)
- SEC: FAIL round 3 (RE-SEC-FE-28-R2 t_efda00ac) — 1 blocking, 5 non-blocking
- Commits (10 di atas main):
  - 1b364b2..1ed4a20 test+feat: AC1-AC5 TDD
  - bd1e945 refactor: polish + edge paths
  - b897136 test: coverage 100%
  - 151db6a fix: F-28-1 + F-28-2 (DOM id, double submit)
  - dde6559 fix: natural-key mapping + blank error path
  - eedd4e8 fix: replace __vueParentComponent with data-error-path (FIX-FE-28-A)

#### Review History (4 rounds):
1. SEC-FE-28 (t_2aec0ce7): FAIL — F-28-1 (DOM id target), F-28-2 (double submit)
2. RE-SEC-FE-28 (t_e0bcd950): FAIL — F-28-R-1 (wrong row on reorder)
3. RE-SEC-FE-28-R1 (t_f3fd3a1a): FAIL — F-28-R1-1 HIGH (__vueParentComponent dev-only)
4. RE-SEC-FE-28-R2 (t_efda00ac): FAIL — F-28-R2-1 HIGH (server index vs model index mismatch)

#### Temuan Blocking — F-28-R2-1 (HIGH)

**Masalah:** `resolveControlByPath` di SubmitPanel.vue tidak bisa menavigasi ke service block
yang tidak ada di DOM karena index mismatch antara client (model index) dan server (persisted-set index).

**Detail teknis:**
- `GeneralServiceSection.vue` membuat `data-error-path` menggunakan `blockIndex(service.context)`
  yang mengembalikan index di **model lokal**
- `buildActivationDraftPayload` di `draftPayload.ts` men-drop row yang belum diisi (not-started)
  sebelum mengirim ke server
- Server meng-index error berdasarkan **persisted set** (set setelah drop)
- Jika row EXISTING kosong (index 0 di model) di-drop, row NEW (index 1 di model) menjadi index 0 di
  server, tapi DOM masih menampilkan `activation.service_blocks.1.*`
- Akibatnya error summary dan inline message menunjuk ke row yang SALAH

**Contoh konkret:**
```
Model: [{context:EXISTING, id:null}, {context:NEW, id:"SVC-NEW"}]
Server kirim: [{context:NEW, id:"SVC-NEW", status:null}]  <-- EXISTING dropped
Attribute DOM: EXISTING = ...service_blocks.0.*, NEW = ...service_blocks.1.*
Server error: activation.service_blocks.0.service_status
UI blame: EXISTING row  <-- SALAH, harusnya NEW row
```

**Solusi yang direkomendasikan maggie_sc (2 opsi):**
1. Hitung index block dalam persisted set (set setelah drop not-started rows) — gunakan untuk
   attribute DAN error() key
2. (Direkomendasikan) Gunakan **natural key** (`service_context`) di attribute, lookup by natural
   key bukan index — sesuai §12 §7.4 "each row is identified by its stable natural key"

#### Temuan Non-blocking (5):
- F-28-R2-2 (MED): `-1` paths di 8/14 skenario, duplikat 21 entries pada no-blocks case
- F-28-R2-3 (MED, test integrity): test "after reorder" tidak pernah membalik array; fixture
  hand-built `<div data-error-path>` di-assert `focus()` pada non-focusable div (vacuous green)
- F-28-R2-4 (LOW): attribute ada di `.form-field` wrapper bukan control; descendant query unscoped
- F-28-R2-5 (LOW): `blockIndex()` → O(blocks²) scans per render
- F-28-R2-6 (INFO): `/* v8 ignore next */` di :151 menyembunyikan line. Tanpa ignore: 98.76/98.9/100/100

#### Kanban Blocked Tasks (2):

**t_1daf5d59** — FIX-FE-28-R2: resolveControlByPath must reach absent DOM block
- Status: BLOCKED (gave_up 2x)
- Alasan block: worktree t_efda00ac masih mengunci branch feat/fe-28
- Solusi: `git worktree remove /Users/rezky/Documents/Alya/.worktrees/t_efda00ac` dulu
- Assignee: maggie_fe

**t_ac78cb2d** — FIX-FE-28-R2: data-error-path index skew + manufactured 100% coverage
- Status: BLOCKED (gave_up 2x)
- Alasan block: sama — worktree t_efda00ac mengunci feat/fe-28
- Assignee: maggie_fe

**CATATAN:** Kedua task ini sebenarnya membahas masalah yang SAMA (F-28-R2-1 + manufactured coverage).
Maggie_sc membuat 2 task terpisah (pertama t_ac78cb2d untuk analisis detail, lalu t_1daf5d59
sebagai fix card formal). Kemungkinan besar cukup dikerjakan sebagai SATU task, bukan dua.

#### Aksi Yang Harus Dilakukan untuk FE-28:
1. Cleanup worktree: `git worktree remove /Users/rezky/Documents/Alya/.worktrees/t_efda00ac`
2. Archive salah satu dari t_1daf5d59 atau t_ac78cb2d (duplikat)
3. Buat atau re-use task FIX untuk:
   a. Ganti `blockIndex()` di data-error-path dengan natural key atau persisted-set index
   b. Hapus `/* v8 ignore next */` di SubmitPanel.vue:151, cover line tersebut
   c. Fix test "after reorder" supaya benar-benar membalik array
   d. Test case: not-started-row sebelum started-row
4. Setelah fix: buat RE-SEC-FE-28-R3 untuk maggie_sc
5. Jika PASS → FE-28 selesai

---

### FE-29 — ChangeResults.vue (feat/fe-29 @ 4ab0a42) ⚠️ CONDITIONAL PASS

- DEV: DONE, coverage 100% semua metrik
- SEC: CONDITIONAL PASS (0 merge-blocking findings)
- SEC History:
  - SEC-FE-29 (t_416eb39c): FAIL — B-29-1..B-29-4 (real Inertia wire)
  - RE-SEC-FE-29 (t_35b758bc): FAIL — flash channel salah (page.props.flash vs page.flash)
  - RE-SEC-FE-29-R1 (t_1f162423): PASS (setelah FIX-RE-SEC-FE-29 + F-29-R1-3)
- Commits (10 di atas main, branched dari feat/fe-26):
  - 9c048a2 test: specify FE-29 behavior
  - 25ac7b2 feat: implement FE-29 interface
  - 56609c5 test: achieve 100% coverage
  - 4544467..727a7ce fix: real Inertia wire error transport
  - 606fd7a..0ab7667 fix: real flash channel + conflict latch
  - 2535f6b..4ab0a42 fix: F-29-R1-3 clear terminal-error latch on new submit

#### Task Non-blocking Tersisa:

**t_6cb88e49** — F-29-R1-2: fix @inertiajs test double (8/20 mutants survive)
- Status: BLOCKED (gave_up 2x, timed_out 150 iterasi)
- Branch: feat/fe-29-f29r12 @ 4ab0a42
- Worktree: ~/.hermes/kanban/workspaces/t_6cb88e49
- Modified file (BELUM COMMIT): `resources/js/testing/inertia.ts` (9 insertions, 6 deletions)

**Root cause:** Test double `respondToRequest` di `inertia.ts` menembak SEMUA channel sekaligus
(onFlash, onSuccess, onError, onFinish) untuk setiap skenario, padahal real @inertiajs/vue3 punya
dispatch order berbeda per status code:
- 200 + x-inertia: update pageFlash/pageProps → onSuccess → onFinish
- 422: onHttpException → onError → onFinish
- 409/403 + flash: onHttpException → update pageFlash → onFinish (TANPA onSuccess)
- 4xx/5xx non-inertia: onHttpException → onNetworkError → onFinish

**Perubahan yang sudah ditulis tapi belum commit:**
```diff
- 409/403 + x-inertia + flash.domain_error: onHttpException -> onFlash -> onSuccess -> onFinish
+ 409/403 + x-inertia + flash: onHttpException -> updates pageFlash -> onFinish
+   (does NOT call redundant onFlash or onSuccess; real client does not fire onSuccess on 4xx)

- request.options.onFlash?.(flash);
+ // removed onFlash call for 4xx

+ if (status >= 400) {
+     if (errors && Object.keys(errors).length > 0) {
+         request.options.onError?.(errors);
+     }
+ } else {
      Object.assign(pageProps, props);
      request.options.onSuccess?.({ props: { ...pageProps, ...props }, flash });
```

**Catatan penting:** Perubahan ini di inertia.ts BERPOTENSI mempengaruhi test di komponen lain
(useDraftSave.ts, SubmitPanel.vue, ChangeResults.vue) karena mereka semua menggunakan test double
yang sama. Harus divalidasi regresi penuh setelah commit.

**BERSIFAT NON-BLOCKING untuk merge FE-29.** Komponen ChangeResults.vue sudah benar, hanya
bukti tesnya yang kurang kuat.

#### Aksi Yang Harus Dilakukan untuk FE-29:
- Opsi A: Archive t_6cb88e49, merge FE-29 apa adanya (CONDITIONAL PASS sudah cukup)
- Opsi B: Commit perubahan inertia.ts, jalankan regresi penuh, pin remaining mutants
- Opsi C: Tunda ke batch FE-31..57 (inertia.ts fix akan bermanfaat untuk semua task berikutnya)
- Keputusan: MENUNGGU REZKY

---

### FE-30 — Review/Index.vue (feat/fe-30 @ d135a30) ✅ SELESAI

- DEV: DONE, coverage 100% semua metrik
- SEC: PASS round 2 (RE-SEC-FE-30-R1 t_f756ce4f)
- Commits (7 di atas main):
  - ed0ece0 test: specify FE-30 behavior
  - a2ad2d6 feat: implement FE-30 interface
  - a4382a8 test: close coverage gaps to 100%
  - ebf0f23..e42f2c7 fix: F-30-1 query clamping + filter sanitization
  - dade55e..d135a30 fix: R-30-1/2/3 boolean filters + integer truncation
- **Tidak ada pekerjaan tersisa.**

---

## 2. Ringkasan 3 Task Blocked

| Task ID | Feature | Masalah | Root Cause | Aksi |
|---------|---------|---------|------------|------|
| t_1daf5d59 | FE-28 | resolveControlByPath gagal reach absent block | Worktree t_efda00ac lock feat/fe-28 + index mismatch model vs server | Cleanup worktree → fix index → re-SEC |
| t_ac78cb2d | FE-28 | data-error-path index skew + fake 100% coverage | Sama di atas (duplikat task) | Archive salah satu, kerjakan yang lain |
| t_6cb88e49 | FE-29 | Test double inertia.ts menembak semua channel | respondToRequest tidak model dispatch order per status | Non-blocking; commit+regresi atau archive |

---

## 3. Worktrees Aktif (harus di-cleanup)

```
/Users/rezky/Documents/Alya                          main@0563233       (utama)
~/.hermes/kanban/workspaces/t_6cb88e49               feat/fe-29-f29r12  (1 file modified belum commit)
/Users/rezky/Documents/Alya/.worktrees/t_efda00ac    feat/fe-28@eedd4e8 (HARUS di-remove, mengunci branch)
```

**Cleanup wajib sebelum lanjut:**
```bash
git worktree remove /Users/rezky/Documents/Alya/.worktrees/t_efda00ac
```

---

## 4. Consolidation Plan

Setelah semua FE-26..30 SEC PASS:
1. Merge feat/fe-26 ke main (2 commits)
2. Merge feat/fe-29 ke main (10 commits, branched dari feat/fe-26)
3. Merge feat/fe-27 ke main (14 commits)
4. Merge feat/fe-28 ke main (10+ commits)
5. Merge feat/fe-30 ke main (7 commits)
6. Cleanup semua worktrees
7. Jalankan regresi penuh: npm run test && npm run typecheck && npm run lint && npm run build
8. Verifikasi coverage ≥ 80% (standar Rezky: 100% per file)

**Blocker consolidation:** FE-28 belum SEC PASS. FE-29 conditional (non-blocking).

---

## 5. Pattern & Lesson Learned

### Bug berulang:
1. **Worktree tidak di-cleanup setelah task DONE** → branch terkunci → task berikutnya gagal spawn.
   Solusi: SELALU `git worktree remove` segera setelah kanban complete.
2. **Test double inertia.ts salah model wire contract** → menyebabkan 5 round perbaikan FE-27,
   3 round FE-28, 2 round FE-29. Root cause: respondToRequest menembak onSuccess pada 4xx response,
   flash di page.props.flash bukan page.flash.
3. **Index mismatch model vs server** → error navigation menunjuk row salah. Pattern ini juga
   potensial ada di PlanSection.vue (FE-25) dan RepeatableRows.

### Guardrail:
- Coverage 100% wajib per file, TANPA `/* v8 ignore next */` kecuali proven framework limitation
- Kanban task baru WAJIB `--initial-status blocked`
- Worktree cleanup WAJIB sebelum buat task baru di branch yang sama
- Test double harus divalidasi terhadap real @inertiajs/vue3 behavior

---

## 6. Next Steps Untuk Agent Baru

**Prioritas 1 — FE-28 (satu-satunya blocker):**
1. `git worktree remove /Users/rezky/Documents/Alya/.worktrees/t_efda00ac`
2. Archive t_ac78cb2d (duplikat dari t_1daf5d59)
3. Kerjakan FIX sesuai arah maggie_sc:
   - Ganti `blockIndex()` di data-error-path dengan natural key (service_context)
   - Hapus `/* v8 ignore next */`, cover line tersebut dengan test
   - Fix test "after reorder" supaya benar-benar test reorder
   - Tambah test case: not-started-row before started-row
   - TDD: test RED dulu, lalu fix, lalu GREEN
4. Pastikan coverage 100% TANPA v8 ignore
5. Buat RE-SEC-FE-28-R3 untuk maggie_sc
6. Jika PASS → FE-28 selesai

**Prioritas 2 — FE-29 t_6cb88e49 (non-blocking):**
- Putuskan: archive, pecah, atau tunda
- Jika commit inertia.ts fix: jalankan regresi penuh karena shared test double

**Prioritas 3 — Consolidation:**
- Setelah FE-28 PASS, merge semua feat/fe-26..30 ke main
- Cleanup worktrees
- Regresi penuh

**Prioritas 4 — Lanjut ke FE-31..57:**
- 27 microtask tersisa
- FE-31 (Review detail: Return, Reject, Forward) sudah terdefinisi
- Inertia.ts fix SANGAT direkomendasikan sebelum batch berikutnya

---

## 7. File Referensi

- Microtask specs: `microtask_fe/FE-26.md` s/d `FE-30.md`
- Project docs: `project_doc/01_PRD.md` s/d `20_Deployment_Architecture.md`
- Handoff sebelumnya: `handoff/04_fe_26_30_readiness.md`
- Agent rules: `AGENTS.md`
- Coding rules: `project_doc/15_Coding_Rules_AGENTS.md`
- Testing spec: `project_doc/16_Testing_Specification.md`
- Kanban: `hermes kanban list`
- Git worktree: `git worktree list`
