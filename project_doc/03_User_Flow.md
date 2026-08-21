# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Synchronized through Confirmed Security Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

- PRD → apa yang dibangun;
- Business Rules → invariant bisnis;
- RBAC → siapa boleh melakukan apa;
- State Flow → authoritative lifecycle;
- Validation Rules → validitas input/action;
- UI/UX → presentation/interaction behavior;
- Tech Stack → implementation technology;
- System Architecture → component/execution/concurrency/audit/export topology;
- Security Rules → authentication/session, security gates, malware scanning, audit security, signing-key custody, public PDF verification;
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

Security/technical conditions such as session expiry, malware scan status, signing readiness, dan PDF verification result MUST NOT menjadi persistent NSCMF business state.

---

## 2. Actors

- **Protected Superadmin** — seeded administrator dan global visibility;
- **Requester** — membuat/mengajukan NSCMF dan menjadi default owner/editor untuk Change Result narrow flow;
- **Reviewer** — review berdasarkan Unit/Division scope;
- **Approver** — final approval berdasarkan Approval Scope;
- **Delegated Administrator** — non-Superadmin dengan explicit admin permissions;
- **Custom Role Actor** — granular permission combination;
- **System** — authentication, authorization, persistence, validation, Business Audit, Access Audit, Security Audit, workflow, malware scanning, queue/export, PDF signing/verification, artifact cleanup.
- **Public PDF Verifier Visitor** — unauthenticated visitor yang hanya boleh menggunakan narrow public PDF authenticity/currentness validation surface; bukan public NSCMF record viewer.

Satu user MAY memiliki beberapa role.

Current installation model = **single organization**. Unit/Division adalah internal organizational scope, bukan tenant.

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
  │                ├── Return(reason) → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                ├── Reject(reason) → REJECTED
  │                └── Forward → PENDING_APPROVAL
  │                                ↓
  │                          Shared Approver Pool
  │                            ├── Return Reviewer(reason) → PENDING_REVIEW
  │                            ├── Return Requester(reason) → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                            ├── Reject(reason) → REJECTED
  │                            └── one valid Approve → APPROVED
  │
  └── History
        ├── View Record
        ├── View Business Timeline
        ├── Export XLSX → queued → READY → download ≤ 7 days
        ├── Export PDF  → queued → render/sign if Approved → READY → download ≤ 7 days
        └── Bulk Export → queued

Public no-login utility:
PDF upload → malware CLEAN gate → signature/hash/issuance/currentness verification
→ VALID_CURRENT / VALID_SUPERSEDED / INVALID_MODIFIED / UNKNOWN
```

Exceptional lifecycle:

```text
REJECTED / APPROVED
  -- authorized Reopen(reason, destination) --> REVISION_REQUIRED or PENDING_REVIEW

APPROVED / REJECTED / CANCELLED
  -- authorized Archive(reason) --> same business status + is_archived=true
  -- authorized Unarchive(reason) --> same business status + is_archived=false

CANCELLED
  -- no Reopen --> permanent terminal
