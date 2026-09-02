# Local-First MVP / Pre-Deployment Cross-Document Synchronization

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** deployment/runtime/development-priority interpretation of `01_PRD.md` through `19_Task_Implementation_Plan.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-09-02  
> **Status:** Confirmed / Authoritative cross-document synchronization  
> **Canonical Application / Development Timezone:** `Asia/Jakarta`  
> **Next Fixed-Order Document:** `20_Deployment_Architecture.md` — only after explicit user instruction

---

## 1. Purpose

Dokumen ini menyinkronkan keputusan user setelah `19_Task_Implementation_Plan.md` mengenai **local-first development, Docker compatibility, future server deployment scope, CI versus CD, ClamAV priority, spreadsheet renderer qualification, PDF signing trust, dan penghapusan deployment over-engineering dari current MVP interpretation**.

Addendum ini tidak membuat business requirement baru. Ia mempersempit dan membersihkan wording deployment/operations yang sebelumnya masih berupa TBD atau future-enterprise placeholder sehingga developer/coding agent tidak memperlakukan hal yang belum diperlukan sebagai current MVP blocker.

Untuk concern yang secara eksplisit disinkronkan di sini, dokumen ini adalah **newer authoritative interpretation** terhadap wording lama di `01–19`. Wording lama yang bertentangan dengan keputusan ini MUST NOT digunakan untuk menghidupkan kembali requirement yang sudah dikeluarkan dari current MVP scope.

Dokumen ini tidak mengubah:

- product/business meaning NSCMF;
- canonical seven business states;
- permission-centric RBAC dan Team-neutral authorization;
- validation rules;
- API contract;
- Repository–Service Architecture;
- MySQL 8.4 requirement;
- database session/cache/queue baseline;
- private storage/security rules;
- mandatory whole-file ClamAV CLEAN rule;
- mandatory exact XLSX/PDF behavior;
- mandatory System/Organization cryptographic signing untuk Approved PDF;
- public `/ispdfvalid` verification behavior;
- TDD/testing/CI quality gates;
- authoritative audit retention.

---

# PART A — CURRENT DEVELOPMENT POSTURE

## 2. Local-First Development Is the Primary Current Target — LOCKED

Current implementation priority is:

```text
1. Make the application run correctly on the developer's local machine.
2. Complete and validate application behavior locally.
3. Maintain Docker compatibility as a secondary portability target.
4. Deploy to an actual server only when the application is ready and a real server target exists.
```

The project MUST NOT behave as if a production server, staging server, load balancer, cluster, or hosting platform already exists.

Current development work MUST optimize for a simple, reproducible local workflow first.

## 3. Recommended Local Runtime — LOCKED DIRECTION

Current primary local-development topology:

```text
Developer Machine
├── Laravel / PHP 8.5               → native local runtime
├── Composer                         → native local tooling
├── Vue / Vite / Node 24 LTS        → native local runtime/tooling
├── Queue Worker                     → native local process when needed
├── Scheduler                        → native/manual local execution when needed
├── Laravel private local storage   → local filesystem
│
└── Local Docker infrastructure
    ├── MySQL 8.4                   → approved/recommended local DB service
    └── ClamAV / clamd              → introduced when attachment Phase 6 requires it
