# Permission, audit, queue, scheduler dan seed

Katalog ini menutup concern yang tidak cukup terwakili oleh daftar endpoint. Setiap event/permission/seed memiliki owner; category/event names yang hanya “typical” dalam authority tetap examples, bukan closed enum baru. Schema audit detail tetap pada08. Business mutation dan audit success commit bersama, Access reads/downloads tidak membanjiri Timeline, Security tidak menyimpan secret. Authoritative audit tidak age-purge.

## Queue/scheduler ownership

| Trigger                            | Owner                                                         | Acceptance failure boundary                                                                        |
| ---------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Complete upload                    | [BE-096](BE-096.md), [BE-097](BE-097.md), [BE-098](BE-098.md) | after commit; missing chunks/storage/scan fail→no usable file; duplicate workers one promotion     |
| XLSX export request                | [BE-108](BE-108.md), [BE-109](BE-109.md)                      | immutable snapshot; unavailable worker→QUEUED, no false READY; failed job visible sanitized        |
| PDF export/sign                    | [BE-115](BE-115.md), [BE-117](BE-117.md), [BE-119](BE-119.md) | renderer finite timeout; signing fail→FAILED/no unsigned Approved; no issuance success on rollback |
| Unfinished uploads24h/new progress | [BE-128](BE-128.md)                                           | new progress/active finalization race protected, duplicate not refresh                             |
| READY binaries168h                 | [BE-129](BE-129.md)                                           | expiry binary only; issuance/snapshot/audits/cert history retained                                 |
| Technical logs                     | [BE-127](BE-127.md), [BE-130](BE-130.md)                      | DB current setting OFF skip; DAY/MONTH calendar Jakarta, no age-purge audits                       |
| Abandoned assembly/quarantine/temp | [BE-130](BE-130.md), [BE-128](BE-128.md)                      | eligible/stale vs active ownership; no workflow automation; G18 when lifecycle detail missing      |

## 04 §11 — Login / Logout

