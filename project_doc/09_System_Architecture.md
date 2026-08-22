# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Repository–Service + Resumable Attachment + Environment-Decision Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `10_Security_Rules.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12_API_Contract.md`, `12A_Repository_Service_Architecture_Synchronization.md`, `13_Project_Structure.md`, confirmed decisions for upcoming `14_Environment_Specification.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Canonical Application Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk logical system architecture, dependency direction, component boundaries, synchronous/asynchronous execution boundaries, transaction/concurrency model, persistence ownership, audit separation, attachment flow, export/signing/verification subsystem architecture, dan protected runtime-settings boundaries**.

Architecture menggunakan **pragmatic Repository–Service Architecture** di dalam Laravel 13 modular monolith.

Tujuan:

- Controller tipis;
- Service satu orchestration/use-case layer;
- persistence/query aplikasi melalui Repository contracts/implementations;
- Service owns transaction;
- Eloquent natural at implementation boundary;
- external runtime integrations use contracts/adapters;
- Job/Command thin;
- business/security rules not scattered;
- no mandatory DTO/mapper/generic repository ceremony;
- protected Core Settings have explicit persistence/orchestration boundary;
- runtime infrastructure remains configurable without redefining business architecture.

Exact physical folder/class names belong to `13_Project_Structure.md`. Exact environment variables/runtime paths belong to upcoming `14_Environment_Specification.md`.

---

## 2. Normative Language

MUST, MUST NOT, SHOULD, MAY, AUTHORITATIVE, QUALIFIED, FAIL CLOSED retain their normal normative meaning in this project.

---

# PART A — ARCHITECTURAL DRIVERS

## 3. Confirmed Drivers

Architecture MUST support:

1. single organization / installation;
2. Team organizational data only; no Unit/Division;
3. username/password, no registration, min6/no composition/no MFA;
4. protected Superadmin;
5. multi-role permission-centric RBAC;
6. Spatie Permission 8.x package schema;
7. Team-neutral Review/Approval;
8. Requester ownership where explicit;
9. server-side permission/state/validation/security;
10. Activation + Change;
11. Draft autosave/manual save;
12. shared Reviewer/Approver pools;
13. one final eligible approval;
14. seven business states;
15. workflow iteration semantics;
16. narrow Change Result capture;
17. Business/Access/Security Audit separation + no age purge;
18. Technical Logs as separate operational diagnostics with protected configurable cleanup;
19. private optional attachments + resumable 5 MiB + 24h inactivity + whole-file ClamAV CLEAN;
20. MySQL History/search;
21. exact XLSX/PDF;
22. all export async DB Queue;
23. immutable deterministic export snapshot;
24. Approved PDF System/Organization signing;
25. public validator signature + exact SHA-256 + issuance/currentness, max20MB upload;
26. 168h generated binary retention;
27. no TSA MVP;
28. ~10 expected / 50-user engineering baseline;
29. Docker-compatible runtime;
30. no WebSocket/Redis/search-engine requirement;
31. clean Repository–Service boundary;
32. server-generated one-time temporary credentials + forced target change;
33. 15-minute sensitive current-password re-auth proof;
34. session idle30m/absolute8h/max2 with third valid login revoking oldest;
35. canonical application/business timezone `Asia/Jakarta`;
36. initial production private binary storage through persistent Laravel `local` filesystem, no third-party object storage current MVP;
37. official template immutable/versioned/private + SHA-256 readiness;
38. environment classes local/development, testing, CI, staging, production.

## 4. Architecture Priorities

Business correctness; authorization/security; workflow consistency; auditability; no data loss; export fidelity; fail-closed behavior; maintainability; explicit ownership; simplicity proportional to scale; evidence-based optimization.

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
+ Private Persistent Laravel Local Storage
+ ClamAV / clamd
+ Exact Export / Renderer / Signing / Verification boundaries
```

No microservice implication.

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
MySQL / Private Persistent Storage / Runtime Components
```

No parallel Actions orchestration layer, mandatory DTO layer, generic repository hierarchy, or Controller/Job business persistence shortcut.

## 7. Single Organization / Team

No tenant switcher/middleware/tenant_id architecture. Team is ordinary organizational data; no role/permission scope; Spatie Teams disabled.

