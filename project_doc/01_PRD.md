# Product Requirements Document (PRD)

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PRD-001  
> **Document Order:** 01 / 20  
> **Status:** Draft — Synchronized through System Architecture  
> **Repository:** `rezkym/nscmf_velo`  
> **Primary Business Reference:** NSCMF Form 3.0 (Excel)  
> **Product Flow Reference:** NSCMF FigJam proposal  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

PRD ini mendefinisikan produk yang dibangun, masalah yang diselesaikan, user utama, scope, functional requirements, product boundaries, dan acceptance intent pada level produk.

Dokumen ini bukan source of truth untuk permission detail, state machine, field validation, UI behavior detail, database, API, security implementation, maupun deployment. Detail tersebut didefinisikan pada dokumen lanjutan.

Urutan dokumentasi proyek:

1. PRD
2. Business Rules
3. User Flow
4. RBAC / Permission Matrix
5. State / Status Flow
6. Validation Rules
7. UI/UX Specification
8. Tech Stack Specification
9. System Architecture
10. Security Rules
11. ERD / Database Schema
12. API Contract
13. Project Structure
14. Environment Specification
15. Coding Rules / AGENTS.md
16. Testing Specification
17. Seed / Dummy Data Specification
18. Definition of Done
19. Task / Implementation Plan
20. Deployment Architecture

---

## 2. Executive Summary

NSCMF Digital Form & Workflow System adalah aplikasi web internal **single-organization** untuk mengganti proses NSCMF yang berbasis file Excel menjadi record digital yang terstruktur, traceable, dapat direview, di-approve, dicari kembali, diaudit, diarsipkan tanpa delete, dan diekspor.

Aplikasi web mempertahankan makna bisnis NSCMF Form 3.0 tetapi UI operasional tidak wajib menyalin layout spreadsheet secara pixel-perfect. **Khusus output XLSX/PDF, official NSCMF XLSX template menjadi visual/export source of truth dan hasil export harus mempertahankan template tersebut secara exact; sistem hanya mengisi/mengganti field serta native control state yang dipetakan.**

User dapat memilih output **XLSX** atau **PDF**. Export diproses asynchronous. Generated artifact tersedia untuk authorized re-download selama **168 jam / 7 hari**, kemudian dibersihkan otomatis. XLSX tidak memerlukan cryptographic document signature. PDF yang merepresentasikan snapshot `APPROVED` wajib mendapat cryptographic PDF signature dengan logical signer identity **System/Organization**; certificate/private-key implementation dikunci lebih lanjut pada Security Rules.

Dua form family utama:

- **NSCMF - Activation** — instalasi / provisioning;
- **NSCMF - Change** — maintenance / perubahan layanan atau environment yang sudah berjalan.

Core product journey:

```text
Login
→ Dashboard
→ Create New Form
→ pilih Form Family/Subtype
→ DRAFT
→ PENDING_REVIEW
→ PENDING_APPROVAL
→ APPROVED
→ History / Export
```

Dengan branch:

- Cancel Draft;
- Return for Revision;
- unlimited revision/resubmission;
- Reviewer/Approver Reject;
- authorized Reopen/Revert;
- Archive/Unarchive tanpa mengubah business status;
- detailed audit trail;
- separate access audit evidence;
- scoped shared Reviewer/Approver pools.

---

## 3. Problem Statement

Workflow spreadsheet membuat NSCMF bergantung pada file individual sehingga data, status, sign-off, revision history, dan retrieval tidak berada pada satu sistem terpusat.

Produk harus:

1. membuat NSCMF tanpa membuat file Excel baru secara manual;
2. menjaga field dan konteks bisnis NSCMF Form 3.0;
3. menyediakan Request → Review → Approval yang jelas;
4. mendukung revision tanpa kehilangan history;
5. menyimpan record terpusat;
6. menyediakan History dan detail record;
7. menyediakan single/bulk export dengan exact-template XLSX/PDF fidelity;
8. menyediakan tamper-evident cryptographic signing untuk Approved PDF output;
9. mencatat viewer/access evidence terpisah dari modifier/workflow business timeline;
10. mencegah hard delete NSCMF;
11. menyediakan role/scope configuration yang dapat disesuaikan organisasi.

---

## 4. Product Vision

> Menjadi satu source of truth internal untuk membuat, memproses, menelusuri, mengaudit, dan mengekspor NSCMF tanpa menghilangkan proses bisnis inti dari NSCMF Form 3.0.

