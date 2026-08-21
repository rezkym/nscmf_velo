# Tech Stack Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-TECH-008  
> **Document Order:** 08 / 20  
> **Status:** Draft — Confirmed Technology Baseline + Spatie/Team Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Target Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk technology selection dan technology boundaries** NSCMF Digital Form & Workflow System.

Dokumen mengunci runtime, backend/frontend stack, Inertia integration, UI stack, authentication, authorization package boundary, database, queue/cache/session, storage, ClamAV, exact XLSX/PDF export direction, audit approach, testing, quality gates, Docker compatibility, dan dependency policy.

Current authorization synchronization is explicit:

- Spatie Laravel Permission 8.x remains the RBAC primitive;
- organization uses Team as normal business/profile data;
- Team is not authorization scope;
- Spatie `teams` feature MUST remain disabled;
- no custom Reviewer/Approval scope layer;
- Spatie-owned RBAC tables MUST NOT be duplicated by ERD;
- direct user permission administration is not a normal MVP feature;
- wildcard permissions remain disabled;
- Login/Logout are Fortify/session authentication operations, not Spatie permissions.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default.
- **MAY** — allowed.
- **QUALIFIED** — production eligible only after required qualification.
- **TBD** — unresolved.

---

# PART A — DESIGN CONSTRAINTS

## 3. Technology Must Serve Business Rules

Stack must support:

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
13. private optional attachments + ClamAV CLEAN gate;
14. History/search;
15. exact-template XLSX/PDF;
16. async immutable-snapshot export;
17. System/Organization signed Approved PDF;
18. public PDF verification;
19. ~10 expected users / 50-user engineering baseline;
20. Docker compatibility;
21. no WebSocket/Redis/search-engine requirement for MVP;
22. testing/export/security regression from bootstrap.

## 4. Architecture Style

```text
Laravel 13 Modular Monolith
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
```

No separate frontend/backend repositories or standalone REST-SPA architecture without approved change.

---

# PART B — FINAL TECHNOLOGY SUMMARY

## 5. Confirmed Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13.x |
| Runtime | PHP 8.5.x |
| PHP packages | Composer 2.x |
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
| ORM | Eloquent + Query Builder |
| Queue | Laravel Database Queue |
| Session | database session driver |
| Cache | Laravel database cache baseline |
| Storage | Laravel Filesystem/Flysystem private local dev + private S3-compatible production target |
| Malware | ClamAV / clamd behind `MalwareScanner` |
| XLSX | original template + targeted OOXML patching |
| PDF | qualified spreadsheet renderer |
| PDF signing | server-side `PdfSigningService` |
| Public verification | Laravel `PdfVerificationService` boundary |
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

### Frontend packages
Pin via `package-lock.json`; upgrades require relevant tests.

---

# PART D — BACKEND

## 7. Laravel Authority

Laravel is authoritative runtime for authentication, authorization, routing, validation, workflow, persistence, transactions, audits, queue jobs, attachment access, malware orchestration, export, signing, public verification, History/search.

Business logic MUST NOT live only in Vue.

## 8. Application Services / Actions

Controllers SHOULD remain thin. Conceptual actions include:

```text
CreateNscmf
SaveDraft
SubmitNscmf
UpdateChangeResult
ReturnForRevision
RejectNscmf
ForwardToApproval
ApproveNscmf
ReopenNscmf
ArchiveNscmf
ScanAttachment
RequestNscmfExport
GenerateNscmfExport
SignApprovedPdf
VerifyIssuedPdf
CreateUser
ResetUserCredential
ChangeUserRoles
ChangeRolePermissions
ChangeUserTeam
```

Role/permission mutations MUST go through application orchestration so re-authentication, affected-session revocation, and Security Audit happen consistently.

## 9. Transactions

Laravel `DB::transaction()` + InnoDB primitives required.

Workflow action invariant:

```text
required permission
+ ownership/resource authorization where applicable
+ current state/archive/validation/security checks
+ mutation
+ required Business Audit
= one consistent action
```

Team is not an authorization check.

Long scan/render/sign work must not hold workflow row lock.

---

# PART E — FRONTEND / INERTIA

## 10. Vue 3 + TypeScript

Vue handles presentation/local interaction only; not permission/state/malware/signature truth.

## 11. Inertia 3

```text
Browser
→ Laravel route/controller
→ server authorization/validation
→ Application Action
→ Inertia response
→ Vue
```

