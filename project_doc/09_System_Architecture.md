# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Architecture Baseline + Permission/Spatie Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk logical system architecture, component boundaries, interaction topology, synchronous/asynchronous execution boundaries, transaction/concurrency model, audit separation, attachment flow, dan export/signing/verification subsystem architecture**.

Confirmed architecture now explicitly incorporates the simplified authorization model:

- Team is organizational/profile data only;
- there is no Unit/Division model;
- there is no Reviewer Scope or Approval Scope subsystem;
- Reviewer/Approver eligibility is permission-centric;
- Spatie Laravel Permission 8.x owns role/permission primitives and standard RBAC tables;
- Spatie Teams is disabled;
- domain state/ownership/invariant/security checks remain outside Spatie;
- no custom permission-scope database or query engine is required.

Dokumen tidak menentukan exact tables/columns/API payloads/folders/env paths/final deployment topology. Those belong downstream.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default.
- **MAY** — allowed.
- **AUTHORITATIVE** — source of truth for the concern.
- **QUALIFIED** — production eligible after required tests.
- **FAIL CLOSED** — failure/uncertainty denies rather than permits.

---

# PART A — ARCHITECTURAL DRIVERS

## 3. Confirmed Drivers

Architecture MUST support:

1. single organization / installation;
2. Team organizational data, no Unit/Division;
3. username/password, no registration, min6/no composition/no MFA;
4. protected Superadmin;
5. multi-role permission-centric RBAC;
6. Spatie Permission 8.x package-owned RBAC schema;
7. Team-neutral Review/Approval eligibility;
8. explicit Requester ownership where business rules require it;
9. server-side permission/state/validation/security enforcement;
10. Activation + Change;
11. Draft autosave/manual save;
12. shared non-exclusive Reviewer/Approver pools;
13. one successful eligible final Approver sufficient;
14. canonical seven-state state machine;
15. workflow iteration semantics: first Submit establishes iteration, ordinary return/revision stays current, Reopen creates next;
16. narrow Change Result capture;
17. Business/Access/Security Audit separation and no age purge;
18. private optional attachments + ClamAV CLEAN gate;
19. MySQL History/search;
20. exact XLSX/PDF template export;
21. all export asynchronous through DB Queue;
22. immutable deterministic export snapshot binding;
23. Approved PDF System/Organization signing;
24. public validator signature + exact SHA-256 + issuance/currentness;
25. 168h/7-day generated binary retention;
26. no TSA MVP;
27. ~10 expected / 50-user engineering baseline;
28. Docker allowed;
29. no WebSocket/Redis/search-engine requirement;
30. testing/export/security regression first-class.

## 4. Priorities

1. business correctness;
2. authorization/security correctness;
3. workflow/state consistency;
4. auditability;
5. no data loss;
6. export fidelity;
7. fail-closed behavior;
8. maintainability;
9. simplicity proportional to scale;
10. evidence-based optimization.

---

# PART B — ARCHITECTURE STYLE

## 5. Modular Monolith

```text
Laravel 13 Modular Monolith
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
+ Database Queue Worker
+ Scheduler
+ Private Storage
+ ClamAV / clamd
+ Exact Export / Renderer / Signing / Verification boundaries
```

Logical module separation does not mean microservices.

## 6. Single Organization / Team

No tenant switcher, tenant middleware, tenant hostnames, artificial `tenant_id` everywhere, or multi-tenant authorization.

Business **Team** is ordinary organizational data associated with users/profile where applicable.

Team MUST NOT:

- scope roles/permissions;
- filter Reviewer/Approver eligibility;
- be passed to Spatie `setPermissionsTeamId()`;
- become a tenant boundary.

Spatie `teams` feature remains disabled.

## 7. Deployment-Agnostic Components

Logical components may be colocated/separated physically later:

- Web/Application Runtime;
- Queue Worker;
- Scheduler;
- MySQL;
- Private Storage;
- ClamAV/clamd;
- Spreadsheet Renderer;
- protected signing identity mount/storage.

---

