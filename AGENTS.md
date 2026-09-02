# AGENTS.md — Project Alya / NSCMF

Operational entrypoint for coding agents.

**Full coding authority:** `project_doc/15_Coding_Rules_AGENTS.md`  
**Current pre-testing authority:** `project_doc/15A_Pre_Testing_Specification_Synchronization.md`

This file is a synchronized operational summary. It MUST NOT override or weaken `project_doc`.

---

## Read Before Coding

Before modifying the repository:

1. read this file;
2. read `project_doc/15_Coding_Rules_AGENTS.md`;
3. while `16_Testing_Specification.md` does not yet exist, read `project_doc/15A_Pre_Testing_Specification_Synchronization.md`;
4. read project documents relevant to the task;
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

Do not invent requirements, routes, schema fields, permissions, states, dependencies, infrastructure, or testing policy when authoritative sources can be read.

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

Tests follow specification, not implementation.

For applicable feature/bug/behavior changes, the requirement-derived RED test MUST be committed before the production implementation commit. Do not implement first and later reorder/rewrite history to manufacture TDD evidence.

MUST NOT:

- implement behavior first and manufacture a matching test afterward;
- weaken/delete/skip relevant assertions to make code pass;
- change expected business behavior without an approved specification change;
- mock away the behavior that needs proof;
- fabricate RED/GREEN evidence;
- fabricate RED through broken imports/fixtures/syntax;
- add test-only bypasses for real business/security rules.

Pure behavior-preserving refactors may use an existing GREEN safety net without an artificial RED test or RED commit.

---

## Current Testing / CI Baseline

Until `16_Testing_Specification.md` is created, these confirmed rules are mandatory:

```text
minimum global line coverage = 80%
PHPStan/Larastan = max, zero-baseline
TypeScript = strict
MySQL integration authority = real MySQL 8.4
Playwright PR browser = Chromium only
required failing test = remains FAIL; no automatic retry-as-pass
```

Every implementation PR must run applicable required gates, including:

- Laravel Pint;
- PHPStan/Larastan max;
- Pest;
- 80% minimum global line coverage;
- ESLint;
- Prettier check;
- vue-tsc / strict TypeScript;
- Vitest;
- MySQL 8.4 integration;
- Playwright Chromium critical journeys.

Coverage percentage is not proof of correctness. Critical business/security behavior still requires meaningful positive, negative, integration, and concurrency tests where applicable.

Mocks/fakes may support isolated tests but cannot be the only proof for real infrastructure contracts. CI must include real paths for:

- MySQL semantics where database behavior matters;
- ClamAV;
- cryptographic PDF signing/verification with non-production test identity;
- the qualified spreadsheet renderer once approved/qualified.

Production secrets/signing keys must never be used in CI.

### Flaky tests / retries

A failing required test MUST remain a failed gate. CI/test runners MUST NOT automatically retry until a later attempt passes and then treat the overall result as PASS.

Required direction:

```text
FAIL
→ diagnose root cause
→ make an intentional corrective change
→ rerun test/CI
```

A test that intermittently passes/fails without an intentional change is flaky and must be treated as a defect.

Logs, traces, screenshots, videos, and other diagnostics may be collected automatically; diagnostic collection does not change FAIL into PASS.

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

Controller remains thin and does not perform business persistence/orchestration or normal Repository/DB querying.

Form Requests validate HTTP input. Use validated/safe data; do not persist unfiltered request payloads.

Service owns use-case orchestration and transaction boundaries. Service does not issue Eloquent/Query Builder business queries directly.

Repository owns meaningful persistence/query mechanics only. It does not decide workflow, permission, or Team authorization.

Jobs/Commands enter business execution through Services.

Models do not orchestrate workflow.

Do not introduce a separate Actions layer, DTO architecture, generic BaseRepository, generic CRUD Service, or speculative abstraction hierarchy without an approved specification change.

---

## PHP / TypeScript Strictness

Every project-owned PHP source uses `declare(strict_types=1);` unless a narrow documented interoperability exception exists.

PHPStan/Larastan:

```text
level = max
baseline = zero-baseline policy
```

Do not lower analysis strictness, create a broad baseline, or add blanket suppressions merely to make CI pass.

Laravel Pint is PHP formatting authority.

TypeScript uses `strict: true`. Do not normalize broad `any`, `as any`, blanket `@ts-ignore`, or equivalent type escapes.

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

Archive, upload, export, security, and other technical statuses are separate and MUST NOT become NSCMF business states.

### Review / approval

- shared non-exclusive Reviewer and Approver pools;
- Team-neutral eligibility;
- one successful eligible Approver is sufficient;
- Emergency Change does not bypass workflow.

### Authentication/session

Preserve the locked password/session/re-auth rules from `10`/`14`. Do not add MFA, password composition, password expiry, or extend the confirmed re-auth window without an approved spec change.

---

## Validation / Concurrency

Draft/Revision may be incomplete. Action gates enforce their own validation.

Validation success does not equal authorization.

Use optimistic `record_version` where specified.

Workflow state changes use short Service-owned transactions with current-state revalidation/locking. Stale conflicting actions fail safely.

Do not hold workflow locks while performing long scanner/render/signing/file work.

---

## Attachments / Resumable Upload

