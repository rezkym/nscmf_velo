# Tech Stack Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-TECH-008  
> **Document Order:** 08 / 20  
> **Status:** Draft — Confirmed Technology + Repository–Service Architecture Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `10_Security_Rules.md`  
> **Synchronized With:** `09_System_Architecture.md`, `11A_Resumable_Attachment_Upload_Synchronization.md`, `12_API_Contract.md`, `12A_Repository_Service_Architecture_Synchronization.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Target Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk technology selection, technology boundaries, dan mandatory implementation architecture style** NSCMF Digital Form & Workflow System.

Dokumen mengunci runtime, backend/frontend stack, Inertia integration, UI stack, authentication, authorization package boundary, database, queue/cache/session, storage, ClamAV, exact XLSX/PDF export direction, audit approach, testing, quality gates, Docker compatibility, dependency policy, dan **Repository–Service Architecture** yang digunakan backend.

Repository–Service Architecture pada proyek ini bersifat **pragmatic, Laravel-native, dan maintainability-oriented**. Tujuannya bukan meniru textbook Clean Architecture secara berlebihan, melainkan memastikan business logic, transaction boundary, persistence access, dan infrastructure integration mempunyai ownership yang jelas sehingga kode tetap rapi, mudah dirawat manusia, minim silent bug, dan tidak menjadi AI-generated abstraction noise.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default.
- **MAY** — allowed.
- **QUALIFIED** — production eligible only after required qualification.
- **AUTHORITATIVE** — source of truth untuk concern tersebut.
- **TBD** — unresolved and must not be guessed.

---

# PART A — DESIGN CONSTRAINTS

## 3. Technology Must Serve Business Rules

Stack MUST support:

1. internal standalone web app;
2. username/password login;
3. no self-registration;
4. protected Superadmin;
5. multi-role granular RBAC;
6. permission-centric authorization;
7. Requester ownership checks only where explicit business rules require ownership;
8. Team organizational data with **no authorization effect**;
9. shared non-exclusive Reviewer/Approver pools;
10. exact state machine and workflow iteration semantics;
11. Draft autosave/manual save + optimistic conflicts;
12. Business/Access/Security Audit separation;
13. private optional attachments + resumable upload + ClamAV CLEAN gate;
14. History/search;
15. exact-template XLSX/PDF;
16. async immutable-snapshot export;
17. System/Organization signed Approved PDF;
18. public PDF verification;
19. ~10 expected users / 50-user engineering baseline;
20. Docker compatibility;
21. no WebSocket/Redis/search-engine requirement for MVP;
22. testing/export/security regression from bootstrap;
23. clean Repository–Service separation without unnecessary DTO/domain-mapper ceremony.

## 4. Architecture Style — Confirmed

```text
Laravel 13 Modular Monolith
+ Repository–Service Architecture
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
```

Canonical backend dependency direction:

```text
HTTP / Inertia
Controllers + Form Requests
        ↓
Service Layer
        ↓
Repository Contracts + Domain Rules + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Infrastructure Adapters
        ↓
Eloquent Models / Query Builder / Flysystem / ClamAV / Renderer / Signer
        ↓
