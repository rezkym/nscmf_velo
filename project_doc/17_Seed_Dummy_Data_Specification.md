# Seed / Dummy Data Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-SEED-017  
> **Document Order:** 17 / 20  
> **Status:** Draft — Authoritative Seed / Bootstrap / Demo Data Specification  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `16_Testing_Specification.md`  
> **Canonical Application / Seed Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02

---

## 1. Purpose

Dokumen ini adalah **source of truth authoritative untuk bootstrap/reference seed, local-development demo data, deterministic dummy scenarios, seed safety antar-environment, dan batas antara seed data vs automated-test data** NSCMF Digital Form & Workflow System.

Dokumen ini mengisi ruang yang memang sengaja didelegasikan oleh dokumen upstream tanpa mengubah product scope, RBAC, schema, API, security, workflow, testing, atau environment behavior.

Tujuan utamanya:

1. menyediakan reference/bootstrap data yang dibutuhkan aplikasi secara aman;
2. menyediakan dataset demo local/development yang cukup representatif untuk mencoba seluruh lifecycle dan skenario penting NSCMF;
3. memastikan Team produksi tidak dikarang melalui seeder;
4. memastikan Protected Superadmin dapat dibootstrap tanpa menyimpan plaintext credential di repository/database/log;
5. memastikan dummy data selalu synthetic dan tidak menyerupai data pelanggan/credential production;
6. memastikan seed demo tidak pernah berjalan di production;
7. memastikan testing/CI tetap menggunakan isolated factories/fixtures dan tidak bergantung pada shared Demo Seeder;
8. mencegah fake attachment/export/signature/issuance metadata yang tidak memiliki binary/cryptographic evidence nyata;
9. menjaga seed dapat dijalankan secara aman dan idempotent tanpa menimpa authoritative runtime data yang sudah berubah.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — default kuat kecuali ada alasan yang dapat direview.
- **MAY** — diperbolehkan.
- **BOOTSTRAP / REFERENCE DATA** — data aplikasi yang diperlukan untuk baseline operasional dan berasal dari specification, bukan data bisnis organisasi yang belum ditentukan.
- **DEMO DATA** — synthetic non-production data untuk local/development/demo exploration.
- **TEST DATA** — isolated data yang dibuat test harness/factory/fixture untuk membuktikan requirement; tidak sama dengan shared Demo Seeder.
- **PRODUCTION-SAFE SEED** — seed yang boleh dijalankan pada production karena hanya mematerialisasi data reference/bootstrap yang sudah authoritative dan tidak membuat demo business data.
- **TBD** — belum diputuskan dan tidak boleh ditebak oleh developer/agent.

---

# PART A — AUTHORITY / BOUNDARY

## 3. Seed Does Not Redefine Product Truth

Seeders MUST materialize data yang sudah ditentukan oleh project specifications.

Seeders MUST NOT menentukan sendiri:

- Team produksi;
- Unit/Division/Reviewer Scope/Approval Scope;
- business state baru;
- permission baru;
- workflow baru;
- password policy baru;
- attachment/export retention baru;
- rate-limit production;
- signer/renderer/ClamAV deployment detail;
- official numbering SOP yang masih TBD;
- production customer/service/master data yang belum diberikan.

## 4. Authority Chain

Seed behavior mengikuti authority upstream:

| Concern | Authority |
|---|---|
| Product/business/user journey | `01–03` |
| Roles/permissions/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Field/action validation | `06_Validation_Rules.md` |
| UI representation | `07_UI_UX_Specification.md` |
| Technology/architecture | `08–09`, `12A`, `13` |
| Security/credentials/audit | `10_Security_Rules.md` |
| Relational schema | `11_ERD_Database_Schema.md`, `11A` |
| HTTP/action semantics | `12_API_Contract.md` |
| Runtime/environment classes | `14_Environment_Specification.md` |
| Coding/Git safety | `15_Coding_Rules_AGENTS.md` |
| Test isolation/data safety | `16_Testing_Specification.md` |
| **Seed/bootstrap/demo dataset** | **`17_Seed_Dummy_Data_Specification.md`** |

---

# PART B — SEED CATEGORIES

## 5. Canonical Seed Categories

Implementation SHOULD separate at least these logical categories:

```text
Reference / Bootstrap Seed
├── Permission Catalog
├── Default Roles
├── Default Role-Permission Bundles
├── System Settings Singleton Default
└── Protected Superadmin Bootstrap

Demo Seed
├── Demo Teams
├── Demo Users / Roles
├── Demo NSCMF Activation Records
├── Demo NSCMF Change Records
└── Coherent Synthetic Business Audit History
```

Exact PHP class names may follow Laravel conventions, but these responsibilities MUST remain separable so production can execute bootstrap/reference data without executing demo data.

## 6. Factories Are Separate

`database/factories/` remains test/development builders.

Factories MUST NOT become production reference-data authority.

Automated tests MUST NOT depend on the Demo Seeder having run first.

---

# PART C — ENVIRONMENT POLICY

## 7. Environment Matrix — LOCKED

| Environment | Reference / bootstrap seed | Demo dataset | Notes |
|---|---:|---:|---|
| Local / development | YES | YES | canonical developer demo environment |
| Testing | only explicitly needed isolated reference setup | NO shared demo dependency | tests create their own data |
| CI | only explicitly needed isolated reference setup | NO | CI must remain deterministic/isolation-safe |
| Staging | YES | explicit opt-in only | never automatic |
| Production | YES | **HARD BLOCKED** | no demo Team/user/NSCMF records |

## 8. Production Demo Hard Block

Any entrypoint capable of creating Demo Teams, Demo Users, demo password `password`, or `DEMO-*` NSCMF data MUST refuse execution when application environment is production.

