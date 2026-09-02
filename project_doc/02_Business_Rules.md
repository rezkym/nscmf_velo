# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-09-02  

---

## 1. Purpose

Dokumen ini mendefinisikan aturan bisnis yang wajib dipatuhi seluruh implementasi NSCMF Digital Form & Workflow System.

Aturan berlaku lintas UI, backend, database, API, automation, dan AI coding agent. Frontend tidak boleh menjadi satu-satunya enforcement layer; business rules mengenai permission, ownership, state, editability, validation, workflow, Team treatment, audit, security, dan protected settings MUST divalidasi server-side sesuai authority masing-masing.

Dokumen bekerja bersama:

- `03_User_Flow.md` — urutan interaksi user;
- `04_RBAC_Permission_Matrix.md` — permission-centric authorization dan Spatie/Team boundary;
- `05_State_Status_Flow.md` — authoritative state machine dan workflow-iteration rules;
- `06_Validation_Rules.md` — validitas field/input/action;
- `07_UI_UX_Specification.md` — presentation/interaction detail;
- `08_Tech_Stack_Specification.md` — technology baseline;
- `09_System_Architecture.md` — component/concurrency/audit/export architecture;
- `10_Security_Rules.md` — authentication/session, permanent audit security, secrets, signing-key custody, public PDF verification;
- `11_ERD_Database_Schema.md` — physical relational materialization;
- `12_API_Contract.md` — HTTP contract;
- `13_Project_Structure.md` — source-code organization;
- `14_Environment_Specification.md` — upcoming runtime/environment authority once created.

Normative language: MUST, MUST NOT, MAY, SHOULD, TBD, PROVISIONAL.

---

# PART A — INITIAL SETUP, ORGANIZATION, USERS, ROLES

## 2. Initial Setup Wizard

### BR-SETUP-001 — Wizard Required
After first protected Superadmin login on new installation, application MUST provide first-time Setup Wizard.

### BR-SETUP-002 — Role Setup Mode
Wizard MUST offer `Use Role Template` or `Manual Role Configuration`.

### BR-SETUP-003 — Minimum Default Roles
Template minimum: `Superadmin`, `Requester`, `Reviewer`, `Approver`.

### BR-SETUP-004 — Template Remains Configurable
Eligible role/permission MAY be changed after setup subject to protected Superadmin invariants.

### BR-SETUP-005 — Team Setup
Organization uses **Team**, not Unit/Division. Exact default Team entries remain TBD and MUST NOT be guessed.

### BR-SETUP-006 — User Team Mapping
Normal user has organizational Team association according to data model. Team is profile/organization data, not authorization scope.

### BR-SETUP-007 — No Reviewer / Approval Scope
No Reviewer Scope, Approval Scope, Unit Scope, Division Scope, or Team-based permission scope.

### BR-SETUP-008 — Core System Settings Protected
Protected Core System Settings are **Protected Superadmin-only**. This includes the confirmed Technical Log automatic-cleanup/retention setting.

Current Technical Log defaults:

```text
Automatic Cleanup = ON
Retention = 30 DAY
```

Protected Superadmin MAY later set cleanup ON/OFF and choose a positive retention value in `DAY` or `MONTH`. There is no fixed product maximum retention. This setting never changes Business/Access/Security Audit retention.

Mutation requires the security re-authentication behavior defined in `10_Security_Rules.md`.

### BR-SETUP-009 — Single Organization
Single organization / single installation. Team is not tenant boundary.

---

## 3. Protected Superadmin

### BR-SUPER-001
Initial seeding creates at least one protected Superadmin.

### BR-SUPER-002
Protected Superadmin is highest authority in standard template with global operational visibility.

### BR-SUPER-003
Protected Superadmin cannot hard-delete, soft-delete, disable, lose protected role, or be downgraded.

### BR-SUPER-004
Protection applies through UI/API/import/bulk/seed/update/admin flows.

### BR-SUPER-005
Protected identity does not mean plaintext credential/secret in source.