```

`REOPENED` dan `ARCHIVED` adalah events/treatments, bukan persistent business status.

Export job states seperti `QUEUED`, `PROCESSING`, `READY`, `FAILED`, `EXPIRED` adalah technical export states, bukan NSCMF business statuses.

---

# PART B — FIRST-TIME SETUP

## 4. UF-SETUP-001 — Seeded Superadmin First Login

1. Protected Superadmin membuka Login.
2. Memasukkan username + password valid.
3. System mengautentikasi account menggunakan standalone session authentication.
4. Jika credential adalah temporary/initial credential yang diwajibkan berubah, System mengarahkan ke mandatory password-change flow sebelum normal application use.
5. Jika initial setup belum selesai, System mengarahkan ke Setup Wizard setelah credential requirement selesai.
6. Protected Superadmin tidak dapat delete/disable/downgrade.
7. Required Approved-PDF signing identity/readiness MUST tersedia sesuai `10_Security_Rules.md`; missing/unusable required signing identity merupakan critical configuration/readiness condition dan tidak boleh dianggap normal-ready operation.

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

Unit/Division/Approval Scope tidak membuat tenant terpisah.

---

## 8. UF-SETUP-005 — Complete Wizard

System menampilkan summary, Superadmin mengonfirmasi, setup ditandai selesai, lalu masuk Dashboard. Core system settings tetap protected Superadmin-only.

---

# PART C — LOGIN, DASHBOARD, ADMINISTRATION

## 9. UF-AUTH-001 — Normal Login

1. User membuka Login.
2. User mengisi **username** dan **password**.
3. Current product policy: minimum password **6 characters**, tidak ada mandatory uppercase/lowercase/number/symbol composition rule, dan **tidak ada MFA** untuk current MVP.
4. System menerapkan server-side login throttling/progressive delay; failure response tidak boleh mengungkap apakah username tertentu ada.
5. System memverifikasi account aktif + credential.
6. Jika valid, Laravel session dibuat/regenerated dan user masuk ke authenticated flow.
7. Session policy: idle timeout **30 menit**, absolute lifetime **8 jam**, maximum **2 active sessions/account**.
8. Jika credential adalah temporary password hasil administrative create/reset, System mewajibkan password change sebelum normal Dashboard/application navigation.
9. Tidak ada self-registration.
10. External SSO/LDAP/MFA tidak menjadi bagian flow MVP.

---

## 10. UF-AUTH-002 — Mandatory Temporary Password Change

1. Admin-created/reset user berhasil authenticate menggunakan temporary password.
2. Normal application navigation/record access belum diberikan.
3. User mengisi password baru yang memenuhi confirmed minimum 6-character policy; tidak ada composition requirement.
4. Backend verifies temporary credential context and stores only secure password hash.
5. Temporary password berhenti berlaku setelah replacement berhasil.
6. Security Audit mencatat event tanpa menyimpan plaintext old/new/temporary password.
7. User melanjutkan ke normal application flow dengan session treatment sesuai `10_Security_Rules.md`.

---

## 11. UF-DASH-001 — Dashboard

Dashboard minimal menyediakan entry point sesuai permission:

- `Create New Form`;
- `History`;
- Review queue bila eligible;
- Approval queue bila eligible;
- Administration/Settings bila eligible.

Menu/summary hanya menampilkan data yang lolos visibility/scope user.

---

## 12. UF-ADMIN-001 — Manage Users

Actor dengan user-management permission MAY create/edit normal user, assign/remove role, assign/move Unit/Division, configure eligible scope, reset credential, enable/disable normal user.

Untuk password reset, role assignment/removal, permission assignment/removal, dan equivalent sensitive privilege/credential actions:

1. acting administrator diminta memasukkan current password kembali sebagai re-authentication;
2. jika re-auth gagal, target action tidak diterapkan;
3. create/reset credential menggunakan temporary password + mandatory replacement;
4. password reset, role/permission change, disablement, atau equivalent access-changing identity action mencabut **seluruh active sessions target user**;
5. jika actor melakukan security-sensitive change terhadap dirinya sendiri, session actor ikut direvoke sebagaimana applicable;
6. perubahan pada user lain tidak memaksa administrator logout hanya karena target-user sessions dicabut.

System MUST menolak action yang melanggar protected Superadmin invariant. Tidak ada impersonation.

---

## 13. UF-ADMIN-002 — Manage Role / Permission / Organization

Authorized actor MAY mengelola eligible custom role, permissions, Unit/Division, user mapping, Reviewer Scope, dan Approval Scope. Core system settings tetap protected Superadmin-only.

Sensitive role/permission/security configuration mutation mengikuti password re-authentication + Security Audit requirements dari `10_Security_Rules.md` dan tidak menciptakan business state baru.

---

# PART D — CREATE NEW FORM

## 14. UF-CREATE-001 — Start New NSCMF

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

## 15. UF-CREATE-002 — Choose Numbering Mode

User memilih:

- `Automatic Number Generation`; atau
- `Manual Number Entry`.

Current provisional automatic format:

```text
NSCMF-YYYYMM-#####
```

Manual number mengikuti provisional format/uniqueness Validation Rules. Request No MAY dikoreksi selama Draft, tetapi menjadi immutable setelah first successful Submit.

---

## 16. UF-CREATE-003 — Fill Activation

UI merepresentasikan business meaning workbook, termasuk Service Information, Reference, Existing/New Service blocks, RFS/SLA, Network/NOC data, bandwidth/routing/DNS/IP, domain/email/hosting, onsite/customer/POP, attachment, dan sign-off context.

Flow mengikuti subtype-conditional validation:

- Activation → New Service core block required;
- Upgrade/Downgrade → Existing + New Service core blocks required;
- Deactivation → Existing Service core block required.

Optional technical sections tetap dapat diisi dan harus valid format jika diisi.

---

## 17. UF-CREATE-004 — Fill Change

UI menjaga semantics workbook:

- `(A) Purpose of Changes` = section;
- Facing Challenges = input content;
- Maintenance Purpose = input content;
- Identified Problem = narrative input;
- Service Impact = **multi-select** NOC15/NOC23/NOC361/Regional/POP/Customer/Other;
- Other Impact Description muncul/wajib jika Other dipilih;
- Improvement Plan dan Target KPI = paired rows;
- Target date of execution;
- Monitoring period;
- rollback scenario;
- Maintenance Announcement;
- `(B) Result of Changes` = distinct data section.

Result of Changes tidak membuat state baru. Final result tidak wajib tersedia pada first Submit; started row harus complete. Sebelum Reviewer Forward, minimal satu complete Result row wajib tersedia.

---

# PART E — DRAFT, AUTOSAVE, CANCEL

## 18. UF-DRAFT-001 — Draft Creation and Autosave

1. New record berada pada `DRAFT`.
2. Requester mengisi form.
3. System autosave berdasarkan trigger/interval UI.
4. Autosave mengirim expected record version/concurrency token.
5. Backend memvalidasi ownership/editability dan `DRAFT_PERSIST`.
6. Jika version valid, latest data dipersist, Business Audit ditulis, dan version bertambah.
7. Jika version stale, System menolak stale write dan UI MUST NOT menampilkan false `Saved`.
8. Autosave tidak berarti record siap Submit.
9. Draft MAY incomplete dan incomplete submission-required fields tidak menghasilkan blocking behavior hanya untuk autosave/Save Draft.

---

## 19. UF-DRAFT-002 — Manual Save Draft

1. Requester memilih `Save Draft`.
2. Request membawa expected record version.
3. Jika current version/state/permission valid, latest editable data dipersist.
4. Draft boleh incomplete.
5. Persisted changes diaudit.
6. State tetap `DRAFT`.
7. Stale version menghasilkan conflict, bukan silent overwrite.

---

## 20. UF-DRAFT-003 — Resume Draft

Requester membuka own Draft dari History/Own Records. System memverifikasi ownership/permission/state, lalu form kembali editable dengan current version/context.

---

## 21. UF-DRAFT-004 — Cancel Draft

Preconditions:

- own record;
- `DRAFT`;
- belum pernah Submit.

Flow:

1. Requester memilih Cancel.
2. UI meminta confirmation.
3. Reason **Optional**.
4. Backend revalidates current state in workflow transaction boundary.
5. System mencatat event dan optional reason jika tersedia.
6. State menjadi `CANCELLED`.
7. Record tetap History.
8. `CANCELLED` tidak dapat Reopen.

---

# PART F — SUBMISSION

## 22. UF-SUBMIT-001 — Submit for Review

Preconditions: permission + ownership/access + submission validation.

1. Requester memilih Submit.
2. Backend membuka short workflow transaction dan mengunci current NSCMF row untuk final current-state decision.
3. System menjalankan field/conditional validation sesuai `06_Validation_Rules.md`.
4. Jika gagal, state tetap `DRAFT` dan UI menampilkan error yang dapat ditindaklanjuti.
5. Non-blocking warning MAY ditampilkan terpisah dari error, misalnya Upgrade/Emergency tanpa attachment.
6. Jika berhasil:
   - latest data dipersist;
   - Business Audit Submit dicatat dalam consistent transaction;
   - state `DRAFT -> PENDING_REVIEW`;
   - normal Requester editing locked;
   - semua eligible Reviewer matching scope memperoleh visibility.
7. Requester tidak memilih Reviewer tertentu.

`SUBMITTED` adalah event, bukan persistent state.

---

# PART G — REVIEWER FLOW

## 23. UF-REVIEW-001 — Open Review Queue

1. Reviewer membuka Review queue.
2. System menampilkan `PENDING_REVIEW` yang relevant berdasarkan Unit/Division scope.
3. Reviewer membuka record.
4. Backend memvalidasi permission/scope/current state.
5. Successful view/access menghasilkan separate Access Audit evidence sesuai `10_Security_Rules.md` / ERD policy.
6. Routine `View` tidak ditambahkan sebagai business workflow row pada normal Timeline.
7. **State tetap `PENDING_REVIEW`.**
8. Reviewer tidak menjadi exclusive owner; Reviewer lain tetap eligible.

---

## 24. UF-REVIEW-002 — Multiple Reviewer Participation

Contoh valid:

```text
Reviewer A → View (Access Audit)
Reviewer B → review activity
Reviewer C → Forward (Business Audit)
```

Contributor/workflow actor dipertahankan di Business Audit/Timeline. Routine viewer evidence dipertahankan melalui separate Access Audit dan tidak menjadi exclusive authorization lock.

---

## 25. UF-REVIEW-003 — Reviewer Actions

Dari `PENDING_REVIEW`, eligible Reviewer MAY:

- `Forward to Approval`;
- `Return for Revision`;
- `Reject`.

Setiap action melalui permission + scope + locked current-state + validation check.

Reason:

- Return → mandatory;
- Reject → mandatory;
- Forward comment → optional.

---

## 26. UF-REVIEW-004 — Forward to Approval

1. Reviewer memilih Forward.
2. Backend memulai short transaction, memperoleh row-level lock, lalu revalidates permission/scope/current state.
3. Untuk Change, Result gate MUST terpenuhi:
   - minimum satu complete Result row;
   - setiap used row complete;
   - tidak perlu seluruh lima rows.
4. Jika valid, state:

```text
PENDING_REVIEW -> PENDING_APPROVAL
```

5. Business Audit Forward/actor/timestamp dicatat dalam consistent action.
6. Semua eligible Approver matching Approval Scope melihat candidate.
7. Candidate tidak di-assign exclusive.

---

## 27. UF-REVIEW-005 — Return for Revision

1. Reviewer memilih Return.
2. UI meminta mandatory reason.
3. Backend memvalidasi reason + permission/scope/current state di workflow transaction boundary.
4. State:

```text
PENDING_REVIEW -> REVISION_REQUIRED
```

5. Requester editing diaktifkan.
6. Requester memperbaiki record menggunakan optimistic versioning; persisted changes diaudit.
7. Requester Resubmit.
8. Resubmit validation dijalankan kembali.
9. State:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

10. Same Reviewer context SHOULD retained; other scoped Reviewer tetap eligible.
11. Loop MAY repeat tanpa fixed maximum.

---

## 28. UF-REVIEW-006 — Reviewer Reject

1. Reviewer memilih Reject.
2. UI meminta mandatory reason.
3. Backend memperoleh current-state row lock dan memvalidasi permission/scope/current state/reason.
4. State:

```text
PENDING_REVIEW -> REJECTED
```

5. Reject Business Audit event + reason dicatat.
6. Normal Requester edit/resubmit berhenti.
7. Recovery hanya authorized Reopen.

---

## 29. UF-REVIEW-007 — Change Result Capture During Review

Untuk Change yang Result-nya belum tersedia pada first Submit:

1. record tetap `PENDING_REVIEW`;
2. Requester/owner dengan `nscmf.change.result.edit` melihat CTA khusus untuk mengisi/update Result;
3. UI hanya membuka Result Summary, Performance Information, dan Status rows;
4. planning/submitted fields lain tetap read-only;
5. request membawa expected version/concurrency token;
6. valid Result changes dipersist dan diaudit;
7. stale version menghasilkan conflict dan tidak boleh overwrite Result yang lebih baru;
8. state tetap `PENDING_REVIEW`;
9. started rows harus complete saat persistence/action gate yang relevan;
10. jika belum ada minimum satu complete Result row, Forward ke Approval ditolak.

Capability ini bukan general Requester edit pada `PENDING_REVIEW`.

---

# PART H — APPROVER FLOW

## 30. UF-APPROVAL-001 — Shared Approval Queue

1. Approver membuka Approval area.
2. System menampilkan `PENDING_APPROVAL` yang matching Approval Scope.
3. Semua eligible Approver dapat melihat candidate yang sama.
4. Opening/view tidak mengubah state dan tidak mengunci actor lain.
5. Successful access mengikuti separate Access Audit treatment.

---

## 31. UF-APPROVAL-002 — Approve

1. Eligible Approver memilih Approve.
2. Backend memperoleh row-level lock dalam short transaction.
3. Backend revalidates permission, scope, current state, review prerequisite, dan relevant validation.
4. Approve comment Optional.
5. Jika valid:

```text
PENDING_APPROVAL -> APPROVED
```

6. Approval Business Audit event, final actor, timestamp dicatat atomically.
7. Satu final approval cukup.
8. `Approved By` = successful transition actor.
9. Approver lain tidak dapat menghasilkan approval kedua untuk iteration yang sama.

---

## 32. UF-APPROVAL-003 — Return to Reviewer

1. Approver memilih Return to Reviewer.
2. UI meminta mandatory reason.
3. Backend revalidates current locked state.
4. Jika valid:

```text
PENDING_APPROVAL -> PENDING_REVIEW
```

Requester general editing tidak otomatis terbuka. Eligible Reviewer kembali memproses record.

---

## 33. UF-APPROVAL-004 — Return to Requester

1. Approver memilih Return to Requester.
2. UI meminta mandatory reason.
3. Backend revalidates current locked state.
4. State:

```text
PENDING_APPROVAL -> REVISION_REQUIRED
```

5. Requester revisi + Resubmit.
6. Resubmit selalu:

```text
REVISION_REQUIRED -> PENDING_REVIEW
```

7. Reviewer harus Forward kembali sebelum candidate kembali `PENDING_APPROVAL`.

Forbidden:

```text
REVISION_REQUIRED -> PENDING_APPROVAL
```

---

## 34. UF-APPROVAL-005 — Approver Reject

1. Approver memilih Reject.
2. UI meminta mandatory reason.
3. Backend revalidates current locked state + permission/scope/reason.
4. Jika valid:

```text
PENDING_APPROVAL -> REJECTED
```

Reject Business Audit event + reason dicatat. Normal flow berhenti sampai authorized Reopen.

---

# PART I — REOPEN / REVERT

## 35. UF-REOPEN-001 — Reopen Rejected

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
5. Backend memperoleh row lock dan revalidates permission/scope/archive flag/current state/reason/destination.
6. Jika valid, state langsung berpindah ke selected destination.
7. Reopen Business Audit event + reason + previous rejection evidence dicatat.

Tidak ada persistent `REOPENED` state.

---

## 36. UF-REOPEN-002 — Reopen/Revert Approved

Flow sama dengan Rejected, tetapi source state `APPROVED`.

Valid destinations hanya:

- `REVISION_REQUIRED`;
- `PENDING_REVIEW`.

Tidak boleh ke `DRAFT` atau `PENDING_APPROVAL`. Previous Approval tetap business timeline/history.

Reopen/Revert dapat menyebabkan previously issued exact signed PDF menjadi **genuine but superseded**. File tersebut tidak otomatis dianggap modified; public validator membedakan artifact integrity dari current business approval context.

---

# PART J — HISTORY, TIMELINE, EXPORT

## 37. UF-HISTORY-001 — Open History

System menghitung effective visibility:

| Actor | Visibility |
|---|---|
| Requester | Own records |
| Reviewer | Matching Unit/Division |
| Approver | Matching Approval Scope |
| Protected Superadmin | All NSCMF |
| Custom/multi-role | permission + configured scope union |

Archived records tidak bercampur dalam default active view; user dapat mengakses Archived filter/view jika visibility valid.

---

## 38. UF-HISTORY-002 — View Detail and Business Timeline

User yang legitimate melihat form detail, relevant attachments, current business status, separate archive treatment, dan **Business Timeline** siapa melakukan persisted business/workflow/lifecycle action.

Recommended record-detail information architecture:

- Form Detail;
- Timeline;
- Attachments.

Routine record access/view evidence berada pada separate Access Audit concern dan tidak memenuhi normal Business Timeline.

Business/Access/Security Audit authoritative evidence tidak memiliki age-based automatic purge. Hal ini berbeda dari temporary generated export binary 7-day cleanup.

---

## 39. UF-EXPORT-001 — Request Single Export

1. User memilih visible record.
2. User memilih format:
   - `Export XLSX`; atau
   - `Export PDF`.
3. System memverifikasi `nscmf.export` + record visibility.
4. System binds export request ke deterministic logical record snapshot/version pada saat request dibuat.
5. System membuat technical export request state `QUEUED` dan dispatch Database Queue job.
6. UI segera kembali tanpa menunggu OOXML/render/signing selesai.
7. Export request tidak mengubah NSCMF business status.

---

## 40. UF-EXPORT-002 — Background Exact-Template Generation

Worker memproses queued export:

1. load bound record snapshot/version;
2. resolve approved official NSCMF XLSX template version + matching mapping;
3. membuat private temporary copy; canonical template tidak dimodifikasi;
4. mengisi/mengganti **hanya mapped business fields dan native control states**;
5. mempertahankan layout, formatting, merged cells, row/column dimensions, drawings/media, print settings, dan native Form Controls lain;
6. menjalankan workbook integrity validation;
7. jika format XLSX → simpan exact generated XLSX private artifact;
8. jika format PDF → render filled XLSX melalui qualified spreadsheet renderer;
9. jika PDF snapshot `APPROVED` → lanjut ke cryptographic signing;
10. jika semua mandatory stage berhasil → mark technical export request `READY`;
11. set artifact validity/expiry = ready time + **168 hours / 7 days**.

`QUEUED/PROCESSING/READY/FAILED/EXPIRED` bukan NSCMF business states.

---

## 41. UF-EXPORT-003 — Approved PDF Signing

Untuk format PDF dengan bound snapshot `APPROVED`:

1. renderer menghasilkan exact PDF;
2. System menjalankan server-side `PdfSigningService`;
3. logical signer identity = **System/Organization**;
4. human `Approved By` tetap berasal dari final workflow Approver dan tetap dipetakan ke document content;
5. signing private key + corresponding public certificate/verification material are manually provisioned to protected server/environment storage according to `10_Security_Rules.md` and never come from GitHub/source/deployment artifact;
6. if required signing identity is missing/unusable, application readiness/configuration is critical-failed and Approved-PDF output cannot be treated as available;
7. jika signing berhasil, System calculates/stores exact SHA-256 of the **final signed PDF bytes** together with issuance/version/approval context required for later validation;
8. continue to READY artifact;
9. jika signing gagal → export `FAILED`; **tidak ada unsigned Approved-PDF fallback**.

Cryptographic signature + exact-issued-artifact hash bertujuan membuat post-issuance modification detectable. System tidak boleh menyatakan PDF secara fisik tidak mungkin diedit.

---

## 42. UF-EXPORT-004 — XLSX Download Treatment

XLSX:

- exact filled official template;
- tidak melalui cryptographic PDF signing flow;
- recipient MAY mengedit local downloaded copy;
- local XLSX edit tidak mengubah stored NSCMF record/audit di aplikasi.

---

## 43. UF-EXPORT-005 — Export Status / Download / Re-Download

1. Browser melakukan poll/refresh export status; WebSocket tidak diperlukan.
2. Saat state `READY`, authorized user melihat Download action.
3. Download endpoint re-checks current authorization/parent-record visibility.
4. Access/download evidence mengikuti separate Access Audit concern.
5. Artifact dapat di-download ulang selama belum expired.
6. READY artifact berlaku **168 jam / 7 hari**.
7. Setelah expiry, artifact tidak lagi disajikan sebagai valid download.
8. User MAY membuat export request baru setelah expiry.

---

## 44. UF-EXPORT-006 — Automatic Artifact Cleanup

1. Laravel Scheduler/cron-compatible process mencari generated export artifact yang sudah expired.
2. System menghapus private XLSX/PDF binary yang expired.
3. Cleanup MAY update technical artifact metadata sebagai expired/cleaned sesuai ERD.
4. Cleanup MUST NOT menghapus source NSCMF record, workflow history, Business Audit, Access Audit, Security Audit, Approval evidence, atau issuance/verification metadata yang dibutuhkan untuk historical PDF verification.
5. Exact scheduler invocation cadence ditentukan Environment/Deployment Architecture.

---

## 45. UF-EXPORT-007 — Bulk Export

1. User memilih multiple visible records dan target format supported.
2. System melakukan visibility/export eligibility check **per selected record**.
3. Inaccessible record MUST NOT bocor melalui bulk operation.
4. Bulk generation diproses asynchronously.
5. Setiap generated record output mengikuti exact-template, snapshot, renderer, signing, private binary retention, dan expiry rules yang sama.
6. Exact packaging beyond current XLSX/PDF behavior remains downstream.

---

## 46. UF-VERIFY-001 — Public Approved PDF Verification

Public validation adalah narrow verification utility, bukan public NSCMF portal.

1. Any visitor MAY membuka public PDF validation page without login, conceptually `/ispdfvalid`.
2. Visitor uploads **PDF only** for verification; request is rate-limited and upload is private/temporary.
3. Backend performs file-type/size safety checks and ClamAV scan before deep PDF parsing/verification.
4. Only explicit ClamAV `CLEAN` proceeds. `INFECTED`, scanner error/timeout/unavailable → verification fails closed.
5. `PdfVerificationService` verifies recognized NSCMF System/Organization issuer signature/public certificate material.
6. System calculates SHA-256 over exact uploaded bytes and compares with authoritative final-issued SHA-256 metadata.
7. System resolves issuance/export identity, bound record version/snapshot, approval iteration, issued-at, signer/certificate identity reference, and current approval/issuance context.
8. Result semantic:
   - `VALID_CURRENT` — recognized signature + exact hash + known issuance + related Approved issuance still current;
   - `VALID_SUPERSEDED` — genuine exact issued artifact but its approval/issuance is no longer current due to Reopen/Revert or a newer approved issuance;
   - `INVALID_MODIFIED` — integrity/signature/hash evidence indicates uploaded artifact is not the exact issued file / invalid modification occurred;
   - `UNKNOWN` — not recognized as a known NSCMF-issued artifact/issuer; this is not automatically a claim of malicious forgery.
9. Public result MUST disclose only minimum verification information and MUST NOT expose private form detail, History, attachments, Business Timeline, privileged audit, or storage paths.
10. Temporary public upload is deleted after processing and never becomes a normal NSCMF attachment.
11. TSA/external Trusted Timestamp Authority is not required for current MVP; validator MUST NOT claim an independent third-party trusted timestamp when none exists.

---

# PART K — ARCHIVE / UNARCHIVE

## 47. UF-ARCHIVE-001 — Archive Record

Preconditions:

- protected Superadmin atau explicit `nscmf.archive`;
- valid record visibility;
- state in `APPROVED`, `REJECTED`, `CANCELLED`;
- `is_archived=false`.

Flow:

1. Actor memilih Archive.
2. UI meminta mandatory reason.
3. Backend obtains current-state lock and memvalidasi permission/visibility/state/reason.
4. Jika valid:

```text
business_status = unchanged
is_archived = true
```

5. Archive Business Audit event + reason dicatat.
6. Record keluar dari default active view.
7. Normal scoped visibility tetap berlaku di archived/history view.
8. Archived record tidak dapat Reopen/business-transition sampai Unarchive.

Active states (`DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `PENDING_APPROVAL`) tidak dapat Archive.

