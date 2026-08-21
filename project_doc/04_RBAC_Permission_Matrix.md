# RBAC / Permission Matrix

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-RBAC-004  
> **Document Order:** 04 / 20  
> **Status:** Draft — Synchronized through State / Status Flow  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `05_State_Status_Flow.md`  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **siapa boleh melakukan apa** pada NSCMF Digital Form & Workflow System.

Dokumen menjadi source of truth untuk:

- default role template;
- permission catalog;
- record visibility;
- Unit/Division Reviewer Scope;
- Approval Scope;
- multi-role behavior;
- custom role behavior;
- delegated administration;
- protected Superadmin restrictions;
- authorization guardrails.

Business Rules menentukan invariant. User Flow menentukan urutan interaction. State Flow menentukan lifecycle yang valid. RBAC menentukan apakah actor tertentu berhak melakukan action pada current state.

Permission di sini implementation-agnostic. Package seperti `spatie/laravel-permission` hanya kandidat sampai `08_Tech_Stack_Specification.md`.

---

## 2. Core Authorization Model

```text
Effective Access
=
Permission
+
Record Visibility
+
Scope
+
Current Business State
+
Archive Treatment
+
Business Rules
+
Protected Invariants
```

Permission saja tidak cukup.

Contoh:

- `nscmf.approve` tetapi record bukan `PENDING_APPROVAL` → DENY;
- `nscmf.review.forward` tetapi record bukan `PENDING_REVIEW` → DENY;
- `nscmf.reopen` tetapi record archived → DENY sampai Unarchive;
- `nscmf.archive` tetapi record `DRAFT` → DENY;
- global Superadmin visibility tetap tidak memberi hard-delete NSCMF.

---

## 3. Authorization Principles

### RBAC-PRINCIPLE-001 — Deny by Default
Action yang tidak diberikan atau tidak memenuhi scope/state MUST ditolak.

### RBAC-PRINCIPLE-002 — Server-Side Enforcement
Permission, visibility, scope, archive flag, current state, dan validation MUST diverifikasi backend.

### RBAC-PRINCIPLE-003 — Multi-Role Allowed
Satu user MAY memiliki beberapa role.

### RBAC-PRINCIPLE-004 — Permission Union
Effective permission multi-role pada dasarnya union seluruh role, tetap tunduk state/scope/invariants.

### RBAC-PRINCIPLE-005 — Scope Independent From Role Name
Reviewer/Approver role tidak otomatis global.

### RBAC-PRINCIPLE-006 — Custom Roles Supported
Custom role MAY memperoleh kombinasi permission granular selama tidak melanggar protected invariant.

### RBAC-PRINCIPLE-007 — No Impersonation
Tidak ada user impersonation/login-as-user.

---

# PART A — DEFAULT ROLE TEMPLATE

## 4. Default Roles

| Role | Purpose | Default Scope |
|---|---|---|
| `Superadmin` | Protected authority tertinggi | Global |
| `Requester` | Membuat/mengajukan NSCMF | Own records |
| `Reviewer` | Review | Assigned Unit/Division(s) |
| `Approver` | Final approval | Assigned Approval Scope; may span units |

Role template adalah starting point, bukan batas custom roles.

---

## 5. Protected Superadmin

Protected Superadmin:

- seeded saat initial setup;
- global NSCMF visibility, termasuk archived;
- default memiliki normal NSCMF/admin permissions;
- tidak dapat disable/delete/downgrade/lose protected role;
- tidak memiliki NSCMF hard-delete capability karena capability tersebut tidak tersedia.

Delegated administrator tidak dapat melewati protection ini.

---

# PART B — PERMISSION CATALOG

## 6. Naming Convention

Conceptual naming:

```text
<domain>.<action>[.<qualifier>]
```

Code naming MAY berbeda sedikit selama mapping terdokumentasi.

---

## 7. Authentication / Session

| Permission | Purpose |
|---|---|
| `session.login` | Login account valid |
| `session.logout` | Logout own session |

Disabled normal account tidak dapat login. Protected Superadmin tidak dapat disabled.

---

## 8. NSCMF Core Permissions

