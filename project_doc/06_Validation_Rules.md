# Validation Rules Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-VAL-006  
> **Document Order:** 06 / 20  
> **Status:** Draft — Confirmed Validation Baseline + Permission/Team Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk validation behavior** pada NSCMF Digital Form & Workflow System.

Validation Rules menjawab:

- field Required / Conditionally Required / Optional;
- validation saat Draft persistence, Submit, Resubmit, Review Forward, Approval, Reopen, Archive, Unarchive;
- format data;
- dependencies;
- Activation and Change rules;
- Result of Changes;
- Service Impact;
- provisional numbering;
- attachment constraints;
- workflow reasons;
- Error vs Warning.

Dokumen tidak mengubah state machine dari `05` dan tidak mengubah permission model dari `04`.

Important synchronization:

- Reviewer/Approver validation gates now check **required permission + eligible state/domain conditions**;
- there is **no Reviewer Scope, Approval Scope, Unit/Division Scope, or Team authorization condition**;
- Team is organizational/profile data only;
- attachment structural validation is necessary but never sufficient: `10` requires private quarantine + ClamAV and only explicit `CLEAN` permits usability.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **SHOULD** — recommended default.
- **TBD** — belum final dan tidak boleh ditebak.
- **PROVISIONAL** — current MVP rule until official SOP/sample changes it.

---

## 3. Validation Classification

| Classification | Meaning |
|---|---|
| **Required** | MUST valid and filled at the applicable validation stage. |
| **Conditionally Required** | Required only when condition applies. |
| **Optional** | May be empty; if provided MUST be valid. |
| **System Managed** | Controlled by system, not normal manual user input. |

| Severity | Effect |
|---|---|
| **Error** | Action rejected until fixed. |
| **Warning** | Action may continue. |

Malware/security gate failure is an Error/fail-closed condition for the file, not a Warning.

---

# PART A — VALIDATION EXECUTION MODEL

## 4. Action-Specific Profiles

```text
DRAFT_PERSIST
FIRST_SUBMIT
RESUBMIT
REVIEW_FORWARD
APPROVAL_ACTION
WORKFLOW_RETURN
WORKFLOW_REJECT
CANCEL
REOPEN
ARCHIVE
UNARCHIVE
RESULT_CAPTURE
```

## 5. `DRAFT_PERSIST`

Autosave/Save Draft are permissive.

Must validate:

- required permission + ownership + state;
- safe field lengths/payload structure;
- attachment type/count/size for attachment mutation;
- structurally impossible schema values.

Must NOT require:

- all submission-required fields;
- final conditional completeness;
- final IP/domain/email readiness;
- Result completeness;
- final cross-field consistency.

Draft MAY incomplete.

## 6. `FIRST_SUBMIT`

Valid only if:

```text
business_status = DRAFT
+ actor has required permission
+ actor owns/has valid record authorization
+ common header validation
+ family/subtype validation
+ family-specific submission validation
+ numbering validation
```

Failure leaves `DRAFT` unchanged.

## 7. `RESUBMIT`

`REVISION_REQUIRED -> PENDING_REVIEW` uses submission validation plus:

- current state must still be `REVISION_REQUIRED`;
- actor owns/has valid record authorization;
- latest persisted revision used;
- no fake minimum-change requirement.

## 8. `REVIEW_FORWARD`

`PENDING_REVIEW -> PENDING_APPROVAL` valid only if:

- actor has `nscmf.review.forward`;
- current state exactly `PENDING_REVIEW`;
- common/family business data valid;
- Change Result gate valid where applicable;
- no blocking validation error;
- archive/security/current-state conditions pass.

**No Team/scope matching exists.**

## 9. `APPROVAL_ACTION`

Every Approver action validates:

- exact required action permission;
- exact current state `PENDING_APPROVAL`;
- archive flag;
- stale-action/current-state check;
- applicable mandatory reason/comment rules;
- relevant business/security invariants.

**No Approval Scope or Team match exists.**

## 10. Server-Side Validation Mandatory

Frontend validation is UX only. Backend repeats all relevant validation for workflow-changing action, direct API, stale browser state, bulk request, or manipulated payload.