---

## 48. UF-ARCHIVE-002 — Unarchive Record

Preconditions:

- `nscmf.archive`;
- valid visibility;
- `is_archived=true`.

Flow:

1. Actor memilih Unarchive.
2. UI meminta mandatory reason.
3. Backend obtains current-state lock and memvalidasi action/reason.
4. Result:

```text
business_status = unchanged
is_archived = false
```

5. Unarchive Business Audit event + reason dicatat.
6. `APPROVED`/`REJECTED` baru dapat Reopen setelah Unarchive.
7. `CANCELLED` tetap permanent terminal walaupun Unarchive.

---

# PART L — ATTACHMENT FLOW

## 49. UF-ATT-001 — Upload Attachment

Pada editable context (`DRAFT` atau `REVISION_REQUIRED`):

1. User memilih/browse/drag file melalui UI.
2. UI menampilkan current constraints.
3. Backend validates current state + permission + type + count + size.
4. Current limits:
   - max 10 files/record;
   - max 20 MB/file;
   - allowed baseline PDF/XLS/XLSX/DOC/DOCX/PNG/JPG/JPEG/TXT/CSV.
5. System places untrusted binary into controlled private quarantine/temporary storage; file is not yet usable/downloadable as normal attachment.
6. System invokes application `MalwareScanner` boundary backed by ClamAV/`clamd`.
7. Only explicit `CLEAN` permits promotion/persistence as normal private attachment.
8. `INFECTED`, scanner error, timeout, or unavailable scanner MUST NOT be treated as clean; file remains rejected/quarantined according to Security Rules.
9. Jika invalid/storage/scan/metadata persistence gagal, UI MUST NOT melaporkan attachment berhasil secara salah.
10. Business attachment mutation and security-relevant scan outcome are audited in their proper separate concerns.

