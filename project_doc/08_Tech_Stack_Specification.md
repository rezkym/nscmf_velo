# Tech Stack Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-TECH-008  
> **Document Order:** 08 / 20  
> **Status:** Draft — Confirmed Technology Baseline + Security Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Target Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk technology selection dan technology boundaries** NSCMF Digital Form & Workflow System.

Dokumen mengunci:

- application runtime;
- backend framework;
- frontend framework;
- Laravel/frontend integration model;
- UI component technology;
- authentication mechanism;
- authorization/RBAC package boundary;
- database engine;
- queue/cache/session baseline;
- attachment storage abstraction;
- malware-scanning technology baseline;
- exact-template XLSX/PDF export technology direction;
- audit implementation direction;
- search/realtime decisions;
- build/package tooling;
- testing stack;
- static-analysis/lint/formatting baseline;
- Docker compatibility;
- dependency/version policy;
- technologies yang sengaja tidak digunakan pada MVP.

Dokumen ini **tidak mengubah** product scope, business invariant, permission semantics, lifecycle, field validation, atau UI/UX yang sudah authoritative pada `01–07`.

System Architecture (`09`) menentukan komponen dan interaction topology berdasarkan stack ini. Security Rules (`10`) menentukan security-control behavior yang menggunakan stack ini. Deployment Architecture (`20`) menentukan production topology/final hosting implementation.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — direkomendasikan kuat sebagai default.
- **MAY** — diperbolehkan.
- **QUALIFIED** — technology/renderer hanya boleh dipakai production setelah lulus acceptance/golden test yang diwajibkan.
- **TBD** — belum final dan tidak boleh ditebak implementation.

---

# PART A — DESIGN CONSTRAINTS DERIVED FROM 01–07

## 3. Technology Must Serve Existing Business Rules

Stack dipilih untuk memenuhi requirement berikut, bukan sebaliknya:

1. internal standalone web application;
2. username/password login;
3. no self-registration;
4. admin-created users;
5. protected Superadmin;
6. granular multi-role RBAC;
7. ownership + Unit/Division Reviewer Scope + Approval Scope;
8. server-side authoritative permission/state/validation;
9. non-exclusive Reviewer/Approver concurrency;
10. Draft autosave + manual Save Draft;
11. detailed authoritative business/access/security audit separation;
12. attachment up to 10 files × 20 MB with private malware-scanning gate;
13. structured searchable History;
14. single/bulk export;
15. exact-template XLSX/PDF export requirement;
16. desktop-first Vue/shadcn-like UI direction;
17. initial practical user count ~10, engineered safely for **50 users**;
18. Docker/container is allowed;
19. MVP does not need WebSocket/realtime infrastructure;
20. testing infrastructure must be established properly from project bootstrap;
21. Approved PDF requires System/Organization signing identity;
22. public PDF verification is part of the same application boundary.

---

## 4. Architecture Style Decision

Confirmed application style:

```text
Laravel Monolith
+ Inertia bridge
+ Vue frontend
+ MySQL
```

This is a **modular monolithic web application**, not microservices.

MVP MUST NOT introduce separate frontend/backend repositories or a standalone REST-SPA architecture without an approved specification change.

Rationale:

- one business domain;
- low-to-moderate user scale;
- server-side authorization is central;
- workflow/state transitions benefit from one transactional application boundary;
- Inertia retains modern SPA-like Vue UX while keeping Laravel routing/controllers/policies as the application authority;
- simpler testing/deployment/maintenance than duplicated API + SPA infrastructure.

---

# PART B — FINAL TECHNOLOGY SUMMARY

## 5. Confirmed Stack

| Layer | Confirmed Technology |
|---|---|
| Backend Framework | **Laravel 13.x** |
| Backend Runtime | **PHP 8.5.x** |
| PHP Dependency Manager | **Composer 2.x** |
| Frontend Framework | **Vue 3.x** — Composition API |
| Frontend Language | **TypeScript** |
| Laravel ↔ Frontend Bridge | **Inertia 3.x** |
| UI Components | **shadcn-vue** |
| CSS | **Tailwind CSS 4.x** |
| Build Tool | **Vite** |
| JS Runtime | **Node.js 24 LTS** |
| JS Package Manager | **npm** with committed lockfile |
| Authentication | **Laravel Fortify / Laravel session authentication**, customized for username + password |
| Authorization | **Spatie Laravel Permission 8.x + Laravel Policies/Gates + custom domain scope rules** |
| Database | **MySQL 8.4 LTS / InnoDB** |
| ORM / Query Layer | **Eloquent ORM + Laravel Query Builder** |
| Queue | **Laravel Database Queue** |
| Session | **Laravel database session driver** |
| Cache | **Laravel database cache baseline**; Redis not required for MVP |
| Attachment Storage | **Laravel Filesystem/Flysystem**, private local dev + S3-compatible production target |
| Malware Scanning | **ClamAV / `clamd`**, behind an application `MalwareScanner` adapter |
| XLSX Export | **Original template + targeted OOXML patching** |
| PDF Export | **Qualified spreadsheet renderer**, LibreOffice Headless primary candidate after golden fidelity qualification |
| PDF Signing | **Server-side PdfSigningService boundary** using manually provisioned System/Organization signing identity |
| Public PDF Verification | **Laravel application verification service** using issuer signature + exact SHA-256 + issuance/currentness metadata |
| Audit | **Custom authoritative NSCMF Business/Access/Security audit model** |
| Search | **MySQL/Eloquent + indexes** |
| Realtime | **None for MVP** |
| Backend Tests | **Pest 4.x** |
| Frontend Tests | **Vitest 4.x + Vue Test Utils** |
| End-to-End Tests | **Playwright** |
| PHP Formatting | **Laravel Pint** |
| PHP Static Analysis | **PHPStan/Larastan** |
| JS/TS Linting | **ESLint** |
| JS/TS Formatting | **Prettier** |
| Vue Type Check | **vue-tsc / TypeScript compiler checks** |
| CI Baseline | **GitHub Actions** |
| Runtime Packaging | **Docker-compatible** |

