# Testing Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-TEST-016  
> **Document Order:** 16 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `15_Coding_Rules_AGENTS.md`  
> **Integrates:** `15A_Pre_Testing_Specification_Synchronization.md`  
> **Canonical Application / Test Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02  

---

## 1. Purpose

Dokumen ini adalah **source of truth authoritative untuk testing strategy, test layers, TDD verification, coverage, integration evidence, browser/E2E scope, test data, deterministic execution, CI testing gates, dan domain-specific verification** NSCMF Digital Form & Workflow System.

Dokumen ini menerjemahkan requirement dari `01–15` menjadi bukti yang harus dapat dijalankan dan direview.

Tujuan utamanya:

1. membuktikan implementation sesuai specification, bukan sekadar membuat CI hijau;
2. menjaga Test-Driven Development (TDD) tetap nyata dan dapat diaudit;
3. membuktikan business rules, authorization, workflow, security, persistence, concurrency, upload, export, signing, dan public verification pada level yang tepat;
4. mencegah mock/fake menjadi satu-satunya bukti untuk behavior yang bergantung pada real infrastructure;
5. menjaga test deterministic dan membuat flaky behavior terlihat;
6. menetapkan minimum global line coverage 80% tanpa menjadikan coverage percentage pengganti kualitas test;
7. memastikan Pull Request tidak eligible untuk human merge ketika required testing gate gagal;
8. tetap memisahkan testing authority dari seed/dummy data (`17`), Definition of Done (`18`), implementation plan (`19`), dan physical deployment (`20`).

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — default kuat; penyimpangan perlu alasan yang dapat direview.
- **MAY** — diperbolehkan.
- **AUTHORITATIVE** — source of truth untuk concern ini.
- **LOCKED** — keputusan sudah dikonfirmasi dan tidak boleh diubah diam-diam.
- **TBD** — belum diputuskan; tidak boleh ditebak oleh developer/agent.
- **REAL INTEGRATION** — test yang mengeksekusi implementation/runtime boundary nyata yang sedang dibuktikan, bukan fake yang selalu mengembalikan hasil sukses.
- **CRITICAL BEHAVIOR** — behavior yang bila salah dapat mengubah authorization, workflow, security, integrity, auditability, financial/operational record, attachment safety, atau document authenticity.

---

# PART A — AUTHORITY / TESTING PRINCIPLES

## 3. Specification Drives Tests

Tests MUST derive expected behavior from authoritative project documentation.

Canonical direction:

```text
project specification
→ requirement-derived test
→ implementation
→ verification
```

Forbidden direction:

```text
implementation
→ inspect what code currently does
→ write test that merely agrees with it
```

A passing test does not authorize behavior that contradicts an upstream specification.

## 4. Testing Authority by Concern

Testing expectations must reference the authority that owns the behavior:

| Tested concern | Source authority |
|---|---|
| Product scope | `01_PRD.md` |
| Business behavior | `02_Business_Rules.md` |
| User journeys | `03_User_Flow.md` |
| RBAC / Team boundary | `04_RBAC_Permission_Matrix.md` |
| State transitions / iterations | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI behavior | `07_UI_UX_Specification.md` |
| Test/tool stack baseline | `08_Tech_Stack_Specification.md` |
| Architecture boundary | `09_System_Architecture.md`, `12A`, `13` |
| Security | `10_Security_Rules.md` |
| Relational schema | `11_ERD_Database_Schema.md`, `11A` |
| HTTP contract | `12_API_Contract.md` |
| Physical test structure | `13_Project_Structure.md` |
| CI/runtime integration | `14_Environment_Specification.md` |
| Coding/TDD conduct | `15_Coding_Rules_AGENTS.md` |
| **Detailed testing strategy** | **`16_Testing_Specification.md`** |

`15A_Pre_Testing_Specification_Synchronization.md` is incorporated into this document. Where `15A` and `16` express the same testing rule, `16` is now the fixed-order testing authority.

## 5. Risk-Based Depth, Not Risk-Based Omission

Not every line needs the same test type, but critical behavior MUST receive stronger evidence.

Examples:

- a pure formatter/helper may be proven by focused unit tests;
- permission/state mutation requires positive + negative feature/integration proof;
- row locking/concurrency requires real MySQL integration;
- ClamAV behavior requires a real ClamAV path;
- signing/verification requires real cryptography with non-production identity;
- exact spreadsheet/PDF fidelity requires real template/renderer qualification evidence.

Risk-based testing decides **how deeply** a behavior is tested, not whether a locked critical requirement may be left untested.

---

# PART B — MANDATORY TDD WORKFLOW

## 6. TDD Is Mandatory

New behavior, bug fixes, and behavior-changing implementation MUST follow:

```text
approved requirement
→ write/update automated test FIRST
→ execute targeted test
→ meaningful RED
→ commit RED test
→ minimum correct production implementation
→ execute targeted test
→ GREEN
→ commit implementation
→ relevant regression suite
→ refactor only while GREEN
```

## 7. Separate RED Commit — LOCKED

For feature, bug fix, or behavior change where RED applies, the requirement-derived failing test MUST be committed before the production implementation commit.

Typical sequence:

```text
test: cover <required behavior>
feat: implement <required behavior>
```

or:

```text
test: reproduce <bug>
fix: correct <bug>
```

The RED commit MUST NOT already contain the production behavior that makes the new test pass.

## 8. Meaningful RED

RED is valid only when failure is caused by the required behavior being absent or incorrect.

Invalid RED includes:

- intentional syntax error;
- broken import/path unrelated to behavior;
- intentionally invalid fixture;
- test bootstrap crash before the behavior executes;
- impossible assertion created merely to force failure;
- environment misconfiguration presented as behavioral RED.

The failure reason SHOULD be understandable from the test output and requirement.

## 9. Bug-Fix Regression Test

A bug fix MUST normally begin with an automated test reproducing the bug:

```text
current behavior reproduces bug → RED
fix implementation
correct expected behavior → GREEN
retain regression test permanently
```

