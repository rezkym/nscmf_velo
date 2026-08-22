# Project Structure Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-STRUCT-013  
> **Document Order:** 13 / 20  
> **Status:** Draft — Authoritative Project Structure Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`, `12_API_Contract.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`  
> **Application Style:** Laravel 13 modular monolith + pragmatic Repository–Service Architecture + Inertia 3 + Vue 3 / TypeScript  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk physical source-code organization, folder ownership, class placement, dependency direction, dan cross-layer boundaries** NSCMF Digital Form & Workflow System.

Dokumen ini menjawab:

- file dan class diletakkan di mana;
- Controller, Form Request, Service, Repository, Domain, Model, Job, Policy, dan Infrastructure Adapter bertanggung jawab atas apa;
- dependency antar-layer berjalan ke arah mana;
- struktur route Laravel;
- struktur Vue/Inertia;
- struktur test;
- placement untuk resumable attachment, audit, export, OOXML, PDF signing, dan public verification;
- bagaimana mencegah business logic, persistence, dan infrastructure concern tersebar;
- batas yang harus dipatuhi developer maupun coding agent agar repository tetap clean, predictable, dan maintainable.

Dokumen ini **tidak** mengubah business rule, permission, state machine, schema, HTTP contract, security policy, environment value, atau deployment topology yang sudah dikunci upstream.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default unless an approved exception exists.
- **MAY** — allowed.
- **AUTHORITATIVE** — source of truth untuk concern dokumen ini.
- **TBD** — unresolved dan tidak boleh diisi berdasarkan asumsi diam-diam.

---

# PART A — STRUCTURAL PRINCIPLES

## 3. Laravel-Native, Domain-Grouped

Project MUST tetap mudah dikenali oleh Laravel developer biasa.

Kita menggunakan struktur Laravel-conventional dengan grouping berdasarkan domain/capability, **bukan** custom `Modules/` framework dan bukan full enterprise Clean Architecture.

Top-level backend direction:

```text
app/
├── Domain/
├── Http/
├── Infrastructure/
├── Jobs/
├── Models/
├── Policies/
├── Providers/
├── Repositories/
├── Services/
└── Support/
```

Tidak ada top-level `Actions/` orchestration layer pada current MVP.

## 4. Canonical Dependency Direction

```text
HTTP / Inertia
Controllers + Form Requests
        ↓
Services
        ↓
Domain Rules + Repository Contracts + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Infrastructure Adapters
        ↓
Eloquent / Query Builder / Flysystem / Runtime Integration
        ↓
MySQL / Private Storage / ClamAV / Renderer / Signing Runtime
```

Rules:

1. Controller MUST call Service, not Repository/Model/DB.
2. Service MAY depend on Repository contracts, Domain rules, Policies/Gates, and Infrastructure contracts.
3. Service MUST NOT issue Eloquent/Query Builder business queries directly.
4. Repository implementation MAY use Eloquent/Query Builder and persistence-oriented model scopes.
5. Domain MUST NOT depend on HTTP, Eloquent repository implementations, Inertia, or Vue.
6. Infrastructure implementation MUST implement focused contracts; it MUST NOT become workflow authority.
7. Job/Command MUST enter business execution through Service.
8. Vue MUST NOT become permission/state/security source of truth.

## 5. Pragmatic Architecture, Not Abstraction Theater

Current project explicitly avoids unnecessary layers.

MUST NOT introduce by default:

```text
Actions/ beside Services/
DTO layer
DTO-per-request
DTO-per-model
mandatory read DTO/projection hierarchy
Mapper-per-model
Domain Entity mirror for every Eloquent Model
AggregateRoot framework
UnitOfWork abstraction
Generic BaseRepository
Generic CRUD Service
Repository-per-table mechanically
Service locator
```

A future abstraction requires a demonstrated problem and approved specification change.

---

# PART B — REPOSITORY ROOT

## 6. Canonical Repository Shape

Target repository after Laravel bootstrap SHOULD converge to:

```text
nscmf_velo/
├── app/
│   ├── Domain/
│   ├── Http/
│   ├── Infrastructure/
│   ├── Jobs/
│   ├── Models/
│   ├── Policies/
│   ├── Providers/
│   ├── Repositories/
│   ├── Services/
│   └── Support/
│
├── bootstrap/
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
│
├── project_doc/
├── public/
├── resources/
│   ├── css/
│   └── js/
├── routes/
├── storage/
├── tests/
│   ├── Feature/
│   ├── Unit/
│   ├── Integration/
│   ├── Architecture/
│   ├── Fixtures/
│   └── Browser/
│
├── composer.json
├── composer.lock
├── package.json
├── package-lock.json
├── phpstan.neon
├── phpunit.xml
├── vite.config.*
└── ...normal Laravel/tooling files
```

Exact framework-generated bootstrap files follow Laravel 13 defaults unless another project document explicitly overrides them.

## 7. `project_doc/`

All fixed-order project specifications remain in `project_doc/`.

Application code MUST NOT duplicate project decisions into a second competing documentation tree.

`project_doc` remains specification authority; code comments may explain implementation detail but must not silently redefine rules.

---

# PART C — HTTP LAYER

## 8. `app/Http/`

Canonical shape:

```text
app/Http/
├── Controllers/
│   ├── Auth/
│   ├── Dashboard/
│   ├── Nscmf/
│   │   ├── Workflow/
│   │   ├── Attachment/
│   │   ├── Export/
│   │   └── Timeline/
│   ├── Review/
│   ├── Approval/
│   ├── History/
│   ├── Administration/
│   │   ├── Users/
│   │   ├── Roles/
│   │   ├── Teams/
│   │   └── Audits/
│   └── Public/
│
├── Middleware/
├── Requests/
│   ├── Auth/
│   ├── Nscmf/
│   │   ├── Workflow/
│   │   ├── Attachment/
│   │   └── Export/
│   ├── Administration/
│   └── Public/
│
└── Resources/
    ├── Nscmf/
    ├── Attachment/
    ├── Export/
    ├── Audit/
    └── Administration/
```

Folder may be omitted until a class actually exists; empty architectural folders do not need placeholder files.

## 9. Controller Rule

Controller is an HTTP adapter.

Controller responsibilities:

```text
receive routed request
→ consume validated Form Request values
→ invoke Service
→ return Inertia / JSON / redirect / streamed response
```

Controller MUST NOT:

- call `Model::query()`;
- call `DB::table()` for application data;
- call Repository directly;
- open business transactions;
- calculate workflow destination;
- mutate state/model directly;
- coordinate audit writes;
- coordinate chunk assembly/ClamAV/export/signing;
- implement business validation already owned elsewhere.

## 10. Controller Granularity

### 10.1 Sensitive/domain mutation

Workflow/lifecycle/security-sensitive mutations SHOULD use invokable or single-purpose controllers.

Representative structure:

```text
app/Http/Controllers/Nscmf/Workflow/
├── SubmitNscmfController.php
├── CancelNscmfController.php
├── ReopenNscmfController.php
├── ArchiveNscmfController.php
└── UnarchiveNscmfController.php

