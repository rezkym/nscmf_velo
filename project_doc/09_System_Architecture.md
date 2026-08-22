# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Repository–Service + Resumable Attachment Architecture Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `10_Security_Rules.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12_API_Contract.md`, `12A_Repository_Service_Architecture_Synchronization.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk logical system architecture, dependency direction, component boundaries, synchronous/asynchronous execution boundaries, transaction/concurrency model, persistence ownership, audit separation, attachment flow, dan export/signing/verification subsystem architecture**.

Architecture menggunakan **pragmatic Repository–Service Architecture** di dalam Laravel 13 modular monolith.

Repository–Service pada proyek ini bukan alasan untuk membuat layer sebanyak mungkin. Tujuannya adalah memastikan:

- Controller tetap tipis;
- Service menjadi satu orchestration/use-case layer;
- persistence/query aplikasi berada di repository implementation;
- transaction business dimiliki Service;
- Eloquent tetap digunakan secara natural di implementation boundary;
- external runtime integration menggunakan contract/adapter yang tepat;
- Job/Command tidak menjadi hidden Service;
- business rules tidak tersebar di Controller/Model/Job;
- tidak ada mandatory DTO layer, mapper layer, generic BaseRepository, atau one-repository-per-table boilerplate.

Dokumen tidak menentukan exact physical folder/class names. Itu menjadi authority `13_Project_Structure.md`.

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
15. workflow iteration semantics;
16. narrow Change Result capture;
17. Business/Access/Security Audit separation and no age purge;
18. private optional attachments + resumable 5 MiB chunk upload + 24h inactivity cleanup + whole-file ClamAV CLEAN gate;
19. MySQL History/search;
20. exact XLSX/PDF template export;
21. all export asynchronous through DB Queue;
22. immutable deterministic export snapshot binding;
23. Approved PDF System/Organization signing;
24. public validator signature + exact SHA-256 + issuance/currentness;
25. 168h/7-day generated binary retention;
26. no TSA MVP;
27. ~10 expected / 50-user engineering baseline;
28. Docker-compatible runtime;
29. no WebSocket/Redis/search-engine requirement;
30. clean Repository–Service persistence/orchestration boundary;
31. maintainable human-readable code with minimal architecture ceremony.

## 4. Architecture Priorities

1. business correctness;
2. authorization/security correctness;
3. workflow/state consistency;
4. auditability;
5. no data loss;
6. export fidelity;
7. fail-closed behavior;
8. maintainability;
9. explicit ownership of responsibilities;
10. simplicity proportional to scale;
11. evidence-based optimization.

---

# PART B — ARCHITECTURE STYLE

## 5. Modular Monolith + Repository–Service

```text
Laravel 13 Modular Monolith
+ Repository–Service Architecture
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
+ Database Queue Worker
+ Scheduler
+ Private Durable Storage
+ ClamAV / clamd
+ Exact Export / Renderer / Signing / Verification boundaries
```

Logical module separation does not mean microservices.

## 6. Canonical Dependency Direction

```text
Presentation / HTTP
Controllers + Form Requests
        ↓
Service Layer
        ↓
Domain Rules / Policies-Gates
Repository Contracts
Infrastructure Contracts
        ↓
Eloquent Repository Implementations
Concrete Infrastructure Adapters
        ↓
Eloquent / Query Builder / Flysystem / ClamAV / Renderer / Signer
        ↓
MySQL / Private Storage / Runtime Components
```

Important:

- no parallel `Actions` orchestration layer;
- no mandatory DTO layer;
- no generic repository hierarchy;
- no direct business persistence from Controller/Job;
- no direct Eloquent business query from Service;
- Service MAY own transaction boundary using Laravel transaction primitive without issuing SQL/query-builder business queries itself.

## 7. Single Organization / Team

No tenant switcher, tenant middleware, tenant hostnames, artificial `tenant_id` everywhere, or multi-tenant authorization.

Business **Team** is ordinary organizational data associated with users/profile where applicable.

Team MUST NOT:

- scope roles/permissions;
- filter Reviewer/Approver eligibility;
- be passed to Spatie `setPermissionsTeamId()`;
- become a tenant boundary.

Spatie `teams` feature remains disabled.

## 8. Deployment-Agnostic Logical Components

Logical components may be colocated/separated physically later:

- Web/Application Runtime;
- Queue Worker;
- Scheduler;
- MySQL;
- Private Storage, including attachment quarantine/resumable-upload temporary objects;
- ClamAV/clamd;
- Spreadsheet Renderer;
- protected signing identity mount/storage.

For production, resumable attachment progress MUST NOT depend solely on ephemeral application-server local filesystem.

---

# PART C — SYSTEM CONTEXT

## 9. High-Level Context

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
| HTTP Controllers + Form Requests                               |
| Service Layer                                                  |
| Spatie / Policies / Gates / Domain Rules                       |
| Repository Contracts                                           |
| Eloquent Repository Implementations                            |
| Audit / Attachment / Export / Administration Services          |
+---------+---------------------+-------------------+--------------+
          | SQL via repos        | private I/O       | queue jobs
          v                     v                   v
