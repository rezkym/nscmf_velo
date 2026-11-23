# Audit Faktual Pengembangan Aplikasi NSCMF

Tanggal pemeriksaan: 17 November 2026. Snapshot Git: `f418b7014331b0bdaeec5e0c89bfe4629dbdf3e2` (commit terakhir 22 Oktober 2026).

Audit ini memeriksa file lokal, kode, konfigurasi, artefak pengujian yang sudah tersedia, dan riwayat Git. Tidak ada pengujian baru yang dijalankan, test case baru yang dibuat, kode yang diubah, database yang diakses, atau deployment yang dilakukan. Satu-satunya file yang ditambahkan adalah laporan ini, mengikuti permintaan eksplisit untuk menyimpan jawaban Markdown di root proyek. File pengguna yang sebelumnya belum dilacak Git tidak diubah.

**Batas bukti:** kode membuktikan keberadaan implementasi, bukan kelulusan tes; file tes membuktikan adanya pemeriksaan otomatis, bukan bahwa pemeriksaan itu berhasil dijalankan. Handoff adalah catatan pengembang, bukan rekaman eksekusi independen. Bukti lokal tidak membuktikan kondisi server maupun penggunaan produksi. Status “Terbukti” selalu terbatas pada objek yang disebut dalam temuan.

## A. Riwayat Pengembangan

### A1. Pengembangan berbasis spesifikasi dan pembagian tugas

**Temuan:** repositori memiliki spesifikasi produk, aturan bisnis, workflow, arsitektur, pengujian, dan deployment; pekerjaan dipecah menjadi microtask backend dan frontend. Kode aplikasi sudah tersedia, sehingga petunjuk handoff awal AGENTS.md yang menyebut langkah berikutnya bootstrap tidak mencerminkan seluruh kemajuan saat ini.

**Status:** Terbukti.

**Bukti:** `project_doc/01_PRD.md` sampai `project_doc/20_Deployment_Architecture.md`; `microtask_be/`, `microtask_fe/`, `app/`, `resources/js/`, `routes/web.php`. Commit awal `09ceafa` (21 Agustus 2026) menambahkan PRD; commit `f418b70` menyelaraskan PRD dengan implementasi terkini.

**Catatan:** spesifikasi dan daftar tugas tidak otomatis membuktikan seluruh tugas sudah selesai. Dokumen handoff lama harus dibaca bersama perubahan yang lebih baru.

### A2. Bukti Scrum formal

**Temuan:** pencarian pada Markdown proyek, handoff, dan dokumen tugas tidak menemukan bukti pelaksanaan Product Backlog Scrum formal, Sprint Planning, Sprint Backlog, Sprint Review, atau Sprint Retrospective. Daftar microtask dan rencana implementasi memang ada.

**Status:** Tidak ditemukan bukti.

**Bukti:** `project_doc/19_Task_Implementation_Plan.md`, `microtask_be/README.md`, `microtask_fe/README.md`, dan `handoff/`. Pencarian istilah Scrum dan kegiatan sprint tidak menghasilkan catatan seremoni tersebut.

**Catatan:** backlog pekerjaan tidak cukup untuk menyatakan metode Scrum telah dilaksanakan. Rapat atau alat eksternal yang tidak terhubung dalam pemeriksaan ini tidak dapat dipastikan.

### A3. Rekonstruksi urutan fitur dari riwayat

**Temuan:** riwayat Git dan handoff dapat digunakan untuk menyusun urutan berikut. Ini rekonstruksi pekerjaan, bukan sprint aktual.

**Status:** Terbukti untuk keberadaan riwayat; Terindikasi untuk rangkuman proses pengembangan.

**Bukti:**

