# Laporan Activity Log dan ekspor XLSX/PDF (2026-10-12, G26)

Branch `feat/activity-log-report`, dibuat dari branch lokal `staging`. `staging` dibuat dari `main` lalu di-fast-forward ke `docs/microtask-status-2026-09-30` (`e15bf01`). Lihat `git log e15bf01..HEAD`. Semua commit masih lokal: belum ada push, PR, CI GitHub, maupun human review.

## Keputusan pemilik (G26)

| # | Keputusan |
| --- | --- |
| K1 | **Kolom Customer Name:** NSCMF Activation memakai `customer_name`. NSCMF Change tidak punya isian nama pelanggan, jadi kolom ini diisi **baris pertama Maintenance Purpose**. Di workbook, teksnya dipotong menjadi 42 karakter dengan `…` agar muat satu baris. Halaman web menampilkan baris pertama secara utuh. |
| K2 | Site Location NOC15/NOC23 dicentang otomatis bila ada entri Change yang diekspor dengan Service Impact itu. Nilainya tetap bisa diubah di jendela ekspor. Kolom NOC Infrastructure berisi label Service Impact untuk Change (dipotong 36 karakter) dan kosong untuk Activation. |
| K3 | Prepared By otomatis berisi nama pengekspor dan tanggal ekspor. Acknowledge By opsional. Nama dan tanggal keduanya bisa diketik manual. Kotak tanda tangan dibiarkan kosong untuk ditandatangani di kertas. |
| K4 | Lebih dari 40 entri berlanjut ke halaman baru: 40 baris bernomor per halaman, judul kolom berulang, dan blok tanda tangan ada di halaman terakhir. |
| K5 | Kolom Date dan filter rentang tanggal memakai Request date. |
| K6 | Cetakan kosong dibuat dari contoh dengan menghapus seluruh data asli. |
| K7 | Ekspor diproses di belakang (DB queue) dan progresnya tampil dalam persen. File disimpan 168 jam. PDF tidak ditandatangani. |
| K8 | Izin yang dipakai: `nscmf.view.history` untuk membuka laporan, ditambah `nscmf.export` untuk mengekspor. Tidak ada izin baru. |
| K9 | Status default adalah semua status yang sudah disubmit. Tersedia tombol cepat "Approved only", dan status lain bisa dipilih satu per satu. |
| K10 | Asumsi yang disetujui bersama rencana: maksimal 1.000 entri per ekspor; tampilan default mencakup record aktif dan arsip; pilihan entri tetap tersimpan saat berpindah halaman; route `/reports/activity-log`. |

Dokumen yang disinkronkan: `project_doc` 01 §8 (57), 02 §20A, 03 §44A, 04 §12/§21, 07 §10/§12/§34.2, 09 §63A, 10 §61A, 11 §5.3/§36/§41/§44A, 12 §12/§44/§47.2/§111/§113, 13 §49A, 14 §70A, 16 §60A, 19 T82; `docs/activity-log-template-mapping.md`; G26 di register gap BE.

## Hasil

| Task | Perubahan | Commit (RED → GREEN) |
| --- | --- | --- |
| BE-156 / T82A | Kolom `template_kind` (satu versi aktif per kind), `nscmf:template:register --kind=activity-log`, tabel `nscmf_activity_log_exports`, dan kolom `access_audit_events.activity_log_export_id`. | `abf7399` → `40d79c8` |
| BE-157 / T82B | `ActivityLogMappingV1` dan `OoxmlActivityLogPatcher`, ditambah helper OOXML bersama (`OoxmlPackage`, refaktor `23a2412`). Renderer LibreOffice kini selalu memakai locale `en-US`. | `89bdda1`, `a36854e`, `c4e61af` → `ae73867` |
| BE-158 / T82C | `GET /reports/activity-log`: filter, visibilitas 12 §17.1, sumber kolom, dan ringkasan. | `c0073d7` → `83d6844` |
| BE-159 / T82D | Request ekspor dengan snapshot, worker dengan progres 5/10/70/90/100 %, poll, daftar, unduh, cleanup 168 jam, dan Access Audit. | `bc7e3ba` → `bac8e49` |
| FE-68, FE-69 / T82E | Halaman, dialog ekspor, panel progres, dan menu Activity Log. | `089b742`, `6b914c0` → `45ef729` |
| FE-70 / T82F | Journey Chromium `tests/Browser/activity-log.spec.ts`. | `56664b3` (ditulis setelah fitur, tanpa fase RED) |

