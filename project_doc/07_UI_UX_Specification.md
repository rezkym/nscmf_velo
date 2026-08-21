# UI / UX Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UIUX-007  
> **Document Order:** 07 / 20  
> **Status:** Draft — Confirmed UX Direction + Synchronized through Security Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Visual/Flow Reference:** NSCMF FigJam proposal  
> **UI Implementation Reference:** Vue 3 + TypeScript + Inertia 3 + shadcn-vue + Tailwind CSS 4  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk presentation dan interaction behavior** NSCMF Digital Form & Workflow System.

UI/UX menerjemahkan product scope, business rules, user flow, RBAC, state, validation, architecture, dan confirmed security controls menjadi:

- application shell/navigation;
- screen hierarchy;
- form layout/component behavior;
- visual/status/action hierarchy;
- validation/error/warning UX;
- autosave/optimistic-conflict UX;
- attachment upload + malware-scan feedback;
- Review/Approval queues;
- Business Timeline + privileged audit-access presentation;
- queued exact XLSX/PDF export UX;
- Approved-PDF signing/readiness feedback;
- public PDF validation UX;
- temporary-password/re-auth/session-expiry UX;
- responsive/accessibility/loading/empty/error/stale states.

UI MUST NOT redefine business rules, permissions, lifecycle, validation, security, audit separation, concurrency, or exact-export fidelity.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — strong default.
- **MAY** — diperbolehkan.
- **TBD** — belum final dan tidak boleh ditebak.

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

Use neutral surfaces by default and color only for purposeful brand/semantic emphasis.

## 4. Desktop-First

Desktop is primary heavy-workflow/form target; tablet remains operational; mobile supports responsive viewing/basic action where practical. Responsive simplification never removes server-side authorization/security requirements.

## 5. Preserve Business Meaning, Not Spreadsheet Layout — Web UI Only

Interactive web UI may restructure Excel fields into clearer sections. **Export is the exception:** XLSX/PDF must preserve the official XLSX template exactly and only fill mapped fields/native controls.

## 6. Progressive Disclosure

Conditional fields/actions appear only when relevant. Examples: Other Impact Description, subtype-specific required sections, role-specific navigation, and security-only controls.

---

# PART B — DESIGN SYSTEM

## 7. Brand Palette

| Intent | HEX |
|---|---|
| `brand-950` | `#091540` |
| `brand-700` | `#1B2CC1` |
| `brand-400` | `#7692FF` |
| `brand-200` | `#ABD2FA` |
| white | `#FFFFFF` |
| black | `#000000` |

Semantic success=green, warning=amber/yellow, destructive/error=red, primary/info=brand blue, neutral=gray/black/white. Meaning MUST NOT rely on color alone.

## 8. Accessibility / Typography / Spacing

Target WCAG-AA-like readability: visible focus, labels, associated errors, readable contrast, keyboard-accessible dialogs/actions. Use restrained enterprise typography, borders/radius/shadows, not marketing-style oversized/decorative UI.

## 9. Component Baseline

```text
Vue 3
TypeScript
Inertia 3
shadcn-vue
Tailwind CSS 4
Lucide / lucide-vue-next
```

Useful primitives: Button/Input/Textarea/Select/Checkbox/Radio/Dialog/AlertDialog/Sidebar/Table/Tabs/Badge/Alert/Toast/Skeleton/Breadcrumb/Pagination/Progress/Popover/File Uploader.

Component defaults never override NSCMF business/security semantics.

---

# PART C — APPLICATION SHELL & NAVIGATION

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

No tenant switcher current single-org model. Hidden menu is UX convenience, not authorization.

## 11. Context

Deep screens expose breadcrumb/context such as History / Request No or Review / Request No. Record header shows Request No, family/subtype, canonical business-status badge, separate Archived badge, requester/Unit context as useful, and save state while editable.

---

# PART D — SCREEN INVENTORY

## 12. MVP Screens

