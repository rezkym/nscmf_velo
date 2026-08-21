# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Architecture Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk logical system architecture, component boundaries, interaction topology, synchronous/asynchronous execution boundaries, transaction/concurrency model, audit separation, attachment flow, dan export subsystem architecture** NSCMF Digital Form & Workflow System.

Dokumen ini menerjemahkan technology selection pada `08_Tech_Stack_Specification.md` menjadi bentuk sistem yang dapat diimplementasikan tanpa mengubah product/business decisions pada `01–07`.

Dokumen ini mengunci antara lain:

- single-organization architecture;
- modular monolith boundary;
- Browser ↔ Laravel/Inertia/Vue interaction topology;
- application/domain module responsibilities;
- MySQL source-of-truth responsibilities;
- private attachment storage boundary;
- business audit vs access audit vs technical logging;
- hybrid concurrency strategy;
- workflow transaction boundary;
- Draft/Result optimistic concurrency path;
- asynchronous export architecture;
- exact-template XLSX generation pipeline;
- qualified PDF renderer boundary;
- cryptographic PDF signing boundary;
- seven-day temporary export retention;
- scheduled artifact cleanup;
- failure isolation and idempotency expectations;
- component dependency guardrails.

Dokumen ini **tidak** menentukan final database tables/columns, API payloads, exact folder structure, environment variables, password/session policy, certificate/private-key implementation, production cloud/server topology, atau deployment provider. Hal tersebut berada pada dokumen downstream sesuai authority matrix.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — direkomendasikan kuat sebagai default.
- **MAY** — diperbolehkan.
- **AUTHORITATIVE** — komponen/data tersebut adalah source of truth untuk concern yang disebutkan.
- **QUALIFIED** — komponen hanya boleh digunakan pada production setelah acceptance/golden qualification yang diwajibkan.
- **TBD** — belum final dan tidak boleh ditebak implementation.

---

# PART A — ARCHITECTURAL DRIVERS

## 3. Confirmed Drivers from `01–08`

Architecture MUST mendukung requirement yang telah dikunci sebelumnya:

1. aplikasi web internal;
2. **single organization** / satu instalasi aplikasi;
3. standalone username + password authentication;
4. no self-registration;
5. protected Superadmin;
6. multi-role granular RBAC;
7. Requester ownership + Reviewer Unit/Division Scope + Approver Approval Scope;
8. server-side authoritative authorization/validation/state enforcement;
9. Activation dan Change forms;
10. Draft autosave + manual Save Draft;
11. shared/non-exclusive Reviewer pool;
12. shared/non-exclusive Approver pool;
13. one successful eligible final Approver sufficient;
14. revision/reject/reopen/archive lifecycle sesuai `05`;
15. narrow Change Result capture pada `PENDING_REVIEW`;
16. detailed business audit;
17. viewer/access evidence terpisah dari business timeline;
18. optional private attachments;
19. History/search/filter melalui MySQL;
20. user dapat memilih **Export XLSX** atau **Export PDF**;
21. XLSX/PDF export mempertahankan official workbook secara exact;
22. XLSX export tidak memerlukan cryptographic digital signature;
23. hanya PDF dari snapshot `APPROVED` yang cryptographically signed;
24. intended signer identity = **system/organization**, bukan personal certificate Approver;
25. certificate/private-key implementation final diputuskan di `10_Security_Rules.md`;
26. seluruh export diproses asynchronous melalui Database Queue;
27. generated export artifact dapat di-download ulang selama **168 jam / 7 hari**;
28. expired export artifact dibersihkan otomatis oleh scheduled cleanup;
29. actual user count sekitar 10, engineering baseline 50 users;
30. Docker/container diperbolehkan;
31. no WebSocket/realtime requirement pada MVP;
32. testing dan export golden qualification merupakan first-class requirement.

---

## 4. Architectural Priorities

Jika terdapat trade-off implementasi, prioritas architecture adalah:

1. business correctness;
2. authorization correctness;
3. workflow/state consistency;
4. auditability/traceability;
5. no data loss;
6. exact export fidelity;
7. predictable failure behavior;
8. maintainability;
9. simplicity sesuai scale;
10. performance optimization berdasarkan evidence, bukan premature complexity.

Architecture MUST NOT mengorbankan correctness hanya untuk mengurangi satu database query atau menghindari transaction/validation yang diperlukan.

---

# PART B — ARCHITECTURE STYLE

## 5. Modular Monolith

Confirmed architecture style:

```text
Modular Laravel Monolith
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
+ Database Queue Worker
+ Private Storage
+ Isolated Export/Renderer Boundary
```

Aplikasi **bukan microservices architecture**.

Logical modules dipisahkan melalui code boundaries dan explicit responsibilities, tetapi berada dalam satu Laravel application/runtime contract.

MUST NOT membuat network service boundary hanya agar setiap module terlihat “microservice-like”.

---

## 6. Single-Organization Model

System merupakan satu application installation untuk satu organization.

Consequences:

- tidak ada tenant switcher;
- tidak ada tenant middleware;
- tidak ada tenant-specific hostname requirement;
- tidak perlu `tenant_id` pada setiap business entity hanya untuk artificial tenancy;
- Unit/Division adalah **organizational scope di dalam organization yang sama**, bukan tenant;
- Approval Scope adalah domain authorization scope, bukan tenant boundary.

Jika future requirement membutuhkan multiple independent organizations pada satu installation, architecture MUST direview sebagai explicit change; implementation MUST NOT pre-build hidden multi-tenancy sekarang.

---

## 7. Deployment-Agnostic Logical Architecture

`09` mendefinisikan logical components, bukan jumlah final container/server.

Contoh komponen logical seperti:

- Web/Application Runtime;
- Queue Worker;
- Scheduler;
- MySQL;
- Private Object Storage;
- Spreadsheet Renderer;

MAY pada development berada dalam Docker Compose dan pada production ditempatkan berbeda sesuai `20_Deployment_Architecture.md`.

Logical separation tidak berarti masing-masing harus menjadi server terpisah.

---

# PART C — SYSTEM CONTEXT

## 8. High-Level Context

```text
+------------------------+
| Internal User Browser  |
| Vue 3 + Inertia UI     |
+-----------+------------+
            |
            | HTTPS / application requests
            v
+---------------------------------------------------+
| Laravel 13 Application                            |
|---------------------------------------------------|
| Authentication / Authorization / Scope            |
| NSCMF Domain / Validation / Workflow              |
| Business Audit / Access Audit                     |
| History / Attachment / Export Orchestration       |
+---------+------------------+----------------------+
          |                  |                 |
          | SQL              | private I/O     | queue jobs
          v                  v                 v
+----------------+   +----------------+   +------------------+
| MySQL 8.4 LTS  |   | Private Storage|   | Database Queue   |
| Source of Truth|   | Attachments +  |   | + Queue Worker   |
|                |   | Export Artifacts|  +--------+---------+
+----------------+   +----------------+            |
                                                   v
                                      +------------------------+
                                      | Exact Export Subsystem |
                                      | OOXML Template Patcher |
                                      | Spreadsheet Renderer   |
                                      | PDF Signing Service    |
                                      +------------------------+
```

