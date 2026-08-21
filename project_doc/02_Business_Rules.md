# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Draft — Synchronized through Tech Stack Specification  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan aturan bisnis yang wajib dipatuhi seluruh implementasi NSCMF Digital Form & Workflow System.

Aturan berlaku lintas UI, backend, database, API, automation, dan AI coding agent. Frontend tidak boleh menjadi satu-satunya enforcement layer; business rules mengenai permission, scope, state, editability, validation, dan workflow MUST divalidasi server-side.

Dokumen bekerja bersama:

- `03_User_Flow.md` — urutan interaksi user;
- `04_RBAC_Permission_Matrix.md` — siapa boleh melakukan apa;
- `05_State_Status_Flow.md` — authoritative state machine;
- `06_Validation_Rules.md` — validitas field/input/action;
- `07_UI_UX_Specification.md` — presentation dan interaction detail;
- `08_Tech_Stack_Specification.md` — technology implementation baseline.

Normative language:

- **MUST** — wajib;
- **MUST NOT** — dilarang;
- **MAY** — diperbolehkan;
- **SHOULD** — direkomendasikan;
- **TBD** — belum final dan tidak boleh ditebak implementation;
- **PROVISIONAL** — rule sementara yang berlaku untuk MVP sampai SOP resmi menggantikannya.

---

# PART A — INITIAL SETUP, ORGANIZATION, USERS, ROLES

## 2. Initial Setup Wizard

### BR-SETUP-001 — Wizard Required
Setelah protected Superadmin pertama login pada instalasi baru, aplikasi MUST menyediakan first-time Setup Wizard.

### BR-SETUP-002 — Role Setup Mode
Wizard MUST menyediakan:

1. `Use Role Template`
2. `Manual Role Configuration`

### BR-SETUP-003 — Minimum Default Roles
Template minimum:

- `Superadmin`
- `Requester`
- `Reviewer`
- `Approver`

Exact permission mengikuti RBAC.

### BR-SETUP-004 — Template Remains Configurable
Eligible role/permission MAY diubah setelah setup oleh actor yang memiliki permission administrasi, kecuali protected Superadmin invariants.

### BR-SETUP-005 — Unit/Division Setup Mode
Wizard MUST menyediakan predefined template/mapping atau manual configuration. Exact default entries masih TBD.

### BR-SETUP-006 — User Organizational Mapping
User MAY dipetakan ke Unit/Division sebagai dasar scope/visibility.

### BR-SETUP-007 — Multi-Unit Approver Scope
Approver MAY memiliki Approval Scope mencakup beberapa Unit/Division.

### BR-SETUP-008 — Core System Settings Protected
Initial/system-level settings seperti setup mode, global numbering configuration, dan notification integration settings hanya protected Superadmin. Ongoing role/user/unit administration MAY didelegasikan secara granular.

---

## 3. Protected Superadmin

### BR-SUPER-001
Initial seeding MUST membuat setidaknya satu protected Superadmin.

### BR-SUPER-002
Protected Superadmin adalah authority tertinggi pada standard role template dan memiliki global NSCMF visibility.

### BR-SUPER-003
Protected Superadmin MUST NOT dapat hard-delete, soft-delete, disable, kehilangan protected role, atau didowngrade.

### BR-SUPER-004
Protection berlaku melalui UI, API, import, bulk action, dan administrative flow lain.

### BR-SUPER-005
Protected identity tidak berarti plaintext credential/secret di source code.

---

## 4. User and Permission Administration

### BR-USER-001 — No Self-Registration
Normal user MUST NOT self-register.

### BR-USER-002 — Administrative Creation
Account dibuat melalui administrative flow oleh Superadmin atau actor dengan permission user-management.

### BR-USER-003 — Delegated Administration
Actor dengan permission yang tepat MAY mengelola eligible normal user, role assignment, Unit/Division, scope, credential reset, enable/disable, role/permission, dan organization configuration.

### BR-USER-004 — Multi-Role
Satu user MAY memiliki beberapa role.

### BR-USER-005 — No Mandatory Segregation of Duty
Current business decision tidak mewajibkan `Requester != Reviewer != Approver`. Actor yang memiliki permission/scope/state eligibility MAY berpartisipasi pada beberapa tahap record yang sama.

