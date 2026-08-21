# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Synchronized through Confirmed Team/Permission/Spatie Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

- PRD → apa yang dibangun;
- Business Rules → invariant bisnis;
- RBAC → siapa boleh melakukan apa melalui permission-centric model;
- State Flow → authoritative lifecycle dan workflow iteration;
- Validation Rules → validitas input/action;
- UI/UX → presentation/interaction behavior;
- Tech Stack → implementation technology;
- System Architecture → component/execution/concurrency/audit/export topology;
- Security Rules → authentication/session, security gates, malware scanning, audit security, signing-key custody, public PDF verification;
- User Flow → urutan interaksi user dan respons sistem.

Canonical business states:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Technical/security conditions MUST NOT become NSCMF business states.

---

## 2. Actors

- **Protected Superadmin** — seeded administrator, global operational visibility, protected invariants;
- **Requester** — membuat/mengajukan own NSCMF dan menjadi default owner/editor untuk Change Result narrow flow;
- **Reviewer** — actor dengan required Review permission;
- **Approver** — actor dengan required Approval permission;
- **Delegated Administrator** — non-Superadmin dengan explicit admin permissions;
- **Custom Role Actor** — actor yang memperoleh combination of permissions through roles;
- **System** — authentication, authorization, persistence, validation, audit, workflow, malware scanning, queue/export, PDF signing/verification, artifact cleanup;
- **Public PDF Verifier Visitor** — unauthenticated visitor untuk narrow PDF validation surface only.

Satu user MAY memiliki beberapa role.

Organization model = **single organization** with **Team** as organizational/profile data. There is no Unit/Division and Team is not an authorization scope.

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
  │              (permission-based)
  │                ├── Return(reason) → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                ├── Reject(reason) → REJECTED
  │                └── Forward → PENDING_APPROVAL
  │                                ↓
  │                          Shared Approver Pool
  │                          (permission-based)
  │                            ├── Return Reviewer(reason) → PENDING_REVIEW
  │                            ├── Return Requester(reason) → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                            ├── Reject(reason) → REJECTED
  │                            └── one valid Approve → APPROVED
  │
  └── History
        ├── View authorized Record
        ├── View Business Timeline
        ├── Export XLSX → queued → READY → download ≤ 7 days
        ├── Export PDF → queued → render/sign if Approved → READY → download ≤ 7 days
        └── Bulk Export → queued

Public utility:
PDF upload → malware CLEAN gate → signature/hash/issuance/currentness verification
→ VALID_CURRENT / VALID_SUPERSEDED / INVALID_MODIFIED / UNKNOWN
```

Exceptional lifecycle:

```text
REJECTED / APPROVED
  -- Reopen(reason, destination) --> REVISION_REQUIRED or PENDING_REVIEW
  -- starts next workflow iteration

APPROVED / REJECTED / CANCELLED
  -- Archive(reason) --> same business status + is_archived=true
  -- Unarchive(reason) --> same business status + is_archived=false

CANCELLED
  -- no Reopen --> permanent terminal