Scheduled cleanup runs through Laravel Scheduler/cron-compatible execution and removes expired temporary export artifacts.

---

## 9. Trust Boundary Summary

Conceptual trust boundaries:

```text
Untrusted / user-controlled
Browser input
Uploaded file content
Request IDs / query params

Trusted application authority
Laravel authorization
Domain/application services
MySQL transactional state
Authoritative audit writes

Protected external/internal resources
Private attachment storage
Official XLSX templates
Renderer runtime
PDF signing key/certificate boundary
```

Exact authentication hardening, encryption, secret storage, certificate custody, and network restrictions are specified in `10_Security_Rules.md` and deployment documents.

---

# PART D — APPLICATION LAYERS

## 10. Presentation Layer

Presentation layer terdiri dari:

- Vue 3 pages/components;
- TypeScript interaction logic;
- Inertia page props/request flow;
- shadcn-vue UI components;
- Tailwind CSS styling.

Responsibilities:

- present data;
- local form interaction;
- conditional UI;
- autosave status UX;
- table/filter interaction;
- reason dialogs;
- export status/progress display;
- stale-state feedback.

MUST NOT menjadi authoritative layer untuk:

- permission;
- scope;
- state transition validity;
- final field validation;
- archive eligibility;
- export access;
- PDF signing eligibility.

---

## 11. HTTP / Inertia Boundary

Laravel routes/controllers/Form Requests menjadi entry boundary dari Browser ke application layer.

Pattern:

```text
Browser
→ Route
→ Authentication middleware
→ Authorization / Policy
→ Form Request / action validation
→ Application action/service
→ transaction/persistence if needed
→ Inertia response / redirect / structured internal response
```

Controllers SHOULD coordinate request/response only; domain behavior tidak boleh tersebar menjadi controller-heavy logic.

---

## 12. Application Action Layer

