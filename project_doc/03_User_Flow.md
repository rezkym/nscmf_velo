# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Synchronized through Confirmed Environment-Bound Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

- PRD → apa yang dibangun;
- Business Rules → invariant bisnis;
- RBAC → siapa boleh melakukan apa;
- State Flow → lifecycle/workflow iteration;
- Validation → validitas input/action;
- UI/UX → presentation/interaction;
- Tech Stack → technology;
- Architecture → component/execution/concurrency/audit/export topology;
- Security → authentication/session/re-auth/malware/audit/signing/public validation;
- Environment Specification → upcoming runtime/environment operationalization;
- User Flow → sequence user + system response.

Canonical business states remain exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Technical/security/settings conditions MUST NOT become business states.

---

## 2. Actors

- Protected Superadmin;
- Requester;
- Reviewer;
- Approver;
- Delegated Administrator;
- Custom Role Actor;
- System;
- Public PDF Verifier Visitor.

One user MAY have multiple roles. Single organization; Team is organizational/profile data only, no Unit/Division, no Team authorization scope.

---

# PART A — OVERALL FLOW

## 3. Primary Operational Flow

```text
Login
  ↓
Dashboard
  ├── Create New Form
  │     ↓
  │   Activation / Change
  │     ↓
  │   Subtype
  │     ↓
  │   Auto / Manual Number
  │     ↓
  │   DRAFT
  │     ├── Autosave / Save Draft
  │     ├── Cancel → CANCELLED
  │     └── Submit → PENDING_REVIEW
  │                    ├── Return(reason) → REVISION_REQUIRED → Resubmit → PENDING_REVIEW
  │                    ├── Reject(reason) → REJECTED
  │                    └── Forward → PENDING_APPROVAL
  │                                    ├── Return Reviewer(reason) → PENDING_REVIEW
  │                                    ├── Return Requester(reason) → REVISION_REQUIRED
  │                                    ├── Reject(reason) → REJECTED
  │                                    └── Approve → APPROVED
  └── History / Detail / Timeline / Export
```

Exceptional:

```text
REJECTED / APPROVED
→ authorized Reopen(reason, REVISION_REQUIRED|PENDING_REVIEW)
→ next workflow iteration

APPROVED / REJECTED / CANCELLED
→ Archive/Unarchive without changing business status

CANCELLED
→ never Reopen
```

Public utility:

```text
PDF <= 20 MB
→ private temp
→ ClamAV CLEAN
→ signature/hash/issuance/currentness
→ VALID_CURRENT | VALID_SUPERSEDED | INVALID_MODIFIED | UNKNOWN
→ temp cleanup
```

---

# PART B — FIRST-TIME SETUP

## 4. UF-SETUP-001 — Protected Superadmin First Login

1. Protected Superadmin opens Login.
2. Enters username/password.
3. Server authenticates.
4. If initial/temporary credential requires change, normal navigation is blocked until replacement.
5. If setup incomplete, Setup Wizard opens.
6. Protected Superadmin cannot delete/disable/downgrade/lose protected role.
7. Required signing readiness follows Security Rules.

## 5. UF-SETUP-002 — Configure Roles

Use Role Template or Manual Role Configuration. Minimum template Superadmin/Requester/Reviewer/Approver. Permission→Role→User; no direct-user permission UI baseline.

## 6. UF-SETUP-003 — Configure Team

Create/configure Team master data. Team is organizational only; Business Team ≠ Spatie Teams.

## 7. UF-SETUP-004 — Configure Users / Roles

Create eligible normal user, assign one Team, one/multiple roles. No Reviewer/Approval Scope. Team change later does not change permissions.

## 8. UF-SETUP-005 — Complete Wizard

System shows summary, confirms setup, enters Dashboard. Protected Core Settings remain Protected Superadmin-only.

---

# PART C — LOGIN / ACCOUNT / DASHBOARD / ADMINISTRATION

## 9. UF-AUTH-001 — Normal Login

1. Username + password.
2. Password min6/no composition/no MFA.
3. Server throttles/progressive delay; generic failure.
4. Active account + credential verified.
5. Session regenerated/created.
6. Policy: idle30m / absolute8h / max2.
7. **Third valid login succeeds and server revokes the oldest active authenticated session**, leaving at most two.
8. Temporary-password account must replace password.
9. No self-registration.

