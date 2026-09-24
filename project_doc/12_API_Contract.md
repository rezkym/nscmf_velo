# API Contract Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-API-012  
> **Document Order:** 12 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`, `14_Environment_Specification.md`  
> **Application Style:** Laravel 13 modular monolith + Inertia 3 + Vue 3 + session authentication  
> **Canonical Application Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-23 (G06 byte-limit decision; G01/G03/G07/G09/G12/G14/G19 decisions)

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk HTTP/application contract** NSCMF Digital Form & Workflow System.

Dokumen ini mendefinisikan:

- pembagian Laravel Web/Inertia route vs structured JSON endpoint;
- authenticated session/CSRF behavior;
- resource naming dan URI contract;
- request/response transport shape;
- stable error envelope dan machine-readable error code;
- pagination/filter/sort contract;
- optimistic `record_version` transport;
- explicit NSCMF workflow-action endpoints;
- form Draft/Revision/Result persistence contract;
- resumable attachment/chunk upload, recovery, assembly, scan, dan download contract;
- asynchronous export request/status/download contract;
- minimum-disclosure public PDF validation contract;
- user/role/permission/Team administration boundaries;
- server-generated one-time temporary credential result;
- 15-minute password re-authentication boundary;
- protected Technical Log cleanup settings contract;
- Business Timeline dan privileged audit access contract;
- security, IDOR, mass-assignment, concurrency, and storage-abstraction guardrails.

Dokumen ini **tidak** mengubah product scope, business rules, permission semantics, state machine, field validation, database schema authority, security policy, logical architecture, atau physical deployment topology yang sudah dikunci upstream.

---

## 2. Authority and Precedence

Jika ada konflik concern:

| Concern | Authoritative document |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariants | `02_Business_Rules.md` |
| User flow | `03_User_Flow.md` |
| Permission / RBAC / Team boundary | `04_RBAC_Permission_Matrix.md` |
| State / workflow iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI/UX | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Relational schema | `11_ERD_Database_Schema.md` |
| Resumable upload synchronization | `11A_Resumable_Attachment_Upload_Synchronization.md` |
| **HTTP / request / response contract** | **`12_API_Contract.md`** |

API MUST expose upstream decisions; API MUST NOT reinterpret them.

---

## 3. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default unless an explicit confirmed rule differs.
- **MAY** — allowed.
- **AUTHORITATIVE** — source of truth for the concern.
- **DERIVED** — calculated from authoritative state; not a competing source of truth.
- **PROVISIONAL** — API-level choice needed to make the contract executable but not established as company policy.
- **TBD** — intentionally unresolved; implementation MUST NOT guess silently.
- **FAIL CLOSED** — uncertainty/failure denies or keeps the resource unusable rather than permitting it.

---

# PART A — API STYLE AND TRANSPORT

## 4. Hybrid HTTP Model — Confirmed

The application is **not** a separate REST backend + standalone SPA.

Confirmed model:

```text
Browser
→ Laravel Web Routes / Inertia for normal page navigation and normal form/workflow interactions
→ dedicated structured JSON endpoints where asynchronous/reconcilable/configuration state is required
→ same Laravel application
→ same session-auth security model
```

### 4.1 Inertia / Web routes

Used for:

- Login/Logout pages/actions;
- dashboard and page navigation;
- Create NSCMF flow;
- record pages;
- Review/Approval/History pages;
- explicit workflow action forms;
- normal administration pages/actions;
- archive/unarchive actions.

### 4.2 JSON endpoints

Used for at least:

- Draft/Revision autosave;
- narrow Change Result update;
- resumable attachment upload initiation/status/chunks/completion;
- attachment scan/status polling;
- export request/status polling;
- bulk export status data where required;
- public PDF verification;
- protected Technical Log cleanup settings read/update where implementation uses asynchronous/client-side settings forms.

All internal JSON endpoints remain in the same Laravel application and MUST use authenticated `web` session context unless explicitly public.

### 4.3 Binary endpoints

Used for:

- CLEAN attachment download;
- READY export artifact download.

Binary endpoints MUST still perform server-side authorization before streaming bytes.

---

## 5. Authentication, Session, and CSRF

Internal routes use:

```text
Laravel session authentication
web guard
HttpOnly session cookie
CSRF protection for authenticated state-changing browser requests
```

MUST NOT introduce Bearer token/JWT/API key authentication for the normal internal web application without an explicit architecture change.

Public `/ispdfvalid` does not require login but remains rate-limited and security-controlled.

### 5.1 Session policy

Authoritative policy:

```text
idle timeout      = 30 minutes
absolute lifetime = 8 hours
maximum active sessions/account = 2
```

Confirmed third-login behavior:

```text
third valid login
→ succeeds
→ server deterministically revokes the oldest active authenticated session
→ new session remains active
→ active session count remains <= 2
```

Revocation is server-side. Deleting a browser cookie is not sufficient.

### 5.2 Authentication failures

Login failure MUST remain enumeration-resistant. The response MUST NOT reveal whether the username exists or whether only the password was wrong.

---

## 6. Content Types

### JSON

```http
Content-Type: application/json
Accept: application/json
```

### Chunk upload

```http
Content-Type: application/octet-stream
```

Chunk index is carried by the URI. Server calculates the actual chunk hash after receipt; the client is not required to provide an authoritative checksum header.

### Public PDF verification

```http
Content-Type: multipart/form-data
```

Single field:

```text
file = PDF binary
```

Maximum accepted uploaded PDF size:

```text
20,000,000 bytes inclusive (decimal 20 MB)
```

This cap counts the uploaded PDF file bytes, not the complete multipart HTTP request body. Zero-byte files are invalid. The public-validator cap is independently confirmed by `10 §73` and equals the attachment cap in `06 §50`.

### Downloads

Server sends the correct MIME type and safe `Content-Disposition` filename. Original filename MUST be sanitized for header use and MUST NOT be used as a storage path.

---

## 7. JSON Primitive Conventions

### 7.1 Dates

Business dates:

```text
YYYY-MM-DD
```

Example:

```json
{"request_date":"2026-08-22"}
```

### 7.2 Timestamps / Timezone

API timestamps use ISO-8601 with timezone/offset.

Canonical application/business timezone is:

```text
Asia/Jakarta
```

Example:

```json
{"updated_at":"2026-08-22T18:20:00+07:00"}
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
- duplicate natural key inside one request → `422 VALIDATION_FAILED`;
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

| Collection | Natural key | Content fields deciding "not-started" |
|---|---|---|
| `service_blocks` | `service_context` | `service_id`, `service_status`, `service_description`, `service_location` |
| `sla_items` | `row_no` | `requirement_text` |
| `virtual_connections` | `row_no` | `bandwidth_mbps` |
| `priority_destinations` | `row_no` | `destination` |
| `facing_challenges` | `row_no` | `challenge_text` |
| `identified_problems` | `row_no` | `problem_text` |
| `improvement_items` | `row_no` | `plan_text`, `target_kpi` |
| `results` | `row_no` | `result_summary`, `performance_information`, `result_status` |

The natural key itself is never a content field: a row carrying only `row_no` or only `service_context` is not-started.

Discard is a persistence rule only. It MUST NOT be used to bypass a `06` completeness gate: a partially started row still persists and is still judged at `FIRST_SUBMIT`/`RESUBMIT`/`REVIEW_FORWARD`.

### 7.5 Enums

Wire enum values use canonical uppercase machine values exactly as specified. Unknown enum values are rejected.

---

# PART B — RESPONSE AND ERROR CONTRACT

## 8. Standard JSON Success Envelope