### BR-USER-006 — No Impersonation
User impersonation/login-as-user tidak termasuk scope.

### BR-USER-007 — Authorization Technology Boundary
`08_Tech_Stack_Specification.md` mengunci **Spatie Laravel Permission 8.x** sebagai role/permission primitive, dengan Laravel Policies/Gates dan custom ownership/Unit/Approval scope logic untuk authorization domain NSCMF.

Business authorization tetap mengikuti `04_RBAC_Permission_Matrix.md`; package MUST NOT mengganti semantics RBAC, scope, state, atau protected invariants.

---

# PART B — FORM FAMILY AND EXCEL BUSINESS MEANING

## 5. Main Form Families

### BR-FORM-001
Aplikasi MUST menyediakan `NSCMF - Activation` dan `NSCMF - Change`.

### BR-FORM-002 — Activation Context
Activation = instalasi/provisioning.

Subtype:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### BR-FORM-003 — Change Context
Change = maintenance/perubahan terhadap layanan/environment yang sudah berjalan.

Subtype:

- Maintenance;
- Upgrade;
- Emergency.

### BR-FORM-004 — Upgrade Is Contextual
Keyword `Upgrade` sendiri MUST NOT menentukan family.

- installation/provisioning → Activation;
- maintenance/existing-service change → Change.

Kasus ambigu harus dikonfirmasi business owner.

---

## 6. NSCMF Change Semantics

### BR-CHG-001
`(A) Purpose of Changes` adalah section, bukan selectable option.

### BR-CHG-002
`Facing Challenges (Upgrade / Emergency)` adalah input content, bukan pilihan Upgrade vs Emergency.

### BR-CHG-003
`Maintenance Purpose` adalah input content.

### BR-CHG-004
`Identified Problem (Please elaborate)` adalah field naratif.

### BR-CHG-005 — Service Impact
Source workbook menyediakan:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Confirmed treatment:

- Service Impact MUST bersifat **multi-select**;
- minimum satu selection wajib pada Submit/Resubmit;
- jika `Other` dipilih, Other Impact Description menjadi wajib;
- exact field validation mengikuti `06_Validation_Rules.md`.

### BR-CHG-006
`Maintenance (Improvement) Plan` dan `Target KPI` adalah paired input. Current validation mewajibkan minimum satu complete pair pada Submit/Resubmit.

### BR-CHG-007
Change MUST merepresentasikan Target date of execution, Monitoring period, Rollback scenario, dan Maintenance Announcement. Source workbook menunjukkan `1 week before`, `2 weeks before`, `2 days before (emergency)`.

### BR-CHG-008 — Result of Changes Is a Distinct Data Section
`(B) Result of Changes` adalah section data terpisah dengan Result summary, Performance information, dan Status.

### BR-CHG-009 — Result Does Not Create a New State
Current requirement MUST NOT menambahkan `EXECUTION_PENDING`, `RESULT_PENDING`, atau `COMPLETED` hanya karena Result of Changes ada.

### BR-CHG-010 — Result Before Final Approval
Applicable Result of Changes MUST selesai sebelum record dapat meninggalkan `PENDING_REVIEW` melalui `Forward to Approval`.

### BR-CHG-011 — Initial Submit Does Not Automatically Require Final Result
Keberadaan Result section tidak dengan sendirinya membuat seluruh Result wajib pada first Submit. First Submit MAY memiliki zero Result rows; row yang sudah mulai diisi harus internally complete sesuai Validation Rules.

### BR-CHG-012 — Narrow Result Capture During Review
Normal Requester editing locked setelah Submit, tetapi sistem MUST menyediakan narrow authorized mechanism untuk Result capture selama `PENDING_REVIEW` tanpa membuka seluruh form atau memaksa fake `Return for Revision`.

Confirmed default actor/permission:

```text
Requester/owner
+ nscmf.change.result.edit
+ own visible Change record
+ business_status = PENDING_REVIEW
```

Hanya field `Result of Changes` yang editable melalui capability ini. Planning/submitted fields lain tetap locked.

### BR-CHG-013 — Result Forward Gate
Sebelum Reviewer Forward, Change MUST memiliki minimal satu complete Result row. Source menyediakan maksimum lima rows; lima adalah capacity, bukan mandatory count.

