# NSCMF Digital Form & Workflow System

Aplikasi internal Laravel 13 / Vue 3 yang menggantikan proses NSCMF Form 3.0 berbasis Excel.

- Spesifikasi (otoritas): [`project_doc/`](project_doc/)
- Aturan developer dan coding agent: [`AGENTS.md`](AGENTS.md)
- Keputusan dan gap yang masih terbuka: [`microtask_be/06_GAP_DAN_KEPUTUSAN.md`](microtask_be/06_GAP_DAN_KEPUTUSAN.md)

README ini hanya menjelaskan cara menjalankan proyek. Aturan produk ada di `project_doc`.

## 1. Kebutuhan

| Alat | Versi / catatan |
| --- | --- |
| PHP | 8.5 dengan `pdo_mysql`, `mbstring`, `intl`, `zip`, `fileinfo`, `dom`, `curl`, `openssl` |
| PHP coverage | extension `pcov` |
| Composer | 2.x |
| Node.js | 24 LTS + npm |
| Docker | Hanya untuk MySQL 8.4 dan ClamAV |
| LibreOffice | Renderer PDF (`brew install --cask libreoffice`) |
| Font | Calibri, Aptos Narrow, Aptos Display (lihat §3) |

Aplikasi berjalan native. Redis tidak dipakai: session, cache dan queue memakai database.

## 2. Persiapan pertama kali

```bash
composer install
npm ci

cp .env.example .env
# Isi DB_PASSWORD dengan password lokal bebas, lalu:
php artisan key:generate

docker compose up -d mysql clamav   # MySQL 8.4 (nscmf + nscmf_testing) dan ClamAV
php artisan migrate
php artisan db:seed                 # data referensi: permission, role, setting
php artisan nscmf:bootstrap-superadmin

npx playwright install chromium
```

`nscmf:bootstrap-superadmin` membuat akun `superadmin` dan **menampilkan password sementara satu kali saja**. Simpan, lalu ganti saat login pertama. Menjalankannya lagi tidak mereset password.

ClamAV butuh 1–2 menit setelah container naik sebelum siap (status `healthy` di `docker ps`). Tanpa ClamAV, lampiran tidak bisa dipakai (gagal secara aman).

## 3. Isi `.env` untuk lampiran, PDF dan tanda tangan

| Kunci | Isi |
| --- | --- |
| `NSCMF_CLAMAV_HOST` / `NSCMF_CLAMAV_PORT` | `127.0.0.1` / `3310` |
| `NSCMF_RENDERER_EXECUTABLE` | Path `soffice`, mis. `/opt/homebrew/bin/soffice` |
| `NSCMF_RENDERER_FONTS_PATH` | Folder font Calibri + Aptos, path absolut, mis. `/Users/<anda>/Library/Fonts` |
| `NSCMF_SIGNING_P12_PATH` | Lokasi file sertifikat, di luar folder `public`, mis. `storage/app/private/signing/organization.p12` |
| `NSCMF_SIGNING_P12_PASSPHRASE` | Passphrase acak panjang; hanya di `.env`, tidak pernah di DB atau Git |
| `NSCMF_PUBLIC_HOST` | Hostname publik validator (kosong = tidak dipisah) |

Font harus sama persis dengan template, tanpa pengganti:

- **Aptos** (termasuk Aptos Narrow dan Aptos Display): unduh resmi dari Microsoft, <https://www.microsoft.com/download/details.aspx?id=106087>.
- **Calibri**: dari instalasi Microsoft Office/Windows berlisensi. Di Mac dengan Word ada di `/Applications/Microsoft Word.app/Contents/Resources/DFonts`.

Salin file `.ttf`-nya ke folder `NSCMF_RENDERER_FONTS_PATH`. File font berlisensi, jangan dimasukkan ke Git.

## 4. Provisioning template dan sertifikat

Jalankan sekali, dan ulangi bila template atau sertifikat berganti:

```bash
php artisan nscmf:template:register NSCMF-Form-3.0.xlsx --activate
php artisan nscmf:signing:activate --generate
```

- Template `NSCMF-Form-3.0.xlsx` diletakkan di root proyek. File ini privat dan tidak masuk Git. Perintah pertama menyimpannya sebagai versi yang tidak bisa diubah, lengkap dengan hash-nya.
- `--generate` membuat sertifikat Organisasi self-managed untuk lokal. Untuk produksi, siapkan file `.p12` sendiri lalu jalankan tanpa `--generate`.

## 5. Data demo (lokal saja)

```bash
php artisan db:seed --class=DemoSeeder
```

Butuh `nscmf:bootstrap-superadmin` lebih dulu. Seeder membuat 3 Team demo, 6 akun, dan 20 record `DEMO-*` yang dimainkan lewat workflow sungguhan. Aman dijalankan berulang karena hanya membuat yang belum ada. Di produksi seeder ini ditolak.

| Username | Peran | Password |
| --- | --- | --- |
| `demo.requester.a`, `demo.requester.b` | Requester | `password` |
| `demo.reviewer` | Reviewer | `password` |
| `demo.approver` | Approver | `password` |
| `demo.multi` | Reviewer + Approver | `password` |
| `demo.disabled` | Nonaktif | tidak bisa login |

## 6. Menjalankan aplikasi

```bash
composer dev            # server Laravel, queue worker, log dan Vite sekaligus
php artisan schedule:work   # di terminal lain: pembersihan terjadwal
```

Atau jalankan satu per satu: `php artisan serve`, `npm run dev`, `php artisan queue:work`.

Queue worker wajib jalan: scan lampiran dan pembuatan ekspor XLSX/PDF diproses di queue.

Halaman publik validator PDF: `/ispdfvalid`. Hanya halaman ini yang bisa dibuka tanpa login.

## 7. Pemeliharaan

| Perintah | Fungsi |
| --- | --- |
| `php artisan nscmf:cleanup uploads` | Hapus sesi upload yang ditinggalkan (terjadwal tiap 15 menit) |
| `php artisan nscmf:cleanup exports` | Hapus file ekspor kedaluwarsa (tiap jam) |
| `php artisan nscmf:cleanup runtime` | Hapus workspace render sementara (tiap jam) |
| `php artisan nscmf:cleanup technical-logs` | Hapus log teknis sesuai setting (harian 01:00 WIB) |

Audit bisnis, akses dan keamanan tidak pernah dihapus otomatis.

## 8. Quality gates

Gate yang sama berjalan di GitHub Actions (`.github/workflows/ci.yml`).

| Pemeriksaan | Perintah |
| --- | --- |
| Format PHP (Pint) | `composer lint` |
| Static analysis PHP (level max) | `composer analyse` |
| Test PHP (Pest, MySQL 8.4) | `composer test` |
| Test PHP + coverage 80% | `composer test:coverage` |
| ESLint | `npm run lint` |
| Prettier | `npm run format:check` |
| TypeScript strict (vue-tsc) | `npm run typecheck` |
| Test frontend (Vitest) | `npm test` |
| Test frontend + coverage 80% | `npm run test:coverage` |
| Test browser (Playwright Chromium) | `npm run test:e2e` |

- Test PHP selalu memakai database sekali-pakai `nscmf_testing` dan menolak berjalan di database lain.
- Test ekspor/PDF butuh `NSCMF-Form-3.0.xlsx`, `soffice` dan font. Tanpa itu, test tersebut di-skip, bukan dihitung lulus.
- Test browser menjalankan `php artisan serve` di port 8010. Build aset dulu dengan `npm run build`.
