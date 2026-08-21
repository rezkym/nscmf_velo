# UI / UX Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UIUX-007  
> **Document Order:** 07 / 20  
> **Status:** Draft — Confirmed UX Direction + Team/Permission Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Visual/Flow Reference:** NSCMF FigJam proposal  
> **UI Implementation Reference:** Vue 3 + TypeScript + Inertia 3 + shadcn-vue + Tailwind CSS 4  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk presentation dan interaction behavior** NSCMF Digital Form & Workflow System.

UI/UX menerjemahkan product scope, business rules, user flow, permission-centric RBAC, state, validation, architecture, dan security controls menjadi:

- application shell/navigation;
- screen hierarchy;
- form layout/component behavior;
- validation/error/warning UX;
- autosave/conflict UX;
- attachment malware-scan feedback;
- permission-based Review/Approval queues;
- Business Timeline + privileged audit presentation;
- asynchronous exact XLSX/PDF export UX;
- Approved-PDF signing/readiness feedback;
- public PDF validation UX;
- temporary-password/re-auth/session-expiry UX;
- Team/user/role administration UX;
- responsive/accessibility/loading/stale states.

UI MUST NOT redefine business rules, permissions, lifecycle, validation, security, audit, concurrency, or exact-export fidelity.

Important current correction:

- organization uses **Team**, not Unit/Division;
- Team is organizational/profile data only;
- Team MUST NOT determine Reviewer/Approver eligibility;
- no Reviewer Scope / Approval Scope administration UI exists;
- Spatie Teams feature is not represented in UI.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default.
- **MAY** — allowed.
- **TBD** — unresolved and must not be guessed.

---

# PART A — UX PRINCIPLES

## 3. Operational Enterprise Experience

Priorities:

1. clarity;
2. data readability;
3. predictable workflow;
4. low cognitive load;
5. strong status/action hierarchy;
6. efficiency;
7. traceability;
8. permission/state/security awareness;
9. accessibility;
10. consistency.

## 4. Desktop-First

Desktop primary; tablet operational; mobile supports responsive view/basic action where practical. Responsive simplification never removes server-side authorization/security requirements.

## 5. Preserve Business Meaning, Not Spreadsheet Layout

Interactive web UI may restructure Excel fields. Export remains exact official-template representation.

## 6. Permission-Centric Simplicity

UI SHOULD present actions based on backend-provided permission/action eligibility and current state, not expose organizational scope concepts.

Role names are useful labels for administration. Runtime action visibility SHOULD follow effective permissions.

Team MAY appear as user/profile/business context but MUST NOT imply access entitlement.

---

# PART B — DESIGN SYSTEM

## 7. Brand Palette

| Intent | HEX |
|---|---|
| brand-950 | `#091540` |
| brand-700 | `#1B2CC1` |
| brand-400 | `#7692FF` |
| brand-200 | `#ABD2FA` |
| white | `#FFFFFF` |
| black | `#000000` |

Semantic success=green, warning=amber/yellow, destructive/error=red, primary/info=brand blue, neutral=gray. Meaning never relies on color alone.

## 8. Accessibility / Typography / Spacing

Target WCAG-AA-like readability, visible focus, labels/errors, keyboard-accessible dialogs/actions, restrained enterprise visual treatment.

## 9. Component Baseline

```text
Vue 3
TypeScript
Inertia 3
shadcn-vue
Tailwind CSS 4
Lucide / lucide-vue-next
```

Component defaults never override NSCMF semantics.

---

# PART C — SHELL & NAVIGATION

## 10. Shell

Desktop uses persistent/collapsible sidebar + contextual header + main content.

Permission-aware navigation baseline:

```text
Dashboard
Create NSCMF
Review
Approval
History
Administration
```

No tenant switcher. No Team switcher for authorization. Hidden menu is UX convenience only.

## 11. Record Context

Record header SHOULD show Request No, family/subtype, business-status badge, separate Archived badge, Requester, Team context where useful, and editable save state.

Displaying Team does not imply record scope or permission.

---

# PART D — SCREEN INVENTORY

## 12. MVP Screens