Application action/service layer mengorkestrasi satu business use case.

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
ReturnToReviewer
ReturnToRequester
ReopenNscmf
ArchiveNscmf
UnarchiveNscmf
RequestNscmfExport
```

Responsibilities:

- load required domain data;
- call authorization/scope checks;
- select validation profile;
- establish transaction/locking boundary;
- call domain state transition rules;
- persist data;
- write authoritative business audit;
- return deterministic action result.

Exact class/folder naming later mengikuti `13_Project_Structure.md`.

---

## 13. Domain Rule Layer

Domain rule layer merepresentasikan invariant yang berasal dari `02`, `04`, `05`, dan `06`.

Examples:

- state transition eligibility;
- Result Forward gate;
- Cancel eligibility;
- Reopen destination restrictions;
- Archive eligibility;
- Request No immutability;
- scope interpretation;
- protected Superadmin invariants.

Domain rules MUST dapat diuji tanpa bergantung pada Vue UI.

---

## 14. Persistence Layer

MySQL/Eloquent/Query Builder bertanggung jawab untuk persisted relational state.

Application SHOULD use repository/query abstractions only when they reduce complexity or enforce clear domain boundaries; generic repository layer yang hanya membungkus setiap Eloquent call tanpa value MUST NOT diwajibkan.

---

# PART E — LOGICAL MODULES

## 15. Identity & Authentication Module

Responsibilities:

- username/password authentication;
- session creation/destruction;
- active/disabled account enforcement;
- protected Superadmin identity integration;
- admin-triggered credential reset integration.

Technology: Laravel/Fortify/session authentication from `08`.

Security policy detail belongs to `10`.

---

## 16. User / Role / Organization Administration Module

Responsibilities:

- users;
- roles/permissions;
- Unit/Division;
- Reviewer Scope;
- Approval Scope;
- protected settings exposure according to authorization.

Spatie Laravel Permission provides role/permission primitive only. Unit/Division and Approval Scope remain explicit NSCMF domain data.

---

## 17. Authorization & Scope Module

Authorization is composed from:

```text
Spatie permission
+ Laravel Policy/Gate
+ ownership
+ Unit/Division Reviewer Scope
+ Approval Scope
+ business status
+ archive treatment
+ protected invariants
```

The module MUST expose reusable query/action eligibility logic so queue/history/export endpoints do not create separate inconsistent scope rules.

---

## 18. NSCMF Core Module

Responsibilities:

- NSCMF record identity;
- family/subtype;
- Request No;
- owner/requester;
- current business status;
- archive treatment;
- form data relationships;
- current version/concurrency token;
- references to attachment/audit/export metadata.

Exact schema belongs to `11_ERD_Database_Schema.md`.

---

## 19. Activation Form Module

Responsibilities:

- Activation subtype data;
- Existing/New Service blocks;
- network/NOC technical data;
- domain/DNS/hosting/onsite data;
- Activation-specific validation mapping.

It shares general NSCMF workflow; it MUST NOT create separate state machine.

---

## 20. Change Form Module

Responsibilities:

- Change purpose/context;
- multi-select Service Impact;
- Improvement Plan/KPI;
- execution/monitoring/rollback;
- Result of Changes;
- Change-specific validation and Forward gate.

It shares general NSCMF workflow; Result capture MUST NOT create artificial execution/result business states.

---

## 21. Validation Module

Maps canonical validation profiles from `06`, including:

```text
DRAFT_PERSIST
FIRST_SUBMIT
RESUBMIT
REVIEW_FORWARD
APPROVAL_ACTION
WORKFLOW_RETURN
WORKFLOW_REJECT
CANCEL
REOPEN
ARCHIVE
UNARCHIVE
RESULT_CAPTURE
```

Validation module SHOULD combine:

- Laravel Form Requests;
- reusable Rule classes;
- domain cross-field validators.

MUST avoid one giant validation function with hidden state-dependent branches that are difficult to test.

---

## 22. Workflow Module

Workflow Module is authoritative coordinator for business-status transitions.

Canonical statuses remain exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Responsibilities:

- action eligibility;
- current-state revalidation;
- transaction/lock coordination;
- state mutation;
- workflow iteration context;
- authoritative workflow audit event;
- final `Approved By` association.

MUST NOT introduce persistent `SUBMITTED`, `UNDER_REVIEW`, `REVIEWED`, `REOPENED`, `ARCHIVED`, `EXECUTION_PENDING`, or `RESULT_PENDING` state.

---

## 23. Business Audit Module

Business Audit is authoritative evidence of **persisted business mutation dan workflow/lifecycle action**.

Includes logically:

- create;
- Draft/Revision persisted field change;
- Result capture;
- numbering change;
- attachment mutation reference;
- submit/resubmit;
- forward;
- return;
- reject;
- approve;
- reopen;
- archive/unarchive;
- relevant administration changes.

Business audit MUST be append-oriented and historical evidence MUST NOT be overwritten by current-state updates.

---

## 24. Access Audit Module

Access Audit is **separate from Business Timeline**.

Purpose:

- preserve evidence that an authorized actor accessed a record/resource;
- avoid polluting operational timeline with frequent `Viewed` rows.

Conceptual access events MAY include:

- record detail viewed;
- attachment accessed/downloaded;
- export requested;
- generated export downloaded.

Rules:

- access event MUST NOT change NSCMF business state;
- access event MUST NOT make viewer an assignee/owner;
- access audit storage is logically separate from business mutation/workflow timeline;
- normal Form Detail Timeline SHOULD remain focused on business/workflow changes;
- exact retention, visibility, strict failure behavior, and security administration are finalized by `10_Security_Rules.md` / `11_ERD_Database_Schema.md`.

---

## 25. Technical Logging Module

Laravel/application logs are for:

- errors/exceptions;
- queue failures;
- renderer failures;
- operational diagnostics;
- scheduler failures;
- integration/runtime issues.

Technical logs MUST NOT replace Business Audit or Access Audit.

Architecture therefore maintains three separate concerns:

```text
Business Audit  → what business data/workflow changed
Access Audit    → who accessed protected record/resource
Technical Logs  → how software/runtime behaved
```

---

## 26. History / Query Module

Responsibilities:

- own/scoped History;
- Review queue;
- Approval queue;
- active/archived filtering;
- Request No/search filters;
- pagination/sorting;
- record detail query;
- timeline projection from Business Audit.

All query paths MUST reuse authorization/scope rules and MUST NOT expose inaccessible records through row results, counts, filters, or bulk selection.

---

## 27. Attachment Module

Responsibilities:

- validate attachment request against `06`;
- store private object through Laravel Filesystem/Flysystem;
- persist storage metadata/reference;
- authorize read/download;
- remove/replace references only in allowed editable context;
- emit relevant business audit mutation.

File binary is not stored as public web asset.

---

## 28. Export Module

Export Module is composed of distinct logical components:

```text
Export Orchestrator
Export Snapshot / Version Binding
Template Registry
OOXML Template Patcher
Workbook Integrity Validator
SpreadsheetPdfRenderer adapter
PdfSigningService
Export Artifact Repository
Export Job / Worker
Export Cleanup Scheduler
```

This separation prevents renderer, OOXML patching, signing, and HTTP concerns from becoming one large untestable service.

---

# PART F — DATA OWNERSHIP / SOURCE OF TRUTH

## 29. Structured Business Data

**MySQL is authoritative source of truth** untuk structured NSCMF business data and current lifecycle state.

Exported XLSX/PDF is output, not source of truth.

If a downloaded XLSX is edited externally, those edits do not mutate application data and cannot be imported back implicitly.

---

## 30. Current Status

Current business status is persisted in the NSCMF relational model according to ERD.

Audit events preserve historical transitions, tetapi current-state queries MUST NOT reconstruct current status by guessing from frontend state or downloaded documents.

---

## 31. Business Audit

Business Audit store is authoritative historical evidence for persisted business mutations/workflow actions.

It is separate from technical application logs.

---

## 32. Access Audit

Access Audit store is authoritative for configured viewer/access evidence.

It is **not** the normal business timeline source.

---

## 33. Attachments

Attachment binary lives in private storage.

MySQL stores authoritative metadata/reference needed to associate binary with record and authorization context.

Object existence alone MUST NOT grant access.

---

## 34. Official Export Template

Official XLSX template binary + template version/integrity metadata forms the visual/export source of truth.

Application business data remains MySQL source of truth for **what values** are exported.

Conceptual:

```text
MySQL structured data = content truth
Official XLSX template = presentation/export truth
```

---

## 35. Generated Export Artifact

Generated XLSX/PDF is a **temporary derived artifact**.

It is not authoritative record data and has finite retention of 168 hours.

---

# PART G — SYNCHRONOUS REQUEST PATHS

## 36. Login Path

```text
Browser
→ POST Login
→ Laravel/Fortify
→ find username
→ verify password/account eligibility
→ create DB-backed session
→ redirect/Inertia Dashboard
```

Login failure MUST NOT create authenticated session.

Security details such as throttling/lockout belong to `10`.

---

## 37. Read / View Path

```text
Browser
→ request record
→ authenticate
→ Policy + visibility/scope check
→ query structured record
→ optionally write separate Access Audit event
→ return Inertia record detail
```

Important:

- viewing does not change business status;
- viewing does not create exclusive Reviewer/Approver ownership;
- view/access evidence is not inserted as a normal business timeline state/action row.

---

## 38. History / Queue Query Path

```text
Browser
→ filter/search request
→ authenticate
→ resolve effective permissions/scopes
→ build scoped MySQL query
→ paginate/sort
→ return only visible rows/counts
```

Filtering MUST occur within authorized query scope; application MUST NOT fetch global records then hide unauthorized rows only in Vue.

---

# PART H — HYBRID CONCURRENCY MODEL

## 39. Confirmed Strategy

Architecture uses **hybrid concurrency**:

```text
Workflow / lifecycle transitions
→ pessimistic row-level lock inside short DB transaction

Draft / Revision / Result persistence
→ optimistic version check
```

This balances correctness with normal form-editing usability.

---

## 40. Workflow Transition Locking

Workflow-changing actions MUST use a transaction and lock current NSCMF row for update before final current-state decision.

Conceptual:

```text
BEGIN TRANSACTION

SELECT NSCMF ... FOR UPDATE

re-check:
  authenticated actor
  permission
  ownership/scope
  archive flag
  current business state
  validation profile
  destination/action eligibility

apply state mutation
write authoritative business audit
update relevant sign-off/current metadata

COMMIT
```

If any requirement fails:

```text
ROLLBACK / no mutation
```

Exact Eloquent/SQL expression belongs to implementation, but behavior is mandatory.

---

## 41. Why Lock After Initial Authorization Is Not Enough

Frontend/UI state and pre-transaction reads can become stale.

Therefore final state eligibility MUST be evaluated against the row state inside transaction/lock boundary.

Example:

```text
Reviewer A and Reviewer B both open PENDING_REVIEW.
A obtains lock → Forward → commits PENDING_APPROVAL.
B later obtains lock → sees PENDING_APPROVAL.
B's Reviewer Reject is invalid and is denied.
```

Only A's successful transition is persisted for that action race.

---

## 42. Short-Lived Lock Rule

Row lock MUST cover only necessary server-side transaction work.

MUST NOT:

- hold DB transaction while user is reading a modal;
- hold row lock during browser interaction;
- call long-running PDF renderer while transaction open;
- upload large files while transaction lock is held;
- wait for queue worker inside workflow transaction.

---

## 43. Draft / Revision Optimistic Versioning

Editable Draft/Revision persistence SHOULD/MUST use explicit record version/concurrency token.

Conceptual request:

```text
record_id
expected_version = 17
changed editable payload
```

Server:

```text
authorize ownership/editability
validate DRAFT_PERSIST