A Laravel/community ClamAV package MAY be used as integration glue, but the package is not the security authority and MUST NOT replace the application `MalwareScanner` abstraction.

---

# PART C — VERSION POLICY

## 6. Runtime Version Policy

### 6.1 Laravel

Use **Laravel 13.x**.

At specification date Laravel 13 is the current supported major selected for the project and supports PHP 8.3–8.5. This project explicitly chooses PHP 8.5.

MUST:

- pin major version to Laravel 13;
- commit `composer.lock`;
- apply supported patch/minor security updates after tests pass;
- do not auto-upgrade to Laravel 14 without specification review.

### 6.2 PHP

Use **PHP 8.5.x**.

Production and CI MUST run the same PHP minor line.

### 6.3 Node

Use **Node.js 24 LTS**.

MUST NOT use Node Current as production baseline merely because newer major exists.

### 6.4 MySQL

Use **MySQL 8.4 LTS**.

The project deliberately chooses the LTS track rather than MySQL Innovation releases.

### 6.5 Frontend Package Versioning

Vue, Inertia, Tailwind, Vite, shadcn-vue, Vitest, Playwright and related dependencies MUST be version-pinned through `package-lock.json`.

Package updates MUST pass the full relevant test suite before merge/deployment.

---

# PART D — BACKEND

## 7. Laravel 13

Laravel is the authoritative application runtime for:

- authentication;
- authorization;
- request routing;
- form/action validation;
- NSCMF domain orchestration;
- state transitions;
- database persistence;
- transaction boundaries;
- Business/Access/Security Audit orchestration;
- queue jobs;
- attachment access;
- malware scan orchestration;
- export orchestration;
- Approved-PDF signing orchestration;
- public PDF verification;
- History/search queries.

Business logic MUST NOT live only in Vue components.

---

## 8. Laravel Application Structure Direction

Controllers SHOULD remain thin.

Complex domain behavior SHOULD be implemented through explicit application/domain services/actions such as conceptual:

```text
CreateNscmf
SaveDraft
SubmitNscmf
ReturnForRevision
RejectNscmf
ForwardToApproval
ApproveNscmf
ReopenNscmf
ArchiveNscmf
UpdateChangeResult
ScanAttachment
GenerateNscmfExport
SignApprovedPdf
VerifyIssuedPdf
```

Exact directory structure is defined later in `13_Project_Structure.md`.

This specification only requires that workflow/business/security orchestration not be scattered across controllers, Vue pages, jobs, and model hooks without a clear authoritative layer.

---

## 9. Database Transactions

Laravel `DB::transaction()` + MySQL InnoDB transaction primitives MUST be available for workflow-changing operations.

The exact hybrid locking strategy is defined in `09_System_Architecture.md`.

Implementation MUST preserve the already-confirmed invariant:

```text
permission/scope/state validation
+ state update
+ required audit evidence
= one consistent business action
```

No partial successful workflow transition is allowed.

Long-running malware scans, spreadsheet rendering, or PDF signing MUST NOT hold a browser-lifetime business transaction/row lock.

---

# PART E — FRONTEND

## 10. Vue 3 + TypeScript

Final frontend framework = **Vue 3** using Composition API and TypeScript.

Vue is used for:

- application shell;
- dashboard;
- NSCMF forms;
- autosave state;
- dynamic/conditional field presentation;
- queues;
- history/table UX;
- dialogs;
- result-only editing;
- security-state feedback;
- public PDF verification UI;
- local interaction state.

Vue MUST NOT become the source of truth for permission, workflow validity, malware trust, or PDF authenticity.

---

## 11. Inertia 3

Final Laravel/frontend integration = **Inertia 3**.

MVP does **not** use a separately deployed SPA/API architecture.

Primary pattern:

```text
Browser
→ Laravel route/controller
→ authorization + application logic
→ Inertia response
→ Vue page
```

For writes:

```text
Vue/Inertia request
→ Laravel endpoint
→ server authorization
→ server validation/security preconditions
→ transaction/persistence
→ Inertia response / redirect / validation errors
```

Dedicated JSON endpoints MAY exist when technically natural for autosave, file upload, export status, public PDF verification, or similar internal behavior, but they remain part of the same Laravel application and MUST obey the same backend rules.

