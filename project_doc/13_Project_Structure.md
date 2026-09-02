# Project Structure Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-STRUCT-013  
> **Document Order:** 13 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`, `12_API_Contract.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`, `14_Environment_Specification.md`  
> **Application Style:** Laravel 13 modular monolith + pragmatic Repository–Service Architecture + Inertia 3 + Vue 3 / TypeScript  
> **Last Updated:** 2026-09-02  

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
- placement untuk resumable attachment, audit, protected Core Settings, export, OOXML, PDF signing, dan public verification;
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

Tidak ada top-level `Actions/` orchestration layer current MVP.

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
MySQL / Private Persistent Local Storage / ClamAV / Renderer / Signing Runtime
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
├── bootstrap/
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
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

All fixed-order project specifications remain in `project_doc/`. Application code MUST NOT duplicate project decisions into a competing documentation tree.

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
│   │   ├── Settings/
│   │   └── Audits/
│   └── Public/
├── Middleware/
├── Requests/
│   ├── Auth/
│   ├── Nscmf/
│   │   ├── Workflow/
│   │   ├── Attachment/
│   │   └── Export/
│   ├── Administration/
│   │   └── Settings/
│   └── Public/
└── Resources/
    ├── Nscmf/
    ├── Attachment/
    ├── Export/
    ├── Audit/
    └── Administration/
```

Folder MAY be omitted until a class actually exists.

## 9. Controller Rule

Controller is an HTTP adapter:

```text
receive routed request
→ consume validated Form Request values
→ invoke Service
→ return Inertia / JSON / redirect / streamed response
```

Controller MUST NOT query Model/DB, call Repository directly, open business transaction, calculate workflow destination, mutate state/model directly, coordinate audit/chunk/ClamAV/export/signing, or implement business validation owned elsewhere.

## 10. Controller Granularity

Sensitive/domain mutations SHOULD use invokable/single-purpose controllers. Ordinary cohesive CRUD/read may use resource-style controllers while remaining thin.

Examples include workflow action controllers and settings controller such as:

```text
app/Http/Controllers/Administration/Settings/
└── TechnicalLogSettingsController.php
```

The settings controller MUST NOT contain scheduler/file-deletion logic itself.

## 11. Form Requests

Representative classes include existing NSCMF/workflow/attachment/export/admin requests plus:

```text
UpdateTechnicalLogSettingsRequest
```

Rules:

- Form Request is not a business Service;
- `$request->all()` forbidden for business/settings persistence;
- validated data explicitly mapped;
- Service still enforces protected identity/security/re-auth/domain invariants.

## 12. No PHP DTO Layer

No PHP DTO architecture layer current MVP. Simple inputs use typed scalar/enum values; complex validated nested data may pass the dedicated Form Request structured validated array.

## 13. HTTP Resources

Use only where stable structured JSON representation adds value. Resources MUST NOT query DB, make authorization decisions, calculate workflow transitions, expose private storage locators or temporary/plaintext secret values beyond the explicitly one-time Create/Reset response contract.

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
├── Attachment/
│   ├── AttachmentUploadService.php
│   ├── AttachmentFinalizationService.php
│   └── AttachmentService.php
├── Export/
│   ├── NscmfExportService.php
│   └── PdfVerificationService.php
├── Administration/
│   ├── UserAdministrationService.php
│   ├── RolePermissionAdministrationService.php
│   ├── TeamAdministrationService.php
│   └── SystemSettingsService.php
├── Audit/
│   └── AuditQueryService.php
├── Maintenance/
│   └── TechnicalLogCleanupService.php
└── Security/
    ├── CredentialService.php
    └── SessionService.php
