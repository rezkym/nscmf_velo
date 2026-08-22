# API Contract Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-API-012  
> **Document Order:** 12 / 20  
> **Status:** Draft — Authoritative API / HTTP Contract Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`  
> **Application Style:** Laravel 13 modular monolith + Inertia 3 + Vue 3 + session authentication  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk HTTP/application contract** NSCMF Digital Form & Workflow System.

Dokumen ini mendefinisikan:

- pembagian Laravel Web/Inertia route vs structured JSON endpoint;
- authenticated session/CSRF behavior;
- resource naming dan URI contract;
- request/response DTO;
- stable error envelope dan machine-readable error code;
- pagination/filter/sort contract;
- optimistic `record_version` transport;
- explicit NSCMF workflow-action endpoints;
- form Draft/Revision/Result persistence contract;
- resumable attachment/chunk upload, recovery, assembly, scan, dan download contract;
- asynchronous export request/status/download contract;
- minimum-disclosure public PDF validation contract;
- user/role/permission/Team administration boundaries;
- password re-authentication boundary;
- Business Timeline dan privileged audit access contract;
- security, IDOR, mass-assignment, and concurrency guardrails.

Dokumen ini **tidak** mengubah product scope, business rules, permission semantics, state machine, field validation, database schema authority, security policy, atau architecture yang sudah dikunci pada `01–11` + synchronization addendum.

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
→ dedicated structured JSON endpoints where asynchronous/reconcilable state is required
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
- public PDF verification.

All internal JSON endpoints remain in the same Laravel application and MUST use the authenticated `web` session context unless explicitly public.

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
"request_date": "2026-08-22"
```

### 7.2 Timestamps

API timestamps use ISO-8601 with timezone/offset.

Example:

```json
"updated_at": "2026-08-22T18:20:00+07:00"
```

Application/database timezone itself remains environment authority in `14_Environment_Specification.md`.

### 7.3 Boolean

Use JSON boolean, never `0/1` string:

```json
true
false
```

### 7.4 Null

`null` has semantic meaning only when the corresponding field is nullable/clearable.

For PATCH-style DTO:

```text
field omitted → leave unchanged
field: null    → explicitly clear, only if business/schema rule permits
```

### 7.5 Enums

Wire enum values use canonical uppercase machine values exactly as specified in this document. Unknown enum values are rejected.

---

# PART B — RESPONSE AND ERROR CONTRACT

## 8. Standard JSON Success Envelope

Structured JSON endpoint SHOULD return:

```json
{
  "data": {},
  "meta": {}
}
```

For list endpoints:

```json
{
  "data": [],
  "meta": {
    "pagination": {}
  }
}
```

`meta` MAY be empty.

Warnings that do not block a successful action are exposed through:

```json
{
  "data": {},
  "meta": {
    "warnings": [
      {
        "code": "CHANGE_ATTACHMENT_RECOMMENDED",
        "message": "Attachment is recommended for this Change subtype.",
        "field": "attachments"
      }
    ]
  }
}
```

Warnings MUST NOT be represented as successful-looking malware/security failures.

---

## 9. Standard JSON Error Envelope — Confirmed

All structured JSON errors use:

```json
{
  "code": "NSCMF_VERSION_CONFLICT",
  "message": "A newer version of this record exists.",
  "errors": {},
  "context": {}
}
```

Meaning:

- `code` — stable machine-readable identifier;
- `message` — safe human-readable explanation;
- `errors` — field validation map when applicable;
- `context` — safe supplemental context only.

MUST NOT include stack traces, SQL, filesystem paths, object-storage keys, private signing key information, raw ClamAV internals, session payload, password, or secret token.

### 9.1 Validation example

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Some fields need to be corrected.",
  "errors": {
    "change.service_impacts": [
      "Select at least one Service Impact."
    ],
    "change.rollback_scenario": [
      "Rollback Scenario is required."
    ]
  },
  "context": {}
}
```

### 9.2 Version conflict example

```json
{
  "code": "NSCMF_VERSION_CONFLICT",
  "message": "A newer version of this record exists. Refresh the record before saving again.",
  "errors": {},
  "context": {
    "latest_record_version": 14,
    "current_business_status": "PENDING_REVIEW"
  }
}
```

Context is returned only after authorization confirms the actor may know the record.

---

## 10. Inertia Error Mapping

Inertia routes do not need to wrap every response inside JSON envelopes.

Contract:

- field errors → normal Inertia/Laravel validation error bag;
- domain/action error → shared/flash `domain_error` structure using the same `code`, safe `message`, and safe `context` semantics;
- successful POST/PATCH workflow form → `303 See Other` redirect to canonical latest page;
- latest server state MUST be rendered after redirect.

Conceptual shared prop:

```json
{
  "flash": {
    "domain_error": {
      "code": "NSCMF_STATE_CONFLICT",
      "message": "This record has already moved to another workflow state.",
      "context": {
        "current_business_status": "APPROVED",
        "record_version": 19
      }
    }
  }
}
```

Frontend copy MAY be localized/refined, but stable machine code meaning MUST remain.

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
| `401 Unauthorized` | authenticated session absent/expired/revoked |
| `403 Forbidden` | actor authenticated but action/resource permission denied |
| `404 Not Found` | resource unavailable to actor or genuinely absent; avoid IDOR disclosure |
| `409 Conflict` | version/state/idempotency/resource-state conflict |
| `410 Gone` | previously valid temporary resource expired, e.g. upload session/export artifact |
| `422 Unprocessable Entity` | validation failure |
| `429 Too Many Requests` | throttle/rate/resource-abuse control |
| `500 Internal Server Error` | safe generic unexpected failure |
| `503 Service Unavailable` | required subsystem unavailable where fail-closed behavior applies |

Do not return `200` for a failed domain mutation.

---

## 12. Core Error Code Catalog

Stable baseline codes:

### Authentication / session

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

### Authorization / resource

```text
FORBIDDEN
RESOURCE_NOT_FOUND
PROTECTED_RESOURCE
```

### Validation / record

```text
VALIDATION_FAILED
REQUEST_NO_CONFLICT
NSCMF_VERSION_CONFLICT
NSCMF_STATE_CONFLICT
NSCMF_ARCHIVED_CONFLICT
NSCMF_ACTION_NOT_ALLOWED
```

### Attachment / upload

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

### Export / signing

```text
EXPORT_NOT_READY
EXPORT_FAILED
EXPORT_EXPIRED
EXPORT_NOT_FOUND
SIGNING_NOT_READY
```

### Public verification

The public validator normally communicates document semantic outcome in successful `data.outcome`; transport/security failures still use normal error codes such as:

```text
VALIDATOR_FILE_INVALID
VALIDATOR_SCAN_FAILED
RATE_LIMITED
```

Implementation MAY add narrowly-scoped codes, but MUST NOT rename an established code casually because frontend/tests may depend on it.

---

# PART C — PAGINATION, FILTERING, SORTING

## 13. Pagination — Confirmed

Page-number pagination:

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

Invalid pagination values return `422 VALIDATION_FAILED`; implementation SHOULD NOT silently convert an arbitrarily large `per_page` into 100 because that hides client bugs.

Standard metadata:

```json
{
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total": 87,
    "last_page": 4
  }
}
```

---

## 14. Sorting

Use explicit fields:

```text
sort=<whitelisted_field>
direction=asc|desc
```

Unknown/non-whitelisted sort fields return validation error. Raw SQL expressions from query parameters are forbidden.

Default sort SHOULD be deterministic and include a stable tie-breaker internally.

---

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

`team_id` is an informational/business filter only. It MUST NOT become authorization scope.

`q` may search indexed/approved retrieval fields such as Request No and permitted human-readable identifiers according to implementation query design; it MUST NOT bypass resource authorization.

---

## 16. Common Sort Whitelist

Record/history/queue lists MAY expose:

```text
request_no
request_date
created_at
updated_at
business_status
family
subtype
```

Queue endpoints MAY expose only the subset useful to that queue.

---

# PART D — AUTHORIZATION CONTRACT

## 17. Server Is Always Authoritative

Every protected request evaluates as applicable:

```text
valid session
+ protected invariant
+ required permission
+ ownership only where explicitly required
+ resource authorization
+ archive treatment
+ current business state
+ validation
+ security precondition
+ concurrency/current-state check
```

**Team is intentionally absent from authorization.**

IDs, URLs, UI buttons, local permissions, storage keys, or prior successful access NEVER grant current authorization by themselves.

---

## 18. Permission-Centric Runtime

API MUST use explicit permissions from `04`, including:

```text
nscmf.create
nscmf.draft.edit
nscmf.submit
nscmf.cancel
nscmf.change.result.edit
nscmf.view
nscmf.view.history
nscmf.attachment.manage
nscmf.export
nscmf.export.bulk
nscmf.timeline.view
nscmf.review
nscmf.review.forward
nscmf.review.return
nscmf.review.reject
nscmf.approve
nscmf.approval.return_reviewer
nscmf.approval.return_requester
nscmf.approval.reject
nscmf.reopen
nscmf.archive
```

Administration uses the explicit `users.*`, `roles.*`, `permissions.assign`, `teams.*`, audit, and `system.settings.manage` permissions already defined in `04`.

API MUST NOT authorize normal actions by hard-coded role names when a permission exists.

---

## 19. Forbidden Authorization Inputs

Client MUST NOT send or influence:

```text
reviewer_scope
approval_scope
unit_id
division_id
permission_team_id
spatie_team_id
```

No such runtime authorization concept exists.

Team IDs in business/admin DTO are organizational data only.

---

## 20. Server-Managed Fields — Never Generic Client-Mutable

Generic record/form update MUST reject or ignore through strict whitelist any attempt to set:

```text
business_status
owner_user_id
team_id
requested_by_user_id
first_submitted_at
current_workflow_iteration_id
reviewed_by_user_id
reviewed_at
approved_by_user_id
approved_at
closed_status
superseded_at
is_archived
archived_at
archived_by_user_id
archive_reason
record_version as new value
audit actor/timestamp
attachment sha256
attachment security_status
attachment storage keys
export snapshot fields
export status
PDF issuance fields
signing certificate/private-key fields
protected Superadmin flags
```

`record_version` may be sent only as the **expected current version precondition**, not as a client-selected next version.

---

# PART E — CONCURRENCY AND MUTATION SEMANTICS

## 21. `record_version` — Confirmed Transport

Current MVP uses request-body transport, not `If-Match`:

```json
{
  "record_version": 12
}
```

### 21.1 Draft / Revision / Result

`record_version` is mandatory for:

- Draft autosave/manual save JSON mutation;
- Revision save;
- Change Result-only update.

Server performs optimistic update. Version mismatch:

```text
409 NSCMF_VERSION_CONFLICT
no data overwrite
no false successful Business Audit event
```

Successful mutation increments parent `record_version` atomically and returns the new value.

### 21.2 Workflow / lifecycle action

Workflow/lifecycle actions use a DB row lock/current-state revalidation as authoritative concurrency mechanism.

The HTTP action request MUST also send the browser's current `record_version` as a stale-UI precondition. This does **not** replace row locking.

Server under lock rechecks:

- current record version;
- current state;
- archive flag;
- permission/resource/ownership where applicable;
- action validation;
- security preconditions.

Mismatch returns conflict rather than silently applying an action against a newer record the actor has not seen.

### 21.3 Mutation return

Successful NSCMF mutation returns/redirects with the new authoritative `record_version`.

---

## 22. No Universal Idempotency Key

Current MVP does not require a generic `Idempotency-Key` header for all endpoints.

Idempotency is domain-specific:

- chunk retry → upload-session + chunk-index + server-computed content hash;
- workflow race → locked state/version revalidation;
- request numbering → DB sequence/unique constraint;
- export retry → create a new immutable export request/snapshot rather than mutate an old failed/expired request.

A future universal idempotency-key feature requires explicit specification change.

---

# PART F — COMMON RECORD DTO

## 23. Record Summary DTO

Canonical summary shape:

```json
{
  "id": 572,
  "request_no": "NSCMF-202608-00042",
  "family": "CHANGE",
  "subtype": "MAINTENANCE",
  "request_date": "2026-08-22",
  "business_status": "PENDING_REVIEW",
  "record_version": 8,
  "is_archived": false,
  "owner": {
    "id": 19,
    "name": "Example User"
  },
  "team": {
    "id": 3,
    "name": "Team NOC"
  },
  "created_at": "2026-08-22T09:00:00+07:00",
  "updated_at": "2026-08-22T10:15:00+07:00"
}
```

Team is display/business metadata only.

---

## 24. Record Detail DTO

Record detail extends summary with:

```json
{
  "requested_by": {
    "id": 19,
    "name": "Example User",
    "at": "2026-08-22T09:30:00+07:00"
  },
  "reviewed_by": {
    "id": 31,
    "name": "Example Reviewer",
    "at": "2026-08-22T10:30:00+07:00"
  },
  "approved_by": null,
  "workflow_iteration": {
    "id": 21,
    "iteration_no": 1,
    "started_via": "FIRST_SUBMIT"
  },
  "allowed_actions": [
    "VIEW",
    "REVIEW_FORWARD",
    "REVIEW_RETURN",
    "REVIEW_REJECT"
  ]
}
```

`allowed_actions` is a **derived UI hint**, calculated server-side from current user + current state. It is not a client-side authorization token. Every action endpoint rechecks authorization.

For `DRAFT` before first Submit, sign-off and workflow iteration values may be null.

---

# PART G — CREATE / FORM PERSISTENCE

## 25. Create NSCMF

### Route

```http
POST /nscmf
```

Mode: Inertia/Web mutation.

Permission:

```text
nscmf.create
```

Additional rules:

- authenticated active user;
- user has a valid active Team;
- Team captured from current user at creation;
- Team is not supplied as record authorization input;
- family/subtype combination valid;
- numbering mode valid.

### Request

```json
{
  "family": "CHANGE",
  "subtype": "MAINTENANCE",
  "numbering_mode": "AUTOMATIC",
  "request_no": null
}
```

Enums:

```text
family:
ACTIVATION
CHANGE

