# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Draft — Synchronized with confirmed User Flow decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan aturan bisnis yang wajib dipatuhi oleh seluruh implementasi NSCMF Digital Form & Workflow System.

Aturan di sini bersifat lintas UI, backend, database, API, automation, dan AI coding agent. Frontend tidak boleh menjadi satu-satunya lapisan enforcement; business rules yang membatasi akses, state, editability, dan workflow tetap harus divalidasi server-side.

Dokumen ini belum menggantikan:

- `03_User_Flow.md` — urutan interaksi user;
- `04_RBAC_Permission_Matrix.md` — permission detail;
- `05_State_Status_Flow.md` — state machine authoritative;
- `06_Validation_Rules.md` — validitas field dan input;
- dokumen teknis berikutnya — cara implementasi.

### Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **TBD** — belum final dan tidak boleh ditebak oleh implementasi.

---

# PART A — INITIAL SETUP, ORGANIZATION, AND USERS

## 2. Initial Setup Wizard

### BR-SETUP-001 — First-Time Setup Uses a Wizard

Setelah protected Superadmin pertama berhasil login pada instalasi baru, aplikasi MUST menyediakan first-time setup berbentuk wizard, bukan mengharuskan seluruh konfigurasi dilakukan satu per satu tanpa panduan.

### BR-SETUP-002 — Role Setup Mode

Wizard MUST menyediakan dua opsi:

1. **Use Role Template**
2. **Manual Role Configuration**

### BR-SETUP-003 — Default Role Template

Template minimum MUST memiliki konsep role:

- `Superadmin`
- `Requester`
- `Reviewer`
- `Approver`

Exact permissions akan menjadi authoritative pada `04_RBAC_Permission_Matrix.md`.

### BR-SETUP-004 — Template Roles Remain Configurable

Role/permission hasil template MAY dimodifikasi oleh authorized administrator setelah initial setup, kecuali protected Superadmin invariants.

### BR-SETUP-005 — Unit / Division Setup Mode

Wizard MUST menyediakan konfigurasi Unit/Division dengan dua pendekatan:

1. memilih predefined template/mapping;
2. membuat Unit/Division secara manual.

Exact default template entries akan ditentukan kemudian dan MUST NOT ditebak oleh implementation agent.

### BR-SETUP-006 — User Organizational Mapping

User MAY dipetakan ke Unit/Division yang relevan. Mapping ini menjadi salah satu dasar visibility Reviewer dan scope lain yang ditentukan pada RBAC.

### BR-SETUP-007 — Approver May Cover Multiple Units

Satu Approver MAY memiliki approval scope untuk lebih dari satu Unit/Division sekaligus.

### BR-SETUP-008 — Setup Completion Does Not Lock Configuration Permanently

Setelah wizard selesai, authorized administrator MAY mengelola konfigurasi role, permission, Unit/Division, mapping, dan scope melalui area administration/settings sesuai RBAC.

---

## 3. Protected Superadmin

### BR-SUPER-001 — Seeded Protected Account

Initial seeding MUST membuat setidaknya satu protected Superadmin account.

### BR-SUPER-002 — Highest Authority

Protected Superadmin adalah role tertinggi pada standard system hierarchy.

### BR-SUPER-003 — Cannot Be Deleted or Disabled

Protected Superadmin MUST NOT dapat:

- hard delete;
- soft delete;
- disable;
- kehilangan protected Superadmin role;
- didowngrade menjadi role yang lebih rendah.

### BR-SUPER-004 — Protection Applies to All Interfaces

Proteksi MUST berlaku melalui UI, API, import, bulk action, maupun administrative flow lain.

### BR-SUPER-005 — Global NSCMF Visibility

Protected Superadmin MUST dapat melihat seluruh NSCMF.

### BR-SUPER-006 — Protected Identity Does Not Mean Plaintext Credential

Istilah seeded/hardcoded pada requirement berarti identity/role dilindungi pada level aplikasi. Password atau secret MUST NOT disimpan sebagai plaintext di source code.

---

## 4. User Administration

### BR-USER-001 — No Self-Registration

User biasa MUST NOT dapat self-register.

