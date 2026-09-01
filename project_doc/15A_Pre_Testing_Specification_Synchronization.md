# Pre-Testing-Specification Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** implementation/testing interpretation of `08_Tech_Stack_Specification.md`, `13_Project_Structure.md`, `14_Environment_Specification.md`, `15_Coding_Rules_AGENTS.md`, and repository-root `AGENTS.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-09-01  
> **Status:** Confirmed / Authoritative pre-`16` synchronization  
> **Next Fixed-Order Document:** `16_Testing_Specification.md` — MUST NOT be created until explicit user instruction

---

## 1. Purpose

Dokumen ini merekam keputusan testing/CI yang sudah dikonfirmasi user setelah `15_Coding_Rules_AGENTS.md` selesai tetapi sebelum `16_Testing_Specification.md` dibuat.

Dokumen ini menjaga `01–15` tetap konsisten tanpa memaksa detail testing ke Product/Business/API/Schema documents yang tidak memiliki concern tersebut.

Addendum ini **tidak** mengubah product scope, business rules, RBAC, workflow states, API payloads, schema target, security behavior, atau environment production topology.

Jika wording lama pada `08`, `13`, `14`, atau `15` lebih lemah/umum untuk concern yang dikunci di sini, addendum ini menjadi **newer narrow synchronization authority** sampai rule tersebut diintegrasikan ke source authority yang sesuai.

---

# PART A — COVERAGE POLICY

## 2. Global Line Coverage Gate — LOCKED

Automated test coverage MUST be measured and the project uses the following minimum global line-coverage gate:

```text
minimum global line coverage = 80%
```

A pull request/revision that causes measured global line coverage to fall below 80% MUST fail the applicable CI coverage gate.

## 3. Coverage Percentage Is Not Proof of Correctness

The 80% metric is a minimum safety threshold, not the definition of test quality.

Developer/coding agent MUST NOT:

- write meaningless assertions merely to execute lines;
- add tests that only call methods without proving behavior;
- exclude important project-owned code from coverage only to preserve the percentage;
- use coverage percentage as an excuse to omit negative/security/concurrency tests;
- treat 80% as permission to leave a critical rule untested.

Critical business/security behavior MUST be tested according to its risk/contract even when global coverage already exceeds 80%.

In particular, applicable authorization, workflow, validation, attachment-security, export/signing, audit-retention, credential/session, and concurrency rules require meaningful positive and negative behavior proof independent of the percentage.

Exact inclusion/exclusion mechanics and reporting commands belong to `16_Testing_Specification.md` and MUST preserve this locked 80% global line baseline.

---

# PART B — TDD COMMIT EVIDENCE

## 4. Separate RED Commit — LOCKED

For a new feature, bug fix, or behavior change where TDD RED applies, the test that proves the missing/incorrect behavior MUST be committed **before** the production implementation commit.

Required history direction:

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

Typical Conventional Commit direction:

```text
test: cover <required behavior>
feat: implement <required behavior>
```

or:

```text
test: reproduce <bug>
fix: correct <bug>
```

The exact commit subject remains task-specific, but chronological separation is mandatory.

## 5. RED Commit Integrity

The RED commit MUST contain a legitimate requirement-derived test and enough test-harness support to execute it.

It MUST NOT contain the production behavior required to make the new test pass.

A coding agent MUST NOT:

- implement first and reorder/rewrite history later to manufacture apparent TDD;
- create a fake RED commit containing an intentionally broken import/fixture/syntax error;
- commit a test that is already GREEN because production behavior was implemented beforehand and claim it as RED evidence;
- weaken the committed RED test in the implementation commit merely to obtain GREEN.

The actual RED command/result still belongs in the Pull Request evidence required by `15`.

## 6. Pure Refactor Exception

A pure behavior-preserving refactor with adequate existing GREEN tests does not require a fake RED commit.

Required evidence remains:

```text
existing relevant suite GREEN before refactor
→ refactor commit(s)
→ same relevant suite GREEN after refactor
```

