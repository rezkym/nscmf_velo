# RBAC / Permission Matrix

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-RBAC-004  
> **Document Order:** 04 / 20  
> **Status:** Draft — Synchronized through Confirmed Security Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
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
- privileged audit visibility permissions;
- authorization guardrails.

Business Rules menentukan invariant. User Flow menentukan urutan interaction. State Flow menentukan lifecycle yang valid. Validation Rules menentukan apakah input/action valid. RBAC menentukan apakah actor tertentu berhak melakukan action pada current record/state. `10_Security_Rules.md` menambahkan security preconditions seperti re-authentication/session revocation tanpa mengubah business permission semantics.

Technology implementation boundary telah dikunci pada `08_Tech_Stack_Specification.md`:

```text
Spatie Laravel Permission 8.x
+ Laravel Policies / Gates
+ custom ownership / Unit / Approval scope logic
+ domain state / invariant checks
```

Spatie menangani role/permission primitives, **bukan seluruh business authorization model**.

`09_System_Architecture.md` mengunci bahwa routine record/resource access evidence berada pada **Access Audit** terpisah, sedangkan `nscmf.timeline.view` mengacu pada **Business Timeline** yang berisi business mutation/workflow/lifecycle evidence. `10_Security_Rules.md` mengunci permanent audit preservation dan protected raw Access/Security Audit visibility.

---

## 2. Core Authorization Model

```text
Effective Access
=
Permission
+
Record Visibility
+
Scope / Ownership
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
```

Permission saja tidak cukup.

Contoh:

- `nscmf.approve` tetapi record bukan `PENDING_APPROVAL` → DENY;
- `nscmf.review.forward` tetapi record bukan `PENDING_REVIEW` → DENY;
- `nscmf.change.result.edit` tetapi actor bukan owner/visible authorized actor atau record bukan Change `PENDING_REVIEW` → DENY;
- `nscmf.reopen` tetapi record archived → DENY sampai Unarchive;
- `nscmf.archive` tetapi record `DRAFT` → DENY;
- `users.reset_password` tanpa successful password re-authentication → DENY;
- `audit.access.view` tanpa underlying eligible audit/resource scope → DENY unless future explicit global-auditor mandate exists;
- global Superadmin visibility tetap tidak memberi hard-delete NSCMF.

---

## 3. Authorization Principles

### RBAC-PRINCIPLE-001 — Deny by Default
Action yang tidak diberikan atau tidak memenuhi scope/state MUST ditolak.

### RBAC-PRINCIPLE-002 — Server-Side Enforcement
Permission, visibility, ownership/scope, archive flag, current state, validation, dan required security preconditions MUST diverifikasi backend.

### RBAC-PRINCIPLE-003 — Multi-Role Allowed
Satu user MAY memiliki beberapa role.

### RBAC-PRINCIPLE-004 — Permission Union
Effective permission multi-role pada dasarnya union seluruh role, tetap tunduk state/scope/invariants/security preconditions.

### RBAC-PRINCIPLE-005 — Scope Independent From Role Name
Reviewer/Approver role tidak otomatis global.

### RBAC-PRINCIPLE-006 — Custom Roles Supported
Custom role MAY memperoleh kombinasi permission granular selama tidak melanggar protected invariant.

### RBAC-PRINCIPLE-007 — No Impersonation
Tidak ada user impersonation/login-as-user.

### RBAC-PRINCIPLE-008 — Narrow Permission Stays Narrow
Permission yang dibuat untuk field subset seperti `nscmf.change.result.edit` MUST NOT ditafsirkan sebagai general form edit capability.

### RBAC-PRINCIPLE-009 — Package Does Not Override Domain Scope
Spatie role/permission success MUST NOT bypass ownership, Unit/Division scope, Approval Scope, state, archive treatment, security preconditions, or protected invariants.

### RBAC-PRINCIPLE-010 — Security Preconditions Are Not New Business Permissions
Password re-authentication, session validity, malware gate, dan signing readiness are security preconditions. Mereka tidak menciptakan alternate route untuk memperoleh business permission atau persistent NSCMF state baru.

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
- default eligible melihat privileged Access Audit dan Security Audit;
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

Authentication policy itself is not granted by permission: current MVP is password-only, minimum 6 characters, no composition requirement, no MFA, and session controls follow `10_Security_Rules.md`.

