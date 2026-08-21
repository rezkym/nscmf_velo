# RBAC / Permission Matrix

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-RBAC-004  
> **Document Order:** 04 / 20  
> **Status:** Draft — Confirmed RBAC Model + Explicit TBDs  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **siapa boleh melakukan apa** pada NSCMF Digital Form & Workflow System.

Dokumen ini menjadi source of truth untuk:

- role template;
- permission catalog;
- record visibility;
- unit/division scope;
- approval scope;
- multi-role behavior;
- custom role behavior;
- delegated administration;
- protected Superadmin restrictions;
- authorization guardrails.

Business Rules menentukan batas bisnis. User Flow menentukan urutan interaksi. RBAC menentukan apakah actor tertentu **berhak menjalankan action** terhadap resource tertentu.

Permission pada dokumen ini bersifat **konseptual dan implementation-agnostic**. Nama permission dapat diterapkan menggunakan authorization package/framework yang dipilih kemudian pada `08_Tech_Stack_Specification.md`. Package seperti `spatie/laravel-permission` adalah kandidat yang sesuai, tetapi belum menjadi keputusan teknis final pada dokumen ini.

---

## 2. Core Authorization Model

Authorization aplikasi menggunakan kombinasi:

```text
Effective Access
=
Permission
+
Record Scope
+
Current Workflow State
+
Business Rules
+
Protected System Invariants
```

Memiliki permission **tidak selalu cukup** untuk menjalankan action.

Contoh:

- user memiliki `nscmf.approve`, tetapi record berada di luar Approval Scope → **DENY**;
- user memiliki `nscmf.review`, tetapi record belum berada pada tahap yang dapat direview → **DENY**;
- user memiliki `nscmf.archive`, tetapi action melanggar state rule yang nantinya ditentukan → **DENY**;
- Superadmin memiliki global visibility, tetapi tetap tidak boleh hard-delete NSCMF → **DENY** karena no-hard-delete adalah invariant.

---

## 3. Authorization Principles

### RBAC-PRINCIPLE-001 — Deny by Default

Action yang tidak diberikan melalui permission atau protected Superadmin capability MUST dianggap tidak diizinkan.

### RBAC-PRINCIPLE-002 — Server-Side Enforcement

Semua permission dan scope MUST diverifikasi pada backend. Menyembunyikan tombol pada UI saja tidak dianggap authorization.

### RBAC-PRINCIPLE-003 — Multi-Role Is Allowed

Satu user MAY memiliki lebih dari satu role.

### RBAC-PRINCIPLE-004 — Permission Union

Untuk multi-role user, effective permission pada dasarnya adalah union dari permission seluruh role yang dimiliki user, tetap tunduk pada scope, state, dan business invariant.

### RBAC-PRINCIPLE-005 — Scope Is Independent From Role Name

Role name tidak otomatis memberikan global access. Reviewer dan Approver tetap memerlukan scope.

### RBAC-PRINCIPLE-006 — Custom Roles Are Supported

Superadmin dapat menggunakan role template atau membuat role secara manual. Role custom MAY memperoleh kombinasi permission granular selama tidak melanggar protected invariant.

### RBAC-PRINCIPLE-007 — No Impersonation

Aplikasi tidak menyediakan permission untuk login/impersonate sebagai user lain.

Fitur impersonation tidak termasuk requirement saat ini.

---

# PART A — DEFAULT ROLE TEMPLATE

## 4. Default Roles

Initial setup menyediakan template minimum berikut:

| Role | Purpose | Default Scope Model |
|---|---|---|
| `Superadmin` | Protected authority tertinggi | Global |
| `Requester` | Membuat dan mengajukan NSCMF | Own records |
| `Reviewer` | Melakukan review | Assigned Unit/Division |
| `Approver` | Final approval | Assigned Approval Scope, dapat mencakup beberapa Unit/Division |

Role template adalah **default starting point**, bukan batas bahwa aplikasi hanya boleh memiliki empat role.

---

## 5. Protected Superadmin

### RBAC-SUPER-001 — Seeded Protected Role

Setidaknya satu protected Superadmin account MUST dibuat saat seeding awal.

### RBAC-SUPER-002 — Global NSCMF Visibility

Superadmin dapat melihat seluruh NSCMF termasuk active, rejected, cancelled, approved, reopened, dan archived records.

### RBAC-SUPER-003 — Default Administrative Authority

Superadmin secara default memiliki seluruh administrative permissions yang relevan.

### RBAC-SUPER-004 — Cannot Be Downgraded

Protected Superadmin role tidak dapat dilepas dari protected account.

### RBAC-SUPER-005 — Cannot Be Disabled

Protected Superadmin account tidak dapat dinonaktifkan/soft-delete melalui normal application flow.

### RBAC-SUPER-006 — Cannot Be Deleted

Protected Superadmin account tidak dapat di-hard-delete.

### RBAC-SUPER-007 — No NSCMF Hard Delete Capability