---

## 5. Product Principles

### 5.1 Preserve Business Meaning
Field dan konteks bisnis workbook harus dipertahankan.

### 5.2 Structured Record Is the Source of Truth
Record aplikasi adalah sumber data utama; export adalah output.

### 5.3 Traceability by Default
Persisted changes, workflow actions, access evidence yang diwajibkan, revision cycles, dan actor/timestamp penting harus dapat ditelusuri.

### 5.4 Simple Operational Product
Produk bukan generic BPM, generic form builder, atau full document-management platform.

### 5.5 Configurable Where Organization-Specific
Role mapping, Unit/Division mapping, dan scope dapat disesuaikan tanpa melemahkan invariant.

### 5.6 No Silent Assumptions
Hal yang belum diputuskan harus tetap TBD. Rule sementara yang sengaja dipakai untuk MVP harus dinyatakan sebagai **PROVISIONAL**, bukan disajikan sebagai SOP resmi perusahaan.

### 5.7 Export Template Fidelity
UI web MAY mengoptimalkan spreadsheet menjadi interface yang lebih usable, tetapi exported XLSX/PDF MUST mempertahankan official XLSX template representation secara exact. Product MUST NOT menurunkan fidelity requirement hanya karena renderer/library tertentu lebih mudah digunakan.

### 5.8 Export Integrity
Cryptographic PDF signature pada Approved PDF adalah additional integrity evidence untuk mendeteksi modification setelah signing; signature tersebut tidak menggantikan business `Approved By` actor.

---

## 6. Product Users

### Protected Superadmin
Seeded protected authority tertinggi pada standard template, global visibility, initial setup, dan default administrative authority. Tidak dapat delete/soft-delete/disable/downgrade.

### Requester
Membuat dan mengelola own NSCMF sesuai current state. Untuk Change, Requester/owner juga menjadi default actor untuk narrow `Result of Changes` capture selama `PENDING_REVIEW` melalui permission khusus.

### Reviewer
Memproses record berdasarkan Unit/Division scope. Reviewer tidak dipilih eksklusif; semua eligible Reviewer dalam scope dapat melihat dan bertindak sesuai state.

### Approver
Final approval berdasarkan configured Approval Scope. Scope dapat mencakup beberapa Unit/Division. Approval tidak eksklusif; satu eligible Approver yang berhasil Approve cukup menjadi final approver untuk iteration tersebut.

### Multi-Role User
Satu user dapat memiliki lebih dari satu role. Current requirement tidak mewajibkan segregation of duty.

---

## 7. Initial Setup Scope

First run menggunakan protected Superadmin dan Setup Wizard.

Wizard minimal mencakup:

1. role configuration: **Use Role Template** atau **Manual Role Configuration**;
2. Unit/Division: predefined template/mapping atau manual;
3. configure Reviewer/Approver scope;
4. menyelesaikan initial organization setup.

Template tetap dapat diubah kemudian oleh authorized administrator kecuali protected invariants. Core system settings tetap Superadmin-only.

Application model saat ini = **single organization / single installation**. Unit/Division adalah organizational scope di dalam organization yang sama, bukan tenant boundary.

---

## 8. Confirmed MVP Scope

MVP mencakup:

1. Login/logout; tanpa self-registration.
2. Protected seeded Superadmin.
3. Initial setup wizard.
4. User administration.
5. Role template/manual configuration.
6. Unit/Division template/manual configuration.
7. Multi-role assignment.
8. Dashboard sederhana.
9. CTA `Create New Form`.
10. Direct History access.
11. Activation dan Change forms.
12. Form subtype selection.
13. Auto/manual numbering mode per record.
14. Draft + autosave + Save Draft.
15. Optional attachment input.
16. Cancel hanya pada Draft sebelum first Submit.
17. Shared/non-exclusive Review.
18. Multiple Reviewer contributors.
19. Return for Revision.
20. Unlimited revision cycles.
21. Reviewer Reject.
22. Shared/non-exclusive Approval.
23. Approver Return to Reviewer.
24. Approver Return to Requester dan wajib Review ulang setelah Resubmit.
25. Approver Reject.
26. Satu final approval dari satu eligible Approver.
27. Reopen/Revert untuk Rejected/Approved oleh protected Superadmin atau actor dengan explicit `nscmf.reopen` + valid visibility/scope.
28. Detailed audit/change history.
29. History + detail + timeline.
30. Scoped visibility.
31. User-facing Export XLSX dan Export PDF; generated output MUST preserve official NSCMF XLSX template exactly while filling/replacing mapped fields/control states.
32. Seluruh export diproses asynchronous dan bound ke deterministic record snapshot/version.
33. Generated export artifact tersedia privately untuk authorized re-download selama 168 jam / 7 hari, lalu dibersihkan otomatis.
34. Approved PDF output mendapat cryptographic signature dengan logical signer identity System/Organization; XLSX tidak melalui PDF signing flow.
35. Viewer/access evidence dipisahkan dari business mutation/workflow timeline.
36. Archive/Unarchive sebagai administrative lifecycle tanpa hard delete.
37. No hard delete NSCMF.
38. Emergency Change tetap Review + Approval.
39. Change `Result of Changes` diselesaikan sebelum final Approval tanpa membuat state execution/result baru.
40. Narrow Change Result capture oleh Requester/owner pada `PENDING_REVIEW` melalui `nscmf.change.result.edit` tanpa membuka general submitted form editing.
41. Service Impact Change bersifat multi-select dan `Other` membutuhkan description.
42. Validation dibedakan antara Draft persistence dan workflow gate; incomplete Draft tetap dapat disimpan.
43. Technology baseline menggunakan Laravel 13 + PHP 8.5 + Vue 3 + TypeScript + Inertia 3 + shadcn-vue + MySQL 8.4 LTS sesuai `08_Tech_Stack_Specification.md`.
44. Testing infrastructure (Pest + Vitest + Playwright + static-analysis/quality gates) disiapkan sejak project bootstrap.
45. Hybrid concurrency: workflow transitions memakai short transaction + row-level lock/current-state revalidation; Draft/Revision/Result persistence memakai optimistic version conflict detection.

Notification hook adalah future capability dan bukan MVP blocker.

---

## 9. Non-Goals

MVP tidak ditujukan untuk:

- public/customer portal;
- multi-tenant/multi-organization installation;
- self-registration;
- native mobile app;
- network provisioning automation;
- generic workflow designer;
- generic form builder;
- hard-delete NSCMF;
- notification sebagai blocker core workflow;
- AI guessing untuk business classification;
- exported file sebagai source of truth;
- multi-level approval chain pada requirement saat ini;
- state `UNDER_REVIEW`, `REOPENED`, `ARCHIVED`, `EXECUTION_PENDING`, atau `RESULT_PENDING` sebagai business status current design;
- freehand signature input;
- personal certificate requirement untuk setiap human Approver;
- redesigning the official NSCMF XLSX layout for export;
- accepting approximate PDF layout when exact template fidelity is required;
- treating a digitally signed PDF as impossible to edit; the intended property is tamper detection through signature invalidation.

---

## 10. Form Families

### 10.1 NSCMF - Activation

Business context: instalasi/provisioning.

Subtype:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

Main information groups:

- Service Information;
- Reference;
- existing/new service data;
- Service ID/status/description/location;
- Installation Date / SLA;
- NOC configuration;
- IP/DNS/routing;
- bandwidth;
- domain/email/hosting;
- onsite/customer/POP configuration;
- Request/Review/Approved sign-off.

Required/conditional/optional classification mengikuti `06_Validation_Rules.md` dan tidak diturunkan hanya dari keberadaan field pada Excel.

### 10.2 NSCMF - Change

Business context: maintenance/perubahan existing service/environment.

Subtype:

- Maintenance;
- Upgrade;
- Emergency.

#### Section A — Purpose of Changes

`Purpose of Changes` adalah section, bukan option.

Input areas:

- Facing Challenges (Upgrade / Emergency);
- Maintenance Purpose;
- Identified Problem (Please elaborate).

`Service Impact` menyediakan:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Confirmed validation treatment:

- Service Impact adalah **multi-select**;
- minimum satu impact dipilih pada Submit/Resubmit;
- jika `Other` dipilih, `Other Impact Description` wajib.

Field lain:

- Maintenance (Improvement) Plan;
- Target KPI;
- Target date of execution;
- Monitoring period;
- Rollback scenario;
- Maintenance Announcement.

Source workbook memiliki announcement timing:

- 1 week before;
- 2 weeks before;
- 2 days before (emergency).

Exact warning/error behavior mengikuti `06_Validation_Rules.md`.