# PART C — SYSTEM CONTEXT

## 8. High-Level Context

```text
+------------------------------+
| Internal User Browser        |
| Vue 3 + Inertia              |
+--------------+---------------+
               | HTTPS
               v
+----------------------------------------------------------------+
| Laravel 13 Application                                         |
|----------------------------------------------------------------|
| Identity / Session                                             |
| Spatie Role/Permission + Policies/Gates                        |
| NSCMF Domain / Validation / Workflow                           |
| Team / User Administration                                    |
| Business Audit / Access Audit / Security Audit                 |
| History / Attachment / Export / Public PDF Verification        |
+---------+---------------------+-------------------+--------------+
          | SQL                 | private I/O       | queue jobs
          v                     v                   v
+----------------+    +-------------------+   +-------------------+
| MySQL 8.4 LTS  |    | Private Storage   |   | Database Queue    |
| source of truth|    | attachment/export |   | + Worker          |
+----------------+    +---------+---------+   +---------+---------+
                               |                       |
                               | scan                  | export
                               v                       v
                       +---------------+    +-------------------------+
                       | ClamAV/clamd  |    | Exact Export Subsystem  |
                       | private only  |    | OOXML Patcher           |
                       +---------------+    | Spreadsheet Renderer    |
                                            | PdfSigningService       |
                                            +-------------------------+

Public visitor
→ rate-limited PDF verification
→ private temporary upload
→ ClamAV CLEAN
→ PdfVerificationService
→ signature + exact SHA-256 + issuance/currentness
```

Scheduler cleans expired export binaries, never age-purges authoritative audits.

## 9. Trust Boundaries

Untrusted:

- browser payloads/IDs;
- filenames/MIME/file content;
- public uploads;
- client-supplied state/permission/actor/version;
- client-supplied Team/role/permission admin values until validated.

Trusted authority:

- server-side authenticated session;
- Spatie/Laravel permission resolution;
- Laravel Policies/Gates;
- application/domain services;
- MySQL persisted state;
- protected template registry;
- protected signing identity;
- explicit ClamAV CLEAN.

Private key never reaches browser/public verifier.

---

# PART D — APPLICATION LAYERS

## 10. Presentation

Vue/Inertia presents UI/local state; not authoritative for permission, state, malware, signature, audit retention.

## 11. HTTP / Inertia Boundary

```text
Browser
→ route
→ auth/session
→ Gate/Policy required permission + resource checks
→ request validation / security preconditions
→ Application Action
→ transaction/persistence OR queued work
→ Inertia/structured response
```

No organizational scope middleware.

## 12. Application Action Layer

Conceptual actions:

```text
CreateNscmf
SaveDraft
SubmitNscmf
UpdateChangeResult
ReturnForRevision
RejectNscmf
ForwardToApproval
ApproveNscmf
ReopenNscmf
ArchiveNscmf
RequestNscmfExport
ScanAttachment
SignApprovedPdf
VerifyIssuedPdf
ResetUserCredential
ChangeUserRoles
ChangeRolePermissions
ChangeUserTeam
```

Controllers remain thin.

## 13. Domain Rule Layer

Maintains business/state/validation/protected invariants. Security preconditions wrap applicable actions. Team is not an authorization input.

## 14. Persistence

MySQL/Eloquent/Query Builder. Generic repository wrappers optional only when providing actual boundary value.

---

# PART E — LOGICAL MODULES

## 15. Identity & Authentication

Responsibilities:

- username/password login;
- throttling;
- DB sessions;
- temporary-password forced change;
- 30m idle / 8h absolute / max2 session enforcement;
- logout/revocation;
- disablement;
- protected Superadmin integration;
- sensitive-action password re-auth.

No MFA module.

## 16. User / Team / Role Administration

Responsibilities:

- application `users`;
- application `teams` organizational data;
- Spatie roles/permissions and user-role assignment;
- credential reset;
- protected settings.

There is no Unit/Division or Reviewer/Approval Scope subsystem.

Team mutation does not modify effective permission by itself.

