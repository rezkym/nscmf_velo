# State / Status Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-STATE-005  
> **Document Order:** 05 / 20  
> **Status:** Draft — Confirmed State Machine + Explicit Downstream TBDs  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk lifecycle/state NSCMF**.

Dokumen menjawab:

- business status apa saja yang valid;
- action apa yang dapat memindahkan record dari satu state ke state lain;
- actor/permission apa yang dibutuhkan;
- precondition setiap transition;
- kapan Requester dapat mengedit;
- state mana yang terminal, protected, atau recoverable;
- bagaimana revision loop bekerja;
- bagaimana Reopen/Revert bekerja;
- bagaimana Archive/Unarchive berinteraksi dengan business status;
- bagaimana concurrent Reviewer/Approver action ditangani secara konseptual;
- bagaimana `NSCMF - Change / Result of Changes` memengaruhi transition tanpa menambah workflow state baru.

Field-level validation tetap menjadi tanggung jawab `06_Validation_Rules.md`. UI labels/interaction detail berada di `07_UI_UX_Specification.md`. Database representation, locking/versioning, dan transaction mechanism akan ditentukan di dokumen teknis downstream.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **SHOULD** — direkomendasikan sebagai default behavior.
- **TBD** — belum final dan tidak boleh ditebak oleh implementation.

---

## 3. State Machine Design Principles

### STATE-PRINCIPLE-001 — Keep Business States Minimal

State hanya dibuat jika merepresentasikan kondisi bisnis yang benar-benar berbeda dan memengaruhi action/editability.

Sistem MUST NOT membuat state teknis tambahan hanya karena user membuka halaman, melihat record, atau melakukan aktivitas yang tidak memindahkan lifecycle.

### STATE-PRINCIPLE-002 — State Describes What the Record Is Waiting For

Untuk tahap aktif digunakan nama yang menunjukkan tahap saat ini:

- `PENDING_REVIEW`
- `PENDING_APPROVAL`

Bukan sekadar histori seperti `SUBMITTED` atau `REVIEWED`.

### STATE-PRINCIPLE-003 — View Is Not a State Transition

Reviewer/Approver membuka record hanya menghasilkan viewer activity/audit event. Membuka record MUST NOT mengubah business state.

### STATE-PRINCIPLE-004 — Non-Exclusive Pools Do Not Create Ownership States

Reviewer dan Approver bersifat shared/non-exclusive. Tidak ada state seperti:

- `ASSIGNED_TO_REVIEWER_A`;
- `UNDER_REVIEW_BY_A`;
- `ASSIGNED_TO_APPROVER_B`.

Assignment/contributor metadata, jika ada, adalah tracking context dan bukan exclusive state ownership.

### STATE-PRINCIPLE-005 — Reopen Is an Action, Not a Persistent State

`REOPENED` MUST NOT menjadi business status.

Reopen adalah audited transition event:

```text
APPROVED / REJECTED
  -- Reopen(reason, destination) -->
REVISION_REQUIRED / PENDING_REVIEW
```

### STATE-PRINCIPLE-006 — Archive Is Administrative Lifecycle, Not Business Status

Archive MUST direpresentasikan secara terpisah dari `business_status`.

Konsep:

```text
business_status = APPROVED
is_archived = true
```

Bukan:

```text
business_status = ARCHIVED
```

### STATE-PRINCIPLE-007 — State Is Server-Enforced

Frontend state bukan security boundary. Backend MUST melakukan revalidation current state sebelum setiap workflow-changing action dipersist.

---

# PART A — CANONICAL BUSINESS STATES

## 4. Canonical State Catalog

Canonical state identifiers:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

| State | Meaning | Requester Editability | Normal Outgoing Transition | Classification |
|---|---|---|---|---|
| `DRAFT` | Record sedang disiapkan dan belum pernah Submit | Editable | Submit, Cancel | Active |
| `PENDING_REVIEW` | Record menunggu/berada pada shared Reviewer pool | Normal form editing locked; narrow Change Result capture dapat mengikuti rule khusus | Return, Reject, Forward | Active |
| `REVISION_REQUIRED` | Record dikembalikan ke Requester untuk perbaikan | Editable | Resubmit | Active |
| `PENDING_APPROVAL` | Review selesai untuk iteration saat ini dan record berada pada shared Approver pool | Locked | Return to Reviewer, Return to Requester, Reject, Approve | Active |
| `REJECTED` | Record ditolak dan normal workflow berhenti | Locked | Authorized Reopen only | Recoverable terminal/protected |
| `APPROVED` | Record memperoleh final approval valid | Locked | Authorized Reopen/Revert only | Recoverable terminal/protected |
| `CANCELLED` | Draft dibatalkan sebelum first Submit | Locked | None | Permanent terminal |

Display label MAY menggunakan bentuk human-readable seperti `Pending Review`, tetapi canonical backend/business identifier harus tetap konsisten dengan specification ini.

---

## 5. Explicit Non-States

Konsep berikut **bukan** business state:

| Concept | Treatment |
|---|---|
| `SUBMITTED` | Audit/workflow event yang menghasilkan `PENDING_REVIEW` |
| `UNDER_REVIEW` | Tidak digunakan; membuka/mereview tidak membuat exclusive state |
| `REVIEWED` | Review completion event yang menghasilkan `PENDING_APPROVAL` |
| `REOPENED` | Audit transition event, bukan persistent state |
| `ARCHIVED` | Administrative flag/lifecycle treatment, bukan `business_status` |
| `UNARCHIVED` | Administrative event yang mengubah archive flag |
| `VIEWED` | Viewer activity/audit event |
| `SAVED` / `AUTOSAVED` | Persistence event, bukan state |

---

# PART B — MAIN STATE FLOW

## 6. Canonical Main Flow

```text
DRAFT
  |-- Cancel --------------------------------------> CANCELLED
  |
  +-- Submit --------------------------------------> PENDING_REVIEW
                                                        |
                                                        |-- Return to Requester
                                                        |        |
                                                        |        v
                                                        |  REVISION_REQUIRED
                                                        |        |
                                                        |        +-- Resubmit --> PENDING_REVIEW
                                                        |
                                                        |-- Reject -----------> REJECTED
                                                        |
                                                        +-- Forward ----------> PENDING_APPROVAL
                                                                                 |
                                                                                 |-- Return to Reviewer --> PENDING_REVIEW
                                                                                 |
                                                                                 |-- Return to Requester -> REVISION_REQUIRED
                                                                                 |
                                                                                 |-- Reject -------------> REJECTED
                                                                                 |
                                                                                 +-- Approve ------------> APPROVED
```

Recovery:

```text
REJECTED
  -- authorized Reopen(reason, destination) --> REVISION_REQUIRED
                                             or PENDING_REVIEW

APPROVED
  -- authorized Reopen/Revert(reason, destination) --> REVISION_REQUIRED
                                                    or PENDING_REVIEW

CANCELLED
  -- no reopen / no normal outgoing transition --> terminal
```

---

## 7. Why There Is No Separate SUBMITTED or UNDER_REVIEW State

Setelah Submit berhasil, record langsung menjadi:

```text
DRAFT -> PENDING_REVIEW
```

`SUBMITTED` tetap disimpan sebagai workflow event/timestamp.

Reviewer membuka record MUST NOT mengubah state menjadi `UNDER_REVIEW`, karena:

- Reviewer tidak exclusive;
- Reviewer A membuka record tidak boleh mengubah eligibility Reviewer B/C;
- view dan workflow state adalah dua konsep berbeda;
- state harus stabil hingga Reviewer melakukan state-changing action.

---

# PART C — STATE DEFINITIONS AND BEHAVIOR

## 8. `DRAFT`

### Entry

Record baru yang berhasil dibuat masuk ke `DRAFT`.

### Business Meaning

Record sedang disiapkan dan belum pernah Submit.

### Allowed Persistence Events

- autosave;
- Save Draft;
- attachment mutation sesuai permission;
- numbering/data changes sesuai validation.

Persistence event tersebut tidak mengubah state.

### Requester Editability

Requester dengan permission dan ownership yang valid MAY mengedit Draft secara bebas.

Draft MAY incomplete.

### Allowed State-Changing Actions

1. `Submit` -> `PENDING_REVIEW`
2. `Cancel` -> `CANCELLED`

### Forbidden

- Reviewer Forward/Reject/Return;
- Approver actions;
- Reopen;
- Archive.

Archive tidak tersedia pada `DRAFT` karena record masih merupakan active work.

---

## 9. `PENDING_REVIEW`

### Entry Sources

`PENDING_REVIEW` dapat berasal dari:

- `DRAFT` melalui first Submit;
- `REVISION_REQUIRED` melalui Resubmit;
- `PENDING_APPROVAL` melalui `Return to Reviewer`;
- `REJECTED` melalui authorized Reopen;
- `APPROVED` melalui authorized Reopen/Revert.

### Business Meaning

Record tersedia pada **shared Reviewer pool** sesuai Unit/Division scope.

### Reviewer Participation

Semua eligible Reviewer dengan permission + matching scope MAY:

- membuka record;
- melakukan review activity;
- menjalankan state-changing action yang valid.

Reviewer pertama yang membuka record tidak menjadi exclusive owner.

### State-Neutral Reviewer Events

Berikut tidak mengubah state:

- View;
- comment/note jika fitur tersebut nantinya tersedia dan tidak didefinisikan sebagai transition;
- reviewer contribution metadata;
- audit/viewer logging.

### Allowed State-Changing Actions

1. `Return for Revision` -> `REVISION_REQUIRED`
2. `Reject` -> `REJECTED`
3. `Forward to Approval` -> `PENDING_APPROVAL`

### Requester Editability

Normal Requester editing tetap locked setelah Submit.

**Exception khusus `NSCMF - Change / Result of Changes`:** state ini MAY menyediakan narrow field-edit capability untuk melengkapi `Result of Changes` oleh actor yang secara eksplisit authorized, tanpa memaksa fake `Return for Revision` dan tanpa mengubah state.

Exact actor/permission dan field-level editability untuk narrow exception ini MUST dikunci pada downstream RBAC/Validation/UI refinement. Source template tidak menentukan secara eksplisit siapa actor pengisi Result.

