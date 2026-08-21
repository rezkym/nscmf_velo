# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Draft — Synchronized with confirmed User Flow and RBAC decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan aturan bisnis yang wajib dipatuhi oleh seluruh implementasi NSCMF Digital Form & Workflow System.

Aturan berlaku lintas UI, backend, database, API, automation, dan AI coding agent. Frontend tidak boleh menjadi satu-satunya lapisan enforcement; business rules yang membatasi akses, state, editability, scope, dan workflow tetap harus divalidasi server-side.

Dokumen ini bekerja bersama:

- `03_User_Flow.md` — urutan interaksi user;
- `04_RBAC_Permission_Matrix.md` — siapa boleh melakukan apa;
- `05_State_Status_Flow.md` — state machine authoritative;
- `06_Validation_Rules.md` — validitas field/input.

### Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **SHOULD** — direkomendasikan sebagai default behavior.
- **TBD** — belum final dan tidak boleh ditebak oleh implementasi.

---

# PART A — INITIAL SETUP, ORGANIZATION, USERS, AND ROLES

## 2. Initial Setup Wizard

### BR-SETUP-001 — First-Time Setup Uses a Wizard

Setelah protected Superadmin pertama berhasil login pada instalasi baru, aplikasi MUST menyediakan first-time setup berbentuk wizard.

### BR-SETUP-002 — Role Setup Mode

Wizard MUST menyediakan dua opsi:

1. **Use Role Template**
2. **Manual Role Configuration**

### BR-SETUP-003 — Default Role Template

Template minimum memiliki:

- `Superadmin`
- `Requester`
- `Reviewer`
- `Approver`

Exact permissions mengikuti `04_RBAC_Permission_Matrix.md`.

### BR-SETUP-004 — Template Roles Remain Configurable

Role/permission hasil template MAY dimodifikasi setelah initial setup oleh actor yang memiliki permission administrasi yang sesuai, kecuali protected Superadmin invariants.

### BR-SETUP-005 — Unit / Division Setup Mode

Wizard MUST menyediakan dua pendekatan Unit/Division:

1. predefined template/mapping;
2. manual configuration.

Exact default template entries masih TBD dan MUST NOT ditebak oleh implementation agent.

### BR-SETUP-006 — User Organizational Mapping

User MAY dipetakan ke Unit/Division. Mapping tersebut digunakan sebagai salah satu dasar scope/visibility.

### BR-SETUP-007 — Approver May Cover Multiple Units

Satu Approver MAY memiliki Approval Scope yang mencakup lebih dari satu Unit/Division.

### BR-SETUP-008 — Core Initial System Settings Are Superadmin-Only

Core initial/system-level settings seperti setup mode, global numbering configuration, dan notification integration settings hanya dapat dikelola protected Superadmin sesuai RBAC.

Ongoing role, user, permission, dan Unit/Division administration MAY didelegasikan melalui permission granular.

---

## 3. Protected Superadmin

### BR-SUPER-001 — Seeded Protected Account

Initial seeding MUST membuat setidaknya satu protected Superadmin account.

### BR-SUPER-002 — Highest Standard Authority

Protected Superadmin adalah authority tertinggi pada standard role template.

### BR-SUPER-003 — Cannot Be Deleted, Disabled, or Downgraded

Protected Superadmin MUST NOT dapat:

- hard delete;
- soft delete;
- disable;
- kehilangan protected Superadmin role;
- didowngrade.

### BR-SUPER-004 — Protection Applies Everywhere

Proteksi berlaku melalui UI, API, import, bulk action, maupun administrative flow lain.

### BR-SUPER-005 — Global NSCMF Visibility

Protected Superadmin MUST dapat melihat seluruh NSCMF, termasuk archived records.

### BR-SUPER-006 — Protected Identity Does Not Mean Plaintext Credential

Seeded/protected identity tidak mengizinkan plaintext password atau secret di source code.

---

## 4. User and Permission Administration

### BR-USER-001 — No Self-Registration

User biasa MUST NOT dapat self-register.

### BR-USER-002 — Administrative User Creation

User account dibuat melalui administrative flow oleh Superadmin atau actor yang memiliki permission user-management.