### BR-USER-002 — Superadmin Creates Users

User account dibuat melalui administrative flow oleh Superadmin atau role yang nantinya diberi permission user-management.

### BR-USER-003 — User Management Capabilities

Authorized administrator MAY:

- membuat user;
- edit profile user;
- assign/remove role;
- assign/move Unit/Division;
- configure allowed scope;
- reset credential/password melalui mechanism yang ditentukan kemudian;
- enable/disable normal user account.

Protected Superadmin tetap tunduk pada proteksi Part A.

### BR-USER-004 — Multiple Roles Allowed

Satu user MAY memiliki lebih dari satu role sekaligus.

### BR-USER-005 — No Mandatory Segregation of Duty Yet

Current business decision tidak mewajibkan `Requester != Reviewer != Approver`.

User yang memiliki permission dan scope sesuai MAY berpartisipasi pada beberapa tahap record yang sama.

Jika organisasi ingin segregation of duty di kemudian hari, itu harus menjadi business-rule change eksplisit.

### BR-USER-006 — Permission Implementation Package Is Deferred

Package seperti `spatie/laravel-permission` adalah kandidat implementasi yang sesuai, tetapi bukan business invariant. Keputusan final package berada di `08_Tech_Stack_Specification.md`.

---

# PART B — FORM FAMILY AND EXCEL BUSINESS MEANING

## 5. Main Form Families

### BR-FORM-001 — Two Main Form Families

Aplikasi MUST menyediakan:

1. `NSCMF - Activation`
2. `NSCMF - Change`

### BR-FORM-002 — Activation Context

Activation digunakan untuk konteks **instalasi / provisioning** sesuai proses bisnis yang dikonfirmasi.

Subtype pada source workbook:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### BR-FORM-003 — Change Context

Change digunakan untuk konteks **maintenance / perubahan terhadap layanan atau environment yang sudah berjalan**.

Subtype pada source workbook:

- Maintenance;
- Upgrade;
- Emergency.

### BR-FORM-004 — Upgrade Is Contextual

Karena `Upgrade` muncul di kedua form family, sistem MUST NOT menentukan form hanya dari keyword `Upgrade`.

- upgrade dalam konteks instalasi/provisioning → Activation;
- upgrade dalam konteks maintenance/perubahan existing service/environment → Change.

Kasus abu-abu harus dikonfirmasi ke business owner dan tidak boleh diklasifikasikan otomatis berdasarkan tebakan.

---

## 6. NSCMF Change Field Semantics from Workbook

Source workbook telah dibaca ulang dan rule berikut menjaga agar implementasi tidak salah mengubah field menjadi pilihan yang tidak ada.

### BR-CHG-001 — Purpose of Changes Is a Section, Not a Choice

`(A) Purpose of Changes` adalah section form.

### BR-CHG-002 — Facing Challenges Is Input Content

`Facing Challenges (Upgrade / Emergency)` merupakan field/area input untuk menjelaskan kondisi/challenge. Label tersebut MUST NOT diperlakukan sebagai daftar pilihan `Upgrade` vs `Emergency`.

### BR-CHG-003 — Maintenance Purpose Is Input Content

`Maintenance Purpose` merupakan area input, bukan option selector.

### BR-CHG-004 — Identified Problem Is Input Content

`Identified Problem (Please elaborate)` merupakan field/area input naratif, bukan option selector.

### BR-CHG-005 — Service Impact Provides Selectable Values

`Service Impact` MUST menyediakan pilihan yang merepresentasikan source workbook:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Apakah pilihan tersebut single-select atau multi-select akan difinalisasi pada Validation/UI specification berdasarkan business confirmation dan behavior checkbox sumber.

### BR-CHG-006 — Improvement Plan and KPI Are Data Inputs

`Maintenance (Improvement) Plan` dan `Target KPI` adalah input data yang saling berkaitan secara konteks.

### BR-CHG-007 — Execution Information Must Be Representable

Change form MUST dapat merepresentasikan:

- Target date of execution;
- Monitoring period;
- Rollback scenario;
- Maintenance Announcement.