```

Laravel/PHP/Vue application code does **not** need to run inside Docker during normal development.

A local MySQL 8.4 Docker container MAY be reused through ordinary environment configuration. The application connection still obeys `14_Environment_Specification.md`, including `utf8mb4` and application DB session timezone `+07:00`.

## 4. Redis Is Not Part of Current MVP Runtime

Even if Redis is already available on the developer machine, current locked application baseline remains:

```text
Session = database
Cache   = database
Queue   = database
```

Redis MUST NOT be introduced merely because a local Redis container already exists.

Using Redis would require an explicit future architecture/technology decision; it is not needed to satisfy current MVP requirements.

---

# PART B — DOCKER / PORTABILITY

## 5. Docker Compatibility Is Secondary, Not the Primary Development Runtime

Docker compatibility remains a valid technology requirement from `08`, but priority is:

```text
Local native compatibility → HIGH
Docker compatibility       → MEDIUM
Actual server deployment   → LATER, once a real server exists
```

Docker compatibility means project runtime assumptions must remain portable enough to be containerized when useful.

It does **not** mean:

- development must occur inside Docker;
- Docker Compose is required for every developer action;
- production must use containers;
- success inside Docker proves compatibility with every possible native server automatically.

A future native server still requires environment validation for PHP extensions, filesystem permissions, service management, web server/reverse proxy configuration, paths, and runtime dependencies.

---

# PART C — CURRENT MVP DEPLOYMENT SCOPE CLEANUP

## 6. Removed From Current MVP Planning / Blockers — LOCKED

The following concerns are **not current MVP requirements, not current implementation blockers, and must not appear as unresolved requirements that coding agents are expected to solve now**:

```text
application uptime SLA target
application availability percentage target
High Availability / HA architecture
active-active topology
zero-downtime deployment requirement
load balancer architecture
Disaster Recovery / DR architecture
RPO target
RTO target
backup architecture / backup policy design
production load target / RPS target
application performance SLA target
capacity-based server sizing
Kubernetes / orchestration architecture
multi-server scaling architecture
external observability platform selection
```

These concepts MAY be introduced later only when a real operational requirement exists and the user explicitly approves the corresponding scope.

Current documentation MUST NOT treat the absence of those items as a blocker for Task/PR Done, Feature/Module Done, current MVP development completion, or readiness to begin future server deployment work.

## 7. Important SLA / Performance Terminology Exception

The cleanup in §6 applies only to **application/infrastructure operational SLA/performance targets**.

It MUST NOT remove or reinterpret NSCMF business data such as:

```text
Specific Requirements (SLA)
Performance Information
Target KPI
```

Those are business/form concepts defined by the workbook and upstream business/validation documents and remain in scope exactly as specified.

## 8. No Invented Server Topology Before a Server Exists

Until the project has a real deployment target, implementation/docs MUST NOT invent as mandatory:

- server count;
- VM count;
- CPU/RAM sizing;
- hosting/cloud/on-prem provider;
- load balancer;
- cluster topology;
- production hostname;
- exact production filesystem mount path;
- process count tuned for a hypothetical server.

Future `20_Deployment_Architecture.md` must remain simple and local-first. It may define only the minimum future server runtime contract needed to move the already-working application from local to a real server.

---

# PART D — PUBLIC `ispdfvalid`

## 9. Public Surface Remains Narrow — LOCKED

`/ispdfvalid` remains publicly accessible without login because public PDF verification is an approved MVP capability.

This does **not** make the rest of NSCMF a public application.

Public exposure is limited to the PDF verification utility and the minimum supporting request path needed by that capability.

The following remain private/internal unless a future explicit decision changes them:

```text
Login / authenticated application
Dashboard
Create / Review / Approval / History
Administration
Attachments
internal export management
Business Timeline
raw audits
internal JSON endpoints
```

Do not introduce a separate verification microservice merely to satisfy this boundary. The verifier remains part of the same Laravel modular-monolith application unless future requirements justify a change.

---

# PART E — CLAMAV

## 10. ClamAV Remains Mandatory MVP — LOCKED

The earlier project decision remains unchanged:

```text
attachment usable
→ fully assembled file
→ whole-file ClamAV scan
→ explicit CLEAN
→ usable/downloadable
```

ClamAV is therefore a **mandatory MVP dependency for the attachment capability**.

It MUST NOT be removed, bypassed, or replaced with a fake final CLEAN result.

## 11. ClamAV Is Not an Early Bootstrap Priority

Mandatory MVP does not mean Phase 0 priority.

Implementation order remains aligned with `19`:

```text
identity / auth / RBAC
→ core NSCMF / Draft
→ workflow
→ audit/history
→ attachment / resumable upload
→ ClamAV integration
```

Current intended implementation point remains **Phase 6 — Resumable attachments + malware security**.

For local development, running `clamd` in a local Docker container is an approved simple direction when Phase 6 begins. Exact future server placement is deferred until an actual server exists and MUST NOT block earlier phases.

A finite scanner timeout remains required when the real integration is implemented; the exact value should be selected from actual integration behavior rather than invented now.

---

# PART F — SPREADSHEET PDF RENDERER

## 12. LibreOffice Headless Is the First Candidate, Not Automatically Qualified — LOCKED

To avoid over-engineering, the first renderer candidate for the exact XLSX → PDF path is:

```text
LibreOffice Headless
```

This is a **candidate selection for qualification**, not a declaration that LibreOffice is already production-qualified.

Required flow when Phase 8 reaches renderer implementation:

```text
exact XLSX generation is correct
→ render official NSCMF workbook with LibreOffice Headless
→ compare against approved workbook/PDF fidelity expectations
→ validate layout/native-control-visible result/fonts/page behavior
→ if qualification passes: use LibreOffice Headless
→ if qualification fails materially: reject it and evaluate the next renderer
```

The project MUST NOT implement multiple renderers in advance "just in case".

The project MUST NOT lower export fidelity requirements merely to make the first candidate pass.

HTML/DomPDF or other approximate HTML rendering remains forbidden as the authoritative NSCMF PDF fallback.

## 13. Renderer Priority

Renderer work is not part of initial application bootstrap.

It remains a later export/PDF capability decision under the task order in `19` and therefore MUST NOT block core local development phases.

---

# PART G — APPROVED PDF SIGNING / TRUST

## 14. Cryptographic Signing Remains Mandatory — LOCKED

Approved PDF behavior remains:

```text
human Approved By
≠
cryptographic signer

