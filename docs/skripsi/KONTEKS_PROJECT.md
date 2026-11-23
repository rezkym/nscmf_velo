# Konteks Project Alya / NSCMF

Dokumen pengantar untuk membahas aplikasi NSCMF dan penulisan skripsi berdasarkan sumber proyek yang dapat diperiksa. Baca dokumen ini lebih dahulu, lalu buka sumber sesuai topik; jangan menganggap seluruh repository sudah terbaca.

## 1. Identitas dan versi sumber

- Nama produk: **NSCMF Digital Form & Workflow System**, disebut Project Alya dalam repository.
- Repository: `rezkym/nscmf_velo` — <https://github.com/rezkym/nscmf_velo>.
- Branch acuan: **`staging`**. Pastikan branch dan commit sumber sebelum menyimpulkan keadaan implementasi; jangan otomatis memakai `main`.
- Tanggal pemeriksaan dokumentasi: **22 Oktober 2026**.
- Baseline source code yang diaudit: `572be4f8bfa6f3bef0c63473b56c7ddee843307d`. PRD disinkronkan setelah baseline tersebut tanpa mengubah kode aplikasi.
- Commit repository yang memuat PRD tersinkron: [`f418b7014331b0bdaeec5e0c89bfe4629dbdf3e2`](https://github.com/rezkym/nscmf_velo/tree/f418b7014331b0bdaeec5e0c89bfe4629dbdf3e2), sudah dipush ke `staging`.
- Dokumen ini beserta bahan skripsi lainnya berada di `docs/skripsi/`. Sumber diagram berada di `diagram/` dan hasil ekspor PNG berada di `gambar/`.

Jika versi atau isi file tidak dapat diakses, nyatakan batas aksesnya dan minta file yang diperlukan. Tautan repository atau nama dokumen saja bukan bukti isinya sudah dibaca. Catat commit yang benar-benar diperiksa; handoff bertanggal dapat merujuk commit yang lebih lama.

## 2. Proyek ini tentang apa

NSCMF adalah aplikasi web internal untuk satu organisasi. Aplikasi mendigitalisasi formulir dan proses permintaan yang sebelumnya berbasis workbook **NSCMF Form 3.0**, sehingga data, status, revisi, keputusan, dan penelusuran record berada dalam satu sistem.

Dua kelompok formulir tersedia:

- **Activation**: Activation, Upgrade/Downgrade, dan Deactivation.
- **Change**: Maintenance, Upgrade, dan Emergency.

Alur utamanya adalah pembuatan Draft, Submit, Review, Approval, lalu penelusuran dan export. Alur juga mendukung revisi/resubmit, Reject, Cancel Draft, Reopen dengan iterasi baru, serta Archive/Unarchive. Archive merupakan penanda terpisah, bukan status bisnis baru.

Tujuh status bisnis canonical:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Pengguna dapat mempunyai beberapa role. Role bawaan mencakup Superadmin, Requester, Reviewer, dan Approver; otorisasi mengikuti permission efektif, state, ownership yang disyaratkan, dan aturan resource. **Team adalah metadata organisasi, bukan batas Review/Approval.** DRAFT/CANCELLED pengguna lain tidak terlihat oleh Superadmin. Tidak ada universal Superadmin bypass.

Fitur pendukung yang tersedia dalam source meliputi:

- Dashboard, **Create NSCMF**, **My Applications**, **Review**, **Approval**, **History**, dan **Activity Log**, dengan navigasi sesuai permission.
- Administrasi Users/Roles/Teams/Setup, Access Audit, Security Audit, serta pengaturan cleanup Technical Logs yang dilindungi.
- Attachment opsional melalui resumable upload; file baru boleh digunakan setelah whole-file scan menghasilkan CLEAN.
- Export form XLSX/PDF dari snapshot, bulk form export dengan ZIP, serta export rekap Activity Log dan panel progres/unduhannya.
- Signing System/Organization untuk PDF form APPROVED. PDF Activity Log unsigned dan berbeda dari Approved PDF individual.
- Verifikasi publik issued PDF melalui `/ispdfvalid`; kemampuan internal lainnya tetap berada dalam konteks ingress internal.

Ini bukan portal pelanggan, sistem multi-tenant, provisioning otomatis, atau workflow builder umum. Klaim manfaat seperti penghematan waktu dan peningkatan efektivitas merupakan hal yang perlu dibuktikan melalui evaluasi penelitian.

## 3. Mulai membaca dari sini

1. Baca [PRD](../../project_doc/01_PRD.md) untuk tujuan produk, masalah, scope, batasan, dan ringkasan implementasi saat sinkronisasi.
2. Baca [User Flow](../../project_doc/03_User_Flow.md), [RBAC](../../project_doc/04_RBAC_Permission_Matrix.md), dan [State / Status Flow](../../project_doc/05_State_Status_Flow.md) jika pembahasan menyangkut pengguna, akses, atau perjalanan record.
3. Cocokkan perilaku yang dibahas dengan [routes/web.php](../../routes/web.php), halaman terkait di [resources/js/Pages/](../../resources/js/Pages/), dan Service/Domain yang menjalankannya. Untuk detail frontend, periksa juga [resources/js/features/](../../resources/js/features/).
4. Buka dokumen dan test tambahan pada tabel di bawah hanya jika relevan dengan pertanyaan. Baca isi dan kondisi test; keberadaan test bukan bukti test sudah dijalankan atau lulus.

PRD cukup sebagai pintu masuk pembahasan umum. Pernyataan tentang fitur aktual, label UI, izin, validasi, dan hasil export memerlukan sumber implementasi yang sesuai.

## 4. Peta sumber menurut topik

Tautan di bawah merujuk pada sumber dari repository yang sama.

| Topik | Sumber yang perlu dibuka |
|---|---|
| Masalah, tujuan, scope, dan kebutuhan produk | [01 PRD](../../project_doc/01_PRD.md), [02 Business Rules](../../project_doc/02_Business_Rules.md) |
| Perjalanan pengguna, status, dan revisi | [03 User Flow](../../project_doc/03_User_Flow.md), [05 State](../../project_doc/05_State_Status_Flow.md), [NscmfWorkflowService](../../app/Services/Nscmf/NscmfWorkflowService.php), [NscmfLifecycleService](../../app/Services/Nscmf/NscmfLifecycleService.php) |
| Role, permission, Team, dan visibilitas | [04 RBAC](../../project_doc/04_RBAC_Permission_Matrix.md), [PermissionCatalog](../../app/Domain/Administration/PermissionCatalog.php), [RecordAccess](../../app/Domain/Nscmf/RecordAccess.php), serta Service aksi terkait |
| Form, validasi, autosave, dan label UI | [06 Validation](../../project_doc/06_Validation_Rules.md), [07 UI/UX](../../project_doc/07_UI_UX_Specification.md), [Pages/Nscmf](../../resources/js/Pages/Nscmf/), [features/nscmf](../../resources/js/features/nscmf/), [Domain/Nscmf](../../app/Domain/Nscmf/), [Http/Requests](../../app/Http/Requests/) |
| Dashboard, My Applications, History, dan queue | [NscmfQueryService](../../app/Services/Nscmf/NscmfQueryService.php), [Pages](../../resources/js/Pages/), [AppLayout](../../resources/js/layouts/AppLayout.vue), dan repository query terkait |
| Activity Log dan export panel | [ActivityLogReportService](../../app/Services/Reports/ActivityLogReportService.php), [ActivityLogExportGenerationService](../../app/Services/Reports/ActivityLogExportGenerationService.php), [ActivityLog.vue](../../resources/js/Pages/Reports/ActivityLog.vue), [features/reports](../../resources/js/features/reports/), [handoff 2026-10-12](../../handoff/2026-10-12-activity-log-report.md) |
| Teknologi dan arsitektur | [08 Tech Stack](../../project_doc/08_Tech_Stack_Specification.md), [09 Architecture](../../project_doc/09_System_Architecture.md), [12A Repository-Service](../../project_doc/12A_Repository_Service_Architecture_Synchronization.md), [composer.json](../../composer.json), [package.json](../../package.json), [app/Providers](../../app/Providers/) |
| Data dan API | [11 ERD](../../project_doc/11_ERD_Database_Schema.md), [database/migrations](../../database/migrations/), [12 API Contract](../../project_doc/12_API_Contract.md), [routes/web.php](../../routes/web.php) |
| Login, session, re-auth, dan keamanan | [10 Security](../../project_doc/10_Security_Rules.md), [Services/Security](../../app/Services/Security/), [config/security.php](../../config/security.php), dan middleware terkait |
| Attachment dan ClamAV | [11A Upload](../../project_doc/11A_Resumable_Attachment_Upload_Synchronization.md), [Services/Attachment](../../app/Services/Attachment/), [Infrastructure/Malware](../../app/Infrastructure/Malware/) |
| Template, export, signing, dan validator | [Services/Export](../../app/Services/Export/), [Infrastructure/Workbook](../../app/Infrastructure/Workbook/), [Infrastructure/Pdf](../../app/Infrastructure/Pdf/), [config/nscmf.php](../../config/nscmf.php), [Public/PdfValidator.vue](../../resources/js/Pages/Public/PdfValidator.vue) |
| Audit dan retensi | [Services/Audit](../../app/Services/Audit/), [CleanupService](../../app/Services/Maintenance/CleanupService.php), [SystemSettingsService](../../app/Services/Settings/SystemSettingsService.php) |
| Pengujian dan batas klaim selesai | [16 Testing](../../project_doc/16_Testing_Specification.md), [18 DoD](../../project_doc/18_Definition_of_Done.md), [tests](../../tests/), test frontend yang berdampingan dengan source, serta handoff sesuai tanggal/commit |
| Seed/bootstrap/demo | [17 Seed Specification](../../project_doc/17_Seed_Dummy_Data_Specification.md), [database/seeders](../../database/seeders/), [ProtectedSuperadminBootstrapService](../../app/Services/Administration/ProtectedSuperadminBootstrapService.php) |
| Urutan implementasi dan keputusan turunan | [19 Implementation Plan](../../project_doc/19_Task_Implementation_Plan.md), microtask_be (sumber lokal: `microtask_be/`), terutama register keputusan (sumber lokal: `microtask_be/06_GAP_DAN_KEPUTUSAN.md`) |
| Runtime dan deployment bila relevan | [14 Environment](../../project_doc/14_Environment_Specification.md), [19A Local-first](../../project_doc/19A_Local_First_MVP_Synchronization.md), [20 Deployment](../../project_doc/20_Deployment_Architecture.md), konfigurasi source terkait |
| Arah desain UI | [07 UI/UX](../../project_doc/07_UI_UX_Specification.md), [design.md](../../design.md), [design/plan.md](../../design/plan.md), dan UI yang sudah diimplementasikan |

[AGENTS.md](../../AGENTS.md), [SOUL.md](../../SOUL.md), dan [CLAUDE.md](../../CLAUDE.md) memuat aturan kerja repository. Bagian handoff lama yang menyebut Phase 0/T00 bukan bukti aplikasi saat ini belum diimplementasikan. Rencana, checklist microtask, dan handoff perlu dicocokkan dengan commit dan kode yang dibaca.

Rujukan microtask menggunakan path sumber lokal. Minta file yang diperlukan secara terpisah. Workbook resmi, contoh berisi data asli, material signing privat, dan font berlisensi juga memerlukan akses terpisah.

## 5. Cara menggunakan diagram

- [Alur proses NSCMF saat ini](diagram/Gambar_3.1_Alur_Proses_NSCMF_Saat_Ini.drawio)
- [Flowchart NSCMF](diagram/NSCMF_Flowchart.drawio)
- [Alur fitur dan sequence NSCMF](diagram/NSCMF_Alur_Fitur_dan_Sequence.drawio)
- [Ekspor gambar PNG](gambar/)

Gunakan diagram sebagai penjelas alur dan interaksi. Sebut halaman diagram yang benar-benar diperiksa. Untuk klaim keadaan implementasi, cocokkan dengan routes, Service/Domain, dan UI terkait; diagram tidak otomatis membuktikan fitur sudah berjalan. Bila diagram, PRD, dan kode berbeda, jelaskan perbedaannya beserta sumber, tanpa menyamakan semuanya secara paksa.

## 6. Batas pembahasan skripsi dan sikap analisis

Judul skripsi final, rumusan masalah akademik, metode penelitian, populasi/responden, instrumen, data evaluasi, dan hasil penelitian belum ditetapkan oleh file pengantar ini. Minta informasi dari pemilik bila dibutuhkan. Jangan mengarang hasil penelitian, referensi ilmiah, angka peningkatan, wawancara, atau pengujian yang tidak ada buktinya. TDD adalah aturan pengembangan proyek; itu tidak otomatis menjadi metode penelitian skripsi.

Saat membantu analisis atau penulisan:

- Jawab dalam bahasa Indonesia yang ringkas; pertahankan label UI bahasa Inggris sesuai source.
- Nilai gagasan secara kritis berdasarkan bukti, termasuk kelemahan, asumsi, dan alternatif yang relevan. Jangan otomatis menyetujui pendapat pemilik.
- Bedakan **kebutuhan/spesifikasi**, **implementasi yang ditemukan**, **hasil pengujian yang tercatat**, dan **usulan yang belum diterapkan**.
- Sertakan path dan simbol/fungsi atau bagian dokumen yang mendukung klaim teknis. Nyatakan jika kesimpulan merupakan inferensi.
- Periksa konteks dan cakupan bukti: test yang memakai fake/stand-in tidak membuktikan integrasi nyata; hasil lokal historis tidak otomatis membuktikan production readiness atau CI terbaru.
- Jika sumber kurang, jelaskan apa yang belum diketahui dan minta informasi yang spesifik. Jangan menebak pola aplikasi.
- Perubahan repository hanya dilakukan bila diminta. Pembahasan atau penulisan skripsi tidak otomatis mengizinkan perubahan PRD/source, layanan, atau database.

Jangan meminta atau menyalin `.env`, password, private signing key, material sertifikat privat, atau data asli organisasi untuk melengkapi konteks. Contoh dan screenshot menggunakan data demo yang aman.
