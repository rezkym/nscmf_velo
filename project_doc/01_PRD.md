# Product Requirements Document (PRD)

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PRD-001  
> **Document Order:** 01 / 20  
> **Status:** Draft — Synchronized through Confirmed Permission/Team/Spatie Decisions  
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

NSCMF Digital Form & Workflow System adalah aplikasi web internal **single-organization** untuk mengganti proses NSCMF berbasis file Excel menjadi record digital terstruktur yang traceable, dapat direview, di-approve, dicari kembali, diaudit, diarsipkan tanpa delete, dan diekspor.

Aplikasi mempertahankan makna bisnis NSCMF Form 3.0. UI operasional tidak wajib menyalin layout spreadsheet secara pixel-perfect. **Khusus output XLSX/PDF, official NSCMF XLSX template menjadi visual/export source of truth dan hasil export harus mempertahankan template tersebut secara exact; sistem hanya mengisi/mengganti field serta native control state yang dipetakan.**

User dapat memilih output **XLSX** atau **PDF**. Export diproses asynchronous dan bound ke deterministic immutable export snapshot. Generated artifact tersedia untuk authorized re-download selama **168 jam / 7 hari**, kemudian binary dibersihkan otomatis. XLSX tidak memerlukan cryptographic document signature. PDF yang merepresentasikan snapshot `APPROVED` wajib mendapat cryptographic PDF signature dengan logical signer identity **System/Organization**.

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
- detailed Business Audit;
- separate Access Audit;
- shared/non-exclusive Reviewer and Approver pools based on permissions, **not organizational scope**.

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
9. mencatat viewer/access evidence terpisah dari modifier/workflow Business Timeline;
10. mencegah hard delete NSCMF;
11. menyediakan role/permission configuration yang sederhana dan dapat disesuaikan;
12. menyimpan Team user sebagai organizational/profile data tanpa menjadikannya authorization boundary.

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
Persisted changes, workflow actions, required access evidence, revision cycles, actor, dan timestamp penting harus dapat ditelusuri.

### 5.4 Simple Operational Product
Produk bukan generic BPM, generic form builder, full document-management platform, atau generic organizational-scope engine.

### 5.5 Permission-Centric Authorization
Role mengelompokkan permissions. Aplikasi memeriksa capability melalui permission dan tetap memvalidasi state, ownership where explicitly required, archive treatment, validation, security preconditions, dan business invariants.

Team membership **tidak** menentukan Review/Approval access.

### 5.6 Team Is Organizational Data
Organization hanya menggunakan konsep **Team** seperti Team NOC, Team CS, Team Fulfillment, dan team lain yang dikonfigurasi organisasi.

Tidak ada konsep Unit/Division dalam current product model.

### 5.7 No Silent Assumptions
Hal yang belum diputuskan harus tetap TBD. Rule sementara untuk MVP dinyatakan **PROVISIONAL**, bukan disajikan sebagai SOP resmi perusahaan.

### 5.8 Export Template Fidelity
Exported XLSX/PDF MUST mempertahankan official XLSX template representation secara exact. Product MUST NOT menurunkan fidelity requirement hanya karena renderer/library tertentu lebih mudah digunakan.

### 5.9 Export Integrity
Cryptographic PDF signature pada Approved PDF adalah additional integrity evidence untuk mendeteksi modification setelah signing; signature tersebut tidak menggantikan business `Approved By` actor.

---

## 6. Product Users

### Protected Superadmin
Seeded protected authority tertinggi pada standard template, global operational visibility, initial setup, dan default administrative authority. Tidak dapat delete/soft-delete/disable/downgrade/lose protected role.

### Requester
Membuat dan mengelola own NSCMF sesuai current state. Untuk Change, Requester/owner juga menjadi default actor untuk narrow `Result of Changes` capture selama `PENDING_REVIEW` melalui permission khusus.