ACTIVATION subtype:
ACTIVATION
UPGRADE_DOWNGRADE
DEACTIVATION

CHANGE subtype:
MAINTENANCE
UPGRADE
EMERGENCY

numbering_mode:
AUTOMATIC
MANUAL
```

Rules:

- `AUTOMATIC` → client MUST NOT choose the generated Request No;
- `MANUAL` → `request_no` required and validated using `06`;
- automatic number is allocated server-side once;
- sequence gaps are valid;
- family is immutable through normal edit;
- normal Draft PATCH does not expose `numbering_mode` mutation.

### Success

```text
303 See Other
Location: /nscmf/{record}/edit
```

The canonical edit page contains the created summary and `record_version`.

---

## 26. Draft / Revision JSON Save

### Route

```http
PATCH /nscmf/{record}/draft
```

Mode: JSON.

Permission / context:

```text
nscmf.draft.edit
+ owns record
+ business_status in {DRAFT, REVISION_REQUIRED}
+ not blocked by lifecycle/security rule
```

### Request semantics

```json
{
  "record_version": 4,
  "request_no": "MANUAL-001",
  "request_date": "2026-08-22",
  "activation": {},
  "change": {}
}
```

Only the object matching the immutable record `family` may be supplied.

PATCH rules:

```text
scalar key omitted → unchanged
scalar null         → clear only if nullable/allowed
repeatable-section key omitted → unchanged
repeatable-section key present → authoritative replacement of that section inside this mutation
```

This nested transport DTO does **not** authorize JSON persistence of live form data in the database. Server maps it into typed relational tables from `11`.

### Success

```json
{
  "data": {
    "id": 572,
    "record_version": 5,
    "business_status": "DRAFT",
    "saved_at": "2026-08-22T18:20:00+07:00"
  },
  "meta": {
    "warnings": []
  }
}
```

### Conflict

`409 NSCMF_VERSION_CONFLICT`.

---

# PART H — ACTIVATION FORM DTO

## 27. Activation DTO

Only for `family=ACTIVATION`.

Example full transport shape:

```json
{
  "activation": {
    "customer_name": "Customer A",
    "contact_name": "Jane Doe",
    "installation_rfs_date": "2026-08-30",
    "lan_ip_allocation": "10.0.0.0/24",
    "wan_ip": "192.0.2.10/30",
    "gateway": "192.0.2.9",
    "pop": "POP-A",
    "regional": "Jakarta",
    "preferred_upstream": "Upstream A",
    "secondary_upstream": null,
    "primary_noc_link": "Primary",
    "secondary_noc_link": null,
    "downlink_router": "RTR-01",
    "bandwidth_international_mbps": 100,
    "bandwidth_domestic_iix_mbps": 200,
    "bandwidth_mixed_mbps": null,
    "domain_name_1": "example.com",
    "domain_name_2": null,
    "primary_dns": "1.1.1.1",
    "secondary_dns": "8.8.8.8",
    "mx_primary": "10 mail.example.com",
    "mx_secondary": null,
    "hosting_platform": null,
    "hosting_capacity_gb": null,
    "migrate_domain": false,
    "migrate_hosting": false,
    "references": [
      {
        "reference_type": "IWO",
        "specification": null
      }
    ],
    "service_blocks": [
      {
        "service_context": "NEW",
        "service_id": "SVC-001",
        "service_status": "ACTIVATED",
        "service_description": "Internet service",
        "service_location": "Site A"
      }
    ],
    "sla_items": [
      {
        "row_no": 1,
        "requirement_text": "Requirement A"
      }
    ],
    "virtual_connections": [
      {
        "row_no": 1,
        "bandwidth_mbps": 50
      }
    ],
    "priority_destinations": [
      {
        "row_no": 1,
        "destination": "Destination A"
      }
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

Canonical enums:

```text
reference_type:
IWO | VELOSHIP | TICKET | OTHER

service_context:
EXISTING | NEW

service_status:
ACTIVATED | DEACTIVATED
```

Repeated arrays use explicit `row_no` where the source structure has numbered capacity. Unknown row numbers are rejected.

Requiredness is action-specific from `06`; Draft may remain incomplete.

---

# PART I — CHANGE FORM DTO

## 28. Change DTO

Only for `family=CHANGE`.

Example full transport shape:

```json
{
  "change": {
    "maintenance_purpose": "Routine maintenance",
    "target_execution_date": "2026-08-30",
    "monitoring_period_value": 2,
    "monitoring_period_unit": "HOUR",
    "rollback_scenario": "Restore the previous configuration if KPI degrades.",
    "announcement_timing": "ONE_WEEK_BEFORE",
    "facing_challenges": [
      {
        "row_no": 1,
        "challenge_text": "Challenge A"
      }
    ],
    "identified_problems": [
      {
        "row_no": 1,
        "problem_text": "Problem A"
      }
    ],
    "service_impacts": [
      {
        "impact_code": "NOC15",
        "other_description": null
      },
      {
        "impact_code": "CUSTOMER",
        "other_description": null
      }
    ],
    "improvement_items": [
      {
        "row_no": 1,
        "plan_text": "Improve route stability",
        "target_kpi": "No packet loss increase"
      }
    ],
    "results": [
      {
        "row_no": 1,
        "result_summary": null,
        "performance_information": null,
        "result_status": null
      }
    ]
  }
}
```

Canonical machine values:

```text
monitoring_period_unit:
MINUTE | HOUR | DAY | WEEK

announcement_timing:
ONE_WEEK_BEFORE
TWO_WEEKS_BEFORE
TWO_DAYS_BEFORE_EMERGENCY

impact_code:
NOC15
NOC23
NOC361
REGIONAL
POP
CUSTOMER
OTHER
```

`service_impacts` is a multi-select set. When the key is present, server synchronizes the set exactly to the supplied valid values. Duplicate impact codes are rejected or normalized before persistence; server MUST never persist duplicate `(record, impact_code)` rows.

`OTHER` requires `other_description` at applicable workflow validation stage.

Result rows use `row_no` 1..5.

---

## 29. Narrow Change Result Update

### Route

```http
PATCH /nscmf/{record}/change-results
```

Mode: JSON.

Eligibility exactly:

```text
family = CHANGE
business_status = PENDING_REVIEW
actor owns record
actor has nscmf.change.result.edit
```

### Request

```json
{
  "record_version": 8,
  "results": [
    {
      "row_no": 1,
      "result_summary": "Change applied successfully.",
      "performance_information": "Latency stable at baseline.",
      "result_status": "SUCCESS"
    }
  ]
}
```

This endpoint MUST reject any planning/general form field. It MUST NOT accept attachments, Service Impact, Purpose, Plan/KPI, Target Date, Rollback, subtype, Request No, or status.

Successful mutation:

- replaces/synchronizes the Result row set supplied by this Result-specific action;
- writes Business Audit field changes;
- increments parent `record_version`;
- returns the new version.

---

# PART J — SUBMIT / WORKFLOW ACTION CONTRACT

## 30. Submit / Resubmit

### Route

```http
POST /nscmf/{record}/submit
```

Mode: Inertia/Web action.

Permission:

```text
nscmf.submit
```

State:

```text
DRAFT             → PENDING_REVIEW
REVISION_REQUIRED → PENDING_REVIEW
```

Ownership required.

### Request

```json
{
  "record_version": 5
}
```

Server runs `FIRST_SUBMIT` or `RESUBMIT` validation profile according to current persisted state.

Client MUST NOT send destination status.

First successful Submit additionally establishes:

- workflow iteration 1;
- first `Requested By` actor/timestamp.

Resubmit remains in the same workflow iteration.

---

## 31. Cancel Draft

### Route

```http
POST /nscmf/{record}/cancel
```

Request:

```json
{
  "record_version": 3,
  "reason": "Optional cancellation note"
}
```

Eligibility:

```text
nscmf.cancel
+ owns record
+ DRAFT
+ never successfully submitted
```

Destination always `CANCELLED`.

Client MUST NOT specify destination.

`CANCELLED` cannot be Reopened.

---

## 32. Reviewer Forward

### Route

```http
POST /nscmf/{record}/review/forward
```

Request:

```json
{
  "record_version": 9,
  "comment": "Optional review comment"
}
```

Eligibility:

```text
nscmf.review.forward
+ PENDING_REVIEW
+ REVIEW_FORWARD validation
+ current archive/security/concurrency rules
```

For Change, minimum one complete Result row is required and all started Result rows must be complete.

Destination always `PENDING_APPROVAL`.

Successful actor becomes current iteration's effective `Reviewed By`.

---

## 33. Reviewer Return

### Route

```http
POST /nscmf/{record}/review/return
```

Request:

```json
{
  "record_version": 9,
  "reason": "Please correct the service information."
}
```

Eligibility:

```text
nscmf.review.return
+ PENDING_REVIEW
+ mandatory reason
```

Destination always `REVISION_REQUIRED`.

---

## 34. Reviewer Reject

### Route

```http
POST /nscmf/{record}/review/reject
```

Request:

```json
{
  "record_version": 9,
  "reason": "The request does not meet the required business condition."
}
```

Eligibility:

```text
nscmf.review.reject
+ PENDING_REVIEW
+ mandatory reason
```

Destination always `REJECTED`.

---

## 35. Approver Approve

### Route

```http
POST /nscmf/{record}/approval/approve
```

Request:

```json
{
  "record_version": 10,
  "comment": "Optional approval comment"
}
```

Eligibility:

```text
nscmf.approve
+ PENDING_APPROVAL
+ current effective Review prerequisite
+ applicable business/security/current-state checks
```

Destination always `APPROVED`.

One successful valid Approve is final for that iteration. The successful actor is `Approved By`.

No client may supply `approved_by`.

---

## 36. Approver Return to Reviewer

### Route

```http
POST /nscmf/{record}/approval/return-reviewer
```

Request:

```json
{
  "record_version": 10,
  "reason": "Please perform another review after checking the result."
}
```

Destination always `PENDING_REVIEW`.

Successful action MUST clear the current iteration's effective `Reviewed By/At` because a fresh successful Forward is required. Historical Forward remains in Business Audit.

---

## 37. Approver Return to Requester

### Route

```http
POST /nscmf/{record}/approval/return-requester
```

Request:

```json
{
  "record_version": 10,
  "reason": "Please revise the requested configuration."
}
```

Destination always `REVISION_REQUIRED`.

After Requester Resubmit, flow returns through Review. No direct Resubmit-to-Approval path exists.

Current effective `Reviewed By/At` is cleared.

---

## 38. Approver Reject

### Route

```http
POST /nscmf/{record}/approval/reject
```

Request:

```json
{
  "record_version": 10,
  "reason": "The request cannot be approved in its current form."
}
```

Destination always `REJECTED`.

---

## 39. Workflow Reason / Comment Rules

Mandatory reason actions:

```text
Reviewer Return
Reviewer Reject
Approver Return Reviewer
Approver Return Requester
Approver Reject
Reopen/Revert
Archive
Unarchive
```

Mandatory reason:

```text
trimmed
minimum 5 meaningful characters
maximum 2000 characters
whitespace-only invalid
```

Optional comment:

```text
Reviewer Forward
Approver Approve
```

Maximum 2000 characters when provided.

Cancel reason is optional.

---

# PART K — REOPEN / ARCHIVE

## 40. Reopen / Revert

### Route

```http
POST /nscmf/{record}/reopen
```

Request:

```json
{
  "record_version": 15,
  "destination": "REVISION_REQUIRED",
  "reason": "A new revision cycle is required."
}
```

Allowed destination exactly:

```text
REVISION_REQUIRED
PENDING_REVIEW
```

Eligibility:

```text
nscmf.reopen
+ authorized record access
+ business_status in {REJECTED, APPROVED}
+ is_archived = false
+ mandatory reason
```

Success creates the next workflow iteration.

Forbidden:

- Reopen `CANCELLED`;
- destination `DRAFT`;
- destination `PENDING_APPROVAL`;
- Reopen archived record;
- generic client status mutation.

---

## 41. Archive

### Route

```http
POST /nscmf/{record}/archive
```

Request:

```json
{
  "record_version": 16,
  "reason": "Administrative archive after completion."
}
```

Eligibility:

```text
nscmf.archive
+ authorized record access
+ business_status in {APPROVED, REJECTED, CANCELLED}
+ is_archived = false
+ mandatory reason
```

Archive MUST NOT change `business_status`.

---

## 42. Unarchive

### Route

```http
POST /nscmf/{record}/unarchive
```

Request:

```json
{
  "record_version": 17,
  "reason": "Record is needed again in the active history view."
}
```

Eligibility:

```text
nscmf.archive
+ authorized record access
+ is_archived = true
+ mandatory reason
```

Business status remains unchanged.

---

# PART L — WORKFLOW ROUTE MATRIX

## 43. Explicit Transition Matrix

| Route | Required permission | Required state | Destination |
|---|---|---|---|
| `POST /nscmf/{id}/submit` | `nscmf.submit` | `DRAFT` | `PENDING_REVIEW` |
| `POST /nscmf/{id}/submit` | `nscmf.submit` | `REVISION_REQUIRED` | `PENDING_REVIEW` |
| `POST /nscmf/{id}/cancel` | `nscmf.cancel` | `DRAFT` never submitted | `CANCELLED` |
| `POST /nscmf/{id}/review/forward` | `nscmf.review.forward` | `PENDING_REVIEW` | `PENDING_APPROVAL` |
| `POST /nscmf/{id}/review/return` | `nscmf.review.return` | `PENDING_REVIEW` | `REVISION_REQUIRED` |
| `POST /nscmf/{id}/review/reject` | `nscmf.review.reject` | `PENDING_REVIEW` | `REJECTED` |
| `POST /nscmf/{id}/approval/approve` | `nscmf.approve` | `PENDING_APPROVAL` | `APPROVED` |
| `POST /nscmf/{id}/approval/return-reviewer` | `nscmf.approval.return_reviewer` | `PENDING_APPROVAL` | `PENDING_REVIEW` |
| `POST /nscmf/{id}/approval/return-requester` | `nscmf.approval.return_requester` | `PENDING_APPROVAL` | `REVISION_REQUIRED` |
| `POST /nscmf/{id}/approval/reject` | `nscmf.approval.reject` | `PENDING_APPROVAL` | `REJECTED` |
| `POST /nscmf/{id}/reopen` | `nscmf.reopen` | `APPROVED`/`REJECTED` | payload-controlled allowed destination |
| `POST /nscmf/{id}/archive` | `nscmf.archive` | eligible terminal | status unchanged |
| `POST /nscmf/{id}/unarchive` | `nscmf.archive` | archived | status unchanged |

There MUST NOT be an endpoint such as:

```text
PATCH /nscmf/{id}/status
POST /nscmf/{id}/set-status
PUT /nscmf/{id} { "business_status": "APPROVED" }
```

---

# PART M — RECORD PAGE / QUEUE / HISTORY READ CONTRACT

## 44. Canonical Page Routes

```http
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

These are Inertia page routes.

`/nscmf/{record}/edit` only renders editable UI when current actor/state allows it. Direct URL never bypasses server authorization.

---

## 45. Review Queue

`GET /review`

Eligibility to access queue requires applicable Review capability. Candidate set is permission/state/resource driven, not Team-scoped.

State is fixed to:

```text
PENDING_REVIEW
```

Supported query concepts:

```text
page
per_page
q
family
subtype
request_date_from
request_date_to
team_id       # display/business filter only
sort
direction
```

Opening a candidate does not assign it.

---

## 46. Approval Queue

`GET /approval`

State fixed to:

```text
PENDING_APPROVAL
```

No Team/Approval Scope filter is applied as an authorization rule.

Multiple eligible Approvers may view the same candidate. First valid locked workflow action wins.

---

## 47. History

`GET /history`

Uses:

```text
nscmf.view.history
+ resource visibility rules
```

Supported filtering includes common record filters from Part C.

Archived is a separate filter/flag, never a fake `ARCHIVED` business status.

---

# PART N — BUSINESS TIMELINE / AUDIT READ

## 48. Business Timeline

### Route

```http
GET /nscmf/{record}/timeline
```

Mode: Inertia page fragment or JSON projection as needed by UI; same semantic DTO.

Permission:

```text
nscmf.timeline.view
+ authorized record access
```

Timeline item MAY expose:

```json
{
  "event_type": "REVIEW_FORWARDED",
  "actor": {
    "id": 31,
    "name": "Example Reviewer"
  },
  "workflow_iteration_no": 1,
  "from_status": "PENDING_REVIEW",
  "to_status": "PENDING_APPROVAL",
  "reason": null,
  "comment": "Reviewed.",
  "occurred_at": "2026-08-22T10:30:00+07:00",
  "changes": []
}
```

Routine View/download/export-access evidence MUST NOT be mixed into Business Timeline.

---

## 49. Privileged Access Audit

Canonical administration route:

```http
GET /administration/audits/access
```

Requires:

```text
Protected Superadmin default
or audit.access.view
+ applicable resource/admin authorization
```

Read-only. No edit/delete/purge route exists.

---

## 50. Privileged Security Audit

```http
GET /administration/audits/security
```

Requires:

```text
Protected Superadmin default
or audit.security.view
+ applicable security/admin authorization
```

Read-only. Secret credential/key material MUST NOT appear in the DTO.

---

# PART O — RESUMABLE ATTACHMENT UPLOAD

## 51. Attachment State Eligibility

Normal attachment mutation is allowed only in the editable contexts already locked by `06`:

```text
DRAFT
REVISION_REQUIRED
```

with:

```text
nscmf.attachment.manage
+ ownership/resource authorization as applicable
```

`PENDING_REVIEW` Result-only permission does **not** grant attachment mutation.

Attachment remains optional.

Final constraints:

```text
max active attachments per record = 10
max final file size = 20 MB
zero byte = rejected
allowed extensions = .pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```

---

## 52. Initiate or Resume Upload

### Route

```http
POST /nscmf/{record}/attachment-uploads
```

Mode: JSON.

### Request

```json
{
  "original_filename": "network-diagram.pdf",
  "expected_size_bytes": 18874368,
  "client_declared_mime": "application/pdf",
  "client_fingerprint_sha256": "9c87...ab12"
}
```

`client_fingerprint_sha256`:

- SHOULD be supplied when browser can calculate it;
- exactly 64 lowercase/normalized hex characters when supplied;
- resume hint only;
- never final authoritative hash.

Server validates:

- actor/session;
- parent record authorization/state;
- file name/extension;
- expected size nonzero and <=20MB;
- attachment count/race protection at finalization;
- eligible unfinished upload session match.

### Resume matching

Server MAY reuse an existing eligible unfinished session only when safe matching confirms at least:

```text
same parent record
same initiating/authorized user context
same normalized filename intent
same expected size
same client fingerprint when available
session not expired/cancelled/failed/completed incompatibly
```

Server remains authority. Client never chooses a session merely by knowing `public_id`.

### Response — new session

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "resumed": false,
    "upload_status": "UPLOADING",
    "chunk_size_bytes": 5242880,
    "expected_size_bytes": 18874368,
    "expected_chunk_count": 4,
    "accepted_chunks": [],
    "missing_chunks": [1, 2, 3, 4],
    "last_activity_at": "2026-08-22T18:20:00+07:00",
    "expires_at": "2026-08-23T18:20:00+07:00"
  },
  "meta": {}
}
```

### Response — resumed session

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "resumed": true,
    "upload_status": "UPLOADING",
    "chunk_size_bytes": 5242880,
    "expected_chunk_count": 4,
    "accepted_chunks": [1, 2, 3],
    "missing_chunks": [4],
    "expires_at": "2026-08-23T17:55:00+07:00"
  },
  "meta": {}
}
```

UI intent: `Upload sebelumnya ditemukan, melanjutkan dari bagian terakhir.`

---

## 53. Inspect Upload Session

### Route

```http
GET /nscmf/{record}/attachment-uploads/{upload_id}
```

Mode: JSON.

Server rechecks parent record + actor authorization.

Response includes only safe transport state:

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "upload_status": "UPLOADING",
    "chunk_size_bytes": 5242880,
    "expected_size_bytes": 18874368,
    "expected_chunk_count": 4,
    "accepted_chunks": [1, 2, 3],
    "missing_chunks": [4],
    "last_activity_at": "2026-08-22T17:55:00+07:00",
    "expires_at": "2026-08-23T17:55:00+07:00",
    "attachment": null
  },
  "meta": {}
}
```

Storage/object keys are never returned.

---

## 54. Chunk Indexing

Wire contract uses **1-based chunk indexes**:

```text
1 .. expected_chunk_count
```

Default chunk size:

```text
5 MiB = 5,242,880 bytes
```

Rules:

- every non-final chunk MUST have exactly 5 MiB;
- final chunk MUST equal the remaining declared byte count;
- no chunk may exceed configured geometry;
- sum of assembled accepted bytes MUST equal `expected_size_bytes` before completion.

---

## 55. Upload Chunk

### Route

```http
PUT /nscmf/{record}/attachment-uploads/{upload_id}/chunks/{chunk_index}
```

Request body = raw binary bytes.

```http
Content-Type: application/octet-stream
```

Server sequence:

```text
authorize
→ validate session/state/index/geometry
→ stream to private temporary storage
→ compute server-side chunk SHA-256
→ persist accepted chunk metadata only after storage write succeeds
→ acknowledge
```

### New chunk success

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "chunk_index": 4,
    "accepted": true,
    "duplicate": false,
    "accepted_chunks": [1, 2, 3, 4],
    "missing_chunks": [],
    "expires_at": "2026-08-23T18:30:00+07:00"
  },
  "meta": {}
}
```

A newly accepted chunk refreshes the 24-hour `last_activity_at`/expiry anchor.

### Idempotent identical replay

If response to an earlier successful write was lost and the client retries the same index with byte-identical content:

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "chunk_index": 4,
    "accepted": true,
    "duplicate": true,
    "accepted_chunks": [1, 2, 3, 4],
    "missing_chunks": []
  },
  "meta": {}
}
```

