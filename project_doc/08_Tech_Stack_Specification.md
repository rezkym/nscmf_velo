# Tech Stack Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-TECH-008  
> **Document Order:** 08 / 20  
> **Status:** Draft — Confirmed Technology Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`  
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

System Architecture (`09`) menentukan komponen dan interaction topology berdasarkan stack ini. Deployment Architecture (`20`) menentukan production topology/final hosting implementation.

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
11. detailed immutable business/workflow audit;
12. attachment up to 10 files × 20 MB;
13. structured searchable History;
14. single/bulk export;
15. exact-template XLSX/PDF export requirement;
16. desktop-first Vue/shadcn-like UI direction;
17. initial practical user count ~10, engineered safely for **50 users**;
18. Docker/container is allowed;
19. MVP does not need WebSocket/realtime infrastructure;
20. testing infrastructure must be established properly from project bootstrap.

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
| XLSX Export | **Original template + targeted OOXML patching** |
| PDF Export | **Qualified spreadsheet renderer**, LibreOffice Headless primary candidate after golden fidelity qualification |
| Audit | **Custom authoritative NSCMF audit/workflow model** |
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
- audit events;
- queue jobs;
- attachment access;
- export orchestration;
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
GenerateNscmfExport
```

Exact directory structure is defined later in `13_Project_Structure.md`.

This specification only requires that workflow/business logic not be scattered across controllers, Vue pages, jobs, and model hooks without a clear authoritative layer.

---

## 9. Database Transactions

Laravel `DB::transaction()` + MySQL InnoDB transaction primitives MUST be available for workflow-changing operations.

The exact locking strategy—row lock, optimistic version, combination, retry policy—is finalized in System Architecture / ERD/API documents.

However implementation MUST preserve the already-confirmed invariant:

```text
permission/scope/state validation
+ state update
+ audit evidence
= one consistent business action
```

No partial successful workflow transition is allowed.

---

# PART E — FRONTEND

## 10. Vue 3 + TypeScript

Final frontend framework = **Vue 3** using Composition API and TypeScript.

This resolves the previous `07` technology boundary.

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
- local interaction state.

Vue MUST NOT become the source of truth for permission or workflow validity.

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
→ server validation
→ transaction/persistence
→ Inertia response / redirect / validation errors
```

Dedicated JSON endpoints MAY exist when technically natural for autosave, file upload, export status, or similar internal behavior, but they remain part of the same Laravel application and MUST obey the same backend rules.

---

## 12. No Inertia SSR Requirement

Inertia server-side rendering is **not required** for MVP.

Rationale:

- application is internal;
- SEO is irrelevant;
- SSR introduces another long-running Node process without product value for current requirement.

SSR MUST NOT be added by default.

---

# PART F — UI COMPONENT STACK

## 13. shadcn-vue

Final UI component direction = **shadcn-vue**, consistent with `07_UI_UX_Specification.md`.

Use its component approach for:

- button;
- input/textarea;
- select;
- checkbox/radio;
- dialog/alert dialog;
- sidebar;
- table primitives;
- dropdown;
- badge;
- tabs;
- alert;
- tooltip;
- popover;
- date/calendar patterns;
- skeleton;
- toast/sonner-style feedback.

Components live in the application codebase and MAY be customized to implement NSCMF design tokens.

MUST NOT modify business behavior merely to fit a component default.

---

## 14. Tailwind CSS 4

Use **Tailwind CSS 4.x** for application styling.

Brand tokens from `07` MUST remain authoritative:

```text
#091540
#1B2CC1
#7692FF
#ABD2FA
```

Semantic green/yellow-red/neutral treatment remains defined by `07`.

Tailwind config/theme implementation MUST preserve the neutral-first, color-with-purpose principle.

---

## 15. Icon Library

Preferred icon family = **Lucide / lucide-vue-next**, aligned with shadcn-style conventions.

Critical workflow actions retain text labels; icon is supplemental.

---

# PART G — AUTHENTICATION

## 16. Authentication Model

Application is standalone.

Confirmed login:

```text
username
+ password
```

No Microsoft SSO, LDAP, OAuth, or external IdP is required for MVP.

Authentication uses Laravel session authentication through the Laravel starter-kit/Fortify foundation.

---

## 17. Username as Login Identifier

`username` is the primary login identifier.

MUST:

- be unique according to final DB rules;
- be resolved server-side;
- never store plaintext password;
- use Laravel-supported password hashing;
- reject disabled user login;
- respect protected Superadmin invariants.

Exact username length/pattern and password policy are finalized in Security Rules (`10`).

---

## 18. Fortify Features

Public registration MUST be disabled.

The application MUST NOT expose normal self-registration routes/UI.

Email verification is not required for the standalone username/password baseline unless Security Rules later introduce an explicit requirement.

Self-service password-reset email flow is not required by current product flow; credential reset is performed through authorized administration as already defined upstream.

Security Rules will define:

- password complexity;
- reset handling;
- session timeout;
- login throttling;
- lockout behavior;
- credential audit expectations.

---

# PART H — AUTHORIZATION

## 19. Spatie Laravel Permission

Use **Spatie Laravel Permission 8.x** for role/permission primitives.

It is responsible for:

- role definitions;
- permission definitions;
- user-role relationships;
- direct/custom permissions where required;
- Laravel Gate integration.

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
+ protected invariants
```