### BR-SUPER-006 — No Invalid-Domain Bypass
Protected Superadmin remains subject to canonical state, validation, mandatory reasons, signing/security requirements, and unavailable capabilities such as NSCMF hard-delete.

### BR-SUPER-007 — Protected Settings Identity Gate
For protected Core System Settings, `system.settings.manage` alone is insufficient: actor MUST also be the Protected Superadmin and satisfy sensitive re-authentication.

---

## 4. User, Role, Team, Permission Administration

### BR-USER-001 — No Self-Registration
Normal user MUST NOT self-register.

### BR-USER-002 — Administrative Creation
Account created by Superadmin or actor with applicable user-management permission.

### BR-USER-003 — Delegated Administration
Required-permission actor MAY manage eligible normal user, Team assignment, role assignment, credential reset, enable/disable, role-permission configuration, except protected Core Settings/invariants.

### BR-USER-004 — Multi-Role
One user MAY have multiple roles.

### BR-USER-005 — No Mandatory Segregation of Duty
Current business decision does not require Requester != Reviewer != Approver.

### BR-USER-006 — No Impersonation
No login-as-user feature.

### BR-USER-007 — Authorization Technology Boundary
Business authorization uses Spatie role/permission primitives + Laravel Policies/Gates + explicit ownership where required + domain state/archive/validation/security/concurrency checks.

### BR-USER-008 — Team Is Not Authorization
Team MUST NOT grant/revoke/filter Review/Approval permissions/candidates or create hidden tenant boundary.

### BR-USER-009 — Spatie Teams Disabled
Business Team and Spatie Teams are different. Spatie `teams` remains disabled.

### BR-USER-010 — Role-First Permission Administration
Current MVP normally assigns Permission → Role → User. Direct-user permission UI absent.

### BR-USER-011 — Authentication Security Boundary
Password-only; minimum 6; no composition; no MFA.

### BR-USER-012 — Administrative Credential Flow
Admin-created/reset credentials MUST use a **server-generated temporary password**. The acting authorized administrator receives the plaintext **exactly once** after successful creation/reset and conveys it through an internal channel. The application stores only the hash, never provides later plaintext retrieval, and forces target replacement before normal navigation.

Sensitive role/permission/password-reset/Core-Settings actions require current-password re-authentication. Successful proof lifetime is **15 minutes**.

### BR-USER-013 — Security Change Session Revocation
Password reset, role assignment/removal, effective role-permission changes, disablement, or equivalent authorization mutation revoke applicable active sessions. Team change alone does not.

---

# PART B — FORM FAMILY AND EXCEL BUSINESS MEANING

## 5. Main Form Families

### BR-FORM-001
Provide `NSCMF - Activation` and `NSCMF - Change`.

### BR-FORM-002 — Activation Context
Activation = installation/provisioning; subtypes Activation, Upgrade/Downgrade, Deactivation.

### BR-FORM-003 — Change Context
Change = maintenance/change to existing service/environment; subtypes Maintenance, Upgrade, Emergency.

### BR-FORM-004 — Upgrade Is Contextual
Keyword `Upgrade` alone MUST NOT determine family.

---

## 6. NSCMF Change Semantics

### BR-CHG-001
`Purpose of Changes` is section, not option.

### BR-CHG-002
`Facing Challenges` is input content, not subtype selector.

### BR-CHG-003
`Maintenance Purpose` is input content.

### BR-CHG-004
`Identified Problem` is narrative input.

### BR-CHG-005 — Service Impact
Multi-select from NOC15/NOC23/NOC361/Regional/POP/Customer/Other; minimum one at Submit/Resubmit; Other requires description.

### BR-CHG-006
Maintenance Plan and Target KPI are paired; current validation requires at least one complete pair on Submit/Resubmit.

### BR-CHG-007
Change represents target date, monitoring period, rollback scenario, and Maintenance Announcement.

### BR-CHG-008 — Result of Changes Is Distinct Data
Separate section with Result Summary, Performance Information, Status.

### BR-CHG-009 — No New Result State
No EXECUTION_PENDING/RESULT_PENDING/COMPLETED business status.