Production MUST NOT rely merely on operator memory to avoid demo seed execution.

Conceptual behavior:

```text
APP_ENV=production
+ DemoSeeder requested
→ ABORT / FAIL CLOSED
→ no demo row created
```

## 9. Staging Explicit Opt-In

Staging does not receive demo data automatically.

If an operator intentionally needs the demo dataset in staging:

- execution must be explicit;
- environment must be positively recognized as staging;
- operator must understand that demo credentials are synthetic known credentials;
- no production data/keys may be mixed into the demo dataset;
- the operation must not be bundled silently into routine deploy/migration.

## 10. Local / Development Default

Local/development MAY run the complete demo dataset after migrations/reference bootstrap.

The dataset is deliberately compact and deterministic rather than large/random.

## 11. Testing / CI Independence

Testing and CI MUST follow `16`:

```text
test arranges its own state
→ test executes
→ test asserts
→ disposable state is isolated/cleaned
```

A test MUST NOT pass only because `DemoSeeder` happened to create a user, role, Team, record, session, or audit row earlier.

---

# PART D — PRODUCTION-SAFE REFERENCE / BOOTSTRAP DATA

## 12. Permission Catalog

The production-safe reference seed MUST materialize the explicit current permission catalog from `04`.

Current permissions include:

### NSCMF core

```text
nscmf.create
nscmf.draft.edit
nscmf.submit
nscmf.cancel
nscmf.change.result.edit
nscmf.view
nscmf.view.history
nscmf.attachment.manage
nscmf.export
nscmf.export.bulk
nscmf.timeline.view
```

### Review

```text
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
```

### Approval

```text
nscmf.approve
nscmf.approval.return_reviewer
nscmf.approval.return_requester
nscmf.approval.reject
```

### Recovery / lifecycle

```text
nscmf.reopen
nscmf.archive
```

### User administration

```text
users.view
users.create
users.update
users.enable
users.disable
users.reset_password
users.assign_roles
users.assign_team
```

### Role / permission administration

```text
roles.view
roles.create
roles.update
permissions.assign
```

`roles.archive` is **not** seeded as a current active permission merely because historical RBAC text reserves the concept; current schema/API does not expose Role archive behavior.

### Team administration

```text
teams.view
teams.create
teams.update
teams.archive
teams.assign_users
```

### Core setting / audit

```text
system.settings.manage
audit.access.view
audit.security.view
```

No wildcard rows are created. No `session.login`/`session.logout` rows are created.

## 13. Default Roles

Production-safe seed creates exactly the canonical default role templates:

```text
Superadmin
Requester
Reviewer
Approver
```

Custom organization roles are not seeded unless separately approved later.

## 14. Default Permission Bundles

Default role-permission bundles MUST match `04`.

### Requester

```text
nscmf.create
nscmf.view
nscmf.view.history
nscmf.draft.edit
nscmf.submit
nscmf.cancel
nscmf.change.result.edit
nscmf.attachment.manage
nscmf.timeline.view
nscmf.export
nscmf.export.bulk
```

### Reviewer

```text
nscmf.view
nscmf.view.history
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
nscmf.timeline.view
nscmf.export
nscmf.export.bulk
```

### Approver

```text
nscmf.view
nscmf.view.history
nscmf.approve
nscmf.approval.return_reviewer
nscmf.approval.return_requester
nscmf.approval.reject
nscmf.timeline.view
nscmf.export
nscmf.export.bulk
```

### Superadmin

Superadmin receives all current normal application/admin permissions including `nscmf.reopen`, `nscmf.archive`, audit views, and `system.settings.manage`, while remaining subject to state/security/protected invariants.

The seed MUST NOT create a universal authorization bypass.

## 15. Spatie Boundary

Reference seed MUST preserve:

```text
guard = web
teams = false
wildcard permissions = false
```

Do not create Team-scoped role instances or duplicate RBAC tables.

## 16. System Settings Singleton

Production-safe bootstrap creates the singleton row **only when missing** with:

```text
technical_log_auto_cleanup_enabled = true
technical_log_retention_value       = 30
technical_log_retention_unit        = DAY
updated_by_user_id                   = NULL at bootstrap
```

Rerunning the seed MUST NOT overwrite a legitimate Protected-Superadmin runtime change such as `3 MONTH` or cleanup `OFF`.

Conceptual idempotency:

```text
missing singleton → create authoritative default
existing singleton → preserve current runtime values
```

---

# PART E — TEAM POLICY

## 17. No Production Team Master Seed — LOCKED

Production bootstrap MUST NOT create any assumed Team master data.

Specifically, it MUST NOT invent names such as:

```text
NOC
Network
Operations
Reviewer Team
Approval Team
IT
Engineering
```

as production facts.

Exact organization Team master data remains organization-provided data and is created through authorized administration or a future explicitly approved import/bootstrap dataset.

## 18. Protected Superadmin Team Nullability

The canonical bootstrap Protected Superadmin starts with:

```text
team_id = NULL
```

This is explicitly permitted by schema for bootstrap setup.

If the Protected Superadmin later needs to create an NSCMF record, the normal active-Team requirement still applies. Seed MUST NOT invent a production Team merely to bypass that requirement.

## 19. Demo Teams

Demo dataset creates exactly these clearly synthetic Teams:

```text
Demo Team Alpha
Demo Team Beta
Demo Team Gamma
```

All are active.

These names are intentionally neutral so they do not imply permission or Reviewer/Approver scope.

Team membership MUST NOT change effective Review/Approval permission.

---

# PART F — PROTECTED SUPERADMIN BOOTSTRAP

## 20. Canonical Bootstrap Identity — LOCKED

Initial Protected Superadmin identity:

```text
username                  = superadmin
name                      = Protected Superadmin
team_id                   = NULL
is_active                 = true
is_protected_superadmin   = true
must_change_password      = true
role                      = Superadmin
```

## 21. Temporary Password Generation

The bootstrap process MUST generate a cryptographically appropriate random temporary password server-side.

MUST NOT hard-code production bootstrap credentials such as:

```text
admin123
superadmin
password
changeme
```

The local demo password `password` defined later is **not** the Protected Superadmin bootstrap password.

## 22. One-Time Plaintext Reveal

For first-time Protected Superadmin creation:

```text
generate plaintext in memory
→ hash
→ persist hash + protected identity + role
→ commit successfully
→ reveal plaintext exactly once to the authorized bootstrap operator
→ discard plaintext
```

Plaintext MUST NOT be persisted in database/cache/file/audit/application log/repository.

## 23. Bootstrap Execution Channel

Because a one-time secret is involved, Protected Superadmin bootstrap SHOULD be an operator-controlled bootstrap operation rather than an unattended recurring seed step whose console output may be copied into CI/deployment logs.

The implementation MAY use a dedicated Laravel seed/bootstrap command as long as the security behavior above is preserved.

Production Protected Superadmin bootstrap MUST NOT run in CI.

## 24. Idempotent Re-run

If canonical `superadmin` already exists as the protected identity:

- do not generate another temporary password automatically;
- do not reset its password;
- do not clear/change its Team;
- do not disable it;
- preserve required protected role/invariant;
- do not print/recover old plaintext.

If the one-time initial plaintext was lost, use the approved explicit admin reset/recovery process once another authorized recovery path exists; never retrieve prior plaintext.

## 25. Conflict Handling

If bootstrap discovers an incompatible pre-existing `superadmin` identity that would make the protected invariant ambiguous, it MUST fail visibly for operator resolution rather than silently taking over or deleting the account.

---

# PART G — DEMO USERS

## 26. Demo Account Set — LOCKED

Local/development demo dataset contains:

| Username | Display name | Team | Role(s) | Active |
|---|---|---|---|---:|
| `demo.requester.a` | Demo Requester A | Demo Team Alpha | Requester | YES |
| `demo.requester.b` | Demo Requester B | Demo Team Beta | Requester | YES |
| `demo.reviewer` | Demo Reviewer | Demo Team Gamma | Reviewer | YES |
| `demo.approver` | Demo Approver | Demo Team Alpha | Approver | YES |
| `demo.multi` | Demo Multi Role | Demo Team Beta | Reviewer + Approver | YES |
| `demo.disabled` | Demo Disabled User | Demo Team Gamma | Requester | NO |

Protected `superadmin` remains separate from this demo-account set.

## 27. Demo Password — LOCKED

All `demo.*` accounts use the synthetic shared password:

```text
password
```

Requirements:

- hash only is persisted;
- plaintext is intentionally known because these accounts are non-production demo identities;
- `must_change_password=false` for demo accounts so local exploration remains repeatable;
- production demo seed is hard-blocked;
- no real user may reuse these demo identities/credentials as production account provisioning.

## 28. Disabled Demo Account

`demo.disabled` exists to demonstrate disabled-account presentation/authorization behavior.

It MUST remain inactive after demo seed and MUST NOT be used as an actor for successful business events.

## 29. Multi-Role Demo Account

`demo.multi` intentionally carries both Reviewer and Approver roles to demonstrate:

- multi-role is supported;
- permission union applies;
- there is no mandatory segregation-of-duties rule;
- Team remains irrelevant to Review/Approval eligibility.

---

# PART H — DEMO DATA PRINCIPLES

## 30. Synthetic Only

All demo business values MUST be unmistakably synthetic.

Recommended conventions:

```text
Customer names → Demo Customer / Example Customer
Domains        → *.example.com / example.net / example.org
IPv4           → RFC 5737 documentation ranges:
                 192.0.2.0/24
                 198.51.100.0/24
                 203.0.113.0/24
IPv6           → 2001:db8::/32
Free text      → prefixes such as "Demo ..."
```

Do not copy customer names, credentials, IP addressing, service IDs, ticket IDs, domains, topology, or confidential operational text from production.

## 31. Deterministic Data

Demo data SHOULD be deterministic so humans/agents can refer to known scenarios reliably.

Use stable synthetic dates/timestamps and fixed scenario keys rather than random Faker values for authoritative demo scenarios.

Canonical timezone remains `Asia/Jakarta`.

## 32. Manual Demo Request Numbers

All shared demo NSCMF records use manual request numbers:

```text
DEMO-ACT-001 ... DEMO-ACT-010
DEMO-CHG-001 ... DEMO-CHG-010
```

Purpose:

- deterministic references;
- clear visual identification as demo data;
- no consumption/pollution of `NSCMF-YYYYMM-#####` monthly automatic sequence;
- no seeding of `nscmf_number_sequences` solely for demo records.

Demo request numbers still obey normal uniqueness/normalization rules.

## 33. No Invalid Shared Demo Rows

Shared Demo Seeder creates valid relational scenarios that can be browsed safely.

Deliberately malformed/constraint-breaking rows belong in isolated tests/factories, not shared Demo Seeder.

Examples not stored as normal shared demo data:

- invalid enum;
- orphan FK;
- duplicate request number;
- impossible state/iteration relation;
- oversize attachment metadata;
- plaintext password;
- fake hash pretending to prove unavailable binary.

---

# PART I — DEMO NSCMF SCENARIO MATRIX

## 34. Dataset Size — LOCKED

The canonical demo dataset contains **20 NSCMF records**:

```text
10 Activation-family records
10 Change-family records
```