UPDATE record
SET ...,
    version = version + 1
WHERE id = ?
  AND version = 17
  AND state remains editable
```

If zero eligible row/update due version mismatch, return stale-write/conflict outcome; MUST NOT silently overwrite newer persisted edits.

Exact schema/HTTP status code belongs to ERD/API Contract.

---

## 44. Change Result Optimistic Versioning

Narrow `Result of Changes` persistence during `PENDING_REVIEW` uses equivalent optimistic concurrency principle.

Server MUST additionally enforce:

```text
record family = CHANGE
state = PENDING_REVIEW
not archived
actor eligible for nscmf.change.result.edit
only Result fields being mutated
```

A stale Result update MUST NOT overwrite newer Result data or planning data.

---

## 45. Autosave Conflict UX Boundary

Backend returns an explicit stale/conflict result.

Vue UI follows `07` stale-state principles and MUST NOT falsely show `Saved` after version conflict.

Exact merge/reload copy is UI/API implementation detail, but architecture requires conflict to be visible and non-destructive.

---

# PART I — BUSINESS MUTATION TRANSACTION BOUNDARY

## 46. Atomic Workflow Action

For workflow/lifecycle transition:

```text
permission/scope/current-state check
+ business validation
+ state/current metadata update
+ authoritative business audit event
= one atomic DB transaction
```

The system MUST NOT commit state change and then later discover that required workflow audit insert failed.

---

## 47. Business Field Persistence

Draft/Revision/Result field persistence SHOULD write related field-level business audit in the same successful persistence transaction where feasible.

If audit is required for a mutation, successful mutation without required audit evidence is not considered complete.

---

## 48. Side Effects After Commit

Slow/non-transactional side effects MUST happen after successful DB commit.

Examples:

- notification future hook;
- export queue dispatch;
- renderer execution;
- non-critical technical logging.

Do not place external filesystem/rendering operation inside a workflow state transaction.

---

# PART J — ATTACHMENT ARCHITECTURE

## 49. Upload Path

Conceptual upload flow:

```text
Browser
→ Laravel upload endpoint
→ authenticate + permission/state check
→ validate count/type/size
→ write binary to controlled private storage
→ persist attachment metadata/reference
→ write business audit mutation
→ return attachment representation
```

Because database and object storage do not share one ACID transaction, implementation MUST account for partial failure.

---

## 50. Attachment Partial-Failure Handling

Acceptable architecture pattern:

1. authorize/validate before writing;
2. write binary using opaque generated storage identity;
3. create DB metadata/audit transaction;
4. if DB persistence fails, remove/mark orphan object for cleanup;
5. never expose orphan object publicly.

Equivalent compensating pattern MAY be used if Security/Environment design requires it.

MUST NOT treat successful filesystem write alone as successful attachment mutation.

---

## 51. Attachment Download Path

```text
Browser
→ attachment request
→ authenticate
→ authorize parent NSCMF visibility
→ resolve attachment metadata
→ record access audit as configured
→ stream/provide authorized private download
```

Object storage location itself is not authorization.

---

# PART K — EXPORT ARCHITECTURE

## 52. User-Facing Export Choice

Eligible user chooses one of:

```text
Export XLSX
Export PDF
```

Both formats derive from the same official XLSX template + structured NSCMF snapshot.

### XLSX

- exact filled official template;
- native controls preserved;
- no cryptographic PDF-style signature requirement;
- recipient MAY edit local downloaded copy;
- local edits do not alter system record.

### PDF

- exact spreadsheet-rendered representation of filled workbook;
- not generated from HTML redesign;
- if snapshot state = `APPROVED`, cryptographic PDF signature is mandatory;
- if snapshot state != `APPROVED`, PDF remains unsigned unless future business rule changes.

---

## 53. All Export Is Asynchronous

Single and bulk export generation MUST use Database Queue.

HTTP request MUST NOT wait for OOXML patching + spreadsheet rendering + signing to finish.

Conceptual:

```text
User requests export
→ authorize
→ create export request metadata
→ bind immutable record snapshot/version
→ dispatch DB queue job
→ immediately return queued state

Queue Worker
→ generate artifact
→ update export request status

Browser
→ poll/refresh export status
→ download when READY
```

No WebSocket is required.

---

## 54. Export Job State Is Not NSCMF Business State

Export processing MAY use technical job/artifact states conceptually such as:

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

These are **export subsystem states**, not `05_State_Status_Flow.md` NSCMF business statuses.

They MUST NOT appear as replacements/additions to canonical NSCMF lifecycle.

Exact enum/schema belongs to ERD/API Contract.

---

## 55. Export Snapshot Binding

Because export is asynchronous, generated document MUST represent a deterministic record version.

At export request time, architecture MUST bind job to an immutable logical **record snapshot/version**.

This prevents:

```text
User requests export of version 12
→ queue waits
→ another actor changes record to version 13
→ worker unexpectedly exports different content
```

Allowed representation is finalized by ERD, for example:

- immutable revision/version reference; or
- immutable export snapshot payload tied to request.

Architecture requirement is deterministic snapshot semantics, not a specific table design.

---

## 56. Export Authorization Timing

Authorization occurs when export is requested.

Download endpoint MUST also re-check current actor authorization for the artifact/parent record rather than treating possession of predictable artifact ID/path as sufficient access.

Security Rules may add stronger controls.

---

## 57. Template Registry

Export subsystem MUST resolve an approved template version through a logical Template Registry.

Template Registry responsibilities:

- identify official template version;
- provide immutable template binary/location;
- provide integrity/hash metadata;
- select matching mapping definition;
- prevent accidental overwrite of canonical template during generation.

Exact storage location and mapping format belong to Project Structure/Environment.

---

## 58. OOXML Template Patcher

Patcher accepts:

```text
template version
+ export snapshot
+ explicit template mapping
```

and produces filled XLSX by modifying only mapped workbook parts.

MUST preserve all unrelated OOXML package parts.

Primary low-level primitives remain consistent with `08`:

- ZipArchive;
- DOMDocument;
- DOMXPath;
- controlled equivalent implementation.

MUST NOT rebuild spreadsheet layout from scratch.

---

## 59. Workbook Integrity Validator

Before XLSX becomes downloadable or moves to PDF rendering, subsystem MUST run structural/integrity checks defined by `08`/Testing Specification.

Failure:

```text
integrity check fails
→ export job FAILED
→ no corrupted artifact exposed as READY
```

---

## 60. XLSX Export Path

```text
Export Request (format=XLSX)
→ Worker loads bound snapshot
→ resolve template + mapping
→ copy immutable template to private workspace
→ targeted OOXML patch
→ integrity validation
→ store private generated XLSX artifact
→ mark READY + expires_at
```

No PDF signing step applies.

---

## 61. PDF Export Path

```text
Export Request (format=PDF)
→ Worker loads bound snapshot
→ resolve template + mapping
→ targeted OOXML patch
→ integrity validation
→ qualified SpreadsheetPdfRenderer
→ exact-fidelity PDF output
→ signing eligibility decision
→ if APPROVED: PdfSigningService
→ store private PDF artifact
→ mark READY + expires_at
```

If any mandatory stage fails, artifact MUST NOT be marked READY.

---

# PART L — PDF SIGNING ARCHITECTURE

## 62. Signing Eligibility

Confirmed rule:

```text
format = PDF
AND export snapshot business_status = APPROVED
→ cryptographic PDF signing REQUIRED
```

Other current-state PDF exports are unsigned.

XLSX export is unsigned.

---

## 63. Intended Signer Identity

Logical signer identity = **System / Organization**.

This does NOT replace workflow `Approved By`.

Two concepts remain distinct:

```text
Approved By
= eligible human Approver who performed PENDING_APPROVAL → APPROVED