app/Http/Controllers/Review/
├── ForwardReviewController.php
├── ReturnReviewController.php
└── RejectReviewController.php

app/Http/Controllers/Approval/
├── ApproveNscmfController.php
├── ReturnToReviewerController.php
├── ReturnToRequesterController.php
└── RejectApprovalController.php
```

Names MAY be refined for Laravel consistency, but one controller MUST NOT become a generic `changeStatus($action)` switch.

### 10.2 Cohesive normal CRUD/read

Normal cohesive CRUD/read surfaces MAY use resource-style controllers, for example:

```text
TeamController
UserController
RoleController
HistoryController
```

A resource-style controller remains thin and MUST NOT become a Service substitute.

## 11. Form Requests — HTTP Input Contract

Dedicated Laravel Form Requests own HTTP input validation/whitelisting.

Representative classes:

```text
CreateNscmfRequest
SaveNscmfDraftRequest
UpdateChangeResultRequest
SubmitNscmfRequest
CancelNscmfRequest
ReviewForwardRequest
ReviewReturnRequest
ReviewRejectRequest
ApproveNscmfRequest
ApprovalReturnReviewerRequest
ApprovalReturnRequesterRequest
ApprovalRejectRequest
ReopenNscmfRequest
ArchiveNscmfRequest
UnarchiveNscmfRequest
InitiateAttachmentUploadRequest
UploadAttachmentChunkRequest
CompleteAttachmentUploadRequest
RequestNscmfExportRequest
BulkExportRequest
VerifyPdfRequest
```

Administration and authentication actions follow the same domain-specific request naming.

Important:

- Form Request is not a business Service.
- `$request->all()` MUST NOT be used for business persistence.
- `validated()` data may cross to Service only after exact whitelist validation.
- Service MUST still enforce state/security/concurrency invariants that cannot safely live only at HTTP boundary.
- Workflow mutation MUST revalidate authoritative current state inside its required transaction/lock path.

## 12. No PHP DTO Layer

Current MVP has no PHP DTO architecture layer.

For simple inputs, Controller SHOULD call Service with explicit typed scalar/enum arguments.

For complex nested Draft/Revision data, Controller MAY pass the dedicated Form Request `validated()` structured array to Service.

That array:

- is not a generic data bag;
- must originate from the dedicated Form Request;
- must be explicitly mapped by Service/Repository;
- MUST NOT be blindly mass-assigned to domain models;
- MAY use PHPStan/Larastan array-shape annotations where useful.

## 13. HTTP Resources

`app/Http/Resources/` is for stable structured JSON representation when a Resource provides real value.

It MUST NOT:

- query the database;
- make authorization decisions;
- calculate workflow state transitions;
- expose private object keys/security secrets.

Inertia page props may be assembled directly from Service results in thin Controllers when a dedicated Resource would add no value.

---

# PART D — SERVICE LAYER

## 14. `app/Services/`

Recommended capability-oriented structure:

```text
app/Services/
├── Nscmf/
│   ├── NscmfCreationService.php
│   ├── NscmfDraftService.php
│   ├── NscmfWorkflowService.php
│   ├── NscmfChangeResultService.php
│   └── NscmfQueryService.php
│
├── Attachment/
│   ├── AttachmentUploadService.php
│   ├── AttachmentFinalizationService.php
│   └── AttachmentService.php
│
├── Export/
│   ├── NscmfExportService.php
│   └── PdfVerificationService.php
│
├── Administration/
│   ├── UserAdministrationService.php
│   ├── RolePermissionAdministrationService.php
│   └── TeamAdministrationService.php
│
├── Audit/
│   └── AuditQueryService.php
│
└── Security/
    ├── CredentialService.php
    └── SessionService.php
```

This is a structural baseline, not a requirement to create every class before it is needed.

## 15. Service Cohesion

Service represents a cohesive capability/use-case family, not one HTTP endpoint and not an entire application.

Acceptable example:

```text
NscmfWorkflowService
├── submit(...)
├── cancel(...)
├── reviewForward(...)
├── reviewReturn(...)
├── reviewReject(...)
├── approve(...)
├── approvalReturnReviewer(...)
├── approvalReturnRequester(...)
├── approvalReject(...)
├── reopen(...)
├── archive(...)
└── unarchive(...)
```

This grouping is acceptable because all operations share workflow/lifecycle invariants, locking, current-state revalidation, and authoritative audit semantics.

MUST NOT create:

```text
SubmitService
ApproveService
RejectService
ReturnService
...
```

merely one-per-route without meaningful cohesion.

MUST NOT create a multi-thousand-line `NscmfService` containing creation, queries, attachments, export, administration, and workflow together.

## 16. Service Responsibilities

Service MAY own:

- use-case orchestration;
- permission/domain/security coordination;
- transaction boundary;
- repository coordination;
- optimistic/locked mutation orchestration;
- required audit persistence orchestration;
- post-commit job dispatch;
- infrastructure-contract invocation outside prohibited lock windows.

Service MUST NOT:

- perform Eloquent/Query Builder business queries directly;
- become an HTTP response builder;
- know Vue/Inertia component internals;
- implement storage-specific/ClamAV-specific/renderer-specific protocol details;
- duplicate rules already centralized in Domain rule objects when those objects exist.

## 17. Transaction Ownership

Business transaction ownership belongs to Service.

Conceptual workflow mutation:

```text
NscmfWorkflowService
→ DB::transaction
   → repository lock/read
   → Policy/Gate + domain/state/security revalidation
   → repository mutation
   → workflow repository mutation
   → required Business Audit repository write
   → record_version update