The set is intentionally small enough for manual exploration but broad enough to represent every canonical lifecycle state and major workflow/lifecycle scenario.

## 35. Activation Scenarios

| Request No | Subtype | Current state | Archive | Scenario intent |
|---|---|---|---:|---|
| `DEMO-ACT-001` | ACTIVATION | DRAFT | NO | incomplete editable Draft; no workflow iteration |
| `DEMO-ACT-002` | ACTIVATION | PENDING_REVIEW | NO | first Submit / iteration 1 waiting for Review |
| `DEMO-ACT-003` | UPGRADE_DOWNGRADE | REVISION_REQUIRED | NO | Reviewer Return to Requester; same iteration |
| `DEMO-ACT-004` | UPGRADE_DOWNGRADE | PENDING_APPROVAL | NO | reviewer collaboration; current Reviewed By from final Forward actor |
| `DEMO-ACT-005` | ACTIVATION | APPROVED | NO | normal full happy path / one final Approver |
| `DEMO-ACT-006` | DEACTIVATION | REJECTED | NO | Reviewer Reject terminal iteration |
| `DEMO-ACT-007` | DEACTIVATION | CANCELLED | NO | Cancel before first Submit; no workflow iteration |
| `DEMO-ACT-008` | UPGRADE_DOWNGRADE | APPROVED | YES | Approved + archived terminal record |
| `DEMO-ACT-009` | ACTIVATION | REVISION_REQUIRED | NO | previously Approved, Reopened to iteration 2 / old iteration superseded |
| `DEMO-ACT-010` | DEACTIVATION | PENDING_REVIEW | NO | previously Rejected, Reopened directly to Review / iteration 2 |

## 36. Change Scenarios

| Request No | Subtype | Current state | Archive | Scenario intent |
|---|---|---|---:|---|
| `DEMO-CHG-001` | MAINTENANCE | DRAFT | NO | incomplete Change Draft |
| `DEMO-CHG-002` | MAINTENANCE | PENDING_REVIEW | NO | first Submit with zero Result rows still legal before Forward |
| `DEMO-CHG-003` | UPGRADE | PENDING_REVIEW | NO | Result updated by owner; one+ complete Result, ready for Reviewer action |
| `DEMO-CHG-004` | EMERGENCY | REVISION_REQUIRED | NO | Reviewer Return; Emergency still follows normal workflow |
| `DEMO-CHG-005` | MAINTENANCE | PENDING_APPROVAL | NO | Reviewer Forward + complete Result requirement satisfied |
| `DEMO-CHG-006` | UPGRADE | APPROVED | NO | multi-role actor participates across allowed stages; no mandatory SoD |
| `DEMO-CHG-007` | EMERGENCY | REJECTED | NO | Approver Reject after successful Review |
| `DEMO-CHG-008` | MAINTENANCE | CANCELLED | YES | Cancelled before first Submit, then archived |
| `DEMO-CHG-009` | EMERGENCY | APPROVED | YES | Emergency full approval path + archived; no bypass |
| `DEMO-CHG-010` | UPGRADE | PENDING_REVIEW | NO | Approver Return Reviewer; effective Reviewed By cleared; fresh Forward required |

## 37. Canonical State Coverage

The 20-record dataset MUST visibly contain all canonical states:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

No additional business state may be created to make the seed easier.

## 38. Family / Subtype Coverage

Activation-family seed MUST include:

```text
ACTIVATION
UPGRADE_DOWNGRADE
DEACTIVATION
```

Change-family seed MUST include:

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

Emergency records MUST still show normal Review/Approval behavior.

---

# PART J — WORKFLOW / ITERATION / ACTOR CONSISTENCY

## 39. Draft / Cancelled

`DRAFT` and never-submitted `CANCELLED` demo records MUST have:

- no current workflow iteration;
- null Requested By / first submitted timestamp where schema requires;
- no fake Reviewed By / Approved By.

## 40. First Submit

Every post-submit scenario begins with iteration 1.

First successful Submit actor becomes `requested_by_user_id` and is never overwritten by Reopen.

## 41. Reviewer Collaboration Scenario

At least one demo record (canonical target: `DEMO-ACT-004`) MUST demonstrate multiple eligible reviewers contributing across one iteration, for example:

```text
Demo Reviewer performs an earlier Review action/Return
→ Requester revises/resubmits
→ Demo Multi Role performs successful Forward
→ current Reviewed By = Demo Multi Role
→ prior actor remains visible in Business Audit history
```

There is no exclusive reviewer assignment.

## 42. Approval Scenario

Approved demo records MUST show exactly one final successful approval actor per closed iteration.

Other eligible Approvers remain eligible pool members but are not fabricated as multiple successful final approvers.

## 43. Multi-Role / No Mandatory SoD Scenario

At least one record (canonical target: `DEMO-CHG-006`) SHOULD demonstrate that `demo.multi` can legally participate in Review and Approval when its permissions/state requirements are satisfied, because current project has no mandatory segregation-of-duties rule.

This is not permission for invalid same-request state transitions or bypassing validation.

## 44. Reviewer Reject vs Approver Reject

Dataset SHOULD distinguish both rejection origins:

- `DEMO-ACT-006` → Reviewer Reject;
- `DEMO-CHG-007` → Approver Reject.

Both end in canonical `REJECTED`, with audit history showing the path.

## 45. Approver Return Requester

At least one `REVISION_REQUIRED` scenario SHOULD represent:

```text
PENDING_APPROVAL
→ Approver Return Requester
→ REVISION_REQUIRED
```

This may be represented within `DEMO-ACT-009` historical iteration before or after a suitable lifecycle sequence as long as the final seeded state/iteration remains coherent.

## 46. Approver Return Reviewer

