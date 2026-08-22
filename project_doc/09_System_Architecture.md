# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Architecture Baseline + Permission/Spatie + Resumable Attachment Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-22

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

Attachment architecture also incorporates the confirmed resumable-upload model:

- attachment upload uses resumable fixed-size chunks;
- default chunk size is **5 MiB**;
- unfinished upload sessions expire **24 hours after the last successful upload activity**;
- successful chunks are preserved in private storage so a recoverable network/application interruption does not force the user to restart from byte zero;
- client SHA-256 is only a resume-identification hint, never the authoritative attachment hash;
- authoritative SHA-256 and ClamAV evaluation happen server-side after complete-file assembly;
- ClamAV evaluates the **full assembled file**, not individual chunks as a substitute for whole-file scanning.

Dokumen tidak menentukan exact API payloads/folders/env paths/final deployment topology. Exact API contract belongs to `12_API_Contract.md`.

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
18. private optional attachments + resumable **5 MiB** chunk upload + **24h inactivity** cleanup + ClamAV whole-file `CLEAN` gate;
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
- Private Storage, including attachment quarantine/resumable-upload temporary objects;
- ClamAV/clamd;
- Spreadsheet Renderer;
- protected signing identity mount/storage.

For production, resumable attachment progress MUST NOT depend solely on ephemeral application-server local filesystem. Successfully acknowledged chunks MUST live in durable private storage that survives ordinary application process restart/redeploy according to the selected production storage topology.

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
+----------------+    +---------------------------+   +-------------------+
| MySQL 8.4 LTS  |    | Private Storage           |   | Database Queue    |
| source of truth|    | chunk/quarantine/attach/  |   | + Worker          |
| upload metadata|    | export                    |   +---------+---------+
+----------------+    +-------------+-------------+             |
                                   |                             | export
                                   | assembled-file scan         v
                                   v                 +-------------------------+
                           +---------------+         | Exact Export Subsystem  |
                           | ClamAV/clamd  |         | OOXML Patcher           |
                           | private only  |         | Spreadsheet Renderer    |
                           +---------------+         | PdfSigningService       |
                                                     +-------------------------+

Public visitor
→ rate-limited PDF verification
→ private temporary upload
→ ClamAV CLEAN
→ PdfVerificationService
→ signature + exact SHA-256 + issuance/currentness
```

Scheduler cleans expired unfinished attachment upload sessions/chunks and expired export binaries, never age-purges authoritative audits.

## 9. Trust Boundaries

Untrusted:

- browser payloads/IDs;
- filenames/MIME/file content;
- browser-computed file fingerprint/hash claims;
- uploaded chunks and client-declared chunk metadata until server validation;
- public uploads;
- client-supplied state/permission/actor/version;
- client-supplied Team/role/permission admin values until validated.

Trusted authority:

- server-side authenticated session;
- Spatie/Laravel permission resolution;
- Laravel Policies/Gates;
- application/domain services;
- MySQL persisted state;
- server-validated upload-session/chunk metadata;
- server-computed final assembled-file SHA-256;
- protected template registry;
- protected signing identity;
- explicit ClamAV CLEAN on the full assembled file.

Private key never reaches browser/public verifier.

---

# PART D — APPLICATION LAYERS

## 10. Presentation

Vue/Inertia presents UI/local state; not authoritative for permission, state, malware, attachment integrity, signature, audit retention.

For resumable attachment upload, the browser MAY compute a SHA-256 fingerprint to identify a previously unfinished upload of the same selected file. That fingerprint is a UX/resume hint only. It MUST NOT become the authoritative stored attachment hash or bypass server verification.

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

Dedicated structured/JSON endpoints MAY be used where interaction semantics require them, including resumable attachment upload/status, autosave, export status, and public PDF verification. Exact routes/payloads belong to `12_API_Contract.md`.

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
InitiateAttachmentUpload
AcceptAttachmentChunk
InspectAttachmentUpload
CompleteAttachmentUpload
CancelAttachmentUpload
ScanAttachment
RequestNscmfExport
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

Upload-session/chunk metadata is relationally tracked so the server can determine which chunks are already accepted without trusting browser-only state.

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

Attachment upload/security lifecycle values are technical states and MUST NOT be added to this business-status set.

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

Routine successful chunk transport does not need to become Business Timeline noise. Security-significant malware outcomes/failures follow `10_Security_Rules.md`; ordinary transport diagnostics belong to technical logging unless an authoritative audit event is explicitly required downstream.

## 23. Technical Logging

Runtime/queue/renderer/scheduler/storage diagnostics, attachment chunk/assembly failures, scanner health, and retry diagnostics, separate from authoritative audits.

## 24. History / Query

History, Review/Approval queues, archive filters, search, Business Timeline projections.

Review queue driven by applicable Review permissions/current state; Approval queue by Approval permissions/current state. Team MAY be displayed/filterable as business metadata but MUST NOT constrain authorization.

## 25. Attachment + Malware

### 25.1 Confirmed Resumable Upload Model

Attachment upload is session-based and resumable.

```text
Browser selects file
→ browser MAY compute SHA-256 fingerprint for same-file resume discovery
→ auth + permission/ownership/state check
→ structural validation
→ create/reuse eligible unfinished upload session
→ fixed chunk size = 5 MiB (final chunk MAY be smaller)
→ stream each accepted chunk through Laravel to private temporary storage
→ persist accepted-chunk metadata in MySQL
→ connection/application interruption MAY occur
→ reconnect/reselect same file
→ inspect unfinished session
→ send only missing chunks
→ all chunks accepted
→ server verifies completeness/order/declared total size
→ server assembles full file privately
→ server computes authoritative SHA-256 over assembled bytes
→ MalwareScanner → ClamAV on FULL assembled file
   ├─ CLEAN → promote/persist private attachment
   ├─ INFECTED → fail closed; never usable
   └─ scanner/error/uncertainty → fail closed