### BR-USER-003 — Delegated Administration Is Allowed

Actor dengan permission yang sesuai MAY:

- create/edit user;
- assign/remove role;
- assign/move Unit/Division;
- configure scope;
- reset password/credential melalui mechanism final;
- enable/disable normal account;
- manage eligible roles/permissions;
- manage eligible Unit/Division configuration.

Protected Superadmin tetap tidak dapat dimodifikasi dengan cara yang melanggar Part A.

### BR-USER-004 — Multiple Roles Allowed

Satu user MAY memiliki lebih dari satu role.

### BR-USER-005 — No Mandatory Segregation of Duty

Current business decision tidak mewajibkan `Requester != Reviewer != Approver`.

User dengan permission, scope, dan workflow eligibility yang valid MAY berpartisipasi pada lebih dari satu tahap record yang sama.

### BR-USER-006 — No User Impersonation

User impersonation/login-as-user tidak termasuk product scope saat ini.

### BR-USER-007 — Permission Package Is Deferred

Package seperti `spatie/laravel-permission` merupakan kandidat implementasi, bukan business invariant. Keputusan final berada di `08_Tech_Stack_Specification.md`.

---

# PART B — FORM FAMILY AND EXCEL BUSINESS MEANING

## 5. Main Form Families

### BR-FORM-001 — Two Main Form Families

Aplikasi MUST menyediakan:

1. `NSCMF - Activation`
2. `NSCMF - Change`

### BR-FORM-002 — Activation Context

Activation digunakan untuk konteks **instalasi / provisioning**.

Subtype dari source workbook:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### BR-FORM-003 — Change Context

Change digunakan untuk konteks **maintenance / perubahan terhadap layanan atau environment yang sudah berjalan**.

Subtype dari source workbook:

- Maintenance;
- Upgrade;
- Emergency.

### BR-FORM-004 — Upgrade Is Contextual

Karena `Upgrade` muncul pada Activation dan Change, sistem MUST NOT menentukan form hanya dari keyword `Upgrade`.

- upgrade dalam konteks instalasi/provisioning → Activation;
- upgrade dalam konteks maintenance/perubahan existing service/environment → Change.

Kasus abu-abu harus dikonfirmasi kepada business owner.

---

## 6. NSCMF Change Field Semantics

### BR-CHG-001 — Purpose of Changes Is a Section

`(A) Purpose of Changes` adalah section form, bukan selectable option.

### BR-CHG-002 — Facing Challenges Is Input Content

`Facing Challenges (Upgrade / Emergency)` merupakan area input dan MUST NOT diperlakukan sebagai pilihan `Upgrade` vs `Emergency`.

### BR-CHG-003 — Maintenance Purpose Is Input Content

`Maintenance Purpose` merupakan area input, bukan option selector.

### BR-CHG-004 — Identified Problem Is Input Content

`Identified Problem (Please elaborate)` merupakan field naratif, bukan option selector.

### BR-CHG-005 — Service Impact Provides Selectable Values

`Service Impact` menyediakan pilihan dari source workbook:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Single-select vs multi-select akan dikunci pada Validation/UI specification berdasarkan behavior checkbox sumber dan konfirmasi bisnis.

### BR-CHG-006 — Improvement Plan and KPI Are Inputs

`Maintenance (Improvement) Plan` dan `Target KPI` adalah input data.

### BR-CHG-007 — Execution Information Must Be Representable

Change form MUST dapat merepresentasikan:

- Target date of execution;
- Monitoring period;
- Rollback scenario;
- Maintenance Announcement.

Source workbook juga menampilkan announcement timing `1 week before`, `2 weeks before`, dan `2 days before (emergency)`.

### BR-CHG-008 — Result of Changes Is a Distinct Section

`(B) Result of Changes (Activation/Deactivation/Optimization)` adalah section terpisah dengan konsep:

- Result summary;
- Performance information;
- Status.

Pada tahap workflow kapan section ini wajib diisi masih TBD.

---

# PART C — RECORD CREATION, NUMBERING, DRAFT, CANCELLATION, ATTACHMENTS

## 7. Record Creation

### BR-REC-001 — Requester Ownership