#### Section B — Result of Changes

Mencakup:

- Result summary;
- Performance information;
- Status.

Confirmed workflow treatment:

- section ini tidak otomatis wajib lengkap pada first Submit hanya karena tersedia di template;
- first Submit dapat memiliki zero Result rows;
- row Result yang sudah mulai diisi harus internally complete sesuai Validation Rules;
- sebelum Reviewer `Forward to Approval`, Change membutuhkan minimal satu complete Result row;
- lima row pada source template adalah capacity, bukan mandatory count;
- pengisian Result tidak menambah business state baru;
- selama `PENDING_REVIEW`, Requester/owner dengan `nscmf.change.result.edit` dapat mengisi Result melalui narrow result-only capability;
- planning/submitted fields lain tetap locked;
- persisted Result changes diaudit.

### 10.3 Upgrade Classification

- installation/provisioning context → Activation;
- maintenance/existing-service context → Change.

System tidak boleh memilih hanya berdasarkan keyword `Upgrade`.

---

## 11. Functional Requirements

### Authentication / Administration

**FR-AUTH-001** Valid user dapat login/logout.  
**FR-AUTH-002** Tidak ada self-registration.  
**FR-ADM-001** Seeded protected Superadmin dibuat saat initial seeding.  
**FR-ADM-002** Initial setup menggunakan wizard.  
**FR-ADM-003** Authorized admin dapat mengelola normal user, role, Unit/Division, dan eligible scope sesuai RBAC.  
**FR-ADM-004** Protected Superadmin tidak dapat delete/disable/downgrade.

### Dashboard / Creation

**FR-DASH-001** Dashboard menjadi landing page setelah setup selesai.  
**FR-DASH-002** Dashboard menyediakan `Create New Form` dan History entry point.  
**FR-FORM-001** User memilih family → subtype → numbering mode.  
**FR-FORM-002** Attachment input tersedia dan optional.  
**FR-FORM-003** Automatic/manual Request No mengikuti validation current/provisional di `06_Validation_Rules.md`.

### Draft

**FR-DRAFT-001** New record berada pada `DRAFT`.  
**FR-DRAFT-002** Own Draft editable.  
**FR-DRAFT-003** Autosave + Save Draft tersedia dan persisted changes diaudit.  
**FR-DRAFT-004** Draft boleh incomplete.  
**FR-DRAFT-005** Cancel hanya selama `DRAFT` sebelum first Submit; hasilnya `CANCELLED` permanent.

### Submit / Review

**FR-SUB-001** Valid `DRAFT` Submit → `PENDING_REVIEW`.  
**FR-SUB-002** Setelah Submit, normal Requester editing locked kecuali narrow authorized Change Result capture.  
**FR-REV-001** Semua eligible Reviewer dalam matching scope melihat `PENDING_REVIEW`.  
**FR-REV-002** Membuka record tidak mengubah state dan tidak menciptakan exclusive owner.  
**FR-REV-003** Multiple Reviewer dapat berpartisipasi dan seluruh activity dipertahankan.  
**FR-REV-004** Reviewer dapat Forward → `PENDING_APPROVAL`, Return → `REVISION_REQUIRED`, atau Reject → `REJECTED`.  
**FR-REV-005** Reviewer Return dan Reviewer Reject membutuhkan mandatory reason sesuai Validation Rules.

### Revision

**FR-REVISION-001** `REVISION_REQUIRED` mengaktifkan Requester editing.  
**FR-REVISION-002** Resubmit selalu → `PENDING_REVIEW`.  
**FR-REVISION-003** Revision cycle unlimited dan full history preserved.

### Approval

**FR-APR-001** Semua eligible Approver dalam matching Approval Scope dapat melihat `PENDING_APPROVAL`.  
**FR-APR-002** Approver dapat Approve → `APPROVED`, Return Reviewer → `PENDING_REVIEW`, Return Requester → `REVISION_REQUIRED`, atau Reject → `REJECTED`.  
**FR-APR-003** Satu valid final Approve cukup; `Approved By` adalah actor yang berhasil melakukan transition.  
**FR-APR-004** Emergency tidak bypass Review/Approval.  
**FR-APR-005** Change Result-of-Changes applicable validation harus lulus sebelum masuk `PENDING_APPROVAL`.  
**FR-APR-006** Approver Return/Reject membutuhkan mandatory reason; Approve comment optional.

