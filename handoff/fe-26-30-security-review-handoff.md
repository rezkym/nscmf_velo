# Handoff: Security Review untuk branch fix/fe-26-30-closure

## Untuk Reviewer

Branch `fix/fe-26-30-closure` (HEAD: 3f76f86) berisi konsolidasi 5 microtask frontend (FE-26..30) plus 2 fix commit di atasnya. Total 18 file berubah dari main, +5410 lines.

### Perintah untuk melihat diff
```bash
cd /Users/rezky/Documents/Alya
git diff main..fix/fe-26-30-closure           # full diff
git diff main..fix/fe-26-30-closure --stat    # summary
```

### Verification state (sudah dijalankan, bisa direproduksi)
```
444/444 tests pass
Coverage: 100% Stmts, 100% Branch, 100% Funcs, 100% Lines
ESLint: PASS | Prettier: PASS | vue-tsc: PASS | vite build: PASS
```

Untuk mereproduksi:
```bash
cd /Users/rezky/Documents/Alya
npm run test:coverage && npm run lint && npm run format:check && npm run typecheck && npm run build
```

---

## File yang Perlu Di-review

### Production Files (8 file, fokus review di sini)

| File | LOC | Scope | Risiko |
|------|-----|-------|--------|
| `resources/js/Pages/Nscmf/ChangeResults.vue` | 458 | NEW — FE-29 page: result editing, submit, conflict, flash | HIGH — complex state machine |
| `resources/js/features/nscmf/useDraftSave.ts` | 430 | NEW — FE-27 composable: autosave, conflict, retry | HIGH — concurrent request handling |
| `resources/js/features/nscmf/SubmitPanel.vue` | 318 | NEW — FE-28 component: error navigation, submit flow | MEDIUM — DOM navigation |
| `resources/js/Pages/Review/Index.vue` | 228 | NEW — FE-30 page: review queue with filters | MEDIUM — query param handling |
| `resources/js/features/nscmf/change/ResultsSection.vue` | 99 | NEW — FE-26 component: results display | LOW |
| `resources/js/features/nscmf/activation/GeneralServiceSection.vue` | ~27 lines changed | FIX — natural-key blockIndex | MEDIUM — index computation |
| `resources/js/features/nscmf/DraftField.vue` | ~6 lines changed | FIX — errorPath prop | LOW |
| `resources/js/testing/inertia.ts` | ~69 lines changed | FIX — test double dispatch order | MEDIUM — affects all test correctness |
| `resources/js/components/RequestFeedback.vue` | ~11 lines changed | FIX — type export | LOW |
| `resources/js/types/feedback.ts` | 10 | NEW — type-only | LOW |

### Test Files (8 file, verifikasi coverage)

| File | Tests |
|------|-------|
| ChangeResults.test.ts | 29 |
| SubmitPanel.test.ts | 36 |
| useDraftSave.test.ts | 16 |
| useDraftSave.realwire.test.ts | 8 |
| ResultsSection.test.ts | 11 |
| GeneralServiceSection.test.ts | 17 |
| Review/Index.test.ts | 22 |
| inertia.test.ts | 10 |

---

## Apa yang Harus Di-review

### 1. ChangeResults.vue — State machine correctness
- `hasTerminalError` latch: apakah benar diterapkan di semua HTTP exception?
- `onSuccess` guard: `if (hasTerminalError.value) return` — apakah cukup?
- Flash watcher vs onFlash callback: apakah ada race condition?
- `resetToRecord()` dipanggil saat `record_version` berubah — apakah benar?
- `buildChangeResultsPayload`: validasi row_no 1-5, duplicate check, blank-to-null
- `blankToNull`: hanya trim string kosong, bukan sanitize — apakah cukup?

### 2. useDraftSave.ts — Concurrent request safety
- `inFlightCount` tracking: apakah selalu seimbang (increment/decrement)?
- `settled` flag per request: apakah mencegah double-fire onSuccess/onError?
- Snapshot comparison: `JSON.stringify` deep equality — bisa salah pada key order?
- `resolveConflict()` resync: apakah version bisa stale setelah resolve?
- Autosave interval cleanup: apakah timer leak mungkin?

### 3. SubmitPanel.vue — Error navigation
- `data-error-path` attribute: apakah selector injection mungkin? (querySelector pakai attribute value)
- Natural-key blockIndex dari `service_context`: EXISTING=0, NEW=1 — apakah hardcoded benar?
- Focus behavior setelah submit error: apakah scroll ke element yang benar?

### 4. inertia.ts test double — Dispatch order
- `onHttpException(false)` stops processing: apakah sesuai kontrak @inertiajs/core?
- Non-Inertia response: tidak memanggil onNetworkError — apakah benar?
- Flash dispatch: `onFlash` hanya dipanggil kalau flash non-empty — sesuai kontrak?
- `respondToRequest(undefined)` throws — apakah semua caller handle ini?

### 5. Review/Index.vue — Query params
- Integer clamping pada page/per_page: apakah NaN/negative ditangani?
- Filter allowlist: apakah hanya field yang diizinkan bisa di-query?
- Boolean filter coercion: apakah `'true'`/`'false'` string ditangani benar?

### 6. GeneralServiceSection.vue — Index computation
- Computed `blockIndex`: apakah reactive terhadap perubahan model?
- Bagaimana jika `service_context` undefined/null?

---

## Bug yang Sudah Ditemukan dan Diperbaiki

| ID | Severity | Deskripsi | Commit |
|----|----------|-----------|--------|
| F-28-R2-1 | HIGH | Server index mismatch: error navigation pakai model array index, server pakai persisted-set index | 808bada |
| FE-29-1 | HIGH | HTTP 500 Inertia tetap menampilkan "Saved just now" karena hasTerminalError hanya cover 403/409 | 3f76f86 |
| FE-29-2 | MEDIUM | Test double onHttpException(false) tidak menghentikan processing | 3f76f86 |
| FE-29-3 | MEDIUM | Non-Inertia HTTP response dipalsukan sebagai network error | 3f76f86 |
| FE-29-4 | LOW | onFlash tidak pernah dipanggil di test double | 3f76f86 |

---

## Spesifikasi Referensi

Microtask specs: `microtask_fe/FE-26.md` .. `microtask_fe/FE-30.md`
Kontrak data: `microtask_fe/06_KONTRAK_DAN_GAP.md`
API contract: `project_doc/12_API_Contract.md`
Coding rules: `project_doc/15_Coding_Rules_AGENTS.md`
Testing spec: `project_doc/16_Testing_Specification.md`

---

## Batasan

- Ini BUKAN independent security review — closure dilakukan oleh agent yang sama.
- `js/types/auth.ts` dan `js/types/feedback.ts` coverage 0% karena type-only (expected).
- Branch belum di-merge ke main.
- Tidak ada backend/server-side changes di branch ini — semua frontend-only.