Use:

- **Spatie** → role/permission primitives;
- **Laravel Policies/Gates** → resource authorization boundary;
- **custom domain scope/query logic** → ownership/Unit/Reviewer/Approver scope;
- **domain services** → state/action eligibility and invariant enforcement.

Spatie `teams` feature MUST NOT silently replace the project's Unit/Division or Approval Scope model.

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

`06_Validation_Rules.md` remains authoritative.

Implementation SHOULD map canonical validation profiles such as:

```text
DRAFT_PERSIST
FIRST_SUBMIT
RESUBMIT
REVIEW_FORWARD
APPROVAL_ACTION
RESULT_CAPTURE
...
```

into explicit backend validation/application paths rather than one giant generic validator.

---

## 23. Frontend Validation

Frontend validation exists for usability only.

Use:

- HTML/input constraints;
- Vue component constraints;
- Inertia server error bags;
- small client-side format/helper validation where it materially improves UX.

The project MUST NOT maintain a second independent client-side business-rule schema whose behavior can silently diverge from Laravel.

Server always revalidates authoritative actions.

---

# PART J — DATABASE

## 24. MySQL 8.4 LTS

Final relational database = **MySQL 8.4 LTS**, InnoDB.

Use:

- transactional InnoDB tables;
- foreign keys where domain model allows;
- `utf8mb4` character set;
- appropriate indexes for scoped queues/history/search;
- database constraints for invariants that belong safely at DB level.

Exact schema is defined in `11_ERD_Database_Schema.md`.

---

## 25. Eloquent + Query Builder

Eloquent is the normal application data model.

Query Builder/raw SQL MAY be used for performance-sensitive queries when justified and tested.

User-controlled values MUST NOT be concatenated into unparameterized SQL.

---

## 26. No Search Engine for MVP

Do not introduce Elasticsearch, OpenSearch, Meilisearch, Typesense, or Laravel Scout infrastructure for initial implementation.

History/queue requirements are structured and can be fulfilled through MySQL indexes and Eloquent/query-builder filtering at target scale.

A dedicated search engine requires evidence of a real scaling/search problem before adoption.

---

# PART K — SESSION, CACHE, QUEUE

## 27. Database Session Driver

Use Laravel **database session** baseline.

Rationale:

- works cleanly with Docker;
- avoids container-local session state;
- supports future multiple app instances more safely than local-file session;
- target user count is small enough that database session overhead is acceptable.

---

## 28. Database Cache

Use Laravel database cache baseline for current requirements.

Redis is intentionally **not required** for MVP.

Cache MUST NOT be the source of truth for workflow status, authorization, or audit history.

---

## 29. Database Queue

Use **Laravel Database Queue**.

Good queue candidates include:

- exact-template export generation;
- bulk exports;
- future notification delivery;
- non-blocking maintenance tasks.

Direct form/workflow state transitions SHOULD remain synchronous business requests unless Architecture later defines a strong reason otherwise.

Queue jobs MUST be idempotent/retry-aware where relevant.

