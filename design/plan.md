# Rencana redesign UI NSCMF

> Status: rancangan untuk implementasi berikutnya; dokumen ini tidak mengubah otoritas `project_doc/` dan tidak menyatakan implementasi sudah selesai.
> Referensi visual: gambar pengguna `reference.webp` di root proyek.
> Cakupan yang dipilih pemilik: seluruh aplikasi, termasuk dashboard, halaman kerja, administrasi, autentikasi, dan validator publik.
> Keputusan tambahan: metrik baru diperbolehkan; permission analitik organisasi baru diberikan ke bundle Superadmin saja secara default; role kustom boleh memperolehnya lewat pengaturan role.

## 1. Hasil yang dituju dan batas desain

Bangun antarmuka operasional yang mengambil komposisi visual referensi: kanvas abu-abu terang, sidebar putih yang jelas, header ringkas, kartu putih dengan ukuran bervariasi, satu kartu beraksen kuat, tipografi mudah dipindai, dan ruang yang konsisten. Konten setiap panel harus menjawab pekerjaan NSCMF yang nyata. Tidak ada grafik, angka pertumbuhan, pengingat, notifikasi, pencarian global, avatar foto, promosi aplikasi, atau time tracker yang hanya berfungsi sebagai dekorasi.

`project_doc/07_UI_UX_Specification.md` tetap otoritas presentasi. Makna bisnis, izin, status, dan kontrak tetap mengikuti `01`–`20`; rencana ini menjadi masukan untuk sinkronisasi eksplisit sebelum perilaku baru diimplementasikan. UI aplikasi tidak meniru sel spreadsheet. XLSX/PDF resmi tetap tunduk pada template resmi dan tidak ikut didesain ulang. Semua copy produk tetap berbahasa Inggris.

Implementasi memakai Vue 3, TypeScript strict, Inertia 3, shadcn-vue, Tailwind CSS 4, dan ikon Lucide yang sudah ada. Tidak ada React/ReUI, pustaka grafik, font eksternal, dependensi npm/Composer, route publik, migrasi, atau skema baru dalam rancangan ini. ReUI boleh dipakai sebagai inspirasi visual saja.

## 2. Sistem visual yang akan diterapkan

| Elemen | Keputusan desain |
| --- | --- |
| Warna identitas | `brand-950 #091540`, `brand-700 #1B2CC1`, `brand-400 #7692FF`, `brand-200 #ABD2FA` dari `07` §7. |
| Kanvas dan permukaan | Kanvas terang `#F5F7FB`; kartu/sidebar/header putih `#FFFFFF`; garis halus `#E4E9F2`. Nilai netral adalah token presentasi baru, bukan warna status bisnis. |
| Teks | Judul navy `#091540`; teks isi gelap `#202939`; teks sekunder `#5B6575`. Ukuran minimum teks isi 14 px; keterangan 12 px hanya untuk metadata singkat yang tetap kontras. |
| Status | Hijau hanya success, amber untuk warning/revision, merah untuk error/destructive, biru untuk primary/info, abu-abu netral. Selalu sertakan label teks; Archived mempunyai badge terpisah. |
| Tipografi | Gunakan font sistem yang telah tersedia; judul halaman sekitar 28–32 px, judul kartu 16–18 px, angka utama 36–44 px, teks isi 14–16 px. Hindari font baru dan dekorasi huruf yang mengganggu pembacaan data. |
| Bentuk | Radius panel 18–22 px, tombol 10–12 px, input 10 px; garis dan bayangan tipis. Kartu unggulan memakai gradasi `brand-950` ke `brand-700` dengan teks putih yang lolos pemeriksaan kontras. |
| Ruang | Grid dasar 8 px; jarak panel 16–24 px; padding kartu 20–24 px; jarak antarbagian layar 24–32 px. |
| Fokus dan gerak | Fokus keyboard terlihat jelas; ikon tanpa teks punya nama aksesibel; animasi sederhana dan mengikuti `prefers-reduced-motion`. Tidak ada informasi yang hanya muncul saat hover. |

Tema terang adalah acuan desain. Pertahankan kompatibilitas token `.dark` yang sudah ada, tanpa menambah tombol dark mode sebagai fitur baru. Validasi kontras dilakukan pada kedua kumpulan token saat implementasi.

## 3. Shell, navigasi, dan aturan responsif

