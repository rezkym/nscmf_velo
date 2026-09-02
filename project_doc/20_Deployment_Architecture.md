# Deployment Architecture

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-DEPLOY-020  
> **Document Order:** 20 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md` through `19_Task_Implementation_Plan.md`  
> **Synchronized With:** `19A_Local_First_MVP_Synchronization.md`  
> **Canonical Application / Business Timezone:** `Asia/Jakarta`  
> **Last Updated:** 2026-09-02  

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk deployment posture dan runtime placement NSCMF**.

Arah current project sengaja sederhana:

```text
build and prove locally first
→ keep Docker portability compatible
→ deploy to a native server only when the app is ready and a real server exists
```

`20` tidak mengubah product, business rule, workflow, RBAC, security, schema, API, testing, atau implementation order dari `01–19`.

Jika wording deployment lama di `01–19` masih menyebut HA/SLA/DR/RPO/RTO/backup/load/server-topology sebagai current TBD/blocker, interpretasi yang berlaku adalah `19A` + dokumen ini.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — recommended default.
- **MAY** — allowed.
- **QUALIFIED** — telah lulus integration/fidelity verification yang diwajibkan.

---

# PART A — CURRENT DEPLOYMENT POSTURE

## 3. Priority — LOCKED

```text
1. Local native application compatibility/correctness — HIGH
2. Docker portability compatibility                 — MEDIUM
3. Actual server deployment                         — LATER
```

Server yang belum tersedia **bukan blocker** untuk normal application development.

Actual server deployment dilakukan setelah aplikasi siap, applicable tests/CI lulus, ada server nyata, dan user memang memerintahkan deployment.

## 4. Current MVP Deployment Scope

Current deployment scope hanya mencakup:

1. local-native development;
2. real MySQL 8.4 integration;
3. real ClamAV saat Phase 6 attachment dimulai;
4. Docker portability compatibility tanpa memaksa seluruh app masuk Docker;
5. LibreOffice Headless sebagai first PDF renderer candidate;
6. application-trusted System/Organization PDF signing;
7. mandatory CI;
8. simple future native-server reference deployment;
9. public exposure hanya untuk `/ispdfvalid`.

## 5. Explicitly Not Current MVP

Berikut **bukan requirement, blocker, atau TBD current MVP**:

```text
application uptime SLA / availability percentage
High Availability / active-active
zero-downtime architecture
load balancer
Disaster Recovery architecture
RPO / RTO
backup architecture / backup policy design
production RPS/load target
application performance SLA target
capacity-based server sizing
Kubernetes / orchestration
multi-server scaling
blue/green / canary / GitOps
automated production rollback
external observability platform selection
```

Jangan menghidupkan kembali concern tersebut tanpa explicit future requirement.

Important terminology boundary:

```text
Specific Requirements (SLA) → business/form field; KEEP
Performance Information      → business/form field; KEEP
Target KPI                    → business/form field; KEEP
```

---

# PART B — LOCAL DEVELOPMENT ARCHITECTURE

## 6. Authoritative Local Topology

```text
Developer Machine
│
├── Laravel 13 / PHP 8.5                  native local
├── Composer 2                            native local
├── Vue 3 / Vite / Node 24 LTS / npm     native local
├── Queue Worker                          native local when needed
├── Scheduler                             native/manual when needed
├── Laravel private local storage         local filesystem
│
└── Local Docker infrastructure
    ├── MySQL 8.4                         local database
    └── ClamAV / clamd                    added when Phase 6 begins