### BR-CHG-010 — Result Before Forward
Applicable Result must be complete before leaving PENDING_REVIEW via Forward.

### BR-CHG-011 — First Submit May Have Zero Results
Zero rows allowed; started row internally complete.

### BR-CHG-012 — Narrow Result Capture
Requester/owner + `nscmf.change.result.edit` + own Change + PENDING_REVIEW may edit Result-only fields.

### BR-CHG-013 — Result Forward Gate
At least one complete Result row before Forward; max five is capacity, not mandatory count.

---

# PART C — RECORD CREATION, NUMBERING, DRAFT, CANCELLATION, ATTACHMENT

## 7. Record Creation

### BR-REC-001
Every NSCMF has requester/owner context and creator identity.

### BR-REC-002
Creation order: family → subtype → numbering mode → fields.

### BR-REC-003
Automatic or Manual numbering mode per record.

### BR-REC-004 — Provisional Automatic Numbering
Until official SOP:

```text
NSCMF-YYYYMM-#####
```

Global monthly, server-generated, unique, concurrency-safe, gaps allowed, never reuse.

### BR-REC-005 — Manual Number
Follow provisional rules in `06`.

### BR-REC-006 — Number Immutability
May correct during Draft; immutable after first successful Submit.

---

## 8. Draft and Autosave

### BR-DRAFT-001
New record = DRAFT.

### BR-DRAFT-002
Requester MAY edit own eligible Draft with permission.

### BR-DRAFT-003
Editable Draft supports autosave + Save Draft.

### BR-DRAFT-004
Persisted Draft changes Business Audited.

### BR-DRAFT-005
Draft MAY be incomplete.

### BR-DRAFT-006
Submission-required fields do not block Draft persistence.

### BR-DRAFT-007 — Optimistic Concurrency
Stale version rejected; no silent overwrite.

---

## 9. Cancellation

### BR-CAN-001
Requester MAY Cancel own DRAFT only before first Submit.

### BR-CAN-002
First Submit removes normal Cancel right.

### BR-CAN-003
Cancel → CANCELLED, permanent terminal, no Reopen.

### BR-CAN-004
Cancel is not delete.

### BR-CAN-005
Actor/timestamp captured; reason optional.

---

## 10. Attachments

### BR-ATT-001
Attachment input exists.

### BR-ATT-002
Attachment optional.

### BR-ATT-003
Add/remove/replace attachment reference audited.

### BR-ATT-004 — Limits / Security
Max10/record, max20MB/file, zero-byte reject, locked allowlist, private storage, only explicit whole-file ClamAV CLEAN usable.

Resumable baseline: 5 MiB chunks, 24h inactivity expiry, server final SHA-256 authoritative.

Current initial production storage is Laravel private **local** filesystem on persistent/non-ephemeral server storage; third-party object storage is not current MVP. Storage backend is infrastructure, never authorization.

### BR-ATT-005
Missing attachment on Change Upgrade/Emergency is warning, not blocker.

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

No SUBMITTED/UNDER_REVIEW/REVIEWED/REOPENED/ARCHIVED as business state.

## 12. Submit

### BR-SUB-001
Submit only if validation passes.

### BR-SUB-002
DRAFT → PENDING_REVIEW.

### BR-SUB-003
After Submit, general Requester edit locked except narrow Change Result.

### BR-SUB-004
Requester does not select Reviewer; permission-based shared pool; Team irrelevant.

---

## 13. Reviewer Participation

### BR-REV-001
Review action = exact required permission + eligible PENDING_REVIEW + normal prerequisites; no Team scope.

### BR-REV-002
Non-exclusive; first viewer not owner.

### BR-REV-003
Access evidence distinct from workflow action.

### BR-REV-004
Multiple contributors allowed.

### BR-REV-005
View never changes state.

### BR-REV-006
Return→REVISION_REQUIRED; Reject→REJECTED; Forward→PENDING_APPROVAL.

### BR-REV-007
Emergency still requires Review.

### BR-REV-008
Change Forward fails if Result gate not satisfied.

### BR-REV-009
Return/Reject reason mandatory; Forward comment optional.