+----------------+    +---------------------------+   +-------------------+
| MySQL 8.4 LTS  |    | Private Durable Storage   |   | Database Queue    |
| source of truth|    | chunk/quarantine/attach/  |   | + Worker          |
| upload metadata|    | export                    |   +---------+---------+
+----------------+    +-------------+-------------+             |
                                   |                             | Service call
                                   | assembled-file scan         v
                                   v                 +-------------------------+
                           +---------------+         | Exact Export Subsystem  |
                           | ClamAV/clamd  |         | OOXML Patcher           |
                           | private only  |         | Spreadsheet Renderer    |
                           +---------------+         | PDF Signer              |
                                                     +-------------------------+

Public visitor
→ rate-limited PDF verification controller
→ verification Service
→ private temporary upload
→ ClamAV CLEAN
→ signature + exact SHA-256 + issuance/currentness
```

Scheduler cleans expired unfinished upload sessions/chunks and expired export binaries, never age-purges authoritative audits.

## 10. Trust Boundaries

Untrusted:

- browser payloads/IDs;
- filenames/MIME/file content;
- browser-computed file fingerprint/hash claims;
- uploaded chunks and client-declared chunk metadata;
- public uploads;
- client-supplied state/permission/actor/version;
- client-supplied Team/role/permission admin values.

Trusted authority:

- server-side authenticated session;
- Spatie/Laravel permission resolution;
- Laravel Policies/Gates;
- Service/domain rules;
- MySQL persisted state through repository boundary;
- server-validated upload-session/chunk metadata;
- server-computed final assembled-file SHA-256;
- protected template registry;
- protected signing identity;
- explicit ClamAV CLEAN on full assembled file.

Private signing key never reaches browser/public verifier.

---

# PART D — APPLICATION LAYERS

## 11. Presentation Layer

Vue/Inertia presents UI/local state; it is not authoritative for permission, state, malware, attachment integrity, signature, audit retention, or persistence.

Browser MAY compute a SHA-256 fingerprint for resumable-upload discovery. It remains an untrusted hint.

## 12. HTTP / Inertia Boundary

Canonical request path:

```text
Browser
→ route
→ session / CSRF
→ Controller
→ Form Request validation
→ Service
→ repository/domain/infrastructure boundaries
→ Inertia/JSON/binary response
```

No organizational scope middleware.

Dedicated JSON endpoints are allowed where `12_API_Contract.md` requires them.

## 13. Controllers

Controllers are transport adapters, not business/application services.

They MUST NOT:

- query Eloquent/DB for application business data;
- mutate Eloquent models;
- open workflow business transactions;
- implement state machine rules;
- coordinate audit/scanner/export/signing directly;
- call repositories as a shortcut around Service.

They MAY:

- receive route-bound models/IDs as supplied by Laravel routing where safe;
- consume Form Request validated values;
- call Service;
- shape redirect/Inertia/JSON/binary response.

## 14. Form Requests

Form Request is the HTTP input validation/normalization boundary.

There is no mandatory DTO layer.

Simple validated values pass as typed scalar/enum parameters where practical.

Complex validated nested form payloads MAY cross as structured validated arrays. They MUST NOT be blindly mass-assigned.

`$request->all()` MUST NOT be used for business persistence.

## 15. Service Layer — Application Use-Case Authority

The previous conceptual `Application Actions` layer is superseded.

Service is the **single application orchestration layer**.

Responsibilities:

- execute named use cases;
- coordinate authorization/domain rules;
- own business transaction boundaries;
- coordinate repository calls;
- coordinate audit persistence;
- dispatch post-commit long work;
- preserve atomicity/failure semantics;
- keep external integration behind contracts/adapters.

Representative service boundaries:

```text
NscmfCreationService
NscmfDraftService
NscmfWorkflowService
NscmfChangeResultService
AttachmentUploadService
AttachmentFinalizationService
AttachmentService
NscmfExportService
PdfVerificationService
UserAdministrationService
RolePermissionAdministrationService
TeamAdministrationService
SessionService
CredentialService
```

Exact names/folders belong to `13_Project_Structure.md`.

MUST NOT collapse unrelated use cases into one God Service.

## 16. Domain Rules / Enums

Domain layer MAY contain focused:

- PHP Enums for closed value sets;
- reusable business rule/validator objects;
- value helpers only when they add semantic safety;
- protected-invariant logic.

Examples of closed enums include canonical business status, family/subtype, export format/status, upload status, attachment security status, verification outcome.

Domain layer MUST NOT become a duplicate persistence/entity graph that maps every Eloquent model into a second object hierarchy for current MVP.

## 17. Repository Contracts

Repository contracts are mandatory persistence/query abstraction boundaries for application business data.

They SHOULD represent meaningful domain/aggregate/use-case persistence concerns rather than one table each.

Conceptual examples:

```text
NscmfRepository
WorkflowRepository
AttachmentRepository
AttachmentUploadRepository
ExportRepository
AuditRepository
UserRepository
TeamRepository
RolePermissionRepository
```

Repository contract method names SHOULD express persistence intent, not generic CRUD ceremony.

## 18. Eloquent Repository Implementations

Concrete repository implementations use:

- Eloquent Models;
- Eloquent relationships;
- Query Builder;
- `lockForUpdate()`;
- selected/eager-loaded queries;
- pagination;
- persistence operations;
- DB-specific query tuning where justified.

Only repository implementations are the normal application location for Eloquent/Query Builder business persistence/query logic.

## 19. No Generic Repository Boilerplate

Forbidden by default:

```text
BaseRepository
GenericRepository<T>
RepositoryInterface<T> with only generic CRUD
one repository class for every relational table
```

The repository layer exists to create a useful persistence boundary, not to mirror Eloquent method-for-method.

## 20. Repository Return Values

No mandatory DTO/domain-entity mapping layer.

Repository MAY return appropriate native application types:

- Eloquent Model;
- Eloquent Collection;
- LengthAwarePaginator/Paginator;
- scalar/value result;
- bounded native query result when clearly typed/understood.

Queue/history/list queries SHOULD select/eager-load only what is needed rather than load an entire object graph.

## 21. Transaction Boundary

Service owns business transaction boundary.

Service MAY call Laravel `DB::transaction()` (or equivalent thin transaction mechanism) only for transaction control.

Service MUST NOT use the DB facade/Query Builder to issue application business queries.

Repository implementations participate in the active transaction and MUST NOT independently commit a larger multi-repository use case.

No custom Unit-of-Work abstraction is required current MVP.

## 22. Eloquent Model Boundary

Eloquent Models own persistence representation/relationships/casts.

Models MUST NOT contain hidden multi-step workflow orchestration, audit coordination, queue orchestration, scanner invocation, signing, or generic authorization bypass logic.

Persistence-oriented local scopes are acceptable where invoked through repository implementation and useful for reuse.

## 23. Repository Container Binding

Repository contracts resolve to concrete Eloquent implementations through Laravel service container.

Conceptual:

```text
NscmfRepository
→ EloquentNscmfRepository
```

Exact provider/file placement belongs to `13_Project_Structure.md`.

---

# PART E — INFRASTRUCTURE ADAPTERS

## 24. Contract / Adapter Rule

External/runtime capabilities are not repositories unless they actually represent persistence.

Use focused contracts such as:

```text
MalwareScanner
PrivateStorage
SpreadsheetRenderer
PdfSigner
PdfVerifier
```

Concrete adapters may include:

```text
ClamAvScanner
FlysystemPrivateStorage
QualifiedSpreadsheetRenderer
ConcretePdfSigner
ConcretePdfVerifier
```

Do not create misleading `ClamAvRepository`/`StorageRepository` merely to force everything into repository terminology.

## 25. Infrastructure Failure Semantics

Infrastructure adapters MUST return/throw explicit outcomes that allow Service to preserve authoritative semantics.

Examples:

- scanner uncertainty never maps to CLEAN;
- signing failure never maps to READY Approved PDF;
- storage failure never maps to accepted chunk/final artifact;
- renderer failure never falls back silently to HTML PDF.

---

# PART F — AUTHORIZATION / IDENTITY MODULES

## 26. Identity & Authentication

Responsibilities:

- username/password login;
- throttling;
- DB sessions;
- temporary-password forced change;
- 30m idle / 8h absolute / max2 session enforcement;
- third valid login succeeds and revokes oldest active session;
- logout/revocation;
- disablement;
- protected Superadmin integration;
- sensitive-action password re-authentication.

No MFA module current MVP.

## 27. User / Team / Role Administration

Responsibilities:

- application `users`;
- application `teams` organizational data;
- Spatie roles/permissions and user-role assignment;
- credential reset;
- protected settings.

There is no Unit/Division or Reviewer/Approval Scope subsystem.

Team mutation does not modify effective permission by itself.

## 28. Authorization

Effective business action eligibility:

```text
valid session
+ required permission
+ Laravel Policy/Gate/resource authorization
+ ownership where explicit
+ current business state
+ archive treatment
+ validation
+ security preconditions
+ protected invariants
+ concurrency/current-state revalidation
```

Team is intentionally absent.

## 29. Spatie Special Boundary

Spatie remains runtime role/permission authority.

Package-owned tables:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

Do not build a second `userCan()` repository authorization engine.

Repository/Service architecture applies to administrative mutation orchestration, not to replacing Spatie's runtime permission resolver.

## 30. Spatie Teams / Direct Permissions / Wildcards

```text
Spatie teams = false
wildcard permissions = false
direct user permission admin UI = absent current MVP
single guard = web
```

---

# PART G — NSCMF CORE / WORKFLOW

## 31. NSCMF Core

NSCMF Core owns identity/current status/version/archive/current workflow iteration pointer or equivalent.

Activation/Change own typed family data.

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

Technical upload/security/export status values MUST NOT be inserted into this set.

## 32. Workflow Iteration

Architecture preserves:

- first Submit → iteration 1;
- ordinary Return/Revision/Resubmit/Approver Return → same iteration;
- Reopen from Rejected/Approved → next iteration;
- historical approval/rejection/review/issuance evidence remains attributable to original iteration.

## 33. Workflow Service

Workflow Service conceptually owns use cases such as:

```text
submit
cancel
reviewForward
reviewReturn
reviewReject
approve
approvalReturnReviewer
approvalReturnRequester
approvalReject
reopen
archive
unarchive
```

The API remains explicit per action. There is no generic status mutation Service method accepting arbitrary destination state.

## 34. Workflow Repository

Workflow Repository handles persistence such as:

- lock/read current workflow-relevant record state;
- create/update workflow iteration rows;
- persist effective Reviewed By/Approved By metadata;
- support iteration linkage.

It does **not** decide whether a transition is allowed.

---

# PART H — AUDIT

## 35. Business Audit

Authoritative append-oriented business mutation/workflow/lifecycle evidence. No age purge.

Successful state/data mutation requiring audit and its Business Audit evidence MUST share the required transaction consistency.

## 36. Access Audit

Separate view/download/access evidence. Does not assign Reviewer/Approver or pollute Business Timeline.

## 37. Security Audit

Authentication, credential, role/permission, session, malware, signing readiness/failure, privileged security access evidence. No plaintext secrets. No age purge.

## 38. Audit Persistence Boundary

Audit repository/writer implementation may own physical insert/query details.

The Service/use case remains responsible for deciding which authoritative audit evidence is required.

A repository MUST NOT silently turn a required audit into best-effort logging.

Technical logging remains separate from authoritative audit.

---

# PART I — DATA OWNERSHIP

## 39. Structured Business Data

MySQL = authoritative current structured data/state.

## 40. Team Data

Application Team master/profile relationship is ordinary relational domain data with no RBAC scope effect.

## 41. Official Template

Versioned XLSX binary = exact export presentation authority.

## 42. Attachments

Final attachment binary uses private storage; metadata/record/security binding is stored in MySQL.

Resumable upload state split:

```text
MySQL
→ upload session metadata
→ accepted chunk metadata
→ ownership / record / status / expiry metadata