```

Successfully acknowledged chunks MUST remain resumable after ordinary TCP/network interruption or application process restart as long as the upload session has not expired and underlying private storage remains available.

A currently unavailable/down server cannot accept new chunks; the guarantee is that after service recovery an unexpired valid upload session resumes from already accepted chunks rather than starting from byte zero.

### 25.2 Upload Session Retention

Unfinished upload session expiry is **24 hours since last successful upload activity**. A successfully accepted chunk refreshes the activity/expiry anchor.

Scheduler cleanup removes expired unfinished session temporary chunks and corresponding temporary upload-session/chunk metadata according to schema lifecycle rules. This 24-hour retention is separate from generated export artifact retention of 168 hours / 7 days.

### 25.3 Upload and Security Lifecycles Are Separate

Upload lifecycle is conceptually:

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

Attachment security lifecycle remains conceptually:

```text
PENDING
CLEAN
INFECTED
FAILED
```

`COMPLETED` upload does not mean `CLEAN`. A completed upload can remain `PENDING` while whole-file malware evaluation is outstanding.

Exact persisted enum/storage representation is defined by `11_ERD_Database_Schema.md`; exact wire representation belongs to `12_API_Contract.md`.

### 25.4 Resume Fingerprint

Client fingerprint MAY help locate an unfinished same-file upload session together with validated file metadata and authorization context.

Server MUST NOT treat the client fingerprint as authoritative integrity evidence. Final attachment `sha256` is always computed server-side from the assembled file.

### 25.5 Whole-File Scan Rule

Chunk-level scanning MAY be used only as optional defense-in-depth if later justified; it MUST NOT replace the required full assembled-file scan. Individual chunk scan results MUST NOT cause the attachment to become usable.

Only explicit `CLEAN` for the full assembled file permits use/download according to normal record authorization.

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

Final attachment binary uses private storage; metadata/record/security binding is stored in MySQL.

Resumable upload state is split deliberately:

- MySQL: upload session identity, parent record/user binding, filename/size/fingerprint metadata, expected chunk geometry, accepted chunk records, lifecycle/status, last successful activity, expiry, and assembly/finalization linkage;
- Private temporary storage: actual chunk bytes and assembled quarantine bytes;
- Browser: local progress/fingerprint only; never source of truth.

Production private storage used for acknowledged chunks MUST survive ordinary application process restart/redeploy. Exact object key layout is implementation detail and MUST NOT become an authorization mechanism.

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
→ if already 2 active sessions, revoke the oldest active session deterministically
→ create/retain the new session so account remains at maximum 2 active sessions
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

attachment resumable upload
→ upload-session/chunk consistency checks + idempotent accepted-chunk semantics
→ no workflow-row lock while transferring bytes, assembling, or scanning
```

## 39. Workflow Transaction

