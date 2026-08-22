# Repository–Service Architecture — Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`, `11A_Resumable_Attachment_Upload_Synchronization.md`, `12_API_Contract.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-08-22  
> **Status:** Confirmed / Authoritative cross-document synchronization  
> **Next Fixed-Order Document:** `13_Project_Structure.md`

---

## 1. Purpose

Dokumen ini merekam keputusan final Repository–Service Architecture yang dikunci setelah `12_API_Contract.md` selesai tetapi sebelum `13_Project_Structure.md` ditulis.

Keputusan ini muncul karena project harus menghasilkan kode yang:

- clean dan rapi;
- mudah dipahami/dirawat manusia;
- minim silent bug;
- minim AI slop/boilerplate;
- tidak memiliki business logic tersebar di Controller/Model/Job;
- tidak memakai abstraction hanya untuk terlihat "enterprise".

Dokumen ini **tidak** mengubah business scope, state machine, permission model, database business schema, HTTP route/payload, attachment limits, export fidelity, audit retention, atau security policy. Ia mengubah dan mengunci **internal implementation architecture and dependency ownership**.

`08_Tech_Stack_Specification.md` dan `09_System_Architecture.md` telah diperbarui langsung untuk memasukkan keputusan ini. Untuk wording lama pada `10`, `11`, `11A`, atau `12` yang berbicara mengenai `Application Action`, direct Eloquent persistence, optional repository wrapper, DTO, atau transaction/persistence ownership yang berbeda, addendum ini menjadi **newer authoritative interpretation/override** sampai wording tersebut disentuh kembali dalam ordinary document synchronization.

---

# PART A — FINAL ARCHITECTURE DECISIONS

## 2. Repository–Service Architecture Is Mandatory

Backend current MVP menggunakan:

```text
HTTP / Inertia
Controller + Form Request
        ↓
Service Layer
        ↓
Repository Contracts + Domain Rules + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Adapters
        ↓
Eloquent / Query Builder / MySQL / Storage / Runtime Components
```

Architecture tetap Laravel-native modular monolith, bukan microservice, bukan separate REST backend, dan bukan full enterprise Clean Architecture.

## 3. Service Replaces the Separate Application Actions Layer

Old documentation uses conceptual terms such as:

```text
CreateNscmf
SaveDraft
SubmitNscmf
ApproveNscmf
RequestNscmfExport
```

Those use-case names remain semantically useful, but a separate `Actions` orchestration layer MUST NOT coexist beside a Service orchestration layer.

Canonical implementation direction:

```text
Controller
→ Service method/use case
→ Repository / Domain / Infrastructure boundary
```

NOT:

```text
Controller
→ Action
→ Service
→ Repository
```

and NOT:

```text
Controller
→ Service
→ Action
→ Repository
```

`Application Action` wording in earlier docs should therefore be read as **Service/use-case orchestration** unless a future specification explicitly reintroduces a distinct layer with demonstrated value.

## 4. Service Responsibilities

Service is the single application/use-case orchestration layer.

Service owns:

- coordinating one business use case;
- transaction boundary for business mutation;
- domain/state/validation coordination;
- repository calls;
- required Business/Security Audit coordination;
- post-commit queue dispatch where appropriate;
- infrastructure-contract calls where appropriate;
- explicit failure/atomicity semantics.

Service MUST NOT become a God Service.

Recommended cohesion direction includes separate services for creation/draft/workflow/result/upload/finalization/export/admin/security concerns rather than one enormous `NscmfService`.

## 5. Repository Contracts + Eloquent Implementations

Persistence/query access for application business data MUST go through repository contracts resolved to concrete Eloquent implementations.

Conceptual:

```text
NscmfRepository
→ EloquentNscmfRepository
```

through Laravel service-container binding.

Service depends on the contract, not the concrete Eloquent implementation.

## 6. Repository Granularity

Repository is grouped by meaningful domain/aggregate/use-case persistence boundary, **not one repository per table**.

Conceptual repository boundaries may include:

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

Exact final list is decided in `13_Project_Structure.md`.