Server compares server-computed hash/size with accepted chunk metadata.

A pure identical replay SHOULD NOT indefinitely extend the upload-session lifetime; only actual newly accepted progress refreshes the inactivity anchor.

### Conflicting replay

Same accepted index with different bytes:

```text
409 UPLOAD_CHUNK_CONFLICT
```

Server MUST NOT silently overwrite the already accepted chunk.

---

## 56. Complete Upload

### Route

```http
POST /nscmf/{record}/attachment-uploads/{upload_id}/complete
```

Mode: JSON.

Client completion claim is not trust.

Server independently verifies:

- all chunk indexes present;
- expected byte sum;
- session still eligible;
- parent record still allows attachment finalization;
- active attachment count still below 10;
- no conflicting chunk state.

### Incomplete response

```text
409 UPLOAD_INCOMPLETE
```

Safe context MAY include:

```json
{
  "missing_chunks": [4]
}
```

### Accepted asynchronous finalization

```http
202 Accepted
```

```json
{
  "data": {
    "upload_id": "01J...ULID",
    "upload_status": "ASSEMBLING",
    "attachment": null
  },
  "meta": {}
}
```

Finalization pipeline:

```text
verify complete set
→ assemble full file privately
→ compute server-authoritative final SHA-256
→ validate final file/type consistency
→ create/finalize attachment security metadata
→ full assembled-file ClamAV scan
→ explicit CLEAN only
→ promote to final private storage
```

