# Product Requirements Document (PRD)

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PRD-001  
> **Document Order:** 01 / 20  
> **Status:** Draft — Synchronized through Deployment Architecture  
> **Repository:** `rezkym/nscmf_velo`  
> **Primary Business Reference:** NSCMF Form 3.0 (Excel)  
> **Product Flow Reference:** NSCMF FigJam proposal  
> **Last Updated:** 2026-09-02

---

## 1. Purpose

PRD ini mendefinisikan produk yang dibangun, masalah yang diselesaikan, user utama, scope, functional requirements, product boundaries, dan acceptance intent pada level produk.

Dokumen ini bukan source of truth untuk permission detail, state machine, field validation, UI behavior detail, database, API, security implementation, environment runtime values, maupun deployment. Detail tersebut didefinisikan pada dokumen lanjutan.

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

Synchronization addenda `11A`, `12A`, dan `19A_Local_First_MVP_Synchronization.md` remain cross-document authorities for their specific concerns. Historical `14A`/`15A` remain synchronization history according to their own status.

---

## 2. Executive Summary

NSCMF Digital Form & Workflow System adalah aplikasi web internal **single-organization** untuk mengganti proses NSCMF berbasis file Excel menjadi record digital terstruktur yang traceable, dapat direview, di-approve, dicari kembali, diaudit, diarsipkan tanpa delete, dan diekspor.

Aplikasi mempertahankan makna bisnis NSCMF Form 3.0. UI operasional tidak wajib pixel-perfect spreadsheet. **Khusus output XLSX/PDF, official NSCMF XLSX template menjadi visual/export source of truth dan hasil export harus mempertahankan template tersebut secara exact; sistem hanya mengisi/mengganti mapped fields/native control states.**

User dapat memilih XLSX/PDF. Export asynchronous dan bound ke immutable deterministic export snapshot. READY binary private tersedia 168 jam/7 hari kemudian dibersihkan. XLSX tidak melalui PDF-signing flow. PDF yang merepresentasikan snapshot APPROVED wajib cryptographically signed dengan logical signer identity **System/Organization**.

Official export template current MVP diperlakukan sebagai **immutable versioned private template** dengan SHA-256 + mapping-version binding; replacement menjadi versi baru, bukan overwrite.

Dua form family:

- **NSCMF - Activation** — installation/provisioning;
- **NSCMF - Change** — maintenance/change existing service/environment.

Core journey:

```text
Login
→ Dashboard
→ Create New Form
→ family/subtype
→ DRAFT
→ PENDING_REVIEW
→ PENDING_APPROVAL
→ APPROVED
→ History / Export
```

Branches include Cancel Draft, Return/Revision, unlimited resubmission, Reject, authorized Reopen, Archive/Unarchive, detailed audits, shared Reviewer/Approver pools, resumable private attachment upload, and public issued-PDF validation.

Current implementation posture is **local-first**: the application is developed and validated on the developer machine first, keeps Docker compatibility as a secondary portability target, and moves to an actual server only when the application is ready and a real deployment target exists. This posture is synchronized by `19A_Local_First_MVP_Synchronization.md` and made authoritative for deployment placement by `20_Deployment_Architecture.md`.

---

## 3. Problem Statement

Spreadsheet workflow causes data/status/sign-off/revision/retrieval to remain fragmented across files.

Product must:

1. create NSCMF without manually creating new spreadsheet files;
2. preserve NSCMF Form 3.0 business fields/context;
3. provide clear Request→Review→Approval;
4. support revisions without history loss;
5. centralize records;
6. provide History/detail;
7. exact-template XLSX/PDF export;
8. cryptographic integrity evidence for Approved PDF;
9. separate viewer/access evidence from business timeline;
10. prevent NSCMF hard-delete;
11. configurable role/permission administration;
12. store Team as organization/profile data without making it an authorization boundary;
13. provide secure resumable private attachments with explicit whole-file CLEAN gate;
14. provide narrow public verification for issued Approved PDFs;
15. keep authoritative audits permanently by age while allowing operational Technical Logs to use an independent configurable cleanup policy.

---

## 4. Product Vision

> Menjadi satu source of truth internal untuk membuat, memproses, menelusuri, mengaudit, dan mengekspor NSCMF tanpa menghilangkan proses bisnis inti NSCMF Form 3.0.