| Periode pada bukti | Pekerjaan yang dapat direkonstruksi | Sumber |
| --- | --- | --- |
| Agustus 2026 | Penyusunan dan sinkronisasi spesifikasi | `09ceafa`, `b653fa4`, `5de7e7b` |
| September 2026 | Bootstrap, autentikasi, administrasi, Draft, Submit | `handoff/2026-09-16-phase-0-bootstrap.md`, `handoff/2026-09-23-backend-fe01-30.md` |
| 23 September 2026 | Review, Approval, lifecycle, lampiran, ekspor, signing | `016c3fd`, `c0e650d`, `a56840b`, `d499307`, `a6f80cc`; `handoff/2026-09-23-backend-completion.md` |
| 24 September 2026 | Integrasi frontend, ZIP, hardening dan perbaikan journey | `handoff/2026-09-24-dod-evidence.md`, `handoff/2026-09-24-e2e-gap-closure.md` |
| 30 September 2026 | Perubahan kewajiban isian dan penghapusan Result gate pada Forward | `92ff839` → `573ebc8` |
| 12 Oktober 2026 | Activity Log, ekspor laporan, dan revisi panel ekspor | `handoff/2026-10-12-activity-log-report.md`, `9344899` |

**Catatan:** tanggal commit merupakan metadata Git, bukan bukti durasi kerja, pembagian tim, atau jadwal sprint.

## B. Penerapan Test-Driven Development (TDD)

### B1. Framework, lokasi, dan lapisan pengujian

**Temuan:** proyek menggunakan Pest 4 dengan plugin Laravel untuk PHP; Vitest 4 dan Vue Test Utils untuk frontend; Playwright untuk browser Chromium. Konfigurasi memisahkan unit, feature, integration, concurrency, dan architecture test.

**Status:** Terbukti.

**Bukti:** `composer.json`, `package.json`, `phpunit.xml`, `tests/Pest.php`, `vitest.config.ts`, `playwright.config.ts`; `tests/Unit/`, `tests/Feature/`, `tests/Integration/`, `tests/Concurrency/`, `tests/Architecture/`, `tests/Browser/`. Ditemukan 68 file `*.test.*` di `resources/js/` pada pemeriksaan ini.

**Catatan:** dependensi dan konfigurasi membuktikan perangkat pengujian tersedia. Jumlah file bukan jumlah skenario yang lulus.

### B2. Bukti test sebelum implementasi

**Temuan:** terdapat urutan commit test sebelum implementasi yang mendukung praktik TDD pada perubahan tertentu, bukan sekadar keberadaan automated test.

**Status:** Terbukti untuk urutan perubahan Git; Terindikasi untuk eksekusi RED → GREEN historis.

**Bukti:**

| Test lebih dahulu | Implementasi berikutnya | Pemeriksaan |
| --- | --- | --- |
| `92ff839` | `573ebc8` | Perubahan validasi Submit dan penghapusan Result gate saat Forward (BE-152) |
| `b76af13` | `9344899` | Panel ekspor READY menampilkan unduhan tanpa progress bar |

Diff `b76af13` mengubah `resources/js/features/reports/ActivityLogExports.test.ts` agar progress bar pada baris READY tidak ada. Commit berikutnya mengubah `ActivityLogExportRow.vue` untuk perilaku tersebut. Handoff `2026-10-12-activity-log-report.md` mencatat pasangan RED/GREEN dan hasil gate.

**Catatan:** Git membuktikan urutan snapshot yang tercatat, bukan dengan sendirinya output proses tes saat RED. Commit GREEN kedua juga menyesuaikan assertion lama; karena itu pasangan commit tidak boleh diperlakukan sebagai bukti mutlak bahwa semua assertion sejak RED sudah benar. Audit ini tidak merekonstruksi eksekusi commit lama.

### B3. Batas klaim konsistensi TDD dan Refactor

**Temuan:** tidak semua tes dibuat melalui RED terlebih dahulu. Journey Activity Log `56664b3` secara eksplisit dicatat ditulis setelah fitur tanpa fase RED. Terdapat refaktor helper OOXML `23a2412` dalam catatan pekerjaan, tetapi kelulusan suite sebelum dan sesudah setiap refaktor tidak diverifikasi secara menyeluruh.

**Status:** Terbukti untuk adanya pengecualian yang dicatat; Belum dapat diverifikasi untuk TDD konsisten pada seluruh aplikasi.