---

# PART B — SHARED INPUT RULES

## 11. General Text Rules

Unless field-specific override:

- whitespace-only = empty;
- leading/trailing whitespace ignored for validation and SHOULD trim at persistence;
- internal spaces/Unicode allowed;
- raw HTML/script never executed;
- unnecessary control characters rejected;
- line breaks allowed in narrative fields.

Current limits:

| Text Category | Maximum |
|---|---:|
| Short label/name | 255 chars |
| Identifier/service ID | 100 chars |
| Location | 500 chars |
| Numbered narrative item | 1,000 chars |
| General narrative | 4,000 chars |
| Workflow reason/comment | 2,000 chars |

## 12. Date Rules

- valid calendar date;
- `today` uses configured application/business timezone;
- invalid/nonexistent date rejected;
- storage/API representation downstream.

## 13. Numeric Rules

- finite numeric;
- no NaN/infinity;
- field min/max;
- backend stores normalized numeric value.

## 14. Selection Rules

Single-select: exactly one valid option when required.

Multi-select:

- duplicates normalized;
- unknown option rejected;
- minimum selection follows field rule.

---

# PART C — HEADER AND NUMBERING

## 15. Form Family

Required values:

```text
ACTIVATION
CHANGE
```

Family immutable through normal edit after creation.

## 16. Subtype

Activation:

```text
ACTIVATION
UPGRADE_DOWNGRADE
DEACTIVATION
```

Change:

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

No extra option from native Excel control artifacts. `Upgrade` alone never selects family.

## 17. Numbering Mode

Required:

```text
AUTOMATIC
MANUAL
```

## 18. Automatic Number — PROVISIONAL

```text
NSCMF-YYYYMM-#####
```

Example:

```text
NSCMF-202608-00001
```

Rules:

- server-generated once when Automatic record created;
- 5-digit zero-padded sequence;
- global per calendar month, not separated by family or Team;
- may reset with `YYYYMM`;
- resulting Request No globally unique;
- allocation concurrency-safe;
- sequence gaps allowed;
- allocated number never reused even after Cancel;
- no automatic number change from ordinary field updates.

## 19. Manual Number — PROVISIONAL

- required for Manual mode;
- trim outer whitespace;
- length 3–64;
- allowed `A-Z a-z 0-9 - _ / .`;
- no internal whitespace;
- globally unique;
- uniqueness SHOULD case-insensitive after trim;
- original casing MAY be retained;
- not only separators.

Conceptual pattern:

```text
^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$
```

## 20. Request Number Immutability

May be corrected during `DRAFT`. After first successful Submit immutable through normal workflow, revision, Reopen, Approval, Archive, Unarchive.

## 21. Header Date

Required first Submit/Resubmit; valid calendar date; UI may default current business date; first Submit date MUST NOT be future.

## 22. Page

Workbook Page = System Managed for export/rendering. Normal user does not enter it as business input.

---

# PART D — ACTIVATION

## 23. Activation Validation Policy

Core identity/service fields Required/subtype conditional. Technical configuration Optional unless dependency triggers. Optional field still format-valid if provided.

## 24. Reference

Options:

```text
IWO
VELOShip
Ticket
Other
```

Multi-select Optional. If `Other`, specification Required max 255. Duplicate option normalized.

## 25. Customer / Contact

| Field | Classification | Rule |
|---|---|---|
| Customer Name | Required | nonblank, max 150 |
| Contact Name | Required | nonblank, max 150 |

## 26. Existing / New Service Blocks

Fields:

- Service ID;
- Service Status (`Activated`/`Deactivated`);
- Service Description;
- Service Location.

| Subtype | Existing | New |
|---|---|---|
| `ACTIVATION` | Optional | Required |
| `UPGRADE_DOWNGRADE` | Required | Required |
| `DEACTIVATION` | Required | Optional |

If Required, all core fields required. If Optional but any core field started, entire core block becomes Required at Submit/Resubmit.

Formats:

- Service ID 1–100;
- exactly one status;
- Description 1–2,000 when applicable;
- Location 1–500 when applicable.