No per-chunk scan result can replace the full assembled-file scan.

---

## 57. Upload Lifecycle

Upload transport values exactly:

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

These are NOT NSCMF business statuses.

When final transport becomes `COMPLETED`, an attachment may still have:

```text
security_status = PENDING
```

until whole-file scan completes.

---

## 58. Attachment Security Lifecycle

Security values:

```text
PENDING
CLEAN
INFECTED
FAILED
```

Meaning:

- `PENDING` — not usable/downloadable;
- `CLEAN` — usable subject to normal record authorization;
- `INFECTED` — fail closed, not usable;
- `FAILED` — scan/storage/security uncertainty, fail closed.

No response may label `PENDING`, `INFECTED`, or `FAILED` as Ready.

---

## 59. Poll Final Attachment Status

Canonical route:

```http
GET /nscmf/{record}/attachments/{attachment}
```

Response:

```json
{
  "data": {
    "id": 88,
    "original_filename": "network-diagram.pdf",
    "extension": "pdf",
    "detected_mime_type": "application/pdf",
    "size_bytes": 18874368,
    "security_status": "PENDING",
    "scanned_at": null,
    "is_downloadable": false,
    "removed_at": null,
    "created_at": "2026-08-22T18:32:00+07:00"
  },
  "meta": {}
}
```

