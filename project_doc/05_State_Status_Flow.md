# State / Status Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-STATE-005  
> **Document Order:** 05 / 20  
> **Status:** Draft — Confirmed State Machine + Synchronized through Validation Rules  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`  
> **Synchronized With:** `06_Validation_Rules.md`  
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

Field-level/action validation menjadi tanggung jawab `06_Validation_Rules.md`. UI labels/interaction detail berada di `07_UI_UX_Specification.md`. Database representation, locking/versioning, dan transaction mechanism akan ditentukan di dokumen teknis downstream.

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
| `PENDING_REVIEW` | Record menunggu/berada pada shared Reviewer pool | General form locked; eligible Requester/owner may edit Change Result only | Return, Reject, Forward | Active |
| `REVISION_REQUIRED` | Record dikembalikan ke Requester untuk perbaikan | Editable | Resubmit | Active |
| `PENDING_APPROVAL` | Review selesai untuk iteration saat ini dan record berada pada shared Approver pool | Locked | Return to Reviewer, Return to Requester, Reject, Approve | Active |
| `REJECTED` | Record ditolak dan normal workflow berhenti | Locked | Authorized Reopen only | Recoverable terminal/protected |
| `APPROVED` | Record memperoleh final approval valid | Locked | Authorized Reopen/Revert only | Recoverable terminal/protected |
| `CANCELLED` | Draft dibatalkan sebelum first Submit | Locked | None | Permanent terminal |

Display label MAY menggunakan bentuk human-readable seperti `Pending Review`, tetapi canonical backend/business identifier harus tetap konsisten dengan specification ini.

---

## 5. Explicit Non-States

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

Setelah Submit berhasil:

```text
DRAFT -> PENDING_REVIEW
```

`SUBMITTED` tetap disimpan sebagai workflow event/timestamp.

Reviewer membuka record MUST NOT mengubah state menjadi `UNDER_REVIEW`, karena Reviewer tidak exclusive, viewer activity berbeda dari workflow state, dan state harus stabil sampai ada state-changing action.

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

Persistence event tidak mengubah state.

### Editability
Requester dengan permission dan ownership valid MAY mengedit Draft. Draft MAY incomplete.

### Allowed State-Changing Actions
1. `Submit` -> `PENDING_REVIEW`
2. `Cancel` -> `CANCELLED`

Cancel reason Optional menurut Validation Rules.

### Forbidden
Reviewer actions, Approver actions, Reopen, Archive.

---

## 9. `PENDING_REVIEW`

### Entry Sources
- `DRAFT` via first Submit;
- `REVISION_REQUIRED` via Resubmit;
- `PENDING_APPROVAL` via Return to Reviewer;
- `REJECTED` via authorized Reopen;
- `APPROVED` via authorized Reopen/Revert.

### Business Meaning
Record tersedia pada shared Reviewer pool sesuai Unit/Division scope.

### Reviewer Participation
Semua eligible Reviewer dengan permission + matching scope MAY membuka record, melakukan review activity, dan menjalankan state-changing action yang valid. Reviewer pertama tidak menjadi exclusive owner.

### State-Neutral Reviewer Events
- View;
- comment/note jika fitur tersebut nanti tersedia dan bukan transition;
- reviewer contribution metadata;
- audit/viewer logging.

### Allowed State-Changing Actions
1. `Return for Revision` -> `REVISION_REQUIRED` — mandatory reason.
2. `Reject` -> `REJECTED` — mandatory reason.
3. `Forward to Approval` -> `PENDING_APPROVAL` — Forward validation gate.

### Requester General Editability
Normal Requester form editing locked setelah Submit.

### Narrow Change Result Exception
Untuk `NSCMF - Change`, Requester/owner dengan:

```text
nscmf.change.result.edit
+ own/valid visible record
+ family = CHANGE
+ business_status = PENDING_REVIEW
```

MAY mengedit **Result of Changes fields only** tanpa mengubah state. Planning/submitted fields lain tetap locked. Persisted Result changes diaudit.

---

## 10. `REVISION_REQUIRED`

### Entry Sources
- Reviewer Return from `PENDING_REVIEW`;
- Approver Return to Requester from `PENDING_APPROVAL`;
- authorized Reopen from `REJECTED`;
- authorized Reopen/Revert from `APPROVED`.

### Business Meaning
Record dikembalikan untuk diperbaiki oleh Requester.

### Editability
Requester editing diaktifkan kembali untuk own record sesuai permission. Autosave, Save Draft, attachment mutation, dan persisted field changes diaudit.

### Allowed State-Changing Action

```text
REVISION_REQUIRED -- Resubmit --> PENDING_REVIEW
```

Resubmit menjalankan submission validation ulang. Tidak diwajibkan adanya perubahan minimal satu field.

### Mandatory Re-Review Invariant
Tidak ada `REVISION_REQUIRED -> PENDING_APPROVAL`.

### Revision Count
Tidak ada fixed maximum revision cycle.

---

## 11. `PENDING_APPROVAL`

### Entry
Hanya melalui successful Reviewer Forward dari `PENDING_REVIEW`.

### Business Meaning
Current workflow iteration telah memenuhi review/validation completion gate dan tersedia pada shared Approver pool sesuai Approval Scope.

### Approver Participation
Semua eligible Approver dengan permission + matching scope MAY melihat dan mengambil valid action. First viewer tidak exclusive.

### Allowed State-Changing Actions
1. `Return to Reviewer` -> `PENDING_REVIEW` — mandatory reason.
2. `Return to Requester` -> `REVISION_REQUIRED` — mandatory reason.
3. `Reject` -> `REJECTED` — mandatory reason.
4. `Approve` -> `APPROVED` — comment Optional.

### Final Approval Rule
Satu successful Approve dari satu eligible Approver cukup. Setelah `APPROVED`, stale Approver action ditolak.

---

## 12. `REJECTED`

### Entry Sources
- Reviewer Reject from `PENDING_REVIEW`;
- Approver Reject from `PENDING_APPROVAL`.

### Business Meaning
Normal workflow berhenti dan Requester tidak dapat edit/resubmit melalui normal action.

### Editability
Locked.

### Recovery
Reopen requires:

```text
nscmf.reopen
+ valid visibility/scope
+ not archived
+ mandatory reason
+ valid destination
```

Valid destinations: `REVISION_REQUIRED`, `PENDING_REVIEW` only.

Previous rejection evidence remains in timeline.

---

## 13. `APPROVED`

### Entry
Hanya melalui successful final Approve dari `PENDING_APPROVAL`.

### Business Meaning
Record memperoleh final approval valid untuk current workflow iteration. `Approved By` adalah final transition actor.

### Editability
Protected/read-only melalui normal workflow.

### Recovery / Revert
Requires `nscmf.reopen` + valid visibility/scope + not archived + mandatory reason + valid destination.

Valid destination only:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

Previous Approved event/actor/timestamp/iteration evidence MUST remain.

---

## 14. `CANCELLED`

### Entry

```text
DRAFT -- Cancel --> CANCELLED
```

### Preconditions
Draft + never successfully submitted.

### Classification
Permanent terminal.

### Forbidden
No Reopen, no return to Draft, no Submit/Review/Approval. If need returns, create a new NSCMF.

Cancelled MAY Archive/Unarchive administratively without changing status.

---

# PART D — TRANSITION MATRIX

## 15. Authoritative Transition Matrix

| From State | Action | To State | Actor Context | Core Permission | Key Preconditions |
|---|---|---|---|---|---|
| `DRAFT` | Submit | `PENDING_REVIEW` | Requester/eligible creator | `nscmf.submit` | ownership/access + submission validation |
| `DRAFT` | Cancel | `CANCELLED` | Requester | `nscmf.cancel` | own Draft + never submitted; reason optional |
| `PENDING_REVIEW` | Return for Revision | `REVISION_REQUIRED` | Eligible Reviewer | `nscmf.review.return` | matching scope + current state + mandatory reason |
| `PENDING_REVIEW` | Reject | `REJECTED` | Eligible Reviewer | `nscmf.review.reject` | matching scope + current state + mandatory reason |
| `PENDING_REVIEW` | Forward to Approval | `PENDING_APPROVAL` | Eligible Reviewer | `nscmf.review.forward` | matching scope + review/validation gate |
| `REVISION_REQUIRED` | Resubmit | `PENDING_REVIEW` | Requester | `nscmf.submit` | own record + revision validation |
| `PENDING_APPROVAL` | Return to Reviewer | `PENDING_REVIEW` | Eligible Approver | `nscmf.approval.return_reviewer` | matching scope + current state + mandatory reason |
| `PENDING_APPROVAL` | Return to Requester | `REVISION_REQUIRED` | Eligible Approver | `nscmf.approval.return_requester` | matching scope + current state + mandatory reason |
| `PENDING_APPROVAL` | Reject | `REJECTED` | Eligible Approver | `nscmf.approval.reject` | matching scope + current state + mandatory reason |
| `PENDING_APPROVAL` | Approve | `APPROVED` | Eligible Approver | `nscmf.approve` | matching scope + review prerequisite + current state |
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
- narrow Result persistence in `PENDING_REVIEW` by authorized Requester/owner;
- attachment mutation in eligible editable context;
- audit/timeline read;
- Export;
- reviewer/approver view activity;
- Archive/Unarchive flag changes.

State-neutral does not mean audit-neutral.

---

# PART E — REVISION AND WORKFLOW ITERATION

## 17. Unlimited Revision Loop

```text
PENDING_REVIEW
-> REVISION_REQUIRED
-> PENDING_REVIEW
-> ...
```

No fixed maximum. Prior Return event, actor, mandatory reason, field changes, Resubmit, Reviewer contributors, and timestamps remain.

---

## 18. Approver Return to Requester

```text
PENDING_APPROVAL
-- Return to Requester(reason) --> REVISION_REQUIRED
-- Resubmit -------------------> PENDING_REVIEW
-- Reviewer Forward -----------> PENDING_APPROVAL
```

No shortcut to Approval.

---

## 19. Approver Return to Reviewer

```text
PENDING_APPROVAL
-- Return to Reviewer(reason) --> PENDING_REVIEW
```

Requester general editing remains locked. Reviewer may Forward, Return to Requester, or Reject.

---

## 20. Reviewer Continuity Is Metadata, Not State
Same Reviewer context SHOULD be retained for continuity after revision, but other scoped Reviewers remain eligible. No exclusive lock/state.

---

# PART F — REOPEN / REVERT

## 21. Reopen-Eligible States
Only `REJECTED`, `APPROVED`.

`CANCELLED` never Reopen.

---

## 22. Reopen Destination Rules
Valid only:
1. `REVISION_REQUIRED`
2. `PENDING_REVIEW`

Forbidden direct target: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `CANCELLED`.

---

## 23. Reopen Authorization

```text
protected Superadmin OR explicit nscmf.reopen
+ valid visibility/scope
+ Reopen-eligible current state
+ not archived
+ mandatory reason
+ valid destination
+ server-side current-state recheck
```

`nscmf.reopen` does not grant global visibility.

---

## 24. Reopen Audit Evidence
Must record actor, timestamp, source state, destination, mandatory reason, previous rejection/approval context, resulting state. Never overwrite prior history.

---

# PART G — ARCHIVE / UNARCHIVE

## 25. Archive Is Independent From Business Status

```text
business_status = <canonical state>
is_archived = false | true
```

---

## 26. Archive-Eligible Business States
Only:

```text
APPROVED
REJECTED
CANCELLED
```

Not allowed on active `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`.

---

## 27. Archive Action

Preconditions:

```text
nscmf.archive
+ valid visibility
+ business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ mandatory reason
```

Result: business status unchanged, `is_archived=true`. Event/reason audited. Record leaves default active view.

---

## 28. Archived Record Behavior
Archived record:

- retains full business status/history;
- follows normal visibility scope;
- timeline/export remains available to legitimate viewer;
- no normal business workflow transition while archived;
- Unarchive required before Reopen for Approved/Rejected;
- Cancelled remains permanent after Unarchive.

---

## 29. Unarchive

Preconditions:

```text
nscmf.archive
+ valid visibility
+ is_archived = true
+ mandatory reason
```

Result:

```text
business_status = unchanged
is_archived = false
```

Unarchive event + reason audited.

---

# PART H — NSCMF CHANGE / RESULT OF CHANGES

## 30. Result of Changes Does Not Create a New Workflow State
`(B) Result of Changes` adalah data section, not state. No `EXECUTION_PENDING`, `RESULT_PENDING`, or `COMPLETED` solely because of this section.

---

## 31. Initial Submit Result Treatment
First Change Submit MAY have zero Result rows. If a row has been started, Summary + Performance + Status must be complete according to Validation Rules. Result section alone does not block initial Submit simply because work may not have happened yet.

---

## 32. Result Completion Gate Before Approval
For Change:

```text
PENDING_REVIEW -- Forward --> PENDING_APPROVAL
```

MUST fail unless:

- minimum 1 complete Result row exists;
- every used Result row is complete;
- maximum 5 rows as source capacity;
- all relevant Forward validation passes.

Five rows are capacity, not mandatory count.

---

## 33. Result Editing During `PENDING_REVIEW`
Confirmed default actor:

```text
Requester/owner
+ nscmf.change.result.edit
+ own/valid visible Change
+ PENDING_REVIEW
```

The narrow capability edits Result Summary, Performance Information, Status only. It MUST NOT unlock Purpose, Service Impact, Plan/KPI, Target Date, Rollback, general planning fields, or attachment management. Persisted Result changes are audited. State remains `PENDING_REVIEW`.

---

# PART I — EMERGENCY CHANGE

## 34. Emergency Uses the Same State Machine

```text
DRAFT -> PENDING_REVIEW -> PENDING_APPROVAL -> APPROVED
```

No Review/Approval bypass.

---

# PART J — CONCURRENCY / STALE ACTIONS

## 35. Shared Reviewer Pool Concurrency
Several eligible Reviewers may open same record. Before transition backend revalidates current state. If A Forward succeeds and B later sends stale Reviewer Reject, B action MUST fail.

---

## 36. Shared Approver Pool Concurrency
If Approver A Approves first, state becomes `APPROVED`; stale Approve/Reject/Return from B MUST fail. Only A is final Approved By for that iteration.

---

## 37. Atomic State Transition Requirement
Conceptually:

```text
validate permission
+ visibility/scope/ownership
+ archive state
+ current state
+ action validation
+ destination
+ state change
+ audit evidence
```

No partial business state. Technical locking strategy downstream.

---

# PART K — EDITABILITY MATRIX

## 38. State Editability

| State | General Requester Form Edit | Change Result Narrow Edit | Autosave / Save Draft | Reviewer Actions | Approver Actions | Reopen | Archive |
|---|---:|---:|---:|---:|---:|---:|---:|
| `DRAFT` | Yes | Part of normal form | Yes | No | No | No | No |
| `PENDING_REVIEW` | No | Yes, eligible Requester/owner only | No general save | Yes | No | No | No |
| `REVISION_REQUIRED` | Yes | Part of normal form | Yes | No | No | No | No |
| `PENDING_APPROVAL` | No | No | No | No | Yes | No | No |
| `REJECTED` | No | No | No | No | No | Yes | Yes |
| `APPROVED` | No | No | No | No | No | Yes | Yes |
| `CANCELLED` | No | No | No | No | No | Never | Yes |

Archive/Reopen require `is_archived=false`; archived records must Unarchive first where applicable.

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

---

# PART M — AUDIT REQUIREMENTS FOR STATE

## 40. Every State Transition Is Audited
Must record record identifier, source state, action/event, resulting state, actor, timestamp, workflow context/iteration if used, reason/comment when required, relevant validation context.

---

## 41. Historical State Must Not Be Overwritten
Current state changes but transition history remains across rejection/reopen/revision/reapproval cycles.

---

## 42. Viewer and State Actor Are Different Concepts
Example:

```text
Reviewer A -> View
Reviewer B -> View
Reviewer C -> Forward
```

C is transition actor; A/B remain viewer activities if logging applies.

---

# PART N — INVALID TRANSITIONS / GUARDRAILS

## 43. Explicitly Forbidden Transitions

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

```text
PENDING_REVIEW -- Reviewer opens --> UNDER_REVIEW  // forbidden
PENDING_APPROVAL -- Approver opens --> ASSIGNED/LOCKED // forbidden
```

---

## 45. No Approval Count State
No `APPROVAL_1_OF_3`, etc. One eligible successful final approval.

---

# PART O — ACTION EVALUATION ORDER

## 46. Conceptual Server-Side Transition Evaluation

```text
1. authenticated and active?
2. protected invariant satisfied?
3. required permission?
4. visibility?
5. ownership/scope?
6. archive flag compatible?
7. exact current state eligible?
8. action-specific validation/reason passes?
9. destination allowed?
10. apply transition atomically.
11. persist audit/workflow event.
12. return resulting current state.
```

---

# PART P — EXAMPLE LIFECYCLES

## 47. Happy Path

```text
Create -> DRAFT -> Submit -> PENDING_REVIEW -> Forward -> PENDING_APPROVAL -> Approve -> APPROVED
```

---

## 48. Reviewer Revision Loop

```text
DRAFT
-> PENDING_REVIEW
-> Reviewer Return(reason)
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Reviewer Forward
-> PENDING_APPROVAL
-> APPROVED
```

---

## 49. Approver Return to Requester

```text
PENDING_APPROVAL
-> Return Requester(reason)
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
-> Approve
-> APPROVED
```

---

## 50. Rejected Then Reopened

```text
PENDING_REVIEW
-> Reject(reason)
-> REJECTED
-> Reopen(reason, destination=REVISION_REQUIRED)
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
```

---

## 51. Approved Then Reopened to Review

```text
APPROVED
-> Reopen(reason, destination=PENDING_REVIEW)
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
APPROVED + false
-> Archive(reason)
-> APPROVED + true
-> Unarchive(reason)
-> APPROVED + false
```

---

# PART Q — CONFIRMED DECISIONS

## 53. Confirmed State Decisions

| Area | Decision |
|---|---|
| Canonical states | `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` |
| Submitted | Event, not state |
| Under Review | Not used |
| Reviewer opening | No state change |
| Review pool | Shared/non-exclusive |
| Reviewer contributors | Multiple |
| Revision | `REVISION_REQUIRED`, unlimited |
| Resubmit | Always `PENDING_REVIEW` |
| Forward | `PENDING_APPROVAL` |
| Approval pool | Shared/non-exclusive |
| Final approval | One eligible Approver sufficient |
| Approver Return Reviewer | `PENDING_REVIEW` + mandatory reason |
| Approver Return Requester | `REVISION_REQUIRED` + mandatory reason; Resubmit → Review |
| Reject | `REJECTED` + mandatory reason |
| Cancelled | Permanent; Cancel reason optional |
| Reopen | action/event; only Rejected/Approved; mandatory reason; Review/Revision target only |
| Archive | independent flag; Approved/Rejected/Cancelled only; mandatory reason |
| Unarchive | same permission, status unchanged; mandatory reason |
| Change initial Result | zero rows allowed; started row complete |
| Change Result capture | Requester/owner + `nscmf.change.result.edit`, Result-only, PENDING_REVIEW |
| Change Forward Result gate | minimum 1 complete Result row; five is capacity |
| Emergency | same state machine |
| Concurrency | stale state-changing actions rejected |

---

# PART R — DOWNSTREAM ITEMS

## 54. Items Still Deliberately Deferred

### UI / UX
- exact presentation and interaction behavior → `07_UI_UX_Specification.md`.

### Technical Documents
- transaction/locking/version strategy;
- state storage representation;
- workflow event schema;
- workflow iteration/version representation;
- database constraints;
- API error format for stale transitions.

### Organization / Policy
- official company numbering SOP/sample;
- exact default Unit/Division data;
- audit retention/export audit;
- notification details;
- malware scanning/storage details;
- e-signature only if required later.

Field/action validation items previously deferred to 06 are resolved and MUST NOT alter canonical state transitions.

---

# PART S — TESTABLE ACCEPTANCE CRITERIA

## 55. State Flow Acceptance Criteria

- [ ] New record starts `DRAFT`.
- [ ] Autosave/Save Draft do not create state.
- [ ] Draft may be incomplete.
- [ ] Submit → `PENDING_REVIEW`.
- [ ] No persistent `SUBMITTED`/`UNDER_REVIEW`.
- [ ] Reviewer View no state change/exclusive lock.
- [ ] Reviewer Return/Reject require reasons and reach correct states.
- [ ] `REVISION_REQUIRED` editable by eligible Requester.
- [ ] Resubmit always `PENDING_REVIEW`.
- [ ] Reviewer Forward → `PENDING_APPROVAL`.
- [ ] Change Forward blocked until Result gate passes.
- [ ] Requester/owner can narrow-edit Change Result in `PENDING_REVIEW` without general form unlock.
- [ ] Approver Return/Reject require reasons and reach correct states.
- [ ] One eligible Approver can create `APPROVED`.
- [ ] Stale second Approve denied.
- [ ] Reopen only Rejected/Approved, requires reason, only Revision/Review targets.
- [ ] Previous rejection/approval preserved.
- [ ] Cancel → permanent `CANCELLED`; no Reopen.
- [ ] Archive does not change business status.
- [ ] Only Approved/Rejected/Cancelled archive-eligible; Archive/Unarchive require reasons.
- [ ] Archived Approved/Rejected Unarchive before Reopen.
- [ ] Emergency same mandatory Review + Approval.
- [ ] Concurrent stale actions rejected server-side.

---

## 56. Relationship to Prior/Next Documents

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| Actor permissions/scope | `04_RBAC_Permission_Matrix.md` |
| **Business state machine** | **`05_State_Status_Flow.md`** |
| Field/action validation | `06_Validation_Rules.md` |
| Presentation/interaction design | `07_UI_UX_Specification.md` |

---

## 57. Next Document

Dokumen berikutnya:

**`07_UI_UX_Specification.md`**

It must preserve this state machine while defining state-aware editability, Result-only UX, reason dialogs, archived treatment, action placement, validation/stale-state feedback, and status presentation.