Desktop memakai sidebar sekitar 256 px, header sekitar 72 px, dan area konten yang dapat melebar sampai sekitar 1440 px. Jangan menyalin bingkai luar besar dari gambar, karena itu adalah presentasi mockup dan akan mengurangi ruang kerja pada laptop. Sidebar memuat identitas NSCMF, kelompok navigasi kerja, kelompok administrasi yang terlihat sesuai izin, penanda halaman aktif biru, serta identitas pengguna dan Sign out. Team boleh tampil sebagai metadata profil, tidak sebagai switcher atau petunjuk hak akses. Header menampilkan konteks halaman; pencarian hanya ditaruh pada halaman yang sudah memiliki pencarian nyata.

Pada tablet, sidebar menyempit atau menjadi panel; konten utama tetap menjaga tabel dan tindakan penting. Pada ponsel, sidebar menjadi panel yang dibuka tombol dengan `aria-expanded`, fokus masuk ke panel, Escape menutupnya, dan fokus kembali ke tombol. Konten bertumpuk, tanpa horizontal overflow pada viewport 320 px. Skip link, landmark `main`, judul halaman, urutan tab, dan tombol Sign out tetap berfungsi. Navigasi hanya mengikuti permission efektif dari server, bukan nama role atau Team. Halaman autentikasi dan `/ispdfvalid` memakai identitas visual yang sama tetapi tidak memakai shell terautentikasi; validator publik tidak menerima menu atau informasi internal.

Uji tiga lebar dasar: 320, 768, dan 1280 px. Pada lebar yang lebih besar, layar formulir boleh lebih sempit dari dashboard agar panjang baris teks tetap nyaman. Tabel lebar boleh mempunyai scroll horizontal di dalam wadah tabel, tetapi tidak menyebabkan seluruh halaman melebar.

## 4. Dashboard: susunan dan perilaku kartu

Bagian atas berisi judul Dashboard, keterangan singkat, `Create NSCMF` bila `nscmf.create` dan Team aktif, serta `History` bila `nscmf.view.history`. Jangan tampilkan tombol yang tidak mempunyai route atau tindakan sah. Empat kartu perhatian yang sudah ada tetap menjadi dasar:

1. **My Drafts** — record DRAFT milik pengguna; kartu aksen navy/biru sebagai jangkar visual.
2. **Revision Required** — record milik pengguna yang dikembalikan.
3. **Pending Review** — hanya bila permission `nscmf.review` efektif.
4. **Pending Approval** — hanya bila permission `nscmf.approve` efektif.

Kartu 1 dan 2 tetap tampil mengikuti baseline `07` §17 dan perilaku saat ini. Setiap kartu menampilkan label, angka server, keterangan singkat, maksimal beberapa tautan Request No yang ada, dan tautan View all hanya bila halaman daftar yang sesuai memang ada. Tautan Draft/Revision menuju editor bila aktor boleh mengedit, selain itu detail; Review/Approval menuju halaman keputusan. Jangan membuat count dari panjang daftar pendek. Loading menampilkan skeleton/teks Loading; angka yang belum diketahui memakai `—`; nilai nol yang benar memakai `0`; error menampilkan pesan dan Retry yang hanya memuat ulang counts. Jangan menampilkan tren “naik dari bulan lalu” kecuali ada data dan definisi resminya.

Grid kartu menggunakan kelas berdasarkan jumlah kartu efektif: dua kartu = dua kolom pada desktop, tiga = tiga kolom, empat = empat kolom; tablet maksimal dua, ponsel satu. Bila hanya satu kartu dimungkinkan oleh perubahan kontrak mendatang, lebarnya dibatasi agar tidak menjadi panel raksasa. Tidak boleh ada slot kosong akibat kartu tersembunyi. Urutan kartu tetap Draft, Revision, Review, Approval untuk semua kombinasi multi-role. Test harus mencakup kombinasi dua, tiga, dan empat kartu serta pemegang role kustom.

Baris berikutnya memakai komposisi mirip referensi: panel aktivitas lebih lebar dan panel distribusi status lebih sempit. Baris bawah berisi daftar **Needs attention** dan **Quick actions**. `Needs attention` menyusun record dari daftar server yang sudah tersedia, dengan urutan Revision, Review, Approval, Draft dan batas enam baris; tiap item membuka tujuan yang tepat dan tidak ditampilkan dua kali. `Quick actions` hanya memuat tindakan yang benar-benar dapat dilakukan: Create, History, Review queue, atau Approval queue sesuai izin/prasyarat. Bila suatu panel tidak relevan, panel lain melebar tanpa celah kosong.

