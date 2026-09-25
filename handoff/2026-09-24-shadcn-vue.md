# Handoff — UI NSCMF pindah ke komponen shadcn-vue (2026-09-24)

Branch: `feat/redesign` (lokal, belum di-push, belum ada PR). Melanjutkan [redesign sebelumnya](2026-09-24-redesign.md), mulai dari `83e51d2`. Rencana visual: [design.md](../design.md), [design/plan.md](../design/plan.md).

Catatan ini hanya mencatat status. `project_doc/` tetap menjadi otoritas.

## Permintaan pemilik

Seluruh UI (tata letak, kartu, form, tabel, dialog, shell) harus memakai komponen shadcn-vue, bukan komponen buatan sendiri, kecuali memang perlu kustom. Kode harus bersih (YAGNI, KISS, DRY, tanpa hardcode), memakai TDD, dan tampilannya tidak lagi terasa "AI slop" (skill better-ui dan emil-design-eng).

## Yang dikerjakan

**Fondasi**
- `components.json`: key `base` dihapus karena CLI shadcn-vue 2.8.2 menolaknya. Style tetap `reka-vega`.
- Komponen digenerate dengan `npx shadcn-vue add` ke `resources/js/components/ui/`, hanya yang dipakai: `alert`, `badge`, `button`, `card`, `checkbox`, `dialog`, `empty`, `field`, `input`, `item`, `label`, `native-select`, `progress`, `radio-group`, `separator`, `sheet`, `sidebar`, `skeleton`, `table`, `tabs`, `textarea`, dan `tooltip`. `separator`, `sheet`, `skeleton`, dan `tooltip` ikut terpasang sebagai dependensi Sidebar.
- `app.css` diberi varian `data-open`, `data-closed`, `data-checked`, `data-active`, `data-horizontal`, `data-vertical`, serta utilitas `no-scrollbar`. Semuanya disalin dari `tailwind.css` paket shadcn-vue, hanya yang dipakai komponen. Komponen `reka-vega` bergantung padanya, dan Reka UI sendiri hanya menyetel `data-state`/`data-orientation`.
- Token baru `--success` dan `--warning` (terang dan gelap) untuk tone Badge dan Alert. Utilitas `panel` beserta token radius/shadow/easing lamanya dihapus karena tidak lagi dipakai.

**Penyesuaian kecil pada komponen hasil generate** (masing-masing diberi komentar `NSCMF:`)
- `alert`: varian `warning` dan `success`. `role` bernilai `alert` hanya untuk `destructive`, selain itu `status`.
- `badge`: varian `info`, `success`, dan `warning` (07 §7).
- `sidebar/SidebarTrigger`: `aria-expanded` mengikuti keadaan sidebar.
- `sidebar/SidebarMenuButton`: tipe props diubah dari intersection ke `interface … extends`, karena ESLint type-aware membaca tipe dari file `.vue` sebagai `error`.

**Komposisi milik proyek** (dirakit dari komponen shadcn, bukan buatan ulang)
- `components/FormField.vue` (dipindah dari `ui/`): Field, FieldLabel, FieldDescription, dan FieldError, plus penyambungan `id`/`aria-describedby`.
- `components/SectionCard.vue`: Card dengan judul h2 asli, deskripsi opsional, slot `badge`, dan slot `action` (CardAction). Dipakai oleh semua section form, detail, dan admin. Navigator section (07 §21) tetap membaca h2 tersebut.

**Layar**
- Shell: shadcn Sidebar. Di layar lebar, sidebar bisa diciutkan dari tombol di header. Di bawah breakpoint md, sidebar menjadi Sheet dengan focus trap, bisa ditutup dengan Escape, dan fokus kembali ke tombolnya. `useFocusTrap` buatan sendiri dihapus.
- Dashboard: Card, Tabs (Mine/Organization), Item, Empty, Skeleton, dan Table. Kartu sorotan memakai permukaan `brand-950` solid dengan token gelap. Gradasi dihapus karena ciri "AI slop" dan 07 §7.1 hanya mengizinkan, tidak mewajibkan.
- Detail record: Tabs shadcn menggantikan tablist buatan sendiri. Next step dan aksi lifecycle digabung dalam satu Card yang tampil bila server mengirim `allowed_actions` atau record sedang menunggu revisi.
- Editor Draft, Export, Attachments (dengan Progress), Timeline, Review, dan Approval: SectionCard dan Item.
- RequestFeedback: satu Alert berbasis tabel notice, menggantikan sembilan kotak buatan tangan.
- ResourceTable, History, Audit, dan Bulk export: Card, Table, TableEmpty, Field, Item, dan Empty.
- Users, Teams, Roles, Setup, Technical Logs, dan Create: Table, DialogFooter, FieldSet, dan Card.
- CenteredLayout (Login, ganti password, Welcome, `/ispdfvalid`): satu Card dengan judul h1. Hasil validator memakai Alert.
- Dialog: semua Modal diganti shadcn Dialog. Dialog yang sedang sibuk tidak bisa ditutup, dan fokus kembali ke tombol pemicunya. Aksi destruktif kini dikonfirmasi dengan tombol destruktif (RED `b6569b0` → GREEN `883a9bf`).