PDF Cryptographic Signer
= organization/system certificate identity applied by PdfSigningService
```

The exported document content still includes authenticated workflow sign-off values mapped from system data.

---

## 64. PdfSigningService Boundary

Architecture MUST expose a dedicated conceptual boundary:

```text
PdfSigningService
```

Responsibilities:

- accept already-rendered exact PDF;
- determine/receive approved signing identity configuration;
- apply cryptographic PDF signature;
- return signed PDF or explicit failure;
- never silently downgrade to unsigned output when signing is mandatory.

Certificate/private key provider, algorithm policy, key protection, rotation, revocation, trust chain, and secret custody are defined in `10_Security_Rules.md`.

---

## 65. Tamper Behavior

Cryptographic signature is used so post-signing PDF modification is detectable by compliant PDF verification software.

Architecture MUST NOT claim PDF is mathematically impossible to edit. Correct guarantee is:

- document MAY technically be modified by capable software;
- modification after signing MUST invalidate/break cryptographic signature verification.

---

## 66. Signing Failure

For an `APPROVED` PDF export:

```text
render success
+ signing failure
= export FAILED
```

MUST NOT:

- deliver unsigned PDF as if equivalent;
- mark artifact READY;
- change NSCMF business status;
- remove prior Approval evidence.

User may retry export after technical issue is resolved.

---

# PART M — EXPORT ARTIFACT RETENTION

## 67. Private Temporary Artifact

Generated XLSX/PDF artifact is stored privately and can be re-downloaded by authorized user while valid.

Retention:

```text
168 hours
= 7 × 24 hours
```

Conceptually:

```text
expires_at = ready_at + 168 hours
```

Exact timezone/storage timestamp representation belongs to ERD/Environment, preferably an unambiguous server timestamp strategy.

---

## 68. Re-Download

While artifact state is READY and not expired:

- eligible user MAY download again;
- download request re-checks authorization;
- access/download may generate Access Audit evidence;
- re-download does not regenerate file unless implementation chooses to after missing artifact/error.

---

## 69. Expiration

After `expires_at`:

- artifact is no longer served as valid ready download;
- scheduler cleanup deletes private binary;
- artifact metadata MAY remain as expired evidence according to ERD/audit policy;
- user MAY request a new export, producing a new artifact from a newly bound snapshot/version.

Retention of export request metadata is separate from binary retention and finalized downstream.

---

## 70. Scheduled Cleanup

Use Laravel Scheduler-compatible cleanup command/job triggered by cron/scheduler infrastructure.

Conceptual:

```text
Scheduler
→ find expired generated export artifacts
→ delete private binary
→ mark/update technical artifact expiry/cleanup metadata
→ log failures for retry/operations
```

Exact cron cadence is **not** fixed here; it must ensure expired artifacts are cleaned in a reasonable bounded period after 168-hour eligibility expires.

`14_Environment_Specification.md` / `20_Deployment_Architecture.md` determine how scheduler process is invoked in each environment.

---

# PART N — QUEUE / WORKER ARCHITECTURE

## 71. Database Queue

MySQL-backed Laravel Database Queue handles asynchronous export jobs.

Queue is operational infrastructure, not source of truth for NSCMF state.

If a job disappears/fails, current NSCMF business record remains intact.

---

## 72. Queue Job Responsibilities

Export job SHOULD receive stable identifiers/reference, not trust arbitrary user payload as authoritative business data.

Worker reloads validated bound snapshot/template metadata from authoritative application persistence.

---

## 73. Idempotency

Export jobs MUST be retry-aware/idempotent.

A retry MUST NOT:

- mutate NSCMF business state;
- create conflicting duplicate READY artifacts under same logical execution without tracking;
- apply repeated uncontrolled mutations to canonical template;
- produce multiple contradictory status rows for one attempt.

Exact unique keys/attempt schema are defined in ERD.

---

## 74. Worker Failure

If worker crashes mid-generation:

- partial temporary files remain private;
- export request is retryable/failed according to queue policy;
- partial file is never exposed as READY;
- cleanup process can remove orphan temporary artifacts;
- NSCMF state remains unchanged.

---

## 75. Renderer Isolation

Spreadsheet renderer is treated as a specialized runtime boundary.

Application Worker invokes renderer adapter rather than embedding renderer-specific assumptions throughout domain code.

Initial candidate is LibreOffice Headless only after qualification.

Renderer process MUST NOT be called during normal workflow DB transaction.

---

# PART O — SCHEDULER ARCHITECTURE

## 76. Scheduler Responsibilities

MVP scheduler has at minimum architecture responsibility for:

- expired export cleanup;
- orphan/temporary export workspace cleanup where applicable;
- future non-blocking scheduled maintenance tasks.

Notification scheduling or security maintenance MAY be added only by later specs.

---

## 77. Scheduler Is Not Business Workflow Engine

Laravel Scheduler MUST NOT be used to simulate Review/Approval state progression automatically unless a future business rule explicitly requires it.

Canonical workflow remains actor/action driven.

---

# PART P — FAILURE ISOLATION

## 78. Database Failure

If MySQL transaction fails:

- workflow action fails;
- state MUST NOT partially advance;
- business audit MUST NOT falsely record success;
- user receives controlled failure/stale response according to API/UI contract.

---

## 79. Private Storage Failure

Attachment/export storage failure MUST NOT corrupt NSCMF business state.

For export:

```text
storage failure → export FAILED
```

For attachment:

```text
storage/metadata failure → attachment mutation not reported as successful
```

---

## 80. Template/Patcher Failure

If template missing, hash/integrity mismatch, mapping invalid, or OOXML patch fails:

- export FAILED;
- no approximate/rebuilt document substitute;
- no mutation to canonical template;
- technical error logged.

---

## 81. Renderer Failure

If qualified renderer fails:

- PDF export FAILED;
- XLSX intermediate remains private/internal according to cleanup policy;
- application MUST NOT fall back to HTML/DomPDF approximation.

---

## 82. Signing Failure

Approved PDF signing failure behaves according to Section 66: FAILED, no unsigned fallback.

---

## 83. Scheduler Failure

Scheduler failure MUST NOT expose artifacts publicly or alter NSCMF workflow.

Expired files may remain privately stored longer until cleanup succeeds; technical monitoring/alerting policy is downstream.

---

# PART Q — MODULE DEPENDENCY RULES

## 84. Allowed Dependency Direction

Preferred dependency direction:

```text
Presentation / HTTP
        ↓
