# UI / UX Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UIUX-007  
> **Document Order:** 07 / 20  
> **Status:** Draft — Confirmed UX Direction + Synchronized through System Architecture  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Visual/Flow Reference:** NSCMF FigJam proposal  
> **UI Implementation Reference:** Vue 3 + TypeScript + Inertia 3 + shadcn-vue + Tailwind CSS 4  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk presentation dan interaction behavior** NSCMF Digital Form & Workflow System.

Dokumen menerjemahkan product scope, business rules, user flow, permission, state machine, dan validation menjadi:

- information architecture;
- application shell/navigation;
- screen hierarchy;
- form layout;
- component behavior;
- visual hierarchy;
- color/design token usage;
- state-aware action presentation;
- permission-aware UI;
- validation/error/warning UX;
- autosave + optimistic-conflict feedback;
- attachment interaction;
- Review/Approval queues;
- Business Timeline/archive treatment;
- exact-template queued export interaction;
- export status/re-download/expiry behavior;
- Approved-PDF signing feedback;
- responsive behavior;
- accessibility expectations;
- loading/empty/error/stale states.

UI/UX MUST NOT mengubah business rule, permission, validation, lifecycle, audit separation, concurrency, atau exact-export requirement yang telah dikunci pada dokumen authoritative lain.

Technology implementation mengikuti `08_Tech_Stack_Specification.md`; system execution/concurrency/export architecture mengikuti `09_System_Architecture.md`. Component/library default MUST menyesuaikan UX spec ini, bukan sebaliknya.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — direkomendasikan kuat sebagai default.
- **MAY** — diperbolehkan.
- **TBD** — belum final dan tidak boleh ditebak implementation.

---

# PART A — UX PRINCIPLES

## 3. Product Experience Direction

NSCMF adalah **enterprise/internal operational application**, bukan marketing website atau consumer app.

Experience MUST mengutamakan:

1. clarity;
2. data readability;
3. predictable workflow;
4. low cognitive load;
5. strong status/action hierarchy;
6. operational efficiency;
7. traceability;
8. permission/state awareness;
9. accessibility;
10. consistency.

Visual design SHOULD modern dan clean, tetapi tidak dekoratif berlebihan.

---

## 4. Neutral-First, Color-With-Purpose

Color MUST digunakan secara selektif.

Default UI surface SHOULD didominasi:

- white;
- neutral/light background;
- black/dark-neutral typography;
- subtle border/divider.

Brand/semantic color digunakan untuk menonjolkan hal yang memang perlu perhatian, misalnya:

- primary CTA;
- active navigation;
- selected state;
- focus indication;
- workflow/status badge;
- warning/error/success;
- important metric;
- high-impact action.

Implementation MUST NOT memberi background berwarna pada setiap card, section, table row, form group, atau dashboard block hanya agar terlihat “designed”.

**Principle:** if everything is highlighted, nothing is highlighted.

---

## 5. Desktop-First

Primary usage target = internal desktop browser.

Design priority:

1. Desktop — full operational workflow and complex form editing;
2. Tablet — usable, with adaptive navigation/layout;
3. Mobile — responsive viewing and basic action where practical, but not primary heavy form-entry experience.

Mobile MUST NOT silently gain fewer authorization checks; responsive simplification is presentation only.

---

## 6. Preserve Business Meaning, Not Spreadsheet Layout — Web UI Boundary

The **web application UI** MUST preserve Excel business fields/sections but SHOULD NOT copy spreadsheet layout pixel-for-pixel when a clearer operational interface is possible.

Examples:

- checkbox artifacts from Excel MUST NOT become extra options;
- source sign-off cells become digital workflow evidence;
- long technical fields may be grouped into readable form sections;
- table-like repeated structures may be represented using repeatable structured rows/cards if more usable.

### Critical Export Exception

This principle applies to **interactive web UI only**.

Export has a separate, stricter business requirement from `01`, `02`, `03`, `08`, dan `09`:

> Generated XLSX and PDF MUST preserve the official NSCMF XLSX template representation exactly. Only mapped business fields and native control states are filled/replaced.

Therefore UI implementation MUST NOT interpret “do not copy spreadsheet pixel-for-pixel” as permission to redesign exported XLSX/PDF.

---

## 7. Progressive Disclosure

Conditional content SHOULD appear/activate only when relevant.

Examples:

- `Other Impact Description` appears when Service Impact includes `Other`;
- subtype-specific fields show their Required state only when applicable;
- optional technical sections may remain collapsed until needed;
- role-specific menu/action is not shown to ineligible users.

Do not flood screen with disabled fields that are not applicable.

---

# PART B — DESIGN SYSTEM FOUNDATION

## 8. Brand Color Palette

Confirmed brand palette:

| Token Intent | HEX | RGB | Usage Intent |
|---|---|---|---|
| `brand-950` | `#091540` | `rgb(9, 21, 64)` | strongest brand emphasis, dark navigation/text accent where appropriate |
| `brand-700` | `#1B2CC1` | `rgb(27, 44, 193)` | primary interactive/CTA/selected state |
| `brand-400` | `#7692FF` | `rgb(118, 146, 255)` | supporting accent/focus/secondary emphasis |
| `brand-200` | `#ABD2FA` | `rgb(171, 210, 250)` | subtle highlight/background treatment |
| `white` | `#FFFFFF` | `rgb(255,255,255)` | primary surfaces |
| `black` | `#000000` | `rgb(0,0,0)` | available for strongest text/graphic usage; normal body may use dark-neutral |

Exact neutral gray scale MAY follow the implementation design-system baseline, provided visual contrast and hierarchy remain consistent.

---

## 9. Semantic Colors

Semantic colors MUST remain semantically recognizable and MUST NOT be forced into brand blue.

Required semantic roles:

- **Success** — green family;
- **Warning** — yellow/amber family;
- **Destructive / Error** — red family;
- **Info / Primary** — blue/brand family;
- **Neutral** — gray/black/white family.

Semantic colors MUST be paired with text/icon/label and never be the only carrier of meaning.

Example: `Rejected` is red + label `Rejected`, not merely a red dot.

---

## 10. Color Usage Rules

### Primary Brand
`#1B2CC1` SHOULD be default primary action/focus/active brand color.

### Dark Brand
`#091540` MAY be used for high-contrast brand/nav/header emphasis, but large dark blocks SHOULD be limited so the application remains visually light and operational.

### Supporting Accent
`#7692FF` and `#ABD2FA` SHOULD support selected/focus/subtle information treatment rather than fill every UI container.

### Destructive Action
Reject/destructive UI MUST use semantic destructive treatment, not primary blue merely for brand consistency.

### Success
Approved/success confirmation SHOULD use semantic green.

### Warning
Revision-required, caution, non-blocking validation, atau atypical configuration SHOULD use amber/yellow semantic treatment.

---

## 11. Contrast and Accessibility

UI SHOULD target WCAG AA-level visual contrast for normal text and interactive states.

MUST:

- maintain readable contrast;
- show visible keyboard focus;
- not rely on color alone;
- label form controls programmatically/visually;
- associate error text with the relevant field;
- keep destructive/primary states distinguishable in normal and reduced-color perception.

---

## 12. Confirmed UI Framework / Component Technology

Final UI implementation baseline:

```text
Vue 3
TypeScript
Inertia 3
shadcn-vue
Tailwind CSS 4
Vite
Lucide / lucide-vue-next icon family
```

The design language remains shadcn-style, implemented with **shadcn-vue**, not the canonical React package.

Useful component families include:

- Button;
- Input;
- Textarea;
- Select;
- Checkbox / Radio Group;
- Field/Form patterns;
- Sidebar;
- Card;
- Badge;
- Table/Data Table;
- Tabs;
- Dialog;
- Alert Dialog;
- Sheet/Drawer;
- Dropdown Menu;
- Tooltip;
- Alert;
- Toast/Sonner-style transient feedback;
- Skeleton;
- Separator;
- Breadcrumb;
- Pagination;
- Progress;
- Calendar/Date Picker patterns;
- Popover/Command patterns where searchable selection is needed.

Rules:

- MUST NOT add React as a second frontend runtime merely to use canonical shadcn/ui;
- MUST NOT change business interaction to fit a component default;
- generated/copied shadcn-vue components MAY be customized to the confirmed NSCMF design tokens and behavior;
- backend remains authoritative for permissions, validation, workflow state, concurrency, dan export eligibility.

---

## 13. Typography

Primary typography SHOULD use a modern, highly readable sans-serif suitable for enterprise data UI.

Preferred baseline: **Inter-compatible metrics / modern system sans**.

Exact font asset/package selection remains an implementation refinement, but hierarchy MUST remain consistent.

Recommended hierarchy intent:

- Page title — strong, compact;
- Section title — clear but not oversized;
- Card/table title — medium emphasis;
- Body — comfortable operational reading;
- Label — concise and consistent;
- Helper/meta text — smaller but still readable.

Avoid oversized “marketing-style” headings inside operational screens.

---

## 14. Spacing, Radius, Border, Elevation

Design SHOULD use restrained enterprise styling:

- consistent spacing scale;
- moderate radius;
- subtle borders;
- limited shadow/elevation;
- whitespace for hierarchy rather than decorative blocks.

Cards SHOULD NOT look like floating tiles everywhere. For dense operational information, border/divider hierarchy may be preferable to repeated elevated cards.

---

## 15. Iconography

Preferred implementation icon family = **Lucide / lucide-vue-next**, consistent with the shadcn-vue stack.

Icons SHOULD:

- support text, not replace critical labels;
- use one consistent icon family;
- be especially useful for navigation, attachment type, status/context, warning, archive, export, and actions.

Critical workflow actions MUST retain text labels on desktop.

---

# PART C — APPLICATION SHELL & INFORMATION ARCHITECTURE

## 16. Desktop Shell

Primary shell:

```text
+----------------------------------------------------------+
| Sidebar | Top header / context / user                    |
|         +------------------------------------------------|
|         | Main content                                   |
|         |                                                |
|         |                                                |
+----------------------------------------------------------+
```

Sidebar SHOULD be persistent/collapsible on desktop.

Top header MAY contain:

- page title/breadcrumb context;
- global contextual controls where needed;
- user/profile/session menu.

Avoid duplicating full navigation in both sidebar and header.

---

## 17. Primary Navigation

Permission-aware navigation baseline:

```text
Dashboard
Create NSCMF
Review
Approval
History
Administration
```

Rules:

- `Create NSCMF` visible only if actor has create capability;
- `Review` visible only if actor can review scoped records;
- `Approval` visible only if actor can approve scoped records;
- `Administration` visible only if actor has relevant admin capabilities;
- menu visibility is UX convenience, NOT authorization enforcement;
- backend remains authoritative.

Multi-role user sees union of relevant navigation items without role switching unless a future requirement adds explicit mode switching.

Current product is single-organization; UI MUST NOT introduce organization/tenant switcher.

---

## 18. Active Navigation

Active item SHOULD use restrained brand emphasis:

- stronger text/icon;
- subtle brand-tinted surface or left indicator;
- not a large saturated block if unnecessary.

Inactive items remain neutral.

---

## 19. Breadcrumb / Context

Deep screens SHOULD expose context such as:

```text
History / NSCMF-202608-00001
Review / NSCMF-202608-00017
Administration / Users / Edit User
```

Breadcrumb is orientation aid; it does not replace page title.

---

# PART D — SCREEN INVENTORY

## 20. Screen Map

MVP UI includes at minimum:

1. Login;
2. Initial Setup Wizard;
3. Dashboard;
4. Create NSCMF entry;
5. Family/Subtype/Numbering selection;
6. Activation Draft/Edit;
7. Change Draft/Edit;
8. Revision Edit;
9. Change Result-only Update;
10. Review Queue;
11. Review Detail;
12. Approval Queue;
13. Approval Detail;
14. History;
15. Record Detail;
16. Timeline;
17. Attachments;
18. Archived view/filter;
19. Export status/download surface;
20. User Administration;
21. Role/Permission Administration;
22. Unit/Division & Scope Administration;
23. Core Settings for protected Superadmin where applicable.

---

# PART E — AUTHENTICATION & INITIAL SETUP UX

## 21. Login Screen

Login MUST be simple and internal-tool oriented.

Include:

- product/organization identity;
- **Username** field;
- **Password** field;
- primary Login button;
- clear invalid-credential/error feedback;
- no self-registration link.

MUST NOT show `Create account`.

Standalone MVP authentication does not require Microsoft/Google/SSO/LDAP controls.

Loading Login SHOULD disable duplicate submission and show clear progress state.

---

## 22. Setup Wizard Structure

First-time setup SHOULD use step-by-step wizard:

```text
1. Role Setup
2. Unit / Division
3. Users / Scope
4. Review Configuration
5. Complete
```

Wizard SHOULD display progress/step indicator.

### Role Setup
Options:
- Use Role Template;
- Manual Role Configuration.

### Unit/Division
Allow template/manual configuration; exact default data remains TBD.

### Users/Scope
Map eligible users to organizational context, Reviewer Scope, Approval Scope.

### Review Configuration
Summarize Reviewer/Approver scope and key workflow settings; MUST NOT introduce exclusive Reviewer/Approver assignment.

### Complete
Review summary before finish.

Back navigation SHOULD preserve completed data unless business validation requires re-entry.

No tenant/organization-selection step is required for current single-organization model.

---

# PART F — DASHBOARD UX

## 23. Dashboard Purpose

Dashboard is operational landing page, not analytics-heavy executive BI.

Primary purpose:

- show what needs attention;
- provide quick access to own/relevant work;
- expose Create NSCMF;
- expose History.

---

## 24. Dashboard Summary Cards

Recommended cards:

- My Draft;
- Revision Required;
- Pending Review — only if reviewer-visible;
- Pending Approval — only if approver-visible.