Superadmin **tidak pernah** memperoleh permission untuk hard-delete NSCMF karena action tersebut tidak tersedia dalam business model.

### RBAC-SUPER-008 — Delegation Does Not Remove Protection

User lain MAY diberi administrative permissions, tetapi permission tersebut tidak dapat digunakan untuk menghapus, downgrade, disable, atau mengambil alih protection protected Superadmin.

---

# PART B — PERMISSION CATALOG

## 6. Permission Naming Convention

Permission konseptual menggunakan namespace:

```text
<domain>.<action>[.<qualifier>]
```

Contoh:

```text
nscmf.create
nscmf.review
nscmf.approve
users.manage
roles.manage
```

Nama final di source code MAY sedikit berbeda selama mapping ke specification ini terdokumentasi.

---

## 7. Authentication / Session Permissions

Authentication dasar tidak perlu diperlakukan sebagai role-specific permission setelah account aktif.

| Permission | Purpose |
|---|---|
| `session.login` | Login menggunakan account valid |
| `session.logout` | Mengakhiri session sendiri |

Account disabled MUST NOT dapat login terlepas dari role yang masih tersimpan pada data user tersebut.

Protected Superadmin tidak boleh berada pada disabled state.

---

## 8. NSCMF Core Permissions

| Permission | Description |
|---|---|
| `nscmf.create` | Membuat record NSCMF baru |
| `nscmf.draft.edit` | Mengedit Draft yang berada dalam eligible ownership/scope |
| `nscmf.submit` | Submit record yang eligible |
| `nscmf.cancel` | Cancel own Draft sebelum submission |
| `nscmf.view` | Membuka record yang lolos visibility scope |
| `nscmf.view.history` | Mengakses History berdasarkan visibility scope |
| `nscmf.attachment.manage` | Menambah/mengubah/menghapus attachment pada state editable |
| `nscmf.export` | Export record yang boleh dilihat |
| `nscmf.export.bulk` | Bulk export record yang boleh dilihat |
| `nscmf.timeline.view` | Melihat timeline/audit activity dari record yang boleh dilihat |

### RBAC-CORE-001 — View Implies Timeline Visibility

Semua user yang dapat melihat sebuah NSCMF MUST dapat melihat timeline aktivitas record tersebut untuk mengetahui siapa melakukan apa.

Karena itu `nscmf.timeline.view` secara business behavior melekat pada valid record visibility dan tidak boleh dipakai untuk menyembunyikan timeline dari legitimate viewer.

### RBAC-CORE-002 — Export Requires View

`nscmf.export` atau `nscmf.export.bulk` tidak dapat digunakan untuk record yang tidak boleh dilihat user.

---

## 9. Review Permissions

| Permission | Description |
|---|---|
| `nscmf.review` | Melakukan review terhadap record eligible dalam Reviewer Scope |
| `nscmf.review.forward` | Menyelesaikan review dan meneruskan ke Approval |
| `nscmf.review.return` | Return record kepada Requester untuk revision |
| `nscmf.review.reject` | Reject record pada tahap Review |

### RBAC-REV-001 — Reviewer Scope Required

Permission review selalu membutuhkan Reviewer Scope yang mencakup record target.

### RBAC-REV-002 — Reviewer Is Non-Exclusive

Record **tidak di-lock secara eksklusif kepada satu Reviewer**.

Semua Reviewer yang:

1. memiliki permission yang diperlukan; dan
2. memiliki Unit/Division scope yang mencakup record

MAY membuka dan melakukan review action sesuai current state.

### RBAC-REV-003 — Multiple Reviewer Contributors Are Allowed

Satu NSCMF MAY memiliki aktivitas review/modification dari lebih dari satu Reviewer sepanjang lifecycle-nya.

Contoh:

```text
Reviewer A → membuka dan review
Reviewer B → review / modification action
Reviewer A → melihat revision
Reviewer C → forward
```

Semua actor tersebut tetap tercatat pada timeline/audit history.

### RBAC-REV-004 — Assigned / Modified By Is Tracking, Not Exclusive Ownership

Konsep `assigned`, `modified by`, atau reviewer contributor tidak boleh digunakan sebagai exclusive lock.

Satu record MAY memiliki lebih dari satu Reviewer yang tercatat sebagai contributor.

### RBAC-REV-005 — Viewer Logging

Ketika Reviewer membuka record yang dapat dilihatnya, sistem MUST dapat mencatat viewer activity sesuai audit requirement yang sudah disepakati untuk workflow ini.

Viewer activity tidak otomatis menjadikan Reviewer tersebut exclusive assignee.

---

## 10. Approval Permissions

| Permission | Description |
|---|---|
| `nscmf.approve` | Memberikan final approval pada record eligible |
| `nscmf.approval.return_reviewer` | Mengembalikan record ke Review |
| `nscmf.approval.return_requester` | Mengembalikan record ke Requester untuk revision |
| `nscmf.approval.reject` | Reject record pada tahap Approval |