Within lock re-check required permission, ownership/resource authorization where applicable, archive flag, current state, action validation, destination, security prerequisites; persist mutation + required Business Audit atomically.

No Team/scope validation.

## 40. Optimistic Persistence

Expected version required. Mismatch → explicit conflict, no silent overwrite.

For API representation, confirmed current direction is human-readable request-body `record_version`; exact request/response contract belongs to `12_API_Contract.md`.

---

# PART I — SIDE EFFECT / FAILURE BOUNDARIES

## 41. Long Work

Notification/export/render/sign work after commit or queued. Malware scan and attachment assembly do not hold workflow row lock.

Chunk transfer itself MUST NOT hold the parent NSCMF workflow row lock for the duration of network I/O.

## 42. Attachment Failure and Recovery

Resumable attachment flow MUST distinguish transport progress from final attachment acceptance.

- successful acknowledged chunks remain in private temporary storage until completion/cancel/expiry;
- failed/unacknowledged chunk transfer is retried/re-uploaded without invalidating already accepted chunks;
- duplicate retransmission of an already accepted identical chunk MUST be handled safely/idempotently according to `12_API_Contract.md`;
- storage write failure MUST NOT mark a chunk accepted;
- DB metadata failure MUST NOT create false accepted progress; orphan private objects are compensated/cleaned;
- application process restart MUST NOT erase unexpired accepted progress when durable private storage and DB remain healthy;
- complete-file assembly failure MUST NOT produce a usable attachment;
- server-calculated final SHA-256 mismatch/inconsistency MUST fail finalization;
- scanner unavailable/timeout/error MUST NOT become `CLEAN`;
- untrusted temporary/chunk/assembled objects are never publicly exposed.

## 43. Download

Only final attachment with explicit `CLEAN` security status through parent-record authorization.

Temporary chunks, incomplete assembled objects, `PENDING`, `INFECTED`, and `FAILED` objects MUST NOT be downloadable through normal attachment download capability.

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

Confirmed minimum disclosure direction:

- verification result;
- Request No only for a recognized PDF;
- form family;
- issuance date;
- issuer as System/Organization;
- no Requester/Reviewer/Approver/Team/attachment/form-body/audit disclosure.

Exact safe response fields are finalized in `12_API_Contract.md`.

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

Attachment complete/assembly/scan implementation MAY use synchronous or queued internal work where appropriate, but user-visible security truth remains fail-closed and exact execution choice MUST preserve the confirmed resumable semantics. Exact API completion/status behavior belongs to `12_API_Contract.md`.

## 56. Scheduler

Scheduler responsibilities include:

- delete unfinished attachment upload sessions/chunks that have been inactive for **24 hours**;
- clean abandoned assembly/quarantine objects according to controlled recovery rules;
- clean generated export binaries after **168 hours / 7 days**;
- preserve authoritative Business/Access/Security Audit without age purge;
- preserve issuance metadata required for historical validation.

Scheduler MUST NOT auto-advance workflow.

## 57. Failure Isolation

- DB workflow failure → no partial transition;
- network/TCP interruption during chunk transfer → accepted prior chunks remain resumable until expiry;
- application restart/down interval → no new upload during outage, but durable accepted progress resumes after recovery if session remains valid;
- storage failure → no false chunk/attachment/export success;
- incomplete upload → never usable attachment;
- assembled-file integrity failure → no final attachment;
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
- let browser fingerprint become authoritative file integrity evidence;
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

Resumable 5 MiB chunk transport for a maximum 20 MB attachment intentionally stays simple at this scale; it does not justify introducing Redis, Kafka, or a separate upload microservice.

## 61. Minimum Signals

Application errors, auth/throttle failures, authorization denials where useful, stale conflicts, queue depth/failure, attachment upload-session/chunk/assembly failures, expired-upload cleanup, scanner health, export stages/duration, template/renderer/signing failures, public validator abuse/failures, scheduler/storage failures.

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

## 65. Resumable Attachment

```text
select file
→ browser computes resume fingerprint
→ initiate/recover authorized upload session
→ 5 MiB chunks
→ each accepted chunk stored privately + metadata persisted
→ interruption
→ reconnect/reselect same file
→ server reports accepted/missing chunks
→ upload only missing chunks
→ complete
→ verify complete chunk set + expected total size
→ assemble full file privately
→ server SHA-256
→ full-file ClamAV
→ explicit CLEAN only
→ persist/promote final attachment
```

