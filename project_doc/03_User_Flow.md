# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Synchronized through State / Status Flow  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

- PRD → apa yang dibangun;
- Business Rules → invariant bisnis;
- RBAC → siapa boleh melakukan apa;
- State Flow → authoritative lifecycle;
- User Flow → urutan interaksi user dan respons sistem.

Canonical business states mengikuti `05_State_Status_Flow.md`:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

---

## 2. Actors

- **Protected Superadmin** — seeded administrator dan global visibility;
- **Requester** — membuat/mengajukan NSCMF;
- **Reviewer** — review berdasarkan Unit/Division scope;
- **Approver** — final approval berdasarkan Approval Scope;
- **Delegated Administrator** — non-Superadmin dengan explicit admin permissions;
- **Custom Role Actor** — granular permission combination;
- **System** — authentication, authorization, persistence, validation, audit, workflow, export.

Satu user MAY memiliki beberapa role.

---

# PART A — OVERALL FLOW

## 3. Primary Operational Flow

```text
Login
  ↓
Dashboard
  ├── Create New Form
  │     ↓
  │   Choose Activation / Change
  │     ↓
  │   Choose Subtype
  │     ↓
  │   Choose Auto / Manual Number
  │     ↓
  │   Fill Form
  │     ↓
  │   DRAFT
  │     ├── Autosave / Save Draft
  │     ├── Cancel → CANCELLED
  │     └── Submit → PENDING_REVIEW
  │                    ↓
  │              Shared Reviewer Pool
  │                ├── Return → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                ├── Reject → REJECTED
  │                └── Forward → PENDING_APPROVAL
  │                                ↓
  │                          Shared Approver Pool
  │                            ├── Return Reviewer → PENDING_REVIEW
  │                            ├── Return Requester → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                            ├── Reject → REJECTED
  │                            └── one valid Approve → APPROVED
  │
  └── History
        ├── View Record
        ├── View Timeline
        ├── Export
        └── Bulk Export
```

Exceptional lifecycle:

```text
REJECTED / APPROVED
  -- authorized Reopen(reason, destination) --> REVISION_REQUIRED or PENDING_REVIEW

APPROVED / REJECTED / CANCELLED
  -- authorized Archive --> same business status + is_archived=true
  -- authorized Unarchive --> same business status + is_archived=false

CANCELLED
  -- no Reopen --> permanent terminal
```

`REOPENED` dan `ARCHIVED` adalah events/treatments, bukan persistent business status.

---

# PART B — FIRST-TIME SETUP

## 4. UF-SETUP-001 — Seeded Superadmin First Login

1. Protected Superadmin membuka Login.
2. Memasukkan credential valid.
3. System mengautentikasi account.
4. Jika initial setup belum selesai, System mengarahkan ke Setup Wizard.
5. Protected Superadmin tidak dapat delete/disable/downgrade.

---

## 5. UF-SETUP-002 — Configure Roles

Wizard menampilkan:

- `Use Role Template`;
- `Manual Role Configuration`.

Template minimum: Superadmin, Requester, Reviewer, Approver. Eligible role/permission masih dapat dikelola kemudian sesuai RBAC, kecuali protected invariants.

---

## 6. UF-SETUP-003 — Configure Unit / Division

Wizard menyediakan predefined template/mapping atau manual configuration. Exact predefined entries tetap TBD.

---

## 7. UF-SETUP-004 — Configure Scope

1. User dipetakan ke Unit/Division yang relevan.
2. Reviewer memperoleh Reviewer Scope.
3. Approver memperoleh Approval Scope.
4. Approver MAY mencakup beberapa Unit/Division.
5. Scope dapat dikelola kemudian oleh authorized administrator.

---

## 8. UF-SETUP-005 — Complete Wizard

System menampilkan summary, Superadmin mengonfirmasi, setup ditandai selesai, lalu masuk Dashboard. Core system settings tetap protected Superadmin-only.

---

# PART C — LOGIN, DASHBOARD, ADMINISTRATION

## 9. UF-AUTH-001 — Normal Login

1. User membuka Login.
2. User mengisi credential.
3. System memverifikasi account aktif + credential.
4. Jika valid, session dibuat dan user masuk Dashboard.
5. Tidak ada self-registration.

---

## 10. UF-DASH-001 — Dashboard

Dashboard minimal menyediakan entry point sesuai permission:

- `Create New Form`;
- `History`;
- Review/Approval queue bila eligible;
- Administration/Settings bila eligible.

---

## 11. UF-ADMIN-001 — Manage Users

Actor dengan user-management permission MAY create/edit normal user, assign/remove role, assign/move Unit/Division, configure eligible scope, reset credential, enable/disable normal user.

System MUST menolak action yang melanggar protected Superadmin invariant. Tidak ada impersonation.

---

## 12. UF-ADMIN-002 — Manage Role / Permission / Organization

Authorized actor MAY mengelola eligible custom role, permissions, Unit/Division, user mapping, Reviewer Scope, dan Approval Scope. Core system settings tetap protected Superadmin-only.

---

# PART D — CREATE NEW FORM

## 13. UF-CREATE-001 — Start New NSCMF

1. User memilih `Create New Form`.
2. System memverifikasi `nscmf.create` atau equivalent permission.
3. User memilih family:
   - `NSCMF - Activation`;
   - `NSCMF - Change`.
4. User memilih subtype.

Activation subtypes:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

Change subtypes:

- Maintenance;
- Upgrade;
- Emergency.

Keyword `Upgrade` tidak boleh menentukan family secara otomatis.

---

## 14. UF-CREATE-002 — Choose Numbering Mode

User memilih `Automatic Number Generation` atau `Manual Number Entry` untuk record tersebut. Format/validation final mengikuti downstream Validation Rules.

---

## 15. UF-CREATE-003 — Fill Activation

UI merepresentasikan business meaning workbook, termasuk Service Information, Network/NOC data, bandwidth/routing/DNS/IP, onsite/customer/POP, attachment, dan sign-off context.

---

## 16. UF-CREATE-004 — Fill Change

UI menjaga semantics workbook:

- `(A) Purpose of Changes` = section;
- Facing Challenges = input content;
- Maintenance Purpose = input content;
- Identified Problem = narrative input;
- Service Impact = selectable values NOC15/NOC23/NOC361/Regional/POP/Customer/Other;
- Improvement Plan, KPI, execution date, monitoring, rollback, announcement;
- `(B) Result of Changes` = distinct data section.

`Result of Changes` tidak membuat state baru. Final result tidak otomatis diwajibkan hanya karena user melakukan first Submit. Applicable result harus selesai sebelum Reviewer dapat Forward ke Approval.

---

# PART E — DRAFT, AUTOSAVE, CANCEL

## 17. UF-DRAFT-001 — Draft Creation and Autosave

1. New record berada pada `DRAFT`.
2. Requester mengisi form.
3. System autosave berdasarkan trigger/interval downstream.
4. Persisted changes diaudit.
5. Autosave tidak berarti record siap Submit.

---

## 18. UF-DRAFT-002 — Manual Save Draft

1. Requester memilih `Save Draft`.
2. Latest editable data dipersist.
3. Draft boleh incomplete.
4. Persisted changes diaudit.
5. State tetap `DRAFT`.

---

## 19. UF-DRAFT-003 — Resume Draft

Requester membuka own Draft dari History/Own Records. System memverifikasi ownership/permission/state, lalu form kembali editable.

---

## 20. UF-DRAFT-004 — Cancel Draft

Preconditions:

- own record;
- `DRAFT`;
- belum pernah Submit.

Flow:

1. Requester memilih Cancel.
2. UI meminta confirmation.
3. Reason requirement mengikuti Validation Rules.
4. System mencatat event.
5. State menjadi `CANCELLED`.
6. Record tetap History.
7. `CANCELLED` tidak dapat Reopen.

---

# PART F — SUBMISSION

## 21. UF-SUBMIT-001 — Submit for Review

Preconditions: permission + ownership/access + submission validation.

1. Requester memilih Submit.
2. System menjalankan validation.
3. Jika gagal, state tetap `DRAFT`.
4. Jika berhasil:
   - latest data dipersist;
   - event Submit dicatat;
   - state `DRAFT -> PENDING_REVIEW`;
   - normal Requester editing locked;
   - semua eligible Reviewer matching scope memperoleh visibility.
5. Requester tidak memilih Reviewer tertentu.

`SUBMITTED` adalah event, bukan persistent state.

---

# PART G — REVIEWER FLOW

## 22. UF-REVIEW-001 — Open Review Queue