---

## 5. Product Principles

### 5.1 Preserve Business Meaning
Field/context workbook preserved.

### 5.2 Structured Record Is Source of Truth
Application record is source; exports are outputs.

### 5.3 Traceability by Default
Persisted changes/workflow/access/security evidence remain traceable.

### 5.4 Simple Operational Product
Not generic BPM/form builder/DMS/org-scope engine.

### 5.5 Permission-Centric Authorization
Role groups permissions; backend checks permission + state/ownership where explicit/archive/validation/security/concurrency. Team is not Review/Approval scope.

### 5.6 Team Is Organizational Data
Only Team; no Unit/Division current product.

### 5.7 No Silent Assumptions
Unresolved = TBD; provisional rules explicitly marked. Concerns explicitly removed from current MVP by `19A` are out of current scope, not TBDs that coding agents must solve.

### 5.8 Export Template Fidelity
Exported XLSX/PDF preserves official template exactly.

### 5.9 Export Integrity
Approved PDF signature is integrity evidence, distinct from human Approved By.

### 5.10 Operational Logs Are Not Audit
Technical/runtime logs are troubleshooting data. Their cleanup policy may be configured separately and MUST NEVER redefine Business/Access/Security Audit retention.

### 5.11 Local-First Simplicity
Current development prioritizes a correct local application before server deployment. Infrastructure complexity MUST NOT be introduced merely to anticipate hypothetical scale or production topology.

---

## 6. Product Users

### Protected Superadmin
Seeded protected authority, global operational visibility, initial setup, default admin authority. Cannot delete/disable/downgrade/lose protected role. Sole actor for protected Core System Settings current MVP.

### Requester
Creates/manages own NSCMF; default owner for narrow Change Result flow.

### Reviewer
Required Review permission, shared/non-exclusive, Team-neutral.

### Approver
Required Approval permission, shared/non-exclusive; one successful eligible Approve sufficient; Team-neutral.

### Multi-Role User
May hold multiple roles; no mandatory segregation of duties.

---

## 7. Initial Setup Scope

First run uses protected Superadmin + Setup Wizard:

1. Role setup: template/manual;
2. Team setup;
3. user creation + Team + roles;
4. complete organization setup.

No Reviewer/Approval Scope step. Single organization / installation.

Core system settings remain Protected Superadmin-only. Confirmed current application-configurable protected Core Setting includes Technical Log automatic cleanup/retention; other normal Team/user/role admin may be delegated per RBAC.

---

## 8. Confirmed MVP Scope

MVP includes:

1. Login/logout; no self-registration.
2. Protected seeded Superadmin.
3. Setup Wizard.
4. User administration.
5. Role template/manual configuration.
6. Team master + one-Team user profile relationship.
7. Multi-role.
8. Spatie Permission 8.x + Policies/Gates/domain checks.
9. Spatie Teams disabled.
10. Dashboard.
11. Create New Form.
12. History.
13. Activation/Change forms + subtypes.
14. Auto/manual numbering.
15. Draft + autosave + Save Draft.
16. Optional attachments.
17. Resumable upload fixed 5 MiB chunks + 24h inactivity recovery window.
18. Final attachment max20MB, max10 active/record, whole-file ClamAV CLEAN only.
19. Cancel Draft before first Submit.
20. Shared/non-exclusive Review; multiple Reviewer contributors.
21. Return/Revision/unlimited resubmission.
22. Reviewer Reject.
23. Shared/non-exclusive Approval.
24. Approver Return Reviewer / Return Requester / Reject.
25. One successful final Approve.
26. Reopen Rejected/Approved with permission/reason, starting next iteration.
27. Detailed Business Audit + separate Access/Security Audit.
28. No age purge for authoritative Business/Access/Security Audit.
29. Technical Logs use separate protected cleanup setting: default ON + 30 DAY, configurable by Protected Superadmin as positive DAY/MONTH or OFF, no product maximum.
30. No hard-delete NSCMF.
31. Archive/Unarchive eligible records.
32. Change Result narrow owner edit during PENDING_REVIEW.
33. Service Impact multi-select.
34. Draft vs workflow-gate validation distinction.
35. Laravel13/PHP8.5/Vue3/TS/Inertia3/shadcn-vue/MySQL8.4.
36. Pest/Vitest/Playwright/static-analysis gates.
37. Workflow row-lock + Draft/Result optimistic concurrency.
38. Password-only min6/no composition/no MFA.
39. Session idle30m/absolute8h/max2; third valid login succeeds and revokes oldest active session.
40. **Server-generated temporary password** on create/reset, revealed exactly once to acting admin, target forced to change, no later plaintext retrieval.
41. Sensitive password/role/permission/protected-settings current-password re-authentication; proof lifetime **15 minutes**.
42. Password reset/effective-access changes revoke affected sessions; Team-only change does not.
43. Private storage + ClamAV; only CLEAN usable.
44. Private binary storage uses Laravel private `local` filesystem abstraction; any eventual server runtime must provide persistent/non-ephemeral storage. Third-party object storage is not current MVP.
45. Async exact XLSX/PDF from immutable snapshot.
46. Generated binary retention 168h/7d.
47. Approved PDF mandatory System/Organization signature.
48. Signing private key protected runtime provisioned; never GitHub/source/ordinary DB/browser/log.
49. Public `/ispdfvalid` verifies signature + exact final SHA-256 + issuance/currentness, max upload **20 MB**.
50. TSA not required current MVP.
51. Canonical application/business timezone **`Asia/Jakarta`**.
52. Runtime environment classes are local/development, testing, CI, staging, production; local/development is the primary active implementation target now.
53. Official template immutable/versioned/private + SHA-256 readiness verification.
54. Docker compatibility is maintained as a secondary portability target; containerized development/production is not mandatory.
55. CI remains part of development quality gates; automated CD/deployment pipeline is not current MVP scope.
56. Future default server deployment is a simple single native Linux server with required runtime components co-located unless a real later requirement explicitly changes the topology.

Notification hook remains future capability and not MVP blocker.

---

## 9. Non-Goals

MVP is not for public/customer portal, multi-tenant/multi-organization, Unit/Division, Reviewer/Approval Scope, Team authorization, Spatie Teams, direct-user permission UI, self-registration, native mobile, provisioning automation, generic workflow/form builder, hard delete, mandatory notifications, AI business guessing, exports as source of truth, multi-level approval chain, extra business states, freehand signature, personal Approver certificate, approximate HTML PDF, third-party object-storage requirement, generic authoritative-audit retention controls, public-CA/Adobe-reader trust requirement, automated continuous deployment, High Availability architecture, application uptime SLA, Disaster Recovery architecture, RPO/RTO targets, or hypothetical multi-server scaling.

This non-goal list does **not** remove workbook/business concepts named `Specific Requirements (SLA)`, `Performance Information`, or `Target KPI`.

---

## 10. Form Families

### 10.1 Activation
Installation/provisioning. Subtypes Activation, Upgrade/Downgrade, Deactivation. Typed groups preserve workbook business meaning; exact validation in `06`.

### 10.2 Change
Maintenance/existing-service. Subtypes Maintenance, Upgrade, Emergency.

Purpose of Changes is a section. Service Impact multi-select from NOC15/NOC23/NOC361/Regional/POP/Customer/Other; Other requires description. Result of Changes is separate; zero rows first Submit allowed; at least one complete row before Forward; owner may narrow-edit Result in PENDING_REVIEW with permission.

### 10.3 Upgrade Classification
Installation/provisioning → Activation; maintenance/existing-service → Change. Never keyword-only.

---

## 11. Functional Requirements

### Authentication / Administration

**FR-AUTH-001** username/password login/logout.  
**FR-AUTH-002** no self-registration.  
**FR-AUTH-003** no MFA.  
**FR-AUTH-004** min6/no composition.  
**FR-AUTH-005** server-side throttling/progressive delay.  
**FR-AUTH-006** session idle30m/absolute8h/max2; third valid login revokes oldest.  
**FR-AUTH-007** sensitive re-auth proof lifetime 15 minutes.

