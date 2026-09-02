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
> **Last Updated:** 2026-09-02  

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
20 MB
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

Conflict → `409 NSCMF_VERSION_CONFLICT`.

---

# PART H — ACTIVATION / CHANGE FORM TRANSPORT

## 27. Activation DTO

Activation transport follows `06`/`11` typed fields and exact enum values. Requiredness is action-specific; Draft may be incomplete. Repeatable source-template structures use stable `row_no` where defined.

## 28. Change DTO

Change transport follows `06`/`11`, including Service Impact multi-select and Result rows max five.

Canonical values include:

```text
impact_code: NOC15 | NOC23 | NOC361 | REGIONAL | POP | CUSTOMER | OTHER
```

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

Accepts Result fields only. Successful mutation Business Audits changes and increments parent version.

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

Mandatory reasons: Reviewer Return/Reject, Approver Returns/Reject, Reopen, Archive, Unarchive. Trimmed minimum 5 meaningful chars, maximum 2000. Forward/Approve comment optional max2000. Cancel reason optional.

---

# PART J — REOPEN / ARCHIVE

## 40. Reopen

```http
POST /nscmf/{record}/reopen
```

Source Approved/Rejected, not archived, `nscmf.reopen`, authorized access, mandatory reason. Destination only `REVISION_REQUIRED|PENDING_REVIEW`. Success creates next iteration. CANCELLED never reopen.

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

Editable context only according to `06`; optional; max10; max20MB; zero-byte reject; locked allowlist.

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

## 70. Retry

Failed/expired retry creates new export request and new immutable then-current snapshot.

## 71. Bulk Export

```http
POST /nscmf/exports/bulk
GET  /nscmf/export-batches/{batch}
```

Each record independently authorized. ZIP/combined package remains intentionally unresolved; no fake package artifact contract.

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
maximum file size = 20 MB
```

Flow:

```text
rate limit / hardening
→ enforce PDF + 20 MB max
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

Safe shared auth context may include user, Team display, effective permissions, must-change-password flag. No password hash/session payload/signing private key/Team authorization scope.

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
POST /login
POST /logout
POST /account/temporary-password/change
POST /account/re-authenticate
```

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
GET  /nscmf/exports/{export}
GET  /nscmf/exports/{export}/download
POST /nscmf/exports/bulk
GET  /nscmf/export-batches/{batch}

GET  /ispdfvalid
POST /ispdfvalid/verify
```

## 114. Administration

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
- enforce/display public validator 20 MB max but rely on server as authority;
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
- enforce public validator 20 MB max;
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
- [ ] public no-login max20MB;
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

# PART AA — REMAINING API-ADJACENT TBDs

## 133. Intentionally Unresolved

Still unresolved because upstream authority intentionally leaves them downstream:

1. bulk export packaging (ZIP/combined PDF etc.);
2. exact operational numeric rate-limit buckets for login/upload/public-validator abuse controls;
3. official numbering SOP beyond current provisional automatic/manual rules;
4. default Team master data;
5. signing provider/library/container/path/passphrase/rotation mechanics;
6. notification endpoints/providers;
7. exact physical storage root/mount, ClamAV topology, renderer topology — Environment/Deployment concern.

No longer TBD:

```text
temporary credential direction = server-generated + one-time admin reveal
sensitive re-auth proof lifetime = 15 minutes
public validator maximum upload = 20 MB
canonical application timezone = Asia/Jakarta
initial production storage backend class = persistent Laravel local private storage
Technical Log cleanup policy/default = Protected-Superadmin setting, ON + 30 DAY by default
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
24. expose S3/object-storage concepts through current HTTP contract as if they are required.

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