Grafik aktivitas berupa batang berkelompok untuk empat kelompok tujuh hari. Nilai dan tanggal tersedia sebagai teks/tabel yang dapat dibaca tanpa warna, hover, atau animasi. Panel status berupa batang tersegmentasi dengan legenda berlabel, bukan persentase “progress” yang denominator-nya tidak jelas. Pemegang akses organisasi mendapat pilihan `Mine` / `Organization`; orang lain hanya mendapat `Mine`. Pilihan tab tidak dikirim sebagai otoritas permission dan tidak mengubah data server yang sudah dibatasi.

## 5. Kontrak metrik yang perlu disinkronkan

Tambahkan permission eksplisit `nscmf.analytics.view`. Bundle bawaan Superadmin mendapat permission tersebut; Requester, Reviewer, dan Approver tidak. Role kustom mendapatkannya hanya jika admin mengatur permission role secara sah. Panel organisasi disediakan server hanya bila aktor mempunyai **keduanya**: `nscmf.analytics.view` dan `nscmf.view.history`. Permission analitik sendirian tidak membuka pembacaan record, Draft orang lain, atau queue. Team tidak memengaruhi metrik. Multi-role memakai gabungan permission efektif biasa.

Pertahankan `GET /dashboard`; tambahkan prop Inertia `analytics` tanpa endpoint baru. Bentuk yang direncanakan:

```ts
type DashboardAnalytics = {
    period: { from: string; through: string; timezone: 'Asia/Jakarta' };
    mine: {
        totals_28d: { created: number; first_submitted: number; approval_decisions: number };
        weekly: Array<{
            from: string;
            through: string;
            created: number;
            first_submitted: number;
            approval_decisions: number;
        }>;
        active_status_counts: Array<{ status: BusinessStatus; count: number }>;
    };
    organization?: {
        totals_28d: { first_submitted: number; approval_decisions: number };
        weekly: Array<{
            from: string;
            through: string;
            first_submitted: number;
            approval_decisions: number;
        }>;
        active_status_counts: Array<{ status: BusinessStatus; count: number }>;
    };
};
```

Periode meliputi hari ini di Asia/Jakarta dan 27 hari kalender sebelumnya, menjadi empat bucket tujuh hari berturut-turut. `created` menghitung `nscmf_records.created_at` milik aktor; `first_submitted` menghitung `first_submitted_at`; `approval_decisions` menghitung `nscmf_workflow_iterations.approved_at` yang terkait record dalam cakupan. Satu record yang disetujui lagi pada iterasi baru menghasilkan dua keputusan bila kedua keputusan jatuh dalam periode; label UI menyebut *decisions*, bukan jumlah record unik. Boundary tanggal dihitung di zona Asia/Jakarta sebelum dipakai sebagai query DB, dan diuji di sekitar tengah malam.

`mine.active_status_counts` menghitung record milik aktor yang `is_archived=false`, dikelompokkan menurut tujuh status bisnis yang sah. `organization.active_status_counts` hanya menghitung record `first_submitted_at IS NOT NULL` dan `is_archived=false`; Draft/CANCELLED yang belum pernah disubmit milik orang lain tidak masuk. Tampilan organisasi hanya menampilkan status yang benar-benar mungkin pada himpunan ini; angka nol yang sah tetap `0`. Data organisasi tidak menyertakan Request No atau identitas pemilik. Bila permission kurang, properti `organization` **tidak ada**, bukan objek berisi nol. Server menghitung semua agregat; klien hanya merender.

Tempat implementasi: tambahkan kontrak repository baca yang khusus untuk agregasi dashboard dan implementasi Eloquent-nya; susun hasilnya di service query yang sudah menangani Dashboard; controller tetap hanya memanggil service dan merender Inertia. Seed referensi yang idempotent menambah permission pada katalog dan bundle Superadmin. Tidak ada migrasi. Jika perubahan permission mengubah sesi efektif sesuai aturan proyek, pertahankan mekanisme revokasi yang sudah ada.