Setiap NSCMF MUST memiliki requester/owner context dan creator identity.

### BR-REC-002 — Form Selection Order

Saat membuat record, user memilih:

1. form family;
2. subtype;
3. numbering mode;
4. lalu mengisi form.

### BR-REC-003 — Numbering Mode Is Chosen Per Form

Setiap record baru menawarkan:

- **Automatic Number Generation**;
- **Manual Number Entry**.

### BR-REC-004 — Automatic Format Is TBD

Format nomor otomatis belum ditentukan.

### BR-REC-005 — Manual Number Requires Validation

Manual number harus divalidasi berdasarkan format/uniqueness final di `06_Validation_Rules.md`.

---

## 8. Draft and Autosave

### BR-DRAFT-001 — Draft Is Official

Aplikasi MUST mendukung Draft.

### BR-DRAFT-002 — Draft Is Editable

Requester MAY mengedit own Draft secara bebas selama masih eligible.

### BR-DRAFT-003 — Autosave Is Required

Editable Draft MUST mendukung autosave.

### BR-DRAFT-004 — Manual Save Draft Still Exists

UI MUST tetap menyediakan `Save Draft` walaupun autosave aktif.

### BR-DRAFT-005 — Persisted Draft Changes Are Audited

Setiap Draft change yang berhasil dipersist MUST masuk audit log.

### BR-DRAFT-006 — Draft May Be Incomplete

Draft MAY disimpan walaupun submission validation belum lengkap.

---

## 9. Cancellation

### BR-CAN-001 — Cancellation Is Draft-Only

Requester MAY Cancel own NSCMF hanya selama masih Draft dan **belum pernah Submit untuk Review**.

### BR-CAN-002 — Submit Removes Cancel Right

Setelah Submit pertama, normal Cancel action tidak tersedia.

### BR-CAN-003 — Cancelled Is Permanent

Cancelled record adalah terminal dan MUST NOT dapat Reopen.

Jika kebutuhan masih ada, buat NSCMF baru.

### BR-CAN-004 — Cancel Is Not Delete

Cancelled record tetap ada di History dan audit.

### BR-CAN-005 — Cancel Is Logged

Cancel MUST mencatat actor, timestamp, dan record. Mandatory reason masih TBD.

---

## 10. Attachments

### BR-ATT-001 — Attachment Input Exists

Form MUST menyediakan attachment input secara visual.

### BR-ATT-002 — Attachment Is Optional

Attachment bersifat optional pada current requirement.

### BR-ATT-003 — Attachment Mutations Are Audited

Add/remove/replace attachment reference MUST tercatat.

### BR-ATT-004 — Attachment Constraints Are Deferred

Allowed type, size, count, scanning, dan storage ditentukan di Validation/Security/Architecture.

---

# PART D — SUBMISSION AND REVIEW

## 11. Submit

### BR-SUB-001 — Submit Requires Validation

Requester hanya MAY Submit jika submission validation terpenuhi.

### BR-SUB-002 — Submit Locks Requester Editing

Setelah Submit, requester tidak dapat mengedit sampai workflow mengembalikan record untuk revision.

### BR-SUB-003 — Submit Creates Reviewer Visibility

Setelah Submit, record tersedia bagi Reviewer dengan matching Unit/Division scope.

### BR-SUB-004 — No Manual Reviewer Selection

Requester tidak perlu memilih satu Reviewer tertentu saat Submit.

---

## 12. Reviewer Visibility and Participation

### BR-REV-001 — All Eligible Reviewers Can See

Semua Reviewer dengan Unit/Division scope yang sesuai MAY melihat submitted/relevant record.

### BR-REV-002 — Review Is Non-Exclusive

Record tidak di-lock eksklusif kepada Reviewer pertama.

### BR-REV-003 — Viewer Logging

Reviewer yang membuka record MUST dapat dicatat sebagai viewer activity.

### BR-REV-004 — Action Actor Is Tracked

Reviewer yang melakukan perubahan/workflow action MUST tercatat sebagai actor, dan dapat direpresentasikan sebagai assigned/current reviewer dan/atau `modified by` sesuai data model final.

### BR-REV-005 — Assigned/Modified Context May Have Multiple Reviewers

