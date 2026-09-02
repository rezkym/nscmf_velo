# Deployment Architecture

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-DEPLOY-020  
> **Document Order:** 20 / 20  
> **Status:** Draft — Authoritative Local-First / Native Deployment Architecture  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `19_Task_Implementation_Plan.md`  
> **Synchronized With:** `11A_Resumable_Attachment_Upload_Synchronization.md`, `12A_Repository_Service_Architecture_Synchronization.md`, `19A_Local_First_MVP_Synchronization.md`  
> **Canonical Application / Business Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk deployment posture dan runtime placement NSCMF** setelah product, business, architecture, environment, coding, testing, Definition of Done, dan implementation order disepakati pada `01–19`.

Current deployment direction sengaja dibuat sederhana:

```text
build and prove the application locally first
→ keep Docker portability compatibility
→ deploy to a simple native server only when the application is ready and a real server exists
```

Dokumen ini tidak membuat server yang belum ada menjadi prerequisite development.

Dokumen ini juga tidak mengubah product/business/security behavior. Ia hanya menentukan **di mana dan bagaimana runtime components ditempatkan** pada current local development dan pada future default server deployment.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default unless a real environment constraint requires an approved deviation.
- **MAY** — allowed.
- **CURRENT** — active target during current implementation.
- **FUTURE SERVER** — real server runtime after the application is ready and a server has actually been selected/provisioned.
- **REFERENCE DEPLOYMENT** — approved simple default; not permission to invent enterprise infrastructure around it.
- **QUALIFIED** — proven against the required integration/fidelity checks before operational use.

---

# PART A — AUTHORITY / SCOPE

## 3. Authority Boundary

Deployment authority must preserve all upstream locked decisions, including:

```text
Laravel 13 modular monolith
PHP 8.5
Vue 3 / TypeScript / Inertia 3
MySQL 8.4
Repository–Service Architecture
database Session
database Cache
database Queue
private Laravel local filesystem abstraction
whole-file ClamAV CLEAN gate
exact official XLSX export
spreadsheet-rendered PDF
System/Organization cryptographic signing
public `/ispdfvalid` only
CI required
CD not required
Asia/Jakarta application/business timezone
```

If an older `01–19` passage still presents removed enterprise infrastructure topics as deployment TBDs, `19A` and this document control current deployment interpretation.

## 4. Current MVP Deployment Scope

Current deployment scope is only:

1. make the application run correctly on the developer machine;
2. use real MySQL 8.4 for database integration;
3. add real ClamAV when the attachment phase requires it;
4. keep Docker portability compatible without forcing the whole app into Docker;
5. qualify LibreOffice Headless first when PDF rendering is reached;
6. implement application-trusted System/Organization PDF signing;
7. keep CI truthful;
8. define a simple future native-server runtime contract;
9. expose only the PDF validator publicly when an actual server is deployed.

## 5. Explicitly Out of Current MVP Deployment Scope

The following are **not current requirements, not current blockers, and not TBDs that implementation agents must solve**:

```text
application uptime SLA / availability percentage
High Availability / active-active
zero-downtime deployment architecture
load balancer
Disaster Recovery architecture
RPO / RTO
backup architecture / backup policy design
production RPS/load target
application performance SLA target
capacity-based server sizing
Kubernetes / orchestration
multi-server scaling
container orchestration
blue/green deployment
canary deployment
GitOps
automated production rollback
external observability platform selection
```

These concerns may return only when a real requirement exists and the user explicitly approves it.

This scope exclusion MUST NOT remove workbook/business fields named:

```text
Specific Requirements (SLA)
Performance Information
Target KPI
```

---

# PART B — DEPLOYMENT PRIORITY

## 6. Canonical Priority — LOCKED

```text
Priority 1 — Local native development compatibility/correctness     HIGH
Priority 2 — Docker portability compatibility                       MEDIUM
Priority 3 — Actual server deployment                               LATER
```

Actual server deployment begins only after:

- the application capability being deployed is implemented;
- applicable tests/CI gates pass;
- deployment is explicitly requested;
- a real server/environment exists.

A missing production server is not a blocker for ordinary local implementation.

## 7. Why Local-First

Local-first is chosen because current project priority is application correctness, not infrastructure automation.

This keeps early development focused on:

- domain behavior;
- workflow correctness;
- database behavior;
- security;
- export fidelity;
- testing;
- maintainability.

Infrastructure complexity must not be introduced only because the application may eventually run on a server.