Sebelum test/kode, sinkronkan `project_doc/01_PRD.md` (kemampuan analitik), `04_RBAC_Permission_Matrix.md` (izin/bundle), `07_UI_UX_Specification.md` (panel dan interaksi), `12_API_Contract.md` (prop dan cakupan), serta `17_Seed_Dummy_Data_Specification.md` (seed). Catat perubahan di `design.md` root. `microtask_fe/` dan `microtask_be/` adalah ekstraksi pekerjaan; perbarui hanya task yang relevan setelah otoritas tersebut konsisten. Dokumen ini sendiri bukan persetujuan untuk menimpa authority tanpa sinkronisasi.

## 6. Penerapan pada seluruh jenis layar

| Jenis layar | Penerapan visual | Perilaku yang harus tetap terbukti |
| --- | --- | --- |
| Review, Approval, History | Header jelas, toolbar filter pada panel, tabel putih berjarak rapi, badge status berlabel, pagination konsisten. | Search/filter/sort server, queue Team-neutral, visibilitas record, tombol keputusan dan tautan canonical. |
| Create, Draft, Change Results | Header konteks record, navigator bagian, panel form yang mudah dipindai, zona tindakan dan save state yang terlihat. | Draft boleh belum lengkap, error inline dan ringkasan, autosave/409 tidak berbohong, section navigator, validasi server. |
| Detail NSCMF | Ringkasan Request No/status/Requester/Team, area next step menonjol, panel Timeline, Attachment, Export terpisah. | Archived badge terpisah, action mengikuti `allowed_actions`, alasan revisi, status scan/ekspor persisten, PDF bertanda tangan. |
| Administration dan Setup | Kartu konsisten untuk Users/Roles/Teams, wizard langkah yang jelas, tabel dan dialog tetap ringkas. | Izin administrasi, re-auth, credential sekali tampil, Protected Superadmin, Technical Logs khusus identitas yang sah. |
| Audit dan settings | Panel/filter dengan kepadatan informasi lebih tinggi tetapi tetap terbaca. | Audit yang terotorisasi saja; status gagal dan konfigurasi sensitif tetap jelas. |
| Login/password sementara | Kartu autentikasi terpusat dengan identitas brand dan fokus form yang kuat. | Copy generik untuk gagal login, password tidak tersimpan, penggantian wajib tetap memblokir navigasi normal. |
| Validator PDF publik | Satu panel unggah/hasil dengan bahasa visual sama, tanpa shell internal. | Hanya `/ispdfvalid` publik; tidak ada auth props, menu internal, atau kebocoran metadata. |

Komponen bersama yang perlu ditinjau: `AppLayout`, `QueueCard`, `ResourceTable`, `Button`, `Badge`, `Alert`, `FormField`, dialog, serta token `resources/css/app.css`. Hindari menyebar nilai visual yang sama sebagai kelas ad hoc ke puluhan halaman. Pertahankan `data-testid` dan label yang dipakai journey penting kecuali test serta kontrak terkait sengaja diperbarui bersama.

Peta file untuk implementer sesudah branch integrasi tersedia:

| Tanggung jawab | File yang dituju |
| --- | --- |
| Permission dan bundle | `app/Domain/Administration/PermissionCatalog.php`, `database/seeders/ReferenceDataSeeder.php`, `tests/Feature/Seed/ReferenceDataSeederTest.php`, `tests/Feature/Authorization/PermissionUnionTest.php`. |
| Agregasi MySQL | Buat `app/Repositories/Contracts/Nscmf/DashboardMetricsRepository.php` dan `app/Repositories/Eloquent/Nscmf/EloquentDashboardMetricsRepository.php`; daftarkan binding di `app/Providers/RepositoryServiceProvider.php`. |
| Proyeksi HTTP | `app/Services/Nscmf/NscmfQueryService.php` menambahkan `analytics` pada hasil Dashboard; `app/Http/Controllers/Dashboard/DashboardController.php` tetap tipis. Tambahkan skenario ke `tests/Feature/Nscmf/DashboardProjectionTest.php`. |
| Dashboard Vue | `resources/js/Pages/Dashboard/Index.vue`, `resources/js/features/nscmf/QueueCard.vue`, tipe baru di `resources/js/features/dashboard/types.ts`, serta panel Activity, Status, Needs attention, dan Quick actions di folder fitur dashboard yang sama. Perbarui `Index.test.ts` dan test panel yang memiliki interaksi nyata. |
| Shell dan token | `resources/css/app.css`, `resources/js/layouts/AppLayout.vue`, komponen bersama di `resources/js/components/ui/`, dan `AppLayout.test.ts`. Gunakan varian tombol/badge yang ada sebagai titik konsolidasi. |
| Integrasi browser | Perluas `tests/Browser/workflow.spec.ts` untuk data dan akses dashboard, `tests/Browser/fe-accessibility.spec.ts` untuk lebar/fokus, serta journey yang sudah memakai link dashboard jika struktur DOM berubah. |