## 27. Installation Date (RFS)

| Subtype | Rule |
|---|---|
| Activation | Required |
| Upgrade/Downgrade | Required |
| Deactivation | Optional |

Valid date. No invented future-only rule.

## 28. Specific Requirements (SLA)

Optional max 3 ordered entries; each non-empty max 1,000 chars.

## 29. NOC Configuration — IP / Routing

Source fields include LAN IP Allocation, WAN IP, Gateway, POP, Regional, Preferred/Secondary Upstream, Primary/Secondary Link to NOC, Downlink Router identifiers.

Current baseline Optional, strict format if present.

LAN allocation may accept IPv4, IPv6, CIDR, explicit start–end range. Multiple entries may be newline/comma input but backend parses each item.

WAN IP: valid IPv4/IPv6/CIDR if provided.

Gateway: valid single IPv4/IPv6 if provided.

POP/Regional/Upstream/Link/Router identifiers Optional max 255 free text because official controlled master list not provided.

## 30. Bandwidth

Standard: International, Domestic/IIX, International & IIX Mixed.

Custom: VC#1–VC#3.

Priority Destination: max 3 entries.

Bandwidth Optional; if entered numeric `>0` Mbps, decimal allowed, no zero/negative/NaN/infinity. No invented upper business cap.

Priority entries Optional max 255 each.

## 31. DNS / Domain / Email / Hosting

Domain Name 1/2 Optional unless dependency; valid FQDN max 253.

Primary/Secondary DNS valid IPv4/IPv6 if supplied.

MX fields valid FQDN or `priority + FQDN`.

Hosting Platform Optional max255; Hosting Capacity positive numeric GB.

Migration options Domain/Hosting multi-select Optional.

Dependencies:

- Domain migration → Domain Name 1 Required;
- Hosting migration → Hosting Platform + Capacity Required.

## 32. Customer Site Direct

Source technical fields Optional: loops, lastmile, BWA, antenna/tower, direction, RSSI, latency, packet loss, routers, UPS, stabilizer, cable.

If entered:

- text/equipment max255;
- RSSI numeric if represented numerically;
- Latency numeric `>=0` ms;
- Packet Loss numeric `0..100`%.

No invented RSSI dBm range.

## 33. Customer Site at POP

Optional fields include Switch Distribution, Port, VLAN ID, loops, routers, CPE indoor/outdoor.

If entered:

- text/equipment/port max255;
- VLAN ID integer `1..4094`.

---

# PART E — CHANGE

## 34. Form Purpose

Exactly one:

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

## 35. Facing Challenges

| Subtype | Rule |
|---|---|
| Maintenance | Optional |
| Upgrade | Required |
| Emergency | Required |

Up to 3 entries. If Required: minimum 1 non-empty, max 3, each max1,000.

## 36. Maintenance Purpose

| Subtype | Rule |
|---|---|
| Maintenance | Required |
| Upgrade | Optional |
| Emergency | Optional |

Nonblank when required/provided, max4,000.

## 37. Identified Problem

Required all Change subtypes. Minimum1 of max3, each max1,000.

## 38. Service Impact

Confirmed multi-select values:

```text
NOC15
NOC23
NOC361
Regional
POP
Customer
Other
```

Required First Submit/Resubmit, min1, multiple allowed, unknown rejected, duplicate normalized, Other → description Required max500.

These are **form impact values**, not Team authorization values.

## 39. Improvement Plan / Target KPI

Three paired rows capacity.

- minimum1 complete pair;
- max3;
- if one side started, paired field Required;
- Plan max1,000;
- KPI max1,000.

No numeric-only KPI assumption.

## 40. Target Date of Execution

Required all Change.

First Submit: valid date today/future.

Revision/Reopen: unchanged previously accepted past target MAY remain. If changed in revision, new value must be today/future at Resubmit. Reopen to Review does not fail solely because historical target date has passed.

## 41. Monitoring Period

Required. Amount `>0`; unit recommended minute/hour/day/week. Structured duration allowed downstream.

## 42. Rollback Scenario