---

## 30. Redis Position

Redis, Horizon, or distributed cache/queue infrastructure is **not part of MVP baseline**.

It MAY be introduced later if metrics demonstrate need for:

- higher job throughput;
- queue monitoring requirements;
- distributed locks;
- significant cache load;
- horizontal scaling beyond database-backed infrastructure.

Do not add Redis preemptively.

---

# PART L — ATTACHMENT STORAGE

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

Examples MAY include AWS S3 or S3-compatible service such as MinIO, but exact provider is Deployment Architecture responsibility.

---

## 32. Private by Default

NSCMF attachments MUST NOT be stored as publicly addressable web assets.

Download/view must flow through authorized application access or time-limited/private storage access according to Security/Architecture.

Attachment limits/types remain defined by `06`.

---

# PART M — EXACT XLSX / PDF EXPORT — CRITICAL

## 33. Export Requirement Is Template Fidelity, Not HTML Rendering

The export requirement is strict:

> The exported XLSX and PDF MUST preserve the official NSCMF XLSX template exactly as the visual/export source of truth. Existing template structure is not redesigned. Only the intended business fields/control states are filled or replaced.

Therefore the application MUST NOT treat an HTML Blade/Vue page as the authoritative NSCMF export template.

DOMPDF/Browsershot HTML rendering is **not** the authoritative NSCMF export approach.

---

## 34. Canonical Export Template

Original `NSCMF-Form-3.0.xlsx` is the canonical export template baseline until an approved newer template version exists.

The template contains features that must be preserved, including native Excel package artifacts such as:

- worksheets;
- formatting/styles;
- merged cells;
- row heights;
- column widths;
- drawing/media content;
- print settings;
- VML drawings;
- native Form Control checkbox definitions / control properties.

Template MUST be versioned and integrity-checked.

A production export MUST always be traceable to the template version used.

---

## 35. No Generic Workbook Rewrite in Authoritative Path

Because the source workbook contains native Excel Form Controls and VML/control-property parts, the authoritative exporter MUST NOT casually load and re-save the workbook through a generic spreadsheet library if doing so rewrites/strips unsupported package parts.

This includes a guardrail against assuming a library is safe simply because ordinary cells/styles survive.

The approved strategy is **targeted OOXML package patching**.

---

## 36. Targeted OOXML Patching

XLSX is treated as an OOXML ZIP package.

Authoritative export implementation SHOULD use PHP-native primitives such as:

- `ZipArchive`;
- `DOMDocument`;
- `DOMXPath`;

or an equivalently controlled implementation to modify only explicitly mapped OOXML parts.

Conceptual flow:

```text
immutable official template
→ copy to temporary export workspace
→ patch mapped worksheet cell values
→ patch mapped checkbox/control state where required
→ preserve all unrelated package parts
→ validate package integrity
→ output filled XLSX
```

The exporter MUST NOT rebuild worksheet layout from application code.

---

## 37. Export Mapping Layer

Application MUST maintain an explicit template mapping per template version.

Conceptual mapping:

```text
business field
→ workbook sheet
→ cell / range / control identifier
→ output formatting/type rule
```

Examples conceptually:

```text
request_no -> Activation!<mapped cell>
customer_name -> Activation!<mapped cell>
change.service_impact.NOC15 -> mapped native checkbox/control
approved_by -> mapped sign-off field
```

Actual cell/control addresses MUST be discovered from and tested against the official template; this document intentionally does not invent addresses.

Mapping is technical configuration/code and MUST be version-controlled.

---

## 38. Native Checkbox Handling

Existing checkbox controls MUST be preserved as existing template controls.

The exporter SHOULD update the actual mapped OOXML/VML control state rather than replacing controls with Unicode symbols, images, text characters, or newly drawn checkboxes.

Any implementation that changes the visual control type fails template-fidelity acceptance.

---

## 39. Filled XLSX Acceptance

Generated XLSX MUST preserve all non-targeted template structure.

Minimum structural checks SHOULD include:

- workbook opens without repair warning;
- same expected sheet structure;
- same merged ranges unless a mapped field intentionally changes only value;
- same style definitions/layout;
- same drawings/media;
- same native control count/type;
- same print settings;
- only mapped fields/control states differ;
- no unexpected XML parts removed.