Private durable storage
→ temporary chunk bytes
→ assembled quarantine bytes

Browser
→ local progress/fingerprint hint only
```

Production acknowledged chunks survive ordinary app process restart/redeploy while DB/storage remain healthy and session unexpired.

## 43. Generated Export Binary

Temporary derived artifact, 168h/7d.

## 44. Immutable Export Snapshot

Created synchronously at export request time and bound to request/version/workflow iteration/template.

Worker Service never substitutes later mutable record data.

## 45. Issuance Metadata

Approved signed PDF historical metadata survives binary cleanup and preserves hash/certificate/workflow context required for validation.

---

# PART J — SYNCHRONOUS REQUEST PATHS

## 46. Login

```text
Browser
→ login Controller/Fortify boundary
→ throttle
→ active username resolution
→ password verify
→ session regenerate/create
→ if two active sessions already exist, revoke oldest active session
→ keep new session; active count <= 2
→ temporary-password gate if applicable
→ app
```

## 47. Record Read

```text
Browser
→ auth/session
→ Controller
→ Service
→ Policy/Gate authorization
→ Repository query
→ Access Audit persistence as required
→ Inertia detail
```

No Team scope.

## 48. Sensitive Administration

```text
admin request
→ current-password re-auth
→ Controller
→ Administration Service
→ permission + protected invariant
→ bounded Spatie/repository mutation
→ determine affected users
→ Security/Business Audit as appropriate
→ revoke affected sessions when effective access changes
```

Team-only change does not revoke sessions solely due Team change.

---

# PART K — CONCURRENCY / TRANSACTIONS

## 49. Strategy

```text
workflow/lifecycle transition
→ Service-owned short transaction
→ Repository lockForUpdate/current-state read
→ current-state revalidation