Structured JSON endpoint SHOULD return:

```json
{"data":{},"meta":{}}
```

For lists:

```json
{"data":[],"meta":{"pagination":{}}}
```

Warnings that do not block a successful action are exposed through `meta.warnings` and MUST NOT be used for malware/security failure.

---

## 9. Standard JSON Error Envelope — Confirmed

All structured JSON errors use:

```json
{
  "code":"NSCMF_VERSION_CONFLICT",
  "message":"A newer version of this record exists.",
  "errors":{},
  "context":{}
}
```

MUST NOT include stack traces, SQL, absolute filesystem paths, private storage keys, signing key information, raw ClamAV internals, session payload, password, temporary-password plaintext, or secret token.

### 9.1 Validation example

```json
{
  "code":"VALIDATION_FAILED",
  "message":"Some fields need to be corrected.",
  "errors":{"change.service_impacts":["Select at least one Service Impact."]},
  "context":{}
}
```

### 9.2 Version conflict example

```json
{
  "code":"NSCMF_VERSION_CONFLICT",
  "message":"A newer version of this record exists. Refresh the record before saving again.",
  "errors":{},
  "context":{"latest_record_version":14,"current_business_status":"PENDING_REVIEW"}
}
```

Context is returned only after authorization confirms the actor may know the record.

---

## 10. Inertia Error Mapping

Inertia routes do not need JSON envelopes for every response.

- field errors → validation error bag;
- domain/action error → shared/flash `domain_error` using the same stable code/safe semantics;
- successful POST/PATCH workflow form → `303 See Other` to canonical latest page;
- latest server state MUST be rendered after redirect.

---

## 11. HTTP Status Semantics

| HTTP | Meaning |
|---:|---|
| `200 OK` | successful read/update or idempotent accepted replay |
| `201 Created` | synchronously created resource |
| `202 Accepted` | asynchronous work accepted/queued |
| `204 No Content` | successful action with no response body |
| `303 See Other` | successful Inertia form/action redirect |
| `400 Bad Request` | malformed request not fitting structured validation |
| `401 Unauthorized` | session absent/expired/revoked |
| `403 Forbidden` | authenticated but action/resource/security precondition denied |
| `404 Not Found` | resource unavailable or intentionally undisclosed |
| `409 Conflict` | version/state/idempotency/resource-state conflict |
| `410 Gone` | temporary resource expired |
| `422 Unprocessable Entity` | validation failure |
| `429 Too Many Requests` | throttle/rate/resource-abuse control |
| `500 Internal Server Error` | safe generic unexpected failure |
| `503 Service Unavailable` | required subsystem unavailable where fail-closed applies |

Do not return `200` for failed domain mutation.

---

## 12. Core Error Code Catalog

### Authentication/session

```text
AUTHENTICATION_REQUIRED
AUTHENTICATION_FAILED
ACCOUNT_DISABLED
SESSION_EXPIRED
SESSION_REVOKED
REAUTH_REQUIRED
REAUTH_FAILED
RATE_LIMITED
```

### Authorization/resource

```text
FORBIDDEN
RESOURCE_NOT_FOUND
PROTECTED_RESOURCE
```

### Validation/record

```text
VALIDATION_FAILED
REQUEST_NO_CONFLICT
NSCMF_VERSION_CONFLICT
NSCMF_STATE_CONFLICT
NSCMF_ARCHIVED_CONFLICT
NSCMF_ACTION_NOT_ALLOWED
```

### Attachment/upload

```text
ATTACHMENT_LIMIT_REACHED
ATTACHMENT_TYPE_INVALID
ATTACHMENT_SIZE_INVALID
ATTACHMENT_ZERO_BYTE
ATTACHMENT_NOT_CLEAN
ATTACHMENT_REMOVED
UPLOAD_SESSION_EXPIRED
UPLOAD_SESSION_STATE_CONFLICT
UPLOAD_CHUNK_INVALID
UPLOAD_CHUNK_CONFLICT
UPLOAD_INCOMPLETE
UPLOAD_ASSEMBLY_FAILED
UPLOAD_INTEGRITY_FAILED
MALWARE_DETECTED
MALWARE_SCAN_FAILED
```

### Export/signing

```text
EXPORT_NOT_READY
EXPORT_FAILED
EXPORT_EXPIRED
EXPORT_NOT_FOUND
SIGNING_NOT_READY
```

### Public verification

```text
VALIDATOR_FILE_INVALID
VALIDATOR_FILE_TOO_LARGE
VALIDATOR_SCAN_FAILED
RATE_LIMITED
```

### Protected settings

```text
SYSTEM_SETTINGS_INVALID
SYSTEM_SETTINGS_PROTECTED
```

Implementation MAY add narrowly-scoped codes, but MUST NOT casually rename established codes.

---

# PART C — PAGINATION / FILTERING / SORTING

## 13. Pagination — Confirmed

```text
page
per_page
```

Rules:

```text
default per_page = 25
maximum per_page = 100
page >= 1
per_page >= 1
```

Invalid values → `422 VALIDATION_FAILED`.

## 14. Sorting

```text
sort=<whitelisted_field>
direction=asc|desc
```

Unknown/non-whitelisted sort fields reject; raw SQL expression from query params forbidden.

## 15. Common Record Filters

Where applicable:

```text
q
family
subtype
business_status
archived
request_date_from
request_date_to
owner_user_id
team_id
```

`team_id` is informational/business filtering only, never authorization scope.

## 16. Common Sort Whitelist

May expose appropriate subset of:

```text
request_no
request_date
created_at
updated_at
business_status
family
subtype
```

---

# PART D — AUTHORIZATION CONTRACT

## 17. Server Is Always Authoritative

Every protected request evaluates applicable:

```text
valid session
+ protected invariant
+ required permission
+ ownership where explicitly required
+ resource authorization
+ archive treatment
+ current business state
+ validation
+ security precondition
+ concurrency/current-state check
```

**Team is intentionally absent.**

### 17.1 Record Resource Visibility — Confirmed 2026-09-22

"Resource authorization/visibility" for reading an NSCMF record (detail, History, Dashboard lists, queues) is:

```text
record never submitted (business_status DRAFT or CANCELLED)
→ visible only to its owner (owner_user_id)

record submitted at least once (any other business_status)
→ visible to any actor holding the page/read permission (nscmf.view, nscmf.view.history, queue permission)
```

Rules:

- Team never participates; no Team filter grants or removes visibility;
- the rule applies to every actor, including the Protected Superadmin — there is no bypass for another user's never-submitted Draft;
- an invisible record is concealed with `404` (§102);
- the rule governs every record-scoped read **and action**: an action permission alone (for example `nscmf.archive` or `nscmf.reopen` without any read permission) never reveals a submitted record (enforced 2026-09-24);
- queue permissions (`nscmf.review`, `nscmf.approve`) additionally restrict each queue to its own state.

Decision owner: project owner (user), 2026-09-22, recorded as gap G19 in the backend microtask register.

## 18. Permission-Centric Runtime

API MUST use explicit permissions from `04`, including NSCMF, administration, audits, and `system.settings.manage`.

API MUST NOT authorize normal actions by hard-coded role names when permission exists, except the additional protected identity invariant where a setting is explicitly **Protected Superadmin-only**.

## 19. Forbidden Authorization Inputs

Client MUST NOT send/influence:

```text
reviewer_scope
approval_scope
unit_id
division_id
permission_team_id
spatie_team_id
```

## 20. Server-Managed Fields

