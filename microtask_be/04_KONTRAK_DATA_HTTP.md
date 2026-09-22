# Kontrak data dan HTTP

Semua route diambil dari12, bukan nama file FE. Path yang belum canonical tidak diciptakan; G01/G03/G09 menahan final integration bagian tersebut. Tabel ini melengkapi [field](09_FIELD_DAN_VALIDASI.md), [schema](08_SCHEMA_DAN_CONSTRAINT.md), dan [permission/audit/seed](10_AUDIT_QUEUE_SEED.md). Uji endpoint meliputi route/method/status/body/content-type/session-CSRF/permission/resource/state/no leak; failure mutation tidak boleh200 sukses.

## Endpoint inventory

| Method | Path                                                                  | Source12 | BE owner (test/AC pada task)                                                                                                                      | Transport                                                         |
| ------ | --------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| POST   | `/nscmf`                                                              | §25      | [BE-047](BE-047.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PATCH  | `/nscmf/{record}/draft`                                               | §26      | [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md)                                                                                     | JSON                                                              |
| PATCH  | `/nscmf/{record}/change-results`                                      | §29      | [BE-076](BE-076.md)                                                                                                                               | JSON                                                              |
| POST   | `/nscmf/{record}/submit`                                              | §30      | [BE-064](BE-064.md), [BE-065](BE-065.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/cancel`                                              | §31      | [BE-077](BE-077.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/review/forward`                                      | §32      | [BE-070](BE-070.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/review/return`                                       | §33      | [BE-068](BE-068.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/review/reject`                                       | §34      | [BE-069](BE-069.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/approval/approve`                                    | §35      | [BE-074](BE-074.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/approval/return-reviewer`                            | §36      | [BE-071](BE-071.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/approval/return-requester`                           | §37      | [BE-072](BE-072.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/approval/reject`                                     | §38      | [BE-073](BE-073.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/reopen`                                              | §40      | [BE-078](BE-078.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/archive`                                             | §41      | [BE-079](BE-079.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/unarchive`                                           | §42      | [BE-079](BE-079.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/dashboard`                                                          | §44      | [BE-087](BE-087.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/nscmf/create`                                                       | §44      | [BE-047](BE-047.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/nscmf/{record}`                                                     | §44      | [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/nscmf/{record}/edit`                                                | §44      | [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-062](BE-062.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/review`                                                             | §44      | [BE-023](BE-023.md), [BE-087](BE-087.md), [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-066](BE-066.md), [BE-067](BE-067.md), [BE-086](BE-086.md) | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/review/{record}`                                                    | §44      | [BE-066](BE-066.md), [BE-070](BE-070.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/approval`                                                           | §44      | [BE-023](BE-023.md), [BE-087](BE-087.md), [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-066](BE-066.md), [BE-067](BE-067.md), [BE-086](BE-086.md) | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/approval/{record}`                                                  | §44      | [BE-067](BE-067.md), [BE-074](BE-074.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/history`                                                            | §44      | [BE-023](BE-023.md), [BE-087](BE-087.md), [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-066](BE-066.md), [BE-067](BE-067.md), [BE-086](BE-086.md) | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/nscmf/{record}/timeline`                                            | §48      | [BE-084](BE-084.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/audits/access`                                       | §49      | [BE-085](BE-085.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/audits/security`                                     | §50      | [BE-085](BE-085.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/nscmf/{record}/attachment-uploads`                                  | §52      | [BE-092](BE-092.md)                                                                                                                               | JSON                                                              |
| GET    | `/nscmf/{record}/attachment-uploads/{upload_id}`                      | §53      | [BE-093](BE-093.md)                                                                                                                               | JSON                                                              |
| PUT    | `/nscmf/{record}/attachment-uploads/{upload_id}/chunks/{chunk_index}` | §55      | [BE-094](BE-094.md)                                                                                                                               | Octet-stream request; JSON response                               |
| POST   | `/nscmf/{record}/attachment-uploads/{upload_id}/complete`             | §56      | [BE-096](BE-096.md), [BE-098](BE-098.md)                                                                                                          | JSON                                                              |
| GET    | `/nscmf/{record}/attachments/{attachment}`                            | §59      | [BE-099](BE-099.md)                                                                                                                               | JSON                                                              |
| DELETE | `/nscmf/{record}/attachment-uploads/{upload_id}`                      | §60      | [BE-095](BE-095.md), [BE-128](BE-128.md)                                                                                                          | JSON                                                              |
| DELETE | `/nscmf/{record}/attachments/{attachment}`                            | §62      | [BE-100](BE-100.md)                                                                                                                               | JSON                                                              |
| GET    | `/nscmf/{record}/attachments/{attachment}/download`                   | §63      | [BE-099](BE-099.md)                                                                                                                               | Binary stream                                                     |
| POST   | `/nscmf/{record}/exports`                                             | §65      | [BE-108](BE-108.md)                                                                                                                               | JSON                                                              |
| GET    | `/nscmf/exports/{export}`                                             | §67      | [BE-110](BE-110.md), [BE-117](BE-117.md)                                                                                                          | JSON                                                              |
| GET    | `/nscmf/exports/{export}/download`                                    | §69      | [BE-110](BE-110.md), [BE-117](BE-117.md)                                                                                                          | Binary stream                                                     |
| POST   | `/nscmf/exports/bulk`                                                 | §71      | [BE-112](BE-112.md)                                                                                                                               | JSON                                                              |
| GET    | `/nscmf/export-batches/{batch}`                                       | §71      | [BE-112](BE-112.md)                                                                                                                               | JSON                                                              |
| GET    | `/ispdfvalid`                                                         | §72      | [BE-121](BE-121.md), [BE-120](BE-120.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/ispdfvalid/verify`                                                  | §73      | [BE-121](BE-121.md), [BE-120](BE-120.md)                                                                                                          | Multipart PDF; JSON result                                        |
| POST   | `/login`                                                              | §76      | [BE-027](BE-027.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/logout`                                                             | §77      | [BE-027](BE-027.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/account/temporary-password/change`                                  | §78      | [BE-036](BE-036.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/account/re-authenticate`                                            | §79      | [BE-031](BE-031.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/users`                                               | §80      | [BE-039](BE-039.md), [BE-034](BE-034.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/users`                                               | §81      | [BE-039](BE-039.md), [BE-034](BE-034.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PATCH  | `/administration/users/{user}`                                        | §82      | [BE-039](BE-039.md), [BE-034](BE-034.md)                                                                                                          | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/users/{user}/enable`                                 | §83      | [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/users/{user}/disable`                                | §84      | [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/users/{user}/reset-password`                         | §85      | [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PUT    | `/administration/users/{user}/roles`                                  | §86      | [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PUT    | `/administration/users/{user}/team`                                   | §87      | [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md)                                                                                     | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/roles`                                               | §88      | [BE-041](BE-041.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/permissions`                                         | §89      | [BE-041](BE-041.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/roles`                                               | §90      | [BE-041](BE-041.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PATCH  | `/administration/roles/{role}`                                        | §91      | [BE-041](BE-041.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PUT    | `/administration/roles/{role}/permissions`                            | §92      | [BE-041](BE-041.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/teams`                                               | §93      | [BE-038](BE-038.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/teams`                                               | §94      | [BE-038](BE-038.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PATCH  | `/administration/teams/{team}`                                        | §95      | [BE-038](BE-038.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/teams/{team}/deactivate`                             | §96      | [BE-038](BE-038.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| POST   | `/administration/teams/{team}/reactivate`                             | §96      | [BE-038](BE-038.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| GET    | `/administration/settings/technical-logs`                             | §98      | [BE-126](BE-126.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |
| PATCH  | `/administration/settings/technical-logs`                             | §99      | [BE-126](BE-126.md)                                                                                                                               | Inertia/Web atau JSON spesifik sesuai source; exact fixture owner |

## Kontrak umum dan transisi

Server reauthorizes setiap read/mutation. Review/Approval tidak memakai Team match; request id scoped ke parent. Katalog exact status codes/reasons/permissions di bawah wajib dites pada owner, bukan cukup FE hidden button.

## 12 §4 — Hybrid HTTP Model — Confirmed

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 86.

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

## 12 §5 — Authentication, Session, and CSRF

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 139.

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

## 12 §6 — Content Types

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 182.

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

## 12 §8 — Standard JSON Success Envelope

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 331.

Structured JSON endpoint SHOULD return:

```json
{ "data": {}, "meta": {} }
```

For lists:

```json
{ "data": [], "meta": { "pagination": {} } }
```

Warnings that do not block a successful action are exposed through `meta.warnings` and MUST NOT be used for malware/security failure.

## 12 §9 — Standard JSON Error Envelope — Confirmed

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 349.

All structured JSON errors use:

```json
{
    "code": "NSCMF_VERSION_CONFLICT",
    "message": "A newer version of this record exists.",
    "errors": {},
    "context": {}
}
```

MUST NOT include stack traces, SQL, absolute filesystem paths, private storage keys, signing key information, raw ClamAV internals, session payload, password, temporary-password plaintext, or secret token.

### 9.1 Validation example

```json
{
    "code": "VALIDATION_FAILED",
    "message": "Some fields need to be corrected.",
    "errors": { "change.service_impacts": ["Select at least one Service Impact."] },
    "context": {}
}
```

### 9.2 Version conflict example

```json
{
    "code": "NSCMF_VERSION_CONFLICT",
    "message": "A newer version of this record exists. Refresh the record before saving again.",
    "errors": {},
    "context": { "latest_record_version": 14, "current_business_status": "PENDING_REVIEW" }
}
```

Context is returned only after authorization confirms the actor may know the record.

## 12 §10 — Inertia Error Mapping

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 390.

Inertia routes do not need JSON envelopes for every response.

- field errors → validation error bag;
- domain/action error → shared/flash `domain_error` using the same stable code/safe semantics;
- successful POST/PATCH workflow form → `303 See Other` to canonical latest page;
- latest server state MUST be rendered after redirect.

## 12 §11 — HTTP Status Semantics

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 401.

|                        HTTP | Meaning                                                        |
| --------------------------: | -------------------------------------------------------------- |
|                    `200 OK` | successful read/update or idempotent accepted replay           |
|               `201 Created` | synchronously created resource                                 |
|              `202 Accepted` | asynchronous work accepted/queued                              |
|            `204 No Content` | successful action with no response body                        |
|             `303 See Other` | successful Inertia form/action redirect                        |
|           `400 Bad Request` | malformed request not fitting structured validation            |
|          `401 Unauthorized` | session absent/expired/revoked                                 |
|             `403 Forbidden` | authenticated but action/resource/security precondition denied |
|             `404 Not Found` | resource unavailable or intentionally undisclosed              |
|              `409 Conflict` | version/state/idempotency/resource-state conflict              |
|                  `410 Gone` | temporary resource expired                                     |
|  `422 Unprocessable Entity` | validation failure                                             |
|     `429 Too Many Requests` | throttle/rate/resource-abuse control                           |
| `500 Internal Server Error` | safe generic unexpected failure                                |
|   `503 Service Unavailable` | required subsystem unavailable where fail-closed applies       |

Do not return `200` for failed domain mutation.

## 12 §12 — Core Error Code Catalog

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 425.

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

## 12 §13 — Pagination — Confirmed

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 511.

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

## 12 §14 — Sorting

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 529.

```text
sort=<whitelisted_field>
direction=asc|desc
```

Unknown/non-whitelisted sort fields reject; raw SQL expression from query params forbidden.

## 12 §15 — Common Record Filters

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 538.

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

## 12 §16 — Common Sort Whitelist

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 556.

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

## 12 §17 — Server Is Always Authoritative

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 574.

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

## 12 §18 — Permission-Centric Runtime

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 593.

API MUST use explicit permissions from `04`, including NSCMF, administration, audits, and `system.settings.manage`.

API MUST NOT authorize normal actions by hard-coded role names when permission exists, except the additional protected identity invariant where a setting is explicitly **Protected Superadmin-only**.

## 12 §19 — Forbidden Authorization Inputs

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 599.

Client MUST NOT send/influence:

```text
reviewer_scope
approval_scope
unit_id
division_id
permission_team_id
spatie_team_id
```

## 12 §20 — Server-Managed Fields

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 612.

Generic form update MUST not expose business status, owner/team source-of-truth changes, requested/reviewed/approved fields, archive metadata, audit actor/timestamp, attachment hash/security/storage locator, export snapshot/status, issuance/signing fields, protected Superadmin flags, or settings audit actor.

`record_version` is only expected-current precondition, never client-selected next version.

## 12 §21 — `record_version`

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 622.

Draft/Revision/Result require current expected version. Successful mutation increments atomically. Mismatch → `409 NSCMF_VERSION_CONFLICT`.

Workflow/lifecycle actions additionally use DB row lock/current-state revalidation and MUST send current browser `record_version` as stale-UI precondition.

## 12 §22 — No Universal Idempotency Key

Owner: [BE-023](BE-023.md). Source [12](../project_doc/12_API_Contract.md), baris 628.

Domain-specific idempotency:

- chunks → session + index + server hash;
- workflow race → locked state/version;
- numbering → sequence/unique;
- export retry → new immutable export request/snapshot.

## 12 §23 — Summary

Owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-087](BE-087.md). Source [12](../project_doc/12_API_Contract.md), baris 641.

Representative:

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
    "owner": { "id": 19, "name": "Example User" },
    "team": { "id": 3, "name": "Team NOC" },
    "created_at": "2026-08-22T09:00:00+07:00",
    "updated_at": "2026-08-22T10:15:00+07:00"
}
```

Team is display/business metadata only.

## 12 §24 — Detail

Owner: [BE-054](BE-054.md), [BE-060](BE-060.md), [BE-087](BE-087.md). Source [12](../project_doc/12_API_Contract.md), baris 664.

Extends summary with requested/reviewed/approved sign-off, workflow iteration, and server-derived `allowed_actions`. `allowed_actions` is UI hint, never authorization token.

## 12 §25 — Create NSCMF

Owner: [BE-047](BE-047.md). Source [12](../project_doc/12_API_Contract.md), baris 672.

```http
POST /nscmf
```

Mode: Inertia/Web mutation.

Permission `nscmf.create`; active authenticated user; valid active Team; family/subtype and numbering valid. Team captured from current user and is not supplied as authorization input.

Request:

```json
{ "family": "CHANGE", "subtype": "MAINTENANCE", "numbering_mode": "AUTOMATIC", "request_no": null }
```

Success: `303` to `/nscmf/{record}/edit`.

## 12 §30 — Submit / Resubmit

Owner: [BE-064](BE-064.md), [BE-065](BE-065.md). Source [12](../project_doc/12_API_Contract.md), baris 940.

```http
POST /nscmf/{record}/submit
```

```text
DRAFT → PENDING_REVIEW
REVISION_REQUIRED → PENDING_REVIEW
```

Ownership required. First successful Submit establishes iteration 1 and Requested By; Resubmit same iteration.

## 12 §31 — Cancel Draft

Owner: [BE-077](BE-077.md). Source [12](../project_doc/12_API_Contract.md), baris 953.

```http
POST /nscmf/{record}/cancel
```

Eligible own never-submitted Draft; destination always CANCELLED; optional reason.

## 12 §32 — Reviewer Forward

Owner: [BE-070](BE-070.md). Source [12](../project_doc/12_API_Contract.md), baris 961.

```http
POST /nscmf/{record}/review/forward
```

`nscmf.review.forward + PENDING_REVIEW + action validation`. Change requires one complete Result row/all started complete. Destination PENDING_APPROVAL. Actor becomes effective Reviewed By.

## 12 §33 — Reviewer Return

Owner: [BE-068](BE-068.md). Source [12](../project_doc/12_API_Contract.md), baris 969.

```http
POST /nscmf/{record}/review/return
```

Mandatory reason. Destination REVISION_REQUIRED.

## 12 §34 — Reviewer Reject

Owner: [BE-069](BE-069.md). Source [12](../project_doc/12_API_Contract.md), baris 977.

```http
POST /nscmf/{record}/review/reject
```

Mandatory reason. Destination REJECTED.

## 12 §35 — Approver Approve

Owner: [BE-074](BE-074.md). Source [12](../project_doc/12_API_Contract.md), baris 985.

```http
POST /nscmf/{record}/approval/approve
```

`nscmf.approve + PENDING_APPROVAL + current effective Review + all prerequisites`. Destination APPROVED. One successful Approve final for iteration.

## 12 §36 — Approver Return Reviewer

Owner: [BE-071](BE-071.md). Source [12](../project_doc/12_API_Contract.md), baris 993.

```http
POST /nscmf/{record}/approval/return-reviewer
```

Mandatory reason; destination PENDING_REVIEW; clears current effective Reviewed By/At requiring fresh Forward.

## 12 §37 — Approver Return Requester

Owner: [BE-072](BE-072.md). Source [12](../project_doc/12_API_Contract.md), baris 1001.

```http
POST /nscmf/{record}/approval/return-requester
```

Mandatory reason; destination REVISION_REQUIRED; Resubmit returns to Review.

## 12 §38 — Approver Reject

Owner: [BE-073](BE-073.md). Source [12](../project_doc/12_API_Contract.md), baris 1009.

```http
POST /nscmf/{record}/approval/reject
```

Mandatory reason; destination REJECTED.

## 12 §39 — Reason / Comment Rules

Owner: [BE-080](BE-080.md). Source [12](../project_doc/12_API_Contract.md), baris 1017.

Mandatory reasons: Reviewer Return/Reject, Approver Returns/Reject, Reopen, Archive, Unarchive. Trimmed minimum 5 meaningful chars, maximum 2000. Forward/Approve comment optional max2000. Cancel reason optional.

## 12 §40 — Reopen

Owner: [BE-078](BE-078.md). Source [12](../project_doc/12_API_Contract.md), baris 1025.

```http
POST /nscmf/{record}/reopen
```

Source Approved/Rejected, not archived, `nscmf.reopen`, authorized access, mandatory reason. Destination only `REVISION_REQUIRED|PENDING_REVIEW`. Success creates next iteration. CANCELLED never reopen.

## 12 §41 — Archive

Owner: [BE-079](BE-079.md). Source [12](../project_doc/12_API_Contract.md), baris 1033.

```http
POST /nscmf/{record}/archive
```

`nscmf.archive + authorized + APPROVED|REJECTED|CANCELLED + not archived + reason`. Status unchanged.

## 12 §42 — Unarchive

Owner: [BE-079](BE-079.md). Source [12](../project_doc/12_API_Contract.md), baris 1041.

```http
POST /nscmf/{record}/unarchive
```

`nscmf.archive + authorized + archived + reason`. Status unchanged.

## 12 §45 — Review Queue

Owner: [BE-066](BE-066.md). Source [12](../project_doc/12_API_Contract.md), baris 1071.

`PENDING_REVIEW` candidates permission/resource-driven, not Team-scoped. Team may be informational filter only.

## 12 §46 — Approval Queue

Owner: [BE-067](BE-067.md). Source [12](../project_doc/12_API_Contract.md), baris 1075.

`PENDING_APPROVAL`, shared/non-exclusive. First valid locked action wins.

## 12 §47 — History

Owner: [BE-086](BE-086.md). Source [12](../project_doc/12_API_Contract.md), baris 1079.

Uses `nscmf.view.history + resource visibility`. Archived is separate flag/filter.

## 12 §48 — Business Timeline

Owner: [BE-084](BE-084.md). Source [12](../project_doc/12_API_Contract.md), baris 1083.

```http
GET /nscmf/{record}/timeline
```

Business mutation/workflow evidence only; routine View/download/export access not mixed in.

## 12 §49 — Privileged Access Audit

Owner: [BE-085](BE-085.md). Source [12](../project_doc/12_API_Contract.md), baris 1091.

```http
GET /administration/audits/access
```

Read-only. No delete/purge route.

## 12 §50 — Privileged Security Audit

Owner: [BE-085](BE-085.md). Source [12](../project_doc/12_API_Contract.md), baris 1099.

```http
GET /administration/audits/security
```

Read-only; no secrets.

## 12 §51 — Attachment Eligibility / Limits

Owner: [BE-092](BE-092.md). Source [12](../project_doc/12_API_Contract.md), baris 1111.

Editable context only according to `06`; optional; max10; max20MB; zero-byte reject; locked allowlist.

## 12 §52 — Initiate / Resume

Owner: [BE-092](BE-092.md). Source [12](../project_doc/12_API_Contract.md), baris 1115.

```http
POST /nscmf/{record}/attachment-uploads
```

Client fingerprint SHA-256 is resume hint only. Server owns session match/progress state.

Response includes upload ID, resumed flag, 5 MiB chunk size, accepted/missing chunks, expiry.

## 12 §53 — Inspect Session

Owner: [BE-093](BE-093.md). Source [12](../project_doc/12_API_Contract.md), baris 1125.

```http
GET /nscmf/{record}/attachment-uploads/{upload_id}
```

Returns safe transport state only; no storage key.

## 12 §54 — Chunk Indexing

Owner: [BE-093](BE-093.md). Source [12](../project_doc/12_API_Contract.md), baris 1133.

1-based indexes. Default/locked chunk size `5,242,880` bytes. Final chunk = exact remainder.

## 12 §55 — Upload Chunk

Owner: [BE-094](BE-094.md). Source [12](../project_doc/12_API_Contract.md), baris 1137.

```http
PUT /nscmf/{record}/attachment-uploads/{upload_id}/chunks/{chunk_index}
Content-Type: application/octet-stream
```

Server streams to private persistent storage, computes chunk SHA-256, persists accepted metadata after write success.

Byte-identical accepted-index replay → `200 duplicate=true`; different bytes → `409 UPLOAD_CHUNK_CONFLICT`.

New progress refreshes 24h inactivity anchor; pure duplicate replay SHOULD NOT extend indefinitely.

## 12 §56 — Complete Upload

Owner: [BE-096](BE-096.md), [BE-098](BE-098.md). Source [12](../project_doc/12_API_Contract.md), baris 1150.

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

## 12 §57 — Upload Lifecycle

Owner: [BE-096](BE-096.md), [BE-098](BE-098.md). Source [12](../project_doc/12_API_Contract.md), baris 1167.

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

Technical only.

## 12 §58 — Attachment Security Lifecycle

Owner: [BE-096](BE-096.md), [BE-098](BE-098.md). Source [12](../project_doc/12_API_Contract.md), baris 1180.

```text
PENDING
CLEAN
INFECTED
FAILED
```

Only CLEAN usable/downloadable.

## 12 §59 — Poll Final Attachment

Owner: [BE-099](BE-099.md). Source [12](../project_doc/12_API_Contract.md), baris 1191.

```http
GET /nscmf/{record}/attachments/{attachment}
```

No raw storage path or scanner internals in end-user DTO.

## 12 §60 — Cancel Unfinished Upload

Owner: [BE-095](BE-095.md), [BE-128](BE-128.md). Source [12](../project_doc/12_API_Contract.md), baris 1199.

```http
DELETE /nscmf/{record}/attachment-uploads/{upload_id}
```

## 12 §61 — Incomplete Upload Retention

Owner: [BE-095](BE-095.md), [BE-128](BE-128.md). Source [12](../project_doc/12_API_Contract.md), baris 1205.

24 hours since last successful newly accepted progress. Expired → `410 UPLOAD_SESSION_EXPIRED`.

## 12 §62 — Remove Final Attachment

Owner: [BE-100](BE-100.md). Source [12](../project_doc/12_API_Contract.md), baris 1209.

```http
DELETE /nscmf/{record}/attachments/{attachment}
```

Logical business removal with audit; historical metadata preserved.

## 12 §63 — Download Attachment

Owner: [BE-099](BE-099.md). Source [12](../project_doc/12_API_Contract.md), baris 1217.

```http
GET /nscmf/{record}/attachments/{attachment}/download
```

Authorized parent + belongs + not removed + CLEAN + private binary available. Storage key never grants permission.

Current storage backend is opaque to the HTTP contract. Initial production uses private persistent Laravel local storage, but API MUST NOT expose absolute host paths or rely on storage backend semantics for authorization.

## 12 §64 — Formats

Owner: [BE-108](BE-108.md). Source [12](../project_doc/12_API_Contract.md), baris 1231.

Exactly XLSX/PDF, asynchronous, immutable snapshot bound at request time.

## 12 §65 — Single Export

Owner: [BE-108](BE-108.md). Source [12](../project_doc/12_API_Contract.md), baris 1235.

```http
POST /nscmf/{record}/exports
```

Request:

```json
{ "format": "PDF" }
```

Server authorizes, creates request + immutable snapshot bound to record version/workflow iteration/template version, commits, dispatches after commit. `202 Accepted`.

## 12 §66 — Export Status

Owner: [BE-109](BE-109.md). Source [12](../project_doc/12_API_Contract.md), baris 1249.

```text
QUEUED
PROCESSING
READY
FAILED
EXPIRED
```

## 12 §67 — Poll Export

Owner: [BE-110](BE-110.md), [BE-117](BE-117.md). Source [12](../project_doc/12_API_Contract.md), baris 1259.

```http
GET /nscmf/exports/{export}
```

READY response includes safe metadata, `expires_at`, and signed indicator where applicable.

## 12 §68 — Approved PDF Signing Failure

Owner: [BE-110](BE-110.md), [BE-117](BE-117.md). Source [12](../project_doc/12_API_Contract.md), baris 1267.

Approved snapshot + signing failure → export FAILED; NSCMF remains APPROVED; no unsigned READY artifact; no issuance success row.

## 12 §69 — Download Export

Owner: [BE-110](BE-110.md), [BE-117](BE-117.md). Source [12](../project_doc/12_API_Contract.md), baris 1271.

```http
GET /nscmf/exports/{export}/download
```

Requires related-record authorization + `nscmf.export` + READY + unexpired binary. Generated binary retained exactly 168h/7d.

## 12 §70 — Retry

Owner: [BE-110](BE-110.md), [BE-117](BE-117.md). Source [12](../project_doc/12_API_Contract.md), baris 1279.

Failed/expired retry creates new export request and new immutable then-current snapshot.

## 12 §71 — Bulk Export

Owner: [BE-112](BE-112.md). Source [12](../project_doc/12_API_Contract.md), baris 1283.

```http
POST /nscmf/exports/bulk
GET  /nscmf/export-batches/{batch}
```

Each record independently authorized. ZIP/combined package remains intentionally unresolved; no fake package artifact contract.

## 12 §72 — Page

Owner: [BE-121](BE-121.md), [BE-120](BE-120.md). Source [12](../project_doc/12_API_Contract.md), baris 1296.

```http
GET /ispdfvalid
```

No login. Narrow verification utility only.

## 12 §73 — Verify PDF

Owner: [BE-121](BE-121.md), [BE-120](BE-120.md). Source [12](../project_doc/12_API_Contract.md), baris 1304.

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

## 12 §74 — Validator Outcomes

Owner: [BE-121](BE-121.md), [BE-120](BE-120.md). Source [12](../project_doc/12_API_Contract.md), baris 1335.

Exactly:

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

## 12 §75 — Validator Response / Disclosure

Owner: [BE-121](BE-121.md), [BE-120](BE-120.md). Source [12](../project_doc/12_API_Contract.md), baris 1346.

Recognized valid/superseded MAY expose Request No, family, issued_at, issuer System/Organization. Invalid/Unknown minimize disclosure. Never expose Requester/Reviewer/Approver/Team/form body/attachments/timeline/raw audits/storage paths/key internals.

## 12 §78 — Mandatory Temporary Password Change

Owner: [BE-036](BE-036.md). Source [12](../project_doc/12_API_Contract.md), baris 1370.

```http
POST /account/temporary-password/change
```

Only when `must_change_password=true`. New password min6/no composition/no MFA. Success hashes new password, clears gate, applies session security, Security Audits safely.

## 12 §79 — Sensitive-Action Re-authentication — 15 Minutes

Owner: [BE-031](BE-031.md). Source [12](../project_doc/12_API_Contract.md), baris 1378.

```http
POST /account/re-authenticate
```

Request:

```json
{ "current_password": "secret" }
```

Successful proof:

```text
server-side/session-bound
valid for 15 minutes
no plaintext reusable proof returned to JavaScript
```

Failure → `403 REAUTH_FAILED`; missing/expired proof → `403 REAUTH_REQUIRED`.

Every protected action still repeats normal authorization checks.

## 12 §81 — Create User — Server-Generated One-Time Temporary Password

Owner: [BE-039](BE-039.md), [BE-034](BE-034.md). Source [12](../project_doc/12_API_Contract.md), baris 1414.

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
    "name": "Example User",
    "username": "example.user",
    "team_id": 3,
    "role_ids": [2]
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

## 12 §85 — Reset User Password — Server-Generated One-Time Temporary Password

Owner: [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md). Source [12](../project_doc/12_API_Contract.md), baris 1503.

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

## 12 §87 — Assign User Team

Owner: [BE-040](BE-040.md), [BE-034](BE-034.md), [BE-037](BE-037.md). Source [12](../project_doc/12_API_Contract.md), baris 1555.

```http
PUT /administration/users/{user}/team
```

Uses canonical policy mapping from `04`; Team change does not grant/revoke Review/Approval, recalculate permission, revoke sessions solely due Team, or rewrite historical record Team metadata.

## 12 §98 — Read Technical Log Cleanup Setting

Owner: [BE-126](BE-126.md). Source [12](../project_doc/12_API_Contract.md), baris 1660.

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

## 12 §99 — Update Technical Log Cleanup Setting

Owner: [BE-126](BE-126.md). Source [12](../project_doc/12_API_Contract.md), baris 1690.

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

## 12 §100 — Authentication Props

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1735.

Safe shared auth context may include user, Team display, effective permissions, must-change-password flag. No password hash/session payload/signing private key/Team authorization scope.

## 12 §101 — Record Action Props

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1739.

Server-derived `allowed_actions` is presentation hint only; action endpoints reauthorize.

## 12 §102 — IDOR / Resource Not Found

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1743.

Unauthorized resource existence SHOULD be concealed with 404 where appropriate; admin contexts may use 403 when existence is legitimately known.

## 12 §103 — CSRF

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1747.

All authenticated state-changing browser routes retain Laravel CSRF. Do not globally disable.

## 12 §104 — CORS

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1751.

No wildcard credentialed CORS.

## 12 §105 — Cache Controls

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1755.

Sensitive authenticated JSON, one-time temporary-password responses, public verification results, and private downloads use safe no-store/private controls appropriate to content.

**One-time temporary-password response MUST be `Cache-Control: no-store` (or equivalently non-cacheable) and MUST NOT be persisted in browser/server application caches.**

## 12 §106 — Mass Assignment

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1761.

Request-specific whitelist/Form Request only. No `$request->all() → Model::update()` for protected/business/security fields.

## 12 §107 — Safe Logging

Owner: [BE-023](BE-023.md), [BE-141](BE-141.md). Source [12](../project_doc/12_API_Contract.md), baris 1765.

Must redact/avoid passwords/current/new/temp, session cookie/payload, private signing key/passphrase, secrets, raw files/chunks, unnecessary private storage locators, and one-time temporary-password response bodies.

Technical Logs may record safe IDs/stage/duration/status/sanitized failure category. Their retention is controlled separately by the protected setting; retention length never makes secret logging acceptable.

## 05 §14 — Transition Matrix

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 285.

| From                | Action           | To                  | Core Permission                   | Key Preconditions                         |
| ------------------- | ---------------- | ------------------- | --------------------------------- | ----------------------------------------- |
| `DRAFT`             | Submit           | `PENDING_REVIEW`    | `nscmf.submit`                    | owns record + validation                  |
| `DRAFT`             | Cancel           | `CANCELLED`         | `nscmf.cancel`                    | owns record + never submitted             |
| `PENDING_REVIEW`    | Return           | `REVISION_REQUIRED` | `nscmf.review.return`             | current state + mandatory reason          |
| `PENDING_REVIEW`    | Reject           | `REJECTED`          | `nscmf.review.reject`             | current state + mandatory reason          |
| `PENDING_REVIEW`    | Forward          | `PENDING_APPROVAL`  | `nscmf.review.forward`            | current state + Forward gate              |
| `REVISION_REQUIRED` | Resubmit         | `PENDING_REVIEW`    | `nscmf.submit`                    | owns record + validation                  |
| `PENDING_APPROVAL`  | Return Reviewer  | `PENDING_REVIEW`    | `nscmf.approval.return_reviewer`  | current state + mandatory reason          |
| `PENDING_APPROVAL`  | Return Requester | `REVISION_REQUIRED` | `nscmf.approval.return_requester` | current state + mandatory reason          |
| `PENDING_APPROVAL`  | Reject           | `REJECTED`          | `nscmf.approval.reject`           | current state + mandatory reason          |
| `PENDING_APPROVAL`  | Approve          | `APPROVED`          | `nscmf.approve`                   | review prerequisite + current state       |
| `REJECTED`          | Reopen           | `REVISION_REQUIRED` | `nscmf.reopen`                    | authorized access + not archived + reason |
| `REJECTED`          | Reopen           | `PENDING_REVIEW`    | `nscmf.reopen`                    | authorized access + not archived + reason |
| `APPROVED`          | Reopen/Revert    | `REVISION_REQUIRED` | `nscmf.reopen`                    | authorized access + not archived + reason |
| `APPROVED`          | Reopen/Revert    | `PENDING_REVIEW`    | `nscmf.reopen`                    | authorized access + not archived + reason |

No Team, Unit, Division, Reviewer Scope, or Approval Scope column exists.

## 05 §16 — Iteration Definition

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 327.

Workflow iteration distinguishes a completed/reopened approval lifecycle from ordinary return/revision loops.

### STATE-ITER-001 — First Submit

First successful Submit establishes **workflow iteration 1**.

### STATE-ITER-002 — Same Iteration Events

The following stay in the current workflow iteration:

- Reviewer Return;
- Requester Revision;
- Resubmit;
- Approver Return to Reviewer;
- Approver Return to Requester;
- repeated Review/Approval movement before terminal Rejected/Approved outcome.

### STATE-ITER-003 — Reopen Creates Next Iteration

Successful Reopen from `REJECTED` or `APPROVED` creates the next workflow iteration.

Example:

```text
First Submit → Iteration 1
Return → Revision → Resubmit → still Iteration 1
Approved → Reopen → Iteration 2
Approved → Reopen → Iteration 3
```

### STATE-ITER-004 — Historical Evidence

Old iteration Review/Approval/Rejection/sign-off/issued-PDF evidence MUST remain attributable to its original iteration.

This rule enables a genuine older signed PDF to become `VALID_SUPERSEDED` rather than being misclassified as modified.

## 05 §17 — Unlimited Revision

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 365.

No fixed maximum revision loop.

## 05 §18 — Approver Return to Requester

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 369.

```text
PENDING_APPROVAL
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
```

Same workflow iteration until terminal outcome/Reopen.

## 05 §19 — Approver Return to Reviewer

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 382.

```text
PENDING_APPROVAL -> PENDING_REVIEW
```

Requester general form remains locked.

## 05 §20 — Reviewer Continuity

Owner: [BE-080](BE-080.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 390.

Reviewer continuity is metadata/audit context, not exclusive authorization. Any actor with required Review permission remains eligible when current state permits.

## 05 §21 — Reopen Rules

Owner: [BE-079](BE-079.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 394.

Only `REJECTED`, `APPROVED` are Reopen-eligible. `CANCELLED` never.

Destination only:

1. `REVISION_REQUIRED`
2. `PENDING_REVIEW`

No `DRAFT` or `PENDING_APPROVAL` target.

Successful Reopen requires required permission, authorized record access, not archived, mandatory reason, valid destination, current-state recheck, and starts a new workflow iteration.

## 05 §22 — Archive

Owner: [BE-079](BE-079.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 407.

Archive independent from business status:

```text
business_status = <canonical state>
is_archived = false|true
```

Only `APPROVED`, `REJECTED`, `CANCELLED` can archive.

Archive/Unarchive require `nscmf.archive`, authorized record access, mandatory reason, state/flag validity.

Team is not an archive visibility rule.

## 05 §27 — Reviewer Race

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 460.

Several permission-eligible Reviewers may open same candidate. First valid transition wins through row-lock/current-state transaction. Later stale conflicting Reviewer action fails.

## 05 §28 — Approver Race

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 464.

Several permission-eligible Approvers may open same candidate. First valid final Approve changes state to Approved; later stale Approver actions fail. Only successful actor is `Approved By` for that iteration.

## 05 §29 — Atomic Transition

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 468.

Conceptually:

```text
required permission
+ authorized resource/ownership where applicable
+ archive state
+ current state
+ action validation
+ destination
+ state mutation
+ required Business Audit
```

occurs as one consistent workflow action.

No Team/scope check.

## 05 §30 — State Editability

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 491.

| State               | General Requester Edit | Change Result Narrow Edit | Save Draft |     Reviewer Actions |     Approver Actions | Reopen | Archive |
| ------------------- | ---------------------: | ------------------------: | ---------: | -------------------: | -------------------: | -----: | ------: |
| `DRAFT`             |                Yes own |               normal form |        Yes |                   No |                   No |     No |      No |
| `PENDING_REVIEW`    |                     No |        Yes eligible owner | No general | Yes permission-based |                   No |     No |      No |
| `REVISION_REQUIRED` |                Yes own |               normal form |        Yes |                   No |                   No |     No |      No |
| `PENDING_APPROVAL`  |                     No |                        No |         No |                   No | Yes permission-based |     No |      No |
| `REJECTED`          |                     No |                        No |         No |                   No |                   No |    Yes |     Yes |
| `APPROVED`          |                     No |                        No |         No |                   No |                   No |    Yes |     Yes |
| `CANCELLED`         |                     No |                        No |         No |                   No |                   No |  Never |     Yes |

## 05 §31 — Forbidden Transitions

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 503.

```text
DRAFT -> PENDING_APPROVAL
DRAFT -> APPROVED
PENDING_REVIEW -> DRAFT
PENDING_REVIEW -> APPROVED
REVISION_REQUIRED -> PENDING_APPROVAL
REVISION_REQUIRED -> APPROVED
PENDING_APPROVAL -> DRAFT
PENDING_APPROVAL -> APPROVED without valid Approver action
REJECTED -> DRAFT
REJECTED -> PENDING_APPROVAL via Reopen
APPROVED -> DRAFT
APPROVED -> PENDING_APPROVAL via Reopen
CANCELLED -> any business state
```

View never creates `UNDER_REVIEW`/assignment state.

## 05 §32 — Server-Side Transition Evaluation

Owner: [BE-078](BE-078.md), [BE-065](BE-065.md), [BE-074](BE-074.md). Source [05](../project_doc/05_State_Status_Flow.md), baris 527.

```text
1. authenticated + active session?
2. protected invariant satisfied?
3. required permission?
4. ownership/resource authorization if applicable?
5. archive flag compatible?
6. current state eligible?
7. action validation/reason valid?
8. destination valid?
9. concurrency/current-state check valid?
10. apply transition atomically.
11. persist required audit evidence.
12. return new state.
```

Team is intentionally excluded from evaluation.
