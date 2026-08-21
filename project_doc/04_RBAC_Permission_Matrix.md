# RBAC / Permission Matrix

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-RBAC-004  
> **Document Order:** 04 / 20  
> **Status:** Draft — Confirmed Permission-Centric Authorization + Spatie Alignment  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **siapa boleh melakukan apa** pada NSCMF Digital Form & Workflow System.

Dokumen menjadi source of truth untuk:

- default role template;
- canonical permission catalog;
- permission-based authorization behavior;
- ownership rules yang memang secara eksplisit berlaku pada Requester;
- multi-role behavior;
- custom role behavior;
- delegated administration;
- protected Superadmin restrictions;
- privileged audit visibility permissions;
- Team sebagai organizational metadata yang **bukan** authorization scope;
- boundary antara aplikasi dan `spatie/laravel-permission`;
- authorization guardrails untuk implementation dan AI coding agent.

Business Rules menentukan invariant. User Flow menentukan urutan interaction. State Flow menentukan lifecycle yang valid. Validation Rules menentukan apakah input/action valid. RBAC menentukan apakah actor mempunyai capability yang dibutuhkan. Security Rules menambahkan security preconditions seperti re-authentication dan session revocation tanpa mengubah business permission semantics.

---

## 2. Confirmed Authorization Direction

Current authorization model sengaja dibuat sederhana dan permission-centric:

```text
Effective Action Eligibility
=
Valid Authenticated Session
+
Required Permission
+
Ownership (only where an explicit business rule requires it)
+
Current Business State
+
Archive Treatment
+
Business Rules
+
Validation Rules
+
Protected Invariants
+
Security Preconditions
+
Concurrency / Current-State Revalidation
```

Tidak ada lagi Reviewer Scope, Approval Scope, Unit/Division Scope, atau Team-based authorization.

### 2.1 Permission Answers Capability

Permission menjawab:

> Apakah actor memiliki capability untuk melakukan action ini?

Contoh:

```text
nscmf.review.forward
```

berarti actor dapat mencoba menjalankan `Forward to Approval`.

### 2.2 State and Business Rules Still Apply

Permission bukan bypass terhadap state/business rules.

Contoh:

- actor punya `nscmf.approve` tetapi record bukan `PENDING_APPROVAL` → **DENY**;
- actor punya `nscmf.review.reject` tetapi record bukan `PENDING_REVIEW` → **DENY**;
- actor punya `nscmf.change.result.edit` tetapi record bukan Change `PENDING_REVIEW` → **DENY**;
- actor punya `nscmf.archive` tetapi record `DRAFT` → **DENY**;
- actor punya `nscmf.reopen` tetapi record `CANCELLED` → **DENY**;
- actor punya `users.reset_password` tetapi sensitive-action password re-authentication gagal → **DENY**.

### 2.3 Team Is Not Authorization

Organization menggunakan **Team**, misalnya Team NOC, Team CS, Team Fulfillment, dan team lain sesuai konfigurasi organisasi.

Team adalah organizational/profile data. Team MUST NOT:

- menentukan apakah user boleh Review;
- menentukan apakah user boleh Approve;
- membatasi Review queue;
- membatasi Approval queue;
- membuat role berbeda per Team;
- membuat permission berbeda per Team;
- menjadi hidden tenant boundary;
- menjadi pengganti permission.

Jika user Team NOC memiliki `nscmf.review.forward`, maka Team NOC itu sendiri tidak menambah atau mengurangi capability tersebut.

---

# PART A — AUTHORIZATION PRINCIPLES

## 3. Core Principles

### RBAC-PRINCIPLE-001 — Deny by Default
Action tanpa required permission atau tanpa prerequisite domain/security yang valid MUST ditolak.

### RBAC-PRINCIPLE-002 — Server-Side Enforcement
Permission, ownership requirement, archive flag, current state, validation, protected invariant, security precondition, dan stale-state protection MUST diverifikasi backend.

### RBAC-PRINCIPLE-003 — Multi-Role Allowed
Satu user MAY memiliki beberapa role.