At minimum:

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
20. Export status/download surface;
21. Public PDF Verification;
22. User Administration;
23. Role/Permission Administration;
24. Unit/Division & Scope Administration;
25. Sensitive-Action Password Re-authentication dialog/surface;
26. Core Settings for protected Superadmin where applicable.

---

# PART E — AUTHENTICATION / SESSION / SETUP UX

## 13. Login

Include product identity, Username, Password, primary Login button, generic invalid-credential feedback, throttling/progressive-delay feedback without leaking limiter internals, and **no self-registration**.

Confirmed policy surfaced consistently:

```text
password-only
minimum 6 characters
no composition requirement
no MFA
```

UI MUST NOT add uppercase/lowercase/number/symbol requirements or MFA prompts.

Duplicate Login submission is disabled while pending. Error MUST NOT reveal whether username exists.

## 14. Temporary Password Change

When backend indicates temporary credential:

- normal app navigation remains blocked;
- show clear `Create New Password` screen;
- new password helper states only the confirmed minimum 6-character rule;
- no composition checklist;
- success invalidates temporary credential and proceeds according to session policy;
- plaintext temporary/new password never appears in timeline/audit UI.

## 15. Session UX

Confirmed server policy:

```text
idle timeout = 30 minutes
absolute lifetime = 8 hours
max active sessions = 2
```

UI MAY warn shortly before idle expiration where practical, but server timer is authority. After expiration/revocation, redirect to Login with clear non-sensitive message. Persisted Draft remains saved; UI MUST NOT claim unsaved local input was persisted when it was not.

## 16. Setup Wizard

Suggested steps:

```text
1 Role Setup
2 Unit / Division
3 Users / Scope
4 Review Configuration
5 Complete
```

Role template/manual configuration and scope setup remain non-exclusive Reviewer/Approver models. No tenant step.

Required signing-identity readiness may be surfaced as a critical environment/readiness condition, not as a user-created personal signature wizard.

---

# PART F — DASHBOARD

## 17. Dashboard Purpose

Operational landing page: current attention + quick Create + History. Recommended neutral summary cards: My Draft, Revision Required, Pending Review if eligible, Pending Approval if eligible. Counts must respect visibility/scope.

Empty state explains nothing currently needs attention and shows only permitted next CTA.

---

# PART G — CREATE / NUMBERING

## 18. Flow

```text
Create NSCMF
→ Family
→ Subtype
→ Numbering Mode
→ Draft
```

Activation and Change are described by business context so `Upgrade` ambiguity is reduced.

## 19. Subtype

Activation: Activation / Upgrade-Downgrade / Deactivation. Change: Maintenance / Upgrade / Emergency. Single-choice UI; no fourth option from Excel checkbox artifacts.

## 20. Numbering

Automatic or Manual. Automatic provisional number appears read-only after creation; Manual gets inline format/uniqueness feedback. After first successful Submit, Request No is read-only.

---

# PART H — FORM LAYOUT / VALIDATION / AUTOSAVE

## 21. Form Layout

Use multi-section single-page operational form with section navigator, not spreadsheet replica. Required/conditional/optional meaning follows `06`.

## 22. Draft Validation

Draft may be incomplete. Do not paint every untouched required field red. Full errors appear on Submit/Resubmit action, with top summary + inline errors. Warnings remain visually distinct/non-blocking.

Security failures such as malware-scan failure are **not** warning-style optional feedback.

## 23. Autosave / Save Draft

States:

```text
Saving…
Saved just now
Save failed — retry
A newer version exists — review latest version
```

No false Saved on optimistic conflict. No toast for every autosave. Manual Save Draft remains visible in editable state.

---

# PART I — ACTIVATION / CHANGE / RESULT UX

## 24. Activation

Recommended sections: General/Service, Reference, Existing Service, New Service, RFS/SLA, NOC/Network, Bandwidth, Domain/DNS/Email/Hosting, Onsite Direct, Onsite POP, Attachments.