Dedicated JSON endpoints allowed for autosave/upload/export status/public verifier while remaining in same Laravel app and security model.

## 12. No Inertia SSR Requirement

SSR not required MVP; `/ispdfvalid` being public does not justify SSR by itself.

## 13. UI Stack

shadcn-vue + Tailwind 4 + Lucide. Business/security behavior never changed to fit component defaults.

---

# PART F — AUTHENTICATION

## 14. Authentication Model

```text
username + password
```

No SSO/LDAP/OAuth/MFA current MVP. Session auth through Fortify/Laravel foundations.

## 15. Username / Credential

Username unique according to ERD. Password securely hashed, never plaintext. Disabled account denied. Protected Superadmin invariant preserved.

Password policy is authoritative in `10`: min6, no composition, no MFA.

## 16. Fortify Boundary

- registration disabled;
- no self-service Forgot Password baseline;
- admin reset via temporary password + forced change;
- throttling/progressive delay;
- idle30m / absolute8h / max2 sessions;
- sensitive role/permission/password reset requires current-password re-auth;
- effective authorization-changing role/permission mutations revoke affected sessions;
- Team change alone does not change effective permission.

`session.login` and `session.logout` MUST NOT be created as Spatie permission rows.

---

# PART G — SPATIE AUTHORIZATION — CRITICAL

## 17. Package Version / Compatibility

Use **Spatie Laravel Permission 8.x**.

Current package line supports Laravel 13 / PHP 8.5 compatibility according to the package's current dependency contract verified during specification work.

## 18. Package-Owned Database Schema

The package's standard migration owns these RBAC tables:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

`11_ERD_Database_Schema.md` MUST reuse these package-owned tables and MUST NOT create duplicate custom RBAC tables such as:

```text
user_roles
user_permissions
role_permissions
effective_permissions
reviewer_roles
approver_roles
```

Application `users` table remains application-owned and participates through Spatie polymorphic model pivots.

Preferred user PK direction = Laravel conventional bigint for clean default package compatibility unless ERD later has explicit approved reason otherwise.

## 19. Role / Permission Usage

Current design:

```text
Permissions → Roles → Users
```

Roles group capability sets. Application SHOULD authorize through Laravel `can()`/Gate/Policy permission checks rather than hard-coding routine feature access by role name.

Multi-role uses Spatie native role assignment and permission union.

## 20. Direct User Permissions

Spatie's `model_has_permissions` table remains because it belongs to the package.

But current MVP:

- does not expose direct permission-to-user administration;
- does not depend on direct user permissions for normal product setup;
- normally assigns permissions to roles and roles to users.

Future direct-user permissions require explicit specification change.

## 21. Spatie Teams MUST Stay Disabled

Spatie has its own authorization-scoping feature named Teams. It is **not** NSCMF organizational Team.

Required configuration:

```php
'teams' => false,
```

MUST NOT:

- enable package Teams for Team NOC/CS/Fulfillment;
- use `setPermissionsTeamId()` in normal authorization;
- add Spatie team foreign keys to role/permission pivots for this product;
- make roles/permissions Team-scoped.

Application business Team is modeled independently and has no permission effect.

## 22. Wildcard Permissions MUST Stay Disabled

Required current configuration:

```php
'enable_wildcard_permission' => false,
```

`nscmf.review.*` in documentation is shorthand only. Actual permission rows are explicit.

## 23. Single Guard

Current web app uses `web` guard for role/permission resolution. No duplicate guards without authentication architecture change.

## 24. Spatie Is Not the Whole Domain Decision

Effective action eligibility:

```text
Spatie/Laravel permission result
+ ownership only where explicit business rule requires it
+ current business state
+ archive treatment
+ validation
+ protected invariants
+ security preconditions
+ concurrency/current-state check
```

No Team/scope layer.

## 25. Protected Superadmin

Preferred implementation: protected Superadmin role receives all defined application permissions and remains protected through explicit application invariants.

MUST NOT implement a generic Superadmin bypass that turns invalid domain actions into valid actions. Superadmin still cannot Reopen Cancelled, hard-delete NSCMF, bypass required state/reason/security/signing rules.

---

# PART H — VALIDATION IMPLEMENTATION

## 26. Backend Validation

Use Laravel Form Requests, reusable Rule objects, and domain validators/services for state/action-specific validation. `06` remains authority.

## 27. Frontend Validation

UX only. No independent client business-rule schema that can silently diverge.

---