The relational schema may have many typed child tables; those child tables do not automatically require one repository each.

## 7. No Generic BaseRepository

Current MVP MUST NOT introduce architecture such as:

```text
BaseRepository
GenericRepository<T>
RepositoryInterface<T>
findAll()
findById()
create()
update()
delete()
```

for every model merely to wrap Eloquent.

Repository methods should express meaningful persistence intent such as:

```text
findForWorkflowUpdate
findEditableRecord
persistDraft
paginateReviewCandidates
paginateApprovalCandidates
findResumableUpload
storeAcceptedChunk
createImmutableExportSnapshot
```

A reusable base abstraction may only be introduced later when multiple concrete implementations demonstrate a genuine semantic need.

## 8. Repository Does Not Own Business Decisions

Repository MAY handle:

- Eloquent queries;
- Query Builder;
- relationships/eager loading;
- row locking;
- persistence;
- pagination;
- storage of relational state;
- optimized database query implementation.

Repository MUST NOT decide:

- whether Requester may Submit;
- whether Reviewer may Forward;
- whether Approver may Approve;
- allowed Reopen destination;
- whether Team grants access;
- whether attachment security can bypass CLEAN;
- whether workflow invariant may be ignored.

Those remain Service/domain/Policy/security concerns.

---

# PART B — PERSISTENCE BOUNDARY

## 9. Strict Application Persistence Boundary

For application business persistence/querying:

```text
Controller
→ NO direct Model::query()/DB::table()/save()/update() business persistence

Service
→ NO Eloquent/Query Builder business query
→ YES Repository Contract
→ YES Laravel transaction primitive for transaction ownership only

Job / Scheduled Command
→ NO Model/DB/Repository business flow
→ YES Service

Eloquent Repository Implementation
→ YES Eloquent/Query Builder/locking/pagination/persistence
```

This rule exists to eliminate scattered persistence behavior and reduce silent inconsistencies between code paths.

## 10. Transaction Ownership

Business transaction boundary belongs to Service.

Conceptual:

```text
Service
→ DB::transaction
   → Repository read/lock
   → domain/state/permission validation
   → Repository persistence
   → Workflow/Audit repository persistence
→ commit
```

Service may use Laravel `DB::transaction()` or an equivalent thin transaction mechanism **only for transaction control**. It may not use that exception to issue business SQL/query-builder statements.

Repository participates in the active transaction and MUST NOT independently commit/rollback the larger cross-repository business use case.

No custom Unit-of-Work abstraction is required current MVP.

## 11. Eloquent Model Boundary

Eloquent Model remains the persistence model and relationship mapping layer.

Allowed:

- relationships;
- casts;
- safe accessors;
- persistence-oriented local scopes where useful;
- model configuration.

Not allowed:

- multi-step workflow orchestration;
- external scanner/render/signing orchestration;
- audit coordination;
- hidden authorization bypass;
- God Model behavior.

---

# PART C — NO DTO LAYER

## 12. DTO Is Not Part of Current MVP Architecture

After explicit project review, current MVP does **not** introduce a DTO layer.

This means no mandatory:

```text
*Dto
*Data
*Command object per HTTP endpoint
DTO per Eloquent Model
read DTO per list/queue
Mapper per Model
spatie/laravel-data
```

Repository–Service Architecture does not require DTO to function correctly.

## 13. Input Safety Without DTO

HTTP input boundary remains Laravel Form Request.

Simple values SHOULD be passed to Service as explicit typed scalar/enum parameters where practical.

Example conceptual signature:

```text
archive(recordId: int, expectedVersion: int, reason: string)
```

Complex nested NSCMF Draft data MAY cross as the dedicated Form Request's validated structured array.

Required guardrails:

- only `validated()` data crosses the HTTP boundary;
- `$request->all()` is forbidden for business persistence;
- Service/Repository explicitly map expected fields;
- no blind mass assignment of an entire nested validated payload into domain models;
- PHP enums are preferred for closed domain value sets;
- PHPStan/Larastan array-shape annotations MAY be used where they improve static checking without creating a parallel DTO hierarchy.

