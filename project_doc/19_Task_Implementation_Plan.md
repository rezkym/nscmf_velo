# Task Implementation Plan

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PLAN-019  
> **Document Order:** 19 / 20  
> **Status:** Draft — Authoritative Implementation Sequencing / Task Dependency Plan  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `18_Definition_of_Done.md`  
> **Canonical Application / Planning Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02

---

## 1. Purpose

Dokumen ini adalah **source of truth authoritative untuk urutan implementasi, dependency antar-task, slicing pekerjaan, dan minimum verification checkpoint** NSCMF Digital Form & Workflow System.

`19_Task_Implementation_Plan.md` menerjemahkan requirement yang sudah dikunci pada `01–18` menjadi execution plan yang dapat diikuti manusia maupun coding agent sejak repository yang masih documentation-only sampai application feature-complete dan siap memasuki deployment planning.

Dokumen ini **tidak membuat requirement baru**. Ia tidak boleh mengubah product scope, business rules, permission, workflow, validation, UI/UX, technology, architecture, security, schema, API contract, environment, coding rules, testing rules, seed rules, atau Definition of Done.

Tujuan utamanya:

1. menghindari implementasi acak tanpa dependency order;
2. memastikan greenfield bootstrap dilakukan sebelum domain feature;
3. memastikan TDD dimulai sejak behavior pertama;
4. menjaga vertical slice cukup kecil untuk direview dan di-merge;
5. memisahkan foundational work, business capability, integration capability, dan release-readiness work;
6. menghindari pengerjaan feature yang bergantung pada provider/TBD yang belum diputuskan;
7. menjaga setiap implementation PR tunduk pada `15`, `16`, dan `18`;
8. memberikan checkpoint jelas sebelum pindah ke fase berikutnya;
9. menyediakan satu urutan implementasi yang dapat dijadikan backlog awal tanpa menciptakan competing specification.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — default kuat; penyimpangan harus beralasan dan tidak mengubah requirement.
- **MAY** — diperbolehkan.
- **PHASE** — kelompok task dengan dependency/logical outcome yang sama.
- **TASK** — unit implementasi terencana; dapat menjadi satu PR atau dipecah menjadi beberapa PR jika tetap menjaga dependency dan DoD.
- **BLOCKED** — tidak boleh diimplementasikan final karena prerequisite/decision belum tersedia.
- **DECISION GATE** — titik yang membutuhkan keputusan/artefak/provider sebelum task downstream boleh diselesaikan.
- **CHECKPOINT** — minimum kondisi yang harus benar sebelum fase dianggap selesai.

---

# PART A — AUTHORITY / PLANNING RULES

## 3. Specification Remains Above Plan

Task plan tidak boleh menjadi alasan untuk menyimpang dari authority `01–18`.

Jika task wording di `19` tampak bertentangan dengan dokumen spesifik, dokumen spesifik mengendalikan behavior dan `19` harus disinkronkan.

Authority ringkas:

| Concern | Authority |
|---|---|
| Product / business / flow | `01–03` |
| RBAC / Team | `04` |
| State / lifecycle | `05` |
| Validation | `06` |
| UI/UX | `07` |
| Tech stack | `08` |
| Architecture | `09`, `12A`, `13` |
| Security | `10` |
| DB schema | `11`, `11A` |
| API/HTTP | `12` |
| Environment | `14` |
| Coding / Git / dependency | `15` |
| Testing / CI | `16` |
| Seed / demo | `17` |
| Completion gates | `18` |
| **Implementation sequence / task dependency** | **`19`** |
| Physical deployment topology | `20` |

## 4. Current Repository Baseline

At creation of `19`, repository `main` contains documentation/agent guidance only and no Laravel application source tree.

Therefore implementation begins as a **greenfield application bootstrap**.

Do not assume existing:

```text
Laravel app
composer.json
package.json
migrations
routes
frontend
CI
application tests
Docker runtime
```

until the corresponding bootstrap task creates and verifies them.

## 5. One Task Does Not Mean One Huge PR

Task IDs define logical dependency units, not permission to create oversized PRs.

A task MAY be split when useful, for example:

```text
T06 Authentication
→ T06A auth persistence/session foundation
→ T06B login/logout
→ T06C temporary-password change
→ T06D re-auth/session limits
```

but ordering and locked behavior remain unchanged.

Prefer small coherent PRs that can independently satisfy Task/PR DoD.

## 6. Mandatory TDD Per Behavioral Task

Every new behavior / bug fix / behavior-changing task follows `15` + `16`:

```text
spec reference
→ test first
→ meaningful RED
→ commit RED test
→ minimum implementation
→ GREEN
→ implementation commit
→ regression
→ human review
```

Bootstrap/tooling work may establish the minimum test harness before the first behavioral RED under the documented greenfield exception, but MUST NOT sneak business behavior into that bootstrap.

## 7. Task Completion Gate

A task is complete only when its applicable `18` Task/PR Done gates are satisfied.

Phase completion additionally requires its checkpoint.

A blocked downstream task MUST remain explicitly blocked rather than using a fake provider, guessed production value, or temporary bypass as final implementation.

---

# PART B — GLOBAL IMPLEMENTATION ORDER

## 8. Canonical Phase Order