Subtype controls Existing/New requiredness. Service Status is single choice. Repeated max-3 fields may use add/remove rows. Units (Mbps/GB/ms/%) remain visible but separate from raw numeric value.

## 25. Change

Recommended sections: General, Purpose, Service Impact, Improvement Plan/KPI, Execution/Monitoring, Rollback/Announcement, Attachments, Result of Changes.

Service Impact = checkbox-style multi-select; Other reveals required description. Plan/KPI shown as paired rows. Monitoring uses amount + unit. Announcement exactly one choice. Upgrade/Emergency missing attachment = Warning only.

## 26. Result of Changes

Initial Draft may leave Result empty. Eligible owner during `PENDING_REVIEW` sees **Update Result of Changes**, not `Edit Form`.

Result-only UI exposes only Result Summary, Performance Information, Status, max five rows; general submitted planning fields remain read-only. Optimistic conflict rules apply. Reviewer sees readiness indicator and backend remains authority for Forward.

---

# PART J — ATTACHMENT SECURITY UX

## 27. Uploader

Show drag/drop + browse and constraints:

```text
Up to 10 files • 20 MB each
PDF, XLS/XLSX, DOC/DOCX, PNG, JPG/JPEG, TXT, CSV
```

Each item shows filename/type/size/status and remove only in allowed context. Never expose storage path.

## 28. Security Scan States

A structurally accepted upload MUST NOT immediately appear as normal usable attachment.

User-facing states SHOULD distinguish:

```text
Uploading…
Scanning for malware…
Ready
Rejected — malware detected
Security scan failed — file not available
```

Rules:

- only backend ClamAV `CLEAN` → `Ready`;
- `INFECTED`, timeout, scanner unavailable, scan error MUST NOT show Ready;
- no Download action while not CLEAN;
- rejected/scan-failed item must not look successfully attached;
- Result-only edit does not allow attachment mutation current MVP.

Upgrade/Emergency missing attachment remains only a business Warning; that does not weaken scan safety for files that are uploaded.

---

# PART K — REVIEW / APPROVAL

## 29. Queues

Use data tables, not card grids. Useful fields: Request No, family/subtype, Requester, Unit/Division, status, relevant dates. Search/filter remains scoped and paginated.

## 30. Review Detail

Read-only Form Detail | Timeline | Attachments. Actions: Return for Revision, Reject, Forward to Approval. Forward primary positive, Return warning/secondary, Reject destructive. Opening record does not assign/lock reviewer.

## 31. Approval Detail

Read-only detail with easy-to-find Result for Change. Actions: Return Reviewer, Return Requester, Reject, Approve. Approve primary; Reject destructive.

---

# PART L — WORKFLOW DIALOGS / STATUS

## 32. Mandatory Reason Dialogs

Reviewer Return/Reject, Approver Returns/Reject, Reopen, Archive, Unarchive require reason. Dialog clearly states Request No, destination/consequence, reason, explicit confirm label.

Reopen only offers Revision Required or Pending Review. Archived Approved/Rejected must Unarchive first. Cancel reason optional and confirmation states Cancelled is permanent but data/history remain.

## 33. Business Status Labels

Canonical display only:

- Draft
- Pending Review
- Revision Required
- Pending Approval
- Rejected
- Approved
- Cancelled

Archived is separate badge, e.g. `[Approved] [Archived]`.

---

# PART M — HISTORY / TIMELINE / AUDIT UX

## 34. History

Data table optimized for retrieval; archived records separated from default active view. Single/bulk export selection only on visible/eligible records.

## 35. Record Detail

Recommended:

1. Form Detail
2. Timeline
3. Attachments

## 36. Business Timeline

Shows actor, business mutation/workflow/lifecycle action, timestamp, states, reason/comment, meaningful field-change context where allowed.

Routine View/download/export-access evidence MUST NOT flood Business Timeline.