Application Actions
        ↓
Domain Rules / Authorization / Validation
        ↓
Persistence / Audit / Storage abstractions
```

Export subsystem:

```text
HTTP Export Request
        ↓
Export Orchestrator
        ↓
Export Request Persistence / Queue
        ↓
Worker
  ├─ Snapshot Reader
  ├─ Template Registry
  ├─ OOXML Patcher
  ├─ Integrity Validator
  ├─ Renderer Adapter
  ├─ Signing Service
  └─ Artifact Repository
```

---

## 85. Forbidden Coupling

MUST NOT:

- call Vue code from Laravel domain logic;
- implement state transition inside Blade/Vue components;
- make Eloquent model event hooks the only place workflow rules exist;
- let renderer update NSCMF business status;
- let OOXML patcher decide user authorization;
- let queue worker bypass authorization/snapshot ownership assumptions established by Export Orchestrator;
- make storage path itself represent permission;
- make Access Audit row change business workflow;
- make technical logs authoritative audit;
- make PDF signature replace `Approved By` workflow evidence.

---

# PART R — READ/WRITE MODELS

## 86. Command-Oriented Writes

Workflow-changing writes SHOULD be explicit commands/actions instead of generic unrestricted `update(record, payload)` endpoints.

Examples:

```text
SubmitNscmf
ForwardToApproval
ApproveNscmf
ReopenNscmf
```

This keeps permission/state/validation/transaction behavior tied to the business action.

---

## 87. Scoped Query Reads

History/queues MAY use optimized query objects/services independent from write actions, but both MUST use the same canonical visibility/scope semantics.

No separate CQRS infrastructure/event bus is required.

---

# PART S — SIGN-OFF / DOCUMENT EVIDENCE

## 88. Workflow Sign-Off

Digital sign-off fields derive from authenticated workflow events:

```text
Requested By → first successful Submit actor/timestamp
Reviewed By  → successful current-iteration Forward actor/timestamp
Approved By  → successful final Approve actor/timestamp
```

These values are business evidence stored in application data/audit and mapped into official export template.

---

## 89. PDF Cryptographic Signature Is Additional Integrity Evidence

For approved PDF:

```text
workflow sign-off content
+
organization/system cryptographic PDF signature
```

The cryptographic signature protects exported PDF integrity; it does not redefine who approved the NSCMF.

---

# PART T — SEARCH / PERFORMANCE / SCALE

## 90. 50-User Baseline

Architecture is designed safely for 50 application users, not internet-scale multi-tenant traffic.

At this scale:

- MySQL scoped indexes are sufficient baseline;
- database session/cache are acceptable;
- Database Queue is acceptable;
- one modular monolith is preferred;
- Redis/search engine/message broker are not required absent evidence.

---

## 91. Pagination and Indexing

All potentially growing operational lists SHOULD be paginated.

ERD MUST plan indexes for at least common dimensions implied by requirements such as:

- Request No;
- status;
- archived flag;
- requester;
- Unit/Division/scopes;
- family/subtype;
- relevant dates.

Exact composite indexes depend on ERD/query analysis.

---

## 92. Bulk Export

Bulk export remains asynchronous.

Each selected record MUST pass visibility/export eligibility before job/request creation.

Bulk packaging exact format remains a downstream implementation/UI decision unless explicitly confirmed later; architecture MUST NOT bypass per-record authorization merely because operation is bulk.

---

# PART U — OBSERVABILITY BOUNDARY

## 93. Minimum Architecture Signals

System SHOULD make it possible to observe:

- HTTP/application errors;
- failed workflow transactions;
- stale conflicts;
- queue depth/failures;
- export duration/failure stage;
- template/integrity failures;
- renderer failures;
- signing failures;
- scheduler cleanup failures;
- storage failures.

Exact metrics/log platform/retention/alerting is downstream.

---

## 94. Correlation

Important technical operations SHOULD have correlation/request/job identifiers so logs for export/queue failures can be traced without using user-visible Request No as the only diagnostic key.

Exact format belongs to implementation.

---

# PART V — SECURITY ARCHITECTURE HANDOFF

## 95. Security Concerns Reserved for `10`

`09` establishes boundaries but does not invent final security policy.

`10_Security_Rules.md` MUST define at minimum applicable detail for:

- password policy;
- session duration/rotation;
- login throttling/lockout;
- CSRF/security headers;
- authorization hardening;
- attachment content scanning decision;
- sensitive audit access;
- secret management;
- PDF signing certificate/private key storage;
- signing algorithm/provider/trust-chain policy;
- certificate rotation/revocation/expiry;
- storage encryption/access policy;
- transport security;
- data retention/security logging.

---

## 96. Signer Key Boundary

Until `10` is written:

- private key MUST be treated as highly sensitive system/organization credential;
- it MUST NOT live in Vue/frontend bundle;
- it MUST NOT be passed to Browser;
- it MUST NOT be committed plaintext to repository;
- PdfSigningService is server-side only.

Exact implementation remains intentionally deferred.

---

# PART W — DEPLOYMENT HANDOFF

## 97. Logical Runtime Components

Deployment Architecture must be able to place at least logical roles:

```text
Web/Application Runtime
Queue Worker
Scheduler
MySQL 8.4
Private Storage connection
Qualified Spreadsheet Renderer
```

PdfSigningService may be in application/worker process or protected dedicated runtime depending on Security/Deployment decision; logical interface remains stable.

---

## 98. No Kubernetes Requirement

Nothing in `09` requires:

- Kubernetes;
- service mesh;
- API gateway;
- event broker;
- multiple application clusters.

Deployment should remain proportional to 50-user baseline.

---

# PART X — IMPORTANT SEQUENCE FLOWS

## 99. Happy Path Submit → Approval

```text
Requester Browser
  → Laravel Submit action
    → authorize + validate
      → DB transaction + row lock
        → DRAFT → PENDING_REVIEW
        → business audit Submit
      → COMMIT

