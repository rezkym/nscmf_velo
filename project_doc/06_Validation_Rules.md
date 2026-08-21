# Validation Rules Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-VAL-006  
> **Document Order:** 06 / 20  
> **Status:** Draft — Confirmed Validation Baseline + Explicit Provisional Rules  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk validation behavior** pada NSCMF Digital Form & Workflow System.

Validation Rules menjawab:

- field mana yang Required, Conditionally Required, atau Optional;
- validation mana yang berlaku saat Draft persistence, Submit, Resubmit, Review Forward, Approval, Reopen, Archive, dan Unarchive;
- format data apa yang dianggap valid;
- dependency antar-field;
- validation khusus `NSCMF - Activation` dan `NSCMF - Change`;
- aturan `Result of Changes`;
- aturan Service Impact;
- provisional NSCMF numbering;
- attachment limits;
- workflow reason requirements;
- perbedaan blocking error dan non-blocking warning.

Dokumen ini **tidak mengubah canonical state machine** dari `05_State_Status_Flow.md` dan **tidak mengubah permission model** dari `04_RBAC_Permission_Matrix.md`. Jika validation membutuhkan capability baru, capability tersebut harus disinkronkan ke RBAC.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **SHOULD** — direkomendasikan sebagai default behavior.
- **TBD** — belum final dan tidak boleh ditebak implementation.
- **PROVISIONAL** — rule sementara yang sengaja dipilih agar MVP dapat dibangun, tetapi harus dapat diganti jika SOP/sample resmi perusahaan diberikan kemudian.

---

## 3. Validation Classification

Field classification:

| Classification | Meaning |
|---|---|
| **Required** | MUST valid dan terisi pada validation stage yang ditentukan. |
| **Conditionally Required** | MUST valid/terisi hanya jika condition terpenuhi. |
| **Optional** | Boleh kosong; jika diisi MUST mengikuti format/rule. |
| **System Managed** | Tidak diisi manual oleh normal user; system menghasilkan/mengontrol value. |

Validation severity:

| Severity | Effect |
|---|---|
| **Error** | Action MUST ditolak sampai error diperbaiki. |
| **Warning** | User diberi informasi, tetapi action MAY dilanjutkan. |

---

# PART A — VALIDATION EXECUTION MODEL

## 4. Validation Is Action-Specific

Validation tidak dijalankan dengan satu rule yang sama untuk semua action.

Canonical validation profiles:

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

---

## 5. `DRAFT_PERSIST`

Autosave dan `Save Draft` MUST bersifat permissive.

### Must Validate

- authorization/ownership/state;
- maximum safe field length;
- safe payload structure;
- attachment count/size/type jika attachment sedang ditambah;
- impossible structural values yang tidak dapat disimpan oleh schema final.

### Must Not Require

Draft persistence MUST NOT mewajibkan:

- seluruh Required field terisi;
- conditional business completeness;
- final IP/domain/email readiness;
- Result of Changes completeness;
- final cross-field consistency.

Draft MAY incomplete.

Jika implementation menggunakan typed UI control yang hanya dapat menghasilkan parseable values, UI MAY mencegah malformed typed value; tetapi Draft tidak boleh dianggap submission-ready hanya karena berhasil disimpan.

---

## 6. `FIRST_SUBMIT`

Successful first Submit hanya valid jika:

```text
business_status = DRAFT
+ actor authorized
+ record ownership/access valid
+ common header validation passes
+ family/subtype validation passes
+ family-specific submission validation passes
+ manual/automatic numbering valid
```

Jika gagal, state tetap `DRAFT`.

---

## 7. `RESUBMIT`

`REVISION_REQUIRED -> PENDING_REVIEW` menggunakan submission validation yang sama dengan first Submit, dengan tambahan:

- record harus masih `REVISION_REQUIRED`;
- actor memiliki valid ownership/access;
- latest persisted revision digunakan;
- tidak diwajibkan bahwa minimal satu field berubah.

Tidak ada rule yang memaksa user melakukan perubahan palsu hanya agar Resubmit dapat dilakukan.

---

## 8. `REVIEW_FORWARD`

`PENDING_REVIEW -> PENDING_APPROVAL` hanya valid jika:

- Reviewer permission/scope/state valid;
- common submission-level business data masih valid;
- applicable family-specific validation valid;
- untuk `NSCMF - Change`, `Result of Changes` gate valid;
- tidak ada blocking validation error.

Reviewer Forward merupakan gate terakhir untuk memastikan record yang masuk Approval cukup lengkap untuk final Approver review.

---

## 9. `APPROVAL_ACTION`

Approver action selalu memvalidasi:

- permission;
- Approval Scope;
- exact current state `PENDING_APPROVAL`;
- archive flag;
- stale-action/current-state check.

`Approve` tidak meminta Requester mengisi ulang data. Record yang telah masuk `PENDING_APPROVAL` dianggap telah melewati Review Forward gate. Jika backend menemukan invariant data rusak/tidak valid, action MUST ditolak dan tidak boleh menghasilkan partial Approval.

---

## 10. Server-Side Validation Is Mandatory

Frontend validation hanya untuk UX.

Backend MUST mengulangi seluruh validation yang relevan terhadap workflow-changing action.

Direct API call, manipulated payload, stale browser state, bulk request, atau hidden UI button MUST NOT melewati validation.

---

# PART B — SHARED INPUT RULES

## 11. General Text Rules

Unless overridden by field-specific rule:

- whitespace-only input dianggap empty;
- leading/trailing whitespace diabaikan untuk validation dan SHOULD di-trim saat persistence final;
- internal spaces dan Unicode text diperbolehkan;
- raw HTML/script MUST NOT dieksekusi; rendering safety ditentukan lebih lanjut pada Security/UI specification;
- control characters yang tidak diperlukan MUST ditolak;
- line break diperbolehkan pada narrative fields.

Recommended current limits:

| Text Category | Maximum |
|---|---:|
| Short label/name | 255 characters |
| Identifier/service ID | 100 characters |
| Location | 500 characters |
| Numbered narrative item | 1,000 characters |
| General narrative | 4,000 characters |
| Workflow reason/comment | 2,000 characters |

Maximum lengths adalah current product validation baseline dan dapat direvisi hanya melalui specification change.

---

## 12. Date Rules

- value MUST merupakan valid calendar date;
- comparison `today` menggunakan configured application/business timezone, bukan browser timezone sebagai authority;
- invalid/nonexistent date MUST ditolak;
- display format ditentukan di UI/UX, sedangkan API/storage format ditentukan downstream.

---

## 13. Numeric Rules

Numeric field MUST:

- menggunakan finite numeric value;
- tidak menerima `NaN`, infinity, atau arbitrary nonnumeric string;
- mengikuti min/max field-specific rule;
- decimal separator/input UX ditentukan UI, tetapi backend menyimpan normalized numeric value.

---

## 14. Selection Rules

Jika field didefinisikan single-select:

- exactly one valid option pada stage yang mewajibkannya;
- backend MUST menolak value di luar enumerated set.

Jika multi-select:

- duplicate option dinormalisasi menjadi satu selection;
- unknown option ditolak;
- minimum selection mengikuti field-specific rule.

---

# PART C — COMMON HEADER AND NUMBERING

## 15. Form Family

Required pada record creation dan seluruh submission validation.

Valid values:

```text
ACTIVATION
CHANGE
```

Family MUST NOT berubah setelah record dibuat melalui normal edit flow.

---

## 16. Subtype

Exactly one subtype wajib dipilih.

### Activation

```text
ACTIVATION
UPGRADE_DOWNGRADE
DEACTIVATION
```

### Change

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

Extra/overlapping native Excel checkbox yang terlihat pada source workbook tidak menghasilkan subtype tambahan di web application.

`Upgrade` MUST NOT menentukan family berdasarkan keyword saja.

---

## 17. Numbering Mode

Required per record:

```text
AUTOMATIC
MANUAL
```

Mode dipilih setelah family/subtype dan sebelum form digunakan secara normal.

---

## 18. Automatic NSCMF Number — PROVISIONAL

Karena official company numbering sample/SOP belum diberikan, MVP menggunakan provisional format:

```text
NSCMF-YYYYMM-#####
```

Example:

```text
NSCMF-202608-00001
```

### Current Rules

- generated server-side;
- generated satu kali ketika record dengan Automatic mode dibuat;
- sequence terdiri dari 5 digit zero-padded;
- sequence bersifat **global per calendar month**, tidak dibedakan family/unit;
- counter MAY reset saat `YYYYMM` berubah;
- resulting Request No MUST globally unique;
- allocation MUST concurrency-safe;
- gap sequence diperbolehkan;
- nomor yang sudah pernah dialokasikan MUST NOT digunakan ulang, termasuk ketika Draft kemudian Cancelled;
- automatic number tidak berubah ketika field lain berubah.

Jika official VELO numbering diberikan kemudian, rule ini MUST diperbarui tanpa mengubah historical Request No yang sudah diterbitkan.

---

## 19. Manual NSCMF Number — PROVISIONAL

Manual Request No:

- Required jika numbering mode `MANUAL`;
- trim leading/trailing whitespace;
- length 3–64 characters;
- allowed characters:
  - `A-Z`, `a-z`, `0-9`;
  - `-`, `_`, `/`, `.`;
- whitespace internal tidak diperbolehkan pada provisional format;
- MUST globally unique;
- uniqueness comparison SHOULD case-insensitive setelah trim;
- original display casing MAY dipertahankan;
- value tidak boleh hanya separator.

Conceptual pattern:

```text
^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$
```

Rule ini sengaja lebih fleksibel daripada Automatic format agar nomor resmi/legacy dapat diakomodasi ketika contoh aktual tersedia.

---

## 20. Request Number Immutability

Request No MAY dikoreksi selama masih `DRAFT`.

Setelah first successful Submit:

```text
request_no = immutable through normal workflow
```

Revision, Reopen, Approval, Archive, dan Unarchive MUST NOT menghasilkan nomor baru.

Jika di masa depan diperlukan privileged number-correction flow, capability tersebut harus menjadi explicit requirement baru dan fully audited; tidak boleh diimplementasikan diam-diam.

---

## 21. Header Date

Workbook memiliki field `Date` pada header.

Current validation baseline:

- Required pada First Submit/Resubmit;
- MUST valid calendar date;
- default UI MAY menggunakan current business date;
- pada first Submit, date MUST NOT berada di masa depan.

Exact UI ownership/default behavior akan dipoles pada UI/UX specification.

---

## 22. Page

Workbook field `Page` adalah **System Managed** untuk export/rendering.

Normal user MUST NOT mengetik page number sebagai business input pada web form.

---

# PART D — NSCMF ACTIVATION VALIDATION