Draft/Revision/Result persistence
→ Service-owned short transaction
→ optimistic record_version check through Repository

attachment resumable upload
→ upload-session/chunk consistency + idempotent accepted-chunk semantics
→ no workflow row lock during byte transfer/assembly/scan
```

## 50. Workflow Transaction

Conceptual:

```text
NscmfWorkflowService
→ authorize required capability
→ BEGIN transaction
→ Repository locks current record
→ re-check ownership/resource/archive/state
→ validate reason/destination/business/security rules
→ Repository persists transition/iteration/sign-off
→ Audit Repository persists required Business Audit
→ Repository increments record_version
→ COMMIT
```

No Team/scope validation.

No upload/render/sign external work inside this transaction.

## 51. Optimistic Persistence

Expected `record_version` required for Draft/Revision/Result persistence.

Mismatch → explicit conflict, no silent overwrite, no false Saved.

## 52. Service Transaction Rule

Service owns begin/commit/rollback through Laravel transaction primitive.

Repository participates; repository does not own cross-repository business commit.

No custom UnitOfWork layer current MVP.

---

# PART L — RESUMABLE ATTACHMENT ARCHITECTURE

## 53. Confirmed Upload Model

```text
Browser selects file
→ browser MAY compute SHA-256 resume fingerprint
→ Controller/Form Request
→ AttachmentUploadService
→ auth + permission/ownership/state check
→ AttachmentUploadRepository finds/creates eligible session
→ fixed chunk size = 5 MiB
→ each chunk request streams through Laravel
→ private durable temporary storage write
→ server computes chunk SHA-256
→ Repository persists accepted chunk metadata after successful storage write
→ interruption MAY occur
→ reconnect/reselect file
→ Service asks Repository for server accepted/missing state
→ browser sends only missing chunks
→ complete request
→ asynchronous finalization when API contract says accepted
```

## 54. Upload Session Retention

Unfinished session expiry:

```text
24 hours since last newly accepted upload activity
```

Identical retry does not indefinitely refresh expiry.

Expired session/chunks are cleanup-eligible technical data.

## 55. Finalization Service

Conceptual:

```text
FinalizeAttachmentUploadJob
→ AttachmentFinalizationService
→ verify complete chunk set via Repository
→ assemble full file privately via Storage adapter
→ compute server-authoritative final SHA-256
→ final type/size validation
→ MalwareScanner scans FULL assembled file
   ├─ CLEAN → promote final private object + final attachment metadata
   ├─ INFECTED → fail closed
   └─ ERROR/TIMEOUT/UNAVAILABLE → fail closed
