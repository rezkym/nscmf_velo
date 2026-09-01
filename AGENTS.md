# AGENTS.md — Project Alya / NSCMF

This is the operational entrypoint for coding agents.

**Authoritative full coding rules:** `project_doc/15_Coding_Rules_AGENTS.md`.

**Authoritative pre-testing synchronization:** `project_doc/15A_Pre_Testing_Specification_Synchronization.md`.

This root file is a synchronized summary. It MUST NOT override or weaken any rule in `project_doc`.

---

## Read Before Coding

Before modifying the repository:

1. read this file;
2. read `project_doc/15_Coding_Rules_AGENTS.md`;
3. read `project_doc/15A_Pre_Testing_Specification_Synchronization.md` while `16_Testing_Specification.md` has not yet been created;
4. read the project documents relevant to the task;
5. inspect affected code, tests, migrations, configuration, and current Git state.

Authority by concern:

```text
01 Product scope
02 Business rules
03 User flow
04 RBAC / Team boundary
05 State / workflow
06 Validation
07 UI/UX
08 Tech stack / TDD baseline
09 Architecture
10 Security
11 Database schema
11A Resumable upload synchronization
12 API contract
12A Repository-Service synchronization
13 Project structure
14 Environment
14A Pre-coding governance/history
15 Coding / developer / agent rules
15A Pre-testing decisions / current testing synchronization
```

Do not invent a requirement, route, schema field, permission, state, dependency, or deployment decision when an authoritative source can be read.

If a genuine unresolved decision materially affects implementation, surface it instead of silently choosing a new product/security/testing rule.

---

## TDD Is Mandatory

For new behavior, bug fixes, and behavior changes:

```text
approved requirement
→ test first
→ meaningful RED
→ RED test commit
→ minimum correct implementation
→ GREEN
→ implementation commit
→ relevant regression suite
→ refactor while GREEN
```

Tests follow the specification, not the implementation.

For applicable feature/bug/behavior changes, the requirement-derived RED test MUST be committed before the production implementation commit. Do not implement first and later rewrite/reorder history to manufacture TDD evidence.

MUST NOT:

- implement behavior first and manufacture a matching test afterward;
- weaken/delete/skip relevant assertions to make code pass;
- change expected business behavior without an approved specification change;
- mock away the behavior that needs proof;
- fabricate RED/GREEN evidence;
- fabricate a RED commit through broken imports/fixtures/syntax;
- add test-only bypasses for real business/security rules.

Pure behavior-preserving refactors may use an existing GREEN safety net without an artificial RED test or RED commit.

PRs for behavior changes must contain truthful TDD evidence as defined by `15` and `15A`.

---

## Current Testing / CI Baseline

Until `16_Testing_Specification.md` is created, the following confirmed rules from `15A` are mandatory:

```text
minimum global line coverage = 80%
PHPStan/Larastan = max
TypeScript = strict
MySQL integration authority = real MySQL 8.4
Playwright PR browser = Chromium only
```

Every implementation PR must run the required deterministic quality/testing gates, including relevant:

- Laravel Pint;
- PHPStan/Larastan max;
- Pest;
- 80% minimum global line-coverage gate;
- ESLint;
- Prettier check;
- vue-tsc / strict TypeScript;
- Vitest;
- MySQL 8.4 integration path;
- Playwright Chromium critical journeys.

Coverage percentage is not proof of correctness. Critical business/security behavior still needs meaningful positive/negative/integration/concurrency tests regardless of whether global coverage already exceeds 80%.

Mocks/fakes are allowed for isolated tests but cannot be the only evidence for real infrastructure contracts. CI must include real integration paths for:

- ClamAV;
- cryptographic PDF signing/verification with non-production test identity;
- the qualified spreadsheet renderer once a renderer has been approved/qualified;
- MySQL semantics where database behavior matters.

Production secrets/signing keys must never be used in CI.

**Flaky-test automatic retry policy is still TBD.** Do not silently assume `no retry`, a retry count, or a retry-as-pass policy until the user explicitly decides it and `16` records it.

---

## Backend Architecture

Mandatory direction:

```text
Controller + Form Request
        ↓
Service
        ↓
Repository Contracts + Domain Rules + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Adapters
```

Controller is thin and does not perform business persistence/orchestration.

Form Requests use validated data only. Do not use unfiltered request payloads for business persistence.

Service owns use-case orchestration and transaction boundaries. Service does not issue Eloquent/Query Builder business queries directly.

