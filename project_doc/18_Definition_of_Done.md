# Definition of Done

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-DOD-018  
> **Document Order:** 18 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `17_Seed_Dummy_Data_Specification.md`  
> **Canonical Application / Review Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02  

---

## 1. Purpose

Dokumen ini adalah **source of truth authoritative untuk menentukan kapan implementation work NSCMF boleh disebut Done**.

`18_Definition_of_Done.md` tidak mendesain ulang product, business rule, workflow, RBAC, security, schema, API, architecture, testing strategy, seed data, atau physical deployment. Dokumen ini menggabungkan requirement yang sudah authoritative di `01–17` menjadi completion gates yang dapat dipakai manusia maupun coding agent untuk menilai:

```text
Task / Pull Request Done
Feature / Module Done
Release / Production-Ready Done
```

Tujuan utamanya:

1. mencegah work disebut selesai hanya karena code sudah ditulis;
2. memastikan specification, TDD, test, security, architecture, database, UI/API, documentation, dan review telah dipenuhi pada level yang relevan;
3. memastikan bukti completion bersifat nyata dan dapat direview, bukan klaim;
4. membedakan completion pada level PR, feature/module, dan release;
5. memastikan human final control tetap ada;
6. mencegah required gate diubah menjadi `N/A` tanpa alasan yang sah;
7. mencegah unresolved/TBD requirement ditebak untuk mengejar status Done;
8. memberikan satu checklist operasional yang tetap tunduk kepada authority spesifik dari `01–17`.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — default kuat; penyimpangan harus memiliki alasan yang dapat direview.
- **MAY** — diperbolehkan.
- **DONE** — seluruh gate yang applicable pada level tersebut telah dipenuhi dan memiliki evidence yang benar.
- **APPLICABLE** — gate memang relevan terhadap scope/perubahan/capability yang sedang dinilai.
- **N/A** — gate benar-benar tidak relevan; alasan harus dapat dijelaskan, bukan digunakan untuk menghindari failure.
- **BLOCKER** — kondisi yang mencegah level completion dinyatakan Done.
- **EVIDENCE** — hasil test, CI, review, artifact, diff, command output, staging verification, atau bukti lain yang benar-benar terjadi dan dapat ditelusuri.
- **TBD** — keputusan belum disetujui dan tidak boleh ditebak.

---

# PART A — AUTHORITY / BOUNDARY

## 3. Definition of Done Does Not Redefine Upstream Truth

`18` menentukan **completion gate**, bukan expected business behavior.

Jika ada konflik antara checklist `18` dan authority yang lebih spesifik, authority spesifik mengendalikan behavior dan `18` harus disinkronkan.

Canonical authority remains:

| Concern | Authority |
|---|---|
| Product scope | `01_PRD.md` |
| Business rules | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| RBAC / Team boundary | `04_RBAC_Permission_Matrix.md` |
| State / workflow | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology / baseline method | `08_Tech_Stack_Specification.md` |
| Logical architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Database schema | `11_ERD_Database_Schema.md`, `11A` |
| API / HTTP contract | `12_API_Contract.md` |
| Repository–Service synchronization | `12A` |
| Project structure | `13_Project_Structure.md` |
| Environment / runtime readiness | `14_Environment_Specification.md` |
| Coding / developer / agent conduct | `15_Coding_Rules_AGENTS.md` |
| Testing / TDD / CI | `16_Testing_Specification.md` |
| Seed / bootstrap / demo data | `17_Seed_Dummy_Data_Specification.md` |
| **Completion / Done classification** | **`18_Definition_of_Done.md`** |

Later fixed-order authorities are now available and authoritative:

```text
19_Task_Implementation_Plan.md
20_Deployment_Architecture.md
```

## 4. Evidence Over Assertion

A statement such as:

```text
"tests pass"
"CI green"
"renderer matches"
"security handled"
"migration safe"
"staging verified"
```

is not completion evidence unless the corresponding activity actually occurred.

Agent/developer MUST NOT fabricate:

- RED/GREEN chronology;
- test/CI execution;
- coverage result;
- human review;
- manual validation;
- staging validation;
- ClamAV integration;
- cryptographic signing/verification;
- renderer fidelity;
- deployment readiness;
- commit signing/Verified status.

## 5. Applicable Gate Principle

Not every task runs every possible project capability, but any applicable gate remains mandatory.

Required direction:

```text
identify affected requirement/capability
→ determine applicable gates
→ execute/verify those gates
→ document evidence
→ only then claim Done
```

Forbidden direction:

```text
required gate is difficult/unavailable
→ mark N/A
→ claim Done
```

