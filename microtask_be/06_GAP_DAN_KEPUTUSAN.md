# Gap dan keputusan

Semua item **OPEN**, kecuali keputusan yang memang deferred/nonblocking disebut eksplisit. Status task tetap PLANNED; “gap” tidak berarti semua pekerjaan berhenti. Task owner memberi artefak reviewable lalu meminta keputusan hanya saat dibutuhkan. Penyusunan backlog tidak menyinkronkan authority atau memilih nilai secara diam-diam.

<a id="g01"></a>

## G01 — Route/render setup, mandatory-password dan result-only

- Sumber: `07 §14/16;12 §44/78/109/114` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-035](BE-035.md), [BE-042](BE-042.md), [BE-075](BE-075.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan: Exact GET/render, navigation/redirect, eligibility, fixtures; approval+synchronized12/07 jika menambah route.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

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
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g04"></a>

## G04 — Bulk wire/partial failure/packaging

- Sumber: `12 §71;19 §27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-111](BE-111.md), [BE-112](BE-112.md).
- Pihak berwenang: Pemilik produk/API.
- Bukti penutupan: Approved IDs/selection/limits/response/item errors/per-record denial/packaging semantics. Tidak ZIP/select-all/server limit atau partial behavior tebakan.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g05"></a>

## G05 — Angka rate limit login/upload/public

- Sumber: `10 §13/48;12 §133;19 §27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-028](BE-028.md), [BE-101](BE-101.md), [BE-122](BE-122.md), [BE-148](BE-148.md).
- Pihak berwenang: Owner security/operasional; user untuk policy approval.
- Bukti penutupan: Controlled measurements, proposed numeric buckets, abuse/fairness test, accepted config. Test fixture rate bukan production default.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g06"></a>

## G06 — 20 MB exact bytes

- Sumber: `06 §50;12 §51/73` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-091](BE-091.md), [BE-092](BE-092.md), [BE-121](BE-121.md).
- Pihak berwenang: Pemilik API/security.
- Bukti penutupan: Approved byte limit shared attachment/validator/proxy/FE, limit-1/limit/limit+1+zero tests; fixed5MiB tidak berubah.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g07"></a>

## G07 — Validation code catalog/example

- Sumber: `12 §12/27` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-023](BE-023.md), [BE-064](BE-064.md), [BE-062](BE-062.md), [BE-076](BE-076.md).
- Pihak berwenang: Pemilik API.
- Bukti penutupan: Catalog uses VALIDATION_FAILED while example NSCMF_VALIDATION_FAILED; exact code resolution approved. FE status422+errors tetap robust tanpa menerima false success.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

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
- Bukti penutupan: Explicit allowlists, nested IDs, destination key, response/errors, permission+reauth fixtures; no schema-to-body mass assignment.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g10"></a>

## G10 — Official binary dan cell/control mapping

- Sumber: `19 T47/T48;11 §41;14 §66–70` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-104](BE-104.md), [BE-105](BE-105.md), [BE-106](BE-106.md).
- Pihak berwenang: Pemilik workbook/produk dan reviewer mapping.
- Bukti penutupan: Actual private official NSCMF-Form-3.0.xlsx, provenance/hash/version/mapping; all field/control inspection. Tidak mengarang registry/hash/cells.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

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
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

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
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g15"></a>

## G15 — ClamAV/worker finite timeout dan retry budget

- Sumber: `14 §48/60–65;19 §27;20 §17` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-090](BE-090.md), [BE-101](BE-101.md), [BE-148](BE-148.md).
- Pihak berwenang: Pelaksana integration + reviewer security/owner operasional.
- Bukti penutupan: Real clamd readiness/definitions, measured finite timeout, job timeout/retry_after consistency and failure evidence. Existing90 scaffold bukan measured policy.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g16"></a>

## G16 — DG-01 LibreOffice qualification/fonts/tolerance

- Sumber: `19 DG-01;14 §71–76;20 §11` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-114](BE-114.md), [BE-115](BE-115.md).
- Pihak berwenang: Pemilik output + reviewer fidelity.
- Bukti penutupan: Real official-workbook output all pages/fonts/native controls; approved visual tolerance + finite timeout. Material fail→user decision next renderer, no weakened fidelity/prebuilt alternatives.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g17"></a>

## G17 — DG-02 signer dependency/key/rotation

- Sumber: `19 DG-02;14 §77–83;20 §12/17` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-116](BE-116.md), [BE-117](BE-117.md), [BE-118](BE-118.md).
- Pihak berwenang: User dependency approval + human security reviewer/operator.
- Bukti penutupan: Concrete library/key-container/passphrase injection/rotation/nonprod real sign+verify; public cert retention. No public CA/Adobe/TSA requirement.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

<a id="g18"></a>

## G18 — Stale runtime workspace eligibility

- Sumber: `14 §52/89/98–100` (lihat [inventaris sumber](11_INVENTARIS_SUMBER.md)).
- Dampak/task owner: [BE-130](BE-130.md).
- Pihak berwenang: Pelaksana runtime + review keamanan; user bila kebijakan baru.
- Bukti penutupan: Define lifecycle/ownership marker for active vs abandoned workspace using real jobs; no invented product retention hours; cleanup test guarantees active/final/authoritative data protected.
- Status: OPEN; approval/measurement/commit sumber belum ada dalam paket ini.

Removed concerns dari19A/20 tidak menjadi gap: HA/Redis/DR/backup/load/SLA architecture/automatedCD/publicCA/multi-server. Actual hostname/provider/Linux/path baru dicatat ketika deployment sungguhan diperintahkan; tidak memilih server sekarang.