→ audit/security evidence as required
```

`COMPLETED` upload transport status does not imply attachment `CLEAN`.

## 56. Chunk Failure / Idempotency

- successful acknowledged chunks remain until completion/cancel/expiry;
- failed/unacknowledged chunk can retry;
- identical accepted-index retry is safe/idempotent;
- different bytes for accepted index are rejected;
- storage write failure cannot mark chunk accepted;
- DB metadata failure cannot create false accepted progress;
- temporary objects remain private;
- application process restart does not erase valid durable progress by itself.

## 57. Attachment Download

Only final attachment with explicit `CLEAN` through parent-record authorization is downloadable.

Temporary chunks, assembled quarantine, PENDING/INFECTED/FAILED content are not normal-download resources.

---

# PART M — EXPORT ARCHITECTURE

## 58. Export Service Boundary

Export responsibilities are coordinated by `NscmfExportService` or equivalent cohesive Service.

Infrastructure components remain focused:

```text
Template Registry / Repository
Immutable Snapshot Persistence
OOXML Patcher
Workbook Integrity Validator
SpreadsheetRenderer
PdfSigner
Artifact Storage
Issuance Persistence
```

## 59. Request Path

```text
User request
→ Controller/Form Request
→ Export Service
→ authorize
→ BEGIN short transaction
→ Repository reads current version/iteration/template consistently
→ Repository creates export request
→ Repository creates immutable canonical snapshot
→ COMMIT
→ dispatch GenerateNscmfExportJob after commit
→ immediate QUEUED response
```

Worker never creates a replacement snapshot from later live data.

## 60. Worker Path

```text
GenerateNscmfExportJob
→ Export Service
→ Export Repository reads bound request/snapshot
→ exact template copy
→ targeted OOXML patch
→ workbook integrity validation
→ XLSX READY
   OR