### RBAC-APR-001 — Approval Scope Required

Approver action hanya valid apabila actor memiliki Approval Scope yang mencakup record target.

### RBAC-APR-002 — Approval Scope May Cover Multiple Units

Satu Approver MAY memiliki scope yang mencakup lebih dari satu Unit/Division.

Contoh:

```text
Approver A scope:
- NOC
- Domestic
- Regional
```

### RBAC-APR-003 — Approver Is Non-Exclusive

Approver tidak di-assign secara eksklusif.

Semua Approver yang memiliki permission dan matching scope MAY melihat serta mengambil action pada record yang eligible.

### RBAC-APR-004 — Single Final Approval

**Satu final approval dari satu eligible Approver sudah cukup untuk membuat NSCMF menjadi Approved.**

Aplikasi tidak mewajibkan seluruh eligible Approver memberikan approval.

### RBAC-APR-005 — Approved By Is the Final Actor

`Approved By` merepresentasikan actor yang berhasil mengeksekusi final approval tersebut.

Contoh:

```text
Approver A → View
Approver B → View
Approver C → Approve

Final Approved By = Approver C
```

### RBAC-APR-006 — Multiple Approver Activity May Exist in Timeline

Walaupun final Approved By hanya satu actor, timeline MAY memiliki aktivitas dari beberapa eligible Approver, misalnya view, return, atau reject pada iteration sebelumnya.

### RBAC-APR-007 — First Valid Final Approval Completes Approval

Setelah satu eligible Approver berhasil menghasilkan final Approved state, Approver lain tidak boleh menghasilkan approval kedua untuk workflow iteration yang sama.

Action berikutnya harus tunduk pada current state yang sudah berubah.

---

## 11. Recovery / Lifecycle Permissions

| Permission | Description |
|---|---|
| `nscmf.reopen` | Reopen/Revert eligible terminal/protected record sesuai Business Rules |
| `nscmf.archive` | Archive NSCMF tanpa hard delete |

### RBAC-LIFE-001 — Superadmin Has Reopen Permission by Default

Protected Superadmin memiliki `nscmf.reopen` secara default.

### RBAC-LIFE-002 — Reopen May Be Delegated

Custom/default role lain MAY memperoleh `nscmf.reopen` jika permission tersebut secara eksplisit diberikan.

Memiliki permission ini tetap tidak mengizinkan actor melewati mandatory reason, target-state selection, audit, dan workflow restriction.

### RBAC-LIFE-003 — Reopen Is Not Global View

User dengan `nscmf.reopen` hanya dapat melakukan reopen terhadap record yang secara authorization dapat ia akses, kecuali role tersebut juga memiliki global visibility.

### RBAC-LIFE-004 — Archive May Be Delegated

`nscmf.archive` MAY diberikan kepada role selain Superadmin.

### RBAC-LIFE-005 — Archive Is Not Delete

Tidak ada permission `nscmf.delete` atau `nscmf.force_delete` untuk NSCMF.

### RBAC-LIFE-006 — Archived Visibility

Archived record mengikuti visibility normal:

- Superadmin → seluruh archived NSCMF;
- Requester → archived own record yang masih termasuk visibility-nya;
- Reviewer → archived record dalam Unit/Division scope;
- Approver → archived record dalam Approval Scope;
- custom role → mengikuti effective view permission + scope.

Archive tidak menjadi cara untuk menyembunyikan record dari actor yang secara normal masih memiliki legitimate access.

---

# PART C — USER, ROLE, UNIT, AND SETTINGS ADMINISTRATION

## 12. User Management Permissions

| Permission | Description |
|---|---|
| `users.view` | Melihat daftar/detail user |
| `users.create` | Membuat user baru |
| `users.update` | Mengubah profil/account metadata user |
| `users.enable` | Mengaktifkan kembali eligible account |
| `users.disable` | Menonaktifkan eligible account |
| `users.reset_password` | Memulai/reset password user sesuai security flow |
| `users.assign_roles` | Assign/remove role user |
| `users.assign_units` | Memindahkan atau mengubah Unit/Division membership user |
| `users.assign_scopes` | Mengatur Reviewer/Approval scope user jika model implementation memerlukan direct user scope assignment |

### RBAC-USER-001 — Delegated User Administration Is Allowed

Superadmin memiliki user management secara default, tetapi user lain MAY memperoleh permission user management jika diberikan secara eksplisit.

### RBAC-USER-002 — Protected Superadmin Cannot Be Modified Through Delegated Admin

User dengan `users.update`, `users.disable`, atau `users.assign_roles` MUST NOT dapat:

- disable protected Superadmin;
- menghapus protected Superadmin role;
- downgrade protected Superadmin;
- hard-delete protected Superadmin.

### RBAC-USER-003 — No User Impersonation Permission

Tidak ada permission `users.impersonate` pada scope proyek saat ini.

---

## 13. Role and Permission Administration