### Reviewer
Actor dengan required Review permission. Reviewer tidak dipilih eksklusif; semua user dengan required permission dapat mengambil action ketika record berada pada eligible state. Team tidak membatasi Reviewer eligibility.

### Approver
Actor dengan required Approval permission. Approval tidak eksklusif; satu eligible Approver yang berhasil Approve cukup menjadi final approver untuk iteration tersebut. Team tidak membatasi Approver eligibility.

### Multi-Role User
Satu user dapat memiliki lebih dari satu role. Current requirement tidak mewajibkan segregation of duty.

---

## 7. Initial Setup Scope

First run menggunakan protected Superadmin dan Setup Wizard.

Wizard minimal mencakup:

1. role configuration: **Use Role Template** atau **Manual Role Configuration**;
2. Team setup/mapping;
3. user creation + Team assignment + role assignment;
4. menyelesaikan initial organization setup.

Tidak ada Reviewer Scope atau Approval Scope configuration step.

Application model = **single organization / single installation**. Team adalah organizational data di dalam organization yang sama, bukan tenant boundary dan bukan authorization scope.

Core system settings tetap Superadmin-only. Normal Team/user/role administration MAY didelegasikan melalui explicit permissions jika downstream RBAC mengizinkan.

---

## 8. Confirmed MVP Scope

MVP mencakup:

1. Login/logout; tanpa self-registration.
2. Protected seeded Superadmin.
3. Initial setup wizard.
4. User administration.
5. Role template/manual configuration.
6. Team master/configuration dan one-Team user membership/profile mapping.
7. Multi-role assignment.
8. Permission-centric authorization menggunakan Spatie Laravel Permission 8.x + Laravel Policies/Gates + domain checks.
9. Spatie `teams` feature disabled; business Team tetap terpisah.
10. Dashboard sederhana.
11. CTA `Create New Form`.
12. Direct History access.
13. Activation dan Change forms.
14. Form subtype selection.
15. Auto/manual numbering mode per record.
16. Draft + autosave + Save Draft.
17. Optional attachment input.
18. Cancel hanya pada Draft sebelum first Submit.
19. Shared/non-exclusive Review.
20. Multiple Reviewer contributors.
21. Return for Revision.
22. Unlimited revision cycles.
23. Reviewer Reject.
24. Shared/non-exclusive Approval.
25. Approver Return to Reviewer.
26. Approver Return to Requester dan wajib Review ulang setelah Resubmit.
27. Approver Reject.
28. Satu final approval dari satu eligible Approver.
29. Reopen/Revert untuk Rejected/Approved oleh protected Superadmin atau actor dengan explicit `nscmf.reopen`, subject to normal record authorization and domain rules.
30. Detailed audit/change history.
31. History + detail + Business Timeline.
32. Permission/resource-aware visibility without Team-based scope.
33. User-facing Export XLSX dan Export PDF with exact official-template fidelity.
34. Seluruh export diproses asynchronous dan bound ke deterministic immutable export snapshot/version.
35. Generated export artifact tersedia privately untuk authorized re-download 168 jam / 7 hari, lalu binary dibersihkan otomatis.
36. Approved PDF output mendapat cryptographic signature dengan logical signer identity System/Organization; XLSX tidak melalui PDF signing flow.
37. Viewer/access evidence dipisahkan dari business mutation/workflow timeline.
38. Archive/Unarchive sebagai administrative lifecycle tanpa hard delete.
39. No hard delete NSCMF.
40. Emergency Change tetap Review + Approval.
41. Change `Result of Changes` diselesaikan sebelum final Approval tanpa membuat state execution/result baru.
42. Narrow Change Result capture oleh Requester/owner pada `PENDING_REVIEW` melalui `nscmf.change.result.edit` tanpa membuka general submitted form editing.
43. Service Impact Change multi-select dan `Other` membutuhkan description.
44. Validation dibedakan antara Draft persistence dan workflow gate; incomplete Draft tetap dapat disimpan.
45. Technology baseline menggunakan Laravel 13 + PHP 8.5 + Vue 3 + TypeScript + Inertia 3 + shadcn-vue + MySQL 8.4 LTS.
46. Testing infrastructure (Pest + Vitest + Playwright + static-analysis/quality gates) disiapkan sejak bootstrap.
47. Hybrid concurrency: workflow transitions memakai short transaction + row-level lock/current-state revalidation; Draft/Revision/Result persistence memakai optimistic version conflict detection.
48. Authentication security baseline: password-only, minimum 6 characters, no composition requirement, no MFA, throttling/progressive delay, idle timeout 30m, absolute session lifetime 8h, maksimum 2 active sessions/account.
49. Administrative account create/reset menggunakan temporary password + mandatory change; sensitive role/permission/credential admin action memerlukan password re-authentication.
50. Password reset dan effective access-changing role/permission mutations revoke affected target-user sessions; Team change alone is not an authorization mutation.
51. Attachment security menggunakan private storage dan ClamAV; hanya explicit `CLEAN` membuat attachment usable.
52. Authoritative Business Audit, Access Audit, Security Audit tidak memiliki age-based retention/purge.
53. Approved-PDF signing identity diprovision manual pada server/environment dan tidak disimpan di GitHub/source/ordinary DB/browser/logs.
54. Missing/unusable signing identity adalah critical readiness/configuration failure.
55. Public no-login PDF validator memverifikasi recognized issuer signature, exact final SHA-256, issuance metadata, dan current/superseded approval context tanpa membuka private NSCMF data.
56. TSA tidak diwajibkan untuk current MVP.

