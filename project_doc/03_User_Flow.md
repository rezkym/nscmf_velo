# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Synchronized with confirmed Business Rules and RBAC decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `04_RBAC_Permission_Matrix.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

PRD menjawab *apa yang dibangun*. Business Rules menjawab *aturan apa yang tidak boleh dilanggar*. RBAC menjawab *siapa boleh melakukan apa*. User Flow menjawab:

> **User masuk dari mana, melakukan action apa, sistem merespons bagaimana, lalu user bergerak ke tahap mana berikutnya?**

Nama state teknis final akan dikunci pada `05_State_Status_Flow.md`.

---

## 2. Actors

Actor konseptual:

- **Protected Superadmin** — seeded administrator dan global visibility;
- **Requester** — membuat/mengajukan NSCMF;
- **Reviewer** — review berdasarkan Unit/Division scope;
- **Approver** — final approval berdasarkan Approval Scope;
- **Delegated Administrator** — actor non-Superadmin dengan explicit administrative permission;
- **Custom Role Actor** — actor dengan kombinasi permission granular;
- **System** — authentication, persistence, validation, audit, workflow, export, authorization.

Satu user MAY memiliki beberapa role sekaligus.

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
  │   Draft + Autosave + Save Draft
  │     ↓
  │   Submit
  │     ↓
  │   Shared Reviewer Pool (scope-based)
  │     ├── Return → Requester Revision → Resubmit → Review again
  │     ├── Reject → Rejected
  │     └── Forward → Approval
  │                    ↓
  │                Shared Approver Pool (scope-based)
  │                    ├── Return to Reviewer
  │                    ├── Return to Requester → Revision → Review again
  │                    ├── Reject → Rejected
  │                    └── One eligible Approver approves → Approved
  │
  └── History
        ├── View Record
        ├── View Timeline
        ├── Export
        └── Bulk Export