Cards MUST reflect only records the current user can legitimately see.

Do not show global totals to scoped users merely because dashboard backend can compute them.

### Card Color Rule
Cards SHOULD remain mostly neutral/white.

Use color only for:

- small icon/accent;
- count emphasis;
- state cue where useful.

Do NOT give every card a saturated different background.

---

## 25. Dashboard Recent Work

Dashboard MAY include:

- Recent NSCMF;
- My recently modified Draft/Revision;
- Recent items requiring current role action.

Prefer compact table/list over decorative card grid for operational records.

---

## 26. Dashboard Empty State

If no actionable records:

- explain there is currently nothing requiring attention;
- show relevant next CTA such as `Create NSCMF` if permitted;
- do not display an alarming error-style empty state.

---

# PART G — CREATE NSCMF ENTRY FLOW

## 27. Create Flow Sequence

```text
Create NSCMF
→ Choose Family
→ Choose Subtype
→ Choose Numbering Mode
→ Create/Open Draft Form
```

Do not show Activation and Change full forms simultaneously.

---

## 28. Family Selection

Use two clear choices:

- NSCMF - Activation;
- NSCMF - Change.

Each SHOULD include a short context description so `Upgrade` ambiguity is reduced:

- Activation → installation/provisioning context;
- Change → maintenance/change of existing service/environment.

System MUST NOT auto-classify solely from keyword `Upgrade`.

---

## 29. Subtype Selection

After family selection, show only relevant subtypes.

Activation:
- Activation;
- Upgrade / Downgrade;
- Deactivation.

Change:
- Maintenance;
- Upgrade;
- Emergency.

Use a single-selection control/card/radio pattern; source workbook's overlapping checkbox artifact MUST NOT appear.

---

## 30. Numbering Mode UX

Options:

- Automatic Number Generation;
- Manual Number Entry.

### Automatic
After successful record creation, show generated provisional Request No as read-only.

Example:

```text
NSCMF-202608-00001
```

Mark UI copy carefully so provisional format is not presented as official company policy if business SOP is still pending.

### Manual
Show Request No input with:

- inline format guidance;
- uniqueness/invalid error feedback;
- no whitespace acceptance under current provisional rule.

### After First Submit
Request No MUST display read-only across all normal workflow states.

---

# PART H — FORM LAYOUT SYSTEM

## 31. Form Composition

Complex NSCMF forms SHOULD use **multi-section single-page editing** rather than one visually continuous spreadsheet-like sheet.

Recommended structure:

```text
[Page Header / Request No / State / Save status]

[Left Section Navigator] [Current Form Section]
                         [Fields]
                         [Fields]
                         [Fields]

[Sticky/anchored action area where appropriate]
```

User MAY navigate between sections while Draft/Revision remains editable.

---

## 32. Section Navigator

Desktop left section navigator SHOULD:

- show section names;
- indicate current section;
- optionally indicate section completeness/error presence after validation attempt;
- remain compact;
- not imply workflow state progression.

This is a form-navigation aid, not a wizard that forbids jumping between sections during Draft.

---

## 33. Form Header

Persistent/near-persistent form context SHOULD display:

- Request No;
- family/subtype;
- current business status badge;
- separate Archived badge if applicable;
- Requester/owner;
- Unit/Division when useful;
- autosave state while editable.

Do not conflate `Archived` with business status.

---

## 34. Required / Conditional / Optional Indicators

### Required
Use `*` adjacent to field label and accessible required semantics.

### Conditionally Required
When condition becomes true, field SHOULD visually become Required and expose helper text if condition is not obvious.

### Optional
Do not add `(optional)` to every field if it creates visual noise; use section guidance or selective labels where ambiguity exists.

---

## 35. Draft Validation Presentation

Draft editing MUST NOT show every missing Submit-required field as red immediately.

During normal Draft:

- required indicator may be visible;
- format errors MAY show when user completes/leaves a malformed field;
- incomplete untouched required fields SHOULD remain neutral until validation is appropriate;
- Save Draft can succeed with incomplete business data.

On Submit attempt:

- run full submission validation;
- show inline field errors;
- show top-level error summary linking/scrolling to affected sections where practical.

---

## 36. Error Summary

Blocking validation summary SHOULD appear near top of form after failed workflow action.

Example:

```text
We couldn't submit this NSCMF.
4 fields need attention.
• Customer Name
• Service Impact
• Rollback Scenario
• Target Date of Execution
```

Summary complements, not replaces, inline errors.

---

## 37. Warning Presentation

Warnings MUST be visually distinct from errors.

Examples:

- Upgrade/Emergency has no attachment;
- Maintenance Announcement timing is atypical for selected subtype.

Warning SHOULD use amber/yellow semantic treatment and state that action may continue.

Do not make warning copy sound like submission failed.

---

# PART I — AUTOSAVE / SAVE DRAFT UX

## 38. Autosave States

Editable Draft/Revision SHOULD display unobtrusive persistence status:

```text
Saving…
Saved just now
Save failed — retry
Changes changed elsewhere — review latest version
```

Do not show a toast for every successful autosave.

A backend optimistic-version conflict MUST NOT be rendered as `Saved` or generic success.

---

## 39. Manual Save Draft

`Save Draft` remains visible while Draft/Revision editable.

Successful manual save MAY show brief confirmation, but should not interrupt work with modal.

Save failure/version conflict MUST be obvious and MUST NOT falsely display `Saved`.

---

## 40. Navigation With Pending Save

If a save request is still in progress, UI SHOULD avoid silently losing user changes. Exact implementation may use save completion, guarded navigation, or retry behavior.

Do not promise persistence before backend success.

When backend reports optimistic-version conflict, UI SHOULD provide an explicit path to refresh/review the latest persisted version rather than automatically overwriting it.

---

# PART J — ACTIVATION FORM UX

## 41. Activation Section Structure

Recommended section navigation:

```text
General / Service
Reference
Existing Service
New Service
RFS / SLA
NOC / Network
Bandwidth
Domain / DNS / Email / Hosting
Onsite — Direct
Onsite — POP
Attachments
```

Sections that are not applicable MAY be collapsed/hidden or clearly optional depending on subtype.

---

## 42. Existing / New Service Conditional UX

### Activation
- New Service = Required section;
- Existing Service = Optional.

### Upgrade / Downgrade
- Existing Service = Required;
- New Service = Required.

### Deactivation
- Existing Service = Required;
- New Service = Optional.

If user begins an optional service block, UI SHOULD indicate the full core block becomes required before Submit.

---

## 43. Service Status Control

`Activated` / `Deactivated` is exactly one value.

Use radio/select/single-choice pattern, not two independent checkboxes that can both be selected.

---

## 44. IP / CIDR / Network Fields

Network-related fields SHOULD expose format helper examples without over-constraining legitimate technical text.

For fields accepting multiple values such as LAN allocation, UI SHOULD support a readable multi-line format.

Invalid entries should point to the exact line/item where possible.