---

## 12. No Inertia SSR Requirement

Inertia server-side rendering is **not required** for MVP.

Rationale:

- application is internal except narrow public verification utility;
- SEO is irrelevant to the operational product;
- SSR introduces another long-running Node process without product value for current requirement.

SSR MUST NOT be added by default merely because `/ispdfvalid` is public.

---

# PART F — UI COMPONENT STACK

## 13. shadcn-vue

Final UI component direction = **shadcn-vue**, consistent with `07_UI_UX_Specification.md`.

Use its component approach for button/input/textarea/select/checkbox/radio/dialog/sidebar/table/dropdown/badge/tabs/alert/tooltip/popover/date/skeleton/toast patterns.

Components live in the application codebase and MAY be customized to implement NSCMF design tokens.

MUST NOT modify business/security behavior merely to fit a component default.

---

## 14. Tailwind CSS 4

Use **Tailwind CSS 4.x** for application styling.

Brand tokens from `07` remain authoritative:

```text
#091540
#1B2CC1
#7692FF
#ABD2FA
```

Semantic green/yellow/red/neutral treatment remains defined by `07`.

---

## 15. Icon Library

Preferred icon family = **Lucide / lucide-vue-next**.

Critical workflow/security actions retain text labels; icon is supplemental.

---

# PART G — AUTHENTICATION

## 16. Authentication Model

Application is standalone.

Confirmed login:

```text
username
+ password
```

No Microsoft SSO, LDAP, OAuth, external IdP, atau MFA is required for current MVP.

Authentication uses Laravel session authentication through Laravel Fortify/starter-kit foundations.

---

## 17. Username as Login Identifier

`username` is the primary login identifier.

MUST:

- be unique according to final DB rules;
- be resolved server-side;
- never store plaintext password;
- use Laravel-supported secure password hashing;
- reject disabled user login;
- respect protected Superadmin invariants.

Exact username length/pattern remains downstream. **Password policy is already confirmed in `10_Security_Rules.md`: minimum 6 characters, no mandatory composition rule, no MFA.**

---

## 18. Fortify / Session Feature Boundary

Public registration MUST be disabled.

The application MUST NOT expose normal self-registration routes/UI.

Email verification is not required for the standalone username/password baseline.

Self-service email `Forgot Password` flow is not required. Credential reset occurs through authorized administration.

Confirmed security contract from `10_Security_Rules.md`:

- password minimum 6 characters;
- no uppercase/lowercase/number/symbol composition rule;
- no MFA;
- admin-created/reset credential uses temporary password + mandatory change;
- login endpoint uses server-side throttling/progressive delay;
- idle session timeout = 30 minutes;
- absolute session lifetime = 8 hours;
- maximum 2 active sessions/account;
- sensitive password/role/permission administration requires current-password re-authentication;
- password reset/role/permission/access-changing identity mutation revokes all target-user sessions.

Implementation MUST NOT silently enable starter-kit registration, MFA, or password-composition requirements that contradict these product decisions.

---

# PART H — AUTHORIZATION

## 19. Spatie Laravel Permission

Use **Spatie Laravel Permission 8.x** for role/permission primitives.

It is responsible for role definitions, permission definitions, user-role relationships, direct/custom permissions where required, and Laravel Gate integration.

---

## 20. Spatie Is Not the Whole Authorization Model

Spatie MUST NOT be treated as sufficient by itself for NSCMF access.

Effective authorization remains:

```text
role/permission
+ ownership
+ Unit/Division scope
+ Approval Scope
+ business state
+ archive state
+ validation
+ security preconditions
+ protected invariants
```

Use:

- **Spatie** → role/permission primitives;
- **Laravel Policies/Gates** → resource authorization boundary;
- **custom domain scope/query logic** → ownership/Unit/Reviewer/Approver scope;
- **domain services** → state/action eligibility and invariant enforcement.

Spatie `teams` MUST NOT silently replace the project's Unit/Division or Approval Scope model.

---

## 21. Permission Names

Permission names defined in `04_RBAC_Permission_Matrix.md` remain canonical conceptual names, including:

```text
nscmf.create
nscmf.draft.edit
nscmf.submit
nscmf.cancel
nscmf.change.result.edit
nscmf.review.*
nscmf.approval.*
nscmf.approve
nscmf.reopen
nscmf.archive
audit.access.view
audit.security.view
...
```

Package adoption MUST NOT rename business permission semantics without documented mapping.

---

# PART I — VALIDATION IMPLEMENTATION

## 22. Backend Validation Authority

Backend validation uses Laravel validation primitives:

- Form Request classes;
- reusable custom Rule objects;
- domain validators/services for state/action-specific cross-field rules.

`06_Validation_Rules.md` remains authoritative for business/input validation. `10_Security_Rules.md` adds security gates such as malware scanning after structural file validation.

---

## 23. Frontend Validation

Frontend validation exists for usability only.

The project MUST NOT maintain a second independent client-side business/security-rule schema whose behavior can silently diverge from Laravel.

Server always revalidates authoritative actions and security preconditions.

---

# PART J — DATABASE

## 24. MySQL 8.4 LTS