`DEMO-CHG-010` represents:

```text
PENDING_APPROVAL
→ Approver Return Reviewer
→ PENDING_REVIEW
```

The current effective `reviewed_by_user_id` / `reviewed_at` MUST be cleared because a fresh Forward is required, while the previous Forward/Return remain in Business Audit history.

## 47. Reopen Approved

`DEMO-ACT-009` MUST represent:

```text
Iteration 1 → APPROVED
→ Reopen with reason
→ Iteration 2
→ REVISION_REQUIRED
```

Iteration 1 is historical/superseded. Requested By remains the first-submit actor.

## 48. Reopen Rejected

`DEMO-ACT-010` MUST represent:

```text
Iteration 1 → REJECTED
→ Reopen with reason
→ Iteration 2
→ PENDING_REVIEW
```

## 49. Archive Scenarios

Dataset MUST include representative archives for eligible terminal classes:

- Approved archived (`DEMO-ACT-008`, `DEMO-CHG-009`);
- Cancelled archived (`DEMO-CHG-008`).

A Rejected archive MAY be added only if dataset size remains coherent, but it is not necessary to duplicate every terminal archive because archive eligibility itself is already tested in `16`.

Archive flag never changes canonical business status.

---

# PART K — FORM DATA COVERAGE

## 50. Activation Representative Data

Across Activation demo records, the dataset SHOULD exercise representative valid combinations of:

- Customer Name / Contact Name;
- installation/RFS date where applicable;
- LAN IP allocation;
- WAN IP / Gateway;
- POP / Regional;
- Preferred / Secondary Upstream;
- Primary / Secondary NOC link;
- Downlink Router;
- International / IIX / Mixed bandwidth;
- domain/DNS/MX/hosting fields;
- migrate-domain / migrate-hosting flags;
- Existing/New service blocks;
- optional SLA items;
- optional virtual connections;
- optional priority destinations;
- Direct-site details;
- POP-site details.

Not every record needs every optional field. The dataset SHOULD distribute optional sections so the UI can be explored without creating unrealistic giant records.

## 51. Activation Reference Types

Across the 10 Activation records, all reference types SHOULD appear at least once:

```text
IWO
VELOSHIP
TICKET
OTHER
```

`OTHER` includes a valid specification/description.

## 52. Synthetic Network Values

Use documentation-safe network values only.

Examples:

```text
WAN IP        = 192.0.2.10
Gateway       = 192.0.2.1
LAN           = 198.51.100.0/29
Secondary WAN = 203.0.113.10 where an appropriate field exists
IPv6          = 2001:db8:100::/64
DNS           = 192.0.2.53
```

No production/customer network information is copied.

## 53. Change Representative Data

Across Change demo records, the dataset SHOULD exercise representative valid values for:

- maintenance purpose;
- target execution date;
- monitoring period value/unit;
- rollback scenario;
- announcement timing;
- facing challenges;
- identified problems;
- improvement plan / target KPI;
- Change Results;
- Service Impacts.

## 54. Service Impact Complete Enum Coverage

Across Change demo records, every Service Impact code MUST appear at least once:

```text
NOC15
NOC23
NOC361
REGIONAL
POP
CUSTOMER
OTHER
```

`OTHER` MUST include a synthetic `other_description`.

These values are form/business values, not authorization Team values.

## 55. Change Result Scenarios

Dataset MUST include at least:

1. `PENDING_REVIEW` with **zero Result** rows (`DEMO-CHG-002`) to demonstrate legal first-Submit state;
2. `PENDING_REVIEW` with one or more complete Results (`DEMO-CHG-003`);
3. `PENDING_APPROVAL` with complete Result prerequisite satisfied (`DEMO-CHG-005`);
4. an Approved Change with complete historical Results (`DEMO-CHG-006` or `009`).

No demo record exceeds five Results.

---

# PART L — OWNERSHIP / TEAM SNAPSHOT

## 56. Requester Ownership Coverage

Demo NSCMF ownership MUST be distributed between:

```text
demo.requester.a
demo.requester.b
```

so humans can observe own-record boundaries and distinguish one Requester's records from another.

## 57. Team Snapshot

At NSCMF creation, record `team_id` captures the owner's current Demo Team.

Demo seed SHOULD preserve examples owned by both Demo Team Alpha and Demo Team Beta.

Later Team changes are not automatically replayed into existing record snapshots.

## 58. Team Is Never Workflow Scope

Review/Approval actors intentionally come from Teams different from some record owners.

Example:

```text
record Team = Demo Team Alpha
Reviewer    = Demo Reviewer / Demo Team Gamma
→ review still eligible because permission/state allows it
```

This is a deliberate demo signal that Team is organizational metadata only.

---

# PART M — BUSINESS AUDIT HISTORY

## 59. Coherent Synthetic Business Audit

Post-submit / workflow demo records SHOULD include synthetic Business Audit history coherent with their current state.

Examples:

```text
CREATED
DRAFT_UPDATED
SUBMITTED
REVIEW_RETURNED
DRAFT_UPDATED / revision changes
SUBMITTED
REVIEW_FORWARDED
APPROVED
```

or the exact event names defined by schema/business audit implementation.

Seeder MUST use only event types that exist in the authoritative schema/application contract.

## 60. Historical Actor Accuracy

Audit actor must match the scenario:

- Requester actions → corresponding demo requester;
- Review actions → `demo.reviewer` or `demo.multi`;
- Approval actions → `demo.approver` or `demo.multi`;
- archive/reopen → an actor with the corresponding permission, normally Protected Superadmin in demo history where appropriate.

## 61. Timestamp Ordering

Audit and workflow timestamps MUST be monotonic/logically ordered within a scenario.