**Bukti:** `handoff/2026-10-12-activity-log-report.md`, tabel T82F dan T82B; kewajiban TDD pada `project_doc/15_Coding_Rules_AGENTS.md` bagian 11–17 dan `project_doc/16_Testing_Specification.md` bagian 6–11.

**Catatan:** formulasi yang didukung bukti ialah “terdapat penerapan test-first pada sejumlah perubahan”; klaim “seluruh aplikasi dikembangkan dengan siklus Red–Green–Refactor yang terbukti” terlalu luas.

## C. Kondisi Pengujian Black Box

### C1. Cakupan fungsi dalam automated test

**Temuan:** kelompok fungsi yang diminta memiliki automated test. Sebagian menguji HTTP/UI sebagai masukan-keluaran; sebagian juga memeriksa database atau memakai fake sehingga tidak seluruhnya merupakan Black Box murni.

**Status:** Terbukti untuk keberadaan tes berikut; kelulusan snapshot sekarang belum diverifikasi ulang.

**Bukti:**

| Fungsi | Contoh bukti tes | Cakupan yang tampak |
| --- | --- | --- |
| Autentikasi | `tests/Feature/Auth/LoginTest.php`, `SessionPolicyTest.php`, `MandatoryPasswordChangeTest.php`, `ReauthenticationTest.php`; `tests/Browser/auth-admin.spec.ts` | Login, sesi, ganti password wajib, re-auth |
| Form Activation | `tests/Feature/Nscmf/ActivationDraftSaveTest.php`, `CreateRecordTest.php` | Pembuatan dan penyimpanan Draft |
| Form Change | `tests/Feature/Nscmf/ChangeDraftSaveTest.php`, `ChangeResultUpdateTest.php` | Draft dan pembaruan Result |
| Penomoran otomatis | `tests/Integration/Concurrency/NumberSequenceConcurrencyTest.php` | Penomoran dengan konkurensi database |
| Validasi | `tests/Feature/Nscmf/SubmitTest.php`, `DraftSaveGuardsTest.php` | Aturan Submit, format data, guard penyimpanan |
| Review dan Approval | `tests/Feature/Workflow/ReviewReturnTest.php`, `ReviewRejectTest.php`, `ApprovalActionsTest.php`, `WorkflowJourneyTest.php`; `tests/Concurrency/WorkflowConcurrencyTest.php` | Transisi, sign-off, penolakan dan konflik |
| Hak akses | `tests/Feature/Authorization/PermissionUnionTest.php`, `tests/Feature/Security/CrossCapabilityNegativeTest.php` | Gabungan izin dan akses negatif lintas kapabilitas |
| Lampiran | `tests/Feature/Attachment/AttachmentUploadTest.php`, `tests/Integration/Malware/ClamdScannerTest.php` | Upload, pemindaian, CLEAN/INFECTED dan fail-closed |
| Ekspor | `tests/Feature/Export/ExportTest.php`, `PdfSigningAndValidatorTest.php`; `tests/Browser/fe-bulk-export.spec.ts` | XLSX/PDF, signing, validator dan ZIP |
| Activity Log | `tests/Feature/Reports/ActivityLogExportTest.php`, `ActivityLogWorkbookTest.php`; `tests/Browser/activity-log.spec.ts` | Laporan, pemetaan workbook dan ekspor |

**Catatan:** contoh nama tes yang benar-benar ditemukan adalah `fails closed when the scanner endpoint is unreachable`, `never produces an unsigned Approved PDF: signing unavailable refuses or fails the export`, dan `lets only the first of two approvers win; the stale second action conflicts`. Ini nama skenario, bukan pernyataan hasil audit baru.

### C2. Hasil pengujian yang tercatat dan artefak lokal

**Temuan:** handoff 12 Oktober mencatat 552/552 Pest lulus, coverage PHP 95,3%, dan 39/39 Playwright Chromium lulus. Setelah revisi panel terakhir, tercatat 790/790 Vitest dan coverage 92,83%. Artefak LCOV frontend yang ada memuat 3.458 dari 3.725 baris tercakup, sesuai 92,83%.