### RBAC-PRINCIPLE-004 — Role Groups Permissions
Role digunakan untuk mengelompokkan permission dan memudahkan administrasi. Application authorization SHOULD memeriksa permission capability, bukan hard-code role name.

### RBAC-PRINCIPLE-005 — Permission Union
Effective permission user merupakan union dari permission yang diperoleh melalui seluruh assigned roles.

### RBAC-PRINCIPLE-006 — No Reviewer/Approver Scope
Reviewer dan Approver tidak memiliki organizational scope. Actor yang memiliki required permission dapat bertindak pada record dengan state yang eligible, subject to domain/security rules.

### RBAC-PRINCIPLE-007 — Team Has No Authorization Effect
Team membership adalah informational/organizational relationship dan MUST NOT dimasukkan ke permission decision.

### RBAC-PRINCIPLE-008 — Custom Roles Supported
Custom role MAY memperoleh kombinasi granular permissions selama protected invariant tetap dipatuhi.

### RBAC-PRINCIPLE-009 — No Impersonation
Tidak ada user impersonation/login-as-user.

### RBAC-PRINCIPLE-010 — Narrow Permission Stays Narrow
Permission seperti `nscmf.change.result.edit` MUST NOT ditafsirkan sebagai general submitted-form edit capability.

### RBAC-PRINCIPLE-011 — Security Preconditions Are Not Permissions
Password re-authentication, valid session, malware gate, signing readiness, dan equivalent security controls bukan business permission baru.

### RBAC-PRINCIPLE-012 — Package Does Not Override Domain Rules
Successful Spatie permission resolution MUST NOT bypass business state, ownership where required, archive treatment, validation, protected invariant, security precondition, atau current-state concurrency check.

---

# PART B — SPATIE LARAVEL PERMISSION BOUNDARY

## 4. Package Authority

Confirmed package:

```text
spatie/laravel-permission ^8
```

Package digunakan untuk role/permission primitives dan Laravel Gate integration.

Application MUST use the package's standard schema rather than creating a second RBAC schema.

Package-owned tables:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

`11_ERD_Database_Schema.md` MUST reference these tables as package-owned and MUST NOT create duplicate alternatives such as:

```text
user_roles
user_permissions
role_permissions
reviewer_roles
approver_roles
effective_permissions
```

unless a future explicit package replacement decision occurs.

## 5. Spatie Teams Feature MUST Be Disabled

The package has a feature also named `teams`. It is **not** the same thing as NSCMF organizational Team.

Required configuration:

```php
'permissions.teams' / config('permission.teams') = false
```

Conceptually, current `config/permission.php` MUST preserve:

```php
'teams' => false,
```

Implementation MUST NOT:

- enable Spatie Teams to represent Team NOC/CS/Fulfillment;
- add Spatie `team_id` to role/permission pivots for current MVP;
- call `setPermissionsTeamId()` for normal authorization;
- create team-scoped role instances;
- create team-scoped permission assignments.

Business `teams` data belongs to the application domain and stays separate from Spatie authorization tables.

## 6. Direct User Permission Policy

Spatie supports direct permission assignment through `model_has_permissions`. The table remains part of the package schema.

However, current MVP administration model is:

```text
Permission → Role → User
```

Therefore:

- normal admin UI MUST NOT expose direct permission-to-user assignment as an MVP feature;
- user authorization normally inherits permissions through assigned roles;
- `model_has_permissions` MUST NOT be deleted or repurposed because it belongs to the package;
- future direct-user permission usage requires explicit specification change.

## 7. Wildcard Permission Policy

Current MVP does not enable Spatie wildcard permissions.

Required direction:

```php
'enable_wildcard_permission' => false
```

Notation such as:

```text
nscmf.review.*
```

MAY appear only as human-readable shorthand in documentation. It MUST NOT be interpreted as a seeded wildcard permission row.

Actual permissions remain explicit, for example:

```text
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
```

## 8. Guard

Current session-authenticated web application uses the normal single `web` guard context for Spatie role/permission resolution. Additional permission guards MUST NOT be introduced without an explicit authentication architecture change.

---

# PART C — DEFAULT ROLE TEMPLATE

