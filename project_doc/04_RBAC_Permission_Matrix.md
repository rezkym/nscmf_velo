# RBAC / Permission Matrix

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-RBAC-004  
> **Document Order:** 04 / 20  
> **Status:** Draft — Confirmed Permission-Centric Authorization + Protected Settings Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini mendefinisikan **siapa boleh melakukan apa** pada NSCMF Digital Form & Workflow System.

Dokumen menjadi source of truth untuk default role template, canonical permission catalog, permission-based authorization, ownership rules yang eksplisit, multi-role/custom-role behavior, delegated administration, protected Superadmin restrictions, privileged audit visibility, Team sebagai organizational metadata yang bukan authorization scope, Spatie boundary, dan protected Core System Settings authorization.

Business Rules menentukan invariant. User Flow menentukan urutan interaction. State Flow menentukan lifecycle. Validation menentukan validitas input/action. Security Rules menambahkan re-authentication/session/security preconditions tanpa mengubah permission semantics.

---

## 2. Confirmed Authorization Direction

```text
Effective Action Eligibility
=
Valid Authenticated Session
+
Protected Invariant where applicable
+
Required Permission
+
Ownership only where explicitly required
+
Resource Authorization
+
Current Business State
+
Archive Treatment
+
Business Rules / Validation
+
Security Preconditions
+
Concurrency / Current-State Revalidation
```

Tidak ada Reviewer Scope, Approval Scope, Unit/Division Scope, atau Team-based authorization.

### 2.1 Permission Answers Capability

Permission menjawab apakah actor memiliki capability untuk mencoba action.

### 2.2 Permission Does Not Bypass Domain Rules

Contoh:

- punya `nscmf.approve` tetapi record bukan `PENDING_APPROVAL` → DENY;
- punya `nscmf.reopen` tetapi `CANCELLED` → DENY;
- punya `users.reset_password` tetapi re-auth gagal/expired → DENY;
- punya `system.settings.manage` tetapi actor bukan Protected Superadmin untuk protected Core Setting → DENY.

### 2.3 Team Is Not Authorization

Team hanya organizational/profile data. Team MUST NOT grant/revoke/filter Review/Approval permission, queue, role, atau tenant boundary.

---

# PART A — AUTHORIZATION PRINCIPLES

## 3. Core Principles

- deny by default;
- server-side enforcement;
- multi-role allowed;
- role groups permissions;
- effective permission = union across assigned roles;
- no Reviewer/Approver Scope;
- Team has no authorization effect;
- custom roles supported where invariant permits;
- no impersonation;
- narrow permissions remain narrow;
- security preconditions are not new business permissions;
- successful Spatie permission resolution never bypasses domain/security rules.

---

# PART B — SPATIE LARAVEL PERMISSION BOUNDARY

## 4. Package Authority

Confirmed:

```text
spatie/laravel-permission ^8
```

Reuse package-owned tables:

```text
roles
permissions
model_has_roles
model_has_permissions
role_has_permissions
```

No duplicate custom RBAC tables.

## 5. Spatie Teams MUST Be Disabled

```php
'teams' => false,
```

Business Team is separate application data. No Spatie team_id, `setPermissionsTeamId()`, or team-scoped role instances.

## 6. Direct User Permission Policy

Current MVP administration:

```text
Permission → Role → User
```

`model_has_permissions` remains package-owned but direct permission-to-user UI is absent.

## 7. Wildcard Permission Policy

```php
'enable_wildcard_permission' => false,
```

Documentation shorthand such as `nscmf.review.*` is not a seeded wildcard permission.

## 8. Guard

Single `web` guard.

---

# PART C — DEFAULT ROLE TEMPLATE

## 9. Default Roles

| Role | Purpose |
|---|---|
| `Superadmin` | Protected administrative authority tertinggi |
| `Requester` | Membuat/mengelola own NSCMF participation |
| `Reviewer` | Review eligible `PENDING_REVIEW` |
| `Approver` | Final Approval eligible `PENDING_APPROVAL` |