## 14. Repository Return Values Without DTO

Repository MAY return:

- Eloquent Model;
- Eloquent Collection;
- paginator;
- scalar/value result;
- bounded native query result where clearly typed/understood.

Read screens such as Review/Approval/History should use selected/eager-loaded Eloquent queries rather than automatically create a DTO class for every row.

Full domain entity mapping between Repository and Service is not current MVP architecture.

---

# PART D — INFRASTRUCTURE ADAPTERS

## 15. External Runtime Components Are Not Repositories

Repository terminology is reserved for persistence/query boundaries.

Use focused contracts/adapters:

```text
MalwareScanner
→ ClamAvScanner

PrivateStorage
→ Flysystem-backed implementation

SpreadsheetRenderer
→ qualified renderer implementation

PdfSigner
→ concrete signing implementation

PdfVerifier
→ concrete verification implementation
```

Do not name every integration `Repository` merely for consistency.

## 16. Job / Command Rule

Queue Job and scheduled command are thin technical entry points.

Canonical:

```text
FinalizeAttachmentUploadJob
→ AttachmentFinalizationService

GenerateNscmfExportJob
→ NscmfExportService
```

Jobs MUST NOT directly query/mutate Eloquent or call repositories to implement the business use case themselves.

Commands/scheduler callbacks follow the same rule and call cleanup/application Services.

---

# PART E — SPATIE SPECIAL CASE

## 17. Runtime Authorization Remains Spatie + Laravel

Repository–Service Architecture MUST NOT create a second permission engine.

Runtime authorization remains:

```text
Spatie Permission
+ Laravel Gate/Policy
+ explicit ownership where required
+ state/archive/validation/security/invariant/concurrency
```

Forbidden replacement:

```text
RolePermissionRepository::userCan(...)
custom effective_permissions table
Team-based permission resolver
```

## 18. Administrative Role/Permission Mutation

Administrative mutations such as assign roles/sync permissions may be coordinated by a Service and bounded repository/adapter around Spatie package mutation so that these side effects remain consistent:

```text
current-password re-auth
→ protected invariant
→ Service
→ Spatie mutation
→ determine affected users
→ revoke affected sessions
→ Security Audit
```

Spatie remains the role/permission source of truth.

## 19. Existing Spatie Decisions Remain Locked

```text
Spatie teams = false
wildcard permissions = false
single web guard
direct-user permission admin UI = absent current MVP
package-owned tables are reused
```

No repository/service rule changes those decisions.

---

# PART F — DOCUMENT-BY-DOCUMENT SYNCHRONIZATION

## 20. `08_Tech_Stack_Specification.md`

Updated directly on 2026-08-22.

It now explicitly defines:

- Repository–Service as mandatory backend architecture;
- Service replacing separate Actions orchestration layer;
- Repository Contract → Eloquent implementation;
- Service-owned transaction boundary;
- no DTO layer;
- no generic BaseRepository;
- Job/Command → Service;
- infrastructure Contract/Adapter terminology;
- persistence-boundary enforcement;
- third-login rule;
- resumable-upload technology boundary.

`08` is authoritative for technology selection and architecture technology guardrails.

## 21. `09_System_Architecture.md`

Updated directly on 2026-08-22.

It is authoritative for dependency direction and logical component ownership.

Old wording such as:

```text
Application Actions
```

is superseded by:

```text
Service Layer
```

and old wording that generic repositories are merely optional is superseded by mandatory repository contracts/implementations for application persistence/query boundaries.

## 22. `10_Security_Rules.md`

Security policy itself remains valid.

Repository–Service adds these security implementation guardrails:

- Controller/Job must not bypass Service to mutate security-sensitive business state;
- Service must not bypass Repository to issue ad-hoc application persistence queries;
- Repository cannot become an authorization bypass;
- direct IDs/object keys remain non-authoritative;
- role/permission administration still requires re-auth/session-revocation/audit orchestration;
- scanner/signing failures remain fail closed regardless of layer boundaries;
- caught exceptions MUST NOT be silently swallowed into success.