---

## 8. NSCMF Core Permissions

| Permission | Description |
|---|---|
| `nscmf.create` | Membuat record NSCMF baru |
| `nscmf.draft.edit` | Edit eligible `DRAFT` / `REVISION_REQUIRED` own record |
| `nscmf.submit` | Submit `DRAFT` atau Resubmit `REVISION_REQUIRED` |
| `nscmf.cancel` | Cancel own `DRAFT` sebelum first Submit |
| `nscmf.change.result.edit` | Narrow edit untuk `NSCMF - Change / Result of Changes` pada eligible `PENDING_REVIEW` record |
| `nscmf.view` | View record yang lolos visibility |
| `nscmf.view.history` | Access History berdasarkan visibility |
| `nscmf.attachment.manage` | Manage attachment pada editable/authorized context |
| `nscmf.export` | Export visible record |
| `nscmf.export.bulk` | Bulk export visible records |
| `nscmf.timeline.view` | View Business Timeline pada visible record |

### RBAC-CORE-001 — View Implies Business Timeline
Legitimate viewer MUST dapat melihat **Business Timeline** record tersebut.

Routine view/download/access evidence sendiri mengikuti separate Access Audit architecture dan tidak wajib muncul sebagai Business Timeline row.

### RBAC-CORE-002 — Export Requires View
Export tidak dapat digunakan untuk inaccessible record.

### RBAC-CORE-003 — State-Neutral View
View/opening record tidak mengubah business state atau membuat exclusive assignee.

### RBAC-CORE-004 — Result Permission Eligibility
Default `nscmf.change.result.edit` behavior:

```text
actor has nscmf.change.result.edit
+ record family = CHANGE
+ business_status = PENDING_REVIEW
+ actor owns record OR has explicitly configured valid visibility for delegated custom use
+ record not archived
= may edit Result-of-Changes fields only
```

Default Requester role menggunakan own-record scope. General submitted fields tetap locked.

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

### RBAC-REV-005 — Reviewer Access Logging
Reviewer view/access MUST mengikuti Access Audit requirement tanpa state transition. Routine access evidence MUST NOT diperlakukan sebagai business workflow action pada normal Business Timeline.

### RBAC-REV-006 — Change Result Is Not Reviewer Ownership
Change Result capture tidak otomatis menjadi Reviewer permission. Default actor adalah Requester/owner melalui `nscmf.change.result.edit`. Reviewer tetap memvalidasi Result melalui Forward gate.

### RBAC-REV-007 — Review Reasons
Return dan Reject membutuhkan mandatory reason menurut `06_Validation_Rules.md`. Reason requirement bukan permission baru.

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

### RBAC-APR-006 — Activity Evidence
Approver workflow/lifecycle actions dari iteration sebelumnya MAY muncul pada Business Timeline. Routine Approver view/access evidence berada pada separate Access Audit dan tidak membuat viewer menjadi owner/assignee.

### RBAC-APR-007 — No Duplicate Final Approval
Setelah state `APPROVED`, stale Approve kedua MUST ditolak.

### RBAC-APR-008 — Approval Reasons
Return to Reviewer, Return to Requester, dan Reject membutuhkan mandatory reason menurut Validation Rules. Approve comment Optional.

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
AND mandatory reason
```

Archive dilarang pada `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`.

### RBAC-LIFE-007 — Unarchive Uses Lifecycle Permission
Unarchive menggunakan `nscmf.archive` pada current conceptual permission model:

```text
nscmf.archive
+ valid visibility
+ is_archived = true
+ mandatory reason
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
| `users.reset_password` | Reset credential according to temporary-password security flow |
| `users.assign_roles` | Assign/remove roles |
| `users.assign_units` | Assign/move Unit/Division |
| `users.assign_scopes` | Configure eligible reviewer/approval scope |

User administration MAY didelegasikan, tetapi protected Superadmin invariants tetap berlaku.

Sensitive credential/role/permission actions additionally require acting-user password re-authentication. Password reset and role/permission/access-changing identity mutations revoke all target-user active sessions according to `10_Security_Rules.md`; permission presence alone is insufficient.

---

## 13. Role / Permission Administration