---

## 40. PDF Renderer

Primary container-friendly candidate = **LibreOffice Headless / Calc PDF export**.

However, because the requirement is **exact fidelity**, LibreOffice is not automatically production-authoritative merely because it can convert XLSX to PDF.

It is a **QUALIFIED renderer candidate**.

Production rule:

```text
candidate renderer
+ approved template
+ golden fixture data
+ visual/print fidelity comparison
= must pass before production use
```

If LibreOffice output differs from the approved expected XLSX print representation, implementation MUST NOT weaken the product requirement. The renderer must be replaced/changed with another qualified spreadsheet rendering method.

---

## 41. Renderer Adapter Boundary

Export implementation SHOULD expose a renderer abstraction conceptually:

```text
SpreadsheetPdfRenderer
```

so application/domain code does not depend directly on one executable.

Initial candidate adapter:

```text
LibreOfficeHeadlessRenderer
```

This keeps exact-fidelity qualification replaceable without rewriting workflow/export orchestration.

---

## 42. Print Settings

PDF renderer MUST honor the workbook/template print definition whenever technically supported, including relevant:

- print ranges;
- paper/orientation;
- scale/fit behavior;
- margins;
- pagination;
- existing headers/footers where present.

Implementation MUST NOT redesign PDF page layout independently from the XLSX template.

---

## 43. Export Temporary Files

Intermediate filled XLSX/PDF files SHOULD be created in controlled private temporary storage.

Temporary export artifacts MUST have cleanup policy defined by Architecture/Environment/Security.

They MUST NOT be publicly exposed by predictable path.

---

# PART N — AUDIT

## 44. Custom Authoritative Audit Model

Final decision = **custom NSCMF audit/workflow tables**, not generic activity-log package as the authoritative source.

Rationale:

Project requires domain-specific evidence:

- source state;
- action;
- target state;
- workflow iteration/context;
- actor;
- viewer vs modifier distinction;
- old/new values;
- mandatory reason;
- sign-off actor/timestamp;
- attachment changes;
- Result capture;
- reopen/archive lifecycle;
- stale/conflicting action semantics.

Exact schema is defined by ERD.

---

## 45. Generic Activitylog Package

Spatie Activitylog is **not required** for MVP.

It MAY be introduced later only as supplemental technical logging if it adds value, but MUST NOT replace the domain audit source of truth.

Avoid duplicate competing audit systems unless responsibility is explicitly separated.

---

# PART O — REALTIME / NOTIFICATION

## 46. No WebSocket for MVP

Do not add Laravel Reverb, Pusher, Socket.IO, or equivalent realtime infrastructure by default.

Concurrency correctness is guaranteed by server-side current-state revalidation, not by live UI synchronization.

UI handles stale state through explicit refresh/current-state response as defined in `07`.

---

## 47. Notification Technology

Notification remains future capability.

Laravel Notification/queue primitives MAY be used later, but Telegram/WhatsApp/Baileys providers are not selected in this specification.

Notification is not an MVP workflow dependency.

---

# PART P — BUILD / PACKAGE TOOLING

## 48. Composer

Use Composer 2.x with committed `composer.lock`.

Production install SHOULD use reproducible dependency installation and omit development dependencies.

---

## 49. npm

Use npm with committed `package-lock.json`.

CI MUST use reproducible install behavior such as `npm ci`.

Do not mix npm/yarn/pnpm lockfiles in the same project.

---

## 50. Vite

Vite is the frontend development/build tool through Laravel's standard integration.

It handles:

- Vue SFC compilation;
- TypeScript;
- Tailwind build integration;
- development HMR;
- production assets.

---

## 51. Required PHP Extensions Direction

Environment MUST provide extensions required by Laravel/project features, including at minimum relevant:

- PDO MySQL;
- mbstring;
- OpenSSL;
- tokenizer;
- XML/DOM;
- fileinfo;
- ZIP / `ZipArchive` for targeted XLSX package processing;
- other Laravel runtime requirements.

Exact Docker image/package list is finalized in Environment Specification / Deployment Architecture.

---

# PART Q — TESTING — REQUIRED FROM PROJECT BOOTSTRAP