1. Reviewer membuka Review/History/Queue.
2. System menampilkan `PENDING_REVIEW` yang relevant berdasarkan Unit/Division scope.
3. Reviewer membuka record.
4. Backend memvalidasi permission/scope/current state.
5. View event dapat dicatat.
6. **State tetap `PENDING_REVIEW`.**
7. Reviewer tidak menjadi exclusive owner; Reviewer lain tetap eligible.

---

## 23. UF-REVIEW-002 — Multiple Reviewer Participation

Contoh valid:

```text
Reviewer A → View
Reviewer B → review activity
Reviewer C → Forward
```

System mempertahankan semua actor/timestamp. Contributor metadata tidak menjadi exclusive authorization lock.

---

## 24. UF-REVIEW-003 — Reviewer Actions

Dari `PENDING_REVIEW`, eligible Reviewer MAY:

- `Forward to Approval`;
- `Return for Revision`;
- `Reject`.

Setiap action melalui permission + scope + state + validation check.

---

## 25. UF-REVIEW-004 — Forward to Approval

1. Reviewer memilih Forward.
2. System memvalidasi current state dan action requirements.
3. Untuk Change, applicable `Result of Changes` gate MUST terpenuhi.
4. Jika valid, state:

```text
PENDING_REVIEW -> PENDING_APPROVAL
```

5. Review event/actor/timestamp dicatat.
6. Semua eligible Approver matching Approval Scope melihat candidate.
7. Candidate tidak di-assign exclusive.

---

## 26. UF-REVIEW-005 — Return for Revision

1. Reviewer memilih Return.
2. System mencatat event.
3. State:

```text
PENDING_REVIEW -> REVISION_REQUIRED
```

4. Requester editing diaktifkan.
5. Requester memperbaiki record; persisted changes diaudit.
6. Requester Resubmit.
7. State:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

8. Same Reviewer context SHOULD retained; other scoped Reviewer tetap eligible.
9. Loop MAY repeat tanpa fixed maximum.

---

## 27. UF-REVIEW-006 — Reviewer Reject

1. Reviewer memilih Reject.
2. System memvalidasi permission/scope/current state.
3. State:

```text
PENDING_REVIEW -> REJECTED
```

4. Reject event dicatat.
5. Normal Requester edit/resubmit berhenti.
6. Recovery hanya authorized Reopen.

---

## 28. UF-REVIEW-007 — Change Result Capture During Review

Untuk Change yang Result-nya belum tersedia pada first Submit:

1. record tetap `PENDING_REVIEW`;
2. system MAY/SHALL expose narrow Result-of-Changes editing hanya kepada actor yang explicit authorized sesuai rule downstream;
3. hanya Result-related fields yang dibuka; planning/submitted fields tidak otomatis editable;
4. persisted Result changes diaudit;
5. state tetap `PENDING_REVIEW`;
6. jika applicable result belum lengkap, Forward ke Approval ditolak.

Exact actor/permission masih TBD untuk `06_Validation_Rules.md` + RBAC/UI refinement karena template tidak menentukan siapa pengisinya.

---

# PART H — APPROVER FLOW

## 29. UF-APPROVAL-001 — Shared Approval Queue

1. Approver membuka Approval area.
2. System menampilkan `PENDING_APPROVAL` yang matching Approval Scope.
3. Semua eligible Approver dapat melihat candidate yang sama.
4. Opening/view tidak mengubah state dan tidak mengunci actor lain.

---

## 30. UF-APPROVAL-002 — Approve

1. Eligible Approver memilih Approve.
2. Backend memvalidasi permission, scope, current state, review prerequisite, dan relevant validation.
3. Jika valid:

```text
PENDING_APPROVAL -> APPROVED
```

4. Approval event, final actor, timestamp dicatat.
5. Satu final approval cukup.
6. `Approved By` = successful transition actor.
7. Approver lain tidak dapat menghasilkan approval kedua untuk iteration yang sama.

---

## 31. UF-APPROVAL-003 — Return to Reviewer

```text
PENDING_APPROVAL -> PENDING_REVIEW
```

Requester general editing tidak otomatis terbuka. Eligible Reviewer kembali memproses record.

---

## 32. UF-APPROVAL-004 — Return to Requester

1. Approver Return to Requester.
2. State:

```text
PENDING_APPROVAL -> REVISION_REQUIRED
```

3. Requester revisi + Resubmit.
4. Resubmit selalu:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

5. Reviewer harus Forward kembali sebelum candidate kembali `PENDING_APPROVAL`.