| Permission | Description |
|---|---|
| `roles.view` | Melihat role dan permission mapping |
| `roles.create` | Membuat custom role |
| `roles.update` | Mengubah eligible custom/template role |
| `roles.archive` | Menonaktifkan/archive eligible role jika diizinkan model final |
| `permissions.assign` | Mengatur permission yang dimiliki role |

### RBAC-ROLE-001 — Superadmin Has Role Administration by Default

Superadmin dapat mengelola role dan permission.

### RBAC-ROLE-002 — Role Administration May Be Delegated

Role lain MAY mengelola role/permission apabila memperoleh permission administrasi yang sesuai.

### RBAC-ROLE-003 — Protected Superadmin Role Cannot Be Removed

Delegated role management tidak dapat menghapus, archive, atau membuat protected Superadmin kehilangan protection-nya.

### RBAC-ROLE-004 — Custom Role May Use Granular Permission Combination

Custom role MAY memiliki kombinasi capability granular.

Contoh valid:

```text
Role: NOC Lead
Permissions:
- nscmf.view
- nscmf.review
- nscmf.review.forward
- nscmf.review.return
- nscmf.approve
- nscmf.reopen
- nscmf.export

No permission:
- users.create
- roles.update
- system.settings.manage
```

### RBAC-ROLE-005 — Permission Delegation Cannot Create System Invariant Bypass

Walaupun sebuah role memiliki banyak permission, role tersebut tetap tidak dapat memperoleh kemampuan yang tidak tersedia dalam business model, seperti hard-delete NSCMF.

---

## 14. Unit / Division Administration

| Permission | Description |
|---|---|
| `org_units.view` | Melihat Unit/Division configuration |
| `org_units.create` | Membuat Unit/Division |
| `org_units.update` | Mengubah Unit/Division |
| `org_units.archive` | Archive eligible Unit/Division |
| `org_units.assign_users` | Mapping user ke Unit/Division |
| `org_units.assign_reviewer_scope` | Mengatur Unit/Division yang dapat direview actor |
| `org_units.assign_approver_scope` | Mengatur Unit/Division/scope yang dapat di-approve actor |

### RBAC-ORG-001 — Organization Administration May Be Delegated

Superadmin memiliki permission ini secara default, tetapi role/user lain MAY memperoleh permission apabila diberikan secara eksplisit.

### RBAC-ORG-002 — Template and Manual Organization Setup

Initial setup MAY menggunakan template/mapping Unit/Division atau manual configuration sesuai User Flow.

Pengelolaan setelah initial setup mengikuti permission catalog pada section ini.

---

## 15. System Settings Permissions

### RBAC-SETTINGS-001 — System Settings Are Superadmin-Only

Core system settings berikut hanya dapat dikonfigurasi oleh protected Superadmin:

- initial role setup mode (`Template` / `Manual`);
- initial Unit/Division setup mode (`Template` / `Manual`);
- global numbering configuration;
- draft notification integration settings;
- protected system-level configuration lain yang nantinya dikategorikan sebagai System Settings.

Gunakan conceptual permission:

```text
system.settings.manage
```

Permission tersebut **tidak boleh didelegasikan** kepada normal custom role pada requirement saat ini.

### RBAC-SETTINGS-002 — Ongoing Role Management Is Different From System Settings

`roles.manage` / role-permission administration dapat didelegasikan sesuai explicit permission.

Hal tersebut berbeda dengan mengubah **initial/protected system setup mode** yang tetap Superadmin-only.

---

# PART D — SCOPE MODEL

## 16. Requester Scope

### RBAC-SCOPE-REQ-001 — Own Records

Requester secara default hanya dapat melihat record yang dimilikinya/dibuat dalam requester ownership context.

### RBAC-SCOPE-REQ-002 — Additional Roles Extend Visibility

Jika Requester juga memiliki Reviewer atau Approver role, effective visibility bertambah sesuai scope role lainnya.

Contoh:

```text
User X:
- Requester
- Reviewer (Unit NOC)

Can see:
- own NSCMF
- NSCMF dalam Reviewer Scope NOC
```

---

## 17. Reviewer Scope

Reviewer Scope berbasis Unit/Division.

```text
Reviewer Permission
+
Matching Unit/Division
=
Eligible Review Access
```

### RBAC-SCOPE-REV-001 — Multiple Reviewer Units Are Allowed

Reviewer MAY diberi satu atau beberapa Unit/Division scope apabila konfigurasi organisasi membutuhkannya.

### RBAC-SCOPE-REV-002 — No Implicit Global Reviewer Scope

Reviewer tanpa matching Unit/Division tidak dapat review record hanya karena memiliki role Reviewer.

---

## 18. Approver Scope

Approver MAY memiliki satu atau beberapa Approval Scope.

Scope dapat mencakup beberapa Unit/Division sekaligus.

### RBAC-SCOPE-APR-001 — Multi-Unit Approval

Satu Approver MAY berwenang melakukan approval untuk lebih dari satu Unit/Division.