| Permission | Description |
|---|---|
| `nscmf.create` | Membuat record NSCMF baru |
| `nscmf.draft.edit` | Edit eligible `DRAFT` / `REVISION_REQUIRED` own record |
| `nscmf.submit` | Submit `DRAFT` atau Resubmit `REVISION_REQUIRED` |
| `nscmf.cancel` | Cancel own `DRAFT` sebelum first Submit |
| `nscmf.view` | View record yang lolos visibility |
| `nscmf.view.history` | Access History berdasarkan visibility |
| `nscmf.attachment.manage` | Manage attachment pada editable/authorized context |
| `nscmf.export` | Export visible record |
| `nscmf.export.bulk` | Bulk export visible records |
| `nscmf.timeline.view` | View timeline pada visible record |

### RBAC-CORE-001 — View Implies Timeline
Legitimate viewer MUST dapat melihat timeline record tersebut.

### RBAC-CORE-002 — Export Requires View
Export tidak dapat digunakan untuk inaccessible record.

### RBAC-CORE-003 — State-Neutral View
View/opening record tidak mengubah business state atau membuat exclusive assignee.

---

## 9. Review Permissions

| Permission | Description | Eligible State |
|---|---|---|
| `nscmf.review` | Melakukan review activity | `PENDING_REVIEW` |
| `nscmf.review.forward` | Forward ke Approval | `PENDING_REVIEW` |
| `nscmf.review.return` | Return ke Requester | `PENDING_REVIEW` |
| `nscmf.review.reject` | Reject pada Review | `PENDING_REVIEW` |

### RBAC-REV-001 — Scope Required
Reviewer action membutuhkan matching Unit/Division scope.

### RBAC-REV-002 — Non-Exclusive Reviewer
Reviewer A tidak mengunci Reviewer B/C yang juga eligible.

### RBAC-REV-003 — Multiple Contributors
Satu NSCMF MAY memiliki beberapa Reviewer contributors sepanjang lifecycle.

### RBAC-REV-004 — Tracking Is Not Ownership Lock
`assigned`, `modified by`, `reviewed by`, viewer/contributor metadata tidak boleh menjadi exclusive authorization lock.

### RBAC-REV-005 — Viewer Logging
Reviewer view MAY/MUST dicatat sesuai audit requirement tanpa state transition.

### RBAC-REV-006 — Change Result Capture During Review
`NSCMF - Change` membutuhkan narrow Result-of-Changes capture di `PENDING_REVIEW` sebelum Forward ketika applicable.

Source workbook tidak menentukan actor pengisi Result secara eksplisit. Karena itu **exact permission/actor untuk Result capture tetap TBD dan MUST NOT ditebak pada tahap ini**. Downstream Validation/UI refinement harus memastikan capability tersebut hanya membuka Result-related fields, bukan general submitted form editing.

---

## 10. Approval Permissions

| Permission | Description | Eligible State |
|---|---|---|
| `nscmf.approve` | Final Approve | `PENDING_APPROVAL` |
| `nscmf.approval.return_reviewer` | Return ke Review | `PENDING_APPROVAL` |
| `nscmf.approval.return_requester` | Return ke Requester revision | `PENDING_APPROVAL` |
| `nscmf.approval.reject` | Reject pada Approval | `PENDING_APPROVAL` |

### RBAC-APR-001 — Scope Required
Approver action membutuhkan matching Approval Scope.

### RBAC-APR-002 — Multi-Unit Scope
Satu Approver MAY mencakup beberapa Unit/Division.

### RBAC-APR-003 — Non-Exclusive Approver
Semua eligible Approver dalam scope dapat melihat/bertindak selama state valid.

### RBAC-APR-004 — Single Final Approval
Satu successful final Approve cukup membuat record `APPROVED`.

### RBAC-APR-005 — Approved By
`Approved By` = actor yang berhasil melakukan transition `PENDING_APPROVAL -> APPROVED`.

### RBAC-APR-006 — Activity History
Approver lain dapat muncul pada timeline sebagai viewer/return/reject actor dari iteration sebelumnya.

### RBAC-APR-007 — No Duplicate Final Approval
Setelah state `APPROVED`, stale Approve kedua MUST ditolak.

---

## 11. Recovery / Lifecycle Permissions

| Permission | Description |
|---|---|
| `nscmf.reopen` | Reopen/Revert eligible `REJECTED` / `APPROVED` record |
| `nscmf.archive` | Archive **dan Unarchive** eligible NSCMF lifecycle treatment |