## 37. Privileged Access / Security Audit UX

Raw Access Audit visibility is no longer generic TBD:

```text
Protected Superadmin by default
or explicit audit.access.view + valid underlying scope
```

Security Audit:

```text
Protected Superadmin by default
or explicit audit.security.view + applicable security/admin scope
```

Exact page placement may be refined, but UI MUST:

- not expose raw audit merely because user can view Business Timeline;
- present audit evidence read-only;
- never provide normal delete/purge-by-age action;
- avoid showing plaintext credential/private-key/secret data.

Authoritative Business/Access/Security Audit evidence has **no age-based expiry**. UI MUST NOT show “kept for 12 months” or purge controls based on age.

---

# PART N — SIGN-OFF / EXPORT UX

## 38. Sign-Off Presentation

Show system-derived Requested By, Reviewed By, Approved By + timestamps. Freehand/manual signature is not required.

Approved PDF distinction:

```text
Approved By = human final workflow actor
Digital signer = System/Organization
```

## 39. Export Choice / Queue

Expose `Export XLSX` and `Export PDF`. All generation queued/asynchronous.

User-facing technical statuses may be:

```text
Queued
Processing
Ready to download
Failed
Expired
```

They MUST NOT become NSCMF business badges.

## 40. Ready / Expiry

READY shows format, download, useful timestamp, and `Available until <date/time>`. Re-download allowed within 168h/7d. After expiry show Expired + Generate new export if eligible.

## 41. Signing UX

For Approved PDF READY, indicate document is cryptographically signed by System/Organization. Do not label XLSX signed.

If mandatory signing fails:

- show export Failed;
- do not offer unsigned intermediate PDF;
- do not change Approved state;
- provide retry when issue resolved.

## 42. Critical Signing Configuration State

Required server signing identity is a readiness prerequisite.

If backend reports signing identity missing/unusable:

- surface a **critical configuration/readiness** message to appropriate administrative/operator-facing UI;
- do not falsely show signing subsystem Healthy/Ready;
- do not offer/label an unsigned Approved PDF as valid final output;
- do not expose private-key path/content/passphrase in UI.

Exact health/status placement is downstream Environment/Deployment UX, but silent fallback is forbidden.

---

# PART O — PUBLIC PDF VERIFICATION UX

## 43. Public Verification Page

Conceptual public route: `/ispdfvalid`.

No login required. Page is a narrow verification utility and MUST NOT look/behave like public History/record portal.

Include:

- concise explanation;
- PDF-only uploader;
- relevant upload-size guidance;
- progress state;
- safe validation result;
- retry/new verification action.

Do not expose internal Request No search/browser as an alternate public lookup unless future requirement explicitly approves it.

## 44. Public Upload States

Conceptual:

```text
Uploading…
Scanning file…
Verifying signature and issuance…
Result
```

If ClamAV fails/detects malware, show safe failure and do not continue deep verification. Temporary upload is not a normal NSCMF attachment and is deleted after processing.

## 45. Canonical Result Presentation

Backend semantic values map to user-facing labels:

| Semantic | Display |
|---|---|
| `VALID_CURRENT` | **Valid — Current** |
| `VALID_SUPERSEDED` | **Valid — Superseded** |
| `INVALID_MODIFIED` | **Invalid — Modified** |
| `UNKNOWN` | **Unknown / Not recognized** |

### Valid — Current
Explain that uploaded PDF is recognized as an exact NSCMF-issued artifact and is still the current Approved issuance.

### Valid — Superseded
Explain clearly:

> The file is an authentic exact NSCMF-issued PDF, but it is no longer the current approval issuance because the NSCMF was subsequently Reopened/Reverted or superseded by a newer approved issuance.

Do NOT call it modified/forged solely because it is superseded.

### Invalid — Modified
Explain that file integrity/signature/hash evidence does not match the exact issued artifact. Avoid technical secret/path detail.