Required, nonblank, max4,000. Plain `N/A` SHOULD NOT substitute without meaningful explanation.

## 43. Maintenance Announcement

Exactly one:

```text
1 week before
2 weeks before
2 days before (emergency)
```

Non-blocking warnings:

- Emergency with another timing;
- Maintenance/Upgrade with 2-day emergency timing.

## 44. Attachment Reminder

Attachment remains Optional. Upgrade/Emergency without attachment → Warning only. Uploaded attachment always requires ClamAV CLEAN before usability.

---

# PART F — RESULT OF CHANGES

## 45. Ownership / Permission

Default actor:

```text
Requester/owner
+ nscmf.change.result.edit
+ owns record
+ family = CHANGE
+ PENDING_REVIEW
```

Only Result fields editable. Team has no effect. Custom role future capability, if explicitly granted, remains subject to resource/business rules.

## 46. Structure

Up to 5 rows:

```text
Result summary
Performance information
Status
```

Draft may contain partial rows. First Submit/Resubmit may have zero rows, but any started row must be complete before Submit/Resubmit.

## 47. Capture in `PENDING_REVIEW`

Allowed fields only:

- Result Summary;
- Performance Information;
- Status.

Not implicitly editable:

- Purpose;
- Service Impact;
- Plan/KPI;
- Target Date;
- Rollback;
- general planning fields;
- unrelated attachment metadata.

Planning correction uses Return for Revision.

## 48. Review Forward Gate

Before Change Forward:

- minimum1 complete Result row;
- max5;
- every started row complete.

| Field | Rule |
|---|---|
| Result summary | Required per used row, max2,000 |
| Performance information | Required per used row, max2,000 |
| Status | Required per used row, max255 |

All five rows are not mandatory.

---

# PART G — ATTACHMENT

## 49. Optionality

Missing attachment alone never blocks workflow.

## 50. Count / Size

- max10 files/record;
- max20MB/file;
- zero-byte rejected;
- implicit max total 200MB if all slots used.

## 51. Allowed Types

```text
.pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```

Backend validates extension and SHOULD cross-check detected MIME/signature where reliable.

Not allowed examples:

```text
.exe .bat .cmd .sh .php .js .xlsm .docm
```

## 52. Filename / Storage Identity / Malware Gate

Original filename non-empty max255 and never trusted as storage path. Internal opaque object name recommended.

Security flow:

```text
untrusted upload
→ private quarantine
→ ClamAV / clamd
   ├─ CLEAN → eligible promote
   └─ INFECTED / ERROR / TIMEOUT / UNAVAILABLE → fail closed
```

## 53. Attachment State Eligibility

- `DRAFT` → allowed with permission + ownership/security gate;
- `REVISION_REQUIRED` → allowed with permission + ownership/security gate;
- `PENDING_REVIEW` → not via Result-only capability;
- `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` → locked normal flow.

---

# PART H — WORKFLOW REASON / LIFECYCLE VALIDATION

## 54. Reason Matrix

| Action | Reason | Blocking |
|---|---|---:|
| Reviewer Return | Required | Yes |
| Reviewer Reject | Required | Yes |
| Approver Return Reviewer | Required | Yes |
| Approver Return Requester | Required | Yes |
| Approver Reject | Required | Yes |
| Reopen/Revert | Required | Yes |
| Archive | Required | Yes |
| Unarchive | Required | Yes |
| Cancel Draft | Optional | No |
| Reviewer Forward | Optional comment | No |
| Approve | Optional comment | No |

Mandatory reason: trim; minimum5 meaningful chars; max2,000; whitespace-only invalid.

## 55. Cancel Validation

```text
DRAFT
+ owns record
+ nscmf.cancel
+ never successfully submitted
```

Reason optional. Success → `CANCELLED`.

## 56. Reopen Validation