## 52. Testing Is a First-Class Stack Component

Testing infrastructure MUST be initialized at project bootstrap, not postponed until features are mostly complete.

No core workflow feature is considered implementation-complete without tests appropriate to its risk.

---

## 53. Backend Test Stack — Pest 4

Use **Pest 4.x** for PHP tests.

Required backend categories:

```text
tests/Unit
- pure domain/helper rules
- value/format rules where appropriate

tests/Feature
- authentication
- authorization/policies
- CRUD/application actions
- validation profiles
- state transitions
- history/audit
- attachments
- exports
- queues
```

Exact directory naming can be refined in `13_Project_Structure.md`.

---

## 54. Authorization Tests

Every high-risk permission/state combination MUST have explicit tests.

Examples:

- Requester cannot view another Requester's private record without other scope;
- Reviewer outside scope denied;
- Approver outside scope denied;
- hidden button is irrelevant to server denial;
- `nscmf.change.result.edit` cannot edit planning fields;
- Reopen/Archive permissions obey state + archive guard;
- protected Superadmin invariants cannot be bypassed.

---

## 55. Workflow / State Tests

State machine tests MUST cover every allowed and important forbidden transition from `05`.

Must include:

- happy path;
- Return/Revision loop;
- Approver Return Reviewer;
- Approver Return Requester requiring Review again;
- Reviewer/Approver Reject;
- Reopen destinations;
- Cancel permanent terminal;
- Archive/Unarchive;
- Change Result Forward gate;
- Emergency no bypass.

---

## 56. Concurrency / Stale Action Tests

Backend test suite MUST explicitly simulate stale workflow actions.

Example target:

```text
Reviewer A Forward succeeds
Reviewer B stale Reject fails
state remains PENDING_APPROVAL
only one valid transition/audit result exists
```

Equivalent Approver race must be tested.

Exact DB locking mechanism may be finalized later, but behavioral concurrency tests are required now.

---

## 57. Frontend Tests — Vitest 4

Use **Vitest 4.x** with Vue Test Utils.

Frontend tests SHOULD focus on behavior that can fail independently of Laravel server tests, including:

- conditional component display;
- section navigation behavior;
- autosave UI state machine;
- warning vs error rendering;
- Result-only UI locking;
- action-dialog behavior;
- status/archive badge presentation;
- reusable composables/utilities;
- accessibility-oriented component behavior where practical.

Do not duplicate every backend validation rule as a frontend unit test.

---

## 58. End-to-End Tests — Playwright

Use **Playwright** directly for browser/E2E flows.

Minimum critical E2E journeys:

1. login → dashboard;
2. create Activation → Draft → Submit;
3. create Change → Submit;
4. Requester Result-only update during Review;
5. Reviewer Forward;
6. Reviewer Return → Requester revision → Resubmit;
7. Reviewer Reject;
8. Approver Approve;
9. Approver Return Reviewer;
10. Approver Return Requester;
11. Approver Reject;
12. authorized Reopen;
13. Archive/Unarchive;
14. History/timeline;
15. attachment upload constraints;
16. single export;
17. bulk export;
18. forbidden/direct-access attempts.

Primary browser baseline SHOULD include Chromium-compatible behavior. Additional browser matrix can be defined in Testing Specification.

---

## 59. Test Database

CI integration/feature tests that depend on database behavior SHOULD use **MySQL 8.4**, preferably containerized.

SQLite MUST NOT be the only CI database because differences in constraints, transactions, indexing, locking, and MySQL behavior could hide production defects.

Fast isolated unit tests MAY remain database-independent.

---

## 60. Export Golden Tests

Export is a critical fidelity subsystem and MUST have dedicated golden tests.

### XLSX Golden Structure Test

For known fixture data:

```text
official template
+ fixture record
→ generated XLSX
```

Verify at minimum:

- expected mapped values;
- expected control states;
- workbook opens correctly;
- expected OOXML package parts preserved;
- unexpected layout/style/control mutation fails the test.

### PDF Golden Visual Test

For the same approved fixture:

```text
generated XLSX
→ qualified renderer
→ generated PDF
→ compare against approved golden/reference rendering
```