## 10. UF-AUTH-002 — Mandatory Temporary Password Change

1. User authenticates with temporary password.
2. Normal navigation blocked.
3. User submits new password min6.
4. Backend hashes new password and invalidates temporary credential.
5. Security Audit safe event.
6. User proceeds under current session policy.

## 11. UF-DASH-001 — Dashboard

Applicable entry points: Create, History, Review if permission, Approval if permission, Administration/Settings if permission/identity. Team does not determine Review/Approval menu.

## 12. UF-ADMIN-001 — Manage Users

Authorized actor may create/edit eligible normal user, assign/remove roles, assign/move Team, reset credential, enable/disable.

Sensitive create/reset/role/security flow:

1. acting admin must have valid current-password re-auth proof (15-minute lifetime);
2. create/reset **does not ask admin to choose temporary password**;
3. server generates temporary password;
4. server stores hash only and sets `must_change_password=true`;
5. on successful create/reset, plaintext is shown to acting admin **exactly once**;
6. admin conveys it through an internal channel;
7. no later `show/retrieve temporary password` capability exists;
8. reset revokes target sessions;
9. role/effective-permission/disablement changes revoke affected sessions;
10. Team-only changes do not grant/revoke authorization;
11. protected Superadmin invariant remains.

If the admin loses the one-time plaintext before conveying it, the correct flow is to run Reset Password again, generating a new temporary password; the previous plaintext is never recovered.

## 13. UF-ADMIN-002 — Manage Role / Permission / Team

Authorized actors manage eligible roles/permissions/Teams. No Reviewer/Approval Scope; Spatie Teams disabled; no direct-user permission UI.

## 14. UF-ADMIN-003 — Protected Technical Log Settings

Protected Superadmin opens Core Settings → Technical Logs.

System shows:

```text
Automatic Cleanup ON/OFF
Retention Value
Retention Unit DAY/MONTH
```

Default:

```text
ON + 30 DAY
```

Update flow:

1. actor must be Protected Superadmin;
2. requires `system.settings.manage`;
3. requires current-password re-auth proof not older than 15 minutes;
4. retention value positive integer; DAY/MONTH only; no fixed product maximum;
5. backend updates typed application setting + Security Audit;
6. no immediate authoritative audit deletion occurs;
7. scheduler/cleanup service later applies current setting to **Technical Logs only**.

When OFF, no automatic age cleanup of Technical Logs. Business/Access/Security Audit, workflow/history, NSCMF records, PDF issuance/cert history are never affected.

---

# PART D — CREATE NEW FORM

## 15. UF-CREATE-001 — Start New NSCMF

Create → verify `nscmf.create` → choose Activation/Change → choose subtype. Upgrade never auto-classified by keyword alone.

## 16. UF-CREATE-002 — Numbering

Automatic or Manual. Provisional auto `NSCMF-YYYYMM-#####`. Immutable after first Submit.

## 17. UF-CREATE-003 — Fill Activation

UI represents workbook business meaning; subtype validation follows `06`.

## 18. UF-CREATE-004 — Fill Change

Purpose/Challenges/Maintenance/Problem/Service Impact/Plan/KPI/Target/Monitoring/Rollback/Announcement/Result. First Submit may have zero Result rows; before Reviewer Forward at least one complete Result row.

---

# PART E — DRAFT / AUTOSAVE / CANCEL

## 19. UF-DRAFT-001 — Draft and Autosave

New record DRAFT; autosave sends expected version; backend checks permission + ownership + state; valid save persists Business Audit + increments version; stale conflict rejected; Draft may be incomplete.

## 20. UF-DRAFT-002 — Manual Save

Same semantics.

## 21. UF-DRAFT-003 — Resume Draft

Own Draft + authorization + state.

## 22. UF-DRAFT-004 — Cancel Draft

Own, DRAFT, never submitted, `nscmf.cancel` → CANCELLED permanent. Reason optional.

---

# PART F — SUBMISSION / REVIEW

## 23. UF-SUBMIT-001 — Submit

