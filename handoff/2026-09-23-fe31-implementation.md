# Handoff FE-31 dan backend Review — 2026-09-23

> Catatan historis sebelum merge. Implementasi kini berada di `/Users/rezky/Documents/Alya`; worktree sementara sudah dihapus. Gunakan [handoff merge terbaru](2026-09-23-merge-fe31-status.md) untuk lokasi, status dan pemulihan file lokal. Perintah worktree di bawah adalah catatan historis.

## Scope dan keputusan eksekusi

Instruksi terakhir pengguna membatasi pekerjaan pada **FE-31 beserta backend**, melarang subagent, dan menunda pengujian kode hingga akhir. Implementasi tambahan ini dikerjakan langsung oleh root, tanpa tes baru. FE-32–40 tidak dilanjutkan. Aturan produk, permission, transaksi, audit dan arsitektur tetap berlaku. Ini penyerahan implementasi untuk dicoba manual, bukan klaim Feature/Module Done atau Production Ready.

- Worktree: `/private/tmp/alya-fe-31-40`.
- Branch: `feat/fe-31-40-integration`.
- Baseline sebelum perubahan ini: `a56840b` (Reviewer Reject); Return sebelumnya tersedia.
- Checkout utama `/Users/rezky/Documents/Alya` tidak diubah, tidak merge/push.
- `microtask_fe` diabaikan Git; FE-31.md diperbarui lokal. Handoff ini menjadi catatan status yang tracked.

## Implementasi tersedia

- Queue Review membuka `GET /review/{record}`, membutuhkan `nscmf.review` dan resource visibility. Detail tetap dapat dibaca setelah aksi mengganti status.
- Form read-only memakai `features/nscmf/RecordDetail.vue`, hasil ekstraksi detail existing. Seluruh section keluarga Activation/Change dan signoff menggunakan projection server.
- Return, Reject, Forward menggunakan tiga endpoint POST berbeda, permission masing-masing, `record_version`, dialog reason/comment, loading/error dan konflik tanpa replay otomatis. Return/Reject sebelumnya tersedia; redirect kini kembali ke halaman Review bagi pengguna yang berizin.
- Forward baru: `ReviewForwardRequest` → `NscmfWorkflowService::forward` → repository. Parent row lock dan transaksi meliputi otorisasi/state/version, gate Results tersimpan, Reviewed By/At iteration aktif, PENDING_APPROVAL, increment version dan satu REVIEW_FORWARDED audit. Activation tidak diwajibkan Results; Change membutuhkan minimal satu lengkap dan semua baris yang dimulai lengkap.
- `RecordEvidenceRepository`/implementation serta `RecordEvidenceService` menyediakan Business Timeline paginated dan attachment metadata. Timeline hanya untuk `nscmf.timeline.view`; tidak mencampur routine Access Audit.
- Download private memeriksa akses parent, attachment milik parent, belum removed, CLEAN dengan scan timestamp, serta binary tersedia; key tidak dikirim ke FE. Download dicatat ke Access Audit.
- Tidak menambah dependency, migration, upload/scanner atau renderer. Tidak membuat attachment CLEAN palsu. ClamAV/LibreOffice belum diperlukan untuk FE-31 read-only.

Routes pendukung baru: `GET /nscmf/{record}/timeline`, `GET /nscmf/{record}/attachments/{attachment}/download`, `POST /nscmf/{record}/review/forward`. `Review/Show.vue` menghubungkan ReviewActions, ReviewTimeline dan ReviewAttachments.

## Evidence aktual dan pekerjaan tertunda

Pada source terbaru:

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 |
| `php -l` pada 16 file PHP aplikasi yang berubah/baru | PASS |
| `php artisan route:list --path=review --except-vendor` | PASS; queue, detail, tiga aksi terdaftar |
| Prettier/Pint pada source yang disentuh | Diformat |
| Pest, Vitest, Chromium, coverage, PHPStan dan CI untuk integrasi terbaru | NOT RUN / ditunda oleh pengguna |
| Human review / security review | Belum dilakukan |

Build/sintaks bukan bukti perilaku runtime. AC FE-31 dan BE-070 tetap membutuhkan pembuktian kemudian: tiga transisi, required reason, Change Results gate, signoff hanya Forward sukses, unauthorized/IDOR, rollback, concurrency stale version, keyboard/dialog serta download CLEAN/non-CLEAN. Bukti tes commit sebelumnya tidak diperlakukan sebagai bukti perubahan terbaru.

File `tests/Concurrency/ReviewReturnConcurrencyTest.php` sudah memiliki refactor belum selesai dari pekerjaan sebelum instruksi berhenti. File dipertahankan tanpa perubahan/staging oleh root pada penyerahan ini; bukan bagian implementasi baru dan tidak diklaim lolos.

## Menjalankan untuk mencoba manual

MySQL 8.4 terpisah sudah tersedia: container `alya_fe3140_mysql`, loopback `127.0.0.1:3308`, database `nscmf_fe3140_testing`. Kredensial berada dalam `.env` privat worktree. Migrasi existing diterapkan dan ReferenceDataSeeder dijalankan. Pemeriksaan baca-saja terakhir: 41 permissions, 4 roles, 0 users, 0 records. Tidak ada reset database utama.

Jalankan di terminal Anda agar temporary password hanya tampil di terminal tersebut:

```bash
cd /private/tmp/alya-fe-31-40
export APP_ENV=testing
export DB_HOST=127.0.0.1
export DB_PORT=3308
export DB_DATABASE=nscmf_fe3140_testing
php artisan nscmf:bootstrap-superadmin
php artisan serve --host=127.0.0.1 --port=8021
```

Buka `http://127.0.0.1:8021/login`. Login `superadmin` menggunakan password sekali tampil dari command, lalu ganti password. Command bootstrap yang dijalankan ulang tidak mereset/mengungkap password existing. Build assets sudah tersedia; Vite dev server tidak diperlukan.

Gunakan halaman initial setup/Administration untuk Team dan akun sesuai kebutuhan. Superadmin memiliki permission eksplisit dari reference role (bukan bypass). Buat dan submit record melalui UI, buka `/review`, lalu pilih record. Gunakan record berbeda untuk Return, Reject, Forward; untuk Change lengkapi Results sebelum Forward. Uji dua tab dengan version lama untuk mencoba pesan konflik dan refresh eksplisit. Timeline harus menunjukkan mutation; attachment kosong adalah keadaan nyata karena pipeline upload belum diimplementasikan.

Database ini tetap disposable. Jangan menjalankan suite reset/migration test terhadapnya selagi data manual masih diperlukan. Server belum dijalankan oleh agent; perintah di atas menjalankannya di terminal pengguna.

## Kelanjutan

Setelah pengguna selesai mencoba, kerjakan tes yang ditunda dan perbaiki temuan dalam scope FE-31. Jangan melanjutkan FE-32–40 tanpa instruksi baru. Jangan menganggap dukungan baca attachment/Timeline ini menyelesaikan seluruh backlog Phase 5/6.