```text
Phase 0  Repository & application bootstrap
Phase 1  Foundational architecture / database / CI
Phase 2  Identity, authentication, RBAC, administration
Phase 3  Core NSCMF domain + Draft persistence
Phase 4  Workflow, review, approval, lifecycle
Phase 5  History, audit, search, timeline
Phase 6  Resumable attachments + malware security
Phase 7  Exact XLSX export foundation
Phase 8  PDF rendering, signing, issuance, public validator
Phase 9  Runtime settings, scheduler, operational cleanup
Phase 10 Seed / demo data
Phase 11 End-to-end hardening + feature completion
Phase 12 Release-candidate readiness preparation
```

Phase numbers indicate dependency order, not fixed calendar sprint numbers.

Tasks within a phase may run in parallel only where their prerequisites are satisfied and they do not create conflicting architecture/schema work.

---

# PART C — PHASE 0: REPOSITORY & APPLICATION BOOTSTRAP

## 9. Objective

Create the smallest correct Laravel/Vue/Inertia project skeleton and test/quality toolchain without implementing business behavior.

### T00 — Bootstrap Laravel 13 / PHP 8.5 application

Scope:

- create Laravel 13 application structure at repository root;
- preserve `project_doc/` and root `AGENTS.md`;
- PHP 8.5-compatible configuration;
- `declare(strict_types=1);` policy for project-owned PHP going forward;
- safe `.gitignore` and `.env.example` baseline;
- no production secret.

Do not invent business migration/routes during framework bootstrap.

### T01 — Bootstrap Vue 3 + TypeScript + Inertia 3 frontend

Scope:

- Vue 3 Composition API;
- TypeScript `strict: true`;
- Inertia 3 integration;
- Tailwind CSS 4;
- shadcn-vue baseline only as approved stack;
- Lucide integration;
- Vite;
- Node 24 LTS / npm / committed `package-lock.json`.

### T02 — Bootstrap testing and code-quality harness

Scope:

```text
Pest 4
PHPStan/Larastan max with zero baseline
Laravel Pint
Vitest 4
Vue Test Utils
ESLint
Prettier
vue-tsc
Playwright
```

Any dependency already explicitly approved by `08`/`16` may be installed. Any additional package still requires explicit approval under `15`.

### T03 — Establish CI skeleton

Create GitHub Actions baseline capable of running applicable:

- PHP install/build;
- Pint;
- PHPStan/Larastan max;
- Pest;
- frontend install/build;
- ESLint;
- Prettier check;
- vue-tsc;
- Vitest;
- MySQL 8.4 service/integration path;
- artifact/diagnostic retention as appropriate.

Do not claim inactive future gates such as renderer qualification as passing.

### Phase 0 Checkpoint

```text
[ ] Laravel app boots
[ ] frontend app boots/builds
[ ] backend + frontend test harness executes
[ ] static/type/lint/format gates execute
[ ] CI exists and reports truthfully
[ ] no NSCMF business behavior implemented yet except framework-neutral smoke proof
```

---

# PART D — PHASE 1: FOUNDATIONAL ARCHITECTURE / DATABASE / CI

## 10. Objective

Materialize shared infrastructure that most business capabilities depend on.

### T04 — Application configuration / environment contract

Implement version-controlled config structure aligned to `14`:

```text
config/nscmf.php
config/attachments.php
config/exports.php
config/security.php
```

as actually needed.

Requirements:

- app timezone `Asia/Jakarta`;
- MySQL application connection/session timezone `+07:00`;
- DB session/cache/queue baseline;
- private local filesystem abstraction;
- no arbitrary env override of locked product/security rules;
- no business-layer `env()` calls;
- safe `.env.example` variables only.

### T05 — Core relational schema foundation

Implement forward migrations from `11`/`11A`, ordered by dependency.

Recommended dependency groups:

1. Teams / users foundation;
2. Spatie package migration using installed package authority;
3. typed `system_settings`;
4. core `nscmf_records` + request numbering support;
5. Activation relational child tables;
6. Change relational child tables;
7. workflow iterations;
8. authoritative audit tables;
9. attachment/final attachment tables;
10. resumable upload session/chunk metadata from `11A`;
11. export/template/snapshot/artifact tables;
12. signing certificate / PDF issuance evidence;
13. required Laravel database session/cache/queue tables where framework migration is needed.

Rules:

- MySQL 8.4 is integration authority;
- no EAV/generic business JSON;
- package-owned Spatie schema reused;
- no Spatie Teams columns;
- no wildcard permission configuration;
- all migration tests execute against MySQL where semantics matter.

### T05A — Core domain enum/rule primitives

Implement closed-set enums/rules needed by later tasks, for example:

```text
business status
family/subtype
numbering mode
service impact
technical log retention unit
upload transport/security status
export technical status
public verification result
```

No invented states.

### T05B — Repository contracts/bindings foundation

Create only meaningful contracts/implementations required by the first capabilities and provider binding structure.

Do not pre-create empty repository-per-table boilerplate.

Establish architecture tests preventing Controller/Service persistence violations and reintroduction of Actions/BaseRepository where practical.

### T05C — Base application shell / error conventions

Establish:

- Inertia app shell;
- safe global error handling;
- JSON success/error envelope helpers only if they add clear value without becoming hidden domain logic;
- safe exception rendering/no stack leakage in production-like mode;
- canonical route file structure.

### Phase 1 Checkpoint

```text
[ ] core schema matches 11/11A
[ ] MySQL migration/schema integration tests pass
[ ] app config aligns with 14
[ ] architecture test baseline exists
[ ] repository/service dependency direction is enforceable
[ ] no business workflow implemented prematurely
```