```text
business_status in {REJECTED, APPROVED}
+ is_archived = false
+ nscmf.reopen
+ authorized record access
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

No Team/scope requirement. Successful Reopen starts next workflow iteration according to `05`.

## 57. Archive Validation

```text
business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ nscmf.archive
+ authorized record access
+ mandatory reason
```

## 58. Unarchive Validation

```text
is_archived = true
+ nscmf.archive
+ authorized record access
+ mandatory reason
```

Status unchanged.

---

# PART I — SIGN-OFF

## 59. Excel Sign-Off Blocks

Source has Request By, Review by, Approved By, with Name/Signature/Date.

Digital identity comes from authenticated workflow action rather than typed names.

## 60. Request By

First successful Submit actor + timestamp + workflow context.

## 61. Review By

Current workflow iteration's Reviewer who successfully performs Forward to Approval.

Other contributors/viewers remain preserved separately.

## 62. Approved By

Actor who successfully performs:

```text
PENDING_APPROVAL -> APPROVED
```

One final Approved By per workflow iteration.

## 63. Signature Treatment

Freehand/e-signature field is not required. Authenticated actor/timestamp is human sign-off evidence. Approved PDF cryptographic signer is System/Organization, distinct from human Approved By.

---

# PART J — SUMMARY MATRICES

## 64. Activation Submission Matrix

Legend R=Required, C=Conditional, O=Optional, S=System Managed.

| Field/Group | Submit | Rule |
|---|---:|---|
| Form Family | R | `ACTIVATION` |
| Subtype | R | Activation/Upgrade-Downgrade/Deactivation |
| Request No | R | automatic/manual |
| Date | R | valid, not future first Submit |
| Page | S | export |
| Reference | O | multi-select |
| Reference Other | C | if Other |
| Customer Name | R | max150 |
| Contact Name | R | max150 |
| Existing Service | C | subtype/partial rule |
| New Service | C | subtype/partial rule |
| RFS | C | Activation + Upgrade/Downgrade |
| SLA | O | max3 |
| IP/routing | O | strict format if provided |
| Bandwidth | O | positive Mbps |
| Priority Destination | O | max3 |
| Domain/DNS/MX | O/C | dependency rules |
| Hosting | O/C | dependency rules |
| Onsite fields | O | format-specific |
| VLAN | O | 1–4094 |
| Sign-off | S | workflow-derived |

## 65. Change First Submit Matrix

| Field/Group | Submit | Rule |
|---|---:|---|
| Family | R | CHANGE |
| Purpose/Subtype | R | Maintenance/Upgrade/Emergency |
| Request No | R | automatic/manual |
| Date | R | valid, not future first Submit |
| Facing Challenges | C | Upgrade/Emergency |
| Maintenance Purpose | C | Maintenance |
| Identified Problem | R | min1/max3 |
| Service Impact | R | multi-select min1 |
| Other Impact Description | C | if Other |
| Plan/KPI | R | min1 complete pair |
| Target date | R | today/future first Submit |
| Monitoring | R | positive duration |
| Rollback | R | nonblank |
| Announcement | R | exactly one |
| Attachment | O | warning if Upgrade/Emergency absent; CLEAN if uploaded |
| Result | O first Submit | zero rows allowed; started row complete |
| Sign-off | S | workflow-derived |

## 66. Change Forward Matrix

Forward requires:

- actor has `nscmf.review.forward`;
- current state `PENDING_REVIEW`;
- submitted data still valid;
- minimum1 complete Result row;
- every used Result row complete;
- no Team/scope check.

---

# PART K — UX / CONCURRENCY / GUARDRAILS

## 67. Error Messages

Must identify actionable issue without sensitive internals. Distinguish missing value, invalid format, unauthorized, stale state, security-gate failure.

## 68. Warnings

Warnings visually distinct. Confirmed warnings: missing Upgrade/Emergency attachment; atypical announcement timing. Malware scan failure is not a warning.

## 69. Passing Validation Is Not Authorization

Action succeeds only when:

```text
Required Permission
+ Ownership where explicitly required
+ Resource Authorization
+ Current State
+ Archive Rule
+ Validation
+ Security Preconditions
+ Concurrency Check
= valid business action
```

Team is intentionally absent.

## 70. Current Persisted Record

Workflow action validates current persisted record/state, not stale browser state.

## 71. No Partial Success

Failure leaves business state unchanged and writes no false successful workflow event.

---

# PART L — PROVISIONAL / DOWNSTREAM

## 72. Provisional Decisions

1. Automatic `NSCMF-YYYYMM-#####`.
2. Global monthly automatic sequence.
3. Manual Request No pattern/length.
4. Header Date not future first Submit.