### Reopen / Revert

**FR-REOPEN-001** Hanya `REJECTED` dan `APPROVED` yang Reopen-eligible.  
**FR-REOPEN-002** Actor = protected Superadmin atau explicit `nscmf.reopen`, dengan valid visibility/scope.  
**FR-REOPEN-003** Mandatory reason + selected destination.  
**FR-REOPEN-004** Destination hanya `REVISION_REQUIRED` atau `PENDING_REVIEW`.  
**FR-REOPEN-005** Reopen ke `DRAFT` atau `PENDING_APPROVAL` dilarang.  
**FR-REOPEN-006** Previous Reject/Approval evidence tetap dipertahankan.  
**FR-REOPEN-007** Archived record harus Unarchive terlebih dahulu sebelum Reopen.

### History / Export / Archive

**FR-HIS-001** Visibility mengikuti ownership/scope/RBAC.  
**FR-HIS-002** Legitimate viewer dapat melihat business timeline siapa melakukan perubahan/workflow action.  
**FR-HIS-003** Viewer/access/download evidence disimpan melalui separate access-audit concern sehingga routine View tidak memenuhi business timeline.  
**FR-EXP-001** View implies export; bulk export check per record.  
**FR-EXP-002** User dapat memilih `Export XLSX` atau `Export PDF`.  
**FR-EXP-003** Official XLSX template adalah visual/export source of truth. Generated XLSX/PDF MUST preserve template exactly dan hanya mengisi/mengganti mapped fields/native control states.  
**FR-EXP-004** PDF MUST dirender dari filled XLSX/template representation, bukan separate HTML redesign.  
**FR-EXP-005** Renderer MUST lulus golden exact-fidelity acceptance sebelum digunakan production.  
**FR-EXP-006** Seluruh single/bulk export generation diproses asynchronous dan harus merepresentasikan deterministic record snapshot/version.  
**FR-EXP-007** READY export artifact tersedia privately untuk authorized re-download selama 168 jam / 7 hari; setelah expiry binary dibersihkan otomatis.  
**FR-EXP-008** PDF dari snapshot `APPROVED` wajib mendapatkan cryptographic PDF signature dengan logical signer identity System/Organization. XLSX tidak melalui signing flow tersebut.  
**FR-EXP-009** Jika mandatory Approved-PDF signing gagal, export gagal; system MUST NOT memberikan unsigned PDF sebagai silent fallback.  
**FR-ARC-001** No hard delete NSCMF.  
**FR-ARC-002** Archive hanya pada `APPROVED`, `REJECTED`, `CANCELLED`.  
**FR-ARC-003** Archive adalah independent flag; business status tidak berubah.  
**FR-ARC-004** Actor memerlukan `nscmf.archive` + valid visibility.  
**FR-ARC-005** Archive dan Unarchive membutuhkan mandatory reason sesuai Validation Rules.  
**FR-ARC-006** Unarchive tidak mengubah business status.

### Attachment

**FR-ATT-001** Attachment optional.  
**FR-ATT-002** Current MVP limit = maksimum 10 files per record dan 20 MB per file.  
**FR-ATT-003** Allowed file type baseline dan executable/script exclusions mengikuti `06_Validation_Rules.md`.  
**FR-ATT-004** Upgrade/Emergency Change tanpa attachment menghasilkan warning, bukan blocking error.

### Audit / Concurrency

**FR-AUD-001** Every persisted business change dan workflow transition diaudit.  
**FR-AUD-002** Viewer/access evidence dan modifier/workflow actor dapat dibedakan.  
**FR-AUD-003** Historical cycles tidak boleh overwrite.  
**FR-AUD-004** Business Audit, Access Audit, dan technical logs memiliki concern terpisah; technical logs bukan authoritative business audit.  
**FR-CONC-001** Shared Reviewer/Approver action wajib revalidate current state server-side; stale conflicting action ditolak.  
**FR-CONC-002** Workflow/lifecycle transition menggunakan short transaction + row-level locking/current-state revalidation.  
**FR-CONC-003** Draft/Revision/Result persistence menggunakan optimistic version conflict detection agar stale write tidak silently overwrite data baru.

---

## 12. Product-Level Workflow