### RBAC-SCOPE-APR-002 — No Implicit Global Approver Scope

Approver tanpa matching scope tidak dapat approve record hanya karena memiliki role Approver.

### RBAC-SCOPE-APR-003 — Scope Representation Is Deferred

Apakah Approval Scope nantinya direpresentasikan sebagai:

- daftar Unit/Division;
- organizational group;
- custom scope object;
- kombinasi beberapa attribute

akan difinalisasi pada ERD/System Architecture setelah requirement scope stabil.

Business behavior yang wajib hanyalah: **Approver dapat memiliki scope lebih dari satu unit dan action harus dibatasi oleh scope tersebut.**

---

## 19. Global Scope

### RBAC-SCOPE-GLOBAL-001 — Protected Superadmin Global Scope

Protected Superadmin memiliki global NSCMF visibility.

### RBAC-SCOPE-GLOBAL-002 — Custom Global View Permission

Apabila di kemudian hari business owner ingin role selain Superadmin memiliki global visibility tanpa full Superadmin authority, gunakan explicit permission konseptual:

```text
nscmf.view.all
```

Permission ini **belum menjadi default pada role template**.

Jika diberikan, role tetap tidak otomatis memperoleh administrative, reopen, archive, review, atau approval permission.

---

# PART E — DEFAULT ROLE PERMISSION MATRIX

## 20. Core NSCMF Matrix

Legend:

- ✅ = diberikan secara default
- 🔒 = diberikan dan protected/inherent
- Scope = hanya berlaku dalam scope yang valid
- — = tidak diberikan secara default, tetapi MAY diberikan melalui custom configuration jika rule memperbolehkan

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| Login / Logout | ✅ | ✅ | ✅ | ✅ |
| Create NSCMF | ✅ | ✅ | — | — |
| Edit own Draft | ✅ | ✅ | — | — |
| Autosave own Draft | ✅ | ✅ | — | — |
| Save Draft | ✅ | ✅ | — | — |
| Cancel own Draft | ✅ | ✅ | — | — |
| Submit own eligible NSCMF | ✅ | ✅ | — | — |
| View own NSCMF | ✅ | ✅ | Scope | Scope |
| View scoped NSCMF | ✅ | — | ✅ Unit/Division | ✅ Approval Scope |
| View all NSCMF | 🔒 | — | — | — |
| View timeline on visible NSCMF | ✅ | ✅ | ✅ | ✅ |
| Manage attachment while editable | ✅ | ✅ | — | — |
| Review | ✅ | — | ✅ Scope | — |
| Forward to Approval | ✅ | — | ✅ Scope | — |
| Return from Review to Requester | ✅ | — | ✅ Scope | — |
| Reject at Review | ✅ | — | ✅ Scope | — |
| Approve | ✅ | — | — | ✅ Scope |
| Return Approval to Reviewer | ✅ | — | — | ✅ Scope |
| Return Approval to Requester | ✅ | — | — | ✅ Scope |
| Reject at Approval | ✅ | — | — | ✅ Scope |
| Reopen/Revert | ✅ | — | — | — |
| Archive | ✅ | — | — | — |
| Single Export visible record | ✅ | ✅ | ✅ | ✅ |
| Bulk Export visible records | ✅ | ✅ | ✅ | ✅ |
| Hard Delete NSCMF | ❌ | ❌ | ❌ | ❌ |

> `Reopen` dan `Archive` tidak diberikan secara default kepada Requester/Reviewer/Approver, tetapi MAY diberikan kepada custom/default role melalui explicit permission sesuai Business Rules.

---

## 21. Administration Matrix

| Capability | Superadmin | Requester | Reviewer | Approver |
|---|---:|---:|---:|---:|
| View Users | ✅ | — | — | — |
| Create User | ✅ | — | — | — |
| Edit User | ✅ | — | — | — |
| Enable/Disable eligible User | ✅ | — | — | — |
| Reset Password | ✅ | — | — | — |
| Assign/Remove Roles | ✅ | — | — | — |
| Assign User Unit/Division | ✅ | — | — | — |
| Manage Roles | ✅ | — | — | — |
| Manage Permissions | ✅ | — | — | — |
| Manage Unit/Division | ✅ | — | — | — |
| Configure Reviewer Scope | ✅ | — | — | — |
| Configure Approver Scope | ✅ | — | — | — |
| Manage Core System Settings | 🔒 | — | — | — |
| Impersonate User | ❌ | ❌ | ❌ | ❌ |

> Semua administration capability selain **Core System Settings** MAY diberikan ke role lain melalui explicit permissions. Tabel hanya menunjukkan default template.

---

# PART F — RECORD ACTION DECISION MATRIX

## 22. Requester Actions

