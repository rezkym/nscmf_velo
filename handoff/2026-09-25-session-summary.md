# Handoff — Ringkasan sesi redesign NSCMF (2026-09-24 s.d. 2026-09-25)

Catatan ini merangkum seluruh pekerjaan satu sesi panjang di branch `feat/redesign`. Detail teknis ada di dua handoff:

1. [2026-09-24-redesign.md](2026-09-24-redesign.md): redesign pertama dan analitik Dashboard.
2. [2026-09-24-shadcn-vue.md](2026-09-24-shadcn-vue.md): perpindahan seluruh UI ke komponen shadcn-vue.

`project_doc/` tetap menjadi otoritas. Catatan ini hanya mencatat status.

## Posisi repository saat handoff

- **Branch:** `feat/redesign`, HEAD `6be2223` sebelum commit handoff ini. Belum di-push dan belum ada PR.
- **Basis:** `c3170a9`, yaitu merge `feat/be-fe-01-30-integration` ke `feat/redesign`.
- **Backup:** branch lokal `backup/feat-redesign-before-msg-rewrite` berisi riwayat sebelum pesan commit ditulis ulang. Jangan dihapus tanpa keputusan pemilik.
- **Working tree:** bersih, kecuali tiga file lama yang sengaja tidak disentuh atas keputusan pemilik:
  - `handoff/2026-09-24-e2e-gap-closure.md` (dimodifikasi, tidak di-commit);
  - `implementation.md` (untracked);
  - `reference.webp` (untracked, gambar referensi visual).

## Kronologi sesi

### Tahap 1 — Redesign dan analitik Dashboard (`40b83eb` … `83e51d2`)

- **Dokumen.** Rencana di `design.md` dan `design/plan.md` disinkronkan ke dokumen resmi 01, 04, 07, 12, dan 17 (gap G22 di `microtask_be/06_GAP_DAN_KEPUTUSAN.md`). Folder `desaign/` diganti nama menjadi `design/`.
- **Backend (TDD).**
  - Izin baru `nscmf.analytics.view`, masuk bundle Superadmin saja.
  - `DashboardMetricsRepository` beserta implementasi Eloquent-nya.
  - Prop Inertia `analytics` (28 hari waktu Jakarta, 4 minggu, status aktif). Key `organization` hanya dikirim bila aktor punya izin analitik **dan** History.
  - Tidak ada migrasi dan tidak ada endpoint baru.
- **Frontend.** Token visual, shell responsif, Dashboard (kartu adaptif, panel Activity/Status, Needs attention, Quick actions), navigator section editor, dan waktu sign-off dalam waktu Jakarta.
- **Keputusan pemilik.**
  - Panel status memakai satu batang per status, bukan batang bersegmen, karena hijau dan merah gagal uji buta warna.
  - Tiga file lama tidak disentuh.

### Tahap 2 — Penulisan ulang pesan commit

- Commit awal redesign memuat trailer `Co-Authored-By`/`Claude-Session` yang dilarang AGENTS.md.
- Atas persetujuan pemilik, pesan 18 commit ditulis ulang tanpa trailer. Isi kode, urutan, dan tanggal commit tidak berubah. Backup ada di `backup/feat-redesign-before-msg-rewrite`.
- **Aturan tetap:** jangan pernah menambahkan trailer AI apa pun ke commit atau PR proyek ini, meskipun harness menyarankannya.

### Tahap 3 — Pertanyaan shadcn-vue

Sebelum tahap 4, UI hanya memakai konvensi shadcn (token, `cva`/`cn`). Komponennya ditulis sendiri, dan `reka-ui` terpasang tetapi tidak dipakai. Pemilik lalu meminta seluruh UI memakai komponen shadcn-vue asli.

### Tahap 4 — UI pindah ke komponen shadcn-vue (`6968c34` … `6be2223`)