Attachment tidak tersedia melalui narrow Result edit di `PENDING_REVIEW` pada current requirement.

---

## 50. UF-ATT-002 — Download Attachment

1. User meminta attachment pada visible NSCMF.
2. Backend re-checks parent-record visibility/authorization.
3. System resolves private attachment metadata.
4. Access/download evidence mengikuti Access Audit concern.
5. System memberikan authorized private download/stream only for an attachment that completed required security gate.

Private storage path sendiri bukan authorization token.

---

# PART M — NOTIFICATION

## 51. UF-NOTIF-001 — Future Notification

Future hooks MAY berada pada Submit, Return, Reject, Forward, Approve, Reopen. Telegram/WhatsApp-Baileys adalah candidates, bukan current blocker.

---

# PART N — LOGOUT / SESSION EXPIRY

## 52. UF-AUTH-003 — Logout

User Logout → current server-side session invalidated → kembali Login. Persisted Draft tetap tersimpan.

## 53. UF-AUTH-004 — Session Expiry / Revocation

User is returned to Login when:

- idle timeout 30 minutes is exceeded;
- absolute session lifetime 8 hours is exceeded;
- current session is revoked by password/role/permission/security change;
- account disabled;
- session otherwise invalidated by confirmed security policy.

UI warning before idle expiry MAY improve usability, but server-side expiry is authoritative. Session expiry/revocation does not alter NSCMF business state or delete persisted Draft.