## 8. Deployment-Agnostic Logical Components

Logical components:

- Web/Application Runtime;
- Queue Worker;
- Scheduler;
- MySQL;
- Laravel private persistent filesystem;
- ClamAV/clamd;
- Spreadsheet Renderer;
- protected signing identity runtime provisioning.

Current MVP chooses Laravel `local` storage backend for initial production but **does not fix physical host/container/mount topology here**. `20_Deployment_Architecture.md` will decide co-location/separation.

Production acknowledged resumable-upload progress MUST NOT depend solely on ephemeral process/container filesystem.

---

# PART C — SYSTEM CONTEXT / TRUST

## 9. High-Level Context

```text
Internal User Browser
        | HTTPS
        v
Laravel 13 Application
  Controllers / Form Requests
  Services
  Policies / Gates / Domain Rules
  Repository Contracts
  Eloquent Repositories
  Infrastructure Contracts
        |
        +--> MySQL 8.4
        +--> Private Persistent Laravel Local Storage
        +--> Database Queue / Worker
        +--> ClamAV / clamd
        +--> Qualified Spreadsheet Renderer
        +--> Protected PDF Signer

Public Visitor
→ rate-limited /ispdfvalid
→ <=20MB PDF temp upload
→ ClamAV CLEAN
→ signature + exact hash + issuance/currentness
```

Scheduler cleans expired uploads, generated export binaries, and eligible Technical Logs according to current protected setting; never age-purges authoritative audits.

## 10. Trust Boundaries

Untrusted: browser payload/IDs, filenames/MIME/file bytes, client hash/fingerprint, chunks, public uploads, client state/permission/actor/version/Team/admin setting values.

Trusted authority: server session, Spatie/Laravel permissions, Policies/Gates, Service/domain rules, MySQL state, server upload metadata/final SHA-256, protected template registry, protected signing identity, explicit full-file ClamAV CLEAN, typed protected settings persisted under authorization.

Private signing key never reaches browser/public verifier.

---

# PART D — APPLICATION LAYERS

## 11. Presentation

Vue/Inertia handles presentation/local interaction only. Browser SHA-256 may be resume hint only.

## 12. HTTP / Inertia Boundary

Browser→route→session/CSRF→Controller→Form Request→Service→repositories/domain/infrastructure→response. Dedicated JSON endpoints allowed per `12`.

## 13. Controllers

Transport adapters only. No Eloquent/DB business query, model mutation, business transaction, state logic, audit/scanner/export/signing orchestration, or repository shortcut.

## 14. Form Requests

HTTP validation/normalization only. No mandatory DTO. Complex nested validated array allowed but no blind mass assignment.

## 15. Service Layer

Single application orchestration layer.

Representative boundaries:

```text
NscmfCreationService
NscmfDraftService
NscmfWorkflowService
NscmfChangeResultService
NscmfQueryService
AttachmentUploadService
AttachmentFinalizationService
AttachmentService
NscmfExportService
PdfVerificationService
UserAdministrationService
RolePermissionAdministrationService
TeamAdministrationService
SystemSettingsService
TechnicalLogCleanupService
SessionService
CredentialService
```

No God Service.

## 16. Domain Rules / Enums

Focused enums/rules, including business/technical statuses and `TechnicalLogRetentionUnit=DAY|MONTH`. No duplicate persistence entity hierarchy.

## 17. Repository Contracts

Mandatory application persistence/query boundaries, grouped by meaningful domain/use-case. Includes `SystemSettingsRepository` for the narrow typed protected settings store.

## 18. Eloquent Repositories

Own Eloquent/Query Builder/locking/pagination/persistence mechanics.

## 19. No Generic Repository Boilerplate

No BaseRepository/GenericRepository CRUD mirroring.

## 20. Repository Return Values

Native Eloquent models/collections/paginators/scalars/bounded results allowed; no mandatory mapper layer.

## 21. Transaction Boundary

Service owns business/settings transactions through Laravel transaction primitive; Service no business queries; repositories participate. No custom UnitOfWork.

## 22. Eloquent Model Boundary

Persistence representation/relationships/casts only; no hidden multi-step orchestration.

## 23. Repository Bindings

Service container contract→implementation mapping.