## 23. Activation Validation Policy

Workbook `NSCMF - Activation` menjadi source field reference. Karena template tidak menandai seluruh field sebagai mandatory, current MVP menggunakan prinsip:

- core identity/service fields = Required atau subtype-conditional;
- technical configuration detail = Optional unless dependency triggered;
- jika optional field diisi, format validation tetap berlaku;
- tidak membuat seluruh Excel field mandatory hanya karena field tersedia.

---

## 24. Activation — Reference

Source options:

```text
IWO
VELOShip
Ticket
Other (specify)
```

Validation:

- multi-select;
- group Optional;
- zero atau lebih reference type dapat dipilih;
- jika `Other` dipilih, `Other specification` menjadi Required;
- `Other specification` max 255 characters;
- duplicate option tidak menghasilkan duplicate stored selection.

---

## 25. Activation — Customer / Contact

| Field | Classification | Validation |
|---|---|---|
| Customer Name | Required | nonblank, max 150 chars |
| Contact Name | Required | nonblank, max 150 chars |

---

## 26. Activation — Existing and New Service Blocks

Source fields per block:

- Service ID;
- Service Status (`Activated` / `Deactivated`);
- Service Description;
- Service Location.

### 26.1 Applicable Block Rules

| Activation Subtype | Existing Service | New Service |
|---|---|---|
| `ACTIVATION` | Optional | **Required** |
| `UPGRADE_DOWNGRADE` | **Required** | **Required** |
| `DEACTIVATION` | **Required** | Optional |

### 26.2 Required Applicable Block Fields

Jika service block Required, semua berikut Required:

- Service ID;
- exactly one Service Status;
- Service Description;
- Service Location.

### 26.3 Optional Block Partial-Entry Rule

Jika block berstatus Optional tetapi user mulai mengisi **salah satu** core field, block dianggap applicable dan seluruh core field block tersebut menjadi Required saat Submit/Resubmit.

### 26.4 Field Formats

- Service ID: 1–100 chars;
- Service Status: exactly one of `Activated`, `Deactivated`;
- Service Description: 1–2,000 chars ketika required/applicable;
- Service Location: 1–500 chars ketika required/applicable.

Both `Activated` and `Deactivated` MUST NOT dipilih bersamaan untuk satu service block.

---

## 27. Installation Date (RFS)

| Subtype | Rule |
|---|---|
| Activation | Required |
| Upgrade / Downgrade | Required |
| Deactivation | Optional |

Value MUST valid calendar date.

Tidak ada current rule yang memaksa RFS selalu future date karena template dapat digunakan pada processing yang merekam scheduled maupun already-realized context. Jika business owner memberikan SOP lebih spesifik, rule dapat diperketat.

---

## 28. Specific Requirements (SLA)

Source menyediakan hingga tiga numbered entries.

Validation:

- Optional;
- maximum 3 entries;
- setiap non-empty entry max 1,000 chars;
- whitespace-only entry dianggap empty;
- urutan entry dipertahankan.

---

## 29. NOC Configuration — IP / Routing

Source fields:

- LAN IP Address Allocation;
- WAN IP (CPE Router);
- Gateway;
- POP;
- Regional;
- Prefered Upstream;
- Secondary Upstream;
- Primary Link to NOC;
- Downlink Router#;
- Secondary Link to NOC;
- Downlink Router#.

### Classification

Current baseline: Optional, dengan strict format validation jika diisi.

### IP Rules

**LAN IP Address Allocation** MAY menerima satu atau lebih:

- IPv4 address;
- IPv6 address;
- CIDR network;
- explicit start–end IP range.

Multiple values MAY dipisahkan oleh newline/comma pada UI representation, tetapi backend harus parse setiap item.

**WAN IP (CPE Router)**:

- valid IPv4/IPv6 address atau CIDR jika diisi.

**Gateway**:

- valid single IPv4/IPv6 address jika diisi.

Invalid IP/CIDR syntax = Error pada Submit/Resubmit.

### Other NOC Text

POP, Regional, Upstream, Link, dan Router identifiers:

- Optional;
- max 255 chars per field;
- free text karena source workbook tidak menyediakan controlled master list.

Master-data selection dapat diperkenalkan di UI/architecture tanpa mengubah business meaning jika daftar resmi tersedia kemudian.

---

## 30. Bandwidth Configuration

Source groups:

### Standard

- International;
- Domestic/IIX;
- International & IIX Mixed.

### Custom

- VC#1;
- VC#2;
- VC#3.

### Priority Destination

- up to 3 text entries.

### Rules

Bandwidth group tidak globally mandatory pada current baseline.

Setiap bandwidth value yang diisi:

- MUST numeric;
- MUST be `> 0`;
- unit = Mbps;
- MAY contain decimal value;
- no negative/zero/NaN/infinity.

No business upper bandwidth cap dikarang pada tahap ini; storage precision/technical maximum akan ditentukan ERD/API.

Priority Destination:

- Optional;
- maximum 3 items;
- each max 255 chars.

---

## 31. DNS, Domain, Email and Hosting Configuration

### Domain

Fields:

- Domain Name 1;
- Domain Name 2;
- Primary DNS;
- Secondary DNS.

Rules:

- Optional unless dependency triggered;
- Domain Name MUST valid hostname/FQDN syntax jika diisi;
- max FQDN length 253 chars;
- Primary/Secondary DNS MUST valid IPv4/IPv6 address jika diisi.

### Email

Fields:

- Primary MX Record;
- Secondary MX Record.

Rule jika diisi:

- valid FQDN hostname; or
- `priority + FQDN` form such as `10 mail.example.com`.

### Hosting

Fields:

- Hosting Platform: Optional short text, max 255 chars;
- Hosting Capacity: Optional positive numeric value;
- unit = GB;
- zero/negative capacity invalid jika field diisi.

### Migration

Source options:

```text
Domain
Hosting
```

Migration is multi-select Optional.

Conditional dependencies:

- jika `Domain` migration dipilih → minimal `Domain Name 1` Required;
- jika `Hosting` migration dipilih → `Hosting Platform` dan `Hosting Capacity` Required.

---

## 32. Onsite Configuration — Customer Site (Direct)

Source fields:

- Primary Local Loop;
- Secondary Local Loop;
- Lastmile;
- Local loop (BWA);
- Antenna;
- Antena Pole / Tower;
- BWA Direction;
- Link Quality (RSSI);
- Latency;
- Packet Loss;
- CPE Router (Primary);
- UPS;
- Secondary Router;
- Stabilizer;
- UTP Cable.

Current classification: Optional technical details.

If provided:

- text/equipment fields max 255 chars;
- Link Quality (RSSI) MUST numeric if represented numerically;
- Latency MUST numeric and `>= 0`, unit ms;
- Packet Loss MUST numeric in range `0..100`, unit `%`.

Source workbook does not explicitly specify RSSI unit/range; therefore no hard dBm range is invented in this version.

---

## 33. Onsite Configuration — Customer Site at POP

Source fields:

- Switch Distribution;
- Port#;
- VLAN ID;
- Local Loop Primary;
- Local Loop Secondary;
- CPE Router (Primary);
- Secondary Router;
- CPE (Indoor);
- CPE (Outdoor).

Current classification: Optional technical details.

If provided:

- text/equipment/port fields max 255 chars;
- Port# remains text-capable because values MAY include identifiers such as interface names;
- VLAN ID MUST integer `1..4094`.

Values `0` and `4095` are not accepted as normal customer VLAN IDs in current validation baseline.

---

# PART E — NSCMF CHANGE VALIDATION

## 34. Change — Form Purpose

Exactly one required:

```text
MAINTENANCE
UPGRADE
EMERGENCY
```

Source workbook's extra/overlapping native checkbox artifact does not create a fourth option.

---

## 35. Facing Challenges (Upgrade / Emergency)

Source label: `Facing Chalenges (Upgrade / Emergency)`.

Rules:

| Subtype | Classification |
|---|---|
| Maintenance | Optional |
| Upgrade | Required |
| Emergency | Required |

Source provides up to 3 numbered entries.

When Required:

- minimum 1 non-empty entry;
- maximum 3 entries;
- each entry max 1,000 chars.

---

## 36. Maintenance Purpose

| Subtype | Classification |
|---|---|
| Maintenance | Required |
| Upgrade | Optional |
| Emergency | Optional |

When provided/required:

- nonblank;
- max 4,000 chars.

---

## 37. Identified Problem

`Identified Problem (Please elaborate)` is Required for all Change subtypes.

Source provides up to 3 entries.

Rules:

- minimum 1 non-empty item;
- maximum 3 items;
- each item max 1,000 chars.

---

## 38. Service Impact

Confirmed behavior: **multi-select**.

Allowed values:

```text
NOC15
NOC23
NOC361
Regional
POP
Customer
Other
```

Rules:

- Required on First Submit and Resubmit;
- minimum 1 selection;
- multiple selections allowed;
- unknown value rejected;
- duplicate selection normalized;
- if `Other` selected, `Other Impact Description` becomes Required;
- Other description max 500 chars.

---

## 39. Maintenance (Improvement) Plan and Target KPI

Source provides 3 paired rows.

Rules:

- minimum 1 complete Plan/KPI pair required;
- maximum 3 pairs;
- if either Plan or KPI in a row is filled, the paired field in the same row becomes Required;
- Plan max 1,000 chars per row;
- Target KPI max 1,000 chars per row;
- whitespace-only row is empty.

No numeric-only KPI assumption is made because workbook allows general performance target descriptions.

---

## 40. Target Date of Execution

Required for all Change subtypes.

### First Submit

Date MUST:

- be valid;
- be `today` or future relative to configured business timezone.

### Revision / Reopen

A record MUST NOT become invalid solely because an already-accepted historical target date has passed while the workflow was running.

Rules:

- unchanged previously accepted past target date MAY remain during Resubmit;
- if Requester changes Target Date during revision, new value MUST be today/future at time of Resubmit;
- Reopen to `PENDING_REVIEW` does not retroactively fail solely because target date is already past.

---

## 41. Monitoring Period

Required for all Change subtypes.

Business value represents a positive duration.

Validation:

- amount MUST `> 0`;
- unit must be an allowed duration unit in final UI, recommended baseline:
  - minute;
  - hour;
  - day;
  - week;
- equivalent structured duration MAY be used by API/data model;
- textual negative/zero duration invalid.

UI representation is finalized in `07_UI_UX_Specification.md`.

---

## 42. Rollback Scenario

Required for all Change subtypes.

Rules:

- nonblank;
- max 4,000 chars;
- plain `N/A` SHOULD NOT be treated as a valid substitute unless accompanied by a meaningful explanation why rollback is not applicable.

Implementation MAY show guidance, but must not invent the rollback content.