Generic form update MUST not expose business status, owner/team source-of-truth changes, requested/reviewed/approved fields, archive metadata, audit actor/timestamp, attachment hash/security/storage locator, export snapshot/status, issuance/signing fields, protected Superadmin flags, or settings audit actor.

`record_version` is only expected-current precondition, never client-selected next version.

---

# PART E — CONCURRENCY / MUTATION

## 21. `record_version`

Draft/Revision/Result require current expected version. Successful mutation increments atomically. Mismatch → `409 NSCMF_VERSION_CONFLICT`.

Workflow/lifecycle actions additionally use DB row lock/current-state revalidation and MUST send current browser `record_version` as stale-UI precondition.

## 22. No Universal Idempotency Key

Domain-specific idempotency:

- chunks → session + index + server hash;
- workflow race → locked state/version;
- numbering → sequence/unique;
- export retry → new immutable export request/snapshot.

---

# PART F — COMMON RECORD DTO

## 23. Summary

Representative:

```json
{
  "id":572,
  "request_no":"NSCMF-202608-00042",
  "family":"CHANGE",
  "subtype":"MAINTENANCE",
  "request_date":"2026-08-22",
  "business_status":"PENDING_REVIEW",
  "record_version":8,
  "is_archived":false,
  "owner":{"id":19,"name":"Example User"},
  "team":{"id":3,"name":"Team NOC"},
  "created_at":"2026-08-22T09:00:00+07:00",
  "updated_at":"2026-08-22T10:15:00+07:00"
}
```

Team is display/business metadata only.

## 24. Detail

Extends summary with requested/reviewed/approved sign-off, workflow iteration, and server-derived `allowed_actions`. `allowed_actions` is UI hint, never authorization token.

---

# PART G — CREATE / FORM PERSISTENCE

## 25. Create NSCMF

```http
POST /nscmf
```

Mode: Inertia/Web mutation.

Permission `nscmf.create`; active authenticated user; valid active Team; family/subtype and numbering valid. Team captured from current user and is not supplied as authorization input.

Request:

```json
{"family":"CHANGE","subtype":"MAINTENANCE","numbering_mode":"AUTOMATIC","request_no":null}
```

Success: `303` to `/nscmf/{record}/edit`.

## 26. Draft / Revision JSON Save

```http
PATCH /nscmf/{record}/draft
```

`nscmf.draft.edit + owns + DRAFT|REVISION_REQUIRED`.

Dedicated validated nested structure maps to typed relational tables; no live JSON business blob; no blind mass assignment.

The exact payload is fixed: §26.1 for the optional record header, §27 for `family=ACTIVATION`, §28 for `family=CHANGE`, under the collection semantics of §7.4.1. Implementations MUST NOT define an alternative shape.

Top-level keys are exactly `record_version` (required), `header` (optional, §26.1), and the family key matching the record (`activation` or `change`, optional). A family key that does not match the record family, or any other top-level key → `422 VALIDATION_FAILED`.

Conflict → `409 NSCMF_VERSION_CONFLICT`.

Success → `200` with the standard envelope (§8):

```json
{"data":{"id":572,"record_version":9,"business_status":"DRAFT","updated_at":"2026-09-22T10:15:00+07:00"},"meta":{"warnings":[]}}
```

`data.record_version` is the new authoritative version the client MUST send next. The client re-reads the full form only through the page projection; the save response is not a form projection.

### 26.1 Draft Header Block — Confirmed 2026-09-22

The Draft save carries the editable record header so the Submit-required header date (`06` §21) and Draft number correction (`06` §20) have a transport:

```json
{
  "record_version": 8,
  "header": {
    "request_date": "2026-09-22",
    "request_no": "OPS/2026/0042"
  },
  "change": { "...": "..." }
}
```

Rules:

- `header` omitted → header unchanged; each header key follows §7.4 (omitted → unchanged, `null` → clear where nullable);
- `request_date`: `YYYY-MM-DD` or `null`; editable while `DRAFT`/`REVISION_REQUIRED`; the not-future rule applies at Submit/Resubmit (`06` §21), not at Draft save;
- `request_no`: accepted only while the record is `DRAFT` (never submitted) **and** `numbering_mode=MANUAL`; normalized and validated as `06` §19; a normalized value used by another record → `422` with code `REQUEST_NO_CONFLICT` and a field error on `header.request_no` (at Create, §25, the same clash is a field error on `request_no`); any `request_no` key for an Automatic record or after first Submit → `422`; `null` is invalid (Manual number is required);
- `family`, `subtype`, and `numbering_mode` are not header keys and remain immutable through Draft save;
- header changes share the same transaction, Business Audit event, and single `record_version` increment as the rest of the save.

Decision owner: project owner (user), 2026-09-22, closing gap G03 of the backend microtask register.

---

# PART H — ACTIVATION / CHANGE FORM TRANSPORT

## 27. Activation DTO

Activation transport follows `06`/`11` typed fields and exact enum values. Requiredness is action-specific; Draft may be incomplete. Requiredness is owned by `06`, never by this transport shape.

Transport rules:

- keys are exactly the `11` column names for scalar fields;
- collections follow §7.4.1 whole-set replacement;
- Draft `PATCH` MAY omit any key; omission is "unchanged", not "clear";
- unknown key → `422 VALIDATION_FAILED`; no silent ignore, no mass assignment.

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
    "bandwidth_international_mbps": 100.000,
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

    "sla_items": [
      { "row_no": 1, "requirement_text": "Uptime layanan sesuai kontrak" }
    ],

    "virtual_connections": [
      { "row_no": 1, "bandwidth_mbps": 50.000 }
    ],

    "priority_destinations": [
      { "row_no": 1, "destination": "Google Global Cache" }
    ],

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

## 28. Change DTO

Change transport follows `06`/`11`, including Service Impact multi-select and Result rows max five, under the same transport rules as §27.

### 28.1 Canonical Change payload

`PATCH /nscmf/{record}/draft` for `family=CHANGE`:

```json
{
  "record_version": 8,
  "change": {
    "maintenance_purpose": "Penggantian modul optik pada core router.",
    "target_execution_date": "2026-09-20",
    "monitoring_period_value": 3.000,
    "monitoring_period_unit": "DAY",
    "rollback_scenario": "Kembalikan modul lama dan pulihkan konfigurasi tersimpan.",
    "announcement_timing": "ONE_WEEK_BEFORE",

    "facing_challenges": [
      { "row_no": 1, "challenge_text": "Jendela pemeliharaan terbatas." }
    ],

    "identified_problems": [
      { "row_no": 1, "problem_text": "Error rate meningkat pada uplink utama." }
    ],

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

## 29. Narrow Change Result Update

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

Success → `200`:

```json
{"data":{"id":572,"record_version":10,"results":[{"row_no":1,"result_summary":"Modul terpasang, layanan pulih.","performance_information":"Error rate 0 selama 72 jam.","result_status":"SUCCESS"}]},"meta":{"warnings":[]}}
```

`data.results` is the persisted set after §7.4.1 replacement (discarded not-started rows absent).

Page — confirmed 2026-09-22 (gap G01): there is no separate Result page route. `GET /nscmf/{record}/edit` renders the Result-only editor when the actor is the owner, holds `nscmf.change.result.edit`, and the record is `CHANGE` + `PENDING_REVIEW`; it renders the full Draft editor for an editable own `DRAFT`/`REVISION_REQUIRED`; otherwise it answers `403`/`404` per §102.

---

# PART I — WORKFLOW ACTION CONTRACT

## 30. Submit / Resubmit

```http
POST /nscmf/{record}/submit
```

```text
DRAFT → PENDING_REVIEW
REVISION_REQUIRED → PENDING_REVIEW
```

Ownership required. First successful Submit establishes iteration 1 and Requested By; Resubmit same iteration.

## 31. Cancel Draft

```http
POST /nscmf/{record}/cancel
```

Eligible own never-submitted Draft; destination always CANCELLED; optional reason.

## 32. Reviewer Forward

```http
POST /nscmf/{record}/review/forward
```

`nscmf.review.forward + PENDING_REVIEW + action validation`. Change requires one complete Result row/all started complete. Destination PENDING_APPROVAL. Actor becomes effective Reviewed By.

## 33. Reviewer Return

```http
POST /nscmf/{record}/review/return
```

Mandatory reason. Destination REVISION_REQUIRED.

## 34. Reviewer Reject

```http
POST /nscmf/{record}/review/reject
```

Mandatory reason. Destination REJECTED.

## 35. Approver Approve

```http
POST /nscmf/{record}/approval/approve
```

`nscmf.approve + PENDING_APPROVAL + current effective Review + all prerequisites`. Destination APPROVED. One successful Approve final for iteration.

## 36. Approver Return Reviewer

```http
POST /nscmf/{record}/approval/return-reviewer
```

Mandatory reason; destination PENDING_REVIEW; clears current effective Reviewed By/At requiring fresh Forward.

## 37. Approver Return Requester

```http
POST /nscmf/{record}/approval/return-requester
```

Mandatory reason; destination REVISION_REQUIRED; Resubmit returns to Review.

## 38. Approver Reject

```http
POST /nscmf/{record}/approval/reject
```

Mandatory reason; destination REJECTED.

## 39. Reason / Comment Rules

Mandatory reasons: Reviewer Return/Reject, Approver Returns/Reject, Reopen, Archive, Unarchive. Trimmed minimum 5 meaningful chars, maximum 2000. "Meaningful" = characters other than whitespace (decided 2026-09-24): `"a   b"` is refused. Forward/Approve comment optional max2000. Cancel reason optional.

---

# PART J — REOPEN / ARCHIVE

## 40. Reopen

```http
POST /nscmf/{record}/reopen
```

Source Approved/Rejected, not archived, `nscmf.reopen`, authorized access, mandatory reason. Destination only `REVISION_REQUIRED|PENDING_REVIEW`. Success creates next iteration. CANCELLED never reopen.

Request keys exactly:

```json
{
  "record_version": 12,
  "reason": "Perlu perbaikan pada hasil implementasi.",
  "destination_status": "REVISION_REQUIRED"
}
```

`record_version` is required for optimistic concurrency. `reason` is required, trimmed, and follows §39 (5–2000 meaningful characters). `destination_status` is required and MUST be exactly `REVISION_REQUIRED` or `PENDING_REVIEW`. Any other or additional request key is rejected with `422`; the server does not mass-assign from the request body.

Decision provenance: confirmed by the project owner on 2026-09-22 after the explicit approval `Setujui destination_status (disarankan)`. This closes the Reopen destination decision in G09; the administration and temporary-password decisions in §78 and §96.2 remain unchanged. Sections §41–43 and the other transition contracts are unchanged.

## 41. Archive

```http
POST /nscmf/{record}/archive
```

`nscmf.archive + authorized + APPROVED|REJECTED|CANCELLED + not archived + reason`. Status unchanged.

## 42. Unarchive

```http
POST /nscmf/{record}/unarchive
```

`nscmf.archive + authorized + archived + reason`. Status unchanged.

## 43. Explicit Transition Matrix

No generic status setter exists. All lifecycle/workflow actions use explicit routes above.

---

# PART K — QUEUES / HISTORY / TIMELINE / AUDIT

## 44. Canonical Page Routes

```text
GET /dashboard
GET /nscmf/create
GET /nscmf/{record}
GET /nscmf/{record}/edit
GET /review
GET /review/{record}
GET /approval
GET /approval/{record}
GET /history
```

`GET /nscmf/{record}/edit` serves both the Draft/Revision editor and the Change Result-only editor (§29).

## 45. Review Queue

`PENDING_REVIEW` candidates permission/resource-driven, not Team-scoped. Team may be informational filter only.

## 46. Approval Queue

`PENDING_APPROVAL`, shared/non-exclusive. First valid locked action wins.

## 47. History

Uses `nscmf.view.history + resource visibility`. Archived is separate flag/filter.

## 48. Business Timeline

```http
GET /nscmf/{record}/timeline
```

Business mutation/workflow evidence only; routine View/download/export access not mixed in.

## 49. Privileged Access Audit

```http
GET /administration/audits/access
```

Read-only. No delete/purge route.

## 50. Privileged Security Audit

```http
GET /administration/audits/security
```

Read-only; no secrets.

---

# PART L — RESUMABLE ATTACHMENT UPLOAD

## 51. Attachment Eligibility / Limits

Editable context only according to `06`; optional; max10; max20,000,000 bytes/file inclusive; zero-byte reject; locked allowlist.

## 52. Initiate / Resume

```http
POST /nscmf/{record}/attachment-uploads
```

Client fingerprint SHA-256 is resume hint only. Server owns session match/progress state.

Response includes upload ID, resumed flag, 5 MiB chunk size, accepted/missing chunks, expiry.

## 53. Inspect Session

```http
GET /nscmf/{record}/attachment-uploads/{upload_id}
```

Returns safe transport state only; no storage key.

## 54. Chunk Indexing

1-based indexes. Default/locked chunk size `5,242,880` bytes. Final chunk = exact remainder.

## 55. Upload Chunk

```http
PUT /nscmf/{record}/attachment-uploads/{upload_id}/chunks/{chunk_index}
Content-Type: application/octet-stream
```

Server streams to private persistent storage, computes chunk SHA-256, persists accepted metadata after write success.

Byte-identical accepted-index replay → `200 duplicate=true`; different bytes → `409 UPLOAD_CHUNK_CONFLICT`.

New progress refreshes 24h inactivity anchor; pure duplicate replay SHOULD NOT extend indefinitely.

## 56. Complete Upload

```http
POST /nscmf/{record}/attachment-uploads/{upload_id}/complete
```

Server verifies complete set/size, then async finalization:

```text
assemble privately
→ server final SHA-256
→ final type validation
→ full-file ClamAV
→ explicit CLEAN
→ promote final private attachment
```

## 57. Upload Lifecycle

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

Technical only.

## 58. Attachment Security Lifecycle

```text
PENDING
CLEAN
INFECTED
FAILED
```

Only CLEAN usable/downloadable.

## 59. Poll Final Attachment

```http
GET /nscmf/{record}/attachments/{attachment}
```

No raw storage path or scanner internals in end-user DTO.

## 60. Cancel Unfinished Upload

```http
DELETE /nscmf/{record}/attachment-uploads/{upload_id}
```

## 61. Incomplete Upload Retention

24 hours since last successful newly accepted progress. Expired → `410 UPLOAD_SESSION_EXPIRED`.

## 62. Remove Final Attachment

```http
DELETE /nscmf/{record}/attachments/{attachment}
```

Logical business removal with audit; historical metadata preserved.

## 63. Download Attachment

```http
GET /nscmf/{record}/attachments/{attachment}/download
```

Authorized parent + belongs + not removed + CLEAN + private binary available. Storage key never grants permission.

Current storage backend is opaque to the HTTP contract. Initial production uses private persistent Laravel local storage, but API MUST NOT expose absolute host paths or rely on storage backend semantics for authorization.

---

# PART M — EXPORT CONTRACT

## 64. Formats

Exactly XLSX/PDF, asynchronous, immutable snapshot bound at request time.

## 65. Single Export

```http
POST /nscmf/{record}/exports
```

Request:

```json
{"format":"PDF"}
```

Server authorizes, creates request + immutable snapshot bound to record version/workflow iteration/template version, commits, dispatches after commit. `202 Accepted`.

## 66. Export Status

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

## 67. Poll Export

```http
GET /nscmf/exports/{export}
```

READY response includes safe metadata, `expires_at`, and signed indicator where applicable.

## 68. Approved PDF Signing Failure

Approved snapshot + signing failure → export FAILED; NSCMF remains APPROVED; no unsigned READY artifact; no issuance success row.

## 69. Download Export

```http
GET /nscmf/exports/{export}/download
```

Requires related-record authorization + `nscmf.export` + READY + unexpired binary. Generated binary retained exactly 168h/7d.

## 69.1 Record Export List — decided 2026-09-24

```http
GET /nscmf/{record}/exports
```

So a READY file can be downloaded again until it expires (07 §39) after the requester leaves the page. Requires record visibility (§17.1, else `404`) and `nscmf.export` (else `403`). Returns `200` with `data` = the actor's **own** exports of that record requested within the retention window (`nscmf.exports.retention_hours`, 168 h) and not expired, newest first, each in the §67 poll projection (never a storage key). Other users' exports are never listed. `Cache-Control: no-store, private`.

## 70. Retry

Failed/expired retry creates new export request and new immutable then-current snapshot.

## 71. Bulk Export

```http
POST /nscmf/exports/bulk
GET  /nscmf/export-batches/{batch}
GET  /nscmf/export-batches/{batch}/download
```

Each record independently authorized (at most 100 record IDs; one item result or error per record).

**Packaging — decided 2026-09-24 (G04):** `GET /nscmf/export-batches/{batch}/download` returns one `application/zip` for the batch owner holding `nscmf.export.bulk` and `nscmf.export`. It contains every constituent that is READY, unexpired and still downloadable by the requester, byte-identical to its single download and named `{request_no}.{ext}`; each packaged file is audited as `EXPORT_DOWNLOADED`. Failed, expired or no-longer-visible constituents are left out. A batch with a QUEUED/PROCESSING constituent → `409 EXPORT_NOT_READY`; nothing left to package → `410 EXPORT_EXPIRED`; another user's batch → `404`.

---

# PART N — PUBLIC PDF VALIDATOR

## 72. Page

```http
GET /ispdfvalid
```

No login. Narrow verification utility only.

## 73. Verify PDF

```http
POST /ispdfvalid/verify
Content-Type: multipart/form-data
```

Input exactly one PDF:

```text
file = PDF binary
maximum file size = 20,000,000 bytes inclusive (decimal 20 MB; file bytes only; zero-byte rejected)
```

Flow:

```text
rate limit / hardening
→ enforce PDF + 20,000,000-byte inclusive file max
→ private temp storage
→ ClamAV CLEAN
→ signature/recognized issuer verification
→ exact uploaded-byte SHA-256
→ issuance lookup
→ iteration/currentness
→ minimum disclosure
→ temp cleanup
```

Oversize → `422 VALIDATOR_FILE_TOO_LARGE` (or equivalent validation mapping using the stable code catalog), never attempt deep verification.

## 74. Validator Outcomes

Exactly:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

## 75. Validator Response / Disclosure

Recognized valid/superseded MAY expose Request No, family, issued_at, issuer System/Organization. Invalid/Unknown minimize disclosure. Never expose Requester/Reviewer/Approver/Team/form body/attachments/timeline/raw audits/storage paths/key internals.

---

# PART O — AUTHENTICATION / ACCOUNT ACTION ROUTES

## 76. Login

```http
POST /login
```

Username/password, generic failures. Third valid login revokes oldest active authenticated session and keeps the new session.

## 77. Logout

```http
POST /logout
```

Invalidates current server session.

## 78. Mandatory Temporary Password Change

```http
POST /account/temporary-password/change
```

Only when `must_change_password=true`. New password min6/no composition/no MFA. Success hashes new password, clears gate, applies session security, Security Audits safely.

Page and body — confirmed 2026-09-22 (gaps G01/G09):

```http
GET /account/temporary-password
```

Renders the mandatory change page. While `must_change_password=true`, every other authenticated page/action except this page, this POST and `POST /logout` redirects (Inertia) or answers `403` (JSON) to it; once cleared, this GET redirects to `/dashboard`.

Request keys exactly:

```json
{"password":"new-secret","password_confirmation":"new-secret"}
```

`password` min 6, no composition; `password_confirmation` must match. Success → `303` to `/dashboard`.

## 79. Sensitive-Action Re-authentication — 15 Minutes

```http
POST /account/re-authenticate
```

Request:

```json
{"current_password":"secret"}
```

Successful proof:

```text
server-side/session-bound
valid for 15 minutes
no plaintext reusable proof returned to JavaScript
```

Failure → `403 REAUTH_FAILED`; missing/expired proof → `403 REAUTH_REQUIRED`.

Every protected action still repeats normal authorization checks.

---

# PART P — USER ADMINISTRATION

## 80. User List

```http
GET /administration/users
```

Permission `users.view`; standard pagination/filters.

## 81. Create User — Server-Generated One-Time Temporary Password

```http
POST /administration/users
```

Requires:

```text
users.create
+ valid current-password re-auth proof (<=15 minutes)
+ target/protected invariants
```

Request identity fields:

```json
{
  "name":"Example User",
  "username":"example.user",
  "team_id":3,
  "role_ids":[2]
}
```

Client/admin MUST NOT choose or send a plaintext temporary password.

Server behavior:

```text
validate/create eligible user
→ generate cryptographically appropriate temporary password server-side
→ hash/store only hash
→ set must_change_password=true
→ establish role/team state
→ safe Security Audit
→ reveal temporary plaintext exactly once in the successful response/render to acting admin
```

Representative JSON success where JSON is used:

```json
{
  "data": {
    "user": {
      "id": 44,
      "name": "Example User",
      "username": "example.user",
      "must_change_password": true
    },
    "temporary_password": "<one-time-secret>"
  },
  "meta": {
    "temporary_password_reveal": "ONE_TIME_ONLY"
  }
}
```

Critical contract:

- `temporary_password` is available **only in this successful one-time result**;
- it MUST NOT be stored for later retrieval;
- no `GET temporary password` endpoint exists;
- it MUST NOT enter logs/audits/history/cache beyond unavoidable transient response mechanics;
- administrator conveys it through an internal channel;
- target cannot navigate normal app until changing it.

## 82. Update User Profile

```http
PATCH /administration/users/{user}
```

Permission `users.update`. Allowed normal fields only. Password/protected flags/roles/Team/is_active use explicit actions.

## 83. Enable User

```http
POST /administration/users/{user}/enable
```

## 84. Disable User

```http
POST /administration/users/{user}/disable
```

On success disable + revoke target active sessions + Security Audit; protected Superadmin cannot be disabled.

## 85. Reset User Password — Server-Generated One-Time Temporary Password

```http
POST /administration/users/{user}/reset-password
```

Requires:

```text
users.reset_password
+ valid <=15-minute current-password re-auth proof
+ protected-target invariant
```

No plaintext password input is accepted.

On success:

```text
server generates temporary password
→ stores hash only
→ must_change_password=true
→ revokes all target active sessions
→ safe Security Audit
→ returns/reveals temporary plaintext exactly once to acting admin
```

Representative JSON one-time response:

```json
{
  "data": {
    "user_id": 44,
    "must_change_password": true,
    "temporary_password": "<one-time-secret>"
  },
  "meta": {
    "temporary_password_reveal": "ONE_TIME_ONLY"
  }
}
```

No later retrieval endpoint exists.

## 86. Replace User Roles

```http
PUT /administration/users/{user}/roles
```

Requires `users.assign_roles + valid <=15-minute re-auth proof`. Replace role set; recheck protected invariant; revoke affected target sessions where effective access changes; Security Audit. No direct user-permission payload.

## 87. Assign User Team

```http
PUT /administration/users/{user}/team
```

Uses canonical policy mapping from `04`; Team change does not grant/revoke Review/Approval, recalculate permission, revoke sessions solely due Team, or rewrite historical record Team metadata.

Permission mapping — confirmed 2026-09-22 (gap G14): the actor needs **either** `users.assign_team` **or** `teams.assign_users`. Request body exactly `{"team_id": <active team id>}`.

---

# PART Q — ROLE / PERMISSION ADMINISTRATION

## 88. Role List

```http
GET /administration/roles
```

## 89. Permission Catalog

```http
GET /administration/permissions
```

Explicit permissions only; no wildcard rows.

## 90. Create Role

```http
POST /administration/roles
```

Permission `roles.create`.

## 91. Update Role Name

```http
PATCH /administration/roles/{role}
```

Permission `roles.update`; protected role invariants.

## 92. Replace Role Permissions

```http
PUT /administration/roles/{role}/permissions
```

Requires `permissions.assign + <=15-minute re-auth proof`. Validate, protected invariant, Spatie sync, determine all affected users, revoke affected sessions, Security Audit.

No shadow effective-permissions table.

Role archive remains absent until schema explicitly supports it.

---

# PART R — TEAM ADMINISTRATION

## 93. Team List

```http
GET /administration/teams
```

## 94. Create Team

```http
POST /administration/teams
```

## 95. Update Team

```http
PATCH /administration/teams/{team}
```

## 96. Deactivate / Reactivate Team

```http
POST /administration/teams/{team}/deactivate
POST /administration/teams/{team}/reactivate
```

No Team-delete baseline; no permission side effect.

## 96.1 Initial Setup Wizard — Confirmed 2026-09-22 (gaps G01/G12)

```http
GET /administration/setup
```

Renders the first-time Setup Wizard for an actor holding `roles.view`, `teams.view`, and `users.view`. The wizard composes the ordinary role (§90–92), Team (§94–96), and user (§81, §86) operations; it has no setup-specific mutation route.

Readiness is **derived from current data**; no setup-completion column or table exists:

```text
roles_configured = at least one role other than Superadmin has at least one permission
teams_configured = at least one active Team exists
users_configured = at least one active user who is not the Protected Superadmin has at least one role
setup_completed  = roles_configured AND teams_configured AND users_configured
```

After login, a Protected Superadmin whose installation is not `setup_completed` is redirected from `/dashboard` to `/administration/setup` (BR-SETUP-001). Resuming the wizard is the same derivation; nothing needs to be persisted. Signing readiness is not part of Phase 2 setup readiness.

## 96.2 Administration Request Bodies — Confirmed 2026-09-22 (gap G09)

Exact allowlists; any other key → `422`. Database columns are never mass-assigned.

```text
POST  /administration/teams                 {"name": string}
PATCH /administration/teams/{team}          {"name": string}
POST  /administration/teams/{team}/deactivate | reactivate    {}
POST  /administration/roles                 {"name": string}
PATCH /administration/roles/{role}          {"name": string}
PUT   /administration/roles/{role}/permissions  {"permissions": [permission name, ...]}
POST  /administration/users                 {"name", "username", "team_id", "role_ids": [role id, ...]}
PATCH /administration/users/{user}          {"name": string}
PUT   /administration/users/{user}/roles    {"role_ids": [role id, ...]}
PUT   /administration/users/{user}/team     {"team_id": active team id}
POST  /administration/users/{user}/enable | disable | reset-password   {}
```

Transport: the two actions that reveal a one-time temporary password — `POST /administration/users` and `POST /administration/users/{user}/reset-password` — are **same-origin JSON endpoints** returning exactly the §81/§85 envelopes with `Cache-Control: no-store`; the plaintext never enters the session, flash, redirect, Inertia page props, or browser history. Every other administration action is an Inertia action (§10): `303` back to the page, field errors in the error bag, domain errors (`REAUTH_REQUIRED`, `PROTECTED_RESOURCE`, …) in `flash.domain_error`. JSON variants answer `403 REAUTH_REQUIRED` / `422 VALIDATION_FAILED` with the §9 envelope.

---

# PART S — PROTECTED CORE SYSTEM SETTINGS

## 97. Settings Boundary

Current protected application-configurable setting is Technical Log automatic cleanup/retention.

This is **not** an authoritative audit retention control and MUST NOT be generalized into arbitrary security/business configuration.

Current actor eligibility:

```text
Protected Superadmin identity
+ system.settings.manage
+ valid <=15-minute current-password re-auth proof
```

A non-protected custom role MUST NOT mutate this setting merely because it somehow receives the permission; the protected identity invariant is additional and intentional for Core System Settings.

## 98. Read Technical Log Cleanup Setting

Canonical route:

```http
GET /administration/settings/technical-logs
```

Response:

```json
{
  "data": {
    "automatic_cleanup_enabled": true,
    "retention_value": 30,
    "retention_unit": "DAY"
  },
  "meta": {}
}
```

Allowed units exactly:

```text
DAY
MONTH
```

Read exposure remains protected administration; it is not a public configuration endpoint.

## 99. Update Technical Log Cleanup Setting

Canonical route:

```http
PATCH /administration/settings/technical-logs
```

Requires the eligibility in §97.

Request:

```json
{
  "automatic_cleanup_enabled": true,
  "retention_value": 30,
  "retention_unit": "DAY"
}
```

Validation:

```text
automatic_cleanup_enabled = required boolean
retention_value = required integer >= 1
retention_unit = DAY | MONTH
no fixed product maximum retention
```

The retention value/unit remain stored even when cleanup is OFF so they can be reused when re-enabled.

Success updates the typed singleton setting and writes Security Audit evidence. It MUST NOT directly delete logs synchronously inside the settings mutation request; scheduler/cleanup service applies the policy separately.

Forbidden behavior:

- no `audit_retention_days` field;
- no Business/Access/Security Audit delete/purge route;
- no `purge now authoritative audits` action;
- no arbitrary settings key/value payload;
- no ability to change password minimum/MFA/business states/attachment limits/export retention through this endpoint.

---

# PART T — INERTIA SHARED PROPS / SECURITY HTTP RULES

## 100. Authentication Props

Safe shared auth context may include user, Team display, effective permissions, must-change-password flag, and the signed-in user's own `is_protected_superadmin` marker (added 2026-09-24 so the shell links the Protected-Superadmin-only Core Setting of 07 §51 only for that identity; it is never an authorization input — the server still decides). No password hash/session payload/signing private key/Team authorization scope.

## 101. Record Action Props

Server-derived `allowed_actions` is presentation hint only; action endpoints reauthorize.

## 102. IDOR / Resource Not Found

Unauthorized resource existence SHOULD be concealed with 404 where appropriate; admin contexts may use 403 when existence is legitimately known.

## 103. CSRF

All authenticated state-changing browser routes retain Laravel CSRF. Do not globally disable.

## 104. CORS

No wildcard credentialed CORS.

## 105. Cache Controls

Sensitive authenticated JSON, one-time temporary-password responses, public verification results, and private downloads use safe no-store/private controls appropriate to content.

**One-time temporary-password response MUST be `Cache-Control: no-store` (or equivalently non-cacheable) and MUST NOT be persisted in browser/server application caches.**

## 106. Mass Assignment

Request-specific whitelist/Form Request only. No `$request->all() → Model::update()` for protected/business/security fields.

## 107. Safe Logging

Must redact/avoid passwords/current/new/temp, session cookie/payload, private signing key/passphrase, secrets, raw files/chunks, unnecessary private storage locators, and one-time temporary-password response bodies.

Technical Logs may record safe IDs/stage/duration/status/sanitized failure category. Their retention is controlled separately by the protected setting; retention length never makes secret logging acceptable.

---

# PART U — TECHNICAL STATE SEPARATION

## 108. Namespaces

Business states only:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Upload:

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

Attachment security:

```text
PENDING
CLEAN
INFECTED
FAILED
```

Export:

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

Validator:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

Settings cleanup ON/OFF is configuration state, never NSCMF business state.

---

# PART V — HTTP ROUTE INVENTORY

## 109. Authentication / Account

```text
GET  /login
POST /login
POST /logout
GET  /account/temporary-password
POST /account/temporary-password/change
POST /account/re-authenticate
```

`GET /login` renders the login page for guests. `POST /account/re-authenticate` is a same-origin JSON endpoint: success `204`, failure `403 REAUTH_FAILED`, invalid body `422 VALIDATION_FAILED`.

## 110. NSCMF / Workflow

```text
GET    /dashboard
GET    /nscmf/create
POST   /nscmf
GET    /nscmf/{record}
GET    /nscmf/{record}/edit
PATCH  /nscmf/{record}/draft
PATCH  /nscmf/{record}/change-results
POST   /nscmf/{record}/submit
POST   /nscmf/{record}/cancel
POST   /nscmf/{record}/review/forward
POST   /nscmf/{record}/review/return
POST   /nscmf/{record}/review/reject
POST   /nscmf/{record}/approval/approve
POST   /nscmf/{record}/approval/return-reviewer
POST   /nscmf/{record}/approval/return-requester
POST   /nscmf/{record}/approval/reject
POST   /nscmf/{record}/reopen
POST   /nscmf/{record}/archive
POST   /nscmf/{record}/unarchive
```

## 111. Queues / History / Timeline

```text
GET /review
GET /review/{record}
GET /approval
GET /approval/{record}
GET /history
GET /nscmf/{record}/timeline
```

## 112. Attachments

```text
POST   /nscmf/{record}/attachment-uploads
GET    /nscmf/{record}/attachment-uploads/{upload_id}
PUT    /nscmf/{record}/attachment-uploads/{upload_id}/chunks/{chunk_index}
POST   /nscmf/{record}/attachment-uploads/{upload_id}/complete
DELETE /nscmf/{record}/attachment-uploads/{upload_id}
GET    /nscmf/{record}/attachments/{attachment}
DELETE /nscmf/{record}/attachments/{attachment}
GET    /nscmf/{record}/attachments/{attachment}/download
```

## 113. Export / Public

```text
POST /nscmf/{record}/exports
GET  /nscmf/{record}/exports
GET  /nscmf/exports/{export}
GET  /nscmf/exports/{export}/download
POST /nscmf/exports/bulk
GET  /nscmf/export-batches/{batch}
GET  /nscmf/export-batches/{batch}/download