Repository owns persistence/query mechanics only. Repository does not decide workflow, permission, or Team authorization.

Jobs/Commands enter business execution through Services.

Models contain persistence relationships/casts/scopes/simple accessors, not workflow orchestration.

Do not introduce a separate Actions layer, DTO architecture, generic BaseRepository, generic CRUD Service, or abstraction hierarchy without an approved specification change.

---

## PHP / TypeScript Strictness

Every project-owned PHP source file uses strict types unless a narrow documented interoperability exception exists.

PHPStan/Larastan:

```text
level = max
zero-baseline policy
```

Do not lower analysis strictness, create a broad baseline, or add blanket suppressions to make CI pass.

Laravel Pint is PHP formatting authority.

TypeScript must use strict mode.

Do not normalize broad type escapes such as `any`, `as any`, or blanket compiler suppression. Narrow third-party interoperability exceptions must be local, justified, and tested where practical.

---

## Locked Business / Security Guardrails

### Organization / authorization

- single organization / installation;
- Team is organizational metadata only;
- Team never authorizes Review/Approval;
- no Unit, Division, Reviewer Scope, or Approval Scope;
- Spatie Teams disabled;
- wildcard permissions disabled;
- permission-centric authorization;
- no universal Superadmin business/security bypass.

### Canonical NSCMF states

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

Do not create additional NSCMF business states. Archive and technical/security statuses remain separate.

### Review / approval

- shared, non-exclusive Reviewer and Approver pools;
- Team-neutral eligibility;
- one successful eligible Approver is sufficient;
- Emergency Change does not bypass workflow.

### Authentication/session

Preserve the locked password/session/re-auth rules from `10`/`14`. Do not add MFA, password-composition requirements, or extend the confirmed re-auth window without a specification change.

---

## Validation / Concurrency

Draft/Revision may be incomplete. Action gates enforce their own validation.

Validation success does not equal authorization.

Use optimistic `record_version` where specified.

Workflow state changes use short Service-owned transactions with current-state revalidation/locking. Stale conflicting actions fail safely.

Do not hold workflow locks while performing long scanner/render/signing/file work.

---

## Attachments / Resumable Upload

Attachments are optional and governed by the locked limits in `06`, `10`, `11A`, and `12`.

Storage remains private. Initial production baseline is persistent Laravel private local storage; do not silently introduce object storage.

Resumable upload uses the locked 5 MiB chunk size. Server accepted/missing progress is authoritative. Client hashes are only untrusted resume hints. Server-computed final assembled SHA-256 is authoritative.

An identical replay of an already accepted chunk is idempotent but is not new progress and must not indefinitely extend expiry.

A completed transport upload is not a CLEAN attachment.

Final usability requires whole-file malware scanning and explicit CLEAN. Scanner failure/timeout/unavailability/infection fails closed.

---

## XLSX / PDF

The official XLSX template is immutable/versioned/private and contains native Excel control/VML structures.

Do not generically rewrite the whole workbook if that can strip unsupported OOXML parts.

Use targeted OOXML/package patching, preserve unrelated package members, and validate structure/integrity.

PDF must use a qualified spreadsheet renderer, not an approximate HTML representation.

Exports use immutable bound snapshots, not later mutable record state.

Approved PDFs require System/Organization cryptographic signing. Human Approved By is separate from the cryptographic signer. Signing failure never produces an unsigned Approved fallback.

Do not silently choose unresolved signer/renderer/scanner deployment details.

---

## Audit / Logging / Secrets

Business, Access, and Security Audits have no age-based purge.

Technical Logs are separate and follow the protected configurable cleanup policy. Technical-log cleanup must never delete authoritative audit/history/issuance evidence.

Never persist or expose secret plaintext, production signing material, production credentials, or sensitive runtime values in source, client bundles, logs, audits, or ordinary database fields.

Use application configuration boundaries correctly; do not scatter environment lookups through business code or expose secrets through frontend build variables.

---

## Database / Migrations

`project_doc/11_ERD_Database_Schema.md` is schema authority.

Do not create generic EAV/JSON business storage or hidden database workflow logic.

Once a migration has become part of shared/applied history, treat it as immutable. Future schema evolution uses a new forward migration.

Do not use destructive migration shortcuts against shared, staging, or production data.

---

## Dependencies

A new Composer/npm dependency that is not already approved by project specifications requires explicit user approval before addition.

This includes development dependencies.

When requesting approval, explain the package, purpose, runtime/dev classification, why the existing stack is insufficient, material maintenance/security impact, and an alternative without the package.