---

# PART C — RECORD CREATION, NUMBERING, DRAFT, CANCELLATION, ATTACHMENT

## 7. Record Creation

### BR-REC-001
Setiap NSCMF MUST memiliki requester/owner context dan creator identity.

### BR-REC-002
Creation order: family → subtype → numbering mode → form fields.

### BR-REC-003
Setiap record menawarkan Automatic Number Generation atau Manual Number Entry.

### BR-REC-004 — Provisional Automatic Numbering
Sampai official company numbering SOP/sample diberikan, Automatic Number menggunakan PROVISIONAL current rule:

```text
NSCMF-YYYYMM-#####
```

Sequence global per calendar month, server-generated, globally unique, concurrency-safe, gap allowed, dan nomor yang pernah dialokasikan tidak digunakan ulang. Detail authoritative ada di `06_Validation_Rules.md`.

### BR-REC-005 — Manual Number
Manual number MUST mengikuti provisional character/length rule dan globally unique sesuai `06_Validation_Rules.md`.

### BR-REC-006 — Number Immutability
Request No MAY dikoreksi pada `DRAFT`, tetapi setelah first successful Submit MUST immutable melalui normal workflow. Revision/Reopen tidak menghasilkan nomor baru.

---

## 8. Draft and Autosave

### BR-DRAFT-001
New record memiliki business state `DRAFT`.

### BR-DRAFT-002
Requester MAY edit own eligible Draft.

### BR-DRAFT-003
Editable Draft MUST mendukung autosave dan manual `Save Draft`.

### BR-DRAFT-004
Persisted Draft changes MUST diaudit.

### BR-DRAFT-005
Draft MAY incomplete.

### BR-DRAFT-006
Draft persistence MUST NOT diblok hanya karena submission-required fields belum lengkap. Structural/safety/file validations tetap dapat berlaku sesuai `06_Validation_Rules.md`.

---

## 9. Cancellation

### BR-CAN-001
Requester MAY Cancel own record hanya dari `DRAFT` dan sebelum first Submit.

### BR-CAN-002
First Submit menghilangkan normal Cancel right.

### BR-CAN-003
Cancel menghasilkan `CANCELLED`, permanent terminal, MUST NOT Reopen.

### BR-CAN-004
Cancel bukan delete; record tetap History/audit.

### BR-CAN-005
Cancel MUST mencatat actor/timestamp/record. Cancel reason Optional; jika diisi mengikuti safe-text/max-length validation.

---

## 10. Attachments

### BR-ATT-001
Attachment input MUST tersedia secara visual.

### BR-ATT-002
Attachment optional pada current requirement.

### BR-ATT-003
Add/remove/replace attachment reference MUST diaudit.

### BR-ATT-004 — Current MVP Limits
Current MVP validation:

- maximum 10 files per NSCMF record;
- maximum 20 MB per file;
- zero-byte file rejected;
- allowed baseline: PDF, XLS/XLSX, DOC/DOCX, PNG, JPG/JPEG, TXT, CSV;
- executable/script/macro-enabled formats outside allowlist MUST be rejected.

Storage and malware scanning architecture remain downstream concerns.

### BR-ATT-005 — Upgrade/Emergency Reminder
Missing attachment on Change Upgrade/Emergency produces non-blocking Warning, not a blocking error.

---

# PART D — AUTHORITATIVE WORKFLOW SEMANTICS

## 11. Canonical States

Canonical business states dari `05_State_Status_Flow.md`:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

`SUBMITTED`, `UNDER_REVIEW`, `REVIEWED`, `REOPENED`, dan `ARCHIVED` bukan persistent business states pada current design.

---

## 12. Submit

### BR-SUB-001
Requester hanya MAY Submit jika submission validation terpenuhi.

### BR-SUB-002
Successful first Submit:

```text
DRAFT -> PENDING_REVIEW
```

### BR-SUB-003
Setelah Submit, general Requester editing locked sampai `REVISION_REQUIRED`, kecuali narrow Change Result capture melalui `nscmf.change.result.edit`.

### BR-SUB-004
Requester tidak memilih Reviewer tertentu. Semua matching Reviewer mendapatkan visibility.