→ qualified spreadsheet renderer
→ if Approved: PdfSigner mandatory
→ final bytes SHA-256
→ issuance metadata
→ private READY artifact
```

Job itself contains no business persistence orchestration.

## 61. XLSX / PDF Rules

- user-facing formats exactly XLSX/PDF current MVP;
- official XLSX template remains presentation authority;
- generic workbook rewrite forbidden when unsupported OOXML parts may be stripped;
- XLSX not signed by PDF signing flow;
- Approved PDF mandatory System/Organization signature;
- non-Approved PDF no mandatory organization signature current MVP;
- signing failure → export FAILED, NSCMF remains APPROVED;
- no unsigned Approved PDF fallback.

## 62. Artifact Retention

READY artifact private for 168h/7d.

Cleanup removes binary only, not source record/audit/workflow/issuance evidence.

---

# PART N — SIGNING / PUBLIC VERIFICATION

## 63. Signer Identity

System/Organization signer is distinct from human Approved By.

## 64. Key Custody

Private key/cert manually provisioned in protected environment. Never GitHub/source/ordinary DB/browser/public validator.

Historical public certificate material remains resolvable after rotation.

## 65. Public Verification Service

```text
public PDF upload
→ Controller/Form Request
→ PdfVerificationService
→ private temp storage
→ ClamAV CLEAN
→ signature issuer verification
→ exact uploaded-byte SHA-256
→ issuance Repository lookup
→ workflow/currentness resolution
→ minimum-disclosure outcome
→ cleanup temp
```

Outcomes:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

Recognized valid/superseded minimum disclosure follows `12_API_Contract.md`. Public verifier is not a public record browser.

## 66. TSA

No TSA requirement current MVP.

---

# PART O — QUEUE / SCHEDULER / COMMANDS

## 67. Queue Principle

Jobs are thin technical entry points to Services.

Preferred coarse-grained jobs include:

```text
FinalizeAttachmentUploadJob
GenerateNscmfExportJob
```

Do not create a job for every trivial pipeline step unless operational need appears.

## 68. Scheduler

Scheduler responsibilities include:

- call cleanup Service for upload sessions/chunks inactive 24h;
- clean abandoned assembly/quarantine according to controlled recovery rules;
- clean generated export binaries after 168h;
- preserve authoritative Business/Access/Security Audit;
- preserve PDF issuance metadata.

Scheduler MUST NOT auto-advance NSCMF workflow.

Scheduled Command/closure SHOULD call a Service; it MUST NOT embed business persistence logic directly.

## 69. Failure Isolation

- DB workflow failure → no partial transition;
- stale optimistic save → no overwrite;
- network interruption → accepted upload chunks remain resumable until expiry;
- application restart → durable unexpired progress resumes after recovery;
- storage failure → no false chunk/attachment/export success;
- incomplete upload → never usable attachment;
- ClamAV uncertainty → not CLEAN;
- OOXML/integrity/renderer failure → export FAILED;
- signing failure → Approved PDF FAILED, NSCMF remains Approved;
- public verification uncertainty → never `VALID_CURRENT`.

---

# PART P — REPOSITORY / SERVICE GUARDRAILS

## 70. Allowed Dependency Relationships

```text
Controller → Service
Service → Repository Contract
Service → Policy/Gate/domain rule
Service → Infrastructure Contract
Service → Laravel transaction primitive
Repository Implementation → Eloquent/Query Builder
Infrastructure Adapter → concrete runtime/library
Job/Command → Service
```

## 71. Forbidden Dependency Relationships

```text
Controller -X-> Eloquent / DB / Repository
Controller -X-> workflow/business rule orchestration
Service -X-> Eloquent query / Query Builder business query
Job/Command -X-> Eloquent / DB / Repository business flow
Repository -X-> HTTP Request / Controller / Inertia
Repository -X-> workflow permission/state decision authority
Eloquent Model -X-> multi-step use-case orchestration
Infrastructure Adapter -X-> business state mutation authority
```

## 72. No DTO Architecture

MVP does not require:

```text
DTO per endpoint
DTO per Eloquent model
read DTO per list screen
mapper layer between repository and Service
spatie/laravel-data
```

Form Request + typed Service methods + PHP enums + static analysis provide the default safety model.

Complex nested validated arrays remain explicitly mapped and must not become generic mass-assignment payloads.

## 73. No Generic BaseRepository

Repository abstraction MUST NOT devolve into Eloquent-by-another-name.

Avoid:

```text
BaseRepository::find/all/create/update/delete
```

for every domain.

Use meaningful persistence operations.

## 74. No God Service

Service grouping is cohesive by use case/domain capability.

Do not place create/draft/workflow/upload/export/admin/security operations into one huge class.

## 75. Exception / Error Handling

No silent exception swallowing.

A technical exception MUST either:

- be translated into an explicit safe domain/technical failure at the appropriate boundary; or
- propagate to centralized error handling with safe external response/logging.

Never catch-and-ignore errors that would create false success.

---

# PART Q — SCALE / OBSERVABILITY

## 76. 50-User Baseline

MySQL + database queue/session/cache + Repository–Service modular monolith is appropriate.

Resumable 5 MiB chunk transport for max 20 MB attachment does not justify Redis/Kafka/separate upload microservice.

## 77. Minimum Signals

Monitor/log safely:

- application errors;
- auth/throttle failures;
- useful authorization denials;
- stale conflicts;
- queue depth/failure;
- upload-session/chunk/assembly failures;
- expired-upload cleanup;
- scanner health;
- export stages/duration;
- template/renderer/signing failures;
- public validator abuse/failures;
- scheduler/storage failures.

Technical logging remains separate from authoritative audits.

---

# PART R — IMPORTANT SEQUENCES

## 78. Draft Save

```text
Controller
→ SaveDraft Form Request
→ NscmfDraftService
→ permission + ownership
→ BEGIN transaction
→ NscmfRepository optimistic version check
→ explicit typed child persistence through repository
→ Business Audit persistence
→ record_version++
→ COMMIT
```

No blind payload mass assignment.

## 79. Submit

```text
Controller
→ Submit Form Request
→ NscmfWorkflowService
→ nscmf.submit + ownership
→ BEGIN transaction
→ NscmfRepository lock current row
→ validate DRAFT/REVISION_REQUIRED + form gate
→ WorkflowRepository create/use iteration
→ persist PENDING_REVIEW
→ Business Audit
→ version++
→ COMMIT
```

First successful Submit establishes iteration 1. Resubmit remains same iteration.

## 80. Reviewer Forward

```text
Controller
→ NscmfWorkflowService
→ review.forward permission
→ BEGIN transaction
→ lock current record
→ revalidate PENDING_REVIEW
→ Change Result gate if applicable
→ WorkflowRepository persist effective Reviewed By
→ PENDING_APPROVAL
→ Business Audit
→ COMMIT
```

No Team/scope check.

## 81. Approve Race

```text
Approver A Service call
→ lock row
→ valid PENDING_APPROVAL
→ APPROVED + Approved By A
→ commit