When a required gate cannot currently be executed because a prerequisite decision/provider/tool is genuinely unresolved, the work may be partially implemented, but the affected completion level MUST NOT be falsely declared complete.

## 6. TBD Handling

A documented TBD has three possible effects:

1. **not relevant to current scope** → does not block that Task/PR;
2. **required to complete current feature/capability** → blocks Feature/Module Done;
3. **required for safe production operation** → blocks Release / Production-Ready Done.

TBD values MUST NOT be silently guessed to clear a gate.

Examples that remain genuinely implementation-time include LibreOffice Headless qualification/runtime tuning, concrete signing library/key-container mechanics, finite ClamAV timeout tuning from real integration, and exact operational rate-limit numeric buckets. Deployment topology itself is already defined by `20`.

---

# PART B — LAYERED DEFINITION OF DONE

## 7. Three Completion Levels — LOCKED

NSCMF uses layered Definition of Done:

```text
Level 1 — Task / Pull Request Done
Level 2 — Feature / Module Done
Level 3 — Release / Production-Ready Done
```

A higher level inherits all relevant lower-level gates.

Conceptually:

```text
Task/PR Done
      ↓
all constituent work integrated
      ↓
Feature/Module Done
      ↓
release candidate + production-like staging/readiness validation
      ↓
Release / Production-Ready Done
```

One successful PR does not automatically mean a whole feature is Done.

One completed feature does not automatically mean the application is production-ready.

---

# PART C — LEVEL 1: TASK / PULL REQUEST DONE

## 8. Requirement / Scope Gate

A Task/PR is not Done unless:

- requested behavior maps to approved project specification or explicit user instruction;
- affected authorities were inspected before implementation;
- no undocumented business/security behavior was invented;
- no unrelated refactor/churn was bundled into the task;
- genuine contradictions/TBDs were surfaced rather than guessed;
- implementation scope is coherent and reviewable.

If an unrelated defect is discovered, it does not automatically become scope. It should be reported and only fixed when required for the requested work or explicitly approved.

## 9. TDD Integrity Gate

For new behavior, bug fix, or behavior-changing implementation, `15` and `16` apply fully.

Required evidence:

```text
approved requirement
→ requirement-derived automated test first
→ targeted execution
→ meaningful RED
→ RED test commit
→ minimum correct implementation
→ targeted GREEN
→ implementation commit
→ relevant regression suite
```

The PR MUST preserve truthful chronology.

A fake RED caused by syntax error, broken fixture/import, bootstrap failure, or unrelated environmental crash does not satisfy the gate.

Pure behavior-preserving refactor may use the approved exception:

```text
relevant suite GREEN before
→ refactor
→ relevant suite GREEN after
```

No artificial RED is required in that case.

## 10. Test / CI Gate

All applicable required tests and checks from `16` MUST pass before an implementation PR is considered Done/merge-eligible.

Applicable baseline includes:

```text
Laravel Pint
PHPStan / Larastan max
Pest backend tests
PHP project-owned application line coverage >= 80%
ESLint
Prettier check
vue-tsc / TypeScript strict
Vitest frontend tests
frontend instrumented project-owned application line coverage >= 80%
MySQL 8.4 integration where applicable
Playwright Chromium critical journeys where applicable
real ClamAV integration where applicable
real non-production cryptographic signing/verification where applicable
real renderer/golden integration once renderer is selected/qualified and capability is affected
reproducible application build
```

If enabling frontend coverage still requires an unapproved third-party coverage provider, the project MUST NOT falsely report that missing gate as active/passing. Dependency approval remains governed by `15` and `16`.

A failing required test remains FAIL.

Automatic retry until a later attempt happens to pass MUST NOT be accepted as the original gate passing.

## 11. Test Quality Gate

Coverage percentage alone is insufficient.

Critical behavior MUST have meaningful requirement-level tests, including positive/negative or integration/concurrency evidence where required.

A Task/PR is not Done when tests merely execute code without proving the expected rule.

Tests MUST NOT be weakened, deleted, skipped, quarantined, or over-mocked merely to obtain a green result.

## 12. Architecture Gate

Implementation MUST preserve the approved backend architecture:

```text
Controller + Form Request
        ↓
Service
        ↓
Repository Contracts + Domain Rules + Infrastructure Contracts
        ↓
Eloquent Repository Implementations + Concrete Adapters
```

Applicable architecture completion checks include:

- Controller remains thin;
- Controller does not own normal business DB/Repository orchestration;
- Service owns use-case/transaction orchestration;
- Service does not issue Eloquent/Query Builder business queries directly;
- Repository owns persistence mechanics, not workflow/authorization decisions;
- Jobs/Commands enter business execution through Services;
- Models do not orchestrate workflow;
- no Actions orchestration layer is reintroduced;
- no generic BaseRepository / generic CRUD Service is introduced;
- no DTO-per-endpoint architecture is introduced without approval;
- Team remains metadata, never Reviewer/Approver authorization scope.

Architecture tests should enforce inexpensive structural invariants where practical.

## 13. Code Quality / Type Safety Gate

Applicable completion requires:

- project-owned PHP uses `declare(strict_types=1);` except narrow documented interoperability exception;
- PHPStan/Larastan remains `max` with zero-baseline policy;
- TypeScript remains strict;
- no broad `any`, `as any`, blanket `@ts-ignore`, `@ts-nocheck`, PHPStan baseline, or broad ignore introduced simply to make CI pass;
- Pint remains PHP formatting authority;
- code is understandable and scoped;
- stale debug/temp/dead experimental code created by the task is removed.

## 14. Dependency Gate

Any new Composer/npm dependency not already approved MUST receive explicit user approval before addition.

A Task/PR is not Done if it silently introduces an unapproved runtime or dev dependency.

Lockfiles MUST remain synchronized and free from unrelated churn.

## 15. Database / Migration Gate

When persistence/schema is affected:

- schema remains aligned with `11`/`11A`;
- shared/applied historical migrations are not rewritten;
- schema evolution uses new forward migrations;
- MySQL 8.4 semantics are verified where relevant;
- required keys/FKs/indexes/constraints are tested;
- destructive shortcuts are not used against shared/staging/production data;
- destructive operations require explicit approval under `15`;
- migration behavior does not silently invent new authoritative JSON/EAV storage.

A migration that merely runs locally is not sufficient evidence if the requirement depends on MySQL-specific semantics.

## 16. Security / Authorization Gate

Every applicable mutation/read must preserve server-authoritative authorization, resource/state/security checks, and the locked rules in `10`.

Where relevant, completion requires meaningful negative tests for unauthorized/invalid-state access.

UI hiding alone is never authorization proof.

A Task/PR is not Done if it:

- creates a universal Superadmin business/security bypass;
- makes Team an authorization scope;
- weakens password/session/re-auth policy;
- leaks secrets/private paths/temporary passwords;
- weakens audit requirements;
- exposes private attachment/export content incorrectly;
- creates an unsigned Approved-PDF fallback;
- bypasses malware scanning/security gates;
- adds a security behavior that exists only in frontend code.

## 17. Human Security Review Gate — LOCKED

In addition to automated testing, an implementation PR MUST receive explicit **human security review** when it materially changes any of these sensitive areas:

```text
authentication / session / credential lifecycle
RBAC / permission / authorization
protected Superadmin invariants
attachment upload / private storage / malware scanning
PDF signing / verification / public validator
secret/configuration handling
Business / Access / Security Audit behavior
privileged administration / sensitive re-auth
security-sensitive concurrency or state transition enforcement
```

This security review is additional to the general human implementation review.

It does not require a separate formal security team/person when project governance has not defined one; however the review itself must be performed by a human and must specifically consider the security-sensitive change.

An AI/coding agent MUST NOT self-certify this gate.

## 18. API / HTTP Gate

When API/HTTP behavior is affected:

- route/method/status semantics match `12`;
- JSON envelope remains canonical where JSON is used;
- errors use appropriate 4xx/5xx semantics rather than false-success 200;
- session + CSRF remains internal web auth baseline;
- no unapproved JWT/Bearer API baseline is introduced;
- stale `record_version`/state conflict remains safe and uses required conflict semantics;
- long scanner/render/sign/file operations are not executed while workflow locks are held;
- client-provided state/permission/hash is not treated as authority.

## 19. UI / UX Gate

When user-facing UI is affected:

- behavior matches `07` and current approved visual/flow references;
- action visibility does not replace backend authorization;
- business state labels remain canonical;
- Archive/upload/export/security technical statuses remain separate from NSCMF business states;
- validation error/warning behavior remains consistent;
- optimistic conflict/autosave UI does not falsely report success;
- loading/failure/security states are understandable;
- responsive behavior preserves critical usability where applicable.

## 20. Accessibility Gate — LOCKED MVP BASELINE

Current MVP completion target remains the existing **WCAG-AA-like readability/accessibility direction** from `07`, not formal certification.

Applicable UI work should preserve:

- visible focus;
- keyboard-accessible dialogs/actions;
- meaningful form labels;
- understandable errors;
- meaning not conveyed by color alone;
- readable enterprise UI treatment.