---

## 13. Reviewer Visibility and Participation

### BR-REV-001
Semua Reviewer dengan required permission + matching Unit/Division scope MAY melihat `PENDING_REVIEW`.

### BR-REV-002
Reviewer access non-exclusive; first viewer tidak menjadi owner lock.

### BR-REV-003
Viewer activity MUST dapat dibedakan dari modifier/workflow action.

### BR-REV-004
Satu record MAY memiliki beberapa Reviewer contributor sepanjang lifecycle.

### BR-REV-005
Opening/viewing record MUST NOT mengubah business state.

### BR-REV-006 — Reviewer State Actions
Dari `PENDING_REVIEW`, eligible Reviewer MAY:

- Return for Revision → `REVISION_REQUIRED`;
- Reject → `REJECTED`;
- Forward to Approval → `PENDING_APPROVAL`.

### BR-REV-007
Emergency Change tetap wajib Review.

### BR-REV-008 — Change Result Gate
Untuk Change, Forward to Approval MUST gagal apabila Result-of-Changes validation belum terpenuhi.

### BR-REV-009 — Reviewer Reason Rules
Reviewer Return dan Reviewer Reject MUST memiliki mandatory reason. Reviewer Forward comment Optional.

---

# PART E — REVISION LOOP

## 14. Return for Revision

### BR-RET-001
Return kepada Requester menghasilkan `REVISION_REQUIRED` dan mengaktifkan Requester editing.

### BR-RET-002
Requester Resubmit selalu:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

### BR-RET-003
Revision cycles MAY repeat tanpa fixed maximum.

### BR-RET-004
Same Reviewer context SHOULD dipertahankan untuk continuity, tetapi Reviewer lain dalam scope tetap eligible.

### BR-RET-005
Setiap iteration dan field change MUST dipertahankan di history/audit.

### BR-RET-006
Transition `REVISION_REQUIRED -> PENDING_APPROVAL` MUST NOT tersedia. Revision oleh Requester selalu harus Review ulang.

---

# PART F — APPROVAL

## 15. Approver Scope and Actions

### BR-APR-001
Approver action membutuhkan permission + matching Approval Scope.

### BR-APR-002
Approval Scope MAY mencakup beberapa Unit/Division.

### BR-APR-003
`PENDING_APPROVAL` hanya dapat dicapai dari successful Reviewer Forward.

### BR-APR-004
Dari `PENDING_APPROVAL`, eligible Approver MAY:

- Return to Reviewer → `PENDING_REVIEW`;
- Return to Requester → `REVISION_REQUIRED`;
- Reject → `REJECTED`;
- Approve → `APPROVED`.

### BR-APR-005
Return to Requester → revision → Resubmit MUST kembali ke `PENDING_REVIEW`, bukan langsung Approval.

### BR-APR-006
Approval MUST diaudit.

### BR-APR-007
Approver pool non-exclusive; semua eligible Approver dapat melihat/action selama state valid.

### BR-APR-008
Satu final approval dari satu eligible Approver cukup membuat record `APPROVED`.

### BR-APR-009
`Approved By` adalah actor yang berhasil melakukan transition final `PENDING_APPROVAL -> APPROVED`.

### BR-APR-010
Setelah state menjadi `APPROVED`, stale Approver tidak dapat menghasilkan final approval kedua pada iteration yang sama.

### BR-APR-011 — Approver Reason Rules
Approver Return to Reviewer, Return to Requester, dan Reject MUST memiliki mandatory reason. Approve comment Optional.

---

# PART G — REJECT / REOPEN / REVERT

## 16. Rejection

### BR-REJ-001
Reject bukan delete; record tetap History.

### BR-REJ-002
Reviewer dapat Reject dari `PENDING_REVIEW`; Approver dapat Reject dari `PENDING_APPROVAL`.

### BR-REJ-003
`REJECTED` adalah closed normal-flow state; normal Requester edit/resubmit locked.

### BR-REJ-004
`REJECTED` MAY Reopen oleh protected Superadmin atau actor dengan explicit `nscmf.reopen`, valid visibility/scope.

### BR-REJ-005
Reject MUST memiliki mandatory reason sesuai Validation Rules.

---