MySQL / Private Storage / External Runtime Components
```

No separate frontend/backend repositories, standalone REST-SPA architecture, microservice split, or full enterprise Clean Architecture without approved change.

---

# PART B — FINAL TECHNOLOGY SUMMARY

## 5. Confirmed Stack

| Layer | Technology / Rule |
|---|---|
| Backend | Laravel 13.x |
| Runtime | PHP 8.5.x |
| PHP packages | Composer 2.x |
| Backend architecture | **Pragmatic Repository–Service Architecture** |
| Service layer | mandatory use-case/business orchestration layer |
| Repository layer | Contract + Eloquent implementation; meaningful domain/aggregate boundary |
| DTO layer | **none for MVP**; no mandatory DTO-per-request/model/read-projection layer |
| Frontend | Vue 3.x Composition API |
| Frontend language | TypeScript |
| Laravel ↔ Frontend | Inertia 3.x |
| UI | shadcn-vue |
| CSS | Tailwind CSS 4.x |
| Build | Vite |
| Node | Node.js 24 LTS |
| JS packages | npm + committed lockfile |
| Authentication | Laravel Fortify / Laravel session auth, username + password |
| Authorization | **Spatie Laravel Permission 8.x + Laravel Policies/Gates + domain state/ownership/invariant checks** |
| DB | MySQL 8.4 LTS / InnoDB |
| ORM | Eloquent + Query Builder **inside repository implementations for application persistence/querying** |
| Transactions | Laravel `DB::transaction()` owned by Service layer for business use cases |
| Queue | Laravel Database Queue |
| Session | database session driver |
| Cache | Laravel database cache baseline |
| Storage | Laravel Filesystem/Flysystem private local dev + private S3-compatible production target |
| Malware | ClamAV / clamd behind `MalwareScanner` contract |
| XLSX | original template + targeted OOXML patching |
| PDF | qualified spreadsheet renderer |
| PDF signing | server-side signer contract/service |
| Public verification | verifier service boundary |
| Audit | custom Business/Access/Security audit model |
| Search | MySQL/Eloquent indexes |
| Realtime | none MVP |
| Backend tests | Pest 4.x |
| Frontend tests | Vitest 4.x + Vue Test Utils |
| E2E | Playwright |
| PHP quality | Pint + PHPStan/Larastan |
| JS/TS quality | ESLint + Prettier + vue-tsc |
| CI | GitHub Actions |
| Runtime packaging | Docker-compatible |

---

# PART C — VERSION POLICY

## 6. Runtime Versions

### Laravel
Use Laravel 13.x; commit `composer.lock`; security/patch updates only after tests; no auto Laravel 14 upgrade.

### PHP
Use PHP 8.5.x; CI/production same minor line.

### Node
Use Node 24 LTS.

### MySQL
Use MySQL 8.4 LTS, not Innovation track without review.

### Frontend Packages
Pin via `package-lock.json`; upgrades require relevant tests.

---

# PART D — REPOSITORY–SERVICE ARCHITECTURE

## 7. Service Layer Is the Use-Case Authority

The previous conceptual `Application Actions` layer is **superseded**. The backend MUST NOT introduce both an `Actions` orchestration layer and a `Services` orchestration layer for the same use case.

Current rule:

```text
Controller
→ Service
→ Repository / Domain / Infrastructure contract
```

Service responsibilities include:

- use-case orchestration;
- business-flow coordination;
- transaction ownership;
- calling Policies/Gates/domain validators where appropriate;
- coordinating more than one repository;
- coordinating required Business/Security Audit writers;
- dispatching post-commit long-running work where applicable;
- preserving failure/atomicity semantics.

Representative cohesive services MAY include:

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

Exact physical names/folders are finalized in `13_Project_Structure.md`.

MUST NOT create one giant `NscmfService` containing unrelated responsibilities.

## 8. Controller Boundary

Controllers MUST remain thin.

Controller responsibilities:

```text
receive already-routed HTTP request
→ use Form Request validation/authorization boundary as defined
→ extract validated values
→ call exactly the appropriate Service/use-case method
→ transform result into Inertia/JSON/redirect/binary response
```

Controllers MUST NOT:

- issue Eloquent/Query Builder business queries;
- open business transactions;
- implement workflow decisions;
- mutate models directly;
- write audit rows directly;
- coordinate ClamAV/export/signing pipeline;
- become an alternative Service layer.

## 9. Form Requests — No DTO Layer

Laravel Form Requests remain the HTTP input validation boundary.

Current MVP deliberately does **not** introduce a DTO layer such as:

```text
*Dto
*Data
*Command object per endpoint
spatie/laravel-data
mandatory DTO-per-model
mandatory read DTO/projection class
```

Simple use cases SHOULD pass explicit typed scalar/enum parameters to Service methods.

Complex nested payloads such as Draft persistence MAY pass the dedicated Form Request's `validated()` structured array to the Service. In such cases:

- only validated data may cross the HTTP boundary;
- `$request->all()` is forbidden for business persistence;
- Service/Repository MUST map expected fields explicitly;
- validated array MUST NOT be mass-assigned blindly into domain models;
- PHPStan/Larastan array-shape annotations MAY be used where they materially improve static checking without creating a parallel DTO class hierarchy.

DTO is not forbidden forever, but adding a DTO framework/layer requires demonstrated need and specification change rather than architecture fashion.

## 10. Repository Contracts — Mandatory Persistence Boundary

Application persistence/query access MUST be expressed through repository contracts with concrete Eloquent implementations.

Conceptual pattern:

```text
Service
→ NscmfRepository contract
→ EloquentNscmfRepository implementation
→ Eloquent / Query Builder
→ MySQL
```

Repository contracts SHOULD be grouped by meaningful domain/aggregate/use-case boundaries, for example:

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

Exact list is finalized by `13_Project_Structure.md`.

Repository MUST NOT be created mechanically one-per-table when no meaningful boundary exists.

## 11. No Generic BaseRepository

The project MUST NOT introduce abstraction noise such as:

```text
BaseRepository
GenericRepository<T>
RepositoryInterface<T>
findAll/create/update/delete wrappers for every model
```

unless a future concrete need proves a reusable abstraction has real semantic value.

Repository methods SHOULD communicate domain persistence intent, for example:

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

Repository does not own business workflow authorization or state-transition decisions.

## 12. Repository Return Values

MVP does not introduce a parallel Domain Entity/DTO mapping layer.

Repository MAY return as appropriate:

- Eloquent Model;
- Eloquent Collection;
- Laravel paginator;
- scalar/value result;
- other native Laravel query result only when clearly bounded and statically understandable.

Avoid full-model graph loading when a selected/eager-loaded Eloquent query is sufficient.

No mandatory mapper such as:

```text
Eloquent Model → Domain Entity → DTO → View Model
```

for routine application flow.

## 13. Persistence Boundary Strictness

For application/domain persistence and business queries:

```text
Controller  → MUST NOT query Model/DB directly
Service     → MUST NOT issue Eloquent/Query Builder business queries directly
Job/Command → MUST NOT query Model/DB/Repository directly for business use case execution
Repository Implementation → MAY use Eloquent/Query Builder/locking/pagination
```

Service MAY call Laravel's transaction manager (`DB::transaction()` or an equivalent thin transaction mechanism) **only to own transaction boundaries**. That permission does not allow Service to execute business SQL/query-builder statements.

Framework/package internals, migrations, seeders, test fixtures, and Spatie's own authorization internals are not treated as violations of the application repository boundary.

## 14. Transaction Ownership

Service owns business transaction boundaries.

Conceptual workflow:

```text
NscmfWorkflowService
→ DB::transaction
   → repository lock/read
   → domain/state/permission validation
   → repository persistence
   → workflow repository persistence
   → required Business Audit persistence