**Status:** Terbukti untuk isi catatan dan keberadaan artefak; Terindikasi untuk hasil eksekusi historis yang dilaporkan.

**Bukti:** `handoff/2026-10-12-activity-log-report.md`; `coverage/frontend/lcov.info`; `test-results/.last-run.json` berisi `status: passed` dan daftar kegagalan kosong; `playwright-report/index.html`; PDF dan ZIP pada subdirektori `test-results/`.

**Catatan:** `.last-run.json` tidak mencantumkan jumlah tes atau SHA, sehingga tidak membuktikan sendiri 39 tes maupun kelulusan HEAD. Handoff juga mencatat satu run Vitest dengan empat kegagalan yang tidak sempat diidentifikasi, lalu dua run lulus. Kegagalan tersebut tetap bagian bukti, bukan dihapus dengan klaim retry-as-pass. Audit tidak menemukan bukti penyebabnya telah dituntaskan.

### C3. Integrasi nyata versus pengganti dan skip

**Temuan:** sebagian pengujian menggunakan fake scanner/storage/queue, workbook sintetis, atau renderer pengganti. Tes signing tetap memakai kriptografi nyata menurut konfigurasi tes; renderer asli digunakan saat workbook dan LibreOffice tersedia. Tes ClamAV nyata memeriksa keterjangkauan scanner dan dapat di-skip bila tidak tersedia.

**Status:** Terbukti.

**Bukti:** `tests/Feature/Export/PdfSigningAndValidatorTest.php` bagian `beforeEach`, `realRendererReady()` dan `StandInRenderer`; `tests/Integration/Malware/ClamdScannerTest.php`; `.github/workflows/ci.yml`.

**Catatan:** skip bukan PASS. Kehadiran adapter LibreOffice dan tes font tidak sendirinya membuktikan seluruh fidelity visual telah diterima pengguna.

### C4. Manual Black Box dan skenario tanpa bukti pelaksanaan

**Temuan:** terdapat catatan pemeriksaan screenshot desktop/HP dan instruksi uji manual revisi record. Namun tidak ditemukan paket hasil Black Box manual lengkap yang memuat ID kasus, input, expected/actual result, pelaksana, tanggal, dan keputusan untuk seluruh fungsi.

**Status:** Terindikasi untuk pemeriksaan manual terbatas; Tidak ditemukan bukti untuk pelaksanaan Black Box manual menyeluruh.

**Bukti:** `handoff/2026-10-12-activity-log-report.md` bagian revisi panel; `handoff/2026-09-24-e2e-gap-closure.md` bagian uji manual; `handoff/2026-09-23-backend-completion.md` menyebut checklist production-like staging belum dijalankan.

**Catatan:** langkah manual yang disarankan bukan bukti langkah itu sudah dijalankan. Tidak dapat menyebut suatu skenario “belum pernah diuji” secara absolut; yang dapat dinyatakan ialah belum ditemukan bukti pelaksanaannya, terutama pengujian pada server staging/produksi dan penerimaan visual menyeluruh template/PDF.

## D. Kondisi User Acceptance Testing (UAT)

### D1. UAT formal

**Temuan:** tidak ditemukan rekaman UAT formal, daftar responden, instrumen, formulir penilaian terisi, hasil evaluasi pengguna, atau berita acara penerimaan. Acceptance criteria teknis dan Definition of Done tersedia, tetapi merupakan ketentuan pengembangan.

**Status:** Belum dapat diverifikasi.

**Bukti:** pencarian istilah UAT, User Acceptance, dan responden pada Markdown proyek; `project_doc/18_Definition_of_Done.md`, dokumen microtask; `KONTEKS_PROJECT.md` menyatakan populasi/responden, instrumen, data evaluasi dan hasil penelitian belum ditetapkan oleh file tersebut.

**Catatan:** tidak ditemukannya bukti lokal tidak memastikan bahwa kegiatan eksternal tidak pernah terjadi. Audit tidak mengakses formulir atau arsip pengguna di luar sumber tersebut.