## 17. Approved Reopen/Revert

### BR-REOPEN-001
`APPROVED` protected/read-only melalui normal workflow.

### BR-REOPEN-002
`APPROVED` MAY Reopen/Revert oleh protected Superadmin atau actor dengan explicit `nscmf.reopen`, matching visibility/scope.

### BR-REOPEN-003
Reopen dari `REJECTED` maupun `APPROVED` MUST memiliki mandatory reason.

### BR-REOPEN-004
Valid Reopen destinations hanya:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

### BR-REOPEN-005
Reopen MUST NOT menuju `DRAFT` atau `PENDING_APPROVAL`.

### BR-REOPEN-006
Reopen adalah action/event, bukan persistent `REOPENED` state.

### BR-REOPEN-007
Previous rejection/approval evidence MUST dipertahankan.

### BR-REOPEN-008
Archived `REJECTED`/`APPROVED` MUST di-Unarchive sebelum Reopen.

---

# PART H — VISIBILITY, HISTORY, EXPORT

## 18. Visibility

- Requester → own records;
- Reviewer → matching Unit/Division scope;
- Approver → matching Approval Scope;
- Superadmin → global;
- multi-role → additive union sesuai permission/scope.

## 19. Timeline

Semua legitimate record viewer MUST dapat melihat timeline siapa melakukan apa. Timeline read access tidak memberi audit mutation permission.

## 20. Export

### BR-EXP-001
View implies export eligibility.

### BR-EXP-002
No view means no export.

### BR-EXP-003
Bulk export MUST check setiap selected record.

### BR-EXP-004
Export tidak mengubah business state.

### BR-EXP-005 — Exact Template Fidelity
Official NSCMF XLSX template adalah visual/export source of truth.

Generated XLSX dan generated PDF MUST mempertahankan template resmi secara exact: struktur/layout/formatting/control yang sudah ada tidak didesain ulang. Sistem hanya mengisi atau mengganti business fields dan native control states yang memang dipetakan untuk record tersebut.

PDF MUST berasal dari filled spreadsheet/template representation, bukan dari HTML/Vue/Blade redesign.

### BR-EXP-006 — Template Preservation
Export implementation MUST preserve template features yang tidak sedang diisi, termasuk formatting, merged cells, row/column dimensions, drawing/media, print settings, dan native Form Controls.

Native checkbox/control MUST NOT diganti dengan text symbol/image hanya karena lebih mudah secara teknis.

### BR-EXP-007 — Renderer Fidelity Gate
Concrete PDF renderer hanya boleh digunakan production jika lulus approved golden fidelity test terhadap official XLSX/template output. Perbedaan visual yang tidak diizinkan MUST diperlakukan sebagai export failure/renderer qualification failure, bukan alasan untuk menurunkan business requirement.

### BR-EXP-008
Additional export format/bulk packaging selain current XLSX/PDF behavior remain downstream decisions.

---

# PART I — AUDIT AND TRACEABILITY

## 21. Detailed Audit

### BR-AUD-001
Setiap persisted business change MUST logged, termasuk Draft dan authorized result capture.

### BR-AUD-002
Minimum field audit dapat merepresentasikan record, actor, timestamp, field/data element, old/new value, event context.

### BR-AUD-003
Minimal workflow/lifecycle events:

- create;
- autosave/save persistence;
- cancel;
- submit/resubmit;
- viewer activity yang diwajibkan;
- reviewer actions;
- return;
- reject;
- approve;
- reopen/revert;
- archive;
- unarchive;
- numbering change;
- attachment mutation;
- relevant administrative changes.

### BR-AUD-004
Viewer dan modifier/workflow actor MUST distinguishable.

### BR-AUD-005
Historical revisions/rejections/approvals/viewers MUST never overwrite.

### BR-AUD-006
Normal user MUST NOT edit historical audit.

### BR-AUD-007
Mandatory logging setiap export/download masih TBD.

---

# PART J — ARCHIVE / UNARCHIVE / DATA PRESERVATION

## 22. No Hard Delete

### BR-DEL-001
NSCMF MUST NOT memiliki hard-delete capability, termasuk Superadmin.

### BR-DEL-002
Archive menggantikan delete untuk mengeluarkan terminal/protected record dari default active view.