---

# PART E — INFRASTRUCTURE ADAPTERS

## 24. Contract / Adapter Rule

Use focused contracts such as MalwareScanner, PrivateStorage, SpreadsheetRenderer, PdfSigner, PdfVerifier. Storage implementation current baseline is Flysystem/Laravel local private storage.

## 25. Infrastructure Failure Semantics

Scanner uncertainty != CLEAN; signing fail != READY Approved PDF; storage fail != accepted chunk/artifact; renderer fail no HTML fallback.

---

# PART F — IDENTITY / AUTHORIZATION / SETTINGS

## 26. Identity & Authentication

Responsibilities:

- username/password;
- throttling;
- DB sessions;
- server-generated temporary password + one-time admin reveal + forced change;
- idle30m / absolute8h / max2;
- third valid login revokes oldest active session;
- logout/revocation;
- disablement;
- protected Superadmin;
- 15-minute sensitive current-password re-auth proof.

No MFA.

## 27. User / Team / Role Administration

Users + Team + Spatie roles/permissions + reset. No Unit/Division/scope. Team mutation no auth change by itself.

## 28. Authorization

Valid session + permission + resource auth + ownership where explicit + state/archive/validation/security/protected invariants/concurrency. Team absent.

## 29. Spatie Boundary

Package-owned roles/permissions/pivots; no second permission engine.

## 30. Spatie Teams / Direct Permissions / Wildcards

```text
teams=false
wildcard=false
direct-user permission admin UI absent
single guard=web
```

## 31. Protected Core Settings

Technical Log automatic cleanup/retention is current protected application-configurable setting.

Eligibility:

```text
Protected Superadmin identity
+ system.settings.manage
+ valid authenticated session
+ current-password re-auth proof <=15 minutes
```

Typed setting:

```text
Automatic Cleanup: ON/OFF
Retention Value: positive integer
Retention Unit: DAY|MONTH
Default: ON + 30 DAY
No fixed product maximum
```

This setting MUST NOT alter authoritative Business/Access/Security Audit retention.

Settings mutation is Service-owned transaction + typed Repository persistence + Security Audit. Cleanup execution is separate scheduled Service work, never synchronous deletion inside the settings update request.

---

# PART G — NSCMF CORE / WORKFLOW

## 32. NSCMF Core

Seven business states only. Activation/Change typed data. Technical settings/status not business status.

## 33. Workflow Iteration

First Submit=1; normal Return/Revision same; Reopen from Rejected/Approved→next iteration.

## 34. Workflow Service

Explicit submit/cancel/review*/approval*/reopen/archive/unarchive methods. No generic status destination method.

## 35. Workflow Repository

Persistence/locks/iteration/sign-off only; no transition eligibility policy.

---

# PART H — AUDIT / TECHNICAL LOGS

## 36. Business Audit

Append-oriented authoritative business evidence, no age purge.

## 37. Access Audit

Separate access evidence, no age purge.

## 38. Security Audit

Auth/credential/RBAC/session/malware/signing/protected-settings evidence, no age purge, no plaintext secrets.

## 39. Technical Logs

Separate operational diagnostics.

Default automatic cleanup = ON + 30 DAY, but Protected Superadmin may choose ON/OFF and positive DAY/MONTH retention. No fixed product maximum.

TechnicalLogCleanupService reads current typed setting and may delete/rotate only Technical Logs. It MUST NOT use Business/Access/Security Audit repositories as cleanup targets.

---

# PART I — DATA OWNERSHIP / STORAGE

## 40. Structured Business Data

MySQL authoritative current structured state.

## 41. Team

Ordinary relational organizational data, no RBAC scope.

## 42. Official Template

Versioned XLSX binary = exact export presentation authority. Immutable private binary, registered template version, SHA-256, mapping version. New template creates new version. Readiness verifies configured binary hash.

## 43. Attachments / Resumable Storage

```text
MySQL → upload session/chunk/ownership/status/expiry metadata
Laravel private local persistent storage → chunk bytes + assembled quarantine + final attachments
Browser → local fingerprint/progress hint only
```

Initial production does not require S3-compatible/object storage. Laravel Filesystem abstraction remains so future migration is possible without business-rule rewrite.