Examples:

```text
created_at
< submitted_at
< reviewed_at
< approved/rejected_at
< archived/reopened_at when applicable
```

All timestamps use Asia/Jakarta semantics.

## 62. Access / Security Audit Default

Demo Seeder SHOULD NOT fabricate broad raw Access Audit or Security Audit history merely to make administration screens look busy.

Those audit classes represent security/access events and should normally be generated by actual demo interactions.

A narrowly justified synthetic Security/Access Audit demo set may be added later only with an explicit scenario requirement and must remain obviously synthetic.

---

# PART N — ATTACHMENT / EXPORT / SIGNING SEED BOUNDARY

## 63. No Fake Attachments — LOCKED

Default Demo Seeder MUST NOT directly create fake final `nscmf_attachments` rows claiming:

```text
security_status = CLEAN
sha256 = <invented>
private_object_key = <nonexistent binary>
```

without corresponding real binary and malware-validation flow.

## 64. No Fake Resumable Upload State

Default Demo Seeder MUST NOT fabricate accepted chunks/upload sessions that imply durable storage bytes exist when they do not.

Resumable-upload scenarios belong to real application interaction or purpose-specific isolated tests.

## 65. No Fake READY Export

Default Demo Seeder MUST NOT create:

- READY export request with missing binary;
- export artifact with invented SHA;
- fake immutable snapshot used to claim a generated document exists;
- expired artifact metadata disconnected from a real generated artifact solely for display.

## 66. No Fake Signed PDF / Issuance — LOCKED

Default Demo Seeder MUST NOT create fake:

- signed PDF artifact;
- `nscmf_pdf_issuances` row;
- `final_pdf_sha256`;
- certificate/signature result;
- `VALID_CURRENT` evidence.

Cryptographic authenticity must come from a real non-production signing/verification flow.

## 67. Template Registry Boundary

Official template version registration is environment provisioning/integrity work and MUST NOT be faked by Demo Seeder if the exact private template binary + SHA-256 + mapping version are not actually present.

## 68. Recommended Demo Flow for Files

When a human needs attachment/export/signature data in local/staging demo:

```text
seed relational NSCMF scenario
→ use real application attachment/export flow
→ real private binary
→ real ClamAV / renderer / non-production signer as applicable
→ resulting metadata becomes internally consistent
```

---

# PART O — SEED IDEMPOTENCY / RE-RUN SAFETY

## 69. Reference Seed Idempotency

Reference/bootstrap seed MUST be safe to rerun.

Expected behavior:

```text
permission exists → preserve/update only specification-owned mapping as intentionally designed
role exists       → preserve canonical identity and sync approved bundle deliberately
system setting exists → preserve runtime value
```

No duplicate rows.

## 70. No Credential Reset on Generic Re-run

Generic `db:seed` or equivalent reference rerun MUST NOT reset:

- Protected Superadmin password;
- demo password after an operator intentionally changed it, unless an explicitly requested disposable demo reset operation is being performed;
- user sessions/credential state as an unrelated side effect.

## 71. Demo Record Identity

Demo records use deterministic `DEMO-*` Request No as natural scenario identifiers.

If a demo record with the same deterministic identifier already exists, the normal Demo Seeder MUST NOT silently overwrite arbitrary user edits/workflow activity merely to restore the fixture.

Acceptable implementation directions:

- create-if-missing and preserve existing demo row; or
- detect incompatible existing demo state and fail/skip with a clear diagnostic.

Silent destructive reset is forbidden.

## 72. Disposable Demo Reset

A future dedicated demo-reset operation MAY recreate synthetic local data only when:

- target is positively identified as local/development or explicitly approved staging demo;
- data is known demo/disposable data;
- production is hard blocked;
- operation follows destructive-action safety from `15`.

This document does not authorize deleting arbitrary non-demo records.

## 73. Transaction / Atomicity

Seed groups SHOULD use transactions where practical so partial role/permission/scenario graphs are not left behind on failure.

Large external/file work is not part of default Demo Seeder.

---

# PART P — IMPLEMENTATION STRUCTURE

## 74. `database/seeders/`

A clear Laravel-native implementation may resemble:

```text
database/seeders/
├── DatabaseSeeder.php
├── Reference/
│   ├── PermissionSeeder.php
│   ├── RoleSeeder.php
│   ├── RolePermissionSeeder.php
│   └── SystemSettingsSeeder.php
├── Bootstrap/
│   └── ProtectedSuperadminSeeder.php
└── Demo/
    ├── DemoTeamSeeder.php
    ├── DemoUserSeeder.php
    ├── DemoNscmfSeeder.php
    └── DemoBusinessAuditSeeder.php
```

Exact class split MAY be simplified if responsibilities remain clear and safe.

## 75. `DatabaseSeeder` Direction

`DatabaseSeeder` MUST NOT blindly run Demo Seeder in every environment.

Conceptual:

```text
run production-safe reference/bootstrap seed

if local/development:
    demo seed may run

if staging:
    demo seed only through explicit opt-in path

if production:
    demo seed forbidden
```

Protected Superadmin one-time secret bootstrap may require a dedicated operator-controlled path rather than automatic unattended `DatabaseSeeder` execution.

## 76. No New Dependency Required

Current seed behavior can be implemented with Laravel/PHP/Spatie/project code already approved.

No new Composer/npm dependency is authorized by this document.

If implementation proposes one, `15` dependency approval still applies.

---

# PART Q — TESTING THE SEEDERS

## 77. Seed Tests Do Not Replace Domain Tests

`17` seed tests verify seed safety/consistency. They do not replace requirement tests from `16`.

## 78. Reference Seed Tests

Tests SHOULD prove:

- canonical permissions exist once;
- no wildcard/session login/logout permissions appear;
- four canonical default roles exist;
- default bundles match `04`;
- Spatie Teams remains disabled by configuration;
- system-settings default is created when missing;
- system-settings runtime edits are not overwritten by rerun.

## 79. Protected Superadmin Bootstrap Tests

Must prove:

- username/name/protected flags match this specification;
- Team may be null at bootstrap;
- role assignment exists;
- random temporary password hash is stored, not plaintext;
- `must_change_password=true`;
- one-time plaintext is not persisted/logged/audited;
- rerun does not reset an existing credential;
- incompatible pre-existing identity fails safely.

## 80. Demo Environment Guard Tests

Must prove:

```text
production + DemoSeeder → rejected / no demo rows
local/development → allowed
staging → requires explicit opt-in
CI/testing → normal test suite does not depend on DemoSeeder
```

## 81. Demo Account Tests

Must prove:

- exact six `demo.*` users;
- password `password` hashes correctly for synthetic demo users;
- `must_change_password=false`;
- disabled user inactive;
- multi user has Reviewer + Approver;
- Teams are synthetic and Team does not alter permissions.

## 82. Demo Scenario Integrity Tests

Must prove all 20 deterministic Request Nos exist once and their relational graph satisfies:

- family/subtype compatibility;
- canonical current states;
- archive legality;
- workflow iteration rules;
- Requested/Reviewed/Approved actor semantics;
- Reopen iteration progression;
- Change Result rules;
- Service Impact enum coverage;
- no automatic numbering-sequence pollution.

## 83. No Fake Binary Trust Tests

Must prove default Demo Seeder creates no fake authoritative binary/security evidence, including no fabricated:

- CLEAN attachment without binary/scan;
- resumable chunk metadata without files;
- READY artifact without binary;
- signed PDF issuance/hash;
- production signing certificate/private key.

---

# PART R — SECURITY / PRIVACY GUARDRAILS

## 84. No Production Data Copy

Seeder source MUST NOT contain copied production:

- names/customer identifiers;
- usernames/passwords;
- emails/phone numbers if later introduced;
- network addressing/topology;
- service IDs/tickets;
- attachment content;
- signing keys/cert secrets;
- audit payloads;
- database dumps.

## 85. Demo Password Is Not a Secret

The literal demo password:

```text
password
```

is intentionally documented and therefore MUST be treated as unusable for production credentials.

Its safety depends on the production hard block for demo accounts.

## 86. No Secret in Seed Source

Production/staging bootstrap secrets MUST NOT be hardcoded in PHP seeder files, `.env.example`, test fixtures, or documentation.

## 87. Business Audit Permanence

Seed implementation MUST NOT add cleanup logic that age-purges Business/Access/Security Audit.

Demo cleanup in disposable environments must target known demo data only and remains subject to explicit destructive-safety rules.

---

# PART S — FORBIDDEN SEED PATTERNS

## 88. Developer / AI MUST NOT

1. invent production Team names;
2. seed Demo Teams/users/records in production;
3. remove the production environment hard block;
4. hard-code a production Protected Superadmin password;
5. use `password` as production bootstrap password;
6. persist or log Protected Superadmin temporary plaintext;
7. reset Protected Superadmin credential on every seeder rerun;
8. overwrite the current Technical Log runtime setting on every seed;
9. create Unit/Division/scope master data;
10. seed wildcard or `session.login`/`session.logout` permissions;
11. seed permissions/routes/features not authorized upstream;
12. enable Spatie Teams;
13. use Team names to assign Reviewer/Approver capability;
14. create extra NSCMF business states;
15. create impossible workflow/iteration graphs just for UI screenshots;
16. use automatic `NSCMF-YYYYMM-#####` numbers for shared demo records and consume production-style sequence;
17. copy production customer/network/business data;
18. use random non-deterministic scenario keys that make demo references unstable;
19. make automated tests depend on Demo Seeder execution order;
20. fabricate CLEAN attachment metadata;
21. fabricate READY exports/binary hashes;
22. fabricate signed PDF issuance/signature/hash evidence;
23. fabricate official template registry metadata without actual binary/hash/mapping;
24. silently delete/overwrite existing demo or non-demo records on ordinary seeder rerun;
25. perform destructive demo reset in production;
26. add a dependency solely for seed convenience without approval;
27. let seed behavior weaken `16` test isolation.

---

# PART T — ACCEPTANCE CHECKLIST

## 89. Reference / Bootstrap

- [ ] explicit permission catalog seeded;
- [ ] canonical four roles seeded;
- [ ] role bundles match `04`;
- [ ] no wildcard/session-login/logout permission rows;
- [ ] system-settings singleton default = ON / 30 / DAY only when missing;
- [ ] rerun preserves user-modified system settings;
- [ ] no production Team master seed;
- [ ] Protected Superadmin bootstrap identity matches locked values;
- [ ] Protected Superadmin temporary password is random + one-time + hash-only persistence;
- [ ] bootstrap rerun does not reset existing credential.

## 90. Demo Accounts / Teams

- [ ] Demo Team Alpha/Beta/Gamma only;
- [ ] six canonical `demo.*` accounts;
- [ ] demo password exactly `password`;
- [ ] demo password hash-only in DB;
- [ ] demo accounts `must_change_password=false`;
- [ ] `demo.disabled` inactive;
- [ ] `demo.multi` Reviewer + Approver;
- [ ] Team has no permission effect.

## 91. Demo NSCMF Dataset