Effective authorization-changing role/permission mutation triggers session revocation + Security Audit according to `10`.

## 17. Authorization

```text
Spatie permission resolution
+ Laravel Policy/Gate
+ ownership where an explicit rule requires it
+ current business state
+ archive treatment
+ validation
+ security preconditions
+ protected invariants
+ concurrency/current-state revalidation
```

Team is intentionally absent.

### 17.1 Spatie Package Boundary

Package-owned tables:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

ERD MUST reuse them and MUST NOT create duplicate RBAC tables.

### 17.2 Spatie Teams

`config('permission.teams') = false` current MVP.

Business Team is separate from Spatie Teams.

### 17.3 Direct Permissions

`model_has_permissions` remains package-owned, but normal MVP admin UX uses Permission → Role → User and does not expose direct user permission assignment.

### 17.4 Wildcard

Wildcard permission support stays disabled; documentation `foo.*` is shorthand only.

## 18. NSCMF Core / Form / Workflow

NSCMF Core owns identity/current status/version/archive/current workflow-iteration pointer or equivalent. Activation/Change own family data. Workflow owns exact transitions.

Persistent business statuses only:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

## 19. Workflow Iteration

Architecture MUST preserve historical iteration boundaries:

- first Submit → iteration 1;
- ordinary Return/Revision/Resubmit/Approver Return → same iteration;
- Reopen from Rejected/Approved → next iteration.

Old final Approval/Rejection/Reviewed By/Approved By and issued-PDF evidence remain attached to old iteration.

## 20. Business Audit

Authoritative append-oriented business mutation/workflow/lifecycle evidence. No age purge.

## 21. Access Audit

Separate view/download/access evidence. No state change, no assignment, no Business Timeline pollution, no age purge.

Privileged visibility uses permission + applicable resource/admin authorization, not Team scope.

## 22. Security Audit

Authentication, credential, role/permission, session, malware, signing readiness/failure, privileged security access evidence. No plaintext secrets. No age purge.

## 23. Technical Logging

Runtime/queue/renderer/scheduler/storage diagnostics, separate from authoritative audits.

## 24. History / Query

History, Review/Approval queues, archive filters, search, Business Timeline projections.

Review queue driven by applicable Review permissions/current state; Approval queue by Approval permissions/current state. Team MAY be displayed/filterable as business metadata but MUST NOT constrain authorization.

## 25. Attachment + Malware

```text
Browser upload
→ auth + permission/ownership/state check
→ structural validation
→ private quarantine
→ MalwareScanner
→ ClamAV
   ├─ CLEAN → promote/persist private attachment
   └─ otherwise → fail closed
```

## 26. Export / Signing / Verification

Export components:

```text
Export Orchestrator
Immutable Snapshot Builder/Repository
Template Registry
OOXML Patcher
Workbook Integrity Validator
SpreadsheetPdfRenderer
PdfSigningService
Issuance Metadata Repository
Export Artifact Repository
Queue Job / Worker
Cleanup Scheduler
```

Verification components:

```text
Public Verification Endpoint
Temporary Upload Store
ClamAV Gate
PdfVerificationService
Issuer Public-Certificate Registry
Issuance/Hash Lookup
Currentness Resolver
```

---

# PART F — DATA OWNERSHIP

## 27. Structured Business Data

MySQL = authoritative current structured data/state.

## 28. Team Data

Application Team master/profile relationship stored as ordinary relational domain data. It has no RBAC-scoping relationship to Spatie pivots.

## 29. Official Template

Versioned XLSX binary = exact export presentation authority.

## 30. Attachments

Binary private storage; metadata/record/security binding in MySQL.

## 31. Generated Export Binary

Temporary derived artifact, 168h/7d.

## 32. Immutable Export Snapshot

At export request, system creates/binds an immutable deterministic structured snapshot representing exactly the logical data required for requested export, together with record version/workflow iteration/template context.

Worker never re-resolves mutable business fields from a later record state to generate that request.

Snapshot exact schema belongs to `11`.

## 33. Issuance / Verification Metadata