| Permission | Description |
|---|---|
| `roles.view` | View role mapping |
| `roles.create` | Create custom role |
| `roles.update` | Update eligible role |
| `roles.archive` | Archive eligible role jika model final mengizinkan |
| `permissions.assign` | Assign permission to role |

Role administration MAY didelegasikan. Protected Superadmin role tidak dapat dihapus/archive/downgrade. Role/permission mutations that change effective access require password re-authentication and target-session revocation.

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

These MAY be delegated through explicit permission. If a scope mutation changes effective access for a target user, session-revocation security policy applies.

---

## 15. System Settings

Core system settings tetap protected Superadmin-only, termasuk initial setup mode, global numbering configuration, notification integration settings, dan protected security/signing configuration where exposed through application administration.

Conceptual permission:

```text
system.settings.manage
```

Current requirement tidak mendelegasikan permission ini.

Sensitive protected settings require password re-authentication according to `10_Security_Rules.md`.

---

## 15A. Privileged Audit Permissions

| Permission | Description |
|---|---|
| `audit.access.view` | View privileged/raw Access Audit evidence within underlying authorized resource/audit scope |
| `audit.security.view` | View privileged Security Audit evidence within applicable administrative/security scope |

Rules:

- Protected Superadmin receives both by default.
- Permissions MAY be explicitly delegated to an eligible custom role.
- `audit.access.view` and `audit.security.view` MUST NOT by themselves grant ordinary NSCMF record visibility, Review scope, Approval Scope, export permission, or business Timeline mutation.
- A future explicit global-auditor requirement MAY define broader audit scope, but it does not exist implicitly today.
- No normal role has permission to edit/delete historical authoritative audit evidence.

---

# PART D — SCOPE MODEL

## 16. Requester Scope

Requester default = own records. Additional roles extend visibility additively.

For `nscmf.change.result.edit`, default Requester eligibility tetap own record only.

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
- Own = own-record condition;
- — not default but MAY be custom-granted if rule allows;
- ❌ capability unavailable.

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| Login / Logout | ✅ | ✅ | ✅ | ✅ |
| Create NSCMF | ✅ | ✅ | — | — |
| Edit own `DRAFT` | ✅ | ✅ | — | — |
| Edit own `REVISION_REQUIRED` | ✅ | ✅ | — | — |
| Autosave / Save editable record | ✅ | ✅ | — | — |
| Edit Change Result in `PENDING_REVIEW` | ✅ | ✅ Own | — | — |
| Cancel own `DRAFT` | ✅ | ✅ | — | — |
| Submit/Resubmit own eligible record | ✅ | ✅ | — | — |
| View own NSCMF | ✅ | ✅ | Scope | Scope |
| View scoped NSCMF | ✅ | — | ✅ Unit/Division | ✅ Approval Scope |
| View all NSCMF | 🔒 | — | — | — |
| View Business Timeline on visible record | ✅ | ✅ | ✅ | ✅ |
| View raw Access Audit | ✅ | — | — | — |
| View Security Audit | ✅ | — | — | — |
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

`Reopen`, `Archive/Unarchive`, `audit.access.view`, and `audit.security.view` MAY be custom-granted explicitly to eligible non-Superadmin roles while all underlying scope/security restrictions remain mandatory.

`nscmf.change.result.edit` MAY also be custom-granted, but field/state/family/visibility restrictions remain mandatory.

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
| View raw Access Audit | ✅ | — | — | — |
| View Security Audit | ✅ | — | — | — |
| Manage Core System Settings | 🔒 | — | — | — |
| Impersonate User | ❌ | ❌ | ❌ | ❌ |

All administration capability except Core System Settings MAY be delegated by explicit permissions. Delegation does not remove re-authentication/session-revocation security preconditions.

---

# PART F — RECORD ACTION DECISION MATRIX

## 22. Requester Actions

| Action | Permission | State / Condition |
|---|---|---|
| Create | `nscmf.create` | authenticated eligible user |
| Edit general form | `nscmf.draft.edit` | own + `DRAFT` or `REVISION_REQUIRED` |
| Autosave / Save | `nscmf.draft.edit` | own + editable state |
| Update Change Result | `nscmf.change.result.edit` | own visible Change + `PENDING_REVIEW` + only Result fields |
| Cancel | `nscmf.cancel` | own + `DRAFT` + never submitted |
| Submit | `nscmf.submit` | own + `DRAFT` + validation passes |
| Resubmit | `nscmf.submit` | own + `REVISION_REQUIRED` + validation passes |
| View | `nscmf.view` | own or additional scoped visibility |
| Export | `nscmf.export` | visible record |