---

# PART O — ERROR / AUTHORIZATION / CONCURRENCY / SECURITY

## 54. UF-ERROR-001 — Unauthorized Direct Access

Backend menolak direct URL/ID/API access jika visibility tidak valid dan MUST NOT mengirim record data ke frontend.

---

## 55. UF-ERROR-002 — Validation Failure

Jika Submit/Resubmit/Forward atau action lain gagal validation:

1. business state tidak berubah;
2. UI menampilkan field/group error yang actionable;
3. warning harus berbeda dari blocking error;
4. user tetap dapat memperbaiki data jika current state editable.

Draft persistence tidak diperlakukan seperti Submit validation.

---

## 56. UF-ERROR-003 — Stale Reviewer Action

Example:

```text
Reviewer A dan B membuka PENDING_REVIEW.
A memperoleh transaction lock dan Forward -> PENDING_APPROVAL.
B dari screen lama mencoba Reject sebagai Reviewer.
```

Saat B diproses, backend memperoleh lock/current state dan melihat record bukan lagi `PENDING_REVIEW`; stale action B ditolak. UI menunjukkan state berubah lalu refresh/current state.

---

## 57. UF-ERROR-004 — Stale Approver Action

```text
Approver A dan B membuka PENDING_APPROVAL.
A memperoleh transaction lock dan Approve -> APPROVED.
B kemudian mencoba Approve/Reject/Return dari stale screen.
```