Reviewer Browser
  → Forward action
    → authorize + scope + Result gate
      → DB transaction + row lock
        → PENDING_REVIEW → PENDING_APPROVAL
        → business audit Forward
      → COMMIT

Approver Browser
  → Approve action
    → authorize + Approval Scope
      → DB transaction + row lock
        → PENDING_APPROVAL → APPROVED
        → approved_by/timestamp
        → business audit Approve
      → COMMIT
```

---

## 100. Draft Autosave

```text
Requester Browser
  → autosave payload + expected version
    → authorize own editable record
      → DRAFT_PERSIST validation
        → optimistic version update
          → persisted changes + business audit
          → version increment

version mismatch
  → conflict
  → no silent overwrite
```

---

## 101. Record View

```text
User Browser
  → Record Detail
    → authenticate
    → Policy + scope
      → read MySQL
      → Access Audit event
      → return Inertia detail

No business state change
No business timeline Viewed row requirement
```

---

## 102. Approved PDF Export

```text
User
  → Export PDF
    → authorize visible/exportable record
    → capture/bind APPROVED record snapshot/version
    → create export request QUEUED
    → dispatch Database Queue

Worker
  → load snapshot
  → resolve official template + mapping
  → targeted OOXML patch
  → workbook integrity validation
  → qualified spreadsheet renderer
  → exact PDF
  → PdfSigningService
       signer identity = system/organization
  → private artifact storage
  → READY + expires_at = +168h

User
  → poll/refresh status
  → authorized download
  → Access Audit download event

Scheduler after expiry
  → delete private artifact
  → mark technical artifact expired/cleaned
```

---

## 103. XLSX Export

```text
User
  → Export XLSX
    → authorize
    → bind snapshot/version
    → queue job

Worker
  → template + OOXML patch + integrity validation
  → private XLSX artifact
  → READY for 168h