---

# PART E — PHASE 2: IDENTITY / AUTHENTICATION / RBAC / ADMINISTRATION

## 11. Objective

Build secure identity and permission foundation before NSCMF workflow actions depend on it.

### T06 — Authentication core

Implement:

```text
GET login page where applicable
POST /login
POST /logout
username + password
no public registration
```

Behavior:

- enumeration-resistant invalid credential response;
- inactive account denied;
- session auth via `web` guard;
- CSRF for internal state changes;
- password minimum 6 / no composition / no MFA.

### T07 — Session policy

Implement and prove:

```text
idle timeout = 30 minutes
absolute authenticated lifetime = 8 hours
max active sessions = 2
third valid login succeeds and revokes oldest active session
```

Revocation is server-side.

### T08 — Temporary credential lifecycle

Implement server-generated temporary-password flow for admin create/reset and mandatory first-change gate.

Requirements:

- plaintext exists transiently only;
- persisted hash only;
- one-time reveal after successful operation;
- no later retrieval;
- reset revokes target sessions;
- `must_change_password` enforcement.

### T09 — Sensitive re-authentication

Implement `POST /account/re-authenticate` or exact contract from `12`:

- current password proof;
- 15-minute proof lifetime;
- required for sensitive admin operations;
- proof not extended silently beyond policy.

### T10 — Spatie RBAC reference integration

Implement:

- canonical permission catalog;
- default roles;
- role-permission bundles;
- `web` guard;
- Teams off;
- wildcard permissions off;
- multi-role permission union.

No Team authorization.

### T11 — Protected Superadmin invariants

Implement application/domain/policy protection for:

- protected identity marker;
- no disable/delete/downgrade/loss of protected role/invariant;
- no universal business/security bypass;
- protected Core Settings requirement where applicable.

### T12 — Team administration

Implement Team CRUD/lifecycle allowed by docs:

- organizational metadata only;
- one primary Team for normal user;
- Team changes do not alter Reviewer/Approver authority;
- deactivation/archive semantics per authority;
- no Unit/Division/scope UI.

### T13 — User administration

Implement:

- view/create/update;
- enable/disable;
- reset password;
- role assignment;
- Team assignment;
- session revocation on access-changing mutations;
- Team-only change not treated as access change.

### T14 — Role / permission administration

Implement current supported operations:

```text
roles.view
roles.create
roles.update
permissions.assign
```

No current `roles.archive` behavior unless later synchronized authority adds it.

No normal direct-user-permission administration UI.

### T15 — Initial setup wizard

Implement setup flow aligned with `07`:

```text
Role Setup
Team Setup
Users & Role Assignment
Complete
```

No Reviewer/Approver scope setup.

### Phase 2 Checkpoint

```text
[ ] secure login/session lifecycle works
[ ] temp-password + re-auth flows proven
[ ] RBAC permission-centric behavior proven positive/negative
[ ] Team has zero Review/Approval authorization effect
[ ] protected Superadmin invariants proven
[ ] administration flows usable
[ ] sensitive changes have required human security review
```

---

# PART F — PHASE 3: CORE NSCMF DOMAIN + DRAFT PERSISTENCE

## 12. Objective

Create Requester-facing form creation/draft behavior before workflow transitions.

### T16 — Request numbering engine

Implement:

#### Automatic

```text
NSCMF-YYYYMM-#####
global sequence
monthly bucket/reset semantics
concurrency safe
gaps allowed
never reused
```

#### Manual

- 3–64 characters;
- allowed characters only;
- no internal spaces;
- global normalized uniqueness.

Official organization Request No SOP/sample remains TBD; do not invent an additional format rule beyond current authority.

### T17 — NSCMF record creation

Implement create flow:

```text
Create NSCMF
→ family
→ subtype
→ numbering mode
→ DRAFT
```

Requirements:

- user must have active Team before creating;
- owner = creator;
- Team snapshot captured at creation;
- Team remains informational;
- initial `record_version` established;
- Business Audit written where required.

### T18 — Activation Draft persistence

Implement relational Activation form sections according to `06`, `11`, workbook mapping authority, and API autosave contract.

Draft may be incomplete.

### T19 — Change Draft persistence

Implement relational Change form sections including Service Impact model and max Result structure where appropriate.

Draft may be incomplete.

### T20 — Autosave / Save Draft + optimistic concurrency

Implement:

- structured validated payload;
- explicit field mapping;
- `record_version` conflict;
- no `$request->all()` persistence;
- safe stale-state response;
- UI saving/saved/failure/conflict states.

### T21 — Draft attachment entry-point integration stub

At this phase UI/API may expose attachment affordance only if backed by real later attachment service readiness. Do not create fake CLEAN upload state.

If attachment pipeline is not yet implemented, keep feature clearly unavailable/incomplete rather than fabricating success.

### Phase 3 Checkpoint

```text
[ ] Requester can create Activation/Change Draft
[ ] all fields persist relationally
[ ] Draft incompleteness is allowed
[ ] numbering concurrency/uniqueness proven
[ ] Team snapshot semantics correct
[ ] optimistic conflict prevents stale overwrite
[ ] UI does not invent authorization/business state
```

---

# PART G — PHASE 4: WORKFLOW / REVIEW / APPROVAL / LIFECYCLE

## 13. Objective

Implement the canonical seven-state business lifecycle and permission/state gates.