Normal Requester general edit remains unavailable in `PENDING_REVIEW`; Result permission is the only current narrow exception.

---

## 23. Reviewer Actions

| Action | Permission | State / Condition |
|---|---|---|
| View review candidate | `nscmf.view` | matching Unit/Division + `PENDING_REVIEW` |
| Review activity | `nscmf.review` | matching scope + `PENDING_REVIEW` |
| Forward | `nscmf.review.forward` | matching scope + `PENDING_REVIEW` + Forward validation |
| Return | `nscmf.review.return` | matching scope + `PENDING_REVIEW` + mandatory reason |
| Reject | `nscmf.review.reject` | matching scope + `PENDING_REVIEW` + mandatory reason |
| Business Timeline | implicit from valid view | matching visibility |
| Export | `nscmf.export` | visible record |

For Change, Forward additionally requires Result-of-Changes gate to pass.

---

## 24. Approver Actions

| Action | Permission | State / Condition |
|---|---|---|
| View candidate | `nscmf.view` | matching Approval Scope + `PENDING_APPROVAL` |
| Approve | `nscmf.approve` | matching scope + `PENDING_APPROVAL` |
| Return Reviewer | `nscmf.approval.return_reviewer` | matching scope + `PENDING_APPROVAL` + mandatory reason |
| Return Requester | `nscmf.approval.return_requester` | matching scope + `PENDING_APPROVAL` + mandatory reason |
| Reject | `nscmf.approval.reject` | matching scope + `PENDING_APPROVAL` + mandatory reason |
| Business Timeline | implicit from valid view | matching visibility |
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
+ mandatory reason
```

Unarchive:

```text
nscmf.archive
+ visible record
+ is_archived = true
+ mandatory reason
```

Both are administrative lifecycle actions and do not alter `business_status`.

---

# PART H — MULTI-ROLE RESOLUTION

## 27. Effective Permission Examples

### Requester + Reviewer
Own record actions + Result capture on own eligible Change + Review access within Reviewer Scope. No automatic Approval.

### Reviewer + Approver
May Review records only in Reviewer Scope and Approve records only in separate Approval Scope; scopes need not be identical.

### Custom NOC Lead
May receive mixed `review`, `approve`, `reopen`, `archive`, `export`, and optionally `change.result.edit` permissions with matching visibility/scope, without user administration.

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
Multi-actor business audit trail
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

## 31. Business Timeline and Privileged Audit Visibility

Legitimate record viewer can see **Business Timeline** sesuai record visibility. Timeline dapat memuat creator, modifier, submit/resubmit, Result capture, review/forward, return, reject, approve, reopen, archive/unarchive, timestamp, dan required reason/comment yang relevan.

Routine record `View`, attachment access/download, export request/download evidence **tidak menjadi routine Business Timeline row**. Evidence tersebut berada pada separate Access Audit concern menurut `09_System_Architecture.md`.

Raw/privileged audit visibility is now confirmed:

```text
Business Timeline
→ normal legitimate record viewer, via record visibility

Raw Access Audit
→ Protected Superadmin by default
→ or explicit audit.access.view + valid underlying audit/resource scope

Security Audit
→ Protected Superadmin by default
→ or explicit audit.security.view + applicable security/admin scope
```

These permissions do not imply `nscmf.view.all` and do not alter Reviewer/Approver scope.

Authoritative Business/Access/Security Audit evidence has no time-based automatic purge according to `10_Security_Rules.md`. No normal role may mutate/delete historical authoritative audit evidence.

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

If raw Access Audit is explicitly required and underlying scope is authorized:

```text
audit.access.view
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

Optional custom-grant where business ownership allows:

```text
nscmf.change.result.edit
```

State/family/visibility restrictions continue to apply.

---

# PART L — PROTECTED / NON-DELEGABLE CAPABILITIES

## 33. Protected Capabilities

