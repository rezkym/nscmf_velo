# G04/G05/G15, verifikasi menyeluruh, dan uji mutasi — 2026-09-24

Branch `feat/be-fe-01-30-integration`, lanjutan `127338b` (lihat `git log 127338b..HEAD`). Semua commit lokal: tidak ada push, PR, merge, CI GitHub, atau human review.

## Keputusan (didelegasikan pemilik proyek)

| Gap | Keputusan | Bukti |
| --- | --- | --- |
| G04 ekspor massal | Satu permintaan independen per record. `GET /nscmf/export-batches/{batch}/download` menghasilkan satu ZIP berisi file READY, belum kedaluwarsa, dan masih boleh diunduh peminta. Batch yang masih diproses → 409; tidak ada file tersisa → 410. Setiap file di ZIP diaudit. | `ExportTest.php` (2 test ZIP), `BulkExportPanel.test.ts`, `fe-bulk-export.spec.ts` (Chromium, isi ZIP diperiksa dengan `unzip`) |
| G05 rate limit | Nilai sementara ditetapkan sebagai nilai MVP: login 5 gagal/menit per username+IP; upload 120 dan finalize 20 per menit per user; validator 10/menit per IP. Satu record penuh (10 × 20 MB) memakai 60 dari 120 request. | `tests/Feature/Security/RateLimitBudgetTest.php` |
| G15 timeout | Diukur di mesin lokal: scan 20 MB ≤1,9 s, arsip padat 6,6 s, satu pass render ±1,7 s, signing ±0,01 s. Nilai: scan 30 s, render 30 s per pass (turun dari 60 s), job finalisasi 75 s, job ekspor 80 s, `retry_after` 90 s. | `tests/Integration/Operations/WorkerTimeBudgetTest.php` |
| Kunci signing produksi | **Tidak disentuh**, sesuai permintaan. Masih terbuka. | — |

Sinkron ke `project_doc` 12 §71/§113/§133, 14 §48/§63, 19 §27, register gap BE/FE, dan README.

## Bug nyata yang ditemukan dan diperbaiki (test-first)

1. **clamd yang mengirim byte terus-menerus tidak pernah dipotong.** Timeout hanya berlaku per pembacaan, bukan untuk seluruh balasan. Sekarang ada satu deadline untuk seluruh balasan.
2. **Renderer yang macet melempar `ProcessTimedOutException`**, di luar kontrak `RenderFailed`. Sekarang dipetakan ke `RenderFailed`, sehingga ekspor berakhir FAILED dengan kode yang aman.
3. **Budget ekspor PDF tidak cukup.** Dua pass render × 60 s = 120 s, lebih besar dari timeout job 80 s. Timeout render diturunkan ke 30 s per pass.
4. **Ekspor bisa macet di PROCESSING selamanya.** Kalau percobaan pertama job terputus, percobaan ulang menganggap pekerjaan sudah beres. Sekarang percobaan ulang melanjutkan ekspor itu.
5. **Tipe tidak valid di kode produksi.** `RecordActions.vue` mengirim payload bertipe `Record<string, unknown>`. Error ini, bersama error tipe di test dan journey browser, sebelumnya tidak terlihat karena `vue-tsc` berhenti pada file test lokal yang rusak.
6. **FE-44 AC3 belum terpenuhi.** Job ekspor sekarang menampilkan versi record, iterasi, dan template dari snapshot, lewat field aman baru `snapshot` di proyeksi ekspor.

`resources/js/components/ReauthenticationDialog.test.ts` dikembalikan ke versi commit. Perubahan lokalnya hanya satu nama test yang terpotong dengan "¬" sehingga string-nya putus; isi test tidak berubah.

## Test baru dari spesifikasi (bukan dari kode)

Test ini ditulis berdasarkan celah coverage dan hasil uji mutasi:

- Detail review `GET /review/{record}` (sebelumnya 0% coverage):
  - akses tidak bergantung Team
  - 403 tanpa izin
  - 404 untuk Draft orang lain
  - hanya audit akses, tanpa event bisnis
  - alasan forward belum siap
- Job yang kehabisan percobaan: ekspor dan upload berakhir FAILED tanpa membocorkan pesan internal.
- Command `nscmf:cleanup` dijalankan sungguhan, dan target yang tidak dikenal ditolak.
- Unduhan hanya untuk lampiran CLEAN, diuji langsung (sebelumnya hanya kebetulan terlindungi oleh kunci storage yang kosong).
- Balasan clamd selain OK/FOUND gagal tertutup.
- Snapshot ekspor yang hash-nya tidak cocok ditolak.

## Uji mutasi: bukti test tidak sekadar meniru kode

Setiap aturan kritis sengaja dirusak satu per satu, lalu seluruh suite dijalankan (`--bail`). Kode dikembalikan setelah tiap run (`git status` bersih).