Satu record MAY memiliki lebih dari satu Reviewer contributor. Assignment/tracking tidak mencabut hak eligible Reviewer lain.

### BR-REV-006 — Reviewer Actions

Reviewer MAY:

- complete/forward Review;
- Return for Revision;
- Reject.

### BR-REV-007 — Emergency Still Requires Review

Change/Emergency tetap wajib Review.

---

# PART E — REVISION LOOP

## 13. Return for Revision

### BR-RET-001 — Return Unlocks Requester Editing

Jika record dikembalikan ke Requester, requester MAY mengedit kembali.

### BR-RET-002 — Revision Can Repeat

Siklus berikut MAY berulang tanpa fixed maximum:

`Submit → Review → Return → Edit → Resubmit → Review`

### BR-RET-003 — Same Reviewer Context Is Preserved

Setelah revision yang berasal dari Reviewer, Resubmit SHOULD mengembalikan record ke reviewer context yang sama sebagai continuity reference.

### BR-RET-004 — Other Reviewers Remain Eligible

Reviewer lain dalam scope tetap visible dan MAY melanjutkan review/action jika state dan permission valid.

### BR-RET-005 — Every Iteration Is Logged

Old/new value, actor, timestamp, return, revision, resubmit, dan reviewer action MUST dipertahankan.

---

# PART F — APPROVAL

## 14. Approver Scope and Actions

### BR-APR-001 — Approver Uses Configured Scope

Approver hanya dapat bertindak pada record dalam matching Approval Scope.

### BR-APR-002 — One Approver May Cover Multiple Units

Approver MAY memiliki Approval Scope untuk beberapa Unit/Division.

### BR-APR-003 — Approval Requires Review

Record MUST melewati Review sebelum final Approval, termasuk Emergency.

### BR-APR-004 — Approver Actions

Approver MAY:

- Approve;
- Return to Reviewer;
- Return to Requester;
- Reject.

### BR-APR-005 — Return to Requester Must Pass Review Again

Jika Approver mengembalikan ke Requester, setelah revision dan Resubmit record MUST melewati Review lagi sebelum kembali ke Approval.

### BR-APR-006 — Approval Is Audited

Approval MUST mencatat actor, timestamp, record, dan workflow context.

### BR-APR-007 — Approver Eligibility Is Non-Exclusive

Approver tidak di-assign eksklusif.

Semua Approver dengan permission dan matching Approval Scope MAY melihat dan mengambil action pada approval candidate selama action valid terhadap current state.

### BR-APR-008 — Single Final Approval Is Sufficient

**Satu final approval dari satu eligible Approver sudah cukup untuk membuat NSCMF menjadi Approved.**

Sistem MUST NOT mewajibkan seluruh eligible Approver memberikan approval.

### BR-APR-009 — Approved By Is the Final Approval Actor

`Approved By` adalah actor yang berhasil mengeksekusi final Approve action.

Activity Approver lain seperti View, Return, atau Reject pada iteration sebelumnya tetap berada di timeline.

### BR-APR-010 — No Duplicate Final Approval for Same Iteration

Setelah satu eligible Approver berhasil membuat record menjadi Approved, Approver lain tidak dapat menghasilkan approval kedua untuk workflow iteration yang sama.

---

# PART G — REJECT AND REOPEN

## 15. Rejection

### BR-REJ-001 — Reject Is Not Delete

Rejected record tetap tersimpan di History.

### BR-REJ-002 — Reviewer and Approver May Reject

Reviewer dan Approver MAY Reject sesuai permission/scope.

### BR-REJ-003 — Rejected Is Closed for Normal Workflow

Requester tidak dapat normal edit/resubmit Rejected record.

### BR-REJ-004 — Rejected May Be Reopened by Authorized Actor

Rejected record MAY di-reopen oleh:

- protected Superadmin; atau
- actor yang secara eksplisit memiliki `nscmf.reopen` dan valid record visibility.

### BR-REJ-005 — Reopen Requires Reason

Reopen MUST meminta reason dan mencatat actor, timestamp, previous state, destination, dan reason.

### BR-REJ-006 — Reopen Actor Selects Destination