---

## 43. Maintenance Announcement

Exactly one source option is required:

```text
1 week before
2 weeks before
2 days before (emergency)
```

Single-select despite source workbook using checkbox controls, because the three choices represent alternative timing policies.

### Non-Blocking Consistency Warning

- Emergency with option other than `2 days before (emergency)` → Warning;
- Maintenance/Upgrade using `2 days before (emergency)` → Warning.

These combinations are not blocked because the template label alone is insufficient evidence to forbid exceptional operational cases.

---

## 44. Change Attachment Reminder

Source workbook contains note:

> Please attach necessary documentation for upgrade or emergency plan.

However confirmed product requirement states attachment is Optional.

Therefore:

- absence of attachment MUST NOT block Submit, Resubmit, Forward, or Approval;
- if subtype is Upgrade or Emergency and no attachment exists, system SHOULD display a **non-blocking warning/reminder**.

---

# PART F — CHANGE RESULT OF CHANGES

## 45. Result of Changes Ownership and Permission

Confirmed default actor: **Requester/owner record**.

Conceptual permission introduced:

```text
nscmf.change.result.edit
```

Default behavior:

- Requester role receives this permission for own Change records;
- capability only applies when record is `PENDING_REVIEW`;
- family MUST be `CHANGE`;
- only Result-of-Changes fields are editable;
- normal submitted planning fields remain locked;
- every persisted Result change is audited.

Custom role MAY receive equivalent permission later, but visibility/scope rules remain mandatory.

This narrow edit capability MUST NOT be interpreted as general `PENDING_REVIEW` form edit permission.

---

## 46. Result of Changes Structure

Workbook provides up to 5 rows with columns:

```text
Result summary
Performance information
Status
```

### Draft / First Submit

Final Result is **not required merely because the section exists**.

During `DRAFT`:

- Result rows MAY remain empty;
- partial data MAY be saved as Draft.

At First Submit/Resubmit:

- zero Result rows is allowed;
- if a Result row contains any value, that started row MUST be internally complete before Submit/Resubmit:
  - Result summary present;
  - Performance information present;
  - Status present.

This prevents a deliberately optional Result section from creating malformed submitted rows.

---

## 47. Result Capture During `PENDING_REVIEW`

Requester/owner with `nscmf.change.result.edit` MAY populate Result rows while state remains `PENDING_REVIEW`.

Allowed mutation scope:

- Result summary;
- Performance information;
- Status;
- only within the Result section.

Not implicitly editable:

- Purpose of Changes;
- Service Impact;
- Plan/KPI;
- Target Date;
- Rollback;
- general service/planning fields;
- unrelated attachment metadata.

If a planning field needs correction, Reviewer should use normal `Return for Revision`.

---

## 48. Review Forward Result Gate

Before `PENDING_REVIEW -> PENDING_APPROVAL`, Change record MUST satisfy:

- minimum 1 complete Result row;
- maximum 5 rows;
- every started row complete;
- no row may contain Result Summary without Performance/Status or vice versa.

Field validation:

| Result Field | Rule |
|---|---|
| Result summary | Required per used row, max 2,000 chars |
| Performance information | Required per used row, max 2,000 chars |
| Status | Required per used row, max 255 chars |

The system MUST NOT require all five rows to be populated. Five rows are capacity, not mandatory count.

This preserves the Excel structure without creating unnecessary user workload.

---

# PART G — ATTACHMENT VALIDATION

## 49. Attachment Optionality

Attachment input exists but attachment remains Optional.

Missing attachment alone MUST NOT generate blocking error.

---

## 50. File Count and Size

Current confirmed MVP limits:

- maximum **10 files per NSCMF record**;
- maximum **20 MB per file**;
- zero-byte files rejected;
- implicit maximum total if all slots used = 200 MB, although storage implementation MAY enforce lower operational quotas later only through documented change.

---

## 51. Allowed File Types

Allowed extension baseline:

```text
.pdf
.xls
.xlsx
.doc
.docx
.png
.jpg
.jpeg
.txt
.csv
```

Backend SHOULD validate both extension and detected MIME/content type where technically feasible.

File extension outside allowlist = Error.

Examples explicitly not accepted under current allowlist:

```text
.exe
.bat
.cmd
.sh
.php
.js
.xlsm
.docm
```

Macro-enabled or executable/script formats are not part of current allowed MVP set.

---

## 52. Filename

- non-empty filename;
- max 255 characters;
- path separators/path traversal sequences MUST NOT be trusted as storage path;
- same display filename MAY exist more than once if storage uses unique internal identifiers, but UI SHOULD make duplicates understandable.

Malware scanning/storage architecture remains Security/Architecture responsibility and is not silently assumed by this validation document.

---

## 53. Attachment State Eligibility

Default attachment mutation follows editable context:

- `DRAFT` → allowed with permission;
- `REVISION_REQUIRED` → allowed with permission;
- `PENDING_REVIEW` → not generally editable by Requester under the narrow Result permission;
- `PENDING_APPROVAL` / `REJECTED` / `APPROVED` / `CANCELLED` → locked through normal workflow.

A future dedicated result-evidence attachment capability would require an explicit new requirement.

---

# PART H — WORKFLOW REASON / COMMENT VALIDATION

## 54. Reason Requirement Matrix