```

This is structural baseline, not requirement to create every class before needed.

## 15. Service Cohesion

Service represents cohesive capability/use-case family, not one endpoint and not entire application. `SystemSettingsService` owns protected application-setting mutation/read orchestration. `TechnicalLogCleanupService` owns settings-aware operational cleanup execution and MUST remain separate from authoritative audit repositories.

## 16. Service Responsibilities

Service MAY own use-case orchestration, permission/domain/security coordination, transaction boundary, repository coordination, audit persistence orchestration, post-commit jobs, infrastructure-contract invocation outside prohibited lock windows.

Service MUST NOT issue Eloquent/Query Builder business queries directly or become HTTP/Vue/protocol implementation.

## 17. Transaction Ownership

Business/settings transaction ownership belongs to Service. Long upload/scanning/rendering/signing/file-cleanup I/O MUST NOT be performed while an unrelated workflow row lock is held.

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
│       ├── RolePermissionRepository.php
│       └── SystemSettingsRepository.php
└── Eloquent/
    ├── Nscmf/
    ├── Attachment/
    ├── Export/
    ├── Audit/
    └── Administration/
```

## 19. Naming Convention

Contract omits redundant `Interface`; concrete Eloquent implementation communicates technology, e.g. `EloquentSystemSettingsRepository`.

## 20. Repository Responsibilities

Repository owns persistence/query mechanics. It MUST NOT decide workflow/permission/security policy, whether Team grants authority, or whether Technical Log cleanup may target authoritative audits.

## 21. Domain-Oriented Repository Methods

Examples MAY include:

```text
findEditableRecord(...)
findForWorkflowUpdate(...)
persistDraft(...)
paginateReviewCandidates(...)
findResumableUpload(...)
createImmutableSnapshot(...)
appendBusinessAuditEvent(...)
getSystemSettings(...)
lockSystemSettingsForUpdate(...)
updateTechnicalLogSettings(...)
```

## 22. No Generic BaseRepository

No generic CRUD wrapper hierarchy.

## 23. Repository Is Not One-Per-Table

Separate repository only where meaningful lifecycle/security/query boundary exists. `SystemSettingsRepository` is justified because protected runtime-configurable application settings form an explicit schema/security boundary.

## 24. Repository Return Values

No mandatory Domain Entity/DTO mapper layer. Native Eloquent model/collection/paginator/scalar/bounded result allowed.

## 25. Repository Binding

Bindings belong in `RepositoryServiceProvider.php` or equivalent explicit provider.

---

# PART F — DOMAIN LAYER

## 26. `app/Domain/`

Recommended lightweight structure:

```text
app/Domain/
├── Nscmf/
├── Attachment/
├── Export/
├── Verification/
├── Security/
└── Administration/
    └── Enums/
```

## 27. Domain Enums

Closed sets SHOULD use PHP Enum, including canonical business/technical enums and:

```text
TechnicalLogRetentionUnit
```

with exact values `DAY|MONTH`.

## 28. Domain Rules

Focused reusable domain/security rules only when they add semantic value.

## 29. Domain Exceptions

Safe stable failure categories; no secrets/SQL/storage paths.

## 30. What Domain Does Not Contain

No mirrored entity graph, aggregate framework, event sourcing, generic Specification pattern, DTOs, repository implementations, HTTP Requests, Vue types.

---

# PART G — ELOQUENT MODELS

## 31. `app/Models/`

Recommended shape includes existing models plus:

```text
app/Models/Administration/
└── SystemSettings.php
```

or an equivalently clear placement consistent with final implementation naming.

Spatie package-owned Role/Permission models remain package-driven.

## 32. Model Responsibilities

Relationships/casts/scopes/config only. No workflow orchestration, cleanup file deletion, ClamAV/signing, queue dispatch, or authorization bypass.

---

# PART H — POLICY / AUTHORIZATION

## 33. `app/Policies/`

Policies remain resource/action authorization boundary combined with Spatie permission checks and Service/domain validation.

Protected Technical Log setting mutation additionally requires the Protected Superadmin invariant, `system.settings.manage`, and valid <=15-minute sensitive re-auth proof.

## 34. Authorization Boundary

```text
valid session
+ required permission
+ Policy/resource authorization
+ ownership where explicit
+ state/archive/validation/security/concurrency
```

Team absent. Protected Core Settings add Protected Superadmin identity invariant where explicitly required.

---

# PART I — INFRASTRUCTURE LAYER

## 35. `app/Infrastructure/`

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

## 36. Storage Boundary — Confirmed Initial Production Direction

Private storage capability SHOULD be represented by focused contract when Service-level semantics need it.

Current confirmed backend:

```text
local/development → Laravel private local filesystem
initial production → Laravel private local filesystem on persistent/non-ephemeral server storage
```

No third-party S3-compatible/object-storage provider is part of current MVP baseline.

`14_Environment_Specification.md` owns exact disk names, private roots/prefixes, filesystem permissions, mount/persistence behavior, and cleanup paths.

Logical private categories include:

```text
resumable chunks
assembly/quarantine
final attachments
export artifacts
official immutable templates
public-validator temporary uploads
```

No storage key/path grants authorization. Absolute host filesystem paths MUST NOT leave Infrastructure/config boundaries.

## 37. Malware Boundary

`Service → MalwareScanner → ClamAvScanner → clamd`. Topology deferred to Environment/Deployment; explicit CLEAN semantics fixed.

## 38. Export Infrastructure

```text
app/Infrastructure/Export/
├── Mapping/NscmfFormV3/
├── OOXML/
├── Validation/
└── Rendering/
```

Official template exact; targeted OOXML patching; mapping version-controlled; no generic rewrite/HTML fallback.

Production template binary is immutable/versioned/private, SHA-256 verified, and provisioned/readiness-checked through Environment Specification. New template = new version, not overwrite.

## 39. Signing Boundary

`Service → PdfSigner → concrete adapter`.

Private signing key/cert operational path/container/provider/passphrase remains protected runtime concern. Private key never source/test fixture/ordinary DB/browser/project docs.

## 40. Verification Boundary

Public verification Service coordinates private temp upload → ClamAV → PdfVerifier → issuance repository → currentness → minimum disclosure.

Public upload maximum 20 MB.

---

# PART J — RESUMABLE ATTACHMENT PLACEMENT

## 41. Attachment HTTP

Existing canonical Attachment controllers remain.

## 42. Attachment Services

```text
AttachmentUploadService
→ initiate/resume/status/chunk/cancel

AttachmentFinalizationService
→ verify/assemble/server hash/type/ClamAV/CLEAN promotion

AttachmentService
→ final attachment read/remove/download
```

## 43. Attachment Repositories

Metadata in repositories; binary I/O in Storage infrastructure.

## 44. Attachment Job

`FinalizeAttachmentUploadJob → AttachmentFinalizationService`.

Acknowledged production chunks MUST reside on persistent/non-ephemeral local storage under current baseline, never only process/container ephemeral storage.

---

# PART K — EXPORT / SIGNING / VERIFICATION

## 45. Export HTTP

Existing canonical Export controllers remain.

## 46. Export Service

Owns snapshot/export lifecycle and mandatory signing semantics.

## 47. Export Repository

Owns relational export/template/public-cert/issuance persistence; not OOXML/render/sign.

## 48. Export Job

`GenerateNscmfExportJob → NscmfExportService`.

## 49. Public PDF Verification

```text
app/Http/Controllers/Public/PdfVerificationController.php
app/Http/Requests/Public/VerifyPdfRequest.php
app/Services/Export/PdfVerificationService.php
```

`VerifyPdfRequest`/Service must enforce PDF + max20MB before deep verification while preserving server authority.

---

# PART L — AUDIT / TECHNICAL LOG PLACEMENT

## 50. Repository Separation

```text
BusinessAuditRepository
AccessAuditRepository
SecurityAuditRepository
```

Technical application logs are intentionally **not** represented by these repositories.

## 51. Business Audit

Required business mutation audit writes share required transaction semantics.

## 52. Access Audit

Separate access evidence, not Business Timeline.

## 53. Security Audit

Auth/credential/RBAC/session/malware/signing/protected-settings flows through Service boundary. No secrets.

## 54. Audit Read

`AuditQueryService` + respective repositories; no update/delete/purge-by-age Service.

## 55. Technical Log Cleanup

Technical log cleanup is operational maintenance, not an Audit repository concern.

Canonical structure MAY be:

```text
SystemSettingsService
→ SystemSettingsRepository
→ typed singleton DB setting

Scheduler / Console
→ TechnicalLogCleanupService
→ read current setting through SystemSettingsRepository
→ if enabled, delete/rotate eligible Technical Logs only
```

`TechnicalLogCleanupService` MUST NOT depend on or delete rows through Business/Access/Security Audit repositories.