# PART I — DATABASE

## 28. MySQL 8.4 LTS

Use InnoDB, FKs where appropriate, `utf8mb4`, indexes for queues/history/search/authorization relationships.

`11` defines exact schema.

## 29. Eloquent / Query Builder

Normal data layer. Parameterized queries only. Production app account least privilege, never MySQL root.

## 30. No External Search Engine MVP

No Elasticsearch/OpenSearch/Meilisearch/Typesense/Scout infrastructure by default.

---

# PART J — SESSION / CACHE / QUEUE

## 31. Database Session

Supports explicit session listing/revocation and max2 policy. Cache is never authorization truth.

## 32. Database Cache

Redis not required. Cache never source of truth for workflow/authorization/audit/malware/PDF validity.

## 33. Database Queue

Required for exact exports, Approved PDF signing pipeline, bulk export, future notifications. Retry-aware/idempotent where appropriate.

## 34. Redis Position

Redis/Horizon/distributed infrastructure not MVP baseline.

---

# PART K — ATTACHMENT / MALWARE

## 35. Filesystem

Laravel Filesystem/Flysystem only. Dev private local; production private S3-compatible target.

## 36. Private by Default

No public asset path authorization.

## 37. ClamAV / clamd

```text
MalwareScanner
→ ClamAvScanner
→ clamd private endpoint
```

Community package MAY be transport glue but not security authority. Only explicit CLEAN passes. clamd private. Virus definitions operationally updated.

---

# PART L — EXACT EXPORT

## 38. Official Template Authority

`NSCMF-Form-3.0.xlsx` remains canonical export template until approved replacement.

Export MUST preserve sheets, styles, merges, row/column dimensions, media, print settings, VML/native checkbox controls.

## 39. No Generic Workbook Rewrite

Do not casually load/re-save via library that may strip unsupported OOXML parts.

## 40. Targeted OOXML Patching

```text
immutable template
→ private copy
→ patch mapped cells/control state only
→ preserve unrelated parts
→ integrity validate
→ XLSX
```

Use controlled ZIP/XML primitives or equivalent.

## 41. Template Mapping

Versioned explicit business-field → sheet/cell/control mapping. Never guess addresses.

## 42. PDF Renderer

Qualified spreadsheet renderer; LibreOffice Headless candidate only after golden fidelity qualification. No HTML/DomPDF approximation fallback.

## 43. Immutable Export Snapshot

At export request time, system creates/binds immutable deterministic logical snapshot including the record/version/workflow iteration/template context needed for output.

Worker MUST use this bound immutable snapshot, not current later record data.

Snapshot representation exact schema belongs to `11`.

## 44. Temporary Export Artifacts

READY binary private for 168h/7d then cleanup. Cleanup never removes source record, audits, workflow/approval history, or issuance metadata.

---

# PART M — PDF SIGNING / VERIFICATION

## 45. `PdfSigningService`

Approved PDF only mandatory signing. Logical signer System/Organization; human Approved By separate.

Private key/cert manually provisioned protected environment, never GitHub/source/ordinary DB/browser. Missing/unusable identity critical readiness failure. No unsigned fallback. No TSA current MVP.

## 46. `PdfVerificationService`

Public no-login PDF-only temp upload, rate limit, ClamAV CLEAN, issuer signature verification, exact SHA-256, issuance/workflow-iteration/currentness resolution, minimum disclosure.

Results:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

---

# PART N — AUDIT

## 47. Custom Authoritative Audit Model

Separate:

```text
Business Audit
Access Audit
Security Audit
Technical Logs
```

Business/Access/Security Audit no age-based purge. Generic activity-log package not authoritative.

Hybrid audit storage details belong to `11`, with requirement that authoritative relationships/business facts remain relational and supplemental JSON must not replace schema.

---

# PART O — TESTING

## 48. Pest 4

Backend tests cover auth, permission/state authorization, ownership rules, Team non-authorization, Spatie boundary, workflow, validation, audit, attachments, exports, signing, public verification.

## 49. Authorization / Package Tests

Must include:

- Spatie `teams=false`;
- Team change does not grant/revoke Review/Approval;
- Reviewer with permission can act on eligible state regardless Team;
- Reviewer without permission cannot act regardless Team;
- Approver equivalent tests;
- no custom reviewer/approver scope dependency;
- direct-user permission UI absent;
- wildcard permissions disabled;
- multi-role permission union;
- Requester ownership restrictions;
- protected Superadmin domain invariants;
- sensitive role/permission session revocation.

