# Coding Rules / AGENTS Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-CODE-015  
> **Document Order:** 15 / 20  
> **Status:** Draft — Authoritative Coding / Human Developer / AI Agent Constitution  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `14_Environment_Specification.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`, `14A_Pre_Coding_Rules_Synchronization.md`  
> **Operational Entry Point:** repository-root `AGENTS.md`  
> **Last Updated:** 2026-08-31

---

## 1. Purpose

Dokumen ini adalah **source of truth authoritative untuk cara manusia, AI coding agent, CLI coding agent, IDE agent, dan automation developer bekerja pada source code NSCMF**.

Dokumen ini tidak mendesain ulang produk. Ia menerjemahkan keputusan yang sudah dikunci di `01–14`, `11A`, `12A`, dan `14A` menjadi aturan coding yang dapat dieksekusi dan direview.

Tujuan utamanya:

1. menjaga implementation tetap setia pada specification;
2. mencegah requirement hallucination atau silent assumption;
3. menjaga Repository–Service Architecture;
4. memastikan **Test-Driven Development (TDD)** benar-benar dilakukan, bukan test yang dibuat setelah kode untuk membenarkan implementation;
5. menjaga PHP/TypeScript tetap strict;
6. mencegah dependency, migration, generated file, security, dan Git shortcut yang berbahaya;
7. membuat coding agent bekerja seperti engineer yang accountable, bukan code generator yang mengejar test hijau dengan cara apa pun;
8. membuat repository mudah dipahami manusia dan agent di sesi berikutnya.

`15` berlaku untuk semua project-owned code, configuration, migration, tests, build scripts, CI, dan repository-maintenance activity kecuali dokumen ini secara eksplisit menyatakan pengecualian.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — default kuat; pengecualian harus beralasan.
- **MAY** — diperbolehkan.
- **AUTHORITATIVE** — source of truth untuk concern tersebut.
- **LOCKED** — keputusan sudah final dan tidak boleh diganti diam-diam.
- **TBD** — belum diputuskan; tidak boleh diisi berdasarkan tebakan.
- **PROJECT-OWNED** — code/file yang dibuat dan dipelihara oleh project, bukan generated vendor/framework internals.
- **DESTRUCTIVE** — tindakan yang dapat menghapus, menimpa, merusak, atau menulis ulang data/history secara material.

---

# PART A — AUTHORITY / SOURCE OF TRUTH

## 3. Project Documentation Is Above Implementation

Code MUST implement project documentation; code MUST NOT redefine it.

Canonical authority by concern:

| Concern | Authority |
|---|---|
| Product scope | `01_PRD.md` |
| Business rules | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| RBAC / permission / Team boundary | `04_RBAC_Permission_Matrix.md` |
| Business states / transitions / iterations | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX behavior | `07_UI_UX_Specification.md` |
| Technology + development-method baseline | `08_Tech_Stack_Specification.md` |
| Logical architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Database schema | `11_ERD_Database_Schema.md` |
| Resumable upload synchronization | `11A_Resumable_Attachment_Upload_Synchronization.md` |
| HTTP/API contract | `12_API_Contract.md` |
| Repository–Service synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |
| Physical source structure | `13_Project_Structure.md` |
| Environment/runtime | `14_Environment_Specification.md` |
| Pre-15 confirmed coding governance | `14A_Pre_Coding_Rules_Synchronization.md` |
| **Coding/developer/agent conduct** | **`15_Coding_Rules_AGENTS.md`** |
| Operational agent entrypoint | root `AGENTS.md`, synchronized derivative of `15` |

Later documents retain their own future authority:

```text
16_Testing_Specification.md
17_Seed_Dummy_Data_Specification.md
18_Definition_of_Done.md
19_Task_Implementation_Plan.md
20_Deployment_Architecture.md
```

`15` MUST NOT invent coverage percentages, performance targets, seed master data, physical deployment topology, or other decisions reserved for later documents.

## 4. Addendum Precedence

Synchronization addenda override older wording **only for the narrow concern they explicitly synchronize**.

Examples:

- `11A` controls resumable upload synchronization;
- `12A` controls Repository–Service Architecture where older docs used Actions/direct persistence wording;
- `14A` records approved pre-15 coding/repository governance.

An agent MUST NOT use an old sentence out of context to resurrect a rule explicitly superseded by a newer synchronization document.

## 5. No Silent Requirement Changes

If implementation reveals a conflict, missing requirement, or genuine TBD:

```text
STOP that decision
→ identify affected authority
→ explain conflict/TBD to user
→ obtain decision when required
→ synchronize affected project docs
→ update tests
→ implement
```

Agent MUST NOT silently choose a "best practice" that changes product/business/security behavior.

## 6. Historical Handoff Text

Old `Next Document` / progress statements are historical metadata when they conflict with the current documentation set.

They MUST NOT be interpreted as proof that a newer document does not exist.

---

# PART B — REQUIRED WORKFLOW BEFORE EDITING CODE

## 7. Inspect Before Modify

Before implementing a task, developer/agent MUST inspect enough current repository context to understand:

1. relevant project docs;
2. current code in affected modules;
3. current tests around the behavior;
4. migrations/schema related to the change;
5. API/UI contract if affected;
6. git diff/status/branch context;
7. existing dependency/tooling patterns.

Do not code from memory when repository truth can be read.

## 8. Scope the Change

Before modifying production code, determine:

```text
requested behavior
→ authoritative specification references
→ affected layers/files
→ tests that should prove it
→ security/authorization/concurrency implications
→ migration/dependency/destructive-risk implications
```