Final relational database = **MySQL 8.4 LTS**, InnoDB.

Use transactional InnoDB tables, foreign keys where appropriate, `utf8mb4`, and indexes for scoped queues/history/search.

Exact schema is defined in `11_ERD_Database_Schema.md`.

---

## 25. Eloquent + Query Builder

Eloquent is the normal application data model.

Query Builder/raw SQL MAY be used for performance-sensitive queries when justified and tested.

User-controlled values MUST NOT be concatenated into unparameterized SQL.

Production application connection MUST use a dedicated least-privilege DB account, not MySQL `root` for normal operation.

---

## 26. No Search Engine for MVP

Do not introduce Elasticsearch, OpenSearch, Meilisearch, Typesense, or Laravel Scout infrastructure for initial implementation.

History/queue requirements are structured and can be fulfilled through MySQL indexes and Eloquent/query-builder filtering at target scale.

---

# PART K — SESSION, CACHE, QUEUE

## 27. Database Session Driver

Use Laravel **database session** baseline.

This selection is also useful for enforcing the confirmed maximum-2-session/account policy and server-side revocation behavior.

Rationale:

- works cleanly with Docker;
- avoids container-local session state;
- supports explicit session listing/revocation;
- supports future multiple app instances more safely than local-file session;
- target user count is small enough that DB-session overhead is acceptable.

Cache MUST NOT be the source of truth for effective session authorization; server-side security checks remain authoritative.

---

## 28. Database Cache

Use Laravel database cache baseline for current requirements.

Redis is intentionally **not required** for MVP.

Cache MUST NOT be the source of truth for workflow status, authorization, audit history, malware trust, or PDF validity.

---

## 29. Database Queue

Use **Laravel Database Queue**.

Good queue candidates include:

- exact-template export generation;
- Approved-PDF signing after rendering;
- bulk exports;
- future notification delivery;
- non-blocking maintenance tasks.

Attachment malware scanning MAY be synchronous or job-assisted only if UX/state/storage design preserves the strict rule that file is unusable until explicit CLEAN. It MUST NOT hold a long business transaction.

Direct form/workflow state transitions remain synchronous business requests unless Architecture defines otherwise.

Queue jobs MUST be idempotent/retry-aware where relevant.

---

## 30. Redis Position

Redis, Horizon, or distributed cache/queue infrastructure is **not part of MVP baseline**.

It MAY be introduced later only when evidence demonstrates need.

---

# PART L — ATTACHMENT STORAGE & MALWARE SCANNING

## 31. Laravel Filesystem / Flysystem

All attachment persistence MUST go through Laravel Filesystem abstraction.

Development:

```text
private local filesystem
```

Production target:

```text
private S3-compatible object storage
```

Exact provider remains Deployment Architecture responsibility.

---

## 32. Private by Default

NSCMF attachments MUST NOT be stored as publicly addressable web assets.

Download/view must flow through authorized application access or controlled private delivery according to Security/Architecture.

Attachment limits/types remain defined by `06`.

---

## 33. ClamAV / clamd — Confirmed Malware Scanner

Confirmed MVP malware engine = **ClamAV / `clamd`**.

Conceptual application boundary:

```text
MalwareScanner
  ↓
ClamAvScanner
  ↓
clamd
```

Rules:

- Laravel/domain code depends on an application interface/adapter, not on a specific community package;
- a compatible Laravel/PHP ClamAV client package MAY be used as transport glue;
- `clamd` is the actual malware-scanning service/engine;
- `clamd` socket/TCP endpoint MUST remain infrastructure-private and MUST NOT be exposed publicly;
- virus signature database update mechanism (`freshclam` or equivalent ClamAV-supported update operation) belongs to environment/deployment operations;
- scanner resource requirements MUST be included in server/container sizing.

Security semantics are authoritative in `10_Security_Rules.md`: only explicit `CLEAN` permits a file to become usable; infected/error/timeout/unavailable fails closed.

---

# PART M — EXACT XLSX / PDF EXPORT — CRITICAL

## 34. Export Requirement Is Template Fidelity, Not HTML Rendering

The export requirement is strict:

> The exported XLSX and PDF MUST preserve the official NSCMF XLSX template exactly as the visual/export source of truth. Existing template structure is not redesigned. Only the intended business fields/control states are filled or replaced.

Therefore the application MUST NOT treat an HTML Blade/Vue page as the authoritative NSCMF export template.

DOMPDF/Browsershot HTML rendering is **not** the authoritative NSCMF export approach.

---

## 35. Canonical Export Template

Original `NSCMF-Form-3.0.xlsx` is the canonical export template baseline until an approved newer template version exists.

The template contains worksheets, formatting/styles, merged cells, row/column dimensions, media, print settings, VML drawings, and native Form Control checkbox definitions/control properties that must be preserved.

Template MUST be versioned and integrity-checked. Production export MUST be traceable to the template version used.

---

## 36. No Generic Workbook Rewrite in Authoritative Path

Because source workbook contains native Excel Form Controls and VML/control-property parts, authoritative exporter MUST NOT casually load/re-save the workbook through a generic spreadsheet library if doing so rewrites/strips unsupported package parts.