### Unknown
Explain that NSCMF cannot recognize/validate it as a known issued artifact. Do not automatically accuse user of forgery/malice.

## 46. Minimum Disclosure

Public result MUST NOT expose:

- full private form content;
- attachments;
- Business Timeline;
- raw Access/Security Audit;
- internal storage paths;
- private key/certificate secret material;
- unnecessary private actor details.

No TSA badge/claim current MVP. UI MUST NOT say `trusted third-party timestamp` because no TSA is required.

---

# PART P — ADMINISTRATION / RE-AUTH / SESSION REVOCATION UX

## 47. Administration

Group Users, Roles/Permissions, Unit/Division, Reviewer/Approval Scope, privileged audit surfaces, Core Settings where eligible. Protected Superadmin destructive/downgrade controls absent/disabled and backend-denied.

## 48. Sensitive-Action Password Re-authentication

Before password reset, role/permission changes, protected security settings, and equivalent sensitive admin actions, show password re-auth dialog/surface:

- state action being confirmed;
- ask **current password** only;
- no MFA control;
- failed re-auth leaves action unapplied;
- do not retain/show password after submit;
- do not use ambiguous `OK`; use explicit confirm label.

## 49. Target Session Revocation Feedback

When admin changes another user's password/role/permission/access state, UI MAY confirm that target active sessions were revoked; administrator is not logged out solely because target changed.

If current user changes their own applicable security-sensitive access/credential and backend revokes their session, UI MUST return to Login cleanly rather than leave a stale authenticated shell.

Max 2 active sessions is enforced server-side; exact third-login eviction presentation remains downstream.

---

# PART Q — LOADING / ERROR / STALE

## 50. Loading / Empty

Use content skeletons, not full-shell spinner when only table/content loads. Disable duplicate destructive/workflow submission. Export/security long work uses persistent status, not indefinite blocking spinner.

## 51. Unauthorized

Generic access-denied/not-available without leaking record existence/details. Backend authority remains final.

## 52. Stale Workflow

If backend says state changed by another actor, show clear state-change message, refresh latest state, disable stale controls. Do not show generic validation failure.

## 53. Save Conflict

Network save failure vs optimistic-version conflict must be distinguishable. Preserve current typed values where feasible, never auto-overwrite newer persisted version.

## 54. Security Failure Copy

Security error should explain what user can do without exposing internals.

Examples:

- `This file could not pass the required security scan.`
- `Your session has expired. Please sign in again.`
- `Your access changed. Please sign in again.`
- `Approved PDF signing is temporarily unavailable due to a required system configuration issue.`

Do not show private-key path, stack trace, ClamAV socket details, DB details, or secrets.

---

# PART R — RESPONSIVE / ACCESSIBILITY / MICROINTERACTIONS

## 55. Responsive

Desktop: persistent sidebar, section nav, multi-column fields, sticky Review/Approval actions, full tables.

Tablet: collapsible navigation, reduced columns, compact section nav.

Mobile: drawer, stacked fields, prioritized table content, usable record/timeline/export/public-validator screens. Required reason/re-auth/security confirmation cannot be dropped for small viewport.

## 56. Keyboard / Labels / Motion

All controls labeled; placeholder not sole label; dialogs manage focus; icon-only actions accessible. Motion subtle/functional and respects reduced-motion where practical.

## 57. Toast

Use for non-critical completion such as Save Draft/Result saved/export queued. Durable conditions (export READY/Failed, critical signing readiness, security scan failure) require persistent visible state; toast alone is insufficient.

---

# PART S — ACTION VISIBILITY

## 58. Requester State Matrix

| State | General Edit | Save | Submit/Resubmit | Update Change Result | Cancel |
|---|---:|---:|---:|---:|---:|
| Draft | Yes | Yes | Submit | normal form | Yes |
| Pending Review | No | No | No | Yes if eligible Change owner | No |
| Revision Required | Yes | Yes | Resubmit | normal form | No |
| Pending Approval | No | No | No | No | No |
| Rejected | No | No | No | No | No |
| Approved | No | No | No | No | No |
| Cancelled | No | No | No | No | No |

