# Penyelesaian backlog BE — 2026-09-23

Branch `feat/be-fe-01-30-integration`, dari `06e4df3` sampai HEAD (lihat `git log 06e4df3..HEAD`). Commit lokal saja: tidak ada push, PR, merge, atau klaim human/security review.

## Bukti gate (dijalankan lokal, macOS arm64, MySQL 8.4 Docker)

| Gate | Hasil |
| --- | --- |
| Pest seluruh suite (`php -d memory_limit=2G vendor/bin/pest --coverage --min=80`) | **PASS** — 440 test, 3.603 assertion |
| Coverage baris PHP milik proyek | **92,8%** (ambang 80%) |
| PHPStan/Larastan level max, tanpa baseline | **PASS** |
| Pint `--test` | **PASS** |
| Konkurensi MySQL nyata (`tests/Concurrency`) | **PASS** — 6 skenario, proses & koneksi terpisah |
| ClamAV nyata (`tests/Integration/Malware`, `clamav/clamav-debian:1.4`) | **PASS** — CLEAN, EICAR→INFECTED, pipeline upload penuh |
| LibreOffice 26.8 + OpenSSL nyata (`tests/Feature/Export`) | **PASS** — render, tanda tangan, verifikasi 4 hasil, rotasi sertifikat |
| Frontend (ESLint/vue-tsc/Vitest/build) | **NOT RUN** di sesi ini; `npm run typecheck` masih gagal karena perubahan lokal pengguna di `ReauthenticationDialog.test.ts` (tidak disentuh) |
| Playwright Chromium | **NOT RUN** |

Test ekspor/PDF membutuhkan workbook resmi privat dan `soffice`; tanpa itu (mis. di CI) test tersebut **skip**, bukan lulus. CI kini menjalankan clamd nyata di job backend.

## Posisi per modul (BE-145)

| Modul | Backend | Belum ada / di luar backend |
| --- | --- | --- |
| Workflow Review/Approval/Cancel/Reopen/Archive (BE-067–080) | Terimplementasi + uji race | Halaman FE-33 `Approval/Show` belum ada |
| Audit, Timeline, History (BE-081–088) | Terimplementasi | Halaman `History/Index`, `Administration/Audits/*` belum ada (FE) |
| Lampiran resumable + ClamAV (BE-089–103) | Terimplementasi, clamd nyata | UI FE-41/42/43 |
| Ekspor XLSX (BE-104–113) | Terimplementasi dengan workbook resmi | Review mapping v1 oleh pemilik |
| PDF, signing, validator publik (BE-114–124) | Terimplementasi, signer `ddn/sapp` | Kualifikasi font (G16); halaman `Public/PdfValidator` (FE-48) |
| Setting log teknis & scheduler (BE-125–131) | Terimplementasi | Halaman FE-50 `Administration/Settings/TechnicalLogs` |
| Data demo (BE-134–138) | Terimplementasi via service asli | DEMO-CHG-008 tidak diarsip (G20) |
| Hardening (BE-140–144) | Arsitektur, negatif keamanan, coverage, CI clamd | Chromium journey (FE-53/54) |

Tidak ada modul yang diklaim **Feature Done**: DoD (18) mensyaratkan human review, security review untuk perubahan sensitif, dan bukti Chromium.

## Manifest kandidat (BE-146)

- Kode: HEAD branch ini; migrasi tidak berubah (tidak ada migrasi baru).
- Dependency baru: `ddn/sapp ^1.5` (disetujui 2026-09-23).
- Infrastruktur lokal: `compose.yaml` service `clamav` (loopback 3310); LibreOffice via Homebrew.
- Provisioning operator: `php artisan nscmf:template:register NSCMF-Form-3.0.xlsx --activate`, `php artisan nscmf:signing:activate --generate`, scheduler Laravel tiap menit, queue worker `database`.
- Konfigurasi baru: `NSCMF_CLAMAV_*`, `NSCMF_RENDERER_*`, `NSCMF_SIGNING_*`, `NSCMF_PUBLIC_HOST`, `UPLOAD_RATE_PER_MINUTE`, `UPLOAD_FINALIZE_PER_MINUTE`, `PDF_VALIDATOR_RATE_PER_MINUTE`.

## Checklist production-like (BE-147) — belum dijalankan

HTTPS/sesi, MySQL 8.4 persisten, storage privat persisten, clamd privat, worker+scheduler, renderer terkualifikasi, signer non-prod, cleanup — semuanya **NOT RUN** di staging karena belum ada host staging. Bukti lokal di atas bukan bukti staging.

## Keputusan yang masih terbuka (BE-148)

1. **G16 — font renderer:** Calibri tergantikan Carlito (setara metrik). Aptos Display/Narrow tidak terpasang sehingga judul tercetak dengan font pengganti. Pilihannya: pasang font Aptos di host renderer, atau terima substitusi.
2. **G10 — mapping v1:** empat keputusan penempatan di `docs/template-mapping.md` menunggu review pemilik.
3. **G20 — arsip Cancelled:** 17 §49 meminta DEMO-CHG-008 diarsip, tetapi 12 §17.1 membuat record Cancelled hanya terlihat oleh pemiliknya.
4. **G04 — kemasan bulk export:** saat ini satu request per record; ZIP/gabungan belum diputuskan.
5. **G05/G15 — angka final** rate limit dan timeout scan/render (nilai sementara sudah aktif).
6. **Kustodi kunci signing produksi** dan hostname publik validator: keputusan operator saat rilis.
7. G11 (notifikasi) dan G13 (data Team produksi) tetap deferred.

## Batas klaim (BE-149)

Level 3 (rilis/production-ready) **tidak diklaim**. Lolos lokal ≠ terbukti di Docker ≠ ter-deploy ≠ siap produksi. Implementasi menunggu human review; agen tidak menyetujui atau me-merge pekerjaannya sendiri.