Attachments remain optional and governed by `06`, `10`, `11A`, and `12`.

Storage is private. Current production baseline is persistent Laravel private local storage; do not silently introduce object storage.

Resumable upload uses locked 5 MiB chunks. Server accepted/missing state is authoritative. Client hashes are hints only. Final assembled SHA-256 is server authoritative.

Identical replay of an already accepted chunk is idempotent but is not new progress and must not indefinitely extend expiry.

Transport `COMPLETED` is not equivalent to attachment `CLEAN`.

Final usability requires whole-file malware scanning and explicit CLEAN. Scanner failure/timeout/unavailability/infection fails closed.

---

## XLSX / PDF

Official XLSX template is immutable/versioned/private and contains native Excel control/VML structures.

Do not generically rewrite the workbook if that can strip unsupported OOXML parts. Use targeted OOXML/package patching, preserve unrelated members, and validate structure/integrity.

PDF uses a qualified spreadsheet renderer, not approximate HTML.

Exports use immutable bound snapshots rather than later mutable record state.

Approved PDFs require System/Organization cryptographic signing. Human `Approved By` is distinct from cryptographic signer. Signing failure never produces unsigned Approved fallback.

Do not silently choose unresolved signer/renderer/scanner deployment details.

---

## Audit / Logging / Secrets

Business, Access, and Security Audits have no age-based purge.

Technical Logs are separate and follow their protected configurable cleanup policy. Technical-log cleanup must never delete authoritative audit/history/issuance evidence.

Never persist or expose secret plaintext, production signing material, production credentials, temporary passwords after their one-time lifecycle, or sensitive runtime values in source/client/log/audit/ordinary DB fields.

Do not expose secrets through frontend build variables or scatter environment lookups through business code.

---

## Database / Migrations

`project_doc/11_ERD_Database_Schema.md` is schema authority.

Do not create generic EAV/JSON business storage or hidden database workflow logic.

Once a migration becomes part of shared/applied history, it is immutable. Future schema evolution uses a new forward migration.

Do not use destructive migration shortcuts against shared, staging, or production data.

---

## Dependencies

Any new Composer/npm dependency not already approved by project specifications requires explicit user approval before addition, including development dependencies.

When requesting approval, explain package, purpose, runtime/dev classification, why existing stack is insufficient, material maintenance/security impact, and alternative without the dependency.

Keep `composer.lock` and `package-lock.json` synchronized and avoid unrelated lockfile churn.

---

## Generated / Runtime Artifacts

Generated output follows its authoritative source. Modify source first, regenerate with approved tooling, inspect the diff, then commit required generated output.

Do not hand-edit generated output to conceal mismatch.

Do not commit ordinary runtime/build/test artifacts, local environment secrets, private uploads/exports, or production signing material unless an approved project specification requires a specific generated artifact in Git.

The official immutable XLSX template is a controlled project input, not ordinary generated output.

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

Use meaningful branch prefixes such as `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/` where appropriate.

Commits use the user's/project's authenticated Git identity or configured signing mechanism where available.

Do not add ChatGPT, Codex, models, or other AI systems as contributor/co-author/generated-by metadata.

Do not claim a commit is cryptographically signed/Verified unless Git/GitHub actually reports it.

The coding agent may create/update branch/PR and fix CI/review findings, but MUST NOT approve or merge its own implementation PR or enable automation that bypasses human final merge control.

---

## Destructive Actions

Any operation that can materially erase data/work/history, overwrite immutable project assets, or rewrite shared repository/database history requires explicit user approval first.

A general implementation request is not blanket authorization for destructive shortcuts.

An isolated disposable test environment created specifically for automated tests may be reset only when safely scoped and containing no user/shared/production data.

---

## Verify Before Claiming Completion

Run checks appropriate to the change and inspect the final diff for unrelated edits, secrets, lockfile churn, generated/runtime files, weakened tests, debug code, and architecture drift.

After GitHub mutations, verify branch/commit/PR state.

Never claim tests, CI, file updates, commit signing, or export fidelity that were not actually verified.

---

## Agent Conduct

Do not hallucinate repository facts.

Do not perform unrelated refactors or speculative future work.

Do not create abstraction boilerplate merely because it looks enterprise.

Do not game tests, static analysis, coverage, or retry behavior.

Read failures and fix root causes rather than suppressing diagnostics.

Ask only for genuine unresolved decisions; do not re-ask decisions already documented.

If an approved requirement changes, synchronize affected project documentation, tests, implementation, and this root entrypoint where applicable.

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
11. generic-rewrite official XLSX and risk control loss;
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
22. weaken tests or game coverage;
23. fabricate/reorder TDD evidence after implementation;
24. automatically retry a failing required test until it passes and treat that as accepted PASS evidence;
25. add AI/model contributor metadata;
26. approve/merge the agent's own implementation PR;
27. claim work or verification that did not occur.

---

## Current Handoff

`project_doc/15_Coding_Rules_AGENTS.md` is authoritative for coding/developer/agent conduct.

`project_doc/15A_Pre_Testing_Specification_Synchronization.md` is the current authoritative testing synchronization overlay until `16` is explicitly created.

All previously identified pre-`16` testing-policy decisions are now resolved.

The next fixed-order project document is `16_Testing_Specification.md`.

Do not create `16` until the user explicitly instructs it.