---

## 45. Bandwidth Inputs

Bandwidth values SHOULD use numeric input with visible `Mbps` unit suffix/context.

Hosting Capacity SHOULD expose `GB` unit context.

Latency SHOULD expose `ms`.

Packet Loss SHOULD expose `%`.

Unit display MUST NOT become part of the raw numeric user value in a way that prevents proper validation.

---

## 46. Repeated SLA / Priority Fields

For source capacities of up to 3 rows, UI MAY use:

- fixed three compact rows; or
- add/remove repeatable rows capped at 3.

Preferred: start with one row and allow `Add another` until max, reducing empty visual noise.

---

# PART K — CHANGE FORM UX

## 47. Change Section Structure

Recommended navigation:

```text
General
Purpose of Changes
Service Impact
Improvement Plan / KPI
Execution & Monitoring
Rollback & Announcement
Attachments
Result of Changes
```

During initial Draft, Result section MAY be present but clearly marked as not required yet / completion stage later.

---

## 48. Facing Challenges

For Upgrade/Emergency it becomes Required.

Source supports max 3 entries. Preferred UX:

- one initial text item;
- `Add another challenge` until 3;
- remove unused added rows while editable.

Maintenance may leave it empty.

---

## 49. Identified Problem

Required for all Change subtypes, max 3 items.

Use repeatable narrative items rather than one spreadsheet-looking three-row grid unless data density testing shows a grid is clearer.

---

## 50. Service Impact Multi-Select

Service Impact MUST be rendered as multi-select.

Preferred patterns:

- checkbox group for the seven known options; or
- accessible multi-select/command pattern if future options become large.

For current seven options, checkbox group is preferred for visibility.

If `Other` checked:

- show `Other Impact Description` immediately;
- mark Required;
- position close to `Other` selection.

---

## 51. Improvement Plan / Target KPI

Represent paired rows together so relationship is obvious.

Preferred pattern:

```text
Plan 1                     Target KPI 1
[........................] [........................]

+ Add Plan / KPI pair
```

Maximum 3 pairs.

If one field in pair is filled and counterpart empty, inline validation should explain pair completeness requirement.

---

## 52. Monitoring Period

Preferred structured input:

```text
[amount] [unit dropdown]
```

Allowed UI units baseline:
- minute;
- hour;
- day;
- week.

Avoid free-text duration when structured input can prevent ambiguity.

---

## 53. Maintenance Announcement

Exactly one selection.

Use radio group or single-select:

- 1 week before;
- 2 weeks before;
- 2 days before (emergency).

Atypical combination produces Warning, not blocking state.

---

# PART L — RESULT OF CHANGES UX

## 54. Result in Draft

During initial Draft:

- Result section MAY remain empty;
- section SHOULD communicate that final Result can be completed during Review stage;
- user MAY optionally enter Result if already available;
- if a row is started, completeness rule still applies at Submit.

Do not visually imply initial Submit is impossible simply because Result is empty.

---

## 55. Requester Result CTA During `PENDING_REVIEW`

For own eligible Change record, Requester with `nscmf.change.result.edit` SHOULD see a distinct CTA:

**`Update Result of Changes`**

This CTA MUST NOT be labelled `Edit Form` because general submitted data is locked.

---

## 56. Result-Only Editing Surface

When CTA opened:

- show key read-only context: Request No, subtype, current status;
- show submitted planning context read-only only if needed to understand Result;
- editable area contains only:
  - Result Summary;
  - Performance Information;
  - Status;
- max 5 rows;
- allow add/remove rows up to capacity;
- save Result changes without changing business state;
- use optimistic-version conflict handling equivalent to Draft persistence.

UI MUST NOT expose enabled controls for Service Impact, Plan/KPI, Target Date, Rollback, or unrelated submitted fields.

If server reports version conflict, Result UI MUST NOT silently overwrite newer Result data.

---

## 57. Result Forward Readiness

Reviewer Detail SHOULD clearly indicate Result readiness for Change.

Examples:

- `Result incomplete — Forward unavailable`;
- `1 complete result row — ready for Forward`.

This is informational UX based on backend validation; UI must still revalidate on action.

Do not require all five rows visually.

---

# PART M — ATTACHMENT UX

## 58. Uploader

Editable attachment area SHOULD support:

- drag-and-drop;
- `Browse files`;
- file list.

Display constraints near uploader:

```text
Up to 10 files • 20 MB each
PDF, XLS/XLSX, DOC/DOCX, PNG, JPG/JPEG, TXT, CSV
```

---

## 59. Attachment Item

Each file item SHOULD show:

- filename;
- file type/icon;
- size;
- upload state;
- remove action only if current state/permission permits.

Do not expose storage path.

---

## 60. Invalid Attachment

Rejected file SHOULD show specific reason:

- unsupported type;
- exceeds 20 MB;
- zero-byte;
- exceeds 10-file limit.

A rejected file MUST NOT appear as successfully attached.

---

## 61. Read-Only Attachment Context

In Review/Approval/History, attachments display read-only with view/download behavior if permitted.

`PENDING_REVIEW` Result-only edit MUST NOT expose attachment mutation under current requirement.

Attachment view/download MAY create separate Access Audit evidence; it MUST NOT create a business workflow state/action row.

---

# PART N — REVIEW QUEUE & REVIEW DETAIL

## 62. Review Queue

Use operational **table/data-table**, not card grid.

Minimum useful columns:

- Request No;
- family;
- subtype;
- Requester;
- Unit/Division;
- current status;
- submitted/updated date.

All rows are `PENDING_REVIEW` candidates for the scoped Reviewer context, but status column remains useful if queue/filter model is later shared.

---

## 63. Review Queue Search / Filter

Baseline filters:

- Request No;
- family;
- subtype;
- Requester;
- Unit/Division;
- status;
- date/date range.

Search/filter behavior must never return inaccessible records.

Pagination strategy finalized in technical/API implementation, but UI SHOULD support large datasets without loading an unbounded table.

---

## 64. Review Detail

Reviewer sees **read-only structured record detail**, not editable Requester form.

Recommended page:

```text
Header: Request No / status / family / requester
Tabs/sections: Form Detail | Timeline | Attachments

Main read-only content

Sticky Action Bar/Panel:
[Return for Revision] [Reject] [Forward to Approval]
```

For Change, Result readiness/error is visible before Forward.

Opening Review Detail does not change state or create exclusive ownership. Access evidence is handled separately from Business Timeline.

---

## 65. Review Action Hierarchy

- `Forward to Approval` = primary positive workflow action;
- `Return for Revision` = secondary/warning-impact;
- `Reject` = destructive.

Do not place Reject as visually equal primary blue button.

---

# PART O — APPROVAL QUEUE & DETAIL

## 66. Approval Queue

Same table principles as Review, scoped to eligible `PENDING_APPROVAL` records.

Baseline filters match Review where relevant.

---

## 67. Approval Detail

Read-only structured detail with:

```text
Form Detail | Timeline | Attachments
```