Source workbook juga menampilkan opsi announcement timing `1 week before`, `2 weeks before`, dan `2 days before (emergency)`. Exact validation/cardinality akan difinalisasi kemudian.

### BR-CHG-008 — Result of Changes Is a Distinct Section

`(B) Result of Changes (Activation/Deactivation/Optimization)` adalah section terpisah dengan konsep:

- Result summary;
- Performance information;
- Status.

Pada tahap workflow kapan section ini wajib diisi masih TBD dan akan diputuskan pada Validation Rules/User Flow refinement tanpa menebak proses operasional yang belum dikonfirmasi.

---

# PART C — RECORD CREATION, NUMBERING, DRAFT, AND ATTACHMENTS

## 7. Record Creation

### BR-REC-001 — Requester Ownership

Setiap NSCMF MUST memiliki requester/owner context dan creator identity.

### BR-REC-002 — Form Selection Order

Saat membuat record, user memilih:

1. form family: Activation atau Change;
2. subtype yang tersedia pada family tersebut;
3. numbering mode;
4. kemudian mengisi form.

### BR-REC-003 — Numbering Mode Is Chosen Per Form

Setiap pembuatan NSCMF baru MUST memberikan pilihan:

- **Automatic Number Generation**;
- **Manual Number Entry**.

Pilihan ini bukan global setting yang mengikat seluruh record.

### BR-REC-004 — Automatic Format Is TBD

Format nomor otomatis belum ditentukan dan MUST NOT dibuat berdasarkan asumsi.

### BR-REC-005 — Manual Number Requires Validation

Manual number harus divalidasi berdasarkan format/uniqueness final pada `06_Validation_Rules.md`.

---

## 8. Draft and Autosave

### BR-DRAFT-001 — Draft Is an Official Phase

Aplikasi MUST mendukung Draft.

### BR-DRAFT-002 — Draft Is Editable

Requester MAY mengedit own Draft secara bebas selama masih memiliki akses.

### BR-DRAFT-003 — Autosave Is Required UX Behavior

Editable Draft MUST mendukung autosave sehingga perubahan dapat dipersist tanpa hanya bergantung pada tombol manual.

### BR-DRAFT-004 — Manual Save Draft Still Exists

Walaupun autosave tersedia, UI MUST tetap menyediakan action `Save Draft` untuk memberi user kontrol eksplisit.

### BR-DRAFT-005 — Persisted Draft Changes Are Audited

Setiap perubahan Draft yang berhasil dipersist, baik melalui autosave maupun Save Draft, MUST tercatat pada audit log.

### BR-DRAFT-006 — Draft May Be Incomplete

Draft MAY disimpan dalam kondisi belum memenuhi submission validation.

---

## 9. Cancellation

### BR-CAN-001 — Cancellation Is Draft-Only

Requester MAY Cancel own NSCMF **hanya selama record masih Draft dan belum pernah di-Submit untuk Review**.

### BR-CAN-002 — Submit Removes Normal Cancel Right

Setelah Submit pertama berhasil, requester MUST NOT membatalkan request melalui normal Cancel action.

### BR-CAN-003 — Cancelled Is Permanent

Cancelled record adalah terminal untuk business flow normal dan MUST NOT dapat di-reopen.

Jika kebutuhan bisnis masih ada, requester harus membuat NSCMF baru.

### BR-CAN-004 — Cancel Is Not Delete

Cancelled record tetap disimpan untuk history dan audit.

### BR-CAN-005 — Cancel Event Is Logged

Cancel MUST mencatat actor, timestamp, dan record reference. Mandatory reason masih TBD.

---

## 10. Attachments

### BR-ATT-001 — Attachment Input Exists

Form MUST menyediakan attachment input secara visual.

### BR-ATT-002 — Attachment Is Optional

Attachment bersifat optional pada current requirement, termasuk walaupun source Change workbook memiliki catatan meminta documentation untuk upgrade/emergency.

Business decision aplikasi saat ini adalah attachment tidak otomatis menjadi mandatory.

### BR-ATT-003 — Attachment Mutations Are Audited

Add/remove/replace attachment reference MUST tercatat pada audit history.