→ commit
```

Using Laravel transaction manager in Service does not grant Service permission to run application SQL directly.

Long-running upload transfer, assembly, ClamAV, rendering, signing, or external I/O MUST NOT occur while a workflow row lock/business transaction is held.

---

# PART E — REPOSITORY LAYER

## 18. Canonical Structure

```text
app/Repositories/
├── Contracts/
│   ├── Nscmf/
│   │   ├── NscmfRepository.php
│   │   └── WorkflowRepository.php
│   ├── Attachment/
│   │   ├── AttachmentRepository.php
│   │   └── AttachmentUploadRepository.php
│   ├── Export/
│   │   └── ExportRepository.php
│   ├── Audit/
│   │   ├── BusinessAuditRepository.php
│   │   ├── AccessAuditRepository.php
│   │   └── SecurityAuditRepository.php
│   └── Administration/
│       ├── UserRepository.php
│       ├── TeamRepository.php
│       └── RolePermissionRepository.php
│
└── Eloquent/
    ├── Nscmf/
    ├── Attachment/
    ├── Export/
    ├── Audit/
    └── Administration/
```

Concrete Eloquent directory mirrors Contract concern grouping.

Example:

```text
Contracts/Nscmf/NscmfRepository.php
Eloquent/Nscmf/EloquentNscmfRepository.php
```

## 19. Naming Convention

Contract name SHOULD omit redundant `Interface` suffix because namespace already communicates the abstraction:

```text
NscmfRepository
```

not:

```text
NscmfRepositoryInterface
```

Concrete implementation SHOULD communicate technology:

```text
EloquentNscmfRepository
EloquentAttachmentUploadRepository
```

## 20. Repository Responsibilities

Repository owns persistence/query mechanics such as:

- Eloquent query construction;
- Query Builder when justified;
- eager loading;
- selected-column list queries;
- pagination;
- `lockForUpdate()`/persistence locking primitive;
- aggregate persistence;
- idempotent chunk metadata persistence;
- immutable snapshot persistence;
- append-oriented audit persistence.

Repository MUST NOT decide:

- whether actor is allowed to Submit/Approve/Reopen;
- workflow destination;
- whether Team grants authority;
- whether a mandatory reason is semantically acceptable beyond persistence constraints;
- whether scanner output should be converted to business status;
- whether export signing may be skipped.

## 21. Domain-Oriented Repository Methods

Repository method names SHOULD express persistence intent rather than generic CRUD abstraction.

Examples:

```text
findEditableRecord(...)
findForWorkflowUpdate(...)
persistDraft(...)
paginateReviewCandidates(...)
paginateApprovalCandidates(...)
findResumableUpload(...)
storeAcceptedChunk(...)
markUploadAssembling(...)
createImmutableSnapshot(...)
storeReadyArtifact(...)
appendBusinessAuditEvent(...)
```

Exact methods emerge from implementation and tests; this document does not require speculative unused methods.

## 22. No Generic BaseRepository

Forbidden default pattern:

```text
BaseRepository
GenericRepository<T>
RepositoryInterface<T>
all()
find()
create()
update()
delete()
```

followed by one mechanical wrapper per Eloquent Model.

Shared private helper code MAY be extracted only after genuine duplication appears and semantics remain clear.

## 23. Repository Is Not One-Per-Table

Typed Activation/Change child tables remain governed by `11_ERD_Database_Schema.md`, but they do not automatically require one repository each.

`NscmfRepository` may persist/read the NSCMF aggregate and its typed family structures through coordinated Eloquent relationships/queries.

Separate repository is justified when there is a meaningful lifecycle, concurrency, retention, security, or query boundary, such as:

- workflow iteration;
- resumable upload;
- final attachment;
- export/snapshot/artifact/issuance;
- each authoritative audit concern;
- administration/RBAC persistence.

## 24. Repository Return Values

No mandatory Domain Entity/DTO mapper layer exists.

Repository MAY return, where appropriate:

- Eloquent Model;
- Eloquent Collection;
- Laravel paginator;
- scalar/value result;
- narrowly selected Eloquent result.

Service/Controller MUST avoid accidental N+1 behavior by requiring the repository query to load what the use case actually needs.

## 25. Repository Binding

Contract-to-implementation binding belongs in:

```text
app/Providers/RepositoryServiceProvider.php
```

or an equivalently explicit Laravel provider if framework bootstrap conventions require registration elsewhere.

Conceptual binding:

```text
NscmfRepository
→ EloquentNscmfRepository
```

Services depend on contracts, never concrete Eloquent repository classes.

---

# PART F — DOMAIN LAYER

## 26. `app/Domain/`

Domain is intentionally lightweight.

Recommended structure:

```text
app/Domain/
├── Nscmf/
│   ├── Enums/
│   ├── Rules/
│   └── Exceptions/
├── Attachment/
│   ├── Enums/
│   └── Exceptions/
├── Export/
│   ├── Enums/
│   └── Exceptions/
├── Verification/
│   ├── Enums/
│   └── Exceptions/
└── Security/
    ├── Rules/
    └── Exceptions/
```

Do not create folders merely to mirror a DDD textbook.

## 27. Domain Enums

Closed machine-value sets SHOULD use PHP Enum rather than freehand strings where practical.

Examples include authoritative values such as:

```text
BusinessStatus
NscmfFamily
ActivationSubtype
ChangeSubtype
NumberingMode
UploadStatus
AttachmentSecurityStatus
ExportFormat
ExportStatus
VerificationOutcome
```

Enums MUST mirror upstream authoritative values exactly and MUST NOT invent additional business states.

## 28. Domain Rules

Reusable rule objects belong in Domain only when they centralize genuine reusable business/domain logic.

Examples MAY include:

- transition eligibility rules;
- Request No invariants;
- Change Result completion rules;
- attachment finalization invariants;
- protected Superadmin invariant checks.

A trivial single comparison does not automatically deserve a class.

## 29. Domain Exceptions

Domain-specific exceptions MAY represent stable failure categories consumed by Service/HTTP mapping.

They MUST NOT contain sensitive internal details, raw SQL, storage paths, or secrets.

## 30. What Domain Does Not Contain

Current MVP does not require:

```text
Entities mirroring every Eloquent model
AggregateRoot base class
Event sourcing
generic Specification pattern
Mapper layer
DTOs
repository implementations
HTTP Requests
Vue types
```

---

# PART G — ELOQUENT MODELS

## 31. `app/Models/`

Models SHOULD be grouped by persistence concern while remaining normal Laravel Eloquent models.

Recommended shape:

```text
app/Models/
├── User.php
├── Team.php
├── Nscmf/
│   ├── NscmfRecord.php
│   ├── Activation/
│   ├── Change/
│   └── NscmfWorkflowIteration.php
├── Attachment/
│   ├── NscmfAttachment.php
│   ├── AttachmentUploadSession.php
│   └── AttachmentUploadChunk.php
├── Audit/
│   ├── BusinessAuditEvent.php
│   ├── BusinessAuditChange.php
│   ├── AccessAuditEvent.php
│   └── SecurityAuditEvent.php
└── Export/
    ├── TemplateVersion.php
    ├── ExportBatch.php
    ├── ExportRequest.php
    ├── ExportSnapshot.php
    ├── ExportArtifact.php
    ├── SigningCertificate.php
    └── PdfIssuance.php
