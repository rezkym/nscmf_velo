# Resumable Attachment Upload — Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-08-22  
> **Status:** Confirmed / Authoritative synchronization until merged into the corresponding source sections  
> **Next Fixed-Order Document:** `12_API_Contract.md`

---

## 1. Purpose

Dokumen ini merekam keputusan final lintas-dokumen yang muncul sebelum penulisan `12_API_Contract.md`, terutama mengenai **resumable/chunk attachment upload**.

Dokumen ini **tidak menambah business state NSCMF**, tidak mengubah permission model, tidak mengubah workflow Review/Approval, dan tidak mengubah fixed project-document sequence. Ia berfungsi sebagai synchronization addendum untuk memastikan dokumen 01–11 dan API Contract berikutnya menggunakan rule yang sama.

Jika terdapat wording lama pada 01–11 yang hanya menggambarkan upload satu-request biasa atau menyatakan third-login behavior masih TBD, rule pada addendum ini menjadi **confirmed newer decision** dan harus dibaca sebagai override sempit untuk concern tersebut.

---

# PART A — CONFIRMED PRODUCT / BUSINESS DECISIONS

## 2. Resumable Attachment Upload Is MVP Scope

Attachment tetap:

- optional;
- maksimum 10 active attachments per NSCMF record;
- maksimum 20 MB per file;
- zero-byte rejected;
- extension/type allowlist tetap mengikuti `06_Validation_Rules.md` dan `10_Security_Rules.md`;
- private storage only;
- explicit full-file ClamAV `CLEAN` tetap mandatory sebelum attachment usable.

Tambahan confirmed capability:

> Upload attachment MUST dapat dilanjutkan dari chunk yang sudah berhasil diterima ketika terjadi recoverable TCP/network/application interruption, selama upload session belum expired dan durable private storage/database masih tersedia.

User tidak diwajibkan mengulang file dari byte zero hanya karena koneksi terputus setelah sebagian chunk berhasil diterima.

## 3. Fixed Chunk Size

Default attachment chunk size:

```text
5 MiB = 5 × 1024 × 1024 bytes
```

Final chunk MAY lebih kecil.

Karena current maximum file size adalah 20 MB, desain ini sengaja tetap sederhana dan tidak menjadi alasan untuk memperkenalkan upload microservice, Redis, Kafka, atau distributed orchestration tambahan pada MVP.

## 4. Incomplete Upload Retention

Unfinished upload session disimpan selama:

```text
24 hours since last successful upload activity
```

Setiap successful accepted chunk memperbarui `last_activity_at`/expiry anchor.

Setelah melewati retention:

- upload session menjadi expired;
- temporary chunk objects dibersihkan scheduler;
- incomplete upload tidak menjadi attachment;
- cleanup ini tidak menghapus Business/Access/Security Audit yang authoritative.

Retention 24 jam ini berbeda dari generated export binary retention **168 jam / 7 hari**.

## 5. Resume UX

Ketika user memilih kembali file yang sama dan sistem menemukan eligible unfinished upload session:

- frontend memberi informasi yang jelas bahwa upload sebelumnya ditemukan;
- upload dilanjutkan dari accepted/missing chunk state server;
- hanya missing chunks yang dikirim ulang;
- user tidak perlu memahami nomor chunk secara manual.

Canonical user-facing intent:

> `Upload sebelumnya ditemukan, melanjutkan dari bagian terakhir.`

Exact wording dapat disempurnakan oleh UI copy, tetapi behavior tidak berubah.

---

# PART B — ARCHITECTURE / DATA OWNERSHIP

## 6. Transport Boundary

Current MVP direction:

```text
Browser
  ↓ HTTPS chunk request
Laravel Application
  ↓ streamed private write
Private Storage
```

Laravel tetap menjadi authentication, authorization, validation, and security gate.

Direct browser-to-S3 presigned multipart upload bukan current MVP requirement.

## 7. Durable Progress

Production accepted chunks MUST NOT hanya bergantung pada ephemeral application-server local filesystem.

Authoritative split:

```text
MySQL
→ upload session metadata
→ accepted chunk metadata
→ ownership / record / status / expiry metadata

Private durable storage
→ temporary chunk bytes
→ assembled quarantine bytes

Browser
→ local UI progress
→ client fingerprint hint
```

Jika Laravel process/server restart:

- sistem tidak bisa menerima chunk saat service unavailable;
- setelah service pulih, unexpired accepted progress MUST dapat dipakai kembali jika MySQL/private storage tetap sehat;
- progress yang sudah acknowledged tidak otomatis hilang hanya karena process restart.

## 8. Upload Session Lifecycle

Technical upload lifecycle:

```text
UPLOADING
ASSEMBLING
COMPLETED
EXPIRED
CANCELLED
FAILED
```

Ini **bukan NSCMF business status**.

Canonical NSCMF business status tetap hanya:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Perbedaan nama `CANCELLED` pada upload session dan business status harus dibedakan secara domain/table/context dan tidak boleh dicampur oleh coding agent/API/UI.

## 9. Attachment Security Lifecycle

Security lifecycle attachment tetap terpisah:

```text
PENDING
CLEAN
INFECTED
FAILED
```

Contoh valid:

```text
upload lifecycle   = COMPLETED
security lifecycle = PENDING
```

Artinya file sudah lengkap secara transport tetapi **belum usable** karena whole-file malware result belum explicit `CLEAN`.

---

# PART C — FILE IDENTITY / INTEGRITY

## 10. Client Fingerprint

Browser SHOULD compute SHA-256 of the selected file to help discover an unfinished same-file upload session.

Client-provided fingerprint:

- is untrusted input;
- MAY be combined with filename, file size, user/record binding, and other server-side checks for resume discovery;
- MUST NOT become authoritative final attachment hash;
- MUST NOT bypass chunk validation, assembly validation, or malware scanning.

## 11. Authoritative SHA-256

After complete assembly, server MUST compute SHA-256 over the assembled final bytes.

Only server-computed hash becomes authoritative `nscmf_attachments.sha256` (or equivalent final attachment integrity field).

If declared metadata/chunk set/final byte size is inconsistent, finalization fails.

---

# PART D — CHUNK VALIDATION / IDEMPOTENCY

## 12. Chunk Acceptance

Each chunk request MUST be bound to an authorized upload session and validated server-side.

At minimum server validates:

- current authenticated actor/session;
- related NSCMF record authorization and eligible attachment-edit state/rule;
- upload session ownership/binding;
- upload session not expired/cancelled/failed/completed in an incompatible way;
- valid chunk index/range;
- expected chunk geometry;
- chunk byte length (final chunk exception allowed);
- declared file size does not exceed 20 MB;
- storage write success before acknowledging acceptance.

## 13. Idempotent Retry

Recoverable transport ambiguity is expected. Example:

```text
server stores chunk successfully
→ response is lost because TCP connection drops
→ browser does not know whether server accepted it
→ browser retries same chunk
```

API implementation MUST make this safe.

An already accepted identical chunk retry MUST NOT create duplicate logical progress or corrupt the assembled file.

A conflicting different payload for an already accepted chunk index MUST be rejected rather than silently overwriting accepted bytes.

Exact chunk checksum/wire semantics are finalized in `12_API_Contract.md`.

## 14. Server Progress Is Authoritative

Frontend MUST NOT infer resume state solely from local browser progress.

On resume, server reports accepted/missing chunk state. Browser sends only chunks that server considers missing/retry-required.

---

# PART E — ASSEMBLY / MALWARE

## 15. Complete Request Is Not Automatic Trust

Client calling `complete` means only:

> user/browser believes all chunks have been sent and asks server to validate/finalize.

Server MUST independently verify completeness.

## 16. Assembly Flow

```text
all required chunks accepted
→ validate complete chunk set
→ validate expected total bytes
→ assemble full file in private quarantine
→ server-compute authoritative SHA-256
→ full-file ClamAV scan
→ explicit CLEAN
→ promote/persist final private attachment
```