```

The application itself does **not** need to run in Docker for normal development.

Windows, macOS, or Linux MAY be used as developer workstation as long as runtime/toolchain requirements are satisfied.

Application/business behavior MUST NOT depend on developer-specific absolute paths or accidental OS behavior.

## 7. Local MySQL

Existing compatible Docker MySQL MAY be reused.

Required baseline remains:

```text
MySQL 8.4 LTS
InnoDB
utf8mb4
application DB session timezone = +07:00
```

Laravel connects through normal environment/config values.

A separate project-owned MySQL container is not required when an existing compatible local MySQL 8.4 service is already available.

## 8. Redis Is Not Used

Locked runtime remains:

```text
Session = database
Cache   = database
Queue   = database
```

Existing local Redis MUST NOT be used merely because it is already running.

Redis requires a future explicit architecture/technology change.

## 9. Local Storage / Queue / Scheduler

### Storage

Laravel private local filesystem is used.

Storage must remain private and logically separate for chunks, quarantine/assembly, final attachments, templates, exports, and validator temp.

### Queue

Laravel Database Queue remains authoritative.

Worker runs locally only when the current feature needs queued work.

No Redis/Horizon requirement.

### Scheduler

Scheduler MAY be run manually or through a local process while developing/testing scheduled behavior.

It MUST NOT auto-advance NSCMF workflow.

## 10. Local ClamAV — Phase 6

ClamAV is mandatory MVP for attachment usability, but not Phase 0 bootstrap infrastructure.

Preferred local direction when Phase 6 begins:

```text
Laravel native local
→ Docker clamd
```

Only explicit whole-file `CLEAN` passes.

Timeout/unavailable/error/infected is not CLEAN.

Chunk-only scan never replaces final assembled-file scan.

## 11. Local PDF Renderer — Phase 8

First candidate:

```text
LibreOffice Headless
```

LibreOffice is **not automatically qualified**.

Qualification must use the real official workbook/export pipeline and verify required layout, fonts, pages, content placement, and visible native-control result.

```text
PASS         → qualify and use
material FAIL → reject and discuss the next renderer
```

Do not lower fidelity requirements or pre-build multiple renderers.

HTML/DomPDF remains forbidden as authoritative PDF fallback.

## 12. Local Signing — Phase 8

Development/testing uses a dedicated **non-production Organization signing identity**.

Production signing material MUST NOT be used in local development or CI.

Current trust target is NSCMF verification through `/ispdfvalid`, not public CA/Adobe trust.

---

# PART C — DOCKER COMPATIBILITY

## 13. Meaning of Docker-Compatible

Docker compatibility is a secondary portability target.

It means the application can later run in a correctly configured containerized environment **without changing business behavior**.

It does not mean:

- every developer must use full Docker;
- Docker Compose is mandatory in Phase 0;
- production must use Docker;
- Docker success proves compatibility with every native server.

## 14. Docker Checkpoint

Docker portability MAY be proven after the local-native foundation is stable.

Before claiming Docker compatibility complete, the containerized application must be able to use the same required contracts/configuration for applicable components such as:

```text
MySQL 8.4
database Session/Cache/Queue
private storage
ClamAV
renderer
signing adapter
```

Early business implementation MUST NOT be blocked just to build a polished Docker platform.

---

# PART D — FUTURE NATIVE SERVER

## 15. Default Future Server Model — LOCKED

When a real server exists, current default is **one native Linux server**.

```text
Native Linux Server
│
├── Nginx / Reverse Proxy
├── PHP-FPM / Laravel 13
├── MySQL 8.4
├── Database Queue Worker
├── Laravel Scheduler
├── ClamAV / clamd
├── LibreOffice Headless       if qualified
├── Organization PDF Signer
└── Private Persistent Storage
```

All of these remain part of one Laravel modular monolith deployment.

Current MVP does **not** require separate app/DB/worker/scanner/render server.

## 16. Server Platform

Use a supported stable/LTS Linux distribution when a real server is selected.

Exact distro/version, provider, IP, hostname, CPU/RAM, and filesystem path are chosen only when the real host exists.

They are not current development blockers.

Recommended straightforward web runtime:

```text
Nginx
→ PHP-FPM
→ Laravel
```

Equivalent supported web server MAY be used if the actual infrastructure requires it and security/routing behavior remains equivalent.

## 17. Same-Server Runtime Components

### MySQL

MySQL 8.4 runs on the same server by default.

Laravel uses a dedicated least-privilege DB account, never root.

### Queue Worker

Database Queue worker runs on the same server under a normal OS service/process manager.

No speculative worker cluster/process scaling is required.

### Scheduler

Laravel scheduler runs on the same server, normally through an OS scheduler such as cron.

### ClamAV

Default:

```text
Laravel
→ private same-server clamd service/socket
```

No public ClamAV endpoint or scanner cluster.

Finite scanner timeout is selected from real Phase 6 integration behavior, not guessed now.

### Renderer

If LibreOffice Headless passes qualification, it runs on the same server as a private runtime dependency.

It must not be exposed publicly.

Required fonts must be installed consistently with renderer qualification.

### PDF Signer

Approved PDF uses a dedicated System/Organization signing identity on the same server runtime.

Production private key must remain outside Git, ordinary DB, browser/frontend, normal logs/audits, and CI, and outside the public web root with restricted runtime access.

Public CA / Adobe trusted-reader status is not current MVP.

---

# PART E — STORAGE / NETWORK / PUBLIC VERIFIER

## 18. Persistent Private Storage

Future server uses Laravel private local filesystem on persistent/non-ephemeral server storage.

No S3/object-storage requirement.

Exact server filesystem path is operational configuration chosen when the host exists.

Storage key/path is never authorization; protected downloads still require application authorization.

## 19. One App, Two Access Boundaries

NSCMF remains **one Laravel application**.

```text
Internal access
→ full authenticated NSCMF application