## 44. Generated Export Binary

Temporary derived private artifact 168h/7d on persistent Laravel private local storage.

## 45. Immutable Export Snapshot

Created synchronously at request time; worker never substitutes later data.

## 46. Issuance Metadata

Signed PDF historical hash/cert/iteration context survives binary cleanup.

---

# PART J — SYNCHRONOUS REQUEST PATHS

## 47. Login

Throttle→verify→session regenerate/create→if two active sessions already exist revoke oldest→temp-password gate if applicable→app.

## 48. Record Read

Auth→Controller→Service→Policy/Gate→Repository→Access Audit as required→Inertia.

## 49. Sensitive Administration

Current-password re-auth→Controller→Service→permission/protected invariant→Spatie/repository mutation→affected-session revocation→audit.

## 50. Protected Settings

```text
Protected Superadmin
→ current-password re-auth <=15m
→ Controller
→ SystemSettingsService
→ validate permission + protected identity
→ transaction
→ SystemSettingsRepository lock/update
→ Security Audit
→ commit
```

No cleanup execution inside this transaction.

---

# PART K — CONCURRENCY / TRANSACTIONS

## 51. Strategy

Workflow row locks; Draft/Revision/Result optimistic version; upload chunk idempotency; settings singleton row lock/update. No long external I/O while workflow/settings transaction locks are held.

## 52. Workflow Transaction

Authorize→BEGIN→lock current record→recheck→persist transition/iteration/sign-off→Business Audit→version++→COMMIT.

## 53. Optimistic Persistence

Expected record_version; mismatch conflict.

## 54. Service Transaction Rule

Service begin/commit/rollback; repositories no cross-use-case commit.

---

# PART L — RESUMABLE ATTACHMENT ARCHITECTURE

## 55. Upload Model

Browser optional fingerprint→Service initiate/resume→5MiB chunks→persistent local private storage→server chunk SHA→repository metadata→reconcile accepted/missing→missing only→complete→async finalization.

## 56. Retention

24h since last newly accepted progress; identical retry not indefinitely refresh.

## 57. Finalization

Verify complete set→assemble privately→server final SHA256→final type/size→whole-file ClamAV→CLEAN promote or fail closed.

## 58. Chunk Failure / Idempotency

Acknowledged chunks remain until completion/cancel/expiry; byte-identical replay safe; conflicting bytes rejected; process restart does not erase valid persistent progress.

## 59. Attachment Download

Only CLEAN + parent authorization. Temporary/non-clean never normal-download resource.

---

# PART M — EXPORT / SIGNING / PUBLIC VERIFY

## 60. Export Request

Authorize→short transaction→request+immutable snapshot+version/iteration/template→commit→dispatch job after commit.

## 61. Worker

Job→Service→bound snapshot→exact template→targeted OOXML→integrity→XLSX or renderer→mandatory Approved PDF signer→final hash/issuance→private READY.

## 62. Rules

XLSX/PDF only; exact template; no generic rewrite; XLSX not signed; Approved PDF mandatory System/Organization signature; no unsigned fallback.

## 63. Retention

READY binary 168h; source/audit/issuance preserved.

## 64. Signer Identity / Key Custody

Human Approved By distinct. Production private key through protected runtime mounted file/secret reference or equivalent; never GitHub/source/ordinary DB/browser/log. Public cert material can remain registered for historical verification. Exact library/provider/CA/path/rotation deferred.

## 65. Public Verification

No-login PDF only, max20MB, private temp, CLEAN, signature, exact SHA, issuance/currentness, minimum disclosure, cleanup. Outcomes Current/Superseded/Modified/Unknown.

No TSA.

---

# PART N — QUEUE / SCHEDULER / COMMANDS

## 66. Queue Principle

Jobs thin technical entry points to Services; coarse-grained FinalizeAttachmentUploadJob and GenerateNscmfExportJob.

## 67. Scheduler

Responsibilities:

- clean upload sessions/chunks after 24h inactivity;
- abandoned assembly/quarantine cleanup;
- generated export binary cleanup after 168h;
- Technical Log age cleanup only when protected setting is ON and according to current DAY/MONTH value;
- preserve Business/Access/Security Audit and PDF issuance metadata;
- never auto-advance workflow.