| # | Aturan yang dirusak | Hasil |
| --- | --- | --- |
| M01 | Visibilitas record yang belum pernah Submit | tertangkap |
| M02 | Lampiran non-CLEAN bisa diunduh | **awalnya lolos** (run pertama "tertangkap" oleh flake, lihat di bawah); test ditambahkan → tertangkap |
| M03–M06 | Izin, state, versi basi, arsip pada aksi review/approval | tertangkap |
| M07 | PDF Approved tanpa tanda tangan saat signing gagal | tertangkap |
| M08 | Setting teknis terbuka untuk selain Protected Superadmin | tertangkap |
| M09 | Bukti re-auth tidak pernah kedaluwarsa | tertangkap |
| M10 | Batas sesi absolut 8 jam dimatikan | tertangkap |
| M11 | Throttle login dimatikan | tertangkap |
| M12 | PDF lama dilaporkan "current" | tertangkap |
| M13 | Balasan error clamd dianggap CLEAN | **awalnya lolos**; test ditambahkan → tertangkap |
| M14 | ZIP memuat record yang tidak terlihat | lolos: **mutan setara**. Record yang pernah di-Submit selalu terlihat (12 §17.1) dan record tidak pernah dihapus, jadi cabang itu hanya lapisan pertahanan tambahan. |
| M15 | Integritas snapshot ekspor diabaikan | **awalnya lolos**; test ditambahkan → tertangkap |
| M16 | Scanner gagal tetapi file tetap dipromosikan | tertangkap |
| F01 | Unduhan ditawarkan untuk lampiran non-CLEAN | tertangkap |
| F02 | Poll PROCESSING yang datang terlambat menimpa status akhir | **awalnya lolos**; test diperkuat → tertangkap |
| F03 | Semua izin dianggap dimiliki di UI | tertangkap |
| F04 | Dialog re-auth sukses tanpa jawaban 204 | tertangkap |
| F05 | History default menampilkan arsip | **awalnya lolos**; test diperkuat → tertangkap |
| F06 | Panjang minimum alasan tidak diperiksa | tertangkap |
| F07 | ZIP ditawarkan sebelum semua file selesai | **awalnya lolos** (test saya sendiri terlalu lemah); diperkuat → tertangkap |

**Flake yang diamati sekali:** test `signs an Approved PDF…` gagal satu kali saat run M02 berjalan bersamaan dengan Vitest. Empat run berikutnya lulus, termasuk run dengan dua Vitest sekaligus. Penyebabnya belum diketahui dan dicatat apa adanya.

## Hasil gate (lokal, macOS arm64)

| Gate | Hasil |
| --- | --- |
| Pint, PHPStan max | **PASS** |
| Pest + coverage | **PASS**: 474 test, coverage PHP 94,9% (naik dari 443 / 93,7%) |
| ESLint, Prettier, vue-tsc | **PASS**. Untuk pertama kalinya semua bersih, karena file test lokal yang rusak sudah diperbaiki. |
| Vitest + coverage | **PASS**: 686 test, coverage baris FE 97,29% |
| `npm run build` | **PASS** |
| Playwright Chromium, retries 0 | **PASS**: 26 test, server/queue/ClamAV/LibreOffice/signer asli |
| CI GitHub | **NOT RUN**: tidak ada push, sesuai instruksi |
| Human review / human security review | **NOT RUN**. Tidak bisa diklaim oleh agen (18 §17, §29). |

## Status DoD

- **Task/PR Done (Level 1):** semua gate otomatis lulus secara lokal. Syarat yang belum terpenuhi hanya human review, dan human security review untuk area sensitif: auth, izin, lampiran/ClamAV, signing/validator, setting terproteksi.
- **Feature/Module Done (Level 2):** secara teknis terpenuhi:
  - journey end-to-end
  - jalur negatif dan otorisasi
  - kontrak lintas lapisan
  - dokumentasi sinkron

  Tapi 18 §31 butir 1 dan 9 mensyaratkan butir-butir Level 1 di atas beserta security review manusia. Karena itu status yang jujur adalah **siap untuk human review, belum Feature Done**.
- **Level 3 (rilis):** tidak diklaim. Kustodi kunci signing produksi dan pengukuran ulang G15 di server rilis masih terbuka.

## Catatan untuk reviewer

- Commit `cbf2459` juga berisi `tests/Browser/fe-bulk-export.spec.ts` karena `git add tests`; pesannya tidak menyebut file itu. Riwayat tidak diubah.
- Dua commit sebelum `cbf2459` di-commit tanpa run PHPStan (exit code alat pembungkus tetap 0 walau gagal). Kesalahan tipe itu diperbaiki di `cbf2459`.
- `ExportService::package()` memakai `ZipArchive` langsung. Service lain juga melakukan I/O file langsung, jadi ini tidak melanggar gate arsitektur. Kalau dipindah ke adapter Infrastructure, perilakunya tetap.
- Objek storage bisa tertinggal (yatim) kalau worker mati tepat setelah menulis file ekspor tetapi sebelum transaksi READY. Tidak berbahaya karena tidak pernah bisa diunduh, tapi belum ada pembersihannya.