`sha256`, scanner internals, quarantine key, and private object key are not required in normal end-user DTO.

After CLEAN:

```text
security_status = CLEAN
is_downloadable = true
```

subject to current record authorization.

---

## 60. Cancel Unfinished Upload

### Route

```http
DELETE /nscmf/{record}/attachment-uploads/{upload_id}
```

Allowed for an authorized unfinished session before incompatible finalization state.

Success:

```text
204 No Content
```

Server marks/cancels the session according to lifecycle and schedules/executes temporary object cleanup.

Knowing `upload_id` never grants permission.

---

## 61. Incomplete Upload Retention

Confirmed:

```text
24 hours since last successful newly accepted upload activity
```

Expired session:

```text
410 UPLOAD_SESSION_EXPIRED
```

Scheduler removes eligible temporary chunks/assembly objects and transport metadata according to `11A`/schema implementation.

Expiry MUST NOT:

- modify NSCMF business status;
- create a final attachment;
- delete authoritative Business/Access/Security Audit.

---

## 62. Remove Final Attachment

### Route

```http
DELETE /nscmf/{record}/attachments/{attachment}
```

Eligibility follows current attachment-edit rules and `nscmf.attachment.manage`.

This is a **logical business removal**, not historical metadata erasure.

Successful removal:

- sets removal metadata;
- writes required Business Audit `ATTACHMENT_REMOVED` evidence;
- final binary cleanup follows approved attachment lifecycle;
- attachment metadata/audit history remains as specified by `11`.

Result-only Change permission alone cannot call this endpoint.

---

## 63. Download Attachment

### Route

```http
GET /nscmf/{record}/attachments/{attachment}/download
```

Requirements:

```text
authorized parent-record access
+ attachment belongs to record
+ removed_at is null
+ security_status = CLEAN
+ private binary available
```

Non-CLEAN:

```text
409 ATTACHMENT_NOT_CLEAN
```

Download MAY/SHOULD create configured Access Audit evidence.

Storage key never grants access and is never returned as a public URL.

---

# PART P — EXPORT CONTRACT

## 64. Export Formats

Exactly:

```text
XLSX
PDF
```

All export generation is asynchronous and bound to an immutable snapshot created at request time.

Client MUST NOT send:

```text
snapshot_json
snapshot_sha256
workflow_iteration_id
template_version_id
approved_by
reviewed_by
signing_certificate_id
artifact_sha256
final_pdf_sha256
business_status override
```

Those values are server-derived/bound.

---

## 65. Request Single Export

### Route

```http
POST /nscmf/{record}/exports
```

Mode: JSON.

Permission:

```text
nscmf.export
+ authorized record visibility
```

### Request

```json
{
  "format": "PDF"
}
```

Server synchronously:

```text
authorize
→ short consistent read/transaction
→ create export request
→ bind current record_version
→ bind current workflow iteration if applicable
→ bind active immutable template version
→ create immutable deterministic snapshot
→ commit
→ dispatch queue job after commit
```

### Response

```http
202 Accepted
```

```json
{
  "data": {
    "id": 930,
    "record_id": 572,
    "format": "PDF",
    "status": "QUEUED",
    "snapshot_record_version": 12,
    "requested_at": "2026-08-22T18:40:00+07:00",
    "ready_at": null,
    "expires_at": null,
    "download_available": false
  },
  "meta": {}
}
```

`status` is export technical status, never NSCMF business status.

---

## 66. Export Status Values

Exactly:

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

`EXPIRED` means generated READY binary is no longer available after retention; source record/snapshot/audit/issuance metadata remains according to retention rules.

---

## 67. Poll Export Status

### Route

```http
GET /nscmf/exports/{export}
```

Authorization is rechecked from the export request's related record and actor permission/resource visibility.

READY response:

```json
{
  "data": {
    "id": 930,
    "record_id": 572,
    "format": "PDF",
    "status": "READY",
    "snapshot_record_version": 12,
    "requested_at": "2026-08-22T18:40:00+07:00",
    "ready_at": "2026-08-22T18:41:12+07:00",
    "expires_at": "2026-08-29T18:41:12+07:00",
    "download_available": true,
    "signed_by_system_organization": true
  },
  "meta": {}
}
```

`signed_by_system_organization` is true only for a successfully signed Approved PDF under the mandatory signing rule. XLSX MUST NOT be labeled signed by this PDF flow.

FAILED response may expose only safe failure classification:

```json
{
  "data": {
    "id": 930,
    "status": "FAILED",
    "failure_code": "EXPORT_FAILED",
    "failure_summary": "The export could not be generated."
  },
  "meta": {}
}
```

Do not return renderer paths, command output, signing key path, certificate private material, raw exception, or storage details.

---

## 68. Approved PDF Signing Failure

If snapshot represents `APPROVED` and required PDF signing fails:

```text
export status = FAILED
NSCMF remains APPROVED
no unsigned PDF fallback
no READY artifact
no issuance row claiming success
```

If signing identity is missing/unusable, safe failure classification may use:

```text
SIGNING_NOT_READY
```

The underlying configuration secret/path is not exposed.

---

## 69. Download Export

### Route

```http
GET /nscmf/exports/{export}/download
```

Requires:

```text
related record currently authorized for actor
+ nscmf.export
+ export status = READY
+ current time < expires_at
+ binary not purged
```

Not ready:

```text
409 EXPORT_NOT_READY
```

Expired:

```text
410 EXPORT_EXPIRED
```

Download creates configured Access Audit evidence.

Generated binary remains available for exactly **168 hours / 7 days** from READY artifact creation under current rule.

---

## 70. Failed/Expired Export Retry Semantics

A failed or expired export request is historical technical evidence and is not rewritten into a new job result.

User requests a **new export**:

```text
new export request
→ new immutable snapshot of then-current authorized record state
→ new queue job
```

This prevents old snapshot identity from being silently replaced.

---

## 71. Bulk Export

### Route

```http
POST /nscmf/exports/bulk
```

Permission:

```text
nscmf.export.bulk
```

Each selected record is independently authorized.

Request:

```json
{
  "format": "XLSX",
  "record_ids": [572, 573, 574]
}
```

Success:

```http
202 Accepted
```

```json
{
  "data": {
    "batch_id": 44,
    "format": "XLSX",
    "exports": [
      {"id": 930, "record_id": 572, "status": "QUEUED"},
      {"id": 931, "record_id": 573, "status": "QUEUED"},
      {"id": 932, "record_id": 574, "status": "QUEUED"}
    ]
  },
  "meta": {}
}
```

Each record receives its own deterministic export request + immutable snapshot.

**TBD:** ZIP/combined-PDF packaging is intentionally not defined because `11` explicitly leaves exact bulk packaging unresolved. The current API MUST NOT pretend a combined package exists until a later confirmed decision.

Optional batch-status read route:

```http
GET /nscmf/export-batches/{batch}
```

returns only authorized child export statuses and does not create a package artifact by itself.

---

# PART Q — PUBLIC PDF VALIDATOR

## 72. Public Verification Page

```http
GET /ispdfvalid
```

No login.

Narrow utility only. It MUST NOT become public NSCMF History or a public record lookup service.

---

## 73. Verify PDF

### Route

```http
POST /ispdfvalid/verify
```

Mode: public multipart request.

Input:

```text
file = one PDF
```

Flow:

```text
rate limit / request hardening
→ validate PDF input
→ private temporary storage
→ ClamAV whole-file CLEAN
→ PDF signature/issuer verification
→ final uploaded-byte SHA-256
→ issuance lookup
→ workflow-iteration/currentness resolution
→ minimum-disclosure result
→ temporary upload cleanup
```

No login required.

### 73.1 Public verifier upload-size limit

**TBD:** upstream documents do not lock a numeric public-verifier maximum upload size. Implementation MUST configure and test a bounded limit, but MUST NOT silently claim the normal 20 MB NSCMF attachment limit is the official verifier limit unless that value is later explicitly approved.

---

## 74. Validator Outcomes — Confirmed

Exactly:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

Meaning:

### `VALID_CURRENT`
Recognized genuine issued PDF; signature/hash/issuance match; tied to the currently approved workflow context.

### `VALID_SUPERSEDED`
Recognized genuine issued PDF; exact original issued bytes remain authentic, but a later Reopen/newer workflow iteration means the old issuance is no longer current.

### `INVALID_MODIFIED`
PDF fails integrity/signature/exact-issued-byte verification such that modification is detected.

### `UNKNOWN`
Cannot establish recognized issuance/current trust. Unknown MUST NOT be promoted to valid.

---

## 75. Validator Success Response

For recognized valid document:

```json
{
  "data": {
    "outcome": "VALID_CURRENT",
    "request_no": "NSCMF-202608-00042",
    "family": "CHANGE",
    "issued_at": "2026-08-22T18:41:12+07:00",
    "issuer": "System/Organization"
  },
  "meta": {}
}
```

For superseded:

```json
{
  "data": {
    "outcome": "VALID_SUPERSEDED",
    "request_no": "NSCMF-202608-00042",
    "family": "CHANGE",
    "issued_at": "2026-08-15T10:00:00+07:00",
    "issuer": "System/Organization"
  },
  "meta": {}
}
```

For invalid/unknown, minimize disclosure:

```json
{
  "data": {
    "outcome": "INVALID_MODIFIED"
  },
  "meta": {}
}
```

or:

```json
{
  "data": {
    "outcome": "UNKNOWN"
  },
  "meta": {}
}
```

The public response MUST NOT expose:

- Requester;
- Reviewer;
- Approver;
- Team;
- form body/business data;
- attachments;
- Business Timeline;
- Access/Security Audit;
- private storage keys;
- certificate private key/path/passphrase;
- internal scanner diagnostics;
- internal database IDs unless explicitly justified later.

No TSA claim is made in current MVP.

---

# PART R — AUTHENTICATION / ACCOUNT ACTION ROUTES

## 76. Login

Canonical Laravel route:

```http
POST /login
```

Input:

```json
{
  "username": "user01",
  "password": "secret"
}
```

Response uses normal session/Inertia redirect behavior.

Failure is generic. Password is never logged/audited in plaintext.

On successful third concurrent login, oldest active authenticated session is revoked before/while establishing invariant `<=2`.

---

## 77. Logout

```http
POST /logout
```

Invalidates current server-side session and redirects to Login.

No Spatie `session.logout` permission exists.

---

## 78. Mandatory Temporary Password Change

Canonical route:

```http
POST /account/temporary-password/change
```

Only available while authenticated account has `must_change_password=true`.

Request:

```json
{
  "new_password": "newpass",
  "new_password_confirmation": "newpass"
}
```

Rules:

```text
minimum 6 characters
no composition requirement
no MFA
```

Success:

- securely stores new password hash;
- clears temporary-password gate;
- updates relevant password timestamp;
- applies session regeneration/security behavior;
- writes safe Security Audit evidence;
- never records plaintext.

Normal application navigation stays blocked until this succeeds.

---

## 79. Sensitive-Action Re-authentication

Canonical route:

```http
POST /account/re-authenticate
```

Request:

```json
{
  "current_password": "secret"
}
```

Success creates a server-side re-auth proof/session marker scoped to sensitive administration. No reusable plaintext token is returned to JavaScript unless implementation has an explicitly reviewed reason.

Failure:

```text
403 REAUTH_FAILED
```

Sensitive admin action without valid proof:

```text
403 REAUTH_REQUIRED
```

**TBD:** exact re-auth proof lifetime remains intentionally unresolved by `10_Security_Rules.md`. `14_Environment_Specification.md`/approved follow-up must set it before production implementation. The API contract MUST NOT invent a hidden permanent proof.

---

# PART S — USER ADMINISTRATION

## 80. User List

```http
GET /administration/users
```

Permission:

```text
users.view
```

Pagination: standard page/per_page.

Supported safe filters MAY include:

```text
q
team_id
is_active
role_id
```

Team remains organizational filtering, not permission scope.

---

## 81. Create User

```http
POST /administration/users
```

Requires:

```text
users.create
+ current-password re-auth proof
```

Request identity fields:

```json
{
  "name": "Example User",
  "username": "example.user",
  "team_id": 3,
  "role_ids": [2]
}
```

Normal user requires a valid active Team.

Protected Superadmin flags are not client-settable.

### Temporary credential establishment — unresolved transport detail

Upstream security policy requires an administrator-established temporary credential and forced password replacement, but does **not** decide whether the temporary secret is:

- generated by the server and revealed/delivered once; or
- entered by the authorized admin and sent in the create/reset request.

Therefore this API document intentionally does **not** invent a plaintext credential field/delivery provider.

Before implementation of Create User, this one narrow transport decision MUST be finalized without changing these locked invariants:

```text
no plaintext persistence
no plaintext audit/log
must_change_password = true
normal navigation blocked until replacement
minimum 6 / no composition
```

---

## 82. Update User Profile

```http
PATCH /administration/users/{user}
```

Permission:

```text
users.update
```

Allowed normal fields only:

```json
{
  "name": "Updated Name",
  "username": "updated.username"
}
```

Do not mass-assign password, protected flag, roles, Team, or `is_active` through this generic route; use explicit actions below.

---

## 83. Enable User

```http
POST /administration/users/{user}/enable
```

Permission:

```text
users.enable
```

Protected invariants apply.

---

## 84. Disable User

```http
POST /administration/users/{user}/disable
```

Permission:

```text
users.disable
```

On success:

- `is_active=false`;
- target active sessions revoked;
- Security Audit written;
- historical actor/sign-off references preserved;
- protected Superadmin cannot be disabled.

No user-delete endpoint is defined as a history-erasure mechanism.

---

## 85. Reset User Password

```http
POST /administration/users/{user}/reset-password
```

Requires:

```text
users.reset_password
+ current-password re-auth proof
+ protected-target invariant
```

On success:

- temporary credential established through the finalized credential-delivery mechanism from Section 81;
- `must_change_password=true`;
- all target active sessions revoked;
- Security Audit written;
- plaintext never stored/audited.

Exact temporary secret transport remains the same narrow TBD as Create User and MUST be finalized once, not differently per endpoint.

---

## 86. Replace User Roles

```http
PUT /administration/users/{user}/roles
```

Requires:

```text
users.assign_roles
+ current-password re-auth proof
```

Request:

```json
{
  "role_ids": [2, 3]
}
```

Semantics: replace the target user's role assignment set with the supplied authorized role set.

On effective authorization change:

- Spatie is mutated through application orchestration;
- protected Superadmin invariants rechecked;
- affected target sessions revoked;
- Security Audit written.

No direct user-permission payload is accepted.

---

## 87. Assign User Team

```http
PUT /administration/users/{user}/team
```

Permission:

```text
users.assign_team
or teams.assign_users according to the administration action boundary chosen in implementation
```

Request:

```json
{
  "team_id": 4
}
```

Current contract SHOULD accept either permission only if `04`/Policy mapping explicitly treats both as equivalent entry points; implementation MUST choose one canonical Policy rule and test it rather than creating inconsistent controllers.

Important invariant:

```text
Team change alone
→ does NOT grant/revoke Review/Approval capability
→ does NOT trigger role/permission recalculation
→ does NOT revoke sessions solely because Team changed
→ does NOT rewrite historical nscmf_records.team_id
```

---

# PART T — ROLE / PERMISSION ADMINISTRATION

## 88. Role List

```http
GET /administration/roles
```

Permission:

```text
roles.view
```

Role DTO includes role ID/name and assigned explicit permission names. Wildcard expansion is not used.

---

## 89. Permission Catalog Read

```http
GET /administration/permissions
```

Read is available to authorized role-management UI, normally with `roles.view`.

Returns explicit permission rows only.

MUST NOT return/seed synthetic wildcard entries such as:

```text
nscmf.review.*
```

unless those are only presentation grouping labels and never actual permission IDs.

---

## 90. Create Role

```http
POST /administration/roles
```

Permission:

```text
roles.create
```

Request:

```json
{
  "name": "NOC Lead"
}
```

Role name itself has no special runtime authorization meaning.

---

## 91. Update Role Name

```http
PATCH /administration/roles/{role}
```

Permission:

```text
roles.update
```

Protected Superadmin role cannot be renamed/downgraded in a way that violates protected invariants.

---

## 92. Replace Role Permissions

```http
PUT /administration/roles/{role}/permissions
```

Requires:

```text
permissions.assign
+ current-password re-auth proof
```

Request:

```json
{
  "permission_ids": [1, 4, 7, 9]
}
```

or implementation MAY use explicit permission names if the frontend contract is generated from the same authoritative catalog. One representation MUST be chosen consistently; mixing IDs/names inside one payload is forbidden.

Semantics:

```text
validate permissions
→ protected invariant
→ Spatie syncPermissions
→ determine all affected users
→ revoke affected target sessions where effective authorization changes
→ Security Audit
```

No shadow `effective_permissions` table is created.

### Role archive

`04` contains a conceptual `roles.archive` permission only if the final model supports role archival, but `11` deliberately reuses the standard Spatie role table without an application `is_active`/archive column.

Therefore **no role-archive HTTP endpoint is defined in this API baseline**. Adding one requires an explicit schema/spec update first.

---

# PART U — TEAM ADMINISTRATION

## 93. Team List

```http
GET /administration/teams
```

Permission:

```text
teams.view
```

DTO:

```json
{
  "id": 3,
  "name": "Team NOC",
  "is_active": true
}
```

---

## 94. Create Team

```http
POST /administration/teams
```

Permission:

```text
teams.create
```

Request:

```json
{
  "name": "Team Fulfillment"
}
```

Team name unique under application-normalized/case-insensitive rule.

---

## 95. Update Team

```http
PATCH /administration/teams/{team}
```

Permission:

```text
teams.update
```

Request:

```json
{
  "name": "Team NOC Core"
}
```

No role/permission mutation occurs as a side effect.

---

## 96. Deactivate / Reactivate Team

Because `11` defines `teams.is_active`, API uses explicit lifecycle actions rather than deleting referenced Teams.

```http
POST /administration/teams/{team}/deactivate
POST /administration/teams/{team}/reactivate
```