## 9. Default Roles

| Role | Purpose |
|---|---|
| `Superadmin` | Protected administrative authority tertinggi |
| `Requester` | Membuat dan mengelola own NSCMF workflow participation |
| `Reviewer` | Melakukan Review pada eligible `PENDING_REVIEW` record |
| `Approver` | Melakukan final Approval pada eligible `PENDING_APPROVAL` record |

Role template adalah starting point. Custom role dapat dibuat dengan different permission bundle.

## 10. Protected Superadmin

Protected Superadmin:

- seeded pada initial setup;
- protected role assignment MUST remain present;
- default menerima seluruh application permissions yang memang tersedia;
- memiliki global operational visibility;
- default eligible melihat privileged Access Audit dan Security Audit;
- tidak dapat disable/delete/downgrade/lose protected role;
- tidak memiliki NSCMF hard-delete karena capability itu tidak tersedia;
- tetap tunduk canonical state machine, validation, security preconditions, dan protected business invariants.

### 10.1 No Universal Business-Invariant Bypass

Implementation SHOULD use normal permission checks/Policies for application actions. Protected Superadmin MUST NOT memperoleh generic bypass yang membuat invalid business action valid.

Contoh yang tetap forbidden untuk Superadmin:

- Approve record yang bukan `PENDING_APPROVAL` melalui normal Approve action;
- Reopen `CANCELLED`;
- hard-delete NSCMF;
- bypass mandatory reason;
- bypass mandatory Approved-PDF signing by declaring unsigned output valid.

---

# PART D — AUTHENTICATION IS NOT A SPATIE PERMISSION

## 11. Login / Logout

`session.login` dan `session.logout` are **not** Spatie business permissions.

Login/logout merupakan authentication/session operations yang dikelola oleh Laravel Fortify/session security rules.

Enabled account dengan credential/session conditions yang valid dapat menjalani authentication flow tanpa membutuhkan row `session.login` pada table `permissions`.

Current authentication remains:

```text
username + password
minimum 6 characters
no composition requirement
no MFA
```

---

# PART E — NSCMF PERMISSION CATALOG

## 12. NSCMF Core

| Permission | Description |
|---|---|
| `nscmf.create` | Membuat record NSCMF baru |
| `nscmf.draft.edit` | Edit eligible own `DRAFT` / `REVISION_REQUIRED` |
| `nscmf.submit` | Submit own `DRAFT` atau Resubmit own `REVISION_REQUIRED` |
| `nscmf.cancel` | Cancel own `DRAFT` sebelum first Submit |
| `nscmf.change.result.edit` | Narrow edit Result of Changes pada eligible Change `PENDING_REVIEW` |
| `nscmf.view` | View NSCMF subject to applicable resource/ownership rules |
| `nscmf.view.history` | Access History subject to applicable resource rules |
| `nscmf.attachment.manage` | Manage attachment pada editable authorized context |
| `nscmf.export` | Export an authorized visible record |
| `nscmf.export.bulk` | Bulk export authorized selected records |
| `nscmf.timeline.view` | View Business Timeline pada authorized record |

### RBAC-CORE-001 — Requester Ownership
Requester mutation rules remain ownership-bound where the Business Rules say `own record`.

Examples:

```text
nscmf.draft.edit + owns record + editable state
nscmf.submit + owns record + submit/resubmit state
nscmf.cancel + owns record + DRAFT + never submitted
nscmf.change.result.edit + owns Change + PENDING_REVIEW
```

### RBAC-CORE-002 — View Does Not Change State
Opening/viewing record never creates exclusive ownership or workflow state.

### RBAC-CORE-003 — Export Requires Authorized View
An inaccessible record MUST NOT become accessible through export ID, bulk selection, or download endpoint.

### RBAC-CORE-004 — Result Permission Is Narrow
`nscmf.change.result.edit` permits only Result-of-Changes fields in the exact state/family/ownership context defined by `06_Validation_Rules.md`.

---

## 13. Review Permissions