---

# PART M — ADMINISTRATION / SPATIE / SETTINGS

## 56. Administration Controllers

```text
app/Http/Controllers/Administration/
├── Users/
├── Roles/
├── Teams/
├── Settings/
└── Audits/
```

## 57. Administration Services

```text
UserAdministrationService
RolePermissionAdministrationService
TeamAdministrationService
SystemSettingsService
```

Create/reset credential uses `CredentialService` to generate temporary password server-side and return plaintext only transiently to the one-time Controller response after safe persistence/audit succeeds. No Repository method accepts/stores plaintext temp password.

## 58. RolePermissionRepository

Wraps admin persistence/mutation/query integration with Spatie; never runtime permission engine.

## 59. Team Repository

Organizational data only; no Review/Approval scope.

## 60. System Settings Repository

Owns typed `system_settings` persistence only.

MUST NOT become:

```text
GenericSettingsRepository
arbitrary key/value config API
secret vault
business-rules override store
authoritative audit retention store
```

Protected setting mutation follows:

```text
current password re-auth (<=15 minutes)
+ Protected Superadmin invariant
+ system.settings.manage
→ SystemSettingsService
→ transaction
→ SystemSettingsRepository
→ SecurityAuditRepository
```

---

# PART N — JOBS / CONSOLE / SCHEDULER

## 61. `app/Jobs/`

Expected business jobs remain coarse-grained:

```text
Attachment/FinalizeAttachmentUploadJob.php
Export/GenerateNscmfExportJob.php
```

## 62. Job Rule

`Job → Service`, never direct Model/DB/Repository business flow.

## 63. Scheduler / Console Placement

Laravel scheduler registration follows Laravel 13 conventions.

Current responsibilities:

- unfinished upload cleanup after 24h inactivity;
- abandoned temporary assembly cleanup;
- generated export binary cleanup after 168h;
- Technical Log automatic cleanup **only when enabled by the current protected setting**, using its configured positive Days/Months retention;
- runtime housekeeping otherwise explicitly allowed.

Scheduler MUST NOT:

- age-delete Business/Access/Security Audit;
- delete NSCMF source/workflow/issuance history because Technical Log cleanup is enabled;
- auto-advance business workflow;
- hard-code 30 days as immutable Technical Log retention.

30 Days is only the default setting.

---

# PART O — ROUTES

## 64. Canonical Route Files

```text
routes/
├── web.php
├── auth.php
├── nscmf.php
├── administration.php
├── public.php
└── console.php
```

## 65. `routes/web.php`

General app/page registration; not route dump.

## 66. `routes/auth.php`

```text
POST /login
POST /logout
POST /account/temporary-password/change
POST /account/re-authenticate
```

## 67. `routes/nscmf.php`

Forms/workflow/review/approval/history/timeline/attachment/export.

## 68. `routes/administration.php`

Users, roles, permissions, Teams, privileged audits, protected Core Settings.

Includes canonical settings endpoints from `12`:

```text
GET   /administration/settings/technical-logs
PATCH /administration/settings/technical-logs
```

No Unit/Division/scope/direct-user-permission/generic-settings/audit-purge route.

## 69. `routes/public.php`

`GET/POST /ispdfvalid`; no public NSCMF API.

## 70. Route Contract Authority

`12_API_Contract.md` remains URI/method authority.

---

# PART P — FRONTEND / INERTIA