## 10. Pure Refactor Exception

Pure behavior-preserving refactor does not require an artificial RED test/commit when adequate existing tests already prove behavior.

Required flow:

```text
relevant suite GREEN before refactor
→ refactor
→ same relevant suite GREEN after refactor
→ static/architecture gates remain GREEN
```

If existing coverage is insufficient for safe refactoring, characterization/behavior tests SHOULD be added first.

## 11. TDD PR Evidence

For applicable PRs, description MUST contain truthful evidence:

```text
Specification / requirement reference
RED commit SHA
RED command/test target
RED failure summary
GREEN command/test target
GREEN result
Relevant regression-suite result
```

Pure refactor MAY state:

```text
TDD RED: N/A — behavior-preserving refactor
```

and show before/after GREEN evidence.

Evidence MUST reflect actual execution and repository history. History MUST NOT be rewritten after implementation merely to manufacture TDD chronology.

---

# PART C — TEST LAYERS / TEST PYRAMID

## 12. Canonical Test Structure

Physical structure remains aligned with `13_Project_Structure.md`:

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

Frontend test files MAY live adjacent to frontend modules or in a conventional frontend test location as supported by the Vue/Vitest setup, but their ownership MUST remain clear and must not create a second business-rule source of truth.

## 13. Unit Tests

Unit tests prove focused logic with minimal infrastructure.

Good unit-test targets include:

- domain enums/rules;
- deterministic calculators/normalizers;
- pure validation helpers where not already fully represented by Form Request behavior;
- Service decision logic where collaborators can be safely faked without losing the behavior being proven;
- frontend composables/component logic that does not require browser/server integration.

Unit tests SHOULD be fast and isolated.

Unit tests MUST NOT be used as the only evidence for MySQL locking, real malware scanning, filesystem persistence, queue worker semantics, renderer fidelity, cryptographic signing, or browser journeys.

## 14. Feature / Application Tests

Feature tests prove application behavior through Laravel HTTP/application boundaries or equivalent application-level execution.

They SHOULD cover:

- route/controller/Form Request behavior;
- authorization and state gates;
- Inertia/JSON/redirect semantics;
- business workflow orchestration;
- audit creation;
- session/auth behavior;
- admin settings behavior;
- attachment/export request lifecycle where real infrastructure is not the specific subject of the test.

When feature behavior depends on persistence semantics, CI MUST execute it against MySQL 8.4 rather than relying solely on SQLite.

## 15. Integration Tests

Integration tests prove collaboration with real technical boundaries.

Mandatory categories include applicable:

- repositories against MySQL 8.4;
- migration/schema constraints;
- database transactions/locking/concurrency;
- private filesystem semantics;
- database queue semantics;
- ClamAV;
- spreadsheet/OOXML export pipeline;
- qualified renderer once selected;
- cryptographic PDF signing/verification with non-production identity.

## 16. Architecture Tests

Architecture tests MUST protect structural rules that are inexpensive to verify automatically.

They SHOULD detect at least:

- Controller direct Eloquent/DB business queries;
- Controller direct Repository use for normal business flow;
- Service direct Eloquent/Query Builder business queries;
- Job/Command direct Model/DB/Repository business persistence;
- repository-owned workflow/permission decisions;
- reintroduced Actions orchestration layer;
- generic `BaseRepository` drift;
- DTO-per-endpoint/model architecture introduced without approval;
- Team authorization logic reappearing in Review/Approval;
- forbidden dependency direction where practical.

Architecture enforcement MAY use approved Pest/project tooling already in the stack. A new third-party architecture package requires dependency approval under `15`.

## 17. Frontend Component / Vitest Tests

Vitest + Vue Test Utils SHOULD prove:

- conditional rendering from server-provided authorized state;
- wizard/form section behavior;
- client-side presentation/validation assistance;
- resumable upload reconciliation UI;
- technical-log settings UI behavior;
- error/conflict presentation;
- accessibility-relevant component state where practical.

Frontend tests MUST NOT treat client-side state as authorization authority.

## 18. Browser / Playwright Tests

Playwright proves critical user journeys through the deployed application surface.

Current automated browser matrix is **Chromium only**.

Firefox/WebKit are not mandatory current MVP certification targets.

Browser tests SHOULD stay focused on critical journeys rather than duplicating every unit/feature assertion through the UI.

---

# PART D — COVERAGE POLICY

## 19. Minimum Global Line Coverage — LOCKED

Minimum line coverage:

```text
80%
```

A required coverage report below 80% fails the applicable CI gate.

## 20. Polyglot Coverage Interpretation

NSCMF contains PHP backend and TypeScript/Vue frontend code. A high result in one stack MUST NOT hide low coverage in the other.

Operational rule:

```text
PHP project-owned application coverage >= 80%
frontend instrumented project-owned application coverage >= 80%
```

Do not calculate a weighted cross-language average that allows one stack to compensate for the other.

If enabling frontend coverage requires an additional npm coverage-provider package not already approved, dependency approval under `15` is required before adding it. Until the approved provider exists, the project MUST NOT falsely report the frontend 80% gate as active/passing.

## 21. Backend Coverage Scope

PHP line coverage SHOULD focus on project-owned executable application code, especially `app/`.

Normal exclusions MAY include:

- `vendor/`;
- framework/bootstrap internals;
- generated cache/build files;
- non-executable documentation;
- third-party package source;
- artifacts that are not project-maintained application behavior.

Exclusions MUST NOT be expanded merely to keep the number above 80%.

Migration correctness is primarily proven through schema/integration tests rather than by forcing migration files into line-coverage arithmetic.

## 22. Frontend Coverage Scope

Frontend line coverage SHOULD focus on project-owned executable code under `resources/js`, including domain-specific features/composables/components where behavior exists.

Normal exclusions MAY include:

- third-party dependencies;
- generated declarations/assets;
- purely declarative type-only files with no executable lines;
- build output.

Do not exclude difficult business-facing frontend modules merely to preserve the threshold.