Permission mapping uses the confirmed Team-management permission set (`teams.archive` for deactivate/reactivate lifecycle, subject to Policy naming implementation).

A Team referenced by users/history SHOULD be deactivated rather than deleted.

There is no Team-delete API baseline.

---

# PART V — INERTIA SHARED PROPS

## 97. Authentication Props

Internal Inertia pages SHOULD receive safe shared auth context:

```json
{
  "auth": {
    "user": {
      "id": 19,
      "name": "Example User",
      "username": "example.user",
      "team": {
        "id": 3,
        "name": "Team NOC"
      }
    },
    "permissions": [
      "nscmf.view",
      "nscmf.review.forward"
    ],
    "must_change_password": false
  }
}
```

This is for presentation efficiency only. Server endpoint authorization remains mandatory.

MUST NOT expose:

- password hash;
- session payload;
- signing key information;
- direct authorization scope based on Team.

---

## 98. Record Action Props

Record pages SHOULD receive server-derived `allowed_actions` to prevent frontend duplication of full Policy/state logic.

Example:

```json
{
  "allowed_actions": [
    "EXPORT",
    "TIMELINE_VIEW",
    "APPROVE",
    "APPROVAL_RETURN_REVIEWER",
    "APPROVAL_RETURN_REQUESTER",
    "APPROVAL_REJECT"
  ]
}
```

Frontend MAY hide/disable controls using this list, but backend MUST re-evaluate the action when submitted.

---

# PART W — SECURITY / PRIVACY HTTP RULES

## 99. IDOR and Resource Not Found

For a resource the actor is not authorized to know exists, implementation SHOULD prefer an indistinguishable `404 RESOURCE_NOT_FOUND` where appropriate rather than leaking existence through different response bodies.

Privileged administrative actions may use `403 FORBIDDEN` when resource existence is already legitimately known.

---

## 100. CSRF

Every authenticated state-changing browser route, including JSON chunk-session control requests, MUST retain Laravel CSRF protection appropriate to same-origin session auth.

Do not globally disable CSRF for convenience.

---

## 101. CORS

No wildcard credentialed CORS.

Same-app Inertia does not require permissive cross-origin API exposure.

---

## 102. Cache Controls

Sensitive authenticated JSON, public verification result, and private download responses SHOULD use safe no-store/private cache controls appropriate to their content.

Public validator result MUST NOT become a cacheable public record index.

---

## 103. Mass Assignment

Each controller/action uses request-specific whitelist/Form Request/DTO.

There is no generic:

```text
$request->all()
→ Model::update(...)
```

for NSCMF workflow, user security, role/permission, attachment security, export, or audit fields.

---

## 104. Safe Logging

Request logging MUST redact/avoid:

```text
password
current_password
new_password
temporary credential plaintext
session cookie/session payload
private signing key/passphrase
secret token
raw file bytes
raw chunk bytes
private storage key where not operationally necessary
```

Technical logs MAY record safe IDs, stage, duration, status, chunk index, size, and sanitized failure category.

---

# PART X — TECHNICAL STATE SEPARATION

## 105. Business State vs Technical State

Canonical NSCMF business states only:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Technical state sets:

### Upload

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

### Attachment security

```text
PENDING
CLEAN
INFECTED
FAILED
```

### Export

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

### Public validator outcome

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

API/client MUST NOT conflate these namespaces because some labels such as `CANCELLED`/`FAILED` are meaningful only in their domain context.

---

# PART Y — HTTP ROUTE INVENTORY

## 106. Authentication / account

```text
POST   /login
POST   /logout
POST   /account/temporary-password/change
POST   /account/re-authenticate
```

## 107. NSCMF pages / persistence

```text
GET    /dashboard
GET    /nscmf/create
POST   /nscmf
GET    /nscmf/{record}
GET    /nscmf/{record}/edit
PATCH  /nscmf/{record}/draft
PATCH  /nscmf/{record}/change-results
```

## 108. Workflow / lifecycle

```text
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

## 109. Queues / history / timeline

```text
GET    /review
GET    /review/{record}
GET    /approval
GET    /approval/{record}
GET    /history
GET    /nscmf/{record}/timeline
```

## 110. Attachments

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

## 111. Export

```text
POST   /nscmf/{record}/exports
GET    /nscmf/exports/{export}
GET    /nscmf/exports/{export}/download
POST   /nscmf/exports/bulk
GET    /nscmf/export-batches/{batch}
```

## 112. Public validation

```text
GET    /ispdfvalid
POST   /ispdfvalid/verify
```

## 113. Administration

```text
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
```

No direct-user permission administration route exists.

No Unit/Division/scope route exists.

No NSCMF hard-delete route exists.

---

# PART Z — ROUTE / PERMISSION SUMMARY

## 114. Critical Permission Map

| Operation | Permission |
|---|---|
| Create NSCMF | `nscmf.create` |
| Draft/Revision save | `nscmf.draft.edit` + ownership |
| Submit/Resubmit | `nscmf.submit` + ownership |
| Cancel | `nscmf.cancel` + ownership |
| Change Result | `nscmf.change.result.edit` + ownership |
| Manage attachment | `nscmf.attachment.manage` + editable authorized context |
| Review Forward | `nscmf.review.forward` |
| Review Return | `nscmf.review.return` |
| Review Reject | `nscmf.review.reject` |
| Approve | `nscmf.approve` |
| Approval Return Reviewer | `nscmf.approval.return_reviewer` |
| Approval Return Requester | `nscmf.approval.return_requester` |
| Approval Reject | `nscmf.approval.reject` |
| Reopen | `nscmf.reopen` |
| Archive/Unarchive | `nscmf.archive` |
| Timeline | `nscmf.timeline.view` + record authorization |
| Single Export | `nscmf.export` + record authorization |
| Bulk Export | `nscmf.export.bulk` + per-record authorization |
| Raw Access Audit | `audit.access.view` + applicable authorization |
| Security Audit | `audit.security.view` + applicable authorization |

Team is never an extra permission scope column.

---

# PART AA — FAILURE / RACE EXAMPLES

## 115. Two Reviewers Race

```text
Reviewer A loads version 8 / PENDING_REVIEW
Reviewer B loads version 8 / PENDING_REVIEW
Reviewer A Forward succeeds → version 9 / PENDING_APPROVAL
Reviewer B Rejects using version 8
→ server locks current row
→ sees version/state changed
→ 409 NSCMF_VERSION_CONFLICT or NSCMF_STATE_CONFLICT
→ no Reject event written
```

Only the committed action affects workflow.

---

## 116. Two Approvers Race

```text
Approver A Approve succeeds
→ APPPROVED
→ Approved By = A