Backend menolak action B. Hanya A final `Approved By` untuk iteration tersebut.

---

## 58. UF-ERROR-005 — Stale Draft / Result Save

Jika Requester mengirim Save/Autosave dengan expected version yang sudah tidak current:

1. backend menolak stale write;
2. newer persisted data tidak ditimpa;
3. UI menampilkan conflict/current-state feedback;
4. UI MUST NOT menampilkan false `Saved` state.

---

## 59. UF-ERROR-006 — Export Fidelity / Renderer Failure

Jika generated XLSX merusak expected template structure atau PDF renderer tidak menghasilkan approved exact template representation:

1. System MUST NOT menandai export `READY`;
2. user menerima export failure/retry feedback yang tidak mengekspos internal sensitive detail;
3. business record/state tidak berubah;
4. technical error dicatat;
5. system MUST NOT fallback ke redesigned HTML PDF yang berbeda dari official template.

---

## 60. UF-ERROR-007 — Approved PDF Signing Failure

Jika Approved PDF mandatory signing gagal:

1. export state menjadi/berakhir `FAILED` sesuai API/ERD representation;
2. unsigned PDF MUST NOT diberikan sebagai equivalent fallback;
3. NSCMF tetap `APPROVED`;
4. previous Approval Business Audit/sign-off tetap utuh;
5. user dapat retry export setelah technical/security issue resolved.