## 23. Coverage Is Not Behavioral Completeness

80% does not replace:

- permission negative tests;
- workflow forbidden-transition tests;
- stale/concurrency tests;
- malware fail-closed tests;
- signing-verification tests;
- audit-retention tests;
- public-verifier privacy tests;
- exact export fidelity tests.

Critical behavior may require tests even when the touched lines are already covered indirectly.

---

# PART E — TEST DATA / FIXTURES / ISOLATION

## 24. Synthetic Test Data Only

Automated tests MUST NOT depend on copied production personal/business records, production credentials, production signing keys, or production private files.

Use synthetic test data.

`17_Seed_Dummy_Data_Specification.md` owns reusable development/demo seed datasets. `16` does not invent Team master data or production-like organization identities.

## 25. Factories

Factories are test/development builders, not business master-data authority.

Factories SHOULD:

- create minimal valid objects by default;
- allow explicit state overrides relevant to the test;
- avoid hidden global side effects;
- avoid assigning permissions/roles/states that make tests accidentally pass.

A test SHOULD explicitly arrange critical permission/state conditions rather than relying on broad all-powerful factory defaults.

## 26. Fixtures

Fixtures SHOULD be minimal, version-controlled where appropriate, and purpose-specific.

Fixtures MUST NOT contain:

- production secrets;
- real user passwords;
- production private signing material;
- uncontrolled personal data;
- files whose provenance/license prevents repository use.

## 27. Export Fixtures

`tests/Fixtures/Export/` MAY contain controlled expected artifacts/mapping fixtures needed for verification.

The official production XLSX template remains governed by its immutable template registry/version/SHA rules. A test fixture MUST NOT silently become the production template source of truth.

Qualification tests for exact export fidelity MUST use the exact registered template version being qualified.

## 28. Malware Test Fixture

Real ClamAV integration SHOULD use a harmless standard anti-malware test fixture recognized by ClamAV where appropriate, rather than real malicious software.

The fixture MUST be isolated from normal application storage and must never be promoted to a CLEAN attachment.

## 29. Signing Test Identity

Signing integration uses a dedicated non-production identity.

Allowed directions:

- ephemeral test certificate/key generated for the CI job; or
- dedicated non-production test fixture/secret approved for CI.

Production private key/passphrase MUST NEVER enter CI or test fixtures.

## 30. Test Independence

Tests MUST NOT depend on execution order.

Each test/suite must arrange required state explicitly and clean/isolate its own disposable data.

A test MUST NOT pass only because a previous test created a record, role, file, cache entry, or session.

---

# PART F — DATABASE / MYSQL TESTING

## 31. MySQL 8.4 Is Mandatory Integration Authority

Database integration tests MUST use real MySQL 8.4.

SQLite MAY be used only for narrowly isolated tests where MySQL-specific behavior is irrelevant.

SQLite MUST NOT be the sole evidence for:

- migrations/schema;
- foreign keys;
- unique constraints/indexes;
- transaction behavior;
- row locks;
- concurrency;
- monthly request-number sequence;
- repository behavior dependent on MySQL semantics.

## 32. Migration Tests

Migration/schema tests MUST verify the schema materially matches `11`/`11A`, including critical:

- columns/types/nullability;
- foreign keys;
- uniqueness;
- indexes needed by locked integrity behavior;
- typed `system_settings` constraints/singleton behavior;
- resumable-upload persistence additions.

Shared/applied historical migrations remain immutable under `15`; tests MUST NOT encourage rewriting migration history.

## 33. Transaction Tests

Service-owned transaction semantics SHOULD be verified where atomicity matters.

Tests SHOULD prove, as applicable:

- state mutation + required Business Audit commit together;
- failed operation does not partially commit authoritative state;
- after-commit job dispatch occurs only after successful commit;
- long external I/O is not held inside workflow lock transaction.

## 34. Concurrency Tests

Concurrency tests MUST use real database semantics and separate connections/processes where needed; an in-memory fake lock is not sufficient.

Mandatory scenarios include applicable:

- two eligible Approvers attempt final action concurrently — first valid commit wins, stale second action fails safely;
- Reviewer/Approver conflicting state action race;
- optimistic `record_version` stale Draft/Result update conflict;
- global monthly Request No generation remains unique under concurrency;
- same resumable chunk index race/idempotency semantics;
- duplicated finalize/export worker execution does not corrupt authoritative state where idempotency is required.

Tests MUST NOT assume deterministic thread/process scheduling; assertions should target allowed outcomes and invariants.

## 35. Disposable Database Safety

Automated test DB must be isolated and disposable.

Destructive reset is allowed only against the explicitly configured isolated test database under the disposable-test exception from `15`.

Test bootstrap MUST include safeguards so production/staging/shared databases cannot be targeted accidentally.

---

# PART G — AUTHENTICATION / SESSION / RBAC TESTING

## 36. Authentication Tests

Tests MUST preserve locked authentication policy, including:

- login by username/password;
- password minimum exactly 6 characters;
- no mandatory composition rule;
- no MFA/OTP/OAuth requirement;
- no self-registration;
- no self-service forgot-password flow.

A security test MUST NOT introduce stricter password expectations than the authoritative rule.

## 37. Temporary Password Tests

Admin create/reset credential tests MUST prove:

- server generates temporary password;
- stored value is hashed, never plaintext;
- plaintext is returned only transiently to the acting admin in the one-time response lifecycle;
- no later retrieval endpoint exists;
- target user is forced to change it;
- acting admin requires the locked re-auth condition;
- target sessions are revoked as required;
- plaintext does not appear in logs/audits/cache/history.

## 38. Session Tests

Tests MUST cover:

```text
idle timeout = 30 minutes
absolute lifetime = 8 hours
max active sessions = 2
third valid login revokes oldest active session
sensitive re-auth proof = 15 minutes
```

Authorization/access changes that are specified to revoke sessions MUST be tested.

Team-only metadata change MUST NOT be treated as an access change requiring session revocation.