Approved signed PDF historical metadata survives binary cleanup. Conceptually includes issuance ID, record, immutable snapshot/version, workflow iteration, timestamp, certificate identity/fingerprint, final signed PDF SHA-256, current/superseded context.

## 34. Audit Evidence

Business/Access/Security Audit no age-based deletion.

---

# PART G — SYNCHRONOUS PATHS

## 35. Login

```text
Browser
→ login route
→ throttle
→ resolve active username
→ password verify
→ session regenerate/create
→ max2 enforcement
→ temporary-password gate if applicable
→ app
```

No Spatie permission check is required to perform login; login/logout are authentication operations.

## 36. Record Read

```text
Browser
→ auth/session
→ Policy/Gate + applicable resource permission/ownership rule
→ query
→ Access Audit
→ Inertia detail
```

No Team scope.

## 37. Sensitive Administration

```text
admin
→ current-password re-auth
→ admin permission + protected invariant checks
→ application action
→ Spatie role/permission mutation and/or credential mutation
→ Security/Business Audit as appropriate
→ revoke affected target sessions when effective authorization changes
```

Team-only change does not inherently revoke sessions because it does not change permission.

---

# PART H — CONCURRENCY

## 38. Strategy

```text
workflow/lifecycle transition
→ short transaction + row-level lock/current-state revalidation

Draft/Revision/Result persistence
→ optimistic version check
```

## 39. Workflow Transaction

Within lock re-check required permission, ownership/resource authorization where applicable, archive flag, current state, action validation, destination, security prerequisites; persist mutation + required Business Audit atomically.

No Team/scope validation.

## 40. Optimistic Persistence

Expected version required. Mismatch → explicit conflict, no silent overwrite.

---

# PART I — SIDE EFFECT / FAILURE BOUNDARIES

## 41. Long Work

Notification/export/render/sign work after commit or queued. Malware scan does not hold workflow row lock.

## 42. Attachment Failure

Quarantine → scan → promote/persist controlled sequence; compensate orphan on DB/storage failure; never publicly expose untrusted object.

## 43. Download

Only CLEAN attachment through parent-record authorization.

---

# PART J — EXPORT ARCHITECTURE

## 44. Formats

XLSX/PDF from official XLSX template + immutable snapshot. XLSX not PDF-signed; Approved PDF mandatory signed; non-Approved PDF not mandatory signed current rule.

## 45. Async Export

```text
User request
→ authorize
→ create immutable snapshot
→ create export request bound to snapshot/version/iteration/template
→ queue job
→ immediate queued response

Worker
→ read bound snapshot
→ exact generation/render/sign
→ READY/FAILED metadata
```

Technical statuses never NSCMF business statuses.

## 46. OOXML Patching

Immutable template copy + mapped changes only; preserve native controls/unrelated OOXML parts; generic rewrite forbidden where unsupported parts may be stripped.

## 47. Renderer

Qualified spreadsheet renderer only. Fidelity failure → FAILED; no HTML fallback.

## 48. Approved PDF

```text
APPROVED immutable snapshot
→ exact filled XLSX
→ integrity validation
→ qualified renderer
→ exact PDF
→ PdfSigningService
→ final signed PDF bytes
→ SHA-256(final bytes)
→ issuance metadata with workflow iteration
→ private READY artifact + 168h expiry
```

Signing failure → export FAILED; NSCMF remains Approved; no unsigned fallback.

---

# PART K — SIGNING / PUBLIC VERIFICATION

## 49. Signer Identity

System/Organization signer is distinct from human Approved By.

## 50. Key Custody

Private key + public verification material manually provisioned protected environment; no GitHub/source/ordinary DB/browser. Historical public cert material remains resolvable after rotation.

## 51. Readiness

Missing/unusable required signing identity → critical not-ready/configuration failure; no silent unsigned behavior.

## 52. TSA

Not required current MVP; no independent third-party timestamp claim.

## 53. Public Boundary

`/ispdfvalid` conceptual no-login route; narrow utility only.

## 54. Verification Flow