## 50. Workflow / Concurrency Tests

All allowed/forbidden transitions; workflow iteration first-submit/same-cycle/reopen rules; Reviewer/Approver races; Draft/Result optimistic conflicts.

## 51. Frontend / E2E

Vitest + Vue Test Utils; Playwright for critical journeys including Team/user/role setup, permission-based Review/Approval, export, security, public validator.

## 52. Test DB

CI integration SHOULD use MySQL 8.4. SQLite not sole target.

## 53. Export Golden Tests

XLSX structure + PDF visual tests; signing/hash/current-vs-superseded verification tests.

---

# PART P — QUALITY / CI / DOCKER

## 54. Quality Gates

Pint, PHPStan/Larastan, ESLint, Prettier, vue-tsc.

## 55. GitHub Actions

Reproducible Composer/npm installs, quality checks, Pest, frontend tests/build, Playwright, export golden tests. Real production signing key never CI fixture.

## 56. Docker Compatibility

Logical runtime may include app/web, MySQL, queue worker, scheduler, ClamAV, qualified renderer. Exact physical topology downstream. No Kubernetes requirement.

---

# PART Q — CAPACITY / LOGGING

## 57. Capacity

~10 expected, 50-user engineering baseline. MySQL + DB queue/session/cache is sufficient unless evidence says otherwise.

## 58. No Premature Infrastructure

No Kubernetes, microservices, Kafka/RabbitMQ, Redis cluster, external search, API gateway, separate Vue deployment, WebSockets, generic BPM by default.

## 59. Technical Logging

Laravel technical logs remain separate from authoritative audits. Never log passwords/private key/secrets/raw sensitive payloads.

---

# PART R — IMPLEMENTATION GUARDRAILS

## 60. Developer / AI MUST NOT

1. switch Vue/architecture without spec change;
2. rely on frontend authorization;
3. treat Spatie permission result as bypass of state/domain/security rules;
4. duplicate Spatie package-owned RBAC tables;
5. enable Spatie Teams;
6. use business Team as permission scope;
7. create Reviewer/Approval scope tables or logic;
8. call `setPermissionsTeamId()`;
9. expose direct permission-to-user assignment as normal MVP;
10. enable wildcard permissions;
11. create `session.login`/`session.logout` permission rows;
12. make generic Superadmin bypass invalid domain invariants;
13. enable registration/SSO/MFA without approved change;
14. impose password composition;
15. use SQLite as only integration DB;
16. add Redis/WebSocket/search without evidence;
17. use HTML as authoritative export template;
18. generic-rewrite official workbook if controls may be stripped;
19. replace native controls;
20. claim renderer exact without golden qualification;
21. make generic activity log authoritative;
22. postpone tests;
23. expose private attachments;
24. treat ClamAV failure as CLEAN;
25. age-delete authoritative audits;
26. put production signing key in source/DB/browser;
27. deliver unsigned Approved PDF after signing failure;
28. claim TSA current MVP;
29. make public validator a public record portal;
30. export later mutable data instead of bound immutable snapshot.

---

# PART S — DEPENDENCY CATEGORIES

## 61. Composer

```text
laravel/framework ^13
spatie/laravel-permission ^8
pestphp/pest ^4 --dev
larastan/larastan --dev
Laravel Pint / Laravel-provided tooling --dev
```

ClamAV client and PDF signing library may be chosen after compatibility review because adapters/security semantics are authoritative.

## 62. npm

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

# PART T — ACCEPTANCE / NEXT

## 63. Authorization Acceptance

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

## 64. Runtime / Data / Export / Security Acceptance

All locked Laravel/PHP/Vue/Inertia/MySQL/session/queue/storage/ClamAV/export/signing/verification/audit/testing decisions above remain required.

## 65. Deferred

- exact ERD/table/index definitions beyond package-owned tables;
- exact Team master data;
- API payloads;
- container topology;
- production object storage;
- technical-log retention/monitoring;
- notification provider;
- official numbering SOP;
- certificate operational format/path/provider;
- key rotation ceremony;
- backup/DR;
- performance/SLA.

## 66. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| Permission/Spatie/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| **Technology** | **`08_Tech_Stack_Specification.md`** |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| ERD | `11_ERD_Database_Schema.md` |

## 67. Next Document

Next fixed-order document:

**`11_ERD_Database_Schema.md`**.