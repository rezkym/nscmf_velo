# AGENTS.md — Project Alya / NSCMF

Operational entrypoint for coding agents.

**Full coding authority:** `project_doc/15_Coding_Rules_AGENTS.md`  
**Full testing authority:** `project_doc/16_Testing_Specification.md`  
**Full seed/bootstrap/demo-data authority:** `project_doc/17_Seed_Dummy_Data_Specification.md`  
**Full Definition of Done authority:** `project_doc/18_Definition_of_Done.md`  
**Implementation order authority:** `project_doc/19_Task_Implementation_Plan.md`  
**Current local-first synchronization:** `project_doc/19A_Local_First_MVP_Synchronization.md`  
**Deployment architecture authority:** `project_doc/20_Deployment_Architecture.md`

`project_doc/14A_Pre_Coding_Rules_Synchronization.md` and `project_doc/15A_Pre_Testing_Specification_Synchronization.md` are historical synchronization context; material current rules are integrated into their later fixed-order authorities.

This file is a synchronized operational summary. It MUST NOT override or weaken `project_doc`.

---

## Read Before Coding

Before modifying the repository:

1. read this file;
2. read `project_doc/15_Coding_Rules_AGENTS.md`;
3. read `project_doc/16_Testing_Specification.md` for testing/TDD/CI requirements;
4. read `project_doc/18_Definition_of_Done.md` before claiming completion;
5. read `project_doc/19_Task_Implementation_Plan.md` for implementation order/dependencies;
6. read `project_doc/19A_Local_First_MVP_Synchronization.md` for current local-first interpretation;
7. read `project_doc/20_Deployment_Architecture.md` for local/Docker/future-server runtime placement and exposure boundaries;
8. read `project_doc/17_Seed_Dummy_Data_Specification.md` when seed/bootstrap/factory/demo/reference data is affected;
9. read all other project documents relevant to the task;
10. inspect affected code, tests, migrations, configuration, dependencies, and current Git state.

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
14A Historical pre-coding synchronization
15 Coding / developer / agent rules
15A Historical pre-testing synchronization
16 Testing / verification / CI
17 Seed / bootstrap / demo data
18 Definition of Done
19 Task implementation order / dependency plan
19A Local-first MVP cross-document synchronization
20 Deployment Architecture
```

Do not invent requirements, routes, schema fields, permissions, states, dependencies, infrastructure, testing policy, production Team master data, seed data, or completion evidence when authoritative sources can be read.

---

# Current Development Posture — LOCKED

Current priority:

```text
1. local native application compatibility and correctness — HIGH
2. Docker portability compatibility — MEDIUM
3. actual server deployment — LATER, after application is ready and a real server exists
```

Recommended current local runtime:

```text
Developer Machine
├── Laravel / PHP 8.5               → native local
├── Composer                         → native local
├── Vue / Vite / Node 24 LTS        → native local
├── Queue Worker                     → native local when needed
├── Scheduler                        → native/manual local when needed
├── Laravel private local storage   → local filesystem
│
└── Local Docker infrastructure
    ├── MySQL 8.4                   → approved/recommended local DB
    └── ClamAV / clamd              → add when Phase 6 begins