| Permission | Description | Eligible State |
|---|---|---|
| `nscmf.review` | Review activity/readiness | `PENDING_REVIEW` |
| `nscmf.review.forward` | Forward to Approval | `PENDING_REVIEW` |
| `nscmf.review.return` | Return to Requester | `PENDING_REVIEW` |
| `nscmf.review.reject` | Reject at Review | `PENDING_REVIEW` |

Rules:

- no Team/scope match is required;
- Reviewer A does not lock Reviewer B/C;
- multiple Reviewer contributors may exist;
- opening a candidate does not assign it;
- Return/Reject reason requirements remain authoritative in Validation Rules;
- Forward comment remains optional;
- Change Forward requires Result gate.

Conceptual eligibility:

```text
required review permission
+ record business_status = PENDING_REVIEW
+ record not blocked by applicable lifecycle/security rule
+ action validation
= eligible review action
```

## 14. Approval Permissions

| Permission | Description | Eligible State |
|---|---|---|
| `nscmf.approve` | Final Approve | `PENDING_APPROVAL` |
| `nscmf.approval.return_reviewer` | Return to Review | `PENDING_APPROVAL` |
| `nscmf.approval.return_requester` | Return to Requester revision | `PENDING_APPROVAL` |
| `nscmf.approval.reject` | Reject at Approval | `PENDING_APPROVAL` |

Rules:

- no Team/scope match is required;
- Approver pool is non-exclusive;
- one successful eligible Approve is sufficient;
- `Approved By` is the actor who successfully commits `PENDING_APPROVAL -> APPROVED`;
- stale second Approve/Return/Reject is denied after state changes;
- Return/Reject reasons remain mandatory where defined;
- Approve comment remains optional.

Conceptual eligibility:

```text
required approval permission
+ record business_status = PENDING_APPROVAL
+ current-state/business/security prerequisites
= eligible approval action
```

## 15. Recovery / Lifecycle

| Permission | Description |
|---|---|
| `nscmf.reopen` | Reopen/Revert eligible `REJECTED` / `APPROVED` |
| `nscmf.archive` | Archive and Unarchive eligible terminal/protected record |

Reopen requires:

```text
nscmf.reopen
+ authorized record access
+ business_status in {REJECTED, APPROVED}
+ is_archived = false
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

Archive requires:

```text
nscmf.archive
+ authorized record access
+ business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ mandatory reason
```

Unarchive uses `nscmf.archive`, requires authorized record access + `is_archived=true` + mandatory reason, and does not change `business_status`.

There is no `nscmf.delete` or `nscmf.force_delete` permission.

---

# PART F — ADMINISTRATION PERMISSIONS

## 16. User Management

| Permission | Description |
|---|---|
| `users.view` | View users |
| `users.create` | Create normal users |
| `users.update` | Update eligible normal users |
| `users.enable` | Enable eligible normal users |
| `users.disable` | Disable eligible normal users |
| `users.reset_password` | Reset credential through temporary-password flow |
| `users.assign_roles` | Assign/remove roles |
| `users.assign_team` | Assign/move user to organizational Team |

User Team change is an organizational/profile mutation. It MUST NOT alter effective authorization merely because Team changed.

Sensitive role/permission/credential actions require password re-authentication and target-session revocation according to Security Rules. Team membership change by itself is not an authorization change and MUST NOT be falsely treated as a permission grant/revoke.

## 17. Role / Permission Administration

| Permission | Description |
|---|---|
| `roles.view` | View role mapping |
| `roles.create` | Create custom role |
| `roles.update` | Update eligible role |
| `roles.archive` | Archive eligible non-protected role if final data model supports it |
| `permissions.assign` | Assign/sync permission to role |

Rules:

- permissions are normally assigned to roles;
- roles are assigned to users;
- direct permission-to-user UI is not part of current MVP;
- protected Superadmin role cannot be removed/archive/downgraded;
- effective access-changing mutations require security side effects from `10_Security_Rules.md`.

## 18. Team Administration

| Permission | Description |
|---|---|
| `teams.view` | View Team master data |
| `teams.create` | Create Team |
| `teams.update` | Update Team |
| `teams.archive` | Archive eligible Team if final model permits |
| `teams.assign_users` | Assign/move users between Teams |

Team administration MUST NOT create reviewer/approval scope semantics.

There are intentionally no permissions such as:

```text
org_units.*
users.assign_scopes
teams.assign_reviewer_scope
teams.assign_approver_scope
```

under the current requirement.

## 19. System Settings

Core system settings remain protected Superadmin-only.

Conceptual permission:

```text
system.settings.manage
```

Sensitive protected settings require password re-authentication.

## 20. Privileged Audit Permissions

| Permission | Description |
|---|---|
| `audit.access.view` | View privileged/raw Access Audit evidence subject to resource/admin authorization |
| `audit.security.view` | View privileged Security Audit evidence subject to administrative/security authorization |

Rules:

- Protected Superadmin receives both by default;
- explicit eligible custom role MAY receive them;
- audit permissions do not grant NSCMF Review/Approval/Reopen/Archive capability;
- audit permissions do not create Team/scope semantics;
- normal roles cannot edit/delete authoritative historical audit evidence.

---

# PART G — DEFAULT ROLE PERMISSION MATRIX

## 21. Core Matrix

Legend:

- ✅ default permission/capability;
- 🔒 protected/inherent application authority;
- `Own` = explicit ownership condition;
- — not default but MAY be custom-granted if business rule permits;
- ❌ unavailable.

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| Login / Logout | Authentication | Authentication | Authentication | Authentication |
| Create NSCMF | ✅ | ✅ | — | — |
| Edit own `DRAFT` | ✅ | ✅ Own | — | — |
| Edit own `REVISION_REQUIRED` | ✅ | ✅ Own | — | — |
| Autosave / Save editable own record | ✅ | ✅ Own | — | — |
| Edit own Change Result in `PENDING_REVIEW` | ✅ | ✅ Own | — | — |
| Cancel own `DRAFT` | ✅ | ✅ Own | — | — |
| Submit/Resubmit own eligible record | ✅ | ✅ Own | — | — |
| View authorized NSCMF | ✅ | ✅ | ✅ | ✅ |
| View Business Timeline on authorized record | ✅ | ✅ | ✅ | ✅ |
| View raw Access Audit | ✅ | — | — | — |
| View Security Audit | ✅ | — | — | — |
| Manage attachment while authorized/editable | ✅ | ✅ Own | — | — |
| Review `PENDING_REVIEW` | ✅ | — | ✅ | — |
| Forward to Approval | ✅ | — | ✅ | — |
| Return Review to Requester | ✅ | — | ✅ | — |
| Reject at Review | ✅ | — | ✅ | — |
| Approve `PENDING_APPROVAL` | ✅ | — | — | ✅ |
| Return Approval to Reviewer | ✅ | — | — | ✅ |
| Return Approval to Requester | ✅ | — | — | ✅ |
| Reject at Approval | ✅ | — | — | ✅ |
| Reopen/Revert Approved/Rejected | ✅ | — | — | — |
| Archive/Unarchive eligible record | ✅ | — | — | — |
| Single Export authorized record | ✅ | ✅ | ✅ | ✅ |
| Bulk Export authorized records | ✅ | ✅ | ✅ | ✅ |
| Hard Delete NSCMF | ❌ | ❌ | ❌ | ❌ |

The table intentionally has **no Team/Unit/Division/Review Scope/Approval Scope column**.

## 22. Administration Matrix

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| View/Create/Edit eligible Users | ✅ | — | — | — |
| Enable/Disable eligible Users | ✅ | — | — | — |
| Reset Password | ✅ | — | — | — |
| Assign Roles | ✅ | — | — | — |
| Assign Team | ✅ | — | — | — |
| Manage Roles/Role Permissions | ✅ | — | — | — |
| Manage Teams | ✅ | — | — | — |
| View raw Access Audit | ✅ | — | — | — |
| View Security Audit | ✅ | — | — | — |
| Manage Core System Settings | 🔒 | — | — | — |
| Impersonate User | ❌ | ❌ | ❌ | ❌ |

Administrative permissions MAY be delegated except protected Core System Settings and protected invariants.

---

# PART H — RECORD ACTION DECISION MATRIX

## 23. Requester Actions

| Action | Permission | State / Condition |
|---|---|---|
| Create | `nscmf.create` | active authenticated user |
| Edit general form | `nscmf.draft.edit` | owns record + `DRAFT` or `REVISION_REQUIRED` |
| Autosave / Save | `nscmf.draft.edit` | owns record + editable state + optimistic version valid |
| Update Change Result | `nscmf.change.result.edit` | owns Change + `PENDING_REVIEW` + Result fields only |
| Cancel | `nscmf.cancel` | owns record + `DRAFT` + never submitted |
| Submit | `nscmf.submit` | owns record + `DRAFT` + validation passes |
| Resubmit | `nscmf.submit` | owns record + `REVISION_REQUIRED` + validation passes |
| View | `nscmf.view` | authorized resource access |
| Export | `nscmf.export` | authorized record |

## 24. Reviewer Actions

| Action | Permission | State / Condition |
|---|---|---|
| View review candidate | `nscmf.view` | authorized + candidate state |
| Review activity | `nscmf.review` | `PENDING_REVIEW` |
| Forward | `nscmf.review.forward` | `PENDING_REVIEW` + Forward validation |
| Return | `nscmf.review.return` | `PENDING_REVIEW` + mandatory reason |
| Reject | `nscmf.review.reject` | `PENDING_REVIEW` + mandatory reason |
| Business Timeline | `nscmf.timeline.view` / valid viewer treatment | authorized record |
| Export | `nscmf.export` | authorized record |

No Team/scope condition exists.

## 25. Approver Actions

| Action | Permission | State / Condition |
|---|---|---|
| View candidate | `nscmf.view` | authorized + candidate state |
| Approve | `nscmf.approve` | `PENDING_APPROVAL` |
| Return Reviewer | `nscmf.approval.return_reviewer` | `PENDING_APPROVAL` + mandatory reason |
| Return Requester | `nscmf.approval.return_requester` | `PENDING_APPROVAL` + mandatory reason |
| Reject | `nscmf.approval.reject` | `PENDING_APPROVAL` + mandatory reason |
| Business Timeline | `nscmf.timeline.view` / valid viewer treatment | authorized record |
| Export | `nscmf.export` | authorized record |

No Team/scope condition exists.

---

# PART I — MULTI-ROLE RESOLUTION

## 26. Examples

### Requester + Reviewer
User receives Requester permissions plus Reviewer permissions. Own-record editing remains ownership-bound; Review capability applies according to permission + state without Team scope.

### Reviewer + Approver
User may Review when required Review permission/state is valid and may Approve when required Approval permission/state is valid. No organizational scope matching is performed.

### Custom NOC Lead
A role called `NOC Lead` MAY receive, for example:

```text
nscmf.view
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
nscmf.approve
nscmf.approval.return_reviewer
nscmf.approval.return_requester
nscmf.approval.reject
nscmf.reopen
nscmf.archive
nscmf.export
nscmf.export.bulk
```

The name `NOC Lead` has no special authorization effect. Its permissions do.

## 27. Same Person Across Workflow Stages

No mandatory segregation of duties. Same user MAY perform different stage actions when the user has the required permissions and all current state/business/security conditions pass.

Each successful action remains separate audit evidence.

---

# PART J — COLLABORATION MODEL

## 28. Reviewer Collaboration

```text
Permission-based shared eligibility
+
Non-exclusive state-action eligibility
+
Multi-actor Business Audit trail
```

No permanent single Reviewer assignment and no reviewer scope.

## 29. Approver Collaboration

```text
Permission-based shared eligibility
+
Non-exclusive access
+
Single successful final approval actor
```

No approval scope.

---

# PART K — AUDIT VISIBILITY

## 30. Business Timeline and Privileged Audit

Legitimate record viewer can see Business Timeline according to normal record authorization.

Routine record view/download/export-access evidence stays in separate Access Audit.

Raw Access Audit:

```text
Protected Superadmin by default
or explicit audit.access.view
+ applicable resource/admin authorization
```

Security Audit:

```text
Protected Superadmin by default
or explicit audit.security.view
+ applicable security/admin authorization
```

There is no organizational scope requirement for these permissions. Team membership itself never grants audit access.

Authoritative Business/Access/Security Audit has no age-based purge and no normal edit/delete capability.

---

# PART L — AUTHORIZATION DECISION ORDER

## 31. Evaluation

Backend SHOULD conceptually evaluate:

```text
1. authenticated + active account + valid session?
2. protected invariant satisfied?
3. required permission?
4. ownership condition, only if this action explicitly requires ownership?
5. record/resource access authorized?
6. archive flag compatible with action?
7. current business state eligible?
8. input/action validation passes?
9. destination allowed?
10. narrow-field restriction satisfied where applicable?
11. security precondition / re-authentication satisfied where applicable?
12. concurrency/current-state check satisfied?
13. execute through required transaction/version strategy.
14. write required Business / Access / Security Audit evidence to the correct concern.
```

**Team is intentionally absent from this decision order.**

Any failed prerequisite → DENY.

---

# PART M — DEFAULT PERMISSION BUNDLES

## 32. Requester Bundle

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

Ownership restrictions remain for Requester mutations as defined above.

## 33. Reviewer Bundle

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

No Reviewer Scope.

## 34. Approver Bundle

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

No Approval Scope.

## 35. Superadmin Bundle

Protected Superadmin receives all defined application permissions required for normal administrative/NSCMF operation, including:

- all NSCMF permissions;
- `nscmf.reopen`;
- `nscmf.archive`;
- `audit.access.view`;
- `audit.security.view`;
- eligible users/roles/permissions/teams administration;
- `system.settings.manage`;
- protected Superadmin invariants.

This does not create hard-delete, impersonation, invalid state transition, audit bypass, or security-precondition bypass.

---

# PART N — SPATIE / APPLICATION IMPLEMENTATION MAPPING

## 36. Required Mapping

```text
Spatie Laravel Permission 8.x
→ roles
→ permissions
→ model_has_roles
→ model_has_permissions (package-owned; direct-user permission UI unused in MVP)
→ role_has_permissions
→ Gate permission resolution