Notification hook adalah future capability dan bukan MVP blocker.

---

## 9. Non-Goals

MVP tidak ditujukan untuk:

- public/customer NSCMF portal;
- multi-tenant/multi-organization installation;
- Unit/Division organizational model;
- Reviewer Scope atau Approval Scope;
- Team-based authorization;
- enabling Spatie Teams permissions feature;
- direct-user permission administration as a normal MVP feature;
- self-registration;
- native mobile app;
- network provisioning automation;
- generic workflow designer;
- generic form builder;
- hard-delete NSCMF;
- notification sebagai blocker core workflow;
- AI guessing untuk business classification;
- exported file sebagai source of truth;
- multi-level approval chain;
- state `UNDER_REVIEW`, `REOPENED`, `ARCHIVED`, `EXECUTION_PENDING`, atau `RESULT_PENDING` sebagai business status;
- freehand signature input;
- personal certificate requirement untuk setiap Approver;
- redesigning official NSCMF XLSX layout for export;
- approximate PDF layout when exact template fidelity is required.

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

Required/conditional/optional classification mengikuti `06_Validation_Rules.md`.

### 10.2 NSCMF - Change

Business context: maintenance/perubahan existing service/environment.

Subtype:

- Maintenance;
- Upgrade;
- Emergency.

#### Section A — Purpose of Changes

`Purpose of Changes` adalah section, bukan option.

Input areas include Facing Challenges, Maintenance Purpose, Identified Problem, Service Impact, Improvement Plan/Target KPI, Target Date, Monitoring Period, Rollback, dan Announcement.

Service Impact options:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Service Impact adalah multi-select; minimum satu impact dipilih saat Submit/Resubmit; `Other` membutuhkan description.

#### Section B — Result of Changes

Mencakup Result Summary, Performance Information, Status.

Confirmed:

- first Submit dapat memiliki zero Result rows;
- started row harus internally complete;
- sebelum Reviewer Forward, minimum satu complete Result row;
- source template capacity = lima rows, bukan mandatory count;
- Result tidak membuat business state baru;
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

