# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Draft — Synchronized through Confirmed Team/Permission/Spatie Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan aturan bisnis yang wajib dipatuhi seluruh implementasi NSCMF Digital Form & Workflow System.

Aturan berlaku lintas UI, backend, database, API, automation, dan AI coding agent. Frontend tidak boleh menjadi satu-satunya enforcement layer; business rules mengenai permission, ownership, state, editability, validation, workflow, Team treatment, audit, dan security MUST divalidasi server-side sesuai authority masing-masing.

Dokumen bekerja bersama:

- `03_User_Flow.md` — urutan interaksi user;
- `04_RBAC_Permission_Matrix.md` — permission-centric authorization dan Spatie/Team boundary;
- `05_State_Status_Flow.md` — authoritative state machine dan workflow-iteration rules;
- `06_Validation_Rules.md` — validitas field/input/action;
- `07_UI_UX_Specification.md` — presentation dan interaction detail;
- `08_Tech_Stack_Specification.md` — technology implementation baseline;
- `09_System_Architecture.md` — component boundaries, concurrency, audit separation, queue/export/signing architecture;
- `10_Security_Rules.md` — authentication/session, authorization hardening, malware scanning, permanent audit security, secrets, signing-key custody, public PDF verification.

Normative language:

- **MUST** — wajib;
- **MUST NOT** — dilarang;
- **MAY** — diperbolehkan;
- **SHOULD** — direkomendasikan;
- **TBD** — belum final dan tidak boleh ditebak implementation;
- **PROVISIONAL** — rule sementara yang berlaku untuk MVP sampai SOP resmi menggantikannya.

---

# PART A — INITIAL SETUP, ORGANIZATION, USERS, ROLES

## 2. Initial Setup Wizard

### BR-SETUP-001 — Wizard Required
Setelah protected Superadmin pertama login pada instalasi baru, aplikasi MUST menyediakan first-time Setup Wizard.

### BR-SETUP-002 — Role Setup Mode
Wizard MUST menyediakan:

1. `Use Role Template`
2. `Manual Role Configuration`

### BR-SETUP-003 — Minimum Default Roles
Template minimum:

- `Superadmin`
- `Requester`
- `Reviewer`
- `Approver`

Exact permission mengikuti `04_RBAC_Permission_Matrix.md`.

### BR-SETUP-004 — Template Remains Configurable
Eligible role/permission MAY diubah setelah setup oleh actor yang memiliki permission administrasi, kecuali protected Superadmin invariants.

### BR-SETUP-005 — Team Setup
Organization menggunakan **Team**, bukan Unit/Division.

Wizard MUST menyediakan Team configuration/mapping. Exact default Team entries masih TBD dan MUST NOT ditebak.

Contoh nama yang diberikan business owner hanya menunjukkan konsep, misalnya Team NOC, Team CS, Team Fulfillment; exact initial production master data tetap harus mengikuti konfigurasi organisasi.

### BR-SETUP-006 — User Team Mapping
Normal user memiliki organizational Team association sesuai data model final.

Team association adalah profile/organization data dan MUST NOT menjadi authorization scope.

### BR-SETUP-007 — No Reviewer / Approval Scope
Current product MUST NOT menyediakan Reviewer Scope, Approval Scope, Unit Scope, Division Scope, atau Team-based permission scope.

Review/Approval eligibility ditentukan oleh required permission + current business state + other domain/security prerequisites.

### BR-SETUP-008 — Core System Settings Protected
Initial/system-level settings seperti setup mode, global numbering configuration, dan protected security/signing configuration hanya protected Superadmin. Ongoing eligible role/user/Team administration MAY didelegasikan secara granular.

### BR-SETUP-009 — Single Organization
Current application model MUST menggunakan **single organization / single installation**.

Team bukan tenant boundary. Current MVP MUST NOT menambahkan hidden multi-tenant behavior.

---

## 3. Protected Superadmin

### BR-SUPER-001
Initial seeding MUST membuat setidaknya satu protected Superadmin.

### BR-SUPER-002
Protected Superadmin adalah authority tertinggi pada standard role template dan memiliki global operational visibility.

### BR-SUPER-003
Protected Superadmin MUST NOT dapat hard-delete, soft-delete, disable, kehilangan protected role, atau didowngrade.

### BR-SUPER-004
Protection berlaku melalui UI, API, import, bulk action, seed/update flow, dan administrative flow lain.