---

# PART E — REVISION / ITERATION

## 14. Return for Revision

Return enables Requester editing; Resubmit always → PENDING_REVIEW; unlimited cycles; history preserved; no direct REVISION_REQUIRED→PENDING_APPROVAL.

## 14A. Workflow Iteration

### BR-ITER-001
First successful Submit establishes iteration 1.

### BR-ITER-002
Normal Return/Revision/Resubmit stays in same iteration.

### BR-ITER-003
Reopen from REJECTED/APPROVED starts next iteration.

---

# PART F — APPROVAL

## 15. Approver Eligibility and Actions

Permission-based, no Team scope. PENDING_APPROVAL reached by successful Forward. Actions Return Reviewer→PENDING_REVIEW, Return Requester→REVISION_REQUIRED, Reject→REJECTED, Approve→APPROVED. One valid final Approve sufficient. Approved By = successful transition actor. Stale action denied. Return/Reject reason mandatory; Approve comment optional.

---

# PART G — REJECT / REOPEN

## 16. Rejection

Rejected is not delete. Reopen requires `nscmf.reopen`, authorized access, not archived, mandatory reason; Team irrelevant.

## 17. Approved Reopen/Revert

Approved read-only through normal flow; authorized Reopen only to REVISION_REQUIRED or PENDING_REVIEW; never DRAFT/PENDING_APPROVAL; preserves evidence; unarchive first; starts new iteration.

---

# PART H — RECORD ACCESS, HISTORY, EXPORT

## 18. Record Access Model

Permission + resource/ownership/domain rules, not Team.

## 19. Timeline

Authorized viewer sees Business Timeline; routine access evidence remains Access Audit.

## 20. Export

### BR-EXP-001/002/003
Export requires `nscmf.export` + authorized record; bulk checks each record.

### BR-EXP-004
Export does not change business state.

### BR-EXP-005/006/007
Official XLSX exact template authority; preserve controls/layout; renderer must pass golden fidelity.

### BR-EXP-008/009
Formats XLSX/PDF only; all asynchronous.

### BR-EXP-010
Request binds immutable deterministic snapshot/version.

### BR-EXP-011/012/013/014
XLSX not PDF-signed; Approved PDF mandatory System/Organization signature; non-Approved no mandatory org signature; signing failure → FAILED/no unsigned fallback.

### BR-EXP-015/016
READY binary private, re-downloadable 168h/7d then automatic binary cleanup; new export can be requested.

### BR-EXP-017
Signing identity custody follows Security Rules.

### BR-EXP-018/019
Public no-login Approved PDF verification required; genuine older PDF may be VALID_SUPERSEDED.

### BR-EXP-020 — Official Template Provisioning
Official template binary is immutable/versioned/private with SHA-256 + mapping-version binding. New official template creates a new version rather than overwriting the old binary. Environment readiness must verify the active template hash before use.

---

# PART I — AUDIT / TECHNICAL LOGS

## 21. Detailed Audit

### BR-AUD-001–008
Persisted business changes audited; field old/new where applicable; business/access/security/technical logs remain distinguishable.

### BR-AUD-009
Business/Access/Security Audit MUST NOT be automatically purged by age.

### BR-AUD-010
7-day export binary cleanup does not remove audits/issuance metadata.

### BR-AUD-011
Privileged raw Access/Security Audit uses explicit permissions + applicable authorization; no Team scope.

### BR-AUD-012 — Technical Log Cleanup Is Separate
Technical application/runtime logs are operational diagnostics and MAY be automatically cleaned according to the Protected Core Setting:

```text
default Automatic Cleanup = ON
default retention = 30 DAY
Protected Superadmin may choose ON/OFF
Protected Superadmin may choose positive DAY/MONTH retention
no fixed product maximum
```

This rule MUST NOT be applied to Business Audit, Access Audit, Security Audit, workflow history, NSCMF records, or PDF issuance/certificate history.

---

# PART J — ARCHIVE / DATA PRESERVATION

## 22. No Hard Delete