The agent SHOULD choose the smallest coherent implementation that satisfies the approved behavior.

## 9. Unrelated Refactor Is Forbidden

A task MUST NOT be used as justification for unrelated cleanup, rename, architecture migration, dependency replacement, formatting churn, or broad refactor.

If an unrelated defect is discovered:

- report it;
- fix it only if required for the requested task or explicitly approved;
- otherwise leave it for a separate task.

## 10. Preserve User Decisions

Agent MUST NOT overwrite explicit user decisions merely because another approach is more conventional.

Examples of locked decisions that must be respected include password minimum 6/no composition/no MFA, Team-neutral authorization, persistent private local storage baseline, DB queue/session/cache, exact XLSX template export, and seven canonical business states.

---

# PART C — TEST-DRIVEN DEVELOPMENT (TDD)

## 11. TDD Is Mandatory

New behavior, bug fixes, and behavior-changing implementation MUST follow TDD.

Canonical cycle:

```text
approved requirement/specification
→ write/update automated test FIRST
→ run targeted test
→ prove RED for intended missing/incorrect behavior
→ write minimum correct production implementation
→ run targeted test
→ prove GREEN
→ run relevant regression suite
→ refactor only while tests stay GREEN
```

The test is derived from the specification. Production code is then written to satisfy the specification proven by the test.

## 12. RED Must Be Meaningful

A valid RED state means the test fails because the required behavior is absent or incorrect.

Invalid/artificial RED examples:

- syntax error intentionally inserted;
- broken test fixture unrelated to behavior;
- wrong import/path created only to force failure;
- impossible assertion known to be unrelated to requirement;
- disabling bootstrap so the suite crashes before reaching behavior.

The failure SHOULD be understandable and relevant to the requirement.

## 13. Test Harness Exception

For a greenfield repository, minimal test harness/bootstrap MAY be established before the first behavioral RED test.

This exception permits only infrastructure required to execute tests; it MUST NOT contain the business behavior that the first test is supposed to drive.

## 14. Tests Must Not Follow the Implementation

Developer/agent MUST NOT:

1. write production behavior first and create tests afterward that merely mirror it;
2. weaken assertions to fit current code;
3. change expected business outcome without corresponding specification change;
4. delete a failing relevant test merely to pass CI;
5. mark tests skipped/todo without a documented legitimate reason;
6. mock away the exact behavior that needs proof;
7. replace integration/concurrency/security proof with a unit mock when real semantics matter;
8. use snapshot/golden regeneration blindly to approve changed output.

## 15. Bug Fix TDD

For a bug:

```text
reproduce bug in automated regression test
→ confirm RED on current code
→ implement fix
→ confirm GREEN
→ retain regression test permanently
```

The test should encode the correct expected behavior, not the bug.

## 16. Pure Refactor

A behavior-preserving refactor does not require an artificial new failing test when existing tests already prove the behavior.

Required flow:

```text
existing relevant tests GREEN
→ refactor
→ same tests remain GREEN
→ static/architecture checks remain GREEN
```

If coverage is insufficient to refactor safely, add characterization/behavior tests before refactoring.

## 17. TDD Evidence

PRs containing new behavior, bug fixes, or behavior changes MUST include truthful TDD evidence.

At minimum:

```text
Specification / requirement reference
RED test command or test target
RED failure summary explaining why it failed
GREEN test command or target
GREEN result
Relevant regression suite result
```

Evidence MUST reflect actual execution. Agent MUST NOT fabricate logs, claim a RED run it did not execute, or label a post-implementation failure as pre-implementation evidence.

For pure refactor, PR may state `TDD RED: N/A — behavior-preserving refactor` and provide the before/after GREEN safety-net evidence.

## 18. Test Modification Review

When production code and its existing test are changed together, reviewer/agent MUST explicitly verify that test changes are requirement-driven rather than implementation-driven.

A passing test suite is not sufficient if assertions were weakened.

---

# PART D — ARCHITECTURE ENFORCEMENT

## 19. Canonical Backend Direction

Mandatory:

```text
HTTP / Inertia
Controller + Form Request
        ↓
Service
        ↓
Repository Contracts + Domain Rules + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Adapters
        ↓
Eloquent / Query Builder / Flysystem / Runtime Components
```

No separate Actions orchestration layer.

## 20. Controller Rules

Controller MUST:

- remain thin;
- consume routed/validated input;
- call the appropriate Service/use-case;
- convert result to Inertia/JSON/redirect/stream response.

Controller MUST NOT:

- query Eloquent/DB for normal business flow;
- call repository directly for normal business flow;
- open business transactions;
- decide workflow destinations;
- implement domain validation;
- mutate business models directly;
- write audit rows directly;
- coordinate ClamAV, OOXML, rendering, signing, or queue workflow.

## 21. Form Request Rules

Form Requests are the HTTP input validation boundary.

MUST:

- validate request shape/types/action-specific input;
- use `validated()`/safe validated data;
- reject untrusted client fields not part of contract.

MUST NOT:

- use `$request->all()` for business persistence;
- perform persistence/business orchestration;
- become a hidden Service;
- treat frontend-provided permission/state fields as authority.

Complex validated nested arrays MAY cross to Service where `12A`/`13` permit it, but must be explicitly mapped later.

## 22. Service Rules

Service is the application/use-case orchestration layer.

Service owns, where applicable:

- business use-case coordination;
- transaction boundary;
- permission/resource/state/security coordination;
- repository calls;
- audit coordination;
- post-commit dispatch;
- infrastructure-contract calls.

Service MUST NOT:

- issue Eloquent/Query Builder business queries directly;
- access HTTP Request objects as its normal API;
- render Vue/Inertia UI details;
- become one giant God Service;
- duplicate a separate Actions layer.

## 23. Repository Rules

Repository contract represents meaningful persistence/query boundary.

Repository implementation MAY use Eloquent/Query Builder/locking/pagination.

Repository MUST NOT:

- decide permission eligibility;
- decide workflow state transitions;
- decide whether Team authorizes an actor;
- dispatch user-facing workflow by itself;
- call Controller/UI;
- become generic `BaseRepository` CRUD wrapping Eloquent mechanically.

Repository grouping is by meaningful domain/aggregate/use-case persistence boundary, not one repository per table.

## 24. Model Rules

Eloquent Model MAY contain:

- relationships;
- casts;
- safe model configuration;
- persistence-oriented local scopes;
- simple derived accessors.

Model MUST NOT contain:

- multi-step workflow orchestration;
- permission bypass;
- cross-repository transaction logic;
- ClamAV/render/signing I/O;
- audit orchestration;
- queue/business dispatch as hidden behavior.

## 25. Job / Command Rules

Business Job/Command:

```text
receive safe identifier/input
→ call Service
```

MUST NOT implement hidden business persistence directly through Model/DB/Repository.

## 26. Domain Layer

Domain contains focused enums/rules/exceptions where semantic value exists.

Do not create mirrored Domain Entity hierarchies, AggregateRoot frameworks, generic Specification pattern, or mapper-per-model architecture without approved change.

## 27. Infrastructure Contracts

External/runtime capabilities use focused contracts/adapters, e.g.:

```text
MalwareScanner
PrivateStorage
SpreadsheetRenderer
PdfSigner
PdfVerifier
```

Do not misname runtime adapters as repositories when they do not persist/query domain data.

---

# PART E — PHP CODING RULES

## 28. Strict Types

Every project-owned PHP source file MUST use:

```php
declare(strict_types=1);
```

unless a narrow interoperability exception is explicitly documented.

## 29. Explicit Types

Project-owned PHP SHOULD use:

- explicit parameter types;
- explicit return types;
- typed properties;
- PHP enums for closed value sets;
- array-shape annotations where useful for validated nested arrays.

Avoid `mixed` when a safe narrower type is practical.

## 30. Static Analysis

PHPStan/Larastan:

```text
level = max
baseline = zero-baseline policy
```

Agent MUST NOT:

- lower analysis level;
- generate a broad baseline to hide errors;
- add blanket ignores;
- add meaningless PHPDoc solely to silence analysis;
- cast blindly instead of fixing type flow.

A narrow suppression MAY exist only for a proven library/framework limitation, must be local, explained, and covered where practical.

## 31. Formatting

Laravel Pint is formatting authority for project-owned PHP.

Formatting MUST NOT be used to create unrelated whole-repository churn in a narrowly scoped PR.

## 32. Naming

Use names that express business/technical responsibility, not vague containers such as:

```text
Helper
Manager
Utils
CommonService
BaseService
GenericRepository
```

unless the abstraction has a concrete narrowly defined meaning.

Prefer names such as:

```text
NscmfWorkflowService
AttachmentFinalizationService
EloquentNscmfRepository
PdfVerificationService
TechnicalLogCleanupService
```

## 33. Comments / PHPDoc

Comments explain **why**, invariants, non-obvious constraints, or external format quirks.

Do not generate verbose boilerplate comments that restate obvious code.

PHPDoc SHOULD add type/contracts/context not expressible cleanly in native PHP; it SHOULD NOT duplicate every method signature mechanically.

## 34. Exception Handling

Do not silently swallow exceptions.

Failures must preserve correct atomicity and safe error semantics.

Do not convert a failed domain/security operation into false success merely to simplify UI flow.

Exception/error output MUST NOT leak secrets, SQL internals, host paths, signing-key details, or scanner internals to users.

---

# PART F — TYPESCRIPT / VUE CODING RULES

## 35. TypeScript Strict Mode

Required:

```json
"strict": true
```

Project-owned frontend code MUST NOT normalize:

```text
any
as any
blanket @ts-ignore
blanket @ts-nocheck
```

as compiler bypasses.

A narrow external-library interoperability exception must be local, explained, and as strongly typed as practical.

## 36. Backend Is Authority

Frontend is presentation/local interaction only.

Frontend MUST NOT become source of truth for:

- permission;
- workflow eligibility;
- current canonical state;
- attachment CLEAN status;
- upload accepted-chunk truth;
- export/signature validity;
- business validation that backend does not enforce.

`allowed_actions` is a UI hint, never an authorization token.

## 37. Vue Structure

Follow `13_Project_Structure.md`:

```text
Pages
features
components
composables
layouts
lib
types
```

Do not create giant page components containing API, domain, permission, and UI behavior in one file.

Do not fragment every trivial input into unnecessary components.

## 38. Unsafe HTML

Do not introduce unsafe `v-html` or equivalent raw HTML rendering for untrusted content.

If an approved use case ever requires raw HTML, sanitization/security design must be explicit first.

## 39. Frontend Validation

Frontend validation improves UX but does not replace backend rules.

Do not maintain a divergent second business-rule engine in TypeScript.

## 40. Error Handling UX

Distinguish at least where applicable:

- validation error;
- permission denied;
- stale/version conflict;
- stale workflow state;
- authentication/session expiration;
- security gate failure;
- upload interruption;
- malware/scan failure;
- export/signing failure.

Do not expose sensitive internals in client-visible messages.

