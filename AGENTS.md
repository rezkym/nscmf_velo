# AGENTS.md — Project Alya / NSCMF

Operational entrypoint for coding agents.

**Full coding authority:** `project_doc/15_Coding_Rules_AGENTS.md`  
**Full testing authority:** `project_doc/16_Testing_Specification.md`  
**Full seed/bootstrap/demo-data authority:** `project_doc/17_Seed_Dummy_Data_Specification.md`

`project_doc/15A_Pre_Testing_Specification_Synchronization.md` is historical context whose material testing decisions are integrated into `16`.

This file is a synchronized operational summary. It MUST NOT override or weaken `project_doc`.

---

## Read Before Coding

Before modifying the repository:

1. read this file;
2. read `project_doc/15_Coding_Rules_AGENTS.md`;
3. read `project_doc/16_Testing_Specification.md` for testing/TDD/CI requirements;
4. read `project_doc/17_Seed_Dummy_Data_Specification.md` when seed/bootstrap/factory/demo/reference data is affected;
5. read project documents relevant to the task;
6. inspect affected code, tests, migrations, configuration, and current Git state.

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
15A Historical pre-testing synchronization
16 Testing / verification / CI authority
17 Seed / bootstrap / demo-data authority
```

Do not invent requirements, routes, schema fields, permissions, states, dependencies, infrastructure, testing policy, production Team master data, or seed data when authoritative sources can be read.

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

## Testing / CI Baseline

`project_doc/16_Testing_Specification.md` is authoritative.

Locked operational baseline:

```text
PHP project-owned application line coverage >= 80%
frontend instrumented project-owned application line coverage >= 80%
PHPStan/Larastan = max, zero-baseline
TypeScript = strict
MySQL integration authority = real MySQL 8.4
Playwright PR browser = Chromium only
required failing test = remains FAIL; no automatic retry-as-pass
```

Every implementation PR runs applicable required gates including Pint, PHPStan/Larastan max, Pest, coverage, ESLint, Prettier, vue-tsc, Vitest, MySQL 8.4 integration, Chromium critical journeys, real ClamAV, non-production cryptographic signing/verification, and real renderer/golden integration once a renderer is approved/qualified.

Coverage percentage is not proof of correctness. Critical business/security behavior still requires meaningful positive, negative, integration, and concurrency tests.

Mocks/fakes may support isolated tests but cannot be the only proof where `16` requires real integration.

A failing required test remains FAIL. Automatic retry until a later attempt passes MUST NOT convert the gate into accepted PASS evidence. Diagnose root cause, make an intentional correction, then run a fresh verification execution.

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

Jobs/Commands enter business execution through Services. Models do not orchestrate workflow.

Do not introduce a separate Actions layer, DTO architecture, generic BaseRepository, generic CRUD Service, or speculative abstraction hierarchy without approved change.

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
- Emergency Change does not bypass workflow;
- no mandatory segregation of duties.

### Authentication/session

Preserve locked password/session/re-auth rules from `10`/`14`. Do not add MFA, password composition, password expiry, or extend the confirmed re-auth window without approved change.

---

## Seed / Bootstrap / Demo Data

`project_doc/17_Seed_Dummy_Data_Specification.md` is authoritative.

### Production-safe bootstrap

Production-safe reference/bootstrap data includes:

- explicit canonical permission catalog;
- four canonical default roles: `Superadmin`, `Requester`, `Reviewer`, `Approver`;
- default role-permission bundles from `04`;
- `system_settings` singleton default only when missing: cleanup ON / 30 / DAY;
- operator-controlled Protected Superadmin bootstrap.

Production MUST NOT seed assumed Team master data.

Canonical Protected Superadmin bootstrap:

```text
username                = superadmin
name                    = Protected Superadmin
team_id                 = NULL
is_active               = true
is_protected_superadmin = true
must_change_password    = true
role                    = Superadmin
```

Its initial temporary password is random/server-generated, revealed once to the bootstrap operator, hash-only in persistence, never hard-coded, and MUST NOT be reset on ordinary seed rerun.

### Demo data

Local/development demo Teams:

```text
Demo Team Alpha
Demo Team Beta
Demo Team Gamma
```

Canonical demo accounts:

```text
demo.requester.a → Requester
demo.requester.b → Requester
demo.reviewer    → Reviewer
demo.approver    → Approver
demo.multi       → Reviewer + Approver
demo.disabled    → inactive Requester
```

Synthetic demo account password is exactly:

```text
password
```

It is allowed only for demo identities; hash-only persistence; demo accounts use `must_change_password=false` for repeatable exploration.

Production Demo Seeder is HARD BLOCKED. Staging demo execution is explicit opt-in only. Testing/CI MUST NOT depend on the shared Demo Seeder.

Canonical shared demo dataset contains 20 deterministic NSCMF scenarios:

```text
10 Activation-family
10 Change-family
```

It covers all six family/subtype values, all seven canonical lifecycle states, representative Reviewer/Approver Return/Reject/Forward/Approve flows, Reopen from Approved and Rejected, archive scenarios, multi-reviewer collaboration, no mandatory SoD, Change Result conditions, and all Change Service Impact enum values.

Demo Request Nos are manual deterministic identifiers:

```text
DEMO-ACT-001 ... DEMO-ACT-010
DEMO-CHG-001 ... DEMO-CHG-010
```

They MUST NOT consume/pollute the global monthly automatic Request No sequence.

All demo business values are synthetic. Use documentation-safe domains/IP ranges; never copy production customer, credential, service, network, attachment, audit, or secret data.

Default Demo Seeder MUST NOT fabricate:

- CLEAN attachment rows without real binary/scan;
- resumable accepted-chunk state without real stored bytes;
- READY exports without real artifact;
- signed PDF/issuance/hash/certificate evidence without real cryptographic flow;
- official template registry entries without actual template binary/hash/mapping.

Ordinary seed reruns must be idempotent/non-destructive: do not overwrite runtime system-setting changes, reset credentials, or silently rewrite existing demo/user business activity.

---

## Validation / Concurrency

Draft/Revision may be incomplete. Action gates enforce their own validation. Validation success does not equal authorization.

Use optimistic `record_version` where specified.

Workflow state changes use short Service-owned transactions with current-state revalidation/locking. Stale conflicting actions fail safely.

Do not hold workflow locks while performing long scanner/render/signing/file work.

Concurrency/locking behavior must be proven against real MySQL 8.4 semantics where it matters.

---

## Attachments / Resumable Upload

Attachments remain optional and governed by `06`, `10`, `11A`, `12`, and `16`.

Storage is private. Current production baseline is persistent Laravel private local storage; do not silently introduce object storage.

Resumable upload uses locked 5 MiB chunks. Server accepted/missing state is authoritative. Client hashes are hints only. Final assembled SHA-256 is server authoritative.

Identical replay of an accepted chunk is idempotent but not new progress and must not indefinitely extend expiry.

Transport `COMPLETED` is not attachment `CLEAN`.

Final usability requires whole-file malware scanning and explicit CLEAN. Scanner failure/timeout/unavailability/infection fails closed.

---

## XLSX / PDF

Official XLSX template is immutable/versioned/private and contains native Excel control/VML structures.

Do not generically rewrite the workbook if that can strip unsupported OOXML parts. Use targeted OOXML/package patching, preserve unrelated members, and validate structure/integrity.

PDF uses a qualified spreadsheet renderer, not approximate HTML.

Exports use immutable bound snapshots rather than later mutable record state.

Approved PDFs require System/Organization cryptographic signing. Human `Approved By` is distinct from cryptographic signer. Signing failure never produces unsigned Approved fallback.

Do not silently choose unresolved production signer/renderer/scanner deployment details.

---

## Audit / Logging / Secrets

Business, Access, and Security Audits have no age-based purge.

Technical Logs are separate and follow their protected configurable cleanup policy. Technical-log cleanup must never delete authoritative audit/history/issuance evidence.

Never persist or expose secret plaintext, production signing material, production credentials, temporary passwords after their one-time lifecycle, or sensitive runtime values in source/client/log/audit/ordinary DB fields.

The literal demo password `password` is intentionally public synthetic demo data and MUST NEVER be reused as a production credential.

Test/seed fixtures must not contain production secrets or copied production personal/business data.

---

## Database / Migrations

`project_doc/11_ERD_Database_Schema.md` is schema authority.

Do not create generic EAV/JSON business storage or hidden database workflow logic.

Once a migration becomes part of shared/applied history, it is immutable. Future schema evolution uses a new forward migration.

Do not use destructive migration shortcuts against shared, staging, or production data.

An isolated disposable test database may be reset only under the explicit disposable-test safety boundary from `15`/`16`.

A future demo reset may destroy only positively identified disposable demo data under `17` and destructive-action safeguards; it never authorizes arbitrary production/shared deletion.

---

## Dependencies

Any new Composer/npm dependency not already approved by project specifications requires explicit user approval before addition, including development dependencies.

This includes packages proposed for seed/faker/import convenience or frontend coverage.

Keep `composer.lock` and `package-lock.json` synchronized and avoid unrelated lockfile churn.

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

Commits use the user's/project's authenticated Git identity or configured signing mechanism where available.

Do not add ChatGPT, Codex, models, or other AI systems as contributor/co-author/generated-by metadata.

Do not claim a commit is cryptographically signed/Verified unless Git/GitHub actually reports it.

The coding agent may create/update branch/PR and fix CI/review findings, but MUST NOT approve or merge its own implementation PR or enable automation that bypasses human final merge control.

---

## Destructive Actions

Any operation that can materially erase data/work/history, overwrite immutable project assets, or rewrite shared repository/database history requires explicit user approval first.

A general implementation request is not blanket authorization for destructive shortcuts.

Production is never a disposable automated-test/demo-reset environment.

---

## Verify Before Claiming Completion

Run checks appropriate to the change and inspect the final diff for unrelated edits, secrets, lockfile churn, generated/runtime files, weakened tests, debug code, architecture drift, and accidental demo data exposure.

After GitHub mutations, verify branch/commit/PR state.

Never claim tests, CI, file updates, commit signing, export fidelity, seeding, or environment mutation that was not actually verified.

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
15. expose/persist Protected Superadmin temporary plaintext or signing secrets;
16. silently change locked authentication/session policy;
17. silently introduce new infrastructure/dependencies;
18. silently resolve a documented TBD;
19. rewrite shared/applied migration history;
20. perform destructive operations without explicit user approval;
21. lower static/type strictness to make CI pass;
22. weaken tests or game coverage;
23. fabricate/reorder TDD evidence after implementation;
24. retry required failing tests until a later pass masks the original failure;
25. use fake-only evidence where `16` requires real integration;
26. blindly regenerate golden/snapshot output;
27. add AI/model contributor metadata;
28. approve/merge the agent's own implementation PR;
29. invent production Team master data;
30. run Demo Seeder in production;
31. use literal demo password `password` as production bootstrap/user credential;
32. make tests depend on shared Demo Seeder;
33. fabricate CLEAN/READY/signed/issuance evidence in seed data;
34. reset Protected Superadmin password or runtime system settings during ordinary seed rerun;
35. claim work or verification that did not occur.

---

## Current Handoff

`project_doc/15_Coding_Rules_AGENTS.md` is authoritative for coding/developer/agent conduct.

`project_doc/16_Testing_Specification.md` is authoritative for testing/TDD evidence/coverage/CI verification.

`project_doc/17_Seed_Dummy_Data_Specification.md` is authoritative for bootstrap/reference seed, demo users/Teams/NSCMF scenarios, and environment seed safety.

The next fixed-order project document is `18_Definition_of_Done.md`.

Do not create `18` until the user explicitly instructs it.