| Capability | Rule |
|---|---|
| Hard-delete NSCMF | Unavailable |
| Delete/disable/downgrade protected Superadmin | Unavailable |
| User impersonation | Out of scope |
| Bypass audit | Unavailable |
| Delete authoritative audit because of age | Unavailable |
| Bypass Review | Unavailable |
| Bypass Approval | Unavailable |
| Reopen directly to Approval | Unavailable |
| Archive active-work state | Unavailable |
| General edit through Result-only permission | Unavailable |
| Core system settings for normal role | Not delegated |
| Bypass sensitive-action password re-authentication | Unavailable |
| Bypass target-session revocation after access-changing identity mutation | Unavailable |

---

# PART M — AUTHORIZATION DECISION ORDER

## 34. Decision Evaluation

Backend SHOULD/MUST conceptually evaluate:

```text
1. authenticated + active account + valid session?
2. protected invariant satisfied?
3. required permission?
4. record/resource visibility?
5. ownership / matching scope where required?
6. archive flag compatible with action?
7. current business state eligible?
8. input/action validation passes?
9. destination allowed?
10. field subset restriction satisfied for narrow edit?
11. required password re-auth/security precondition satisfied for sensitive admin action?
12. execute atomically / with architecture-appropriate concurrency control.
13. write required Business Audit / Access Audit / Security Audit evidence to the correct concern.
```

Routine access logging follows separate Access Audit path and MUST NOT be mistaken for workflow mutation.

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
nscmf.change.result.edit
nscmf.attachment.manage
nscmf.timeline.view
nscmf.export
nscmf.export.bulk
```

Default scope: own records. `nscmf.change.result.edit` only applies to own Change `PENDING_REVIEW` Result fields.

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

- all normal NSCMF permissions, including `nscmf.change.result.edit`;
- global visibility;
- `nscmf.reopen`;
- `nscmf.archive` (Archive + Unarchive);
- `audit.access.view`;
- `audit.security.view`;
- eligible user/role/permission/org administration;
- `system.settings.manage`;
- protected invariants.

Does not include hard-delete NSCMF, protected-account deletion/downgrade/disable, impersonation, atau bypass of sensitive-action password re-authentication.

---

# PART O — IMPLEMENTATION BOUNDARY / DOWNSTREAM ITEMS

## 39. Authorization Technology Mapping

Confirmed by `08_Tech_Stack_Specification.md`:

```text
Spatie Laravel Permission 8.x
→ role / permission primitives

Laravel Policies / Gates
→ resource authorization boundary

Custom domain scope/query logic
→ ownership / Unit / Reviewer / Approval visibility

Domain/application services
→ state / archive / validation / workflow invariant enforcement
```

Spatie `teams` MUST NOT silently replace Unit/Division atau Approval Scope semantics.

Confirmed by `09_System_Architecture.md`:

```text
workflow/lifecycle transition
→ short DB transaction + row-level current-state lock

Draft/Revision/Result persistence
→ optimistic version conflict detection

routine access evidence
→ separate Access Audit

Business Timeline
→ business mutation/workflow/lifecycle evidence
```

Confirmed by `10_Security_Rules.md`:

```text
password policy
→ minimum 6, no composition rule, no MFA

session
→ 30m idle, 8h absolute, max 2 active sessions

sensitive admin mutation
→ password re-auth + target-session revocation

