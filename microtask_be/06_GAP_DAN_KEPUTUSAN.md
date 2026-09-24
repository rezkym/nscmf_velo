# Gap dan keputusan

Semua item **OPEN** kecuali yang berstatus CLOSED di bawah (keputusan pemilik proyek 2026-09-22), serta keputusan yang memang deferred/nonblocking disebut eksplisit. Status task tetap PLANNED; “gap” tidak berarti semua pekerjaan berhenti. Task owner memberi artefak reviewable lalu meminta keputusan hanya saat dibutuhkan. Penyusunan backlog tidak menyinkronkan authority atau memilih nilai secara diam-diam.

<a id="g01"></a>

## G01 — Route/render setup, mandatory-password dan result-only

- Sumber: `07 §14/16;12 §44/78/109/114` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-035](BE-035.md), [BE-042](BE-042.md), [BE-075](BE-075.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan: Exact GET/render, navigation/redirect, eligibility, fixtures; approval+synchronized12/07 jika menambah route.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: `GET /account/temporary-password` (12 §78), `GET /administration/setup` (12 §96.1), editor Result-only memakai `GET /nscmf/{record}/edit` tanpa route baru (12 §29, §44).

<a id="g02"></a>

## G02 — Exact projection shared/detail/list/dashboard/audit/files

- Sumber: `12 §23–24/100–101` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-023](BE-023.md), [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-066](BE-066.md), [BE-067](BE-067.md), [BE-087](BE-087.md), [BE-086](BE-086.md), [BE-084](BE-084.md), [BE-093](BE-093.md), [BE-110](BE-110.md).
- Pihak berwenang: Pemilik kontrak BE/FE; user bila mengubah contract.
- Bukti penutupan: Sanitized JSON/Inertia fixtures lengkap dan mapping types; setiap owner menutup projection-nya sebelum integration, tidak menganggap local view-model authority.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g03"></a>

## G03 — Koreksi header Draft dan transport

- Sumber: `06 §15–22;11 §13;12 §25–28` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-048](BE-048.md), [BE-062](BE-062.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan: Matrix editable headers sebelum first submit + exact action/payload/response; approval source sync. Jangan menambah key ke canonical PATCH diam-diam.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: blok opsional `header` {`request_date`, `request_no`} pada `PATCH /nscmf/{record}/draft` (12 §26.1); dokumen 12 disinkronkan.

<a id="g04"></a>

## G04 — Bulk wire/partial failure/packaging

- Sumber: `12 §71;19 §27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-111](BE-111.md), [BE-112](BE-112.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan: Approved IDs/selection/limits/response/item errors/per-record denial/packaging semantics. Tidak ZIP/select-all/server limit atau partial behavior tebakan.
- Status: **CLOSED 2026-09-24** — keputusan didelegasikan pemilik proyek ke pelaksana: request tetap satu permintaan independen per record (maks. 100 ID, error per item). Paket: `GET /nscmf/export-batches/{batch}/download` mengembalikan satu ZIP berisi setiap file READY dan belum kedaluwarsa yang masih boleh diunduh peminta (byte identik dengan unduhan tunggal, nama `{request_no}.{ext}`, tiap file diaudit `EXPORT_DOWNLOADED`). Item gagal/kedaluwarsa/tidak terlihat tidak ikut; batch yang masih diproses → 409 `EXPORT_NOT_READY`; tidak ada file tersisa → 410 `EXPORT_EXPIRED`; hanya pemilik batch dengan `nscmf.export.bulk` + `nscmf.export`. Test: `tests/Feature/Export/ExportTest.php`, `BulkExportPanel.test.ts`. 12 §71/§133 disinkronkan.

<a id="g05"></a>

## G05 — Angka rate limit login/upload/public

- Sumber: `10 §13/48;12 §133;19 §27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-028](BE-028.md), [BE-101](BE-101.md), [BE-122](BE-122.md), [BE-148](BE-148.md).
- Pihak berwenang: Owner security/operasional; user untuk policy approval.
- Bukti penutupan: Controlled measurements, proposed numeric buckets, abuse/fairness test, accepted config. Test fixture rate bukan production default.
- Status: **CLOSED 2026-09-24** — keputusan didelegasikan pemilik proyek ke pelaksana: nilai sementara ditetapkan sebagai nilai MVP: login 5 gagal/menit per username+IP, upload 120/menit per user, finalize 20/menit per user, validator publik 10/menit per IP (tetap dapat diubah lewat `.env`/`config/security.php`). Dasar: satu record penuh (10 file × 20 MB = 10 × (1 start + 4 chunk + 1 status)) muat dalam 60 dari 120 request/menit; bucket per aktor terbukti tidak saling mengganggu. Test: `tests/Feature/Security/RateLimitBudgetTest.php` (lulus sejak awal; mutasi bucket bersama membuatnya gagal). Pengukuran trafik produksi nyata tetap bisa menyetel ulang angka ini.