GET  /ispdfvalid
POST /ispdfvalid/verify
```

## 114. Administration

```text
GET    /administration/setup

GET    /administration/users
POST   /administration/users
PATCH  /administration/users/{user}
POST   /administration/users/{user}/enable
POST   /administration/users/{user}/disable
POST   /administration/users/{user}/reset-password
PUT    /administration/users/{user}/roles
PUT    /administration/users/{user}/team

GET    /administration/roles
POST   /administration/roles
PATCH  /administration/roles/{role}
PUT    /administration/roles/{role}/permissions
GET    /administration/permissions

GET    /administration/teams
POST   /administration/teams
PATCH  /administration/teams/{team}
POST   /administration/teams/{team}/deactivate
POST   /administration/teams/{team}/reactivate

GET    /administration/audits/access
GET    /administration/audits/security

GET    /administration/settings/technical-logs
PATCH  /administration/settings/technical-logs
```

No direct-user permission route, Unit/Division/scope route, NSCMF hard delete, authoritative audit purge route, or generic settings key/value route.

---

# PART W — CRITICAL PERMISSION MAP

## 115. Operations

NSCMF permission mapping remains per `04`.

Protected Technical Log settings require:

```text
Protected Superadmin
+ system.settings.manage
+ valid <=15-minute re-auth proof
```

Team never an extra permission scope.

---

# PART X — FAILURE / RACE EXAMPLES

## 116. Reviewer Race

First locked valid action wins; stale second action → version/state conflict; no false audit event.

## 117. Approver Race

First valid Approve → APPROVED and final actor; stale second action conflict.

## 118. Lost Chunk Response

Server accepted + stored chunk, response lost, same bytes retry → duplicate=true; different bytes → 409 conflict.

## 119. Server Restart During Upload

Acknowledged chunks remain available through persistent Laravel private storage + DB metadata while session remains unexpired. No claim that upload continues while service unavailable.

## 120. Export vs Later Edit

Snapshot bound at version N remains export content even if record later becomes N+1.

## 121. Old Genuine PDF After Reopen

Old exact issued PDF remains authentic but becomes `VALID_SUPERSEDED`, not modified.

## 122. One-Time Temporary Password Response Lost

If the acting admin loses/closes the one-time temporary-password result before conveying it, the system MUST NOT retrieve/re-display the old plaintext. Authorized admin uses the normal **Reset User Password** flow, which generates a **new** temporary password, revokes target sessions as required, invalidates the prior credential, and reveals the new plaintext once.

## 123. Technical Log Setting Changed

```text
Protected Superadmin changes 30 DAY → 3 MONTH
→ setting transaction succeeds + Security Audit
→ request does not synchronously delete logs
→ scheduler/cleanup service later applies current setting
→ Business/Access/Security Audit untouched
```

Setting OFF means scheduler cleanup Service does not age-delete Technical Logs.

---

# PART Y — CLIENT / BACKEND IMPLEMENTATION RULES

## 124. Frontend MUST

- preserve/send server record version;
- reconcile upload state from server;
- never label attachment Ready before CLEAN;
- never infer authorization from Team;
- show one-time temporary password only in immediate success context and never offer later retrieval;
- treat re-auth proof as 15-minute server truth;
- enforce/display public validator 20,000,000-byte inclusive file max but rely on server as authority;
- display Technical Log setting separately from authoritative audits;
- never expose absolute local storage path.

## 125. Backend MUST

- use session/web/CSRF;
- explicit permission + Policy/domain checks;
- no generic status setter;
- row lock workflow / optimistic editable persistence;
- Business Audit consistency;
- Access/Security Audit separation;
- resumable private persistent chunk storage;
- full-file ClamAV CLEAN;
- immutable export snapshot;
- no unsigned Approved PDF;
- public minimum disclosure;
- server-generate temporary password and one-time reveal only;
- enforce 15-minute re-auth proof;
- enforce public validator 20,000,000-byte inclusive file max;
- protect Technical Log setting and keep audit permanence independent.

---

# PART Z — TEST MATRIX

## 126. Authentication / Session

- [ ] generic login failure;
- [ ] idle30m / absolute8h / max2;
- [ ] third valid login revokes oldest;
- [ ] logout server invalidation;
- [ ] temp-password account blocked until replacement;
- [ ] no MFA/composition;
- [ ] re-auth proof expires exactly after configured 15-minute policy boundary.

## 127. Temporary Credential

- [ ] Create User accepts no admin-selected temp password;
- [ ] Reset accepts no admin-selected temp password;
- [ ] server generates plaintext once and stores hash only;
- [ ] success response is one-time/no-store;
- [ ] no retrieval endpoint;
- [ ] lost plaintext requires new reset, not recovery;
- [ ] target forced change.

## 128. Authorization / Team / Settings

- [ ] protected direct routes reauthorize;
- [ ] Team does not authorize Review/Approval;
- [ ] no scope inputs;
- [ ] protected Technical Log setting denies non-Protected-Superadmin even if request is handcrafted;
- [ ] valid permission + protected identity + unexpired re-auth required;
- [ ] settings update cannot include arbitrary keys/audit-retention fields.

## 129. Record / Workflow / Result

- [ ] incomplete Draft saves;
- [ ] version conflicts safe;
- [ ] explicit transitions only;
- [ ] reasons/sign-offs/iterations correct;
- [ ] Result endpoint narrow.

## 129.1 Form Payload Contract

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
- [ ] `header` omitted leaves `request_date`/`request_no` unchanged; `header.request_date=null` clears the Draft date;
- [ ] `header.request_no` accepted only for a never-submitted Manual record; clash → 422 `REQUEST_NO_CONFLICT`;
- [ ] family key not matching the record family → 422.

## 130. Attachments

- [ ] 5 MiB geometry / 24h inactivity;
- [ ] accepted/missing authoritative;
- [ ] idempotent replay;
- [ ] persistent progress survives ordinary process restart/redeploy;
- [ ] full assembled SHA-256 + ClamAV;
- [ ] only CLEAN download;
- [ ] storage locator not exposed/authorization.

## 131. Export / Public Validator

- [ ] XLSX/PDF only;
- [ ] immutable snapshot;
- [ ] no unsigned Approved PDF;
- [ ] 168h binary expiry;
- [ ] public no-login max20,000,000-byte inclusive PDF file size; zero-byte rejected;
- [ ] CLEAN before verification;
- [ ] exact final signed-byte hash;
- [ ] current/superseded/modified/unknown semantics;
- [ ] minimum disclosure.

## 132. Technical Logs / Audits

- [ ] setting default ON/30 DAY;
- [ ] positive DAY/MONTH accepted;
- [ ] no product max enforced;
- [ ] OFF retains configured value/unit;
- [ ] settings update itself Security Audited;
- [ ] Business/Access/Security Audit have no purge route and are unaffected by Technical Log cleanup.

---

# PART AA — NON-BLOCKING IMPLEMENTATION-TIME / FUTURE VALUES

## 133. Intentionally Unresolved Only Where Needed

The HTTP contract is approved. The following remain implementation-time/future values rather than missing API semantics:

1. ~~optional bulk export packaging~~ — **decided 2026-09-24**: batch ZIP, see §71;
2. exact operational numeric rate-limit buckets for login/upload/public-validator controls — **provisional values approved 2026-09-23**, tunable in `.env`: upload 120 requests/minute per user, upload finalize 20/minute per user, public validator 10/minute per IP (login stays 5 failures/minute per username+IP); **adopted as the MVP values 2026-09-24 (G05)** — a full record upload fits in half the upload bucket; retune from real production traffic if needed;
3. official numbering SOP beyond current provisional automatic/manual rules;
4. exact production Team master data;
5. concrete signing library/key-container/path/passphrase/rotation mechanics — **decided 2026-09-23**: `ddn/sapp`, PKCS#12 container on private disk (`NSCMF_SIGNING_P12_PATH`), passphrase only from the environment (`NSCMF_SIGNING_P12_PASSPHRASE`), rotation via `php artisan nscmf:signing:activate` (previous certificate retired, never deleted); production key custody remains an operator decision;
6. notification endpoints/providers if notification is later implemented;
7. host-specific private storage paths. Scanner/renderer timeouts were **measured and set 2026-09-24 (G15)**: scan 30 s, render 30 s per pass, finalize job 75 s, export job 80 s, `retry_after` 90 s (see `14` §48/§63); re-measure on the release server.

ClamAV placement, LibreOffice as first renderer candidate, signing trust, and the default deployment topology are already defined by `19A`/`20`; API implementation must not treat them as open architecture decisions.

No longer TBD:

```text
temporary credential direction = server-generated + one-time admin reveal
sensitive re-auth proof lifetime = 15 minutes
public validator maximum PDF file = 20,000,000 bytes inclusive (decimal 20 MB; not multipart request-body size)
canonical application timezone = Asia/Jakarta
initial production storage backend class = persistent Laravel local private storage
Technical Log cleanup policy/default = Protected-Superadmin setting, ON + 30 DAY by default
Activation/Change form payload structure = fixed by §27 / §28
repeatable collection update behavior = whole-set replacement per §7.4.1
monitoring period unit = MINUTE | HOUR | DAY | WEEK
```

Implementation MUST NOT silently turn remaining TBDs into product facts.

---

# PART AB — DEVELOPER / AI GUARDRAILS

## 134. MUST NOT

1. create generic status endpoint;
2. accept client business status/sign-offs/audit truth;
3. use Team/Unit/Division/scope as Review/Approval auth input;
4. enable Spatie Teams/wildcards/direct-user permission UI;
5. trust frontend validation/action visibility;
6. silently overwrite stale content;
7. hold workflow lock during upload/scan/render/sign;
8. trust client file hash as final authority;
9. overwrite accepted conflicting chunks;
10. equate upload COMPLETED with CLEAN;
11. expose private storage locator/absolute host path;
12. let worker read later mutable record instead of snapshot;
13. return unsigned Approved PDF;
14. expose private data through public validator;
15. accept public validator PDF >20 MB;
16. store password/temp/private-key/session secrets in response logs/audits;
17. allow retrieving a prior temporary plaintext password;
18. accept admin-entered temp password in Create/Reset current baseline;
19. create NSCMF hard-delete or audit purge endpoint;
20. let Technical Log settings affect Business/Access/Security Audit;
21. create generic arbitrary system-settings API;
22. let non-Protected-Superadmin mutate protected Core Settings;
23. treat re-auth proof as permanent or omit its 15-minute expiry;
24. expose S3/object-storage concepts through current HTTP contract as if they are required;
25. invent an alternative Activation/Change payload shape instead of §27/§28;
26. merge repeatable collections element-by-element instead of §7.4.1 whole-set replacement;
27. accept database row `id` as form input, or silently ignore unknown payload keys.

---

# PART AC — FINAL CONSISTENCY

## 135. Permission Statement

> Permission answers what the actor may attempt. Ownership where explicitly required, resource authorization, current state, archive treatment, validation, security, and concurrency determine whether it may succeed. Team does not participate.

## 136. Workflow Statement

> Client requests business actions; client never writes destination status directly.

## 137. Attachment Statement

> Resumable transport preserves accepted progress without weakening final full-file validation; only server-authoritative assembled bytes + explicit ClamAV CLEAN become usable.

## 138. Export Statement

> Export is immutable-snapshot work, not a live view at worker execution time.

## 139. Temporary Credential Statement

> Create/reset temporary credentials are server-generated, revealed once to the acting authorized administrator, never persisted in plaintext, never retrievable later, and always force target-user replacement.

## 140. Core Settings Statement

> Technical Log automatic cleanup/retention is a protected typed application setting. It controls operational Technical Logs only and cannot change authoritative audit retention.

## 141. Current Handoff

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