Action bar:

- Return to Reviewer;
- Return to Requester;
- Reject;
- Approve.

`Approve` = primary success/primary action.
`Reject` = destructive.
Return actions = secondary/warning hierarchy.

---

## 68. Approval Result Visibility

For Change, Approver MUST be able to see Result of Changes clearly because Forward gate has already required it.

Do not hide Result in a collapsed section that makes final approval blind by default; section may be navigable but should be easy to locate.

---

# PART P — WORKFLOW ACTION DIALOGS

## 69. Mandatory-Reason Actions

Actions requiring reason MUST open confirmation dialog/modal before final submission:

- Reviewer Return;
- Reviewer Reject;
- Approver Return to Reviewer;
- Approver Return to Requester;
- Approver Reject;
- Reopen/Revert;
- Archive;
- Unarchive.

Dialog includes:

- clear action title;
- current Request No/context;
- destination where relevant;
- reason textarea;
- consequence summary;
- explicit confirm button;
- cancel/close.

---

## 70. Reject Dialog

Reject SHOULD use destructive treatment.

Copy should clearly explain that normal workflow stops and recovery requires authorized Reopen.

Do not use ambiguous button text like `OK`.

Use e.g. `Reject NSCMF`.

---

## 71. Return Dialog

Dialog SHOULD identify target:

- `Return to Requester for Revision`;
- `Return to Reviewer`.

Reason required and visible in later timeline.

---

## 72. Reopen Dialog

Reopen requires:

1. mandatory reason;
2. destination selection restricted to:
   - Revision Required;
   - Pending Review.

UI MUST NOT show Draft or Pending Approval as choices.

If record archived, Reopen CTA must not operate; user must Unarchive first if authorized.

---

## 73. Archive / Unarchive Dialog

Both require reason.

Archive dialog MUST communicate:

- business status will not change;
- record leaves default active view;
- history remains.

Unarchive dialog MUST communicate business status remains unchanged.

---

## 74. Cancel Draft Confirmation

Cancel reason is Optional.

Confirmation SHOULD state:

- Draft will become permanently `Cancelled`;
- it cannot be Reopened;
- data/history remains.

Optional reason field MAY be included but MUST NOT block confirmation when empty.

---

# PART Q — STATUS & ARCHIVE PRESENTATION

## 75. Business Status Labels

Human-readable labels:

| Canonical | Display |
|---|---|
| `DRAFT` | Draft |
| `PENDING_REVIEW` | Pending Review |
| `REVISION_REQUIRED` | Revision Required |
| `PENDING_APPROVAL` | Pending Approval |
| `REJECTED` | Rejected |
| `APPROVED` | Approved |
| `CANCELLED` | Cancelled |

Backend canonical identifiers MUST NOT be renamed by UI implementation.

---

## 76. Status Badge Semantic Direction

Suggested semantic treatment:

- Draft → neutral;
- Pending Review → info/brand-light;
- Revision Required → warning/amber;
- Pending Approval → stronger brand/primary;
- Rejected → destructive/red;
- Approved → success/green;
- Cancelled → neutral/dark-muted.

Use text label + color.

---

## 77. Archived Badge

`Archived` appears as **separate secondary badge/treatment** alongside business status.

Correct:

```text
[Approved] [Archived]
```

Incorrect:

```text
[Archived] // replacing Approved
```

---

# PART R — HISTORY / RECORD DETAIL / TIMELINE

## 78. History Screen

Use data table optimized for retrieval.

Baseline columns:

- Request No;
- family;
- subtype;
- Requester;
- Unit/Division;
- status;
- archived treatment;
- last updated/date.

Support single/bulk selection where export eligible.

---

## 79. Active vs Archived

Default History/operational view SHOULD exclude archived records.

Provide explicit filter/tab/control:

- Active / All Visible;
- Archived.

Exact wording may be refined, but archived must not silently mix into normal active queue.

---

## 80. Record Detail Information Architecture

Recommended tabs:

1. **Form Detail**
2. **Timeline**
3. **Attachments**

If tabs impair mobile accessibility, sections may stack, but conceptual separation remains.

---

## 81. Business Timeline

Chronological Business Timeline SHOULD show:

- actor;
- persisted business/workflow/lifecycle action/event;
- timestamp;
- source/result state where relevant;
- reason/comment where present/required;
- meaningful field-change context where allowed by audit design.

Multiple Reviewers/Approvers may appear; timeline MUST NOT imply first viewer owns record.

Routine `View`, attachment download, export request/download access evidence MUST NOT be injected as routine Business Timeline rows. Those belong to separate Access Audit concern. Whether/where privileged users can inspect Access Audit is defined by downstream Security/UI authorization requirement.

---

## 82. Sign-Off Presentation

Digital UI SHOULD present system-derived business sign-off evidence:

- Requested By;
- Reviewed By/current iteration Forward actor;
- Approved By/final Approver;
- timestamps.

Freehand/manual signature input MUST NOT be shown as required workflow identity because authenticated workflow action is authoritative business evidence.

### Approved PDF Cryptographic Signature

Separate from workflow sign-off, exported PDF bound to an `APPROVED` snapshot receives cryptographic signature from **System/Organization** according to `09`/`10`.

UI SHOULD communicate this distinction clearly:

```text
Approved By = human workflow actor
PDF digital signature = organization/system document-integrity signature
```

UI MUST NOT imply that system/organization certificate changes who approved the NSCMF.

---

# PART S — SEARCH, FILTER, TABLE & EXPORT BEHAVIOR

## 83. Table Principles

Operational tables SHOULD support:

- sortable useful columns where backend supports it;
- filter state;
- pagination;
- row click/detail action;
- selected rows for bulk export where permission valid;
- clear empty/loading/error states.

Avoid horizontal overload; lower-priority columns may be hidden/adaptive at narrower widths.

---

## 84. Exact-Template Asynchronous Export UX

Export controls MUST reflect the confirmed export contract, not imply a redesigned report.

### Single Export Choice

Eligible record detail/list MUST expose explicit supported choices:

- `Export XLSX`;
- `Export PDF`.

Both outputs use the **official NSCMF XLSX template** as the visual/export source of truth.

User does not edit template layout from the web UI.

### Queued Behavior

All single/bulk export generation is asynchronous.

After user requests export:

- UI SHOULD acknowledge that export is queued;
- UI MUST NOT block the page until renderer completes;
- UI obtains status through polling/refresh; WebSocket is not required;
- export technical status MUST remain visually distinct from NSCMF business status.

Conceptual user-facing states MAY map from technical states:

```text
Queued
Processing
Ready to download
Failed
Expired
```

These MUST NOT appear as new NSCMF workflow badges.

### Ready / Re-Download

When export is READY:

- show explicit download action;
- show format (`XLSX` / `PDF`);
- show generated/ready timestamp when useful;
- show expiration context such as `Available until <date/time>`;
- authorized user can re-download during the **168-hour / 7-day** validity window.

After expiry:

- disable/remove stale Download action;
- present `Expired` treatment;
- provide `Generate new export` when actor remains eligible.

### XLSX Treatment

XLSX UI MAY communicate:

- output follows official template;
- downloaded local file may be edited outside the application;
- external edit does not update the application record.

Do not label XLSX as cryptographically signed under current requirement.

### PDF Treatment

PDF UI MUST communicate exact-template generation.

For snapshot `APPROVED`:

- UI SHOULD indicate final PDF is cryptographically signed by System/Organization once READY;
- human `Approved By` remains separate business sign-off;
- no QR/visual-stamp requirement is invented here.

For non-Approved snapshot:

- UI MUST NOT falsely label the PDF as organization-signed.

### Approved-PDF Signing Failure

If mandatory signing fails:

- export is shown as Failed;
- UI MUST NOT offer the unsigned intermediate PDF as equivalent fallback;
- NSCMF remains Approved;
- provide retry path when appropriate.

### Bulk Export

Bulk select MUST only select visible/eligible records.

On export:

- backend validates each record;
- inaccessible record cannot leak;
- generation is queued/background;
- UI SHOULD display processing/success/failure state;
- each file follows exact-template/snapshot/signing/retention rules;
- if some selection becomes stale/inaccessible, UI should report operation failure without leaking unauthorized details.

Exact bulk packaging remains downstream TBD.

### Fidelity Failure

If XLSX/template integrity validation or PDF renderer fidelity fails:

- UI MUST NOT present the artifact as successfully generated final export;
- show clear retry/failure feedback;
- MUST NOT silently substitute an HTML-generated PDF with different layout.

Additional formats beyond XLSX/PDF remain downstream TBD.

---

# PART T — ADMINISTRATION UX

## 85. Administration Navigation

Administration MAY group:

- Users;
- Roles & Permissions;
- Unit / Division;
- Reviewer Scope;
- Approval Scope;
- Core Settings for protected Superadmin.

Only eligible sections visible to actor.

---

## 86. User Management

Table/list + detail/edit pattern preferred.

Actions may include:

- create user;
- update eligible user;
- enable/disable normal user;
- reset credential;
- assign roles;
- assign Unit/Division;
- assign scopes.

Protected Superadmin destructive/downgrade actions MUST be absent/disabled and still rejected server-side.

---

## 87. Roles / Permissions

Permission UI SHOULD group permissions by domain/capability rather than one unstructured long checkbox list.

Special capabilities such as:

- Reopen;
- Archive/Unarchive;
- Change Result edit;
- admin permissions;

should have explanatory text because they have state/scope implications.

---

## 88. Scope Configuration

Reviewer and Approver scope MUST NOT appear as exclusive per-record assignment.

Configuration should convey:

- Reviewer → eligible Unit/Division scope;
- Approver → eligible Approval Scope, potentially multi-unit.

---

# PART U — LOADING / EMPTY / ERROR / STALE STATES

## 89. Loading

Use skeleton/loading states for data-heavy screens.

Do not replace entire shell with spinner when only table/content is loading.

Disable duplicate destructive/workflow submission while request in progress.

Queued export SHOULD use persistent status UI rather than indefinite blocking spinner.

---

## 90. Empty State

Empty state SHOULD explain context:

- `No records pending review`;
- `No archived records found`;
- `No attachments`;
- `No generated exports yet` where an export-status surface exists.

Provide relevant CTA only when actor can perform it.

---

## 91. Authorization Error

Unauthorized access SHOULD avoid leaking record details.

UI may show generic access denied/not available based on security routing decision.

Backend response remains authoritative.

---

## 92. Stale Workflow State UX

If backend rejects stale action because another Reviewer/Approver already changed state:

- do not show generic validation error;
- show clear state-change message;
- refresh/reload current record state;
- disable invalid old action controls;
- preserve safe unsent text such as action reason only where feasible and not misleading.

Example:

```text
This NSCMF has already moved to Pending Approval.
The page has been refreshed to show the latest state.
```

---

## 93. Network / Save / Optimistic-Conflict Failure

On failed Draft/Result persistence:

- show `Save failed` state;
- do not report saved timestamp falsely;
- provide retry path;
- avoid losing currently typed value in UI where technically feasible.

If backend reports version conflict:

- distinguish it from ordinary network failure;
- explain that a newer persisted version exists;
- do not automatically overwrite it;
- offer refresh/review-latest behavior according to API contract.

---

# PART V — RESPONSIVE BEHAVIOR

## 94. Desktop

Primary full experience.

Recommended behavior:

- persistent sidebar;
- left form section navigator;
- multi-column field layout where natural;
- sticky action area for Review/Approval;
- full table columns.

---

## 95. Tablet

- sidebar may collapse to icon rail/drawer;
- forms reduce columns;
- section navigator may become top dropdown/compact step list;
- action panel remains accessible without covering content.

---

## 96. Mobile

- navigation via drawer/sheet;
- form fields stack single-column;
- tables may use prioritized columns + detail row/card fallback;
- timeline/record viewing remains usable;
- basic workflow action MAY remain available if dialog/content fits safely;
- export status/download remains usable;
- heavy form entry is supported responsively where possible but is not primary optimization target.

Do not remove required confirmation/reason controls merely because viewport is small.

---

# PART W — ACCESSIBILITY & INPUT BEHAVIOR

## 97. Keyboard

Interactive controls SHOULD be keyboard reachable in logical order.

Dialogs MUST manage focus appropriately and return focus to triggering control when closed where implementation supports standard accessible dialog behavior.

---

## 98. Labels and Errors

Every form control MUST have a visible/programmatic label.

Placeholder MUST NOT be the only label.

Error message SHOULD reference field in accessible semantics.

---

## 99. Touch / Click Targets

Interactive hit areas should remain practical for tablet/mobile and not require precision clicks on tiny icons.

Icon-only action MUST have accessible name/tooltip where appropriate.

---

# PART X — MICROINTERACTIONS

## 100. Motion

Motion SHOULD be subtle and functional:

- menu/dialog transitions;
- expand/collapse;
- save feedback;
- state update;
- export-status update.

Avoid decorative looping animation.

Respect reduced-motion preference where feasible.

---

## 101. Toast Usage

Use transient toast for completed non-critical operations such as:

- manual Save Draft success;
- Result saved;
- export request queued.

A READY export SHOULD also have a durable status/download affordance; toast alone is insufficient because artifact remains downloadable for seven days.

Do not rely on toast as the only place for blocking validation/export/signing errors.

---

# PART Y — COMPONENT CATALOG

## 102. Core Components