### BR-SUPER-005
Protected identity tidak berarti plaintext credential/secret di source code.

### BR-SUPER-006 — No Invalid-Domain Bypass
Protected Superadmin tetap tunduk canonical business state, validation, mandatory reasons, signing/security requirements, dan unavailable capabilities seperti NSCMF hard delete.

---

## 4. User, Role, Team, Permission Administration

### BR-USER-001 — No Self-Registration
Normal user MUST NOT self-register.

### BR-USER-002 — Administrative Creation
Account dibuat melalui administrative flow oleh Superadmin atau actor dengan applicable user-management permission.

### BR-USER-003 — Delegated Administration
Actor dengan required permission MAY mengelola eligible normal user, Team assignment, role assignment, credential reset, enable/disable, dan role-permission configuration.

### BR-USER-004 — Multi-Role
Satu user MAY memiliki beberapa role.

### BR-USER-005 — No Mandatory Segregation of Duty
Current business decision tidak mewajibkan `Requester != Reviewer != Approver`. Actor yang memiliki required permission dan valid state/domain prerequisites MAY berpartisipasi pada beberapa tahap record yang sama.

### BR-USER-006 — No Impersonation
User impersonation/login-as-user tidak termasuk scope.

### BR-USER-007 — Authorization Technology Boundary
`08_Tech_Stack_Specification.md` mengunci **Spatie Laravel Permission 8.x** sebagai role/permission primitive.

Business authorization menggunakan:

```text
Spatie role/permission primitives
+ Laravel Policies/Gates
+ explicit ownership checks where a business rule requires ownership
+ domain state/archive/validation/invariant checks
+ security preconditions
```

There is **no custom organizational scope layer** for Reviewer/Approver.

### BR-USER-008 — Team Is Not Authorization
Team MUST NOT:

- grant Review permission;
- revoke Review permission;
- grant Approval permission;
- revoke Approval permission;
- filter Review candidates based on Team membership;
- filter Approval candidates based on Team membership;
- create role/permission variants per Team;
- become a hidden tenant boundary.

### BR-USER-009 — Spatie Teams Disabled
The `teams` feature from `spatie/laravel-permission` MUST remain disabled for current MVP.

Business Team and Spatie Teams are different concepts and MUST NOT be merged.

### BR-USER-010 — Role-First Permission Administration
Current MVP normally assigns permissions to roles and roles to users.

Direct user permissions supported internally by Spatie MUST NOT be exposed as a normal MVP administration workflow without specification change.

### BR-USER-011 — Confirmed Authentication Security Boundary
Current product policy remains password-only: minimum password length **6 characters**, no mandatory character-composition rule, no MFA.

### BR-USER-012 — Administrative Credential Flow
Admin-created/reset credential MUST use a temporary password and force replacement before normal application use. Sensitive role/permission/password-reset administrative actions require password re-authentication of acting user.

### BR-USER-013 — Security Change Session Revocation
Password reset, role assignment/removal, permission changes to a role that alter affected users' effective access, disablement, or equivalent access-changing authorization mutation MUST revoke applicable active sessions according to `10_Security_Rules.md`.

Changing Team alone is an organizational data mutation and MUST NOT be treated as an authorization grant/revoke.

---

# PART B — FORM FAMILY AND EXCEL BUSINESS MEANING

## 5. Main Form Families

### BR-FORM-001
Aplikasi MUST menyediakan `NSCMF - Activation` dan `NSCMF - Change`.

### BR-FORM-002 — Activation Context
Activation = instalasi/provisioning.

Subtype:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### BR-FORM-003 — Change Context
Change = maintenance/perubahan terhadap layanan/environment yang sudah berjalan.

Subtype:

- Maintenance;
- Upgrade;
- Emergency.

### BR-FORM-004 — Upgrade Is Contextual
Keyword `Upgrade` sendiri MUST NOT menentukan family.

- installation/provisioning → Activation;
- maintenance/existing-service change → Change.

Kasus ambigu harus dikonfirmasi business owner.

---

## 6. NSCMF Change Semantics

### BR-CHG-001
`(A) Purpose of Changes` adalah section, bukan selectable option.

### BR-CHG-002
`Facing Challenges (Upgrade / Emergency)` adalah input content, bukan pilihan Upgrade vs Emergency.

### BR-CHG-003
`Maintenance Purpose` adalah input content.

