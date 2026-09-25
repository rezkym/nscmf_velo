# Evidence record DoD (18 §45) — branch `feat/be-fe-01-30-integration`

Rancangan deskripsi PR. Semua commit masih lokal: belum ada push, PR, atau merge. Bukti ini hanya memuat yang benar-benar dijalankan; tidak ada rahasia atau material signing di dalamnya.

## Ringkasan

| Butir 18 §45 | Isi |
| --- | --- |
| Spesifikasi | `project_doc` 01–20 + 19A; microtask BE-001–149 dan FE-01–57. Keputusan pemilik yang tercatat: G04, G05, G10, G15, G16, G20. |
| Ruang lingkup | Backend dan frontend NSCMF lengkap. Sesi 2026-09-24 menambah: ZIP batch (G04), nilai rate limit (G05), timeout terukur (G15), konteks snapshot ekspor (FE-44 AC3), dan enam perbaikan bug (lihat `2026-09-24-decisions-and-verification.md`). |
| TDD RED → GREEN | Setiap perilaku baru dan setiap bug punya commit `test(...)` dengan RED bermakna sebelum commit `feat`/`fix`. Contoh sesi ini: `fe1e370`→`aba4c0b` (G15), `3bd3f2e`→`73e512f` (G04 BE), `8e4aaa0`→`fb46c26` (G04 FE), `7c93742`→`7f9c82f` dan `57793fc`→`fe14343` (FE-44), `7c7c839`→`f963460` (ekspor macet di PROCESSING). Test yang ditulis setelah perilakunya sudah ada diberi label "evidence" di pesan commit dan tidak diklaim sebagai TDD. |
| Regresi | Suite penuh lulus, lihat tabel gate. |
| Coverage | PHP 94,9% lokal (474/474, dengan workbook resmi) dan 93,7% dari checkout bersih ala CI. FE 97,29%. |
| Integrasi nyata | Semua dijalankan lokal dan asli: MySQL 8.4, clamd 1.4, LibreOffice 26.8 dengan font asli template, signing ddn/sapp + OpenSSL, dan Chromium lewat server, queue, dan signer asli. Di CI, render memakai renderer pengganti; signing dan verifikasi tetap asli. |
| Arsitektur / statis / tipe / format | Pint, PHPStan max (tanpa baseline), vue-tsc strict, ESLint, dan Prettier semuanya lulus. |
| Migrasi / dependensi | Tidak ada migrasi baru. Tidak ada dependensi Composer atau npm baru; `ZipArchive` (ext-zip) sudah dipakai sebelumnya dan sudah ada di CI. |
| Security review | **Wajib, belum dilakukan manusia.** Area sensitif: auth/sesi/re-auth, izin, Protected Superadmin, lampiran/ClamAV, signing/validator publik, setting terproteksi, dan audit. Review agen (bukan pengganti review manusia) ada di bawah. |
| Validasi fungsional manual | Disarankan untuk fidelity PDF: bandingkan secara visual PDF dari data demo dengan template. Langkahnya ada di README. |
| Dokumentasi | `project_doc` 12/14/17/19, register gap BE/FE, microtask, README, dan handoff sudah disinkronkan. |
| Keterbatasan / TBD | Kustodi kunci signing produksi (sengaja belum disentuh). Pengukuran ulang G15 di server rilis. Satu flake PDF yang teramati sekali. Objek storage yatim bila worker mati di tengah jalan. |

## Gate: dijalankan persis seperti `.github/workflows/ci.yml`, dari checkout bersih HEAD

Checkout dibuat di folder sementara, tanpa file untracked dan tanpa workbook privat. `.env` diambil dari `.env.example`, dan `composer install` serta `npm ci` dijalankan dari nol. Keterbatasannya: ini jalan di macOS, bukan runner Ubuntu GitHub, dan memakai MySQL/clamd lokal, bukan service container.

| Job CI | Langkah | Hasil |
| --- | --- | --- |
| backend | Pint, PHPStan, Pest `--coverage --min=80` | **PASS**: 470 lulus, 4 di-skip (butuh workbook resmi + LibreOffice), coverage 93,7% |
| frontend | ESLint, Prettier, vue-tsc, Vitest + coverage, build | **PASS**: 686 test, coverage baris 97,29% |
| browser | `test:browser-runtime-config`, Playwright Chromium | **PASS**: 5/5 runtime-config; 23 lulus, 3 di-skip (butuh workbook resmi) |

Masalah yang **hanya ketahuan setelah CI dijalankan dengan cara ini**, dan sekarang sudah diperbaiki:

1. **Backend CI akan gagal karena coverage.** Tanpa workbook resmi, 21 test ekspor/PDF di-skip dan coverage turun ke 78,3%, di bawah batas 80%. Perbaikannya: workbook sintetis untuk test alur ekspor, dan renderer pengganti untuk test signing/validator. Assertion-nya tidak diubah, dan batas coverage tidak diturunkan maupun diberi pengecualian.
2. **`test:browser-runtime-config` gagal.** Ekspektasinya belum mengikuti signer runtime browser dari FE-55. Sudah diperbarui, dan ditambah satu kasus: kunci signing milik operator tidak pernah dipakai oleh runtime browser.

Gate lokal penuh (dengan workbook resmi, LibreOffice, dan ClamAV asli) lulus semua. Angkanya ada di `2026-09-24-decisions-and-verification.md` dan laporan sesi.

## Koreksi setelah record ini ditulis (audit E2E, 2026-09-24)