- [ ] exactly 20 canonical scenarios unless a future approved spec revises the set;
- [ ] 10 Activation + 10 Change;
- [ ] all six family/subtype values represented;
- [ ] all seven canonical states represented;
- [ ] Reviewer Return/Reject/Forward represented;
- [ ] Approver Approve/Return Reviewer/Return Requester/Reject represented across coherent histories;
- [ ] Reopen from Approved represented;
- [ ] Reopen from Rejected represented;
- [ ] archive representative terminal records represented;
- [ ] multi-reviewer collaboration represented;
- [ ] one final successful Approver per closed Approved iteration;
- [ ] no mandatory SoD assumption;
- [ ] Change zero-Result PENDING_REVIEW represented;
- [ ] complete Change Result scenarios represented;
- [ ] every Service Impact code represented;
- [ ] Activation reference types represented;
- [ ] synthetic documentation domains/IPs only;
- [ ] deterministic manual `DEMO-*` Request Nos;
- [ ] no monthly automatic-number sequence pollution.

## 92. Binary / Security Safety

- [ ] no fake CLEAN attachment;
- [ ] no fake resumable chunk state;
- [ ] no fake READY export;
- [ ] no fake signed PDF/issuance/hash;
- [ ] no production key/cert secret;
- [ ] no fake template registry entry without actual template integrity evidence.

## 93. Environment Safety

- [ ] production Demo Seeder hard blocked;
- [ ] staging demo explicit opt-in only;
- [ ] local/development demo permitted;
- [ ] testing/CI independent from shared Demo Seeder;
- [ ] no production data copied into seed source;
- [ ] ordinary rerun non-destructive/idempotent.

---

# PART U — RELATIONSHIP TO DOCUMENTS 01–16

## 94. No Semantic Upstream Rewrite Required

The decisions locked in this document intentionally fill a downstream responsibility already reserved for `17`.

No semantic modification to `01–16` is required merely because `17` now specifies:

- no production Team master seed;
- synthetic Demo Teams for non-production;
- canonical Protected Superadmin bootstrap identity;
- local demo accounts/password;
- deterministic 20-record demo scenario matrix;
- environment-safe demo blocking;
- no fake attachment/export/signing evidence.

These decisions are compatible with upstream rules.

Historical `Next Document` wording in older documents remains historical progress metadata and does not change authority.

## 95. `16` Test Isolation Remains Authoritative

`17` MUST NOT be interpreted as permission for tests to depend on shared demo rows.

Factories/fixtures/test setup remain independently arranged according to `16`.

## 96. `13` Seeder Placement Is Now Resolved

`13` reserved `database/seeders/` detail to `17` and prohibited inventing Team master data before this specification.

This document now provides the detailed seed authority while preserving that physical folder boundary.

---

# PART V — INTENTIONALLY NOT INVENTED

## 97. Production Team Master Data

Still not defined here.

Production Teams must come from organization-approved real master data through authorized administration/import/bootstrap change later.

## 98. Official Numbering SOP

Still TBD beyond existing automatic/manual rules.

Demo manual `DEMO-*` numbers are non-production synthetic identifiers and do not establish company SOP.

## 99. Production Business Master Data

No customer/service/network/POP/Regional/hosting master import is established by this document.

## 100. Attachment / Export Demo Fixture Command

A future command that creates real local demo attachments/XLSX/PDF/signed-PDF artifacts may be designed after the corresponding implementation/infrastructure is available.

It MUST use real validation/scan/render/sign flows and is not silently invented here.

## 101. Load / Performance Dataset

The 20-record demo dataset is not a load-testing dataset.

Any large-volume performance seed belongs to future performance/deployment work once numeric objectives are approved.

---

# PART W — FINAL LOCKED DECISIONS

## 102. Confirmed Seed Decisions

The following are now LOCKED:

1. no production Team master seed;
2. local/development demo Teams = Demo Team Alpha/Beta/Gamma;
3. production-safe reference seed includes canonical permission catalog/default roles/default bundles/system-settings singleton default;
4. Protected Superadmin bootstrap identity = `superadmin` / `Protected Superadmin` / Team null / active / protected / must-change-password / Superadmin role;
5. Protected Superadmin temporary password is randomly generated and revealed once; no hard-coded bootstrap password;
6. demo users = two Requesters, one Reviewer, one Approver, one Reviewer+Approver multi-role, one disabled Requester;
7. demo account password = `password`;
8. demo account `must_change_password=false`;
9. demo dataset uses deterministic synthetic data only;
10. exactly 20 canonical demo NSCMF scenarios: 10 Activation + 10 Change;
11. dataset covers every canonical lifecycle state, every family subtype, and major workflow/lifecycle scenarios including Return/Reject/Forward/Approve/Reopen/Archive;
12. demo Request Nos use deterministic manual `DEMO-ACT-*` / `DEMO-CHG-*` values and do not consume monthly automatic numbering sequence;
13. Service Impact enum set is represented across Change demo data;
14. demo scenarios preserve coherent workflow iteration/sign-off/audit history;
15. production Demo Seeder is hard blocked;
16. staging demo is explicit opt-in only;
17. testing/CI do not depend on shared Demo Seeder;
18. default Demo Seeder does not fabricate attachment/CLEAN/export/READY/signing/issuance evidence;
19. ordinary seed rerun is idempotent/non-destructive and does not reset credentials/runtime settings;
20. no new dependency is authorized by this specification.

---

# PART X — HANDOFF

## 103. Relationship to `18_Definition_of_Done.md`

`17` defines what baseline/reference/demo data exists and how safely it may be created.

`18_Definition_of_Done.md` will define the authoritative completion/acceptance gate for implementation work and the project as appropriate, incorporating relevant coding/testing/seed safety without redefining these authorities.

## 104. Next Document

Next fixed-order document, **only after explicit user instruction**:

**`18_Definition_of_Done.md`**.

Do not create `18` until explicitly instructed by the user.