## 39. RBAC Tests

Must include positive and negative cases for:

- Permission → Role → User model;
- multi-role permission union;
- Spatie Teams disabled;
- wildcard permissions disabled;
- Team does not grant Review/Approval access;
- Requester ownership boundaries;
- Reviewer shared Team-neutral access according to permission;
- Approver shared Team-neutral access according to permission;
- protected Superadmin invariants;
- no generic universal business/security bypass;
- normal direct-user permission administration is not silently introduced.

Authorization tests MUST verify denied actors cannot produce side effects or authoritative audit/state changes that belong only to successful operations.

---

# PART H — WORKFLOW / BUSINESS STATE TESTING

## 40. Canonical State Set

Tests MUST assert the NSCMF business state set remains exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Archive, attachment transport, malware, export, and verification statuses MUST NOT be treated as additional NSCMF business states.

## 41. Transition Matrix

Automated tests MUST prove every allowed transition and representative forbidden transitions, including:

```text
DRAFT → CANCELLED
DRAFT → PENDING_REVIEW
PENDING_REVIEW → REVISION_REQUIRED
PENDING_REVIEW → REJECTED
PENDING_REVIEW → PENDING_APPROVAL
REVISION_REQUIRED → PENDING_REVIEW
PENDING_APPROVAL → PENDING_REVIEW
PENDING_APPROVAL → REVISION_REQUIRED
PENDING_APPROVAL → REJECTED
PENDING_APPROVAL → APPROVED
```

CANCELLED remains terminal.

## 42. Approval Semantics

Tests MUST prove:

- Approver assignment is non-exclusive;
- eligible Approvers can see/take action according to permission;
- exactly one successful eligible final approval is sufficient;
- final `Approved By` is the human actor who commits approval;
- human Approver is distinct from System/Organization cryptographic signer;
- Emergency Change has no approval bypass.

## 43. Reviewer Semantics

Tests MUST prove:

- multiple Reviewers may interact with the same record when authorized;
- `Reviewed By` reflects the successful Forward actor;
- return-to-revision does not create an exclusive Reviewer ownership model;
- Team does not restrict the Reviewer pool.

## 44. Workflow Iteration

Tests MUST cover:

- first successful Submit creates iteration 1;
- Return/Revision/Resubmit stays within the same iteration;
- Approver return stays within the same iteration;
- Reopen from APPROVED/REJECTED increments iteration;
- CANCELLED cannot reopen;
- old valid Approved PDF may become `VALID_SUPERSEDED` after later authoritative iteration.

## 45. Reopen / Archive

Tests MUST cover:

- Reopen allowed only from APPROVED/REJECTED when all authorization/reason/archive prerequisites pass;
- destination is only `REVISION_REQUIRED` or `PENDING_REVIEW` according to action contract;
- archived Approved/Rejected must be unarchived before Reopen;
- archive eligible only for APPROVED/REJECTED/CANCELLED under the approved permission/reason rule;
- archive flag does not create a new business state;
- no hard delete is introduced.

---

# PART I — VALIDATION / API CONTRACT TESTING

## 46. Draft vs Gate Validation

Tests MUST distinguish:

- Draft/Revision may be incomplete;
- Submit/Forward/Approve/other actions enforce their gate-specific complete validation;
- warning is not automatically an error;
- security requirements never degrade into warning-only behavior.

## 47. Change Result Validation

Tests MUST prove locked Result rules, including:

- maximum 5;
- zero Result allowed at first Submit where specified;
- before Reviewer Forward at least one complete Result is required;
- every started Result must be complete;
- Result-only update in `PENDING_REVIEW` follows owner/permission rules;
- Result does not create a business state.

## 48. Service Impact Validation

Change Service Impact tests MUST cover:

```text
NOC15
NOC23
NOC361
REGIONAL
POP
CUSTOMER
OTHER
```

At Submit at least one is required and `OTHER` requires its description.

## 49. Attachment Validation

Tests MUST cover locked file constraints:

- optional attachment behavior;
- max active 10 per record;
- max final size 20 MB;
- zero-byte rejection;
- allowed extension/type set;
- denied executable/script/macro formats;
- filename is metadata, not storage path;
- client MIME/extension/hash is not final authority.

## 50. HTTP / JSON Contract

Contract tests SHOULD verify relevant `12` semantics:

- route and HTTP method;
- success envelope `{data, meta}` where JSON applies;
- error envelope `{code, message, errors, context}`;
- correct 2xx/3xx/4xx/5xx behavior;
- failed mutation is never represented as false HTTP 200 success;
- stale/version conflict returns the specified conflict semantics;
- internal web uses session + CSRF, not JWT/Bearer baseline.

Machine-readable error codes SHOULD remain stable and be asserted where part of the contract.

---

# PART J — RESUMABLE ATTACHMENT / MALWARE TESTING

## 51. Resumable Upload Geometry

Tests MUST enforce:

```text
chunk size = 5 MiB / 5,242,880 bytes
chunk numbering = 1-based
max final file = 20 MB
unfinished expiry = 24h since last newly accepted progress
```

## 52. Resume / Idempotency Tests

Must cover:

- initiate upload;
- status/missing-chunk reconciliation;
- upload missing chunks out of repeated client sessions as allowed by contract;
- acknowledged progress survives ordinary application process restart when DB/storage remain healthy;
- same index + byte-identical replay is accepted as duplicate/idempotent;
- duplicate replay does not create duplicate progress;
- duplicate replay does **not** refresh inactivity expiry indefinitely;
- same index + different bytes returns conflict;
- client fingerprint/hash is only a hint;
- server assembled SHA-256 is authoritative.

## 53. Finalization Tests

Finalization integration MUST prove:

```text
assemble
→ authoritative server SHA-256
→ server type validation
→ whole-file ClamAV
→ explicit CLEAN
→ promotion to usable final attachment
```

Chunk-level scans MUST NOT be accepted as substitute for whole-file final scan.

## 54. Malware Outcomes

Tests MUST distinguish:

- CLEAN;
- INFECTED;
- scanner FAILED/error;
- timeout/unavailable.

Only explicit CLEAN becomes usable.

Scanner timeout/unavailability/error must fail closed.

Real ClamAV integration is mandatory in CI; fake scanner remains allowed only for isolated tests.

## 55. Private Storage Tests

Integration tests MUST verify:

- final/chunk/assembly objects are not web-public;
- original filename cannot escape private root;
- internal opaque paths/names are used safely;
- acknowledged chunks use the persistent/private storage contract;
- public-validator temp files remain separate from normal attachments;
- cleanup never deletes a valid final attachment outside its eligible lifecycle.

---

# PART K — EXPORT / XLSX / PDF / SIGNING TESTING

## 56. Export Snapshot Tests

Tests MUST prove export request binds immutable context before async generation, including applicable:

- NSCMF record version;
- workflow iteration;
- template version;
- deterministic logical snapshot.

Worker MUST use bound snapshot and MUST NOT silently reread later mutable business state as export source.

## 57. XLSX OOXML Tests

The export suite MUST verify targeted OOXML behavior rather than only checking that a file opens.

Tests SHOULD prove:

- expected mapped cells/values are changed;
- expected checkbox/control state is updated;
- unrelated package ZIP members remain preserved;
- control/VML relationships required by the official workbook survive;
- workbook structure remains valid;
- source template binary is not overwritten;
- a new template version is not silently created by export runtime.

Golden mapping updates MUST be requirement/template-version driven, never blindly regenerated to accept changed output.

## 58. Renderer Qualification / Golden Tests

Once a renderer is selected for qualification, tests MUST use the real candidate/qualified renderer with required fonts/environment.

Qualification evidence SHOULD compare rendered output against approved expected fidelity criteria such as page structure/layout and mapped content.

Any visual/pixel tolerance required by the qualification process must be explicitly recorded when qualification occurs; an individual agent MUST NOT invent or loosen tolerance merely to make a failing golden test pass.

Mock renderer success cannot qualify production fidelity.

## 59. PDF Signing Tests

Approved-PDF flow MUST test real cryptographic operations using non-production identity:

- PDF is cryptographically signed;
- signature verifies with corresponding public certificate/chain behavior;
- final signed bytes/hash are the issuance evidence;
- human `Approved By` remains distinct from signer identity;
- signing failure makes export FAILED while record remains APPROVED;
- no unsigned Approved fallback exists;
- production key/passphrase is absent from CI/logs/DB/browser/source.

## 60. READY Retention / Cleanup Tests

Tests MUST prove:

- READY export binary lifecycle is 168 hours / 7 days;
- expiry cleanup removes eligible generated binary;
- cleanup does not delete NSCMF source record, workflow history, audit history, PDF issuance metadata, or verification evidence.

---

# PART L — PUBLIC PDF VERIFICATION TESTING

## 61. Public Surface

Tests MUST prove `/ispdfvalid` verification remains public/no-login but narrowly scoped.

No public record-browsing API may emerge from validator implementation.

## 62. Validator Input Security

Tests MUST cover:

- PDF only;
- maximum 20 MB;
- private temporary upload;
- rate limiting is enabled;
- real ClamAV CLEAN gate;
- malformed/modified/non-issued PDF handling;
- cleanup after success and failure;
- no private filesystem path disclosure.

Exact numeric rate-limit buckets remain TBD until authoritative tuning is approved; tests MUST prove configured limiting behavior without inventing the production numeric bucket.

## 63. Validator Result Matrix

Tests MUST prove:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

and must verify currentness is resolved from authoritative issuance/workflow iteration state rather than client metadata.

## 64. Minimum Disclosure

Public response tests MUST ensure disclosure is limited to the approved minimum:

- Request No;
- family;
- issued_at;
- System/Organization issuer.

Must not disclose actor details, Team, form body, attachments, timeline, audit data, storage path/key, or signing private material.

---

# PART M — AUDIT / TECHNICAL LOG TESTING

## 65. Business Audit

Tests SHOULD verify required business mutations append correct audit evidence within the required transaction semantics.

Where a mutation fails/rolls back, tests must verify authoritative audit/state consistency according to the use-case contract.

## 66. Access Audit

Tests SHOULD verify access evidence remains separate from Business Timeline and does not become mutable business data.

## 67. Security Audit

Security-sensitive tests MUST verify appropriate Security Audit evidence without secret plaintext for applicable:

- authentication/credential changes;
- role/permission changes;
- session revocation;
- malware/security events;
- signing/security failures;
- protected Core Setting changes.

## 68. No Age Purge

Tests MUST ensure Business Audit, Access Audit, and Security Audit have no age-based purge path.

No scheduler/settings test may allow Technical Log cleanup to delete authoritative audits.

## 69. Technical Log Settings

Tests MUST cover:

```text
default auto cleanup = ON
default retention = 30 DAY
Protected Superadmin may set positive DAY/MONTH or OFF
no fixed product maximum
```

Mutation requires the locked permission/protected-Superadmin/re-auth conditions.

## 70. Technical Log Cleanup

Tests MUST prove:

- OFF → no age-based Technical Log deletion;
- ON → cutoff uses current positive value/unit in `Asia/Jakarta`;
- cleanup affects eligible Technical Logs only;
- authoritative audits/records/workflow/issuance are never deleted;
- 30 DAY is default, not immutable hard-coded policy.

---

# PART N — FRONTEND / INERTIA / BROWSER TESTING

## 71. Server Authority in Frontend Tests

Frontend tests MUST not assert that hidden/disabled UI alone protects an action.

Critical authorization is proven server-side even when UI also hides unavailable controls.

## 72. Form / Wizard Tests

Component/feature tests SHOULD verify:

- autosave/draft presentation behavior where implemented;
- draft/revision incomplete-input UX;
- action-gate validation messages;
- family/subtype-dependent fields;
- Service Impact multi-select/OTHER presentation;
- Change Result limits/completeness presentation;
- record conflict/stale-state error presentation.