Keep `composer.lock` and `package-lock.json` synchronized and avoid unrelated lockfile churn.

---

## Generated / Runtime Artifacts

Generated output follows its authoritative source. Modify source first, regenerate with the approved process, inspect the diff, then commit required generated output.

Do not hand-edit generated output to conceal mismatch.

Do not commit ordinary runtime/build/test artifacts, local environment secrets, private uploads/exports, or production signing material unless a later specification explicitly requires a specific generated artifact in Git.

The official immutable XLSX template is governed separately as a controlled project input.

---

## Git / Pull Request Rules

Normal flow:

```text
main
→ scoped branch
→ Conventional Commits
→ Pull Request
→ CI/review
→ human final merge
```

Use concise branch prefixes such as `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/` where appropriate.

Commit messages follow Conventional Commits.

Commits use the user's/project's authenticated Git identity or configured signing mechanism where available.

Do not add the model, ChatGPT, Codex, or another AI system as contributor/co-author/generated-by metadata.

Do not claim a commit is cryptographically signed/Verified unless Git/GitHub actually reports it.

The coding agent may create/update a branch and PR and fix CI/review findings, but MUST NOT approve or merge its own implementation PR and MUST NOT enable automation that bypasses human final merge control.

---

## Destructive Actions

Any action that can materially erase data/work/history, overwrite immutable project assets, or rewrite shared repository/database history requires explicit user approval first.

A general request to implement or fix something is not blanket authorization for a destructive shortcut.

An isolated disposable test environment created for automated testing may be reset only when it is safely scoped and contains no user/shared/production data.

---

## Verify Before Claiming Completion

Run checks appropriate to the change.

Backend work normally includes relevant formatting, PHPStan/Larastan max, targeted Pest tests, and regression tests.

Frontend work normally includes relevant lint/format checks, strict TypeScript/vue-tsc, Vitest, and build/E2E where applicable.

Migration, authorization, concurrency, attachment, and export changes require their relevant integration/security/golden verification.

Inspect the final diff for unrelated edits, secrets, lockfile churn, generated/runtime files, weakened tests, debug code, and architecture drift.

After GitHub mutations, verify branch/commit/PR state.

Never claim tests, CI, file updates, commit signing, or exact export fidelity that were not actually verified.

---

## Agent Conduct

Do not hallucinate repository facts.

Do not perform unrelated refactors or speculative future work.

Do not create abstraction boilerplate merely because it looks enterprise.

Do not game tests/static analysis/coverage.

Read failures and fix root causes rather than suppressing diagnostics.

Ask only for genuine unresolved decisions; do not re-ask decisions already documented.

If an approved requirement changes, synchronize affected project documentation, tests, implementation, and this root entrypoint when applicable.

---

## Critical MUST NOT Summary

Never:

1. introduce Unit/Division/reviewer/approval scopes;
2. authorize Review/Approval by Team;
3. enable Spatie Teams or wildcard permissions;
4. add NSCMF business states;
5. add a universal Superadmin bypass;
6. reintroduce Actions/DTO/BaseRepository architecture;
7. move normal business DB queries into Controller or Service;
8. trust client state/hash/permission as authority;
9. expose attachments before explicit CLEAN;
10. treat transport completion as malware-clean state;
11. generic-rewrite the official XLSX and risk control loss;
12. use approximate HTML as authoritative PDF;
13. issue unsigned Approved PDF fallback;
14. age-purge authoritative audits;
15. expose/persist temporary password plaintext or signing secrets;
16. silently change locked authentication/session policy;
17. silently introduce new infrastructure/dependencies;
18. silently resolve a documented TBD;
19. rewrite shared/applied migration history;
20. perform destructive operations without explicit user approval;
21. lower static/type strictness to make CI pass;
22. weaken tests or game coverage to match implementation;
23. fabricate/reorder TDD evidence after implementation;
24. add AI/model contributor metadata;
25. approve/merge the agent's own implementation PR;
26. claim work or verification that did not occur.

---

## Current Handoff

`project_doc/15_Coding_Rules_AGENTS.md` is authoritative for coding/developer/agent conduct.

`project_doc/15A_Pre_Testing_Specification_Synchronization.md` is the current authoritative testing synchronization overlay until `16` is explicitly created.

The next fixed-order project document is `16_Testing_Specification.md`.

Do not create `16` until the user explicitly instructs it and the remaining flaky-test automatic retry policy has been explicitly resolved.