---

# PART G — DATABASE / MIGRATIONS

## 41. Schema Authority

`11_ERD_Database_Schema.md` + applicable synchronization addenda are authoritative.

Do not create hidden EAV/generic JSON business storage or tables that recreate forbidden Team/Unit/Division/scope/RBAC concepts.

## 42. Migration Immutability

A migration becomes immutable after it has been applied/shared in an environment whose history must be preserved, including staging/production and shared integration contexts.

After that:

```text
schema change
→ new forward migration
```

Do not rewrite historical migration behavior.

A migration may be edited only while it is genuinely local/unshared and has never formed part of shared environment history.

## 43. Migration Safety

Migration MUST:

- express the intended `11` schema;
- preserve data unless a separately approved destructive change requires otherwise;
- use appropriate FK/index/constraint semantics;
- be tested against MySQL 8.4 where semantics matter.

Do not use destructive rollback/reset against shared/staging/production data as a shortcut.

## 44. No Hidden DB Business Logic

Do not use database triggers/stored logic to secretly implement workflow/authorization rules unless an explicit future architecture decision says otherwise.

Business workflow remains application Service/domain controlled.

## 45. Query Ownership

Application business Eloquent/Query Builder queries belong in Eloquent repository implementations.

Migrations, seeders, framework internals, and test setup are not violations of this boundary when used for their legitimate purpose.

---

# PART H — TRANSACTIONS / CONCURRENCY

## 46. Service Owns Transaction Boundary

Business transaction boundaries are Service-owned.

Repository MUST NOT independently commit/rollback a broader use case spanning repositories.

## 47. Workflow Mutations

Workflow state mutation uses short transaction + row lock/current-state revalidation according to `05`, `09`, `11`, and `12`.

Conceptually:

```text
authorize
→ begin transaction
→ lock current record
→ re-read/revalidate state/version/prerequisites
→ mutate
→ write required audit
→ commit
```

First valid concurrent workflow transition wins; stale conflicting action fails.

## 48. Optimistic Versioning

Draft/Revision/Change Result and applicable stale-UI actions use `record_version` exactly as specified.

Agent MUST NOT silently overwrite a newer persisted version or guess next version client-side.

## 49. No Long I/O Under Locks

Do not perform long external/file operations while a workflow row lock is held, including:

- ClamAV scan;
- XLSX rendering;
- PDF signing;
- network-heavy storage operation;
- long export generation.

Use short transaction to bind state/snapshot then dispatch/process outside lock where specified.

---

# PART I — AUTHORIZATION / RBAC / SESSION

## 50. Permission-Centric Authorization

Runtime authorization uses Spatie permissions + Laravel Policies/Gates + explicit domain/state/ownership/security checks.

Do not hard-code normal authorization by role name when a permission exists.

Protected Superadmin identity checks remain only where explicitly required by specification.

## 51. Team Is Not Authorization

Team is organizational/profile metadata only.

MUST NOT introduce:

```text
Reviewer Scope
Approval Scope
Unit
Division
Spatie Teams
Team-scoped permission pivot
Team match as Review/Approval eligibility
```

## 52. No Universal Superadmin Bypass

Protected Superadmin does not bypass invalid workflow/security/business invariants.

Do not add a global `before()`/wildcard bypass that makes impossible business actions succeed merely because actor is Superadmin.

## 53. Spatie Rules

Required:

```text
spatie/laravel-permission ^8
teams = false
wildcard permissions = false
guard = web
```

Reuse package-owned tables exactly; no shadow RBAC schema.

No normal direct-user permission administration UI.

## 54. Sensitive Re-auth

Actions specified as sensitive require current-password re-auth proof with lifetime **15 minutes**.

Do not extend/permanent-cache this proof.

## 55. Session Policy

Implement exactly:

```text
idle timeout = 30 minutes
absolute authenticated lifetime = 8 hours
max active authenticated sessions = 2
third valid login = succeeds and revokes oldest active session
```

Access-changing mutations revoke affected sessions according to `10`; Team-only change does not.

---

# PART J — BUSINESS STATE / VALIDATION

## 56. Canonical Business States

Exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Do not introduce `SUBMITTED`, `UNDER_REVIEW`, `REOPENED`, `COMPLETED`, `ARCHIVED`, upload statuses, export statuses, or security statuses as new NSCMF business states.

## 57. Explicit Workflow Actions

No generic client-driven `setStatus()` endpoint or persistence method.

Use explicit business actions defined by `05`/`12`.

## 58. Validation Is Action-Specific

Draft/Revision may be incomplete.

Submit/Resubmit/Forward/Approve/etc. enforce their specific gates.

Warnings MUST NOT be silently promoted to blocking errors, and security failures MUST NOT be downgraded into warnings.

## 59. Passing Validation Is Not Authorization

A valid payload still requires permission/resource/state/security/concurrency checks.

Frontend hidden buttons are never the security boundary.

---

# PART K — ATTACHMENT / RESUMABLE UPLOAD

## 60. Locked Attachment Limits

```text
optional
max active final attachments = 10 / record
max final size = 20 MB
zero byte = reject
allowed: .pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```

Macro/executable/script formats listed as disallowed in specs remain rejected.

## 61. Private Storage Only

Chunks, assembly/quarantine, final attachments, generated exports, official templates, and validator temp files remain private.

Storage path/key is never authorization.

Initial production baseline is Laravel private local filesystem on persistent/non-ephemeral storage; do not silently introduce S3/object storage.

## 62. Resumable Chunk Rules

Locked chunk size:

```text
5 MiB = 5,242,880 bytes
```

Chunk indexes are 1-based per `12`.

Server accepted/missing state is authoritative.

Client SHA-256 is only an untrusted resume hint.

Server-computed final assembled SHA-256 is authoritative.

## 63. Duplicate Retry

Byte-identical replay of an already accepted chunk:

```text
accepted = true
duplicate = true
```

and MUST NOT create new logical progress or indefinitely refresh expiry.

Different bytes for same accepted index → conflict (`UPLOAD_CHUNK_CONFLICT`).

Unfinished expiry is 24 hours since last **newly accepted** progress.

## 64. Finalization Security Gate

Required flow:

```text
all chunks present
→ verify geometry/size
→ assemble privately
→ authoritative server SHA-256
→ final type validation
→ whole-file ClamAV scan
→ explicit CLEAN
→ promote final private attachment
```

Chunk scans, if ever added, do not replace final whole-file scan.

`COMPLETED` transport status is not equivalent to attachment `CLEAN`.

## 65. Fail Closed

ClamAV unavailable/error/timeout/INFECTED or uncertain storage/integrity state MUST NOT produce usable attachment.

---

# PART L — XLSX / PDF EXPORT

## 66. Official XLSX Template Is Immutable Input

The official versioned `NSCMF-Form-3.0.xlsx` template remains export authority until an approved replacement version exists.

Do not overwrite the registered template binary in place.

## 67. Targeted OOXML Only

Because the workbook contains native Excel checkbox/control/VML structures, implementation MUST NOT generically load-edit-save the whole workbook with a library that may strip unsupported OOXML parts.

Required approach:

```text
immutable template
→ private working copy
→ targeted OOXML/package patch of mapped data/control state
→ preserve unrelated ZIP members
→ structural/integrity validation
→ XLSX artifact
```

Do not guess cell/control mappings.

## 68. PDF Rendering

PDF must come from a qualified spreadsheet renderer preserving official template fidelity.

No HTML/DomPDF approximation fallback.

Exact renderer provider/executable/topology remains unresolved until approved qualification/deployment decision.

## 69. Immutable Export Snapshot

Export request binds immutable snapshot + record version + workflow iteration + template version before background generation.

Worker MUST NOT reread later mutable business state as export source.

## 70. Approved PDF Signing

Approved PDF requires server-side System/Organization cryptographic signing.

Human `Approved By` is not the cryptographic signer.

Signing failure → export FAILED; record remains APPROVED; no unsigned Approved fallback.

Do not invent signer provider/library/CA/path/passphrase/rotation while those remain TBD.

## 71. Signing Secret

Private signing key/passphrase MUST NOT appear in:

- Git/source;
- ordinary DB;
- browser/Inertia props;
- logs/audits;
- `.env.example`;
- test fixture representing production identity.

---

# PART M — AUDIT / LOGGING / SECRET HANDLING

## 72. Authoritative Audits

Business Audit, Access Audit, and Security Audit have **no age-based purge**.

Do not create purge-by-age endpoints/settings/commands for these authorities.

## 73. Technical Logs Are Separate

Technical Logs are operational diagnostics.

Current runtime setting:

```text
auto cleanup default ON
retention default 30 DAY
Protected Superadmin can choose positive DAY/MONTH or OFF
no fixed product maximum
```

Technical-log cleanup MUST NOT delete authoritative audits, NSCMF history, workflow iterations, or PDF issuance evidence.

## 74. Secret Redaction

Never log/return/persist secret plaintext such as:

- user password;
- generated temporary password after one-time response lifecycle;
- signing private key/passphrase;
- session/cookie/token secrets;
- production credentials;
- raw sensitive request payloads unnecessarily.

## 75. Temporary Password

Admin create/reset temporary password is server-generated, plaintext exists transiently only for one-time acting-admin reveal, target must change it, and no retrieval endpoint exists later.

If lost, reset again; do not recover plaintext from persistence.

---

# PART N — ERROR / API BEHAVIOR

## 76. API Contract Is Authoritative

Do not change route/method/payload/error semantics for folder convenience.

Normal Inertia/Web + selected JSON endpoints remain the model; no JWT/Bearer standalone API baseline.

## 77. Standard Error Envelope

Structured JSON errors follow `12`:

```json
{
  "code": "...",
  "message": "...",
  "errors": {},
  "context": {}
}
```

Failed mutation MUST NOT return false HTTP 200 success.

## 78. Stable Machine Codes

Machine-readable codes SHOULD remain stable and explicit.

Do not expose stack traces, SQL, filesystem paths, secret refs, or scanner/signer internal details in user-visible error messages.

## 79. Stale Actions

Version/state conflicts must be explicit and safe; do not auto-retry a state-changing action in a way that could approve/reject/overwrite unexpectedly.

---

# PART O — DEPENDENCY GOVERNANCE

## 80. Existing Approved Dependencies

Dependencies already approved in project docs may be installed/resolved according to compatible locked versions and lockfiles.

## 81. New Dependency Requires Explicit User Approval

Before committing a new dependency addition, agent MUST obtain explicit user approval if the package is not already approved by project specification.

This applies to runtime and development dependencies.

## 82. Approval Request Content

When asking approval, explain briefly:

- package name;
- runtime vs dev;
- problem it solves;
- why existing stack/project code is insufficient;
- security/maintenance impact if material;
- alternative without the dependency.

Do not pressure user with "best practice" language.

## 83. No Dependency Soup

Do not add a library for trivial code that can be implemented safely with existing Laravel/Vue/PHP/browser capabilities.