Public access
→ `/ispdfvalid` only
```

Do not create a separate validator microservice.

## 20. Internal Boundary

Keep private/internal:

```text
Login
Dashboard
Create / Draft
Review / Approval
History
Administration
Attachments
internal export management
Timeline / audits
internal JSON endpoints
protected settings
```

These MUST NOT become internet-public because the validator is public.

## 21. Public Validator Boundary

Public no-login routes remain centered on the contract from `12`:

```text
GET  /ispdfvalid
POST /ispdfvalid/verify
```

The verifier still requires:

- PDF max 20 MB;
- private temporary storage;
- ClamAV CLEAN;
- signature verification;
- exact uploaded-byte SHA-256;
- issuance/currentness lookup;
- minimum disclosure;
- rate limiting;
- temp cleanup.

Recommended simple future ingress:

```text
Internal hostname / private network or VPN
→ full Laravel app

Public verifier hostname / public ingress
→ validator routes only
→ all other NSCMF paths not exposed
```

Both may use the same Laravel runtime and same reverse proxy.

Exact DNS/hostname/IP values are selected when real infrastructure exists.

## 22. HTTPS

Any staging/production-like server deployment MUST use HTTPS for both authenticated internal access and public verifier access.

Production secure-cookie/security-header behavior remains governed by `10`/`14`.

---

# PART F — CI / DEPLOYMENT PROCESS

## 23. CI Remains Mandatory

CI remains a simple development quality gate:

```text
push / PR
→ install/build
→ lint/format
→ static analysis/type checks
→ tests
→ applicable integration gates
→ PASS / FAIL
```

CI must report truthfully. A future integration that has not been implemented/run cannot be claimed PASS.

## 24. Automated CD Is Not Current MVP

Do not build:

```text
automatic deploy on merge
registry promotion
automatic staging/production promotion
blue/green
canary
GitOps
automatic production rollback
```

Initial future server deployment MAY use a controlled manual procedure.

High-level sequence when that time comes:

```text
approved release commit/tag
→ verify CI/DoD evidence
→ provision native runtime/services
→ inject safe environment/secrets
→ install/build application
→ run forward migrations
→ run production-safe bootstrap
→ start/reload web, worker, scheduler and applicable integrations
→ verify internal access
→ verify public `/ispdfvalid` isolation
```

No zero-downtime requirement exists for current MVP.

---

# PART G — ENVIRONMENT / READINESS

## 25. Environment Interpretation

Existing classes remain:

```text
local / development
testing
CI
staging
production
```

Current interpretation:

- local/development = active implementation target;
- testing/CI = active verification;
- staging/production = future server/runtime classes.

A permanent staging server is not needed during ordinary local development.

Before a real Release/Production-Ready claim that requires staging evidence, provision an isolated production-like environment without production secrets/signing identity and verify the applicable runtime requirements from `14`/`18`/`20`.

## 26. Capability Readiness

### Early local development

Requires applicable PHP/Node tooling, MySQL 8.4 connectivity, private local storage, and normal project config.

### Attachments

Not fully ready until real whole-file ClamAV integration passes.

### XLSX

Not fully ready until real official template/mapping/OOXML fidelity is proven.

### PDF

Not fully ready until a spreadsheet renderer is qualified.

### Approved PDF

Not fully ready until real non-production cryptographic signing/verification works and no unsigned fallback exists.

### Public validator

Not fully ready until only the intended public routes are exposed and ClamAV/signature/hash/issuance/currentness/minimum-disclosure/rate-limit behavior is proven.

## 27. Claim Boundary

These claims are different:

```text
feature works locally
!= Docker portability proven
!= server deployed
!= production-ready
```

Do not fabricate staging/server/deployment evidence.

---

# PART H — RESOLVED DECISIONS / GUARDRAILS

## 28. Deployment Decision Summary

| Concern | Current Decision |
|---|---|
| Primary implementation | native local developer machine |
| Local DB | Docker MySQL 8.4 |
| Redis | not used |
| Session / Cache / Queue | database |
| Local ClamAV | Docker `clamd` from Phase 6 |
| Docker | secondary portability target |
| Future deployment | one native Linux server |
| Future MySQL | same server by default |
| Worker / scheduler | same server |
| Future ClamAV | same-server private `clamd` |
| PDF renderer | LibreOffice Headless first candidate; qualification mandatory |
| Qualified renderer placement | same server by default |
| PDF trust | application/Organization trust via `/ispdfvalid` |
| Public CA / Adobe trust | not current MVP |
| Public exposure | `/ispdfvalid` only |
| CI | mandatory |
| automated CD | not current MVP |
| HA/SLA/DR/RPO/RTO/backup/load architecture | not current MVP |

## 29. Narrow Choices Left for the Real Phase

These do not block current development:

- actual server provider/location/IP/hostname;
- exact Linux distro/version;
- exact private storage host path;
- final ClamAV timeout based on measurements;
- LibreOffice qualification outcome;
- renderer timeout based on real integration;
- exact signing library/key container/passphrase injection;
- actual internal/public DNS names;
- numeric rate-limit tuning already left operational by upstream authority.

These are narrow implementation/provisioning choices, **not permission to reopen removed enterprise architecture concerns**.

## 30. Agent MUST NOT

Coding agents MUST NOT:

1. force full-Docker development;
2. add Redis because it is locally available;
3. design HA/DR/RPO/RTO/backup/SLA/load infrastructure for current MVP;
4. invent server sizing/provider before a real host exists;
5. treat missing production server details as early blockers;
6. bypass ClamAV;
7. treat LibreOffice as qualified before fidelity testing;
8. use HTML/DomPDF as authoritative PDF fallback;
9. require public CA/Adobe trust now;
10. remove mandatory PDF cryptographic signing;
11. expose internal NSCMF routes publicly;
12. split `/ispdfvalid` into a microservice without approval;
13. build automated CD without a new requirement;
14. store production signing material in Git/ordinary DB/CI/browser/logs;
15. reinterpret business `Specific Requirements (SLA)` or `Performance Information` as application infrastructure targets.

---

# PART I — FINAL HANDOFF

## 31. Documentation Set Complete

The fixed-order project documentation is complete through:

```text
20_Deployment_Architecture.md
```

## 32. Next Project Step

The next step is implementation according to `19_Task_Implementation_Plan.md`:

```text
Phase 0
→ T00 Bootstrap Laravel 13 / PHP 8.5 application
→ T01 Bootstrap Vue/Inertia frontend
→ T02 Bootstrap testing/quality harness
→ T03 Establish minimal CI skeleton
```

Implementation posture remains:

```text
local-native first
→ local Docker MySQL 8.4
→ CI from bootstrap
→ ClamAV only when Phase 6 begins
→ LibreOffice/signing only when Phase 8 begins
→ Docker portability after local foundation is stable
→ actual native-server deployment after the application is ready
```

Do not begin coding merely because documentation is complete; begin only after explicit user instruction.