```

Exceptional lifecycle:

```text
Rejected ── authorized nscmf.reopen ──> selected valid destination
Approved ── authorized nscmf.reopen ──> selected valid destination
Eligible Record ── authorized nscmf.archive ──> Archived treatment
Cancelled ── terminal, no reopen
```

---

# PART B — FIRST-TIME SETUP

## 4. UF-SETUP-001 — Seeded Superadmin First Login

### Preconditions

- aplikasi baru;
- protected Superadmin sudah dibuat melalui seeding;
- first-time setup belum selesai.

### Flow

1. Protected Superadmin membuka Login.
2. Superadmin memasukkan credential valid.
3. System mengautentikasi account.
4. System mendeteksi initial setup belum selesai.
5. Superadmin diarahkan ke **Setup Wizard**.

Protected Superadmin tidak dapat dihapus, disable, soft-delete, atau downgrade.

---

## 5. UF-SETUP-002 — Configure Roles

1. Wizard menampilkan pilihan:
   - `Use Role Template`;
   - `Manual Role Configuration`.
2. Jika Template dipilih, system menyiapkan minimum:
   - Superadmin;
   - Requester;
   - Reviewer;
   - Approver.
3. Jika Manual dipilih, Superadmin mengonfigurasi role/permission sesuai boundary Business Rules/RBAC.
4. Protected Superadmin tetap mandatory.
5. Setelah setup selesai, eligible role/permission masih dapat dikelola melalui administration flow sesuai permission.

---

## 6. UF-SETUP-003 — Configure Unit / Division

1. Wizard menampilkan:
   - predefined Unit/Division template/mapping; atau
   - manual configuration.
2. Superadmin memilih salah satu pendekatan.
3. System menyimpan struktur organisasi yang dipilih.
4. Exact predefined entries masih TBD dan tidak boleh ditebak oleh implementation agent.

---

## 7. UF-SETUP-004 — Configure Scope

1. Superadmin menghubungkan user dengan Unit/Division yang relevan.
2. Reviewer memperoleh Reviewer Scope berdasarkan Unit/Division.
3. Approver memperoleh Approval Scope.
4. Satu Approver MAY memiliki scope beberapa Unit/Division.
5. Scope dapat diubah kemudian oleh actor yang memiliki permission administrasi yang sesuai.

---

## 8. UF-SETUP-005 — Complete Wizard

1. System menampilkan summary konfigurasi.
2. Superadmin mengonfirmasi.
3. Setup ditandai selesai.
4. Superadmin masuk ke Dashboard.
5. Core system settings tetap Superadmin-only.
6. User/role/unit administration selanjutnya MAY didelegasikan melalui permission granular.

---

# PART C — LOGIN, DASHBOARD, USER ADMINISTRATION

## 9. UF-AUTH-001 — Normal Login

1. User membuka Login.
2. User mengisi credential.
3. System memverifikasi account aktif dan credential valid.
4. Jika gagal, access ditolak tanpa mengungkap informasi sensitif yang tidak diperlukan.
5. Jika berhasil, authenticated session dibuat.
6. User diarahkan ke Dashboard.

Tidak ada self-registration.

---

## 10. UF-DASH-001 — Dashboard

Dashboard minimal menyediakan entry point yang relevant terhadap permission user:

- `Create New Form`;
- `History`;
- review/approval access jika actor eligible;
- administration/settings jika actor memiliki permission.

Dashboard metrics/recent activity detail mengikuti UI/UX specification dan tidak boleh mengubah core workflow.

---

## 11. UF-ADMIN-001 — Manage Users

Actor dengan user-management permission MAY:

1. membuka User Administration;
2. melihat eligible user;
3. create/edit normal user;
4. assign/remove role;
5. assign/move Unit/Division;
6. configure eligible scope;
7. reset credential/password sesuai security flow;
8. enable/disable normal user.

System MUST menolak action yang mencoba disable/downgrade/delete protected Superadmin.

Tidak ada user impersonation.

---

## 12. UF-ADMIN-002 — Manage Role / Permission / Organization

Actor dengan permission yang sesuai MAY:

- create/update eligible custom role;
- assign permission;
- manage Unit/Division;
- map user;
- configure Reviewer Scope;
- configure Approval Scope.

Core system settings tetap protected Superadmin-only.

---

# PART D — CREATE NEW FORM

## 13. UF-CREATE-001 — Start New NSCMF

### Flow

1. Requester memilih `Create New Form`.
2. System memverifikasi `nscmf.create` atau equivalent permission.
3. UI meminta Form Family:
   - `NSCMF - Activation`;
   - `NSCMF - Change`.
4. Requester memilih family.
5. System menampilkan subtype sesuai family.

### Activation Subtype

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### Change Subtype

- Maintenance;
- Upgrade;
- Emergency.

`Upgrade` tidak boleh diklasifikasikan otomatis hanya dari keyword.

---

## 14. UF-CREATE-002 — Choose Numbering Mode

Setelah family/subtype dipilih:

1. UI menampilkan:
   - `Automatic Number Generation`;
   - `Manual Number Entry`.
2. Requester memilih mode untuk **record tersebut**.
3. Automatic → system menyiapkan number berdasarkan rule final.
4. Manual → requester mengisi number dan system melakukan validation final.

Automatic numbering format masih TBD.

---

## 15. UF-CREATE-003 — Fill Activation Form

Activation form mengikuti business meaning workbook dan dikelompokkan secara web-friendly, termasuk konsep:

- Request Type;
- Service Information;
- Network / NOC Configuration;
- bandwidth/routing/DNS/IP information;
- onsite/customer/POP information;
- attachment input;
- sign-off context.

Exact field validation berada di `06_Validation_Rules.md`.

---

## 16. UF-CREATE-004 — Fill Change Form

Change UI harus menjaga semantics workbook:

### Purpose of Changes

- `(A) Purpose of Changes` = section, bukan pilihan;
- `Facing Challenges (Upgrade / Emergency)` = input content;
- `Maintenance Purpose` = input content;
- `Identified Problem (Please elaborate)` = input content.

### Service Impact

Service Impact menyediakan selectable values:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Single-select vs multi-select masih TBD hingga Validation/UI specification final.

### Other Change Inputs

Form juga merepresentasikan:

- Maintenance/Improvement Plan;
- Target KPI;
- Target date of execution;
- Monitoring period;
- Rollback scenario;
- Maintenance Announcement;
- Result of Changes section.

Kapan `Result of Changes` wajib diisi masih TBD.

---

# PART E — DRAFT, AUTOSAVE, CANCEL

## 17. UF-DRAFT-001 — Autosave

1. Requester mulai mengisi editable Draft.
2. System melakukan autosave pada interval/trigger yang akan ditentukan UI/technical specification.
3. Setiap persisted change tercatat pada audit:
   - actor;
   - timestamp;
   - changed element;
   - old value;
   - new value;
   - event context.
4. Autosave tidak berarti record siap Submit.

---

## 18. UF-DRAFT-002 — Manual Save Draft

1. Requester memilih `Save Draft`.
2. System menyimpan latest editable data.
3. Draft boleh incomplete.
4. Persisted changes diaudit.
5. Requester dapat lanjut, keluar, atau kembali kemudian.

---

## 19. UF-DRAFT-003 — Resume Draft

1. Requester membuka History/Own Records.
2. Requester membuka own Draft.
3. System memverifikasi ownership/permission/state.
4. Form terbuka editable.
5. Autosave dan Save Draft aktif kembali.

---

## 20. UF-DRAFT-004 — Cancel Draft

### Preconditions

- own record;
- masih Draft;
- belum pernah Submit.

### Flow

1. Requester memilih `Cancel Request`.
2. UI meminta confirmation.
3. Mandatory Cancel reason masih TBD.
4. User mengonfirmasi.
5. System mencatat Cancel event.
6. Record tetap di History.
7. Record menjadi permanently Cancelled.
8. Cancelled **tidak dapat Reopen**.
9. Untuk kebutuhan baru, user membuat NSCMF baru.

Setelah Submit, Cancel action tidak tersedia dan backend menolak direct request.

---

# PART F — SUBMISSION

## 21. UF-SUBMIT-001 — Submit for Review

### Preconditions

- Requester memiliki permission;
- record editable dan bukan terminal;
- submission validation lulus.

### Flow

1. Requester memilih `Submit`.
2. System menjalankan submission validation.
3. Jika gagal:
   - record tetap Draft;
   - UI menunjukkan error yang relevan.
4. Jika berhasil:
   - latest data dipersist;
   - submission event dicatat;
   - Requester normal editing dikunci;
   - record masuk Review flow.
5. Requester **tidak memilih satu Reviewer tertentu**.
6. Record menjadi visible kepada seluruh eligible Reviewer dengan matching Unit/Division scope.
7. Future notification hook MAY dipanggil, tetapi bukan blocker MVP.

---

# PART G — REVIEWER FLOW

## 22. UF-REVIEW-001 — Reviewer Opens Review Queue

1. Reviewer membuka Review/History/Queue.
2. System menampilkan relevant records berdasarkan Unit/Division scope dan current workflow state.
3. Reviewer membuka record.
4. System melakukan server-side permission/scope/state check.
5. View event dicatat sebagai viewer activity.
6. Membuka record **tidak** menjadikan Reviewer exclusive owner.
7. Eligible Reviewer lain tetap dapat membuka record.

---

## 23. UF-REVIEW-002 — Multiple Reviewer Participation

Reviewer model bersifat collaborative/non-exclusive.

Contoh valid:

```text
Reviewer A → View
Reviewer A → Review action
Reviewer B → View
Reviewer B → Review action / Return
Reviewer A → View revision
Reviewer C → Forward to Approval
```

System MUST mempertahankan seluruh actor pada timeline.

`assigned`, `modified by`, atau contributor context MAY memiliki lebih dari satu Reviewer sepanjang lifecycle record.

---

## 24. UF-REVIEW-003 — Reviewer Actions

Eligible Reviewer MAY memilih:

- `Forward / Complete Review`;
- `Return for Revision`;
- `Reject`.

Setiap action melalui permission, scope, state, dan validation check sebelum dipersist.

---

## 25. UF-REVIEW-004 — Forward to Approval

1. Reviewer memilih `Forward to Approval`.
2. System memvalidasi action.
3. Jika valid:
   - review event dan actor/timestamp dicatat;
   - record masuk Approval flow.
4. **Semua eligible Approver dengan matching Approval Scope** dapat melihat approval candidate.
5. Approval candidate tidak di-assign eksklusif kepada satu Approver.

---

## 26. UF-REVIEW-005 — Return for Revision

1. Reviewer memilih `Return for Revision`.
2. Comment/reason behavior mengikuti Validation/UI rule final.
3. System mencatat Return event.
4. Requester editing diaktifkan.
5. Requester memperbaiki record.
6. Setiap persisted revision diaudit old/new.
7. Requester `Resubmit`.
8. Record kembali ke Review.
9. Same Reviewer context SHOULD dipertahankan untuk continuity.
10. Reviewer lain dalam scope tetap visible dan eligible.
11. Siklus MAY berulang berkali-kali.

---

## 27. UF-REVIEW-006 — Reviewer Reject

1. Reviewer memilih `Reject`.
2. System memvalidasi permission/scope/state.
3. Mandatory Reject reason masih TBD.
4. Reject event dicatat.
5. Requester tidak dapat normal edit/resubmit.
6. Record tetap di History.
7. Recovery hanya melalui authorized Reopen.

---

# PART H — APPROVER FLOW

## 28. UF-APPROVAL-001 — Shared Approval Queue

1. Approver membuka Approval/History area.
2. System menampilkan approval candidates dalam matching Approval Scope.
3. Satu Approver MAY memiliki scope beberapa Unit/Division.
4. Semua Approver dengan matching scope dan permission dapat melihat candidate yang sama.
5. Approver A membuka candidate tidak mengunci Approver B/C.
6. View/activity dapat dicatat di timeline.

Approver model:

```text
Shared eligibility within scope
+
Non-exclusive access
+
Single final approval actor
```

---

## 29. UF-APPROVAL-002 — Approve

1. Eligible Approver memilih `Approve`.
2. System memvalidasi:
   - permission;
   - Approval Scope;
   - Review prerequisite;
   - current state;
   - validation.
3. Jika valid:
   - Approval event dicatat;
   - final approver identity/timestamp dicatat;
   - record menjadi Approved.
4. **Satu final approval dari satu eligible Approver sudah cukup.**
5. `Approved By` = actor yang berhasil mengeksekusi final Approve action.
6. Eligible Approver lain tidak perlu memberikan approval tambahan.
7. Approver lain tidak dapat menghasilkan approval kedua pada workflow iteration yang sudah Approved.
8. Record tetap tersedia di History dan normal editing terkunci.

Example:

```text
Approver A → View
Approver B → View
Approver C → Approve