**FR-AUTH-001** Valid user dapat login/logout menggunakan username + password.  
**FR-AUTH-002** Tidak ada self-registration.  
**FR-AUTH-003** Tidak ada MFA current MVP.  
**FR-AUTH-004** Password minimum 6 characters tanpa composition requirement.  
**FR-AUTH-005** Login menerapkan server-side throttling/progressive delay.  
**FR-AUTH-006** Session policy = 30m idle, 8h absolute, maximum 2 active sessions/account.  
**FR-ADM-001** Protected Superadmin dibuat saat initial seeding.  
**FR-ADM-002** Initial setup menggunakan wizard.  
**FR-ADM-003** Authorized admin dapat mengelola eligible normal user, Team, role, dan role permissions sesuai RBAC.  
**FR-ADM-004** Protected Superadmin tidak dapat delete/disable/downgrade/lose protected role.  
**FR-ADM-005** Admin-created/reset credential menggunakan temporary password + mandatory replacement.  
**FR-ADM-006** Sensitive role/permission/credential administrative action memerlukan password re-authentication; affected target-user sessions dicabut sesuai Security Rules.  
**FR-ADM-007** Team assignment tidak memberi/mengurangi Review/Approval permission.

### Draft / Submit / Review / Approval

**FR-DRAFT-001** New record berada pada `DRAFT`.  
**FR-DRAFT-002** Own Draft editable melalui required permission + ownership.  
**FR-DRAFT-003** Autosave + Save Draft tersedia; incomplete Draft allowed.  
**FR-DRAFT-004** Persisted changes diaudit dan optimistic version conflicts tidak silently overwrite.

**FR-SUB-001** Valid `DRAFT` Submit → `PENDING_REVIEW`.  
**FR-SUB-002** Setelah Submit, normal Requester edit locked kecuali narrow Change Result capability.

**FR-REV-001** User dengan required Review permission dapat memproses `PENDING_REVIEW`; tidak ada Team/scope matching.  
**FR-REV-002** Membuka record tidak mengubah state dan tidak menciptakan exclusive owner.  
**FR-REV-003** Multiple Reviewer dapat berpartisipasi.  
**FR-REV-004** Reviewer dapat Forward → `PENDING_APPROVAL`, Return → `REVISION_REQUIRED`, atau Reject → `REJECTED` subject to exact permission/state/validation rules.  
**FR-REV-005** Reviewer Return/Reject membutuhkan mandatory reason.

**FR-REVISION-001** `REVISION_REQUIRED` mengaktifkan Requester editing.  
**FR-REVISION-002** Resubmit selalu → `PENDING_REVIEW`.  
**FR-REVISION-003** Revision cycle unlimited.

**FR-APR-001** User dengan required Approval permission dapat memproses `PENDING_APPROVAL`; tidak ada Team/scope matching.  
**FR-APR-002** Approver dapat Approve, Return Reviewer, Return Requester, atau Reject subject to exact permission/state/validation rules.  
**FR-APR-003** Satu valid final Approve cukup; `Approved By` = successful transition actor.  
**FR-APR-004** Emergency tidak bypass Review/Approval.  
**FR-APR-005** Change Result validation harus lulus sebelum masuk `PENDING_APPROVAL`.

### Reopen / Archive / History

**FR-REOPEN-001** Hanya `REJECTED` dan `APPROVED` yang Reopen-eligible.  
**FR-REOPEN-002** Actor memerlukan `nscmf.reopen` + authorized record access; no Team/scope check.  
**FR-REOPEN-003** Mandatory reason + destination `REVISION_REQUIRED` atau `PENDING_REVIEW`.  
**FR-REOPEN-004** Reopen ke `DRAFT`/`PENDING_APPROVAL` forbidden.  
**FR-REOPEN-005** Reopen starts a new workflow iteration; normal Return/Revision/Resubmit within the same non-terminal cycle remains in the current iteration.  
**FR-REOPEN-006** Previous Reject/Approval evidence preserved.