### BR-CHG-004
`Identified Problem (Please elaborate)` adalah field naratif.

### BR-CHG-005 — Service Impact
Source workbook menyediakan NOC15, NOC23, NOC361, Regional, POP, Customer, Other.

Confirmed treatment:

- Service Impact MUST multi-select;
- minimum satu selection pada Submit/Resubmit;
- `Other` requires Other Impact Description;
- exact field validation mengikuti `06_Validation_Rules.md`.

### BR-CHG-006
`Maintenance (Improvement) Plan` dan `Target KPI` adalah paired input. Current validation minimum satu complete pair pada Submit/Resubmit.

### BR-CHG-007
Change MUST merepresentasikan Target date of execution, Monitoring period, Rollback scenario, dan Maintenance Announcement. Source workbook menunjukkan `1 week before`, `2 weeks before`, `2 days before (emergency)`.

### BR-CHG-008 — Result of Changes Is Distinct Data
`(B) Result of Changes` adalah section data terpisah dengan Result summary, Performance information, Status.

### BR-CHG-009 — No New Result State
MUST NOT menambahkan `EXECUTION_PENDING`, `RESULT_PENDING`, atau `COMPLETED` hanya karena Result section ada.

### BR-CHG-010 — Result Before Forward
Applicable Result of Changes MUST selesai sebelum record dapat meninggalkan `PENDING_REVIEW` melalui `Forward to Approval`.

### BR-CHG-011 — First Submit May Have Zero Results
First Submit MAY memiliki zero Result rows; started row must be internally complete according to Validation Rules.

### BR-CHG-012 — Narrow Result Capture
Normal Requester editing locked setelah Submit, tetapi system MUST provide narrow mechanism:

```text
Requester/owner
+ nscmf.change.result.edit
+ own Change record
+ business_status = PENDING_REVIEW
```

Only Result-of-Changes fields editable; planning/submitted fields stay locked.

### BR-CHG-013 — Result Forward Gate
Sebelum Reviewer Forward, Change MUST memiliki minimum satu complete Result row. Maximum five rows from template is capacity, not mandatory count.

---

# PART C — RECORD CREATION, NUMBERING, DRAFT, CANCELLATION, ATTACHMENT

## 7. Record Creation

### BR-REC-001
Setiap NSCMF MUST memiliki requester/owner context dan creator identity.

### BR-REC-002
Creation order: family → subtype → numbering mode → form fields.

### BR-REC-003
Setiap record menawarkan Automatic Number Generation atau Manual Number Entry.

### BR-REC-004 — Provisional Automatic Numbering
Until official numbering SOP/sample is supplied:

```text
NSCMF-YYYYMM-#####
```

Sequence global per calendar month, server-generated, globally unique, concurrency-safe, gap allowed, allocated number never reused.

### BR-REC-005 — Manual Number
Manual number MUST follow provisional character/length/uniqueness rules from `06_Validation_Rules.md`.

### BR-REC-006 — Number Immutability
Request No MAY dikoreksi pada `DRAFT`, tetapi after first successful Submit MUST immutable through normal workflow. Revision/Reopen does not generate new number.

---

## 8. Draft and Autosave

### BR-DRAFT-001
New record has `DRAFT`.

### BR-DRAFT-002
Requester MAY edit own eligible Draft with required permission.

### BR-DRAFT-003
Editable Draft MUST support autosave and manual `Save Draft`.

### BR-DRAFT-004
Persisted Draft changes MUST be Business Audited.

### BR-DRAFT-005
Draft MAY incomplete.

### BR-DRAFT-006
Draft persistence MUST NOT be blocked only because submission-required fields are incomplete.

### BR-DRAFT-007 — Optimistic Concurrency
Draft/Revision persistence MUST detect stale version conflict and MUST NOT silently overwrite newer persisted edit.

---

## 9. Cancellation

### BR-CAN-001
Requester MAY Cancel own record only from `DRAFT` and before first Submit.

### BR-CAN-002
First Submit removes normal Cancel right.

### BR-CAN-003
Cancel → `CANCELLED`, permanent terminal, MUST NOT Reopen.

### BR-CAN-004
Cancel is not delete; record remains History/audit.

### BR-CAN-005
Cancel records actor/timestamp; reason Optional.

---

## 10. Attachments

### BR-ATT-001
Attachment input MUST exist visually.

### BR-ATT-002
Attachment optional current MVP.