Approved By = Approver C
```

Emergency Change mengikuti Approval flow yang sama.

---

## 30. UF-APPROVAL-003 — Return to Reviewer

1. Eligible Approver memilih `Return to Reviewer`.
2. System memvalidasi dan mencatat actor/timestamp/origin/destination.
3. Record kembali ke Review flow.
4. Eligible Reviewer dapat melakukan Review kembali.
5. Setelah Forward, record kembali menjadi visible kepada eligible Approver.

---

## 31. UF-APPROVAL-004 — Return to Requester

1. Eligible Approver memilih `Return to Requester`.
2. Return event dicatat.
3. Requester editing diaktifkan.
4. Requester melakukan revision.
5. Revision changes diaudit.
6. Requester `Resubmit`.
7. **Record wajib masuk Review lagi.**
8. Reviewer mereview revision terbaru.
9. Hanya setelah Reviewer Forward, record kembali ke Approval.

Forbidden shortcut:

```text
Approver → Requester → Resubmit → langsung Approval
```

---

## 32. UF-APPROVAL-005 — Approver Reject

1. Eligible Approver memilih `Reject`.
2. System melakukan permission/scope/state validation.
3. Reject event dicatat.
4. Record tetap di History.
5. Requester tidak dapat normal edit/resubmit.
6. Recovery hanya melalui authorized Reopen.

---

# PART I — REOPEN / REVERT

## 33. UF-REOPEN-001 — Reopen Rejected Record

### Preconditions

- record Rejected;
- actor adalah protected Superadmin **atau** memiliki explicit `nscmf.reopen`;
- actor memiliki valid record visibility/scope;
- current state eligible untuk Reopen.

### Flow

1. Authorized actor membuka Rejected record.
2. Actor memilih `Reopen`.
3. System meminta **mandatory reason**.
4. System menampilkan valid destination choices sesuai State Flow.
5. Actor memilih destination.
6. System melakukan authorization/state validation ulang.
7. Jika valid, system mencatat:
   - actor;
   - timestamp;
   - reason;
   - previous Rejected state;
   - selected destination;
   - previous rejection history.
8. Record bergerak ke destination.
9. Previous rejection tetap berada di timeline.

---

## 34. UF-REOPEN-002 — Reopen Approved Record

### Preconditions

- record Approved;
- actor adalah protected Superadmin **atau** memiliki explicit `nscmf.reopen`;
- actor memiliki valid record visibility/scope;
- state eligible untuk Reopen.

### Flow

1. Authorized actor membuka Approved record.
2. Actor memilih `Reopen / Revert`.
3. System meminta **mandatory reason**.
4. System menampilkan valid destination choices.
5. Actor memilih destination.
6. System melakukan authorization/state validation ulang.
7. System mencatat:
   - actor;
   - timestamp;
   - reason;
   - previous Approved state;
   - selected destination;
   - previous approval evidence.
8. Record bergerak ke selected destination.
9. Previous Approval tetap berada di timeline.

Default role template memberikan Reopen kepada Superadmin, tetapi RBAC MAY mendelegasikan `nscmf.reopen` kepada role lain.

---

# PART J — HISTORY, TIMELINE, EXPORT

## 35. UF-HISTORY-001 — Open History

1. User membuka `History`.
2. System menghitung effective visibility berdasarkan role, ownership, scope, dan additional custom permissions.
3. System hanya menampilkan record yang boleh dilihat user.

Default visibility:

| Actor | Visibility |
|---|---|
| Requester | Own records |
| Reviewer | Matching Unit/Division scope |
| Approver | Matching Approval Scope, dapat multi-unit |
| Protected Superadmin | All NSCMF |
| Custom Role | Permission + configured scope |

Multi-role visibility bersifat additive.

---

## 36. UF-HISTORY-002 — View Detail and Timeline

1. User membuka visible record.
2. System melakukan authorization check.
3. User melihat form detail dan relevant attachment.
4. User juga dapat melihat timeline **siapa melakukan apa** pada record.
5. Timeline dapat mencakup viewer, modifier, reviewer, approver, return, revision, reject, reopen, archive, dan timestamp sesuai audit data.
6. Timeline adalah read-only historical evidence untuk normal users.

---

## 37. UF-EXPORT-001 — Single Export

1. User membuka record yang visible.
2. User memilih Export.
3. System memverifikasi record visibility.
4. Jika valid, export dibuat dari current stored record.
5. PDF adalah minimum required format.
6. Additional format mengikuti specification final.
7. Export tidak mengubah workflow state.

View access secara business memberikan export eligibility.

---

## 38. UF-EXPORT-002 — Bulk Export

1. User membuka History.
2. User memilih beberapa record yang visible.
3. User memilih Bulk Export.
4. System melakukan visibility check per record.
5. Inaccessible record MUST NOT bocor melalui bulk operation.
6. Packaging output final masih ditentukan kemudian.

---

# PART K — ARCHIVE

## 39. UF-ARCHIVE-001 — Archive Record

### Preconditions

- actor adalah protected Superadmin atau memiliki `nscmf.archive`;
- actor memiliki valid record visibility;
- record berada pada archive-eligible state menurut State Flow final.

### Flow

1. Authorized actor membuka record.
2. Actor memilih `Archive`.
3. Mandatory Archive reason masih TBD.
4. System melakukan authorization/state check.
5. Jika valid:
   - Archive event dicatat;
   - record dikeluarkan dari default active view;
   - business data/status/history tidak dihapus.
6. Archived record tetap dapat dilihat oleh legitimate actor berdasarkan normal scope:
   - Superadmin → all;
   - Requester → own;
   - Reviewer → scoped;
   - Approver → scoped;
   - custom role → effective permission/scope.

Unarchive behavior masih TBD.

---

# PART L — NOTIFICATION HOOKS

## 40. UF-NOTIF-001 — Future Notification

Future system MAY memiliki notification hooks pada event:

- Submit;
- Return for Revision;
- Reject;
- Forward to Approval;
- Approve;
- Reopen.

Telegram dan WhatsApp/Baileys adalah candidate integration, bukan current priority atau final commitment.

Core workflow MUST tetap berfungsi tanpa notification integration.

---

# PART M — LOGOUT

## 41. UF-AUTH-002 — Logout

1. Authenticated user memilih Logout.
2. System mengakhiri session sesuai security specification.
3. User kembali ke Login.
4. Persisted Draft tetap tersimpan.

---

# PART N — ERROR / AUTHORIZATION FLOWS

## 42. UF-ERROR-001 — Unauthorized Direct Access

Jika user mencoba membuka record melalui direct URL/ID yang tidak visible:

1. backend melakukan authorization check;
2. access ditolak;
3. record data tidak dikirim kepada frontend.

---

## 43. UF-ERROR-002 — Stale Action / Concurrent Action

Karena Reviewer dan Approver bersifat non-exclusive, lebih dari satu actor dapat membuka record yang sama.

Sebelum workflow-changing action dipersist, system MUST memeriksa current state kembali.

Contoh:

```text
Approver A dan B membuka candidate yang sama.
Approver A berhasil Approve terlebih dahulu.
Approver B kemudian mencoba Approve dari screen yang stale.