```

Export states such as `QUEUED`, `PROCESSING`, `READY`, `FAILED`, `EXPIRED` remain technical states only.

---

# PART B — FIRST-TIME SETUP

## 4. UF-SETUP-001 — Seeded Superadmin First Login

1. Protected Superadmin opens Login.
2. Enters valid username + password.
3. System authenticates using standalone session authentication.
4. If credential is temporary/initial and must change, System requires password replacement before normal use.
5. If initial setup incomplete, System opens Setup Wizard.
6. Protected Superadmin cannot delete/disable/downgrade/lose protected role.
7. Required Approved-PDF signing identity/readiness follows `10_Security_Rules.md`.

## 5. UF-SETUP-002 — Configure Roles

Wizard offers:

- `Use Role Template`;
- `Manual Role Configuration`.

Template minimum: Superadmin, Requester, Reviewer, Approver.

Permissions are normally assigned to Roles; Roles are assigned to Users. Direct permission-to-user administration is not part of current MVP.

## 6. UF-SETUP-003 — Configure Team

Wizard allows creation/configuration of Team master data and user organizational Team assignment.

Important:

```text
Business Team ≠ Spatie Teams
```

Team is organizational/profile data only and has no effect on Review/Approval authorization.

## 7. UF-SETUP-004 — Configure Users and Role Assignment

1. Create eligible normal user.
2. Assign one organizational Team/profile association according to final ERD.
3. Assign one or more Roles.
4. Effective permissions come through role permission union.
5. No Reviewer Scope or Approval Scope configuration exists.
6. Team change later does not automatically change permissions.

## 8. UF-SETUP-005 — Complete Wizard

System displays summary, Superadmin confirms, setup is marked complete, then enters Dashboard. Core system settings remain protected Superadmin-only.

---

# PART C — LOGIN, DASHBOARD, ADMINISTRATION

## 9. UF-AUTH-001 — Normal Login

1. User opens Login.
2. Enters **username** and **password**.
3. Password minimum 6; no composition requirement; no MFA.
4. Server applies login throttling/progressive delay and non-enumerating failures.
5. System verifies account active + credential.
6. If valid, session is created/regenerated.
7. Session policy = idle 30m, absolute 8h, max 2 active sessions/account.
8. Temporary-password account must replace password before normal navigation.
9. No self-registration.
10. Login/logout are authentication/session operations, not Spatie permission rows.

## 10. UF-AUTH-002 — Mandatory Temporary Password Change

1. User authenticates with temporary password.
2. Normal navigation remains blocked.
3. User submits new password meeting minimum 6 rule.
4. Backend stores secure hash and invalidates temporary credential.
5. Security Audit records safe event without plaintext password.
6. User proceeds according to current session policy.

## 11. UF-DASH-001 — Dashboard

Dashboard offers only applicable entry points:

- `Create New Form`;
- `History`;
- Review queue if user has applicable Review permissions;
- Approval queue if user has applicable Approval permissions;
- Administration/Settings if user has applicable admin permissions.

Team does not determine whether Review/Approval menu exists.

## 12. UF-ADMIN-001 — Manage Users

Actor with required user-management permissions MAY create/edit eligible normal user, assign/remove roles, assign/move Team, reset credential, enable/disable normal user.

Sensitive password/role/permission actions:

1. acting admin re-enters current password;
2. failed re-auth → action unapplied;
3. create/reset uses temporary password + mandatory replacement;
4. password/role/effective-permission/disablement changes revoke affected target-user sessions;
5. role permission changes must account for all users affected by that role;
6. changing Team alone is not an authorization change and does not grant/revoke Review/Approval capability;
7. protected Superadmin invariant remains.

## 13. UF-ADMIN-002 — Manage Role / Permission / Team

Authorized actor MAY manage eligible custom roles, assign/sync permissions to roles, manage Team master data, and assign users to Team.

There is no Reviewer Scope/Approval Scope administration surface.

Spatie `teams` feature remains disabled and direct-user permission assignment is not exposed as normal MVP administration.

---

# PART D — CREATE NEW FORM

## 14. UF-CREATE-001 — Start New NSCMF

1. User selects `Create New Form`.
2. Backend verifies `nscmf.create`.
3. User chooses family: Activation or Change.
4. User chooses subtype.

Activation:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

Change:

- Maintenance;
- Upgrade;
- Emergency.

Keyword `Upgrade` never determines family automatically.

## 15. UF-CREATE-002 — Choose Numbering Mode

User chooses Automatic Number Generation or Manual Number Entry.

Current provisional automatic format:

```text
NSCMF-YYYYMM-#####
```

Request No may be corrected during Draft but becomes immutable after first successful Submit.

## 16. UF-CREATE-003 — Fill Activation

UI represents workbook business meaning: Service Information, Reference, Existing/New Service blocks, RFS/SLA, NOC/network, bandwidth/routing/DNS/IP, domain/email/hosting, onsite/customer/POP, attachment, sign-off context.

Subtype-conditional validation follows `06_Validation_Rules.md`.

## 17. UF-CREATE-004 — Fill Change

UI preserves:

- Purpose of Changes section;
- Facing Challenges;
- Maintenance Purpose;
- Identified Problem;
- Service Impact multi-select;
- Other Impact Description if Other;
- Plan/KPI paired rows;
- Target Date;
- Monitoring Period;
- Rollback;
- Announcement;
- Result of Changes distinct section.

First Submit may have zero Result rows. Before Reviewer Forward, at least one complete Result row is required.

---

# PART E — DRAFT, AUTOSAVE, CANCEL

## 18. UF-DRAFT-001 — Draft and Autosave

1. New record = `DRAFT`.
2. Requester fills form.
3. Autosave sends expected record version.
4. Backend checks required permission + ownership + editable state + `DRAFT_PERSIST`.
5. Valid version → persist + Business Audit + version increment.
6. Stale version → reject conflict; no false `Saved`.
7. Draft may be incomplete.

## 19. UF-DRAFT-002 — Manual Save Draft

Same permission/ownership/version behavior as autosave. State remains `DRAFT`.

## 20. UF-DRAFT-003 — Resume Draft

Requester opens own Draft from History/Own Records. Backend verifies authorization + ownership + state before editing.

## 21. UF-DRAFT-004 — Cancel Draft

Preconditions:

- owns record;
- `DRAFT`;
- never successfully submitted;
- `nscmf.cancel`.

Cancel reason Optional. Successful action → `CANCELLED`; no Reopen.

---

# PART F — SUBMISSION

## 22. UF-SUBMIT-001 — Submit for Review

1. Requester selects Submit.
2. Backend opens short workflow transaction and locks current record row.
3. Revalidates `nscmf.submit`, ownership, state, field/business validation.
4. If failure: state remains `DRAFT`.
5. Warnings remain distinct from blocking errors.
6. If successful:
   - latest valid data persisted;
   - Business Audit Submit recorded;
   - `DRAFT -> PENDING_REVIEW`;
   - first workflow iteration established;
   - normal Requester edit locked;
   - users with required Review permissions become shared Reviewer pool for the eligible state.
7. Requester does not choose a Reviewer.
8. Team is not considered in Reviewer eligibility.

---

# PART G — REVIEWER FLOW

## 23. UF-REVIEW-001 — Open Review Queue

1. User with applicable Review permission opens Review queue.
2. System returns authorized `PENDING_REVIEW` candidates according to permission/resource policy, **not Team**.
3. Reviewer opens record.
4. Backend verifies session, view authorization, applicable permission/state.
5. Successful view produces separate Access Audit evidence where configured.
6. Routine View does not enter Business Timeline.
7. State stays `PENDING_REVIEW`.
8. Reviewer does not become exclusive owner.

## 24. UF-REVIEW-002 — Multiple Reviewer Participation

Valid example:

```text
Reviewer A → View (Access Audit)
Reviewer B → review activity
Reviewer C → Forward (Business Audit)
```

No Team matching or scope assignment is required.

## 25. UF-REVIEW-003 — Reviewer Actions

From `PENDING_REVIEW`, action requires the exact permission:

- `nscmf.review.forward` → Forward;
- `nscmf.review.return` → Return for Revision;
- `nscmf.review.reject` → Reject.

Return/Reject reason mandatory; Forward comment optional.

## 26. UF-REVIEW-004 — Forward to Approval

1. Reviewer selects Forward.
2. Backend obtains row lock and revalidates required permission/current state.
3. Change additionally requires Result gate.
4. If valid:

```text
PENDING_REVIEW -> PENDING_APPROVAL
```

5. Business Audit records Forward actor/timestamp.
6. Users with required Approval permissions become shared Approver pool for the eligible state.
7. No exclusive assignment; no Team/Approval Scope match.

## 27. UF-REVIEW-005 — Return for Revision

1. Reviewer selects Return.
2. Mandatory reason.
3. Backend validates permission/current state/reason.
4. `PENDING_REVIEW -> REVISION_REQUIRED`.
5. Requester editing enabled.
6. Revision persists via optimistic versioning + Business Audit.
7. Resubmit validates again.
8. `REVISION_REQUIRED -> PENDING_REVIEW`.
9. Workflow remains in the same current iteration.
10. Any actor with required Review permission remains eligible; no exclusive continuity lock.

## 28. UF-REVIEW-006 — Reviewer Reject

1. Reviewer selects Reject.
2. Mandatory reason.
3. Backend validates `nscmf.review.reject` + state/reason under row lock.
4. `PENDING_REVIEW -> REJECTED`.
5. Business Audit records Reject.
6. Normal Requester flow stops until authorized Reopen.

## 29. UF-REVIEW-007 — Change Result Capture

Requester/owner with `nscmf.change.result.edit` may edit Result-only fields during `PENDING_REVIEW`:

- Result Summary;
- Performance Information;
- Status.

Planning fields remain locked. Expected version required. Persisted result changes audited. State stays `PENDING_REVIEW`.

---

# PART H — APPROVER FLOW

## 30. UF-APPROVAL-001 — Shared Approval Queue

1. User with applicable Approval permissions opens Approval area.
2. System returns authorized `PENDING_APPROVAL` candidates based on permission/resource policy, not Team.
3. Multiple eligible Approvers may see same candidate.
4. View does not assign/lock actor.
5. Access follows Access Audit treatment.

## 31. UF-APPROVAL-002 — Approve

1. Actor selects Approve.
2. Backend obtains row lock.
3. Revalidates `nscmf.approve`, current state, review prerequisite, validation, archive/security prerequisites.
4. Comment Optional.
5. Valid action:

```text
PENDING_APPROVAL -> APPROVED
```

6. Business Audit + final actor/timestamp recorded atomically.
7. One final approval is sufficient.
8. `Approved By` = successful actor.
9. Stale second Approver action denied.

## 32. UF-APPROVAL-003 — Return to Reviewer

Required `nscmf.approval.return_reviewer` + mandatory reason + valid current state.

```text
PENDING_APPROVAL -> PENDING_REVIEW
```

Requester general editing remains locked. Same workflow iteration continues.

## 33. UF-APPROVAL-004 — Return to Requester

Required `nscmf.approval.return_requester` + mandatory reason.

```text
PENDING_APPROVAL -> REVISION_REQUIRED
-> Resubmit -> PENDING_REVIEW
```

Same workflow iteration continues; Reviewer must Forward again before Approval.

## 34. UF-APPROVAL-005 — Approver Reject

Required `nscmf.approval.reject` + mandatory reason + valid state.

```text
PENDING_APPROVAL -> REJECTED
```

Normal flow stops until Reopen.

---

# PART I — REOPEN / REVERT

## 35. UF-REOPEN-001 — Reopen Rejected

Preconditions:

- `REJECTED`;
- not archived;
- `nscmf.reopen`;
- authorized record access;
- mandatory reason;
- valid destination.

Destination only `REVISION_REQUIRED` or `PENDING_REVIEW`.

Backend row-locks and revalidates all prerequisites. Successful Reopen records previous state/reason and **starts the next workflow iteration**.

No Team/scope check.

## 36. UF-REOPEN-002 — Reopen Approved

Same as Rejected, source `APPROVED`.

Previous Approval remains historical evidence. Successful Reopen starts next workflow iteration and may cause earlier genuine signed PDF to become `VALID_SUPERSEDED`, not modified.

---

# PART J — HISTORY, TIMELINE, EXPORT

## 37. UF-HISTORY-001 — Open History

Record visibility uses permissions + applicable resource/ownership rules. Team is not a filter for authorization.

Default active view excludes archived records; authorized user can use Archived filter/view where allowed.

## 38. UF-HISTORY-002 — Detail and Business Timeline

Authorized viewer sees form detail, relevant attachments, current status, archive treatment, and Business Timeline.

Routine access/view evidence stays in Access Audit. Business/Access/Security Audit has no age-based purge.

## 39. UF-EXPORT-001 — Request Export

1. User selects authorized record.
2. Chooses XLSX or PDF.
3. Backend checks `nscmf.export` + resource authorization.
4. System creates **immutable deterministic export snapshot** containing the logical state needed for exact output, bound to record version/workflow iteration/template context.
5. System creates technical export request `QUEUED` and dispatches DB Queue job.
6. UI returns immediately.

## 40. UF-EXPORT-002 — Background Exact Generation

Worker:

1. reads immutable bound snapshot, not latest mutable record;
2. resolves official template version/mapping;
3. copies template privately;
4. patches only mapped fields/native controls;
5. validates workbook integrity;
6. outputs XLSX or renders PDF through qualified spreadsheet renderer;
7. if Approved PDF, calls `PdfSigningService`;
8. stores private READY artifact only after all mandatory stages succeed;
9. READY binary expires after 168h/7d.

## 41. UF-EXPORT-003 — Approved PDF Signing

Logical signer = System/Organization; human `Approved By` remains workflow actor.

Signing key/certificate manually provisioned in protected environment. Successful signing → calculate/store SHA-256 of final signed bytes + issuance/workflow-iteration metadata. Failure → export `FAILED`, no unsigned fallback.

## 42. UF-EXPORT-004 — XLSX

Exact template output; no PDF signing; local recipient edits do not alter NSCMF source data.

## 43. UF-EXPORT-005 — Download/Re-Download

READY artifact download rechecks authorization. Re-download allowed until expiry. Download/access creates Access Audit as configured.

## 44. UF-EXPORT-006 — Cleanup

Scheduler removes expired binary but never source record, workflow history, authoritative audits, Approval evidence, immutable/historical verification metadata needed for issued-PDF validation.

## 45. UF-EXPORT-007 — Bulk Export

Checks authorization per selected record and processes asynchronously. Inaccessible record cannot leak through bulk operation.

## 46. UF-VERIFY-001 — Public PDF Verification

Public no-login utility:

1. PDF-only upload;
2. rate limit + private temp storage;
3. ClamAV explicit CLEAN;
4. signature/recognized issuer verification;
5. SHA-256 exact uploaded bytes vs authoritative issuance;
6. resolve workflow iteration/issuance/currentness;
7. return `VALID_CURRENT`, `VALID_SUPERSEDED`, `INVALID_MODIFIED`, or `UNKNOWN`;
8. disclose minimum information only;
9. delete temporary upload;
10. no TSA claim current MVP.

---

# PART K — ARCHIVE / ATTACHMENT / SESSION

## 47. UF-ARCHIVE-001 — Archive

Requires `nscmf.archive`, authorized record access, state in `APPROVED|REJECTED|CANCELLED`, not archived, mandatory reason.

Result:

```text
business_status unchanged
is_archived = true
```

## 48. UF-ARCHIVE-002 — Unarchive

Requires `nscmf.archive`, authorized access, `is_archived=true`, mandatory reason.

Status unchanged. Approved/Rejected can Reopen only after Unarchive. Cancelled remains permanent.

## 49. UF-ATT-001 — Upload Attachment

Editable context:

1. permission/state validation;
2. type/count/size validation;
3. private quarantine;
4. ClamAV scan;
5. explicit CLEAN only → promote normal private attachment;
6. infected/error/timeout/unavailable → fail closed;
7. mutation/security evidence in correct audit concerns.

## 50. UF-ATT-002 — Download Attachment

Backend rechecks parent record authorization; only CLEAN attachment downloadable. Private storage path is not authorization.

## 51. UF-AUTH-003 — Logout

Logout invalidates current server-side session. Persisted Draft remains.

## 52. UF-AUTH-004 — Session Expiry / Revocation

Return to Login after idle 30m, absolute 8h, security revocation, account disablement, or invalid session. Business state unchanged.

---

# PART L — ERROR / CONCURRENCY

## 53. UF-ERROR-001 — Unauthorized Direct Access

Backend denies direct URL/ID/API resource access when authorization fails and does not leak record data.

## 54. UF-ERROR-002 — Validation Failure

State remains unchanged; UI shows actionable error; warning remains separate.

## 55. UF-ERROR-003 — Stale Reviewer Action

If Reviewer A changes state first, stale conflicting action from Reviewer B is rejected after locked current-state revalidation.

## 56. UF-ERROR-004 — Stale Approver Action

If Approver A Approves first, stale action from B is rejected; only A is final Approved By for that iteration.

## 57. UF-ERROR-005 — Stale Draft / Result Save

Expected-version mismatch → reject write; never silently overwrite; no false Saved.

## 58. UF-ERROR-006 — Export Fidelity Failure

Template/renderer failure → export FAILED, no HTML redesign fallback, NSCMF state unchanged.

## 59. UF-ERROR-007 — Signing Failure

Approved PDF signing failure → export FAILED; no unsigned equivalent; NSCMF remains APPROVED.

## 60. UF-ERROR-008 — Malware Scanner Failure

No explicit CLEAN → file not promoted/usable; no false success; NSCMF business state unchanged solely because scan failed.

---

# PART M — ACTOR SUMMARY

## 61. Requester

```text
Login
→ temporary password change if required
→ Create
→ DRAFT
→ Save/Autosave
→ Cancel OR Submit
→ PENDING_REVIEW
   ├─ Change Result-only update if eligible owner
   ├─ Returned → REVISION_REQUIRED → Resubmit
   ├─ Rejected → normal flow stops
   └─ Approved → read-only/history/export