No NSCMF hard-delete, including Superadmin. Archive only Approved/Rejected/Cancelled, permission + authorization + reason, status unchanged, history preserved, Unarchive allowed with same permission/reason, archived record blocked from normal transition until unarchive.

---

# PART K — SYSTEM ENFORCEMENT / CONCURRENCY

## 23. Server-Side Enforcement

Permission, ownership where required, resource access, archive, state, destination, validation, security preconditions checked server-side. Team absent. Direct URL/payload/bulk manipulation cannot bypass. Failed action no partial state. Workflow uses short transaction + row lock; Draft/Revision/Result optimistic versioning. Security/technical gates create no business states.

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

Reopen Approved/Rejected → REVISION_REQUIRED or PENDING_REVIEW and starts new iteration. Archive independent flag. Emergency same Review+Approval.

---

# PART L — CONFIRMED DECISIONS SUMMARY

## 25. Confirmed Decisions

| Area | Confirmed Decision |
|---|---|
| Organization | Single organization / single installation |
| Organizational structure | Team only; no Unit/Division |
| Team authorization | None |
| Reviewer/Approval Scope | None |
| RBAC | Spatie Permission 8.x; package schema reused; teams/wildcards disabled |
| Multi-role | Allowed |
| Authentication | Password-only min6/no composition/no MFA |
| Temporary credential | Server-generated; one-time reveal to acting admin; forced target replacement |
| Sensitive re-auth | Current password; proof lifetime 15 minutes |
| Session | 30m idle / 8h absolute / max2; third valid login revokes oldest |
| Canonical states | seven locked statuses |
| Reviewer | shared/non-exclusive/permission-based |
| Approver | shared/non-exclusive/one final approval |
| Reopen | Approved/Rejected only; reason; Review/Revision target; new iteration |
| Change Result | narrow owner edit; at least one complete row before Forward |
| Attachment | optional; resumable 5 MiB; 20MB; CLEAN gate |
| Initial production storage | persistent Laravel private local filesystem; no third-party object storage current MVP |
| Audit | Business/Access/Security no age purge |
| Technical Logs | protected configurable cleanup; default ON/30 DAY; DAY/MONTH or OFF |
| Export | exact-template XLSX/PDF, async immutable snapshot |
| Official template | immutable/versioned/private + SHA-256 readiness |
| Approved PDF | System/Organization signing required |
| Public validator | signature/hash/issuance/currentness; max20MB |
| Canonical app timezone | `Asia/Jakarta` |
| Workflow concurrency | row-lock state revalidation |
| Draft/Result concurrency | optimistic versioning |

---

## 26. Remaining Open Decisions

Still deferred:

- exact default Team master data;
- official NSCMF numbering SOP/sample;
- notification provider/timing;
- bulk export packaging;
- exact numeric rate-limit buckets;
- performance/availability targets;
- backup/restore/DR/RPO/RTO;
- signing provider/library/CA/path/rotation mechanics;
- exact ClamAV/renderer physical topology;
- exact production physical deployment topology.

Not TBD anymore: temporary credential direction, re-auth proof lifetime, public validator max upload, canonical timezone, initial production storage class, Technical Log cleanup policy/default.

---

## 27. Implementation Guardrails

Developer/AI MUST NOT reintroduce Unit/Division/scope/Team authorization/Spatie Teams/duplicate RBAC/wildcards/self-register/hard-delete/exclusive Reviewer/Approver/all-approvers-required/Emergency bypass/extra states/mandatory attachment/generic workbook rewrite/HTML PDF/unsigned Approved PDF/System signer=human Approver/authoritative audit purge/ClamAV failure=CLEAN/private signing key in source/DB/browser.

Additionally MUST NOT:

- use S3/object storage as current MVP requirement;
- store acknowledged production chunks on ephemeral-only storage;
- make temporary password admin-entered or retrievable after one-time reveal;
- make sensitive re-auth proof longer/permanent without spec change;
- accept public verifier PDF >20MB;
- let Technical Log cleanup touch authoritative audits;
- hard-code 30 days as an immutable product rule rather than the default setting.

---

## 28. Current Documentation Status

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