Record ini sempat menyatakan journey end-to-end sudah terbukti. **Klaim itu keliru.** Requester tidak bisa mencapai halaman edit dari UI, jadi tidak bisa merevisi record yang dikembalikan, melanjutkan Draft, atau mengisi Result. Celah ini lolos karena journey Chromium membuka `/nscmf/{id}/edit` secara langsung dan tidak pernah mengklik tombol.

Celah tersebut, beserta 12 temuan lain, sudah ditutup dan dibuktikan dengan journey yang hanya memakai klik. Rinciannya dan angka gate terbaru ada di `2026-09-24-e2e-gap-closure.md`. Semua angka gate di atas berasal dari sebelum koreksi ini.

## Periksa silang 18 §48 (Work is NOT done when…)

| # | Kondisi | Status |
| --- | --- | --- |
| 1–3 | Asumsi, TBD ditebak, kontradiksi dengan dokumen | Tidak ada. Keputusan G04/G05/G15 didelegasikan pemilik dan dicatat di dokumen. |
| 4–5, 7 | Gate gagal, tidak dijalankan, atau retry-as-pass | Semua gate dijalankan dan lulus; Playwright dengan retries 0. CI GitHub belum jalan karena belum ada push. |
| 6 | RED palsu atau riwayat ditulis ulang | Tidak ada. Test "evidence" diberi label jujur, dan riwayat tidak diubah. |
| 8–9 | Coverage di bawah batas atau dimanipulasi | ≥80% di kedua sisi, tanpa pengecualian baru. Uji mutasi membuktikan test bisa gagal (23 mutasi: 22 tertangkap, 1 mutan setara). |
| 10 | Tidak ada test negatif keamanan | Ada: izin, visibilitas, re-auth, sesi, throttle, CLEAN-only, dan fail-closed scanner. |
| 11, 13–15 | Hanya bukti palsu padahal integrasi nyata wajib | ClamAV, signing, dan renderer dibuktikan dengan yang asli secara lokal. Renderer pengganti hanya menambah cakupan CI dan tidak menggantikan bukti fidelity. |
| 16–20 | CLEAN, snapshot, PDF tanpa tanda tangan, OOXML | Dilindungi oleh test, dan mutasi M02, M07, M15, M16 tertangkap. |
| 21–29 | Arsitektur, Team, dependensi, migrasi, destruktif, rahasia, seed | Aman. Font berlisensi dan workbook resmi tidak ada di git. |
| 30 | Dokumentasi usang | Sudah disinkronkan. |
| **31** | **Human implementation review belum dilakukan** | **TERBUKA**: hanya bisa dilakukan manusia (18 §29) |
| **32** | **Human security review belum dilakukan** | **TERBUKA**: hanya bisa dilakukan manusia (18 §17) |
| 33 | Blocker tersembunyi di balik workaround manual | Tidak ada. Provisioning template dan sertifikat adalah langkah operator yang terdokumentasi di README. |
| 34–35 | Klaim production-ready | Tidak diklaim. |
| 36–37 | Kode debug atau churn | Tidak ada. `implementation.md` milik pengguna tetap untracked dan tidak disentuh. |
| 38–39 | Self-approve atau bukti palsu | Tidak ada. |

**Kesimpulan jujur:** semua syarat Feature Done yang bisa dipenuhi agen sudah terpenuhi dan dibuktikan. Status Feature Done baru sah setelah butir 31 dan 32 dilakukan oleh manusia.

## Review keamanan oleh agen (bukan pengganti 18 §17)

Cakupan: perubahan sesi ini.

- **ZIP batch:**
  - Hanya pemilik batch yang bisa mengambil (orang lain → 404) dan butuh `nscmf.export.bulk` + `nscmf.export`.
  - Visibilitas tiap record dicek ulang.
  - Nama entri disanitasi (`[^A-Za-z0-9._-]` → `-`, tanpa `/`), jadi tidak ada path traversal di dalam ZIP.
  - Nama file unduhan hanya berasal dari ID batch, jadi tidak ada injeksi header.
  - Workspace dihapus di `finally`, dan setiap file dicatat di audit akses.
- **Proyeksi snapshot:** hanya berisi versi, iterasi, dan label template. Isi snapshot dan kunci storage tidak ikut (dipastikan oleh `assertJsonMissingPath`).
- **ClamdScanner:** satu deadline untuk seluruh balasan. Semua balasan selain OK/FOUND gagal tertutup (dipastikan oleh M13).
- **Renderer:** timeout dipetakan ke `RenderFailed`, sehingga ekspor berakhir FAILED dan tidak ada PDF tanpa tanda tangan (dipastikan oleh M07).
- **Retry ekspor:** mengklaim ulang ekspor yang berstatus PROCESSING aman karena timeout job < `retry_after` (dijaga oleh test invariant). Artefak ganda tidak mungkin karena status READY tidak pernah diklaim ulang.
- **Runtime browser:** kunci signing milik operator tidak pernah dipakai (ada test barunya).
- **Temuan terbuka (risiko rendah):** objek ekspor bisa tertinggal di storage privat bila worker mati tepat sebelum transaksi READY. Tidak bisa diunduh, tapi juga belum ada pembersihannya.

## Yang harus dilakukan manusia

1. Review implementasi (18 §29).
2. Review keamanan area sensitif (18 §17).
3. Push dan pastikan CI GitHub hijau.
4. Opsional: bandingkan secara visual PDF hasil ekspor dengan template (18 §30).
