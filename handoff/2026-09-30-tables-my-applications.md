# Tabel daftar, pencarian admin, dan My Applications (2026-09-30, G25)

Branch `feat/fix_miss_feature`, lanjutan `623f8b3` (lihat `git log 623f8b3..HEAD`). Semua commit masih lokal: belum ada push, PR, CI GitHub, maupun human review.

## Keputusan pemilik (G25)

| # | Keputusan |
| --- | --- |
| K1 | My Applications memakai izin `nscmf.view` (tidak ada izin baru). Isinya hanya record milik aktor, termasuk Draft dan Cancelled. |
| K2 | Filter minimal: search Request No, Status, sort, per page, pagination. |
| K3 | Record archived tidak tampil di My Applications. |
| K4 | Semua tabel memakai pagination bernomor (Pagination shadcn-vue) dan rentang "1–25 of 120" di dalam kartu tabel. |
| K5 | Aksi baris Users/Roles/Teams berada di satu menu "⋯" (DropdownMenu shadcn-vue). |

Turunan yang saya tetapkan mengikuti pola yang ada:
- Roles dan Teams dipaginasi di server dengan `page`/`per_page`/`q`, sama seperti Users.
- Audit tidak punya search, karena kontraknya tidak memiliki `q`.
- Select all di History hanya mencakup halaman yang tampil.

Dokumen yang disinkronkan:
- `project_doc` 04 §12; 07 §10, §34, §34.1, §37, §48, §57.1; 12 §44, §47.1, §80, §88, §93, §111; 19 T37.
- G25 di register gap BE.

## Hasil

| Task | Perubahan | Commit (RED → GREEN) |
| --- | --- | --- |
| BE-154 | Request bersama `ListAdministrationRequest` (`page`, `per_page` ≤ 100, `q` ≤ 64), repository dengan search, dan helper `App\Support\Pagination::meta` yang juga dipakai daftar record. Props: `users`/`roles`/`teams`, `meta`, `query`. Opsi dropdown dan katalog izin tetap lengkap. | `61a6091` → `38bf4de` |
| BE-155 | `GET /my-applications` (`NscmfQueryService::mine`) memaksa owner = aktor dan `archived = false`, serta mengabaikan filter History lain. | `2ee37af`, `5cebeda` → `a7bd67e` |
| FE-63 | `ResourceTable` mendapat pagination bernomor, rentang baris, slot `#head-<key>` dan `#filters`, prop `searchable`/`paged`/`rowTestId`, dan `ColumnDef.class` yang kini diterapkan. | `850234d` → `1428382` (komponen UI `cc2f31b`) |
| FE-64 | Checkbox header `select-all` di History, dengan status indeterminate untuk sebagian baris. | `2ead94e` → `21b1f1f` |
| FE-65 | Users/Roles/Teams memakai `ResourceTable` dan komposable `useSearchTable`. Aksi baris ada di `components/RowActionsMenu.vue`, dan kolom sekunder Users disembunyikan di layar sempit. Wizard Setup tetap menampilkan daftar penuh tanpa paging. | `6bb0e84`, `073362b` → `9f063df`; helper test `79b8af9`, `58cb77b` |
| FE-66 | Audit Access/Security menjadi satu tabel. Kolom Access: Time, Event, Actor, Record. Kolom Security: Time, Event, Actor, Outcome, Target user, Username entered, IP. Filter dan per page berada di kartu tabel. | `5165fe6` → `5cd7812`; koreksi 07 `5764b33` |
| FE-67 | Halaman `Pages/MyApplications/Index.vue` dan item navigasi "My Applications" (`nscmf.view`). Di ponsel, Type dan Request date disembunyikan agar Request No dan Status tetap terlihat. | `40e5ea6` → `099e35b`; browser `5a880e5` → `f385c18` |

## Catatan teknis