NSCMF MUST NOT claim formal WCAG 2.1/2.2 AA conformance/certification unless a later approved requirement establishes the exact conformance target and verification process.

## 21. Attachment / Resumable Upload Gate

When attachment/upload is affected, completion MUST preserve applicable locked behavior including:

```text
optional attachments
max 10 active final attachments
max 20 MB final file
5 MiB chunk size
1-based chunk numbering
24h inactivity expiry since newly accepted progress
server-authoritative accepted/missing chunks
byte-identical duplicate replay = idempotent duplicate
same index + different bytes = conflict
server-computed final SHA-256 authority
private durable storage
whole-file ClamAV scan
explicit CLEAN before usability
transport COMPLETED != security CLEAN
```

Tests must prove fail-closed behavior where scanner failure/timeout/unavailability matters.

Chunk-only scanning is never accepted as final whole-file malware proof.

## 22. Workflow / Concurrency Gate

When workflow/state is affected:

- only the seven canonical business states exist;
- transition source/destination remains authoritative;
- shared/non-exclusive Reviewer/Approver model remains intact;
- one eligible successful Approver is sufficient;
- Team does not grant/restrict Reviewer/Approver eligibility;
- Emergency Change has no workflow bypass;
- Reopen/iteration/archive semantics remain intact;
- first valid concurrent transition wins;
- stale conflicting second action fails safely;
- `record_version` and row-lock behavior is verified against real MySQL 8.4 where applicable.

## 23. Export / XLSX / PDF Gate

When export is affected, completion MUST preserve:

- asynchronous export;
- immutable bound export snapshot;
- worker does not reread later mutable business state;
- READY binary retention remains 168 hours;
- issuance/history evidence is not erased when artifact expires;
- official workbook remains immutable/versioned presentation authority;
- targeted OOXML/package patching preserves unrelated ZIP members and required control/VML structures;
- mapping is explicit, not guessed;
- authoritative PDF uses qualified workbook rendering, never HTML approximation;
- Approved PDF requires System/Organization cryptographic signing;
- signing failure produces FAILED export while NSCMF stays APPROVED;
- no unsigned Approved-PDF fallback.

Until the concrete renderer is selected/qualified, renderer-dependent production readiness remains unresolved rather than silently passing.

Until concrete signing provider/key mechanics are approved, provider-dependent production readiness remains unresolved rather than silently passing.

## 24. Public PDF Validator Gate

When validator behavior is affected:

- only PDF input is accepted;
- max upload remains 20 MB;
- temporary storage remains private;
- ClamAV CLEAN occurs before verification;
- exact uploaded-byte SHA-256 is used;
- PDF signature/issuance/currentness are validated;
- canonical results remain:
  - `VALID_CURRENT`;
  - `VALID_SUPERSEDED`;
  - `INVALID_MODIFIED`;
  - `UNKNOWN`;
- public response remains minimum-disclosure;
- human actors, Team, form body, attachments, audit, storage path, private signing data are not disclosed;
- rate limiting exists even while exact numeric bucket remains TBD.

## 25. Audit / Logging / Scheduler Gate

When affected:

- Business/Access/Security Audit evidence remains authoritative and not age-purged;
- Technical Logs remain a separate concern;
- Technical Log cleanup respects current typed `system_settings` value;
- cleanup never deletes authoritative audit/history/issuance evidence;
- scheduler cleanup does not auto-advance business workflow or fabricate CLEAN/COMPLETED state;
- timestamps use the authoritative Asia/Jakarta business context where specified.

## 26. Seed / Bootstrap / Demo Gate

When seed/factory/demo/bootstrap behavior is affected, completion MUST preserve `17`:

- production-safe reference/bootstrap is separable from Demo Seed;
- Production Demo Seeder is hard-blocked in code;
- Staging Demo Seed is explicit opt-in only;
- testing/CI does not depend on shared Demo Seeder;
- no production Team master data is invented;
- Protected Superadmin bootstrap uses random one-time temporary credential and does not reset it on ordinary rerun;
- existing runtime `system_settings` are not silently overwritten;
- demo data remains synthetic/deterministic;
- demo password `password` is never production credential;
- no fabricated CLEAN attachment, READY export, signature, issuance, hash, certificate, or template evidence is created without real underlying artifact/integration evidence.

## 27. Documentation Gate — LOCKED

An implementation PR does **not** need to modify documentation merely to satisfy a ritual checklist.

Documentation MUST be updated when the approved implementation changes or materially clarifies an affected authoritative concern such as:

```text
business behavior
workflow/state
permission/authorization
validation
UI/UX contract
API/HTTP contract
database schema
architecture
security
runtime/configuration
testing requirement
seed/bootstrap behavior
operational requirement
Definition of Done itself
```

Pure internal refactor, implementation detail, or bug fix that does not change the authoritative contract does not require meaningless project-document churn.

When documentation changes are required, affected authorities MUST be synchronized before the work is considered Done.

Root `AGENTS.md` must be synchronized when coding/testing/seed/DoD operational guidance materially changes.

## 28. Git / PR Hygiene Gate

Before Task/PR Done:

- diff is scoped and reviewed for unrelated edits;
- commits follow Conventional Commits;
- RED/implementation chronology remains truthful where TDD applies;
- no production secret/private runtime artifact is committed;
- no AI/model contributor/co-author/generated-by metadata is added;
- no unapproved shared-history rewrite occurs;
- no unapproved destructive change is hidden in the diff;
- lockfile/generated-file churn is intentional and applicable;
- final branch/commit/PR state is verified after repository mutation.

## 29. Human Implementation Review Gate — LOCKED

Every **implementation PR** MUST receive at least one human review before merge.

The coding/AI agent:

- MAY create/update branch/commit/PR;
- MAY respond to review feedback;
- MAY fix CI/review findings;
- MUST NOT approve its own implementation PR;
- MUST NOT merge its own implementation PR;
- MUST NOT enable auto-merge or equivalent bypass of human final control.

The human review should evaluate the scope, specification alignment, evidence, risk, and implementation quality appropriate to the change.

Documentation-only PRs remain subject to human final merge control under `15`; this section's explicit mandatory implementation-review gate is specifically for implementation PRs.

## 30. Manual Functional Review Is Risk/Capability-Based

Manual functional testing is **not mandatory for every implementation PR** merely because a human review is required.

Manual functional validation becomes applicable where behavior, UX, output fidelity, or real integration cannot be responsibly assessed from automated evidence alone.

Examples may include:

- significant user-facing interaction/flow change;
- visual rendering/fidelity review;
- environment-specific integration behavior;
- release-candidate operational validation.

Manual review complements automated tests; it MUST NOT replace required automated gates.

---

# PART D — LEVEL 2: FEATURE / MODULE DONE

## 31. Feature / Module Completion

A Feature/Module is Done only when:

1. every constituent implementation PR/task required by the feature is Task/PR Done;
2. feature behavior is complete against the approved specification;
3. cross-task integration works as one coherent capability;
4. relevant end-to-end user journey is verified;
5. relevant negative/authorization/error paths are verified;
6. shared persistence/schema/contracts are integrated;
7. no unresolved blocker remains inside the feature scope;
8. required feature-level documentation is synchronized;
9. required security review has occurred for sensitive feature changes;
10. feature does not depend on a hidden manual workaround to provide expected behavior.

## 32. Feature Integration Gate

Feature-level verification MUST consider interactions that isolated PRs may not prove individually.

Examples:

```text
Requester create/save/submit
→ Reviewer review/return/forward
→ Requester revision/resubmit
→ Approver action
→ History/timeline
→ export/validation where part of feature
```

Other capability-specific feature integration includes upload resume, queue processing, lifecycle iteration, public validation, administration, or seed/bootstrap flows where relevant.

## 33. Cross-Layer Contract Consistency

A feature is not Done if backend, frontend, DB, API, tests, and documentation describe different behavior.

Examples of blockers:

- UI exposes an action backend does not authorize;
- API enum/state differs from DB/domain enum;
- migration/schema differs from ERD authority;
- test expectation contradicts business rule;
- frontend assumes Team scope while backend is permission-centric;
- exporter uses a later live record rather than the bound snapshot;
- seed data fabricates impossible lifecycle evidence.

## 34. No Hidden Manual Completion

A feature is not Done when the expected user capability only works after undocumented manual DB editing, file copying, queue manipulation, permission override, or another operator workaround that is not part of the approved design.

A documented operator provisioning step that is intentionally part of an unresolved/deployment-bound capability is different; however that capability cannot be called production-ready until its required provisioning/readiness contract exists.

---

# PART E — LEVEL 3: RELEASE / PRODUCTION-READY DONE

## 35. Release / Production-Ready Meaning

Release / Production-Ready Done means the selected release candidate is not only code-complete but has been validated in the approved production-like environment and all currently required production capabilities have the evidence needed to operate safely.

It does not mean every future enhancement/TBD has been resolved.

It does mean every TBD required by the release's mandatory production behavior has either been resolved or explicitly blocks production-ready status.

## 36. Release Candidate Gate