```

Typed Activation/Change model files MUST mirror actual tables defined by `11`; `13` does not invent alternative table schema.

Spatie package-owned Role/Permission models remain package-driven unless customization is explicitly required; do not build a second RBAC model hierarchy.

## 32. Model Responsibilities

Model MAY contain:

- relationships;
- casts;
- persistence-oriented local scopes used by repositories;
- safe accessors/mutators;
- table/key configuration;
- guarded/fillable configuration.

Model MUST NOT contain:

- workflow orchestration;
- multi-repository transactions;
- ClamAV calls;
- queue dispatch for business flow;
- PDF rendering/signing;
- controller-like request handling;
- authorization bypass logic.

---

# PART H — POLICY / AUTHORIZATION PLACEMENT

## 33. `app/Policies/`

Laravel Policies remain the resource/action authorization boundary combined with Spatie permission checks and Service/domain state validation.

Recommended grouping:

```text
app/Policies/
├── NscmfPolicy.php
├── AttachmentPolicy.php
├── ExportPolicy.php
├── UserPolicy.php
├── TeamPolicy.php
└── RolePolicy.php
```

Exact number should follow real resource boundaries rather than one Policy per route.

## 34. Authorization Boundary

Runtime authorization remains:

```text
valid session
+ Spatie/Laravel permission
+ Policy/resource authorization
+ ownership where explicitly required
+ state/archive/validation/security/concurrency
```

Repository MUST NOT become an authorization engine.

Team MUST NOT be added to Policy as Review/Approval scope.

Spatie `teams` remains disabled.

Service MUST re-evaluate domain-critical prerequisites at the authoritative mutation point; frontend action visibility and Form Request authorization are not final security truth.

---

# PART I — INFRASTRUCTURE LAYER

## 35. `app/Infrastructure/`

Infrastructure contains technology-specific adapters for non-database runtime capabilities.

Recommended structure:

```text
app/Infrastructure/
├── Storage/
│   ├── Contracts/
│   └── Flysystem/
├── Malware/
│   ├── Contracts/
│   └── ClamAv/
├── Export/
│   ├── Mapping/
│   ├── OOXML/
│   ├── Validation/
│   └── Rendering/
├── Signing/
│   ├── Contracts/
│   └── Adapters/
└── Verification/
    ├── Contracts/
    └── Adapters/
```

Folder names MAY be simplified if there is only one implementation, but contract/adaptor ownership must remain clear where swappable/external runtime behavior matters.

## 36. Storage Boundary

Private storage capability SHOULD be represented by a focused contract when Service-level behavior needs storage semantics beyond raw framework calls.

Production object/disk names, credentials, endpoints, and paths belong to `14_Environment_Specification.md`.

No storage object key grants authorization.

## 37. Malware Boundary

Canonical dependency concept:

```text
Service
→ MalwareScanner contract
→ ClamAvScanner adapter
→ clamd
```

ClamAV adapter only translates scanner/runtime behavior; it does not decide NSCMF workflow.

Only the Service/domain security flow may interpret explicit whole-file `CLEAN` as eligibility to promote a final attachment.

## 38. Export Infrastructure

Recommended placement:

```text
app/Infrastructure/Export/
├── Mapping/
│   └── NscmfFormV3/
├── OOXML/
│   ├── WorkbookPatcher.php
│   └── ...focused helpers
├── Validation/
│   └── WorkbookIntegrityValidator.php
└── Rendering/
    ├── Contracts/
    └── Adapters/
```

Rules:

- official workbook remains exact export presentation authority;
- targeted OOXML patching remains mandatory;
- mapping implementation/version may live in version-controlled code;
- no generic workbook rewrite fallback;
- no HTML-as-authoritative-template fallback.

Exact production template binary provisioning/location is **not invented here**; it follows `11` template registry semantics and will be operationalized in `14_Environment_Specification.md`.

Non-production golden/test fixtures MAY live under `tests/Fixtures/Export/` and MUST NOT be confused with production signing material or production runtime template provisioning.

## 39. Signing Boundary

```text
Service
→ PdfSigner contract
→ concrete signing adapter
```

Private signing key/certificate operational paths, container/provider, passphrase mechanism, and rotation configuration remain `14`/downstream concern.

Private key MUST NOT live in source, test fixture, ordinary DB, browser bundle, or `project_doc`.

## 40. Verification Boundary

Public verification Service coordinates:

```text
private temp upload
→ MalwareScanner
→ PdfVerifier/issuer validation adapter
→ Export/Issuance Repository lookup
→ currentness resolution
→ minimum-disclosure result
```

Verification adapter does not query private application records directly outside repository/service boundary.

---

# PART J — RESUMABLE ATTACHMENT PLACEMENT

## 41. Attachment HTTP

Recommended placement:

```text
app/Http/Controllers/Nscmf/Attachment/
├── InitiateAttachmentUploadController.php
├── InspectAttachmentUploadController.php
├── UploadAttachmentChunkController.php
├── CompleteAttachmentUploadController.php
├── CancelAttachmentUploadController.php
├── ShowAttachmentController.php
├── RemoveAttachmentController.php
└── DownloadAttachmentController.php
```

Exact consolidation MAY be adjusted if thin controller cohesion remains obvious, but route semantics from `12` MUST remain unchanged.

## 42. Attachment Services

```text
AttachmentUploadService
→ initiate/resume
→ inspect/reconcile server progress
→ accept idempotent chunk
→ cancel unfinished upload

AttachmentFinalizationService
→ verify complete chunk set
→ assemble privately
→ server-authoritative SHA-256
→ final type/integrity checks
→ full-file ClamAV
→ explicit CLEAN promotion

AttachmentService
→ final attachment read/remove/download orchestration
```

No Service method may treat upload `COMPLETED` as equivalent to attachment security `CLEAN`.

## 43. Attachment Repositories

```text
AttachmentUploadRepository
→ upload session + accepted chunk metadata