---

## 10. `REVISION_REQUIRED`

### Entry Sources

- Reviewer `Return for Revision` dari `PENDING_REVIEW`;
- Approver `Return to Requester` dari `PENDING_APPROVAL`;
- authorized Reopen dari `REJECTED`;
- authorized Reopen/Revert dari `APPROVED`.

### Business Meaning

Record dikembalikan untuk diperbaiki oleh Requester.

### Editability

Requester editing diaktifkan kembali untuk own record sesuai permission.

Autosave, Save Draft, attachment mutation, dan persisted field changes tetap diaudit.

### Allowed State-Changing Action

```text
REVISION_REQUIRED -- Resubmit --> PENDING_REVIEW
```

### Mandatory Re-Review Invariant

Tidak ada transition:

```text
REVISION_REQUIRED -> PENDING_APPROVAL
```

Setiap revision oleh Requester MUST melewati Review lagi.

### Revision Count

Tidak ada fixed maximum revision cycle.

---

## 11. `PENDING_APPROVAL`

### Entry

Hanya melalui successful Reviewer `Forward to Approval` dari `PENDING_REVIEW`.

Tidak ada direct Submit/Resubmit/Reopen ke `PENDING_APPROVAL`.

### Business Meaning

Current workflow iteration telah memenuhi review completion gate dan tersedia pada **shared Approver pool** sesuai Approval Scope.

### Approver Participation

Semua eligible Approver dengan permission + matching scope MAY melihat dan mengambil valid action.

Approver pertama yang membuka record tidak menjadi exclusive owner.

### Allowed State-Changing Actions

1. `Return to Reviewer` -> `PENDING_REVIEW`
2. `Return to Requester` -> `REVISION_REQUIRED`
3. `Reject` -> `REJECTED`
4. `Approve` -> `APPROVED`

### Final Approval Rule

Satu successful `Approve` dari satu eligible Approver cukup.

Setelah state berubah ke `APPROVED`, Approver lain tidak dapat memberikan approval kedua untuk iteration yang sama.

---

## 12. `REJECTED`

### Entry Sources

- Reviewer Reject dari `PENDING_REVIEW`;
- Approver Reject dari `PENDING_APPROVAL`.

### Business Meaning

Normal workflow berhenti dan Requester tidak dapat edit/resubmit melalui normal action.

### Editability

Locked.

### Recovery

`REJECTED` MAY di-Reopen hanya oleh actor yang memenuhi seluruh requirement:

```text
nscmf.reopen
+
valid record visibility/scope
+
record not archived
+
mandatory Reopen reason
+
valid selected destination
```

### Valid Reopen Destinations

Hanya:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

### Forbidden Reopen Destinations

MUST NOT ke:

```text
DRAFT
PENDING_APPROVAL
APPROVED
CANCELLED
REJECTED
```

### History

Previous rejection evidence MUST tetap berada di timeline.

---

## 13. `APPROVED`

### Entry

Hanya melalui successful final Approve dari `PENDING_APPROVAL`.

### Business Meaning

Record memperoleh final approval valid untuk current workflow iteration.

`Approved By` adalah actor yang berhasil mengeksekusi transition tersebut.

### Editability

Protected/read-only melalui normal workflow.

### Recovery / Revert

`APPROVED` MAY di-Reopen/Revert hanya jika:

```text
nscmf.reopen
+
valid record visibility/scope
+
record not archived
+
mandatory Reopen reason
+
valid selected destination
```

### Valid Destinations

Hanya:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

### Why Direct PENDING_APPROVAL Is Forbidden

Reopen tidak boleh langsung mengembalikan record ke Approval karena state machine harus mempertahankan Review sebagai mandatory gate.

### Previous Approval Preservation

Reopen MUST NOT menghapus:

- previous Approved event;
- previous approved_by actor;
- previous approval timestamp;
- prior workflow iteration evidence.

---

## 14. `CANCELLED`

### Entry

Hanya:

```text
DRAFT -- Cancel --> CANCELLED
```

### Preconditions

Record masih Draft dan belum pernah Submit.

### Business Meaning

Requester membatalkan request sebelum memasuki Review.

### Classification

`CANCELLED` adalah **permanent terminal state**.

### Forbidden

Cancelled record MUST NOT:

- Reopen;
- kembali Draft;
- Submit;
- masuk Review;
- masuk Approval;
- berubah menjadi Rejected/Approved melalui workflow.

Jika kebutuhan muncul kembali, user membuat NSCMF baru.

Cancelled tetap dapat di-Archive/Unarchive secara administratif sesuai Archive rules tanpa mengubah status `CANCELLED`.

---

# PART D — TRANSITION MATRIX

## 15. Authoritative Transition Matrix