Release verification MUST be bound to a specific release-candidate code revision/commit so evidence cannot silently refer to different code.

If code changes materially after validation, affected verification MUST be rerun against the new candidate.

## 37. Staging Validation Gate — LOCKED

Staging validation is **not required for every Task/PR Done**.

It is mandatory for **Release / Production-Ready Done** and for any capability-specific completion claim that can only be truthfully proven in the production-like staging environment.

Staging follows `14` and should mirror production configuration classes closely enough to validate applicable:

```text
HTTPS/session security
persistent private storage
real ClamAV
MySQL 8.4
DB queue/worker
scheduler
exact export pipeline
qualified renderer
non-production signing identity
cleanup behavior
runtime configuration/readiness
```

Staging uses non-production secrets and non-production signing identity.

## 38. Production Configuration Readiness Gate

Before Production-Ready Done, the release MUST have all required configuration contracts documented/available without committing production secrets.

Applicable readiness includes:

- `APP_DEBUG=false` for staging/production;
- HTTPS/security header/cookie behavior;
- least-privilege production DB account model;
- persistent private storage;
- database session/cache/queue;
- queue worker and scheduler capability;
- real ClamAV;
- qualified renderer;
- protected production signing identity mechanism;
- safe secret injection;
- Technical Log cleanup according to typed runtime setting.

Exact physical topology belongs to `20_Deployment_Architecture.md` and MUST NOT be invented in `18`.

## 39. Mandatory Capability Blockers

Because Approved PDF signing and qualified workbook rendering are mandatory product/security behavior, a release that requires those capabilities cannot be declared Production-Ready while the corresponding concrete provider/runtime qualification remains unresolved.

Host-specific provisioning choices that become necessary for an actual deployment must be resolved at that time and verified against `20`; they do not block ordinary local development.

## 40. Production Seed / Bootstrap Readiness

Release readiness MUST confirm that:

- production reference/bootstrap seed is safe and idempotent;
- Demo Seeder is hard-blocked in production;
- production Team master data is not invented;
- Protected Superadmin bootstrap does not expose/persist plaintext credentials;
- ordinary rerun does not reset Protected Superadmin credential or user-modified runtime settings.

## 41. Release Security Review

A release containing security-sensitive changes must include the applicable human security-review evidence from Level 1.

Release validation MUST also ensure no known release candidate configuration or integration bypass weakens those reviewed controls.

## 42. Release Manual Validation

Release-candidate staging validation MAY include manual functional checks where useful and SHOULD include them for production-like behavior that requires human observation, such as approved visual/export fidelity or important operational journeys.

Manual checks never replace required CI/integration evidence.

## 43. Performance / Load / SLA Boundary

No numeric response-time, RPS, concurrent-user, load, application SLA, RPO, or RTO gate is a current MVP requirement. These concerns are intentionally out of current MVP scope under `19A`/`20`, not unresolved values that an agent must solve.

If a future explicit approved requirement introduces one of these targets, that target becomes an applicable DoD gate for the affected scope. A guessed industry value MUST NOT be substituted.

## 44. Deployment-Specific Boundary

`18` defines completion/readiness logic; `20` defines the approved deployment posture:

```text
local-native first
→ Docker portability secondary
→ default future deployment = one native Linux server
```

Do not use DoD to reintroduce HA, load balancers, DR/RPO/RTO, backup architecture, Kubernetes, multi-server scaling, application SLA/load targets, or external observability platforms as current MVP gates.

Narrow real-host choices such as provider/hostname/Linux distro/storage path and evidence-based timeout/rate-limit tuning are resolved only when the corresponding implementation or deployment step actually needs them.

---

# PART F — REQUIRED COMPLETION EVIDENCE

## 45. Task / PR Evidence Record

For an applicable implementation PR, the PR description/review evidence SHOULD make the following clear:

```text
Specification / requirement reference
Scope summary
Affected authorities
TDD RED commit SHA, command/target, failure summary
GREEN command/target and result
Relevant regression result
Coverage result where applicable
Real-integration evidence where applicable
Architecture/static/type/format gates
Migration/dependency note
Security review: required/not required + evidence/reason
Manual functional validation: required/not required + evidence/reason
Documentation updated or N/A with reason
Known limitations/TBDs relevant to the scope
```

A pure refactor may record:

```text
TDD RED: N/A — behavior-preserving refactor
```

with truthful before/after GREEN evidence.

## 46. N/A Requires Reason

For material gates, `N/A` should state why the gate is genuinely not applicable.

Good example:

```text
ClamAV integration: N/A — this PR modifies only role administration UI; no attachment/storage/scanner behavior changed.
```

Bad example:

```text
ClamAV integration: N/A — integration is difficult to run.
```

## 47. Evidence Persistence

Completion evidence should remain recoverable through appropriate project systems such as:

- Git history;
- Pull Request description/review;
- CI run/check;
- test artifacts/logs;
- approved staging verification record;
- committed specification/test files.

Secrets/private signing material MUST NOT be included in evidence.

---

# PART G — DEFINITION OF NOT DONE

## 48. Work Is NOT Done When

Work MUST NOT be declared Done when any applicable condition below is true:

1. requirement is implemented from assumption rather than approved specification;
2. required decision/TBD was silently guessed;
3. implementation contradicts an authoritative project document;
4. applicable required test/CI gate is failing;
5. test/CI did not run but is claimed as passing;
6. required TDD RED was fabricated or implemented after production behavior and history was rewritten to disguise it;
7. a required failing test only passes through retry-as-pass;
8. coverage is below the applicable required threshold;
9. coverage/test was gamed through meaningless assertions or excessive exclusions;
10. required authorization/security negative tests are absent;
11. a fake/mock is the only evidence where real integration is required;
12. MySQL-specific behavior was proven only using SQLite;
13. ClamAV behavior is claimed without real required integration;
14. signing/verification behavior is claimed without real non-production crypto evidence;
15. renderer fidelity is claimed without real qualified renderer/golden evidence when required;
16. attachment becomes usable without whole-file explicit CLEAN evidence;
17. transport `COMPLETED` is treated as security `CLEAN`;
18. export worker can silently reread newer mutable state instead of its bound snapshot;
19. Approved PDF may fall back to unsigned output;
20. official XLSX is generically rewritten in a way that may strip required OOXML/control/VML structures;
21. architecture boundaries are violated;
22. Team is used to authorize Reviewer/Approver actions;
23. unapproved dependency is introduced;
24. shared/applied migration history is rewritten;
25. destructive operation was taken without required approval;
26. production secret/private runtime artifact is committed or exposed;
27. Demo Seeder can run in production;
28. production Team data is invented;
29. seed fabricates CLEAN/READY/signature/issuance evidence;
30. documentation that must change remains contradictory/stale;
31. required human implementation review has not occurred;
32. required human security review has not occurred;
33. unresolved blocker inside the feature remains hidden behind a manual workaround;
34. release is called production-ready without required staging validation;
35. mandatory production renderer/signing/runtime readiness is unresolved for the release;
36. debug/temp/bypass code from the task remains;
37. unrelated diff/lockfile/generated-file churn remains unexplained;
38. agent approves/merges its own implementation PR;
39. completion evidence is fabricated or cannot truthfully support the claim.

---

# PART H — HUMAN / AGENT RESPONSIBILITY

## 49. Coding Agent Responsibility

Coding agent MAY:

- inspect specifications/repository;
- create requirement-derived tests;
- create RED/implementation commits;
- run applicable verification;
- update documentation when required;
- create/update PR;
- provide evidence;
- fix review/CI findings.

Coding agent MUST:

- be truthful about what executed;
- preserve user decisions;
- stop silent requirement invention;
- identify unresolved blockers;
- keep root `AGENTS.md` synchronized when relevant.

Coding agent MUST NOT:

- self-approve implementation PR;
- self-merge implementation PR;
- mark a human review as complete when no human performed it;
- weaken gates simply to obtain Done status.

## 50. Human Responsibility

Human reviewer/owner retains final control over implementation merge.

For implementation PRs, at least one human review is mandatory before merge.

For sensitive categories defined in Section 17, human security review is mandatory.

Human review may reject a PR even when automation is green if the implementation is inconsistent with specification, unsafe, incomplete, unnecessarily broad, or otherwise fails DoD.

Green CI is necessary where applicable, not sufficient by itself.

---

# PART I — ACCESSIBILITY / PERFORMANCE / DOCUMENTATION POLICY SUMMARY

## 51. Locked DoD Governance Decisions

The following completion-governance decisions are locked:

```text
DoD model                         = layered: Task/PR, Feature/Module, Release/Production-Ready
Human implementation PR review   = mandatory before merge
Documentation update              = only when affected authoritative concern changes/clarifies
Accessibility baseline            = existing WCAG-AA-like direction; no formal compliance claim
Staging                            = not every PR; mandatory for Release/Production-Ready and staging-only proof
Human security review             = mandatory for security-sensitive implementation changes
Numeric performance/SLA gate      = not invented until approved authority defines target
```

---

# PART J — COMPLETION QUICK CHECKLIST

## 52. Task / PR Done — Quick Check

