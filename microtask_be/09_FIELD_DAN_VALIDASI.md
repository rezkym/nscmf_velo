# Field, payload dan validation profiles

Turunan06 dan12 untuk memastikan semua business fields memiliki owner. Sumber tetap authority; `Specific Requirements (SLA)`, `Target KPI`, `Performance Information` tidak dibuang. Setiap constraint diuji pada target test owner, dengan phase profile yang tepat: DRAFT_PERSIST bukan FIRST_SUBMIT/RESUBMIT/REVIEW_FORWARD/APPROVAL_ACTION.

<a id="field-3"></a>

## 06 §3 — Validation Classification

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 55.

| Classification             | Meaning                                                   |
| -------------------------- | --------------------------------------------------------- |
| **Required**               | MUST valid and filled at the applicable validation stage. |
| **Conditionally Required** | Required only when condition applies.                     |
| **Optional**               | May be empty; if provided MUST be valid.                  |
| **System Managed**         | Controlled by system, not normal manual user input.       |

| Severity    | Effect                       |
| ----------- | ---------------------------- |
| **Error**   | Action rejected until fixed. |
| **Warning** | Action may continue.         |

Malware/security gate failure is an Error/fail-closed condition for the file, not a Warning.

<a id="field-4"></a>

## 06 §4 — Action-Specific Profiles

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 75.

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

<a id="field-5"></a>

## 06 §5 — `DRAFT_PERSIST`

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 92.

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

<a id="field-6"></a>

## 06 §6 — `FIRST_SUBMIT`

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 113.

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

<a id="field-7"></a>

## 06 §7 — `RESUBMIT`

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 129.

`REVISION_REQUIRED -> PENDING_REVIEW` uses submission validation plus:

- current state must still be `REVISION_REQUIRED`;
- actor owns/has valid record authorization;
- latest persisted revision used;
- no fake minimum-change requirement.

<a id="field-8"></a>

## 06 §8 — `REVIEW_FORWARD`

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 138.

`PENDING_REVIEW -> PENDING_APPROVAL` valid only if:

- actor has `nscmf.review.forward`;
- current state exactly `PENDING_REVIEW`;
- common/family business data valid;
- Change Result gate valid where applicable;
- no blocking validation error;
- archive/security/current-state conditions pass.

**No Team/scope matching exists.**

<a id="field-9"></a>

## 06 §9 — `APPROVAL_ACTION`

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 151.

Every Approver action validates:

- exact required action permission;
- exact current state `PENDING_APPROVAL`;
- archive flag;
- stale-action/current-state check;
- applicable mandatory reason/comment rules;
- relevant business/security invariants.

**No Approval Scope or Team match exists.**

<a id="field-10"></a>

## 06 §10 — Server-Side Validation Mandatory

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md), [BE-070](BE-070.md), [BE-074](BE-074.md). Source [06](../project_doc/06_Validation_Rules.md), baris 164.

Frontend validation is UX only. Backend repeats all relevant validation for workflow-changing action, direct API, stale browser state, bulk request, or manipulated payload.

<a id="field-11"></a>

## 06 §11 — General Text Rules