### BR-ATT-003
Add/remove/replace attachment reference MUST be audited.

### BR-ATT-004 — Current Limits

- maximum 10 files/record;
- maximum 20 MB/file;
- zero-byte rejected;
- allowlist PDF, XLS/XLSX, DOC/DOCX, PNG, JPG/JPEG, TXT, CSV;
- executable/script/macro-enabled formats outside allowlist rejected.

Storage private. Only explicit ClamAV `CLEAN` makes attachment usable. Malware detected, scanner error, timeout, or unavailable scanner fail closed.

### BR-ATT-005
Missing attachment on Change Upgrade/Emergency = non-blocking Warning, not blocking error.

---

# PART D — AUTHORITATIVE WORKFLOW SEMANTICS

## 11. Canonical States

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

`SUBMITTED`, `UNDER_REVIEW`, `REVIEWED`, `REOPENED`, `ARCHIVED` are not persistent business states.

---

## 12. Submit

### BR-SUB-001
Requester MAY Submit only if submission validation passes.

### BR-SUB-002
First Submit:

```text
DRAFT -> PENDING_REVIEW
```

### BR-SUB-003
After Submit, general Requester edit locked until `REVISION_REQUIRED`, except narrow Change Result capture.

### BR-SUB-004
Requester does not choose a Reviewer. Every actor with required Review permission is part of the shared permission-based Reviewer pool for eligible records. Team does not filter this pool.

---

## 13. Reviewer Participation

### BR-REV-001 — Permission-Based Reviewer Eligibility
Reviewer action requires the exact Review permission required by the action and an eligible `PENDING_REVIEW` state. No Team/organizational scope match exists.

### BR-REV-002
Reviewer access non-exclusive; first viewer is not owner lock.

### BR-REV-003
Viewer/access evidence distinguishable from modifier/workflow action and never changes state.

### BR-REV-004
One record MAY have multiple Reviewer contributors throughout lifecycle.

### BR-REV-005
Opening/viewing MUST NOT change business state.

### BR-REV-006 — Reviewer State Actions
From `PENDING_REVIEW`, with action-specific permission:

- Return for Revision → `REVISION_REQUIRED`;
- Reject → `REJECTED`;
- Forward to Approval → `PENDING_APPROVAL`.

### BR-REV-007
Emergency Change still requires Review.

### BR-REV-008
Change Forward MUST fail if Result validation not satisfied.

### BR-REV-009
Reviewer Return/Reject mandatory reason; Forward comment Optional.

---

# PART E — REVISION LOOP AND WORKFLOW ITERATION

## 14. Return for Revision

### BR-RET-001
Return to Requester → `REVISION_REQUIRED` and enables Requester editing.

### BR-RET-002
Requester Resubmit always:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

### BR-RET-003
Revision cycles MAY repeat without fixed maximum.

### BR-RET-004
Previous/current Reviewer activity MAY be retained for continuity, but no Reviewer gets exclusive ownership and any actor with the required Review permission remains eligible when state permits.

### BR-RET-005
Field change and workflow evidence MUST remain in audit/history.

### BR-RET-006
`REVISION_REQUIRED -> PENDING_APPROVAL` MUST NOT exist.

## 14A. Workflow Iteration Semantics

### BR-ITER-001 — First Submit Establishes Iteration
First successful Submit establishes workflow iteration 1 for workflow/approval-history purposes.

### BR-ITER-002 — Normal Return/Revision Stays in Same Iteration
Reviewer Return, Approver Return, Requester Revision, and Resubmit within the same ongoing workflow cycle MUST NOT create a new workflow iteration.

### BR-ITER-003 — Reopen Creates New Iteration
Reopen from `REJECTED` or `APPROVED` starts the next workflow iteration.

This distinction is required so historical rejection/approval/sign-off and previously issued Approved PDFs can remain attributable to the correct iteration.

---

# PART F — APPROVAL

## 15. Approver Eligibility and Actions

### BR-APR-001 — Permission-Based Eligibility
Approver action requires the exact Approval permission required by the action + current `PENDING_APPROVAL` state + all applicable domain/security prerequisites.

No Approval Scope or Team match exists.

### BR-APR-002
`PENDING_APPROVAL` only reached by successful Reviewer Forward.

### BR-APR-003
From `PENDING_APPROVAL`, action-specific permitted actor MAY:

- Return to Reviewer → `PENDING_REVIEW`;
- Return to Requester → `REVISION_REQUIRED`;
- Reject → `REJECTED`;
- Approve → `APPROVED`.

### BR-APR-004
Return to Requester → revision → Resubmit MUST return `PENDING_REVIEW`.

### BR-APR-005
Approval MUST be audited.

### BR-APR-006
Approver pool non-exclusive; all users with required permission remain eligible while state valid.

### BR-APR-007
One successful final approval is sufficient.

### BR-APR-008
`Approved By` = actor who successfully commits `PENDING_APPROVAL -> APPROVED`.

### BR-APR-009
Stale second Approve cannot create another final approval for same iteration.

### BR-APR-010
Return/Reject reasons mandatory; Approve comment Optional.

---

# PART G — REJECT / REOPEN / REVERT

## 16. Rejection

### BR-REJ-001
Reject is not delete; record remains History.

### BR-REJ-002
Reviewer may Reject from `PENDING_REVIEW`; Approver may Reject from `PENDING_APPROVAL` with respective permissions.

### BR-REJ-003
`REJECTED` stops normal Requester edit/resubmit.

### BR-REJ-004
`REJECTED` MAY Reopen by actor with `nscmf.reopen`, authorized record access, and valid Reopen prerequisites. Team membership is irrelevant.

### BR-REJ-005
Reject requires mandatory reason.

## 17. Approved Reopen/Revert

### BR-REOPEN-001
`APPROVED` protected/read-only through normal workflow.

### BR-REOPEN-002
`APPROVED` MAY Reopen/Revert by actor with `nscmf.reopen`, authorized record access, and valid prerequisites.

### BR-REOPEN-003
Reopen from `REJECTED`/`APPROVED` requires mandatory reason.

### BR-REOPEN-004
Destination only:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

### BR-REOPEN-005
Reopen MUST NOT target `DRAFT` or `PENDING_APPROVAL`.

### BR-REOPEN-006
Reopen is event/action, not persistent state.

### BR-REOPEN-007
Previous rejection/approval evidence preserved.

### BR-REOPEN-008
Archived `REJECTED`/`APPROVED` MUST Unarchive before Reopen.

### BR-REOPEN-009
Successful Reopen starts a new workflow iteration.

---

# PART H — RECORD ACCESS, HISTORY, EXPORT

## 18. Record Access Model

Team is not used in record authorization.

Authorization follows permission + applicable resource/ownership/domain rules.

Requester-specific mutating actions remain own-record constrained where explicitly defined. Reviewer/Approver workflow eligibility is permission + state based.

No `Reviewer Scope`, `Approval Scope`, or organizational matching exists.

## 19. Timeline

Legitimate record viewer MUST be able to see Business Timeline according to RBAC/resource authorization. Routine access/view evidence remains separate Access Audit.

## 20. Export

### BR-EXP-001
Export requires authorized record access and `nscmf.export`.

### BR-EXP-002
No authorized view/access means no export.

### BR-EXP-003
Bulk export checks each selected record.

### BR-EXP-004
Export does not change business state.

### BR-EXP-005 — Exact Template Fidelity
Official XLSX template is visual/export source of truth. Generated XLSX/PDF MUST preserve template exactly and only fill mapped fields/native control states.

### BR-EXP-006
Native controls, formatting, merged cells, row/column dimensions, drawings/media, print settings must be preserved.

### BR-EXP-007
PDF renderer must pass golden fidelity qualification.

### BR-EXP-008
User-facing formats = XLSX and PDF.

### BR-EXP-009
All single/bulk export generation asynchronous.

### BR-EXP-010 — Immutable Deterministic Snapshot
Export request MUST bind to an immutable deterministic logical snapshot/version at request time. Worker MUST NOT silently export a later record version.

### BR-EXP-011
XLSX may be edited after download; local edit does not alter source record; no PDF-signing flow.

### BR-EXP-012
Approved PDF MUST be cryptographically signed by System/Organization.

### BR-EXP-013
Non-Approved PDF has no mandatory organization signature current MVP.

### BR-EXP-014
Signing failure on Approved PDF → export FAILED; no unsigned fallback.

### BR-EXP-015
Generated READY binary private and re-downloadable 168h/7d, then automatically cleaned.

### BR-EXP-016
After expiry eligible user may request a new export.

### BR-EXP-017
Signing identity custody/readiness follows `10_Security_Rules.md`.