| Action | Reason Requirement | Blocking? |
|---|---|---:|
| Reviewer Return for Revision | **Required** | Yes |
| Reviewer Reject | **Required** | Yes |
| Approver Return to Reviewer | **Required** | Yes |
| Approver Return to Requester | **Required** | Yes |
| Approver Reject | **Required** | Yes |
| Reopen/Revert | **Required** | Yes |
| Archive | **Required** | Yes |
| Unarchive | **Required** | Yes |
| Cancel Draft | Optional | No |
| Reviewer Forward | Optional comment | No |
| Approve | Optional comment | No |

---

## 55. Mandatory Reason Format

When reason is Required:

- trim validation value;
- minimum 5 meaningful characters;
- maximum 2,000 characters;
- whitespace-only invalid;
- reason persisted with actor, timestamp, source state/action, and resulting state where applicable.

Cancel optional reason, if supplied, MUST still comply with max length and safe text rules.

---

# PART I — LIFECYCLE ACTION VALIDATION

## 56. Cancel Validation

Cancel only valid if:

```text
business_status = DRAFT
+ actor owns/has eligible cancel access
+ record has never been successfully submitted
```

Reason optional.

Successful action -> `CANCELLED`.

---

## 57. Reopen Validation

Reopen/Revert requires:

```text
business_status in {REJECTED, APPROVED}
+ is_archived = false
+ nscmf.reopen
+ valid record visibility/scope
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

Destinations outside set MUST be rejected server-side.

Reopen MUST NOT target `DRAFT` or `PENDING_APPROVAL`.

---

## 58. Archive Validation

Archive requires:

```text
business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ nscmf.archive
+ valid record visibility
+ mandatory reason
```

Archive active-work state MUST fail.

---

## 59. Unarchive Validation

Unarchive requires:

```text
is_archived = true
+ nscmf.archive
+ valid record visibility
+ mandatory reason
```

Unarchive does not alter `business_status`.

---

# PART J — SIGN-OFF VALIDATION

## 60. Excel Sign-Off Blocks

Both workbook sheets contain:

```text
Request By
Review by
Approved By
```

with Name / Signature / Date presentation fields.

In digital application, workflow sign-off identity MUST be derived from authenticated system actions rather than normal user manually typing actor names into sign-off cells.

---

## 61. Request By

On first successful Submit, system MUST record at least:

- Requester actor identity;
- submission timestamp;
- record/workflow context.

Export MAY map these values into the Excel/PDF `Request By` presentation area.

---

## 62. Review By

For current workflow iteration, the `Review By` representation SHOULD use the Reviewer actor who successfully performs `Forward to Approval`.

This does **not** erase other Reviewer contributors/viewers; all remain in timeline/audit.

---

## 63. Approved By

`Approved By` MUST equal the eligible Approver who successfully performs final:

```text
PENDING_APPROVAL -> APPROVED
```

Only one final Approved By exists per workflow iteration under current business rule.

---

## 64. Signature Field Treatment

The source workbook has Signature cells, but current requirements do not define freehand/e-signature technology.

Therefore:

- Signature is not a manually editable validation field for MVP workflow completion;
- authenticated workflow action + actor/timestamp is the authoritative sign-off evidence;
- exact visual signature rendering in PDF/Excel remains an Export/UI/Security design concern;
- implementation MUST NOT invent cryptographic/e-signature claims without a new approved requirement.

---

# PART K — FIELD-BY-FIELD SUMMARY MATRIX

## 65. Activation Submission Matrix

Legend:

- `R` = Required;
- `C` = Conditionally Required;
- `O` = Optional;
- `S` = System Managed.

| Field / Group | First Submit | Key Condition / Rule |
|---|---:|---|
| Form Family | R | `ACTIVATION` |
| Purpose/Subtype | R | one of Activation / Upgrade-Downgrade / Deactivation |
| Request No | R | automatic or manual rule |
| Date | R | valid, not future on first Submit |
| Page | S | export-generated |
| Reference | O | multi-select |
| Reference Other Specification | C | required if Other selected |
| Customer Name | R | max 150 |
| Contact Name | R | max 150 |
| Existing Service block | C | required for Upgrade/Downgrade + Deactivation; partial optional block becomes complete block |
| New Service block | C | required for Activation + Upgrade/Downgrade; partial optional block becomes complete block |
| Installation Date (RFS) | C | required Activation + Upgrade/Downgrade |
| SLA items | O | max 3 |
| LAN IP Allocation | O | IP/CIDR/range validation if present |
| WAN IP | O | IP/CIDR if present |
| Gateway | O | valid IP if present |
| POP / Regional / Upstream | O | short text |
| NOC link/router fields | O | short text |
| Standard Bandwidth | O | positive Mbps if entered |
| Custom VC Bandwidth | O | positive Mbps if entered |
| Priority Destination | O | max 3 |
| Domain Name 1/2 | O/C | FQDN; Domain 1 required when Domain migration selected |
| Primary/Secondary DNS | O | valid IP |
| Primary/Secondary MX | O | FQDN or priority+FQDN |
| Hosting Platform | O/C | required when Hosting migration selected |
| Hosting Capacity | O/C | positive GB; required when Hosting migration selected |
| Migration Domain/Hosting | O | multi-select |
| Direct onsite fields | O | format-specific if entered |
| Latency | O | >=0 ms |
| Packet Loss | O | 0–100% |
| POP Switch/Port/equipment | O | short text |
| VLAN ID | O | integer 1–4094 |
| Request/Review/Approved sign-off | S | workflow-generated |

---

## 66. Change First Submit Matrix

| Field / Group | First Submit | Key Condition / Rule |
|---|---:|---|
| Form Family | R | `CHANGE` |
| Form Purpose/Subtype | R | Maintenance / Upgrade / Emergency |
| Request No | R | automatic/manual rule |
| Date | R | valid, not future on first Submit |
| Facing Challenges | C | required for Upgrade/Emergency, min 1 of max 3 |
| Maintenance Purpose | C | required for Maintenance |
| Identified Problem | R | min 1 of max 3 |
| Service Impact | R | multi-select, min 1 |
| Other Impact Description | C | required if Other selected |
| Improvement Plan + Target KPI | R | min 1 complete pair, max 3 |
| Target date of execution | R | today/future on first Submit |
| Monitoring period | R | positive duration |
| Rollback scenario | R | nonblank |
| Maintenance Announcement | R | exactly one source option |
| Attachment | O | warning only for Upgrade/Emergency when absent |
| Result of Changes | O at first Submit | no row required yet; started row must be complete |
| Request/Review/Approved sign-off | S | workflow-generated |

---

## 67. Change Review Forward Matrix

To Forward a Change record:

- all relevant submitted business data must remain valid;
- Result of Changes minimum 1 complete row;
- every used Result row complete;
- Reviewer permission/scope/current state valid;
- required Result field validation passes.

Successful result:

```text
PENDING_REVIEW -> PENDING_APPROVAL
```

---

# PART L — VALIDATION UX CONTRACT

## 68. Error Messages

Validation errors SHOULD:

- identify field/group;
- explain requirement in user-readable language;
- avoid exposing sensitive backend/internal details;
- distinguish missing value vs invalid format vs unauthorized action vs stale state.

Examples:

```text
Customer Name is required.
Select at least one Service Impact.
Other Impact Description is required when Service Impact = Other.
VLAN ID must be between 1 and 4094.
Result row 2 requires Result Summary, Performance Information, and Status.
This record has changed state. Refresh before taking this action.
```

---

## 69. Warnings Must Be Distinct From Errors

Warnings MUST NOT be rendered as if the action failed.

Confirmed warning candidates:

- Change Upgrade/Emergency without attachment;
- Maintenance Announcement timing atypical for selected subtype.

User MAY continue after acknowledging/seeing warning unless a future Business Rule makes it blocking.

---

## 70. Validation Response Is Not Authorization

Passing field validation does not grant permission.

Action succeeds only when:

```text
Authorization
+ Scope
+ Current State
+ Archive Rule
+ Validation
+ Concurrency Check
= valid business action
```

---

# PART M — CONCURRENCY AND VALIDATION

## 71. Validate Against Current Persisted Record

Workflow-changing action MUST validate against current persisted data/state, not only stale browser payload.

Example:

```text
Reviewer A and B open same PENDING_REVIEW record.
A Forward succeeds -> PENDING_APPROVAL.
B sends Reject from stale screen.