**FR-ADM-001** protected Superadmin seeded.  
**FR-ADM-002** initial setup wizard.  
**FR-ADM-003** permission-based normal user/Team/role administration.  
**FR-ADM-004** protected Superadmin cannot delete/disable/downgrade/lose role.  
**FR-ADM-005** create/reset uses server-generated temporary password; one-time admin reveal; mandatory target replacement.  
**FR-ADM-006** sensitive admin action requires current-password re-auth; affected sessions revoked.  
**FR-ADM-007** Team has no Review/Approval effect.  
**FR-ADM-008** protected Technical Log cleanup setting is Protected Superadmin-only; default ON/30 DAY; configurable DAY/MONTH or OFF; authoritative audits never affected.

### Draft / Submit / Review / Approval

Existing locked Draft/Submit/Review/Revision/Approval requirements remain exactly as synchronized through `02–06`: DRAFT→PENDING_REVIEW→PENDING_APPROVAL→APPROVED with Return/Reject branches, shared Reviewer/Approver pools, one final Approve, mandatory reasons, optimistic Draft/Result versioning, row-lock workflow transitions, no Team scope.

### Reopen / Archive / History

Reopen only Rejected/Approved, permission+reason, destination Revision/Review, new iteration. No hard-delete. Archive separate flag on Approved/Rejected/Cancelled. History/Timeline/authoritative audits preserved.

### Export / Attachment / Verification

- exact official template XLSX/PDF;
- async immutable snapshot;
- private READY binary 168h;
- Approved PDF mandatory System/Organization signing;
- signing failure no unsigned fallback;
- resumable private upload + authoritative server final SHA-256 + whole-file CLEAN;
- public validator max20MB + CLEAN + signature/hash/issuance/currentness;
- local-first private binary storage through Laravel local filesystem, with persistent storage required when eventually deployed to a real server;
- `/ispdfvalid` is the only approved public no-login application capability; it does not make internal NSCMF functions public;
- current MVP signature trust is application/Organization trust verified by `/ispdfvalid`; public CA/Adobe-reader trust is not required.

---

## 12. Product-Level Workflow

```text
DRAFT
  |-- Cancel ------------------------> CANCELLED
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

Reopen Rejected/Approved → Revision Required or Pending Review + next iteration. Archive independent flag.

---

## 13. Authorization / Visibility Intent

| Actor | Intent |
|---|---|
| Requester | own mutation where explicit + permission/resource rules |
| Reviewer | permission + eligible state, no Team scope |
| Approver | permission + eligible state, no Team scope |
| Protected Superadmin | global operational visibility + protected Core Settings, while domain invariants remain |
| Multi-role | union of role permissions + normal prerequisites |

---

## 14. Non-Functional Requirements

**NFR-001 Reliability** — persisted data survives normal navigation.  
**NFR-002 Consistency** — detail/history/audit/state/export consistent.  
**NFR-003 Server Authorization** — UI hiding not boundary.  
**NFR-004 Desktop-First**.  
**NFR-005 Traceability**.  
**NFR-006 Maintainability**.  
**NFR-007 Authorization Simplicity** — no Team/scope engine.  
**NFR-008 Package Compatibility** — reuse Spatie schema.  
**NFR-009 Testability**.  
**NFR-010 Export Fidelity**.  
**NFR-011 Export Integrity** — no unsigned Approved fallback.  
**NFR-012 Export Binary Retention** — 168h.  
**NFR-013 Private Storage** — Laravel private local filesystem; a future server runtime must provide persistent/non-ephemeral storage.  
**NFR-014 Canonical Time** — application/business time uses `Asia/Jakarta`; runtime implementation synchronized in `14`.  
**NFR-015 Audit Retention Separation** — Technical Log cleanup never applies to authoritative audits.  
**NFR-016 Local-First Operability** — current application development must run correctly on the developer machine before server deployment is considered; Docker compatibility remains secondary portability support.

No current MVP NFR is defined for application uptime SLA, HA, DR, RPO/RTO, backup architecture, RPS/load target, or hypothetical multi-server scaling.

---

## 15. Success Criteria

Stakeholder can setup users/Teams/roles; prove Team-neutral authorization; create/save/submit/review/revise/approve/reopen/archive NSCMF; narrow-edit Change Result; view History/Timeline; resume interrupted attachments; only use CLEAN files; exact export XLSX/PDF; obtain signed Approved PDF; validate issued PDF publicly; ensure no hard-delete/stale action; retain authoritative audits forever by age; manage Technical Log cleanup without touching authoritative evidence; generate/reset one-time temporary credentials; enforce 15-minute re-auth; and keep runtime decisions consistent with `Asia/Jakarta`, local-first implementation, MySQL 8.4, database session/cache/queue, private local storage semantics, and the simple future native-server deployment contract in `20`.

---

## 16. Confirmed / Provisional / Deferred

### Confirmed

All locked decisions above, including Team-only organization, permission-centric Spatie RBAC, seven statuses, workflow iterations, immutable exports, resumable CLEAN attachments, server-generated one-time temp passwords, 15-minute re-auth proof, third-login oldest-session revocation, public validator 20MB, `Asia/Jakarta`, Laravel private local storage, immutable/versioned template, configurable Technical Log cleanup, local-first development, Docker compatibility as secondary target, CI retained, CD deferred, ClamAV retained for MVP, LibreOffice Headless as first renderer candidate subject to qualification, `/ispdfvalid` application trust without public-CA/Adobe trust requirement, and simple single-native-server future deployment as defined by `20`.

### Provisional

Until official company SOP:

- automatic number `NSCMF-YYYYMM-#####`;
- monthly global sequence;
- manual number rules;
- Header Date not-future rule at first Submit.