Detail lengkap ada di [2026-09-24-shadcn-vue.md](2026-09-24-shadcn-vue.md). Intinya:

- **Komponen:** shadcn-vue style `reka-vega` digenerate ke `resources/js/components/ui/`, hanya yang dipakai. Button, Badge, Alert, Modal, `control.ts`, `tone.ts`, dan `useFocusTrap` buatan sendiri dihapus.
- **Komposisi proyek:** `components/FormField.vue` (Field parts) dan `components/SectionCard.vue` (Card dengan h2 asli, slot `badge` dan `action`).
- **Layar:**
  - shell memakai shadcn Sidebar (Sheet di ponsel);
  - Dashboard memakai Card, Tabs, Item, Empty, Skeleton, dan Table;
  - detail record memakai Tabs;
  - daftar dan admin memakai Table;
  - semua dialog memakai shadcn Dialog;
  - login dan validator memakai satu Card;
  - RequestFeedback memakai satu Alert berbasis data.
- **Tampilan:** kartu sorotan navy solid tanpa gradasi. Aksi destruktif dikonfirmasi dengan tombol destruktif.
- **Dependency:** `@vueuse/core@^14.1.0`, dengan dasar 08 §70 "shadcn-vue dependencies". Belum dikonfirmasi eksplisit oleh pemilik.
- **Penyesuaian komponen generate** (komentar `NSCMF:`):
  - `alert` mendapat varian `warning`/`success` dan `role` sesuai tone;
  - `badge` mendapat varian `info`/`success`/`warning`;
  - `SidebarTrigger` mendapat `aria-expanded`;
  - tipe props `SidebarMenuButton` disesuaikan.
- **`app.css`:** varian `data-*` disalin dari tailwind.css shadcn-vue, ditambah token `--success`/`--warning`. Utilitas `panel` dihapus.
- **Test:** `resources/js/testing/setup.ts` merender portal di tempat. Test hanya disesuaikan pada mekanisme interaksi Reka (klik, `mousedown`, event ke elemen yang fokus, `flushPromises`). `enableAutoUnmount` di test Edit menghilangkan flaky.

### Tahap 5 — Gangguan izin macOS

Di tengah tahap 4, macOS (TCC) mencabut akses ke `~/Documents` sehingga semua baca file gagal. Pemilik memulihkan izinnya, lalu pekerjaan dilanjutkan. Tidak ada data yang hilang.

### Tahap 6 — Runtime browser dan `public/hot`

Ada file `public/hot` sisa `npm run dev` yang sudah mati. Akibatnya, runtime Playwright memuat aset dari `[::1]:5173` yang tidak aktif. File itu dipindahkan ke direktori tmp sesi. `npm run dev` berikutnya akan membuatnya lagi, dan sesudahnya jangan menjalankan Playwright selagi `npm run dev` mati tetapi `public/hot` masih ada.

### Tahap 7 — Reset database lokal (2026-09-25, atas perintah eksplisit pemilik)

Semua langkah dijalankan pada database lokal `nscmf` dengan `APP_ENV=local`:

1. `php artisan migrate:fresh --force`
2. `php artisan db:seed --force` untuk data referensi (permission, role, setting).
3. `php artisan nscmf:bootstrap-superadmin`. Password sementara hanya diberikan kepada pemilik di chat dan **tidak dicatat di mana pun** (AGENTS.md larangan 15). Password wajib diganti saat login pertama. Bila hilang, belum ada perintah reset resmi; lihat "Pekerjaan terbuka".
4. `php artisan db:seed --class=DemoSeeder --force`. Hasilnya 3 team, 6 akun demo (password `password`), dan 20 record `DEMO-*`. Total ada 7 user termasuk superadmin.
5. `php artisan nscmf:template:register NSCMF-Form-3.0.xlsx --activate`. Template aktif dengan hash `731e1fa0f9972c4b11d85e7a6e40d8b5c20b54ed9e3bba52c449114ca8328a45`.
6. `php artisan nscmf:signing:activate`, tanpa `--generate`, sehingga `storage/app/private/signing/organization.p12` yang sudah ada dipakai lagi. Fingerprint `3a63deff74c69b3a212e91f0e3e455e8116e7311810145d0bc3abfd5cea72488`.