Forbidden:

```text
REVISION_REQUIRED -> PENDING_APPROVAL
```

---

## 33. UF-APPROVAL-005 — Approver Reject

```text
PENDING_APPROVAL -> REJECTED
```

Reject event dicatat. Normal flow berhenti sampai authorized Reopen.

---

# PART I — REOPEN / REVERT

## 34. UF-REOPEN-001 — Reopen Rejected

Preconditions:

- `REJECTED`;
- not archived;
- protected Superadmin atau explicit `nscmf.reopen`;
- valid record visibility/scope.

Flow:

1. Actor memilih Reopen.
2. System meminta mandatory reason.
3. UI menampilkan hanya valid destinations:
   - `REVISION_REQUIRED`;
   - `PENDING_REVIEW`.
4. Actor memilih destination.
5. Backend revalidates permission/scope/archive flag/current state/destination.
6. Jika valid, state langsung berpindah ke selected destination.
7. Reopen event + reason + previous rejection evidence dicatat.

Tidak ada persistent `REOPENED` state.

---

## 35. UF-REOPEN-002 — Reopen/Revert Approved

Flow sama dengan Rejected, tetapi source state `APPROVED`.

Valid destinations hanya:

- `REVISION_REQUIRED`;
- `PENDING_REVIEW`.

Tidak boleh ke `DRAFT` atau `PENDING_APPROVAL`. Previous Approval tetap timeline/history.

---

# PART J — HISTORY, TIMELINE, EXPORT

## 36. UF-HISTORY-001 — Open History

System menghitung effective visibility:

| Actor | Visibility |
|---|---|
| Requester | Own records |
| Reviewer | Matching Unit/Division |
| Approver | Matching Approval Scope |
| Protected Superadmin | All NSCMF |
| Custom/multi-role | permission + configured scope union |

---

## 37. UF-HISTORY-002 — View Detail and Timeline

User yang legitimate melihat form detail, relevant attachments, current business status, archive treatment, dan timeline siapa melakukan apa. Timeline read-only untuk normal user.

---

## 38. UF-EXPORT-001 — Single Export

1. User memilih visible record.
2. System memverifikasi visibility.
3. Export dibuat dari stored record.
4. PDF minimum required format.
5. Export tidak mengubah state.

---

## 39. UF-EXPORT-002 — Bulk Export

System melakukan visibility check per selected record. Inaccessible record MUST NOT bocor melalui bulk operation. Packaging final downstream.

---

# PART K — ARCHIVE / UNARCHIVE

## 40. UF-ARCHIVE-001 — Archive Record

Preconditions:

- protected Superadmin atau explicit `nscmf.archive`;
- valid record visibility;
- state in `APPROVED`, `REJECTED`, `CANCELLED`;
- `is_archived=false`.

Flow:

1. Actor memilih Archive.
2. System memvalidasi permission/visibility/state.
3. Jika valid:

```text
business_status = unchanged
is_archived = true
```

4. Archive event dicatat.
5. Record keluar dari default active view.
6. Normal scoped visibility tetap berlaku di archived/history view.
7. Archived record tidak dapat Reopen/business-transition sampai Unarchive.

Active states (`DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`) tidak dapat Archive.

---

## 41. UF-ARCHIVE-002 — Unarchive Record

Preconditions:

- `nscmf.archive`;
- valid visibility;
- `is_archived=true`.

Flow:

1. Actor memilih Unarchive.
2. System memvalidasi action.
3. Result:

```text
business_status = unchanged
is_archived = false
```

4. Unarchive event dicatat.
5. `APPROVED`/`REJECTED` baru dapat Reopen setelah Unarchive.
6. `CANCELLED` tetap permanent terminal walaupun Unarchive.

---

# PART L — NOTIFICATION

## 42. UF-NOTIF-001 — Future Notification

Future hooks MAY berada pada Submit, Return, Reject, Forward, Approve, Reopen. Telegram/WhatsApp-Baileys adalah candidates, bukan current blocker.

---

# PART M — LOGOUT

## 43. UF-AUTH-002 — Logout

User Logout → session berakhir → kembali Login. Persisted Draft tetap tersimpan.

---

# PART N — ERROR / AUTHORIZATION / CONCURRENCY

## 44. UF-ERROR-001 — Unauthorized Direct Access