**FR-HIS-001** Record visibility/authorization uses permission + applicable ownership/resource rules, not Team scope.  
**FR-HIS-002** Legitimate viewer dapat melihat Business Timeline.  
**FR-HIS-003** Routine access/download evidence disimpan melalui separate Access Audit.  
**FR-HIS-004** Business/Access/Security Audit tidak age-purged.

**FR-ARC-001** No hard delete.  
**FR-ARC-002** Archive hanya `APPROVED`, `REJECTED`, `CANCELLED`.  
**FR-ARC-003** Archive independent flag; business status unchanged.  
**FR-ARC-004** Actor memerlukan `nscmf.archive` + authorized record access.  
**FR-ARC-005** Archive/Unarchive mandatory reason.

### Export / Attachment / Audit

Export, attachment, audit, concurrency, signing, and public-validator requirements remain authoritative as defined in `02`, `06`, `08`, `09`, and `10`, including exact template fidelity, asynchronous deterministic snapshot generation, 168-hour binary window, ClamAV CLEAN gate, System/Organization Approved-PDF signer, final SHA-256 issuance evidence, and public current/superseded/modified/unknown verification semantics.

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
  -- starts next workflow iteration

CANCELLED
  -- no reopen --> permanent terminal
```

Archive:

```text
business_status unchanged
is_archived false <-> true
```

---

## 13. Authorization / Visibility Intent

| Actor Context | Intent |
|---|---|
| Requester | Own-record mutation rules where explicitly defined; view/history according to granted permissions and resource policy |
| Reviewer | Review/queue eligibility derived from Review permissions + eligible state; no Team scope |
| Approver | Approval/queue eligibility derived from Approval permissions + eligible state; no Team scope |
| Protected Superadmin | Global operational visibility, while protected domain invariants remain |
| Multi-role user | Union of role permissions; state/ownership/security rules still apply |

Team is intentionally absent from authorization evaluation.

---

## 14. Non-Functional Requirements

**NFR-001 Reliability** — persisted data tidak hilang karena normal navigation.  
**NFR-002 Consistency** — form detail, History, audit, state, dan export konsisten.  
**NFR-003 Server-Side Authorization** — UI hiding bukan authorization boundary.  
**NFR-004 Desktop-First** — primary target internal desktop browser.  
**NFR-005 Traceability** — critical activity dapat ditelusuri.  
**NFR-006 Maintainability** — MVP tidak dibuat lebih kompleks dari kebutuhan.  
**NFR-007 Authorization Simplicity** — Team/scope engine MUST NOT be introduced when permission + domain rules are sufficient.  
**NFR-008 Package Compatibility** — Spatie-owned RBAC schema reused rather than duplicated.  
**NFR-009 Testability** — backend/frontend/E2E/export/security tests from bootstrap.  
**NFR-010 Export Fidelity** — exact-template XLSX/PDF fidelity tested structurally/visually.  
**NFR-011 Export Integrity** — Approved PDF signing failure cannot produce unsigned final equivalent.  
**NFR-012 Export Binary Retention** — generated artifact 168h/7d; source/audit/issuance remain.  
**NFR-013 Performance Target** — TBD.  
**NFR-014 Availability / DR** — TBD.

---

## 15. Success Criteria

Stakeholder dapat:

1. login dan menyelesaikan setup;
2. mengelola Team, users, roles, dan role permissions;
3. memastikan Team membership tidak mengubah Review/Approval authority;
4. membuat Activation/Change;
5. Save Draft/autosave incomplete Draft;
6. Submit valid record ke `PENDING_REVIEW`;
7. melakukan permission-based shared/non-exclusive Review;
8. melakukan unlimited revision cycle;
9. memproses Change Result melalui narrow Requester capability;
10. melakukan permission-based single final Approval;
11. menjalankan Return/Reject/Reopen/Archive/Unarchive dengan exact prerequisites;
12. melihat History/Business Timeline tanpa routine access noise;
13. memilih export XLSX/PDF exact-template;
14. melihat queued export dan re-download ≤ 7 days;
15. memperoleh signed Approved PDF dengan human `Approved By` tetap terpisah dari System/Organization signer;
16. memverifikasi issued Approved PDF melalui public validator;
17. memastikan no hard delete dan stale action ditolak;
18. mempertahankan authoritative audit tanpa age-based deletion;
19. memastikan Spatie schema tidak diduplikasi dan Spatie Teams tetap disabled.

---

## 16. Confirmed, Provisional, and Deferred

### Confirmed

Selain seluruh locked workflow/security/export decisions pada dokumen 02–10, berikut sekarang confirmed:

- organization only uses **Team**, not Unit/Division;
- each normal user has organizational Team profile/membership according to downstream data model;
- Team is not an authorization boundary;
- no Reviewer Scope;
- no Approval Scope;
- Reviewer/Approver eligibility is permission-centric;
- Role groups permissions; application checks permissions wherever practical;
- Spatie Laravel Permission 8.x is the RBAC primitive;
- package-owned role/permission tables must not be duplicated;
- Spatie `teams=false`;
- Spatie wildcard permissions remain disabled;
- direct-user permission administration is not a normal MVP feature;
- login/logout are authentication operations, not Spatie permission rows;
- default Laravel-compatible bigint user identity is preferred for package compatibility unless ERD explicitly justifies another choice;
- Reopen from Approved/Rejected starts a new workflow iteration;
- Return/Revision/Resubmit within a current non-terminal cycle does not start a new workflow iteration;
- deterministic export uses immutable export snapshot.

### Provisional

Until official company numbering/SOP is supplied:

- automatic number `NSCMF-YYYYMM-#####`;
- global monthly sequence;
- manual number pattern/length;
- Header Date not-future rule at first Submit.