## 71. Canonical Frontend Structure

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
│   │   └── Settings/
│   └── Public/
├── features/
│   ├── nscmf/
│   ├── attachments/
│   ├── exports/
│   └── administration/
│       └── settings/
├── components/ui/
├── components/shared/
├── composables/
├── layouts/
├── lib/
├── types/
└── app.ts
```

## 72. `Pages/`

Route entry components; no business-rule duplication.

## 73. `features/`

Reusable domain-specific UI. Settings feature may own Technical Log cleanup form/presentation but not authorization/cleanup execution.

## 74. `components/ui/`

shadcn/base primitives only.

## 75. `components/shared/`

Cross-feature app components only.

## 76. `composables/`

Reusable Vue behavior.

## 77. `types/`

Strong TypeScript, no uncontrolled `any`, no invented business states. Technical-log unit type mirrors `DAY|MONTH`.

## 78. Attachment Frontend

Resumable uploader reconciles server state; no browser authority for accepted chunks/CLEAN.

## 79. NSCMF Forms

Meaningful section decomposition, not component-per-trivial-input.

---

# PART Q — DATABASE / MIGRATIONS / SEEDERS

## 80. `database/migrations/`

Materializes `11`, package migrations, resumable additions, and typed `system_settings` singleton schema. No hidden workflow triggers or generic settings EAV.

## 81. `database/seeders/`

Governed downstream by `17`. Before then, do not invent Team master data. Protected baseline may seed the singleton system-settings defaults required by already confirmed policy:

```text
technical_log_auto_cleanup_enabled = true
technical_log_retention_value = 30
technical_log_retention_unit = DAY
```

Exact seeder organization/data beyond locked defaults belongs to `17`.

## 82. `database/factories/`

Test/development builders only.

---

# PART R — CONFIG / SUPPORT

## 83. `config/`

Config files define non-secret application/integration configuration consumed from environment, for example:

```text
nscmf.php
attachments.php
exports.php
security.php
```

Important boundary:

- environment-backed infrastructure config belongs here;
- Protected Superadmin runtime Technical Log preference is persisted in typed `system_settings`, not hard-coded in config;
- config may define safe fallback/default bootstrap values matching the authoritative default, but DB setting after initialization is application runtime authority for this configurable preference;
- locked product limits cannot be silently changed per environment through arbitrary env vars.

Secrets remain protected runtime concern.

## 84. `app/Support/`

Generic helpers only; no business-logic dumping ground.

---

# PART S — TEST STRUCTURE

## 85. Test Root

```text
tests/
├── Feature/
│   ├── Auth/
│   ├── Nscmf/
│   ├── Workflow/
│   ├── Attachment/
│   ├── Export/
│   ├── Administration/
│   │   └── Settings/
│   └── PublicVerification/
├── Unit/
│   ├── Domain/
│   └── Services/
├── Integration/
│   ├── Repositories/
│   ├── Database/
│   ├── Malware/
│   ├── Export/
│   ├── Signing/
│   └── Storage/
├── Architecture/
├── Fixtures/Export/
└── Browser/
```

## 86. Repository Tests

Use real MySQL8.4 where locking/schema semantics matter, including `system_settings` constraints/singleton behavior.

## 87. Service Tests

Use-case behavior, including Protected Superadmin + 15-minute re-auth requirements and settings/audit separation.

## 88. Architecture Tests

Should enforce Controller/Service/Repository/Job/Domain boundaries and no audit-repository dependency from Technical Log cleanup Service for deletion.

## 89. Frontend Tests

Vitest/Vue Test Utils; Playwright critical journeys.

---

# PART T — READ / WRITE FLOW EXAMPLES

## 90. Draft Save

`PATCH → Form Request → Controller → NscmfDraftService → transaction → repositories → Business Audit → version`.

## 91. Workflow Approval

`POST → Controller → NscmfWorkflowService → locked transaction → repositories → Business Audit → redirect`.

## 92. Review Queue

`GET → Controller → NscmfQueryService → repository paginator → Inertia`, no Team auth.

## 93. Resumable Chunk

`PUT → Controller → AttachmentUploadService → persistent private Storage + server chunk SHA → upload repository → accepted/missing response`.

## 94. Attachment Finalization

Job → Service → repository + Storage assembly → authoritative SHA → full-file ClamAV → CLEAN promotion.

## 95. Export Request / Worker

Request binds immutable snapshot; worker uses snapshot/template metadata → OOXML → renderer → signer if Approved → final hash/issuance → private READY artifact.

## 96. Public PDF Verify

`POST → VerifyPdfRequest (PDF, <=20MB) → Controller → PdfVerificationService → private temp → CLEAN → verifier → issuance repository → minimum disclosure → cleanup`.

## 97. Create / Reset Temporary Password

```text
admin request
→ <=15-minute re-auth proof
→ Controller
→ UserAdministrationService
→ CredentialService generates temporary plaintext in memory
→ hash persisted through UserRepository
→ Security Audit
→ Service returns transient plaintext to Controller
→ one-time no-store response/view
→ plaintext discarded
```

No Repository/Model column stores temp plaintext. If admin loses it, run Reset again to generate a new temporary password.

## 98. Technical Log Settings Update

```text
PATCH /administration/settings/technical-logs
→ UpdateTechnicalLogSettingsRequest
→ TechnicalLogSettingsController
→ SystemSettingsService
→ Protected Superadmin + permission + <=15m re-auth
→ transaction
→ SystemSettingsRepository update
→ SecurityAuditRepository append
→ response
```

No log deletion occurs inside this request.

## 99. Scheduled Technical Log Cleanup

```text
Laravel scheduler
→ TechnicalLogCleanupService
→ SystemSettingsRepository reads current typed setting
→ if OFF: no age cleanup
→ if ON: calculate threshold from positive DAY/MONTH setting
→ delete/rotate eligible Technical Logs only
```

Business/Access/Security Audit repositories are not cleanup targets.

---

# PART U — FILE OWNERSHIP MATRIX

## 100. Responsibility Summary

| Concern | Canonical location |
|---|---|
| HTTP routing | `routes/*.php` |
| HTTP validation | `app/Http/Requests` |
| HTTP/page adapter | `app/Http/Controllers` + optional Resources |
| Use-case orchestration | `app/Services` |
| Business enums/rules | `app/Domain` |
| Persistence contract | `app/Repositories/Contracts` |
| Eloquent persistence/query | `app/Repositories/Eloquent` |
| Persistence models | `app/Models` |
| Resource authorization | `app/Policies` + Spatie/Gates |
| Storage/ClamAV/renderer/signer/verifier | `app/Infrastructure` |
| Protected settings orchestration | `app/Services/Administration/SystemSettingsService` |
| Settings persistence | `SystemSettingsRepository` + `SystemSettings` model |
| Technical Log cleanup execution | Maintenance/cleanup Service called by scheduler |
| Background trigger wrapper | `app/Jobs` |
| DI bindings | `app/Providers` |
| Inertia pages/features | `resources/js/Pages`, `resources/js/features` |
| Schema | `database/migrations` |
| seed data | `database/seeders` governed by `17` |
| project specs | `project_doc` |

---

# PART V — FORBIDDEN STRUCTURAL COUPLING

## 101. Developer / AI MUST NOT

1. create parallel Actions layer;
2. add DTO framework/layer current MVP;
3. generic BaseRepository;
4. repository-per-table mechanically;
5. one-Service-per-route mechanically;
6. God Service;
7. Controller direct Eloquent/DB/Repository;
8. Service direct Eloquent business query;
9. Job direct Model/DB/Repository business flow;
10. Model workflow orchestration;
11. HTTP Resource DB query;
12. Team Review/Approval scope;
13. enable Spatie Teams;
14. duplicate RBAC schema;
15. runtime authorization engine inside repository;
16. frontend business truth;
17. generic live business JSON;
18. infrastructure adapter mutating workflow by itself;
19. Controller direct ClamAV/renderer/signing;
20. expose storage path/key;
21. production private key in repository;
22. production secrets committed config;
23. test fixture as production template/key source;
24. standalone Bearer/JWT `api.php` architecture;
25. rename route contract for folder convenience;
26. public record-browsing API;
27. Support/Helpers dumping ground;
28. hidden DB workflow triggers;
29. new business states from class naming;
30. microservice/Kubernetes boundaries through folders;
31. S3/object-storage-specific business code for current MVP;
32. acknowledged production chunks on ephemeral process/container-only storage;
33. generic key/value settings repository/API;
34. settings Service that can change password policy/business states/authoritative audit retention;
35. TechnicalLogCleanupService deleting authoritative audits;
36. plaintext temporary password in Model/Repository/DB/log/cache/history;
37. reusable endpoint to retrieve prior temp password;
38. public validator >20MB;
39. hard-coded immutable 30-day log policy; 30 Days is default only.

---

# PART W — STRUCTURAL ACCEPTANCE

## 102. Backend Architecture

Controller→Service, Service transaction, repository contracts/Eloquent implementations, no Actions/DTO/generic repository/God Model.

## 103. Authorization / Organization / Settings

- [ ] Policies/Gates/Spatie runtime authority;
- [ ] Team organizational only;
- [ ] no scope/Spatie Teams;
- [ ] Protected Technical Log setting requires Protected Superadmin + permission + <=15m re-auth;
- [ ] SystemSettingsRepository remains typed/bounded;
- [ ] TechnicalLogCleanupService cannot target authoritative audits.

## 104. Async / Infrastructure

- [ ] Jobs→Services;
- [ ] persistent Laravel local private storage initial production;
- [ ] no ephemeral acknowledged chunks;
- [ ] ClamAV/renderer/signing contracts;
- [ ] immutable export snapshot.

## 105. Frontend / Routes

- [ ] settings page/feature is presentation only;
- [ ] `/administration/settings/technical-logs` routes match `12`;
- [ ] public validator enforces/displays max20MB;
- [ ] one-time temp password has no later retrieval UI.

## 106. Testing / Maintainability

- [ ] MySQL-specific behavior testable;
- [ ] storage persistence assumptions testable;
- [ ] settings/audit-retention boundaries testable;
- [ ] architecture checks practical;
- [ ] no premature abstraction.

---

# PART X — AUTHORITY / DOWNSTREAM HANDOFF

## 107. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| Permission/RBAC/Team | `04_RBAC_Permission_Matrix.md` |
| State/workflow iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Logical architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Schema | `11_ERD_Database_Schema.md` + `11A` |
| HTTP contract | `12_API_Contract.md` |
| Repository–Service synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |
| **Source-code physical structure** | **`13_Project_Structure.md`** |
| Environment/runtime | `14_Environment_Specification.md` |

## 108. Confirmed Decisions Handed to `14_Environment_Specification.md`

`13` does not invent exact environment variables but confirms the following inputs to `14`:

```text
canonical application timezone = Asia/Jakarta
environments = local/development, testing, CI, staging, production
initial production storage = persistent Laravel private local filesystem
third-party object storage = not current MVP
resumable chunks = persistent/non-ephemeral
re-auth proof = 15 minutes
public validator max PDF = 20 MB
temporary credential = server-generated + one-time admin reveal
official XLSX template = immutable/versioned/private + SHA-256 readiness
Technical Log cleanup default = ON + 30 DAY, Protected-Superadmin configurable DAY/MONTH or OFF
Approved-PDF private key = protected runtime provisioning, never source/ordinary DB/browser/log
ClamAV/renderer placement = governed by `20`; integration-time timeout/qualification details remain evidence-based
```

`14` defines the explicit runtime configuration for these concerns and MUST remain consistent with this project structure.

## 109. Runtime Configuration Owned by `14`

`14_Environment_Specification.md` is already the authority for runtime configuration, including:

- `.env` names/values and secret-injection boundaries;
- Laravel/MySQL timezone implementation consistent with `Asia/Jakarta`;
- DB connection/security values;
- database queue/cache/session runtime values;
- private local storage disk/root/mount/prefix/permissions;
- ClamAV connectivity and finite timeout configuration;
- renderer executable/workdir/fonts/health/timeout configuration;
- official template runtime provisioning/readiness;
- signing protected secret/certificate runtime references;
- scheduler/process-manager/runtime command;
- Technical Log channel/path/rotation implementation;
- production secret injection.

Project structure MUST consume those runtime contracts without duplicating environment policy.

## 110. Later Fixed-Order Authorities — Now Available

The following authorities are already part of the Approved for Implementation baseline:

- coding/agent rules → `15`;
- testing matrix → `16`;
- seed/dummy data → `17`;
- completion gates → `18`;
- implementation tasks → `19`;
- deployment placement → `20`.

Remaining genuine non-blocking choices are limited to organization-owned Team/numbering data, optional bulk packaging/notification behavior, exact numeric rate limits, concrete signing mechanics, measured scanner/renderer tuning/qualification, and host-specific values when a real server exists. Performance/SLA, backup/DR/RPO/RTO, HA, load balancing, Kubernetes, and speculative production topology are not current MVP open items.

## 111. Documentation Finality / Current Handoff

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