The approved strategy is **targeted OOXML package patching**.

---

## 37. Targeted OOXML Patching

XLSX is treated as an OOXML ZIP package.

Authoritative implementation SHOULD use controlled PHP-native primitives such as `ZipArchive`, `DOMDocument`, `DOMXPath`, or equivalently controlled code to modify only explicitly mapped OOXML parts.

Conceptual flow:

```text
immutable official template
→ copy to private temporary export workspace
→ patch mapped worksheet cell values
→ patch mapped checkbox/control state
→ preserve unrelated package parts
→ validate package integrity
→ output filled XLSX
```

---

## 38. Export Mapping Layer

Application MUST maintain explicit versioned template mapping:

```text
business field
→ workbook sheet
→ cell / range / control identifier
→ output formatting/type rule
```

Actual addresses must be discovered/tested against the official template and MUST NOT be guessed.

---

## 39. Native Checkbox Handling

Existing checkbox controls MUST be preserved as native template controls.

Exporter SHOULD update actual mapped OOXML/VML control state rather than replacing controls with Unicode symbols/images/text/new drawings.

---

## 40. Filled XLSX Acceptance

Generated XLSX MUST preserve all non-targeted template structure and open without repair warning.

Structural/golden tests must check expected sheet structure, merges, styles/layout, drawings/media, native controls, print settings, mapped differences, and unexpected part removal.

---

## 41. PDF Renderer

Primary container-friendly candidate = **LibreOffice Headless / Calc PDF export**.

Because requirement is exact fidelity, LibreOffice is a **QUALIFIED renderer candidate**, not automatically authoritative.

```text
candidate renderer
+ approved template
+ golden fixture data
+ visual/print fidelity comparison
= must pass before production use
```

If it cannot preserve the approved expected representation, replace/change renderer rather than weaken requirement.

---

## 42. Renderer Adapter Boundary

Expose a conceptual abstraction:

```text
SpreadsheetPdfRenderer
```

Initial candidate adapter:

```text
LibreOfficeHeadlessRenderer
```

---

## 43. Print Settings

Renderer MUST honor workbook/template print definition whenever technically supported: ranges, paper/orientation, scale/fit, margins, pagination, and existing headers/footers.

---

## 44. Export Temporary Files

Intermediate and READY artifacts are controlled private files.

Confirmed READY binary retention:

```text
168 hours / 7 days
```

Then scheduler cleans the generated binary. Cleanup MUST NOT delete NSCMF source record, authoritative Business/Access/Security Audit evidence, or signing issuance/verification metadata.

---

# PART N — APPROVED PDF SIGNING & VALIDATION TECHNOLOGY BOUNDARY

## 45. PdfSigningService Boundary

Approved PDF signing MUST remain behind an application service/adapter boundary, conceptually:

```text
PdfSigningService
```

Requirements from `10`:

- logical signer = System/Organization;
- human `Approved By` remains a separate workflow actor;
- private key + corresponding public certificate/verification material are provisioned manually on server/environment;
- private key MUST NOT be in GitHub/source/deployment artifact/ordinary DB;
- missing/unreadable/mismatched/unusable required signing identity is a critical readiness/configuration failure;
- mandatory signing failure makes export fail;
- no unsigned Approved-PDF fallback;
- TSA is not required for current MVP.

Exact signing library/algorithm/container format/provider is an implementation/environment choice only if it satisfies these rules and the PDF verification tests.

---

## 46. PdfVerificationService Boundary

Public no-login validator stays in the same Laravel application and uses a conceptual:

```text
PdfVerificationService
```

It MUST support:

- PDF-only temporary upload;
- request rate limiting;
- ClamAV CLEAN before deep parsing;
- recognized NSCMF issuer signature/public-certificate verification;
- SHA-256 calculation over exact uploaded bytes;
- matching against exact final-signed-PDF SHA-256 saved at issuance;
- issuance/version/approval-iteration lookup;
- current-vs-superseded business context resolution;
- minimum-disclosure output.

Canonical semantic results are defined in `10`:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

The public validator is not a public record/history portal.

---

# PART O — AUDIT

## 47. Custom Authoritative Audit Model

Final decision = **custom NSCMF audit/workflow/security tables**, not generic activity-log package as authority.

System distinguishes:

```text
Business Audit
Access Audit
Security Audit
Technical Logs
```

Business/Access/Security Audit are authoritative evidence and **have no age-based automatic purge**. Technical logs are operational and separate; their exact retention remains Environment/Deployment policy.

Exact schema is defined by ERD.

---

## 48. Generic Activitylog Package

Spatie Activitylog is **not required** for MVP.

It MAY be supplemental technical logging but MUST NOT replace domain audit source of truth.

---

# PART P — REALTIME / NOTIFICATION

## 49. No WebSocket for MVP

Do not add Reverb/Pusher/Socket.IO by default.

Concurrency correctness is server-side current-state revalidation, not live UI synchronization.

---

## 50. Notification Technology

Notification remains future capability. Provider not selected and notification is not an MVP workflow dependency.

---

# PART Q — BUILD / PACKAGE TOOLING

## 51. Composer

Use Composer 2.x with committed `composer.lock`.