The expected business rules remain sourced from upstream docs, not duplicated as an independent frontend rule engine.

## 73. Resumable Upload UI Tests

Frontend tests SHOULD prove:

- browser reconciles server accepted/missing chunks;
- interrupted client session can resume based on server state;
- duplicate/idempotent responses are handled safely;
- upload transport completion is not displayed as usable CLEAN attachment before server security completion;
- server errors/conflicts are surfaced rather than overwritten locally.

## 74. Critical Playwright Journeys

Current PR E2E suite MUST run Chromium critical journeys.

At minimum, as implementation becomes available, critical journeys SHOULD include representative:

1. login and authenticated session entry;
2. Requester creates/saves/submits NSCMF;
3. Reviewer reviews/returns/forwards;
4. Requester revises/resubmits;
5. Approver approves and sees correct final state;
6. forbidden actor cannot perform restricted workflow action;
7. resumable attachment interruption/resume + CLEAN completion path;
8. export request/READY download path where infrastructure is available;
9. public PDF validation current/superseded/invalid representative path;
10. protected administration setting change with re-auth.

A browser scenario may be split if setup cost or infrastructure boundary makes a smaller critical journey more deterministic; coverage of the required user outcome must remain.

## 75. Browser Failure Artifacts

On Playwright failure, CI MAY automatically retain diagnostic:

- trace;
- screenshot;
- video;
- browser console/network logs where safe.

Artifacts MUST NOT leak secrets/private uploaded content unnecessarily.

Artifact collection does not convert FAIL into PASS.

---

# PART O — TIME / RANDOMNESS / DETERMINISM

## 76. Canonical Timezone

Automated tests run application/business time in:

```text
Asia/Jakarta
```

MySQL application connection session timezone in CI remains:

```text
+07:00
```

Tests MUST NOT accidentally depend on CI host UTC/local timezone.

## 77. Time-Dependent Tests

Use controlled/frozen application time when proving:

- session idle/absolute expiry;
- 15-minute re-auth proof;
- 24-hour upload inactivity expiry;
- 168-hour export retention;
- Technical Log retention cutoff;
- monthly Request No boundary;
- PDF issuance/currentness timestamps.

Avoid real sleep/wall-clock waits when deterministic time control can prove the rule.

## 78. Randomness

Randomized test data SHOULD be reproducible when failure diagnosis depends on it.

Tests MUST NOT rely on uncontrolled randomness for expected outcomes.

Security randomness of production credential/token generation may be tested for shape/uniqueness/handling without asserting a predictable production value.

## 79. External Time / Network

Tests MUST NOT depend on public internet availability for core deterministic verification.

Real integrations required by this project should be provisioned inside the controlled CI/test environment rather than depending on arbitrary public services.

---

# PART P — MOCK / FAKE / SPY POLICY

## 80. Use Doubles Deliberately

A mock/fake/spy is appropriate when the test is proving the caller's behavior and the real boundary is not the subject of that test.

Examples:

- fake queue to prove intended dispatch in a focused Service test;
- fake `MalwareScanner` to prove Service response to `INFECTED` in a unit test;
- fake signer to prove orchestration failure handling.

## 81. Doubles Must Not Replace Required Integration

The same capability still needs real integration evidence where required:

```text
MySQL        → real MySQL 8.4 integration
ClamAV       → real ClamAV integration
signing      → real non-production cryptographic operation
renderer     → real qualified renderer after qualification
storage      → real filesystem semantics where path/persistence matters
queue        → real DB queue semantics where worker/retry/idempotency matters
```

## 82. Mock Boundaries, Not the System Under Test

Do not mock the exact method/behavior whose correctness the test claims to prove.

A test that replaces all meaningful behavior with predetermined mock responses is not valid behavioral evidence.

---

# PART Q — FLAKY TEST / RETRY POLICY

## 83. No Automatic Retry-As-Pass — LOCKED

A required failing test remains a failed gate.

Forbidden pattern:

```text
attempt 1 FAIL
→ automatic retry
attempt 2 PASS
→ overall accepted PASS
```

Required pattern:

```text
FAIL
→ diagnose root cause
→ intentional corrective change
→ fresh test/CI execution
```

## 84. Flaky Test Is a Defect

A test that passes/fails intermittently without an intentional code/environment change is flaky.

Flakiness MUST be investigated; it MUST NOT be hidden behind retry counts.

Typical root causes to inspect include:

- race condition;
- improper DB isolation;
- uncontrolled clock/randomness;
- async wait bug;
- filesystem collision;
- shared cache/session state;
- unstable selector;
- external-service readiness;
- test-order dependency.

## 85. Diagnostic Collection Is Allowed

Automatic trace/log/screenshot/video/failure dump collection is allowed.

It does not change FAIL status.

## 86. Fresh Rerun After Correction

After an actual corrective change, developer/agent MAY run the test/CI again. This is a new verification execution, not retry-as-pass.

If CI infrastructure itself was repaired without source-code change, a fresh run is also valid, but the original failure remains part of diagnosis and must not be rewritten as if it never occurred.

---

# PART R — STATIC / QUALITY GATES AS TEST COMPLEMENTS

## 87. PHP Gates

Required PHP quality gates include:

```text
Laravel Pint check
PHPStan/Larastan level max
zero-baseline policy
Pest relevant suites
```

Static analysis does not replace runtime behavior tests.

## 88. TypeScript / Frontend Gates

Required frontend gates include:

```text
ESLint
Prettier check
vue-tsc / TypeScript strict
Vitest
Playwright Chromium critical journeys
```

Type checking does not replace user-behavior tests.

## 89. Dependency / Build Reproducibility

CI MUST install Composer/npm dependencies according to committed lockfiles and run required build/bootstrap validation using approved dependencies.

A failing test is not permission to update unrelated dependency versions.

---

# PART S — PULL REQUEST / CI GATE MATRIX

## 90. Every Implementation Pull Request

Every implementation PR MUST run applicable required deterministic gates before human merge eligibility.