→ commit
```

Repository MUST NOT independently commit/rollback a larger business use case that spans multiple repositories.

No custom Unit-of-Work abstraction is required for MVP; Laravel transaction primitives are sufficient.

Long external work MUST NOT run while workflow row locks are held.

## 15. Eloquent Model Role

Eloquent Models represent persistence state and relationships.

They MAY contain:

- relationships;
- casts;
- guarded/fillable configuration where safe;
- local query scopes that remain persistence-oriented and reusable inside repository implementations;
- simple derived accessors that do not become workflow authority.

They MUST NOT become hidden Service classes containing multi-step workflow orchestration, audit coordination, external I/O, or authorization bypass logic.

## 16. Repository Container Binding

Repository contracts MUST be resolved to concrete implementations through Laravel's service container.

A dedicated provider or equivalent explicit binding mechanism SHOULD be used.

Conceptual:

```text
NscmfRepository contract
→ EloquentNscmfRepository
```

Service depends on the contract, not the concrete Eloquent implementation.

---

# PART E — INFRASTRUCTURE CONTRACT / ADAPTER BOUNDARY

## 17. External/System Infrastructure Is Not a Repository

Repository terminology is reserved for persistence/query boundaries.

External/runtime capabilities use focused contracts/adapters such as:

```text
MalwareScanner → ClamAvScanner
PrivateStorage → Flysystem-backed implementation
SpreadsheetRenderer → qualified renderer implementation
PdfSigner → concrete server-side signing implementation
PdfVerifier → concrete verification implementation
```

Do not create misleading names such as:

```text
ClamAvRepository
StorageRepository
PdfSigningRepository
```

unless they actually represent data persistence repositories.

## 18. Queue Jobs and Commands

Queue Job/Scheduled Command responsibilities:

```text
receive safe technical identifier
→ call Service
→ let Service coordinate repositories/adapters
```

Jobs MUST NOT become hidden business services.

Preferred coarse-grained direction:

```text
FinalizeAttachmentUploadJob
→ AttachmentFinalizationService