```

The application does **not** have to run inside Docker for normal development.

Docker compatibility is portability support, not a requirement to containerize local development or future production.

`20` defines the simple default future deployment as a **single native Linux server** with the required runtime components co-located unless a real later requirement explicitly changes the topology.

---

## Redis Is Not Used

Current locked baseline:

```text
Session = database
Cache   = database
Queue   = database
```

Do not introduce Redis merely because a Redis container is already available locally.

Redis requires a future explicit architecture/technology decision.

---

## Current MVP Infrastructure Scope

The following are deliberately **not current MVP requirements or blockers**:

```text
application uptime SLA
availability percentage target
High Availability / active-active
zero-downtime deployment requirement
load balancer architecture
Disaster Recovery architecture
RPO / RTO
backup architecture / backup policy design
production RPS/load target
application performance SLA target
capacity-based server sizing
Kubernetes / orchestration
multi-server scaling architecture
external observability platform selection
```

Do not treat those as unresolved TBDs to solve. They are out of current MVP scope unless the user explicitly reintroduces them later.

Important terminology boundary:

```text
Specific Requirements (SLA) → business/form field; KEEP
Performance Information      → business/form field; KEEP
Target KPI                    → business/form field; KEEP
```

Cleaning infrastructure SLA/performance language MUST NOT remove these NSCMF business concepts.

---

# TDD Is Mandatory

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

MUST NOT:

- implement behavior first and manufacture a matching test afterward;
- rewrite history to manufacture TDD chronology;
- weaken/delete/skip relevant assertions to make code pass;
- change expected behavior without an approved specification change;
- mock away the behavior that needs proof;
- fabricate RED/GREEN evidence;
- create fake RED through broken imports/fixtures/syntax;
- add test-only bypasses for real business/security rules.

Pure behavior-preserving refactors may use an existing GREEN safety net without artificial RED.

---

# Testing / CI Baseline

`project_doc/16_Testing_Specification.md` is authoritative.

Locked baseline:

```text
PHP project-owned application line coverage >= 80%
frontend instrumented project-owned application line coverage >= 80%
PHPStan/Larastan = max, zero-baseline
TypeScript = strict
MySQL integration authority = real MySQL 8.4
Playwright PR browser = Chromium only
required failing test remains FAIL; no automatic retry-as-pass
```

Applicable required gates include Pint, PHPStan/Larastan, Pest, coverage, ESLint, Prettier, vue-tsc, Vitest, MySQL 8.4 integration, Chromium critical journeys, and real infrastructure integration when that capability is actually implemented.

Real ClamAV becomes applicable when the attachment malware capability is implemented. Real renderer/golden qualification becomes applicable when PDF rendering is implemented. Real non-production cryptographic signing/verification becomes applicable when signing is implemented.

Early local phases are not blocked by later capability infrastructure before their own task phase.

## CI vs CD

CI remains mandatory and should stay simple:

```text
push / PR
→ install/build as applicable
→ lint / formatting
→ static analysis / type checks
→ tests / required integration gates
→ PASS or FAIL
```

Automated Continuous Deployment is **not** current MVP scope.

Do not build automatic staging/production deployment, registry promotion, blue/green, canary, GitOps, or automatic production rollback infrastructure unless a future explicit requirement adds it.

---

# Definition of Done

`project_doc/18_Definition_of_Done.md` is authoritative.

Layered completion remains:

```text
Task / Pull Request Done
→ Feature / Module Done
→ Release / Production-Ready Done
```

Operational rules:

- every implementation PR requires at least one human review before merge;
- security-sensitive implementation changes require explicit human security review;
- current accessibility direction is WCAG-AA-like, not formal WCAG certification;
- a required gate that did not run cannot be claimed PASS;
- genuine N/A requires a real scope-based reason;
- real blocking TBDs may block the affected capability, but concerns removed by `19A`/`20` are not TBDs to solve;
- staging/production evidence applies when the project actually attempts the corresponding Release/Production-Ready claim; ordinary local feature work is not blocked because physical staging/production servers do not yet exist.

HA/SLA/DR/RPO/RTO/backup architecture/load targets are not current completion blockers.

---

# Backend Architecture

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

Form Requests validate HTTP input. Use validated/safe data; never persist unfiltered request payloads.

Service owns use-case orchestration and transaction boundaries. Service does not issue Eloquent/Query Builder business queries directly.

Repository owns meaningful persistence/query mechanics only. It does not decide workflow, permission, or Team authorization.

Jobs/Commands enter business execution through Services. Models do not orchestrate workflow.

Do not introduce Actions, DTO architecture, generic BaseRepository, generic CRUD Service, or speculative abstraction hierarchy without approved change.

---

# Locked Product / Security Guardrails

## Organization / authorization

- single organization / installation;
- Team is organizational metadata only;
- Team never authorizes Review/Approval;
- no Unit, Division, Reviewer Scope, or Approval Scope;
- Spatie Teams disabled;
- wildcard permissions disabled;
- permission-centric authorization;
- no universal Superadmin business/security bypass.

## Canonical NSCMF states

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

## Review / approval

- shared non-exclusive Reviewer and Approver pools;
- Team-neutral eligibility;
- one successful eligible Approver is sufficient;
- Emergency Change does not bypass workflow;
- no mandatory segregation of duties.

## Authentication/session

Preserve locked password/session/re-auth rules from `10`/`14`. Do not add MFA, password composition, password expiry, or alter the confirmed re-auth window without approved change.

---

# Attachments / ClamAV

Attachments are optional. Resumable upload uses locked 5 MiB chunks, server-authoritative accepted/missing state, 24h inactivity retention based on newly accepted progress, and server-computed final SHA-256.

Transport `COMPLETED` is not attachment `CLEAN`.

Final usability requires a **whole-file ClamAV scan and explicit CLEAN**. Scanner failure/timeout/unavailability/infection fails closed.

ClamAV is mandatory MVP for the attachment capability but is intentionally implemented later in **Phase 6**, not during initial bootstrap.

For local development, local Docker `clamd` is the preferred simple direction when Phase 6 begins.

For the future default native-server deployment, `20` places private `clamd` on the same server. Do not invent a ClamAV cluster or separate scanner service without a new requirement.

---

# XLSX / PDF Renderer

Official XLSX template is immutable/versioned/private and contains native Excel control/VML structures.

Do not generic-rewrite the workbook if that can strip OOXML parts. Use targeted package patching and structural validation.

PDF uses a qualified spreadsheet renderer, not approximate HTML.

Current first renderer candidate is:

```text
LibreOffice Headless
```

LibreOffice is **not automatically qualified**. When Phase 8 is reached:

```text
render official workbook
→ compare fidelity/layout/control-visible result/fonts/page behavior
→ PASS: qualify and use it
→ material FAIL: reject it and evaluate the next option
```

Do not pre-build multiple renderers and do not lower fidelity requirements to force LibreOffice to pass.

If qualified, `20` places LibreOffice Headless on the same future native server by default.

---

# Approved PDF Signing / Public Verification

Approved PDFs require System/Organization cryptographic signing. Human `Approved By` is distinct from the cryptographic signer. Signing failure never produces an unsigned Approved PDF.

Current MVP trust objective is application/Organization trust through `/ispdfvalid`.

Public CA / Adobe-reader trusted status is **not current MVP scope**.

A dedicated self-managed/non-public Organization certificate/key is acceptable provided cryptographic verification works and `/ispdfvalid` recognizes the verification material correctly.

Do not require public CA procurement, Adobe trust-list integration, TSA, or enterprise PKI architecture for current MVP.

`/ispdfvalid` is the only approved public no-login application capability. It does not make the rest of NSCMF public.

Keep Login, Dashboard, workflow, History, Administration, attachments, exports management, Timeline, audits, and internal JSON endpoints private/internal.

Do not split the validator into a microservice merely because it is public.

`20` defines one application runtime with separate internal/public ingress contexts; public ingress routes only the validator capability.

---

# Seed / Bootstrap / Demo Data

`project_doc/17_Seed_Dummy_Data_Specification.md` is authoritative.

Production-safe reference/bootstrap data includes canonical permissions/roles/bundles, typed system-settings default when missing, and operator-controlled Protected Superadmin bootstrap.

Production MUST NOT seed assumed Team master data.

Protected Superadmin bootstrap:

```text
username                = superadmin
name                    = Protected Superadmin
team_id                 = NULL
is_active               = true
is_protected_superadmin = true
must_change_password    = true
role                    = Superadmin
```

Initial temporary password is random/server-generated, revealed once, hash-only in persistence, never hard-coded, and never automatically reset on ordinary rerun.

Demo data is local/development only by default; production Demo Seeder is HARD BLOCKED; staging demo is explicit opt-in; testing/CI must not depend on shared demo seed.

Do not fabricate CLEAN attachments, accepted chunks, READY exports, signed PDFs/issuance evidence, or official-template registry rows without real underlying evidence.

---

# PHP / TypeScript Strictness

Every project-owned PHP source uses `declare(strict_types=1);` unless a narrow documented interoperability exception exists.

PHPStan/Larastan:

```text
level = max
baseline = zero-baseline policy
```

Do not lower analysis strictness or create broad suppressions to make CI pass.

Laravel Pint is PHP formatting authority.

TypeScript uses `strict: true`. Do not normalize broad `any`, `as any`, blanket `@ts-ignore`, or equivalent type escapes.

---

# Database / Migrations

`project_doc/11_ERD_Database_Schema.md` is schema authority.

MySQL 8.4 is the integration authority.

Do not create generic EAV/JSON business storage or hidden DB workflow logic.

Once a migration becomes part of shared/applied history, it is immutable. Future schema evolution uses a new forward migration.

Do not use destructive migration shortcuts against shared, staging, or production data.

An isolated disposable test database may be reset only under the explicit disposable-test safety boundary from `15`/`16`.

---

# Dependencies

Any new Composer/npm dependency not already approved by project specifications requires explicit user approval before addition, including development dependencies.

Keep `composer.lock` and `package-lock.json` synchronized and avoid unrelated lockfile churn.

---

# Git / Pull Request Rules

Normal flow:

```text
main
→ scoped branch
→ Conventional Commits
→ Pull Request
→ CI/review
→ human final merge
```

Do not add ChatGPT, Codex, models, or other AI systems as contributor/co-author/generated-by metadata.

Do not claim commit signing/Verified status unless Git/GitHub actually reports it.

The coding agent may create/update branch/PR and fix CI/review findings, but MUST NOT approve/merge its own implementation PR or enable automation that bypasses human final merge control.

---

# Destructive Actions

Any operation that can materially erase data/work/history, overwrite immutable project assets, or rewrite shared repository/database history requires explicit user approval first.

A general implementation request is not blanket authorization for destructive shortcuts.

---

# Critical MUST NOT Summary

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
15. expose/persist temporary credentials or signing secrets outside their permitted lifecycle;
16. silently change locked authentication/session policy;
17. silently introduce new infrastructure/dependencies;
18. silently resolve a genuine documented TBD;
19. rewrite shared/applied migration history;
20. perform destructive operations without explicit user approval;
21. lower static/type/testing strictness to make CI pass;
22. fabricate test/CI/staging/renderer/signing/security/review evidence;
23. merge/approve your own implementation PR;
24. introduce Redis merely because it is locally available;
25. force the whole application into Docker when local-native development is the current primary target;
26. design HA/load-balancer/DR/RPO/RTO/backup architecture/application SLA/load targets for current MVP;
27. treat those removed concerns as unresolved blockers;
28. remove business `Specific Requirements (SLA)` or `Performance Information` while cleaning infrastructure terminology;
29. remove/bypass ClamAV because it is implemented later;
30. treat LibreOffice as qualified before fidelity testing;
31. pre-build multiple renderers without need;
32. require public CA/Adobe trust for current signing MVP;
33. build automated CD infrastructure when only CI is required;
34. expose internal NSCMF functions publicly because `/ispdfvalid` is public;
35. replace the simple single-native-server default from `20` with speculative multi-server/container-orchestration infrastructure without a new requirement.

---

# Current Handoff

The fixed-order documentation set is complete through:

```text
20_Deployment_Architecture.md
```

Current local-first cross-document synchronization:

```text
project_doc/19A_Local_First_MVP_Synchronization.md
```

Current deployment authority:

```text
project_doc/20_Deployment_Architecture.md
```

The next project step is implementation according to `19_Task_Implementation_Plan.md`:

```text
Phase 0
→ T00 Bootstrap Laravel 13 / PHP 8.5 application
```

Do **not** begin coding until the user explicitly instructs implementation.