Reject MUST fail because current state is no longer PENDING_REVIEW.
```

---

## 72. No Partial Success

If validation fails:

- business state MUST remain unchanged;
- no false success event may be written;
- invalid final sign-off MUST NOT be generated;
- transaction strategy will be defined downstream.

---

# PART N — PROVISIONAL RULES AND FUTURE REFINEMENT

## 73. Explicit Provisional Decisions

The following are valid current implementation rules but are intentionally marked PROVISIONAL because official company sample/SOP has not yet been provided:

1. Automatic Request No format `NSCMF-YYYYMM-#####`.
2. Global monthly automatic sequence scope.
3. Manual Request No character pattern/length.
4. Header Date not-future rule at first Submit.

When official requirement arrives:

- docs MUST be updated before implementation behavior is changed;
- historical records retain original values;
- migration/backward compatibility must be considered.

---

## 74. Items Still Outside This Document

The following remain downstream/TBD, not silently solved here:

- exact default Unit/Division master data;
- exact UI widget/component representation;
- controlled master lists for POP/Regional/upstream/equipment if provided later;
- antivirus/malware scanning architecture;
- attachment storage provider/path;
- electronic/freehand signature technology, if ever required;
- database column types/precision;
- API error schema;
- transaction/locking implementation;
- audit retention;
- export/download audit policy;
- additional export formats and packaging;
- official company NSCMF numbering SOP/sample.

---

# PART O — IMPLEMENTATION GUARDRAILS

## 75. Developer / AI Must Not

Implementation MUST NOT:

1. make every Excel field mandatory by default;
2. block Draft saving because submission-required fields are incomplete;
3. require Result of Changes at first Submit merely because section exists;
4. let Change move to `PENDING_APPROVAL` without applicable Result gate;
5. require all five Result rows to be filled;
6. allow partial Result rows at Submit/Resubmit/Forward;
7. unlock whole Change form during `PENDING_REVIEW` just to capture Result;
8. let `nscmf.change.result.edit` become general form edit permission;
9. make Service Impact single-select;
10. allow Service Impact Other without description;
11. make attachment mandatory for Upgrade/Emergency under current requirement;
12. accept executable/script extension outside attachment allowlist;
13. trust frontend validation alone;
14. accept manual Request No duplicates;
15. regenerate Request No during revision/reopen;
16. mutate Request No after first successful Submit through normal workflow;
17. allow Return/Reject/Reopen/Archive/Unarchive without mandatory reason where this document requires one;
18. reject historical/reopened Change solely because an unchanged Target Execution Date has naturally passed;
19. bypass state/permission checks because field validation passes;
20. invent e-signature assurance not defined by requirements.