### BR-ATT-004 — Attachment Security Constraints Are Deferred

Allowed type, size, count, scanning, dan storage ditentukan pada Validation/Security/Architecture.

---

# PART D — SUBMISSION AND REVIEW

## 11. Submit

### BR-SUB-001 — Submit Requires Submission Validation

Requester hanya MAY Submit jika validation wajib untuk submission terpenuhi.

### BR-SUB-002 — Submit Locks Requester Editing

Setelah Submit, requester tidak dapat mengedit record sampai workflow mengembalikannya untuk revision.

### BR-SUB-003 — Submit Creates Review Visibility

Setelah Submit, record menjadi tersedia bagi Reviewer yang memiliki Unit/Division scope yang sesuai.

### BR-SUB-004 — No Manual Reviewer Selection Required

Requester tidak perlu memilih satu Reviewer tertentu ketika Submit.

---

## 12. Reviewer Visibility and Participation

### BR-REV-001 — All Eligible Reviewers Can See

Semua Reviewer dengan Unit/Division scope yang sesuai MAY melihat submitted record.

### BR-REV-002 — Review Is Non-Exclusive

Record tidak dikunci secara eksklusif kepada satu Reviewer hanya karena Reviewer pertama membuka atau melakukan action.

Reviewer lain yang masih memiliki scope tetap dapat melihat dan, sesuai state/permission, melakukan review action.

### BR-REV-003 — Viewer Logging

Ketika Reviewer membuka/melihat record, view event MUST dapat dicatat sebagai viewer activity.

Exact retention dan UI presentation dapat difinalisasi pada Audit/UI specification, tetapi flow harus mendukung pencatatan viewer.

### BR-REV-004 — Action Actor Becomes Assigned/Modified Context

Reviewer yang melakukan perubahan/workflow action MUST tercatat sebagai actor dan dapat direpresentasikan sebagai assigned/current reviewer context dan/atau `modified by` sesuai data model final.

Assignment tersebut MUST NOT membuat reviewer lain kehilangan visibility atau action rights secara otomatis.

### BR-REV-005 — Multiple Reviewers Are Supported

Satu record MAY berinteraksi dengan lebih dari satu Reviewer sepanjang lifecycle-nya.

### BR-REV-006 — Reviewer Actions

Reviewer MAY:

- complete/forward review menuju Approval;
- Return for Revision ke Requester;
- Reject.

Semua action MUST tercatat.

### BR-REV-007 — Emergency Still Requires Review

Change/Emergency MUST tetap melalui Review.

---

# PART E — REVISION LOOP

## 13. Return for Revision

### BR-RET-001 — Return Unlocks Requester Editing

Jika record dikembalikan kepada Requester, requester MAY mengedit record kembali.

### BR-RET-002 — Revision Can Repeat Without Fixed Limit

Siklus berikut MAY berulang berkali-kali:

`Submit → Review → Return → Requester Edit → Resubmit → Review`

### BR-RET-003 — Resubmission Returns to Same Reviewer Context

Setelah revision yang berasal dari Reviewer, Resubmit SHOULD mengembalikan record ke reviewer context yang sama sebagai continuity/assigned reference.

Namun record MUST tetap visible bagi Reviewer lain dalam scope yang sama.

### BR-RET-004 — Another Eligible Reviewer May Continue

Reviewer lain yang memiliki scope MAY melanjutkan review, forward, atau return lagi jika current state dan permission mengizinkan.

### BR-RET-005 — Every Revision Is Logged

Old value, new value, actor, timestamp, resubmission, reviewer actions, dan iteration history MUST dipertahankan.

---

# PART F — APPROVAL

## 14. Approver Scope and Actions

### BR-APR-001 — Approver Uses Configured Scope

Approver hanya dapat bertindak pada record dalam configured approval scope.

### BR-APR-002 — One Approver May Cover Multiple Units

Approver MAY memiliki scope mencakup beberapa Unit/Division sekaligus.

### BR-APR-003 — Approval Requires Review

Record MUST melewati Review sebelum final Approval, termasuk Emergency.

### BR-APR-004 — Approver Actions

Approver MAY:

- Approve;
- Return to Reviewer;
- Return to Requester;
- Reject.

### BR-APR-005 — Return to Requester Must Pass Review Again

Jika Approver mengembalikan record ke Requester, flow setelah requester memperbaiki dan Resubmit MUST melewati Review lagi sebelum kembali ke Approval.

Aplikasi MUST NOT mengirim revision requester langsung kembali ke Approver tanpa review baru.

### BR-APR-006 — Approval Is Audited

Approval MUST mencatat actor, timestamp, record, dan relevant workflow context.

---

# PART G — REJECT AND REOPEN

## 15. Rejection

### BR-REJ-001 — Reject Is Not Delete

Rejected record tetap tersimpan pada History.

### BR-REJ-002 — Reviewer and Approver May Reject

Reviewer dan Approver MAY Reject sesuai scope/permission.

### BR-REJ-003 — Rejected Is Closed for Normal Workflow

Requester tidak dapat mengedit/resubmit Rejected record melalui normal flow.

### BR-REJ-004 — Rejected May Be Reopened by Authorized Authority

Rejected record MAY di-reopen oleh:

- protected highest role; atau
- role/user yang secara eksplisit memiliki permission `reopen rejected` sesuai RBAC final.

### BR-REJ-005 — Reopen Requires Reason

Reopen MUST meminta alasan dan mencatat actor, timestamp, previous state, destination, dan reason.

### BR-REJ-006 — Reopen Actor Selects Destination

Authorized actor yang melakukan reopen MUST memilih tujuan workflow yang valid saat reopen.

Allowed destination akan menjadi authoritative pada `05_State_Status_Flow.md`.

---

## 16. Approved Reopen / Revert

### BR-REOPEN-001 — Approved Is Protected

Approved record tidak dapat diedit melalui normal workflow.

### BR-REOPEN-002 — Approved Reopen Is Highest-Authority Action

Approved record hanya dapat di-reopen/revert oleh protected highest authority sesuai RBAC final; standard template menggunakan Superadmin.

### BR-REOPEN-003 — Reason Is Mandatory

Reopen Approved MUST memiliki alasan.

### BR-REOPEN-004 — Actor Chooses Valid Target

Actor yang melakukan reopen memilih target workflow yang valid pada saat reopen.

### BR-REOPEN-005 — Previous Approval Is Preserved

Reopen MUST NOT menghapus fakta bahwa record pernah Approved.

---

# PART H — VISIBILITY, HISTORY, EXPORT

## 17. Requester Visibility

### BR-VIS-001

Requester melihat own NSCMF.

Jika user memiliki role tambahan, visibility dari role lain bersifat additive sesuai scope.

## 18. Reviewer Visibility

### BR-VIS-002

Reviewer melihat submitted/relevant records berdasarkan Unit/Division scope.

Reviewer role sendiri tidak memberikan global access.

## 19. Approver Visibility

### BR-VIS-003

Approver melihat records berdasarkan configured approval scope, termasuk kemungkinan multiple Unit/Division.

## 20. Superadmin Visibility

### BR-VIS-004

Protected Superadmin dapat melihat seluruh NSCMF.

## 21. View Implies Export

### BR-EXP-001

Setiap user yang secara sah dapat melihat sebuah NSCMF MAY mengekspor record tersebut.

### BR-EXP-002

User MUST NOT mengekspor record yang tidak dapat dilihat.

### BR-EXP-003

Bulk export MUST menerapkan visibility check per record.

### BR-EXP-004

Export tidak mengubah business state atau data record.

---

# PART I — AUDIT, VIEW LOG, AND TRACEABILITY

## 22. Detailed Audit

### BR-AUD-001 — Every Persisted Business Change Is Logged

Setiap persisted change MUST tercatat secara detail, termasuk saat Draft.

### BR-AUD-002 — Minimum Field Change Audit

Audit perubahan field MUST dapat merepresentasikan:

- record identifier;
- actor;
- timestamp;
- field/data element;
- old value;
- new value;
- action/event context.

### BR-AUD-003 — Workflow Events Are Logged

Minimal event berikut MUST tercatat:

- create;
- autosave/save draft persistence;
- cancel;
- submit;
- record view oleh Reviewer/other actor ketika viewer logging berlaku;
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
- user/role/scope administrative changes yang relevan.

### BR-AUD-004 — Review Viewer vs Modifier Must Be Distinguishable

Audit/history MUST dapat membedakan Reviewer yang hanya melihat record dengan Reviewer yang melakukan action/perubahan.

### BR-AUD-005 — Historical Cycles Are Never Overwritten

Revision, previous rejection, previous approval, dan previous reviewer activity MUST dipertahankan sebagai historical fact.

### BR-AUD-006 — Audit Data Is Not User-Editable

Normal user MUST NOT mengubah historical audit entries.

### BR-AUD-007 — Export Audit Is Deferred

Apakah setiap export/download wajib menjadi audit event masih TBD dan akan diputuskan pada Security/Audit specification.

---

# PART J — ARCHIVE AND DATA PRESERVATION

## 23. No Hard Delete

### BR-DEL-001

NSCMF MUST NOT memiliki normal hard-delete capability.

Rule ini juga berlaku kepada Superadmin.

### BR-DEL-002 — Archive Replaces Delete

Jika record perlu dikeluarkan dari active operational view, gunakan Archive.

### BR-DEL-003 — Archive Is Highest-Authority Administrative Action

Archive hanya dapat dilakukan oleh Superadmin/highest role atau authority setara yang didefinisikan secara eksplisit pada RBAC.

### BR-DEL-004 — Archive Does Not Rewrite Business Status

Archive adalah administrative visibility/lifecycle treatment dan MUST NOT menghapus atau memalsukan business status terakhir record.

### BR-DEL-005 — Archive Preserves Everything Needed for History

Archive MUST mempertahankan record data, workflow history, audit, review/approval history, dan attachment references sesuai retention/security policy.

### BR-DEL-006 — Archived Is Removed from Default Active View

Archived record tidak tampil pada default active list, tetapi tetap harus dapat diakses melalui authorized archived/history view.

### BR-DEL-007 — Unarchive Is TBD

Apakah Archive dapat dibalik melalui Unarchive belum dikonfirmasi.

---

# PART K — NOTIFICATIONS

## 24. Notification Capability Is Drafted, Not Current Priority

### BR-NOTIF-001

Product MAY menyediakan notification hook untuk event seperti:

- Submit;
- Return for Revision;
- Reject;
- Forward to Approval;
- Approve;
- Reopen.

### BR-NOTIF-002

Notification belum menjadi execution priority dan MUST NOT menghambat core MVP workflow.

### BR-NOTIF-003

Telegram dan WhatsApp melalui Baileys adalah future integration candidates yang disampaikan saat requirement discussion, tetapi belum menjadi final technology commitment.

Provider, channel, retry, delivery semantics, dan security akan ditentukan di dokumen teknis yang sesuai.

---

# PART L — SYSTEM ENFORCEMENT INVARIANTS

## 25. Server-Side Enforcement

### BR-INT-001

Role, permission, scope, ownership, state, dan validation MUST divalidasi server-side.

### BR-INT-002

Direct URL, manipulated ID, modified frontend payload, direct API, atau bulk request MUST NOT dapat melewati business rules.

### BR-INT-003

Business action yang gagal MUST NOT terlihat sebagai sukses atau meninggalkan partial business state.

---

## 26. Mandatory High-Level Workflow

Core sequence:

`Draft → Submit → Review → Approval`

Dengan branches/actions yang dikonfirmasi:

- Cancel hanya dari Draft dan permanent;
- Return for Revision;
- repeated Revision + Resubmit;
- Reviewer Reject;
- Approver Return to Reviewer;
- Approver Return to Requester → wajib Review lagi;
- Approver Reject;
- Approved Reopen oleh highest authority dengan reason dan selected target;
- Rejected Reopen oleh authorized authority dengan reason dan selected target;
- Archive oleh highest authority;
- Emergency tetap mengikuti Review dan Approval.

Exact state names dan allowed transition matrix akan difinalisasi pada `05_State_Status_Flow.md`.

---

## 27. Confirmed Decisions Summary