```text
rate-limited PDF upload
→ private temp
→ ClamAV CLEAN
→ signature issuer verification
→ exact SHA-256
→ issuance/snapshot/workflow-iteration lookup
→ currentness resolution
→ CURRENT / SUPERSEDED / MODIFIED / UNKNOWN
→ temp delete
```

Minimum disclosure only.

---

# PART L — QUEUE / SCHEDULER / FAILURES

## 55. Queue

Retry-aware/idempotent export jobs; retry cannot mutate NSCMF state.

## 56. Scheduler

Expired binary/workspace cleanup. MUST NOT auto-advance workflow, age-purge authoritative audits, or delete issuance metadata needed for historical validation.

## 57. Failure Isolation

- DB workflow failure → no partial transition;
- storage failure → no false attachment/export success;
- ClamAV uncertain → not CLEAN;
- OOXML/integrity/renderer failure → export FAILED;
- signing failure → Approved PDF FAILED, NSCMF remains Approved;
- public verification uncertainty → never `VALID_CURRENT`.

---

# PART M — MODULE DEPENDENCY / GUARDRAILS

## 58. Preferred Dependency Direction

```text
Presentation / HTTP
        ↓
Application Actions
        ↓
Permission / Domain / Validation / Security Preconditions
        ↓
Persistence / Audit / Storage / Scanner / Renderer / Signing adapters
```

## 59. Forbidden Coupling

MUST NOT:

- let Vue determine permission/state/security truth;
- let Team membership determine authorization;
- let storage path authorize;
- let renderer/signing/ClamAV mutate business state;
- let Access Audit mutate workflow;
- let technical log replace audit;
- let PDF signer replace Approved By;
- let public verifier expose private data;
- let Spatie Teams become hidden authorization scope.

---

# PART N — SCALE / OBSERVABILITY

## 60. 50-User Baseline

MySQL + database queue/session/cache + modular monolith appropriate. ClamAV/renderer resource cost considered in deployment sizing.

## 61. Minimum Signals

Application errors, auth/throttle failures, authorization denials where useful, stale conflicts, queue depth/failure, scanner health, export stages/duration, template/renderer/signing failures, public validator abuse/failures, scheduler/storage failures.

---

# PART O — IMPORTANT SEQUENCES

## 62. Workflow

```text
Requester Submit
→ permission + ownership + lock/current-state
→ DRAFT -> PENDING_REVIEW + Business Audit
→ establishes workflow iteration 1

Reviewer Forward
→ review permission + lock/current-state
→ PENDING_REVIEW -> PENDING_APPROVAL + Business Audit

Approver Approve
→ approve permission + lock/current-state
→ PENDING_APPROVAL -> APPROVED + approved_by + Business Audit
```

No Team/scope check.

## 63. Reopen

```text
APPROVED/REJECTED
→ nscmf.reopen + authorized access + reason + valid target
→ locked transition
→ next workflow iteration
```

## 64. Draft Autosave

```text
expected_version
→ permission + ownership + DRAFT_PERSIST
→ optimistic update + audit
→ version++
```

## 65. Attachment

```text
upload
→ permission/ownership/state + validation
→ private quarantine
→ CLEAN only
→ persist/promote
```

## 66. Approved PDF

```text
request
→ authorize + immutable snapshot
→ queue
→ OOXML + integrity
→ renderer
→ sign
→ final hash + issuance iteration metadata
→ private READY 168h
```

---

# PART P — CONFIRMED ARCHITECTURE DECISIONS

## 67. Summary