Baseline:

```text
PHP formatting
PHPStan/Larastan max
Pest backend tests
PHP 80% line coverage
frontend lint/format/type checks
Vitest frontend tests
frontend 80% line coverage once approved coverage provider is configured
MySQL 8.4 integration
Playwright Chromium critical journeys
real ClamAV integration
real non-production signing/verification integration
real renderer/golden integration once renderer is approved/qualified
reproducible application build
```

Any required gate failure blocks merge eligibility.

## 91. Parallelization

Independent CI jobs MAY run in parallel to reduce runtime.

Parallelization MUST NOT weaken prerequisites or cause shared mutable test state that makes results nondeterministic.

## 92. Documentation-Only Changes

A documentation-only PR with no executable/config/dependency/migration/runtime behavior change MAY omit application runtime suites if CI/repository policy can prove the change is truly documentation-only.

This exception does not apply when documentation change also modifies executable configuration, dependency manifests/lockfiles, workflow files, migrations, generated code, or test behavior.

## 93. Infrastructure-Specific Conditional Gate

Renderer real/golden gate becomes mandatory when a renderer has been approved/qualified and the test environment can provision that approved implementation.

Before renderer selection, CI MUST NOT fabricate a fake 'qualified renderer' PASS.

Other already-locked real integration gates (MySQL 8.4, ClamAV, signing/verification) are mandatory once application bootstrap contains the corresponding capability being tested.

## 94. Gate Disabling

Required gate MUST NOT be:

- commented out to unblock a PR;
- converted to `continue-on-error`/informational success merely because it fails;
- replaced by a weaker test without requirement justification;
- skipped only for AI-generated changes;
- bypassed through environment-specific business behavior.

If a gate is genuinely inapplicable to a change, that should be evident from the change scope rather than implemented as a blanket bypass.

---

# PART T — DOMAIN-SPECIFIC NEGATIVE TEST REQUIREMENTS

## 95. Negative Tests Are Mandatory for Critical Gates

For critical authorization/security/state rules, positive success alone is insufficient.

At least representative negative tests MUST prove rejection/no side effect.

## 96. Authorization Negative Examples

Must include applicable:

- Requester cannot read/mutate another Requester's record unless separately authorized by an approved permission rule;
- Team membership alone does not grant Review/Approval;
- user without required permission cannot review/approve/reopen/archive/administer;
- protected actions fail without valid recent re-auth;
- unauthorized download cannot obtain private attachment/export;
- public verifier cannot browse records.

## 97. State Negative Examples

Must include applicable:

- approve outside `PENDING_APPROVAL` rejected;
- forward outside `PENDING_REVIEW` rejected;
- submit invalid terminal/cancelled record rejected;
- reopen CANCELLED rejected;
- stale concurrent action rejected safely;
- archived state prerequisite enforced where required.

## 98. Security Negative Examples

Must include applicable:

- scanner unavailable does not become CLEAN;
- signing failure does not produce unsigned Approved PDF;
- modified PDF does not validate as current;
- temp password plaintext cannot be retrieved later;
- authoritative audit cannot be purged by Technical Log settings;
- invalid/oversized public upload is rejected before deep processing as specified;
- CSRF/unauthenticated protected mutation rejected.

---

# PART U — TEST REVIEW QUALITY

## 99. Review Tests Like Production Code

Tests are project code and must follow quality rules from `15`.

Review should detect:

- unclear setup that hides requirement;
- excessive mock coupling;
- duplicated giant fixtures;
- order dependence;
- weak assertions;
- false positives;
- snapshot/golden abuse;
- hidden sleeps/retries;
- secrets in fixtures/output;
- test-only business bypasses.

## 100. Assertion Quality

Prefer assertions on externally meaningful outcomes/invariants over private implementation details.

Example priority:

```text
state + audit + response + persisted invariant
```

rather than asserting incidental method call order unless call ordering itself is the contract.

## 101. One Test, Clear Intent

A test SHOULD have a clear requirement-focused reason to fail.

Large end-to-end scenarios may assert multiple related outcomes when they represent one critical journey, but unit/feature tests SHOULD avoid unrelated assertion bundles that obscure root cause.

## 102. Test Naming

Test names should describe behavior/outcome in domain language.

Prefer:

```text
requester cannot submit incomplete change form
eligible approver can approve pending approval record
identical chunk replay does not refresh expiry
```

Avoid vague names such as:

```text
test works
happy path
case 1
```

---

# PART V — TEST FAILURE / INCIDENT HANDLING

## 103. Failure Classification

When a required test fails, classify root cause before changing code:

```text
production defect
test defect
fixture/data defect
environment/infrastructure defect
specification contradiction or unresolved requirement
```

Do not assume the test is wrong merely because production implementation already exists.

## 104. Specification Conflict

If test and implementation disagree because upstream specifications conflict or are genuinely incomplete:

```text
stop silent implementation decision
→ identify authorities in conflict
→ obtain/record approved resolution
→ synchronize docs
→ update test
→ update implementation
```

## 105. No Silent Quarantine

A required failing test MUST NOT be silently skipped, quarantined, tagged optional, or removed merely to restore green CI.

A temporary exception, if ever necessary, requires explicit human approval and documented reason/scope; it must not become an undeclared permanent bypass.

---

# PART W — LOCAL / CI / STAGING TEST RESPONSIBILITY

## 106. Local Developer Testing

Developer/agent SHOULD run the smallest useful targeted test during RED/GREEN cycles, then relevant regression gates before PR completion.

Local test doubles are acceptable for fast feedback where real integration is not the subject.

## 107. CI Testing

CI is the authoritative automated PR gate environment for:

- static/format/type checks;
- backend/frontend tests;
- coverage;
- MySQL 8.4 integration;
- Chromium critical journeys;
- real ClamAV;
- non-production signing/verification;
- renderer qualification/golden path once approved.

CI application timezone remains `Asia/Jakarta`; MySQL session timezone remains `+07:00`.