### D2. Masukan pemilik dan penggunaan nyata

**Temuan:** handoff mencatat keputusan pemilik G26, masukan UI panel ekspor, serta pernyataan pemilik telah me-review dan menyetujui pekerjaan Activity Log pada 12 Oktober. Ini mendukung adanya umpan balik pemilik, tetapi belum menjadi UAT formal atau bukti penggunaan operasional oleh staf PT Nettocyber Indonesia.

**Status:** Terindikasi untuk review pemilik; Belum dapat diverifikasi untuk UAT formal dan penggunaan operasional.

**Bukti:** `handoff/2026-10-12-activity-log-report.md`, bagian keputusan, review dan penggabungan, serta revisi panel.

**Catatan:** akun demo, data contoh, dan journey browser otomatis tidak dihitung sebagai responden manusia. Persetujuan fitur Activity Log tidak membuktikan penerimaan seluruh aplikasi.

## E. Workflow dan Hak Akses

### E1. Status dan transisi bisnis dalam kode

**Temuan:** enum mendefinisikan tujuh status bisnis. Transisi berikut benar-benar ditulis dalam service.

**Status:** Terbukti untuk implementasi.

**Bukti:** `app/Domain/Nscmf/Enums/NscmfStatus.php`, `app/Services/Nscmf/NscmfWorkflowService.php`, `app/Services/Nscmf/NscmfLifecycleService.php`.

| Aksi | Asal → tujuan | Aturan pada kode |
| --- | --- | --- |
| Pembuatan | Record baru → `DRAFT` | `NscmfCreationService.php` |
| First Submit | `DRAFT` → `PENDING_REVIEW` | Pemilik, izin Submit, validasi; menetapkan requester dan iterasi pertama |
| Resubmit | `REVISION_REQUIRED` → `PENDING_REVIEW` | Pemilik; mempertahankan requester dan iterasi |
| Reviewer Return | `PENDING_REVIEW` → `REVISION_REQUIRED` | Izin return; alasan melalui kontrak request |
| Reviewer Reject | `PENDING_REVIEW` → `REJECTED` | Menutup iterasi |
| Forward | `PENDING_REVIEW` → `PENDING_APPROVAL` | Menetapkan Reviewed By |
| Approve | `PENDING_APPROVAL` → `APPROVED` | Harus ada review efektif; menetapkan Approved By dan menutup iterasi |
| Return to Reviewer | `PENDING_APPROVAL` → `PENDING_REVIEW` | Menghapus Reviewed By/At efektif; audit sebelumnya tetap ada |
| Return to Requester | `PENDING_APPROVAL` → `REVISION_REQUIRED` | Menghapus review efektif; tetap pada iterasi yang sama |
| Approver Reject | `PENDING_APPROVAL` → `REJECTED` | Menutup iterasi; mempertahankan bukti reviewer |
| Cancel | `DRAFT` → `CANCELLED` | Hanya pemilik, belum pernah Submit; alasan opsional |
| Reopen | `APPROVED`/`REJECTED` → `REVISION_REQUIRED` atau `PENDING_REVIEW` | Izin Reopen, alasan; supersede iterasi lama dan membuat iterasi penerus |

**Catatan:** enum dan tes membedakan status bisnis dari status upload, scan, dan ekspor. Perubahan mutakhir `573ebc8` menghapus kewajiban Result sebelum Forward; `SubmissionRules.php` kini mewajibkan Request date dan tetap memvalidasi format nilai opsional yang diisi. Penjelasan handoff lama mengenai Result gate tidak berlaku untuk kode terkini.

### E2. Archive, Unarchive, dan pengamanan transisi

**Temuan:** Archive hanya untuk `APPROVED`, `REJECTED`, atau `CANCELLED`; mengubah flag dan metadata arsip tanpa mengganti status bisnis. Unarchive membersihkan metadata tersebut. Keduanya memakai izin `nscmf.archive`. Service memeriksa visibilitas, izin, flag arsip, versi record, dan mengunci row dalam transaksi sebelum mutasi serta audit.