---

# PART P — TESTABLE ACCEPTANCE CRITERIA

## 76. General Validation Acceptance

- [ ] Draft can save incomplete business data.
- [ ] Required field validation is enforced at Submit/Resubmit.
- [ ] Backend independently validates workflow-changing actions.
- [ ] Error and Warning are distinguishable.
- [ ] Unknown enum values are rejected.
- [ ] Whitespace-only mandatory values are rejected.

---

## 77. Numbering Acceptance

- [ ] Automatic number follows provisional `NSCMF-YYYYMM-#####`.
- [ ] Concurrent automatic generation cannot create duplicate Request No.
- [ ] Automatic sequence gaps are allowed and numbers are never reused.
- [ ] Manual Request No follows provisional character/length rule.
- [ ] Manual uniqueness is globally enforced.
- [ ] Request No becomes immutable after first successful Submit.

---

## 78. Activation Acceptance

- [ ] Activation subtype requires New Service core block.
- [ ] Deactivation subtype requires Existing Service core block.
- [ ] Upgrade/Downgrade requires both Existing and New Service core blocks.
- [ ] Applicable Service Status accepts exactly one Activated/Deactivated value.
- [ ] Other Reference requires specification.
- [ ] Invalid IP/CIDR/Gateway values fail submission when entered.
- [ ] Invalid domain/DNS/MX values fail when entered.
- [ ] Bandwidth entered as zero/negative fails.
- [ ] Packet Loss outside 0–100 fails.
- [ ] VLAN outside 1–4094 fails.

---

## 79. Change Acceptance

- [ ] Change Form Purpose is exactly one Maintenance/Upgrade/Emergency.
- [ ] Facing Challenges is required for Upgrade/Emergency.
- [ ] Maintenance Purpose is required for Maintenance.
- [ ] At least one Identified Problem is required.
- [ ] Service Impact is multi-select with at least one value.
- [ ] Service Impact Other requires description.
- [ ] At least one complete Improvement Plan/Target KPI pair is required.
- [ ] Target Execution Date cannot be past on first Submit.
- [ ] Unchanged historical target date does not invalidate later Resubmit/Reopen solely because time passed.
- [ ] Monitoring Period is positive.
- [ ] Rollback Scenario is required.
- [ ] Maintenance Announcement requires exactly one option.
- [ ] Missing Upgrade/Emergency attachment produces Warning, not Error.

---

## 80. Result of Changes Acceptance

- [ ] First Submit can succeed with zero Result rows.
- [ ] Requester/owner has narrow `nscmf.change.result.edit` capability during `PENDING_REVIEW`.
- [ ] Narrow Result edit cannot change planning/submitted fields.
- [ ] Persisted Result changes are audited.
- [ ] Forward requires at least one complete Result row.
- [ ] Each used row requires Summary + Performance + Status.
- [ ] System does not require all five rows.

---

## 81. Attachment Acceptance

- [ ] Attachment remains optional.
- [ ] Maximum 10 files per record.
- [ ] Maximum 20 MB each.
- [ ] Zero-byte files rejected.
- [ ] Extension outside allowlist rejected.
- [ ] Script/executable/macro-enabled file types in current blocked examples cannot pass allowlist validation.

---

## 82. Workflow Reason Acceptance

- [ ] Reviewer Return requires reason.
- [ ] Reviewer Reject requires reason.
- [ ] Approver Return to Reviewer requires reason.
- [ ] Approver Return to Requester requires reason.
- [ ] Approver Reject requires reason.
- [ ] Reopen requires reason.
- [ ] Archive requires reason.
- [ ] Unarchive requires reason.
- [ ] Cancel reason remains optional.

---

# PART Q — TRACEABILITY AND NEXT DOCUMENT

## 83. Relationship to Prior Documents

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| Permission/scope | `04_RBAC_Permission_Matrix.md` |
| State machine | `05_State_Status_Flow.md` |
| **Input/action validation** | **`06_Validation_Rules.md`** |
| Presentation/interaction design | `07_UI_UX_Specification.md` |

Where earlier docs deliberately said a validation detail was TBD, this document now resolves it unless explicitly marked PROVISIONAL/TBD here.

---

## 84. Required Synchronization to Prior Documents

Following confirmed Validation decisions must be reflected when prior docs are next synchronized:

- Change Service Impact = multi-select;
- default Result-of-Changes editor = Requester/owner using conceptual `nscmf.change.result.edit` in `PENDING_REVIEW`;
- workflow reason requirements;
- Archive/Unarchive reason mandatory;
- current attachment limits/allowlist;
- provisional numbering format/uniqueness/immutability;
- Result rows minimum 1 complete row before Forward, not all five;
- Change Target Execution Date validation behavior.

These are not optional implementation guesses after approval of this document.

---

## 85. Next Document

Next document in fixed project order:

**`07_UI_UX_Specification.md`**

UI/UX Specification should translate the confirmed rules into screens/components, especially:

- required/conditional field indicators;
- Draft validation experience;
- error vs warning presentation;
- family/subtype-dependent sections;
- Service Impact multi-select + Other description;
- Result-only editing during `PENDING_REVIEW`;
- reason dialogs;
- attachment uploader limits;
- state-aware action buttons;
- stale-state refresh behavior;
- automatic/manual Request No UX;
- sign-off/timeline presentation.