## Cetakan

- `NSCMF-Log-Template.xlsx` ada di root repo dan sengaja tidak di-commit (`.gitignore`). Sumbernya `NSCMF-Log-Example.xlsx`, dengan isi ini dihapus:
  - semua entri, tanggal periode, dan nama;
  - creator/lastModifiedBy di `docProps/core.xml`;
  - path pribadi `absPath` di `workbook.xml`.
  - Centang NOC15/NOC23 juga dikembalikan ke kosong. Grep terhadap nama pelanggan/orang asli tidak menemukan sisa apa pun.
- **Pemilik perlu memeriksa file ini sebelum dipakai di server.** Daftarkan dengan:
  `php artisan nscmf:template:register NSCMF-Log-Template.xlsx --kind=activity-log --label=NSCMF-Log-1.0 --activate`
- `NSCMF-Log-Example.xlsx` dan `report_nscmf.png` berisi data asli dan ikut di-ignore.

## Catatan teknis

- **Tanggal di PDF:** format bawaan `d-mmm-yy` mengikuti locale renderer, sehingga di Mac berbahasa Indonesia muncul "01-Agu-26". Profil LibreOffice sekali pakai kini dikunci ke `en-US`, sehingga hasilnya "3-Aug-26" di host mana pun. Perubahan ini berlaku juga untuk renderer form NSCMF. Semua test PDF/font NSCMF yang sudah ada tetap lulus.
- **Batas teks (42/36 karakter):** angka ini diambil dari render nyata, bukan tebakan. Dengan 50 karakter, teks di kolom Customer Name terpotong.
- **Progres:** dihitung per tahap, bukan per baris. Nilainya 5 (preparing), 10 (filling), 70 (workbook terisi), 90 (PDF dirender), dan 100 (READY). Mengisi workbook hanya butuh milidetik, jadi kenaikan per 40 baris tidak memberi informasi tambahan.
- **PDF laporan** tidak ditandatangani dan tidak tercatat sebagai issuance, sehingga `/ispdfvalid` menjawab UNKNOWN untuknya.
- **Lingkungan lokal:**
  - Port 3306 sempat dipakai container proyek lain; pemilik menyalakan `nscmf_mysql`.
  - File `public/hot` yang basi (dev server Vite tidak berjalan) membuat runtime Playwright gagal memuat aset. File itu dipindahkan ke scratchpad sesi, bukan dihapus. Menjalankan `npm run dev` akan membuatnya lagi.

## Gate yang dijalankan (lokal)

Semua dijalankan pada 2026-10-12 terhadap MySQL 8.4 lokal (`nscmf_mysql`), dengan LibreOffice dan cetakan asli tersedia:

| Gate | Hasil |
| --- | --- |
| Pint | lulus |
| PHPStan/Larastan max | 0 error |
| Pest penuh (`composer test:coverage`) | 552/552 lulus, coverage baris PHP 95,3% |
| ESLint, Prettier, vue-tsc | lulus |
| Vitest (`npm run test:coverage`) | 780/780 lulus, coverage baris 92,62% |
| `npm run build` | lulus |
| Playwright Chromium (seluruh suite) | 39/39 lulus |

Satu test lama perlu disinkronkan dengan spesifikasi baru: `SchemaT0511Test` kini memuat kolom `activity_log_export_id` (11 §36). CI GitHub belum dijalankan.

## Review dan penggabungan

- 2026-10-12: pemilik menyatakan sudah me-review dan menyetujui pekerjaan ini, termasuk cetakan kosong. `feat/activity-log-report` lalu digabung (fast-forward) ke `staging` lokal atas permintaan pemilik.
- Migrasi `2026_10_12_000001_create_activity_log_report_tables` dijalankan di database lokal `nscmf`, dan cetakan didaftarkan sebagai versi aktif kind `ACTIVITY_LOG`.

## Belum selesai

- Push, PR ke `main`, dan CI GitHub belum dilakukan (sesuai keputusan "lokal saja"). Merge ke `main` tetap oleh manusia.
- Cetakan harus didaftarkan ulang di setiap lingkungan lain (server) karena file tidak masuk Git.