Laravel Policies / Gates
→ resource/action authorization boundary

Domain/Application Services
→ ownership where required
→ state eligibility
→ archive treatment
→ validation
→ protected invariants
→ concurrency
→ required audit orchestration

Team Domain
→ organizational profile/master data only
→ NO permission scoping
```

## 37. Mutation Orchestration

Sensitive role/permission changes MUST NOT be scattered as uncoordinated controller calls.

Application administration actions MUST ensure required side effects:

```text
password re-authentication
→ Spatie role/permission mutation
→ determine affected users
→ revoke affected target sessions as required by Security Rules
→ Security Audit
```

Spatie remains the role/permission data authority; application orchestration exists to satisfy security/business side effects, not to create another RBAC database.

## 38. User Primary Key Compatibility

ERD SHOULD use Laravel conventional bigint user IDs unless a later approved schema decision requires otherwise. This aligns cleanly with Spatie's standard morph/pivot migration and avoids unnecessary custom package schema changes.

---

# PART O — IMPLEMENTATION GUARDRAILS

## 39. Developer / AI MUST NOT

Implementation MUST NOT:

1. recreate Spatie role/permission tables under different names as a second RBAC model;
2. enable Spatie `teams` for current NSCMF Team data;
3. add `team_id` to Spatie role/permission pivots to restrict Review/Approval;
4. create Reviewer Scope or Approval Scope tables;
5. create `Unit`, `Division`, `org_units`, or Unit/Division authorization models;
6. use Team membership to allow/deny Review or Approval;
7. call `setPermissionsTeamId()` in normal authorization;
8. expose direct-user permission assignment as normal MVP admin feature;
9. enable wildcard permissions by default;
10. seed `nscmf.review.*` or similar shorthand as an actual wildcard permission row;
11. hard-code routine feature authorization against role names when a permission capability exists;
12. treat permission success as bypass for business state/invariants;
13. use a universal Superadmin bypass that makes forbidden domain actions valid;
14. add `session.login`/`session.logout` rows to the Spatie permission catalog;
15. introduce hidden multi-tenancy;
16. introduce NSCMF hard-delete;
17. create exclusive Reviewer/Approver ownership;
18. bypass mandatory reasons/validation/security preconditions;
19. let direct URLs/IDs bypass resource authorization;
20. let frontend button visibility become the security boundary.

---

# PART P — TESTABLE RBAC ACCEPTANCE CRITERIA

## 40. Package / Team Alignment

- [ ] Spatie 8.x is used for role/permission primitives.
- [ ] Package-owned tables are `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.
- [ ] ERD does not duplicate package-owned RBAC tables.
- [ ] `config('permission.teams')` remains false.
- [ ] Business Team exists independently from Spatie Teams.
- [ ] Changing user Team alone does not grant/revoke Review/Approval permission.
- [ ] No reviewer/approver scope table exists.
- [ ] Wildcard permission support remains disabled.
- [ ] Direct-user permission assignment is not exposed as normal MVP admin flow.
- [ ] Login/logout do not require Spatie permission rows.