| Concern | Decision |
|---|---|
| Organization | single organization |
| Organizational unit | Team only, ordinary data |
| Team authorization | none |
| Reviewer/Approval Scope | none |
| Authorization package | Spatie Permission 8.x |
| Spatie tables | reuse package-owned schema |
| Spatie Teams | disabled |
| Direct user permission | not normal MVP admin flow |
| Wildcard permission | disabled |
| Style | modular Laravel monolith |
| DB | MySQL 8.4 LTS |
| Session/cache | DB-backed baseline |
| Async | DB Queue |
| Workflow concurrency | short transaction + row lock |
| Draft/Result | optimistic version |
| Workflow iteration | first Submit=1; same-cycle return/revision same; Reopen next |
| Audit | three authoritative classes + technical logs; no age purge |
| Attachment | private + ClamAV CLEAN |
| Export | async exact XLSX/PDF + immutable snapshot |
| Approved PDF | mandatory organization signing |
| Public validator | signature + exact hash + issuance/currentness |
| Binary retention | 168h/7d |
| TSA | none required MVP |

---

# PART Q — DEVELOPER / AI GUARDRAILS

## 68. MUST NOT

1. add hidden multi-tenancy;
2. reintroduce Unit/Division;
3. create Reviewer/Approval scope subsystem;
4. use Team as access filter;
5. enable Spatie Teams;
6. duplicate Spatie RBAC tables;
7. expose direct user permissions as normal MVP;
8. enable wildcard permissions;
9. bypass Policies/state/invariants because permission exists;
10. hold DB lock during upload/scan/render/sign;
11. silently overwrite stale Draft/Result;
12. execute transition without locked current-state revalidation;
13. commit successful workflow without required Business Audit;
14. pollute Business Timeline with routine access;
15. age-purge authoritative audit;
16. expose private attachment/export via predictable public path;
17. use storage path as permission;
18. treat upload validation as CLEAN;
19. expose clamd publicly;
20. render export synchronously inside workflow transaction;
21. let worker read newer mutable data instead of bound snapshot;
22. generic-rewrite XLSX if controls may strip;
23. use HTML PDF fallback;
24. sign XLSX under PDF rule;
25. require personal Approver certificate;
26. put private signing key in source/DB/browser;
27. deliver unsigned Approved PDF;
28. claim TSA current MVP;
29. make public verifier a record portal;
30. classify genuine superseded PDF as modified solely due workflow change;
31. delete source/audit/issuance when binary expires;
32. let scheduler advance workflow;
33. add Redis/Kafka/search without evidence.

---

# PART R — ACCEPTANCE / DOWNSTREAM

## 69. Authorization Architecture Acceptance

- [ ] no tenant layer;
- [ ] Team domain exists but no Team authorization;
- [ ] Spatie package tables reused;
- [ ] Spatie Teams disabled;
- [ ] no reviewer/approver scope schema/service/query layer;
- [ ] Review/Approval actions use granular permission + state/domain conditions;
- [ ] Requester own actions retain ownership checks;
- [ ] protected Superadmin cannot bypass invalid domain states.

## 70. Concurrency / Audit / Attachment / Export

All locked requirements above are testable: row-lock workflow, optimistic editable persistence, separate no-age-purge audits, private CLEAN attachments, immutable-snapshot export, exact template, signed Approved PDF, public verification.

## 71. `11_ERD_Database_Schema.md`

ERD MUST materialize at least:

- application `users` + Team relationship;
- business Team tables separately from Spatie;
- Spatie-owned `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` without duplicate RBAC schema;
- no Unit/Division/scope tables;
- canonical record status/archive/version;
- workflow iterations and sign-off history;
- separate Business/Access/Security audits;
- attachment metadata/security state;
- sessions/security account state as required;
- immutable export snapshots;
- export requests/artifacts/template registry;
- PDF issuance/final SHA-256/certificate reference/currentness metadata;
- numbering sequence;
- constraints/indexes.

## 72. Remaining TBD

Exact schema/API/container/provider/logging/notification/numbering SOP/certificate operational details/backup-DR/performance topology remain downstream. Team default master data remains TBD.

## 73. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| Flow | `03_User_Flow.md` |
| Permission/Spatie/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| Tech | `08_Tech_Stack_Specification.md` |
| **Architecture** | **`09_System_Architecture.md`** |
| Security | `10_Security_Rules.md` |
| Schema | `11_ERD_Database_Schema.md` |

## 74. Next Document

Next fixed-order document:

**`11_ERD_Database_Schema.md`**.