| Action | Required Permission | Required Scope/Condition |
|---|---|---|
| Create | `nscmf.create` | Authenticated eligible user |
| Edit Draft | `nscmf.draft.edit` | Own + editable state |
| Save Draft | `nscmf.draft.edit` | Own + editable state |
| Autosave | `nscmf.draft.edit` | Own + editable state |
| Cancel | `nscmf.cancel` | Own + still Draft / not submitted |
| Submit | `nscmf.submit` | Own + validation passes |
| Edit returned record | `nscmf.draft.edit` or equivalent revision edit permission | Own + returned to Requester |
| Resubmit | `nscmf.submit` | Own + revision validation passes |
| View | `nscmf.view` | Own or extra scope from another role |
| Export | `nscmf.export` | Must be allowed to view record |

---

## 23. Reviewer Actions

| Action | Required Permission | Required Scope/Condition |
|---|---|---|
| View review candidate | `nscmf.view` | Matching Unit/Division |
| Review | `nscmf.review` | Matching Unit/Division + eligible state |
| Forward | `nscmf.review.forward` | Matching Unit/Division + eligible state |
| Return to Requester | `nscmf.review.return` | Matching Unit/Division + eligible state |
| Reject | `nscmf.review.reject` | Matching Unit/Division + eligible state |
| View Timeline | implicit from valid view | Matching Unit/Division |
| Export | `nscmf.export` | Matching Unit/Division / valid visibility |

Reviewer A melakukan review **tidak mencabut hak Reviewer B** yang juga eligible.

---

## 24. Approver Actions

| Action | Required Permission | Required Scope/Condition |
|---|---|---|
| View approval candidate | `nscmf.view` | Matching Approval Scope |
| Approve | `nscmf.approve` | Matching Approval Scope + eligible state |
| Return to Reviewer | `nscmf.approval.return_reviewer` | Matching Approval Scope + eligible state |
| Return to Requester | `nscmf.approval.return_requester` | Matching Approval Scope + eligible state |
| Reject | `nscmf.approval.reject` | Matching Approval Scope + eligible state |
| View Timeline | implicit from valid view | Matching Approval Scope |
| Export | `nscmf.export` | Matching Approval Scope / valid visibility |

Approver A membuka record **tidak mengunci** record dari Approver B/C.

Satu actor yang berhasil mengeksekusi `Approve` menjadi final `Approved By` untuk workflow iteration tersebut.

---

# PART G — REOPEN / ARCHIVE MATRIX

## 25. Reopen

Reopen membutuhkan:

```text
nscmf.reopen
+
valid record visibility
+
reopen-eligible current state
+
mandatory reason
+
selected destination
```

### RBAC-REOPEN-001

Protected Superadmin memperoleh permission ini secara default.

### RBAC-REOPEN-002

Role lain MAY memperoleh permission ini secara eksplisit.

### RBAC-REOPEN-003

Permission `nscmf.reopen` tidak otomatis memberikan `nscmf.view.all`.

### RBAC-REOPEN-004

Actor yang melakukan Reopen harus tercatat di audit log bersama reason dan destination.

---

## 26. Archive

Archive membutuhkan:

```text
nscmf.archive
+
valid record visibility
+
archive-eligible state
```

### RBAC-ARCH-001

Superadmin memiliki permission Archive secara default.

### RBAC-ARCH-002

Role lain MAY memperoleh `nscmf.archive` secara eksplisit.

### RBAC-ARCH-003

Archive tidak memberikan hak menghapus audit history atau business record.

---

# PART H — MULTI-ROLE RESOLUTION

## 27. Effective Permission Examples

### Example 1 — Requester + Reviewer

```text
Roles:
- Requester
- Reviewer
Reviewer Scope:
- NOC
```

User dapat:

- membuat own NSCMF;
- melihat own NSCMF;
- melihat/review NSCMF lain dalam NOC scope;
- export seluruh record yang dapat dilihat.

User tidak otomatis dapat approve.

### Example 2 — Reviewer + Approver

```text
Roles:
- Reviewer
- Approver
Reviewer Scope:
- NOC
Approval Scope:
- NOC, Domestic
```

User dapat:

- review NOC record;
- approve NOC dan Domestic record jika state eligible;
- tidak review Domestic record jika Domestic tidak termasuk Reviewer Scope.

### Example 3 — Custom NOC Lead

```text
Permissions:
- nscmf.view
- nscmf.review
- nscmf.review.forward
- nscmf.review.return
- nscmf.approve
- nscmf.reopen
- nscmf.export

Scope:
Reviewer = NOC
Approver = NOC
```

User dapat melakukan review, approve, dan reopen NOC record sesuai state/business rules, tetapi tidak dapat manage users apabila tidak memiliki user administration permission.

---

## 28. Same Person Across Workflow Stages

Current business model tidak mewajibkan separation of duty.

Dengan permission dan scope yang benar, user MAY menjadi lebih dari satu actor type pada record yang sama.

Namun setiap action tetap harus dicatat sebagai action terpisah dengan actor dan timestamp.

RBAC MUST NOT menggabungkan action history hanya karena actor-nya sama.

---

# PART I — REVIEWER AND APPROVER COLLABORATION

## 29. Reviewer Collaboration Model