Unfinished progress expires 24 hours after last successful upload activity.

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
| Third login | succeeds; oldest active session revoked so max 2 remain |
| Async | DB Queue |
| Workflow concurrency | short transaction + row lock |
| Draft/Result | optimistic version; API uses human-readable request-body `record_version` direction |
| Workflow iteration | first Submit=1; same-cycle return/revision same; Reopen next |
| Audit | three authoritative classes + technical logs; no age purge |
| Attachment transport | resumable 5 MiB chunks via Laravel to private durable temp storage |
| Unfinished upload retention | 24h since last successful upload activity |
| Resume identity | client SHA-256 hint only; server final SHA-256 authoritative |
| Attachment scan | ClamAV on full assembled file; explicit CLEAN only |
| Upload vs security state | separate technical lifecycles; neither is NSCMF business status |
| Export | async exact XLSX/PDF + immutable snapshot |
| Approved PDF | mandatory organization signing |
| Public validator | signature + exact hash + issuance/currentness + minimum disclosure |
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
10. hold DB workflow lock during upload/chunk transfer/assembly/scan/render/sign;
11. silently overwrite stale Draft/Result;
12. execute transition without locked current-state revalidation;
13. commit successful workflow without required Business Audit;
14. pollute Business Timeline with routine access or routine chunk transport;
15. age-purge authoritative audit;
16. expose private attachment/export/chunk/quarantine object via predictable public path;
17. use storage path as permission;
18. treat upload/chunk structural validation as CLEAN;
19. trust browser SHA-256 as authoritative final attachment hash;
20. treat per-chunk scan as replacement for required full assembled-file ClamAV scan;
21. store acknowledged production resumable chunks only on ephemeral application-server filesystem;
22. mark upload `COMPLETED` as equivalent to security `CLEAN`;
23. expose clamd publicly;
24. render export synchronously inside workflow transaction;
25. let worker read newer mutable data instead of bound snapshot;
26. generic-rewrite XLSX if controls may strip;
27. use HTML PDF fallback;
28. sign XLSX under PDF rule;
29. require personal Approver certificate;
30. put private signing key in source/DB/browser;
31. deliver unsigned Approved PDF;
32. claim TSA current MVP;
33. make public verifier a record portal;
34. classify genuine superseded PDF as modified solely due workflow change;
35. delete source/audit/issuance when binary expires;
36. let scheduler advance workflow;
37. add Redis/Kafka/upload microservice/search without evidence.

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

All locked requirements above are testable: row-lock workflow, optimistic editable persistence, separate no-age-purge audits, resumable 5 MiB private attachment chunks, 24h inactivity cleanup, server-authoritative assembled-file SHA-256, full-file ClamAV CLEAN gate, immutable-snapshot export, exact template, signed Approved PDF, public verification.

## 71. `11_ERD_Database_Schema.md`

ERD MUST materialize at least:

- application `users` + Team relationship;
- business Team tables separately from Spatie;
- Spatie-owned `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` without duplicate RBAC schema;
- no Unit/Division/scope tables;
- canonical record status/archive/version;
- workflow iterations and sign-off history;
- separate Business/Access/Security audits;
- final attachment metadata/security state;
- resumable attachment upload sessions + accepted-chunk metadata + expiry/assembly linkage;
- sessions/security account state as required;
- immutable export snapshots;
- export requests/artifacts/template registry;
- PDF issuance/final SHA-256/certificate reference/currentness metadata;
- numbering sequence;
- constraints/indexes.

## 72. Remaining TBD

Exact API route/payload/error envelope details belong to `12_API_Contract.md`. Final deployment/provider/logging/notification/numbering SOP/certificate operational details/backup-DR/performance topology remain downstream. Team default master data remains TBD.

Confirmed API directions already available to `12` include:

- hybrid Inertia + dedicated JSON endpoints where appropriate;
- explicit domain workflow-action endpoints rather than generic status mutation;
- request-body `record_version` for optimistic concurrency;
- standardized machine-readable error envelope;
- page-number pagination default 25 / maximum 100 with explicit filter/sort whitelist;
- resumable 5 MiB attachment chunks and asynchronous/observable malware state;
- minimum-disclosure public PDF validator;
- third login revokes oldest active session.

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

**`12_API_Contract.md`**.