### RBAC-LIFE-001 — Reopen Default
Protected Superadmin memiliki `nscmf.reopen` default.

### RBAC-LIFE-002 — Reopen Delegable
Role lain MAY memperoleh explicit `nscmf.reopen`.

### RBAC-LIFE-003 — Reopen Is Not Global View
`nscmf.reopen` tidak otomatis memberikan `nscmf.view.all`.

### RBAC-LIFE-004 — Reopen State Rules
Reopen hanya valid jika:

```text
business_status in {REJECTED, APPROVED}
AND is_archived = false
AND mandatory reason
AND destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

Reopen tidak boleh menuju `DRAFT` atau `PENDING_APPROVAL`.

### RBAC-LIFE-005 — Archive Delegable
`nscmf.archive` MAY diberikan ke role selain Superadmin.

### RBAC-LIFE-006 — Archive State Rules
Archive hanya valid jika:

```text
business_status in {APPROVED, REJECTED, CANCELLED}
AND is_archived = false
```

Archive dilarang pada `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`.

### RBAC-LIFE-007 — Unarchive Uses Lifecycle Permission
Unarchive menggunakan `nscmf.archive` pada current conceptual permission model:

```text
nscmf.archive
+ valid visibility
+ is_archived = true
```

Unarchive tidak mengubah `business_status`.

### RBAC-LIFE-008 — Archived Workflow Lock
Archived record tidak menerima normal business workflow-changing action. Untuk `APPROVED`/`REJECTED`, Unarchive diperlukan sebelum Reopen.

### RBAC-LIFE-009 — No Delete Permission
Tidak ada `nscmf.delete` / `nscmf.force_delete`.

---

# PART C — USER / ROLE / ORGANIZATION / SETTINGS ADMINISTRATION

## 12. User Management Permissions

| Permission | Description |
|---|---|
| `users.view` | View user |
| `users.create` | Create user |
| `users.update` | Update eligible user |
| `users.enable` | Enable eligible user |
| `users.disable` | Disable eligible normal user |
| `users.reset_password` | Reset credential according to security flow |
| `users.assign_roles` | Assign/remove roles |
| `users.assign_units` | Assign/move Unit/Division |
| `users.assign_scopes` | Configure eligible reviewer/approval scope |

User administration MAY didelegasikan, tetapi protected Superadmin invariants tetap berlaku.

---

## 13. Role / Permission Administration

| Permission | Description |
|---|---|
| `roles.view` | View role mapping |
| `roles.create` | Create custom role |
| `roles.update` | Update eligible role |
| `roles.archive` | Archive eligible role jika model final mengizinkan |
| `permissions.assign` | Assign permission to role |

Role administration MAY didelegasikan. Protected Superadmin role tidak dapat dihapus/archive/downgrade.

---

## 14. Unit / Division Administration

| Permission | Description |
|---|---|
| `org_units.view` | View Unit/Division |
| `org_units.create` | Create Unit/Division |
| `org_units.update` | Update Unit/Division |
| `org_units.archive` | Archive eligible Unit/Division |
| `org_units.assign_users` | Map users |
| `org_units.assign_reviewer_scope` | Configure Reviewer Scope |
| `org_units.assign_approver_scope` | Configure Approval Scope |

These MAY be delegated through explicit permission.

---

## 15. System Settings

Core system settings tetap protected Superadmin-only, termasuk initial setup mode, global numbering configuration, notification integration settings, dan other protected settings.

Conceptual permission:

```text
system.settings.manage
```

Current requirement tidak mendelegasikan permission ini.

---

# PART D — SCOPE MODEL

## 16. Requester Scope

Requester default = own records. Additional roles extend visibility additively.

## 17. Reviewer Scope

```text
review permission
+ matching assigned Unit/Division(s)
+ PENDING_REVIEW
= eligible review action
```

Reviewer MAY have multiple units. No implicit global Reviewer scope.

## 18. Approver Scope

```text
approval permission
+ matching Approval Scope
+ PENDING_APPROVAL
= eligible approval action
```

Scope MAY span multiple Unit/Division(s). No implicit global Approver scope.

Exact data representation of scope is deferred to ERD/Architecture.

## 19. Global Scope

Protected Superadmin global.

Optional conceptual future/custom permission:

```text
nscmf.view.all
```

If granted, it only affects visibility, not automatic Review/Approve/Reopen/Archive/admin capability.

---

# PART E — DEFAULT ROLE PERMISSION MATRIX

## 20. Core Matrix

Legend:

- ✅ default permission;
- 🔒 protected/inherent;
- Scope = required matching scope;
- — not default but MAY be custom-granted if rule allows;
- ❌ capability unavailable.

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| Login / Logout | ✅ | ✅ | ✅ | ✅ |
| Create NSCMF | ✅ | ✅ | — | — |
| Edit own `DRAFT` | ✅ | ✅ | — | — |
| Edit own `REVISION_REQUIRED` | ✅ | ✅ | — | — |
| Autosave / Save editable record | ✅ | ✅ | — | — |
| Cancel own `DRAFT` | ✅ | ✅ | — | — |
| Submit/Resubmit own eligible record | ✅ | ✅ | — | — |
| View own NSCMF | ✅ | ✅ | Scope | Scope |
| View scoped NSCMF | ✅ | — | ✅ Unit/Division | ✅ Approval Scope |
| View all NSCMF | 🔒 | — | — | — |
| View timeline on visible record | ✅ | ✅ | ✅ | ✅ |
| Manage attachment while authorized | ✅ | ✅ | — | — |
| Review `PENDING_REVIEW` | ✅ | — | ✅ Scope | — |
| Forward to Approval | ✅ | — | ✅ Scope | — |
| Return Review to Requester | ✅ | — | ✅ Scope | — |
| Reject at Review | ✅ | — | ✅ Scope | — |
| Approve `PENDING_APPROVAL` | ✅ | — | — | ✅ Scope |
| Return Approval to Reviewer | ✅ | — | — | ✅ Scope |
| Return Approval to Requester | ✅ | — | — | ✅ Scope |
| Reject at Approval | ✅ | — | — | ✅ Scope |
| Reopen/Revert Approved/Rejected | ✅ | — | — | — |
| Archive/Unarchive eligible record | ✅ | — | — | — |
| Single Export visible record | ✅ | ✅ | ✅ | ✅ |
| Bulk Export visible records | ✅ | ✅ | ✅ | ✅ |
| Hard Delete NSCMF | ❌ | ❌ | ❌ | ❌ |

`Reopen` and `Archive/Unarchive` MAY be custom-granted explicitly to non-Superadmin roles.

Exact default role for Change Result capture during `PENDING_REVIEW` is deliberately not assigned yet.

---

## 21. Administration Matrix

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| View/Create/Edit eligible Users | ✅ | — | — | — |
| Enable/Disable eligible Users | ✅ | — | — | — |
| Reset Password | ✅ | — | — | — |
| Assign Roles/Units/Scopes | ✅ | — | — | — |
| Manage Roles/Permissions | ✅ | — | — | — |
| Manage Unit/Division | ✅ | — | — | — |
| Manage Core System Settings | 🔒 | — | — | — |
| Impersonate User | ❌ | ❌ | ❌ | ❌ |

All administration capability except Core System Settings MAY be delegated by explicit permissions.

---

# PART F — RECORD ACTION DECISION MATRIX

## 22. Requester Actions

| Action | Permission | State / Condition |
|---|---|---|
| Create | `nscmf.create` | authenticated eligible user |
| Edit | `nscmf.draft.edit` | own + `DRAFT` or `REVISION_REQUIRED` |
| Autosave / Save | `nscmf.draft.edit` | own + editable state |
| Cancel | `nscmf.cancel` | own + `DRAFT` + never submitted |
| Submit | `nscmf.submit` | own + `DRAFT` + validation passes |
| Resubmit | `nscmf.submit` | own + `REVISION_REQUIRED` + validation passes |
| View | `nscmf.view` | own or additional scoped visibility |
| Export | `nscmf.export` | visible record |

Normal Requester edit is unavailable in `PENDING_REVIEW`, except narrow Change Result mechanism once its exact actor/permission is defined.

---

## 23. Reviewer Actions

| Action | Permission | State / Condition |
|---|---|---|
| View review candidate | `nscmf.view` | matching Unit/Division + `PENDING_REVIEW` |
| Review activity | `nscmf.review` | matching scope + `PENDING_REVIEW` |
| Forward | `nscmf.review.forward` | matching scope + `PENDING_REVIEW` + Forward validation |
| Return | `nscmf.review.return` | matching scope + `PENDING_REVIEW` |
| Reject | `nscmf.review.reject` | matching scope + `PENDING_REVIEW` |
| Timeline | implicit from valid view | matching visibility |
| Export | `nscmf.export` | visible record |

For Change, Forward additionally requires applicable Result-of-Changes gate to pass.

---

## 24. Approver Actions

| Action | Permission | State / Condition |
|---|---|---|
| View candidate | `nscmf.view` | matching Approval Scope + `PENDING_APPROVAL` |
| Approve | `nscmf.approve` | matching scope + `PENDING_APPROVAL` |
| Return Reviewer | `nscmf.approval.return_reviewer` | matching scope + `PENDING_APPROVAL` |
| Return Requester | `nscmf.approval.return_requester` | matching scope + `PENDING_APPROVAL` |
| Reject | `nscmf.approval.reject` | matching scope + `PENDING_APPROVAL` |
| Timeline | implicit from valid view | matching visibility |
| Export | `nscmf.export` | visible record |

---

# PART G — REOPEN / ARCHIVE DECISION MATRIX

## 25. Reopen

Required:

```text
nscmf.reopen
+ visible record
+ business_status in {REJECTED, APPROVED}
+ is_archived = false
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