## 68. Failure Isolation

No partial workflow; no stale overwrite; upload progress durable while persistent storage+DB healthy; storage fail no false success; scanner uncertainty not CLEAN; renderer/signing fail export; public verification uncertainty never VALID_CURRENT.

---

# PART O — REPOSITORY / SERVICE GUARDRAILS

## 69. Allowed Relationships

Controller→Service; Service→Repository/Policy/domain/infrastructure/transaction primitive; Repository Implementation→Eloquent; Job/Command→Service.

## 70. Forbidden Relationships

Controller→DB/Repository/business orchestration; Service→Eloquent business query; Job→DB/Repository business flow; Repository→HTTP/workflow policy; Model→multi-step use case; adapter→business state authority.

## 71. No DTO Architecture

No mandatory DTO-per-endpoint/model/read/mapper/spatie-data architecture. Complex validated arrays explicitly mapped.

## 72. No Generic BaseRepository

Meaningful persistence operations only.

## 73. No God Service

Cohesive capability grouping.

## 74. Exception / Error Handling

No catch-ignore false success; safe translation/centralized error handling.

---

# PART P — SCALE / OBSERVABILITY

## 75. 50-User Baseline

MySQL + DB queue/session/cache + modular monolith remains sufficient. No Redis/Kafka/upload microservice justified.

## 76. Minimum Signals

Safely monitor/log app errors, auth/throttle, authorization denials, conflicts, queue, upload/assembly, scanner, export, template/renderer/signing, validator abuse, scheduler/storage, protected-setting changes.

Never log password/temp plaintext/private key/passphrase/session secrets/raw chunks.

---

# PART Q — IMPORTANT SEQUENCES

## 77. Draft Save

Controller→Form Request→NscmfDraftService→permission/ownership→transaction→repository optimistic check/persistence→Business Audit→version++→commit.

## 78. Submit

Controller→NscmfWorkflowService→permission/ownership→transaction→lock→validate→iteration→PENDING_REVIEW→Business Audit→version++→commit.

## 79. Reviewer Forward

Service→permission→lock→PENDING_REVIEW→Result gate→Reviewed By→PENDING_APPROVAL→Business Audit.

## 80. Approve Race

A locks/Approves; B later sees changed state and conflicts. One final Approved By.

## 81. Reopen

Approved/Rejected→permission/not archived/reason/target→locked transaction→next iteration→Revision/Review→Audit.

## 82. Resumable Attachment

Select→initiate/resume→persistent 5MiB chunks→interruption→server reconciliation→missing only→complete→finalize→server hash→full ClamAV→CLEAN.

## 83. Approved PDF

Request→immutable snapshot→queue→exact template→renderer→signer→final hash/issuance→private READY168h.

## 84. Create / Reset Temporary Password

Admin re-auth <=15m→UserAdministrationService/CredentialService→server generates plaintext transiently→store hash/must-change only→Security Audit→one-time no-store reveal→plaintext discarded.

## 85. Technical Log Settings / Cleanup

```text
Protected Superadmin setting update
→ re-auth <=15m
→ SystemSettingsService transaction
→ typed setting + Security Audit

Later scheduler
→ TechnicalLogCleanupService
→ reads setting
→ OFF: no age cleanup
→ ON: calculate DAY/MONTH threshold
→ clean Technical Logs only
```

---

# PART R — CONFIRMED ARCHITECTURE DECISIONS

## 86. Summary

| Concern | Decision |
|---|---|
| Organization | single organization; Team ordinary data |
| Team authorization | none |
| RBAC | Spatie Permission8; package schema; teams/wildcards off |
| Backend | Laravel modular monolith + pragmatic Repository–Service |
| Orchestration | Service only; no Actions |
| Persistence | Repository Contract→Eloquent implementation |
| DTO | none current MVP |
| DB | MySQL8.4 |
| Session/cache/queue | DB-backed |
| Session replacement | third login succeeds, oldest revoked |
| Re-auth | 15 minutes |
| Temporary credential | server-generated, one-time admin reveal |
| Workflow | row lock; optimistic editable versioning |
| Audit | Business/Access/Security permanent by age |
| Technical Log | protected configurable cleanup; default ON/30 DAY |
| Attachment | resumable 5MiB/24h; full-file CLEAN |
| Initial prod storage | persistent Laravel private local filesystem |
| Template | immutable/versioned/private/SHA256 |
| Export | async exact XLSX/PDF + immutable snapshot |
| Approved PDF | mandatory org signing |
| Public validator | signature/hash/issuance/currentness, max20MB |
| Binary retention | 168h |
| Timezone | canonical Asia/Jakarta |
| Environment classes | local/development, testing, CI, staging, production |
| TSA | none MVP |

