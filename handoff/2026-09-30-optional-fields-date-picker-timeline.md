# Form NSCMF serba-opsional, Date Picker, dan timeline diff (2026-09-30, G24)

Branch `feat/fix_miss_feature`, lanjutan `0d492bd` (lihat `git log 0d492bd..HEAD`). Semua commit masih lokal: belum ada push, PR, CI GitHub, maupun human review.

## Keputusan pemilik (G24)

| # | Keputusan |
| --- | --- |
| K1 | Family, Subtype, mode penomoran, dan Request No manual tetap wajib saat Create. |
| K2 | Semua isian form NSCMF (Activation dan Change, semua subtype) opsional di setiap tahap. Hanya Request date yang wajib saat Submit/Resubmit. Aturan "wajib bersyarat" dihapus. |
| K3 | Gerbang Result saat Forward dihapus. |
| K4 | Aturan format tetap berlaku untuk nilai yang diisi. |
| K5–K7 | Semua input tanggal memakai Date Picker shadcn-vue. Tampilan `30 Sep 2026`, nilai `YYYY-MM-DD`. `@internationalized/date` menjadi dependency langsung. |
| K8–K11 | Timeline memakai tabel split Field / Before (−) / After (+), langsung terbuka. Update tanpa perubahan disembunyikan, dan nama file lampiran ditampilkan. |

Dokumen yang disinkronkan: `project_doc` 01, 02, 03, 05, 06, 07 (§22, §22.1, §24, §26, §36, §66), 08 §70, 09, 11, 12 (§30, §32, §48, §7.4.1), 16, 17, dan 19, plus G24 di register gap BE (`9a19084`).

## Hasil

| Task | Perubahan | Commit (RED → GREEN) |
| --- | --- | --- |
| BE-152 | `SubmissionRules` hanya memeriksa Request date dan format. `ReviewForwardRules` dan prop `forward_readiness` dihapus. | `92ff839` → `573ebc8` |
| FE-60 | Tanda wajib hanya pada Request date (plus Family/Subtype/Request No manual di Create). Badge Required/Optional dan salinan "wajib" dihapus. Forward form Change selalu tersedia. | `53aaca7` → `616f69a`; salinan Plan `b89d7aa` → `9b76b53` |
| FE-61 | Satu komposisi `components/DatePicker.vue` (Popover + Calendar) dipakai di 7 input tanggal: Request date, RFS, Target, dan filter History/Audit. "Hari ini" mengikuti Asia/Jakarta, dan tanggal bisa dikosongkan lewat Clear. | `085f3b1` → `3879263` |
| BE-153 | Timeline tidak mengirim `DRAFT_UPDATED`/`RESULT_UPDATED` tanpa perubahan (baris maupun hitungan), dan mengirim `attachment_filename`. Audit di DB tidak berubah. | `0491a88` → `2fc4de8` |
| FE-62 | Satu skema label `features/nscmf/recordFields.ts` dipakai Form Detail dan Timeline (refactor `8c815f1`). `timelineDiff.ts` membandingkan field, blok site, dan koleksi per baris (kunci alami) dan per sel. Tabel split memakai −/+ dan teks `sr-only`, dan bertumpuk di layar sempit. | `3b46d97` → `32b3158` |

## Catatan teknis

- **Pemasangan `calendar`:** CLI shadcn-vue berhenti di prompt "overwrite native-select". Isi `calendar` diambil dari item registry resmi (`shadcn-vue.com/r/styles/reka-vega/calendar.json`) dengan transformasi alias yang sama seperti CLI. `native-select` yang ada tidak ditimpa.
- **`as any` di registry:** kode registry memuat `as any` di dua tempat. Keduanya diganti dengan tipe tepat (`HTMLSelectElement`, `unknown`), tanpa melonggarkan lint.
- **Versi paket:** kenaikan versi `@lucide/vue`/`reka-ui` oleh CLI dikembalikan. `package-lock.json` hanya bertambah satu baris untuk `@internationalized/date` 3.12.4, versi yang memang sudah terpasang.
- **Prop yang dihapus (YAGNI):** prop yang tidak terpakai lagi setelah G24 dihapus, yaitu `subtype` di GeneralService/PurposeImpact, `required` di DraftField/DraftNumberField, serta `family`/`changeForward*` dan `unavailableReason` di ReviewActions/RecordActions.
- **Test lama yang disesuaikan di commit GREEN, bukan RED:**
  - `ReviewDetailTest` masih memeriksa `forward_readiness.ready`. Assertion itu dihapus bersama prop-nya (`573ebc8`).
  - Test "read-only" AuditLog kini mengecualikan dua tombol pemicu filter tanggal (`3879263`).
  - Keduanya menyandikan perilaku lama yang dihapus K3/K5, dan maksud test tetap sama.
- **Playwright:** helper `pickDate()` dan `jakartaToday()` di `tests/Browser/support/nscmf.ts`. Helper ini juga memperbaiki bug lama: "hari ini" sebelumnya dihitung dalam UTC.

## Gate (lokal, HEAD `9b76b53`)

| Gate | Hasil |
| --- | --- |
| Pint, PHPStan max | lulus, 0 error |
| Pest + coverage (MySQL 8.4) | 504 lulus, cakupan baris 95,1 % |
| Vitest + coverage | 750 lulus, cakupan baris 94 % (`recordFields.ts` 100 %, `timelineDiff.ts` 100 % baris) |
| vue-tsc, ESLint, Prettier, build | lulus |
| Playwright Chromium | 31/31 lulus |
| Runtime config | 5/5 lulus |

**Kegagalan yang pernah muncul:** satu run `draft-save.spec.ts` gagal di langkah Create. Snapshot menunjukkan pilihan "Change" kembali ke "Activation" karena `selectOption` terjadi sebelum halaman terhidrasi. Langkah itu tidak diubah di pekerjaan ini. Tiga run ulang dan dua run penuh setelahnya lulus.

**Pemeriksaan visual:** dilakukan dengan spec Playwright sementara yang tidak di-commit. Timeline di mode terang/gelap (1280 px) dan layar 390 px, serta date picker yang terbuka, tampil sesuai 07 §36 dan §22.1.

## Belum dilakukan

- Human implementation review. Tidak ada perubahan izin, tetapi aturan validasi dan proyeksi audit berubah.
- Push, PR, CI GitHub.
- Status di `microtask_fe/FE-60–62.md` dan `microtask_be/README.md` hanya diperbarui di working tree. `microtask_fe/` diabaikan git, dan README BE memuat perubahan stage milik pemilik.