### Deferred / Implementation-Time Decisions

- exact Team master data;
- official numbering SOP;
- search/filter refinements;
- bulk packaging;
- notification implementation;
- numeric rate-limit tuning;
- exact signing library/key-container/secret-injection/rotation implementation when Phase 8 is reached;
- exact scanner timeout selected from real integration behavior;
- renderer qualification outcome after LibreOffice Headless is tested against the official workbook;
- actual server provider/hostname/Linux distribution/filesystem path when a real server is provisioned.

The following are **not deferred TBDs for current agents to solve**: HA, application SLA, DR, RPO/RTO, backup architecture, load-balancer topology, multi-server scaling, Kubernetes/orchestration, application load targets, or external observability-platform selection. They are out of current MVP scope unless explicitly reintroduced later.

---

## 17. Document Precedence

`01` product; `02` business; `03` flow; `04` RBAC; `05` state; `06` validation; `07` UI; `08` tech; `09` architecture; `10` security; `11` schema; `12` API; `13` structure; `14` environment; `15` coding; `16` testing; `17` seed; `18` DoD; `19` implementation order; `19A` local-first cross-document synchronization; `20` deployment architecture.

If requirement changes, all affected docs must synchronize; change must not live only in code.

---

## 18. Open Product Decisions

- [ ] Exact Team template/master data.
- [ ] Official numbering SOP/sample.
- [ ] Search/filter refinements if needed.
- [ ] Bulk packaging beyond XLSX/PDF artifacts.
- [ ] Notification implementation.
- [ ] Numeric operational abuse/rate-limit tuning.

Renderer qualification and concrete signing/scanner implementation are capability implementation decisions owned by their relevant phases/specifications, not product-level infrastructure requirements.

Application SLA/HA/DR/RPO/RTO/backup architecture/performance-load targets are intentionally **not current MVP open product decisions**.

Unit/Division, Reviewer/Approval Scope, Team authorization, S3/object-storage initial MVP requirement, temp-password delivery direction, re-auth lifetime, public verifier max upload, canonical timezone, Technical Log cleanup policy/default, local-first development posture, CI requirement, CD deferral, ClamAV inclusion, current signing-trust objective, and current simple deployment posture are **not TBD**.

---

## 19. Current Documentation Progress

The fixed-order authoritative draft set is complete:

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
11_ERD_Database_Schema.md
12_API_Contract.md
13_Project_Structure.md
14_Environment_Specification.md
15_Coding_Rules_AGENTS.md
16_Testing_Specification.md
17_Seed_Dummy_Data_Specification.md
18_Definition_of_Done.md
19_Task_Implementation_Plan.md
20_Deployment_Architecture.md
```

Current synchronization addenda include `11A`, `12A`, historical `14A`/`15A`, and authoritative `19A_Local_First_MVP_Synchronization.md` for the local-first cross-document concern.

The next project step is **implementation according to `19_Task_Implementation_Plan.md`**, beginning with Phase 0 / T00 only after explicit user instruction.