---

# PART C — CURRENT LOCAL DEVELOPMENT ARCHITECTURE

## 8. Current Local Topology — AUTHORITATIVE

```text
Developer Machine
│
├── Laravel 13 / PHP 8.5                    native local
├── Composer 2                              native local
├── Vue 3 / Vite / Node 24 LTS / npm       native local
├── Laravel queue worker                    native local when needed
├── Laravel scheduler                       native/manual local when needed
├── Laravel private storage                 local filesystem
│
└── Local Docker infrastructure
    ├── MySQL 8.4                           approved local database
    └── ClamAV / clamd                      added when Phase 6 begins
```

The NSCMF application itself does **not** need to run inside Docker for normal development.

## 9. Local Operating System

Local development is not locked to one workstation operating system.

Windows, macOS, or Linux MAY be used as long as the project runtime/toolchain requirements are met.

Application behavior MUST NOT depend on an accidental developer-specific absolute path or OS-only behavior unless a focused adapter/configuration boundary explicitly handles it.

## 10. Local MySQL — Docker Reuse

Existing local Docker MySQL MAY be reused.

Required characteristics remain:

```text
MySQL 8.4 LTS
InnoDB
utf8mb4
application DB connection/session timezone = +07:00
```

Laravel connects through normal environment/configuration values.

The application MUST NOT require a project-owned MySQL container if an existing compatible local MySQL 8.4 container already provides the required database service.

## 11. Redis Is Not Part of Current Runtime

Even if a local Redis container exists:

```text
Session = database
Cache   = database
Queue   = database
```

Redis MUST NOT be introduced without a future explicit architecture/technology decision.

## 12. Local Private Storage

Local development uses Laravel private local filesystem storage.

Requirements:

- not publicly served as an application asset directory;
- application access remains authorization-controlled;
- upload chunks, quarantine/assembly, final attachments, exports, templates, and validator temp remain logically separated;
- path configuration may differ per workstation;
- business logic must not depend on a hard-coded machine path.

## 13. Local Queue Worker

Database Queue remains authoritative.

During early development the worker only needs to run when a task depends on queued processing.

Examples later include:

- attachment finalization/scanning orchestration where queued;
- XLSX/PDF export generation;
- other already-approved asynchronous work.

No Horizon/Redis queue infrastructure is required.

## 14. Local Scheduler

During development, scheduler behavior MAY be run manually or through a local scheduler process when the relevant feature is under test.

Scheduled responsibilities remain those already defined by upstream authority, including cleanup of eligible temporary/runtime data.

The scheduler MUST NOT auto-advance NSCMF business workflow.

## 15. Local ClamAV

ClamAV is not required during Phase 0 bootstrap, but becomes mandatory when Phase 6 attachment implementation begins.

Preferred simple local topology:

```text
Laravel native local
    ↓ private local network/socket connectivity
Docker clamd
```

Requirements remain:

- whole assembled file scanned;
- explicit CLEAN only;
- timeout/unavailable/error/infected is not CLEAN;
- no fake CLEAN for normal feature completion;
- chunk-only scan cannot replace final whole-file scan.

## 16. Local PDF Renderer

The first renderer candidate is:

```text
LibreOffice Headless
```

It is introduced only when Phase 8 reaches PDF rendering.

It is not qualified merely because it starts successfully.

Qualification requires the exact official workbook/export pipeline to preserve acceptable:

- workbook visual layout;
- page layout;
- fonts;
- visible native-control state;
- required content placement;
- expected PDF fidelity.

Material fidelity failure means LibreOffice is rejected and the next renderer option is discussed before implementation.

## 17. Local Signing Identity

Development/testing must never use a future production private key.

When signing integration is implemented, local/testing uses a dedicated non-production Organization signing identity.

Current trust objective is application verification through `/ispdfvalid`, not Adobe/public-CA trust.

---

# PART D — DOCKER COMPATIBILITY

## 18. Docker Compatibility Meaning

Docker compatibility is a **secondary portability target**.

It means the application should be capable of running in a correctly configured containerized environment without changing product/business behavior.

It does **not** mean:

- every developer must run the whole stack in Docker;
- Docker Compose is mandatory for early development;
- production must use Docker;
- Docker success proves compatibility with every native server.

## 19. Docker Compatibility Checkpoint

Docker compatibility MAY be proven after the local-native foundation is stable and MUST be checked before claiming portability support is complete.

The check should demonstrate at minimum that the application can receive the same required runtime configuration and connect to:

```text
MySQL 8.4
database Session/Cache/Queue
private filesystem
ClamAV when applicable
renderer when applicable
signing adapter when applicable
```

Do not block Phase 0 or early business features merely to build a polished container platform.

## 20. No Docker-Specific Business Logic

Application code MUST NOT branch business behavior merely because it is running inside or outside Docker.

Runtime differences belong in configuration/adapters, not business rules.

---

# PART E — FUTURE DEFAULT SERVER DEPLOYMENT

## 21. Default Future Deployment Model — LOCKED

When the application is ready and a real server is provisioned, the default deployment model is a **single native Linux server**.

Reference topology:

```text
Native Linux Server
│
├── Web Server / Reverse Proxy
├── PHP-FPM / Laravel 13
├── MySQL 8.4
├── Database Queue Worker
├── Laravel Scheduler
├── ClamAV / clamd
├── LibreOffice Headless       if/after qualified
├── Organization PDF Signer    protected runtime identity
└── Private Persistent Storage
```

This is one modular-monolith deployment, not microservices.

No separate application server, database server, load balancer, cluster, Kubernetes layer, or dedicated upload service is required for current MVP.

## 22. Linux / Web Server Direction

A supported Linux server is the reference server platform.

An LTS/stable Linux distribution SHOULD be used when an actual host is selected.

Exact distribution/version is chosen at provisioning time based on the available environment and supported PHP/MySQL/runtime packages; it is not an early-development blocker.

Recommended straightforward HTTP runtime:

```text
Nginx
→ PHP-FPM
→ Laravel
```

A different supported web server MAY be used only when the real infrastructure requires it and equivalent HTTPS/routing/security behavior is preserved.

## 23. Same-Server MySQL — Default

For the current simple deployment, MySQL 8.4 runs on the same native server by default.

Application uses a dedicated least-privilege MySQL account, never root.

A future organization-provided external/managed database MAY replace same-server MySQL without changing domain architecture, but it is not required now.

## 24. Same-Server Queue Worker — Default

Queue worker runs on the same native server and uses Laravel Database Queue.

A standard OS service/process manager SHOULD keep the worker process running when server deployment occurs.

No Redis/Horizon or separate worker host is required.

Exact worker process count is not fixed before real runtime usage demonstrates a need; current MVP does not require speculative worker scaling.

## 25. Same-Server Scheduler — Default

Laravel scheduler runs on the same server.

A normal OS scheduler mechanism such as cron MAY invoke the Laravel scheduler entrypoint.

No separate scheduler host is required.

## 26. Same-Server ClamAV — Default

Future native-server default:

```text
Laravel
→ private same-server clamd service/socket
```

No public ClamAV endpoint.

No ClamAV cluster is required.

The final finite scanner timeout must be selected during real Phase 6 integration from measured behavior; it must not be guessed solely to fill documentation.

## 27. Same-Server Renderer — Default After Qualification

If LibreOffice Headless passes qualification, future native-server default is to run it on the same server as a private local executable/runtime dependency.

Requirements:

- not exposed publicly;
- worker invokes it through the focused `SpreadsheetRenderer` adapter;
- required fonts installed consistently;
- rendering occurs outside workflow row locks;
- timeout/failure is explicit;
- no HTML/DomPDF authoritative fallback.

If LibreOffice fails qualification, this placement rule does not authorize lowering fidelity; the renderer decision must be revisited.

## 28. Same-Server PDF Signing — Default

Approved PDF signing uses a dedicated System/Organization identity on the same server runtime.

Current MVP trust model:

```text
protected Organization private key
+ corresponding public certificate/verification material
→ sign exact final Approved PDF
→ persist issuance/final SHA-256/public verification evidence
→ `/ispdfvalid` verifies application-trusted identity
```

Production key requirements when a real server exists:

- never committed to Git;
- never stored in ordinary application DB fields;
- never exposed to browser/frontend;
- never written to Business/Access/Security Audit or normal logs;
- never supplied to CI;
- stored outside the public web root;
- accessible only to the required runtime account/process through protected filesystem/secret injection.

Public CA / Adobe trust-list integration is not current MVP.

Exact signing library/key container/passphrase mechanism is finalized when the signer implementation is reached, without changing the above trust/security boundary.

---

# PART F — STORAGE ARCHITECTURE

## 29. Server Private Storage — LOCKED

Future server uses Laravel private local filesystem on **persistent/non-ephemeral server storage**.