| From State | Action | To State | Actor Context | Core Permission | Key Preconditions |
|---|---|---|---|---|---|
| `DRAFT` | Submit | `PENDING_REVIEW` | Requester/eligible creator | `nscmf.submit` | ownership/access + submission validation |
| `DRAFT` | Cancel | `CANCELLED` | Requester | `nscmf.cancel` | own Draft + never submitted |
| `PENDING_REVIEW` | Return for Revision | `REVISION_REQUIRED` | Eligible Reviewer | `nscmf.review.return` | matching Reviewer Scope + current state |
| `PENDING_REVIEW` | Reject | `REJECTED` | Eligible Reviewer | `nscmf.review.reject` | matching Reviewer Scope + current state |
| `PENDING_REVIEW` | Forward to Approval | `PENDING_APPROVAL` | Eligible Reviewer | `nscmf.review.forward` | matching scope + review/validation gate |
| `REVISION_REQUIRED` | Resubmit | `PENDING_REVIEW` | Requester | `nscmf.submit` | own record + revision validation |
| `PENDING_APPROVAL` | Return to Reviewer | `PENDING_REVIEW` | Eligible Approver | `nscmf.approval.return_reviewer` | matching Approval Scope + current state |
| `PENDING_APPROVAL` | Return to Requester | `REVISION_REQUIRED` | Eligible Approver | `nscmf.approval.return_requester` | matching Approval Scope + current state |
| `PENDING_APPROVAL` | Reject | `REJECTED` | Eligible Approver | `nscmf.approval.reject` | matching Approval Scope + current state |
| `PENDING_APPROVAL` | Approve | `APPROVED` | Eligible Approver | `nscmf.approve` | matching Approval Scope + review prerequisite + current state |
| `REJECTED` | Reopen | `REVISION_REQUIRED` | Authorized lifecycle actor | `nscmf.reopen` | visibility + not archived + mandatory reason |
| `REJECTED` | Reopen | `PENDING_REVIEW` | Authorized lifecycle actor | `nscmf.reopen` | visibility + not archived + mandatory reason |
| `APPROVED` | Reopen/Revert | `REVISION_REQUIRED` | Authorized lifecycle actor | `nscmf.reopen` | visibility + not archived + mandatory reason |
| `APPROVED` | Reopen/Revert | `PENDING_REVIEW` | Authorized lifecycle actor | `nscmf.reopen` | visibility + not archived + mandatory reason |

No other business-status transition is valid unless this document is explicitly revised.

---

## 16. State-Neutral Events

The following MAY occur without changing `business_status`, subject to permission/validation:

- View;
- autosave;
- Save Draft;
- field persistence in an editable state;
- narrow `Result of Changes` persistence in `PENDING_REVIEW` when authorized;
- attachment mutation in an editable/authorized context;
- audit/timeline read;
- Export;
- reviewer/approver view activity;
- Archive/Unarchive flag changes.

State-neutral does **not** mean audit-neutral. Persisted business changes/events must follow audit requirements.

---

# PART E — REVISION AND WORKFLOW ITERATION

## 17. Unlimited Revision Loop

Canonical loop:

```text
PENDING_REVIEW
  -> REVISION_REQUIRED
  -> PENDING_REVIEW
  -> REVISION_REQUIRED
  -> PENDING_REVIEW
  -> ...
```

No fixed maximum iteration.

Each iteration MUST preserve prior:

- Return event;
- actor;
- reason/comment when required;
- field changes;
- resubmit event;
- reviewer contributors;
- timestamps.

---

## 18. Approver Return to Requester

Confirmed mandatory sequence:

```text
PENDING_APPROVAL
  -- Return to Requester --> REVISION_REQUIRED
  -- Resubmit -----------> PENDING_REVIEW
  -- Reviewer Forward ---> PENDING_APPROVAL
```

Forbidden shortcut:

```text
PENDING_APPROVAL
  -> REVISION_REQUIRED
  -> PENDING_APPROVAL
```

---

## 19. Approver Return to Reviewer

Approver MAY return directly to Review without making Requester editable:

```text
PENDING_APPROVAL
  -- Return to Reviewer --> PENDING_REVIEW
```

Reviewer kemudian dapat Forward, Return to Requester, atau Reject sesuai current state.

---

## 20. Reviewer Continuity Is Metadata, Not State

Jika Reviewer A sebelumnya melakukan Return dan Requester Resubmit, system SHOULD mempertahankan Reviewer A sebagai continuity/current-reviewer context.

Namun record tetap berada pada shared `PENDING_REVIEW` pool dan Reviewer B/C dalam scope tetap eligible.

Continuity MUST NOT menciptakan state atau exclusive lock.

---

# PART F — REOPEN / REVERT

## 21. Reopen-Eligible States

Hanya:

```text
REJECTED
APPROVED
```

`CANCELLED` tidak Reopen-eligible.

Active states tidak membutuhkan Reopen karena masih memiliki normal transition.

---

## 22. Reopen Destination Rules

Valid destination untuk `REJECTED` dan `APPROVED` sama:

1. `REVISION_REQUIRED` — jika Requester perlu mengubah data;
2. `PENDING_REVIEW` — jika record perlu masuk/re-enter Review tanpa membuka general Requester revision first.

### Explicitly Forbidden

Reopen MUST NOT langsung menuju:

- `DRAFT`;
- `PENDING_APPROVAL`;
- `APPROVED`;
- `CANCELLED`.