---

# PART S — DEVELOPER / AI GUARDRAILS

## 87. MUST NOT

No hidden multi-tenancy/Unit/Division/scope/Team auth/Spatie Teams/duplicate RBAC/wildcards/Actions/Controller DB/Service Eloquent/Job DB/generic repository/mandatory DTO/workflow lock during long I/O/stale overwrite/audit omission/public storage/browser final-hash trust/per-chunk-scan substitute/upload COMPLETED=CLEAN/HTML PDF/live export/unsigned Approved PDF/private key source/DB/browser/TSA/public record portal/audit-age purge/Redis/Kafka without evidence.

Additionally MUST NOT:

- require S3/object storage for current MVP;
- store acknowledged production chunks only on ephemeral filesystem;
- make Technical Log cleanup a Business/Access/Security Audit cleanup mechanism;
- hard-code 30-day Technical Log retention as immutable;
- allow non-Protected-Superadmin Core Settings mutation;
- make temporary password admin-entered/retrievable later;
- accept public validator PDF >20MB;
- ignore canonical `Asia/Jakarta` in runtime handoff.

---

# PART T — ACCEPTANCE / DOWNSTREAM

## 88. Architecture Acceptance

Controller→Service; Service transaction; repository contracts; no Actions/DTO/generic repository; Jobs→Services; infrastructure adapters; Spatie runtime authority; typed SystemSettings boundary.

## 89. Authorization / Concurrency / Audit Acceptance

No tenant/Team scope; workflow locks; optimistic editable saves; authoritative audits no age purge; protected settings need Protected Superadmin + 15m re-auth.

## 90. Attachment / Export Acceptance

5MiB/24h resumable persistent local storage; server final hash; full-file CLEAN; immutable snapshot; exact template; signed Approved PDF; max20MB public validator; 168h artifact cleanup.

## 91. Schema Relationship

`11` authoritative for physical schema including typed `system_settings`; `11A` authoritative for resumable additions.

## 92. API Relationship

`12` authoritative for routes/payloads/errors including one-time temp credential, 15-minute re-auth, max20MB validator, settings endpoints.

## 93. Project Structure Relationship

`13` authoritative for Controller/Service/Repository/Infrastructure/Settings physical placement.

## 94. Remaining TBD

Still deferred:

- exact Team master data;
- official numbering SOP;
- bulk packaging;
- exact numeric rate-limit buckets;
- signing provider/library/path/rotation;
- notification;
- exact ClamAV physical topology/sizing;
- exact renderer executable/provider/topology;
- exact private local storage root/mount/prefix values;
- backup/DR/RPO/RTO;
- performance/availability;
- exact physical production deployment topology.

No longer TBD: temp credential direction, re-auth lifetime, third-login behavior, public validator max upload, initial storage class, canonical timezone, Technical Log cleanup policy/default.

## 95. Authority Matrix

`01` Product; `02` Business; `03` Flow; `04` RBAC; `05` State; `06` Validation; `07` UI; `08` Tech; **`09` Logical Architecture**; `10` Security; `11` Schema; `12` API; `13` Structure; `14` Environment once created.

## 96. Current Documentation Handoff

Documents through `13_Project_Structure.md` exist. Next fixed-order document to create **only after explicit user instruction**:

**`14_Environment_Specification.md`**.

`14` MUST operationalize `Asia/Jakarta`, the five environment classes, MySQL/session/queue/cache, persistent Laravel private local storage, ClamAV/renderer connectivity/configurability, official template provisioning/hash readiness, protected signing identity, 15-minute re-auth, max20MB public validator, scheduler tasks, Technical Log settings-driven cleanup, and secret handling without redefining logical architecture.