Row-lock/revalidate permission, ownership, state, validation. Successful first Submit establishes iteration1, Requested By, PENDING_REVIEW; normal general edit locked; shared permission-based Reviewer pool. Team irrelevant.

## 24. UF-REVIEW-001 — Review Queue

Permission/resource-authorized PENDING_REVIEW candidates; no Team filter for authorization; view can create Access Audit; no ownership assignment.

## 25. UF-REVIEW-002 — Multiple Reviewers

Multiple contributors allowed; first viewer not exclusive.

## 26. UF-REVIEW-003 — Reviewer Actions

Forward/Return/Reject per explicit permission. Return/Reject reason mandatory.

## 27. UF-REVIEW-004 — Forward

Locked current-state revalidation; Change Result gate; PENDING_REVIEW→PENDING_APPROVAL; effective Reviewed By actor stored; shared Approver pool.

## 28. UF-REVIEW-005 — Return

Reason; PENDING_REVIEW→REVISION_REQUIRED; Requester edits; Resubmit→PENDING_REVIEW; same iteration.

## 29. UF-REVIEW-006 — Reject

Reason; PENDING_REVIEW→REJECTED; normal flow stops until authorized Reopen.

## 30. UF-REVIEW-007 — Change Result Capture

Owner + permission may edit Result-only fields during PENDING_REVIEW; optimistic version; planning remains locked.

---

# PART G — APPROVAL / REOPEN

## 31. UF-APPROVAL-001 — Approval Queue

Permission/resource-authorized PENDING_APPROVAL, non-exclusive, Team irrelevant.

## 32. UF-APPROVAL-002 — Approve

Locked revalidation; PENDING_APPROVAL→APPROVED; one valid final approval; actor = Approved By; stale second action denied.

## 33. UF-APPROVAL-003 — Return Reviewer

Reason; PENDING_APPROVAL→PENDING_REVIEW; same iteration; fresh effective review required.

## 34. UF-APPROVAL-004 — Return Requester

Reason; →REVISION_REQUIRED→Resubmit→PENDING_REVIEW; same iteration.

## 35. UF-APPROVAL-005 — Reject

Reason; →REJECTED.

## 36. UF-REOPEN-001/002 — Reopen Rejected/Approved

Not archived; `nscmf.reopen`; authorized; reason; destination REVISION_REQUIRED or PENDING_REVIEW; row lock; successful Reopen starts next iteration. Old signed genuine PDF may become VALID_SUPERSEDED.

---

# PART H — HISTORY / EXPORT / PUBLIC VERIFY

## 37. UF-HISTORY-001 — History

Permission/resource rules; Team not authorization filter; archived separate.

## 38. UF-HISTORY-002 — Detail/Timeline

Authorized form/attachment/timeline view. Access noise remains Access Audit. Authoritative audits have no age purge.

## 39. UF-EXPORT-001 — Request Export

Choose XLSX/PDF; authorize; create immutable deterministic snapshot bound record_version/iteration/template; queue; immediate response.

## 40. UF-EXPORT-002 — Background Exact Generation

Worker reads immutable snapshot; resolves immutable template version; copies privately; targeted OOXML patch; integrity validate; render if PDF; sign if Approved; private READY; 168h expiry.

## 41. UF-EXPORT-003 — Approved PDF Signing

System/Organization signer separate from human Approved By. Signing key protected runtime provisioning. Failure→FAILED/no unsigned fallback.

## 42. UF-EXPORT-004 — XLSX

Exact template; no signing; local edits do not modify source.

## 43. UF-EXPORT-005/006/007 — Download/Cleanup/Bulk

Recheck authorization; re-download until expiry; cleanup binary only; preserve source/audits/issuance; bulk per-record auth.

## 44. UF-VERIFY-001 — Public PDF Verification

1. no-login PDF upload;
2. reject non-PDF or >20MB;
3. private temp;
4. ClamAV CLEAN;
5. signature recognized issuer;
6. exact SHA-256;
7. issuance/iteration/currentness;
8. canonical outcome;
9. minimum disclosure;
10. temp delete.

---

# PART I — ARCHIVE / ATTACHMENT / SESSION

## 45. UF-ARCHIVE-001/002

Archive/Unarchive exact rules; status unchanged; Cancelled permanent.