Visual difference outside explicitly dynamic content MUST fail fidelity qualification.

Renderer/container upgrades MUST rerun the golden export suite.

---

## 61. Test Fixture Rule

Test fixtures MUST NOT use real sensitive production data.

Dummy/seed specification is defined in `17_Seed_Dummy_Data_Specification.md`.

---

# PART R — STATIC ANALYSIS / LINT / FORMAT

## 62. Laravel Pint

Use Laravel Pint for PHP code formatting.

CI MUST fail on unformatted PHP according to repository standard.

---

## 63. PHPStan / Larastan

Use PHPStan with Larastan for Laravel-aware static analysis.

The project SHOULD start with a meaningful strictness level from the beginning and increase deliberately; it MUST NOT be permanently disabled because existing code accumulated unchecked issues.

Exact level is finalized in `15_Coding_Rules_AGENTS.md`.

---

## 64. ESLint

Use ESLint for Vue/TypeScript linting.

Rules SHOULD cover:

- Vue SFC correctness;
- TypeScript quality;
- obvious unsafe patterns;
- import/code consistency.

---

## 65. Prettier

Use Prettier for JS/TS/Vue formatting where appropriate.

Formatting responsibilities between ESLint and Prettier MUST be configured to avoid conflicting rules.

---

## 66. Type Checking

Production/CI build quality gate MUST include TypeScript/Vue type checking through `vue-tsc` or equivalent supported Vue TypeScript tooling.

A Vite production build succeeding is not a substitute for explicit type checking.

---

# PART S — CI BASELINE

## 67. GitHub Actions

GitHub Actions is the baseline CI service because source repository is hosted on GitHub.

CI SHOULD run on pull request and relevant main-branch updates.

Minimum gates:

```text
Composer install
npm ci
PHP formatting check
PHP static analysis
Pest tests
ESLint
Prettier check
Vue/TypeScript type check
Vitest
production frontend build
Playwright critical suite
export golden tests where environment supports renderer
```

Jobs MAY be parallelized later for speed.

---

## 68. Dependency Security

Dependency vulnerability checks SHOULD be part of CI/maintenance using supported Composer/npm/GitHub capabilities.

Exact security scanning policy belongs to `10_Security_Rules.md` and Testing/CI details.

---

# PART T — DOCKER COMPATIBILITY

## 69. Container Baseline

Project MUST be Docker-compatible for local/CI/runtime packaging.

Containerization MAY include logical services such as:

```text
app runtime
web server
MySQL
queue worker
qualified spreadsheet renderer
```

Exact container topology is intentionally deferred to `09_System_Architecture.md`, `14_Environment_Specification.md`, and `20_Deployment_Architecture.md`.

This document does not require Kubernetes.

---

## 70. LibreOffice Isolation

Spreadsheet PDF rendering SHOULD be isolated from normal request processing through queued export execution and an explicit renderer boundary.

LibreOffice packages/fonts/runtime must be pinned in the qualified container/environment so rendering does not silently change after system updates.

---

# PART U — CAPACITY AND SIMPLICITY

## 71. Capacity Baseline

Actual expected users currently approximately 10.

Engineering planning baseline = **50 users**.

At this scale the stack intentionally avoids premature distributed infrastructure.

MySQL + database queue/session/cache is adequate as a starting architecture provided performance tests/monitoring do not show otherwise.

---

## 72. No Premature Infrastructure

MVP MUST NOT add by default:

- Kubernetes;
- microservices;
- event broker/Kafka/RabbitMQ;
- Redis cluster;
- Elasticsearch/OpenSearch;
- separate API gateway;
- separate Vue deployment;
- WebSocket infrastructure;
- CDN dependency for core internal app;
- generic workflow/BPM engine.

These require explicit demonstrated need and specification change.

---

# PART V — LOGGING / OBSERVABILITY BOUNDARY

## 73. Application Logging

Use Laravel logging facilities for technical/application logs.

Technical logs are separate from authoritative NSCMF business audit.

Implementation MUST NOT assume application logs can replace audit records.

Exact logging channels, retention, metrics, health checks, and alerting are finalized in System Architecture/Security/Environment/Deployment documents.

---

