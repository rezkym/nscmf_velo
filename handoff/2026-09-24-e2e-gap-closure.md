# Audit E2E dan penutupan celah FE/BE — 2026-09-24

Branch `feat/be-fe-01-30-integration`, lanjutan `a4edd68` (lihat `git log a4edd68..HEAD`). Semua commit masih lokal: belum ada push, PR, merge, CI GitHub, maupun human review.

## Pemicu

Pemilik melaporkan bahwa `alya` (requester) tidak bisa merevisi NSCMF-202609-00001 setelah dikembalikan, dan Superadmin juga tidak bisa mengubah statusnya. Karena itu seluruh spesifikasi diaudit ulang terhadap kode:
- 12 terhadap route dan service;
- 07 dan 03 terhadap halaman dan navigasi;
- 16 §74 terhadap journey Chromium.

## Temuan dan perbaikannya

| # | Temuan | Perbaikan | Commit (RED → GREEN) |
| --- | --- | --- | --- |
| 1 | **Halaman edit tidak bisa dicapai lewat UI.** FE tidak pernah membaca `edit_draft`/`edit_results`, dan semua link Dashboard/History menuju detail read-only. Requester jadi tidak bisa merevisi, melanjutkan Draft, atau mengisi Result (03 UF-DRAFT-003, UF-REVIEW-005; 07 §26, §60). | Halaman detail punya tombol Edit Draft, Revise and Resubmit, Update Result of Changes, Open Review, dan Open Approval (`RecordNextSteps.vue`). Kartu Dashboard membuka editor atau halaman keputusan. | `d775a67` → `b1b591f` |
| 2 | Reviewer/approver yang membuka record dari Dashboard mendarat di detail tanpa aksi. | Diperbaiki oleh #1: kartu Pending review/approval membuka `/review/{id}` / `/approval/{id}`, dan detail menampilkan Open Review/Approval. | sama |
| 3 | Alasan pengembalian tidak tampil di mode revisi (FE-28). | Alasan diambil dari Timeline: event transisi terakhir ke REVISION_REQUIRED. | `f9c169d` → `ae620d1`, lalu `55116ed` → `a525c5a` |
| 4 | Label "Return for Reviewer/Requester" tidak sesuai 07 §62. | Diganti "Return to Reviewer" / "Return to Requester". | `f9c169d` → `ae620d1` |
| 5 | Menu Technical Logs muncul untuk siapa pun yang punya `system.settings.manage`; 07 §51 membatasinya ke Protected Superadmin. | Shared props membawa `is_protected_superadmin` milik user sendiri (12 §100 disinkronkan), dan menu hanya muncul untuk identitas itu. | `f9c169d` → `ae620d1`, `226e32a` |
| 6 | Tombol Team di manajemen user tidak muncul untuk `teams.assign_users` (04 §265). | Tombol muncul untuk `users.assign_team` ATAU `teams.assign_users`. | sama |
| 7 | Halaman `/` tidak punya jalan ke login. | Ditambah link "Sign in". | sama |
| 8 | Ekspor READY hilang dari layar setelah halaman ditinggalkan (07 §39 "Re-download until 168h"). | **Keputusan pemilik:** endpoint baru `GET /nscmf/{record}/exports` (12 §69.1). Panel ekspor memuatnya saat dibuka dan melanjutkan polling. | `54f93c9` → `12fef61` |
| 9 | Target date yang diubah selama revisi tidak dicek saat Resubmit (06 §40). | Nilai yang pernah diterima dibaca dari Business Audit: nilai saat transisi terakhir ke revisi. Kalau diubah, nilai baru harus hari ini atau setelahnya. | `1a3a170` → `ef655d4` |
| 10 | "5 karakter bermakna" masih lolos untuk `"a   b"`. | **Keputusan pemilik:** 5 karakter non-whitespace, di BE (`MeaningfulReason`) dan di dialog FE. | `1a3a170` → `ef655d4`; `709cb60` → `6bf10ab` |
| 11 | Visibilitas 12 §17.1 tidak memeriksa izin baca. Custom role yang hanya punya `nscmf.archive`/`nscmf.reopen` bisa bertindak atas record yang tidak boleh dibacanya. | `RecordAccess::isVisibleTo` sekarang menerima actor dan mensyaratkan `nscmf.view`, `nscmf.view.history`, `nscmf.review`, atau `nscmf.approve` (pemilik selalu bisa). | `1a3a170` → `ef655d4` |
| 12 | Service Reopen menerima tujuan apa saja; hanya Form Request yang membatasi. | Guard dipasang di dalam service. | sama |
| 13 | **Bug tampilan (ditemukan oleh journey Chromium):** link Request No di kartu Dashboard lebarnya 0, jadi tidak terlihat dan tidak bisa diklik. | Request No ditaruh di barisnya sendiri. | `56c5be6` → `d5a5237` |