| Component | Primary Use |
|---|---|
| Button | workflow/form actions |
| Input | short text/manual Request No |
| Textarea | narrative/reason/result |
| Select / Radio Group | single-select enum |
| Checkbox Group | Service Impact/reference multi-select |
| Number Input + Unit | bandwidth/capacity/latency/duration |
| Date Picker/Input | date fields |
| Sidebar | primary navigation |
| Badge | status/archive/compact metadata |
| Table/Data Table | queues/history/admin |
| Tabs | Form Detail/Timeline/Attachments |
| Dialog | forms/confirmation when non-destructive |
| Alert Dialog | high-impact destructive/recovery action |
| Alert | warning/error/info block |
| Toast | transient operation feedback |
| Skeleton | loading content |
| Dropdown Menu | secondary row/page actions |
| Tooltip | icon/helper clarification |
| Separator | section hierarchy |
| Breadcrumb | navigation context |
| Pagination | large data sets |
| Progress / Steps | setup wizard |
| File Uploader | attachments |
| Section Navigator | long NSCMF forms |
| Timeline Item | business audit/workflow activity |
| Export Status / Job Feedback | queued/processing/ready/failed/expired exact-template export |
| Expiry Indicator | generated export 7-day download window |

Implementation baseline is **Vue 3 + TypeScript + Inertia 3 + shadcn-vue + Tailwind CSS 4**, with Lucide-family icons.

---

# PART Z — ACTION VISIBILITY MATRIX

## 103. State-Aware Requester UI

| State | General Edit | Save Draft | Submit/Resubmit | Update Change Result | Cancel |
|---|---:|---:|---:|---:|---:|
| Draft | Yes | Yes | Submit | part of normal form | Yes |
| Pending Review | No | No | No | Yes if eligible Change owner | No |
| Revision Required | Yes | Yes | Resubmit | part of normal form | No |
| Pending Approval | No | No | No | No | No |
| Rejected | No | No | No | No | No |
| Approved | No | No | No | No | No |
| Cancelled | No | No | No | No | No |

UI hiding/disabled state is convenience only; server enforces authority.

Export availability is separately governed by record visibility/export permission and is not equivalent to editability.

---

## 104. Reviewer UI

At `PENDING_REVIEW` and matching scope:

- Form Detail read-only;
- Business Timeline accessible;
- Attachments read-only;
- Return available;
- Reject available;
- Forward available if current backend validation allows action.

For Change with incomplete Result, Forward MAY be disabled with reason, but backend MUST still validate on submission because state/data can change concurrently.

---

## 105. Approver UI

At `PENDING_APPROVAL` and matching Approval Scope:

- read-only detail;
- Return Reviewer;
- Return Requester;
- Reject;
- Approve.

No field editing.

---

## 106. Lifecycle Actor UI

For visible unarchived `APPROVED`/`REJECTED` with `nscmf.reopen`:
- Reopen/Revert action visible.

For eligible terminal state + `nscmf.archive`:
- Archive visible when not archived;
- Unarchive visible when archived.

Archived Approved/Rejected MUST NOT expose working Reopen action until Unarchived.

---

# PART AA — UI COPY PRINCIPLES

## 107. Action Labels

Use explicit verbs:

- `Submit for Review`;
- `Save Draft`;
- `Forward to Approval`;
- `Return for Revision`;
- `Return to Reviewer`;
- `Return to Requester`;
- `Reject NSCMF`;
- `Approve NSCMF`;
- `Update Result of Changes`;
- `Reopen NSCMF`;
- `Archive`;
- `Unarchive`;
- `Export XLSX`;
- `Export PDF`;
- `Download`;
- `Generate new export` for expired artifact where eligible.

Avoid generic `Process`, `Execute`, `OK`, or ambiguous labels for workflow-changing actions.

---

## 108. Validation / Error Copy

Copy SHOULD say:

- what is wrong;
- what user needs to do;
- where relevant, why action cannot continue.

For export failure, distinguish record/access failure from technical renderer/fidelity/signing failure without exposing sensitive internals.

For optimistic conflict, explain that a newer version exists instead of describing it as an ordinary validation error.

Avoid exposing backend field names such as database column identifiers to normal users.

---

# PART AB — UI GUARDRAILS

## 109. Developer / AI Must Not

UI implementation MUST NOT:

1. copy Excel pixel-for-pixel for the **interactive web form** when a clearer structured UI is possible;
2. interpret rule #1 as permission to redesign exported XLSX/PDF — exports MUST remain exact-template;
3. add a fourth subtype from overlapping source checkbox controls;
4. make Service Impact single-select;
5. show `Archived` as replacement business status;
6. expose Reopen destination Draft/Pending Approval;
7. make Reviewer/Approver first viewer look like exclusive owner;
8. hide other eligible Reviewer/Approver access after first view;
9. show general Edit Form on `PENDING_REVIEW` for Requester;
10. let Result-only edit expose unrelated submitted fields;
11. visually require all five Result rows;
12. show all incomplete Draft fields as errors before appropriate validation;
13. treat warning as blocking error;
14. make Upgrade/Emergency attachment mandatory;
15. show Request/Review/Approved sign-off as manually typed workflow identity;
16. invent required freehand/manual signature input;
17. ignore confirmed cryptographic signing requirement for Approved PDF output;
18. imply organization/system cryptographic signer is the human `Approved By`;
19. present Cancelled as Reopen-able;
20. allow Archive button on active-work state;
21. inject routine View/access events into normal Business Timeline;
22. hide business timeline from a legitimate record viewer;
23. show inaccessible records through filter/search/count leakage;
24. rely on hidden buttons as security;
25. overuse brand colors on every surface;
26. render all dashboard cards with saturated backgrounds;
27. use red for normal primary actions or blue for destructive Reject solely for brand consistency;
28. switch the confirmed Vue/Inertia runtime to React without specification change;
29. introduce canonical React shadcn/ui as a second runtime instead of shadcn-vue;
30. let shadcn-vue default styling override confirmed NSCMF brand/semantic hierarchy;
31. provide HTML/Blade/Vue PDF as a fallback that differs from official XLSX template;
32. label a fidelity-failed/renderer-failed/signing-failed export as successfully generated;
33. offer unsigned Approved PDF when mandatory signing fails;
34. present XLSX as digitally signed under the PDF signing requirement;
35. make user wait synchronously for renderer/signing in a blocking page request;
36. present `QUEUED/PROCESSING/READY/FAILED/EXPIRED` as NSCMF business statuses;
37. hide seven-day expiry so user assumes generated artifact is permanent;
38. falsely show `Saved` after optimistic-version conflict;
39. silently overwrite a newer Draft/Result version;
40. expose internal renderer/storage/signing-key paths in export error UI;
41. add tenant/organization switcher to current single-organization product.

---

# PART AC — TESTABLE UX ACCEPTANCE CRITERIA

## 110. Shell / Navigation

- [ ] Desktop uses clear permission-aware primary navigation.
- [ ] Multi-role user sees additive relevant menus.
- [ ] Hidden menu does not replace backend authorization.
- [ ] Current location is visually clear.
- [ ] No tenant switcher exists for current single-organization model.

## 111. Visual System