Custom roles may use other permission bundles.

## 10. Protected Superadmin

Protected Superadmin:

- seeded;
- protected role assignment remains;
- receives all normal app permissions by default;
- global operational visibility;
- cannot disable/delete/downgrade/lose protected role;
- no hard-delete NSCMF;
- still subject to business state/validation/security prerequisites;
- is the **only actor eligible to mutate protected Core System Settings** under current MVP even if another role somehow receives `system.settings.manage`.

No universal business-invariant bypass.

---

# PART D — AUTHENTICATION IS NOT A SPATIE PERMISSION

## 11. Login / Logout

No `session.login`/`session.logout` permission rows.

Authentication remains:

```text
username + password
minimum 6
no composition
no MFA
```

---

# PART E — NSCMF PERMISSION CATALOG

## 12. NSCMF Core

| Permission | Description |
|---|---|
| `nscmf.create` | Membuat record baru |
| `nscmf.draft.edit` | Edit eligible own Draft/Revision |
| `nscmf.submit` | Submit/Resubmit own eligible record |
| `nscmf.cancel` | Cancel own Draft before first Submit |
| `nscmf.change.result.edit` | Narrow Change Result edit |
| `nscmf.view` | View subject to resource rules |
| `nscmf.view.history` | History subject to resource rules |
| `nscmf.attachment.manage` | Manage attachment in eligible context |
| `nscmf.export` | Export authorized record |
| `nscmf.export.bulk` | Bulk export authorized selected records |
| `nscmf.timeline.view` | View Business Timeline |

Requester mutation ownership remains explicit where upstream says own record.

## 13. Review Permissions

| Permission | Eligible State |
|---|---|
| `nscmf.review` | `PENDING_REVIEW` |
| `nscmf.review.forward` | `PENDING_REVIEW` |
| `nscmf.review.return` | `PENDING_REVIEW` |
| `nscmf.review.reject` | `PENDING_REVIEW` |

No Team/scope matching. Reviewer non-exclusive; multiple contributors.

## 14. Approval Permissions

| Permission | Eligible State |
|---|---|
| `nscmf.approve` | `PENDING_APPROVAL` |
| `nscmf.approval.return_reviewer` | `PENDING_APPROVAL` |
| `nscmf.approval.return_requester` | `PENDING_APPROVAL` |
| `nscmf.approval.reject` | `PENDING_APPROVAL` |

No Team/scope matching. One successful valid Approve is sufficient.

## 15. Recovery / Lifecycle

| Permission | Description |
|---|---|
| `nscmf.reopen` | Reopen eligible Rejected/Approved |
| `nscmf.archive` | Archive/Unarchive eligible record |

No `nscmf.delete` or force-delete permission.

---

# PART F — ADMINISTRATION PERMISSIONS

## 16. User Management

| Permission | Description |
|---|---|
| `users.view` | View users |
| `users.create` | Create normal users |
| `users.update` | Update eligible normal users |
| `users.enable` | Enable eligible users |
| `users.disable` | Disable eligible users |
| `users.reset_password` | Generate/reset temporary credential |
| `users.assign_roles` | Assign/remove roles |
| `users.assign_team` | Assign/move Team |

Sensitive password/role actions require valid current-password re-authentication proof. Security Rules lock proof lifetime to **15 minutes**.

Create/reset temporary credential behavior is server-generated + one-time reveal to acting admin; admin does not choose plaintext password.

Team change does not change authorization merely because Team changed.

## 17. Role / Permission Administration

| Permission | Description |
|---|---|
| `roles.view` | View role mapping |
| `roles.create` | Create custom role |
| `roles.update` | Update eligible role |
| `roles.archive` | Reserved only if final supported model permits |
| `permissions.assign` | Assign/sync permissions to role |

Effective access-changing mutations require 15-minute re-auth proof and session revocation side effects according to Security Rules.

## 18. Team Administration