Approver B stale call
→ obtains row after A
→ sees state/version changed
→ conflict
→ no second final approval
```

## 82. Reopen

```text
APPROVED/REJECTED
→ NscmfWorkflowService
→ permission + not archived + reason + valid target
→ locked transaction
→ WorkflowRepository closes/supersedes old iteration context
→ creates next iteration
→ destination REVISION_REQUIRED or PENDING_REVIEW
→ Business Audit
```

## 83. Resumable Attachment

```text
select file
→ initiate/resume through AttachmentUploadService
→ 5 MiB chunks through Service
→ durable private chunk storage + repository metadata
→ interruption
→ server-authoritative accepted/missing reconciliation
→ missing chunks only
→ complete
→ FinalizeAttachmentUploadJob
→ AttachmentFinalizationService
→ assemble
→ server SHA-256
→ full-file ClamAV
→ explicit CLEAN only
→ final attachment
```

## 84. Approved PDF

```text
request
→ NscmfExportService
→ authorize + immutable snapshot transaction
→ queue
→ GenerateNscmfExportJob
→ NscmfExportService worker path
→ OOXML patch + integrity
→ renderer
→ signer
→ final hash + issuance metadata
→ private READY 168h
```

---

# PART S — CONFIRMED ARCHITECTURE DECISIONS

## 85. Summary

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
| Application style | Laravel modular monolith |
| Backend pattern | **pragmatic Repository–Service Architecture** |
| Orchestration layer | **Service only; no parallel Actions layer** |
| Persistence boundary | Repository Contract → Eloquent implementation |
| Repository granularity | meaningful aggregate/use-case boundary, not per table |
| Generic BaseRepository | forbidden by default |
| DTO layer | **not used current MVP** |
| Service transaction ownership | yes |
| Custom Unit of Work | no |
| Eloquent/Query Builder | repository implementation boundary |
| Job/Command | thin caller of Service |
| External components | focused Contract/Adapter, not forced Repository terminology |
| DB | MySQL 8.4 LTS |
| Session/cache | DB-backed baseline |
| Third login | succeeds; oldest active session revoked so max2 remain |
| Async | DB Queue |
| Workflow concurrency | short Service transaction + repository row lock |
| Draft/Result | optimistic `record_version` |
| Workflow iteration | first Submit=1; same-cycle return/revision same; Reopen next |
| Audit | three authoritative classes + technical logs; no age purge |
| Attachment transport | resumable 5 MiB chunks via Laravel to durable private temp storage |
| Unfinished upload retention | 24h since last newly accepted progress |
| Resume identity | client SHA-256 hint only; server final SHA-256 authoritative |
| Attachment scan | ClamAV on full assembled file; explicit CLEAN only |
| Export | async exact XLSX/PDF + immutable snapshot |
| Approved PDF | mandatory organization signing |
| Public validator | signature + exact hash + issuance/currentness + minimum disclosure |
| Binary retention | 168h/7d |
| TSA | none required MVP |

---

# PART T — DEVELOPER / AI GUARDRAILS

## 86. MUST NOT

1. add hidden multi-tenancy;
2. reintroduce Unit/Division;
3. create Reviewer/Approval scope subsystem;
4. use Team as access filter;
5. enable Spatie Teams;
6. duplicate Spatie RBAC tables;
7. expose direct user permissions as normal MVP;
8. enable wildcard permissions;
9. create a second permission resolver in repositories;
10. reintroduce `Actions` as a second orchestration layer;
11. let Controller query Eloquent/DB or call repository directly for business use cases;
12. let Controller own workflow/business transactions;
13. let Service issue Eloquent/Query Builder business queries;
14. let Job/Command become a hidden Service or directly manipulate domain persistence;
15. create generic BaseRepository/CRUD wrappers without real semantic value;
16. create repository one-per-table mechanically;
17. create mandatory DTO-per-endpoint/model/read layer;
18. add mapper/entity ceremony solely to imitate enterprise architecture;
19. let repository decide permission/state/workflow business rules;
20. hide multi-step orchestration inside Eloquent Models;
21. blindly mass-assign validated nested arrays;
22. hold DB workflow lock during upload/chunk transfer/assembly/scan/render/sign;
23. silently overwrite stale Draft/Result;
24. execute transition without locked current-state revalidation;
25. commit successful workflow without required Business Audit;
26. pollute Business Timeline with routine access/chunk transport;
27. age-purge authoritative audit;
28. expose private attachment/export/chunk/quarantine object via predictable public path;
29. use storage path as permission;
30. trust browser SHA-256 as authoritative final attachment hash;
31. replace full assembled-file ClamAV with per-chunk scan aggregation;
32. store acknowledged production chunks only on ephemeral app filesystem;
33. equate upload COMPLETED with security CLEAN;
34. expose clamd publicly;
35. render export synchronously inside workflow transaction;
36. let worker read newer mutable data instead of bound snapshot;
37. generic-rewrite XLSX if controls may strip;
38. use HTML PDF fallback;
39. sign XLSX under PDF rule;
40. require personal Approver certificate;
41. put private signing key in source/DB/browser;
42. deliver unsigned Approved PDF;
43. claim TSA current MVP;
44. make public verifier a record portal;
45. classify genuine superseded PDF as modified solely due workflow change;
46. delete source/audit/issuance when binary expires;
47. let scheduler advance workflow;
48. add Redis/Kafka/upload microservice/search without evidence;
49. silently swallow exceptions or return false success after infrastructure/persistence failure.

---

# PART U — ACCEPTANCE / DOWNSTREAM

## 87. Repository–Service Architecture Acceptance

- [ ] Controller → Service only for application use cases;
- [ ] no parallel Actions orchestration layer;
- [ ] Service owns use-case orchestration and business transaction boundary;
- [ ] Service does not issue Eloquent/Query Builder business queries;
- [ ] repository contracts are injected via container;
- [ ] Eloquent repository implementations own application DB query/persistence details;
- [ ] repositories are meaningful domain/aggregate boundaries, not table mirrors;
- [ ] no generic BaseRepository CRUD hierarchy;
- [ ] no mandatory DTO framework/layer;
- [ ] simple inputs use typed values/enums where practical;
- [ ] complex validated arrays are explicitly mapped and not blindly mass-assigned;
- [ ] Jobs/Commands call Services;
- [ ] infrastructure integrations use proper Contract/Adapter boundaries;
- [ ] runtime authorization remains Spatie + Laravel Gate/Policy, not repository reimplementation;
- [ ] repository does not contain workflow/business authorization decisions;
- [ ] Eloquent models do not become God Models/business orchestration containers.

## 88. Authorization / Concurrency / Audit Acceptance

- [ ] no tenant layer;
- [ ] Team exists but does not authorize;
- [ ] Spatie tables reused, Teams disabled;
- [ ] granular permission + state/domain checks;
- [ ] Requester ownership preserved where explicit;
- [ ] protected Superadmin cannot bypass impossible domain states;
- [ ] workflow uses Service transaction + repository row lock/current-state revalidation;
- [ ] editable persistence uses optimistic version;
- [ ] authoritative audits remain separated and no age purge.

## 89. Attachment / Export Acceptance

- [ ] resumable 5 MiB chunks;
- [ ] 24h inactivity cleanup;
- [ ] server accepted/missing state authoritative;
- [ ] durable production acknowledged chunk storage;
- [ ] server final SHA-256 authoritative;
- [ ] full assembled-file ClamAV explicit CLEAN;
- [ ] immutable-snapshot async exact XLSX/PDF export;
- [ ] Approved PDF signed System/Organization;
- [ ] no unsigned fallback;
- [ ] public validator minimum disclosure;
- [ ] 168h artifact cleanup without deleting issuance/audit.

## 90. Schema Relationship

`11_ERD_Database_Schema.md` remains authoritative for physical tables/constraints. Repository–Service Architecture does **not** create new business schema merely to represent architecture layers.

Schema transaction examples must be implemented through Service-owned transactions and Repository persistence, not copied literally into Controller/Job.

`11A_Resumable_Attachment_Upload_Synchronization.md` remains authoritative for resumable-upload schema additions until those sections are physically merged into `11`.

## 91. API Relationship

`12_API_Contract.md` remains authoritative for HTTP routes/payloads/status/error semantics.

Repository–Service changes **do not** alter those public/internal HTTP contracts.

Interpret implementation path as:

```text
Route
→ Controller / Form Request
→ Service
→ Repository/domain/infrastructure boundaries
```

rather than the older conceptual `Controller → Action` wording.

Cross-document override details are recorded in `12A_Repository_Service_Architecture_Synchronization.md`.

## 92. Remaining TBD

Still intentionally deferred:

- exact default Team master data;
- official numbering SOP/sample;
- temporary credential delivery mechanism;
- exact re-auth proof lifetime;
- public validator max upload size;
- bulk export packaging;
- exact numeric rate limits;
- signing provider/library/container/path/key-rotation mechanics;
- notification provider/timing;
- technical-log retention;
- backup/restore/DR/RPO/RTO;
- performance/availability targets;
- exact production deployment topology/provider.

## 93. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| Flow | `03_User_Flow.md` |
| Permission/Spatie/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| **Logical architecture + Repository–Service dependency direction** | **`09_System_Architecture.md`** |
| Security | `10_Security_Rules.md` |
| Schema | `11_ERD_Database_Schema.md` |
| HTTP contract | `12_API_Contract.md` |
| Repository–Service cross-document synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |

## 94. Current Documentation Handoff

Architecture through `12` is now synchronized for Repository–Service semantics by updated `08`, updated `09`, and `12A`.

Next fixed-order document:

**`13_Project_Structure.md`** — must materialize exact folder/class placement for Controller, Form Request, Service, Repository Contract, Eloquent Repository Implementation, Domain Enums/Rules, Models, Policies, Infrastructure Contracts/Adapters, Jobs, Providers, routes, frontend, and tests while preserving all boundaries above.