- [ ] Brand palette uses `#091540`, `#1B2CC1`, `#7692FF`, `#ABD2FA` consistently.
- [ ] White/neutral surfaces remain dominant.
- [ ] Brand color is selective, not applied to every container.
- [ ] Green/yellow/red communicate semantic success/warning/destructive meaning.
- [ ] Status meaning is not color-only.
- [ ] Focus state is visible.
- [ ] shadcn-vue components respect the confirmed design tokens/semantic hierarchy.

## 112. Draft / Form

- [ ] Draft can save incomplete business fields.
- [ ] Autosave shows Saving/Saved/Failed state.
- [ ] Manual Save Draft remains available in editable state.
- [ ] Optimistic-version conflict is not reported as Saved.
- [ ] Conflict UI does not silently overwrite newer data.
- [ ] Required fields have clear indicator.
- [ ] Conditional fields appear/activate when relevant.
- [ ] Submit failure shows inline errors + useful summary.
- [ ] Warnings are visually distinct and non-blocking.

## 113. Activation

- [ ] Subtype controls Required Existing/New Service section correctly.
- [ ] Activated/Deactivated uses exactly-one control.
- [ ] Technical units are visible without corrupting raw numeric value.
- [ ] Repeatable max-3 fields do not create unnecessary empty visual noise.

## 114. Change

- [ ] Service Impact is multi-select.
- [ ] Other description appears when Other selected.
- [ ] Plan/KPI pair relationship is obvious.
- [ ] Monitoring Period uses structured amount + unit pattern.
- [ ] Maintenance Announcement is single-select.
- [ ] Upgrade/Emergency no-attachment is Warning, not Error.

## 115. Result of Changes

- [ ] Empty Result on initial Draft does not visually block normal preparation.
- [ ] Eligible Requester sees `Update Result of Changes` during `PENDING_REVIEW`.
- [ ] Result-only UI cannot edit planning fields.
- [ ] Max 5 rows but UI does not imply all are required.
- [ ] Reviewer can identify Result readiness before Forward.
- [ ] Result save handles optimistic version conflict without silent overwrite.

## 116. Review / Approval

- [ ] Queues use table/data-table pattern.
- [ ] Record detail is read-only for Reviewer/Approver.
- [ ] Action panel remains easy to locate.
- [ ] Reject uses destructive hierarchy.
- [ ] Return/Reject dialogs require reason.
- [ ] Approve is clear primary final action.
- [ ] Stale action feedback refreshes current state.
- [ ] Opening a record does not imply exclusive ownership.

## 117. History / Archive / Audit Presentation

- [ ] Record detail exposes Form Detail, Business Timeline, Attachments.
- [ ] Business Timeline does not fill with routine View/access rows.
- [ ] Archived is separate from business status.
- [ ] Archived records are not mixed into default active view.
- [ ] Archive/Unarchive require reason.
- [ ] Reopen unavailable on archived record until Unarchive.

## 118. Attachment

- [ ] UI shows 10-file/20-MB constraints.
- [ ] Allowed file types are communicated.
- [ ] Invalid file gives specific failure reason.
- [ ] Remove action only available in editable attachment state.
- [ ] Storage path is not exposed as authorization mechanism.

## 119. Responsive / Accessibility / Export

- [ ] Desktop full workflow is optimized.
- [ ] Tablet remains operational.
- [ ] Mobile can view record/timeline/export status and basic controls responsively.
- [ ] Keyboard/focus/labels are usable.
- [ ] No critical meaning depends on color alone.
- [ ] Export UI explicitly exposes XLSX and PDF choices.
- [ ] All export requests enter non-blocking queued flow.
- [ ] Queued/Processing/Ready/Failed/Expired are not shown as NSCMF business states.
- [ ] READY artifact shows download and expiry context.
- [ ] User can re-download before 168-hour expiry.
- [ ] Expired artifact offers new export when eligible.
- [ ] Approved PDF READY state identifies cryptographic organization/system signing.
- [ ] Unsigned Approved PDF is not offered when signing fails.
- [ ] XLSX is not falsely labelled digitally signed.
- [ ] Export/fidelity/signing failure is not reported as success.
- [ ] UI never offers approximate HTML PDF fallback against exact-template requirement.

---

# PART AD — FIGMA / FIGJAM ALIGNMENT

## 120. FigJam Role

Existing FigJam remains the product/system-flow proposal board.

It SHOULD reflect:

- canonical lifecycle;
- current scope;
- remaining TBDs;
- confirmed high-level technology architecture;
- exact-template export direction;
- asynchronous export + signing/retention at a high level where space allows.

FigJam is not required to contain every field-level UI rule in this document.

---

## 121. Future Figma Design File

When actual application screens/wireframes are created, they SHOULD use this document as source of truth for:

- design tokens;
- shell/navigation;
- states;
- forms;
- tables;
- dialogs;
- validation;
- status badges;
- Result-only flow;
- Business Timeline treatment;
- export format/status/expiry interaction;
- responsive layouts.

Actual screen creation is separate from updating existing FigJam flow/system documentation.

---

# PART AE — RELATIONSHIP TO OTHER DOCUMENTS

## 122. Authority Matrix

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariant | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| Permission/scope | `04_RBAC_Permission_Matrix.md` |
| State/lifecycle | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| **Presentation/interaction** | **`07_UI_UX_Specification.md`** |
| Technology implementation | `08_Tech_Stack_Specification.md` |
| Component/system topology, concurrency, queue/export/signing execution | `09_System_Architecture.md` |

UI cannot override upstream authority.

---

## 123. Remaining UI-Related TBDs

The following may be refined without changing core UX principles:

- exact neutral grayscale values;
- exact font package/assets;
- exact breakpoint pixel values;
- table default page size;
- exact autosave trigger/interval;
- exact toast duration;
- exact animation duration;
- official Unit/Division options when provided;
- official numbering UI copy once company SOP is provided;
- additional export format controls if later confirmed;
- exact polling interval/status-refresh implementation for queued export;
- exact privileged Access Audit viewing UI if Security Rules later require it;
- exact visual appearance of PDF certificate/signature indicator in the web UI, without inventing a QR or freehand signature requirement.

No longer TBD in UI implementation:

```text
Vue 3 + TypeScript
Inertia 3
shadcn-vue
Tailwind CSS 4
Lucide-family icon direction
exact-template XLSX/PDF export contract
XLSX/PDF user choice
asynchronous export
168-hour export artifact validity
Approved-PDF cryptographic signing requirement
Business Timeline vs Access Audit separation
optimistic conflict behavior requirement
```

These details MUST NOT be guessed into business rules.

---

## 124. Next Document

`08_Tech_Stack_Specification.md` has resolved the frontend/backend/runtime/component/testing baseline. `09_System_Architecture.md` has resolved logical component boundaries, hybrid concurrency, audit separation, asynchronous export, artifact retention, and Approved-PDF signing architecture.

Next document in fixed project order:

**`10_Security_Rules.md`**

It must define security controls that affect UI behavior where relevant, especially authentication/session hardening, authorization failures, attachment security, Access Audit visibility, private export delivery, and certificate/private-key security for organization/system PDF signing.