Owner: [BE-049](BE-049.md), [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 172.

Unless field-specific override:

- whitespace-only = empty;
- leading/trailing whitespace ignored for validation and SHOULD trim at persistence;
- internal spaces/Unicode allowed;
- raw HTML/script never executed;
- unnecessary control characters rejected;
- line breaks allowed in narrative fields.

Current limits:

| Text Category           |     Maximum |
| ----------------------- | ----------: |
| Short label/name        |   255 chars |
| Identifier/service ID   |   100 chars |
| Location                |   500 chars |
| Numbered narrative item | 1,000 chars |
| General narrative       | 4,000 chars |
| Workflow reason/comment | 2,000 chars |

<a id="field-12"></a>

## 06 §12 — Date Rules

Owner: [BE-049](BE-049.md), [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 194.

- valid calendar date;
- `today` uses configured application/business timezone;
- invalid/nonexistent date rejected;
- storage/API representation downstream.

<a id="field-13"></a>

## 06 §13 — Numeric Rules

Owner: [BE-049](BE-049.md), [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 201.

- finite numeric;
- no NaN/infinity;
- field min/max;
- backend stores normalized numeric value.

<a id="field-14"></a>

## 06 §14 — Selection Rules

Owner: [BE-049](BE-049.md), [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 208.

Single-select: exactly one valid option when required.

Multi-select:

- a duplicate option inside one submitted payload is an **Error**, rejected, not silently normalized;
- unknown option rejected;
- minimum selection follows field rule;
- selection is expressed by presence in the submitted set; deselection is expressed by absence, never by blanking a dependent description field.

Transport-level duplicate handling is owned by `12` §7.4.1.

<a id="field-15"></a>

## 06 §15 — Form Family

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 225.

Required values:

```text
ACTIVATION
CHANGE
```

Family immutable through normal edit after creation.

<a id="field-16"></a>

## 06 §16 — Subtype

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 236.

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

<a id="field-17"></a>

## 06 §17 — Numbering Mode

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 256.

Required:

```text
AUTOMATIC
MANUAL
```

<a id="field-18"></a>

## 06 §18 — Automatic Number — PROVISIONAL

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 265.

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

<a id="field-19"></a>

## 06 §19 — Manual Number — PROVISIONAL

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 289.

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

<a id="field-20"></a>

## 06 §20 — Request Number Immutability

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 307.

May be corrected during `DRAFT`. After first successful Submit immutable through normal workflow, revision, Reopen, Approval, Archive, Unarchive.

<a id="field-21"></a>

## 06 §21 — Header Date

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 311.

Required first Submit/Resubmit; valid calendar date; UI may default current business date; first Submit date MUST NOT be future.

<a id="field-22"></a>

## 06 §22 — Page

Owner: [BE-047](BE-047.md), [BE-046](BE-046.md), [BE-045](BE-045.md), [BE-048](BE-048.md). Source [06](../project_doc/06_Validation_Rules.md), baris 315.

Workbook Page = System Managed for export/rendering. Normal user does not enter it as business input.

<a id="field-23"></a>

## 06 §23 — Activation Validation Policy

Owner: [BE-049](BE-049.md), [BE-050](BE-050.md). Source [06](../project_doc/06_Validation_Rules.md), baris 323.

Core identity/service fields Required/subtype conditional. Technical configuration Optional unless dependency triggers. Optional field still format-valid if provided.

<a id="field-24"></a>

## 06 §24 — Reference

Owner: [BE-049](BE-049.md), [BE-050](BE-050.md). Source [06](../project_doc/06_Validation_Rules.md), baris 327.

Options:

```text
IWO
VELOShip
Ticket
Other
```

Multi-select Optional. If `Other`, specification Required max 255. Duplicate option rejected per §14.

A selected reference without specification remains a valid persisted selection; only `Other` requires specification at the applicable action stage.

<a id="field-25"></a>

## 06 §25 — Customer / Contact

Owner: [BE-049](BE-049.md), [BE-050](BE-050.md). Source [06](../project_doc/06_Validation_Rules.md), baris 342.

| Field         | Classification | Rule              |
| ------------- | -------------- | ----------------- |
| Customer Name | Required       | nonblank, max 150 |
| Contact Name  | Required       | nonblank, max 150 |

<a id="field-26"></a>

## 06 §26 — Existing / New Service Blocks

Owner: [BE-051](BE-051.md). Source [06](../project_doc/06_Validation_Rules.md), baris 349.

Fields:

- Service ID;
- Service Status (`Activated`/`Deactivated`);
- Service Description;
- Service Location.

| Subtype             | Existing | New      |
| ------------------- | -------- | -------- |
| `ACTIVATION`        | Optional | Required |
| `UPGRADE_DOWNGRADE` | Required | Required |
| `DEACTIVATION`      | Required | Optional |

If Required, all core fields required. If Optional but any core field started, entire core block becomes Required at Submit/Resubmit.

Formats:

- Service ID 1–100;
- exactly one status;
- Description 1–2,000 when applicable;
- Location 1–500 when applicable.

<a id="field-27"></a>

## 06 §27 — Installation Date (RFS)

Owner: [BE-049](BE-049.md). Source [06](../project_doc/06_Validation_Rules.md), baris 373.

| Subtype           | Rule     |
| ----------------- | -------- |
| Activation        | Required |
| Upgrade/Downgrade | Required |
| Deactivation      | Optional |

Valid date. No invented future-only rule.

<a id="field-28"></a>

## 06 §28 — Specific Requirements (SLA)

Owner: [BE-052](BE-052.md). Source [06](../project_doc/06_Validation_Rules.md), baris 383.

Optional max 3 ordered entries; each non-empty max 1,000 chars.

<a id="field-29"></a>

## 06 §29 — NOC Configuration — IP / Routing

Owner: [BE-049](BE-049.md). Source [06](../project_doc/06_Validation_Rules.md), baris 387.

Source fields include LAN IP Allocation, WAN IP, Gateway, POP, Regional, Preferred/Secondary Upstream, Primary/Secondary Link to NOC, Downlink Router identifiers.

Current baseline Optional, strict format if present.

LAN allocation may accept IPv4, IPv6, CIDR, explicit start–end range. Multiple entries may be newline/comma input but backend parses each item.

WAN IP: valid IPv4/IPv6/CIDR if provided.

Gateway: valid single IPv4/IPv6 if provided.

POP/Regional/Upstream/Link/Router identifiers Optional max 255 free text because official controlled master list not provided.

<a id="field-30"></a>

## 06 §30 — Bandwidth

Owner: [BE-049](BE-049.md), [BE-052](BE-052.md). Source [06](../project_doc/06_Validation_Rules.md), baris 401.

Standard: International, Domestic/IIX, International & IIX Mixed.

Custom: VC#1–VC#3.

Priority Destination: max 3 entries.

Bandwidth Optional; if entered numeric `>0` Mbps, decimal allowed, no zero/negative/NaN/infinity. No invented upper business cap.

Priority entries Optional max 255 each.

<a id="field-31"></a>

## 06 §31 — DNS / Domain / Email / Hosting

Owner: [BE-049](BE-049.md). Source [06](../project_doc/06_Validation_Rules.md), baris 413.

Domain Name 1/2 Optional unless dependency; valid FQDN max 253.

Primary/Secondary DNS valid IPv4/IPv6 if supplied.

MX fields valid FQDN or `priority + FQDN`.

Hosting Platform Optional max255; Hosting Capacity positive numeric GB.

Migration options Domain/Hosting multi-select Optional.

Dependencies:

- Domain migration → Domain Name 1 Required;
- Hosting migration → Hosting Platform + Capacity Required.

<a id="field-32"></a>

## 06 §32 — Customer Site Direct

Owner: [BE-053](BE-053.md). Source [06](../project_doc/06_Validation_Rules.md), baris 430.

Source technical fields Optional: loops, lastmile, BWA, antenna/tower, direction, RSSI, latency, packet loss, routers, UPS, stabilizer, cable.

If entered:

- text/equipment max255;
- RSSI numeric if represented numerically;
- Latency numeric `>=0` ms;
- Packet Loss numeric `0..100`%.

No invented RSSI dBm range.

<a id="field-33"></a>

## 06 §33 — Customer Site at POP

Owner: [BE-053](BE-053.md). Source [06](../project_doc/06_Validation_Rules.md), baris 443.

Optional fields include Switch Distribution, Port, VLAN ID, loops, routers, CPE indoor/outdoor.

If entered:

- text/equipment/port max255;
- VLAN ID integer `1..4094`.

<a id="field-34"></a>

## 06 §34 — Form Purpose

Owner: [BE-055](BE-055.md), [BE-056](BE-056.md). Source [06](../project_doc/06_Validation_Rules.md), baris 456.

Exactly one:

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

<a id="field-35"></a>

## 06 §35 — Facing Challenges

Owner: [BE-055](BE-055.md), [BE-056](BE-056.md). Source [06](../project_doc/06_Validation_Rules.md), baris 466.

| Subtype     | Rule     |
| ----------- | -------- |
| Maintenance | Optional |
| Upgrade     | Required |
| Emergency   | Required |

Up to 3 entries. If Required: minimum 1 non-empty, max 3, each max1,000.

<a id="field-36"></a>

## 06 §36 — Maintenance Purpose

Owner: [BE-055](BE-055.md), [BE-056](BE-056.md). Source [06](../project_doc/06_Validation_Rules.md), baris 476.

| Subtype     | Rule     |
| ----------- | -------- |
| Maintenance | Required |
| Upgrade     | Optional |
| Emergency   | Optional |

Nonblank when required/provided, max4,000.

<a id="field-37"></a>

## 06 §37 — Identified Problem

Owner: [BE-056](BE-056.md). Source [06](../project_doc/06_Validation_Rules.md), baris 486.

Required all Change subtypes. Minimum1 of max3, each max1,000.

<a id="field-38"></a>

## 06 §38 — Service Impact

Owner: [BE-057](BE-057.md). Source [06](../project_doc/06_Validation_Rules.md), baris 490.

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

Required First Submit/Resubmit, min1, multiple allowed, unknown rejected, duplicate rejected per §14, Other → description Required max500.

A selected impact without description remains a valid persisted selection; only `OTHER` requires description.

These are **form impact values**, not Team authorization values.

<a id="field-39"></a>

## 06 §39 — Improvement Plan / Target KPI

Owner: [BE-058](BE-058.md). Source [06](../project_doc/06_Validation_Rules.md), baris 510.

Three paired rows capacity.

- minimum1 complete pair;
- max3;
- if one side started, paired field Required;
- Plan max1,000;
- KPI max1,000.

No numeric-only KPI assumption.

<a id="field-40"></a>

## 06 §40 — Target Date of Execution

Owner: [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 522.

Required all Change.

First Submit: valid date today/future.

Revision/Reopen: unchanged previously accepted past target MAY remain. If changed in revision, new value must be today/future at Resubmit. Reopen to Review does not fail solely because historical target date has passed.

<a id="field-41"></a>

## 06 §41 — Monitoring Period

Owner: [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 530.

Required. Amount `>0`. Unit is a closed set, canonical wire values:

```text
MINUTE
HOUR
DAY
WEEK
```

Amount and unit are supplied together or both empty. Unknown unit rejected. Transport shape is owned by `12` §28.

<a id="field-42"></a>

## 06 §42 — Rollback Scenario

Owner: [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 543.

Required, nonblank, max4,000. Plain `N/A` SHOULD NOT substitute without meaningful explanation.

<a id="field-43"></a>

## 06 §43 — Maintenance Announcement

Owner: [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 547.

Exactly one:

```text
1 week before
2 weeks before
2 days before (emergency)
```

Non-blocking warnings:

- Emergency with another timing;
- Maintenance/Upgrade with 2-day emergency timing.

<a id="field-44"></a>

## 06 §44 — Attachment Reminder

Owner: [BE-055](BE-055.md). Source [06](../project_doc/06_Validation_Rules.md), baris 562.

Attachment remains Optional. Upgrade/Emergency without attachment → Warning only. Uploaded attachment always requires ClamAV CLEAN before usability.

<a id="field-45"></a>

## 06 §45 — Ownership / Permission

Owner: [BE-059](BE-059.md), [BE-076](BE-076.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 570.

Default actor:

```text
Requester/owner
+ nscmf.change.result.edit
+ owns record
+ family = CHANGE
+ PENDING_REVIEW
```

Only Result fields editable. Team has no effect. Custom role future capability, if explicitly granted, remains subject to resource/business rules.

<a id="field-46"></a>

## 06 §46 — Structure

Owner: [BE-059](BE-059.md), [BE-076](BE-076.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 584.

Up to 5 rows:

```text
Result summary
Performance information
Status
```

Draft may contain partial rows. First Submit/Resubmit may have zero rows, but any started row must be complete before Submit/Resubmit.

<a id="field-47"></a>

## 06 §47 — Capture in `PENDING_REVIEW`

Owner: [BE-059](BE-059.md), [BE-076](BE-076.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 596.

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

<a id="field-48"></a>

## 06 §48 — Review Forward Gate

Owner: [BE-059](BE-059.md), [BE-076](BE-076.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 616.

Before Change Forward:

- minimum1 complete Result row;
- max5;
- every started row complete.

| Field                   | Rule                            |
| ----------------------- | ------------------------------- |
| Result summary          | Required per used row, max2,000 |
| Performance information | Required per used row, max2,000 |
| Status                  | Required per used row, max255   |

All five rows are not mandatory.

<a id="field-49"></a>

## 06 §49 — Optionality

Owner: [BE-092](BE-092.md), [BE-091](BE-091.md), [BE-098](BE-098.md), [BE-100](BE-100.md). Source [06](../project_doc/06_Validation_Rules.md), baris 636.

Missing attachment alone never blocks workflow.

<a id="field-50"></a>

## 06 §50 — Count / Size

Owner: [BE-092](BE-092.md), [BE-091](BE-091.md), [BE-098](BE-098.md), [BE-100](BE-100.md). Source [06](../project_doc/06_Validation_Rules.md), baris 640.

- max10 files/record;
- max20MB/file;
- zero-byte rejected;
- implicit max total 200MB if all slots used.

<a id="field-51"></a>

## 06 §51 — Allowed Types

Owner: [BE-092](BE-092.md), [BE-091](BE-091.md), [BE-098](BE-098.md), [BE-100](BE-100.md). Source [06](../project_doc/06_Validation_Rules.md), baris 647.

```text
.pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```

Backend validates extension and SHOULD cross-check detected MIME/signature where reliable.

Not allowed examples:

```text
.exe .bat .cmd .sh .php .js .xlsm .docm
```

<a id="field-52"></a>

## 06 §52 — Filename / Storage Identity / Malware Gate

Owner: [BE-092](BE-092.md), [BE-091](BE-091.md), [BE-098](BE-098.md), [BE-100](BE-100.md). Source [06](../project_doc/06_Validation_Rules.md), baris 661.

Original filename non-empty max255 and never trusted as storage path. Internal opaque object name recommended.

Security flow:

```text
untrusted upload
→ private quarantine
→ ClamAV / clamd
   ├─ CLEAN → eligible promote
   └─ INFECTED / ERROR / TIMEOUT / UNAVAILABLE → fail closed
```

<a id="field-53"></a>

## 06 §53 — Attachment State Eligibility

Owner: [BE-092](BE-092.md), [BE-091](BE-091.md), [BE-098](BE-098.md), [BE-100](BE-100.md). Source [06](../project_doc/06_Validation_Rules.md), baris 675.

- `DRAFT` → allowed with permission + ownership/security gate;
- `REVISION_REQUIRED` → allowed with permission + ownership/security gate;
- `PENDING_REVIEW` → not via Result-only capability;
- `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `CANCELLED` → locked normal flow.

<a id="field-54"></a>

## 06 §54 — Reason Matrix

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 686.

| Action                    | Reason           | Blocking |
| ------------------------- | ---------------- | -------: |
| Reviewer Return           | Required         |      Yes |
| Reviewer Reject           | Required         |      Yes |
| Approver Return Reviewer  | Required         |      Yes |
| Approver Return Requester | Required         |      Yes |
| Approver Reject           | Required         |      Yes |
| Reopen/Revert             | Required         |      Yes |
| Archive                   | Required         |      Yes |
| Unarchive                 | Required         |      Yes |
| Cancel Draft              | Optional         |       No |
| Reviewer Forward          | Optional comment |       No |
| Approve                   | Optional comment |       No |

Mandatory reason: trim; minimum5 meaningful chars; max2,000; whitespace-only invalid.

<a id="field-55"></a>

## 06 §55 — Cancel Validation

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 704.

```text
DRAFT
+ owns record
+ nscmf.cancel
+ never successfully submitted
```

Reason optional. Success → `CANCELLED`.

<a id="field-56"></a>

## 06 §56 — Reopen Validation

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 715.

```text
business_status in {REJECTED, APPROVED}
+ is_archived = false
+ nscmf.reopen
+ authorized record access
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

No Team/scope requirement. Successful Reopen starts next workflow iteration according to `05`.

<a id="field-57"></a>

## 06 §57 — Archive Validation

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 728.

```text
business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ nscmf.archive
+ authorized record access
+ mandatory reason
```

<a id="field-58"></a>

## 06 §58 — Unarchive Validation

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 738.

```text
is_archived = true
+ nscmf.archive
+ authorized record access
+ mandatory reason
```

Status unchanged.

<a id="field-59"></a>

## 06 §59 — Excel Sign-Off Blocks

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 753.

Source has Request By, Review by, Approved By, with Name/Signature/Date.

Digital identity comes from authenticated workflow action rather than typed names.

<a id="field-60"></a>

## 06 §60 — Request By

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 759.

First successful Submit actor + timestamp + workflow context.

<a id="field-61"></a>

## 06 §61 — Review By

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 763.

Current workflow iteration's Reviewer who successfully performs Forward to Approval.

Other contributors/viewers remain preserved separately.

<a id="field-62"></a>

## 06 §62 — Approved By

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 769.

Actor who successfully performs:

```text
PENDING_APPROVAL -> APPROVED
```

One final Approved By per workflow iteration.

<a id="field-63"></a>

## 06 §63 — Signature Treatment

Owner: [BE-080](BE-080.md). Source [06](../project_doc/06_Validation_Rules.md), baris 779.

Freehand/e-signature field is not required. Authenticated actor/timestamp is human sign-off evidence. Approved PDF cryptographic signer is System/Organization, distinct from human Approved By.

<a id="field-64"></a>

## 06 §64 — Activation Submission Matrix

Owner: [BE-064](BE-064.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 787.

Legend R=Required, C=Conditional, O=Optional, S=System Managed.

| Field/Group          | Submit | Rule                                      |
| -------------------- | -----: | ----------------------------------------- |
| Form Family          |      R | `ACTIVATION`                              |
| Subtype              |      R | Activation/Upgrade-Downgrade/Deactivation |
| Request No           |      R | automatic/manual                          |
| Date                 |      R | valid, not future first Submit            |
| Page                 |      S | export                                    |
| Reference            |      O | multi-select                              |
| Reference Other      |      C | if Other                                  |
| Customer Name        |      R | max150                                    |
| Contact Name         |      R | max150                                    |
| Existing Service     |      C | subtype/partial rule                      |
| New Service          |      C | subtype/partial rule                      |
| RFS                  |      C | Activation + Upgrade/Downgrade            |
| SLA                  |      O | max3                                      |
| IP/routing           |      O | strict format if provided                 |
| Bandwidth            |      O | positive Mbps                             |
| Priority Destination |      O | max3                                      |
| Domain/DNS/MX        |    O/C | dependency rules                          |
| Hosting              |    O/C | dependency rules                          |
| Onsite fields        |      O | format-specific                           |
| VLAN                 |      O | 1–4094                                    |
| Sign-off             |      S | workflow-derived                          |

<a id="field-65"></a>

## 06 §65 — Change First Submit Matrix

Owner: [BE-064](BE-064.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 815.

| Field/Group              |         Submit | Rule                                                   |
| ------------------------ | -------------: | ------------------------------------------------------ |
| Family                   |              R | CHANGE                                                 |
| Purpose/Subtype          |              R | Maintenance/Upgrade/Emergency                          |
| Request No               |              R | automatic/manual                                       |
| Date                     |              R | valid, not future first Submit                         |
| Facing Challenges        |              C | Upgrade/Emergency                                      |
| Maintenance Purpose      |              C | Maintenance                                            |
| Identified Problem       |              R | min1/max3                                              |
| Service Impact           |              R | multi-select min1                                      |
| Other Impact Description |              C | if Other                                               |
| Plan/KPI                 |              R | min1 complete pair                                     |
| Target date              |              R | today/future first Submit                              |
| Monitoring               |              R | positive duration                                      |
| Rollback                 |              R | nonblank                                               |
| Announcement             |              R | exactly one                                            |
| Attachment               |              O | warning if Upgrade/Emergency absent; CLEAN if uploaded |
| Result                   | O first Submit | zero rows allowed; started row complete                |
| Sign-off                 |              S | workflow-derived                                       |

<a id="field-66"></a>

## 06 §66 — Change Forward Matrix

Owner: [BE-064](BE-064.md), [BE-070](BE-070.md). Source [06](../project_doc/06_Validation_Rules.md), baris 837.

Forward requires:

- actor has `nscmf.review.forward`;
- current state `PENDING_REVIEW`;
- submitted data still valid;
- minimum1 complete Result row;
- every used Result row complete;
- no Team/scope check.

<a id="field-67"></a>

## 06 §67 — Error Messages

Owner: [BE-023](BE-023.md). Source [06](../project_doc/06_Validation_Rules.md), baris 852.

Must identify actionable issue without sensitive internals. Distinguish missing value, invalid format, unauthorized, stale state, security-gate failure.

<a id="field-68"></a>

## 06 §68 — Warnings

Owner: [BE-023](BE-023.md). Source [06](../project_doc/06_Validation_Rules.md), baris 856.

Warnings visually distinct. Confirmed warnings: missing Upgrade/Emergency attachment; atypical announcement timing. Malware scan failure is not a warning.

<a id="field-69"></a>

## 06 §69 — Passing Validation Is Not Authorization

Owner: [BE-023](BE-023.md). Source [06](../project_doc/06_Validation_Rules.md), baris 860.

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

<a id="field-70"></a>

## 06 §70 — Current Persisted Record

Owner: [BE-064](BE-064.md). Source [06](../project_doc/06_Validation_Rules.md), baris 878.

Workflow action validates current persisted record/state, not stale browser state.

<a id="field-71"></a>

## 06 §71 — No Partial Success

Owner: [BE-064](BE-064.md). Source [06](../project_doc/06_Validation_Rules.md), baris 882.

Failure leaves business state unchanged and writes no false successful workflow event.

## 12 §7 — JSON Primitive Conventions

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 223.

### 7.1 Dates

Business dates:

```text
YYYY-MM-DD
```

Example:

```json
{ "request_date": "2026-08-22" }
```

### 7.2 Timestamps / Timezone

API timestamps use ISO-8601 with timezone/offset.

Canonical application/business timezone is:

```text
Asia/Jakarta
```

Example:

```json
{ "updated_at": "2026-08-22T18:20:00+07:00" }
```

`14_Environment_Specification.md` remains authority for the exact Laravel/MySQL connection/session/storage timestamp configuration. API and UI MUST nevertheless interpret business/application time according to `Asia/Jakarta` and MUST NOT silently expose inconsistent timezone semantics.

### 7.3 Boolean

Use JSON boolean, never string/integer pseudo-booleans where the contract says boolean.

### 7.4 Null

For PATCH-style input:

```text
field omitted → leave unchanged
field: null    → explicitly clear only if nullable/clearable
```

### 7.4.1 Repeatable Collection Semantics — LOCKED

Every repeatable business collection in a PATCH-style form payload (`references`, `service_blocks`, `sla_items`, `virtual_connections`, `priority_destinations`, `facing_challenges`, `identified_problems`, `service_impacts`, `improvement_items`, `results`) uses **whole-set replacement**, never implicit per-element merge:

```text
collection key omitted  → collection left completely unchanged
collection key = []     → all rows of that collection deleted
collection key = [rows] → persisted set becomes exactly those rows
```

Rules:

- each row is identified by its stable natural key — `row_no` for ordered structures, `reference_type` for Activation references, `service_context` for service blocks, `impact_code` for Service Impact;
- duplicate natural key inside one request → `422 NSCMF_VALIDATION_FAILED`;
- natural key outside its schema range (`11` CHECK) → `422`;
- rows absent from a supplied set are deleted, not retained;
- `row_no` is client-supplied ordering identity, never a database `id`; database `id` is never accepted as input;
- collection replacement happens inside the same transaction and the same single `record_version` increment as the rest of the save.

Row `id` values are server-managed and MUST NOT appear in request payloads.

#### 7.4.1.1 Selection vs Row collections — not-started definition

Repeatable collections are of two kinds, and only one kind can contain a not-started row.

**Selection collections** — `references`, `service_impacts`.

The natural key **is** the business value. Presence of the key means the user selected that option, so such a row is **never** a not-started row and is **always** persisted, even when its auxiliary description field is `null`:

```text
{"reference_type":"IWO","specification":null}        → persisted
{"impact_code":"NOC15","other_description":null}     → persisted
```

Deselecting is done by omitting the row from the supplied set, never by sending it with a `null` description. `specification`/`other_description` requiredness for `OTHER` belongs to `06`, evaluated at the applicable action stage, and never causes silent discard.

**Row collections** — everything else. A row is **not-started** only when every one of its own content fields listed below is `null`/blank; such a row is discarded, MUST NOT be persisted, and never occupies a `row_no`:

| Collection              | Natural key       | Content fields deciding "not-started"                                     |
| ----------------------- | ----------------- | ------------------------------------------------------------------------- |
| `service_blocks`        | `service_context` | `service_id`, `service_status`, `service_description`, `service_location` |
| `sla_items`             | `row_no`          | `requirement_text`                                                        |
| `virtual_connections`   | `row_no`          | `bandwidth_mbps`                                                          |
| `priority_destinations` | `row_no`          | `destination`                                                             |
| `facing_challenges`     | `row_no`          | `challenge_text`                                                          |
| `identified_problems`   | `row_no`          | `problem_text`                                                            |
| `improvement_items`     | `row_no`          | `plan_text`, `target_kpi`                                                 |
| `results`               | `row_no`          | `result_summary`, `performance_information`, `result_status`              |

The natural key itself is never a content field: a row carrying only `row_no` or only `service_context` is not-started.

Discard is a persistence rule only. It MUST NOT be used to bypass a `06` completeness gate: a partially started row still persists and is still judged at `FIRST_SUBMIT`/`RESUBMIT`/`REVIEW_FORWARD`.

### 7.5 Enums

Wire enum values use canonical uppercase machine values exactly as specified. Unknown enum values are rejected.

## 12 §26 — Draft / Revision JSON Save

Owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md). Source [12](../project_doc/12_API_Contract.md), baris 690.

```http
PATCH /nscmf/{record}/draft
```

`nscmf.draft.edit + owns + DRAFT|REVISION_REQUIRED`.

Dedicated validated nested structure maps to typed relational tables; no live JSON business blob; no blind mass assignment.

The exact payload is fixed: §27 for `family=ACTIVATION`, §28 for `family=CHANGE`, under the collection semantics of §7.4.1. Implementations MUST NOT define an alternative shape.

Conflict → `409 NSCMF_VERSION_CONFLICT`.

## 12 §27 — Activation DTO

Owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md). Source [12](../project_doc/12_API_Contract.md), baris 708.

Activation transport follows `06`/`11` typed fields and exact enum values. Requiredness is action-specific; Draft may be incomplete. Requiredness is owned by `06`, never by this transport shape.

Transport rules:

- keys are exactly the `11` column names for scalar fields;
- collections follow §7.4.1 whole-set replacement;
- Draft `PATCH` MAY omit any key; omission is "unchanged", not "clear";
- unknown key → `422 NSCMF_VALIDATION_FAILED`; no silent ignore, no mass assignment.

### 27.1 Canonical Activation payload

`PATCH /nscmf/{record}/draft` for `family=ACTIVATION`:

```json
{
    "record_version": 8,
    "activation": {
        "customer_name": "PT Contoh Sejahtera",
        "contact_name": "Contoh Kontak",
        "installation_rfs_date": "2026-09-30",
        "lan_ip_allocation": "10.10.0.0/24\n10.10.1.10-10.10.1.20",
        "wan_ip": "203.0.113.8/30",
        "gateway": "203.0.113.9",
        "pop": "POP Jakarta",
        "regional": "Jakarta",
        "preferred_upstream": null,
        "secondary_upstream": null,
        "primary_noc_link": null,
        "secondary_noc_link": null,
        "downlink_router": null,
        "bandwidth_international_mbps": 100.0,
        "bandwidth_domestic_iix_mbps": null,
        "bandwidth_mixed_mbps": null,
        "domain_name_1": null,
        "domain_name_2": null,
        "primary_dns": null,
        "secondary_dns": null,
        "mx_primary": null,
        "mx_secondary": null,
        "hosting_platform": null,
        "hosting_capacity_gb": null,
        "migrate_domain": false,
        "migrate_hosting": false,

        "references": [
            { "reference_type": "IWO", "specification": null },
            { "reference_type": "OTHER", "specification": "Nota internal 12/2026" }
        ],

        "service_blocks": [
            {
                "service_context": "EXISTING",
                "service_id": "SVC-000123",
                "service_status": "ACTIVATED",
                "service_description": "Dedicated internet 50 Mbps",
                "service_location": "Jl. Contoh No. 1, Jakarta"
            },
            {
                "service_context": "NEW",
                "service_id": "SVC-000124",
                "service_status": "ACTIVATED",
                "service_description": "Dedicated internet 100 Mbps",
                "service_location": "Jl. Contoh No. 1, Jakarta"
            }
        ],

        "sla_items": [{ "row_no": 1, "requirement_text": "Uptime layanan sesuai kontrak" }],

        "virtual_connections": [{ "row_no": 1, "bandwidth_mbps": 50.0 }],

        "priority_destinations": [{ "row_no": 1, "destination": "Google Global Cache" }],

        "direct_site": {
            "local_loops": null,
            "lastmile": null,
            "bwa": null,
            "antenna_tower": null,
            "direction": null,
            "rssi": null,
            "latency_ms": null,
            "packet_loss_percent": null,
            "routers": null,
            "ups": null,
            "stabilizer": null,
            "cable": null
        },

        "pop_site": {
            "switch_distribution": null,
            "port": null,
            "vlan_id": null,
            "local_loops": null,
            "routers": null,
            "cpe_indoor": null,
            "cpe_outdoor": null
        }
    }
}
```

### 27.2 Activation closed sets

```text
reference_type   : IWO | VELOSHIP | TICKET | OTHER
service_context  : EXISTING | NEW
service_status   : ACTIVATED | DEACTIVATED
row_no           : sla_items 1..3 | virtual_connections 1..3 | priority_destinations 1..3
```

`direct_site` / `pop_site` are 1:1 objects, not collections:

```text
key omitted → unchanged
key = null  → the whole optional site block is cleared
key = {}    → invalid; use null to clear
```

## 12 §28 — Change DTO

Owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md). Source [12](../project_doc/12_API_Contract.md), baris 833.

Change transport follows `06`/`11`, including Service Impact multi-select and Result rows max five, under the same transport rules as §27.

### 28.1 Canonical Change payload

`PATCH /nscmf/{record}/draft` for `family=CHANGE`:

```json
{
    "record_version": 8,
    "change": {
        "maintenance_purpose": "Penggantian modul optik pada core router.",
        "target_execution_date": "2026-09-20",
        "monitoring_period_value": 3.0,
        "monitoring_period_unit": "DAY",
        "rollback_scenario": "Kembalikan modul lama dan pulihkan konfigurasi tersimpan.",
        "announcement_timing": "ONE_WEEK_BEFORE",

        "facing_challenges": [{ "row_no": 1, "challenge_text": "Jendela pemeliharaan terbatas." }],

        "identified_problems": [{ "row_no": 1, "problem_text": "Error rate meningkat pada uplink utama." }],

        "service_impacts": [
            { "impact_code": "NOC15", "other_description": null },
            { "impact_code": "OTHER", "other_description": "Pelanggan enterprise wilayah timur" }
        ],

        "improvement_items": [
            {
                "row_no": 1,
                "plan_text": "Ganti modul optik dan pantau error rate.",
                "target_kpi": "Error rate 0 selama periode monitoring."
            }
        ],

        "results": [
            {
                "row_no": 1,
                "result_summary": "Modul terpasang, layanan pulih.",
                "performance_information": "Error rate 0 selama 72 jam.",
                "result_status": "SUCCESS"
            }
        ]
    }
}
```

### 28.2 Change closed sets

```text
impact_code             : NOC15 | NOC23 | NOC361 | REGIONAL | POP | CUSTOMER | OTHER
announcement_timing     : ONE_WEEK_BEFORE | TWO_WEEKS_BEFORE | TWO_DAYS_BEFORE_EMERGENCY
monitoring_period_unit  : MINUTE | HOUR | DAY | WEEK
row_no                  : facing_challenges 1..3 | identified_problems 1..3
                          improvement_items 1..3 | results 1..5
```

`monitoring_period_value` is numeric `>0` when supplied; unit and value are supplied together or both `null`.

`result_status` is free text max 255 per `06` §48. It is **not** an enum and MUST NOT be narrowed into one.

`results` is accepted inside the Draft payload only while the record is in `DRAFT`/`REVISION_REQUIRED`. In `PENDING_REVIEW` it is accepted **only** through §29 and a `results` key sent to `PATCH /nscmf/{record}/draft` in that state is rejected, not silently dropped.

## 12 §29 — Narrow Change Result Update

Owner: [BE-076](BE-076.md). Source [12](../project_doc/12_API_Contract.md), baris 901.

```http
PATCH /nscmf/{record}/change-results
```

Eligibility:

```text
family=CHANGE
business_status=PENDING_REVIEW
actor owns record
actor has nscmf.change.result.edit
```

Request — the only accepted keys:

```json
{
    "record_version": 9,
    "results": [
        {
            "row_no": 1,
            "result_summary": "Modul terpasang, layanan pulih.",
            "performance_information": "Error rate 0 selama 72 jam.",
            "result_status": "SUCCESS"
        }
    ]
}
```

`results` follows §7.4.1 whole-set replacement over `row_no` `1..5`.

Any other key — including any planning, header, Service Impact, attachment, or workflow field — is rejected with `422`, never ignored. Successful mutation Business Audits changes and increments parent version.

## 12 §129.1 — Form Payload Contract

Owner: [BE-088](BE-088.md). Source [12](../project_doc/12_API_Contract.md), baris 2074.

- [ ] omitted scalar key leaves stored value unchanged; explicit `null` clears a nullable field;
- [ ] omitted collection key leaves the collection unchanged;
- [ ] `[]` deletes every row of that collection;
- [ ] supplied collection becomes the exact persisted set; absent rows are deleted;
- [ ] duplicate natural key (`row_no`, `reference_type`, `service_context`, `impact_code`) → 422;
- [ ] `row_no` outside its schema range → 422;
- [ ] row collection: a row carrying only its natural key is discarded and occupies no `row_no`;
- [ ] selection collection: `{"reference_type":"IWO","specification":null}` and `{"impact_code":"NOC15","other_description":null}` are persisted, never discarded;
- [ ] deselection happens only by omitting the row from the supplied set;
- [ ] discard never bypasses a `06` completeness gate at Submit/Resubmit/Forward;
- [ ] database row `id` in the request → 422;
- [ ] unknown payload key → 422, never silently ignored;
- [ ] whole save, including collection replacement, is one transaction and one `record_version` increment;
- [ ] `results` inside the Draft payload while `PENDING_REVIEW` → 422.