# PART W — TECHNOLOGY GUARDRAILS

## 74. Developer / AI Must Not

Implementation MUST NOT:

1. switch Vue to React without specification change;
2. build a separate REST SPA when Inertia monolith is the confirmed baseline;
3. use frontend authorization as security boundary;
4. treat Spatie permission alone as sufficient for scope/state authorization;
5. use Spatie teams as an undocumented substitute for Unit/Approval scopes;
6. enable public registration;
7. add SSO/LDAP/OAuth requirement without approved change;
8. use MySQL Innovation line instead of selected 8.4 LTS without review;
9. use SQLite as the only database test target;
10. add Redis because it is fashionable rather than required;
11. add WebSocket just to make queues look realtime;
12. add external search engine for current 50-user baseline without evidence;
13. use DOMPDF/HTML rendering as authoritative NSCMF template export;
14. rebuild the Excel template visually in code;
15. casually save the official workbook through a library that strips/changes native controls;
16. replace native checkboxes with characters/images merely for easier export;
17. claim LibreOffice is exact without golden qualification;
18. accept visually different PDF output by weakening the exact-template requirement;
19. make generic activity-log package the authoritative workflow audit;
20. postpone all tests until after implementation;
21. merge workflow/state functionality without server-side feature tests;
22. allow renderer/dependency upgrade to bypass export regression tests;
23. add Inertia SSR without requirement;
24. expose private attachments through public filesystem paths;
25. make cache/session/queue state authoritative over persisted business data.

---

# PART X — REQUIRED DEPENDENCY CATEGORIES

## 75. PHP / Composer Baseline

Required/expected categories:

```text
laravel/framework ^13
spatie/laravel-permission ^8
pestphp/pest ^4 --dev
larastan/larastan --dev
Laravel Pint --dev / Laravel-provided tooling
```

Exact patch constraints and any additional packages are selected at implementation/bootstrap time and captured by `composer.lock`.

The project SHOULD avoid adding third-party packages for features adequately provided by Laravel/PHP unless the package clearly reduces risk/complexity.

---

## 76. npm Baseline

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

Exact packages generated by the current official Laravel Vue starter kit and shadcn-vue installation are authoritative at bootstrap, subject to this specification and lockfile.

---

# PART Y — EXTERNAL VERSION VERIFICATION BASIS

## 77. Verification Notes — 2026-08-21

Technology versions/directions were checked against current official sources before this specification was written.

Relevant references:

- Laravel 13 release/support: `https://laravel.com/docs/13.x/releases`
- Laravel official starter kits: `https://laravel.com/starter-kits`
- Laravel 13 starter-kit authentication/Fortify: `https://laravel.com/docs/13.x/starter-kits`
- Laravel validation: `https://laravel.com/docs/13.x/validation`
- Laravel database transactions: `https://laravel.com/docs/13.x/database`
- Node release/LTS schedule: `https://nodejs.org/about/previous-releases`
- MySQL 8.4 LTS model: `https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html`
- Spatie Permission compatibility: `https://spatie.be/docs/laravel-permission/v8/prerequisites`
- Vitest 4 documentation: `https://v4.vitest.dev/guide/`
- LibreOffice Calc PDF export: `https://help.libreoffice.org/latest/en-US/text/shared/01/ref_pdf_export.html?DbPAR=CALC`

External sources validate technology capability/version direction only. They do not override NSCMF business requirements.

---

# PART Z — TESTABLE TECH STACK ACCEPTANCE CRITERIA

## 78. Runtime / Build

- [ ] Application runs on Laravel 13 + PHP 8.5.
- [ ] Frontend uses Vue 3 + TypeScript + Inertia 3.
- [ ] Node runtime baseline is Node 24 LTS.
- [ ] Tailwind 4 + shadcn-vue implement `07` design system direction.
- [ ] `composer.lock` and `package-lock.json` are committed.
- [ ] Production frontend build succeeds with explicit type checking.

## 79. Authentication / Authorization

- [ ] Login is username + password.
- [ ] Public registration is disabled.
- [ ] Admin-created account flow remains possible.
- [ ] Spatie handles role/permission primitives.
- [ ] Laravel Policies/custom scope logic enforce ownership/Unit/Approval scope.
- [ ] Direct request cannot bypass state/scope authorization.