## 59. Reviewer / Approver / Lifecycle

Reviewer at scoped `PENDING_REVIEW`: read-only detail + Return/Reject/Forward.

Approver at scoped `PENDING_APPROVAL`: read-only + Return Reviewer/Requester, Reject, Approve.

Visible unarchived Approved/Rejected with `nscmf.reopen`: Reopen. Eligible terminal with `nscmf.archive`: Archive/Unarchive. Archived Approved/Rejected must Unarchive before Reopen.

---

# PART T — COPY PRINCIPLES

## 60. Explicit Labels

Use action verbs: Submit for Review, Save Draft, Forward to Approval, Return for Revision, Return to Reviewer, Return to Requester, Reject NSCMF, Approve NSCMF, Update Result of Changes, Reopen NSCMF, Archive, Unarchive, Export XLSX/PDF, Download, Generate new export, Verify PDF.

Avoid generic `OK`, `Process`, `Execute` for important actions.

## 61. Error Copy

Say what failed and what user can do. Avoid DB column names/internal exceptions/security secrets. `Unknown` validator result is not an accusation. `Superseded` is not `Modified`.

---

# PART U — UI GUARDRAILS

## 62. Developer / AI Must Not

UI MUST NOT:

1. copy Excel pixel-perfect for interactive form while reducing usability;
2. redesign official XLSX/PDF export;
3. add extra subtype from checkbox artifacts;
4. make Service Impact single-select;
5. replace canonical status with Archived;
6. expose invalid Reopen destination;
7. imply first Reviewer/Approver viewer owns record;
8. expose general Requester edit during `PENDING_REVIEW`;
9. require all five Result rows;
10. treat Draft incomplete fields as immediate blocking errors;
11. treat warnings as errors;
12. make attachment mandatory;
13. show uploaded file Ready before ClamAV CLEAN;
14. allow Download for scan-failed/unscanned file;
15. present manual/freehand signature as required workflow identity;
16. equate System/Organization signer with human Approved By;
17. claim unsigned Approved PDF is final after signing failure;
18. label XLSX digitally signed under PDF rule;
19. inject routine View into Business Timeline;
20. expose raw Access/Security Audit to normal viewer without privileged permission/scope;
21. provide audit delete/purge-by-age control;
22. state audit retention is 12 months;
23. expose inaccessible records through search/counts;
24. rely on hidden button as authorization;
25. overuse brand color;
26. switch Vue/Inertia to React;
27. offer HTML PDF fallback;
28. call fidelity/signing failure success;
29. block page synchronously for renderer/signing;
30. display export technical state as NSCMF state;
31. hide 7-day export-binary expiry;
32. show Saved after optimistic conflict;
33. show private storage/key/renderer/scanner paths in errors;
34. add tenant switcher;
35. add MFA control current MVP;
36. show password-composition checklist beyond minimum 6;
37. expose plaintext temporary/current/new password in UI logs/history;
38. allow sensitive admin action after failed password re-auth;
39. keep current user in stale authenticated shell after own session revocation;
40. make public validator a public record/history browser;
41. call `VALID_SUPERSEDED` modified/forged;
42. claim TSA/trusted third-party timestamp current MVP;
43. expose private key/certificate secret material in public/admin UI.

---

# PART V — TESTABLE UX ACCEPTANCE

## 63. Authentication / Session

- [ ] Login shows username/password only; no self-register/MFA.
- [ ] Password UI says minimum 6 only; no composition checklist.
- [ ] generic login failure does not enumerate username.
- [ ] temporary password forces password-change screen.
- [ ] session expiry/revocation returns to Login.
- [ ] no security screen invents new NSCMF business status.

## 64. Forms / Concurrency