### BR-DEL-003
Archive membutuhkan protected Superadmin atau explicit `nscmf.archive` + valid visibility + state eligibility.

### BR-DEL-004
Archive MUST NOT rewrite business status.

### BR-DEL-005
Archive preserves record, business status, workflow history, audit, sign-off history, dan attachment references sesuai policy final.

### BR-DEL-006 — Archive Eligible States
Archive hanya valid untuk:

```text
APPROVED
REJECTED
CANCELLED
```

Active states `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL` MUST NOT di-Archive.

### BR-DEL-007
Archived record tidak tampil pada default active list dan tetap mengikuti normal visibility scope.

### BR-DEL-008 — Unarchive Allowed
Unarchive diperbolehkan oleh actor dengan `nscmf.archive` + valid visibility.

Unarchive:

```text
business_status = unchanged
is_archived = false
```

### BR-DEL-009
Archive/Unarchive MUST diaudit.

### BR-DEL-010
Archived record MUST NOT menjalankan normal business workflow-changing action sampai Unarchive.

### BR-DEL-011 — Lifecycle Reasons
Archive dan Unarchive MUST memiliki mandatory reason, minimum/maximum mengikuti `06_Validation_Rules.md`.

---

# PART K — NOTIFICATIONS

## 23. Notification Capability

Future hooks MAY ada untuk Submit, Return, Reject, Forward, Approve, Reopen. Telegram dan WhatsApp/Baileys adalah candidate only. Notification MUST NOT menjadi blocker core MVP.

---

# PART L — SYSTEM ENFORCEMENT / CONCURRENCY

## 24. Server-Side Enforcement

### BR-INT-001
Role, permission, scope, ownership, archive flag, current state, destination, dan validation MUST dicek server-side.

### BR-INT-002
Direct URL, manipulated ID, payload, API, atau bulk request MUST NOT bypass rules.

### BR-INT-003
Failed action MUST NOT meninggalkan partial business state.

### BR-INT-004 — Stale Action Revalidation
Karena Reviewer/Approver non-exclusive, backend MUST revalidate current state sebelum workflow-changing action dipersist.

Jika actor lain sudah mengubah state, stale conflicting action MUST ditolak.

### BR-INT-005 — Atomic Business Action
Conceptually, permission/scope/state/validation check + state update + audit evidence MUST terjadi sebagai satu consistent business action. Technical locking/transaction strategy ditentukan downstream.

---

## 25. Mandatory High-Level State Machine

```text
DRAFT
  |-- Cancel --> CANCELLED
  +-- Submit --> PENDING_REVIEW
                   |-- Return --> REVISION_REQUIRED -- Resubmit --> PENDING_REVIEW
                   |-- Reject --> REJECTED
                   +-- Forward --> PENDING_APPROVAL
                                    |-- Return Reviewer --> PENDING_REVIEW
                                    |-- Return Requester -> REVISION_REQUIRED
                                    |-- Reject -----------> REJECTED
                                    +-- Approve ----------> APPROVED
```

Reopen:

```text
REJECTED / APPROVED
  -> REVISION_REQUIRED or PENDING_REVIEW only
```

Archive:

```text
business_status unchanged
is_archived = true/false
```

Emergency follows the same Review + Approval sequence.

---

## 26. Confirmed Decisions Summary

| Area | Confirmed Decision |
|---|---|
| Initial setup | Wizard |
| Roles | Template/manual; ongoing delegated admin allowed except protected settings |
| Multi-role | Allowed |
| Form family | Activation = provisioning; Change = maintenance/existing environment |
| Numbering | Auto/manual per form; provisional current format defined in Validation Rules |
| Canonical states | `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` |
| Submitted/Reviewed/Reopened/Archived | Events/treatment, not persistent business states |
| Draft | Editable, autosave + Save Draft, audited, may be incomplete |
| Cancel | Draft-only, permanent; reason optional |
| Reviewer | Shared/non-exclusive, multiple contributors |
| Revision | Unlimited; Resubmit always Review |
| Approver | Shared/non-exclusive; one final Approver sufficient |
| Reopen | `REJECTED`/`APPROVED` only; reason mandatory; destination Review or Revision only |
| Emergency | No bypass |
| Change Service Impact | Multi-select; Other requires description |
| Change Result | Requester/owner narrow edit in `PENDING_REVIEW`; minimum one complete Result row before Forward; no extra state |
| Attachment | Optional; 10 files max, 20 MB/file, current allowlist |
| Return/Reject | Mandatory reason |
| Archive/Unarchive | Independent flag; mandatory reason; only Approved/Rejected/Cancelled archive-eligible |
| Timeline | Legitimate viewer can see activity |
| Audit | Detailed old/new + actor + timestamp + context |
| Export | View implies export; XLSX/PDF must preserve official XLSX template exactly |
| Concurrency | Server rechecks current state; stale actions rejected |
| Impersonation | Not required |
| Notification | Future, not priority |