Backend menolak direct URL/ID/API access jika visibility tidak valid dan MUST NOT mengirim record data ke frontend.

---

## 45. UF-ERROR-002 — Stale Reviewer Action

Example:

```text
Reviewer A dan B membuka PENDING_REVIEW.
A Forward -> PENDING_APPROVAL.
B dari screen lama mencoba Reject sebagai Reviewer.
```

Backend melihat current state bukan lagi `PENDING_REVIEW`, menolak stale action B, dan UI harus refresh/current state.

---

## 46. UF-ERROR-003 — Stale Approver Action

```text
Approver A dan B membuka PENDING_APPROVAL.
A Approve -> APPROVED.
B kemudian mencoba Approve/Reject/Return dari stale screen.
```

Backend menolak action B. Hanya A final `Approved By` untuk iteration tersebut.

Technical locking/transaction mechanism ditentukan downstream.

---

# PART O — USER FLOW SUMMARY BY ACTOR

## 47. Requester

```text
Login
→ Dashboard
→ Create Form
→ DRAFT
→ Autosave/Save
→ Cancel OR Submit
→ PENDING_REVIEW
→ if Returned: REVISION_REQUIRED → edit → Resubmit → PENDING_REVIEW
→ if Rejected: normal flow stops
→ if Approved: read-only/history/export
```

---

## 48. Reviewer

```text
Open PENDING_REVIEW queue
→ View (no state change)
→ Forward OR Return OR Reject
```

Reviewer non-exclusive; multiple contributors allowed.

---

## 49. Approver

```text
Open PENDING_APPROVAL queue
→ View (no state change)
→ Approve OR Return Reviewer OR Return Requester OR Reject
```

Approver non-exclusive; one successful final Approve sufficient.

---

## 50. Authorized Lifecycle Actor

```text
Visible eligible record
→ permission/state/archive check
→ Reopen(reason + valid destination)
OR Archive / Unarchive
→ audit event
```

Default Superadmin memiliki permissions; role lain MAY mendapatkannya explicitly.

---

# PART P — CONFIRMED FLOW DECISIONS

## 51. Confirmed Decisions

| Area | Decision |
|---|---|
| Setup | Wizard |
| Multi-role | Allowed |
| Family selection | family → subtype → numbering → fields |
| Draft | `DRAFT`, autosave + Save Draft |
| Cancel | `DRAFT -> CANCELLED`, permanent |
| Submit | `DRAFT -> PENDING_REVIEW` |
| Submitted | Event, not persistent state |
| Under Review | Not used |
| Reviewer View | No state change |
| Reviewer eligibility | Shared/non-exclusive |
| Revision | `REVISION_REQUIRED`, unlimited |
| Resubmit | Always `PENDING_REVIEW` |
| Forward | `PENDING_REVIEW -> PENDING_APPROVAL` |
| Approver eligibility | Shared/non-exclusive |
| Final approval | One eligible Approver sufficient |
| Approved By | Successful final actor |
| Return Reviewer | `PENDING_APPROVAL -> PENDING_REVIEW` |
| Return Requester | `PENDING_APPROVAL -> REVISION_REQUIRED -> PENDING_REVIEW` |
| Reject | `REJECTED`, recoverable by Reopen |
| Reopen | Action/event; `REJECTED`/`APPROVED` → Review or Revision only |
| Reopen to Draft/Approval | Forbidden |
| Archive | Independent flag; only Approved/Rejected/Cancelled |
| Unarchive | Allowed with permission; status unchanged |
| Change Result | Completed before Forward/Approval; no new state |
| Timeline | Legitimate viewer sees activity |
| Export | View implies export |
| Emergency | Same Review + Approval flow |
| Concurrency | Stale state-changing action rejected server-side |

---

# PART Q — OPEN ITEMS

## 52. Explicit Downstream TBDs

- exact Unit/Division template entries;
- automatic number format/uniqueness;
- Service Impact cardinality;
- exact mandatory/conditional fields;
- exact actor/permission for Change Result capture during `PENDING_REVIEW`;
- mandatory reasons selain Reopen;
- search/filter UI;
- export packaging/additional format;
- audit retention/export audit;
- attachment constraints;
- notification provider/timing;
- technical transaction/version mechanism.

---

## 53. Current Documentation Progress

`05_State_Status_Flow.md` telah mengunci lifecycle authoritative.

Dokumen berikutnya:

**`06_Validation_Rules.md`**.