### T22 — Submit / Resubmit validation gates

Implement first successful Submit:

```text
DRAFT → PENDING_REVIEW
workflow iteration = 1
request number becomes immutable
requested_by_user_id captured
```

Implement:

```text
REVISION_REQUIRED → PENDING_REVIEW
```

same iteration.

Full action-specific validation occurs here.

### T23 — Review queue / read eligibility

Implement permission-based shared Review queue:

- `nscmf.review` / explicit action permissions;
- Team-neutral;
- non-exclusive;
- opening record does not assign/lock it;
- all eligible reviewers can see/take valid action.

### T24 — Reviewer Return / Reject / Forward

Implement from `PENDING_REVIEW`:

```text
Return  → REVISION_REQUIRED
Reject  → REJECTED
Forward → PENDING_APPROVAL
```

Reason requirements enforced where specified.

Before Forward for Change:

- at least one complete Result;
- every started Result complete.

`Reviewed By` = actor of successful Forward.

### T25 — Change Result-only update

Implement owner/authorized narrow update in `PENDING_REVIEW`:

- Result fields only;
- max five rows;
- optimistic versioning;
- attachment/general planning mutation forbidden through this endpoint.

### T26 — Approval queue / read eligibility

Implement shared permission-based Approver queue:

- Team-neutral;
- non-exclusive;
- one successful eligible Approver sufficient;
- no all-approvers rule.

### T27 — Approver actions

From `PENDING_APPROVAL`:

```text
Return Reviewer  → PENDING_REVIEW
Return Requester → REVISION_REQUIRED
Reject           → REJECTED
Approve          → APPROVED
```

`Approved By` = successful final human actor.

Cryptographic signing is not performed inside the workflow transaction and human Approver is not crypto signer.

### T28 — Cancel

Implement allowed Draft cancellation path only:

```text
DRAFT → CANCELLED
```

Cancelled is terminal and never Reopen.

### T29 — Reopen / workflow iteration

Implement permission/reason/archive rules:

From:

```text
APPROVED or REJECTED
```

to:

```text
REVISION_REQUIRED or PENDING_REVIEW
```

and increment workflow iteration.

### T30 — Archive / unarchive

Implement separate lifecycle flag for:

```text
APPROVED
REJECTED
CANCELLED
```

with reason and no hard delete.

Approved/Rejected must be unarchived before Reopen.

### T31 — Workflow concurrency integration

Real MySQL tests for:

- competing Approver actions;
- Reviewer/Approver conflict;
- stale `record_version`;
- first valid transition wins;
- stale second action fails safely;
- no automatic retry of state-changing action.

### Phase 4 Checkpoint

```text
[ ] exactly seven business states
[ ] every transition matches 05
[ ] shared Reviewer/Approver pools work
[ ] one final Approver sufficient
[ ] Team has no authorization effect
[ ] iteration/Reopen/Archive behavior proven
[ ] concurrency proven on MySQL 8.4
```

---

# PART H — PHASE 5: HISTORY / AUDIT / SEARCH / TIMELINE

## 14. Objective

Make authoritative history and traceability usable before complex external artifact pipelines.

### T32 — Business Audit write framework

Implement append-oriented business audit persistence coordinated by Services within required transaction semantics.

No age purge.

### T33 — Business Timeline

Implement user-facing timeline from business evidence:

- actor;
- action;
- timestamp;
- before/after state where relevant;
- reason/comment;
- meaningful field changes;
- workflow iteration context.

Routine reads/downloads do not flood Business Timeline.

### T34 — Access Audit

Implement separate read/download/access evidence where required.

No age purge.

### T35 — Security Audit

Implement auth/credential/RBAC/session/malware/signing/settings security events with no secret leakage.

No age purge.

### T36 — Privileged audit access

Implement read-only access via:

```text
audit.access.view
audit.security.view
```

plus applicable authorization.

No purge/edit endpoints.

### T37 — History/search/filter/sort/pagination

Implement current `12` contract:

- page/per_page default 25, max 100;
- whitelist sort;
- search/filters;
- Team as informational filter only;
- archive filtering;
- resource authorization before disclosure.

### Phase 5 Checkpoint

```text
[ ] business timeline usable
[ ] Access/Security Audit separated
[ ] no authoritative audit age purge path exists
[ ] search/filter/pagination contract works
[ ] privileged audit reads are permission controlled
```

---

# PART I — PHASE 6: RESUMABLE ATTACHMENTS / MALWARE SECURITY

## 15. Objective

Implement full private resumable upload pipeline and CLEAN gate.

### T38 — Private storage adapter

Implement focused storage contract + Flysystem local private adapter.

Logical categories:

```text
chunks
assembly/quarantine
final attachments
exports
official templates
validator temp
```

No public storage path or path-based authorization.

### T39 — Upload session initiate/resume/status

Implement server-authoritative upload session lifecycle and metadata.

### T40 — Chunk acceptance

Implement:

```text
5 MiB chunk size
1-based index
geometry validation
server-computed chunk identity
same index + same bytes → accepted duplicate/idempotent
same index + different bytes → 409 UPLOAD_CHUNK_CONFLICT
```

Duplicate replay does not count as new progress and does not extend expiry indefinitely.

### T41 — Upload inactivity / cancel / expiry

Implement:

```text
24 hours since last newly accepted progress
```

with scheduler-cleanable expired temporary data.

Acknowledged chunks survive normal app restart when DB/storage healthy.