Production install SHOULD be reproducible and omit dev dependencies.

---

## 52. npm

Use npm with committed `package-lock.json`. CI uses reproducible install such as `npm ci`.

---

## 53. Vite

Vite is the frontend development/build tool through Laravel standard integration.

---

## 54. Required PHP Extensions Direction

Environment MUST provide Laravel/project extensions, including relevant PDO MySQL, mbstring, OpenSSL, tokenizer, XML/DOM, fileinfo, ZIP/`ZipArchive`, and other Laravel runtime requirements.

Exact image/package list is finalized in Environment/Deployment.

---

# PART R — TESTING — REQUIRED FROM PROJECT BOOTSTRAP

## 55. Testing Is First-Class

Testing infrastructure MUST be initialized at project bootstrap.

No core workflow/security/export feature is complete without appropriate tests.

---

## 56. Backend Test Stack — Pest 4

Use **Pest 4.x** for Unit/Feature tests covering authentication, authorization, validation, state transitions, audit, attachments, malware gate, queues, exports, signing, and public PDF verification.

---

## 57. Authorization / Security Tests

High-risk combinations MUST have tests, including:

- Requester cross-record denial;
- Reviewer/Approver out-of-scope denial;
- result-only edit cannot update planning fields;
- protected Superadmin invariants;
- min-password 5 rejected / 6 accepted regardless composition;
- no MFA requirement;
- temporary-password forced change;
- login throttling behavior;
- 30m idle / 8h absolute / max-2 sessions;
- role/permission/password reset session revocation;
- sensitive-admin password re-auth;
- Access/Security Audit privileged visibility;
- no age-based authoritative audit purge;
- ClamAV fail-closed behavior;
- no unsigned Approved-PDF fallback;
- public validator minimum disclosure.

---

## 58. Workflow / State Tests

State tests MUST cover every allowed/important forbidden transition from `05`, including happy path, revision loop, both Approver returns, rejects, Reopen destinations, Cancel, Archive/Unarchive, Change Result gate, Emergency no bypass.

Security failure MUST NOT invent a new persistent NSCMF state.

---

## 59. Concurrency / Stale Action Tests

Backend suite MUST simulate stale Reviewer/Approver actions and Draft/Result optimistic conflicts according to `09`.

---

## 60. Frontend Tests — Vitest 4

Use **Vitest 4.x + Vue Test Utils** for conditional display, autosave/conflict UI, warnings/errors, Result-only locking, action dialogs, session/security feedback, attachment scanning states, public validator result presentation, and accessibility-oriented behavior.

---

## 61. End-to-End Tests — Playwright

Minimum critical E2E journeys include:

1. login → dashboard;
2. temporary-password login → mandatory password change;
3. session expiry/revocation behavior;
4. create Activation → Draft → Submit;
5. create Change → Submit;
6. Requester Result-only update;
7. Reviewer Forward/Return/Reject;
8. Approver Approve/Returns/Reject;
9. authorized Reopen;
10. Archive/Unarchive;
11. History/timeline;
12. attachment structural validation + malware gate;
13. single/bulk export;
14. Approved-PDF signing failure/success;
15. public PDF current/superseded/modified/unknown verification;
16. forbidden/direct-access attempts.

---

## 62. Test Database

CI integration tests SHOULD use **MySQL 8.4**, preferably containerized. SQLite MUST NOT be the only CI DB.

---

## 63. Export Golden Tests

Export requires XLSX structure tests and PDF visual golden tests. Renderer/container upgrades MUST rerun them.

Approved-PDF tests additionally verify:

- signature applied only as required;
- final issued bytes SHA-256 persisted;
- modified byte changes validator result;
- historical exact PDF can remain genuine but become superseded after Reopen/new approval;
- signing failure never exposes unsigned equivalent.

---

## 64. Test Fixture Rule

Tests MUST NOT use real sensitive production data.

---

# PART S — STATIC ANALYSIS / LINT / FORMAT

## 65. Quality Gates

Use Laravel Pint, PHPStan/Larastan, ESLint, Prettier, and `vue-tsc`/TypeScript checking.

Exact strictness is defined later in Coding Rules.

---

# PART T — CI BASELINE

## 66. GitHub Actions

CI baseline remains GitHub Actions with reproducible Composer/npm installs, formatting/static analysis, Pest, frontend lint/type/Vitest/build, Playwright critical suite, and export golden tests where renderer environment is available.

Dependency vulnerability checks SHOULD be included through supported Composer/npm/GitHub capabilities.

Real signing private keys MUST NOT be stored in repository/normal CI fixture. Tests use dedicated non-production test signing material provisioned securely by test environment.

---

# PART U — DOCKER COMPATIBILITY

## 67. Container Baseline

Project MUST be Docker-compatible.

Logical services MAY include:

```text
app runtime
web server
MySQL
queue worker
ClamAV / clamd
qualified spreadsheet renderer
```

Exact deployment topology is deferred to `09`, `14`, and `20`; logical separation does not mean every item needs a dedicated physical server.

This document does not require Kubernetes.

---

## 68. LibreOffice Isolation

Spreadsheet renderer SHOULD be isolated from request processing via queued export boundary. Packages/fonts/runtime must be pinned after qualification.