Authorized actor memilih destination yang valid saat Reopen. Allowed destinations akan dikunci pada `05_State_Status_Flow.md`.

---

## 16. Approved Reopen / Revert

### BR-REOPEN-001 — Approved Is Protected

Approved record tidak dapat diedit melalui normal workflow.

### BR-REOPEN-002 — Approved Reopen Is Permission-Gated

Approved record MAY di-reopen/revert oleh:

- protected Superadmin; atau
- actor yang secara eksplisit memiliki `nscmf.reopen`, matching visibility/scope, dan memenuhi state requirement.

Default template hanya memberikan capability ini kepada Superadmin, tetapi RBAC MAY mendelegasikannya kepada custom/default role lain.

### BR-REOPEN-003 — Reason Is Mandatory

Reopen Approved MUST memiliki reason.

### BR-REOPEN-004 — Actor Chooses Valid Target

Actor yang melakukan Reopen memilih target workflow yang valid sesuai State Flow.

### BR-REOPEN-005 — Previous Approval Is Preserved

Reopen MUST NOT menghapus fakta bahwa record pernah Approved.

---

# PART H — VISIBILITY, TIMELINE, HISTORY, EXPORT

## 17. Requester Visibility

### BR-VIS-001 — Requester Own Records

Requester melihat own NSCMF. Multi-role visibility bersifat additive.

## 18. Reviewer Visibility

### BR-VIS-002 — Reviewer Scope

Reviewer melihat relevant records berdasarkan Unit/Division scope.

## 19. Approver Visibility

### BR-VIS-003 — Approver Scope

Approver melihat relevant records berdasarkan configured Approval Scope, termasuk multi-unit.

## 20. Superadmin Visibility

### BR-VIS-004 — Global Visibility

Protected Superadmin melihat seluruh NSCMF.

## 21. Timeline Visibility

### BR-TIME-001 — Valid Viewer Can See Timeline

Semua user yang secara sah dapat melihat record juga dapat melihat timeline siapa melakukan apa pada record tersebut.

### BR-TIME-002 — Timeline Does Not Grant Audit Mutation

Melihat timeline tidak memberi kemampuan mengedit/menghapus historical audit events.

## 22. Export

### BR-EXP-001 — View Implies Export

Setiap user yang sah melihat sebuah NSCMF MAY mengekspor record tersebut.

### BR-EXP-002 — No View Means No Export

User MUST NOT mengekspor record yang tidak dapat dilihat.

### BR-EXP-003 — Bulk Export Checks Every Record

Bulk export MUST menerapkan visibility check per record.

### BR-EXP-004 — Export Does Not Change Business State

Export tidak mengubah data atau workflow state.

---

# PART I — AUDIT AND TRACEABILITY

## 23. Detailed Audit

### BR-AUD-001 — Every Persisted Business Change Is Logged

Setiap persisted business change MUST tercatat, termasuk saat Draft.

### BR-AUD-002 — Minimum Field Change Audit

Audit field change MUST dapat merepresentasikan:

- record identifier;
- actor;
- timestamp;
- field/data element;
- old value;
- new value;
- event context.

### BR-AUD-003 — Workflow Events Are Logged

Minimal event berikut MUST tercatat:

- create;
- autosave/save draft persistence;
- cancel;
- submit;
- viewer activity yang diwajibkan;
- review action;
- return;
- revision;
- resubmit;
- reject;
- approve;
- reopen/revert;
- archive;
- numbering change;
- attachment mutation;
- relevant user/role/scope administrative changes.

### BR-AUD-004 — Viewer and Modifier Are Distinguishable

History MUST dapat membedakan actor yang hanya melihat dengan actor yang melakukan perubahan/action.

### BR-AUD-005 — Historical Cycles Are Never Overwritten

Revision, rejection, approval, viewer, reviewer, dan approver activity sebelumnya MUST dipertahankan.

### BR-AUD-006 — Audit Data Is Not User-Editable

Normal user MUST NOT mengubah historical audit entries.

### BR-AUD-007 — Export Audit Is Deferred

Mandatory logging setiap export/download masih TBD.

---

# PART J — ARCHIVE AND DATA PRESERVATION