**Status:** Terbukti untuk implementasi.

**Bukti:** `NscmfLifecycleService::archive()`, `unarchive()`, `lock()`; `NscmfWorkflowService::lockInState()`; `tests/Feature/Workflow/LifecycleActionsTest.php`, termasuk `archives and unarchives terminal records without touching the business status`.

**Catatan:** kode yang ada bukan jaminan bebas race pada setiap kemungkinan runtime; tes konkurensi tersedia tetapi tidak dijalankan ulang dalam audit.

### E3. Separation of Duties dan Team

**Temuan:** tidak ada larangan menyeluruh pada service workflow yang membandingkan aktor Review/Approval dengan requester untuk melarang pengajuan sendiri. Pemeriksaan menggunakan izin aksi, visibilitas, status, versi, dan arsip. Dengan izin yang sesuai, identitas requester sendiri bukan alasan penolakan. Team bukan dasar otorisasi Review/Approval.

**Status:** Terbukti untuk aturan pada jalur service yang diperiksa.

**Bukti:** `NscmfWorkflowService::lockInState()` dan `approve()`; `app/Domain/Nscmf/RecordAccess.php`; `app/Services/Security/PermissionGate.php`. `ReviewRejectTest.php` memiliki dataset `owner` yang diberikan izin reject; `ApprovalActionsTest.php` memiliki skenario approver lintas Team.

**Catatan:** tidak adanya mandatory Separation of Duties sesuai guardrail proyek, bukan otomatis bug. Hal ini tidak berarti semua pengguna dapat menyetujui semua record: izin dan state tetap wajib. Review efektif tetap disyaratkan, tetapi tidak wajib berasal dari orang berbeda dengan approver.

## F. Kondisi Aplikasi Saat Ini

### F1. Fitur yang sudah tersedia

**Temuan:** kode backend, halaman frontend, route dan tes menunjukkan implementasi autentikasi/sesi/re-auth; administrasi user/role/Team; Activation/Change Draft dan Submit; penomoran; Review/Approval dan lifecycle; Dashboard/My Applications/History/Timeline/audit; lampiran resumable dengan adapter ClamAV; ekspor XLSX/PDF, signing dan validator; bulk ZIP; settings/cleanup; serta Activity Log.

**Status:** Terbukti untuk ketersediaan implementasi; penyelesaian formal seluruh modul belum dapat diverifikasi.

**Bukti:** `app/Http/Controllers/`, `app/Services/`, `app/Infrastructure/`, `resources/js/Pages/`, `routes/web.php`, kelompok tes pada bagian C. Backend Laravel 13/PHP 8.5 dan frontend Vue 3/Inertia/Vite terlihat pada manifest dependensi.

**Catatan:** istilah “tersedia” lebih tepat daripada “selesai tanpa syarat”. Kelulusan pengujian saat ini, human review menyeluruh, dan penerimaan pengguna belum dibuktikan oleh audit ini.

### F2. Bagian parsial dan yang belum memiliki bukti tersedia

**Temuan:** kesiapan release masih terpisah dari implementasi lokal. Dokumen DoD September mencatat human implementation/security review masih terbuka; catatan Oktober hanya memberi bukti review pemilik untuk Activity Log. Tidak ditemukan bukti bahwa review seluruh area sensitif telah ditutup. Provisioning template pada lingkungan baru dan kustodi kunci signing produksi masih merupakan pekerjaan operator rilis.

**Status:** Terindikasi untuk pekerjaan release yang masih parsial; Belum dapat diverifikasi untuk penutupan review menyeluruh.

**Bukti:** `handoff/2026-09-24-dod-evidence.md`, `handoff/2026-09-23-backend-completion.md`, `handoff/2026-10-12-activity-log-report.md`, `README.md`.