If behavior changes, the RED-commit requirement applies.

---

# PART C — REQUIRED PULL REQUEST CI BASELINE

## 7. Every Pull Request — Mandatory Deterministic Gates

Every implementation Pull Request MUST run the relevant project-wide deterministic quality/testing gates before it is eligible for human merge.

Current locked baseline includes:

```text
Laravel Pint check
PHPStan/Larastan level max
Pest backend test suite
80% minimum global line-coverage gate
ESLint
Prettier check
vue-tsc / TypeScript strict checking
Vitest frontend test suite
MySQL 8.4 integration test path
Playwright critical-journey E2E suite using Chromium
```

Existing required reproducible Composer/npm install/build checks remain applicable from `08`, `14`, and `15`.

A required gate MUST NOT be silently disabled, converted into informational-only status, or bypassed because the implementation currently fails it.

## 8. MySQL 8.4 Is Mandatory Integration Authority

MySQL 8.4 is the mandatory relational integration target in CI for database semantics.

SQLite MAY exist only for narrowly isolated tests where MySQL-specific behavior is provably irrelevant. SQLite MUST NOT be the only proof for:

- migrations/schema constraints;
- row locking/concurrency;
- transaction behavior;
- indexes/uniqueness semantics;
- repository persistence behavior whose correctness depends on MySQL.

Any older wording such as `SHOULD use MySQL 8.4` in implementation-facing testing context is superseded by this confirmed **MUST** for the integration path.

---

# PART D — REAL INFRASTRUCTURE INTEGRATION

## 9. Test Doubles Are Allowed but Not Sufficient

Mocks/fakes/test doubles MAY be used for isolated unit/feature tests.

They MUST NOT become the only validation path for infrastructure whose real behavior is part of the system contract.

## 10. Real ClamAV — Mandatory Integration Path

CI MUST include a real ClamAV integration path that proves at minimum the application can distinguish and correctly handle real scanner outcomes relevant to the locked CLEAN/fail-closed contract.

A fake scanner remains useful for isolated tests but cannot be the sole proof of attachment/public-validator malware behavior.

## 11. Real Cryptographic Signing / Verification — Mandatory Integration Path

CI MUST exercise real cryptographic PDF signing/verification behavior using a **dedicated non-production test identity**.

Production signing private keys/passphrases MUST NEVER be used in CI.

The test identity may be ephemeral or a dedicated approved non-production fixture/secret, but the test MUST execute real cryptographic operations rather than merely mocking `PdfSigner`/`PdfVerifier` success.

Exact production signer provider/library/CA/rotation remains separately TBD and is not decided by this testing rule.

## 12. Real Spreadsheet Renderer — Mandatory After Qualification

Before an official renderer implementation is selected/qualified, tests MUST NOT invent one as production authority.

Once a renderer is approved/qualified, CI MUST include a real renderer integration/golden path using the qualified implementation and required fonts/environment.

Mock renderer success is never sufficient to claim spreadsheet-to-PDF fidelity.

## 13. Storage / Queue / Concurrency Integration

Existing project requirements remain:

- database queue behavior is proven by integration tests where queue semantics matter;
- private-storage behavior is tested beyond a pure mock where persistence/private-boundary semantics matter;
- concurrency/locking behavior is tested against MySQL semantics rather than simulated only in memory.

`16` will define the exact suite organization without weakening these requirements.

---

# PART E — PLAYWRIGHT BROWSER SCOPE

## 14. Chromium-Only Baseline — LOCKED

Current MVP browser automation baseline is:

```text
Playwright browser project = Chromium only
```

Critical user journeys MUST run against Chromium in the Pull Request E2E gate.

Firefox and WebKit are **not required** in the current MVP automated-browser matrix.

This decision does not authorize browser-specific application code that intentionally breaks standards or other browsers. It only defines the current automated Playwright certification scope.

Adding Firefox/WebKit as mandatory CI browsers later requires an approved testing/specification change.

---

# PART F — FLAKY TEST / RETRY POLICY

## 15. Retry Policy Is Still Unresolved