```

## 62. Reviewer

```text
required Review permission
→ Open PENDING_REVIEW queue
→ View
→ Forward OR Return(reason) OR Reject(reason)
```

No Team/scope matching. Non-exclusive, multiple contributors allowed.

## 63. Approver

```text
required Approval permission
→ Open PENDING_APPROVAL queue
→ View
→ Approve OR Return Reviewer(reason) OR Return Requester(reason) OR Reject(reason)
```

No Team/scope matching. One final Approve sufficient.

## 64. Authorized Lifecycle Actor

```text
required lifecycle permission
+ authorized record access
+ state/archive/reason prerequisites
→ Reopen OR Archive/Unarchive
```

## 65. Public Verifier

```text
public PDF upload
→ ClamAV CLEAN
→ signature + exact hash + issuance/iteration/currentness
→ minimum-disclosure result
→ temp deletion
```

---

# PART N — CONFIRMED FLOW DECISIONS

## 66. Confirmed Decisions

| Area | Decision |
|---|---|
| Organization | Single organization / installation |
| Organizational data | Team only; no Unit/Division |
| Team effect on authorization | None |
| Reviewer/Approval Scope | None |
| Authorization | Permission-centric + domain/state/ownership where explicitly required |
| Spatie Teams | Disabled |
| Multi-role | Allowed |
| Direct-user permissions | Not a normal MVP admin flow |
| Authentication | username/password; min6; no composition; no MFA |
| Session | 30m idle; 8h absolute; max2 |
| Draft | incomplete allowed; optimistic versioning |
| Cancel | Draft-only permanent |
| Reviewer | permission-based shared/non-exclusive |
| Approver | permission-based shared/non-exclusive; one final approval |
| Workflow iteration | First Submit establishes iteration; Return/Revision remains current; Reopen starts next |
| Reopen | Rejected/Approved only; reason mandatory; Review/Revision target |
| Archive | independent flag, terminal/protected states only |
| Change Result | owner result-only edit in Pending Review; one complete row before Forward |
| Attachment | optional + ClamAV CLEAN |
| Audit | Business/Access/Security separate; no age purge |
| Export | exact template, async, immutable deterministic snapshot |
| Approved PDF | signed by System/Organization |
| Public validator | signature + exact SHA-256 + issuance/currentness |
| Export binary | 168h/7d |
| Concurrency | row-lock workflow + optimistic editable persistence |

---

# PART O — OPEN ITEMS / NEXT

## 67. Explicit Downstream TBDs

- exact default Team master-data entries;
- official company NSCMF numbering SOP/sample;
- search/filter details beyond baseline;
- additional export format/bulk packaging beyond XLSX/PDF;
- notification provider/timing;
- performance/availability targets;
- backup/restore/DR/RPO/RTO;
- exact deployment topology/provider;
- certificate operational format/path/provider if needed.

Unit/Division, Team-based authorization, Reviewer Scope, Approval Scope, and Spatie Teams are **not TBD**.

## 68. Current Documentation Progress

Documents 01–10 are the current authoritative draft set for their respective concerns.

Next fixed-order document:

**`11_ERD_Database_Schema.md`** — must materialize permission-centric authorization, package-owned Spatie RBAC tables, separate Team data, workflow iteration, immutable export snapshot, and all locked audit/security/export rules.