<a id="g06"></a>

## G06 — 20 MB exact bytes

- Sumber: `06 §50;10 §73;11A §2/12/25;12 §51/73` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-091](BE-091.md), [BE-092](BE-092.md), [BE-121](BE-121.md), FE-40/41/48.
- Pihak berwenang: Pemilik API/security.
- Keputusan disetujui pemilik proyek pada 2026-09-23: batas file attachment dan PDF validator **20,000,000 bytes inclusive** (decimal 20 MB); zero-byte tetap ditolak; chunk tetap 5 MiB = 5,242,880 bytes. Batas menghitung file bytes saja, bukan keseluruhan multipart HTTP request body.
- Status keputusan: **CLOSED 2026-09-23**; authorities disinkronkan pada `06 §50`, `10 §73`, `11A`, dan `12 §51/73`. Boundary tests limit-1/limit/limit+1 dan zero tetap wajib untuk implementasi dan **NOT RUN**; G06 closure bukan bukti runtime implementation. Proxy/request-body limits tidak diputuskan oleh G06.

<a id="g07"></a>

## G07 — Validation code catalog/example

- Sumber: `12 §12/27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-023](BE-023.md), [BE-064](BE-064.md), [BE-062](BE-062.md), [BE-076](BE-076.md).
- Pihak berwenang: Pemilik API.
- Bukti penutupan: Catalog uses VALIDATION_FAILED while example NSCMF_VALIDATION_FAILED; exact code resolution approved. FE status422+errors tetap robust tanpa menerima false success.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: `VALIDATION_FAILED` di semua endpoint; 12 §7.4.1/§27 disinkronkan.

<a id="g08"></a>

## G08 — Disposable browser startup guard

- Sumber: `16 §35;playwright.config.ts;tests/TestCase.php` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-005](BE-005.md).
- Pihak berwenang: Pelaksana testing dalam scope approved; human review.
- Bukti penutupan: Served process guard identity/host/DB/testing/storage, CI fixture lifecycle; negative unsafe target abort sebelum reset/mutation. Bukan meminta izin reset development DB.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g09"></a>

## G09 — Payload admin/temp-password/Reopen belum exact

- Sumber: `12 §40/78/80–96` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-037](BE-037.md), [BE-035](BE-035.md), [BE-078](BE-078.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan keputusan: `12 §40` menetapkan exact Reopen request allowlist (`record_version`, `reason`, `destination_status`) dan destination enum `REVISION_REQUIRED|PENDING_REVIEW`; body administrasi dan temporary-password tetap ditetapkan di `12 §78` dan `§96.2`. Runtime permission/reauth/error fixtures dan implementasi tetap menjadi evidence scope task masing-masing; pembaruan authority ini tidak menutupnya.
- Status: **CLOSED 2026-09-22 (keputusan/authority)** oleh pemilik proyek setelah persetujuan eksplisit `Setujui destination_status (disarankan)`. Reopen (BE-078) kini memiliki destination key dan payload exact; keputusan administrasi dan temporary-password tetap berlaku.

<a id="g10"></a>

## G10 — Official binary dan cell/control mapping

- Sumber: `19 T47/T48;11 §41;14 §66–70` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-104](BE-104.md), [BE-105](BE-105.md), [BE-106](BE-106.md).
- Pihak berwenang: Pemilik workbook/produk dan reviewer mapping.
- Bukti penutupan: Actual private official NSCMF-Form-3.0.xlsx, provenance/hash/version/mapping; all field/control inspection. Tidak mengarang registry/hash/cells.
- Status: **CLOSED 2026-09-24**: workbook resmi diberikan pemilik proyek (SHA-256 `731e1fa0…8a45`), inventaris dan mapping `nscmf-form-3.0/v1` di `docs/template-mapping.md`. Keputusan pemilik: setiap nilai ditulis tepat di sel isian bawaan template (sel kiri-atas merge atau sel pertama garis isian); diuji otomatis terhadap workbook di `tests/Feature/Export/ExportTest.php`.

<a id="g11"></a>

## G11 — Notifikasi provider/behavior

- Sumber: `19 §27;02 §26` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-148](BE-148.md).
- Pihak berwenang: Pemilik produk.
- Bukti penutupan: Deferred; tidak menambah email/push/socket/notification center. Reopen hanya bila user memberi requirement; tidak memblokir current MVP feedback.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g12"></a>

## G12 — Completion/resume initial setup

- Sumber: `01 §7;03 §4–8;07 §16;11 §12` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-042](BE-042.md), [BE-043](BE-043.md).
- Pihak berwenang: Pemilik produk/API/schema.
- Bukti penutupan: Define readiness/complete/resume source without invented setup_completed DB column; signing readiness later tidak otomatis memblokir Phase2 setup tanpa authority.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: readiness dihitung dari data tanpa kolom baru (12 §96.1).

<a id="g13"></a>

## G13 — Production Team data dan official Request No SOP

- Sumber: `17 §17/97–99;19 §27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-046](BE-046.md), [BE-133](BE-133.md), [BE-148](BE-148.md).
- Pihak berwenang: Operator organisasi/pemilik produk.
- Bukti penutupan: Production Team operator-controlled, no assumed master seed. Provisional approved numbering tetap berlaku; SOP baru perlu synchronized approval, bukan blocker Draft.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g14"></a>