Hal ini menjaga invariant bahwa record yang sudah pernah Submit tidak kembali menjadi pre-submission Draft dan tidak melewati Review gate.

---

## 23. Reopen Authorization

Reopen memerlukan:

```text
protected Superadmin
OR
explicit nscmf.reopen permission
```

Ditambah:

- valid record visibility/scope;
- current state Reopen-eligible;
- record tidak sedang archived;
- mandatory reason;
- selected valid destination;
- server-side current-state recheck.

`nscmf.reopen` tidak memberikan global visibility secara otomatis.

---

## 24. Reopen Audit Evidence

Setiap Reopen MUST mencatat minimum:

- actor;
- timestamp;
- source state;
- selected destination;
- mandatory reason;
- previous rejection/approval reference/context;
- resulting state.

Reopen MUST NOT overwrite previous history.

---

# PART G — ARCHIVE / UNARCHIVE

## 25. Archive Is Independent From Business Status

Conceptual model:

```text
business_status = <canonical state>
is_archived = false | true
```

Archive does not replace `business_status`.

---

## 26. Archive-Eligible Business States

Archive hanya valid jika business status adalah:

```text
APPROVED
REJECTED
CANCELLED
```

Archive MUST NOT dilakukan pada:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
```

Rationale: active work tidak boleh menghilang dari operational queue melalui Archive.

---

## 27. Archive Action

Preconditions:

```text
nscmf.archive
+
valid record visibility
+
business_status in {APPROVED, REJECTED, CANCELLED}
+
is_archived = false
```

Result:

```text
business_status = unchanged
is_archived = true
```

Archive event MUST diaudit.

Archived record keluar dari default active view tetapi tetap tersedia melalui authorized History/Archived view.

---

## 28. Archived Record Behavior

Archived record:

- tetap mempertahankan full business status/history;
- tetap mengikuti visibility scope normal;
- tetap dapat dilihat timeline-nya oleh legitimate viewer;
- tetap dapat di-export jika user sah melihat record;
- MUST NOT menerima normal business workflow-changing action selama masih archived;
- hanya lifecycle action `Unarchive` yang dapat mengaktifkannya kembali.

Untuk archived `APPROVED` atau `REJECTED`, actor harus `Unarchive` terlebih dahulu sebelum melakukan Reopen.

`CANCELLED` tetap permanent walaupun di-Unarchive.

---

## 29. Unarchive

Unarchive diperbolehkan.

Preconditions:

```text
nscmf.archive
+
valid record visibility
+
is_archived = true
```

Result:

```text
business_status = unchanged
is_archived = false
```

Unarchive MUST diaudit.

Mandatory Unarchive reason masih ditentukan pada `06_Validation_Rules.md` jika diperlukan.

---

# PART H — NSCMF CHANGE / RESULT OF CHANGES

## 30. Result of Changes Does Not Create a New Workflow State

`NSCMF - Change` memiliki section:

```text
(B) Result of Changes
```

Section tersebut adalah bagian data form, bukan lifecycle state.

Sistem MUST NOT menambahkan status seperti:

- `EXECUTION_PENDING`;
- `RESULT_PENDING`;
- `COMPLETED`;

hanya untuk merepresentasikan pengisian Result of Changes pada current requirement.

---

## 31. Initial Submit Does Not Require Final Result Merely Because Result Section Exists

Pada saat Change pertama kali diajukan, pekerjaan maintenance/change dapat belum selesai.

Karena itu keberadaan `Result of Changes` di source template tidak dengan sendirinya berarti seluruh Result wajib lengkap pada first Submit.

Exact initial submission field validation ditentukan di `06_Validation_Rules.md`.

---

## 32. Result Completion Gate Before Approval

Confirmed workflow intent:

> `Result of Changes` harus menjadi bagian dari record yang selesai diperiksa **sebelum final Approval**.

Untuk menjaga workflow sederhana, gate diterapkan pada Review completion:

```text
PENDING_REVIEW
  -- Forward to Approval --> PENDING_APPROVAL
```

Untuk `NSCMF - Change`, transition Forward MUST gagal jika Result-of-Changes requirement yang applicable belum terpenuhi sesuai Validation Rules.

Dengan demikian:

- tidak ada state baru;
- tidak perlu fake Return hanya untuk mengisi Result;
- Approver menerima record yang sudah memiliki applicable result evidence;
- final `APPROVED` tetap menjadi akhir normal workflow.

---

## 33. Result Editing During PENDING_REVIEW

Normal Requester editing tetap locked setelah Submit.

Namun implementation MUST menyediakan mekanisme narrow/explicit agar `Result of Changes` dapat dilengkapi selama `PENDING_REVIEW` oleh actor yang berhak, tanpa membuka seluruh form dan tanpa memaksa `REVISION_REQUIRED` hanya untuk kebutuhan result capture.

**TBD downstream:** source workbook tidak menentukan secara eksplisit siapa actor yang bertanggung jawab mengisi Result. Exact permission/role ownership dan field-level editability harus dikunci sebelum implementation pada RBAC/Validation/UI specification.

Planning/other submitted fields tidak otomatis ikut editable karena exception ini.

---

# PART I — EMERGENCY CHANGE

## 34. Emergency Uses the Same State Machine

`NSCMF - Change / Emergency` tidak memiliki bypass.

Canonical path tetap:

```text
DRAFT
-> PENDING_REVIEW
-> PENDING_APPROVAL
-> APPROVED
```

Dengan branch Return/Reject/Reopen yang sama.

Emergency MUST NOT:

- bypass Review;
- bypass Approval;
- langsung menjadi Approved;
- melewati state/permission validation.

---

# PART J — CONCURRENCY / STALE ACTIONS

## 35. Shared Reviewer Pool Concurrency

Beberapa Reviewer dapat membuka `PENDING_REVIEW` record yang sama.

Sebelum state-changing action dipersist, backend MUST membaca/revalidate current state.

Example:

```text
Reviewer A dan B membuka PENDING_REVIEW.
A melakukan Forward -> PENDING_APPROVAL.
B dari screen lama menekan Reject.

