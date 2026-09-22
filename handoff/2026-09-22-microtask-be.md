# Handoff — backlog backend NSCMF

Tanggal: 22 September 2026 (Asia/Jakarta).

Penyusunan **149 microtask backend selesai** dalam [microtask_be](../microtask_be/README.md). Paket mencakup integrasi FE dan rencana pembuktian perilaku nyata. Seluruh task implementasi tetap **PLANNED** dan hasil pengujian aplikasi tetap **NOT RUN**. Permintaan terakhir hanya membuat handoff; tidak ada implementasi backend baru yang dimulai.

## Kondisi repository saat handoff

| Item                                                   | Kondisi yang diperiksa                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Branch aktif                                           | `docs/backend-microtasks`                                                    |
| HEAD/base                                              | `8f365a82997ab1270d17d83e93c68899321ef6a0`                                   |
| Backlog BE                                             | `microtask_be/` tersedia lokal, masih untracked                              |
| Perubahan handoff                                      | Berkas ini ditambahkan; `handoff/README.md` diberi tautan ke handoff terbaru |
| Commit/push/PR sesi ini                                | Belum dibuat                                                                 |
| Kode aplikasi, authority, dependency, database, Docker | Tidak diubah dalam penyusunan backlog maupun handoff                         |

Pertahankan seluruh file lokal tersebut ketika berpindah konteks. Jangan menganggapnya sudah tersimpan di remote. Periksa kembali `git status --short --branch` sebelum pekerjaan berikutnya.

Catatan branch, status merge, dan jumlah test pada handoff FE terdahulu merupakan bukti historis pada tanggal masing-masing. Untuk baseline penyusunan BE, gunakan [baseline dan sumber](../microtask_be/01_BASELINE_DAN_SUMBER.md), bukan pernyataan “current” dalam catatan lama.

## Hasil yang tersedia

| Dokumen                                                                                      | Fungsi                                                                        |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [README](../microtask_be/README.md)                                                          | Indeks 149 task, phase, parent resmi, prasyarat, status dan urutan topologis  |
| [01 — Baseline dan sumber](../microtask_be/01_BASELINE_DAN_SUMBER.md)                        | Kode/riwayat Git, batas bukti, fingerprint dokumen authority                  |
| [02 — Aturan eksekusi](../microtask_be/02_ATURAN_EKSEKUSI.md)                                | TDD, arsitektur, transaksi, keamanan, quality gates dan DoD bersama           |
| [03 — Traceability](../microtask_be/03_TRACEABILITY.md)                                      | Requirement → parent resmi → BE → FE → pengujian                              |
| [04 — Kontrak data dan HTTP](../microtask_be/04_KONTRAK_DATA_HTTP.md)                        | Endpoint, payload, response, permission, version dan error                    |
| [05 — Integrasi FE](../microtask_be/05_INTEGRASI_FE.md)                                      | Rekonsiliasi FE-01–30 dan pemilik/dependensi FE-31–57; gate browser nyata     |
| [06 — Gap dan keputusan](../microtask_be/06_GAP_DAN_KEPUTUSAN.md)                            | G01–G18, sumber, task terdampak, pemilik keputusan dan bukti penutupan        |
| [07 — Verifikasi dan evidence](../microtask_be/07_VERIFIKASI_DAN_EVIDENCE.md)                | Hasil pemeriksaan dokumen, pemeriksa Python, format evidence implementasi     |
| [08 — Schema dan constraint](../microtask_be/08_SCHEMA_DAN_CONSTRAINT.md)                    | Tabel, field, constraint, relasi dan 14 pecahan schema T05                    |
| [09 — Field dan validasi](../microtask_be/09_FIELD_DAN_VALIDASI.md)                          | Field Activation/Change, collection semantics dan validation profiles         |
| [10 — Audit, queue dan seed](../microtask_be/10_AUDIT_QUEUE_SEED.md)                         | Audit/permission, job/scheduler, bootstrap dan seluruh skenario demo          |
| [11 — Inventaris sumber](../microtask_be/11_INVENTARIS_SUMBER.md)                            | Pemetaan seluruh bagian sumber bernomor                                       |
| [catalog.json](../microtask_be/catalog.json), [coverage.json](../microtask_be/coverage.json) | Katalog dokumentasi untuk pemeriksaan konsistensi; bukan konfigurasi aplikasi |