Missing/unusable required signing identity is more severe: it is a critical readiness/configuration condition and system MUST NOT advertise normal signing-ready operation.

---

## 61. UF-ERROR-008 — Malware Scanner Failure

If attachment or public-validator upload cannot obtain explicit ClamAV `CLEAN` because of detection, timeout, unavailable scanner, or scan error:

1. uploaded file is not promoted/treated as trusted or usable;
2. no false success/download state is shown;
3. NSCMF business state does not change solely because scan failed;
4. security/technical evidence is recorded without exposing sensitive internals.

---

# PART P — USER FLOW SUMMARY BY ACTOR

## 62. Requester

```text
Login
→ if temporary password: mandatory password change
→ Dashboard
→ Create Form
→ DRAFT
→ Autosave/Save with version checking
→ Cancel OR Submit
→ PENDING_REVIEW
   ├─ if Change: may Update Result via narrow result-only flow + version check
   ├─ if Returned: REVISION_REQUIRED → edit → Resubmit → PENDING_REVIEW
   ├─ if Rejected: normal flow stops
   └─ if Approved: read-only/history/export

Visible record
→ choose Export XLSX or PDF
→ queued
→ READY
→ download/re-download ≤ 7 days
```

---

## 63. Reviewer

```text
Open PENDING_REVIEW queue
→ View (Access Audit, no state change)
→ Forward OR Return(reason) OR Reject(reason)
```

Reviewer non-exclusive; multiple contributors allowed.

---

## 64. Approver

```text
Open PENDING_APPROVAL queue
→ View (Access Audit, no state change)
→ Approve OR Return Reviewer(reason) OR Return Requester(reason) OR Reject(reason)
```

Approver non-exclusive; one successful final Approve sufficient.

---

## 65. Authorized Lifecycle Actor

```text
Visible eligible record
→ permission/state/archive check
→ Reopen(reason + valid destination)
OR Archive(reason) / Unarchive(reason)
→ Business Audit event
```

Default Superadmin memiliki permissions; role lain MAY mendapatkannya explicitly.

---

## 66. Public PDF Verifier Visitor

```text
Open public validator
→ upload PDF
→ rate limit + PDF checks + ClamAV CLEAN
→ signature + exact SHA-256 + issuance/currentness verification
→ receive minimum-disclosure result only
→ temporary upload deleted
```

Visitor does not become an application user and receives no normal NSCMF record visibility.

---