## 24. No Hard Delete

### BR-DEL-001 — NSCMF Has No Hard Delete

NSCMF MUST NOT memiliki normal hard-delete capability, termasuk untuk Superadmin.

### BR-DEL-002 — Archive Replaces Delete

Jika record perlu dikeluarkan dari active operational view, gunakan Archive.

### BR-DEL-003 — Archive Is Permission-Gated

Archive dapat dilakukan oleh:

- protected Superadmin; atau
- actor yang memiliki explicit `nscmf.archive`, valid record visibility, dan memenuhi state requirement.

### BR-DEL-004 — Archive Does Not Rewrite Business Status

Archive tidak boleh menghapus atau memalsukan last business status.

### BR-DEL-005 — Archive Preserves History

Archive mempertahankan record, workflow history, audit, review/approval history, dan attachment references sesuai policy final.

### BR-DEL-006 — Archived Is Removed From Default Active View

Archived record tidak tampil di default active list, tetapi tetap tersedia melalui authorized archived/history view.

### BR-DEL-007 — Archived Visibility Follows Normal Scope

- Superadmin → seluruh archived records;
- Requester → archived own record;
- Reviewer → archived record dalam Unit/Division scope;
- Approver → archived record dalam Approval Scope;
- custom role → sesuai view permission dan scope.

### BR-DEL-008 — Unarchive Is TBD

Unarchive behavior belum dikonfirmasi.

---

# PART K — NOTIFICATIONS

## 25. Notification Capability Is Drafted, Not Priority

### BR-NOTIF-001 — Future Notification Hooks

Product MAY menyediakan hook untuk:

- Submit;
- Return for Revision;
- Reject;
- Forward to Approval;
- Approve;
- Reopen.

### BR-NOTIF-002 — Not an MVP Blocker

Notification MUST NOT menghambat core MVP workflow.

### BR-NOTIF-003 — Telegram / WhatsApp Are Candidates

Telegram dan WhatsApp melalui Baileys merupakan future candidates, bukan final technology commitment.

---

# PART L — SYSTEM ENFORCEMENT INVARIANTS

## 26. Server-Side Enforcement

### BR-INT-001 — Authorization Must Be Server-Side

Role, permission, scope, ownership, state, dan validation MUST divalidasi server-side.

### BR-INT-002 — Direct Access Cannot Bypass Rules

Direct URL, manipulated ID, frontend payload, API, atau bulk request MUST NOT melewati rules.

### BR-INT-003 — Failed Action Must Not Leave Partial Business State

Business action yang gagal MUST NOT terlihat sukses atau meninggalkan partial state.

---

## 27. Mandatory High-Level Workflow

Core sequence:

`Draft → Submit → Review → Approval`

Confirmed branches/actions:

- Cancel hanya Draft, permanent;
- Return for Revision;
- unlimited revision/resubmit cycles;
- Reviewer Reject;
- Reviewer participation non-exclusive;
- Approver participation non-exclusive;
- single final approval cukup;
- Approver Return to Reviewer;
- Approver Return to Requester → wajib Review lagi;
- Approver Reject;
- Approved/Rejection Reopen oleh authorized `nscmf.reopen` actor dengan reason dan selected target;
- Archive oleh authorized `nscmf.archive` actor;
- Emergency tetap wajib Review + Approval.

Exact state names/transition matrix akan difinalisasi pada `05_State_Status_Flow.md`.

---

## 28. Confirmed Decisions Summary