### Deferred / TBD

- exact default Team master-data entries;
- official company NSCMF numbering SOP/sample;
- search/filter refinements;
- additional export format/bulk packaging beyond XLSX/PDF;
- notification implementation/provider;
- performance/SLA/availability targets;
- backup/restore/DR/RPO/RTO;
- exact production deployment topology/provider;
- exact signing certificate operational format/path/provider where needed.

---

## 17. Document Precedence

- `01_PRD.md` → product scope / intent.
- `02_Business_Rules.md` → business invariants.
- `03_User_Flow.md` → interaction sequence.
- `04_RBAC_Permission_Matrix.md` → permission-centric authorization and Spatie/Team boundary.
- `05_State_Status_Flow.md` → lifecycle/state machine/workflow iteration semantics.
- `06_Validation_Rules.md` → field/action validity.
- `07_UI_UX_Specification.md` → presentation/interaction detail.
- `08_Tech_Stack_Specification.md` → technology/package guardrails.
- `09_System_Architecture.md` → component/concurrency/audit/export architecture.
- `10_Security_Rules.md` → security controls.
- downstream docs → data/API/environment/deployment implementation detail.

Jika requirement berubah, semua dokumen terkait harus disinkronkan; perubahan tidak boleh hanya hidup di code.

---

## 18. Open Product Decisions

- [ ] Exact default Team template/master data.
- [ ] Official NSCMF numbering SOP/sample.
- [ ] Search/filter requirement detail if additional criteria are needed.
- [ ] Additional export format/bulk packaging beyond XLSX/PDF.
- [ ] Notification implementation.
- [ ] Performance/availability targets.
- [ ] Backup/restore/DR/RPO/RTO.
- [ ] Exact production deployment topology/provider.

Unit/Division, Reviewer Scope, Approval Scope, and Team-based authorization are **not TBD**; they are explicitly excluded from current design.

---

## 19. Current Documentation Progress

Current authoritative draft set:

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
10_Security_Rules.md
```

Next document:

**`11_ERD_Database_Schema.md`** — physical relational schema that must reuse Spatie package-owned RBAC tables, model Team separately, avoid scope tables, preserve immutable export snapshots/workflow iterations, and materialize all locked audit/security/export requirements.