Do not add DTO, state-machine, repository, workflow, generic audit, search, Redis, queue, websocket, or cloud-storage packages that contradict locked architecture.

## 84. Lockfiles

`composer.lock` and `package-lock.json` MUST be committed and kept synchronized with approved manifests.

Do not casually regenerate lockfiles with unrelated package updates in a narrow change.

---

# PART P — GENERATED FILES / BUILD ARTIFACTS

## 85. Source Before Generated Output

When a committed generated artifact is required:

```text
edit authoritative source
→ regenerate with approved tooling
→ inspect diff
→ commit source + required generated artifact
```

Do not hand-edit generated output to hide mismatch with source.

## 86. Normally Uncommitted Generated/Runtime Data

Unless a later project specification explicitly requires otherwise, do not commit transient artifacts such as:

```text
node_modules/
vendor/
coverage/
Playwright reports/screenshots/videos generated by runs
runtime logs
local caches
runtime uploads/chunks
private export artifacts
validator temp files
local .env
production secrets/private signing material
```

`public/build/` or similar frontend build output SHOULD be generated by build/CI/deployment rather than treated as handwritten source unless deployment design later explicitly requires committed assets.

## 87. Official Template Exception

The official immutable XLSX template is a project-controlled binary input governed by template versioning/integrity rules, not an ordinary build artifact.

It MUST NOT be casually overwritten/regenerated.

---

# PART Q — GIT / BRANCH / PULL REQUEST RULES

## 88. Normal Workflow

Required normal flow:

```text
current approved main
→ feature/fix/docs/chore branch
→ Conventional Commits
→ Pull Request to main
→ CI/review
→ human final merge
```

Direct implementation work on `main` is not normal workflow.

## 89. Branch Naming

Use concise meaningful prefixes where practical:

```text
feat/<topic>
fix/<topic>
docs/<topic>
test/<topic>
refactor/<topic>
chore/<topic>
```

Do not encode model/AI identity in branch names.

## 90. Conventional Commits

Examples:

```text
feat: add draft persistence flow
fix: reject stale approval transition
test: add reviewer race regression
docs: synchronize coding rules
refactor: split attachment finalization service
chore: configure phpstan max
```

Commit should represent a coherent change.

## 91. Commit Identity

Commits MUST use user's/project's configured authenticated Git identity or configured signing key/GPG mechanism where available.

MUST NOT add AI/model contributor metadata.

Forbidden examples:

```text
Co-authored-by: ChatGPT
Co-authored-by: Codex
Generated-by: GPT
AI contributor: ...
```

## 92. Signing

If repository/local environment is configured for commit signing, use that configured mechanism.

If the GitHub connector/API path cannot create a cryptographic GPG/SSH-signed commit, committing under the user's authenticated GitHub identity satisfies the approved fallback; do not fabricate a signature or claim `Verified` when GitHub reports unsigned.

## 93. Agent Cannot Approve/Merge Own PR

AI/coding agent MAY:

- create branch;
- commit;
- open/update PR;
- inspect CI/review;
- push fixes to the PR branch.

AI/coding agent MUST NOT:

- approve its own implementation PR;
- merge its own implementation PR;
- enable auto-merge to bypass human merge control.

Final merge must be performed/authorized by the human owner.

## 94. PR Description

A meaningful implementation PR SHOULD contain:

- purpose/requirement;
- relevant spec references;
- key design notes;
- TDD evidence;
- tests/checks run;
- migration/dependency implications;
- security/concurrency implications when relevant;
- known limitations/TBDs without inventing resolutions.

## 95. No History Rewriting Shortcut

Do not rewrite shared history destructively without explicit user approval.

Do not delete branches containing unmerged work without explicit approval.

---

# PART R — DESTRUCTIVE ACTION SAFETY

## 96. Explicit Approval Required

Before executing a destructive action, coding agent MUST obtain explicit user approval.

Destructive actions include operations that can materially erase data/work/history, rewrite shared repository/database history, delete authoritative evidence, or overwrite immutable registered project assets.

## 97. Disposable Test Environment Exception

An isolated disposable test environment created specifically by the agent/test harness and containing no user/shared/production data MAY be recreated/cleared as part of automated tests when that behavior is expected and safely scoped.

This does not authorize destructive actions against developer workspaces, shared CI state, staging, or production.

## 98. Scope Confirmation

Before an approved destructive action, verify target environment/path/database/branch so approval cannot accidentally apply to a different resource.

## 99. No Destructive Shortcut

A broad implementation request is not permission to use destructive shortcuts.

---

# PART S — AI / CODING AGENT CONDUCT

## 100. Agent Is Bound by the Same Rules as Human Developer

AI does not receive architecture/security exceptions merely because it can generate code quickly.

Agent MUST obey all project docs and this coding constitution.

## 101. No Hallucinated APIs / Classes / Schema

Before calling or modifying an existing symbol, inspect repository source when practical.

Do not invent:

- class names and pretend they exist;
- API routes not in `12`;
- DB columns not in `11`;
- permission names not in `04`;
- business states not in `05`;
- dependencies not approved;
- deployment services not approved.

## 102. No Fake Completion

Agent MUST NOT claim:

- tests passed without running them;
- file was updated without verifying it;
- CI passed without evidence;
- a commit is signed/verified when it is not;
- a GitHub/Figma/environment mutation occurred if it did not;
- behavior is exact-template compatible without required fidelity validation.

## 103. No Test Gaming

Agent MUST NOT optimize for green CI by violating specification.

Forbidden:

- deleting test;
- weakening assertion;
- hard-coding test fixture-specific answer into production;
- bypassing permission/security check under test environment;
- special-case `APP_ENV=testing` to make business behavior pass unless the environment difference is explicitly allowed;
- mocking the system under test so the required real behavior is never executed;
- changing golden output blindly.

## 104. Read Errors, Fix Root Cause

When lint/static/test fails:

```text
read failure
→ locate root cause
→ check specification
→ fix production/test/tooling according to authority
```

Do not suppress diagnostics first.

## 105. Avoid AI Slop

Do not generate:

- redundant wrappers;
- duplicate abstractions;
- boilerplate interfaces with no semantic value;
- giant utility files;
- dead comments;
- speculative future modules;
- premature extensibility;
- placeholder code presented as finished implementation.

Prefer clear Laravel-native code that a human engineer can follow.

## 106. Ask Only for Genuine Decisions

Do not repeatedly ask questions already answered in project docs/history.

Ask user when a genuine unresolved decision materially affects implementation, especially new dependency, destructive operation, or product/security architecture TBD.

## 107. Work Within Task Scope

Do not silently implement later document decisions (`16–20`) while doing an earlier implementation task.

If task requires a later unresolved decision, surface it rather than invent it.

---

# PART T — SECURITY-SENSITIVE CODING

## 108. Trust Boundary

All client input is untrusted, including:

- IDs;
- status/action claims;
- file metadata;
- MIME;
- filename;
- upload fingerprint/hash;
- chunk index/bytes;
- pagination/sort/filter;
- request version;
- hidden form fields.

Server validates/authorizes from authoritative state.

## 109. SQL

Use Eloquent/Query Builder/bindings inside repository implementation.

Do not concatenate untrusted values into raw SQL.

Any raw SQL must be narrowly justified, bound safely, and tested against MySQL semantics.

## 110. Mass Assignment

Do not blind mass-assign request arrays.

Explicitly map allowed fields. Server-managed fields remain server-managed.

## 111. File Handling

Original filename is metadata only, never storage path.

Use opaque internal storage names/keys and private storage.

Do not trust extension/MIME/hash supplied by client as final security truth.

## 112. Web Security

Implementation must preserve locked security requirements including HTTPS production, secure HttpOnly cookies, CSRF, CSP, anti-clickjacking, nosniff, referrer policy, HSTS when deployment is correct, no wildcard credentialed CORS, safe Vue escaping, and debug-off staging/production.

Do not weaken these controls for convenience.

---

# PART U — CODE REVIEW / VERIFICATION BEFORE COMPLETION

## 113. Required Verification Mindset

A task is not complete when code merely exists.

Before reporting completion, agent/developer MUST verify the affected concern appropriately.

## 114. Minimum Checks by Change Type

### PHP backend change

Normally check relevant:

```text
Pint
PHPStan/Larastan max
Pest targeted tests
relevant regression tests
```

### Vue/TypeScript change

Normally check relevant:

```text
ESLint
Prettier check
vue-tsc / strict TypeScript
Vitest targeted tests
relevant build/E2E when behavior requires
```

### DB/migration change

Check:

- migration target/schema alignment;
- MySQL 8.4 semantics where relevant;
- forward migration behavior;
- repository/integration tests;
- no historical shared migration rewrite.

### Attachment change

Check resumability/idempotency/final hash/CLEAN/private-storage/failure behavior relevant to change.

### Export change

Check template mapping/OOXML preservation/golden fidelity and signing/issuance behavior relevant to change.

### Authorization/workflow change

Check positive + negative authorization, state gates, stale/concurrent behavior, audit evidence.

Exact complete test matrix belongs to `16_Testing_Specification.md`.

## 115. Inspect Diff

Before commit/PR completion, inspect diff for:

- unrelated edits;
- accidentally committed secrets;
- generated artifacts;
- lockfile churn;
- weakened tests;
- debug code;
- stale comments;
- accidental architecture violations.

## 116. Verify Repository Mutation

After creating/updating critical repository files, re-read/fetch them where tooling permits.

After commit, verify branch/commit/PR state rather than assuming write succeeded.

## 117. Report Truthfully

Final task report should state:

- what changed;
- what tests/checks actually ran and their results;
- what was not run and why;
- any unresolved approved TBD;
- branch/PR/commit state if applicable.

Do not hide partial completion.

---

# PART V — ROOT AGENTS.md SYNCHRONIZATION

## 118. Purpose of Root `AGENTS.md`

Root `AGENTS.md` is the first operational instruction file for coding agents.

It MUST be concise enough to read at task start, but strong enough to prevent dangerous defaults.

## 119. Authority Relationship

```text
project_doc/15_Coding_Rules_AGENTS.md = authoritative full specification
AGENTS.md                              = synchronized operational entrypoint
```

If root `AGENTS.md` is ambiguous, read `15` and relevant upstream docs.

Root `AGENTS.md` MUST NOT override a project document.

## 120. Synchronization Requirement

Any approved change to coding-agent rules that affects root `AGENTS.md` MUST update both in the same coherent change/PR.

Agent MUST NOT modify only one and leave material contradiction.

## 121. Nested AGENTS Files

Do not create nested `AGENTS.md` files unless a real directory-specific need emerges and the inheritance/override rule is explicit.

Nested instructions MUST NOT weaken root/project rules.

---

# PART W — FORBIDDEN IMPLEMENTATION PATTERNS

## 122. Developer / AI MUST NOT