### 22.1 Third-login correction

Older `10` wording says exact third-login replacement/denial behavior was downstream TBD.

That narrow wording is superseded by the confirmed API/architecture decision:

```text
third valid login
→ succeeds
→ revoke oldest active authenticated session deterministically
→ retain new session
→ active sessions <= 2
```

This is no longer TBD.

## 23. `11_ERD_Database_Schema.md`

Physical schema remains authoritative and is not redesigned merely because Repository–Service is introduced.

Database examples such as:

```text
BEGIN
SELECT ... FOR UPDATE
persist child rows
insert audit
COMMIT
```

must be implemented through:

```text
Service-owned transaction
→ Repository lock/query/persistence
→ required Audit repository persistence
```

not copied as direct Controller/Job database logic.

No architecture tables such as `services`, `repositories`, `units_of_work`, or DTO storage are added.

The repository layer MUST reuse the relational schema rather than invent a shadow data model.

## 24. `11A_Resumable_Attachment_Upload_Synchronization.md`

All resumable-upload decisions remain valid.

Implementation mapping becomes:

```text
Controller/Form Request
→ AttachmentUploadService
→ AttachmentUploadRepository
→ upload-session/chunk relational metadata
→ PrivateStorage adapter for chunk bytes
```

Finalization mapping:

```text
FinalizeAttachmentUploadJob
→ AttachmentFinalizationService
→ AttachmentUploadRepository / AttachmentRepository
→ PrivateStorage
→ MalwareScanner
→ Audit persistence
```

The Job is not the business service.

The repository does not classify malware CLEAN by itself; it persists the explicit result coordinated by the Service/security boundary.

## 25. `12_API_Contract.md`

All HTTP route, request, response, error, pagination, authorization, workflow, resumable-upload, export, administration, and public-validator contracts remain valid unless explicitly superseded by another authoritative product/security decision.

Repository–Service is an internal implementation architecture and therefore **does not change the wire contract**.

Canonical implementation interpretation:

```text
Route
→ Controller
→ Form Request
→ Service
→ Repository/domain/infrastructure boundaries
```

Any old wording that implies:

```text
Controller → Application Action
```

should be read as:

```text
Controller → Service use case
```

### 25.1 No DTO implication

References to request/response "DTO" in `12` describe a **wire/data shape contract**, not a requirement to create PHP DTO classes.

Implementation MAY use Form Requests, Resources, typed scalars/enums, and validated arrays without introducing DTO classes.

### 25.2 Section 116 typo correction

The example text:

```text
APPPROVED
```

is a typographical error and MUST be read as:

```text
APPROVED
```

No state named `APPPROVED` exists.

---

# PART G — CONCURRENCY / TRANSACTION SYNCHRONIZATION

## 26. Draft / Revision / Result

Canonical implementation:

```text
Controller/Form Request
→ Draft/Result Service
→ permission + ownership
→ Service opens short transaction
→ Repository performs optimistic record_version write/check
→ Repository persists typed relational fields
→ Business Audit persistence
→ version++
→ commit
```

No Controller query/persistence.

No Service Eloquent/Query Builder business query.

## 27. Workflow Transitions

Canonical implementation:

```text
Controller/Form Request
→ Workflow Service
→ permission/resource preliminary authorization
→ Service opens short transaction
→ Repository locks record FOR UPDATE
→ Service revalidates state/archive/reason/domain/security
→ Workflow/Nscmf Repository persists mutation
→ Business Audit persists required event
→ version++
→ commit
```

Long scan/render/sign work is outside this transaction.

## 28. Export Snapshot

Canonical implementation:

```text
Controller
→ Export Service
→ authorize
→ Service opens short transaction
→ Repository reads consistent current state
→ Repository creates export request
→ Repository creates immutable canonical snapshot
→ commit
→ dispatch job after commit
```

Worker Job calls Export Service and uses the immutable snapshot.

## 29. Attachment Chunk Transfer

Chunk network I/O does not hold parent workflow row lock.

Service coordinates:

```text
session authorization
→ storage write
→ server chunk hash
→ accepted metadata persistence
```

A storage failure must not create an accepted chunk row. A DB failure must not produce false accepted progress.

---

# PART H — CLEAN-CODE / AI-SLOP GUARDRAILS

## 30. Controller Guardrails

Controller MUST NOT:

- contain business rule branching beyond transport/response concerns;
- query Eloquent/Query Builder for business data;
- mutate domain models;
- call repository directly for application use cases;
- coordinate audit/scanner/export/signing pipelines;
- open business transaction.

## 31. Service Guardrails

Service MUST NOT:

- issue Eloquent/Query Builder business query directly;
- become a 3,000+ line God Service combining unrelated domains;
- swallow exceptions and return false success;
- duplicate the exact same business rule across services;
- bypass Gate/Policy/security/domain invariants because it is "internal" code;
- perform long external I/O while holding workflow row lock.

## 32. Repository Guardrails

Repository MUST NOT:

- become generic CRUD wrapper noise;
- mirror every table mechanically;
- make business workflow permission decisions;
- accept raw HTTP Request objects;
- return HTTP/Inertia responses;
- expose persistence/storage identifiers as authorization proof;
- silently suppress DB conflicts/failures.

## 33. Job / Command Guardrails

Job/Command MUST NOT:

- become alternate Service implementation;
- call Eloquent/Query Builder for domain persistence directly;
- call repositories directly to orchestrate business use cases;
- silently convert failure into READY/CLEAN/success.

## 34. Model Guardrails

Eloquent Models MUST NOT become God Models containing multi-step orchestration.

Relationships/casts/persistence helpers are fine; use-case orchestration belongs to Service.

## 35. DTO / Mapper Guardrails

MUST NOT introduce:

- DTO-per-model;
- DTO-per-endpoint by default;
- read DTO for every queue row;
- Mapper-per-model;
- Domain Entity mirror of every Eloquent Model;
- DTO framework merely to claim Clean Architecture.

Future introduction requires evidence that type/serialization complexity justifies its maintenance cost.

## 36. Type-Safety Direction

To reduce silent bugs without DTO boilerplate:

- `declare(strict_types=1);` for project-owned PHP files;
- typed method parameters and return types;
- PHP Enums for closed sets;
- PHPStan/Larastan;
- explicit Form Request validation;
- array-shape annotations for genuinely complex validated arrays where useful;
- no magic status strings scattered through code;
- no `$request->all()` business persistence;
- no blind nested mass assignment.

---

# PART I — NON-CHANGES / LOCKED RULES

## 37. Business and Product Semantics Unchanged

Repository–Service does not change:

```text
single organization
Team only / no Unit Division
Team not authorization scope
Spatie Teams OFF
permission-centric Reviewer/Approver
seven canonical business states
workflow iteration semantics
one final eligible Approver sufficient
Requester ownership where explicit
Change Result narrow edit
Archive separate from status
no hard delete
```

## 38. Attachment Rules Unchanged

```text
optional
max10 active attachments
max20 MB/file
zero-byte rejected
allowlist unchanged
5 MiB resumable chunks
24h unfinished inactivity expiry
client fingerprint hint only
server final SHA-256 authoritative
whole-file ClamAV
explicit CLEAN only
```

## 39. Audit Rules Unchanged

```text
Business Audit
Access Audit
Security Audit
Technical Logs
```

Business/Access/Security Audit have no age-based purge and no normal delete/edit path.

## 40. Export Rules Unchanged

```text
XLSX/PDF only current MVP
async
immutable snapshot at request time
worker uses snapshot
exact official XLSX template
Approved PDF signed System/Organization
no unsigned fallback
private READY artifact 168h/7d
```

## 41. Public Validator Rules Unchanged

```text
public no-login /ispdfvalid
PDF only
rate limited
private temp
ClamAV CLEAN
authoritative signature + exact hash + issuance/currentness
minimum disclosure
VALID_CURRENT / VALID_SUPERSEDED / INVALID_MODIFIED / UNKNOWN
```

---