Catatan #3: fixture test pertama saya keliru mengasumsikan `to_status` null untuk save. Server ternyata mencatat save selama revisi sebagai `DRAFT_UPDATED` dari REVISION_REQUIRED ke REVISION_REQUIRED. Fixture diperbaiki (RED `55116ed`) lalu lookup-nya dibetulkan. Pencarian di BE (#9) memakai aturan yang sama.

## Diperiksa, tidak diubah (sudah sesuai spesifikasi)

- **Superadmin tidak bisa mengubah record REVISION_REQUIRED milik orang lain.** Di status ini satu-satunya transisi adalah Resubmit oleh pemilik (05 §9, §14, §30; 07 §60), dan tidak ada bypass Superadmin (04 §10). Sekarang halaman detail menjelaskan bahwa record menunggu requester.
- **Label tombol di mode revisi tetap "Submit for Review".** 07 §62 hanya mencantumkan label itu.
- **`results` di Draft save saat PENDING_REVIEW tetap `422`.** Checklist 12 menetapkannya secara eksplisit.
- **Arsip record CANCELLED milik orang lain:** sudah diputuskan di G20.

## Perubahan ekspektasi test lama (beralasan spesifikasi, bukan pelemahan)

- `Dashboard/Index.test.ts`: link draft ke `/nscmf/{id}` digantikan test baru yang lebih ketat (edit/review/approval per kartu).
- `TechnicalLogs.test.ts`: setup menu memakai identitas Protected Superadmin (07 §51). Kasus negatifnya tetap.
- `SharedPropsAndErrorsTest`: sekarang memastikan `is_protected_superadmin` dikirim dengan nilai benar, sesuai perubahan kontrak 12 §100.
- `ReviewReturnTest`/`ReviewRejectTest`: aktor tanpa Team diberi `nscmf.review`, dan Superadmin yang dicopot role-nya tetap diberi `nscmf.view`. Dengan begitu yang diuji tetap izin aksi yang hilang (403), bukan izin baca.
- `RecordProjectionTest`: member tanpa izin baca sekarang mendapat 404 (disembunyikan, 12 §17.1/§102), bukan 403.
- Test daftar ekspor: langkah kedaluwarsa memakai 168 jam + 1 detik, sama seperti test unduhan kedaluwarsa, karena MySQL membulatkan pecahan detik tepat di batasnya.

## Journey Chromium

Tidak ada lagi journey yang mengetik `/nscmf/{id}/edit`. Semua dicapai dengan klik: kartu Dashboard, detail record, antrean sidebar, History, link "Verify a PDF", dan menu Technical Logs.

Journey baru di `tests/Browser/revision-loop.spec.ts`:
- **Loop revisi penuh:** Return → revisi record yang sama (dengan lampiran yang di-scan clamd) → Resubmit → Result → Forward → Return to Requester → revisi → Resubmit → Forward → Approve. Request No tetap sama dan hanya ada satu iterasi. Superadmin non-pemilik hanya melihat keterangan "menunggu requester".
- **Cancel Draft** sampai dikonfirmasi.
- **Reject → Archive → Unarchive → Reopen for Revision** ke iterasi 2; requester menemukannya lagi di kartu Revision required beserta alasannya.

Tambahan di AC3 (ditandai *evidence*, karena ditulis setelah perilakunya sudah ada):
- PDF READY masih bisa diunduh ulang setelah halaman ditinggalkan.
- Setelah Reopen, PDF yang sama terverifikasi sebagai *superseded*.

## Uji mutasi aturan baru

14 mutasi, **14 tertangkap**: N1–N7 (FE) dan B1–B7 (BE). Aturan yang dirusak:
- link edit dan link Result;
- link kartu Dashboard;
- lookup alasan;
- gate Technical Logs;
- hitungan non-whitespace di FE dan BE;
- pemuatan daftar ekspor;
- cek target date;
- izin baca;
- guard Reopen;
- filter pemilik ekspor;
- filter transisi revisi;
- flag Protected Superadmin.

## Gate

| Gate | Hasil |
| --- | --- |
| Pint, PHPStan max | PASS |
| Pest + coverage (lokal, dengan workbook) | PASS: 497/497, 94,9% |
| Job backend CI dari worktree bersih (tanpa workbook) | PASS: 493 lulus, 4 di-skip (butuh workbook), 93,7% |
| ESLint, Prettier, vue-tsc | PASS |
| Vitest + coverage | PASS: 706 test, baris 97,3% |
| `npm run build` | PASS |
| `test:browser-runtime-config` | PASS: 5/5 |
| Playwright Chromium, retries 0 (server, queue, clamd, LibreOffice, dan signer asli) | PASS: 29/29 |
| Job frontend/browser CI dari checkout bersih | NOT RUN di sesi ini (sesi sebelumnya lulus; perubahan kali ini tidak butuh file privat) |
| CI GitHub, human review, human security review | NOT RUN |

## Keterbatasan