### BR-EXP-018
Public no-login Approved PDF verification is required.

### BR-EXP-019
Genuine exact older PDF may become `VALID_SUPERSEDED`; superseded does not mean modified.

---

# PART I — AUDIT AND TRACEABILITY

## 21. Detailed Audit

### BR-AUD-001
Every persisted business change MUST be Business Audited, including Draft and authorized Result capture.

### BR-AUD-002
Audit must represent record, actor, timestamp, field/data element, old/new value, event context where applicable.

### BR-AUD-003
Business workflow/lifecycle events include create, save/autosave persistence, cancel, submit/resubmit, review actions, returns, reject, approve, reopen, archive/unarchive, numbering/attachment mutations, relevant admin changes.

### BR-AUD-004
Viewer/access actor and modifier/workflow actor MUST remain distinguishable.

### BR-AUD-005
Historical revisions/rejections/approvals MUST never overwrite.

### BR-AUD-006
Normal user cannot edit historical audit.

### BR-AUD-007
Access Audit remains logically separate from Business Timeline.

### BR-AUD-008
System distinguishes Business Audit, Access Audit, Security Audit, Technical Logs.

### BR-AUD-009
Business/Access/Security Audit MUST NOT be automatically purged by age.

### BR-AUD-010
7-day generated binary cleanup MUST NOT remove audits or issuance metadata.

### BR-AUD-011
Privileged raw Access/Security Audit visibility uses explicit audit permissions + applicable resource/admin authorization; no Team scope exists.

---

# PART J — ARCHIVE / DATA PRESERVATION

## 22. No Hard Delete

### BR-DEL-001
NSCMF MUST NOT have hard-delete capability, including Superadmin.

### BR-DEL-002
Archive replaces delete for eligible terminal/protected records.

### BR-DEL-003
Archive requires `nscmf.archive` + authorized record access + valid state/reason.

### BR-DEL-004
Archive does not rewrite business status.

### BR-DEL-005
Archive preserves record/history/audit/sign-off/attachment references according to policy.

### BR-DEL-006
Archive only `APPROVED`, `REJECTED`, `CANCELLED`.

### BR-DEL-007
Archived record leaves default active view but retains normal resource authorization rules; Team is not an access filter.

### BR-DEL-008
Unarchive allowed by `nscmf.archive` + authorization + reason.

### BR-DEL-009
Archive/Unarchive audited.

### BR-DEL-010
Archived record cannot perform normal business transition until Unarchive.

---

# PART K — SYSTEM ENFORCEMENT / CONCURRENCY

## 23. Server-Side Enforcement

### BR-INT-001
Required permission, explicit ownership where applicable, resource access, archive flag, current state, destination, validation, security preconditions MUST be checked server-side.

Team MUST NOT be inserted into authorization checks.

### BR-INT-002
Direct URL/ID/payload/API/bulk manipulation MUST NOT bypass rules.

### BR-INT-003
Failed action MUST NOT leave partial business state.

### BR-INT-004
Reviewer/Approver non-exclusive actions require current-state revalidation; stale conflict rejected.

### BR-INT-005
Required permission/state/domain validation + state update + required Business Audit evidence occurs as one consistent business action.

### BR-INT-006
Workflow/lifecycle transition uses short DB transaction + row-level pessimistic locking/current-state revalidation.

### BR-INT-007
Draft/Revision/Result persistence uses optimistic version conflict detection.

### BR-INT-008
Security/technical gates do not create business state.

---

## 24. Mandatory State Machine

```text
DRAFT
  |-- Cancel --> CANCELLED
  +-- Submit --> PENDING_REVIEW
                   |-- Return --> REVISION_REQUIRED -- Resubmit --> PENDING_REVIEW
                   |-- Reject --> REJECTED
                   +-- Forward --> PENDING_APPROVAL
                                    |-- Return Reviewer --> PENDING_REVIEW
                                    |-- Return Requester -> REVISION_REQUIRED
                                    |-- Reject -----------> REJECTED
                                    +-- Approve ----------> APPROVED
```

Reopen:

```text
REJECTED / APPROVED
  -> REVISION_REQUIRED or PENDING_REVIEW only
  -> starts new workflow iteration
```

Archive:

```text
business_status unchanged
is_archived = true/false
```

Emergency uses same Review + Approval sequence.

---

## 25. Confirmed Decisions Summary

