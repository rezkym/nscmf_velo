# Pre-Testing-Specification Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** implementation/testing interpretation of `08_Tech_Stack_Specification.md`, `13_Project_Structure.md`, `14_Environment_Specification.md`, `15_Coding_Rules_AGENTS.md`, and repository-root `AGENTS.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-09-01 through 2026-09-02  
> **Status:** Confirmed / Authoritative pre-`16` synchronization  
> **Next Fixed-Order Document:** `16_Testing_Specification.md` — MUST NOT be created until explicit user instruction

---

## 1. Purpose

Dokumen ini merekam keputusan testing/CI yang sudah dikonfirmasi user setelah `15_Coding_Rules_AGENTS.md` selesai tetapi sebelum `16_Testing_Specification.md` dibuat.

Dokumen ini menjaga `01–15` tetap konsisten tanpa memaksa detail testing ke Product/Business/API/Schema documents yang tidak memiliki concern tersebut.

Addendum ini **tidak** mengubah product scope, business rules, RBAC, workflow states, API payloads, schema target, security behavior, atau production deployment topology.

Jika wording lama pada `08`, `13`, `14`, atau `15` lebih lemah/umum untuk concern yang dikunci di sini, addendum ini menjadi **newer narrow synchronization authority** sampai `16` mengintegrasikan testing authority secara lengkap.

---

# PART A — COVERAGE POLICY

## 2. Global Line Coverage Gate — LOCKED

Automated test coverage MUST be measured with:

```text
minimum global line coverage = 80%
```

A Pull Request/revision whose applicable measured global line coverage is below 80% MUST fail the coverage gate.

## 3. Coverage Percentage Is Not Proof of Correctness

The 80% metric is a minimum safety threshold, not the definition of test quality.

Developer/coding agent MUST NOT:

- write meaningless assertions merely to execute lines;
- add tests that call code without proving behavior;
- exclude important project-owned code merely to preserve the percentage;
- use coverage percentage as an excuse to omit negative/security/concurrency tests;
- treat 80% as permission to leave a critical rule untested.

Critical authorization, workflow, validation, attachment-security, export/signing, audit-retention, credential/session, and concurrency behavior requires meaningful positive and negative proof independent of the percentage.

Exact inclusion/exclusion mechanics and reporting commands belong to `16_Testing_Specification.md` and MUST preserve this locked baseline.

---

# PART B — TDD COMMIT EVIDENCE

## 4. Separate RED Commit — LOCKED

For a new feature, bug fix, or behavior change where TDD RED applies, the requirement-derived test MUST be committed **before** the production implementation commit.

Required direction:

```text
approved specification / requirement
→ write test
→ execute test and confirm meaningful RED
→ commit RED test evidence
→ implement minimum production change
→ execute GREEN
→ commit implementation
→ run relevant regression suite
```

Typical history:

```text
test: cover <required behavior>
feat: implement <required behavior>
```

or:

```text
test: reproduce <bug>
fix: correct <bug>
```

## 5. RED Commit Integrity

The RED commit MUST contain a legitimate requirement-derived test and only the harness/support needed to execute it. It MUST NOT already contain the production behavior intended to make the test pass.

A coding agent MUST NOT:

- implement first and reorder/rewrite history later to manufacture TDD;
- fabricate RED using broken imports, fixtures, syntax, or unrelated failure;
- claim an already-GREEN post-implementation test as pre-implementation RED evidence;
- weaken the committed RED test in the implementation commit merely to obtain GREEN.

Actual RED/GREEN commands/results remain required PR evidence under `15`.

## 6. Pure Refactor Exception

A pure behavior-preserving refactor with adequate existing GREEN tests does not require an artificial RED test or RED commit.

Required evidence:

```text
existing relevant suite GREEN before refactor
→ refactor
→ same relevant suite GREEN after refactor
```

If behavior changes, the RED-commit requirement applies.

---

# PART C — REQUIRED PULL REQUEST CI BASELINE

## 7. Every Implementation Pull Request — Mandatory Gates

Every implementation Pull Request MUST run applicable deterministic project gates before human merge eligibility.

Locked baseline includes:

```text
Laravel Pint check
PHPStan/Larastan level max
Pest backend test suite
80% minimum global line-coverage gate
ESLint
Prettier check
vue-tsc / TypeScript strict checking
Vitest frontend test suite
MySQL 8.4 integration path
Playwright critical-journey E2E suite using Chromium
```

Required reproducible Composer/npm install/build checks from upstream docs remain applicable.

A required gate MUST NOT be silently disabled, downgraded to informational-only, or bypassed because the implementation currently fails it.

## 8. MySQL 8.4 Is Mandatory Integration Authority

MySQL 8.4 is the mandatory relational integration target in CI for database semantics.

SQLite MAY be used only for narrowly isolated tests where MySQL-specific behavior is irrelevant. SQLite MUST NOT be the only proof for migrations/schema constraints, row locking/concurrency, transaction behavior, indexes/uniqueness, or repository behavior depending on MySQL semantics.

Any older implementation-facing wording such as `SHOULD use MySQL 8.4` is superseded by this confirmed **MUST** for the integration path.

---

# PART D — REAL INFRASTRUCTURE INTEGRATION

## 9. Test Doubles Are Allowed but Not Sufficient

Mocks/fakes/test doubles MAY be used for isolated tests, but MUST NOT become the only validation path for infrastructure whose real behavior is part of the system contract.

## 10. Real ClamAV — Mandatory Integration Path

CI MUST include a real ClamAV integration path proving relevant CLEAN/fail-closed behavior. Fake scanners remain allowed for isolated tests only.

## 11. Real Cryptographic Signing / Verification — Mandatory Integration Path

CI MUST execute real cryptographic PDF signing/verification using a dedicated non-production test identity.

Production signing private keys/passphrases MUST NEVER be used in CI.

The test identity may be ephemeral or a dedicated approved non-production fixture/secret. Exact production signer provider/library/CA/rotation remains separately TBD.

## 12. Real Spreadsheet Renderer — Mandatory After Qualification

Before an official renderer is selected/qualified, tests MUST NOT invent one as production authority.

Once approved/qualified, CI MUST include a real renderer integration/golden path using the qualified implementation and required fonts/environment. Mock renderer success is never sufficient to claim fidelity.

## 13. Storage / Queue / Concurrency Integration

Existing requirements remain:

- database queue behavior is proven by integration tests where queue semantics matter;
- private-storage behavior is tested beyond a pure mock where persistence/private-boundary semantics matter;
- concurrency/locking behavior is tested against MySQL semantics rather than simulated only in memory.

---

# PART E — PLAYWRIGHT BROWSER SCOPE

## 14. Chromium-Only Baseline — LOCKED

Current MVP automated browser baseline is:

```text
Playwright browser project = Chromium only
```

Critical user journeys MUST run against Chromium in the Pull Request E2E gate.

Firefox and WebKit are not required in the current MVP automated-browser matrix. This defines certification scope only and does not authorize browser-specific code that intentionally violates web standards.

---

# PART F — FLAKY TEST / RETRY POLICY

## 15. No Automatic Retry-As-Pass — LOCKED

A failing automated test MUST NOT be automatically retried until a later attempt passes and then be treated as successful merge evidence.

Canonical behavior:

```text
required test FAILS
→ required CI gate remains FAILED
→ diagnose root cause
→ fix production code, test, fixture, environment, or synchronization issue as appropriate
→ run the CI/test execution again
```

Forbidden acceptance pattern:

```text
attempt 1 = FAIL
→ automatic retry
attempt 2 = PASS
→ treat overall gate as PASS
```

A test that sometimes fails and sometimes passes without an intentional code/environment change is a **flaky test** and is a defect to investigate.

Developer/coding agent MUST NOT:

- configure automatic retry merely to turn an unstable FAIL into accepted PASS evidence;
- hide flaky behavior behind retry counts;
- report a test as stable because a retry eventually passed;
- weaken/remove the test solely because it is inconveniently flaky.

Diagnostic artifacts such as logs, traces, screenshots, videos, timing information, or failure dumps MAY be collected automatically. Diagnostic collection is not a retry and does not change the FAIL result.