cryptographic signer = System/Organization
```

An Approved PDF MUST be cryptographically signed. Signing failure MUST NOT produce an unsigned READY Approved PDF.

## 15. Public CA / Adobe Trust Is Not Current MVP Scope — LOCKED

Current MVP does **not** require the PDF signature to appear as a publicly trusted signature in Adobe Acrobat or other generic PDF readers.

Current trust objective is:

```text
NSCMF System/Organization signing identity
→ signature cryptographically verifiable
→ `/ispdfvalid` recognizes the trusted application/organization verification material
→ exact issued-byte SHA-256 + issuance/currentness are verified
```

Therefore current MVP does not require:

```text
public CA procurement
Adobe Approved Trust List integration
reader-vendor trust program
TSA
enterprise PKI architecture
```

A dedicated non-public/self-managed Organization certificate/key identity is acceptable for MVP provided the application's verifier can validate the cryptographic signature correctly and required public verification material is preserved.

Public-reader trust MAY be introduced later as a separate explicit requirement.

## 16. Signing Implementation Timing

Exact cryptographic library, key format/container, secret injection mechanism, and rotation procedure need to be selected only when signing implementation is reached.

They are security-sensitive implementation details, not reasons to block early local application development or to design enterprise PKI now.

Production private key material remains forbidden from Git, ordinary DB fields, browser, logs, audits, and CI.

---

# PART H — CI / CD

## 17. CI Remains Mandatory Development Baseline — LOCKED

The existing CI requirement remains unchanged.

Current CI intent is intentionally simple:

```text
push / Pull Request
→ install/build as applicable
→ lint / formatting checks
→ static analysis / type checks
→ automated tests / required integration gates
→ PASS or FAIL
```

CI exists to protect implementation quality and the TDD/testing/Definition-of-Done rules already locked by `15`, `16`, and `18`.

Required failing gates remain failing; no retry-as-pass behavior.

## 18. Continuous Deployment Is Not Current Development Scope — LOCKED

Current project does **not** require an automated CD pipeline.

Do not build current-MVP infrastructure for:

```text
automatic staging deployment
automatic production deployment
container registry promotion
blue/green deployment
canary deployment
automatic production rollback
GitOps deployment orchestration
```

When an actual server exists, deployment may initially be a controlled/manual operator procedure subject to the minimum runtime/security requirements in `14`, `18`, and future `20`.

CI and CD MUST NOT be conflated: CI remains required; CD is deferred.

---

# PART I — ENVIRONMENT / RELEASE INTERPRETATION

## 19. Environment Classes Remain Valid Without Requiring Servers Today

The environment vocabulary remains:

```text
local / development
testing
CI
staging
production
```

However:

- local/development is the **primary active implementation environment now**;
- testing/CI remain active verification environments;
- staging/production are defined future runtime classes and do not imply that physical servers already exist;
- staging-specific or production-specific evidence is required only when the project actually attempts the corresponding Release/Production-Ready claim or server deployment.

An ordinary local-development feature is not blocked merely because staging/production infrastructure has not yet been provisioned.

## 20. Production-Ready Claims Stay Honest

Removing HA/SLA/DR/backup/load targets from current MVP does not authorize false production-readiness claims.

When the project eventually moves to a real server, it must still verify the runtime requirements that are actually part of the product/security architecture, including applicable:

```text
supported PHP/Laravel runtime
MySQL 8.4
HTTPS
private persistent storage
database session/cache/queue
queue worker
scheduler
real ClamAV
qualified renderer
protected System/Organization signing identity
safe secrets/configuration
public `/ispdfvalid` isolation and security
```

No HA/SLA/DR/RPO/RTO/backup architecture claim is made by current MVP documentation.

---

# PART J — EFFECT ON EXISTING DOCUMENTS

## 21. `01_PRD.md`

Interpretation update:

- remove application `Performance Target` and `Availability / DR` TBDs as current product requirements;
- remove performance/SLA/availability/backup/DR/RPO/RTO/physical-topology items from Open Product Decisions;
- preserve business `Specific Requirements (SLA)` and `Performance Information` concepts;
- local-first development posture is an implementation/runtime direction, not a new business feature.

## 22. `08_Tech_Stack_Specification.md`

Existing technology decisions remain valid:

```text
MySQL 8.4
Database Session
Database Cache
Database Queue
Docker-compatible runtime
no Redis requirement
```

Docker-compatible MUST now be read as secondary portability support, not mandatory containerized local development or production deployment.

## 23. `09_System_Architecture.md`

Logical architecture remains deployment-agnostic.

It MUST NOT be interpreted as requiring separate physical servers/containers for logical components. Co-location is acceptable when a future server is introduced if runtime/security requirements are satisfied.

## 24. `10_Security_Rules.md`

Security behavior remains unchanged except the signing-trust clarification:

- a public CA / Adobe-reader trust chain is not current MVP requirement;
- `/ispdfvalid` application trust is sufficient for current MVP;
- exact CA/public-trust integration is no longer a current unresolved blocker;
- ClamAV remains mandatory, but physical topology is not an early-development blocker;
- backup/DR is not a current security/deployment requirement.

## 25. `14_Environment_Specification.md`

Environment authority must be interpreted local-first:

- native Laravel/PHP/Node development is primary;
- local Docker MySQL 8.4 is a supported/recommended current DB topology;
- Redis remains unused under DB session/cache/queue baseline;
- local Docker ClamAV is appropriate when Phase 6 begins;
- staging/production are future runtime classes, not evidence that servers must exist now;
- physical VM/container/server counts, HA/SLA/DR/RPO/RTO/backup architecture, load targets, and observability-platform selection are not current MVP decisions;
- LibreOffice Headless is the first renderer candidate for later qualification;
- public-CA/Adobe trust is not required for signing MVP.

## 26. `15_Coding_Rules_AGENTS.md`

Coding agents MUST NOT introduce deployment/platform complexity not required by current local-first MVP.

Existing prohibition against silently resolving TBDs remains, but concerns explicitly removed from current MVP by this addendum are **not TBDs to solve**; they are simply out of current scope.

## 27. `16_Testing_Specification.md`

Testing requirements remain authoritative.

Real integration is required when the corresponding capability is implemented, but local-first development means:

- early phases are not blocked by ClamAV/renderer/signing integration before their own task phase;
- ClamAV real integration becomes applicable when attachment malware capability is implemented;
- renderer qualification becomes applicable when PDF rendering capability is implemented;
- cryptographic signing/verification becomes applicable when signing capability is implemented;
- CI remains mandatory;
- CD testing/deployment automation is not required.

## 28. `18_Definition_of_Done.md`

For current MVP interpretation:

- HA/SLA/DR/RPO/RTO/backup architecture/performance-load target absence MUST NOT be treated as a blocker;
- local Task/PR and Feature/Module Done remain based on their applicable functional/security/testing gates;
- staging/production evidence applies only when making the corresponding Release/Production-Ready claim;
- renderer/signer/ClamAV evidence is applicable only when their capability is actually being completed;
- no removed enterprise-infrastructure concern may be reintroduced through `N/A`/TBD bookkeeping.

## 29. `19_Task_Implementation_Plan.md`

The task sequence remains valid with these corrections:

- Phase 0 development starts **native local first**;
- T03 minimal GitHub Actions CI remains required;
- Docker compatibility remains secondary and must not delay normal local progress;
- Phase 6 includes real ClamAV; local Docker ClamAV is the preferred simple development topology;
- Phase 8 starts LibreOffice Headless as first renderer candidate and qualifies it before adoption;
- Phase 8 signing may use a dedicated Organization certificate trusted by `/ispdfvalid`; public CA/Adobe trust is deferred/out of MVP;
- deployment decision/blocker lists MUST NOT include HA, SLA, DR, RPO, RTO, backup architecture, performance/load targets, load balancer, Kubernetes, multi-server scaling, or observability-platform selection;
- current implementation does not need server topology before a real server exists;
- `20` will document a minimal local-first → future-server deployment contract, not enterprise infrastructure architecture.

---

# PART K — AGENT GUARDRAILS

## 30. Coding Agent MUST NOT

A coding agent MUST NOT:

1. containerize the whole application merely because Docker is available locally;
2. introduce Redis while DB session/cache/queue remains locked;
3. design HA/load-balancing/cluster infrastructure for current MVP;
4. invent backup/DR/RPO/RTO/SLA/performance targets;
5. treat missing production server details as an early-development blocker;
6. remove or bypass ClamAV because it is implemented later;
7. mark attachment CLEAN without real whole-file malware proof;
8. pre-build several spreadsheet renderers;
9. treat LibreOffice as qualified before fidelity tests pass;
10. weaken exact PDF fidelity to fit LibreOffice;
11. require public CA/Adobe trust for current signing MVP;
12. remove cryptographic signing merely because public CA trust is deferred;
13. build automated CD infrastructure when only CI is required;
14. expose the internal NSCMF application publicly merely because `/ispdfvalid` is public;
15. remove the business field `Specific Requirements (SLA)` while cleaning application SLA terminology;
16. remove `Performance Information` while cleaning application performance-target terminology.

---

# PART L — CURRENT HANDOFF

## 31. Current Authoritative State

Fixed-order documents remain:

```text
01_PRD.md
...
19_Task_Implementation_Plan.md
```

This addendum synchronizes their local-first/deployment interpretation without creating a new fixed-order number.

## 32. Next Document

Next fixed-order document remains:

**`20_Deployment_Architecture.md`**

It MUST NOT be created until the user explicitly instructs its creation after reviewing/accepting this synchronization.

`20` should remain deliberately simple and focus on:

```text
primary current local development runtime
secondary Docker portability compatibility
minimum future native-server runtime contract
public `/ispdfvalid` exposure boundary
required runtime components when server deployment actually occurs
```

It MUST NOT reintroduce removed HA/SLA/DR/RPO/RTO/backup/performance/load/cluster architecture as current MVP requirements.