1. Login;
2. Mandatory Temporary Password Change;
3. Initial Setup Wizard;
4. Dashboard;
5. Create NSCMF entry;
6. Family/Subtype/Numbering selection;
7. Activation Draft/Edit;
8. Change Draft/Edit;
9. Revision Edit;
10. Change Result-only Update;
11. Review Queue;
12. Review Detail;
13. Approval Queue;
14. Approval Detail;
15. History;
16. Record Detail;
17. Business Timeline;
18. Attachments;
19. Archived view/filter;
20. Export status/download;
21. Public PDF Verification;
22. User Administration;
23. Role/Permission Administration;
24. Team Administration;
25. Sensitive-Action Password Re-authentication;
26. Core Settings where applicable.

There is no Unit/Division & Scope Administration screen.

---

# PART E — AUTH / SESSION / SETUP

## 13. Login

Include product identity, Username, Password, Login, generic invalid-credential feedback, throttling/progressive-delay feedback, no self-registration.

Policy:

```text
password-only
minimum 6 characters
no composition requirement
no MFA
```

`session.login`/`session.logout` are not exposed as RBAC permissions.

## 14. Temporary Password Change

When temporary credential active:

- normal navigation blocked;
- show `Create New Password`;
- helper says minimum 6 only;
- no composition checklist;
- success invalidates temporary credential;
- plaintext credentials never enter timeline/audit UI.

## 15. Session UX

Server policy:

```text
idle = 30m
absolute = 8h
max sessions = 2/account
```

UI may warn before expiry. Revoked/expired session returns to Login. Never claim local unsaved data was persisted.

## 16. Setup Wizard

Recommended steps:

```text
1. Role Setup
2. Team Setup
3. Users & Role Assignment
4. Complete
```

Role setup includes role-permission mapping. Team setup is organizational only. User setup assigns Team + one/multiple Roles.

No Reviewer Scope, Approval Scope, or Team-based permission configuration step.

Required signing readiness may be surfaced as critical system readiness, not personal-signature wizard.

---

# PART F — DASHBOARD / CREATE

## 17. Dashboard

Operational landing page with current attention + quick Create + History.

Recommended cards: My Draft, Revision Required, Pending Review if effective Review permission exists, Pending Approval if effective Approval permission exists.

Counts obey backend resource authorization and permissions. Team does not grant queue access.

## 18. Create Flow

```text
Create NSCMF
→ Family
→ Subtype
→ Numbering Mode
→ Draft
```

## 19. Subtype

Activation: Activation / Upgrade-Downgrade / Deactivation.

Change: Maintenance / Upgrade / Emergency.

Single choice; no extra checkbox-artifact subtype.

## 20. Numbering

Automatic/Manual. Automatic provisional value read-only after creation except allowed Draft correction model; Manual validates format/uniqueness. After first Submit Request No read-only.

---

# PART G — FORM / AUTOSAVE / VALIDATION

## 21. Form Layout

Multi-section single-page operational form + section navigator. Web form is not spreadsheet replica.

## 22. Draft Validation

Draft may be incomplete. Avoid showing every untouched required field as blocking error. Full errors appear on Submit/Resubmit with summary + inline errors. Warning distinct.

## 23. Autosave / Save Draft

States:

```text
Saving…
Saved just now
Save failed — retry
A newer version exists — review latest version
```

No false Saved after optimistic conflict.

---

# PART H — ACTIVATION / CHANGE / RESULT

## 24. Activation

Recommended sections: General/Service, Reference, Existing Service, New Service, RFS/SLA, NOC/Network, Bandwidth, Domain/DNS/Email/Hosting, Onsite Direct, Onsite POP, Attachments.

Subtype controls requiredness. Repeated max-3 fields may use add/remove row patterns. Units visible separately from numeric values.

## 25. Change

Recommended: General, Purpose, Service Impact, Plan/KPI, Execution/Monitoring, Rollback/Announcement, Attachments, Result of Changes.

Service Impact is checkbox-style multi-select. Its options such as NOC15/NOC23/etc are **form impact values**, not authorization Team values.

## 26. Result of Changes

Initial Draft may leave Result empty. Eligible owner at `PENDING_REVIEW` sees **Update Result of Changes**, not Edit Form.

Only Result Summary, Performance Information, Status, max five rows. General planning fields read-only. Optimistic conflict applies. Reviewer sees readiness indicator; backend controls Forward.