No cryptographic PDF signature step
```

---

# PART Y — ARCHITECTURE DECISION RECORD SUMMARY

## 104. Confirmed Decisions

| Concern | Confirmed Architecture Decision |
|---|---|
| Organization model | Single organization / single installation |
| Architecture style | Modular Laravel monolith |
| Frontend integration | Vue 3 + Inertia 3 inside Laravel application |
| Primary DB | MySQL 8.4 LTS |
| Sessions/cache | Database-backed baseline |
| Async jobs | Laravel Database Queue |
| Realtime | None required for MVP |
| Workflow concurrency | Short DB transaction + row-level pessimistic lock |
| Draft/Revision concurrency | Optimistic version check |
| Result capture concurrency | Optimistic version check |
| Business audit | Separate authoritative mutation/workflow audit |
| Access audit | Separate access/view/download audit; not main business timeline |
| Technical logs | Separate from both business/access audit |
| Attachments | Private Flysystem storage + DB metadata |
| Export choice | XLSX or PDF |
| Export execution | All export asynchronous |
| Export snapshot | Deterministic immutable logical record version/snapshot |
| XLSX generation | Official template + targeted OOXML patching |
| PDF rendering | Qualified spreadsheet renderer |
| PDF signing | Cryptographic signature required only for APPROVED PDF snapshot |
| PDF signer identity | System / Organization |
| Personal Approver cert | Not architecture requirement |
| Signing key detail | Deferred to `10_Security_Rules.md` |
| Export artifact | Private temporary derived artifact |
| Export retention | 168 hours / 7 days |
| Cleanup | Laravel Scheduler / cron-compatible cleanup |
| Kubernetes/microservices | Not required |

---

# PART Z — ARCHITECTURE GUARDRAILS

## 105. Developer / AI Must Not

Implementation MUST NOT:

1. add multi-tenancy/tenant layer without requirement change;
2. split frontend/backend into independent deployments merely by preference;
3. create microservices for modules defined here;
4. let Vue enforce authoritative permission/state;
5. bypass Policy/scope on History/export/download endpoints;
6. hold row lock during user interaction;
7. hold workflow transaction while rendering/exporting/uploading external file;
8. use optimistic overwrite that silently loses newer Draft/Result changes;
9. run Reviewer/Approver state transition without re-reading locked current state;
10. commit successful state transition without required business audit evidence;
11. record ordinary View as business status transition;
12. mix Access Audit rows into business timeline in a way that floods operational history;
13. treat technical logs as authoritative audit;
14. expose attachment/export binary through public predictable path;
15. use storage path as authorization decision;
16. let object-storage success alone mean attachment mutation succeeded;
17. generate export synchronously inside HTTP request path;
18. let async export worker silently use a newer record version than requested snapshot;
19. rebuild official XLSX visually from code;
20. replace native controls with approximate symbols/images;
21. deliver corrupted XLSX after integrity validation failure;
22. use HTML/DomPDF approximation as fallback when spreadsheet PDF rendering fails;
23. claim LibreOffice is production-authoritative before golden qualification;
24. treat export job states as NSCMF business statuses;
25. sign XLSX as if PDF signature requirement applies to it;
26. require PDF cryptographic signature for non-Approved snapshot unless business rule changes;
27. deliver unsigned Approved PDF when signing is mandatory and signing fails;
28. use human Approver's personal certificate by assumption;
29. store signing private key in frontend/repository plaintext;
30. equate organization PDF signer with `Approved By` workflow actor;
31. persist generated XLSX/PDF indefinitely by default;
32. serve expired artifact after 168-hour validity window;
33. delete source NSCMF record when export artifact expires;
34. make scheduler advance Review/Approval workflow automatically;
35. introduce Redis/Kafka/RabbitMQ/search cluster absent demonstrated need;
36. weaken exact-template requirement due implementation convenience.

---

# PART AA — TESTABLE ARCHITECTURE ACCEPTANCE CRITERIA

## 106. Application Boundary

- [ ] System runs as one modular Laravel application.
- [ ] No tenant layer exists for current single organization.
- [ ] Vue/Inertia is presentation boundary; Laravel is server authority.
- [ ] Domain actions are not scattered only through controllers/components/model hooks.

## 107. Authorization / Query

- [ ] Every record read/write/export path checks effective authorization/scope server-side.
- [ ] Scoped queue/history query does not leak unauthorized row/count data.
- [ ] View does not change business status or create exclusive assignment.

## 108. Concurrency

- [ ] Workflow transitions use short transaction + row-level lock/current-state revalidation.
- [ ] Reviewer stale race produces only one valid state result.
- [ ] Approver stale race produces only one valid final approval.
- [ ] Draft/Revision update uses optimistic version conflict detection.
- [ ] Change Result update uses optimistic version conflict detection.
- [ ] Stale edit does not silently overwrite newer data.

## 109. Audit Separation

- [ ] Business mutations/workflow actions write authoritative Business Audit.
- [ ] Access/view/download evidence is stored separately from business timeline.
- [ ] Technical logs are not used as replacement for either audit model.
- [ ] Business timeline remains readable without routine View-event flooding.

## 110. Attachments

- [ ] Files are private and require parent-record authorization.
- [ ] DB metadata and storage partial failures are compensated safely.
- [ ] Orphan objects are never made publicly accessible.

## 111. Export Queue

- [ ] Single XLSX export is queued asynchronously.
- [ ] Single PDF export is queued asynchronously.
- [ ] Bulk export is queued asynchronously.
- [ ] Export request is bound to deterministic record snapshot/version.
- [ ] Queue retry does not mutate NSCMF state.
- [ ] Partial artifact is not exposed as READY.

## 112. Exact XLSX

- [ ] Worker starts from immutable approved official template.
- [ ] Only mapped OOXML fields/control states are patched.
- [ ] Integrity validator runs before artifact is READY.
- [ ] Generated XLSX remains exact template representation apart from intended values/control states.

## 113. PDF / Signing

- [ ] PDF is rendered from filled XLSX/template representation.
- [ ] Only qualified renderer is production-eligible.
- [ ] `APPROVED` PDF export passes through PdfSigningService.
- [ ] Intended signer is system/organization.
- [ ] Approved PDF signing failure causes export FAILED, not unsigned fallback.
- [ ] Non-Approved PDF does not receive mandatory organization signature under current rule.
- [ ] XLSX does not receive PDF cryptographic signing flow.

## 114. Artifact Retention

- [ ] READY artifact has 168-hour expiry.
- [ ] Authorized user can re-download before expiry.
- [ ] Download path re-checks authorization.
- [ ] Scheduler deletes expired private binary.
- [ ] Expiration does not delete NSCMF source record/audit.
- [ ] User can request a new export after expiration.

## 115. Failure Isolation

- [ ] Renderer/export failure does not alter NSCMF business state.
- [ ] Signing failure does not alter Approval evidence.
- [ ] Scheduler failure does not expose files publicly.
- [ ] Database transaction failure does not leave partial workflow transition.

---

# PART AB — DOWNSTREAM HANDOFFS

## 116. `10_Security_Rules.md`

Must finalize security controls around:

- credentials/session;
- permissions hardening;
- CSRF/headers;
- file security/scanning;
- access-audit security/retention where applicable;
- export artifact access;
- PDF signing certificate/private key;
- signing algorithm/trust/rotation/revocation;
- secret management;
- encryption/transport requirements.

---

## 117. `11_ERD_Database_Schema.md`

Must materialize architecture concepts including as appropriate:

- NSCMF record/version token;
- form-specific data;
- scopes;
- business audit;
- access audit;
- attachment metadata;
- export request/job/artifact metadata;
- template version reference;
- snapshot/version binding;
- expiry timestamps;
- indexes/constraints.

Exact tables are intentionally not invented here.

---

## 118. `12_API_Contract.md`

Must define HTTP behavior for:

- optimistic version conflicts;
- stale workflow action;
- export request/status/download;
- authorization failures;
- validation errors;
- attachment endpoints;
- queued export state responses.

---

## 119. `13_Project_Structure.md`

Must define code placement for logical modules/actions/adapters without changing responsibilities in this document.

---

## 120. `14_Environment_Specification.md`

Must define environment/runtime configuration for:

- MySQL;
- queue worker;
- scheduler;
- storage;
- template registry path;
- renderer executable/service;
- temporary workspace;
- signing service configuration reference;
- expiry configuration if made configurable while preserving 168-hour default/requirement.

---

## 121. `20_Deployment_Architecture.md`

Must place logical components into production topology and define process/container availability without turning logical module boundaries into unnecessary microservices.

---

# PART AC — AUTHORITY MATRIX

## 122. Authority Matrix

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariant | `02_Business_Rules.md` |
| User interaction sequence | `03_User_Flow.md` |
| Permission/scope semantics | `04_RBAC_Permission_Matrix.md` |
| Business lifecycle/state | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| Presentation/interaction | `07_UI_UX_Specification.md` |
| Technology selection | `08_Tech_Stack_Specification.md` |
| **Component topology / concurrency / execution architecture** | **`09_System_Architecture.md`** |
| Security controls | `10_Security_Rules.md` |
| Physical relational schema | `11_ERD_Database_Schema.md` |
| HTTP contract | `12_API_Contract.md` |
| Code layout | `13_Project_Structure.md` |
| Runtime/environment variables | `14_Environment_Specification.md` |
| Coding/AI rules | `15_Coding_Rules_AGENTS.md` |
| Detailed test coverage | `16_Testing_Specification.md` |
| Dummy fixtures | `17_Seed_Dummy_Data_Specification.md` |
| Completion criteria | `18_Definition_of_Done.md` |
| Build order/tasks | `19_Task_Implementation_Plan.md` |
| Production physical topology | `20_Deployment_Architecture.md` |

---

# PART AD — INTENTIONALLY DEFERRED ITEMS

## 123. Remaining Architecture-Adjacent TBDs

The following MUST NOT be silently guessed in `09`:

- exact password/session/security policy;
- exact PDF signing certificate/provider/private-key storage;
- signature algorithm/trust-chain/rotation/revocation policy;
- attachment malware-scanning technology;
- audit/access-audit retention period;
- exact relational tables/columns;
- exact optimistic version column naming/type;
- exact HTTP status/payloads;
- exact export-job table/state enum implementation;
- exact bulk packaging format;
- exact template cell/control mapping;
- exact Docker Compose/container count;
- exact cron execution cadence after expiration eligibility;
- exact S3-compatible production provider;
- exact observability platform;
- notification provider/timing;
- official company numbering SOP/sample;
- exact Unit/Division master data;
- final production infrastructure topology.

---

# PART AE — REQUIRED SYNCHRONIZATION

## 124. Prior-Artifact Synchronization

Architecture decisions confirmed in this session that should be reflected where relevant upstream/downstream:

- single-organization model;
- hybrid concurrency model;
- user-facing XLSX/PDF export choice;
- all export asynchronous;
- deterministic export snapshot/version binding;
- 168-hour temporary export retention;
- separate Access Audit vs Business Timeline;
- `APPROVED` PDF cryptographic signing;
- logical signer = system/organization;
- signing key/certificate implementation deferred to Security Rules.

Synchronization MUST NOT change canonical workflow states or validation decisions.

---

## 125. Next Document

Next document in fixed project order:

**`10_Security_Rules.md`**

It must secure the architecture defined here without changing its business semantics, especially authentication/session hardening, authorization enforcement, attachment security, access-audit protection, private export delivery, and the organization/system PDF signing-key boundary.