Expected:
- backend melihat current state sudah PENDING_APPROVAL;
- Reject-as-Reviewer dari stale screen ditolak;
- tidak ada partial/second conflicting transition;
- UI diminta menggunakan current state terbaru.
```

---

## 36. Shared Approver Pool Concurrency

Example:

```text
Approver A dan B membuka PENDING_APPROVAL.
A berhasil Approve -> APPROVED.
B kemudian mencoba Approve/Reject/Return dari screen lama.

Expected:
- backend melihat current state sudah APPROVED;
- stale action B ditolak;
- hanya A menjadi final Approved By untuk iteration tersebut.
```

---

## 37. Atomic State Transition Requirement

Workflow-changing action MUST memiliki behavior konseptual atomic:

```text
validate permission
+ validate scope
+ validate current state
+ validate input/precondition
+ apply state change
+ write workflow/audit evidence
```

Action yang gagal MUST NOT meninggalkan partial business state.

Technical implementation seperti optimistic locking, row locking, version column, atau transaction isolation ditentukan downstream.

---

# PART K — EDITABILITY MATRIX

## 38. State Editability

| State | General Requester Form Edit | Autosave / Save Draft | Reviewer State Actions | Approver State Actions | Reopen | Archive |
|---|---:|---:|---:|---:|---:|---:|
| `DRAFT` | Yes | Yes | No | No | No | No |
| `PENDING_REVIEW` | No | No | Yes | No | No | No |
| `REVISION_REQUIRED` | Yes | Yes | No | No | No | No |
| `PENDING_APPROVAL` | No | No | No | Yes | No | No |
| `REJECTED` | No | No | No | No | Yes | Yes |
| `APPROVED` | No | No | No | No | Yes | Yes |
| `CANCELLED` | No | No | No | No | Never | Yes |

Notes:

- `PENDING_REVIEW` has a narrow special capability for authorized `Change / Result of Changes` capture; this does not mean general Requester editing is unlocked.
- Archive requires `is_archived = false`.
- Reopen requires `is_archived = false`.
- Archived records must Unarchive before Reopen or other business workflow transition.

---

# PART L — TERMINAL / RECOVERABLE CLASSIFICATION

## 39. Classification

| State | Normal Flow Terminal? | Recoverable? | Recovery Mechanism |
|---|---:|---:|---|
| `DRAFT` | No | — | Normal flow |
| `PENDING_REVIEW` | No | — | Normal flow |
| `REVISION_REQUIRED` | No | — | Resubmit |
| `PENDING_APPROVAL` | No | — | Normal approval actions |
| `REJECTED` | Yes | Yes | Authorized Reopen |
| `APPROVED` | Yes | Yes | Authorized Reopen/Revert |
| `CANCELLED` | Yes | No | None |

`APPROVED` adalah successful normal endpoint, sedangkan `REJECTED` adalah unsuccessful normal endpoint yang masih dapat dipulihkan oleh explicit lifecycle authority.

---

# PART M — AUDIT REQUIREMENTS FOR STATE

## 40. Every State Transition Is Audited

Setiap successful transition MUST mencatat minimum:

- record identifier;
- source state;
- action/event;
- resulting state;
- actor;
- timestamp;
- workflow context/iteration reference jika model final menggunakannya;
- reason/comment jika diwajibkan;
- relevant validation/context.

---

## 41. Historical State Must Not Be Overwritten

Current state boleh berubah, tetapi historical transition events MUST dipertahankan.

Contoh:

```text
PENDING_REVIEW
-> REJECTED
-> Reopen to REVISION_REQUIRED
-> PENDING_REVIEW
-> PENDING_APPROVAL
-> APPROVED
-> Reopen to PENDING_REVIEW
```

Timeline harus tetap dapat menunjukkan seluruh sequence tersebut.

---

## 42. Viewer and State Actor Are Different Concepts

Viewer activity tidak sama dengan state transition actor.

Contoh valid:

```text
Reviewer A -> View
Reviewer B -> View
Reviewer C -> Forward
```

State transition actor untuk `PENDING_REVIEW -> PENDING_APPROVAL` adalah Reviewer C, sedangkan A/B tetap tercatat sebagai viewer jika viewer logging diterapkan.

---

# PART N — INVALID TRANSITIONS / GUARDRAILS

## 43. Explicitly Forbidden Transitions

Implementation MUST NOT mengizinkan antara lain:

```text
DRAFT -> PENDING_APPROVAL
DRAFT -> APPROVED
DRAFT -> REJECTED by Approver
PENDING_REVIEW -> DRAFT
PENDING_REVIEW -> APPROVED
REVISION_REQUIRED -> PENDING_APPROVAL
REVISION_REQUIRED -> APPROVED
PENDING_APPROVAL -> DRAFT
PENDING_APPROVAL -> APPROVED without eligible Approver action
REJECTED -> DRAFT
REJECTED -> PENDING_APPROVAL via Reopen
APPROVED -> DRAFT
APPROVED -> PENDING_APPROVAL via Reopen
CANCELLED -> any business state
```

---

## 44. No State Change From View

The following must never happen:

```text
PENDING_REVIEW -- Reviewer opens page --> UNDER_REVIEW
PENDING_APPROVAL -- Approver opens page --> ASSIGNED/LOCKED
```

View remains an audit activity only.

---

## 45. No Approval Count State

System MUST NOT create state progression such as:

```text
APPROVAL_1_OF_3
APPROVAL_2_OF_3
```

Current requirement uses a single successful final approval from any one eligible Approver.

---

# PART O — ACTION EVALUATION ORDER

## 46. Conceptual Server-Side Transition Evaluation

Before transition:

```text
1. Is user authenticated and account active?
2. Is protected invariant satisfied?
3. Does actor have required permission?
4. Can actor access/see the record?
5. Does actor scope match where required?
6. Is record not archived for business workflow action?
7. Is current business_status exactly eligible for requested action?
8. Does action-specific validation pass?
9. Does destination belong to allowed transition set?
10. Apply transition atomically.
11. Persist audit/workflow event.
12. Return current resulting state to UI.
```

For Reopen, mandatory reason and selected valid destination are part of action-specific validation.

---

# PART P — EXAMPLE LIFECYCLES

## 47. Happy Path

```text
Create
-> DRAFT
-> Submit
-> PENDING_REVIEW
-> Reviewer Forward
-> PENDING_APPROVAL
-> Approver Approve
-> APPROVED
```

---

## 48. Reviewer Revision Loop

```text
DRAFT
-> PENDING_REVIEW
-> Reviewer Return
-> REVISION_REQUIRED
-> Requester Resubmit
-> PENDING_REVIEW
-> Reviewer Return
-> REVISION_REQUIRED
-> Requester Resubmit
-> PENDING_REVIEW
-> Reviewer Forward
-> PENDING_APPROVAL
-> APPROVED
```

---

## 49. Approver Return to Requester

```text
PENDING_APPROVAL
-> Approver Return to Requester
-> REVISION_REQUIRED
-> Requester edits
-> Resubmit
-> PENDING_REVIEW
-> Reviewer Forward
-> PENDING_APPROVAL
-> Approver Approve
-> APPROVED
```

---

## 50. Rejected Then Reopened for Revision

```text
PENDING_REVIEW
-> Reviewer Reject
-> REJECTED
-> authorized Reopen(destination=REVISION_REQUIRED, reason=...)
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
-> Approve
-> APPROVED
```

---

## 51. Approved Then Reopened to Review

```text
APPROVED
-> authorized Reopen(destination=PENDING_REVIEW, reason=...)
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
-> Approve
-> APPROVED
```

Previous Approval remains in timeline.

---

## 52. Archive and Unarchive

```text
APPROVED + is_archived=false
-> Archive
-> APPROVED + is_archived=true
-> Unarchive
-> APPROVED + is_archived=false
```

Business status never becomes `ARCHIVED`.

---

# PART Q — CONFIRMED DECISIONS

## 53. Confirmed State Decisions

| Area | Decision |
|---|---|
| Canonical states | `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` |
| Submitted | Event, not separate state |
| Under Review | Not used |
| Reviewer opening record | No state change |
| Review pool | Shared/non-exclusive |
| Reviewer contributors | Multiple allowed |
| Revision | `REVISION_REQUIRED`; unlimited cycles |
| Resubmit destination | Always `PENDING_REVIEW` |
| Forward destination | `PENDING_APPROVAL` |
| Approval pool | Shared/non-exclusive |
| Final approval | One eligible Approver sufficient |
| Approver Return Reviewer | `PENDING_APPROVAL -> PENDING_REVIEW` |
| Approver Return Requester | `PENDING_APPROVAL -> REVISION_REQUIRED -> PENDING_REVIEW` after Resubmit |
| Rejected | Normal-flow terminal, recoverable |
| Approved | Normal-flow terminal/protected, recoverable |
| Cancelled | Permanent terminal, never Reopen |
| Reopen | Action/event, not state |
| Reopen source | `REJECTED` or `APPROVED` only |
| Reopen destination | `REVISION_REQUIRED` or `PENDING_REVIEW` only |
| Reopen to Draft | Forbidden |
| Reopen to Pending Approval | Forbidden |
| Archive | Independent administrative flag |
| Archive eligible states | `APPROVED`, `REJECTED`, `CANCELLED` |
| Unarchive | Allowed with `nscmf.archive` + valid visibility; status unchanged |
| Archived workflow | Unarchive required before Reopen/business transition |
| Change Result of Changes | Must be resolved before final Approval; no new state |
| Change initial Submit | Result is not automatically required merely because section exists |
| Result capture during review | Narrow authorized mechanism; exact actor permission TBD downstream |
| Emergency | Same Review + Approval state machine |
| Concurrency | Current state revalidated server-side; stale state-changing action rejected |

---

# PART R — DOWNSTREAM TBDs

## 54. Items Deliberately Deferred

State machine itself is now fixed, but the following remain for downstream documents:

### `06_Validation_Rules.md`

- exact required fields for first Submit;
- exact Result-of-Changes required fields before Forward;
- conditional validation by subtype;
- mandatory reason for Return, Reject, Cancel, Archive, Unarchive beyond already-confirmed Reopen reason;
- Service Impact single vs multi-select;
- numbering format/uniqueness validation;
- attachment constraints.

### RBAC / Validation / UI Refinement

- exact actor/permission that may populate `Change / Result of Changes` during `PENDING_REVIEW`;
- exact UI affordance so narrow result edit does not unlock unrelated submitted fields.

### Technical Documents

- transaction/locking/version strategy;
- state storage enum/string representation;
- workflow event schema;
- workflow iteration/version representation;
- database constraints;
- API error format for stale transitions.

These details MUST NOT change canonical transitions without explicitly revising this document.

---

# PART S — TESTABLE ACCEPTANCE CRITERIA

## 55. State Flow Acceptance Criteria

State Flow dianggap diterapkan dengan benar jika minimal dapat diverifikasi:

- [ ] New record starts as `DRAFT`.
- [ ] Autosave/Save Draft do not create another state.
- [ ] Draft Submit results in `PENDING_REVIEW`.
- [ ] There is no persistent `SUBMITTED` or `UNDER_REVIEW` state.
- [ ] Reviewer View does not change state.
- [ ] Reviewer A viewing/acting does not lock Reviewer B/C out.
- [ ] Reviewer Return results in `REVISION_REQUIRED`.
- [ ] `REVISION_REQUIRED` is editable by eligible Requester.
- [ ] Resubmit always results in `PENDING_REVIEW`.
- [ ] Reviewer Forward results in `PENDING_APPROVAL`.
- [ ] Approver Return to Reviewer results in `PENDING_REVIEW`.
- [ ] Approver Return to Requester results in `REVISION_REQUIRED` and subsequent Resubmit goes to `PENDING_REVIEW`.
- [ ] One eligible Approver can transition `PENDING_APPROVAL` to `APPROVED`.
- [ ] A second stale Approve cannot create a second final approval for the same iteration.
- [ ] Reviewer/Approver Reject results in `REJECTED`.
- [ ] `REJECTED` normal editing/resubmit is locked.
- [ ] Reopen is available only on `REJECTED`/`APPROVED` to authorized actor.
- [ ] Reopen requires mandatory reason.
- [ ] Reopen target is limited to `REVISION_REQUIRED` or `PENDING_REVIEW`.
- [ ] Reopen can never target `DRAFT` or `PENDING_APPROVAL`.
- [ ] Previous rejection/approval remains in timeline after Reopen.
- [ ] Draft Cancel results in permanent `CANCELLED`.
- [ ] `CANCELLED` can never Reopen.
- [ ] Archive does not replace business status.
- [ ] Only `APPROVED`, `REJECTED`, `CANCELLED` can be archived.
- [ ] Archived record remains visible/exportable according to normal scope.
- [ ] Archived Approved/Rejected must be Unarchived before Reopen.
- [ ] Unarchive preserves the same business status.
- [ ] `NSCMF - Change` does not gain a new execution/result state.
- [ ] Applicable Result of Changes validation blocks Forward to Approval when incomplete.
- [ ] Initial Change Submit is not automatically blocked solely because final Result of Changes is not yet available.
- [ ] Emergency follows the same mandatory Review and Approval states.
- [ ] Concurrent stale state-changing actions are rejected server-side.

---

## 56. Relationship to Prior Documents

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User interaction sequence | `03_User_Flow.md` |
| Actor permissions/scope | `04_RBAC_Permission_Matrix.md` |
| **Business state machine** | **`05_State_Status_Flow.md`** |
| Field/action validation | `06_Validation_Rules.md` |

If prior documents use older generic words such as `Submitted`, `Review`, `Reviewed`, or `Approval` as conceptual stages, implementation MUST map them to the canonical states in this document.

---

## 57. Next Document

Dokumen berikutnya:

**`06_Validation_Rules.md`**

Validation Rules harus mengunci minimal:

- first Submit requirements;
- revision/resubmit requirements;
- Review Forward requirements;
- Change `Result of Changes` gate;
- reason/comment requirements;
- subtype/conditional validation;
- number validation;
- Service Impact cardinality;
- attachment constraints;
- field-level editability conditions yang diperlukan untuk mendukung canonical state machine ini.