## 41. Permission / Workflow

- [ ] Multi-role user receives union of role permissions through Spatie.
- [ ] App checks required permissions rather than depending on role name for normal actions.
- [ ] Requester own mutation actions enforce ownership.
- [ ] Reviewer with required permission can act on eligible `PENDING_REVIEW` without Team/scope matching.
- [ ] Reviewer lacking required permission cannot act even if Team is NOC.
- [ ] Approver with required permission can act on eligible `PENDING_APPROVAL` without Team/scope matching.
- [ ] Approver lacking required permission cannot act even if Team would otherwise appear relevant.
- [ ] Reviewer A does not create an exclusive lock that removes Reviewer B/C eligibility.
- [ ] Multiple Reviewer contributors are preserved.
- [ ] One successful valid Approve creates `APPROVED`.
- [ ] Stale second Approve is denied.
- [ ] Result-only permission cannot modify unrelated submitted fields.
- [ ] Return/Reject/Reopen/Archive/Unarchive rules remain enforced independent of permission possession.
- [ ] Protected Superadmin remains protected but cannot bypass forbidden domain invariants.
- [ ] No impersonation or NSCMF hard-delete exists.

## 42. Security / Audit

- [ ] Sensitive role/permission mutation requires acting-user password re-authentication.
- [ ] Effective access-changing mutation revokes required target-user sessions.
- [ ] Role/permission mutations are reflected in Security Audit.
- [ ] Team change alone is not falsely treated as an authorization grant/revoke.
- [ ] Routine View evidence remains Access Audit, not Business Timeline.
- [ ] Raw Access/Security Audit remains permission-protected.
- [ ] Authoritative audit cannot be normal-user modified/deleted and is not age-purged.

---

# PART Q — RELATIONSHIP TO OTHER DOCUMENTS

## 43. Authority Matrix

| Concern | Authority |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| **Role/permission authorization** | **`04_RBAC_Permission_Matrix.md`** |
| State/lifecycle | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology/package selection | `08_Tech_Stack_Specification.md` |
| Logical architecture | `09_System_Architecture.md` |
| Security controls | `10_Security_Rules.md` |
| Physical RBAC/Team/domain schema | `11_ERD_Database_Schema.md` |

`04` is authoritative that **Team is not authorization scope** and **Spatie Teams is disabled**.

---

## 44. Downstream ERD Requirements

`11_ERD_Database_Schema.md` MUST:

- reuse Spatie-owned RBAC tables exactly as the package contract requires;
- model business Team separately from Spatie role/permission tables;
- not create Reviewer/Approver scope tables;
- not add Unit/Division tables;
- keep Team membership outside permission evaluation;
- preserve ownership relationships needed for own-record rules;
- preserve workflow/audit/export/security data requirements from other authorities.

---

## 45. Next Document

The next document in the fixed project order is:

**`11_ERD_Database_Schema.md`**.

It MUST materialize this permission-centric model without duplicating Spatie schema or reintroducing organizational authorization scope.