Protected Superadmin gets it by default; other roles MAY receive it explicitly.

---

## 26. Archive / Unarchive

Archive:

```text
nscmf.archive
+ visible record
+ status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
```

Unarchive:

```text
nscmf.archive
+ visible record
+ is_archived = true
```

Both are administrative lifecycle actions and do not alter `business_status`.

---

# PART H — MULTI-ROLE RESOLUTION

## 27. Effective Permission Examples

### Requester + Reviewer
Own record actions + Review access within Reviewer Scope. No automatic Approval.

### Reviewer + Approver
May Review records only in Reviewer Scope and Approve records only in separate Approval Scope; scopes need not be identical.

### Custom NOC Lead
May receive mixed `review`, `approve`, `reopen`, `archive`, `export` permissions with matching scopes, without user administration.

---

## 28. Same Person Across Workflow Stages

No mandatory segregation of duties. Same user MAY perform different stage actions if permission/scope/current state allow. Each action remains separate audit evidence.

---

# PART I — COLLABORATION MODEL

## 29. Reviewer Collaboration

```text
Shared visibility
+
Non-exclusive state-action eligibility
+
Multi-actor audit trail
```

No permanent single Reviewer assignment.

## 30. Approver Collaboration

```text
Shared eligibility within scope
+
Non-exclusive access
+
Single successful final approval actor
```