---

## 69. ClamAV Operational Direction

ClamAV may run as a same-host daemon or private container/service, subject to Environment/Deployment sizing.

Operational requirements include:

- private-only daemon endpoint;
- virus-definition updates;
- health/readiness visibility;
- resource sizing that accounts for ClamAV memory/CPU alongside Laravel/MySQL/renderer if colocated;
- scanner failure treated fail-closed by application.

No separate antivirus server is inherently required for the current 50-user architecture unless deployment sizing/operations choose one.

---

# PART V — CAPACITY AND SIMPLICITY

## 70. Capacity Baseline

Actual expected users ~10. Engineering baseline = **50 users**.

MySQL + database queue/session/cache is adequate starting architecture if performance evidence does not show otherwise.

---

## 71. No Premature Infrastructure

MVP MUST NOT add by default Kubernetes, microservices, Kafka/RabbitMQ, Redis cluster, external search engine, separate API gateway, separate Vue deployment, WebSockets, CDN dependency, or generic BPM engine.

ClamAV is not considered premature infrastructure because malware scanning is now a confirmed security requirement.

---

# PART W — LOGGING / OBSERVABILITY BOUNDARY

## 72. Application Logging

Use Laravel logging for technical/application logs.

Technical logs remain separate from authoritative Business/Access/Security Audit.

Application logs MUST NOT replace audit records. Exact technical-log retention, channels, metrics, health checks, alerts remain downstream.

Security-sensitive values such as passwords, private key material/passphrases, secrets, and raw authentication payloads MUST NOT be logged.

---

# PART X — TECHNOLOGY GUARDRAILS

## 73. Developer / AI Must Not

Implementation MUST NOT:

1. switch Vue to React without specification change;
2. build a separate REST SPA when Inertia monolith is confirmed;
3. use frontend authorization as security boundary;
4. treat Spatie permission alone as sufficient for scope/state authorization;
5. use Spatie teams as undocumented Unit/Approval-scope substitute;
6. enable public registration;
7. add SSO/LDAP/OAuth/MFA without approved change;
8. impose password composition beyond confirmed minimum-6 rule;
9. use MySQL Innovation instead of selected 8.4 LTS without review;
10. use SQLite as the only DB test target;
11. add Redis without demonstrated need;
12. add WebSocket just to make queues look realtime;
13. add external search engine without evidence;
14. use HTML rendering as authoritative NSCMF PDF template;
15. rebuild Excel template visually in code;
16. casually re-save official workbook through library that strips native controls;
17. replace native checkboxes with symbols/images;
18. claim LibreOffice exact without golden qualification;
19. accept visually different PDF by weakening requirement;
20. make generic activity-log package authoritative audit;
21. postpone tests until after implementation;
22. let renderer/dependency upgrade bypass export regression;
23. add Inertia SSR without requirement;
24. expose private attachments through public filesystem paths;
25. make cache/session/queue state authoritative over persisted business data;
26. treat ClamAV failure/timeout/unavailability as CLEAN;
27. expose `clamd` publicly;
28. delete Business/Access/Security Audit because of age;
29. put production signing private key in GitHub/source/deployment artifact/ordinary DB;
30. deliver unsigned Approved PDF when mandatory signing fails;
31. claim TSA-backed independent timestamp assurance when current MVP has no TSA;
32. make public PDF validator a public History/record portal;
33. make cryptographic signer replace human `Approved By`.

---

# PART Y — REQUIRED DEPENDENCY CATEGORIES

## 74. PHP / Composer Baseline

Expected categories:

```text
laravel/framework ^13
spatie/laravel-permission ^8
pestphp/pest ^4 --dev
larastan/larastan --dev
Laravel Pint --dev / Laravel-provided tooling
```

ClamAV client integration package is optional; exact package MAY be selected at bootstrap after compatibility review because the authoritative requirement is the `MalwareScanner` adapter + `clamd`, not a particular package.

PDF signing library is similarly selected only if it satisfies exact signing/verification requirements and tests.

---

## 75. npm Baseline

Expected categories:

```text
vue 3.x
@inertiajs/vue3 / Inertia 3-compatible packages
TypeScript
Tailwind CSS 4.x
Vite
shadcn-vue generated/component dependencies
lucide-vue-next
Vitest 4.x
@vue/test-utils
Playwright
ESLint
Prettier
vue-tsc
```

Exact packages from current official Laravel Vue starter kit/shadcn-vue install are subject to this specification and lockfile.

---

# PART Z — EXTERNAL VERSION VERIFICATION BASIS

## 76. Verification Notes — 2026-08-21

Technology version/direction basis includes current official project sources checked during specification work. External sources validate capability/version direction only and never override NSCMF decisions.

Relevant references already established for Laravel 13, Laravel starter kits/validation/database, Node LTS, MySQL 8.4 LTS, Spatie Permission 8, Vitest 4, and LibreOffice PDF export.

For ClamAV, `clamd`/`freshclam` behavior and community-integration boundary follow official ClamAV documentation. Exact server package installation and update schedule belong to Environment/Deployment.

---

# PART AA — TESTABLE TECH STACK ACCEPTANCE CRITERIA