Owner: [BE-027](BE-027.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 176.

No `session.login`/`session.logout` permission rows.

Authentication remains:

```text
username + password
minimum 6
no composition
no MFA
```

## 04 §12 — NSCMF Core

Owner: [BE-047](BE-047.md), [BE-062](BE-062.md), [BE-076](BE-076.md), [BE-086](BE-086.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 193.

| Permission                 | Description                             |
| -------------------------- | --------------------------------------- |
| `nscmf.create`             | Membuat record baru                     |
| `nscmf.draft.edit`         | Edit eligible own Draft/Revision        |
| `nscmf.submit`             | Submit/Resubmit own eligible record     |
| `nscmf.cancel`             | Cancel own Draft before first Submit    |
| `nscmf.change.result.edit` | Narrow Change Result edit               |
| `nscmf.view`               | View subject to resource rules          |
| `nscmf.view.history`       | History subject to resource rules       |
| `nscmf.attachment.manage`  | Manage attachment in eligible context   |
| `nscmf.export`             | Export authorized record                |
| `nscmf.export.bulk`        | Bulk export authorized selected records |
| `nscmf.timeline.view`      | View Business Timeline                  |

Requester mutation ownership remains explicit where upstream says own record.

## 04 §13 — Review Permissions

Owner: [BE-066](BE-066.md), [BE-070](BE-070.md), [BE-068](BE-068.md), [BE-069](BE-069.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 211.

| Permission             | Eligible State   |
| ---------------------- | ---------------- |
| `nscmf.review`         | `PENDING_REVIEW` |
| `nscmf.review.forward` | `PENDING_REVIEW` |
| `nscmf.review.return`  | `PENDING_REVIEW` |
| `nscmf.review.reject`  | `PENDING_REVIEW` |

No Team/scope matching. Reviewer non-exclusive; multiple contributors.

## 04 §14 — Approval Permissions

Owner: [BE-074](BE-074.md), [BE-071](BE-071.md), [BE-072](BE-072.md), [BE-073](BE-073.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 222.

| Permission                        | Eligible State     |
| --------------------------------- | ------------------ |
| `nscmf.approve`                   | `PENDING_APPROVAL` |
| `nscmf.approval.return_reviewer`  | `PENDING_APPROVAL` |
| `nscmf.approval.return_requester` | `PENDING_APPROVAL` |
| `nscmf.approval.reject`           | `PENDING_APPROVAL` |

No Team/scope matching. One successful valid Approve is sufficient.

## 04 §15 — Recovery / Lifecycle

Owner: [BE-078](BE-078.md), [BE-079](BE-079.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 233.

| Permission      | Description                       |
| --------------- | --------------------------------- |
| `nscmf.reopen`  | Reopen eligible Rejected/Approved |
| `nscmf.archive` | Archive/Unarchive eligible record |

No `nscmf.delete` or force-delete permission.

## 04 §16 — User Management

Owner: [BE-039](BE-039.md), [BE-040](BE-040.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 246.

| Permission             | Description                         |
| ---------------------- | ----------------------------------- |
| `users.view`           | View users                          |
| `users.create`         | Create normal users                 |
| `users.update`         | Update eligible normal users        |
| `users.enable`         | Enable eligible users               |
| `users.disable`        | Disable eligible users              |
| `users.reset_password` | Generate/reset temporary credential |
| `users.assign_roles`   | Assign/remove roles                 |
| `users.assign_team`    | Assign/move Team                    |

Sensitive password/role actions require valid current-password re-authentication proof. Security Rules lock proof lifetime to **15 minutes**.

Create/reset temporary credential behavior is server-generated + one-time reveal to acting admin; admin does not choose plaintext password.

Team change does not change authorization merely because Team changed.

## 04 §17 — Role / Permission Administration

Owner: [BE-041](BE-041.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 265.

| Permission           | Description                                    |
| -------------------- | ---------------------------------------------- |
| `roles.view`         | View role mapping                              |
| `roles.create`       | Create custom role                             |
| `roles.update`       | Update eligible role                           |
| `roles.archive`      | Reserved only if final supported model permits |
| `permissions.assign` | Assign/sync permissions to role                |

Effective access-changing mutations require 15-minute re-auth proof and session revocation side effects according to Security Rules.

## 04 §18 — Team Administration

Owner: [BE-038](BE-038.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 277.

| Permission           | Description                     |
| -------------------- | ------------------------------- |
| `teams.view`         | View Teams                      |
| `teams.create`       | Create Team                     |
| `teams.update`       | Update Team                     |
| `teams.archive`      | Archive/deactivate if supported |
| `teams.assign_users` | Assign/move users               |

No scope semantics.

## 04 §19 — Core System Settings — Protected Superadmin Only

Owner: [BE-126](BE-126.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 289.

Canonical permission:

```text
system.settings.manage
```

Current protected configurable Core Setting includes:

```text
Technical Log Automatic Cleanup ON/OFF
Technical Log Retention positive value
Technical Log Retention Unit DAY|MONTH
```

Default policy:

```text
Automatic Cleanup = ON
Retention = 30 DAY
```

Authorization requires **all**:

```text
Protected Superadmin identity
+ system.settings.manage
+ valid authenticated session
+ valid current-password re-auth proof <= 15 minutes
+ validated typed setting payload
```

A custom role MAY NOT use this permission to bypass the Protected Superadmin-only product rule.

This setting affects Technical Logs only. It MUST NOT provide any ability to age-purge:

```text
Business Audit
Access Audit
Security Audit
NSCMF source/history/workflow
PDF issuance/certificate verification history
```

There is no permission such as:

```text
audit.purge
audit.delete
business_audit.retention.manage
security_audit.retention.manage
```

## 04 §20 — Privileged Audit Permissions

Owner: [BE-085](BE-085.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 343.

| Permission            | Description           |
| --------------------- | --------------------- |
| `audit.access.view`   | View raw Access Audit |
| `audit.security.view` | View Security Audit   |

Protected Superadmin gets both by default. Eligible custom roles may receive view permissions. No edit/delete/purge capability and no Team scope.

## 04 §21 — Core Matrix

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 356.

Legend: ✅ default; 🔒 protected/inherent; `Own` explicit ownership; — not default but potentially grantable if business rules permit; ❌ unavailable.

| Capability                            | Superadmin | Requester | Reviewer | Approver |
| ------------------------------------- | ---------: | --------: | -------: | -------: |
| Login / Logout                        |       Auth |      Auth |     Auth |     Auth |
| Create NSCMF                          |         ✅ |        ✅ |        — |        — |
| Edit own Draft/Revision               |         ✅ |    ✅ Own |        — |        — |
| Edit own Change Result PENDING_REVIEW |         ✅ |    ✅ Own |        — |        — |
| Cancel/Submit own eligible record     |         ✅ |    ✅ Own |        — |        — |
| View authorized NSCMF/Timeline        |         ✅ |        ✅ |       ✅ |       ✅ |
| Review actions                        |         ✅ |         — |       ✅ |        — |
| Approval actions                      |         ✅ |         — |        — |       ✅ |
| Reopen Approved/Rejected              |         ✅ |         — |        — |        — |
| Archive/Unarchive                     |         ✅ |         — |        — |        — |
| Single/Bulk Export authorized         |         ✅ |        ✅ |       ✅ |       ✅ |
| Hard Delete                           |         ❌ |        ❌ |       ❌ |       ❌ |

## 04 §22 — Administration Matrix

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 375.

| Capability                     | Superadmin | Requester | Reviewer | Approver |
| ------------------------------ | ---------: | --------: | -------: | -------: |
| User admin                     |         ✅ |         — |        — |        — |
| Reset Password / Assign Roles  |         ✅ |         — |        — |        — |
| Team admin                     |         ✅ |         — |        — |        — |
| Role/Permission admin          |         ✅ |         — |        — |        — |
| View raw Access/Security Audit |         ✅ |         — |        — |        — |
| Manage protected Core Settings |         🔒 |         — |        — |        — |
| Impersonate User               |         ❌ |        ❌ |       ❌ |       ❌ |

Normal eligible administration MAY be delegated except Protected Core Settings and protected invariants.

## 04 §23 — Requester Actions

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 393.

Create/Edit/Save/Result/Cancel/Submit/Resubmit/View/Export follow exact permission + ownership/state rules from upstream docs.

## 04 §24 — Reviewer Actions

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 397.

Review/Forward/Return/Reject require action-specific permission + `PENDING_REVIEW`; no Team/scope.

## 04 §25 — Approver Actions

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 401.

Approve/Returns/Reject require action-specific permission + `PENDING_APPROVAL`; no Team/scope.

## 04 §26 — Protected Settings Action

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 405.

| Action                               | Permission               | Additional invariant                                                |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| View Technical Log cleanup setting   | `system.settings.manage` | Protected Superadmin + authenticated session                        |
| Update Technical Log cleanup setting | `system.settings.manage` | Protected Superadmin + valid <=15m re-auth proof + typed validation |

The settings endpoint cannot mutate authoritative audit retention.

## 04 §27 — Multi-Role

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 418.

Permission union applies. Same user MAY participate across stages when permissions/state/security rules pass. No mandatory segregation of duties.

## 04 §28 — Reviewer Collaboration

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 422.

Shared permission-based, non-exclusive, multi-actor Business Audit.

## 04 §29 — Approver Collaboration

Owner: [BE-032](BE-032.md), [BE-080](BE-080.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 426.

Shared permission-based, non-exclusive, single successful final approval actor.

## 04 §30 — Audit Visibility

Owner: [BE-084](BE-084.md), [BE-085](BE-085.md), [BE-127](BE-127.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 434.

Business Timeline follows record authorization. Raw Access/Security Audit requires explicit audit permissions + applicable admin/resource authorization. Team irrelevant.

Authoritative audits have no age purge and no normal edit/delete.

## 04 §31 — Technical Logs Are Not Authoritative Audit

Owner: [BE-084](BE-084.md), [BE-085](BE-085.md), [BE-127](BE-127.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 440.

Technical application/runtime logs are operational diagnostics. Protected Superadmin may configure their automatic cleanup under §19.

This does **not** create an audit-retention permission. Technical Log cleanup setting and authoritative audit visibility/deletion are separate concerns.

## 04 §32 — Evaluation

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 450.

Backend conceptually evaluates:

```text
1. valid active authenticated session?
2. protected identity invariant where required?
3. required permission?
4. ownership if explicitly required?
5. resource authorization?
6. archive compatibility?
7. state eligibility?
8. input/action validation?
9. destination/narrow-field restriction?
10. security/re-auth precondition?
11. concurrency/current-state check?
12. execute transaction/version strategy.
13. write required audit evidence.
```

Team intentionally absent.

## 04 §33 — Requester Bundle

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 476.

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

## 04 §34 — Reviewer Bundle

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 492.

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

## 04 §35 — Approver Bundle

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 506.

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

## 04 §36 — Superadmin Bundle

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 520.

All defined normal app permissions plus `nscmf.reopen`, `nscmf.archive`, privileged audit views, eligible admin permissions, and `system.settings.manage`, subject to protected invariants.

No hard-delete/impersonation/invalid-state/audit-purge/security bypass.

## 04 §37 — Required Mapping

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 530.

```text
Spatie → runtime roles/permissions
Policies/Gates → resource/action auth
Services → ownership/state/security/concurrency/audit orchestration
Team domain → organizational only
SystemSettingsService → protected settings orchestration
SystemSettingsRepository → typed settings persistence
```

## 04 §38 — Sensitive Mutation Orchestration

Owner: [BE-032](BE-032.md), [BE-041](BE-041.md), [BE-037](BE-037.md). Source [04](../project_doc/04_RBAC_Permission_Matrix.md), baris 541.

Role/permission/password/Core Settings mutations use current-password re-auth. Re-auth proof lifetime = 15 minutes.

Temporary credentials are server-generated and revealed once. No plaintext persistence.

## 11 §34 — `business_audit_events`

Owner: [BE-017](BE-017.md), [BE-081](BE-081.md). Source [11](../project_doc/11_ERD_Database_Schema.md), baris 886. Column tables: [schema](08_SCHEMA_DAN_CONSTRAINT.md#schema-34).

`actor_type`: `USER|SYSTEM`.

Typical explicit `event_type` examples:

```text
RECORD_CREATED
DRAFT_UPDATED
SUBMITTED
RESULT_UPDATED
REVIEW_FORWARDED
REVIEW_RETURNED
REVIEW_REJECTED
APPROVAL_RETURNED_REVIEWER
APPROVAL_RETURNED_REQUESTER
APPROVAL_REJECTED
APPROVED
REOPENED
CANCELLED
ARCHIVED
UNARCHIVED
ATTACHMENT_ADDED
ATTACHMENT_REMOVED
```

## 11 §35 — `business_audit_changes`

Owner: [BE-017](BE-017.md), [BE-081](BE-081.md). Source [11](../project_doc/11_ERD_Database_Schema.md), baris 929. Column tables: [schema](08_SCHEMA_DAN_CONSTRAINT.md#schema-35).

Business Audit rows are append-oriented. Normal application code MUST NOT update/delete historical events or changes.

## 11 §36 — `access_audit_events`

Owner: [BE-017](BE-017.md), [BE-082](BE-082.md). Source [11](../project_doc/11_ERD_Database_Schema.md), baris 946. Column tables: [schema](08_SCHEMA_DAN_CONSTRAINT.md#schema-36).

Typical: `RECORD_VIEWED`, `ATTACHMENT_VIEWED`, `ATTACHMENT_DOWNLOADED`, `EXPORT_REQUESTED`, `EXPORT_DOWNLOADED`, `PRIVILEGED_AUDIT_VIEWED`.

No routine Access Audit event becomes a Business Timeline row.

## 11 §37 — `security_audit_events`

Owner: [BE-017](BE-017.md), [BE-083](BE-083.md). Source [11](../project_doc/11_ERD_Database_Schema.md), baris 962. Column tables: [schema](08_SCHEMA_DAN_CONSTRAINT.md#schema-37).

Typical events include login failure/throttling, credential reset, temporary-password replacement, role changes, permission changes, session revocation, account enable/disable, malware outcomes, signing readiness/failure, privileged security-audit access, and protected Core Settings mutation.

`outcome`: `SUCCESS|FAILURE|DENIED|ERROR`.

Passwords, hashes of supplied passwords, temporary-password plaintext, private keys, passphrases, secret tokens, or raw sensitive payloads MUST NOT be stored.

## 11 §38 — Authoritative Audit Retention

Owner: [BE-017](BE-017.md), [BE-083](BE-083.md). Source [11](../project_doc/11_ERD_Database_Schema.md), baris 986. Column tables: [schema](08_SCHEMA_DAN_CONSTRAINT.md#schema-38).

These tables have **no age-based application purge**:

```text
business_audit_events
business_audit_changes
access_audit_events
security_audit_events
```

Normal app code exposes no delete path.

Technical Log cleanup setting in `system_settings` is explicitly prohibited from targeting these tables.

## 17 §5 — Canonical Seed Categories

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 93.

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

## 17 §6 — Factories Are Separate

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 115.

`database/factories/` remains test/development builders.

Factories MUST NOT become production reference-data authority.

Automated tests MUST NOT depend on the Demo Seeder having run first.

## 17 §7 — Environment Matrix — LOCKED

Owner: [BE-134](BE-134.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 127.

| Environment         |                      Reference / bootstrap seed |              Demo dataset | Notes                                       |
| ------------------- | ----------------------------------------------: | ------------------------: | ------------------------------------------- |
| Local / development |                                             YES |                       YES | canonical developer demo environment        |
| Testing             | only explicitly needed isolated reference setup | NO shared demo dependency | tests create their own data                 |
| CI                  | only explicitly needed isolated reference setup |                        NO | CI must remain deterministic/isolation-safe |
| Staging             |                                             YES |      explicit opt-in only | never automatic                             |
| Production          |                                             YES |          **HARD BLOCKED** | no demo Team/user/NSCMF records             |

## 17 §8 — Production Demo Hard Block

Owner: [BE-134](BE-134.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 137.

Any entrypoint capable of creating Demo Teams, Demo Users, demo password `password`, or `DEMO-*` NSCMF data MUST refuse execution when application environment is production.

Production MUST NOT rely merely on operator memory to avoid demo seed execution.

Conceptual behavior:

```text
APP_ENV=production
+ DemoSeeder requested
→ ABORT / FAIL CLOSED
→ no demo row created
```

## 17 §9 — Staging Explicit Opt-In

Owner: [BE-134](BE-134.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 152.

Staging does not receive demo data automatically.

If an operator intentionally needs the demo dataset in staging:

- execution must be explicit;
- environment must be positively recognized as staging;
- operator must understand that demo credentials are synthetic known credentials;
- no production data/keys may be mixed into the demo dataset;
- the operation must not be bundled silently into routine deploy/migration.

## 17 §10 — Local / Development Default

Owner: [BE-134](BE-134.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 164.

Local/development MAY run the complete demo dataset after migrations/reference bootstrap.

The dataset is deliberately compact and deterministic rather than large/random.

## 17 §11 — Testing / CI Independence

Owner: [BE-134](BE-134.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 170.

Testing and CI MUST follow `16`:

```text
test arranges its own state
→ test executes
→ test asserts
→ disposable state is isolated/cleaned
```

A test MUST NOT pass only because `DemoSeeder` happened to create a user, role, Team, record, session, or audit row earlier.

## 17 §12 — Permission Catalog

Owner: [BE-132](BE-132.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 187.

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

## 17 §13 — Default Roles

Owner: [BE-132](BE-132.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 278.

Production-safe seed creates exactly the canonical default role templates:

```text
Superadmin
Requester
Reviewer
Approver
```

Custom organization roles are not seeded unless separately approved later.

## 17 §14 — Default Permission Bundles

Owner: [BE-132](BE-132.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 291.

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

## 17 §15 — Spatie Boundary

Owner: [BE-132](BE-132.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 345.

Reference seed MUST preserve:

```text
guard = web
teams = false
wildcard permissions = false
```

Do not create Team-scoped role instances or duplicate RBAC tables.

## 17 §16 — System Settings Singleton

Owner: [BE-132](BE-132.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 357.

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

## 17 §17 — No Production Team Master Seed — LOCKED

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 381.

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

## 17 §18 — Protected Superadmin Team Nullability

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 401.

The canonical bootstrap Protected Superadmin starts with:

```text
team_id = NULL
```

This is explicitly permitted by schema for bootstrap setup.

If the Protected Superadmin later needs to create an NSCMF record, the normal active-Team requirement still applies. Seed MUST NOT invent a production Team merely to bypass that requirement.

## 17 §19 — Demo Teams

Owner: [BE-135](BE-135.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 413.

Demo dataset creates exactly these clearly synthetic Teams:

```text
Demo Team Alpha
Demo Team Beta
Demo Team Gamma
```

All are active.

These names are intentionally neutral so they do not imply permission or Reviewer/Approver scope.

Team membership MUST NOT change effective Review/Approval permission.

## 17 §20 — Canonical Bootstrap Identity — LOCKED

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 433.

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

## 17 §21 — Temporary Password Generation

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 447.

The bootstrap process MUST generate a cryptographically appropriate random temporary password server-side.

MUST NOT hard-code production bootstrap credentials such as:

```text
admin123
superadmin
password
changeme
```

The local demo password `password` defined later is **not** the Protected Superadmin bootstrap password.

## 17 §22 — One-Time Plaintext Reveal

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 462.

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

## 17 §23 — Bootstrap Execution Channel

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 477.

Because a one-time secret is involved, Protected Superadmin bootstrap SHOULD be an operator-controlled bootstrap operation rather than an unattended recurring seed step whose console output may be copied into CI/deployment logs.

The implementation MAY use a dedicated Laravel seed/bootstrap command as long as the security behavior above is preserved.

Production Protected Superadmin bootstrap MUST NOT run in CI.

## 17 §24 — Idempotent Re-run

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 485.

If canonical `superadmin` already exists as the protected identity:

- do not generate another temporary password automatically;
- do not reset its password;
- do not clear/change its Team;
- do not disable it;
- preserve required protected role/invariant;
- do not print/recover old plaintext.

If the one-time initial plaintext was lost, use the approved explicit admin reset/recovery process once another authorized recovery path exists; never retrieve prior plaintext.

## 17 §25 — Conflict Handling

Owner: [BE-133](BE-133.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 498.

If bootstrap discovers an incompatible pre-existing `superadmin` identity that would make the protected invariant ambiguous, it MUST fail visibly for operator resolution rather than silently taking over or deleting the account.

## 17 §26 — Demo Account Set — LOCKED

Owner: [BE-135](BE-135.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 506.

Local/development demo dataset contains:

| Username           | Display name       | Team            | Role(s)             | Active |
| ------------------ | ------------------ | --------------- | ------------------- | -----: |
| `demo.requester.a` | Demo Requester A   | Demo Team Alpha | Requester           |    YES |
| `demo.requester.b` | Demo Requester B   | Demo Team Beta  | Requester           |    YES |
| `demo.reviewer`    | Demo Reviewer      | Demo Team Gamma | Reviewer            |    YES |
| `demo.approver`    | Demo Approver      | Demo Team Alpha | Approver            |    YES |
| `demo.multi`       | Demo Multi Role    | Demo Team Beta  | Reviewer + Approver |    YES |
| `demo.disabled`    | Demo Disabled User | Demo Team Gamma | Requester           |     NO |

Protected `superadmin` remains separate from this demo-account set.

## 17 §27 — Demo Password — LOCKED

Owner: [BE-135](BE-135.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 521.

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

## 17 §28 — Disabled Demo Account

Owner: [BE-135](BE-135.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 537.

`demo.disabled` exists to demonstrate disabled-account presentation/authorization behavior.

It MUST remain inactive after demo seed and MUST NOT be used as an actor for successful business events.

## 17 §29 — Multi-Role Demo Account

Owner: [BE-135](BE-135.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 543.

`demo.multi` intentionally carries both Reviewer and Approver roles to demonstrate:

- multi-role is supported;
- permission union applies;
- there is no mandatory segregation-of-duties rule;
- Team remains irrelevant to Review/Approval eligibility.

## 17 §30 — Synthetic Only

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 556.

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

## 17 §31 — Deterministic Data

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 575.

Demo data SHOULD be deterministic so humans/agents can refer to known scenarios reliably.

Use stable synthetic dates/timestamps and fixed scenario keys rather than random Faker values for authoritative demo scenarios.

Canonical timezone remains `Asia/Jakarta`.

## 17 §32 — Manual Demo Request Numbers

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 583.

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

## 17 §33 — No Invalid Shared Demo Rows

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 601.

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

## 17 §34 — Dataset Size — LOCKED

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 621.

The canonical demo dataset contains **20 NSCMF records**:

```text
10 Activation-family records
10 Change-family records
```

The set is intentionally small enough for manual exploration but broad enough to represent every canonical lifecycle state and major workflow/lifecycle scenario.

## 17 §35 — Activation Scenarios

Owner: [BE-136](BE-136.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 632.

| Request No     | Subtype           | Current state     | Archive | Scenario intent                                                         |
| -------------- | ----------------- | ----------------- | ------: | ----------------------------------------------------------------------- |
| `DEMO-ACT-001` | ACTIVATION        | DRAFT             |      NO | incomplete editable Draft; no workflow iteration                        |
| `DEMO-ACT-002` | ACTIVATION        | PENDING_REVIEW    |      NO | first Submit / iteration 1 waiting for Review                           |
| `DEMO-ACT-003` | UPGRADE_DOWNGRADE | REVISION_REQUIRED |      NO | Reviewer Return to Requester; same iteration                            |
| `DEMO-ACT-004` | UPGRADE_DOWNGRADE | PENDING_APPROVAL  |      NO | reviewer collaboration; current Reviewed By from final Forward actor    |
| `DEMO-ACT-005` | ACTIVATION        | APPROVED          |      NO | normal full happy path / one final Approver                             |
| `DEMO-ACT-006` | DEACTIVATION      | REJECTED          |      NO | Reviewer Reject terminal iteration                                      |
| `DEMO-ACT-007` | DEACTIVATION      | CANCELLED         |      NO | Cancel before first Submit; no workflow iteration                       |
| `DEMO-ACT-008` | UPGRADE_DOWNGRADE | APPROVED          |     YES | Approved + archived terminal record                                     |
| `DEMO-ACT-009` | ACTIVATION        | REVISION_REQUIRED |      NO | previously Approved, Reopened to iteration 2 / old iteration superseded |
| `DEMO-ACT-010` | DEACTIVATION      | PENDING_REVIEW    |      NO | previously Rejected, Reopened directly to Review / iteration 2          |

## 17 §36 — Change Scenarios

Owner: [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 647.

| Request No     | Subtype     | Current state     | Archive | Scenario intent                                                                 |
| -------------- | ----------- | ----------------- | ------: | ------------------------------------------------------------------------------- |
| `DEMO-CHG-001` | MAINTENANCE | DRAFT             |      NO | incomplete Change Draft                                                         |
| `DEMO-CHG-002` | MAINTENANCE | PENDING_REVIEW    |      NO | first Submit with zero Result rows still legal before Forward                   |
| `DEMO-CHG-003` | UPGRADE     | PENDING_REVIEW    |      NO | Result updated by owner; one+ complete Result, ready for Reviewer action        |
| `DEMO-CHG-004` | EMERGENCY   | REVISION_REQUIRED |      NO | Reviewer Return; Emergency still follows normal workflow                        |
| `DEMO-CHG-005` | MAINTENANCE | PENDING_APPROVAL  |      NO | Reviewer Forward + complete Result requirement satisfied                        |
| `DEMO-CHG-006` | UPGRADE     | APPROVED          |      NO | multi-role actor participates across allowed stages; no mandatory SoD           |
| `DEMO-CHG-007` | EMERGENCY   | REJECTED          |      NO | Approver Reject after successful Review                                         |
| `DEMO-CHG-008` | MAINTENANCE | CANCELLED         |     YES | Cancelled before first Submit, then archived                                    |
| `DEMO-CHG-009` | EMERGENCY   | APPROVED          |     YES | Emergency full approval path + archived; no bypass                              |
| `DEMO-CHG-010` | UPGRADE     | PENDING_REVIEW    |      NO | Approver Return Reviewer; effective Reviewed By cleared; fresh Forward required |

## 17 §37 — Canonical State Coverage

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 662.

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

## 17 §38 — Family / Subtype Coverage

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 678.

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

## 17 §39 — Draft / Cancelled

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 702.

`DRAFT` and never-submitted `CANCELLED` demo records MUST have:

- no current workflow iteration;
- null Requested By / first submitted timestamp where schema requires;
- no fake Reviewed By / Approved By.

## 17 §40 — First Submit

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 710.

Every post-submit scenario begins with iteration 1.

First successful Submit actor becomes `requested_by_user_id` and is never overwritten by Reopen.

## 17 §41 — Reviewer Collaboration Scenario

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 716.

At least one demo record (canonical target: `DEMO-ACT-004`) MUST demonstrate multiple eligible reviewers contributing across one iteration, for example:

```text
Demo Reviewer performs an earlier Review action/Return
→ Requester revises/resubmits
→ Demo Multi Role performs successful Forward
→ current Reviewed By = Demo Multi Role
→ prior actor remains visible in Business Audit history
```

There is no exclusive reviewer assignment.

## 17 §42 — Approval Scenario

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 730.

Approved demo records MUST show exactly one final successful approval actor per closed iteration.

Other eligible Approvers remain eligible pool members but are not fabricated as multiple successful final approvers.

## 17 §43 — Multi-Role / No Mandatory SoD Scenario

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 736.

At least one record (canonical target: `DEMO-CHG-006`) SHOULD demonstrate that `demo.multi` can legally participate in Review and Approval when its permissions/state requirements are satisfied, because current project has no mandatory segregation-of-duties rule.

This is not permission for invalid same-request state transitions or bypassing validation.

## 17 §44 — Reviewer Reject vs Approver Reject

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 742.

Dataset SHOULD distinguish both rejection origins:

- `DEMO-ACT-006` → Reviewer Reject;
- `DEMO-CHG-007` → Approver Reject.

Both end in canonical `REJECTED`, with audit history showing the path.

## 17 §45 — Approver Return Requester

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 751.

At least one `REVISION_REQUIRED` scenario SHOULD represent:

```text
PENDING_APPROVAL
→ Approver Return Requester
→ REVISION_REQUIRED
```

This may be represented within `DEMO-ACT-009` historical iteration before or after a suitable lifecycle sequence as long as the final seeded state/iteration remains coherent.

## 17 §46 — Approver Return Reviewer

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 763.

`DEMO-CHG-010` represents:

```text
PENDING_APPROVAL
→ Approver Return Reviewer
→ PENDING_REVIEW
```

The current effective `reviewed_by_user_id` / `reviewed_at` MUST be cleared because a fresh Forward is required, while the previous Forward/Return remain in Business Audit history.

## 17 §47 — Reopen Approved

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 775.

`DEMO-ACT-009` MUST represent:

```text
Iteration 1 → APPROVED
→ Reopen with reason
→ Iteration 2
→ REVISION_REQUIRED
```

Iteration 1 is historical/superseded. Requested By remains the first-submit actor.

## 17 §48 — Reopen Rejected

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 788.

`DEMO-ACT-010` MUST represent:

```text
Iteration 1 → REJECTED
→ Reopen with reason
→ Iteration 2
→ PENDING_REVIEW
```

## 17 §49 — Archive Scenarios

Owner: [BE-136](BE-136.md), [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 799.

Dataset MUST include representative archives for eligible terminal classes:

- Approved archived (`DEMO-ACT-008`, `DEMO-CHG-009`);
- Cancelled archived (`DEMO-CHG-008`).

A Rejected archive MAY be added only if dataset size remains coherent, but it is not necessary to duplicate every terminal archive because archive eligibility itself is already tested in `16`.

Archive flag never changes canonical business status.

## 17 §50 — Activation Representative Data

Owner: [BE-136](BE-136.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 814.

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

## 17 §51 — Activation Reference Types

Owner: [BE-136](BE-136.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 838.

Across the 10 Activation records, all reference types SHOULD appear at least once:

```text
IWO
VELOSHIP
TICKET
OTHER
```

`OTHER` includes a valid specification/description.

## 17 §52 — Synthetic Network Values

Owner: [BE-136](BE-136.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 851.

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

## 17 §53 — Change Representative Data

Owner: [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 868.

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

## 17 §54 — Service Impact Complete Enum Coverage

Owner: [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 883.

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

## 17 §55 — Change Result Scenarios

Owner: [BE-137](BE-137.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 901.

Dataset MUST include at least:

1. `PENDING_REVIEW` with **zero Result** rows (`DEMO-CHG-002`) to demonstrate legal first-Submit state;
2. `PENDING_REVIEW` with one or more complete Results (`DEMO-CHG-003`);
3. `PENDING_APPROVAL` with complete Result prerequisite satisfied (`DEMO-CHG-005`);
4. an Approved Change with complete historical Results (`DEMO-CHG-006` or `009`).

No demo record exceeds five Results.

## 17 §56 — Requester Ownership Coverage

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 916.

Demo NSCMF ownership MUST be distributed between:

```text
demo.requester.a
demo.requester.b
```

so humans can observe own-record boundaries and distinguish one Requester's records from another.

## 17 §57 — Team Snapshot

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 927.

At NSCMF creation, record `team_id` captures the owner's current Demo Team.

Demo seed SHOULD preserve examples owned by both Demo Team Alpha and Demo Team Beta.

Later Team changes are not automatically replayed into existing record snapshots.

## 17 §58 — Team Is Never Workflow Scope

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 935.

Review/Approval actors intentionally come from Teams different from some record owners.

Example:

```text
record Team = Demo Team Alpha
Reviewer    = Demo Reviewer / Demo Team Gamma
→ review still eligible because permission/state allows it
```

This is a deliberate demo signal that Team is organizational metadata only.

## 17 §59 — Coherent Synthetic Business Audit

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 953.

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

## 17 §60 — Historical Actor Accuracy

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 974.

Audit actor must match the scenario:

- Requester actions → corresponding demo requester;
- Review actions → `demo.reviewer` or `demo.multi`;
- Approval actions → `demo.approver` or `demo.multi`;
- archive/reopen → an actor with the corresponding permission, normally Protected Superadmin in demo history where appropriate.

## 17 §61 — Timestamp Ordering

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 983.

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

## 17 §62 — Access / Security Audit Default

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 999.

Demo Seeder SHOULD NOT fabricate broad raw Access Audit or Security Audit history merely to make administration screens look busy.

Those audit classes represent security/access events and should normally be generated by actual demo interactions.

A narrowly justified synthetic Security/Access Audit demo set may be added later only with an explicit scenario requirement and must remain obviously synthetic.

## 17 §63 — No Fake Attachments — LOCKED

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1011.

Default Demo Seeder MUST NOT directly create fake final `nscmf_attachments` rows claiming:

```text
security_status = CLEAN
sha256 = <invented>
private_object_key = <nonexistent binary>
```

without corresponding real binary and malware-validation flow.

## 17 §64 — No Fake Resumable Upload State

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1023.

Default Demo Seeder MUST NOT fabricate accepted chunks/upload sessions that imply durable storage bytes exist when they do not.

Resumable-upload scenarios belong to real application interaction or purpose-specific isolated tests.

## 17 §65 — No Fake READY Export

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1029.

Default Demo Seeder MUST NOT create:

- READY export request with missing binary;
- export artifact with invented SHA;
- fake immutable snapshot used to claim a generated document exists;
- expired artifact metadata disconnected from a real generated artifact solely for display.

## 17 §66 — No Fake Signed PDF / Issuance — LOCKED

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1038.

Default Demo Seeder MUST NOT create fake:

- signed PDF artifact;
- `nscmf_pdf_issuances` row;
- `final_pdf_sha256`;
- certificate/signature result;
- `VALID_CURRENT` evidence.

Cryptographic authenticity must come from a real non-production signing/verification flow.

## 17 §67 — Template Registry Boundary

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1050.

Official template version registration is environment provisioning/integrity work and MUST NOT be faked by Demo Seeder if the exact private template binary + SHA-256 + mapping version are not actually present.

## 17 §68 — Recommended Demo Flow for Files

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1054.

When a human needs attachment/export/signature data in local/staging demo:

```text
seed relational NSCMF scenario
→ use real application attachment/export flow
→ real private binary
→ real ClamAV / renderer / non-production signer as applicable
→ resulting metadata becomes internally consistent
```

## 17 §69 — Reference Seed Idempotency

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1070.

Reference/bootstrap seed MUST be safe to rerun.

Expected behavior:

```text
permission exists → preserve/update only specification-owned mapping as intentionally designed
role exists       → preserve canonical identity and sync approved bundle deliberately
system setting exists → preserve runtime value
```

No duplicate rows.

## 17 §70 — No Credential Reset on Generic Re-run

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1084.

Generic `db:seed` or equivalent reference rerun MUST NOT reset:

- Protected Superadmin password;
- demo password after an operator intentionally changed it, unless an explicitly requested disposable demo reset operation is being performed;
- user sessions/credential state as an unrelated side effect.

## 17 §71 — Demo Record Identity

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1092.

Demo records use deterministic `DEMO-*` Request No as natural scenario identifiers.

If a demo record with the same deterministic identifier already exists, the normal Demo Seeder MUST NOT silently overwrite arbitrary user edits/workflow activity merely to restore the fixture.

Acceptable implementation directions:

- create-if-missing and preserve existing demo row; or
- detect incompatible existing demo state and fail/skip with a clear diagnostic.

Silent destructive reset is forbidden.

## 17 §72 — Disposable Demo Reset

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1105.

A future dedicated demo-reset operation MAY recreate synthetic local data only when:

- target is positively identified as local/development or explicitly approved staging demo;
- data is known demo/disposable data;
- production is hard blocked;
- operation follows destructive-action safety from `15`.

This document does not authorize deleting arbitrary non-demo records.

## 17 §73 — Transaction / Atomicity

Owner: [BE-138](BE-138.md). Source [17](../project_doc/17_Seed_Dummy_Data_Specification.md), baris 1116.

Seed groups SHOULD use transactions where practical so partial role/permission/scenario graphs are not left behind on failure.

Large external/file work is not part of default Demo Seeder.