### T42 — Final assembly / integrity

Flow:

```text
all chunks present
→ ASSEMBLING
→ geometry/final size
→ private full-file assembly
→ server SHA-256
→ final file-type validation
```

### T43 — ClamAV adapter + real integration

Implement `MalwareScanner` → ClamAV adapter.

Rules:

- fail closed;
- whole-file scan mandatory;
- scanner timeout/unavailable/error not CLEAN;
- infected rejected;
- chunk scan cannot substitute final scan.

Physical production topology/timeout remains deployment/environment TBD and is not guessed here.

### T44 — CLEAN promotion / attachment lifecycle

Only explicit whole-file `CLEAN` promotes to final usable private attachment.

Transport `COMPLETED` remains separate.

Implement allowed download/remove behavior with authorization.

### T45 — Resumable upload UI

Implement:

- upload progress;
- reconnect/reselect reconciliation;
- interrupted/resume available;
- assembling;
- scanning;
- Ready only after CLEAN;
- infected/failed/expired states;
- never claim background continuation while network/server unavailable.

### T46 — Upload concurrency/idempotency tests

Real integration tests for same chunk race, duplicate finalization, durable storage, and failure cleanup.

### Phase 6 Checkpoint

```text
[ ] resume works after recoverable interruption
[ ] duplicate behavior exact
[ ] server final SHA authoritative
[ ] whole-file real ClamAV path proven
[ ] only CLEAN files usable
[ ] private storage survives normal restart assumptions
[ ] scheduler cleanup does not damage final/authoritative evidence
```

---

# PART J — PHASE 7: EXACT XLSX EXPORT FOUNDATION

## 16. Objective

Implement exact official workbook pipeline without yet depending on unresolved PDF renderer/signing provider.

### T47 — Official template registry

Implement immutable/versioned registered template model from `11`.

Each real registered template version requires:

- version label;
- private binary reference;
- SHA-256;
- mapping version;
- active flag;
- no in-place replacement.

Do not seed a registry row without the actual official binary/hash/mapping.

### T48 — Workbook mapping specification implementation

Using official `NSCMF-Form-3.0.xlsx`, implement explicit mapping for Activation and Change fields/control states.

Do not guess cells/controls.

Mapping changes are version-controlled.

### T49 — Targeted OOXML patch engine

Implement:

```text
immutable template
→ private working copy
→ targeted package/member patch
→ preserve unrelated ZIP members
→ preserve required controls/VML/relationships
→ structural integrity validation
```

Do not generic load-edit-save if that strips workbook structures.

### T50 — Export immutable snapshot request

Implement asynchronous export request flow:

```text
authorize
→ short Service transaction
→ bind record_version + iteration + template version
→ create immutable snapshot
→ commit
→ dispatch DB queue after commit
```

### T51 — XLSX generation worker

Worker uses bound immutable snapshot only.

It MUST NOT reread later mutable record state to generate output.

### T52 — XLSX artifact lifecycle

Implement:

- queued/processing/ready/failed/expired technical statuses;
- private artifact;
- authorized download;
- 168-hour READY retention;
- expiry removes binary only, not authoritative issuance/history/source evidence;
- regeneration is a new export request.

### T53 — XLSX fidelity regression fixtures

Create controlled regression verification against exact official workbook/template structures.

Do not blindly regenerate golden artifacts.

### Phase 7 Checkpoint

```text
[ ] official template registered from real binary
[ ] mapping explicit and reviewed
[ ] OOXML controls/VML preserved
[ ] immutable snapshot prevents later-state drift
[ ] XLSX generation async and private
[ ] 7-day artifact lifecycle works
```

---

# PART K — PHASE 8: PDF RENDERING / SIGNING / ISSUANCE / PUBLIC VALIDATOR

## 17. Decision Gates Before Final Production Implementation

Some Phase 8 tasks are intentionally blocked until approved external/runtime decisions exist.

### DG-01 — Spreadsheet renderer qualification decision

Required before T54 may be considered production-complete:

- concrete renderer/provider;
- executable/endpoint/topology as applicable;
- required fonts;
- timeout behavior;
- golden/fidelity qualification;
- explicit approved visual tolerance.

Do not choose LibreOffice, Microsoft Office automation, commercial, or remote renderer silently.

### DG-02 — PDF signing provider/runtime decision

Required before T56 may be considered production-complete:

- signer library/provider;
- CA/certificate model;
- private key container/location;
- passphrase/secret injection;
- rotation ceremony.

Do not place production key in source/ordinary DB/CI.

### T54 — Qualified spreadsheet-to-PDF renderer adapter

**Blocked by DG-01 for production completion.**

Implement focused `SpreadsheetRenderer` contract and selected adapter after approval.

Authoritative PDF must come from workbook rendering, never HTML approximation.

### T55 — PDF export pipeline

Use the same bound immutable snapshot/template-generated workbook source.

PDF export remains asynchronous.

### T56 — System/Organization PDF signing adapter

**Blocked by DG-02 for production completion.**

Implement mandatory signing for Approved NSCMF PDFs.

Rules:

- human `Approved By` remains distinct;
- signing failure → export FAILED;
- NSCMF remains APPROVED;
- no unsigned Approved fallback.

### T57 — Signing certificate / issuance evidence

Persist public certificate metadata/material required for verification and immutable issuance evidence including exact final PDF SHA-256.

Historical public certificate material remains resolvable after rotation.

### T58 — PDF verification service