| Area | Confirmed Decision |
|---|---|
| Organization | Single organization / single installation |
| Organizational structure | Team only; no Unit/Division |
| Team authorization effect | None |
| Reviewer/Approval Scope | None |
| Authorization | Permission-centric + state/ownership where explicitly required + domain/security checks |
| RBAC package | Spatie Laravel Permission 8.x; package schema reused |
| Spatie Teams | Disabled |
| Direct user permissions | Package table remains; normal MVP UI/workflow does not use direct assignment |
| Wildcards | Disabled |
| Multi-role | Allowed; union via Spatie role permissions |
| Authentication | Password-only, min 6, no composition, no MFA |
| Credential admin | Temporary password + forced change; sensitive admin requires re-auth |
| Session | 30m idle, 8h absolute, max2; authorization changes revoke affected sessions |
| Canonical states | `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` |
| Reviewer | Shared/non-exclusive, permission based, multiple contributors |
| Approver | Shared/non-exclusive, permission based, one final approval sufficient |
| Reopen | Rejected/Approved only; reason mandatory; Review/Revision target only; new workflow iteration |
| Normal Return/Revision | stays same workflow iteration |
| Change Result | owner narrow edit in PENDING_REVIEW; minimum one complete row before Forward |
| Attachment | Optional, current limits + ClamAV CLEAN gate |
| Audit | Business/Access/Security separated; no age purge |
| Export | exact template XLSX/PDF, all async, immutable deterministic snapshot |
| Approved PDF | System/Organization signature required |
| Public validator | signature + exact SHA-256 + issuance/currentness |
| Export binary | 168h/7d private retention |
| Workflow concurrency | row-lock current-state revalidation |
| Draft/Result concurrency | optimistic versioning |

---

## 26. Remaining Open Decisions

Intentionally deferred:

- exact default Team master data;
- official NSCMF numbering SOP/sample;
- notification provider/timing;
- additional export formats/bulk packaging beyond XLSX/PDF;
- performance/availability targets;
- backup/restore/DR/RPO/RTO;
- exact production deployment topology/provider;
- exact production certificate operational format/provider if external trust needs it.

Unit/Division, Reviewer Scope, Approval Scope, Team-based authorization, Spatie Teams, and direct-user permission UI are **not TBD**.

---

## 27. Implementation Guardrails

Developer/AI agent MUST NOT:

1. create Unit/Division model;
2. create reviewer scope or approval scope;
3. use Team as authorization boundary;
4. enable Spatie Teams for organizational Team;
5. duplicate Spatie `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` through custom equivalents;
6. expose direct permission-to-user assignment as normal MVP feature;
7. enable wildcard permissions or seed shorthand wildcards;
8. create self-registration;
9. delete/downgrade/disable protected Superadmin;
10. create NSCMF hard-delete;
11. make first Reviewer/Approver viewer exclusive owner;
12. restrict Reviewer contributors to one;
13. require all eligible Approvers to approve;
14. create more than one final approval per iteration;
15. allow Cancel after first Submit;
16. Reopen Cancelled;
17. Resubmit revision directly to Approval;
18. let Emergency bypass Review/Approval;
19. erase historical cycle;
20. make attachment mandatory;
21. make Service Impact single-select;
22. unlock full submitted Change form for Result capture;
23. remove required reasons;
24. create extra execution/result states;
25. replace official export controls/layout for convenience;
26. use HTML PDF fallback;
27. export a later version than immutable requested snapshot;
28. deliver unsigned Approved PDF after signing failure;
29. equate System/Organization signer with human Approved By;
30. age-purge authoritative audit;
31. treat ClamAV failure as CLEAN;
32. expose signing private key through GitHub/source/ordinary DB/browser;
33. treat genuine superseded PDF as modified solely due later Reopen/new approval.

---

## 28. Current Documentation Status

`05_State_Status_Flow.md` remains lifecycle source of truth. `06_Validation_Rules.md` controls validation. `07_UI_UX_Specification.md` controls presentation. `08_Tech_Stack_Specification.md` controls technology/package boundaries. `09_System_Architecture.md` controls logical topology/concurrency/audit/export architecture. `10_Security_Rules.md` controls security.

Next fixed-order document:

**`11_ERD_Database_Schema.md`** — must materialize Team separately from Spatie RBAC, reuse Spatie-owned tables, avoid scope tables, model workflow iterations/immutable snapshots, and preserve all locked data/security constraints.