# PART Q — CONFIRMED FLOW DECISIONS

## 67. Confirmed Decisions

| Area | Decision |
|---|---|
| Organization | Single organization / single installation |
| Setup | Wizard |
| Authentication | standalone username + password; no self-registration; min 6; no composition rule; no MFA |
| Login security | server-side throttling/progressive delay; non-enumerating failure response |
| Credential admin | temporary password + mandatory change; password re-auth for sensitive admin |
| Session | idle 30m; absolute 8h; maximum 2 active sessions/account; target revocation on access-changing identity changes |
| Multi-role | Allowed |
| Family selection | family → subtype → numbering → fields |
| Numbering | Auto/manual; provisional formats in Validation Rules |
| Draft | `DRAFT`, autosave + Save Draft, incomplete allowed, optimistic version conflict detection |
| Cancel | `DRAFT -> CANCELLED`, permanent; reason optional |
| Submit | `DRAFT -> PENDING_REVIEW` |
| Submitted | Event, not persistent state |
| Under Review | Not used |
| Reviewer View | Separate Access Audit; no state change; no business Timeline View row |
| Reviewer eligibility | Shared/non-exclusive |
| Reviewer Return/Reject | Mandatory reason |
| Revision | `REVISION_REQUIRED`, unlimited |
| Resubmit | Always `PENDING_REVIEW` |
| Forward | `PENDING_REVIEW -> PENDING_APPROVAL` |
| Approver eligibility | Shared/non-exclusive |
| Final approval | One eligible Approver sufficient |
| Approved By | Successful final human actor |
| Approver Return/Reject | Mandatory reason |
| Return Reviewer | `PENDING_APPROVAL -> PENDING_REVIEW` |
| Return Requester | `PENDING_APPROVAL -> REVISION_REQUIRED -> PENDING_REVIEW` |
| Reject | `REJECTED`, recoverable by Reopen |
| Reopen | Action/event; mandatory reason; `REJECTED`/`APPROVED` → Review or Revision only |
| Reopen to Draft/Approval | Forbidden |
| Archive | Independent flag; only Approved/Rejected/Cancelled; mandatory reason |
| Unarchive | Allowed with permission; status unchanged; mandatory reason |
| Change Service Impact | Multi-select; Other requires description |
| Change Result | Requester/owner `nscmf.change.result.edit`; minimum one complete row before Forward; optimistic version check; no new state |
| Attachment | Optional; max 10 files, 20 MB/file, current allowlist + ClamAV CLEAN gate |
| Business Timeline | Business mutation/workflow/lifecycle actions only |
| Access Audit | Separate from Business Timeline |
| Authoritative audit retention | Business/Access/Security Audit have no age-based purge |
| Export formats | User chooses XLSX or PDF |
| Export execution | All single/bulk generation asynchronous |
| Export snapshot | Deterministic logical record snapshot/version |
| Export fidelity | XLSX/PDF preserve official XLSX template exactly; PDF comes from filled spreadsheet representation |
| Approved PDF | Cryptographically signed by System/Organization identity |
| Signing custody | manually provisioned server-side; private key never GitHub/source/deployment; missing required identity critical readiness failure |
| XLSX | No PDF-signing flow; local copy may be edited |
| Export binary retention | READY artifact re-downloadable 168 hours / 7 days then scheduled binary cleanup |
| Public PDF validator | no login; PDF only; rate-limited; ClamAV; signature + exact SHA-256 + issuance/currentness |
| Validator results | current / superseded / modified-invalid / unknown |
| TSA | Not required current MVP |
| Emergency | Same Review + Approval flow |
| Workflow concurrency | Short DB transaction + row-level lock/current-state revalidation |
| Draft/Result concurrency | Optimistic version conflict detection |
| Tech baseline | Laravel + Inertia + Vue + MySQL modular monolith per `08`/`09` |

---

# PART R — OPEN ITEMS

## 68. Explicit Downstream TBDs

- exact Unit/Division template entries;
- official company NSCMF numbering SOP/sample;
- search/filter details beyond confirmed baseline;
- additional export format/bulk packaging beyond XLSX/PDF;
- notification provider/timing;
- performance/availability targets;
- backup/restore/DR/RPO/RTO;
- exact deployment topology/provider;
- exact certificate file format/path/provider/CA if external trust beyond the confirmed NSCMF issuer/validator model is later required.

Password/MFA/session policy, temporary credential flow, sensitive re-auth/session revocation, ClamAV malware gate, permanent authoritative audit policy, signing-key custody/readiness behavior, no-TSA MVP, public PDF validator, exact XLSX/PDF template fidelity, asynchronous export, 168-hour export-binary retention, Approved-PDF signing requirement, Access Audit separation, and hybrid concurrency are **not TBD**.

---

## 69. Current Documentation Progress

`05_State_Status_Flow.md` mengunci lifecycle authoritative, `06_Validation_Rules.md` mengunci input/action validity, `07_UI_UX_Specification.md` mengunci UI behavior, `08_Tech_Stack_Specification.md` mengunci technology baseline, dan `09_System_Architecture.md` mengunci component/execution/concurrency/audit/export architecture.

Security decisions telah dikonfirmasi dan dokumen berikutnya yang menjadi authority detailnya adalah:

**`10_Security_Rules.md`**.