Implement cryptographic verifier capable of determining signature validity against persisted issuance/certificate evidence.

### T59 — Public `/ispdfvalid` endpoint + UI

Flow:

```text
PDF <=20 MB
→ private temp storage
→ ClamAV CLEAN
→ signature verify
→ exact uploaded-byte SHA-256
→ issuance lookup
→ currentness resolution
→ minimum disclosure
→ temp cleanup
```

Canonical results only:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

### T60 — Public validator rate limiting

Requirement to rate-limit is mandatory.

Exact numeric bucket remains TBD and MUST NOT be invented.

Implementation may establish the configurable/throttling mechanism, but final production limit value remains a decision gate if not resolved before deployment.

### T61 — PDF integration / security / privacy tests

Real non-production cryptographic signing/verification integration.

Real renderer/golden verification after renderer qualification.

Public disclosure tests ensure no human actor/Team/form/attachment/audit/private-key leakage.

### Phase 8 Checkpoint

Phase 8 is feature-complete only when required decision gates are resolved and:

```text
[ ] real qualified renderer path proven
[ ] Approved PDF system/org signing proven
[ ] signing failure has no unsigned fallback
[ ] issuance + historical cert evidence persisted
[ ] public validator produces canonical current/superseded/modified/unknown results
[ ] validator remains minimum-disclosure and rate-limited
```

---

# PART L — PHASE 9: RUNTIME SETTINGS / SCHEDULER / OPERATIONAL CLEANUP

## 18. Objective

Implement protected runtime settings and routine maintenance behavior already specified in `14`.

### T62 — `system_settings` bootstrap/read

Create singleton default only when missing:

```text
technical_log_auto_cleanup_enabled = true
technical_log_retention_value = 30
technical_log_retention_unit = DAY
```

Existing runtime value is preserved.

### T63 — Protected Technical Log settings UI/API

Implement read/update:

- Protected Superadmin invariant;
- `system.settings.manage`;
- <=15-minute re-auth;
- positive value;
- DAY/MONTH;
- Security Audit;
- no generic settings engine.

### T64 — Technical Log cleanup service

Implement separate operational cleanup:

- respects ON/OFF;
- DAY calendar semantics;
- MONTH calendar-month semantics;
- no fixed maximum;
- no authoritative audit access/deletion.

### T65 — Scheduler responsibilities

Implement scheduled cleanup for:

- unfinished uploads >24h inactivity;
- abandoned assembly/quarantine;
- export binaries >168h;
- Technical Logs according to current DB setting;
- stale validator/runtime temp.

Must not auto-advance workflow or delete authoritative audit/issuance/source history.

### Phase 9 Checkpoint

```text
[ ] protected setting mutates safely
[ ] technical-log cleanup separate from audit
[ ] scheduler cleanup boundaries proven
[ ] no hardcoded immutable 30-day cleanup rule
```

---

# PART M — PHASE 10: SEED / BOOTSTRAP / DEMO DATA

## 19. Objective

Implement `17` only after schema, auth/RBAC, workflow, and relevant services exist.

### T66 — Production-safe reference seed

Implement canonical:

- permission catalog;
- four default roles;
- role-permission bundles;
- system settings singleton default only if missing.

No production Team seed.

### T67 — Protected Superadmin bootstrap command/process

Implement operator-controlled creation:

```text
username = superadmin
name = Protected Superadmin
team_id = NULL
active = true
protected = true
must_change_password = true
role = Superadmin
```

Random temporary password, hash persistence, reveal once, no logging, idempotent rerun without reset.

### T68 — Demo Teams / users

Local/development canonical dataset:

```text
Demo Team Alpha
Demo Team Beta
Demo Team Gamma
```

and six canonical demo accounts from `17` using synthetic password `password` only outside production.

### T69 — Deterministic 20-scenario demo NSCMF dataset

Exactly:

```text
10 Activation
10 Change
```

with manual request numbers:

```text
DEMO-ACT-001..010
DEMO-CHG-001..010
```

Cover all canonical states/subtypes and locked lifecycle examples.

### T70 — Seed environment guards / rerun safety

Prove:

- Production Demo Seeder hard fails before demo row creation;
- staging requires explicit opt-in;
- test/CI independent of shared Demo Seeder;
- ordinary rerun does not reset runtime credentials/settings/business activity.

### T71 — No fake artifact evidence

Ensure Demo Seeder does not fabricate CLEAN/READY/signed/issuance/template evidence without real underlying integration.

If a future demo requires those artifacts, use a dedicated real fixture/application-flow mechanism.

### Phase 10 Checkpoint

```text
[ ] production bootstrap safe/idempotent
[ ] no invented production Team data
[ ] Protected Superadmin one-time credential safe
[ ] demo seed production-hard-blocked
[ ] 20 deterministic scenarios coherent
[ ] test suite does not rely on Demo Seeder
```

---

# PART N — PHASE 11: END-TO-END HARDENING / FEATURE COMPLETION

## 20. Objective

Verify integrated behavior across tasks and close cross-layer gaps before release-readiness work.

### T72 — Critical Playwright journeys

Chromium current MVP baseline.

Cover representative:

1. Login;
2. Requester create/save/submit;
3. Reviewer Return/Forward;
4. Requester revise/resubmit;
5. Approver actions/Approve;
6. forbidden actor denial;
7. resumable upload interruption/resume/CLEAN;
8. History/timeline;
9. export request/status/download;
10. public PDF verification after Phase 8 readiness;
11. protected admin settings mutation + re-auth.