# PART J — REQUIREMENTS FOR `13_Project_Structure.md`

## 42. `13` Must Materialize These Boundaries

`13_Project_Structure.md` MUST define physical placement for at least:

```text
Controllers
Form Requests
Services
Repository Contracts
Eloquent Repository Implementations
Eloquent Models
Policies
Domain Enums / focused Rules
Infrastructure Contracts
Infrastructure Adapters
Queue Jobs
Scheduled Commands / scheduler hooks
Service Providers / repository bindings
Routes
Frontend Pages/components/composables/types
Tests
```

## 43. `13` Must Not Reintroduce Removed Layers

`13` MUST NOT create:

```text
Actions/ as a second orchestration layer
DTO/ as mandatory architecture layer
Mappers/ per model
Generic BaseRepository hierarchy
Repository per DB table mechanically
UnitOfWork abstraction without proven need
```

## 44. `13` Must Keep Service Cohesion

Project structure should make it difficult to create a God Service.

Services should be grouped by meaningful capability/use case such as:

```text
Nscmf creation/draft/workflow/result
Attachment upload/finalization/normal attachment
Export/verification
Administration
Identity/session/credential
```

Exact final class split is discussed in `13`, not guessed by this addendum.

## 45. `13` Must Keep Repository Cohesion

Repository contracts should reflect meaningful persistence boundaries rather than table count.

Typed relational child tables remain hidden behind relevant aggregate repository implementation where practical.

## 46. `13` Must Preserve HTTP Contract

Physical route/controller/service naming may be refined, but route semantics from `12_API_Contract.md` remain authoritative.

No generic status endpoint or architecture-driven API rewrite is allowed.

---

# PART K — ACCEPTANCE

## 47. Repository–Service Synchronization Acceptance

- [x] Repository–Service Architecture formally confirmed.
- [x] `08_Tech_Stack_Specification.md` updated directly.
- [x] `09_System_Architecture.md` updated directly.
- [x] separate Actions orchestration layer superseded.
- [x] Service defined as use-case and transaction owner.
- [x] Repository Contract → Eloquent implementation confirmed.
- [x] repository-per-table rejected.
- [x] generic BaseRepository rejected.
- [x] DTO layer rejected for current MVP.
- [x] Eloquent/Query Builder application persistence/querying placed in repository implementation.
- [x] Service may use transaction primitive only for transaction control.
- [x] Job/Command → Service rule confirmed.
- [x] external components use Contract/Adapter terminology.
- [x] Spatie runtime authorization remains unchanged.
- [x] `10`, `11`, `11A`, `12` implementation wording synchronized through this newer authoritative addendum.
- [x] third-login narrow stale wording in `10` overridden by confirmed revoke-oldest behavior.
- [x] `12` wire contract preserved.
- [x] `12` Section 116 `APPPROVED` typo explicitly corrected to `APPROVED`.

## 48. Remaining Unrelated Synchronization Items

This addendum intentionally does not invent/resolve unrelated open product/environment decisions such as:

- exact default Team master data;
- official numbering SOP;
- temporary credential delivery mechanism;
- exact re-auth proof lifetime;
- public-validator max upload size;
- exact numeric rate limits;
- bulk export packaging;
- signing library/provider/path/key-rotation mechanics;
- notification provider/timing;
- technical-log retention;
- backup/DR;
- performance/SLA;
- physical deployment topology.

Those remain for their authoritative downstream documents.

---

## 49. Final Architecture Statement

> NSCMF uses a pragmatic Laravel Repository–Service Architecture: Controller and Job remain thin, Service owns use-case orchestration and business transactions, Repository contracts isolate application persistence with Eloquent implementations, external runtime capabilities use focused contracts/adapters, and the project deliberately avoids mandatory DTO, mapper, BaseRepository, Unit-of-Work, or other abstraction layers that do not provide concrete maintainability value.

---

## 50. Next Document

The architecture decision is sufficiently locked to continue with:

**`13_Project_Structure.md`**

`13` must translate this architecture into exact physical project structure without changing the already-authoritative business, security, schema, and HTTP contracts.