## 108. Staging Validation

Staging SHOULD provide production-like final validation for capabilities whose operational topology cannot be fully proven in isolated CI, including applicable:

- HTTPS/session-cookie/security headers;
- durable private storage;
- scheduler/worker behavior;
- real ClamAV topology;
- qualified renderer/fonts;
- staging signing identity;
- cleanup lifecycle.

Staging validation does not replace PR-level automated tests.

## 109. Production

Production is not a disposable test environment.

Do not run destructive test suites, test malware fixtures, test signing keys, or reset-oriented test commands against production.

Production verification belongs to safe readiness/smoke/operational procedures, not this document's destructive automated test workflow.

---

# PART X — CURRENT OPEN ITEMS THAT TESTS MUST NOT INVENT

## 110. Exact Rate-Limit Numbers

Public/login/other exact numeric rate-limit buckets remain TBD where upstream docs say TBD.

Tests may prove configured limit enforcement generically but MUST NOT define the production number silently.

## 111. Renderer Implementation / Fidelity Tolerance

Exact renderer implementation/topology/timeouts and any approved golden visual tolerance remain unresolved until qualification/deployment decision.

Tests must not choose them silently.

## 112. Signing Provider / Rotation

Exact production signing provider/library/CA/path/passphrase/rotation remains TBD.

Integration tests prove the contract with non-production identity without deciding production provider.

## 113. ClamAV Topology / Timeout

Exact ClamAV socket-vs-TCP deployment and timeout value remain environment/deployment decisions where still TBD.

Tests prove fail-closed contract and real integration without declaring the production number/topology.

## 114. Performance / Load / SLA

No numeric performance/load/SLA threshold is invented in `16` because upstream requirements remain open.

Once approved performance objectives exist, their test thresholds must be added through the appropriate authoritative synchronization.

## 115. Browser Expansion

Firefox/WebKit are not current mandatory automated targets.

Adding them later requires approved testing-spec change; current application should still use standards-compatible implementation rather than intentionally targeting Chromium-only behavior.

---

# PART Y — TESTING ACCEPTANCE CHECKLIST

## 116. TDD Integrity

- [ ] test derives from approved specification;
- [ ] meaningful RED observed before production behavior;
- [ ] RED test committed before implementation for applicable feature/bug/behavior change;
- [ ] GREEN observed after implementation;
- [ ] relevant regression suite executed;
- [ ] pure refactor exception used only when behavior is unchanged;
- [ ] no fabricated/reordered TDD evidence.

## 117. Coverage / Quality

- [ ] PHP project-owned application line coverage >=80%;
- [ ] frontend instrumented project-owned application line coverage >=80% once approved provider is configured;
- [ ] critical rule tests exist independent of percentage;
- [ ] exclusions are legitimate, not coverage gaming;
- [ ] no weakened assertions/snapshot blind regeneration.

## 118. Backend / Database

- [ ] feature/application behavior covered;
- [ ] MySQL 8.4 integration used where persistence semantics matter;
- [ ] migration/schema critical constraints covered;
- [ ] transaction/rollback behavior covered where required;
- [ ] concurrency/locking critical races covered;
- [ ] repository boundaries covered.

## 119. Security / Authorization

- [ ] positive + negative permission cases;
- [ ] Team non-authorization proven;
- [ ] session/re-auth/credential rules proven;
- [ ] forbidden workflow actions have no unauthorized side effect;
- [ ] secrets absent from test logs/fixtures/artifacts;
- [ ] audit retention separation proven.

## 120. Attachment / Export / Verification

- [ ] resumable idempotency + expiry semantics covered;
- [ ] real ClamAV path covered;
- [ ] private storage boundary covered;
- [ ] export snapshot immutability covered;
- [ ] OOXML preservation/golden mapping covered;
- [ ] real renderer path covered after qualification;
- [ ] real non-production signing/verification covered;
- [ ] validator result/privacy matrix covered.

## 121. Frontend / Browser

- [ ] Vitest/Vue Test Utils cover meaningful component behavior;
- [ ] server remains authorization authority;
- [ ] Playwright Chromium critical journeys pass;
- [ ] browser diagnostics safe on failure;
- [ ] no automatic retry-as-pass.

## 122. CI / Merge Eligibility

- [ ] required deterministic gates executed;
- [ ] any required failure blocks merge eligibility;
- [ ] no `continue-on-error` bypass of required gate;
- [ ] no flaky retry masking;
- [ ] real integrations use non-production resources;
- [ ] human final merge rule from `15` preserved.

---

# PART Z — HANDOFF TO SEED / DUMMY DATA SPECIFICATION

## 123. Relationship to `17_Seed_Dummy_Data_Specification.md`

`16` defines **how tests obtain isolated synthetic data and what data-safety rules apply**, but does not define the reusable development/demo seed dataset.

`17` will own:

- baseline development/demo accounts and roles where approved;
- dummy NSCMF records/scenarios;
- Team dummy/master-data direction once approved;
- deterministic seed relationships;
- seed safety between local/testing/staging/production;
- rules preventing production-sensitive seed execution.

`17` MUST NOT weaken test isolation or make tests depend on shared seed execution order.

## 124. Current Testing Decisions Now Authoritative

The following are no longer TBD:

- TDD mandatory;
- meaningful RED first;
- separate RED test commit before implementation commit;
- pure refactor may use existing GREEN safety net;
- global minimum line coverage 80%;
- coverage cannot replace behavioral proof;
- MySQL 8.4 mandatory integration authority;
- every implementation PR runs applicable mandatory deterministic gates;
- Playwright critical journeys run on PR;
- Playwright automated browser baseline Chromium only;
- real ClamAV integration mandatory;
- real cryptographic signing/verification with non-production identity mandatory;
- qualified renderer real/golden integration mandatory after qualification;
- mocks/fakes cannot be sole proof for required real integration;
- automatic retry-as-pass forbidden;
- flaky tests remain visible defects to fix at root cause.

## 125. Documentation Finality / Current Handoff

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