## 77. Runtime / Build

- [ ] Laravel 13 + PHP 8.5.
- [ ] Vue 3 + TypeScript + Inertia 3.
- [ ] Node 24 LTS.
- [ ] Tailwind 4 + shadcn-vue.
- [ ] `composer.lock` and `package-lock.json` committed.
- [ ] production build has explicit type checking.

## 78. Authentication / Authorization

- [ ] login = username + password;
- [ ] public registration disabled;
- [ ] password min 6 and no composition rule;
- [ ] no MFA requirement;
- [ ] admin temporary password + forced change works;
- [ ] 30m idle / 8h absolute / max2 sessions enforced;
- [ ] sensitive admin password re-auth works;
- [ ] target session revocation works;
- [ ] Spatie handles permission primitives while Policies/custom scope enforce domain access.

## 79. Database / Queue / Storage / Malware

- [ ] MySQL 8.4 LTS primary/CI integration DB.
- [ ] Database queue/session/cache work without Redis.
- [ ] Attachments use private Filesystem abstraction.
- [ ] ClamAV/`clamd` integration sits behind adapter.
- [ ] file is not usable before explicit CLEAN.
- [ ] scanner error/timeout/unavailable fails closed.
- [ ] `clamd` not publicly exposed.

## 80. Export / Signing / Verification

- [ ] official XLSX template version/integrity known;
- [ ] targeted OOXML patching preserves native controls/unrelated parts;
- [ ] PDF rendered from spreadsheet representation;
- [ ] renderer qualified by golden tests;
- [ ] Approved PDF signed by System/Organization;
- [ ] signing key absent from repository/deployment artifact;
- [ ] missing required signing identity triggers critical readiness/configuration failure;
- [ ] no unsigned Approved-PDF fallback;
- [ ] exact final-signed-PDF SHA-256 stored as issuance evidence;
- [ ] public verifier differentiates current/superseded/modified/unknown;
- [ ] no TSA is required/claimed in current MVP.

## 81. Audit / Testing / Quality

- [ ] Business/Access/Security Audit separated from technical logs.
- [ ] authoritative audit has no age-based purge.
- [ ] privileged Access/Security Audit permissions tested.
- [ ] Pest/Vitest/Playwright exist from bootstrap.
- [ ] MySQL-backed CI tests exist.
- [ ] concurrency tests exist.
- [ ] export/signing/verification golden/integrity tests exist.
- [ ] Pint/PHPStan-Larastan/ESLint/Prettier/vue-tsc are quality gates.

---

# PART AB — RELATIONSHIP TO OTHER DOCUMENTS

## 82. Authority Matrix

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariant | `02_Business_Rules.md` |
| User interaction sequence | `03_User_Flow.md` |
| Permission semantics/scope | `04_RBAC_Permission_Matrix.md` |
| State/lifecycle | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| Presentation/interaction | `07_UI_UX_Specification.md` |
| **Technology selection** | **`08_Tech_Stack_Specification.md`** |
| Component/topology architecture | `09_System_Architecture.md` |
| Security controls | `10_Security_Rules.md` |
| Database schema | `11_ERD_Database_Schema.md` |
| API contracts | `12_API_Contract.md` |
| Project directories/code organization | `13_Project_Structure.md` |
| Environment variables/runtime setup | `14_Environment_Specification.md` |
| Coding/AI rules | `15_Coding_Rules_AGENTS.md` |
| Detailed tests | `16_Testing_Specification.md` |
| Seed/dummy fixtures | `17_Seed_Dummy_Data_Specification.md` |
| Completion gates | `18_Definition_of_Done.md` |
| Implementation order | `19_Task_Implementation_Plan.md` |
| Production topology | `20_Deployment_Architecture.md` |

---

## 83. Decisions Intentionally Deferred

This tech stack does not silently decide:

- exact ERD/table/index definitions;
- exact API request/response schema;
- exact Docker Compose/production container topology;
- exact production S3-compatible provider;
- exact ClamAV deployment form/sizing while preserving the confirmed scanner technology/security behavior;
- exact technical-log retention/monitoring platform;
- notification provider;
- official company numbering SOP/sample;
- exact Unit/Division master data;
- exact signing certificate file format/path/provider/CA where external trust beyond NSCMF's issuer/validator model is later required;
- exact private-key rotation ceremony;
- backup/restore/DR/RPO/RTO;
- performance/SLA/availability targets.

The following are **not TBD** anymore:

```text
password/security baseline
session limits
no MFA
ClamAV malware scanner + fail-closed CLEAN gate
no age-based authoritative audit deletion
Approved-PDF signing custody/readiness requirement
public PDF verification
no TSA requirement for MVP
exact-template XLSX/PDF contract
async export + 7-day binary retention
```

---

## 84. Synchronization Status / Next Document

Prior business, user-flow, RBAC, validation, UI, architecture, and FigJam artifacts are being synchronized to the confirmed security decisions without changing their authoritative concern boundaries.

The next document in fixed project order is:

**`10_Security_Rules.md`**

It is authoritative for the confirmed security-control behavior and is followed by `11_ERD_Database_Schema.md`.