Setiap `BE-NNN.md` memuat tujuan, parent/sumber, prasyarat, kondisi saat ini, target file tersedia/rencana, kontrak, acceptance criteria, target uji, konsumen FE, infrastruktur, gap dan batas selesai.

Cakupan resmi mencakup Phase 0–12, T00–T81, T05A/B/C, T05-1–14, T18A–F, T19A–F dan DG-01/DG-02. Nomor BE adalah urutan dependensi; task bootstrap merekonsiliasi kode yang sudah tersedia, bukan memerintahkan pembuatan ulang.

## Temuan penting untuk implementasi berikutnya

- Laravel, konfigurasi dasar, harness dan CI sudah tersedia; backend bisnis masih skeleton. FE sampai kelompok FE-26–30 sudah berada dalam riwayat Git. Status tertulis FE perlu dibaca bersama kode aktual.
- Test komponen yang memakai mock Inertia belum membuktikan integrasi server. Matriks FE menetapkan pemilik kontrak dan gate browser nyata secara terpisah.
- Komponen penyusun Draft tersedia, tetapi halaman edit lengkap belum terpasang pada baseline. Komposisi halaman tetap terkait pemilik FE-27; binding server berada pada [BE-062](../microtask_be/BE-062.md).
- Draft dan Change Results memakai JSON menurut kontrak resmi; konsumen saat ini memakai `router.patch` Inertia. [BE-062](../microtask_be/BE-062.md) dan [BE-076](../microtask_be/BE-076.md) menangani transport, CSRF/session, input selama save, 422/409, versi server dan larangan replay otomatis.
- Guard database Pest tidak melindungi proses `artisan serve` Playwright. [BE-005](../microtask_be/BE-005.md) wajib menyediakan runtime browser dengan database/storage disposable sebelum journey yang melakukan mutation.
- Password sementara sekali tampil harus dibuktikan melalui server no-store/non-persistence dan browser refresh/back/history. Gunakan [BE-034](../microtask_be/BE-034.md) dan [BE-044](../microtask_be/BE-044.md); plaintext tidak disimpan di flash/session/log/history.
- Audit minimum, penguncian record, transaksi, rollback dan kenaikan versi diperlukan sejak mutation pertama. Jangan menundanya sampai fase pembacaan audit atau pengujian agregat.
- MySQL 8.4 Docker disebut tersedia pada baseline sebelumnya; status runtime tidak diperiksa ulang saat penyusunan ini. ClamAV belum diimplementasikan dan tetap wajib pada Phase 6. Workbook resmi belum ditemukan dalam inventaris; renderer/signing belum berkualifikasi.

## Keputusan yang masih terbuka

Register G01–G18 tetap berlaku; penyusunan dokumen tidak menutup keputusan produk secara diam-diam. Kelompok yang paling relevan saat melanjutkan:

| Waktu/konteks                   | Item yang harus ditutup oleh task pemiliknya                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Foundation, auth, admin, setup  | G01/G02/G07/G09/G12/G14: route/projection, kode validasi, payload, completion/resume setup dan semantik permission assign Team |
| Sebelum browser mutation        | G08: guard target database, environment dan storage disposable                                                                 |
| Draft                           | G03: kontrak koreksi header; gate keputusan terpisah dari implementasinya                                                      |
| Login/upload/validator          | G05: angka rate limit berbasis bukti pada fase terkait                                                                         |
| Attachment                      | G06/G15: definisi byte 20 MB, timeout ClamAV dan budget worker/retry                                                           |
| XLSX/bulk                       | G04/G10: kontrak bulk, workbook resmi, version/hash dan mapping cell/control                                                   |
| PDF/signing                     | G16/G17: qualification LibreOffice dan mekanisme/dependency signer                                                             |
| Scheduler                       | G18: pembeda workspace aktif dan terbengkalai untuk cleanup aman                                                               |
| Tetap tidak memblokir fase awal | G11 notifikasi deferred; G13 Team produksi operator-controlled dan SOP nomor resmi                                             |