No incomplete file may become final attachment.

## 17. Whole-File ClamAV Rule

ClamAV MUST scan the **fully assembled file**.

Per-chunk malware scanning:

- is not required for MVP;
- MAY exist later as defense-in-depth;
- MUST NOT replace the full assembled-file scan;
- MUST NOT produce attachment `CLEAN` by aggregating individual chunk results.

Only explicit `CLEAN` on the complete assembled file permits normal use/download.

## 18. Fail Closed

The following do not result in usable attachment:

- incomplete chunks;
- assembly error;
- size/integrity inconsistency;
- storage uncertainty;
- ClamAV unavailable;
- ClamAV timeout;
- scanner error;
- `INFECTED`;
- any result other than explicit whole-file `CLEAN`.

---

# PART F — FAILURE RECOVERY

## 19. Network / TCP Failure

If a chunk was not successfully acknowledged/persisted, it can be retried.

Already accepted chunks remain available until completion/cancel/expiry.

## 20. Application Server Down

No claim is made that upload continues while the application is unavailable.

Confirmed guarantee:

> After service recovery, an unexpired upload session can resume from durable chunks that were already successfully accepted before the outage.

## 21. Storage / DB Failure

- failed storage write MUST NOT mark chunk accepted;
- DB failure MUST NOT create false accepted progress;
- orphan temporary object MUST be compensatable/cleanup-eligible;
- final attachment MUST NOT be exposed until metadata + storage + security state are consistent.

## 22. Scheduler Cleanup

Scheduler MUST clean expired unfinished upload sessions and temporary chunk/assembly objects.

Scheduler MUST NOT:

- modify NSCMF business status due upload expiry;
- delete authoritative audit by age;
- mark an incomplete upload as completed;
- mark malware result CLEAN.

---

# PART G — DATABASE SCHEMA REQUIREMENTS FOR `11`

## 23. Required New Schema Concepts

`11_ERD_Database_Schema.md` must be interpreted as requiring these additional physical schema concepts for resumable attachment transport.

### 23.1 `nscmf_attachment_upload_sessions`

Purpose: authoritative metadata for a resumable attachment upload attempt before a final `nscmf_attachments` row becomes usable.

Recommended physical fields:

```text
id                         BIGINT / primary key
public_id                  UUID/ULID or equivalent non-sequential external identifier
nscmf_record_id            FK -> nscmf_records.id
initiated_by_user_id       FK -> users.id
original_filename          VARCHAR
normalized_extension       VARCHAR
client_declared_mime       VARCHAR nullable
expected_size_bytes        BIGINT
chunk_size_bytes           INT              -- 5 MiB current rule
expected_chunk_count       INT
client_fingerprint_sha256  CHAR(64) nullable -- resume hint only
upload_status              ENUM/string constrained to:
                           UPLOADING | ASSEMBLING | COMPLETED | EXPIRED | CANCELLED | FAILED
last_activity_at           DATETIME
expires_at                 DATETIME
assembly_storage_key       VARCHAR nullable
failure_code               VARCHAR nullable
created_at                 DATETIME
updated_at                 DATETIME
```

Security/authorization rule:

- `public_id`/ID never grants access;
- parent record + actor authorization always rechecked;
- `client_fingerprint_sha256` is never final authoritative hash.

### 23.2 `nscmf_attachment_upload_chunks`

Purpose: authoritative record of successfully accepted chunk indexes.

Recommended physical fields:

```text
id                         BIGINT / primary key
upload_session_id          FK -> nscmf_attachment_upload_sessions.id
chunk_index                INT
size_bytes                 INT
storage_key                VARCHAR
chunk_sha256               CHAR(64) nullable/SHOULD
accepted_at                DATETIME
created_at                 DATETIME
```

Required constraints/index intent:

```text
UNIQUE(upload_session_id, chunk_index)
INDEX(upload_session_id)
INDEX(upload_session_id, accepted_at)
```

A conflicting retransmission MUST NOT overwrite accepted chunk content silently.

### 23.3 Final Attachment Linkage