| Permission | Description |
|---|---|
| `teams.view` | View Teams |
| `teams.create` | Create Team |
| `teams.update` | Update Team |
| `teams.archive` | Archive/deactivate if supported |
| `teams.assign_users` | Assign/move users |

No scope semantics.

## 19. Core System Settings — Protected Superadmin Only

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

## 20. Privileged Audit Permissions

| Permission | Description |
|---|---|
| `audit.access.view` | View raw Access Audit |
| `audit.security.view` | View Security Audit |

Protected Superadmin gets both by default. Eligible custom roles may receive view permissions. No edit/delete/purge capability and no Team scope.

---

# PART G — DEFAULT ROLE PERMISSION MATRIX

## 21. Core Matrix

Legend: ✅ default; 🔒 protected/inherent; `Own` explicit ownership; — not default but potentially grantable if business rules permit; ❌ unavailable.

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| Login / Logout | Auth | Auth | Auth | Auth |
| Create NSCMF | ✅ | ✅ | — | — |
| Edit own Draft/Revision | ✅ | ✅ Own | — | — |
| Edit own Change Result PENDING_REVIEW | ✅ | ✅ Own | — | — |
| Cancel/Submit own eligible record | ✅ | ✅ Own | — | — |
| View authorized NSCMF/Timeline | ✅ | ✅ | ✅ | ✅ |
| Review actions | ✅ | — | ✅ | — |
| Approval actions | ✅ | — | — | ✅ |
| Reopen Approved/Rejected | ✅ | — | — | — |
| Archive/Unarchive | ✅ | — | — | — |
| Single/Bulk Export authorized | ✅ | ✅ | ✅ | ✅ |
| Hard Delete | ❌ | ❌ | ❌ | ❌ |

## 22. Administration Matrix

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| User admin | ✅ | — | — | — |
| Reset Password / Assign Roles | ✅ | — | — | — |
| Team admin | ✅ | — | — | — |
| Role/Permission admin | ✅ | — | — | — |
| View raw Access/Security Audit | ✅ | — | — | — |
| Manage protected Core Settings | 🔒 | — | — | — |
| Impersonate User | ❌ | ❌ | ❌ | ❌ |

Normal eligible administration MAY be delegated except Protected Core Settings and protected invariants.

---

# PART H — ACTION DECISION MATRIX

## 23. Requester Actions

Create/Edit/Save/Result/Cancel/Submit/Resubmit/View/Export follow exact permission + ownership/state rules from upstream docs.

## 24. Reviewer Actions

Review/Forward/Return/Reject require action-specific permission + `PENDING_REVIEW`; no Team/scope.

## 25. Approver Actions

Approve/Returns/Reject require action-specific permission + `PENDING_APPROVAL`; no Team/scope.

## 26. Protected Settings Action

| Action | Permission | Additional invariant |
|---|---|---|
| View Technical Log cleanup setting | `system.settings.manage` | Protected Superadmin + authenticated session |
| Update Technical Log cleanup setting | `system.settings.manage` | Protected Superadmin + valid <=15m re-auth proof + typed validation |

The settings endpoint cannot mutate authoritative audit retention.

---

# PART I — MULTI-ROLE / COLLABORATION

## 27. Multi-Role

Permission union applies. Same user MAY participate across stages when permissions/state/security rules pass. No mandatory segregation of duties.

## 28. Reviewer Collaboration

Shared permission-based, non-exclusive, multi-actor Business Audit.

## 29. Approver Collaboration

Shared permission-based, non-exclusive, single successful final approval actor.

---

# PART J — AUDIT VISIBILITY / SETTINGS BOUNDARY

## 30. Audit Visibility

Business Timeline follows record authorization. Raw Access/Security Audit requires explicit audit permissions + applicable admin/resource authorization. Team irrelevant.

Authoritative audits have no age purge and no normal edit/delete.

## 31. Technical Logs Are Not Authoritative Audit

Technical application/runtime logs are operational diagnostics. Protected Superadmin may configure their automatic cleanup under §19.