```text
DRAFT
  |-- Cancel ------------------------> CANCELLED
  |
  +-- Submit ------------------------> PENDING_REVIEW
                                         |-- Return --> REVISION_REQUIRED
                                         |                |-- Resubmit --> PENDING_REVIEW
                                         |-- Reject --> REJECTED
                                         +-- Forward --> PENDING_APPROVAL
                                                           |-- Return Reviewer --> PENDING_REVIEW
                                                           |-- Return Requester -> REVISION_REQUIRED
                                                           |-- Reject -----------> REJECTED
                                                           +-- Approve ----------> APPROVED
```

Recovery:

```text
REJECTED / APPROVED
  -- authorized Reopen(reason, destination) --> REVISION_REQUIRED or PENDING_REVIEW

CANCELLED
  -- no reopen --> permanent terminal
```

Archive:

```text
business_status unchanged
is_archived false <-> true
```

Exact lifecycle detail is authoritative in `05_State_Status_Flow.md`.

---

## 13. Visibility Model

| Actor Context | Visibility Intent |
|---|---|
| Requester | Own records |
| Reviewer | Assigned Unit/Division scope |
| Approver | Configured Approval Scope; may be multi-unit |
| Protected Superadmin | All NSCMF |
| Multi-role user | Additive union according to permission/scope |

---

## 14. Non-Functional Product Requirements

**NFR-001 Reliability** — persisted data tidak hilang karena normal navigation.  
**NFR-002 Consistency** — form detail, History, audit, state, dan export konsisten.  
**NFR-003 Server-Side Authorization** — UI hiding bukan authorization boundary.  
**NFR-004 Desktop-First** — primary target internal desktop browser.  
**NFR-005 Traceability** — critical activity dapat ditelusuri.  
**NFR-006 Maintainability** — MVP tidak dibuat lebih kompleks dari kebutuhan.  
**NFR-007 Testability** — backend/frontend/E2E/export testing infrastructure tersedia sejak bootstrap.  
**NFR-008 Export Fidelity** — exact-template XLSX/PDF fidelity wajib diuji melalui structural/golden regression tests.  
**NFR-009 Export Integrity** — Approved PDF signing failure tidak boleh menghasilkan unsigned output yang dianggap final.  
**NFR-010 Export Binary Retention** — generated artifact tersedia selama 168 jam/7 hari sebelum automatic cleanup; source record tidak ikut dihapus.  
**NFR-011 Performance Target** — TBD.  
**NFR-012 Availability / General Data Retention** — TBD.

---

## 15. Success Criteria

Stakeholder dapat:

1. login dan menyelesaikan setup;
2. mengelola user/role/scope sesuai permission;
3. membuat Activation/Change;
4. memilih numbering mode;
5. Save Draft/autosave meskipun Draft belum complete;
6. Submit valid record ke `PENDING_REVIEW`;
7. melakukan Review shared/non-exclusive;
8. melakukan unlimited revision cycle;
9. memproses Change Result melalui narrow Requester result-edit capability sebelum final Approval tanpa state tambahan;
10. melakukan single final Approval;
11. menjalankan Return/Reject dengan required reason;
12. Reopen/Revert sesuai authority, mandatory reason, dan destination yang valid;
13. melihat History/business timeline sesuai scope tanpa routine access events memenuhi timeline;
14. memilih export visible record ke XLSX atau PDF yang mempertahankan official template secara exact dan hanya mengisi mapped fields/control states;
15. melihat queued export selesai dan mengunduh ulang READY artifact selama 7 hari;
16. memperoleh cryptographically signed PDF untuk Approved snapshot, tanpa mengubah `Approved By` business actor;
17. Archive/Unarchive dengan mandatory reason tanpa menghapus history atau mengganti business status;
18. memastikan no hard delete dan stale action tidak menghasilkan conflicting transition;
19. menerapkan current field/attachment/numbering validation sesuai `06_Validation_Rules.md`;
20. menjalankan automated backend/frontend/E2E/export regression tests sebagai quality gate.

---

## 16. Confirmed, Provisional, and Deferred

### Confirmed