---

# PART I — ATTACHMENT SECURITY UX

## 27. Uploader

Show:

```text
Up to 10 files • 20 MB each
PDF, XLS/XLSX, DOC/DOCX, PNG, JPG/JPEG, TXT, CSV
```

Never expose storage path.

## 28. Scan States

```text
Uploading…
Scanning for malware…
Ready
Rejected — malware detected
Security scan failed — file not available
```

Only backend CLEAN → Ready. No download while not CLEAN. Result-only edit cannot mutate attachment current MVP.

---

# PART J — REVIEW / APPROVAL

## 29. Review Queue

Use data table, not card grid.

Useful columns MAY include Request No, family/subtype, Requester, Team as informational context, status, dates.

**Queue eligibility is permission-based, not Team-filtered.** Backend returns only candidates permitted by current authorization policy/state.

## 30. Review Detail

Read-only Form Detail | Timeline | Attachments.

Actions according to exact effective permissions and state:

- Return for Revision;
- Reject;
- Forward to Approval.

Opening record does not assign/lock Reviewer.

## 31. Approval Queue / Detail

Data table and read-only detail. Team may be displayed informationally but cannot affect eligibility.

Actions according to exact permissions/current state:

- Return Reviewer;
- Return Requester;
- Reject;
- Approve.

One valid Approve sufficient.

---

# PART K — WORKFLOW DIALOGS / STATUS

## 32. Mandatory Reason Dialogs

Reviewer Return/Reject, Approver Returns/Reject, Reopen, Archive, Unarchive require reason. Dialog shows Request No, consequence/destination, reason, explicit confirm label.

Reopen only offers Revision Required or Pending Review. Reopen starts next workflow iteration, but iteration number need not be exposed prominently unless useful for history/audit.

## 33. Business Status Labels

Only:

- Draft
- Pending Review
- Revision Required
- Pending Approval
- Rejected
- Approved
- Cancelled

Archived separate badge.

---

# PART L — HISTORY / TIMELINE / AUDIT

## 34. History

Data table optimized for retrieval. Archived separate from active default view. Export selection only authorized records.

Team MAY be a display/filter criterion if product later finds it useful, but Team filter MUST NOT imply authorization boundary.

## 35. Record Detail

Recommended tabs/sections:

1. Form Detail
2. Timeline
3. Attachments

## 36. Business Timeline

Shows actor, business mutation/workflow/lifecycle action, timestamp, states, reason/comment, meaningful changes.

Routine View/download/export-access evidence does not flood Business Timeline.

Workflow iteration SHOULD be available in history/audit context where needed to distinguish old vs current approval cycles.

## 37. Privileged Audit UX

Raw Access Audit:

```text
Protected Superadmin by default
or explicit audit.access.view
+ applicable resource/admin authorization
```

Security Audit similarly uses `audit.security.view` + applicable authorization.

No Team/scope prerequisite. Audit UI read-only; no purge-by-age; no credential/private-key secrets.

---

# PART M — SIGN-OFF / EXPORT

## 38. Sign-Off

Show system-derived Requested By, Reviewed By, Approved By + timestamps.

```text
Approved By = human final workflow actor
Digital signer = System/Organization
```

## 39. Export Choice / Queue

Expose `Export XLSX` and `Export PDF`. All generation asynchronous.

Technical statuses:

```text
Queued
Processing
Ready to download
Failed
Expired
```

Never business badges.

## 40. Immutable Snapshot UX

When export is requested, backend binds immutable deterministic snapshot. UI does not need to expose internal snapshot JSON, but it MUST NOT imply that a queued export automatically follows later record edits.

If useful, user-facing export detail MAY show record version / requested time.

## 41. Ready / Expiry

READY shows format/download/time/`Available until`. Re-download until 168h. Expired offers Generate new export if eligible.

## 42. Signing UX

Approved PDF READY indicates cryptographically signed by System/Organization. XLSX never labeled signed under this flow.

Signing failure → Failed, no unsigned intermediate, Approval state unchanged, safe retry guidance.

## 43. Critical Signing Configuration

Missing/unusable required signing identity → critical configuration/readiness message to appropriate admin/operator surface. Never expose key path/content/passphrase.

---