## G14 — users.assign_team versus teams.assign_users

- Sumber: `04 §16/18;12 §87` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-037](BE-037.md), [BE-040](BE-040.md).
- Pihak berwenang: Pemilik RBAC/API.
- Bukti penutupan: Explicit operation mapping AND/OR serta positive/negative tests; jangan tambah persyaratan permission sendiri.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: `users.assign_team` ATAU `teams.assign_users` (04 §16, 12 §87).

<a id="g15"></a>

## G15 — ClamAV/worker finite timeout dan retry budget

- Sumber: `14 §48/60–65;19 §27;20 §17` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-090](BE-090.md), [BE-101](BE-101.md), [BE-148](BE-148.md).
- Pihak berwenang: Pelaksana integration + reviewer security/owner operasional.
- Bukti penutupan: Real clamd readiness/definitions, measured finite timeout, job timeout/retry_after consistency and failure evidence. Existing90 scaffold bukan measured policy.
- Status: **CLOSED 2026-09-24** — keputusan didelegasikan pemilik proyek ke pelaksana, berdasar pengukuran lokal (macOS arm64, clamd 1.4, LibreOffice 26.8): scan 20 MB ≤1,9 s (dingin), arsip padat ±250 MB terurai 6,6 s; satu pass render ±1,7 s; signing ±0,01 s. Nilai: scan 30 s (seluruh balasan clamd dibatasi satu deadline), render 30 s per pass (turun dari 60 s: ekspor PDF = 2 pass + signing harus < job 80 s), job finalisasi 75 s/3 percobaan, job ekspor 80 s/2 percobaan, `retry_after` 90 s. Temuan yang diperbaiki: clamd yang mengirim byte tanpa henti dulu tidak terpotong; renderer macet melempar exception di luar kontrak. Test: `tests/Integration/Operations/WorkerTimeBudgetTest.php`. Ulangi pengukuran di server Linux saat rilis.

<a id="g16"></a>

## G16 — DG-01 LibreOffice qualification/fonts/tolerance

- Sumber: `19 DG-01;14 §71–76;20 §11` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-114](BE-114.md), [BE-115](BE-115.md).
- Pihak berwenang: Pemilik output + reviewer fidelity.
- Bukti penutupan: Real official-workbook output all pages/fonts/native controls; approved visual tolerance + finite timeout. Material fail→user decision next renderer, no weakened fidelity/prebuilt alternatives.
- Status: **CLOSED 2026-09-24**: LibreOffice 26.8 merender kedua form tepat 1 halaman A4, checkbox native tampil, ±2 s (timeout 60 s). Keputusan pemilik: font harus sama persis dengan template. Calibri (salinan berlisensi Microsoft Office) dan Aptos (unduhan resmi Microsoft) disediakan lewat `NSCMF_RENDERER_FONTS_PATH`; test render memastikan PDF hanya memuat Calibri/Aptos Narrow/Aptos Display, tanpa substitusi. File font tidak masuk repo. Menunggu keputusan pemilik: pasang font Aptos atau terima substitusi.