## 80. Database / Queue / Storage

- [ ] MySQL 8.4 LTS is the primary DB and CI integration DB.
- [ ] Database queue works for background export jobs.
- [ ] Database session/cache work without Redis.
- [ ] Attachments use Laravel Filesystem abstraction and are private.
- [ ] Production storage remains S3-compatible-ready/targeted.

## 81. Export

- [ ] Official XLSX template is versioned and integrity-known.
- [ ] Export fills/replaces mapped fields only.
- [ ] Native controls remain native controls.
- [ ] Targeted OOXML patching does not remove unrelated package parts.
- [ ] Generated XLSX opens without repair warning.
- [ ] Layout/formatting/print definition remains the approved template layout.
- [ ] PDF is rendered from the filled spreadsheet/template, not from HTML redesign.
- [ ] LibreOffice renderer is not promoted to production until exact-fidelity golden test passes.
- [ ] Renderer upgrade triggers golden regression tests.

## 82. Testing / Quality

- [ ] Pest exists from bootstrap and covers backend workflow/authorization/validation.
- [ ] Vitest exists from bootstrap for Vue behavior.
- [ ] Playwright exists from bootstrap for critical E2E flows.
- [ ] MySQL-backed CI tests exist.
- [ ] Concurrency/stale workflow behavior has automated tests.
- [ ] XLSX/PDF golden export tests exist before export is considered complete.
- [ ] Pint, PHPStan/Larastan, ESLint, Prettier, and Vue type check are CI quality gates.
- [ ] GitHub Actions runs required checks.

---

# PART AA — RELATIONSHIP TO OTHER DOCUMENTS

## 83. Authority Matrix

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
| Detailed testing cases/coverage | `16_Testing_Specification.md` |
| Seed/dummy fixtures | `17_Seed_Dummy_Data_Specification.md` |
| Completion gates | `18_Definition_of_Done.md` |
| Implementation order | `19_Task_Implementation_Plan.md` |
| Production topology | `20_Deployment_Architecture.md` |

---

## 84. Decisions Intentionally Deferred

This tech stack does not silently decide:

- exact System Architecture component boundaries/topology;
- final transaction locking/version algorithm;
- exact ERD/table/index definitions;
- exact API request/response schema;
- exact Docker Compose/production container topology;
- exact production S3-compatible provider;
- exact malware scanning technology;
- exact audit retention/export-download audit policy;
- notification provider;
- final observability/monitoring platform;
- exact password/session/security policy;
- official company numbering SOP/sample;
- exact Unit/Division master data;
- e-signature technology if ever required.

### PDF Renderer Qualification Note

The **requirement is final**, while the concrete renderer remains qualification-gated:

```text
PDF must exactly preserve approved XLSX template representation
```

LibreOffice Headless is the primary container-compatible implementation candidate, not permission to accept approximation.

---

## 85. Required Synchronization to Prior Artifacts

After this document is approved/created, prior artifacts should be synchronized where they still say technology is TBD/current direction:

- `02_Business_Rules.md` — Spatie is no longer merely a candidate;
- `04_RBAC_Permission_Matrix.md` — implementation package boundary is now confirmed;
- `07_UI_UX_Specification.md` — Vue/shadcn-vue boundary is resolved;
- FigJam Architecture section — Laravel + Vue + MySQL may be changed from `current direction` to confirmed baseline and should mention Inertia/TypeScript/shadcn-vue at an appropriate high level;
- FigJam export block should reflect exact XLSX-template-based export rather than generic PDF generation.

Synchronization MUST NOT alter upstream business rules.

---

## 86. Next Document

Next document in fixed project order:

**`09_System_Architecture.md`**

It should transform this stack into the actual component architecture, including at minimum:

- Browser / Vue-Inertia interaction;
- Laravel application boundaries;
- authentication/authorization flow;
- domain/application services;
- MySQL persistence;
- database-backed queue worker;
- private attachment storage;
- exact-template export subsystem;
- qualified spreadsheet renderer boundary;
- audit subsystem;
- concurrency/transaction boundary;
- Docker-compatible component topology without inventing unnecessary distributed services.