Approver B stale Approve/Reject/Return
→ conflict
→ cannot overwrite Approved By
```

One successful final Approve is enough.

---

## 117. Lost Chunk Response

```text
client sends chunk 3
server stores it + persists hash
TCP response is lost
client retries chunk 3
server computes same hash
→ 200 duplicate=true
→ no duplicate logical chunk
```

Different bytes for same accepted index:

```text
409 UPLOAD_CHUNK_CONFLICT
```

---

## 118. Server Restart During Upload

```text
chunks 1..3 acknowledged
application process stops
no chunks accepted while service unavailable
service returns
client inspects same unexpired upload session
server reads MySQL + durable private storage
→ chunks 1..3 remain accepted
→ client uploads only missing chunk(s)
```

This is the confirmed recovery guarantee. The system does not claim uploads continue while the application is down.

---

## 119. Export vs Later Edit

```text
record version 12
user requests export
→ snapshot bound to version 12
record later changes to version 13
worker starts later
→ worker MUST render snapshot version 12
→ MUST NOT re-read version 13 form data as export content
```

A later export request creates a new snapshot.

---

## 120. Old Genuine Approved PDF After Reopen

```text
Iteration 1 Approved → signed PDF issuance A
record Reopened → Iteration 2
later maybe Approved again
user validates exact original PDF A
→ signature/hash/issuance genuine
→ old iteration superseded
→ VALID_SUPERSEDED
```

MUST NOT return `INVALID_MODIFIED` solely because workflow later changed.

---

# PART AB — CLIENT IMPLEMENTATION RULES

## 121. Frontend MUST

1. preserve current `record_version` returned by server;
2. send it with record mutation/action requests defined above;
3. never increment version locally by assumption;
4. on conflict, refresh/reconcile latest server state;
5. treat `allowed_actions` as UI hint, not authorization proof;
6. treat Team as display/profile data;
7. reconcile upload progress from server, not local progress alone;
8. resend only missing/retry-required chunks;
9. not call attachment Ready until `security_status=CLEAN`;
10. poll async export/attachment state without inventing business status;
11. show mandatory reason dialogs for the exact actions requiring reasons;
12. never expose raw internal error diagnostics;
13. never send server-managed status/sign-off/audit/export snapshot values.

---

## 122. Backend MUST

1. use `web` session auth for internal app;
2. enforce CSRF on authenticated mutations;
3. use Policies/Gates + explicit permissions;
4. enforce ownership only where upstream rule requires it;
5. never use Team for Review/Approval authorization;
6. never accept generic client-driven business-status mutation;
7. repeat backend validation for every workflow action;
8. preserve optimistic conflict semantics;
9. use row locks/current-state revalidation for workflow transitions;
10. atomically write required Business Audit with successful business mutation;
11. keep Access/Security Audit separate from Business Timeline;
12. keep temporary chunk/storage paths private;
13. compute server-side chunk and final hashes as needed;
14. scan full assembled attachment with ClamAV;
15. fail closed unless explicit CLEAN;
16. bind export snapshot before queue dispatch;
17. never let worker substitute later live form data for snapshot;
18. never return unsigned Approved PDF as READY;
19. preserve 168h export binary expiration semantics;
20. minimize public validator disclosure;
21. never expose signing private key/credential secrets;
22. preserve protected Superadmin invariants without generic business-rule bypass.

---

# PART AC — API CONTRACT TEST MATRIX

## 123. Authentication / Session

- [ ] login generic failure does not enumerate username;
- [ ] idle 30m enforced server-side;
- [ ] absolute 8h enforced server-side;
- [ ] third valid login revokes oldest active session;
- [ ] logout invalidates server session;
- [ ] temporary-password account blocked from normal navigation until replacement;
- [ ] no MFA/composition requirement accidentally introduced;
- [ ] no `session.login`/`session.logout` Spatie permission required.

## 124. Authorization / Team

- [ ] every protected direct URL reauthorizes;
- [ ] Review/Approval eligibility does not require Team match;
- [ ] changing Team alone does not grant/revoke permission;
- [ ] no Reviewer/Approval scope input/route exists;
- [ ] no Spatie Teams runtime parameter exists;
- [ ] protected Superadmin cannot bypass invalid domain transition.

## 125. Record Persistence

- [ ] incomplete Draft saves;
- [ ] `record_version` required for Draft/Revision/Result JSON mutation;
- [ ] stale save returns 409 without overwrite;
- [ ] successful child-table mutation increments parent version;
- [ ] request number cannot mutate after first Submit;
- [ ] generic form PATCH cannot mutate state/sign-off/archive/audit fields;
- [ ] nested request DTO maps to typed relational schema, not live JSON blob.

## 126. Workflow

- [ ] every transition has explicit endpoint;
- [ ] no generic status setter exists;
- [ ] mandatory reasons enforced 5..2000 meaningful chars;
- [ ] Forward comment optional;
- [ ] Approve comment optional;
- [ ] first Submit creates Iteration 1;
- [ ] Resubmit stays current iteration;
- [ ] Reopen creates next iteration;
- [ ] Approver Return clears effective Reviewed By;
- [ ] one successful Approve sets Approved By;
- [ ] stale Reviewer/Approver race loses safely.

## 127. Change Result

- [ ] zero Result rows may exist first Submit;
- [ ] Result-only endpoint only works on owned Change `PENDING_REVIEW`;
- [ ] endpoint rejects planning/general fields;
- [ ] Forward requires minimum one complete Result row;
- [ ] maximum five rows preserved;
- [ ] Result update increments record version and audits changes.

## 128. Attachment Upload

- [ ] 5 MiB chunk geometry;
- [ ] final chunk remainder allowed;
- [ ] server owns accepted/missing state;
- [ ] same-file unexpired session resumes;
- [ ] client fingerprint never becomes final hash;
- [ ] chunk server hash supports idempotent retry;
- [ ] conflicting accepted-index payload rejected;
- [ ] accepted progress survives ordinary application restart with DB/durable storage intact;
- [ ] incomplete session expires 24h after last newly accepted progress;
- [ ] completion independently verifies all chunks/bytes;
- [ ] server computes authoritative final SHA-256;
- [ ] ClamAV scans full assembled file;
- [ ] upload COMPLETED is not equivalent to CLEAN;
- [ ] only CLEAN downloadable;
- [ ] storage key never authorizes;
- [ ] max10 / max20MB / allowed-type rules preserved;
- [ ] Result-only capability cannot alter attachments.

## 129. Export

- [ ] format only XLSX/PDF;
- [ ] export request creates immutable snapshot before queue dispatch;
- [ ] client cannot supply snapshot/signing/approval truth;
- [ ] worker reads bound snapshot;
- [ ] technical status remains separate from business state;
- [ ] Approved PDF signing failure yields FAILED and no unsigned READY;
- [ ] READY binary expires after 168h;
- [ ] expired/failed retry creates new request/snapshot;
- [ ] bulk export independently authorizes every record;
- [ ] no fake ZIP/package contract invented while packaging remains TBD.

## 130. Public Validator

- [ ] no login required;
- [ ] rate limited;
- [ ] PDF temp private;
- [ ] ClamAV CLEAN required before verification;
- [ ] exact final signed-byte hash used;
- [ ] current vs superseded resolved from workflow/issuance context;
- [ ] valid old genuine PDF becomes `VALID_SUPERSEDED` after newer iteration;
- [ ] invalid/unknown response minimizes disclosure;
- [ ] no Requester/Reviewer/Approver/Team/form/audit disclosure;
- [ ] no TSA claim.

## 131. Administration

- [ ] no direct-user permission route;
- [ ] role permission changes require re-auth;
- [ ] affected target sessions revoked after effective authorization change;
- [ ] Team changes alone do not revoke sessions;
- [ ] disabling user revokes sessions;
- [ ] protected Superadmin cannot be disabled/stripped;
- [ ] no user-delete history erasure route;
- [ ] no role archive endpoint until schema supports it;
- [ ] audits are read-only/no purge endpoint.

---

# PART AD — INTENTIONALLY UNRESOLVED / NOT INVENTED

## 132. Remaining API-Adjacent TBDs

The following remain intentionally unresolved because upstream documents do not supply enough authority:

1. **Temporary credential transport/delivery** — server-generated/revealed once vs admin-entered temporary secret. Security invariants are fixed; only secret transport remains unresolved.
2. **Sensitive re-auth proof lifetime** — server-side short-lived proof is required conceptually, exact duration remains TBD in `10`.
3. **Public PDF verifier maximum upload size** — must be bounded, exact numeric limit not yet approved.
4. **Bulk export packaging** — no ZIP/combined-PDF contract until explicitly decided.
5. **Exact operational numeric rate limits** for upload/public-validator abuse control — required conceptually but numeric thresholds belong Security/Environment/deployment tuning unless later locked.
6. **Official numbering SOP** beyond the current PROVISIONAL automatic/manual rules.
7. **Default Team master data**.
8. **Signing provider/library/container/path/key rotation mechanics** — API only exposes safe result semantics.
9. **Notification endpoints/providers** — notification is not an MVP blocker and no API is invented here.

Implementation MUST NOT silently turn these TBDs into product/business facts.

---

# PART AE — DEVELOPER / AI GUARDRAILS

## 133. MUST NOT

Developer/coding agent MUST NOT:

1. create a generic `status` mutation endpoint;
2. accept client `business_status` in Draft/Form DTO;
3. accept `approved_by`, `reviewed_by`, audit actor, or timestamps from client;
4. accept Team/Unit/Division/scope as Review/Approval authorization input;
5. enable Spatie Teams;
6. add direct-user permission admin endpoint;
7. enable wildcard permission semantics;
8. trust frontend validation/allowed-actions as backend authorization;
9. omit `record_version` from Draft/Revision/Result mutations;
10. silently overwrite stale record content;
11. rely on optimistic version instead of row lock for workflow transition;
12. hold workflow DB row lock during chunk upload/scan/export/render/sign;
13. treat a chunk as an attachment;
14. trust client file fingerprint as authoritative hash;
15. overwrite accepted chunk with conflicting retransmission;
16. mark incomplete upload as final attachment;
17. mark `COMPLETED` upload as `CLEAN` automatically;
18. replace whole-file ClamAV scan with per-chunk scan aggregation;
19. expose quarantine/private object keys;
20. expose non-CLEAN attachment download;
21. store uploaded production chunks only in ephemeral application filesystem;
22. let export worker read later mutable data instead of immutable snapshot;
23. let client submit snapshot JSON or signing identity;
24. return unsigned Approved PDF as successful fallback;
25. expose private NSCMF data through `/ispdfvalid`;
26. classify genuine superseded PDF as modified solely due Reopen;
27. expose password/private key/session secrets in response/log/audit;
28. create NSCMF hard-delete endpoint;
29. create audit delete/purge-by-age endpoint;
30. invent role archive behavior without schema support;
31. invent a bulk ZIP/package result before packaging is approved;
32. convert technical upload/export/security status into NSCMF business status.

---

# PART AF — FINAL CONSISTENCY STATEMENTS

## 134. Permission Statement

> Permission answers what the actor may attempt. Ownership where explicitly required, resource authorization, current state, archive treatment, validation, security, and concurrency determine whether the action may succeed now. Team does not participate in that authorization equation.

## 135. Workflow Statement

> The client requests a business action (`submit`, `forward`, `approve`, `return`, `reject`, `reopen`, `archive`); the client never writes the destination business status directly.

## 136. Concurrency Statement

> `record_version` is a client-visible stale-write/freshness token. Draft/Revision/Result use optimistic versioning. Workflow actions additionally require authoritative row lock + current-state revalidation.

## 137. Attachment Statement

> Resumable upload preserves accepted transport progress; it does not weaken final file validation. Only the fully assembled file, server-computed authoritative hash, and explicit whole-file ClamAV `CLEAN` can produce a usable attachment.

## 138. Export Statement

> Export is an immutable-snapshot job, not a live view of whatever data exists when the worker eventually runs.

## 139. Public Verification Statement

> Public validation proves recognized issued-PDF integrity/currentness with minimum disclosure; it is not public NSCMF record access.

---

## 140. Next Document

Next document in the fixed project sequence:

**`13_Project_Structure.md`**

It MUST place controllers, Form Requests/DTOs, Policies/Gates, application actions, domain services, upload services, scanner adapters, export/snapshot services, signing/verification services, audit writers, queue jobs, and route files so that this API contract is implemented without scattering business logic or creating duplicate authorization/state truth.