Setiap gap hanya menghalangi pekerjaan yang bergantung padanya. Detail otoritas pengambil keputusan dan evidence penutupan ada di register; jangan menjadikan seluruh gap sebagai alasan menghentikan rekonsiliasi awal.

## Bukti verifikasi dan batas klaim

Pemeriksa Python yang tertanam dalam dokumen 07 dijalankan ulang **sebelum penambahan handoff ini**, dengan exit 0:

| Pemeriksaan          | Hasil                                                          |
| -------------------- | -------------------------------------------------------------- |
| Total pemeriksaan    | 1.048, PASS, tanpa error                                       |
| Task dan unit resmi  | 149 task, 113 unit resmi, 13 phase; dependensi tidak bersiklus |
| Pemetaan sumber      | 1.731 bagian, 56 item MVP, 31 FR/NFR                           |
| Kontrak/konsumen     | 66 method/path, 179 nama baris ERD, 57 ID FE, 20 skenario demo |
| Tautan lokal backlog | 8.663, tidak ada target/anchor putus                           |
| Acceptance criteria  | Cocok antara 149 dokumen task dan `catalog.json`               |

Prettier seluruh Markdown/JSON backlog dan `git diff --check` telah lulus pada penutupan pekerjaan backlog. Bukti rinci tersimpan di dokumen 07. Tidak ada test aplikasi, MySQL integration, Chromium journey, scanner, renderer, signing, CI atau staging yang dijalankan untuk pekerjaan dokumentasi ini. Human implementation/security review tetap belum dilakukan.

**Catatan reproduksi:** dua assertion scope Git dalam pemeriksa dokumen 07 sengaja mengunci keadaan saat backlog dibuat: hanya `microtask_be/` berubah dan tidak ada tracked/staged diff. Setelah handoff ditambahkan, assertion tersebut akan menolak perubahan `handoff/` yang kini sudah diizinkan pengguna. Untuk sesi ini, periksa diff handoff secara terpisah; bila menyesuaikan pemeriksa untuk scope baru, sebutkan allowlist `handoff/` secara eksplisit dan tetap larang perubahan aplikasi/authority. Jangan melaporkan hasil historis sebagai run pada working tree baru.

## Langkah berikutnya

1. Baca [AGENTS.md](../AGENTS.md), [SOUL.md](../SOUL.md), authority 15/16/18/19/19A/20 dan sumber yang ditunjuk task. `project_doc` tetap otoritas; backlog dan handoff adalah turunannya.
2. Periksa branch, HEAD, file lokal yang belum dikomit dan instruksi pengguna terbaru. Jangan membuang atau menganggap backlog sudah tersimpan di Git/remote.
3. Bila pengguna memberi instruksi implementasi, mulai dari [BE-001](../microtask_be/BE-001.md), lalu rekonsiliasi BE-002–004. Gunakan bukti yang sudah ada sebagai masukan; jangan mengulang bootstrap atau mengarang kronologi RED/GREEN.
4. Tutup BE-005 sebelum browser mutation. Ikuti dependensi task selanjutnya; selesaikan keputusan yang benar-benar diperlukan pada fasenya.
5. Untuk perilaku baru: requirement → test → meaningful RED → commit test RED → implementasi minimum → GREEN → commit implementasi → regression. Simpan evidence per task; jalankan gate yang berlaku dan minta review manusia sesuai DoD sebelum merge.

Runtime tetap local-native dengan session/cache/queue database. Schema yang sudah masuk shared history immutable; gunakan forward migration. ClamAV Phase 6, qualification renderer dan real signing Phase 8 tetap wajib saat kapabilitasnya dibuat. Redis, automated CD, HA/DR/SLA infrastruktur, public CA/Adobe trust dan deployment multi-server tidak ditambahkan. Permintaan handoff ini tidak menginstruksikan coding, migration, instalasi infrastruktur, commit, push atau deployment.