- [ ] Draft can save incomplete data.
- [ ] autosave states accurate.
- [ ] optimistic conflict is not Saved and does not overwrite.
- [ ] Service Impact multi-select; Result-only remains narrow.
- [ ] warnings/errors visually distinct.

## 65. Attachments

- [ ] limits/types visible.
- [ ] unsupported/oversized/zero-byte specific failure.
- [ ] structural success enters Scanning, not Ready.
- [ ] only CLEAN becomes Ready/downloadable.
- [ ] malware/error/timeout/unavailable never looks successful.

## 66. Workflow / History / Audit

- [ ] Review/Approval queues use table pattern and remain non-exclusive.
- [ ] mandatory reason dialogs work.
- [ ] Business Timeline excludes routine access noise.
- [ ] raw Access/Security Audit appears only for privileged eligible actor.
- [ ] audit UI has no age-based purge/delete.
- [ ] Archived remains separate badge.

## 67. Export / Signing

- [ ] XLSX/PDF choices explicit.
- [ ] queued/processing/ready/failed/expired not business states.
- [ ] 7-day binary expiry shown.
- [ ] Approved PDF shows System/Organization signing when READY.
- [ ] signing failure offers no unsigned equivalent.
- [ ] critical missing signing identity is surfaced safely to appropriate admin/operator UI.

## 68. Public Validator

- [ ] works without Login.
- [ ] PDF-only upload.
- [ ] shows scan/verification progress.
- [ ] displays Valid—Current / Valid—Superseded / Invalid—Modified / Unknown correctly.
- [ ] Superseded explanatory copy says authentic but no longer current.
- [ ] no private record/audit/attachment leakage.
- [ ] no TSA claim.
- [ ] temporary upload not shown as persisted attachment.

## 69. Administration

- [ ] sensitive role/permission/password reset requests current-password re-auth.
- [ ] failed re-auth leaves action unapplied.
- [ ] target-session revocation feedback is understandable.
- [ ] own-session revocation returns actor to Login.
- [ ] Protected Superadmin invariant remains visible/enforced.

---

# PART W — FIGJAM ALIGNMENT

## 70. FigJam Role

Existing FigJam remains product/system-flow proposal board and SHOULD reflect:

- canonical lifecycle;
- current scope;
- only genuinely remaining TBDs;
- architecture/export direction;
- confirmed security baseline at high level.

Current board has been synchronized with a dedicated **Security Baseline — Confirmed** section covering identity/session, credential admin, ClamAV, permanent audit, Approved-PDF trust, and public PDF validation.

FigJam does not need every field-level UI rule.

---

# PART X — AUTHORITY MATRIX / REMAINING UI TBD

## 71. Authority Matrix

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

## 72. Still Refinable / TBD Without Changing Core UX

- exact neutral grayscale/font assets/breakpoints;
- default table page size;
- autosave trigger interval;
- toast/animation duration;
- exact Unit/Division options;
- official numbering copy after SOP;
- additional export controls if later approved;
- export polling interval;
- exact placement/layout of privileged Access/Security Audit pages;
- exact admin/operator placement of signing-readiness health state;
- exact visual certificate/signature indicator;
- exact third-login/max-2 session replacement UX;
- exact public-validator metadata fields subject to minimum-disclosure API contract.

Not TBD anymore:

```text
min 6 password / no composition
no MFA
temporary password + mandatory change
30m idle / 8h absolute / max2 sessions
sensitive admin password re-auth + target session revocation
ClamAV CLEAN attachment gate
no age-based Business/Access/Security Audit purge
Approved-PDF System/Organization signing + critical key readiness
public PDF validator result semantics
no TSA MVP
exact-template XLSX/PDF
async export
168-hour export binary window
Business Timeline vs Access Audit separation
optimistic conflict behavior
```

---

## 73. Next Document

Next document in fixed order:

**`10_Security_Rules.md`**

It is authoritative for security-control behavior reflected by these UI states.