# PART N — PUBLIC PDF VERIFICATION

## 44. Public Verification Page

Conceptual `/ispdfvalid`, no login. Narrow verification utility, not public History.

Include explanation, PDF-only uploader, size guidance, progress, result, retry/new verification.

## 45. Public Upload States

```text
Uploading…
Scanning file…
Verifying signature and issuance…
Result
```

Only ClamAV CLEAN proceeds.

## 46. Canonical Results

| Semantic | Display |
|---|---|
| `VALID_CURRENT` | Valid — Current |
| `VALID_SUPERSEDED` | Valid — Superseded |
| `INVALID_MODIFIED` | Invalid — Modified |
| `UNKNOWN` | Unknown / Not recognized |

Superseded = authentic exact issued PDF but no longer current due later Reopen/newer approved issuance. Never call it modified solely for supersession.

## 47. Minimum Disclosure

No private form content, attachments, Business Timeline, raw audits, storage paths, private-key details, unnecessary actor information. No TSA claim current MVP.

---

# PART O — ADMINISTRATION / RE-AUTH

## 48. Administration

Group:

- Users;
- Roles/Permissions;
- Teams;
- privileged audit surfaces;
- Core Settings where eligible.

No Unit/Division, Reviewer Scope, Approval Scope, or Spatie Teams UI.

Normal permission assignment flow:

```text
Permission → Role → User
```

Direct permission-to-user assignment is not offered in current MVP.

## 49. Sensitive Action Re-authentication

Before password reset, role assignment/removal, role-permission changes, protected security settings, ask acting user's current password.

No MFA. Failed re-auth = no mutation.

## 50. Target Session Revocation Feedback

After effective authorization-changing role/permission mutation, UI MAY tell admin affected target sessions were revoked. Team change alone MUST NOT be described as a permission/access revocation.

---

# PART P — LOADING / ERROR / STALE

## 51. Loading / Empty

Use skeletons; prevent duplicate destructive/workflow submissions. Long export/security work uses persistent status.

## 52. Unauthorized

Generic denied/not-available without leaking resource details.

## 53. Stale Workflow

Backend state changed → clear message + refresh latest state + disable stale controls.

## 54. Save Conflict

Network failure vs optimistic conflict distinguishable; never auto-overwrite newer persisted version.

## 55. Security Failure Copy

Examples:

- `This file could not pass the required security scan.`
- `Your session has expired. Please sign in again.`
- `Your access changed. Please sign in again.`
- `Approved PDF signing is temporarily unavailable due to a required system configuration issue.`

Never expose internals/secrets.

---

# PART Q — RESPONSIVE / ACCESSIBILITY

## 56. Responsive

Desktop full workflow; tablet reduced columns; mobile stacked and prioritized. Required reason/re-auth/security confirmation never dropped.

## 57. Keyboard / Labels / Motion

All controls labeled, placeholder not sole label, dialogs manage focus, icon-only actions accessible, reduced-motion respected where practical.

## 58. Toast

Toast for non-critical completion. Durable conditions such as export READY/Failed, signing readiness, scan failure require persistent visible state.

---

# PART R — ACTION VISIBILITY

## 59. Requester Matrix

| State | General Edit | Save | Submit/Resubmit | Change Result | Cancel |
|---|---:|---:|---:|---:|---:|
| Draft | Yes own | Yes | Submit | normal form | Yes own |
| Pending Review | No | No | No | Yes eligible owner | No |
| Revision Required | Yes own | Yes | Resubmit | normal form | No |
| Pending Approval | No | No | No | No | No |
| Rejected | No | No | No | No | No |
| Approved | No | No | No | No | No |
| Cancelled | No | No | No | No | No |

## 60. Reviewer / Approver / Lifecycle

Reviewer with required permission at `PENDING_REVIEW` → read-only detail + permitted Review actions.

Approver with required permission at `PENDING_APPROVAL` → read-only detail + permitted Approval actions.

No Team/scope matching.

Authorized unarchived Approved/Rejected with `nscmf.reopen` → Reopen. Eligible terminal with `nscmf.archive` → Archive/Unarchive.

---

# PART S — COPY / GUARDRAILS

## 61. Explicit Labels