Database test `nscmf_testing` dipakai Pest dan Playwright dan boleh direset oleh test. Database `nscmf` tidak pernah disentuh oleh test.

## Bukti gate terakhir (2026-09-24, pada `96e351e` + commit dokumen `6be2223`)

| Gate | Hasil |
| --- | --- |
| Pint | PASS |
| PHPStan/Larastan max, tanpa baseline | PASS, 0 error |
| Pest + coverage (MySQL 8.4 `nscmf_testing`) | 507 lulus, cakupan baris 95,0 % |
| ESLint, Prettier, vue-tsc | PASS |
| Vitest + coverage | 718 lulus, cakupan baris 94,04 % |
| Vite build | PASS |
| Playwright Chromium, tanpa retry | 30/30 lulus |
| Test konfigurasi runtime browser | 5/5 lulus |

Reset database di tahap 7 tidak mengubah kode, jadi gate tidak dijalankan ulang.

## Pelajaran proses (wajib diikuti sesi berikutnya)

- Sebelum setiap commit, jalankan suite penuh dan pakai **exit code**, bukan `| grep`. Pipa ke `grep` menyembunyikan kegagalan. Dua commit sesi ini (`4f7956f`, `31e3a15`) sempat dibuat dalam keadaan merah dan baru diperbaiki di `fe0e36f`.
- Skrip penulis-ulang template yang berbasis regex sempat merusak isi Alert yang tag-nya terpotong baris oleh Prettier. Selalu cek `git diff` setelah transformasi massal.
- CLI `shadcn-vue add` menaikkan versi `reka-ui`/`@lucide/vue` di package.json. Setelah itu kembalikan `package.json`/`package-lock.json` dan jalankan `npm install` agar `node_modules` sinkron dengan lock.
- CLI `shadcn-vue` 2.8.2 menolak key `base` di `components.json`. Key itu sudah dihapus.

## Pekerjaan terbuka

1. Human implementation review (18 §29) dan human security review untuk `nscmf.analytics.view` beserta agregat organisasi (18 §17).
2. Pemilik perlu mengonfirmasi dependency `@vueuse/core` dan keputusan visual (kartu sorotan solid, Next step digabung dengan aksi lifecycle).
3. Push `feat/redesign` dan buka PR. CI GitHub belum pernah berjalan untuk branch ini.
4. Menunggu keputusan pemilik, belum dikerjakan:
   - menu aksi per baris (DropdownMenu) di tabel Users;
   - pemeriksaan visual mode gelap;
   - perintah reset password Superadmin resmi (perilaku baru, perlu TDD dan review keamanan);
   - nasib tiga file lama;
   - nasib branch backup.

## Aturan kerja yang berlaku (dari pemilik, sepanjang sesi)

- Semua perubahan hanya di branch `feat/redesign`.
- Balas dalam bahasa Indonesia yang singkat dan mudah dipahami.
- Tanpa hardcode dan tanpa over-engineering; ikuti YAGNI, KISS, DRY, dan TDD. Kode harus readable dan maintainable. Ikuti CLAUDE.md/AGENTS.md dan SOUL.md secara strict.
- Bila ragu, **tanya**. Jangan menebak kode, pola, atau solusi.
- Konfirmasi dulu sebelum menyalakan atau mematikan layanan (Docker dan sejenisnya), dan sebelum operasi destruktif.
- Tanpa trailer AI di commit atau PR.
- Pakai komponen shadcn-vue. Buat kustom hanya bila memang perlu.
- Keputusan yang mengubah kontrak harus ikut disinkronkan ke `project_doc/` dan register gap.