GenerateNscmfExportJob
→ NscmfExportService
```

Do not split a simple MVP pipeline into dozens of queue jobs solely for architectural appearance.

Scheduler commands similarly call Services/cleanup services rather than embedding persistence/business logic.

---

# PART F — FRONTEND / INERTIA

## 19. Vue 3 + TypeScript

Vue handles presentation/local interaction only; not permission/state/malware/signature truth.

## 20. Inertia 3

```text
Browser
→ Laravel route/controller
→ server authorization/validation
→ Service
→ Repository/Adapter boundary
→ Inertia response
→ Vue
```

Dedicated JSON endpoints are allowed for autosave/upload/export status/public verifier while remaining in the same Laravel app/security model.

## 21. No Inertia SSR Requirement

SSR not required MVP; `/ispdfvalid` being public does not justify SSR by itself.

## 22. UI Stack

shadcn-vue + Tailwind 4 + Lucide. Business/security behavior never changes to fit component defaults.

---

# PART G — AUTHENTICATION / SESSION

## 23. Authentication Model

```text
username + password
```

No SSO/LDAP/OAuth/MFA current MVP. Session auth through Fortify/Laravel foundations.

## 24. Credential Rules

- password minimum exactly 6 characters;
- no composition requirement;
- no MFA;
- disabled account denied;
- password securely hashed;
- no self-service Forgot Password baseline;
- admin reset via temporary password + forced change;
- throttling/progressive delay.

## 25. Session Policy

```text
idle timeout = 30 minutes
absolute lifetime = 8 hours
maximum active sessions = 2
third valid login = succeeds and revokes oldest active authenticated session
```

Role/permission/access-changing security mutation revokes affected sessions according to `10_Security_Rules.md`. Team-only change does not.

`session.login` and `session.logout` MUST NOT be created as Spatie permission rows.

---

# PART H — SPATIE AUTHORIZATION — CRITICAL

## 26. Package Version / Compatibility

Use **Spatie Laravel Permission 8.x**.

## 27. Package-Owned Schema

Reuse package-owned:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

Do not create duplicate custom RBAC tables.

## 28. Permission Usage

Current design:

```text
Permissions → Roles → Users
```

Runtime authorization uses Laravel `can()`/Gate/Policy + Spatie resolution.

Repository–Service Architecture MUST NOT create a second authorization engine such as:

```text
RolePermissionRepository::userCan(...)
custom effective-permissions table
Team-based permission resolver
```

Service still rechecks domain state, ownership where explicit, archive, validation, security preconditions, and concurrency.

## 29. Direct User Permissions

Package table remains; current MVP admin UI does not expose direct permission assignment.

## 30. Spatie Teams Disabled

Required:

```php
'teams' => false,
```

Business Team remains separate organizational data.

## 31. Wildcard Disabled

Required:

```php
'enable_wildcard_permission' => false,
```

Documentation shorthand such as `nscmf.review.*` is never a runtime wildcard permission row.

## 32. Administrative RBAC Mutation

Role/permission administrative mutation SHOULD run through a cohesive administration Service and a repository/adapter boundary around package mutation where needed for orchestration:

```text
re-authentication
→ protected invariant
→ Service
→ Spatie/package mutation through bounded implementation
→ determine affected users
→ revoke sessions
→ Security Audit
```

This is orchestration around Spatie, not a replacement for Spatie authorization.

---

# PART I — VALIDATION

## 33. Backend Validation

Use Laravel Form Requests, reusable Rule objects, and domain validators/services for state/action-specific validation. `06_Validation_Rules.md` remains authority.

## 34. Frontend Validation

UX only. No independent client business-rule schema that can silently diverge.

---

# PART J — DATABASE

## 35. MySQL 8.4 LTS

Use InnoDB, FKs where appropriate, `utf8mb4`, indexes for queues/history/search/authorization relationships.

`11_ERD_Database_Schema.md` defines exact schema.

## 36. Eloquent / Query Builder

Eloquent and Query Builder are the concrete persistence/query technologies **inside repository implementations**.

Production application DB account uses least privilege, never MySQL root.

## 37. No External Search Engine MVP

No Elasticsearch/OpenSearch/Meilisearch/Typesense/Scout infrastructure by default.

---

# PART K — SESSION / CACHE / QUEUE

## 38. Database Session

Supports explicit session listing/revocation and max-two policy. Cache is never authorization truth.

## 39. Database Cache

Redis not required. Cache never source of truth for workflow/authorization/audit/malware/PDF validity.

## 40. Database Queue

Required for exact exports and long-running attachment finalization/scanning when asynchronous execution is selected by API contract. Future notification may use the same queue.

Jobs remain thin callers of Services.

## 41. Redis Position

Redis/Horizon/distributed infrastructure not MVP baseline.

---

# PART L — ATTACHMENT / MALWARE

## 42. Filesystem

Laravel Filesystem/Flysystem. Dev private local; production private S3-compatible target.

Successfully acknowledged production upload chunks MUST use durable private storage, not only ephemeral application-server local disk.

## 43. Resumable Upload Baseline

Confirmed:

```text
fixed chunk size = 5 MiB
max final file = 20 MB
unfinished upload expiry = 24h since last newly accepted upload activity
client SHA-256 = resume hint only
server assembled-file SHA-256 = authoritative
full assembled-file ClamAV = mandatory
explicit CLEAN only = usable
```

Upload metadata is relationally tracked according to `11A`/`11` authority.

## 44. Malware Contract

```text
MalwareScanner
→ ClamAvScanner
→ clamd private endpoint
```

Community package MAY be transport glue but not security authority.

Only explicit CLEAN passes.

---

# PART M — EXACT EXPORT

## 45. Official Template Authority

`NSCMF-Form-3.0.xlsx` remains canonical export template until approved replacement.

Export MUST preserve sheets, styles, merges, row/column dimensions, media, print settings, VML/native checkbox controls.

## 46. No Generic Workbook Rewrite

Do not casually load/re-save via a library that may strip unsupported OOXML parts.

## 47. Targeted OOXML Patching

```text
immutable template
→ private copy
→ patch mapped cells/control state only
→ preserve unrelated parts
→ integrity validate
→ XLSX
```

## 48. Template Mapping

Versioned explicit business-field → sheet/cell/control mapping. Never guess addresses.

## 49. PDF Renderer

Qualified spreadsheet renderer only. LibreOffice Headless remains a candidate only after golden fidelity qualification. No HTML/DomPDF approximation fallback.

## 50. Immutable Export Snapshot

At export request time, Service creates/binds immutable deterministic logical snapshot including record/version/workflow iteration/template context.

Worker Service MUST use the bound snapshot, not later live record data.

## 51. Temporary Export Artifacts

READY binary private for 168h/7d then cleanup. Cleanup never removes source record, audits, workflow/approval history, or issuance metadata.

---

# PART N — PDF SIGNING / VERIFICATION

## 52. Approved PDF Signing

Approved PDF only mandatory signing. Logical signer System/Organization; human Approved By separate.

Private key/cert manually provisioned protected environment, never GitHub/source/ordinary DB/browser. Missing/unusable identity is critical readiness failure. No unsigned fallback. No TSA current MVP.

Concrete signer is behind a focused infrastructure contract/adapter and is coordinated by export Service.

## 53. Public Verification

Public no-login PDF-only temporary upload, rate limit, ClamAV CLEAN, issuer signature verification, exact SHA-256, issuance/workflow-iteration/currentness resolution, minimum disclosure.

Results:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

---

# PART O — AUDIT

## 54. Custom Authoritative Audit Model

Separate:

```text
Business Audit
Access Audit
Security Audit
Technical Logs
```

Business/Access/Security Audit have no age-based purge.

Audit persistence MAY have dedicated repository boundary, but audit rules remain owned by the Service/use case and authoritative security/business documents. Repository MUST NOT silently omit required audit writes.

---

# PART P — TESTING

## 55. Pest 4

Backend tests cover auth, permission/state authorization, ownership, Team non-authorization, Spatie boundary, workflow, validation, audit, repositories, services, attachments, exports, signing, public verification.

## 56. Architecture Boundary Tests

Tests/static checks SHOULD detect architecture drift such as:

- Controller directly calling Eloquent/DB;
- Service issuing Eloquent/Query Builder business queries;
- Job/Command performing business persistence directly;
- repository containing business workflow decisions;
- duplicate Actions + Service orchestration;
- generic BaseRepository proliferation;
- DTO-per-model/endpoint architecture introduced without approved change.

Where practical, static architecture tests MAY be added in `16_Testing_Specification.md` without introducing a heavy architecture-testing package unless justified.

## 57. Authorization / Package Tests

Must include:

- Spatie `teams=false`;
- Team change does not grant/revoke Review/Approval;
- Reviewer/Approver permission behavior independent of Team;
- no scope dependency;
- wildcard disabled;
- multi-role permission union;
- Requester ownership restrictions;
- protected Superadmin invariants;
- sensitive role/permission session revocation.

## 58. Workflow / Concurrency Tests

All allowed/forbidden transitions; workflow iteration rules; Reviewer/Approver races; Draft/Result optimistic conflicts; Service-owned transaction behavior.

## 59. Frontend / E2E

Vitest + Vue Test Utils; Playwright for critical journeys.

## 60. Test DB

CI integration SHOULD use MySQL 8.4. SQLite is not the sole target.

## 61. Export Golden Tests

XLSX structure + PDF visual tests; signing/hash/current-vs-superseded verification tests.

---

# PART Q — QUALITY / CI / DOCKER

## 62. Quality Gates

Pint, PHPStan/Larastan, ESLint, Prettier, vue-tsc.

Use `declare(strict_types=1);` for project-owned PHP files unless an explicitly documented interoperability exception exists.

Prefer explicit typed method parameters/return types and PHP enums for closed domain value sets.

## 63. GitHub Actions

Reproducible Composer/npm installs, quality checks, Pest, frontend tests/build, Playwright, export golden tests. Real production signing key never CI fixture.

## 64. Docker Compatibility

Logical runtime may include app/web, MySQL, queue worker, scheduler, ClamAV, qualified renderer. Exact physical topology downstream. No Kubernetes requirement.

---

# PART R — CAPACITY / LOGGING

## 65. Capacity

~10 expected users / 50-user engineering baseline. MySQL + DB queue/session/cache + Repository–Service modular monolith is sufficient unless evidence says otherwise.

## 66. No Premature Infrastructure

No Kubernetes, microservices, Kafka/RabbitMQ, Redis cluster, external search, API gateway, separate Vue deployment, WebSockets, generic BPM, domain-entity mapper stack, or DTO framework by default.

## 67. Technical Logging

Laravel technical logs remain separate from authoritative audits. Never log passwords/private key/secrets/raw sensitive payloads/raw chunk bytes.

---

# PART S — IMPLEMENTATION GUARDRAILS

## 68. Developer / AI MUST NOT

1. switch framework/architecture without spec change;
2. reintroduce a separate `Actions` orchestration layer beside Service layer;
3. create generic `BaseRepository`/CRUD repository abstractions without concrete value;
4. create repository one-per-table mechanically;
5. make Controller issue application Eloquent/DB queries;
6. make Service issue Eloquent/Query Builder business queries directly;
7. let Job/Command execute business persistence/query flow directly instead of calling Service;
8. let Repository decide workflow authorization/state-transition business rules;
9. introduce mandatory DTO-per-request/model/read-projection architecture;
10. add `spatie/laravel-data` or equivalent solely for architecture style;
11. blindly mass-assign `$request->all()` or an entire validated nested payload to domain models;
12. create a second RBAC engine around Spatie;
13. duplicate Spatie package-owned RBAC tables;
14. enable Spatie Teams;
15. use business Team as permission scope;
16. create Reviewer/Approval scope tables or logic;
17. expose direct permission-to-user assignment as normal MVP;
18. enable wildcard permissions;
19. create `session.login`/`session.logout` permission rows;
20. make generic Superadmin bypass invalid domain invariants;
21. enable registration/SSO/MFA without approved change;
22. impose password composition;
23. use SQLite as only integration DB;
24. add Redis/WebSocket/search without evidence;
25. use HTML as authoritative export template;
26. generic-rewrite official workbook if controls may be stripped;
27. replace native controls;
28. claim renderer exact without golden qualification;
29. make generic activity log authoritative;
30. expose private attachments/chunks;
31. treat ClamAV failure as CLEAN;
32. age-delete authoritative audits;
33. put production signing key in source/DB/browser;
34. deliver unsigned Approved PDF after signing failure;
35. claim TSA current MVP;
36. make public validator a public record portal;
37. export later mutable data instead of bound immutable snapshot;
38. swallow exceptions silently or convert failed domain operations into false-success responses.

---

# PART T — DEPENDENCY CATEGORIES

## 69. Composer

Baseline:

```text
laravel/framework ^13
spatie/laravel-permission ^8
pestphp/pest ^4 --dev
larastan/larastan --dev
Laravel Pint / Laravel-provided tooling --dev
```

ClamAV client and PDF signing library may be chosen after compatibility review because adapters/security semantics are authoritative.

No DTO framework is required for current MVP.

## 70. npm

```text
vue 3.x
Inertia 3 compatible Vue packages
TypeScript
Tailwind CSS 4.x
Vite
shadcn-vue dependencies
lucide-vue-next
Vitest 4.x
@vue/test-utils
Playwright
ESLint
Prettier
vue-tsc
```

---

# PART U — ACCEPTANCE / DOWNSTREAM

## 71. Repository–Service Acceptance

- [ ] Controller is thin and calls Service;
- [ ] no duplicate `Actions` orchestration layer exists;
- [ ] Service owns use-case orchestration;
- [ ] Service owns business transaction boundary;
- [ ] Service does not issue Eloquent/Query Builder business queries;
- [ ] repository contracts have explicit Eloquent implementations;
- [ ] repository contracts are meaningful domain/aggregate boundaries, not table wrappers;
- [ ] no generic BaseRepository CRUD abstraction;
- [ ] Eloquent/Query Builder application persistence/querying occurs inside repository implementations;
- [ ] no mandatory DTO layer/framework;
- [ ] simple values use explicit typed parameters where practical;
- [ ] complex Form Request data remains validated/explicitly mapped, not blindly mass-assigned;
- [ ] Jobs/Commands call Services;
- [ ] ClamAV/storage/renderer/signing/verifier use focused infrastructure contracts/adapters;
- [ ] Spatie remains runtime authorization authority and is not reimplemented by repositories.

## 72. Authorization Acceptance

- [ ] Spatie Permission 8.x used;
- [ ] package-owned RBAC tables not duplicated;
- [ ] Spatie Teams disabled;
- [ ] business Team separate and authorization-neutral;
- [ ] direct-user permission admin absent;
- [ ] wildcard disabled;
- [ ] app checks granular permissions through Gate/Policies;
- [ ] ownership only where explicit business rules require it;
- [ ] no Reviewer/Approval scope layer;
- [ ] protected Superadmin cannot bypass invalid domain actions.

## 73. Runtime / Data / Export / Security Acceptance

All locked Laravel/PHP/Vue/Inertia/MySQL/session/queue/storage/resumable-upload/ClamAV/export/signing/verification/audit/testing decisions above remain required.

## 74. Intentionally Deferred

- exact physical class/folder names → `13_Project_Structure.md`;
- exact default Team master data;
- official numbering SOP;
- temporary credential delivery mechanism;
- exact re-auth proof lifetime;
- public-validator maximum upload size;
- bulk export packaging;
- exact numeric abuse rate limits;
- notification provider;
- certificate/signing operational library/container/path/rotation mechanics;
- technical-log retention/monitoring;
- backup/DR;
- performance/SLA;
- exact production deployment topology.

## 75. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| Permission/Spatie/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| **Technology + Repository–Service technology boundary** | **`08_Tech_Stack_Specification.md`** |
| Logical architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| ERD | `11_ERD_Database_Schema.md` |
| HTTP contract | `12_API_Contract.md` |
| Cross-document Repository–Service synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |

## 76. Current Documentation Handoff

Documents through `12_API_Contract.md` exist. Repository–Service Architecture is synchronized by this document, updated `09_System_Architecture.md`, and `12A_Repository_Service_Architecture_Synchronization.md`.

Next fixed-order document to design:

**`13_Project_Structure.md`** — must translate these locked boundaries into exact Laravel/Vue folder, class, interface, provider, route, job, service, repository, model, infrastructure-adapter, and test placement without reintroducing duplicate orchestration or DTO boilerplate.