raw Access/Security Audit
→ protected permissions + no age-based purge
```

### Still Deferred to Data / Security / Code Organization

- exact scope storage representation;
- reviewer contributor + Access Audit physical data model;
- final `approved_by` versus event-history field representation;
- archive flag physical representation;
- workflow iteration/version column/table representation;
- middleware/policy class organization;
- exact re-auth proof lifetime/implementation;
- exact session persistence/eviction physical representation.

Validation decisions regarding Result actor, Result fields, first Submit/Resubmit, mandatory reasons, attachment, numbering, dan Service Impact are **no longer TBD** and follow `06_Validation_Rules.md`.

Hybrid concurrency and Business Timeline/Access Audit separation are **no longer TBD** and follow `09_System_Architecture.md`.

Security policy, audit preservation/visibility, and session/re-auth controls are **no longer TBD** and follow `10_Security_Rules.md`.

---

# PART P — TESTABLE RBAC ACCEPTANCE CRITERIA

## 40. Acceptance Criteria

- [ ] Requester default visibility = own records.
- [ ] Requester receives default narrow `nscmf.change.result.edit` for own Change `PENDING_REVIEW`.
- [ ] Result-only permission cannot modify unrelated submitted fields.
- [ ] Reviewer only acts on matching scope + `PENDING_REVIEW`.
- [ ] Reviewer A does not create an exclusive lock/ownership that removes Reviewer B/C eligibility.
- [ ] Multiple Reviewer contributors are retained.
- [ ] Approver only acts on matching scope + `PENDING_APPROVAL`.
- [ ] Approver may cover multiple units.
- [ ] Approval is non-exclusive.
- [ ] One valid final Approve creates `APPROVED` and final `Approved By`.
- [ ] Stale second Approve is denied.
- [ ] Return/Reject actions fail without required reason even if permission exists.
- [ ] `nscmf.reopen` can be delegated but only works on visible unarchived `REJECTED`/`APPROVED`.
- [ ] Reopen target is only `REVISION_REQUIRED`/`PENDING_REVIEW`.
- [ ] `nscmf.archive` can be delegated.
- [ ] Archive only works on `APPROVED`/`REJECTED`/`CANCELLED` and requires reason.
- [ ] Unarchive uses lifecycle permission, requires reason, and preserves business status.
- [ ] Archived `APPROVED`/`REJECTED` must Unarchive before Reopen.
- [ ] Legitimate record viewer can see Business Timeline and export.
- [ ] Routine View/access evidence does not pollute Business Timeline and is represented through separate Access Audit architecture.
- [ ] Raw Access Audit requires Protected Superadmin default or explicit `audit.access.view` plus valid underlying scope.
- [ ] Security Audit requires Protected Superadmin default or explicit `audit.security.view` plus valid security/admin scope.
- [ ] Audit permissions do not implicitly grant `nscmf.view.all`, Review, Approval, Reopen, or export capability.
- [ ] Inaccessible record cannot be exported through API/ID manipulation.
- [ ] Protected Superadmin remains protected/global.
- [ ] Delegated administrators cannot bypass protected invariants.
- [ ] Custom granular roles work within state/scope boundaries.
- [ ] Core System Settings remain Superadmin-only.
- [ ] No impersonation or NSCMF hard-delete capability.
- [ ] Server-side state revalidation rejects stale conflicting workflow actions.
- [ ] Spatie role/permission success alone cannot bypass ownership/scope/state/security rules.
- [ ] Optimistic concurrency does not grant extra edit permission or allow stale Draft/Result overwrite.
- [ ] Sensitive password/role/permission mutation requires acting-user password re-authentication.
- [ ] Password/role/permission/access-changing target mutation revokes all target-user active sessions.
- [ ] Authoritative audit evidence cannot be normal-user modified/deleted and is not age-purged.

---

# PART Q — TRACEABILITY / NEXT DOCUMENT

## 41. Relationship to State, Validation, Tech Stack, Architecture, and Security

`05_State_Status_Flow.md` is authoritative for:

- canonical state identifiers;
- allowed transitions;
- Reopen destinations;
- terminal/recoverable classification;
- Archive/Unarchive state treatment;
- concurrency/current-state requirements.

`06_Validation_Rules.md` is authoritative for:

- field/action validity;
- mandatory reasons;
- Result gate;
- attachment/numbering validation;
- Service Impact cardinality;
- narrow Result field edit constraints.

`08_Tech_Stack_Specification.md` is authoritative for authorization implementation technology:

- Spatie Laravel Permission 8.x;
- Laravel Policies/Gates;
- custom domain scope and invariant enforcement.

`09_System_Architecture.md` is authoritative for:

- hybrid concurrency execution model;
- Business Audit vs Access Audit separation;
- application/module interaction boundaries;
- asynchronous export/storage execution topology.

`10_Security_Rules.md` is authoritative for:

- password/session/security policy;
- sensitive action re-authentication;
- target-session revocation;
- privileged audit security and no-time-based audit purge;
- attachment malware security;
- signing credential protection/public PDF verification.

This RBAC document remains authoritative for actor permission/scope eligibility and business authorization semantics.

---

## 42. Next Document

Current fixed project order is synchronized through confirmed Security decisions.

The next project document to be created is:

**`10_Security_Rules.md`**

It MUST consume this permission model without changing Reviewer/Approver/Requester/Superadmin business eligibility.