- Batch ZIP tetap hanya tersedia di sesi yang memulainya. File per record kini bisa diakses ulang lewat daftar ekspor.
- Perubahan visibilitas (#11) dan flag di shared props (#5) menyentuh area keamanan, jadi **wajib human security review** (18 §17).
- Folder `microtask_be` sempat tidak bisa diakses karena izin macOS di tengah sesi. Pekerjaan berhenti sampai akses pulih; tidak ada file yang berubah selama itu.

## Audit status — branch `feat/redesign` (2026-09-24, baca saja)

Audit ini hanya membaca dokumen dan kode. Tidak ada test, build, atau perubahan kode yang dijalankan.

### Status microtask
- Kode `feat/redesign` sama persis dengan `feat/be-fe-01-30-integration`. Bedanya hanya dua file rencana (`design.md`, `desaign/plan.md`). Jadi hasil gate di atas berlaku untuk kode ini, meski belum dijalankan ulang di branch ini.
- **BE:** 149/149 task berstatus IMPLEMENTED, DECIDED, RECONCILED, atau EVIDENCE RECORDED. Tidak ada yang masih PLANNED.
- **FE:** 57/57 task tercatat IMPLEMENTED. Pemeriksaan sampel cocok dengan kode: 21 halaman, ekspor massal, halaman audit, wizard setup.
- Belum ada yang boleh disebut Feature Done, karena human review dan human security review belum dilakukan (18 §17, §29).

### Perlu tindakan pemilik
1. Human implementation review (18 §29).
2. Human security review (18 §17): login/sesi, izin, visibilitas record, flag Protected Superadmin, lampiran/ClamAV, signing dan `/ispdfvalid`, setting terproteksi.
3. Push ke GitHub.
   - `origin/main` hanya berisi dokumen (2026-09-02).
   - `main` lokal lebih maju 304 commit dari `origin/main`; `feat/redesign` lebih maju 498 commit.
   - Kedua branch fitur belum punya remote.
   - Akibatnya CI GitHub belum pernah jalan, dan kode hanya ada di mesin lokal.
4. Uji manual: login `alya` → Dashboard → kartu Revision required → NSCMF-202609-00001 → Submit for Review. Jalankan `npm run build` dulu bila `npm run dev` tidak aktif.
5. Opsional: bandingkan PDF hasil ekspor dengan template secara visual (18 §30).

### Keputusan yang masih terbuka
| Hal | Status |
| --- | --- |
| Penyimpanan kunci signing produksi | Belum disentuh, sesuai instruksi pemilik. Wajib sebelum rilis. |
| G15: timeout scan/render | Harus diukur ulang di server rilis. |
| G13: data Team produksi dan SOP nomor request | Tugas operator; bukan penghalang development. |
| G11: notifikasi | Ditunda; bukan penghalang MVP. |
| G02 (bentuk data server) dan G18 (pembersihan folder kerja yang ditinggalkan) | Masih OPEN di register; belum ada keputusan resmi. |

### Redesign: belum dikerjakan
- `design.md` dan `desaign/plan.md` masih berupa rencana. Belum ada kode analytics, permission `nscmf.analytics.view`, maupun repository metrik.
- Sebelum coding, rencana itu perlu keputusan pemilik dan sinkronisasi `project_doc` 01, 04, 07, 12, dan 17.
- Permission baru di rencana itu butuh human security review.
- Nama folder `desaign/` salah ketik.
- `reference.webp` dirujuk oleh rencana tetapi belum masuk git. Pemilik perlu memutuskan apakah file itu di-commit.

### Risiko kecil yang sudah diketahui
- File ekspor bisa tertinggal di storage kalau worker mati sebelum transaksi READY. File itu tidak bisa diunduh, tapi belum ada pembersihnya.
- Test signing PDF pernah gagal satu kali, lalu lulus di run berikutnya. Penyebabnya belum diketahui.
- ZIP ekspor massal hanya bisa diakses di sesi yang memulainya. File per record bisa diunduh ulang.

### Dokumen yang tidak lagi sesuai kode (belum diperbaiki)
- `microtask_be/README.md`: BE-088, BE-103, BE-131, dan BE-139 masih menulis "UI/Chromium belum", padahal FE-nya sudah selesai.
- `microtask_fe/06_KONTRAK_DAN_GAP.md`: G01, G03, G07, G09, dan G10 belum ditandai tertutup, padahal di register BE sudah.
- G08 masih OPEN di kedua register, padahal pengaman runtime browser sudah ada (`playwright.config.ts`, `tests/Browser/support/runtime.ts`).
- `2026-09-24-frontend-completion.md` masih menyebut menu Technical Logs tampil untuk semua pemegang `system.settings.manage`. Setelah temuan #5, menu itu hanya tampil untuk Protected Superadmin.

### Belum pernah dijalankan
- CI GitHub.
- Job frontend/browser CI dari checkout bersih setelah perbaikan terakhir.
- Human review dan human security review.
- Pengukuran ulang G15 di server rilis.
- Validasi di lingkungan mirip produksi (belum ada server).