**Catatan:** handoff backend menandai notifikasi (G11) deferred; bukti implementasi sistem notifikasi tersendiri tidak ditemukan dalam service/controller yang diperiksa. Team master produksi bukan data yang boleh diasumsikan atau di-seed otomatis. Infrastruktur HA/DR, SLA aplikasi, Redis, automated CD dan public-CA trust bukan kekurangan MVP karena memang di luar scope terkunci. Tidak ada dasar untuk menyebut seluruh modul inti belum dibuat hanya karena dokumen awal masih menyebut fase bootstrap.

### F3. CI, deployment, dan penggunaan produksi

**Temuan:** workflow CI backend/frontend/browser sudah ditulis. Handoff terbaru mencatat pekerjaan lokal, merge/fast-forward ke branch bernama `staging`, migrasi database lokal, serta pendaftaran template lokal. Tidak ditemukan bukti server staging/produksi aktif atau aplikasi telah digunakan pengguna operasional.

**Status:** Terbukti untuk konfigurasi CI dan catatan lokal; Belum dapat diverifikasi untuk hasil CI GitHub, deployment server dan penggunaan produksi.

**Bukti:** `.github/workflows/ci.yml`; `handoff/2026-10-12-activity-log-report.md` menyatakan push/PR/CI GitHub belum dilakukan; `handoff/2026-09-23-backend-completion.md` menyatakan checklist staging belum dijalankan.

**Catatan:** nama branch `staging` bukan bukti lingkungan staging. Workflow CI bukan bukti run CI sukses. Audit ini tidak mengakses dashboard CI atau server eksternal, sehingga catatan lama tidak diperlakukan sebagai kepastian keadaan remote hari ini. Kesimpulan yang didukung adalah aplikasi telah mencapai implementasi lokal yang luas dengan bukti tes historis, sementara status production-ready dan penggunaan produksi belum dapat dipastikan.

### Tabel ringkasan praktik

| Kategori | Praktik | Dasar dan batas klaim |
| --- | --- | --- |
| Terbukti telah dilakukan | Menulis spesifikasi, membagi microtask dan mencatat perubahan Git | `project_doc/`, `microtask_be/`, `microtask_fe/`, riwayat Git |
| Terbukti telah dilakukan | Menambahkan automated test PHP, frontend dan browser | File Pest/Vitest/Playwright tersedia; tidak otomatis semuanya lulus |
| Terbukti telah dilakukan | Membuat test sebelum implementasi pada sampel tertentu | `92ff839` → `573ebc8`, `b76af13` → `9344899`; output RED historis tidak diverifikasi independen |
| Terbukti telah dilakukan | Menghasilkan artefak coverage frontend lokal | LCOV 3.458/3.725 baris; artefak tidak mengikat hasil ke SHA HEAD |
| Terbukti telah dilakukan sebagai pencatatan | Mencatat hasil gate lokal dan masukan/review pemilik | Handoff September/Oktober; kekuatan bukti berbeda dari log eksekusi atau penerimaan formal |
| Baru sebatas instruksi/rencana untuk klaim menyeluruh | TDD wajib untuk semua perubahan, coverage ≥80%, review manusia dan keamanan | Aturan proyek ada; kepatuhan menyeluruh tidak dibuktikan oleh keberadaan aturan |
| Baru sebatas instruksi/rencana | CI pada setiap perubahan yang berlaku dan provisioning server rilis | Workflow dan panduan tersedia; hasil run remote/provisioning server tidak diakses |
| Belum memiliki bukti pelaksanaan yang ditemukan | Scrum formal dan seluruh seremoni sprint | Daftar tugas tidak membuktikan Scrum |
| Belum memiliki bukti pelaksanaan yang ditemukan | UAT formal beserta responden, instrumen dan hasil | Feedback pemilik tidak menggantikan UAT |
| Belum memiliki bukti pelaksanaan yang ditemukan | Black Box manual menyeluruh dengan hasil kasus terisi | Terdapat tes otomatis dan catatan manual terbatas |
| Belum memiliki bukti pelaksanaan yang ditemukan | Penggunaan produksi, penerimaan operasional dan review keamanan seluruh aplikasi | Kode, demo, build produksi dan nama branch tidak cukup |
