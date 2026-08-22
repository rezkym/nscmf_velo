# Environment Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ENV-014  
> **Document Order:** 14 / 20  
> **Status:** Draft — Authoritative Environment / Runtime Configuration Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`, `11_ERD_Database_Schema.md`, `12_API_Contract.md`, `13_Project_Structure.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`  
> **Canonical Application / Business Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-08-22

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk environment classes, runtime configuration, configuration ownership, environment files, secret injection boundary, timezone behavior, database/session/cache/queue runtime, private filesystem layout, scheduler requirements, ClamAV connectivity, export-renderer readiness, signing-identity runtime boundary, public-validator runtime limits, technical-log lifecycle, CI environment, dan release/readiness requirements** NSCMF Digital Form & Workflow System.

Dokumen ini menjawab:

- environment apa saja yang harus didukung;
- konfigurasi apa yang boleh berbeda antar environment;
- konfigurasi apa yang **tidak boleh** berbeda karena sudah menjadi locked product/security rule;
- bagaimana Laravel menerima configuration tanpa menyimpan secret di source control;
- bagaimana MySQL, session, cache, queue, storage, scheduler, ClamAV, renderer, signing, template, dan logging dikonfigurasi;
- mana setting yang berasal dari environment dan mana yang berasal dari typed application settings di database;
- apa yang wajib tersedia sebelum staging/production dinyatakan ready;
- bagaimana CI menggunakan environment yang aman tanpa production secret.

Dokumen ini **tidak** mengubah:

- product scope (`01`);
- business rules (`02`);
- user flow (`03`);
- permission semantics (`04`);
- state machine (`05`);
- business validation (`06`);
- UI behavior (`07`);
- technology selection (`08`);
- logical architecture (`09`);
- security policy (`10`);
- relational schema (`11`);
- HTTP contract (`12`);
- source-code structure (`13`);
- physical deployment topology yang menjadi authority `20_Deployment_Architecture.md`.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default unless an approved exception exists.
- **MAY** — allowed.
- **AUTHORITATIVE** — source of truth untuk concern dokumen ini.
- **LOCKED** — value/behavior berasal dari upstream decision dan tidak boleh diubah per environment.
- **ENVIRONMENT-BOUND** — nilainya memang berbeda menurut environment atau deployment.
- **SECRET** — sensitive runtime value yang tidak boleh masuk source control/log/audit/browser.
- **READINESS** — minimum operational condition sebelum environment dianggap siap melayani capability yang diwajibkan.
- **TBD** — belum diputuskan dan tidak boleh diisi diam-diam.

---

# PART A — ENVIRONMENT MODEL

## 3. Required Environment Classes

Project MUST support the following environment classes:

```text
local / development
testing
CI
staging
production
```

### 3.1 Local / Development

Untuk developer workstation atau isolated development runtime.

Tujuan:

- coding;
- local feature testing;
- migration development;
- local queue/scheduler execution;
- integration dengan development ClamAV/renderer/signing substitute where explicitly allowed.

### 3.2 Testing

Environment untuk automated test execution yang tidak identik dengan CI runner.

Testing MAY use test doubles untuk isolated unit/feature tests, tetapi test doubles MUST NOT menjadi satu-satunya validation path untuk MySQL, ClamAV, renderer, storage, signing, queue, atau concurrency behavior yang memang membutuhkan integration test.

### 3.3 CI

Automated pipeline environment.

CI MUST:

- use non-production credentials only;
- provide MySQL 8.4 where DB semantics are tested;
- run static analysis/quality/test gates;
- support environment-specific integration jobs;
- never receive production signing private key;
- never use production database/storage credentials.

### 3.4 Staging

Production-like validation environment.

Staging MUST be defined even if physical staging infrastructure is provisioned later.

Staging SHOULD mirror production configuration classes closely enough to validate:

- HTTPS/session security;
- persistent storage;
- real ClamAV behavior;
- exact export pipeline;
- renderer qualification;
- signing with a dedicated non-production signing identity;
- scheduler/queue operation;
- cleanup behavior.

### 3.5 Production

Authoritative operational environment for real NSCMF records.

Production MUST use:

- `APP_DEBUG=false`;
- HTTPS;
- dedicated least-privilege DB account;
- persistent private storage;
- database session/cache/queue;
- real ClamAV;
- qualified spreadsheet renderer;
- protected production signing identity;
- queue worker(s);
- scheduler execution;
- protected runtime secret injection;
- Technical Log lifecycle according to current typed Core Setting.

---

## 4. Environment Parity Principle

Environment differences MUST be intentional.

The following architecture classes remain the same between staging and production:

```text
Laravel 13
PHP 8.5
Vue 3 / Inertia 3
MySQL 8.4
Database Session
Database Cache
Database Queue
Private Laravel local storage abstraction
ClamAV contract
Qualified renderer contract
PdfSigner / PdfVerifier contract
Repository–Service Architecture
```

Staging MAY use different hostnames, DB/database names, storage roots, public certificate identities, and non-production secrets.

Testing/CI MAY replace selected infrastructure adapters with explicit test adapters only when the corresponding test is not intended to prove the real integration.

---

## 5. Environment Identity

Canonical application environment labels SHOULD be:

```text
APP_ENV=local
APP_ENV=testing
APP_ENV=staging
APP_ENV=production
```

CI normally runs application tests under:

```text
APP_ENV=testing
```

while the CI runner itself provides its own CI context/flag.

No business rule may depend on `APP_ENV` except for legitimate runtime/security configuration differences documented here.

---

# PART B — CONFIGURATION OWNERSHIP

## 6. Configuration Precedence

Configuration authority is:

```text
Locked project specification
→ version-controlled Laravel config structure
→ environment-specific non-secret/secret injection
→ typed runtime Core Setting only where explicitly approved
```

Environment variables MUST NOT be treated as permission to override locked product/security rules.

## 7. Three Configuration Classes

### 7.1 Locked Product / Security Values

These values MUST NOT vary silently by environment:

```text
password minimum = 6
password composition = none
MFA = off
self-registration = off
session idle timeout = 30 minutes
session absolute lifetime = 8 hours
max active sessions = 2
third valid login revokes oldest active authenticated session
sensitive re-auth proof lifetime = 15 minutes
attachment max active files = 10
attachment max final file size = 20 MB
resumable chunk size = 5 MiB
unfinished upload inactivity retention = 24 hours
public PDF validator max upload = 20 MB
export READY binary retention = 168 hours / 7 days
Approved PDF signing = mandatory
Team authorization effect = none
Spatie teams = false
wildcard permissions = false
Business/Access/Security Audit age purge = forbidden
canonical business states = exactly seven locked states
canonical application/business timezone = Asia/Jakarta
```

These SHOULD live as code/config constants where operationally useful, but MUST NOT be exposed as arbitrary per-environment overrides.

### 7.2 Environment-Bound Infrastructure Values

Examples:

- `APP_URL`;
- `APP_KEY`;
- DB host/database/user/password;
- secure-cookie deployment behavior;
- private storage root/mount;
- ClamAV socket/host/port;
- renderer adapter/executable/endpoint;
- signing adapter secret references;
- trusted proxy/host configuration;
- log level;
- process/supervisor topology.

### 7.3 Runtime Application Setting

Current approved runtime-configurable Core Setting:

```text
Technical Log Automatic Cleanup = ON/OFF
Technical Log Retention Value    = positive integer
Technical Log Retention Unit     = DAY | MONTH
Default                          = ON + 30 DAY
```

This value is stored in typed `system_settings` relational columns from `11`.

It is **not** sourced from `.env` after application initialization.

---

## 8. No Generic Settings Engine

Environment implementation MUST NOT create a generic override mechanism that allows arbitrary runtime mutation of:

- password policy;
- MFA;
- workflow states;
- Team authorization;
- attachment limits;
- upload chunk size;
- export retention;
- validator upload limit;
- authoritative audit retention;
- security/signing requirements.

The existence of `system_settings` does not authorize a generic key/value settings table.

---

# PART C — ENV FILES / SECRET MANAGEMENT

## 9. `.env.example`

Repository MUST contain a safe `.env.example` once application bootstrap exists.

`.env.example` MUST:

- contain variable names and safe non-secret examples/placeholders;
- leave secrets empty or use obvious placeholders;
- never contain real password, private key, passphrase, DB credential, session token, or production endpoint secret;
- document required variables through comments where practical;
- remain safe to commit publicly/private-repository-wide.

## 10. `.env`

Local `.env`:

- developer-local only;
- MUST be gitignored;
- MAY contain local-only credentials;
- MUST NOT be copied into documentation, issue comments, logs, or committed examples.

## 11. Testing Configuration

Testing configuration MAY be supplied through:

- `phpunit.xml` non-secret test defaults;
- `.env.testing` when needed;
- test runner process environment.

A committed `.env.testing` MUST NOT contain secrets.

## 12. CI Secrets

CI secrets MUST use GitHub Actions encrypted secrets/environment secrets or equivalent protected CI mechanism.

CI MUST NOT receive:

- production DB password;
- production storage secret;
- production signing private key;
- production signing passphrase;
- real user password.

## 13. Staging / Production Secrets

Staging/production secrets MUST be injected outside source control through one of:

- protected runtime environment;
- protected file/mount;
- platform secret injection;
- future approved secret manager.

The exact physical secret provider is deployment-specific and remains outside this document.

## 14. Laravel `env()` Rule

Application code MUST NOT call `env()` throughout Services/Controllers/Repositories/Domain code.

Environment values are consumed through Laravel `config/*` and then read using `config()`.

Reason:

- compatible with configuration cache;
- keeps environment parsing centralized;
- avoids hidden runtime behavior;
- improves testability.

## 15. Secret Redaction

Secrets MUST NOT appear in:

- application response;
- Business Audit;
- Access Audit;
- Security Audit;
- Technical Logs;
- debug dump;
- exception page;
- export;
- browser/Inertia props;
- frontend bundle;
- `VITE_*` variables.

---

# PART D — APPLICATION RUNTIME

## 16. Required Runtime Baseline

```text
Laravel 13.x
PHP 8.5.x
Composer 2.x
Node.js 24 LTS for frontend build/tooling
npm + package-lock.json
```

Production runtime MAY serve prebuilt frontend assets without keeping Node.js in the final runtime image/process, provided the build is reproducible and lockfile-controlled.

## 17. PHP Extension Baseline

The runtime MUST provide all extensions required by Laravel and installed dependencies.

At minimum, the project runtime is expected to provide the capabilities required for:

```text
PDO / pdo_mysql
mbstring
OpenSSL
fileinfo
curl
DOM / XML / libxml
ZIP archive handling
```

`ZIP` capability is specifically important because exact XLSX processing manipulates OOXML package content.

If a chosen signer/renderer/scanner integration adds a mandatory PHP extension, that dependency MUST be documented before implementation/deployment.

## 18. Application Key

`APP_KEY` is a SECRET.

Rules:

- unique per deployed environment;
- never copied from production to staging/local;
- never committed;
- local may generate through Laravel tooling;
- staging/production injected through protected secret mechanism;
- changing a live `APP_KEY` is a controlled security/operations event because encrypted application data/cookies may become invalid.

## 19. Debug

Required:

```text
local       → APP_DEBUG may be true
 testing     → APP_DEBUG should be false unless a targeted test requires otherwise
 staging     → APP_DEBUG=false
 production  → APP_DEBUG=false
```

Production/staging MUST NOT expose stack traces to normal/public users.

## 20. Configuration Cache

Staging/production MUST be compatible with Laravel configuration caching.

Runtime deployment SHOULD build/refresh configuration cache after environment injection and before serving traffic.

Application code MUST NOT rely on mutable process environment after config cache has been built.

---

# PART E — TIMEZONE / DATE-TIME

## 21. Canonical Timezone — LOCKED

Canonical application/business timezone:

```text
Asia/Jakarta
UTC offset: +07:00
```

This MUST be consistent across all environments.

Environment MUST NOT use Singapore/local developer timezone as application business timezone merely because the developer machine is located elsewhere.

## 22. Laravel Timezone

Laravel application timezone MUST be configured as:

```text
Asia/Jakarta
```

Application-created business/security timestamps are interpreted in this timezone.

## 23. MySQL Timezone Strategy

The MySQL server global timezone MAY remain UTC according to infrastructure defaults.

However, every NSCMF application DB connection MUST establish the MySQL **session/connection timezone** as:

```text
+07:00
```

Rationale:

- Jakarta has no daylight-saving transition;
- `+07:00` avoids dependency on MySQL named-timezone tables;
- SQL functions such as `NOW()` observed through the application connection align with application/business time;
- `TIMESTAMP` values are converted consistently by MySQL session timezone;
- `DATETIME` values are consistently interpreted by application code as Jakarta business time.

No environment may silently use a different DB connection timezone.

## 24. Business `DATE` Fields

Business date-only fields such as Request Date and Target Execution Date are calendar dates in business context.

They MUST NOT be timezone-shifted into another date merely because a server/DB process uses UTC internally.

## 25. API Timestamp Output

API timestamps MUST use ISO-8601 with explicit offset:

```text
2026-08-22T18:20:00+07:00
```

## 26. Scheduler / Logging Time

Scheduler cutoff calculations and Technical Log retention calculations MUST use `Asia/Jakarta` as the business/operational reference timezone unless a low-level tool records a raw UTC timestamp internally.

Technical logs SHOULD include unambiguous timestamps/offsets.

## 27. Technical Log Retention Unit Semantics

For the runtime-configurable Technical Log setting:

```text
DAY   → subtract the configured number of calendar days from current Asia/Jakarta time
MONTH → subtract the configured number of calendar months from current Asia/Jakarta time
```

`MONTH` MUST NOT be implemented as a hidden `N × 30 days` approximation.

---

# PART F — DATABASE ENVIRONMENT

## 28. Database Engine — LOCKED

```text
DB_CONNECTION=mysql
MySQL 8.4 LTS
InnoDB
utf8mb4
```

SQLite MUST NOT be the sole integration environment for database behavior that depends on MySQL semantics.

## 29. Database Connection Variables

Canonical `.env.example` contract SHOULD expose:

```text
DB_CONNECTION=mysql
DB_HOST=
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
```

Real values are environment-specific.

## 30. Charset / Collation

Connection/database MUST use `utf8mb4`.

Exact collation MAY follow the approved MySQL 8.4 environment default as long as:

- it is consistent per environment;
- application normalization rules for case-insensitive unique business identifiers remain authoritative;
- migrations/tests do not silently behave differently between CI/staging/production.

If a non-default collation is selected later, it requires explicit migration/testing review.

## 31. Dedicated Production DB User

Production application MUST NOT connect as `root`.

Use dedicated least-privilege account for application runtime.

Migration/deployment privilege MAY be handled by a separate operational credential if needed.

## 32. Database TLS

If the application-to-MySQL network leaves the trusted local host/private runtime boundary, transport encryption MUST be configured according to deployment topology.

Exact CA path/SSL mode is deployment-dependent and is not guessed here.

Local loopback/container-private development MAY use local non-TLS connectivity when appropriate.

## 33. Database Strictness

MySQL strict SQL behavior MUST remain enabled unless a documented compatibility problem is proven and explicitly approved.

Environment MUST NOT disable strictness merely to allow invalid/truncated business values.

## 34. Database Runtime Tables

Before application readiness, migrations MUST provide the required runtime tables including as applicable:

```text
sessions
jobs
job_batches
failed_jobs
cache
cache_locks
```

plus all application tables from `11`/`11A`.

---

# PART G — SESSION ENVIRONMENT

## 35. Session Driver — LOCKED

```text
SESSION_DRIVER=database
```

Staging and production MUST use DB-backed sessions.

Testing MAY use alternative session behavior in isolated tests, but CI/integration coverage MUST validate the real DB-backed session implementation.

## 36. Idle Timeout — LOCKED

```text
SESSION_LIFETIME=30
```

The built-in/session-layer idle behavior MUST represent 30 minutes.

A configured value different from 30 in deployed environments is a specification violation.

## 37. Absolute Session Lifetime — LOCKED

Absolute lifetime:

```text
8 hours
```

This is not equivalent to `SESSION_LIFETIME`.

Implementation MUST enforce the 8-hour absolute authenticated-session anchor using the session metadata strategy defined by `10`/`11` (`authenticated_at` or equivalent authoritative implementation).

## 38. Maximum Active Sessions — LOCKED

```text
2 active authenticated sessions/account
```

Third valid login succeeds and revokes the oldest active authenticated session.

No environment variable may silently change this number.

## 39. Session Cookie Security

Staging/production:

```text
SESSION_SECURE_COOKIE=true
HttpOnly=true
SameSite=Lax baseline
Path=/
```

Cookie domain SHOULD remain host-scoped/null unless deployment topology requires an explicitly reviewed parent-domain scope.

Local development MAY use non-Secure cookies only when running plain HTTP locally.

## 40. Session Revocation

Because revocation is server-side, environment MUST provide shared access to the authoritative DB session store for every web runtime serving the same application installation.

A future multi-process/multi-instance deployment MUST NOT create per-instance isolated session stores.

---

# PART H — CACHE ENVIRONMENT

## 41. Cache Driver — LOCKED BASELINE

```text
CACHE_STORE=database
```

No Redis requirement current MVP.

## 42. Cache Is Not Business Truth

Cache data is disposable runtime data.

Cache MUST NOT become the only persistence location for:

- workflow state;
- accepted upload chunk metadata;
- audit;
- export snapshot;
- issuance;
- protected Technical Log setting;
- permission assignment truth.

## 43. Cache Locks

Where application-level cache locks are used, database cache-lock infrastructure MUST be available.

Database locks do not replace the row-lock/transaction rules already defined for workflow transitions.

---

# PART I — QUEUE ENVIRONMENT

## 44. Queue Driver — LOCKED

```text
QUEUE_CONNECTION=database
```

No Redis/Horizon requirement current MVP.

## 45. Required Queue Worker

Staging and production MUST run at least one queue worker process capable of processing:

```text
FinalizeAttachmentUploadJob
GenerateNscmfExportJob
```

Exact process count/concurrency belongs to deployment/performance tuning and is not fixed here.

## 46. After-Commit Dispatch

Queue configuration/dispatch MUST preserve the upstream invariant:

```text
business/export request transaction commits
→ job becomes eligible for dispatch/execution
```

The project SHOULD use Laravel after-commit dispatch behavior as the safe default for these transactional use cases.

A worker MUST NOT observe an export job before its immutable request/snapshot transaction is committed.

## 47. Failed Jobs

Failed jobs MUST be retained using Laravel failed-job infrastructure for operational diagnosis.

Deleting/retrying a failed runtime job MUST NOT delete or rewrite authoritative NSCMF/export/audit state.

## 48. Queue Retry / Timeout Values

Exact worker retry count, backoff, and timeout values depend on measured ClamAV/render/sign durations and are intentionally **not invented** here.

Before staging/production go-live, they MUST be explicitly configured so that:

- a legitimate renderer/signing operation is not killed prematurely;
- a stuck external process cannot run indefinitely;
- retries do not create duplicate final artifacts or duplicate workflow mutation.

Exact numeric tuning may be finalized together with `16_Testing_Specification.md` and `20_Deployment_Architecture.md` evidence.

---

# PART J — PRIVATE STORAGE ENVIRONMENT

## 49. Current Storage Backend — LOCKED

Current MVP storage direction:

```text
local/development → Laravel private local filesystem
initial production → Laravel private local filesystem on persistent/non-ephemeral server storage
```

Current MVP does **not** require S3-compatible/object storage.

## 50. Canonical Laravel Disk

Application SHOULD define one dedicated private persistent disk:

```text
nscmf_private
```

Driver:

```text
local
```

Canonical application-visible root:

```text
storage/app/private/nscmf
```

In production, that path MUST resolve to persistent/non-ephemeral storage. The host/volume implementation is deployment authority (`20`).

The path MUST NOT be under `public/`.

## 51. Persistent Storage Categories

Under `nscmf_private`, use explicit private prefixes/directories:

```text
uploads/chunks/
uploads/assembly/
attachments/
exports/
templates/
```

Meaning:

- `uploads/chunks/` → acknowledged resumable chunk bytes;
- `uploads/assembly/` → assembled quarantine/finalization workspace requiring durable recovery semantics;
- `attachments/` → final attachment binary;
- `exports/` → READY generated XLSX/PDF binary until 168h expiry;
- `templates/` → immutable registered official XLSX template versions.

Storage object/file naming is internal and MUST NOT use unsanitized original user filename as directory path.

## 52. Runtime Temporary Workspace

Separate non-public runtime temporary workspace SHOULD be used for data that does **not** require durable resume semantics, for example:

```text
public-validator temporary uploads
renderer scratch/intermediate files
short-lived signing intermediate files
```

Canonical application-visible root MAY be:

```text
storage/app/private/nscmf-runtime-tmp
```

This workspace MAY be ephemeral, provided:

- no accepted resumable chunk depends on it;
- no final attachment depends on it;
- no READY export binary depends on it;
- public-validator uploads are never treated as attachments;
- stale temporary files are cleanup-eligible;
- application recovers safely after process restart.

## 53. Filesystem Permissions

Private storage roots MUST:

- be readable/writable only by the application/worker identities that require access;
- not be world-writable;
- not be directly served by the web server;
- not allow a user-supplied filename to escape the configured root;
- prevent directory traversal;
- keep signing private material outside normal attachment/export directories.

Exact Unix owner/group/mode values are deployment-specific.

## 54. Storage Persistence Readiness

Production readiness MUST verify that:

- `nscmf_private` exists;
- application can create/read/delete a safe readiness probe file;
- storage survives ordinary application process/container restart;
- acknowledged upload chunks remain available after restart;
- no private root is mapped to public web serving.

## 55. No Storage-Key Authorization

Private file path/storage key is never authorization.

All downloads continue through Laravel authorization and security-state checks.

---

# PART K — RESUMABLE ATTACHMENT ENVIRONMENT

## 56. Locked Upload Geometry

```text
chunk size = 5 MiB = 5,242,880 bytes
final attachment max = 20 MB
unfinished inactivity retention = 24 hours
```

These are not environment-tunable values.

## 57. Durable Chunk Requirement

A chunk may be acknowledged only after:

```text
private persistent write succeeds
+ accepted chunk metadata persists successfully
```

Production MUST NOT point `uploads/chunks/` or `uploads/assembly/` to process-local ephemeral filesystem.

## 58. Resume Across Process Restart

Ordinary Laravel process/worker restart MUST NOT erase unexpired acknowledged progress when MySQL + `nscmf_private` remain healthy.

No guarantee is made that upload continues while the application/network/storage is unavailable.

## 59. Upload Cleanup

Scheduler MUST cleanup:

- expired upload sessions;
- corresponding chunk bytes;
- abandoned assembly objects that are safely eligible.

Cleanup MUST use the authoritative 24-hour inactivity rule and current upload status.

It MUST NOT delete a valid final attachment or authoritative audit.

---

# PART L — CLAMAV ENVIRONMENT

## 60. Malware Scanner — LOCKED

Production/staging attachment/public-verifier scanning uses:

```text
MalwareScanner contract
→ ClamAvScanner adapter
→ ClamAV / clamd
```

Only explicit full-file `CLEAN` permits use.

## 61. ClamAV Connectivity Contract

Environment configuration MUST support one private connectivity mode selected by deployment:

```text
UNIX socket
or
private TCP host/port
```

Suggested configuration contract:

```text
NSCMF_CLAMAV_TRANSPORT=unix|tcp
NSCMF_CLAMAV_SOCKET=
NSCMF_CLAMAV_HOST=
NSCMF_CLAMAV_PORT=
```

Rules:

- when `unix`, socket is required and host/port ignored;
- when `tcp`, host/port are required and endpoint MUST remain private;
- ClamAV MUST NOT be exposed publicly;
- exact topology is deferred to deployment.

## 62. ClamAV Definitions

Environment/operator MUST ensure ClamAV malware definitions are updated operationally.

Definition update failure/staleness SHOULD surface operationally.

The application MUST NOT silently treat scanner unavailability as CLEAN.

## 63. Scanner Timeout

A finite scanner timeout is mandatory.

Exact numeric timeout is deployment/performance-dependent and remains TBD until integration measurement.

It MUST be explicitly configured before production rather than relying on an unknown/unbounded process default.

## 64. ClamAV Readiness

Staging/production readiness MUST verify:

- endpoint/socket reachable;
- scanner responds to a health/version check;
- explicit CLEAN response can be distinguished from INFECTED/ERROR/TIMEOUT;
- scanner errors fail closed.

## 65. Test Strategy

Unit/feature tests MAY use a deterministic fake scanner when malware integration is not under test.

CI MUST include real ClamAV integration coverage before release according to `16_Testing_Specification.md`.

Staging/production MUST NOT use a fake-clean scanner.

---

# PART M — OFFICIAL XLSX TEMPLATE ENVIRONMENT

## 66. Template Authority

Official NSCMF XLSX template is immutable export presentation authority.

Template binary MUST NOT be generated from HTML or recreated approximately.

## 67. Template Storage

Registered production template versions MUST live on:

```text
nscmf_private/templates/
```

and have database metadata in `nscmf_template_versions` including:

- version label;
- private storage key/path reference;
- SHA-256;
- mapping version;
- active flag.

## 68. Template Immutability

After a template version is registered:

- binary MUST NOT be overwritten in place;
- mapping identity remains attributable;
- a new official workbook revision creates a **new template version**;
- historical export/issuance must remain resolvable to the original version.

## 69. Template Provisioning

Production/staging template provisioning is a controlled operator/deployment action.

The template binary MUST NOT be treated as a random editable runtime file.

Provisioning flow conceptually:

```text
approved official XLSX binary
→ private environment transfer/provisioning
→ compute SHA-256
→ register version + mapping version
→ store/copy into private templates location
→ verify stored SHA-256
→ mark eligible active version
```

Exact implementation command name is intentionally left to `15_Coding_Rules_AGENTS.md` / implementation planning and is not invented here.

## 70. Template Readiness

Before staging/production export is considered ready:

- exactly the intended active template metadata is resolvable;
- private binary exists;
- current SHA-256 matches registered `template_sha256`;
- mapping version exists in deployed code;
- workbook integrity/golden tests for that mapping/template pair pass.

Hash mismatch is a critical export readiness failure.

---

# PART N — SPREADSHEET RENDERER ENVIRONMENT

## 71. Qualified Renderer Requirement

PDF export MUST use a spreadsheet renderer that passes exact/golden fidelity qualification.

A renderer is not production-approved merely because it can open XLSX.

## 72. Renderer Configuration Contract

Environment MUST support configuration for the selected concrete renderer adapter, conceptually including:

```text
renderer adapter/driver identifier
executable path OR private endpoint
finite timeout
private working directory
required font availability
health/readiness check
```

Suggested generic config names MAY include:

```text
NSCMF_RENDERER_DRIVER=
NSCMF_RENDERER_EXECUTABLE=
NSCMF_RENDERER_ENDPOINT=
NSCMF_RENDERER_TIMEOUT_SECONDS=
```

Only values relevant to the selected adapter are used.

## 73. Renderer Selection — Still TBD

This document intentionally does **not** select:

- LibreOffice specifically;
- Microsoft Office automation;
- a commercial renderer;
- a remote rendering service.

The selected implementation MUST pass the fidelity requirements from `08`/`09`/`10`/`16` before production use.

## 74. Fonts

The runtime MUST provide the fonts required by the official workbook for faithful PDF rendering.

Exact font inventory MUST be derived from the approved workbook/template qualification process.

Missing font/substitution that changes output fidelity is a readiness failure.

## 75. Renderer Workspace

Renderer scratch files use private runtime temporary workspace and MUST NOT be public.

Intermediate output MUST be removed after success/failure according to controlled cleanup.

## 76. Renderer Failure

Renderer failure:

```text
export = FAILED
no HTML fallback
no approximate PDF fallback
NSCMF business state unchanged
```

---

# PART O — PDF SIGNING ENVIRONMENT

## 77. Approved PDF Signing — LOCKED

For an `APPROVED` snapshot:

```text
PDF signing by System/Organization is mandatory
```

No environment may disable this requirement for a production-equivalent Approved PDF.

## 78. Signing Secret Boundary

Production private signing material MUST NOT be stored in:

- Git repository;
- `.env.example`;
- ordinary database columns;
- `nscmf_signing_certificates` private-key fields;
- browser/frontend;
- logs/audits;
- public validator.

## 79. Signing Runtime Provisioning

Exact signing library/provider/container/path/passphrase mechanism remains intentionally unresolved upstream.

Whichever adapter is later selected MUST receive the private key through a protected runtime secret mechanism such as a read-only protected mount/reference or equivalent approved secret injection.

The project MUST NOT silently settle the provider/library/CA/rotation ceremony inside implementation code without an approved follow-up decision.

## 80. Public Certificate Material

Public verification material MAY be persisted in `nscmf_signing_certificates` as defined by `11`.

Historical public certificate material required for old genuine PDFs MUST remain resolvable after active signing identity rotation.

The private key is never persisted there.

## 81. Environment Separation

```text
local/testing → test identity only when signing integration is exercised
CI            → generated/ephemeral or dedicated test identity
staging       → dedicated non-production signing identity
production    → protected production signing identity
```

Production key MUST NEVER be reused in CI/staging/local.

## 82. Signing Readiness

Before production/staging Approved-PDF export is ready, environment MUST verify:

- configured signer adapter is available;
- private key reference/material is readable by only the required runtime identity;
- corresponding certificate is readable;
- key/certificate pair is compatible;
- certificate metadata/fingerprint can be registered/resolved;
- a controlled signing self-test succeeds;
- private key is not browser/database/log accessible.

Missing/unusable signing identity = **critical not-ready configuration failure**.

## 83. Signing Failure

At runtime:

```text
Approved PDF signing failure
→ export FAILED
→ record remains APPROVED
→ no unsigned READY fallback
```

---

# PART P — PUBLIC PDF VALIDATOR ENVIRONMENT

## 84. Public Surface

```text
GET  /ispdfvalid
POST /ispdfvalid/verify
```

No login required.

## 85. Upload Limit — LOCKED

```text
maximum PDF upload = 20 MB
```

This limit MUST NOT vary per environment in production-equivalent behavior.

## 86. Validator Temporary Storage

Uploaded public PDF MUST be written to a private temporary workspace.

It MUST NOT become:

- a normal NSCMF attachment;
- a public file;
- a long-lived artifact;
- a source of private storage URL disclosure.

## 87. Validator Processing

Environment must support:

```text
private temp write
→ ClamAV CLEAN
→ PDF signature verification
→ exact uploaded-byte SHA-256
→ issuance lookup
→ workflow/currentness resolution
→ minimum-disclosure response
→ temp cleanup
```

## 88. Validator Rate Limit

A server-side public rate limit is mandatory.

Exact numeric buckets remain operational tuning and are intentionally not guessed in this document.

Production MUST NOT ship with an effectively unlimited public verifier.

## 89. Validator Cleanup

Successful/failed verification SHOULD remove the temporary upload immediately.

Scheduler MAY additionally clean stale orphan validator-temp files after crashes.

---

# PART Q — LOGGING / TECHNICAL LOG LIFECYCLE

## 90. Log Classes

Keep these separate:

```text
Business Audit
Access Audit
Security Audit
Technical Logs
```

Only Technical Logs are subject to the configurable operational age cleanup described here.

## 91. Technical Log Target

Initial runtime baseline SHOULD write Laravel Technical Logs to a private operational target under:

```text
storage/logs/
```

Production log storage MUST survive ordinary process restart long enough for its configured retention behavior to make sense, or be forwarded to an approved external operational log target in a future deployment design.

External logging platform is not required current MVP.

## 92. Log Level

Recommended baseline:

```text
local       → debug
 testing     → error/warning as useful for test output
 staging     → info
 production  → info
```

Production debug logging MUST NOT be enabled by default.

Safe targeted temporary diagnostic increase requires operational control and secret redaction.

## 93. No Secret Logging

Technical Logs MUST NOT contain:

- current/new/temporary password;
- session cookie/payload;
- private signing key/passphrase;
- DB password;
- secret token;
- raw uploaded attachment/chunk bytes;
- raw public validator bytes;
- unnecessary absolute private filesystem paths.

Safe IDs, stage names, durations, normalized error codes, chunk index, size, queue/job identifiers MAY be logged when useful.

## 94. Technical Log Cleanup Setting — LOCKED BEHAVIOR

Runtime source of truth is typed `system_settings`:

```text
technical_log_auto_cleanup_enabled
technical_log_retention_value
technical_log_retention_unit
```

Default bootstrap values:

```text
true
30
DAY
```

Protected Superadmin may change:

- ON/OFF;
- positive retention value;
- `DAY` / `MONTH`.

No fixed product maximum retention.

## 95. No Competing `LOG_DAYS` Authority

Environment/logger configuration MUST NOT introduce an independent hard-coded age deletion that silently overrides the runtime Core Setting.

If a logging channel rotates files, rotation/partitioning MAY occur for manageability, but age-based removal MUST remain consistent with the current typed Technical Log setting.

A hard-coded `30 days` logger purge would be a specification violation because 30 Days is only the default.

## 96. Technical Log Cleanup Execution

Scheduler:

```text
read current system_settings
→ if cleanup OFF: no age-based Technical Log deletion
→ if cleanup ON: compute cutoff using retention value/unit in Asia/Jakarta
→ delete/rotate only eligible Technical Logs
```

Longer retention may increase storage usage and SHOULD be monitored.

## 97. Authoritative Audit Exclusion

Technical Log cleanup MUST NEVER delete or mutate:

```text
business_audit_events
business_audit_changes
access_audit_events
security_audit_events
nscmf_records
nscmf_workflow_iterations
nscmf_pdf_issuances
historical public certificates required for validation
```

No environment setting may override this exclusion.

---

# PART R — SCHEDULER ENVIRONMENT

## 98. Scheduler Required

Staging/production MUST run Laravel scheduler continuously through an approved operating mechanism.

The physical mechanism (cron, supervisor, container scheduler, platform scheduler) is deployment authority.

The scheduler runner SHOULD evaluate Laravel schedule at least every minute so application schedule definitions can enforce their intended cadence.

## 99. Required Scheduled Responsibilities

Current required responsibilities include:

```text
unfinished upload cleanup after 24h inactivity
abandoned assembly/quarantine cleanup
expired generated export binary cleanup after 168h
Technical Log cleanup according to current typed setting
stale public-validator/runtime temp cleanup where applicable
normal framework runtime housekeeping where approved
```

## 100. Scheduler Prohibitions

Scheduler MUST NOT:

- auto-advance NSCMF workflow;
- age-delete Business/Access/Security Audit;
- delete PDF issuance history because binary expired;
- mark incomplete upload complete;
- mark scanner result CLEAN;
- change Approved/Reopened state automatically;
- hard-code Technical Log retention.

---

# PART S — HTTPS / PROXY / BROWSER SECURITY ENVIRONMENT

## 101. Production HTTPS

Staging/production application and public verifier MUST be served through HTTPS.

`APP_URL` MUST use `https://` in production/staging.

## 102. Trusted Proxy

If deployment uses reverse proxy/load balancer, Laravel trusted-proxy configuration MUST explicitly trust only the required proxy network/identity according to deployment topology.

Do not blindly trust all forwarded headers from arbitrary internet clients.

Exact proxy addresses are deferred to `20`.

## 103. Secure Cookie

Production/staging session cookie MUST be Secure + HttpOnly and use appropriate SameSite behavior from `10`.

## 104. Host / Origin

Normal Inertia application remains same-origin.

No wildcard credentialed CORS.

Environment MUST NOT add broad cross-origin access merely for convenience.

## 105. HSTS

HSTS SHOULD be enabled only after HTTPS/proxy configuration is confirmed correct for the production host strategy.

Exact max-age/subdomain/preload decision can be finalized with deployment topology.

---

# PART T — FRONTEND BUILD ENVIRONMENT

## 106. Node / npm

```text
Node.js 24 LTS
npm
package-lock.json committed
```

CI/build MUST use lockfile-controlled install.

## 107. `VITE_*` Variables

Only non-secret frontend-exposable configuration may use `VITE_*`.

MUST NOT expose through `VITE_*`:

- DB credentials;
- APP_KEY;
- signing secret;
- session secret;
- private storage path requiring confidentiality;
- ClamAV private credentials/endpoints if not intended for browser;
- internal API secret.

## 108. Frontend Environment Logic

Frontend MUST NOT use build environment to redefine:

- business state;
- permission eligibility;
- Team authorization;
- validation authority;
- attachment security state;
- signing requirement.

Those remain server authoritative.

---

# PART U — CI / TEST ENVIRONMENT

## 109. CI Database

CI integration jobs that exercise database behavior MUST use MySQL 8.4.

SQLite MAY be used for narrowly isolated tests only where MySQL-specific semantics are irrelevant.

## 110. CI Timezone

CI application timezone MUST remain:

```text
Asia/Jakarta
```

and MySQL application connection session timezone MUST remain `+07:00`.

This prevents tests from passing only because CI runner happens to use UTC.

## 111. CI Storage

CI MAY use a temporary filesystem root for `nscmf_private` because CI job lifetime itself is isolated.

Tests MUST still prove the application's distinction between:

- persistent accepted upload objects within the simulated runtime;
- temporary renderer/validator workspace;
- private/public path boundaries.

Production persistence guarantee is validated through deployment/integration tests, not inferred from CI temp filesystem alone.

## 112. CI Queue

Unit tests MAY fake jobs.

Integration/feature tests MUST include coverage for:

- after-commit dispatch semantics;
- database queue job behavior;
- failed/retry idempotency where relevant;
- export snapshot binding;
- attachment finalization.

## 113. CI ClamAV

CI release validation MUST include at least one real ClamAV integration path.

A fake CLEAN implementation MAY exist for isolated tests only.

## 114. CI Renderer

Golden/fidelity renderer tests MUST run in an environment that contains the candidate qualified renderer and required fonts.

A test that merely mocks renderer success cannot qualify a renderer for production.

## 115. CI Signing

CI signing tests use non-production test signing material only.

Preferred direction:

- ephemeral/generated test certificate/key per CI job; or
- dedicated non-production fixture secret approved for CI.

Production private key MUST NEVER be copied into CI.

## 116. CI Secret Scanning

CI SHOULD fail when obvious committed secrets/private keys/real `.env` content are detected.

The exact secret-scanning tool may be selected later without changing this requirement.

---

# PART V — ENVIRONMENT MATRIX

## 117. Required Matrix

| Concern | Local / Dev | Testing | CI | Staging | Production |
|---|---|---|---|---|---|
| `APP_DEBUG` | may true | normally false | false | false | false |
| Timezone | Asia/Jakarta | Asia/Jakarta | Asia/Jakarta | Asia/Jakarta | Asia/Jakarta |
| MySQL | 8.4 | 8.4 where integration | 8.4 integration | 8.4 | 8.4 |
| DB session TZ | +07:00 | +07:00 | +07:00 | +07:00 | +07:00 |
| Session | database preferred | may isolate / must integrate | DB integration | database | database |
| Cache | database baseline | may isolate / must integrate | DB integration | database | database |
| Queue | database | fake or DB depending test | DB integration | database worker | database worker |
| Persistent private storage | local disk | test temp | CI temp | persistent local | persistent local |
| Resumable acknowledged chunks | must survive app restart in integration | simulated | simulated/integration | durable | durable |
| ClamAV | real recommended | fake allowed in isolated test | real integration required | real | real |
| Renderer | candidate/dev | fake allowed isolated | golden real candidate job | qualified | qualified |
| Signing identity | test only | test only | non-prod/ephemeral | staging key | production key |
| HTTPS | optional | not required isolated | runner dependent | required | required |
| Technical Log default | ON/30 DAY | seeded default | seeded default | ON/30 DAY until changed | ON/30 DAY until changed |
| Authoritative audit purge | forbidden | forbidden | forbidden | forbidden | forbidden |

---

# PART W — CANONICAL CONFIG CONTRACT

## 118. Core `.env.example` Shape

The eventual `.env.example` SHOULD expose at least the following categories without real secrets:

```dotenv
APP_NAME="NSCMF"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nscmf
DB_USERNAME=nscmf
DB_PASSWORD=

SESSION_DRIVER=database
SESSION_LIFETIME=30
SESSION_SECURE_COOKIE=false

CACHE_STORE=database
QUEUE_CONNECTION=database

# Private local storage root may be overridden by deployment config if needed.
NSCMF_PRIVATE_STORAGE_ROOT=
NSCMF_RUNTIME_TMP_ROOT=

# ClamAV - choose unix or tcp per environment/deployment.
NSCMF_CLAMAV_TRANSPORT=
NSCMF_CLAMAV_SOCKET=
NSCMF_CLAMAV_HOST=
NSCMF_CLAMAV_PORT=

# Renderer adapter is not selected yet; exact values are adapter-specific.
NSCMF_RENDERER_DRIVER=
NSCMF_RENDERER_EXECUTABLE=
NSCMF_RENDERER_ENDPOINT=
NSCMF_RENDERER_TIMEOUT_SECONDS=
```

Signing-adapter secrets are intentionally not standardized into plaintext `.env.example` fields until the signer/provider mechanism is approved.

## 119. Locked Values Should Not Be `.env` Toggles

Do NOT create environment overrides such as:

```text
PASSWORD_MIN_LENGTH
MFA_ENABLED
SPATIE_TEAMS_ENABLED
NSCMF_CHUNK_SIZE
NSCMF_UPLOAD_RETENTION_HOURS
NSCMF_ATTACHMENT_MAX_MB
NSCMF_ATTACHMENT_MAX_COUNT
NSCMF_EXPORT_RETENTION_HOURS
NSCMF_VALIDATOR_MAX_MB
NSCMF_REAUTH_MINUTES
NSCMF_SESSION_MAX_COUNT
NSCMF_AUDIT_RETENTION_DAYS
APP_BUSINESS_TIMEZONE with arbitrary environment value
```

for values already locked by specifications.

If framework config needs a constant, it should be version-controlled and tested against the authoritative value.

## 120. Runtime Technical Log Setting Is Not `.env`

Do NOT create:

```text
TECHNICAL_LOG_RETENTION_DAYS=30
```

as the runtime authority.

The DB-backed typed setting controls operational age cleanup after initialization.

Environment/config may only define safe bootstrap defaults matching:

```text
ON + 30 DAY
```

until the singleton row is initialized.

---

# PART X — READINESS / RELEASE GATES

## 121. Core Application Readiness

Before staging/production receives real traffic, verify:

- required environment values are present;
- `APP_KEY` exists and is not default/shared;
- `APP_DEBUG=false`;
- MySQL reachable with dedicated application user;
- migrations are current;
- application DB connection timezone is `+07:00`;
- database session/cache/queue tables exist;
- `nscmf_private` is writable and persistent;
- required config cache reflects current environment;
- HTTPS/session cookie configuration is correct.

## 122. Attachment Readiness

Verify:

- chunk/assembly/final storage directories available;
- acknowledged chunks are on persistent storage;
- ClamAV reachable;
- explicit CLEAN/INFECTED/error behavior distinguishable;
- scheduler cleanup path works;
- no private path is web-public.

## 123. Export Readiness

Verify:

- active template metadata exists;
- template binary exists;
- template SHA-256 matches registry;
- deployed mapping version exists;
- renderer candidate is qualified;
- required fonts installed;
- queue worker available;
- export final storage persistent;
- 168h cleanup scheduled.

## 124. Approved PDF Signing Readiness

For staging/production:

- signer adapter configured;
- non-production/production identity appropriate to environment;
- private key inaccessible to browser/DB/logs;
- certificate pair validated;
- signing self-test succeeds;
- public certificate registration/lookup works;
- no unsigned Approved-PDF fallback exists.

A production environment without usable signing identity is **not ready** for required Approved-PDF export capability.

## 125. Public Validator Readiness

Verify:

- HTTPS;
- 20 MB server-side limit;
- public rate limiting enabled;
- private temp storage;
- ClamAV real integration;
- PDF verification adapter;
- issuance/currentness lookup;
- temp cleanup;
- minimum-disclosure response.

## 126. Scheduler / Queue Readiness

Verify:

- queue worker running;
- scheduler runner active;
- failed jobs observable;
- upload cleanup scheduled;
- export cleanup scheduled;
- Technical Log cleanup respects current DB setting;
- scheduler has no authoritative audit purge task.

---

# PART Y — FAILURE / MISCONFIGURATION BEHAVIOR

## 127. Missing DB

Application cannot perform authoritative business operations. Environment is not core-ready.

## 128. Storage Unavailable

Do not acknowledge new chunks/final attachments/READY exports whose required binary cannot be durably stored.

Existing business records remain authoritative in DB.

## 129. ClamAV Unavailable

Attachment/public-verifier files do not become CLEAN/valid merely because scanner is unavailable.

Fail closed.

## 130. Renderer Unavailable

PDF export becomes Failed/not-ready according to export lifecycle. No HTML approximation fallback.

## 131. Signing Identity Unavailable

Approved PDF export cannot become READY. Record remains APPROVED.

## 132. Scheduler Down

Business workflow does not advance automatically.

Temporary objects/expired binaries/Technical Logs may remain longer than intended until scheduler recovers. Recovery MUST execute cleanup according to authoritative metadata/settings without deleting protected history.

## 133. Queue Worker Down

Queued work remains pending where DB queue state persists. Business state is not falsely marked successful.

## 134. Invalid Environment Value

Staging/production startup/readiness SHOULD fail early for malformed or missing mandatory infrastructure configuration rather than falling back silently to unsafe defaults.

---

# PART Z — DEVELOPER / AI ENVIRONMENT GUARDRAILS

## 135. MUST NOT

Developer/coding agent MUST NOT:

1. commit `.env` with real secrets;
2. commit production DB credential;
3. commit signing private key/passphrase;
4. expose secret via `VITE_*`;
5. call `env()` throughout application code instead of config boundary;
6. use developer machine timezone as application timezone;
7. set production business timezone other than `Asia/Jakarta`;
8. let MySQL application connection silently use a different timezone;
9. use SQLite as sole integration proof for MySQL locking/schema behavior;
10. use `root` as production application DB user;
11. switch production session/cache/queue to Redis without architecture/spec change;
12. switch current production storage baseline to S3/object storage without approved change;
13. put acknowledged upload chunks on ephemeral process/container storage;
14. put private attachments/templates/exports under `public/`;
15. use original filename as raw filesystem path;
16. treat storage path/key as authorization;
17. make 5 MiB chunk size environment-configurable;
18. make 24h upload inactivity retention environment-configurable;
19. make 20 MB attachment/public-validator limit environment-configurable;
20. make 168h export retention environment-configurable;
21. make 15-minute re-auth lifetime environment-configurable;
22. change 30m/8h/max2 session policy by environment;
23. create environment toggle that enables MFA current MVP;
24. enable Spatie Teams through env;
25. add authoritative audit retention env var;
26. let Technical Log cleanup touch Business/Access/Security Audit;
27. hard-code Technical Log cleanup to 30 days as immutable;
28. create a second Technical Log retention authority such as `LOG_DAYS` that overrides DB setting;
29. expose ClamAV publicly;
30. use fake CLEAN scanner in staging/production;
31. mark ClamAV error/timeout as CLEAN;
32. assume a renderer is qualified without golden/fidelity testing;
33. choose HTML PDF fallback;
34. silently select signer provider/library/path/rotation mechanism while upstream still leaves it unresolved;
35. reuse production signing identity in CI/staging/local;
36. allow Approved PDF to become READY unsigned;
37. overwrite registered official template binary in place;
38. skip template SHA-256 readiness verification;
39. use production secrets in CI;
40. log secret/raw uploaded bytes;
41. create scheduler task that advances NSCMF workflow;
42. create cleanup that deletes PDF issuance metadata with 7-day binary expiry;
43. treat runtime temp workspace as durable resumable storage;
44. assume physical deployment topology from this document.

---

# PART AA — ACCEPTANCE CRITERIA

## 136. Environment Classes

- [ ] local/development defined;
- [ ] testing defined;
- [ ] CI defined;
- [ ] staging defined;
- [ ] production defined;
- [ ] staging/production use production-equivalent architecture classes.

## 137. Configuration / Secrets

- [ ] safe `.env.example` exists when app bootstrap exists;
- [ ] real `.env` ignored;
- [ ] no production secret committed;
- [ ] app reads env through `config()` boundary;
- [ ] no server secret exposed through `VITE_*`;
- [ ] config cache works in staging/production.

## 138. Timezone

- [ ] Laravel timezone = `Asia/Jakarta`;
- [ ] MySQL app connection timezone = `+07:00`;
- [ ] API timestamps expose explicit `+07:00` offset;
- [ ] scheduler/log cleanup calculations use Jakarta semantics;
- [ ] business DATE fields are not timezone-shifted.

## 139. Database / Runtime

- [ ] MySQL 8.4 / InnoDB / utf8mb4;
- [ ] production app user is not root;
- [ ] DB sessions exist;
- [ ] database cache exists;
- [ ] database queue exists;
- [ ] session 30m idle + 8h absolute + max2 enforced;
- [ ] third login revokes oldest.

## 140. Storage

- [ ] `nscmf_private` uses Laravel local private driver current MVP;
- [ ] production root is persistent/non-ephemeral;
- [ ] private root is outside public web root;
- [ ] chunks/assembly/final attachments/exports/templates have separate prefixes;
- [ ] runtime temp workspace is separate from durable resumable data;
- [ ] no storage-key authorization.

## 141. Attachment / ClamAV

- [ ] 5 MiB locked chunk geometry;
- [ ] 24h locked inactivity cleanup;
- [ ] acknowledged progress survives ordinary process restart when DB/storage remain healthy;
- [ ] real staging/production ClamAV;
- [ ] full assembled-file CLEAN only;
- [ ] finite scanner timeout configured before production;
- [ ] scanner endpoint private.

## 142. Export / Template / Renderer

- [ ] template binary private + immutable;
- [ ] template version/hash/mapping binding exists;
- [ ] readiness rejects hash mismatch;
- [ ] renderer is qualified before staging/production approval;
- [ ] required fonts available;
- [ ] no HTML approximation;
- [ ] final artifacts persist for locked 168h.

## 143. Signing

- [ ] Approved PDF signing mandatory;
- [ ] production key never repo/DB/browser/log;
- [ ] CI/staging use non-production identity;
- [ ] missing signer identity is critical not-ready;
- [ ] signing failure cannot create unsigned READY artifact;
- [ ] public certificate history remains resolvable.

## 144. Public Validator

- [ ] no login required;
- [ ] HTTPS in production/staging;
- [ ] max20MB enforced server-side;
- [ ] rate limit enabled;
- [ ] private temp + CLEAN gate;
- [ ] temp cleanup;
- [ ] no public record-browser behavior.

## 145. Technical Logs / Audits

- [ ] Technical Logs separate from authoritative audits;
- [ ] typed setting default ON/30 DAY;
- [ ] Protected Superadmin may choose ON/OFF + positive DAY/MONTH;
- [ ] no fixed maximum retention;
- [ ] no competing hard-coded age purge;
- [ ] Business/Access/Security Audit never age-purged;
- [ ] secrets/raw bytes redacted.

## 146. Queue / Scheduler

- [ ] DB queue worker active staging/production;
- [ ] after-commit semantics preserved;
- [ ] failed jobs observable;
- [ ] scheduler active;
- [ ] upload cleanup registered;
- [ ] export cleanup registered;
- [ ] Technical Log cleanup reads current typed setting;
- [ ] scheduler never advances business workflow.

---

# PART AB — INTENTIONALLY DEFERRED / NOT INVENTED

## 147. Deployment-Dependent Details

The following remain intentionally unresolved because upstream documents have not supplied enough authority and/or they depend on physical deployment design:

- exact production/staging hostnames;
- exact VM/container/platform topology;
- exact persistent-volume host path/mount implementation;
- queue worker process count;
- exact worker retry/backoff/timeout numbers;
- exact public-validator rate-limit buckets;
- exact login/upload rate-limit numeric buckets beyond required behavior;
- exact ClamAV physical topology and scanner timeout value;
- exact qualified spreadsheet renderer implementation/provider;
- exact renderer executable/endpoint and timeout;
- exact official-template operator command name;
- exact PDF signing library/provider/CA/container/path/passphrase mechanism;
- signing key rotation ceremony;
- exact HSTS policy values;
- backup/restore/DR/RPO/RTO;
- performance/SLA/availability targets;
- external observability/log aggregation platform;
- exact production deployment topology.

These items MUST NOT be silently guessed by developer/coding agent.

Where necessary, they are finalized by downstream implementation/testing/deployment documents or an approved upstream synchronization decision.

---

# PART AC — AUTHORITY / HANDOFF

## 148. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| RBAC / Permission / Team | `04_RBAC_Permission_Matrix.md` |
| State / Iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI / UX | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Logical Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |
| Relational Schema | `11_ERD_Database_Schema.md` + `11A` |
| HTTP Contract | `12_API_Contract.md` |
| Repository–Service Synchronization | `12A_Repository_Service_Architecture_Synchronization.md` |
| Project Structure | `13_Project_Structure.md` |
| **Environment / Runtime Configuration** | **`14_Environment_Specification.md`** |

## 149. Environment Does Not Override Upstream Rules

Environment configuration answers **where/how a locked capability runs**, not whether the business/security capability exists.

Examples:

```text
ClamAV host/socket may vary
but CLEAN requirement does not.

storage root may vary
but private persistent resumable storage requirement does not.

signing provider may vary
but Approved PDF mandatory signing does not.

Technical Log retention may be changed through protected typed setting
but authoritative audit age purge remains forbidden.
```

## 150. Next Document

Next fixed-order document:

**`15_Coding_Rules_AGENTS.md`**

It MUST translate `01–14` into explicit developer/coding-agent constraints, coding conventions, dependency rules, security guardrails, configuration-handling rules, and implementation behaviors without changing the environment/runtime authority established here.