## 46. UF-ATT-001 — Resumable Attachment Upload

```text
select
→ initiate/resume
→ 5 MiB chunks
→ persistent private Laravel local storage + DB accepted metadata
→ interruption allowed
→ server accepted/missing reconciliation
→ missing chunks only
→ complete
→ assemble
→ server final SHA-256
→ full-file ClamAV
→ CLEAN only
→ final private attachment
```

Current initial production does not use third-party object storage. Acknowledged progress MUST NOT rely only on ephemeral process/container storage.

## 47. UF-ATT-002 — Download Attachment

Parent auth + CLEAN; storage path never authorization.

## 48. UF-AUTH-003 — Logout

Invalidate current server session.

## 49. UF-AUTH-004 — Expiry / Revocation

Idle30m, absolute8h, revoked, disabled, or displaced oldest session after third valid login → Login. Business state unchanged.

---

# PART J — ERROR / CONCURRENCY

## 50. Unauthorized Direct Access

Deny without leak.

## 51. Validation Failure

State unchanged; actionable errors; warnings separate.

## 52. Stale Reviewer / Approver

First valid state mutation wins; stale conflict rejected.

## 53. Stale Draft / Result

Version mismatch rejected; no overwrite/false Saved.

## 54. Export Fidelity / Signing / Scanner Failures

Export fidelity fail→FAILED; Approved sign fail→FAILED/no unsigned; no explicit CLEAN→not usable.

## 55. Protected Settings Failure

Invalid payload, non-Protected actor, missing permission, failed/expired >15m re-auth → settings mutation unapplied. No partial setting/audit state.

---

# PART K — ACTOR SUMMARY

## 56. Requester

Create→Draft→Save→Cancel/Submit→Review; Result-only update if eligible; revision/resubmit; history/export.

## 57. Reviewer

Permission→PENDING_REVIEW queue→View→Forward/Return/Reject. No Team scope.

## 58. Approver

Permission→PENDING_APPROVAL→Approve/Returns/Reject. One final Approve. No Team scope.

## 59. Protected Superadmin

Normal protected admin authority plus protected Core Settings. Technical Log cleanup may be configured but authoritative audits cannot be purged.

## 60. Public Verifier

PDF <=20MB→CLEAN→signature/hash/issuance/currentness→minimum disclosure.

---

# PART L — CONFIRMED FLOW DECISIONS

## 61. Confirmed Decisions

| Area | Decision |
|---|---|
| Organization | Single organization; Team only |
| Team authorization | None |
| Authentication | username/password min6/no composition/no MFA |
| Temp credential | server-generated, one-time admin reveal, forced target change |
| Re-auth | current password proof 15 minutes |
| Session | idle30m / absolute8h / max2; third valid login revokes oldest |
| Workflow | seven states; permission-based non-exclusive Review/Approval |
| Iteration | first Submit=1; normal returns same; Reopen next |
| Attachment | resumable 5MiB/24h, full-file CLEAN |
| Initial prod storage | persistent Laravel private local filesystem |
| Audit | Business/Access/Security no age purge |
| Technical Log | Protected Superadmin-configurable; default ON/30 DAY; DAY/MONTH or OFF |
| Export | exact template async immutable snapshot |
| Template | immutable/versioned/private + SHA-256 readiness |
| Approved PDF | System/Organization signed |
| Public validator | no login, max20MB, signature/hash/issuance/currentness |
| Timezone | canonical `Asia/Jakarta` |

---

# PART M — OPEN ITEMS / NEXT

## 62. Explicit Downstream TBDs

- exact default Team entries;
- official numbering SOP;
- search/filter refinements;
- bulk export packaging;
- notification provider/timing;
- numeric rate-limit buckets;
- signing provider/path/rotation mechanics;
- ClamAV/renderer physical topology;
- performance/availability;
- backup/DR/RPO/RTO;
- exact physical deployment topology.

No longer TBD: temp credential direction, re-auth lifetime, public max upload, canonical timezone, initial prod storage class, Technical Log cleanup policy/default.

## 63. Current Documentation Progress

Documents through `13_Project_Structure.md` exist. Next fixed-order document to create **only after explicit user instruction**:

**`14_Environment_Specification.md`**.