This does **not** create an audit-retention permission. Technical Log cleanup setting and authoritative audit visibility/deletion are separate concerns.

---

# PART K — AUTHORIZATION DECISION ORDER

## 32. Evaluation

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

---

# PART L — DEFAULT PERMISSION BUNDLES

## 33. Requester Bundle

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

## 34. Reviewer Bundle

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

## 35. Approver Bundle

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

## 36. Superadmin Bundle

All defined normal app permissions plus `nscmf.reopen`, `nscmf.archive`, privileged audit views, eligible admin permissions, and `system.settings.manage`, subject to protected invariants.

No hard-delete/impersonation/invalid-state/audit-purge/security bypass.

---

# PART M — IMPLEMENTATION MAPPING

## 37. Required Mapping

```text
Spatie → runtime roles/permissions
Policies/Gates → resource/action auth
Services → ownership/state/security/concurrency/audit orchestration
Team domain → organizational only
SystemSettingsService → protected settings orchestration
SystemSettingsRepository → typed settings persistence
```

## 38. Sensitive Mutation Orchestration

Role/permission/password/Core Settings mutations use current-password re-auth. Re-auth proof lifetime = 15 minutes.

Temporary credentials are server-generated and revealed once. No plaintext persistence.

## 39. User Primary Key

Laravel conventional bigint IDs preferred for package compatibility.

---

# PART N — GUARDRAILS / ACCEPTANCE

## 40. Developer / AI MUST NOT

1. duplicate Spatie schema;
2. enable Spatie Teams;
3. add Team ID to permission pivots;
4. create Reviewer/Approver/Unit/Division scope;
5. use Team to allow/deny Review/Approval;
6. direct-user permission UI current MVP;
7. wildcard permissions;
8. universal Superadmin business bypass;
9. impersonation;
10. NSCMF hard-delete;
11. bypass mandatory reasons/validation/re-auth;
12. create `audit.purge`/authoritative audit delete permission;
13. treat Technical Log cleanup as authoritative audit cleanup;
14. let non-Protected-Superadmin mutate Core Settings;
15. accept permanent re-auth proof;
16. expose/retrieve plaintext temporary password after one-time result.

## 41. Package / Team Acceptance

- [ ] Spatie 8.x standard schema;
- [ ] `teams=false`;
- [ ] wildcard false;
- [ ] Team separate;
- [ ] no scope tables;
- [ ] direct-user permission UI absent;
- [ ] login/logout no Spatie permission.

## 42. Permission / Workflow Acceptance

- [ ] multi-role permission union;
- [ ] permission not role-name hardcode for normal actions;
- [ ] Requester ownership where required;
- [ ] shared Reviewer/Approver without Team scope;
- [ ] one final approval;
- [ ] protected Superadmin no invalid-domain bypass.

## 43. Security / Settings / Audit Acceptance

- [ ] sensitive role/permission/password/Core Settings mutation requires current-password re-auth;
- [ ] proof expires after 15 minutes;
- [ ] effective access change revokes sessions;
- [ ] Team-only change not authorization mutation;
- [ ] raw audits permission protected;
- [ ] authoritative audit not age-purged;
- [ ] Technical Log default cleanup ON/30 DAY;
- [ ] Protected Superadmin may choose positive DAY/MONTH or OFF;
- [ ] no fixed product maximum Technical Log retention;
- [ ] settings cannot delete authoritative audits.

---

# PART O — RELATIONSHIP / HANDOFF

## 44. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| **Role/permission authorization** | **`04_RBAC_Permission_Matrix.md`** |
| State/lifecycle | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Schema | `11_ERD_Database_Schema.md` |
| API | `12_API_Contract.md` |
| Structure | `13_Project_Structure.md` |
| Environment | `14_Environment_Specification.md` once created |

## 45. Current Handoff

Documents through `13_Project_Structure.md` exist. Next fixed-order document to create **only after explicit user instruction**:

**`14_Environment_Specification.md`**.

`14` MUST operationalize the Protected Settings/runtime decisions without changing RBAC semantics above.