No S3/object-storage requirement exists for current MVP.

Storage must remain outside publicly served application assets.

Logical storage categories remain separated, for example:

```text
upload chunks
assembly / quarantine
final attachments
official XLSX templates
export working files
READY export artifacts
public-validator temporary files
```

Exact host path is operational configuration chosen when the real server filesystem is known; it is not a current development blocker.

## 30. Storage Authorization

A filesystem path or storage key is never authorization.

All protected attachment/export retrieval must re-check application authorization and resource relationship.

Public validator temporary storage never grants access to internal attachment/export storage.

---

# PART G — NETWORK / INGRESS ARCHITECTURE

## 31. One Application, Two Access Boundaries

NSCMF remains **one Laravel application**.

It has two network exposure contexts:

```text
Internal access
→ full authenticated NSCMF application

Public access
→ `/ispdfvalid` verification capability only
```

Do not create a separate verifier microservice.

## 32. Internal Application Boundary

The following remain internal/private:

```text
Login
Dashboard
Create NSCMF
Draft/autosave
Review
Approval
History
Administration
Attachments
internal export management/download authorization
Timeline
raw Access/Security Audit
internal JSON endpoints
protected settings
```

They must not become internet-public merely because the verifier is public.

## 33. Public Validator Boundary

Public no-login exposure is limited to the approved validator routes/flow from `12`, centered on:

```text
GET  /ispdfvalid
POST /ispdfvalid/verify
```

Public validator still enforces:

- PDF max 20 MB;
- private temporary handling;
- ClamAV CLEAN;
- signature verification;
- exact uploaded-byte SHA-256;
- issuance/currentness lookup;
- minimum disclosure;
- rate limiting;
- temporary cleanup.

## 34. Future Reverse-Proxy Exposure — Recommended Simple Pattern

When a real server is deployed, the recommended simple pattern is one reverse proxy with two access contexts on the same application runtime:

```text
Internal host / private network or VPN
→ full Laravel application

Public verifier host / public ingress
→ allow validator routes only
→ deny/not-route all other NSCMF paths
```

Exact hostnames/IPs/DNS names are chosen when real network details exist.

A second Laravel deployment is not required.

## 35. HTTPS

When staging/production-like/public server deployment exists:

- HTTPS is mandatory;
- public validator uses HTTPS;
- authenticated internal application uses HTTPS;
- production session cookies use the locked secure cookie behavior from `10`/`14`.

HSTS is enabled only after HTTPS/host behavior is correctly configured, consistent with security authority.

---

# PART H — ENVIRONMENT / SECRET BOUNDARY

## 36. Environment Classes

Existing classes remain:

```text
local / development
testing
CI
staging
production
```

Interpretation under this deployment architecture:

- `local/development` — primary active development target now;
- `testing` — automated/local isolated tests;
- `CI` — automated verification;
- `staging` — future production-like validation environment when needed;
- `production` — future real operational environment.

A permanent staging server is not required during ordinary local development.

## 37. Production Secrets

Production secrets do not need to exist before a real production server exists.

When deployment occurs, secrets are injected outside source control.

This includes at minimum:

- `APP_KEY`;
- production DB credential;
- production signing private-key reference/passphrase where applicable;
- other actual environment-specific secrets.

No production secret goes into `.env.example`, GitHub repository content, browser bundle, logs, or CI.

## 38. Configuration Cache / Runtime

Future native deployment must remain compatible with Laravel configuration caching.

Business code reads environment-backed values through Laravel config, not scattered `env()` calls.

---

# PART I — CI / RELEASE / DEPLOYMENT PROCESS

## 39. CI Remains Mandatory

CI remains a development quality gate:

```text
push / Pull Request
→ install/build
→ lint/format
→ static analysis/type checks
→ tests
→ applicable real integration gates
→ PASS / FAIL
```

CI must not pretend a future capability integration passed before that capability/provider exists.

## 40. Automated CD Is Not Current MVP

There is no current requirement for:

```text
automatic deploy on merge
container registry promotion
automated staging promotion
automated production promotion
blue/green
canary
GitOps
automatic rollback
```

Do not build those systems unless a later requirement explicitly adds them.

## 41. Future Deployment Is Human-Controlled

When a real server exists, initial deployment MAY be a controlled manual procedure.

High-level sequence:

```text
select approved release commit/tag
→ verify required CI/DoD evidence
→ provision required native runtime/services
→ inject environment configuration/secrets
→ install application dependencies/build assets as approved
→ run forward migrations
→ run production-safe reference/bootstrap process
→ start/reload web runtime, queue worker, scheduler, ClamAV, renderer/signing dependencies as applicable
→ verify internal application boundary
→ verify public `/ispdfvalid` boundary
→ verify critical application/integration smoke paths
```

This document does not require zero-downtime deployment.

## 42. Migration Safety During Deployment

Shared/applied migrations remain immutable.

Production schema changes use new forward migrations.

Do not use destructive reset/refresh shortcuts on real server data.

Production Demo Seeder remains hard blocked.

## 43. Deployment Failure

A failed deployment/readiness check must be reported as failure.

Do not hide a failed migration, worker, ClamAV, renderer, signer, or route-boundary check behind a successful web-homepage response.

No fabricated deployment evidence.

---

# PART J — CAPABILITY READINESS

## 44. Local Development Readiness

A local environment is ready for early implementation when applicable bootstrap prerequisites exist:

```text
PHP 8.5 / Composer
Node 24 LTS / npm
Laravel/Vue application bootstrap
MySQL 8.4 reachable
private local storage writable by the app
required local configuration
```

Later capabilities add their own dependency only when reached.

## 45. Attachment Capability Readiness

Attachment module cannot be called fully ready until real whole-file ClamAV behavior is proven.

Local Docker `clamd` is the preferred current integration path.

## 46. XLSX Capability Readiness

Exact XLSX capability requires:

- real official template binary;
- explicit mapping;
- targeted OOXML processing;
- preservation of required VML/control/package structures;
- fidelity/integrity tests.

## 47. PDF Capability Readiness

PDF capability requires a **qualified** spreadsheet renderer.

Current candidate order begins with LibreOffice Headless only; do not implement speculative alternatives before material failure requires one.

## 48. Approved PDF Capability Readiness

Approved PDF export cannot be called ready unless:

- System/Organization signing works with real non-production cryptographic proof during integration;
- signing failure produces no unsigned fallback;
- issuance/final SHA-256 evidence is persisted correctly;
- verifier recognizes the trusted Organization verification material.

## 49. Public Validator Readiness

Public validator cannot be called ready unless:

- public routes expose only the intended verifier capability;
- uploaded PDF remains private temporary data;
- real ClamAV gate works;
- signature/hash/issuance/currentness checks work;
- disclosure remains minimal;
- rate limiting exists;
- internal application routes are not unintentionally exposed through the public ingress.

---

# PART K — PRODUCTION-READY CLAIM BOUNDARY

## 50. Local Feature Completion Is Not Production Deployment

Passing local tests and CI does not mean the system is deployed.

Likewise, absence of a server does not block normal feature implementation.

These are separate claims:

```text
feature works locally
!= Docker portability proven
!= server deployed
!= production-ready
```

## 51. Server Deployment Readiness

When a real server deployment is attempted, the applicable locked runtime requirements from `14`, `18`, `19A`, and this document must be verified against that environment.

At minimum, depending on implemented capabilities:

```text
HTTPS
APP_DEBUG=false
MySQL 8.4
least-privilege DB account
database Session/Cache/Queue
persistent private storage
queue worker
scheduler
real ClamAV
qualified renderer
protected Organization signer
safe secret injection
internal/public ingress isolation
Technical Log lifecycle
```

## 52. Staging Interpretation

Upstream staging requirements remain a production-like validation concept.

A dedicated permanent staging machine is not required today.

Before an actual Release/Production-Ready claim that requires staging evidence, an isolated staging environment must be provisioned sufficiently to prove the required server/runtime behaviors without using production secrets/signing identity.

Its exact physical host is not part of current local implementation work.

---

# PART L — NON-GOALS / AGENT GUARDRAILS

## 53. Deployment MUST NOT Introduce Architecture Drift

Deployment does not authorize:

- microservices;
- separate upload service;
- separate PDF-validator service;
- API Gateway;
- Redis/Horizon;
- Kafka/RabbitMQ;
- Elasticsearch;
- S3 requirement;
- Kubernetes;
- multi-server deployment;
- Team-based authorization;
- new business states.

Any future change requires explicit authority synchronization.

## 54. Coding Agent Rules

Coding agents MUST NOT:

1. force full Docker development instead of the current local-native target;
2. add Redis because it happens to exist locally;
3. design HA/DR/RPO/RTO/backup/SLA/load infrastructure for current MVP;
4. invent CPU/RAM sizing or hosting provider before a real server is selected;
5. treat missing production hostname/server as an early implementation blocker;
6. remove ClamAV because it is implemented later;
7. mark attachment CLEAN without real whole-file ClamAV proof;
8. treat LibreOffice as qualified before fidelity testing;
9. silently substitute HTML/DomPDF for authoritative PDF rendering;
10. require public CA/Adobe trust for current signing MVP;
11. remove mandatory cryptographic signing because public trust is deferred;
12. expose internal routes through public verifier ingress;
13. split `/ispdfvalid` into a microservice without approval;
14. create automated CD infrastructure without a new requirement;
15. store production signing material in repository/ordinary DB/CI;
16. claim server/staging/production evidence that was not actually executed;
17. interpret `Specific Requirements (SLA)` or `Performance Information` as application-infrastructure SLA/performance targets.

---

# PART M — RESOLVED DEPLOYMENT DECISIONS

## 55. Decision Summary

Current deployment decisions are now:

| Concern | Current Decision |
|---|---|
| Primary implementation environment | native local developer machine |
| Local database | Docker MySQL 8.4 approved/recommended |
| Local Redis | not used |
| Session | database |
| Cache | database |
| Queue | database |
| Local ClamAV | Docker `clamd` when Phase 6 begins |
| Docker | secondary portability target, not mandatory runtime |
| Future production style | simple native deployment |
| Future default host count | one native Linux server |
| Future DB placement | same server by default |
| Future queue worker | same server |
| Future scheduler | same server |
| Future ClamAV | same server private `clamd` |
| PDF renderer | LibreOffice Headless first candidate; qualification mandatory |
| Future qualified renderer placement | same server by default |
| Approved PDF trust | application/Organization trust through `/ispdfvalid` |
| Public CA / Adobe trust | deferred / not current MVP |
| Public application exposure | `/ispdfvalid` only |
| Internal application | private/internal ingress |
| CI | mandatory |
| automated CD | not current MVP |
| HA/SLA/DR/RPO/RTO/backup/load architecture | not current MVP scope |

## 56. Decisions Intentionally Left Until Real Implementation/Provisioning

The following do not block current development and must be chosen only when the relevant real environment/capability exists:

- actual server provider/location/IP/hostname;
- exact Linux distribution/version;
- exact persistent host filesystem path;
- final ClamAV finite timeout based on integration measurements;
- LibreOffice qualification result and, if it fails, the next renderer choice;
- renderer timeout based on real integration behavior;
- exact signing library/key container/passphrase injection implementation;
- exact production/internal/public DNS names;
- numeric rate-limit tuning already left operational by upstream specs.

These are narrow implementation/provisioning choices, not permission to reopen removed HA/SLA/DR/RPO/RTO/backup/load architecture.

---

# PART N — FINAL DOCUMENTATION HANDOFF

## 57. Documentation Set Completion

With this document, the fixed-order project documentation set is complete:

```text
01_PRD.md
02_Business_Rules.md
03_User_Flow.md
04_RBAC_Permission_Matrix.md
05_State_Status_Flow.md
06_Validation_Rules.md
07_UI_UX_Specification.md
08_Tech_Stack_Specification.md
09_System_Architecture.md
10_Security_Rules.md
11_ERD_Database_Schema.md
12_API_Contract.md
13_Project_Structure.md
14_Environment_Specification.md
15_Coding_Rules_AGENTS.md
16_Testing_Specification.md
17_Seed_Dummy_Data_Specification.md
18_Definition_of_Done.md
19_Task_Implementation_Plan.md
20_Deployment_Architecture.md
```

Addenda remain authoritative only for their scoped synchronization concerns according to their status/precedence.

## 58. Implementation Handoff

The next project step is **implementation**, not another mandatory specification document.

Implementation begins from `19`:

```text
Phase 0
→ T00 Bootstrap Laravel 13 / PHP 8.5 application
→ T01 Bootstrap Vue/Inertia frontend
→ T02 Bootstrap testing/quality harness
→ T03 Establish minimal CI skeleton
```

Current implementation posture for that handoff remains:

```text
local-native first
→ MySQL 8.4 from compatible local Docker infrastructure
→ CI from bootstrap
→ later feature integrations when their phase is reached
→ Docker portability compatibility after local foundation is stable
→ actual native server deployment only after the application is ready
```

Do not begin implementation merely because this document exists; begin when the user explicitly instructs coding work.