Reviewer model adalah:

```text
Shared visibility
+
Non-exclusive action eligibility
+
Multi-actor audit trail
```

Bukan:

```text
One record = permanently assigned to one reviewer
```

Sistem MAY menampilkan metadata seperti:

- viewed by;
- reviewed by;
- modified by;
- last reviewer action;
- reviewer contributors.

Namun metadata tersebut tidak boleh menjadi exclusive authorization lock kecuali business rule baru dibuat di masa depan.

---

## 30. Approver Collaboration Model

Approver model adalah:

```text
Shared eligibility within scope
+
Non-exclusive access
+
Single final approval actor
```

Contoh:

```text
Approver A → viewed
Approver B → returned to reviewer
Reviewer C → completed re-review
Approver A → viewed again
Approver C → approved

Final Approved By = Approver C
```

Timeline tetap menyimpan seluruh actor/action sebelumnya.

---

# PART J — AUDIT VISIBILITY

## 31. Timeline Visibility

Semua legitimate viewer dapat melihat timeline record yang boleh mereka lihat.

Timeline harus mampu menunjukkan secara manusiawi setidaknya:

- siapa membuat record;
- siapa melihat jika viewer logging diterapkan pada action tersebut;
- siapa mengubah field;
- siapa submit;
- siapa review;
- siapa return;
- siapa resubmit;
- siapa reject;
- siapa approve;
- siapa reopen;
- siapa archive;
- timestamp terkait;
- reason/catatan ketika rule mensyaratkannya.

### RBAC-AUDIT-001 — No Separate Hidden Timeline for Normal Viewer

Requester, Reviewer, Approver, Superadmin, dan custom role yang validly dapat melihat record juga dapat melihat workflow timeline record tersebut.

### RBAC-AUDIT-002 — Audit Storage Mutation Is Not Granted

Melihat audit log tidak memberikan permission untuk mengedit atau menghapus audit data.

Tidak ada normal role yang boleh memodifikasi historical audit event.

---

# PART K — CUSTOM ROLE GUARDRAILS

## 32. Custom Role Rules

Custom role dapat dibentuk secara granular.

Contoh permission sets:

### Read-Only Auditor

```text
nscmf.view
nscmf.timeline.view
nscmf.export
```

Scope harus tetap didefinisikan.

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

### Delegated User Administrator

```text
users.view
users.create
users.update
users.enable
users.disable
users.reset_password
users.assign_roles
users.assign_units
```

Tetap tidak dapat mengubah protected Superadmin invariant.

---

# PART L — PROTECTED / NON-DELEGABLE CAPABILITIES

## 33. Capabilities That Must Remain Protected

Berikut tidak boleh diberikan sebagai normal permission:

| Capability | Rule |
|---|---|
| Hard-delete NSCMF | Tidak tersedia |
| Hard-delete protected Superadmin | Tidak tersedia |
| Disable protected Superadmin | Tidak tersedia |
| Remove protected Superadmin role | Tidak tersedia |
| Downgrade protected Superadmin | Tidak tersedia |
| User impersonation | Tidak termasuk product scope |
| Bypass audit logging | Tidak tersedia |
| Bypass mandatory Review | Tidak tersedia |
| Bypass mandatory Approval | Tidak tersedia |
| Disable audit invariant | Tidak tersedia |
| Core system settings for non-Superadmin | Tidak didelegasikan pada requirement saat ini |

---

# PART M — AUTHORIZATION DECISION ORDER

## 34. Decision Evaluation

Backend sebaiknya mengevaluasi action menggunakan urutan konseptual berikut:

```text
1. Is account active/authenticated?
2. Is protected invariant satisfied?
3. Does actor have required permission?
4. Can actor see/access target record?
5. Does actor scope match target record?
6. Is action valid for current workflow state?
7. Does input pass required validation?
8. Execute business action atomically.
9. Write audit/workflow event.
```

Jika salah satu prerequisite gagal, action MUST ditolak.

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

Scope:

```text
Own records
```

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

Scope:

```text
Assigned Unit/Division(s)
```

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

Scope:

```text
Assigned Approval Scope
May include multiple Unit/Division(s)
```

---

## 38. Superadmin Bundle

Protected Superadmin secara default memiliki:

- all normal NSCMF permissions;
- global NSCMF visibility;
- `nscmf.reopen`;
- `nscmf.archive`;
- all eligible user administration permissions;
- all role/permission administration permissions;
- all Unit/Division administration permissions;
- `system.settings.manage`;
- protected Superadmin invariant.

Tidak termasuk:

- NSCMF hard delete;
- protected account deletion/downgrade/disable;
- user impersonation.

---

# PART O — OPEN DECISIONS FOR DOWNSTREAM DOCUMENTS

## 39. Items Intentionally Deferred

RBAC model sudah cukup untuk permission behavior, tetapi beberapa detail implementation/state masih harus ditentukan kemudian:

### State / Status Flow