<a id="g17"></a>

## G17 — DG-02 signer dependency/key/rotation

- Sumber: `19 DG-02;14 §77–83;20 §12/17` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-116](BE-116.md), [BE-117](BE-117.md), [BE-118](BE-118.md).
- Pihak berwenang: User dependency approval + human security reviewer/operator.
- Bukti penutupan: Concrete library/key-container/passphrase injection/rotation/nonprod real sign+verify; public cert retention. No public CA/Adobe/TSA requirement.
- Status: **CLOSED 2026-09-23** oleh pemilik proyek: `ddn/sapp` (LGPL, tanpa dependency), PKCS#12 di disk privat, passphrase dari env, rotasi via `nscmf:signing:activate`; sign+verify nyata non-prod lulus. Penyimpanan kunci produksi tetap keputusan operator saat rilis. 08 §69, 12 §133, 14 disinkronkan.

<a id="g18"></a>

## G18 — Stale runtime workspace eligibility

- Sumber: `14 §52/89/98–100` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-130](BE-130.md).
- Pihak berwenang: Pelaksana runtime + review keamanan; user bila kebijakan baru.
- Bukti penutupan: Define lifecycle/ownership marker for active vs abandoned workspace using real jobs; no invented product retention hours; cleanup test guarantees active/final/authoritative data protected.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g19"></a>

## G19 — Visibilitas resource record NSCMF

- Sumber: `04 §2/§21;05 §32;12 §17/§47` — "resource authorization" tidak dirinci.
- Dampak/task owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-066](BE-066.md), [BE-086](BE-086.md), [BE-087](BE-087.md).
- Pihak berwenang: Pemilik proyek.
- Bukti penutupan: aturan tertulis di 12 §17.1 dan test visibilitas.
- Status: **CLOSED 2026-09-22** oleh pemilik proyek: record yang belum pernah Submit (DRAFT/CANCELLED) hanya terlihat oleh pemilik; record yang sudah pernah Submit terlihat oleh semua pemegang izin baca terkait; tanpa Team, tanpa pengecualian Superadmin (12 §17.1).

<a id="g20"></a>

## G20 — Arsip Cancelled vs visibilitas record never-submitted

- Sumber: `17 §36, §49, §981` vs `12 §17.1` (record DRAFT/CANCELLED hanya terlihat pemilik).
- Status: **CLOSED 2026-09-24** — keputusan pemilik: DEMO-CHG-008 dibuat, dibatalkan dan diarsipkan oleh Protected Superadmin sebagai pemiliknya. Karena pembuatan record butuh Team aktif (17 §18), data demo memberi Superadmin Demo Team Gamma (hanya di data demo lokal).

<a id="g21"></a>

## G21 — Audit E2E 2026-09-24: navigasi, akses ulang ekspor, alasan bermakna

- Sumber: audit menyeluruh spesifikasi terhadap BE/FE setelah laporan pemilik (requester tidak bisa merevisi record yang dikembalikan).
- Status: **CLOSED 2026-09-24** oleh pemilik proyek:
  1. Akses ulang ekspor lewat endpoint baru `GET /nscmf/{record}/exports` (12 §69.1): ekspor milik actor untuk record itu dalam jendela retensi 168 jam, terbaru dulu.
  2. "5 karakter bermakna" (06 §54, 12 §39) = 5 karakter selain whitespace.
- Diterapkan sekaligus, tanpa keputusan baru, karena sudah tertulis di spesifikasi:
  - visibilitas 12 §17.1 untuk semua aksi (izin aksi saja tidak membuka record);
  - guard tujuan Reopen di service;
  - target date yang diubah selama revisi wajib hari ini/ke depan saat Resubmit (06 §40);
  - flag `is_protected_superadmin` milik user sendiri di shared props (12 §100) untuk menu 07 §51.
- Temuan audit yang **tidak** diubah karena sudah sesuai: `results` di Draft save saat PENDING_REVIEW tetap `422` (12 §26, checklist 12); Superadmin non-pemilik tidak punya aksi pada REVISION_REQUIRED (05 §9, §30; 04 §10).
- Bukti: `handoff/2026-09-24-e2e-gap-closure.md`.

Removed concerns dari19A/20 tidak menjadi gap: HA/Redis/DR/backup/load/SLA architecture/automatedCD/publicCA/multi-server. Actual hostname/provider/Linux/path baru dicatat ketika deployment sungguhan diperintahkan; tidak memilih server sekarang.
