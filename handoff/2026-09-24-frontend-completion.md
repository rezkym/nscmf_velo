# Penyelesaian FE dan keputusan pemilik — 2026-09-24

Branch `feat/be-fe-01-30-integration`, lanjutan dari `f211766` (lihat `git log f211766..HEAD`). Semua commit lokal: tidak ada push, PR, merge, atau klaim human/security review.

## Keputusan pemilik yang diterapkan

| Gap | Keputusan | Bukti |
| --- | --- | --- |
| G16 font PDF | Font persis template: Calibri, Aptos Narrow, Aptos Display; tanpa pengganti | `NSCMF_RENDERER_FONTS_PATH`; test font di `tests/Feature/Export/PdfSigningAndValidatorTest.php` |
| G10 posisi isian | Nilai ditulis tepat di sel isian template (kiri-atas merge / sel pertama garis) | Test struktural di `tests/Feature/Export/ExportTest.php`; `A32`, `J39`, `AE39` dibetulkan |
| G20 DEMO-CHG-008 | Dimiliki, dibatalkan, dan diarsipkan Protected Superadmin | `DemoSeederTest`; Superadmin mendapat Demo Team Gamma hanya di data demo |

Perbaikan BE kecil yang ditemukan saat mengerjakan FE (masing-masing test-first):

- `/history` default tanpa record terarsip, sesuai 07 §451.
- Waktu di viewer audit dikirim sebagai ISO-8601 dengan zona +07:00.

## Hasil gate (lokal, macOS arm64)

| Gate | Hasil |
| --- | --- |
| Vitest | **PASS**: 668 test |
| Coverage FE (baris) | **97,24%** (2330/2396), minimal 80% |
| ESLint, Prettier, vue-tsc | **PASS untuk semua file kecuali satu**: `resources/js/components/ReauthenticationDialog.test.ts` adalah perubahan lokal pengguna yang tidak di-commit dan sintaksnya rusak. File itu tidak disentuh dan dikecualikan dari run coverage. Karena itu `npm run lint`, `format:check`, dan `typecheck` tetap merah. |
| `npm run build` | **PASS** |
| Playwright Chromium, retries 0 | **PASS**: 24 test, server asli (`nscmf_testing`) |
| Pest + coverage PHP | **PASS**: 443 test, coverage 93,7% |
| PHPStan max, Pint | **PASS** |
| ClamAV, LibreOffice, signing nyata | **PASS**: di Pest dan di journey Chromium FE-55 AC3 |
| CI GitHub | **NOT RUN**: tidak ada push |
| Human review / security review | **NOT RUN** |

## Keterlacakan 27 layar

Semua layar di `microtask_fe/04_TRACEABILITY.md` sudah punya halaman dan test:

- **Auth dan admin (1–3, 22–25):** halaman yang sudah ada, plus `auth-admin.spec.ts`.
- **Dashboard sampai Review (4–12):** halaman yang sudah ada, plus `workflow.spec.ts`, `draft-save.spec.ts`, dan `fe-critical-journeys.spec.ts`.
- **Layar baru di sesi ini:**
  - Approval Detail: `Pages/Approval/Show.vue`
  - History dan archived view: `Pages/History/Index.vue`
  - Record Detail: aksi lifecycle dan ekspor
  - Business Timeline: `features/nscmf/BusinessTimeline.vue`
  - Attachments: `features/attachments/*` (termasuk panel di Edit)
  - Export: `features/exports/ExportPanel.vue` dan `BulkExportPanel.vue`
  - Public PDF Verification: `Pages/Public/PdfValidator.vue`
  - Core/Technical Log Settings: `Pages/Administration/Settings/TechnicalLogs.vue`
  - Access/Security Audit: `Pages/Administration/Audits/*`

## Pemetaan task sesi ini