The user response set confirmed coverage, separate RED commits, Pull Request gates, real infrastructure integration, and Chromium-only Playwright scope.

The previously proposed flaky-test retry rule was **not explicitly answered**.

Therefore the following remains TBD and MUST NOT be silently locked by a coding agent:

```text
whether CI/test runners may automatically retry a failing test and under what conditions
```

Until `16` resolves this through explicit user decision:

- a retry MUST NOT be described as an approved way to convert an unstable test into accepted evidence;
- current project documents MUST NOT claim `no retry` or a numeric retry count as a locked rule;
- test instability remains a defect to investigate rather than something the agent may silently hide.

---

# PART G — CROSS-DOCUMENT INTERPRETATION

## 16. `08_Tech_Stack_Specification.md`

Interpret testing/CI sections with these confirmed stronger rules:

- global line coverage gate = 80%;
- MySQL 8.4 integration is mandatory, not merely recommended;
- Playwright critical journeys are mandatory Pull Request gates;
- Playwright current automated browser scope = Chromium only;
- real ClamAV and real non-production cryptographic signing/verification integration paths are mandatory;
- real qualified renderer integration becomes mandatory after renderer qualification.

## 17. `13_Project_Structure.md`

No folder/layout change is required by these decisions.

The existing `tests/Feature`, `Unit`, `Integration`, `Architecture`, `Fixtures`, and `Browser` structure remains valid.

`tests/Browser` current baseline targets Playwright Chromium critical journeys.

## 18. `14_Environment_Specification.md`

The current CI environment requirements remain valid but are strengthened as follows:

- MySQL 8.4 integration is mandatory;
- real ClamAV integration is mandatory;
- real signing/verification uses non-production test identity;
- real renderer/golden integration is mandatory once qualified;
- Pull Request E2E uses Chromium;
- CI must enforce the 80% global line coverage gate.

Production secrets remain forbidden in CI.

## 19. `15_Coding_Rules_AGENTS.md`

TDD evidence is now additionally constrained by the separate RED-commit rule in this addendum.

A coding agent must preserve chronological test-before-implementation evidence in Git history for applicable behavior changes and must still provide truthful RED/GREEN execution evidence in the PR.

Coverage percentage must not be gamed, and required Pull Request gates must not be disabled to obtain mergeability.

## 20. Root `AGENTS.md`

Root `AGENTS.md` remains a synchronized operational summary and MUST be read together with `15` and this addendum until `16` integrates the detailed testing authority.

No root wording may be interpreted to weaken the rules locked here.

---

# PART H — CURRENT STATUS / NEXT DOCUMENT

## 21. Confirmed Inputs to `16`

The following are now locked inputs for `16_Testing_Specification.md`:

- [x] Test-Driven Development remains mandatory.
- [x] Meaningful RED before production implementation.
- [x] Separate RED test commit before implementation commit for feature/bug/behavior change.
- [x] Pure refactor does not require artificial RED.
- [x] Global line coverage minimum = **80%**.
- [x] Coverage percentage is not a substitute for meaningful critical-rule tests.
- [x] Every PR runs mandatory deterministic backend/frontend/static-analysis/type/testing gates.
- [x] MySQL 8.4 integration path mandatory.
- [x] Playwright critical journeys mandatory on PR.
- [x] Playwright automated browser baseline = **Chromium only**.
- [x] Real ClamAV integration mandatory.
- [x] Real cryptographic signing/verification with non-production identity mandatory.
- [x] Real qualified renderer integration mandatory after renderer qualification.
- [x] Mocks/fakes allowed for isolation but cannot be the only proof for real infrastructure contracts.
- [ ] Flaky-test automatic retry policy — **TBD / explicit user decision still required**.

## 22. Documents That Do Not Require Semantic Change

The new decisions do not alter the semantics owned by:

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

Next fixed-order document remains:

**`16_Testing_Specification.md`**

It MUST NOT be created until the user explicitly instructs its creation and the remaining flaky-test retry policy is explicitly resolved.