- [ ] Exact state names untuk every workflow stage.
- [ ] Exact eligible states untuk Archive.
- [ ] Exact eligible terminal states untuk Reopen.
- [ ] Exact state transition setelah Reopen destination dipilih.

### Validation

- [ ] Mandatory reason untuk Reject/Return/Archive apabila belum dikunci pada Business Rules.
- [ ] Attachment validation.
- [ ] Number validation.

### Data Model

- [ ] Apakah scope disimpan pada role, user, organization membership, pivot table, atau kombinasi.
- [ ] Model reviewer contributor / viewer activity.
- [ ] Model final `approved_by` versus approval event history.

### Tech Stack

- [ ] Final authorization package.
- [ ] Apakah `spatie/laravel-permission` digunakan.
- [ ] Middleware/policy/gate architecture.

### Security

- [ ] Sensitive permission change audit policy.
- [ ] Password reset implementation.
- [ ] Session controls.
- [ ] Administrative action re-authentication jika diperlukan.

---

# PART P — TESTABLE RBAC ACCEPTANCE CRITERIA

## 40. Acceptance Criteria

RBAC dianggap memenuhi specification apabila setidaknya seluruh kondisi berikut dapat diverifikasi:

- [ ] Requester hanya melihat own record kecuali memiliki role/scope tambahan.
- [ ] Reviewer dapat melihat seluruh record dalam assigned Unit/Division scope.
- [ ] Reviewer A tidak menyebabkan record terkunci dari Reviewer B yang juga eligible.
- [ ] Multiple Reviewer dapat tercatat sebagai contributor pada record yang sama.
- [ ] Approver dapat memiliki beberapa Unit/Division dalam Approval Scope.
- [ ] Semua eligible Approver dapat melihat approval candidate yang sama.
- [ ] Approval tidak di-assign eksklusif kepada satu Approver.
- [ ] Satu eligible Approver yang berhasil Approve cukup menghasilkan final Approved state.
- [ ] Final `Approved By` menunjukkan actor final approval.
- [ ] Approver lain tidak dapat memberikan approval kedua pada workflow iteration yang sudah Approved.
- [ ] Semua legitimate record viewer dapat melihat timeline aktivitas.
- [ ] Semua legitimate record viewer dapat export record tersebut.
- [ ] User tanpa record visibility tidak dapat export melalui direct API/ID manipulation.
- [ ] Superadmin melihat seluruh active dan archived NSCMF.
- [ ] Archived record user biasa tetap mengikuti visibility scope normal.
- [ ] `nscmf.reopen` dapat diberikan kepada role selain Superadmin.
- [ ] `nscmf.archive` dapat diberikan kepada role selain Superadmin.
- [ ] Delegated role/user/unit administrator bekerja hanya bila permission diberikan.
- [ ] Protected Superadmin tidak dapat disable, delete, atau downgrade oleh delegated administrator.
- [ ] Custom role dapat memperoleh granular mixed permissions.
- [ ] System Settings tetap Superadmin-only.
- [ ] Tidak tersedia user impersonation.
- [ ] Tidak tersedia NSCMF hard-delete permission.
- [ ] Permission check dilakukan server-side.

---

# PART Q — TRACEABILITY

## 41. Relationship to Prior Documents

| Decision | Source |
|---|---|
| Template + manual role setup | Business Rules / User Flow |
| Multi-role allowed | Business Rules |
| Requester visibility = own | Business Rules |
| Reviewer visibility = Unit/Division | Business Rules |
| Approver can cover multiple units | Confirmed RBAC refinement |
| Reviewer non-exclusive | Confirmed User Flow refinement |
| Multiple reviewer contributors | Confirmed RBAC refinement |
| Approver non-exclusive | Confirmed RBAC refinement |
| Single final Approver | Confirmed from existing sign-off model + business confirmation |
| View implies timeline visibility | Confirmed RBAC refinement |
| View implies export | Business Rules |
| Reopen permission can be delegated | Confirmed RBAC refinement |
| Archive permission can be delegated | Confirmed RBAC refinement |
| System Settings = Superadmin-only | Confirmed RBAC refinement |
| No impersonation | Confirmed RBAC refinement |
| Custom granular roles | Confirmed RBAC refinement |

---

## 42. Next Document

Dokumen berikutnya adalah:

**`05_State_Status_Flow.md`**

Dokumen tersebut harus mengubah semantic workflow yang sudah diketahui menjadi state machine authoritative, termasuk minimal:

- Draft;
- Submitted / Awaiting Review;
- Review processing;
- Returned for Revision;
- Reviewed / Awaiting Approval;
- Returned from Approval;
- Rejected;
- Approved;
- Reopened;
- Cancelled;
- Archived behavior;
- valid action dari setiap state;
- siapa actor yang dapat menghasilkan transition;
- terminal vs recoverable state;
- revision loops;
- selected Reopen destination.

Nama state final belum boleh di-hardcode ke implementation sampai `05_State_Status_Flow.md` disetujui.