---

# PART J — AUDIT VISIBILITY

## 31. Timeline Visibility

Legitimate viewer can see timeline including creator, viewer where applicable, modifier, submit/resubmit, review, return, reject, approve, reopen, archive/unarchive, timestamp, and required reason/comment.

No normal role may mutate historical audit events.

---

# PART K — CUSTOM ROLE GUARDRAILS

## 32. Custom Role Rules

Examples:

### Read-Only Auditor

```text
nscmf.view
nscmf.timeline.view
nscmf.export
```

### NOC Reviewer

```text
nscmf.view
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
nscmf.export
```

### NOC Lead

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

State/scope rules continue to apply.

---

# PART L — PROTECTED / NON-DELEGABLE CAPABILITIES

## 33. Protected Capabilities

| Capability | Rule |
|---|---|
| Hard-delete NSCMF | Unavailable |
| Delete/disable/downgrade protected Superadmin | Unavailable |
| User impersonation | Out of scope |
| Bypass audit | Unavailable |
| Bypass Review | Unavailable |
| Bypass Approval | Unavailable |
| Reopen directly to Approval | Unavailable |
| Archive active-work state | Unavailable |
| Core system settings for normal role | Not delegated |

---

# PART M — AUTHORIZATION DECISION ORDER

## 34. Decision Evaluation

Backend SHOULD/MUST conceptually evaluate:

```text
1. authenticated + active account?
2. protected invariant satisfied?
3. required permission?
4. record visibility?
5. matching scope where required?
6. archive flag compatible with action?
7. current business state eligible?
8. input/action validation passes?
9. destination allowed?
10. execute atomically.
11. write audit/workflow event.
```