- single-organization/single-installation model;
- canonical states: `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED`;
- `SUBMITTED`, `REVIEWED`, `REOPENED`, `ARCHIVED` bukan persistent business status;
- autosave + Save Draft; Draft may incomplete;
- multi-role;
- Reviewer/Approver shared/non-exclusive;
- one final eligible Approver sufficient;
- unlimited revision;
- Reopen sources/destinations;
- Cancel permanent;
- Archive eligible states + Unarchive;
- Change Result completed before final Approval without extra state;
- Requester/owner default Change Result editor via `nscmf.change.result.edit` during `PENDING_REVIEW`;
- Service Impact multi-select + required Other description;
- optional attachment with current 10-file / 20-MB-per-file limit and allowlist;
- mandatory reasons for Return/Reject/Reopen/Archive/Unarchive; Cancel reason optional;
- view implies export;
- user-facing XLSX/PDF export choice;
- all export generation asynchronous;
- deterministic export snapshot/version binding;
- generated XLSX/PDF must exactly preserve official XLSX template representation;
- native template controls must be preserved rather than redrawn/replaced;
- PDF renderer is acceptance-gated by exact-fidelity golden tests;
- Approved PDF receives organization/system cryptographic signature;
- XLSX does not receive PDF signing flow;
- generated export binary retention = 168 hours / 7 days;
- separate Access Audit vs Business Timeline;
- hybrid concurrency: workflow pessimistic row lock, editable Draft/Result optimistic versioning;
- Emergency no bypass;
- stale action revalidation;
- final stack baseline in `08`: Laravel 13/PHP 8.5/Vue 3/TypeScript/Inertia 3/shadcn-vue/MySQL 8.4 LTS;
- testing stack established from bootstrap: Pest + Vitest + Playwright plus quality gates.

### Provisional

Until official company numbering/SOP is supplied:

- automatic number format `NSCMF-YYYYMM-#####`;
- global monthly automatic sequence scope;
- manual number pattern/length;
- Header Date not-future rule at first Submit.

These are current implementation rules but MUST NOT be presented as official VELO numbering policy.

### Deferred / TBD

- exact Unit/Division default template entries;
- official company NSCMF numbering SOP/sample that may replace provisional numbering;
- search/filter requirement final detail if additional criteria are needed;
- additional export format and bulk packaging beyond confirmed XLSX/PDF behavior;
- notification implementation/provider;
- business/access audit retention policy;
- performance/SLA/general data retention targets;
- malware scanning/storage security architecture;
- PDF signing certificate/private-key/provider/trust policy — finalized in `10_Security_Rules.md`;
- exact deployment topology/provider.

---

## 17. Notification Roadmap Note

Future candidates:

- Telegram;
- WhatsApp via Baileys.

Notification bukan dependency core workflow.

---

## 18. Document Precedence

- `01_PRD.md` → product scope / intent.
- `02_Business_Rules.md` → business invariants.
- `03_User_Flow.md` → interaction sequence.
- `04_RBAC_Permission_Matrix.md` → permission/scope.
- `05_State_Status_Flow.md` → authoritative lifecycle/state machine.
- `06_Validation_Rules.md` → field/action validity.
- `07_UI_UX_Specification.md` → presentation/interaction detail.
- `08_Tech_Stack_Specification.md` → technology selection/technology guardrails.
- `09_System_Architecture.md` → component topology, concurrency, audit separation, queue/export/signing execution architecture.
- downstream docs → security/data/API/environment/deployment implementation detail.

Jika requirement berubah, dokumen terkait harus disinkronkan; perubahan tidak boleh hanya hidup di code.

---

## 19. Open Product Decisions

- [ ] Exact default Unit/Division template data.
- [ ] Official NSCMF numbering SOP/sample to replace or confirm provisional rule.
- [ ] Search/filter requirement final detail if additional criteria are needed.
- [ ] Additional export format dan bulk packaging beyond XLSX/PDF.
- [ ] Business/access audit retention policy.
- [ ] Notification implementation.
- [ ] Performance/availability/general data-retention targets.
- [ ] Malware scanning/storage security architecture.
- [ ] PDF signing certificate/key/provider/trust implementation in Security Rules.

Resolved Validation/Tech Stack/System Architecture decisions MUST NOT be returned to TBD without an explicit requirement change.

---

## 20. Current Documentation Progress

Completed/current draft set:

```text
01_PRD.md
02_Business_Rules.md
03_User_Flow.md
04_RBAC_Permission_Matrix.md
05_State_Status_Flow.md
06_Validation_Rules.md
07_UI_UX_Specification.md
08_Tech_Stack_Specification.md
09_System_Architecture.md
```

Dokumen berikutnya:

**`10_Security_Rules.md`** — mengunci security controls untuk authentication/session, authorization hardening, attachments, audit access, private export delivery, dan organization/system PDF signing-key boundary.