1. invent Unit/Division/Reviewer Scope/Approval Scope;
2. use Team as authorization boundary;
3. enable Spatie Teams or wildcard permissions;
4. duplicate Spatie RBAC tables;
5. add normal direct-user permission admin UI;
6. add universal Superadmin business/security bypass;
7. add business statuses beyond seven canonical states;
8. treat archive/upload/export/security states as NSCMF business states;
9. require all Approvers or exclusive assignment;
10. bypass workflow for Emergency Change;
11. make attachments mandatory;
12. trust client final hash;
13. treat chunk scans as final malware authority;
14. equate upload `COMPLETED` with attachment `CLEAN`;
15. use public storage/path-as-auth;
16. keep acknowledged production chunks only on ephemeral storage;
17. generic-rewrite official XLSX and risk stripping controls/VML;
18. generate authoritative PDF from approximate HTML;
19. issue unsigned Approved PDF fallback;
20. equate human Approver with System/Organization cryptographic signer;
21. age-purge Business/Access/Security Audit;
22. delete audit/issuance evidence when export binary expires;
23. make export worker read later mutable record instead of snapshot;
24. reintroduce Actions orchestration layer;
25. introduce DTO architecture without approved change;
26. create generic BaseRepository/per-table repositories mechanically;
27. make Controller query Model/DB or normal Repository;
28. make Service issue Eloquent/Query Builder business queries;
29. make Job execute direct business persistence;
30. make Repository decide permission/state/business workflow;
31. make Model orchestrate workflow;
32. use `$request->all()` for business persistence;
33. blind mass-assign validated nested arrays;
34. create generic key/value settings EAV;
35. let Technical Log cleanup touch authoritative evidence;
36. persist/log/retrieve temp password plaintext;
37. change password rule above min6/add complexity/MFA;
38. extend re-auth beyond 15 minutes without spec change;
39. accept public validator PDF >20 MB;
40. require S3/object storage current MVP;
41. expose secrets in `VITE_*`;
42. scatter `env()` through application code;
43. choose signer/renderer/ClamAV physical topology without approved decision;
44. silently resolve a TBD;
45. add unapproved dependency;
46. rewrite applied/shared migration history;
47. execute destructive action without explicit user approval;
48. lower PHPStan/Larastan from max or create broad baseline to hide errors;
49. disable TypeScript strictness or use broad type escapes;
50. game tests to match implementation;
51. claim tests/checks/commits/signatures that did not occur;
52. add AI/model contributor metadata;
53. approve/merge its own implementation PR;
54. commit secrets/runtime private artifacts;
55. hand-edit generated artifacts to disagree with source;
56. perform unrelated refactor inside a scoped change.

---

# PART X — ACCEPTANCE CRITERIA FOR CODING PRACTICE

## 123. Authority / Scope

- [ ] relevant specs read before implementation;
- [ ] no hallucinated requirement/TBD resolution;
- [ ] changes scoped to requested behavior;
- [ ] affected docs synchronized when an approved requirement changes.

## 124. TDD

- [ ] new behavior/bug fix starts with requirement-derived test;
- [ ] meaningful RED observed before implementation where TDD applies;
- [ ] GREEN obtained after implementation;
- [ ] regression suite run appropriately;
- [ ] tests not weakened/gamed;
- [ ] PR evidence truthful.

## 125. Architecture

- [ ] Controller → Service;
- [ ] Service owns orchestration/transactions;
- [ ] Service does not issue Eloquent business queries;
- [ ] Repository contracts + Eloquent implementations used meaningfully;
- [ ] Jobs call Services;
- [ ] no Actions/DTO/BaseRepository/God Service drift.

## 126. Quality / Types

- [ ] project PHP strict types;
- [ ] PHPStan/Larastan max zero-baseline maintained;
- [ ] TypeScript strict maintained;
- [ ] no casual `any`/suppression bypass;
- [ ] formatter/linter/static checks relevant to change pass.

## 127. Security / Data

- [ ] server remains authorization/validation authority;
- [ ] no secrets leaked;
- [ ] migration history safe;
- [ ] attachments remain private/CLEAN-gated;
- [ ] audit retention rules preserved;
- [ ] export/signing invariants preserved.

## 128. Dependency / Git / Agent Safety

- [ ] no new unapproved dependency;
- [ ] branch + PR workflow used;
- [ ] Conventional Commits;
- [ ] no AI/model contributor metadata;
- [ ] agent does not approve/merge own PR;
- [ ] destructive actions require explicit user approval;
- [ ] generated files handled from source;
- [ ] root `AGENTS.md` synchronized.

---

# PART Y — HANDOFF TO TESTING SPECIFICATION

## 129. Relationship to `16_Testing_Specification.md`

`15` defines **how code must be developed and how TDD integrity is protected**.

`16` will define the authoritative detailed testing strategy/matrix, including test layers, fixtures, integration boundaries, concurrency/security cases, environment-specific test execution, golden/export qualification strategy, and CI testing expectations without weakening `15`.

`16` MUST NOT turn TDD into post-hoc testing.

## 130. Items Intentionally Not Invented Here

Remain outside `15` until their authority is created/approved:

- numeric test coverage threshold;
- exact performance/load thresholds;
- exact CI runner topology;
- exact signer provider/library/rotation ceremony;
- exact renderer/ClamAV physical topology/timeouts where still TBD;
- exact seed/dummy dataset;
- Definition of Done full project gate;
- implementation task breakdown;
- production server/load-balancer/backup/DR topology.

## 131. Next Document

Next fixed-order document, **only after explicit user instruction**:

**`16_Testing_Specification.md`**.

Until then, implementation/testing work remains bound by all current authoritative documents including this `15` and root `AGENTS.md`.