AttachmentRepository
→ final attachment metadata/security/removal lifecycle
```

Temporary/final binary I/O belongs Storage infrastructure, not Repository.

## 44. Attachment Job

If asynchronous finalization is used as specified by current API behavior, canonical job placement:

```text
app/Jobs/Attachment/FinalizeAttachmentUploadJob.php
```

Job MUST delegate to `AttachmentFinalizationService`.

Job MUST NOT:

- query Eloquent/DB directly;
- call repository directly as a replacement for Service;
- implement assembly/security business decisions itself.

---

# PART K — EXPORT / SIGNING / VERIFICATION PLACEMENT

## 45. Export HTTP

```text
app/Http/Controllers/Nscmf/Export/
├── RequestExportController.php
├── ShowExportStatusController.php
├── DownloadExportController.php
├── RequestBulkExportController.php
└── ShowExportBatchController.php
```

## 46. Export Service

`NscmfExportService` owns orchestration such as:

- authorize request context;
- create/bind immutable snapshot through Repository;
- dispatch generation after commit;
- expose authorized status/download lifecycle;
- enforce READY/EXPIRED/FAILED semantics;
- ensure Approved PDF never becomes READY without required signing.

Worker-side generation MAY be implemented as focused methods or internal collaborators under the Export Service/Infrastructure boundary, but MUST NOT create a second competing orchestration layer called `Actions`.

## 47. Export Repository

`ExportRepository` owns relational persistence/query for the export aggregate, including as applicable:

- batches;
- requests;
- immutable snapshots;
- artifacts;
- template-version metadata;
- signing-certificate public metadata;
- PDF issuance metadata.

The repository does not perform OOXML patching, rendering, or cryptographic signing.

## 48. Export Job

Canonical placement:

```text
app/Jobs/Export/GenerateNscmfExportJob.php
```

Job delegates to `NscmfExportService` or a clearly subordinate export-generation Service collaborator whose only purpose is the same Service layer.

Job MUST NOT become a hidden orchestration/persistence layer.

## 49. Public PDF Verification

```text
app/Http/Controllers/Public/PdfVerificationController.php
app/Http/Requests/Public/VerifyPdfRequest.php
app/Services/Export/PdfVerificationService.php
```

Public controller remains no-login but rate-limited/security-controlled according to `10`/`12`.

---

# PART L — AUDIT PLACEMENT

## 50. Repository Separation

Authoritative audit concerns remain physically/logically separate:

```text
BusinessAuditRepository
AccessAuditRepository
SecurityAuditRepository
```

Technical application logs are not represented by these repositories.

## 51. Business Audit

Business mutation Service writes required Business Audit inside the same business transaction where upstream rules require atomic evidence.

Do not introduce an asynchronous business-audit queue that can report business success before required audit persistence.

## 52. Access Audit

Read/download controllers invoke the appropriate Service, and Service coordinates access-audit persistence where configured.

Access Audit does not enter Business Timeline.

## 53. Security Audit

Authentication/credential/RBAC/session/malware/signing-security flows coordinate Security Audit through their Service boundary.

Passwords, raw credentials, private signing material, and raw sensitive payloads never enter audit repository methods.

## 54. Audit Read

Privileged audit list/read may use `AuditQueryService` backed by the corresponding repositories.

No audit update/delete/purge-by-age Service exists.

---

# PART M — ADMINISTRATION / SPATIE PLACEMENT

## 55. Administration Controllers

Recommended grouping:

```text
app/Http/Controllers/Administration/
├── Users/
├── Roles/
├── Teams/
└── Audits/
```

Use cohesive resource-style controllers for ordinary list/create/update and single-purpose controllers for security-sensitive explicit actions where that improves clarity, e.g. reset password, replace roles, replace role permissions, enable/disable.

## 56. Administration Services

```text
UserAdministrationService
RolePermissionAdministrationService
TeamAdministrationService
```

Role/permission mutation flow remains:

```text
current-password re-auth
→ protected invariant
→ Spatie mutation through repository/application boundary
→ determine affected users
→ revoke affected sessions when required
→ Security Audit
```

## 57. RolePermissionRepository

`RolePermissionRepository` wraps **administrative persistence/mutation/query integration with Spatie package primitives**.

It MUST NOT replace runtime authorization.

Runtime application authorization continues through:

```text
Gate / Policy / can()
→ Spatie Permission
```

No `RolePermissionRepository::userCan()` authorization engine is created.

## 58. Team Repository

Team repository handles organizational Team data only.

It MUST NOT perform Review/Approval scoping or permission expansion.

---

# PART N — JOBS / CONSOLE / SCHEDULER

## 59. `app/Jobs/`

Current expected business jobs remain intentionally coarse-grained:

```text
app/Jobs/
├── Attachment/
│   └── FinalizeAttachmentUploadJob.php
└── Export/
    └── GenerateNscmfExportJob.php
```

Do not create a queue job for every tiny export pipeline step solely for pattern purity.

The service/infrastructure collaborators remain separately testable even when one queue job orchestrates a cohesive background use case through Service.

## 60. Job Rule

```text
Job
→ Service
```

NOT:

```text
Job
→ Model
Job
→ DB
Job
→ Repository directly
```

Job may carry safe identifiers required to resume the use case; Service reloads authoritative state through Repository.

## 61. Scheduler / Console Placement

Laravel scheduler registration follows Laravel 13 framework convention in `routes/console.php` and/or framework bootstrap-supported scheduling location.

Scheduler-triggered application cleanup SHOULD enter through dedicated Service methods/Services rather than raw model deletion logic in route closures.

Current scheduler responsibilities include:

- unfinished upload cleanup after 24h inactivity;
- abandoned temporary assembly cleanup;
- generated export binary cleanup after 168h;
- runtime housekeeping where allowed.

Scheduler MUST NOT age-delete authoritative Business/Access/Security Audit and MUST NOT advance business workflow automatically.

---

# PART O — ROUTES

## 62. Canonical Route Files

```text
routes/
├── web.php
├── auth.php
├── nscmf.php
├── administration.php
├── public.php
└── console.php
```

Do not use `api.php` as a separate Bearer/JWT API boundary for current internal application.

Dedicated JSON routes remain same-origin `web` session routes even when responses are JSON.

## 63. `routes/web.php`

`web.php` is the authenticated application entry/registration point for general routes and/or inclusion of domain route files according to Laravel bootstrap conventions.

It MAY contain minimal cross-domain page routes such as Dashboard when doing so is clearer.

It MUST NOT become a several-hundred-line route dump.

## 64. `routes/auth.php`

Contains current authentication/account routes such as:

```text
POST /login
POST /logout
POST /account/temporary-password/change
POST /account/re-authenticate
```

Exact middleware follows `10`/`12`.

## 65. `routes/nscmf.php`

Contains NSCMF operational routes:

```text
create / record page / edit / draft
workflow lifecycle
review
approval
history
timeline
resumable attachment
attachment access
single/bulk export
```

Keeping these in one domain route file is preferred over premature one-file-per-subfeature fragmentation.

## 66. `routes/administration.php`

Contains:

```text
users
roles
permissions
Teams
privileged Access Audit
privileged Security Audit
```

No Unit/Division/scope/direct-user-permission administration route may appear.

## 67. `routes/public.php`

Contains narrow public routes, currently:

```text
GET  /ispdfvalid
POST /ispdfvalid/verify
```

Public route file MUST NOT become a public NSCMF API.

## 68. Route Contract Authority

`12_API_Contract.md` remains authoritative for route URI/method semantics.

`13` only determines source-file placement; route files MUST NOT silently rename/change the API contract.

---

# PART P — FRONTEND / INERTIA

## 69. Canonical Frontend Structure

```text
resources/js/
├── Pages/
│   ├── Auth/
│   ├── Dashboard/
│   ├── Nscmf/
│   ├── Review/
│   ├── Approval/
│   ├── History/
│   ├── Administration/
│   └── Public/
│
├── features/
│   ├── nscmf/
│   │   ├── activation/
│   │   ├── change/
│   │   ├── workflow/
│   │   └── timeline/
│   ├── attachments/
│   ├── exports/
│   └── administration/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── composables/
├── layouts/
├── lib/
├── types/
└── app.ts
```

Exact filename capitalization SHOULD follow the chosen Vue/Vite convention consistently across the repository.

## 70. `Pages/`

`Pages/` contains Inertia route entry components.

Page components SHOULD primarily:

- compose feature components;
- consume server props;
- own page-level layout/loading/navigation;
- call route-specific frontend actions/composables.

They SHOULD NOT accumulate large reusable form sections or business-rule duplication.

## 71. `features/`

Feature folders own reusable domain-specific frontend UI/behavior.

Examples:

```text
features/nscmf/activation/
→ Activation form sections