After an actual fix or intentional corrective change, the developer/agent MAY rerun the affected test or CI workflow. That new execution is a fresh verification run, not automatic retry-as-pass.

If a third-party runner/tool performs an unavoidable internal retry, the project MUST NOT use the eventual-pass result as sufficient merge evidence unless `16` later defines an explicit approved exception. Current baseline is fail-visible and root-cause-first.

---

# PART G — CROSS-DOCUMENT INTERPRETATION

## 16. `08_Tech_Stack_Specification.md`

Interpret testing/CI sections with these confirmed stronger rules:

- global line coverage gate = 80%;
- MySQL 8.4 integration is mandatory;
- Playwright critical journeys are mandatory PR gates;
- Playwright automated browser scope = Chromium only;
- real ClamAV and real non-production cryptographic signing/verification paths are mandatory;
- real qualified renderer integration becomes mandatory after renderer qualification;
- automatic retry MUST NOT convert a failing required test into accepted PASS evidence.

## 17. `13_Project_Structure.md`

No folder/layout change is required.

Existing `tests/Feature`, `Unit`, `Integration`, `Architecture`, `Fixtures`, and `Browser` structure remains valid. `tests/Browser` current baseline targets Playwright Chromium critical journeys.

## 18. `14_Environment_Specification.md`

Existing CI environment requirements are strengthened as follows:

- MySQL 8.4 integration mandatory;
- real ClamAV integration mandatory;
- real signing/verification with non-production identity;
- real renderer/golden integration mandatory once qualified;
- Pull Request E2E uses Chromium;
- CI enforces 80% global line coverage;
- failing required tests remain failing and are not automatically retried into accepted PASS evidence.

Production secrets remain forbidden in CI.

## 19. `15_Coding_Rules_AGENTS.md`

TDD evidence is additionally constrained by separate RED-commit chronology.

Coding agents must preserve chronological test-before-implementation evidence, must not game coverage, must not disable required gates, and must treat flaky tests as defects rather than retrying until green.

## 20. Root `AGENTS.md`

Root `AGENTS.md` remains the synchronized operational summary and MUST reflect the locked rules in this addendum until `16` integrates detailed testing authority.

---

# PART H — CURRENT STATUS / NEXT DOCUMENT

## 21. Confirmed Inputs to `16`

The following are now locked inputs for `16_Testing_Specification.md`:

- [x] TDD mandatory.
- [x] Meaningful RED before production implementation.
- [x] Separate RED test commit before implementation commit for feature/bug/behavior change.
- [x] Pure refactor does not require artificial RED.
- [x] Global line coverage minimum = **80%**.
- [x] Coverage percentage is not a substitute for meaningful critical-rule tests.
- [x] Every implementation PR runs mandatory deterministic quality/testing gates.
- [x] MySQL 8.4 integration mandatory.
- [x] Playwright critical journeys mandatory on PR.
- [x] Playwright automated browser baseline = **Chromium only**.
- [x] Real ClamAV integration mandatory.
- [x] Real cryptographic signing/verification with non-production identity mandatory.
- [x] Real qualified renderer integration mandatory after qualification.
- [x] Mocks/fakes allowed for isolation but cannot be the only proof for real infrastructure contracts.
- [x] **No automatic retry-as-pass for failing required tests; flaky tests must remain visible and be fixed at root cause.**

## 22. Documents That Do Not Require Semantic Change

These testing decisions do not alter semantics owned by:

```text
01_PRD.md
02_Business_Rules.md
03_User_Flow.md
04_RBAC_Permission_Matrix.md
05_State_Status_Flow.md
06_Validation_Rules.md
07_UI_UX_Specification.md
09_System_Architecture.md
10_Security_Rules.md
11_ERD_Database_Schema.md
11A_Resumable_Attachment_Upload_Synchronization.md
12_API_Contract.md
12A_Repository_Service_Architecture_Synchronization.md
```

They remain authoritative without business/API/schema modification.

## 23. Next Fixed-Order Document

All previously identified pre-`16` testing-policy decisions are now resolved.

Next fixed-order document remains:

**`16_Testing_Specification.md`**

It MUST NOT be created until the user explicitly instructs its creation.