| Area | Confirmed Decision |
|---|---|
| Initial setup | Wizard |
| Roles | Template atau manual; ongoing administration dapat permission-based |
| Unit/Division | Template/mapping atau manual |
| User roles | Multi-role allowed |
| Superadmin | Seeded, protected, cannot delete/disable/downgrade |
| User/role/unit admin | Dapat didelegasikan dengan explicit permission |
| Core system settings | Superadmin-only |
| Approver scope | Dapat mencakup beberapa Unit/Division |
| Form family | Activation = instalasi/provisioning; Change = maintenance |
| Numbering | Auto/manual dipilih per form |
| Draft | Editable, autosave + Save Draft, audited |
| Cancel | Hanya Draft sebelum Submit; permanent |
| Reviewer | Semua eligible Reviewer dapat melihat/action; non-exclusive |
| Reviewer contributors | Bisa lebih dari satu; viewer vs modifier dicatat |
| Revision | Unlimited cycles, full history |
| Reviewer return | Same reviewer context dipertahankan; reviewer lain tetap eligible |
| Approver | Semua eligible Approver dalam scope dapat melihat/action; non-exclusive |
| Final approval | Satu eligible Approver cukup |
| Approved By | Actor yang mengeksekusi final approval |
| Approver return to Requester | Setelah revision wajib Review lagi |
| Reject | Closed normal flow; Reopen via authorized permission |
| Reopen | Superadmin atau actor dengan `nscmf.reopen`; reason mandatory; target dipilih |
| Emergency | Tetap wajib Review + Approval |
| Attachment | Ada di UI, optional |
| Timeline | Semua legitimate viewer dapat melihat siapa melakukan apa |
| Audit | Detailed old/new + actor + timestamp + context |
| Delete | No hard delete |
| Archive | Superadmin atau actor dengan `nscmf.archive`; preserve history |
| Archived visibility | Mengikuti normal scope; Superadmin global |
| Export | View implies export |
| Impersonation | Tidak diperlukan |
| Notification | Draft/future; Telegram/WhatsApp candidate, not priority |

---

## 29. Remaining Open Decisions

Hal berikut sengaja belum ditebak:

- exact default Unit/Division template/mapping entries;
- automatic NSCMF numbering format dan uniqueness scope;
- exact mandatory fields dan conditional validation;
- single-vs-multi cardinality Service Impact;
- kapan `Result of Changes` wajib diisi;
- mandatory reason untuk Return, Reject, Cancel, Archive selain Reopen;
- exact valid Reopen destination transitions;
- unarchive behavior;
- audit retention period;
- apakah setiap export/download wajib dilog;
- attachment file type/size/count;
- notification provider/timing;
- final workflow state names.

---

## 30. Implementation Guardrails

Developer atau AI agent MUST NOT:

1. membuat self-registration;
2. menghapus/downgrade/disable protected Superadmin;
3. menambahkan hard-delete NSCMF;
4. menganggap Reviewer harus dipilih manual oleh Requester;
5. membuat Reviewer pertama menjadi exclusive owner;
6. menganggap assigned/modified-by hanya boleh satu Reviewer;
7. membuat Approver pertama yang membuka record menjadi exclusive owner;
8. mewajibkan approval dari seluruh eligible Approver;
9. menghasilkan lebih dari satu final approval pada workflow iteration yang sama;
10. membatasi Reopen hanya Superadmin jika actor lain memiliki explicit `nscmf.reopen` yang sah;
11. membatasi Archive hanya Superadmin jika actor lain memiliki explicit `nscmf.archive` yang sah;
12. mengizinkan Cancel setelah Submit;
13. membuat Cancelled dapat Reopen;
14. melewati Review setelah Approver Return ke Requester;
15. membuat Emergency bypass Review/Approval;
16. menghapus historical revision/review/approval;
17. membuat Change Purpose/Identified Problem sebagai dropdown berdasarkan asumsi;
18. mengklasifikasikan Upgrade hanya dari keyword;
19. membuat attachment mandatory tanpa rule baru;
20. mengarang format auto-number;
21. menjadikan Telegram/WhatsApp blocker MVP;
22. membuat user impersonation;
23. menganggap `spatie/laravel-permission` sudah final sebelum Tech Stack Specification.

---

## 31. Next Document

Dokumen berikutnya dalam urutan proyek setelah RBAC adalah:

**`05_State_Status_Flow.md`**

State Flow harus mengunci lifecycle authoritative untuk:

- Draft;
- Submit/Awaiting Review;
- Review;
- Return/Revision;
- Reviewed/Awaiting Approval;
- Approval;
- Rejected;
- Approved;
- Reopened;
- Cancelled;
- Archived treatment;
- valid Reopen destinations;
- terminal vs recoverable states;
- concurrency/state-check behavior ketika beberapa Reviewer/Approver eligible bertindak pada record yang sama.