→ backend melihat record sudah Approved
→ approval kedua ditolak
→ UI diminta refresh/current state
```

Technical transaction/locking strategy akan ditentukan pada architecture/database/API specification.

---

# PART O — USER FLOW SUMMARY BY ACTOR

## 44. Requester

```text
Login
→ Dashboard
→ Create Form
→ Activation/Change
→ Subtype
→ Auto/Manual Number
→ Fill
→ Autosave / Save Draft
→ (Cancel while Draft OR Submit)
→ wait Review
→ if Returned: Revise → Resubmit → Review again
→ if Rejected: normal flow stops
→ if Approved: read-only/history/export
```

---

## 45. Reviewer

```text
Login
→ Review Queue
→ Open scoped record (viewer logged)
→ Review
→ Forward OR Return OR Reject
→ if returned/resubmitted: same reviewer context + shared Reviewer eligibility
```

Reviewer is non-exclusive and multiple Reviewers may contribute.

---

## 46. Approver

```text
Login
→ Approval Queue
→ Open scoped candidate
→ Approve OR Return to Reviewer OR Return to Requester OR Reject
```

Approver is non-exclusive.

**One eligible Approver's final approval is sufficient.**

---

## 47. Authorized Reopen / Archive Actor

```text
Visible eligible record
→ permission check
→ Reopen (mandatory reason + target) OR Archive
→ audit event
→ state/lifecycle treatment
```

Default Superadmin memiliki permission tersebut. Custom/default role lain MAY mendapatkannya sesuai RBAC.

---

# PART P — CONFIRMED FLOW DECISIONS

## 48. Confirmed Decisions

| Area | Flow Decision |
|---|---|
| Setup | Wizard |
| Role setup | Template / Manual |
| Unit setup | Template/mapping / Manual |
| User role | Multi-role allowed |
| Form selection | Family → subtype → numbering → fields |
| Numbering | Auto/manual per record |
| Draft | Autosave + manual Save Draft |
| Draft changes | Fully audited |
| Cancel | Draft-only, permanent |
| Reviewer selection | No manual selection by Requester |
| Reviewer eligibility | Shared/non-exclusive within scope |
| Reviewer contributor | Multiple contributors allowed |
| Viewer log | Reviewer view can be logged |
| Revision | Unlimited cycles |
| Reviewer resubmit | Same reviewer context retained, others still eligible |
| Approval eligibility | Shared/non-exclusive within scope |
| Final approval | One eligible Approver is sufficient |
| Approved By | Final Approve actor |
| Approval return to Requester | Must pass Review again |
| Reject | Closed normal flow; recover via authorized Reopen |
| Reopen | Superadmin or explicit `nscmf.reopen`; mandatory reason; target selected |
| Archive | Superadmin or explicit `nscmf.archive` |
| Archived visibility | Follows normal scope; Superadmin global |
| Timeline | All legitimate viewers can see who did what |
| Export | View implies export |
| Notification | Future/draft only |
| Emergency | No workflow bypass |

---

# PART Q — OPEN ITEMS

## 49. Explicit TBDs

User Flow sengaja belum menebak:

- exact Unit/Division template entries;
- automatic number format;
- Service Impact single vs multi-select;
- exact point when Result of Changes becomes required;
- mandatory reasons selain Reopen;
- exact valid Reopen destinations;
- unarchive flow;
- search/filter UI details;
- export packaging/additional format;
- notification provider/timing;
- final workflow state names.

---

## 50. Next Document

Dokumen berikutnya adalah:

**`05_State_Status_Flow.md`**

State Flow harus mengubah seluruh semantic flow pada dokumen ini menjadi state machine authoritative, terutama:

- Draft;
- Submitted / Awaiting Review;
- review states;
- returned/revision states;
- Awaiting Approval;
- Approved;
- Rejected;
- Reopened destinations;
- Cancelled terminal state;
- Archive treatment;
- valid transition actor/permission;
- concurrency behavior untuk shared Reviewer dan Approver pools.