Use Submit for Review, Save Draft, Forward to Approval, Return for Revision, Return to Reviewer, Return to Requester, Reject NSCMF, Approve NSCMF, Update Result of Changes, Reopen NSCMF, Archive, Unarchive, Export XLSX/PDF, Verify PDF.

## 62. Developer / AI MUST NOT

UI MUST NOT:

1. replicate Excel pixel-perfect as interactive form;
2. redesign official export;
3. add extra subtype;
4. make Service Impact single-select;
5. replace business state with Archived;
6. expose invalid Reopen destination;
7. imply first Reviewer/Approver viewer owns record;
8. expose general Requester edit during Pending Review;
9. require all five Result rows;
10. block incomplete Draft;
11. treat Warning as Error;
12. make attachment mandatory;
13. show Ready before ClamAV CLEAN;
14. allow download of unclean file;
15. require freehand signature;
16. equate System signer with Approved By;
17. offer unsigned Approved PDF after signing failure;
18. label XLSX digitally signed;
19. put routine View in Business Timeline;
20. expose raw audit without privileged permission/authorization;
21. offer audit purge-by-age;
22. state 12-month audit retention;
23. rely on hidden button as authorization;
24. add tenant switcher;
25. add MFA current MVP;
26. show password composition checklist;
27. expose plaintext credentials/private key;
28. allow failed re-auth mutation;
29. make public validator a public record browser;
30. call Superseded modified;
31. claim TSA current MVP;
32. show Unit/Division UI;
33. show Reviewer/Approval Scope UI;
34. use Team to explain why Review/Approval is allowed/denied;
35. expose Spatie Teams switch/configuration;
36. expose direct permission-to-user assignment as normal MVP feature.

---

# PART T — ACCEPTANCE

## 63. Authentication / Session

- [ ] username/password only, no register/MFA;
- [ ] min6 only;
- [ ] temp password forced change;
- [ ] expiry/revocation returns Login.

## 64. Organization / Authorization UX

- [ ] Team administration exists;
- [ ] no Unit/Division/Scope administration exists;
- [ ] Team shown as organizational info, not entitlement;
- [ ] Review menu/actions follow effective permissions/current state;
- [ ] Approval menu/actions follow effective permissions/current state;
- [ ] direct-user permission UI absent;
- [ ] Spatie Teams UI absent.

## 65. Forms / Concurrency

- [ ] Draft incomplete save;
- [ ] optimistic conflict accurate;
- [ ] Service Impact multi-select;
- [ ] Result-only narrow;
- [ ] warnings/errors distinct.

## 66. Attachments

- [ ] constraints visible;
- [ ] only CLEAN Ready/downloadable;
- [ ] scan failure never success.

## 67. Workflow / Audit

- [ ] Review/Approval non-exclusive and permission-based;
- [ ] mandatory reason dialogs;
- [ ] Business Timeline excludes access noise;
- [ ] audit privilege works without Team scope;
- [ ] workflow iteration can distinguish reopened approval cycles where needed.

## 68. Export / Validator

- [ ] XLSX/PDF explicit;
- [ ] queue statuses technical only;
- [ ] immutable snapshot behavior not misleading;
- [ ] 7-day binary expiry shown;
- [ ] Approved PDF signer distinction;
- [ ] no unsigned fallback;
- [ ] public current/superseded/modified/unknown correct.

---

# PART U — FIGJAM / AUTHORITY / NEXT

## 69. FigJam Alignment

Existing FigJam remains a product/system-flow reference. It currently requires a later synchronization pass to reflect the confirmed Team/permission simplification. **This document does not perform or imply that FigJam has already been updated.**

## 70. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| Flow | `03_User_Flow.md` |
| RBAC | `04_RBAC_Permission_Matrix.md` |
| State | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| **Presentation/interaction** | **`07_UI_UX_Specification.md`** |
| Technology | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |

## 71. Still Refinable / TBD

- neutral grayscale/font assets/breakpoints;
- table page size;
- autosave interval;
- toast/animation duration;
- exact Team master-data options;
- official numbering copy after SOP;
- additional export controls if approved;
- exact placement of audit/readiness pages;
- third-login UX;
- public validator minimum-disclosure metadata fields.

## 72. Next Document

Next fixed-order document:

**`11_ERD_Database_Schema.md`**.