Official requirement later must update docs before implementation; historical values remain.

## 73. Outside This Document

- exact default Team master data;
- exact UI widgets;
- optional official master lists for POP/Regional/upstream/equipment;
- storage provider/path;
- DB column types/precision;
- API error schema;
- audit physical data model;
- additional export formats/packaging;
- official numbering SOP/sample.

There is no Unit/Division or Reviewer/Approval scope data to define.

---

# PART M — DEVELOPER / AI GUARDRAILS

## 74. MUST NOT

Implementation MUST NOT:

1. make all Excel fields mandatory;
2. block incomplete Draft persistence;
3. require Result at first Submit solely because section exists;
4. Forward Change without Result gate;
5. require all five Result rows;
6. allow partial Result row at workflow gates;
7. unlock entire Change form during Pending Review;
8. make `nscmf.change.result.edit` general edit;
9. make Service Impact single-select;
10. allow Other without description;
11. make attachment mandatory;
12. accept executable/script/macro formats outside allowlist;
13. trust frontend validation;
14. accept duplicate manual Request No;
15. regenerate Request No during revision/Reopen;
16. mutate Request No after first Submit;
17. skip mandatory workflow reasons;
18. reject historical unchanged target date solely because it passed;
19. treat validation pass as permission;
20. invent personal/freehand signature requirement;
21. expose attachment before ClamAV CLEAN;
22. treat scanner error/timeout/unavailable as CLEAN;
23. turn malware state into business state;
24. require Team/Unit/Division/Reviewer Scope/Approval Scope matching for Review/Approval;
25. treat Team as authorization input;
26. invent scope-related validation fields.

---

# PART N — ACCEPTANCE

## 75. General

- [ ] Draft saves incomplete data.
- [ ] Submit/Resubmit enforce required fields.
- [ ] backend validates workflow-changing actions.
- [ ] errors/warnings distinguishable.
- [ ] unknown enums rejected.
- [ ] Team membership does not change field validation or Review/Approval action validation.

## 76. Numbering

- [ ] automatic format and concurrency uniqueness;
- [ ] gaps allowed/no reuse;
- [ ] manual pattern/global uniqueness;
- [ ] Request No immutable after first Submit.

## 77. Activation

- [ ] subtype service blocks correct;
- [ ] status exactly one;
- [ ] Other Reference dependency;
- [ ] IP/domain/DNS/MX validation;
- [ ] positive bandwidth;
- [ ] Packet Loss 0–100;
- [ ] VLAN 1–4094.

## 78. Change

- [ ] subtype rules;
- [ ] Service Impact multi-select + Other description;
- [ ] Plan/KPI pair;
- [ ] target date rule;
- [ ] positive monitoring;
- [ ] rollback/announcement rules;
- [ ] missing Upgrade/Emergency attachment warning only.

## 79. Result

- [ ] zero rows allowed first Submit;
- [ ] owner narrow edit during Pending Review;
- [ ] no general planning field edit;
- [ ] Forward requires at least one complete row;
- [ ] max five capacity only.

## 80. Attachment

- [ ] max10 / max20MB / nonzero / allowlist;
- [ ] no usability before CLEAN;
- [ ] infected/error/timeout/unavailable fails closed.

## 81. Workflow Reasons / Permission Synchronization

- [ ] all mandatory reason actions enforced;
- [ ] Reviewer action uses required permission + state, no scope;
- [ ] Approver action uses required permission + state, no scope;
- [ ] Reopen/Archive use authorization without Team scope.

---

# PART O — TRACEABILITY

## 82. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| Permission authorization | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| **Validation** | **`06_Validation_Rules.md`** |
| UI | `07_UI_UX_Specification.md` |
| Tech | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |

## 83. Next Document

Current fixed sequence has completed 01–10. Next:

**`11_ERD_Database_Schema.md`**.