Nama panel Vue boleh mengikuti tanggung jawab di atas, tetapi setiap panel harus menerima data/properti terketik dan tidak membuat query atau aturan izin sendiri. Kontrak repository menghitung agregat saja; service memutuskan cakupan permission dan bentuk proyeksi. Halaman lain memakai komponen/token bersama tanpa memindahkan aturan bisnis dari server.

## 7. Urutan pekerjaan pada goal implementasi berikutnya

1. **Dokumentasi dan desain.** Review `design.md` serta rencana ini, sinkronkan lima authority yang terdampak dan turunan microtask, tetapkan acceptance test metrik serta matriks role/permission. Perubahan authority harus direview sebagai perubahan requirement sebelum kode mengandalkannya.
2. **Izin dan kontrak metrik.** Tulis test backend dari authority yang telah disinkronkan; buktikan RED bermakna, commit test, lalu implementasikan katalog/seed, repository agregasi, service projection, dan prop Dashboard. Buktikan GREEN dan commit implementasi.
3. **Fondasi UI.** Tetapkan token, pola panel/tombol/badge, dan shell responsif. Untuk perubahan perilaku navigasi mobile, test dahulu sampai RED lalu implementasikan. Refaktor murni memakai safety net GREEN tanpa RED buatan.
4. **Dashboard.** Implementasikan kartu adaptif, grafik berbasis data server, distribusi status, daftar fokus, dan quick actions. Lakukan TDD untuk logika baru dan pertahankan tautan perjalanan kritis yang sudah ada.
5. **Layar kerja dan administrasi.** Pindahkan pola visual yang sama per kelompok layar: antrean/History, form/detail, admin/setup/audit, lalu auth/validator. Setiap slice tetap dapat diuji dan direview terpisah.
6. **Verifikasi lintas layar.** Periksa 320/768/1280 px, keyboard/fokus, reduced motion, kontras, status loading/error/empty, dan perubahan permission. Tinjau tangkapan layar secara manual terhadap karakter referensi, lalu jalankan semua gate yang relevan.

TDD proyek tetap: requirement yang sudah disinkronkan → test RED bermakna → commit RED → implementasi → GREEN → commit implementasi → regresi. Setiap PR implementasi mendapat human review; perubahan katalog/authorization metrik memerlukan human security review. Jangan menggabungkan PR sendiri ke `main`.

## 8. Acceptance dan gate

- Requester melihat dua kartu pribadi, metrik Mine, tautan yang sah, dan tidak menerima properti organisasi. Reviewer dan Approver melihat kartu pool sesuai izin; multi-role melihat keduanya. Superadmin melihat organisasi. Role kustom dengan hanya permission analitik tidak mendapat organisasi; dengan analitik **dan** History mendapatkannya.
- Count, tren, dan distribusi berasal dari MySQL 8.4, termasuk boundary Asia/Jakarta, approval pada iterasi ulang, record arsip, serta record Draft/CANCELLED yang belum pernah disubmit. Test negatif membuktikan angka organisasi tidak membocorkan data yang tidak terlihat.
- Grid dua/tiga/empat kartu, panel yang hilang, daftar kosong, loading, error, Retry, dan nol sah tidak menimbulkan ruang kosong atau angka palsu. Record dari dashboard tetap dapat dibuka lewat klik hingga halaman tindakan yang benar.
- Form, tabel, dialog, scan, ekspor, status konflik, re-auth, dan validator publik tetap melewati journey yang ada; tidak ada perubahan aturan bisnis hanya demi bentuk visual.
- Lint/format/typecheck frontend, Vitest dengan cakupan baris ≥80%, build, Pint, PHPStan max, Pest dengan cakupan baris ≥80%, integrasi MySQL 8.4, dan Playwright Chromium dijalankan sesuai `16`. Jangan klaim PASS untuk gate yang tidak dijalankan. Pemeriksaan visual manual melengkapi tes otomatis, bukan menggantikannya.
- Setelah perubahan, review diff memastikan tidak ada dependensi, route, schema, aset privat, perubahan template ekspor, atau file pengguna yang tidak dimaksud. PR dan merge final tetap mengikuti `15`/`18`.