| Task | Test | Catatan |
| --- | --- | --- |
| FE-33 | `Pages/Approval/Show.test.ts` | Alur aksi umum diekstrak ke `workflow/RecordActions.vue` (refactor dijaga test ReviewActions) |
| FE-34–36 | `workflow/LifecycleActions.test.ts`, `Pages/Nscmf/Show.test.ts` | Reopen: dua tombol tujuan; unarchive memakai `hint` allowed_actions |
| FE-37 | `Pages/History/Index.test.ts` | Pilihan baris untuk bulk export (AC5) |
| FE-38 | `features/nscmf/BusinessTimeline.test.ts` | Grup per iterasi, WIB, gate izin di dalam komponen |
| FE-39 | `features/audits/AuditLog.test.ts` | Hanya field yang di-whitelist yang dirender |
| FE-40–43 | `features/attachments/*.test.ts`, `Pages/Nscmf/Edit.test.ts` | Picker dikunci selama form belum disimpan (lampiran mengubah `record_version`) |
| FE-44–47 | `features/exports/ExportPanel.test.ts` | Konteks snapshot (versi/iterasi) tidak ditampilkan: proyeksi BE tidak menyediakannya |
| FE-46 | `features/exports/BulkExportPanel.test.ts` | Satu request per record; tanpa ZIP (G04 masih terbuka) |
| FE-48–49 | `Pages/Public/PdfValidator.test.ts` | Halaman publik tanpa shell aplikasi; `sendForm` multipart |
| FE-50 | `Pages/Administration/Settings/TechnicalLogs.test.ts` | Setelah re-auth tidak menyimpan otomatis; pengguna menekan Save lagi |
| FE-51 | `tests/Browser/fe-accessibility.spec.ts` | Dua temuan nyata: overflow di 320 px dan reduced motion (keduanya diperbaiki) |
| FE-52–54 | Journey Chromium + Pest | Dibuktikan dengan server asli, tanpa file kontrak tiruan terpisah |
| FE-55 | `tests/Browser/fe-critical-journeys.spec.ts` | Approval→arsip, aktor terlarang, lampiran di-scan, PDF bertanda tangan diverifikasi publik, setting+re-auth |
| FE-56 | `features/nscmf/securityPresentation.test.ts` | Guard statis |
| FE-57 | Dokumen ini | — |

## Kronologi TDD: batas yang perlu diketahui reviewer

- **Pola umum:** tiap slice FE-33–50 memakai commit `test(...)` dengan RED bermakna di atas kerangka komponen kosong, lalu commit `feat(...)`.
- **Test yang dibetulkan setelah commit RED.** Semua karena kesalahan test, bukan karena melunakkan assertion:
  - input 'Scope' (sudah 5 karakter, jadi valid)
  - data chunk palsu yang tidak konsisten dengan ukuran file
  - `Response` 204 dengan body
  - komponen yang masih polling dari test sebelumnya (ditambah `enableAutoUnmount`)
  - kalimat status global yang terlalu luas
- **Test yang langsung lulus tanpa RED.** Keduanya adalah bukti atas perilaku yang sudah ada, bukan TDD:
  - journey Chromium FE-55
  - guard statis FE-56
- **Test lama yang diperbarui karena spesifikasi baru:**
  - tautan antrean ke `/review/{id}` (FE-31)
  - placeholder tab Timeline/Attachments
  - larangan menu audit, yang dulu ada karena halamannya belum ada

## Belum selesai / di luar klaim

- Tidak ada modul yang diklaim **Feature Done**. DoD (18) mensyaratkan human review, security review (auth, lampiran, validator publik, setting), dan CI.
- Keputusan terbuka:
  - G04: kemasan bulk export
  - G05/G15: angka final rate limit dan timeout
  - kustodi kunci signing produksi
- Menu "Technical Logs" tampil untuk pemegang `system.settings.manage`. Hanya Protected Superadmin yang bisa menyimpan, dan itu ditegakkan server.
- Level 3 (rilis/production-ready) **tidak diklaim**.