**TDD**
- Perilaku baru melalui RED lalu GREEN:
  - shell Sidebar (`941bd5a` → `4f7956f`);
  - Tabs Dashboard (`74d357f` → `31e3a15`);
  - tombol konfirmasi destruktif (`b6569b0` → `883a9bf`).
- Refactor murni memakai test yang sudah hijau sebagai pengaman. Test hanya disesuaikan pada mekanisme interaksi, tanpa melemahkan assertion:
  - Checkbox/Radio Reka diklik, bukan `setValue`;
  - tab Reka diaktifkan dengan `mousedown`;
  - Tab/Escape dikirim ke elemen yang sedang fokus;
  - penutupan dialog ditunggu dengan `flushPromises`.
- Setup test Vitest (`resources/js/testing/setup.ts`) merender portal di tempat, supaya isi dialog dan Sheet bisa dibaca dalam satu pohon komponen.

## Dependensi

- `@vueuse/core@^14.1.0` ditambahkan sebagai dependency langsung, karena hampir semua komponen shadcn-vue mengimpornya. Saya memperlakukannya sebagai "shadcn-vue dependencies" yang sudah disetujui 08 §70, jadi tidak meminta persetujuan terpisah. Rentang versinya sama dengan yang sudah dipasang reka-ui, sehingga tidak ada paket baru yang terunduh.
- CLI shadcn-vue sempat menaikkan `reka-ui` dan `@lucide/vue`. Perubahan itu dikembalikan, dan lockfile hanya berubah untuk `@vueuse/core`.

## Bukti gate (dijalankan 2026-09-24 pada working tree `96e351e` + commit dokumen ini)

| Gate | Hasil |
| --- | --- |
| Pint | PASS |
| PHPStan/Larastan max, tanpa baseline | PASS, 0 error |
| Pest + coverage (MySQL 8.4 `nscmf_testing`) | 507 lulus, cakupan baris 95,0 %; backend tidak diubah di pekerjaan ini |
| ESLint, Prettier, vue-tsc | PASS |
| Vitest + coverage | 718 lulus, cakupan baris 94,04 % |
| Vite build | PASS |
| Playwright Chromium, tanpa retry | 30/30 lulus |
| Test konfigurasi runtime browser | 5/5 lulus |

Pemeriksaan visual dilakukan pada lebar 390, 768, dan 1440 px lewat tangkapan layar sekali pakai di runtime browser. Spec tangkapan layarnya tidak disimpan di repo.

Journey browser yang disesuaikan:
- `auth-admin.spec.ts`: sel tabel user baru diperiksa setelah dialog kredensial ditutup, karena modal menyembunyikan halaman di belakangnya dari teknologi asistif.
- `fe-accessibility.spec.ts`: fokus panel ponsel dicari di dalam dialog Sheet.
- `workflow.spec.ts`: "Organization" kini berupa tab.

## Batasan yang perlu diketahui

- Commit `4f7956f` (shell) dan `31e3a15` (Dashboard) dibuat sebelum suite penuh dijalankan. Empat test halaman masih mencari `#sidebar-navigation`, dan baru diperbaiki di `fe0e36f`. Riwayat tidak ditulis ulang.
- Token `--success`/`--warning` baru masuk di `7344301`. Di antara `6968c34` dan commit itu, Badge dan Alert tone sukses/peringatan tampil tanpa warna.
- Tiga test Edit ternyata flaky karena editor dari test sebelumnya tidak di-unmount. Sudah diperbaiki di `96e351e` dengan `enableAutoUnmount`. Satu test lain dibuat menunggu kedua halaman timeline (`55402fd`).
- Mode gelap tetap hanya kompatibel dan belum diperiksa visual. Satu-satunya pemakaian token `.dark` yang disengaja adalah kartu sorotan Dashboard.
- Aksi per baris di tabel Users masih berupa deretan tombol ghost. DropdownMenu akan lebih ringkas, tetapi mengubah interaksi dan journey browser, jadi tidak dikerjakan tanpa keputusan pemilik.
- Stepper di Setup tetap `<ol>` statis. Stepper shadcn membuat langkah bisa diklik, dan itu perilaku yang tidak ada di spesifikasi.
- File lama `public/hot` sisa server `npm run dev` yang sudah mati membuat halaman di runtime browser memuat aset dari `[::1]:5173` yang tidak aktif. File itu dipindahkan ke direktori tmp sesi dan dibuat ulang otomatis oleh `npm run dev` berikutnya.

## Perlu tindakan pemilik

1. Human implementation review (18 §29).
2. Tinjau keputusan visual: kartu sorotan solid tanpa gradasi, dan aksi lifecycle yang digabung dengan Next step.
3. Push branch dan buka PR. CI GitHub belum pernah berjalan untuk branch ini.

## Setelah handoff ini

Pada 2026-09-25, atas perintah pemilik, database lokal `nscmf` direset. Setelah itu data referensi, Protected Superadmin, data demo, template, dan sertifikat tanda tangan disiapkan ulang. Rinciannya ada di [ringkasan sesi](2026-09-25-session-summary.md#tahap-7--reset-database-lokal-2026-09-25-atas-perintah-eksplisit-pemilik).