features/nscmf/change/
→ Change form sections + Result UI

features/attachments/
→ resumable uploader + progress reconciliation

features/exports/
→ export request/status/download UI
```

Frontend feature logic remains presentation/client-interaction logic, never authoritative authorization/workflow/security truth.

## 72. `components/ui/`

Reserved for shadcn-vue/generated/base UI primitives and close wrappers.

NSCMF-specific business components MUST NOT be dumped into `components/ui/`.

## 73. `components/shared/`

Contains genuinely cross-feature application components such as shared status presentation, common page headers, pagination, empty state, confirmation shells, or reusable audit display primitives.

A component used by only one feature SHOULD remain in that feature rather than being promoted prematurely to `shared`.

## 74. `composables/`

Contains reusable Vue behavior that crosses or supports features, for example safe polling/retry/browser-interaction utilities.

Feature-only composables MAY remain inside the feature folder.

## 75. `types/`

Frontend TypeScript types are required where they improve correctness.

They are **not** the rejected PHP DTO layer.

Rules:

- avoid `any` as default;
- model canonical enum/value unions where useful;
- types mirror server contracts and must not invent client business states;
- types do not authorize actions.

## 76. Attachment Frontend Placement

Recommended example:

```text
resources/js/features/attachments/
├── components/
│   ├── AttachmentUploader.vue
│   ├── AttachmentProgress.vue
│   └── AttachmentList.vue
├── composables/
│   └── useResumableAttachmentUpload.ts
└── types.ts
```

Client progress is reconciled from server accepted/missing chunk state.

No browser state is authoritative for accepted chunks/security CLEAN state.

## 77. NSCMF Form Placement

Activation/Change UI SHOULD be decomposed by meaningful business section rather than one massive `.vue` file.

Do not create one Vue component per trivial input merely to maximize file count.

Reusable repeated-row components are appropriate for typed repeatable form sections.

---

# PART Q — DATABASE / MIGRATIONS / SEEDERS

## 78. `database/migrations/`

Migrations materialize `11_ERD_Database_Schema.md` and package-owned migrations.

Rules:

- migrations define schema, not business orchestration;
- no hidden workflow DB trigger engine;
- Spatie package migration remains package-compatible;
- no duplicate RBAC schema;
- no Unit/Division/scope tables;
- resumable upload tables required by `11A` must be represented when schema is implemented.

Migration grouping/naming follows Laravel chronological migration convention.

## 79. `database/seeders/`

Seed implementation exists downstream of `17_Seed_Dummy_Data_Specification.md`.

Before `17` locks exact seed data, implementation MUST NOT invent company Team master data or official operational users.

Protected Superadmin/permission baseline must follow the eventual seed specification plus already-locked protected invariants.

## 80. `database/factories/`

Factories are test/development data builders, not production seed authority.

They MUST generate state-valid combinations or intentionally invalid fixtures only when a test explicitly requires them.

---

# PART R — CONFIG / SUPPORT

## 81. `config/`

Configuration files may define non-secret application configuration and integration settings consumed from environment.

Examples MAY include application-owned configuration for:

```text
nscmf.php
attachments.php
exports.php
security.php
```

but config files MUST NOT become a second business-rules database.

Values already fixed by authoritative product/security docs MAY be centralized as config/constants when operationally useful, but changing config cannot be treated as permission to override locked business rules without specification change.

Secrets remain environment/protected runtime concern.

## 82. `app/Support/`

`Support/` is for truly generic application helpers that do not belong to a domain or infrastructure adapter.

MUST NOT become a dumping ground named `Helpers` for business logic.

Potential examples include:

- safe correlation ID utility;
- canonical serialization helper used for immutable hashing;
- narrowly reusable pagination normalization if not owned by HTTP layer.

Business-specific code belongs to Domain/Service/Repository/Infrastructure instead.

---

# PART S — TEST STRUCTURE

## 83. Test Root

Detailed coverage/acceptance belongs to `16_Testing_Specification.md`, but physical placement is established here.

Recommended backend structure:

```text
tests/
├── Feature/
│   ├── Auth/
│   ├── Nscmf/
│   ├── Workflow/
│   ├── Attachment/
│   ├── Export/
│   ├── Administration/
│   └── PublicVerification/
│
├── Unit/
│   ├── Domain/
│   └── Services/
│
├── Integration/
│   ├── Repositories/
│   ├── Database/
│   ├── Malware/
│   ├── Export/
│   └── Signing/
│
├── Architecture/
├── Fixtures/
│   └── Export/
└── Browser/
```

Exact Pest bootstrap organization follows `16`.

## 84. Repository Tests

Repository integration tests SHOULD exercise real MySQL 8.4 behavior where query/locking/schema semantics matter.

SQLite MUST NOT be the sole integration target.

Test:

- query filters;
- eager loading / N+1-sensitive paths;
- optimistic version update behavior;
- workflow row locking behavior where practical;
- chunk uniqueness/idempotency persistence;
- immutable snapshot persistence;
- audit append behavior.

## 85. Service Tests

Service tests focus on use-case orchestration/business behavior.

Tests may use repository/infrastructure fakes/mocks selectively when isolation provides value, but critical transaction/concurrency behavior requires integration/feature tests against actual database semantics.

Do not mock so deeply that tests merely verify method calls while missing business behavior.

## 86. Architecture Tests

`tests/Architecture/` SHOULD enforce important structural boundaries where Pest architecture tests/static analysis can do so reliably.

Candidate assertions:

```text
Controllers do not depend on Eloquent Models / DB facade for business access
Controllers do not depend on repository implementations
Services do not depend on Eloquent repository implementations
Services do not depend on Http namespace
Repositories/Eloquent may depend on Models
Jobs depend on Services, not Models/Repositories
Domain does not depend on Http/Infrastructure/Eloquent implementation
```

Exact enforceable rule set is finalized in `15_Coding_Rules_AGENTS.md` and `16_Testing_Specification.md`.

## 87. Frontend Tests

Frontend unit/component tests SHOULD colocate near feature when practical or follow a consistent test mirror strategy selected in `16`.

Playwright critical journeys live under the Browser/E2E location established by project test tooling.

Do not create two competing E2E directory conventions.

---

# PART T — READ / WRITE FLOW EXAMPLES

## 88. Draft Save

```text
PATCH /nscmf/{record}/draft
→ SaveNscmfDraftRequest
→ thin Controller
→ NscmfDraftService
→ transaction
→ NscmfRepository
→ BusinessAuditRepository
→ record_version++
→ response latest version
```

No Controller/Service direct Eloquent query.

## 89. Workflow Approval

```text
POST /nscmf/{record}/approval/approve
→ ApproveNscmfRequest
→ ApproveNscmfController
→ NscmfWorkflowService::approve(...)
→ DB transaction
→ NscmfRepository::findForWorkflowUpdate(...)
→ Gate/Policy + current-state/domain validation
→ WorkflowRepository persistence
→ NscmfRepository status/version persistence
→ BusinessAuditRepository append
→ commit
→ redirect canonical latest record
```

## 90. Review Queue Read

```text
GET /review
→ Review page Controller
→ NscmfQueryService
→ NscmfRepository::paginateReviewCandidates(...)
→ selected/eager-loaded Eloquent paginator
→ Controller maps safe Inertia props
→ Review Page
```

Team may be a display/filter criterion but is not authorization scope.

## 91. Resumable Chunk

```text
PUT chunk
→ UploadAttachmentChunkRequest
→ UploadAttachmentChunkController
→ AttachmentUploadService
→ parent record Policy/state check
→ private Storage contract writes bytes
→ server chunk SHA-256
→ AttachmentUploadRepository persists accepted chunk
→ safe accepted/missing response
```

A newly accepted chunk updates the 24h inactivity anchor; identical replay does not extend it indefinitely.

## 92. Attachment Finalization

```text
Complete request
→ AttachmentUploadService validates completion request
→ dispatch FinalizeAttachmentUploadJob
→ Job calls AttachmentFinalizationService
→ AttachmentUploadRepository reads authoritative chunk set
→ Storage assembles privately
→ server final SHA-256
→ final type/integrity validation
→ MalwareScanner full-file scan
→ explicit CLEAN
→ AttachmentRepository persists/promotes final attachment state
→ cleanup temporary objects as appropriate
```

No workflow row lock is held through assembly/scan.

## 93. Export Request

```text
POST export
→ RequestNscmfExportRequest
→ Controller
→ NscmfExportService
→ authorize
→ short transaction
→ ExportRepository creates request + immutable snapshot binding
→ commit
→ dispatch GenerateNscmfExportJob after commit
→ 202/redirect according to API contract
```

## 94. Export Worker

```text
GenerateNscmfExportJob
→ NscmfExportService generation entry
→ ExportRepository reads bound immutable snapshot/template metadata
→ OOXML Mapping/Patcher
→ Workbook Integrity Validator
→ Spreadsheet Renderer
→ if Approved PDF: PdfSigner
→ final hash
→ ExportRepository persists artifact/issuance metadata
→ private READY artifact
```

Worker never rebuilds business content from later live record state.

## 95. Public PDF Verify

```text
POST /ispdfvalid/verify
→ VerifyPdfRequest
→ PdfVerificationController
→ PdfVerificationService
→ private temp Storage
→ MalwareScanner CLEAN
→ PdfVerifier
→ ExportRepository issuance/hash lookup
→ currentness resolution
→ minimum-disclosure response
→ temp cleanup
```

---

# PART U — FILE OWNERSHIP MATRIX

## 96. Responsibility Summary

| Concern | Canonical location |
|---|---|
| HTTP routing | `routes/*.php` |
| HTTP input validation | `app/Http/Requests` |
| HTTP response/page adapter | `app/Http/Controllers` + optional `Http/Resources` |
| Use-case orchestration | `app/Services` |
| Business enums/reusable rules | `app/Domain` |
| Persistence contract | `app/Repositories/Contracts` |
| Eloquent persistence/query | `app/Repositories/Eloquent` |
| Persistence relationships/casts | `app/Models` |
| Resource authorization | `app/Policies` + Spatie/Gates |
| Storage/ClamAV/renderer/signer/verifier implementation | `app/Infrastructure` |
| Background trigger wrapper | `app/Jobs` |
| DI bindings | `app/Providers` |
| Inertia route pages | `resources/js/Pages` |
| Feature-specific Vue | `resources/js/features` |
| shadcn/base UI | `resources/js/components/ui` |
| cross-feature UI | `resources/js/components/shared` |
| frontend reusable behavior | `resources/js/composables` or feature-local composable |
| TypeScript contracts | `resources/js/types` / feature-local `types.ts` |
| Schema evolution | `database/migrations` |
| test/dev data builders | `database/factories` |
| production/development seed implementation | `database/seeders` governed by `17` |
| test fixtures | `tests/Fixtures` |
| project specifications | `project_doc` |

---

# PART V — FORBIDDEN STRUCTURAL COUPLING

## 97. Developer / AI MUST NOT

Implementation MUST NOT:

1. create a parallel `Actions/` orchestration layer beside Services;
2. add a DTO layer/DTO framework current MVP;
3. create DTO-per-model/request/read row by habit;
4. create generic `BaseRepository`/`GenericRepository<T>`;
5. create repository one-per-table mechanically;
6. create one Service per route mechanically;
7. create a God Service covering unrelated domains;
8. query Eloquent/DB from Controller for application/business data;
9. query Eloquent/DB from Service for application/business data;
10. let Controller call Repository directly;
11. let Service depend on concrete Eloquent repository implementation;
12. let Job query Model/DB/Repository directly instead of entering through Service;
13. put workflow/business orchestration in Eloquent Model;
14. put DB queries inside HTTP Resource/Transformer;
15. put Review/Approval authorization in Team repository/query scope;
16. enable Spatie Teams;
17. create Unit/Division/Reviewer Scope/Approval Scope folder/model/repository;
18. duplicate Spatie RBAC model/schema as custom application RBAC;
19. create runtime authorization engine in RolePermissionRepository;
20. move business-rule truth into frontend `types` or Vue components;
21. store business data in a generic live JSON form blob;
22. let Infrastructure adapter mutate NSCMF workflow by itself;
23. call ClamAV/renderer/signing directly from Controller;
24. expose private storage path/object key through UI/API;
25. place production signing key/certificate private material in repository;
26. put production credential secrets in config committed to source;
27. treat test fixture as production template/key source;
28. introduce `api.php` Bearer/JWT architecture for current internal app without approved change;
29. rename API routes merely to fit folder naming;
30. create a public NSCMF browsing API under `public.php`;
31. let `Support/`/`Helpers/` become a business-logic dumping ground;
32. create business DB triggers as a hidden workflow engine;
33. create new business states from folder/class naming;
34. introduce microservice/modules framework/Kubernetes boundaries through source structure without architecture change.

---

# PART W — STRUCTURAL ACCEPTANCE CRITERIA

## 98. Backend Architecture

- [ ] Controller → Service boundary is visible and consistent.
- [ ] No separate Actions orchestration layer.
- [ ] Service owns use-case orchestration/transaction boundaries.
- [ ] Repository contracts and Eloquent implementations are separated.
- [ ] Services depend on repository contracts only.
- [ ] Eloquent/Query Builder business access is contained in repository implementations.
- [ ] No generic BaseRepository.
- [ ] Repositories reflect meaningful domain boundaries, not every table.
- [ ] No PHP DTO architecture layer current MVP.
- [ ] Domain remains lightweight.
- [ ] Models do not contain workflow orchestration.

## 99. Authorization / Organization

- [ ] Policies/Gates/Spatie remain runtime authorization authority.
- [ ] RolePermissionRepository does not become permission decision engine.
- [ ] Team remains organizational data only.
- [ ] No Unit/Division/scope implementation structure.
- [ ] Spatie Teams remains disabled.

## 100. Async / Infrastructure

- [ ] Jobs delegate to Services.
- [ ] Jobs do not query Model/Repository directly.
- [ ] Storage, ClamAV, renderer, signing, verification use focused infrastructure boundaries.
- [ ] long-running work does not live inside workflow transaction.
- [ ] attachment upload/finalization separation remains visible.
- [ ] export immutable-snapshot generation remains visible.

## 101. Frontend

- [ ] Inertia Pages are route entry points.
- [ ] business-specific reusable UI lives in features.
- [ ] shadcn/base primitives stay in `components/ui`.
- [ ] shared folder contains only genuinely cross-feature components.
- [ ] TypeScript avoids uncontrolled `any` and does not invent server state.
- [ ] frontend does not become authorization/security truth.

## 102. Routes

- [ ] route files split into web/auth/nscmf/administration/public/console concerns.
- [ ] route URI/method contract remains identical to `12`.
- [ ] internal JSON endpoints remain session/web/CSRF protected.
- [ ] public routes remain narrow.

## 103. Testing / Maintainability

- [ ] test structure separates Feature/Unit/Integration/Architecture/Fixtures/Browser concerns.
- [ ] repository integration can test MySQL-specific behavior.
- [ ] architecture boundaries can be automatically checked where practical.
- [ ] source layout remains understandable without a proprietary Modules framework.
- [ ] no premature abstraction is required merely to satisfy folder symmetry.

---

# PART X — AUTHORITY / DOWNSTREAM HANDOFF

## 104. Authority Matrix

| Concern | Authority |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| Permission/RBAC/Team | `04_RBAC_Permission_Matrix.md` |
| State/workflow iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology / Repository–Service technology boundary | `08_Tech_Stack_Specification.md` |
| Logical architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Relational schema | `11_ERD_Database_Schema.md` + `11A` synchronization |
| HTTP contract | `12_API_Contract.md` |
| Repository–Service cross-document synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |
| **Source-code physical structure / placement** | **`13_Project_Structure.md`** |

If a class placement seems to require changing an upstream business/API/schema/security decision, implementation MUST stop and update the authoritative upstream specification first rather than using folder structure as justification.

## 105. Intentionally Deferred to `14_Environment_Specification.md`

This document does not invent exact:

- application/database timezone;
- `.env` names/values;
- DB host/user/password;
- queue/cache/session runtime values;
- S3-compatible provider/bucket/endpoint/object prefix;
- private storage disk names;
- ClamAV socket/host/port;
- renderer executable/container path;
- production template binary path/provisioning mechanism beyond current private-registry semantics;
- signing private-key/certificate runtime path/container/provider/passphrase mechanism;
- public certificate runtime location;
- scheduler process/supervisor/runtime command topology;
- logging channel/retention;
- production secret provisioning.

Those belong to the next fixed-order document.

## 106. Intentionally Deferred to Later Documents

- exact coding style/complexity/AI-agent enforcement details → `15_Coding_Rules_AGENTS.md`;
- exact test matrix/coverage/golden/concurrency test mechanics → `16_Testing_Specification.md`;
- exact seed and dummy master/sample data → `17_Seed_Dummy_Data_Specification.md`;
- completion gate → `18_Definition_of_Done.md`;
- implementation sequencing/tasks → `19_Task_Implementation_Plan.md`;
- physical production topology → `20_Deployment_Architecture.md`.

Current open business/operational TBDs such as official numbering SOP, exact Team master data, temporary credential delivery mechanism, re-auth proof lifetime, public validator maximum upload size, bulk export packaging, exact numeric rate limits, signing provider/rotation mechanics, notification implementation, performance/SLA, and backup/DR remain unresolved unless an authoritative upstream/later document locks them.

---

## 107. Next Document

Next document in the fixed project sequence:

**`14_Environment_Specification.md`**

It MUST translate this source structure and the existing architecture into explicit runtime/environment configuration without embedding secrets in source and without changing the Repository–Service, security, storage, queue, ClamAV, renderer, signing, or session boundaries established above.