```text
[ ] requirement/specification identified
[ ] scope is coherent and no silent requirement drift
[ ] TDD evidence valid where applicable
[ ] applicable automated tests pass
[ ] applicable real integrations pass
[ ] PHP/frontend coverage requirements satisfied or truthfully unresolved under dependency governance
[ ] Pint / static analysis / lint / types / build pass as applicable
[ ] architecture rules preserved
[ ] security/authorization rules preserved
[ ] schema/migration safe where applicable
[ ] API/UI contracts aligned where applicable
[ ] dependency approval obtained where required
[ ] seed/bootstrap safety preserved where applicable
[ ] docs synchronized when affected
[ ] diff/commits/lockfiles clean and scoped
[ ] human implementation review completed
[ ] human security review completed when sensitive
[ ] no fabricated evidence / hidden blocker
```

## 53. Feature / Module Done — Quick Check

```text
[ ] all required constituent Task/PR work is Done
[ ] integrated feature behavior matches specification
[ ] relevant end-to-end journey passes
[ ] negative/error/authorization paths proven
[ ] cross-layer contracts are consistent
[ ] no hidden manual workaround
[ ] no unresolved feature blocker
[ ] feature-level docs synchronized when needed
```

## 54. Release / Production-Ready Done — Quick Check

```text
[ ] all release-scope features are Done
[ ] release candidate revision is identified
[ ] required CI/integration evidence is green
[ ] mandatory staging validation completed
[ ] staging uses production-like configuration classes
[ ] production-safe seed/bootstrap verified
[ ] required ClamAV/storage/queue/scheduler readiness verified
[ ] qualified renderer ready for required export capability
[ ] Approved-PDF signing readiness resolved
[ ] required security review evidence present
[ ] no production secret included in code/CI evidence
[ ] no release-blocking TBD remains
[ ] no unapproved numeric performance/SLA target was invented
[ ] final merge/release remains under human control
```

---

# PART K — FINAL GUARDRAILS

## 55. DoD Cannot Be Weakened Per Environment or Per Agent

Developer convenience, CI limitations, local machine limitations, or agent limitations do not authorize changing a mandatory project rule.

Where a required check cannot be executed in the current environment:

```text
disclose limitation
→ run it in the correct approved environment when required
→ do not claim PASS before evidence exists
```

## 56. No Completion by Documentation Alone

Writing specification/checklists does not prove runtime implementation.

Documentation-only work may itself be Done as documentation work when its own scope/review requirements are satisfied, but it MUST NOT be represented as runtime implementation/test/integration completion.

## 57. No Completion by CI Alone

Even fully green CI does not override:

- product/business/security authority;
- human implementation review;
- required human security review;
- unresolved blocking TBD;
- staging/release readiness requirement;
- physical deployment requirements defined by `20`.

## 58. No Completion by Human Approval Alone

Human approval also does not authorize bypassing mandatory automated/security/integration requirements.

Required direction:

```text
approved specification
+ truthful implementation
+ applicable automated/integration evidence
+ required human review
+ required environment/release evidence
= Done at the applicable level
```

---

# PART L — CURRENT PROJECT HANDOFF

## 59. Current Documentation State

The fixed-order documentation set is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

`18_Definition_of_Done.md` remains authoritative for completion classification; `19` is the implementation-sequencing authority and `20` is the deployment authority.

## 60. Documentation Finality / Current Handoff

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
---

# 61. Critical MUST NOT Summary

Never declare work Done by:

1. guessing a TBD;
2. ignoring a conflicting project authority;
3. skipping a required test/gate;
4. fabricating RED/GREEN/CI/staging/review evidence;
5. using retry-as-pass;
6. using fake-only proof where real integration is required;
7. weakening static/type/coverage/testing rules;
8. violating Repository–Service architecture;
9. replacing backend authorization with UI visibility;
10. introducing Team-based Reviewer/Approver authorization;
11. bypassing attachment CLEAN requirements;
12. issuing unsigned Approved PDF fallback;
13. claiming unqualified renderer fidelity;
14. rewriting shared migration/Git history without approval;
15. adding unapproved dependencies;
16. hiding destructive behavior;
17. committing secrets/private runtime artifacts;
18. allowing Production Demo Seeder;
19. fabricating seed artifact/crypto evidence;
20. skipping required human implementation review;
21. skipping required human security review;
22. calling a release Production-Ready without mandatory staging/readiness evidence;
23. inventing performance/SLA/load targets;
24. letting an AI/coding agent approve/merge its own implementation PR;
25. treating green CI alone as proof of complete product correctness.

---

**END OF `18_Definition_of_Done.md`**