Any failed prerequisite → DENY.

---

# PART N — DEFAULT PERMISSION BUNDLES

## 35. Requester Bundle

```text
session.login
session.logout
nscmf.create
nscmf.view
nscmf.view.history
nscmf.draft.edit
nscmf.submit
nscmf.cancel
nscmf.attachment.manage
nscmf.timeline.view
nscmf.export
nscmf.export.bulk
```

Default scope: own records.

---

## 36. Reviewer Bundle

```text
session.login
session.logout
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

Default scope: assigned Unit/Division(s).

---

## 37. Approver Bundle

```text
session.login
session.logout
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

Default scope: assigned Approval Scope; may span Unit/Division(s).

---

## 38. Superadmin Bundle

Protected Superadmin default:

- all normal NSCMF permissions;
- global visibility;
- `nscmf.reopen`;
- `nscmf.archive` (Archive + Unarchive);
- eligible user/role/permission/org administration;
- `system.settings.manage`;
- protected invariants.

Does not include hard-delete NSCMF, protected-account deletion/downgrade/disable, or impersonation.

---

# PART O — DOWNSTREAM OPEN ITEMS

## 39. Items Intentionally Deferred

### Validation / UI

- exact actor/permission for Change Result capture in `PENDING_REVIEW`;
- exact Result fields required before Forward;
- first Submit / Resubmit validation;
- mandatory reasons besides Reopen;
- attachment and numbering validation;
- Service Impact cardinality.

### Data Model

- scope storage representation;
- reviewer contributor/viewer model;
- final `approved_by` versus event history;
- archive flag field representation;
- workflow iteration/version model.

### Tech / Security

- final authorization package;
- middleware/policy architecture;
- transaction/locking/version strategy;
- sensitive permission change audit;
- session/password reset controls.

Canonical state names, Reopen sources/destinations, Archive eligible states, and Unarchive behavior are **no longer TBD**; they are authoritative in `05_State_Status_Flow.md`.

---

# PART P — TESTABLE RBAC ACCEPTANCE CRITERIA

## 40. Acceptance Criteria

- [ ] Requester default visibility = own records.
- [ ] Reviewer only acts on matching scope + `PENDING_REVIEW`.
- [ ] Reviewer A does not lock Reviewer B/C.
- [ ] Multiple Reviewer contributors are retained.
- [ ] Approver only acts on matching scope + `PENDING_APPROVAL`.
- [ ] Approver may cover multiple units.
- [ ] Approval is non-exclusive.
- [ ] One valid final Approve creates `APPROVED` and final `Approved By`.
- [ ] Stale second Approve is denied.
- [ ] `nscmf.reopen` can be delegated but only works on visible unarchived `REJECTED`/`APPROVED`.
- [ ] Reopen target is only `REVISION_REQUIRED`/`PENDING_REVIEW`.
- [ ] `nscmf.archive` can be delegated.
- [ ] Archive only works on `APPROVED`/`REJECTED`/`CANCELLED`.
- [ ] Unarchive uses lifecycle permission and preserves business status.
- [ ] Archived `APPROVED`/`REJECTED` must Unarchive before Reopen.
- [ ] Legitimate viewer can see timeline and export.
- [ ] Inaccessible record cannot be exported through API/ID manipulation.
- [ ] Protected Superadmin remains protected/global.
- [ ] Delegated administrators cannot bypass protected invariants.
- [ ] Custom granular roles work within state/scope boundaries.
- [ ] Core System Settings remain Superadmin-only.
- [ ] No impersonation or NSCMF hard-delete capability.
- [ ] Server-side state revalidation rejects stale conflicting workflow actions.

---

# PART Q — TRACEABILITY / NEXT DOCUMENT

## 41. Relationship to State Flow

`05_State_Status_Flow.md` is authoritative for:

- canonical state identifiers;
- allowed transitions;
- Reopen destinations;
- terminal/recoverable classification;
- Archive/Unarchive state treatment;
- concurrency/current-state requirements.

This RBAC document is authoritative for actor permission/scope eligibility on those transitions.

---

## 42. Next Document

The next project document is:

**`06_Validation_Rules.md`**

It will lock first Submit, Resubmit, Forward, Change Result gate, conditional fields, reason requirements, numbering, Service Impact cardinality, attachment constraints, and field-level editability required by the canonical state machine.