- **Pemasangan komponen:** CLI shadcn-vue kembali berhenti di prompt "overwrite button".
  - `dropdown-menu` sudah tertulis oleh CLI. `pagination` diambil dari registry resmi `reka-vega` dengan alias yang sama.
  - Kenaikan versi `reka-ui`/`@lucide/vue` oleh CLI dikembalikan. `package.json` dan `package-lock.json` tidak berubah, dan tidak ada dependency baru.
- **Koreksi dokumen:** 07 §37 semula menyebut kolom IP address untuk Access Audit. Kolom itu keliru karena proyeksi Access tidak punya IP, dan sudah dikoreksi di `5764b33`.
- **Test lama yang disesuaikan:**
  - Test admin kini membuka menu "⋯" lewat `testing/rowActions.ts`. Testid item tetap sama.
  - Teks "Page X of Y (N total)" berganti rentang "1–25 of 120", dan `audit-next`/`users-page-*` berganti `pagination-*`.
  - Semua penyesuaian di atas masuk ke commit RED.
  - `MyApplicationsTest` memakai `component(..., false)` di commit GREEN karena page Vue baru dibuat di FE-67. Polanya sama dengan `History/Index` di `WorkflowJourneyTest`.
- **Test RED statis:** `2ee37af` sempat ter-commit dengan error PHPStan di test (`$this->get`). Error itu diperbaiki di commit RED berikutnya, `5cebeda`, tanpa menulis ulang history.
- **Journey browser:** `tests/Browser/tables.spec.ts` dan cek reflow di `fe-accessibility.spec.ts` ditulis setelah implementasi unit, sebagai bukti end-to-end. Hanya assertion Status di ponsel yang lewat RED lebih dulu (`5a880e5`).
- **Menu dan dialog:** `DropdownMenu` memakai `:modal="false"`. Di Chromium, memilih "Edit" membuka dialog dengan fokus di input, dan Escape mengembalikan fokus ke tombol "⋯".

## Gate (lokal, HEAD `58cb77b`)

| Gate | Hasil |
| --- | --- |
| Pint, PHPStan max | lulus, 0 error |
| Pest + coverage (MySQL 8.4) | 515 lulus, cakupan baris 95,1 % |
| Vitest + coverage | 767 lulus, cakupan baris 92,69 % |
| vue-tsc, ESLint, Prettier, build | lulus |
| Playwright Chromium | 38/38 lulus |
| Runtime config | 5/5 lulus |

**Kegagalan yang pernah muncul:**
- Dua run coverage Vitest pertama gagal saat mesin sangat terbebani (load ~10, transform > 900 s).
  - Beberapa worker gagal start karena timeout, dan beberapa test melewati batas 5 detik, termasuk test polling lampiran yang tidak diubah.
  - Setelah beban turun, run ulang lulus penuh.
  - Helper menu kemudian dibuat menunggu menu benar-benar terbuka dan tertutup (`79b8af9`, `58cb77b`).
- Satu run Vitest biasa sempat gagal pada `rowActions` kedua di test yang sama. Setelah helper diperbaiki, tiga run berturut-turut lulus.

**Pemeriksaan visual:** dilakukan dengan spec Playwright sementara yang tidak di-commit, pada lebar 1280 px dan 390 px untuk Users (termasuk menu terbuka), Security Audit, My Applications, dan History. Hasilnya sesuai 07 §57.1.
- Tabel Audit di ponsel bergulir di dalam kartunya.
- **Mode gelap: Not verified.** Tema gelap aplikasi memakai kelas `.dark`, sedangkan spec hanya mengemulasikan `prefers-color-scheme`.

## Belum dilakukan

- Human implementation review, dan human security review untuk endpoint baru `GET /my-applications` yang membaca data record.
- Push, PR, CI GitHub.
- Status `microtask_fe/FE-63–67.md` hanya ada di disk karena folder itu diabaikan git. Baris BE-154/155 di `microtask_be/README.md` hanya diperbarui di working tree, karena README itu memuat perubahan stage milik pemilik.