On successful finalization:

- final `nscmf_attachments` row stores server-computed authoritative SHA-256 and security status;
- upload session SHOULD reference resulting attachment OR final attachment SHOULD reference source upload session, but duplication is unnecessary;
- exact FK direction may follow existing `11` table ownership style;
- final attachment remains the normal business-facing attachment entity;
- chunk/session rows are transport metadata, not a replacement for `nscmf_attachments`.

## 24. Cleanup and Foreign-Key Intent

Expired/cancelled/failed unfinished upload transport metadata MAY be physically removed as temporary technical data after controlled cleanup.

This temporary-data cleanup rule does **not** apply to:

- final `nscmf_attachments` business/security metadata according to its existing lifecycle;
- Business Audit;
- Access Audit;
- Security Audit;
- PDF issuance metadata.

Schema MUST permit deleting temporary chunk metadata/objects without cascading into the parent NSCMF record or authoritative audits.

---

# PART H — VALIDATION RULE SYNCHRONIZATION FOR `06`

## 25. File-Level Rules Remain Final

Existing final attachment validation remains unchanged:

```text
max active attachments / record = 10
max final file size             = 20 MB
zero byte                       = rejected
allowed extensions              = .pdf .xls .xlsx .doc .docx .png .jpg .jpeg .txt .csv
```

## 26. Chunk-Level Rules

A chunk is transport data, not an independent attachment.

Therefore:

- allowed extension/MIME applies to intended final file, not each chunk object name;
- final file size limit applies to declared/assembled final file;
- normal 10-attachment count is applied to final/active attachment semantics, while active upload-session abuse limits MAY be separately rate-limited/security-controlled in `12` without pretending each chunk is an attachment;
- final chunk MAY be smaller than 5 MiB;
- non-final chunk SHOULD equal configured 5 MiB unless exact API contract defines a narrowly justified exception;
- sum of accepted assembled bytes MUST equal expected final size before finalization.

---

# PART I — UI/UX SYNCHRONIZATION FOR `07`

## 27. Required Upload States in UI

UI should distinguish at least:

```text
Uploading
Interrupted / Resume available
Assembling
Scanning
Ready / Clean
Failed
Expired
```

These labels are presentation states and MUST NOT be shown as NSCMF business statuses.

## 28. Progress

Frontend MAY show byte/chunk progress but server remains authority for accepted progress.

After reconnect/reselect:

```text
local progress
→ query server upload session
→ reconcile accepted/missing chunks
→ continue missing chunks
```

## 29. User Failure Messaging

Network interruption SHOULD be recoverable without implying data loss when accepted chunks remain valid.

Examples of intended meaning:

- connection interrupted → `Upload terputus. Bagian yang sudah berhasil disimpan dapat dilanjutkan.`
- resume found → `Upload sebelumnya ditemukan, melanjutkan dari bagian terakhir.`
- expired → explain that temporary upload expired and must restart;
- scanning pending → do not say attachment is safe/ready;
- infected/scan failed → no usable attachment.

Exact copy can be finalized in implementation/UI refinement.

---

# PART J — SECURITY SYNCHRONIZATION FOR `10`

## 30. Untrusted Chunk Inputs

Security must treat as untrusted:

- upload session IDs;
- client fingerprint;
- chunk index;
- chunk size claims;
- chunk bytes;
- original filename/MIME;
- client completion claim.

## 31. No Public Chunk URLs

Temporary chunk objects and assembly objects:

- private only;
- no predictable public URL as authorization;
- never downloadable through normal attachment download endpoint;
- storage key never grants access.

## 32. Authorization Per Upload Operation

Initiate, inspect/resume, upload chunk, complete, and cancel MUST all recheck applicable authenticated user + parent record authorization/state rules server-side.

Knowing an upload `public_id` does not grant access.

## 33. Resource Abuse Controls

API Contract MAY define rate limits/concurrency caps for upload sessions/chunks to protect storage/CPU/ClamAV resources, provided they do not change confirmed business attachment limits.

Protection SHOULD address:

- excessive unfinished sessions;
- repeated invalid chunks;
- oversized requests;
- rapid create/cancel abuse;
- scanner/resource exhaustion.

Exact numeric transport rate limits remain downstream unless explicitly locked later.

## 34. Security Audit / Technical Logging

Routine successful chunk upload should not flood Business Timeline.

Use:

- Technical Logs for normal chunk transport/retry/storage diagnostics;
- Security Audit for malware/security-significant failures or suspicious abuse where appropriate;
- Business Audit only when an actual business-relevant attachment mutation is finalized/removed according to existing audit rules.

---

# PART K — OTHER FINAL DECISIONS LOCKED BEFORE `12`

## 35. Hybrid HTTP Model

Confirmed:

- normal page navigation/forms: Laravel Web Routes + Inertia;
- dedicated structured/JSON endpoints allowed/expected where appropriate for autosave, resumable attachment upload/status, export status, and public PDF validation;
- workflow mutations use explicit domain actions, not a generic status setter.

## 36. Optimistic Concurrency Transport

Confirmed direction for `12`:

```json
{
  "record_version": 12
}
```

`record_version` is transported in request body rather than requiring `If-Match` for current MVP.

Contract documentation MUST be understandable by both human developers/reviewers and coding agents.

## 37. Standard Error Envelope Direction

Confirmed standard direction:

```json
{
  "code": "NSCMF_VERSION_CONFLICT",
  "message": "A newer version of this record exists.",
  "errors": {},
  "context": {}
}
```

- `code`: stable machine-readable error code;
- `message`: human-readable safe explanation;
- `errors`: field validation structure when applicable;
- `context`: safe supplemental machine/human context only.

Exact catalog belongs to `12_API_Contract.md`.

## 38. Pagination Direction

Confirmed:

```text
page-number pagination
page
per_page
default per_page = 25
maximum per_page = 100
explicit sorting/filtering whitelist
```

Applies where appropriate to History, Review Queue, Approval Queue, Users, Roles, Teams, Audit lists, etc.

## 39. Public PDF Validator Disclosure

Current confirmed minimum disclosure:

- verification outcome: `VALID_CURRENT`, `VALID_SUPERSEDED`, `INVALID_MODIFIED`, or `UNKNOWN`;
- Request No only when PDF is recognized;
- form family;
- issuance date;
- issuer = System/Organization;
- do not expose Requester, Reviewer, Approver, Team, attachment data, form body, or audit data.

Exact response keys/wording belong to `12`.

## 40. Third Login Behavior

Maximum active sessions remains 2.

Confirmed third-login behavior:

```text
third valid login
→ succeeds
→ deterministically revoke oldest active authenticated session
→ new login remains active
→ resulting active_session_count <= 2
```

This supersedes earlier wording that third-login replacement-vs-denial was TBD.

Session revocation SHOULD be Security Audited according to existing session/security audit policy without exposing secrets.

---

# PART L — ACCEPTANCE CHECKLIST BEFORE `12_API_Contract.md`

The following are now locked inputs to `12`:

- [x] Hybrid Inertia + dedicated JSON endpoint model.
- [x] Explicit workflow action endpoints; no generic client-driven status mutation.
- [x] Request-body `record_version` optimistic concurrency transport.
- [x] Human-readable + machine-readable standard error envelope.
- [x] Page pagination, default 25, max 100, whitelist sort/filter.
- [x] Resumable attachment upload.
- [x] 5 MiB chunk size.
- [x] 24h unfinished upload retention from last successful activity.
- [x] Server-authoritative accepted/missing chunk state.
- [x] Client SHA-256 fingerprint only for resume discovery.
- [x] Server-computed authoritative final SHA-256.
- [x] Full assembled-file ClamAV scan; fail closed.
- [x] Upload lifecycle separated from attachment security lifecycle and NSCMF business state.
- [x] Private durable temporary storage for production accepted chunks.
- [x] Minimum-disclosure public PDF validator.
- [x] Third login revokes oldest active session.

No `12_API_Contract.md` is created by this synchronization addendum.