### T73 — Cross-capability negative security suite

Review:

- IDOR;
- forbidden state transitions;
- Team non-authorization;
- protected Superadmin invariants;
- session revocation;
- attachment not-CLEAN access;
- export authorization;
- validator privacy;
- audit immutability;
- secret redaction.

### T74 — Architecture regression suite

Ensure no drift:

```text
Controller → Service
Service → Repository/Domain/Infrastructure contracts
no Actions
no BaseRepository
no direct Service Eloquent business query
no Team authorization
```

### T75 — Coverage / static-analysis closure

Reach and maintain applicable:

```text
PHP >=80%
frontend >=80% once approved provider exists
PHPStan/Larastan max zero-baseline
TypeScript strict
```

Do not game coverage.

### T76 — Full build / CI gating

Establish required PR gate set as executable for all currently implemented capabilities.

No `continue-on-error` for required gates.

### T77 — Feature-level DoD review

Use `18` Level 2 to evaluate each major module:

```text
Authentication/Admin
NSCMF Draft
Workflow
History/Audit
Attachments
Export
Public Verification
Runtime Settings
Seed/Demo
```

Do not mark module Done if downstream mandatory capability remains blocked.

### Phase 11 Checkpoint

```text
[ ] integrated critical journeys pass
[ ] negative security paths pass
[ ] architecture stays clean
[ ] coverage/static/type gates met
[ ] no hidden manual workaround
[ ] module-level DoD classification is truthful
```

---

# PART O — PHASE 12: RELEASE-CANDIDATE READINESS PREPARATION

## 21. Objective

Prepare a feature-complete codebase for deployment architecture and production-like staging validation without inventing physical topology owned by `20`.

### T78 — Release candidate manifest

Bind candidate to specific commit and document:

- completed modules;
- unresolved blockers/TBDs;
- required runtime dependencies;
- migration set;
- seed/bootstrap requirements;
- required secrets/config contracts;
- known non-production test identities.

### T79 — Staging validation checklist implementation support

Ensure application can be validated under `14` against production-like classes:

```text
HTTPS/session security
MySQL 8.4
persistent private storage
real ClamAV
DB queue worker
scheduler
qualified renderer
non-production signer
cleanup behavior
```

Physical staging topology remains `20`.

### T80 — Production readiness blockers register

Before claiming Release/Production-Ready, explicitly resolve or block on required open items such as:

- renderer qualification/provider;
- production signing provider/key mechanism;
- required public/login/upload rate-limit numbers where exact production value is still unresolved;
- ClamAV production topology/timeout;
- deployment topology;
- backup/restore/DR/RPO/RTO if required by `20`;
- performance/SLA targets only if later approved.

No guessed values.

### T81 — Release DoD evaluation

Apply `18` Level 3 only after `20` supplies physical deployment authority where needed.

`19` itself MUST NOT declare Production-Ready merely because implementation tasks are complete.

### Phase 12 Checkpoint

```text
[ ] feature-complete candidate identified
[ ] all implementation-level blockers explicit
[ ] staging validation requirements known
[ ] provider/deployment TBDs not guessed
[ ] ready to proceed to 20_Deployment_Architecture.md
```

---

# PART P — DEPENDENCY MAP

## 22. High-Level Critical Path

```text
T00–T03 Bootstrap
   ↓
T04–T05 Foundations
   ↓
T06–T15 Identity/RBAC/Admin
   ↓
T16–T21 Draft/Core NSCMF
   ↓
T22–T31 Workflow
   ↓
T32–T37 History/Audit
   ├───────────────┐
   ↓               ↓
T38–T46 Upload     T47–T53 XLSX Export
                    ↓
               DG-01 + DG-02
                    ↓
               T54–T61 PDF/Signing/Validator
   └───────────────┬───────────────┘
                   ↓
               T62–T65 Ops
                   ↓
               T66–T71 Seed/Demo
                   ↓
               T72–T77 Hardening
                   ↓
               T78–T81 RC Preparation
                   ↓
               20 Deployment Architecture
```

Some History/Audit work may begin earlier because audit writes are needed by authentication/admin/workflow tasks; in that case implement the minimum required audit repository/write path first, then complete UI/query portions in Phase 5.

## 23. Safe Parallelization

Potential parallel work after foundations:

- frontend shell components can progress alongside backend identity services;
- Activation and Change Draft implementation can be split after shared creation/version foundation;
- History query UI can progress alongside later audit-read service once audit schema/write contracts stabilize;
- XLSX infrastructure can begin after core schema/template mapping is stable while attachment work proceeds;
- scheduler service tests can begin once corresponding temporary/artifact models exist.

Avoid parallel edits to the same migrations/domain enums/contracts without coordination.

---

# PART Q — TASK / PR EXECUTION TEMPLATE

## 24. Required Planning Before Each Task

Before coding:

```text
Task ID / title
Specification references
Behavior being added
Dependencies satisfied?
Affected DB/API/UI/security layers
TDD test target
Required real integration
Human security review required? yes/no
Dependency approval required? yes/no
Migration/destructive risk?
Documentation change required?
Known TBD/blocker?
```

## 25. Recommended PR Scope

A PR should normally deliver one coherent behavior slice with its tests and necessary supporting code.

Avoid:

- one PR for an entire Phase;
- mixing unrelated refactors;
- schema + unrelated UI cleanup;
- adding future provider implementations not needed by the current task;
- combining multiple major security capabilities merely for convenience.

## 26. PR Completion Evidence

Use `16`/`18` evidence requirements, including where applicable:

```text
spec reference
RED commit SHA + failing target
GREEN result
regression result
coverage
real-integration evidence
migration note
security review note
docs note
TBD/limitations
```

---

# PART R — DECISION GATES / OPEN ITEMS

## 27. Current Decisions That Must Not Be Invented During Implementation

These are not implementation-agent discretion:

### Product / organization

- exact production Team master data;
- official Request No organization SOP/sample;
- notification provider/behavior details;
- bulk packaging details where still TBD.

### Rate limiting

- exact login rate-limit numeric bucket;
- exact upload rate-limit numeric bucket;
- exact public validator rate-limit numeric bucket.

Requirement to rate-limit remains mandatory where specified.

### ClamAV

- production physical topology;
- production timeout/capacity sizing.

### Renderer

- concrete provider/implementation;
- executable/endpoint/topology;
- exact timeout;
- production font inventory;
- approved visual tolerance.

### Signing

- concrete signer/provider/library;
- CA;
- private key container/path;
- passphrase injection;
- rotation ceremony.

### Deployment / operations

Owned primarily by `20`:

- server/VM/container count;
- hosting/provider/on-prem topology;
- load balancer;
- persistent volume path/mount;
- process counts;
- worker retry/backoff/timeouts;
- backup/restore;
- DR;
- RPO/RTO;
- SLA/availability;
- performance/load target;
- external observability platform.

## 28. Decision Gate Handling

If an implementation task reaches one of these:

```text
identify exact blocked task
→ cite owning authority/TBD
→ ask user only for that decision
→ synchronize affected documentation if needed
→ continue implementation after decision
```

Do not stop unrelated independent tasks that do not depend on the unresolved decision.

---

# PART S — IMPLEMENTATION PRIORITY / MVP FUNCTIONAL MILESTONES

## 29. Milestone A — Application Foundation

Includes Phases 0–2.

Outcome:

```text
application boots
CI/test architecture works
schema exists
secure auth/admin/RBAC foundation works
```

## 30. Milestone B — Core Workflow MVP

Includes Phases 3–5.

Outcome:

```text
Requester can create/submit
Reviewer can Return/Reject/Forward
Requester can revise
Approver can return/reject/approve
history/audit visible
```

This is the first coherent business workflow milestone, but attachments/export/signing may still be incomplete.

## 31. Milestone C — Secure File / Export Capability

Includes Phases 6–8.

Outcome:

```text
resumable CLEAN attachments
exact XLSX
qualified PDF
system/org signing
public validation
```

This milestone remains blocked on renderer/signer decision gates where unresolved.

## 32. Milestone D — Operationally Complete MVP

Includes Phases 9–11.

Outcome:

```text
scheduler/settings
production-safe seed/bootstrap
demo data
full critical E2E
security/architecture/coverage hardening
feature-level DoD
```

## 33. Milestone E — Deployment Planning / Release Candidate

Phase 12 + `20`.

Outcome:

```text
specific release candidate
all required physical deployment decisions
production-like staging evidence
Release/Production-Ready DoD evaluation
```

---

# PART T — CRITICAL MUST-NOT IMPLEMENTATION ORDER FAILURES

## 34. Never

Do not:

1. implement business features before bootstrap/test architecture exists;
2. implement code first and add behavioral tests afterward;
3. build workflow before permission/state/persistence foundations are reliable;
4. implement Team-based Review/Approval scope;
5. introduce extra business states as technical shortcuts;
6. build attachment UI that fabricates CLEAN before real pipeline exists;
7. build export worker that rereads live mutable state;
8. generic-rewrite official XLSX before explicit OOXML mapping/preservation is established;
9. choose renderer/signing provider silently;
10. build HTML-to-PDF fallback as authoritative PDF;
11. issue unsigned Approved PDF fallback;
12. implement public validator without ClamAV/private temp/minimum disclosure;
13. add production Demo Seed before seed environment guards exist;
14. seed production Teams based on guesses;
15. build a generic settings EAV/config override engine;
16. delay real MySQL concurrency testing until the end;
17. postpone security negative tests until final hardening when the affected behavior is already being implemented;
18. postpone all audit writes until after workflow feature completion;
19. mark blocked provider-dependent tasks Done using mocks/fakes only;
20. claim Release/Production-Ready before `20` and required staging/readiness evidence exist.

---

# PART U — CURRENT PROJECT HANDOFF

## 35. Current Documentation State

At creation of this document:

```text
01–19 = fixed-order project documentation created
20_Deployment_Architecture.md = NOT CREATED
```

Repository implementation is still greenfield/documentation-only until implementation begins after this planning stage.

## 36. Next Fixed-Order Document

The final fixed-order project document is:

```text
20_Deployment_Architecture.md
```

Do not create `20` until the user explicitly authorizes it.

## 37. Implementation Start After Documentation

After `20` is approved/synchronized, implementation should begin from:

```text
Phase 0 / T00
```

using the latest approved `main` and scoped implementation branches.

If the user explicitly chooses to begin implementation before `20`, only tasks that do not require unresolved physical deployment decisions may proceed; no production-readiness claim is allowed until `20` exists and applicable release gates are satisfied.

---

**END OF `19_Task_Implementation_Plan.md`**