| Area | Confirmed Decision |
|---|---|
| Initial setup | Wizard |
| Roles | Template atau manual; dapat diedit setelah setup |
| Unit/Division | Template/mapping atau manual |
| User roles | Multi-role allowed |
| Superadmin | Seeded, protected, cannot delete/disable/downgrade |
| Approver scope | Dapat mencakup beberapa unit |
| Form family | Activation = instalasi/provisioning; Change = maintenance |
| Numbering | Auto atau manual dipilih setiap membuat form |
| Draft | Editable, autosave + Save Draft, perubahan diaudit |
| Cancel | Hanya saat Draft sebelum Submit; permanent |
| Reviewer selection | Tidak dipilih requester; semua eligible reviewer dapat melihat/review |
| Reviewer view | Viewer activity dicatat |
| Reviewer action | Actor dicatat assigned/modified context, tidak exclusive lock |
| Multiple reviewer | Supported |
| Revision | Unlimited cycles, full log |
| Reviewer return | Resubmit kembali ke same reviewer context tetapi tetap visible reviewer lain |
| Approver return to requester | Setelah revision wajib Review lagi |
| Reject | Normal flow closed, dapat Reopen oleh authorized authority |
| Approved reopen | Highest authority, mandatory reason, actor memilih target |
| Emergency | Tetap wajib Review + Approval |
| Attachment | Ada di UI, optional |
| Audit | Detailed old/new value + actor + timestamp + event context |
| Delete | No hard delete; use Archive |
| Archive | Highest authority; hide from active view; preserve history |
| Export | View implies export |
| Notification | Draft/future; Telegram/WhatsApp candidate, not priority |

---

## 28. Remaining Open Decisions

Hal berikut sengaja belum ditebak:

- exact default Unit/Division template/mapping entries;
- exact automatic NSCMF numbering format dan uniqueness scope;
- exact mandatory fields dan conditional validation;
- single-vs-multi cardinality Service Impact;
- kapan `Result of Changes` pada Change wajib diisi;
- mandatory reason untuk Return, Reject, Cancel, dan Archive selain Reopen yang sudah mandatory;
- allowed target destinations untuk Reopen secara detail;
- unarchive behavior;
- audit retention period;
- apakah export/download wajib dilog;
- attachment file type/size/count;
- exact notification provider dan timing;
- final names untuk setiap workflow state.

---

## 29. Implementation Guardrails

Developer atau AI agent MUST NOT:

1. membuat self-registration;
2. menghapus atau downgrade protected Superadmin;
3. menambahkan hard-delete NSCMF;
4. menganggap reviewer harus dipilih manual oleh requester;
5. membuat reviewer pertama menjadi exclusive owner sehingga reviewer eligible lain tidak dapat melihat;
6. mengizinkan Cancel setelah Submit;
7. membuat Cancelled dapat Reopen;
8. melewati Review setelah Approver mengembalikan record ke Requester;
9. membuat Emergency bypass Review/Approval;
10. menghapus historical revision/review/approval saat state berubah;
11. membuat Change `Purpose of Changes` atau `Identified Problem` sebagai dropdown berdasarkan asumsi;
12. mengklasifikasikan Upgrade hanya dari keyword;
13. membuat attachment mandatory tanpa perubahan business rule;
14. mengarang format auto-number;
15. menjadikan Telegram/WhatsApp notification sebagai blocker MVP;
16. menganggap `spatie/laravel-permission` sudah final sebelum Tech Stack Specification.

---

## 30. Next Document

Dokumen berikutnya adalah:

**`03_User_Flow.md`**

User Flow harus menerjemahkan rules ini menjadi interaksi yang eksplisit untuk:

- first-time setup wizard;
- login/dashboard;
- user administration;
- create Activation/Change;
- auto/manual numbering;
- autosave + Save Draft;
- Draft Cancel;
- Submit;
- multi-reviewer visibility;
- viewer/action logging;
- Review/Return/Reject;
- repeated Revision/Resubmit;
- Approval/Return/Reject;
- Reopen dengan selected destination;
- History/Export;
- Archive;
- optional future notification hook.