---

## 27. Remaining Open Decisions

Intentionally deferred:

- exact Unit/Division template entries;
- official NSCMF numbering SOP/sample that may replace/confirm provisional rules;
- audit retention/export audit;
- notification provider/timing;
- additional export format/bulk packaging;
- technical transaction/version/locking strategy;
- malware scanning/storage implementation;
- e-signature technology if later required;
- performance/availability/retention targets.

Concrete PDF renderer is technology qualification-gated by `08`; **exact template fidelity itself is not TBD**.

Resolved Validation Rules MUST NOT be treated as TBD unless an explicit requirement change occurs.

---

## 28. Implementation Guardrails

Developer/AI agent MUST NOT:

1. membuat self-registration;
2. menghapus/downgrade/disable protected Superadmin;
3. menambahkan NSCMF hard-delete;
4. memilih Reviewer secara manual/exclusive;
5. membuat first Reviewer/Approver viewer menjadi exclusive owner;
6. membatasi Reviewer contributor menjadi satu;
7. mewajibkan approval seluruh eligible Approver;
8. membuat lebih dari satu final approval pada iteration yang sama;
9. membatasi Reopen hanya Superadmin jika delegated `nscmf.reopen` valid;
10. membatasi Archive hanya Superadmin jika delegated `nscmf.archive` valid;
11. mengizinkan Cancel setelah first Submit;
12. membuat Cancelled Reopen;
13. mengizinkan revision Resubmit langsung ke Approval;
14. membuat Emergency bypass Review/Approval;
15. menghapus historical cycle;
16. membuat Change Purpose/Identified Problem sebagai selector tanpa rule;
17. klasifikasi Upgrade hanya dari keyword;
18. membuat attachment mandatory;
19. mempresentasikan provisional numbering sebagai official company SOP;
20. menjadikan Telegram/WhatsApp blocker;
21. menambahkan impersonation;
22. mengubah authorization semantics hanya karena package implementation;
23. membuat `SUBMITTED`, `UNDER_REVIEW`, `REVIEWED`, `REOPENED`, atau `ARCHIVED` sebagai persistent state;
24. mengizinkan Reopen ke `DRAFT` atau `PENDING_APPROVAL`;
25. Archive active-work states;
26. menjalankan Reopen pada archived record tanpa Unarchive;
27. membuat state execution/result tambahan hanya untuk Change Result;
28. membuat Service Impact single-select;
29. membuka seluruh form pada `PENDING_REVIEW` hanya untuk Result capture;
30. menghilangkan mandatory reason pada Return/Reject/Reopen/Archive/Unarchive;
31. mewajibkan seluruh lima Result rows;
32. membuat PDF dari desain HTML yang berbeda dari official XLSX template;
33. mengganti native template checkbox/control dengan symbol/image demi kemudahan export;
34. menerima PDF yang berbeda dari approved template representation hanya karena renderer yang dipilih tidak mampu mempertahankan fidelity.

---

## 29. Current Documentation Status

`05_State_Status_Flow.md` tetap lifecycle source of truth authoritative. `06_Validation_Rules.md` mengunci validation. `07_UI_UX_Specification.md` mengunci presentation/interaction. `08_Tech_Stack_Specification.md` mengunci technology baseline termasuk exact-template export implementation direction.

Dokumen proyek berikutnya:

**`09_System_Architecture.md`** — menerjemahkan seluruh requirement dan stack menjadi component/topology architecture tanpa mengubah business rules.