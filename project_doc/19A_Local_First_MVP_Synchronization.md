# Local-First MVP / Pre-Deployment Cross-Document Synchronization

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order deliverable  
> **Applies To:** deployment/runtime/development-priority interpretation of `01_PRD.md` through `19_Task_Implementation_Plan.md`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-09-02  
> **Status:** Confirmed / Authoritative cross-document synchronization  
> **Canonical Timezone:** `Asia/Jakarta`  
> **Deployment Authority:** `20_Deployment_Architecture.md`

---

## 1. Purpose / Precedence

This addendum records the confirmed **local-first MVP direction** that was agreed before `20_Deployment_Architecture.md`.

It removes deployment over-engineering from current MVP interpretation without changing product/business/security behavior.

For the concerns explicitly covered here, this remains the synchronization authority that established the local-first direction later incorporated into the fixed-order baseline and `20`. Historical repository versions may contain the older HA/SLA/DR/RPO/RTO/backup/load/server-topology wording; the current approved documents must not reintroduce those concerns as MVP TBDs or blockers.

`20_Deployment_Architecture.md` is now the **fixed-order authoritative deployment architecture** and controls current runtime placement/default future-server topology. This addendum remains authoritative for the cross-document cleanup/local-first decisions that led to `20`.

This addendum does **not** change:

- seven canonical business states;
- permission-centric / Team-neutral authorization;
- MySQL 8.4;
- database session/cache/queue;
- private local storage semantics;
- mandatory whole-file ClamAV CLEAN;
- exact XLSX/PDF requirements;
- mandatory System/Organization signing for Approved PDF;
- public `/ispdfvalid` behavior;
- TDD/testing/CI;
- authoritative audit retention.

---

# 2. Local-First Development — LOCKED

Current priority:

```text
1. Local native application compatibility/correctness — HIGH
2. Docker portability compatibility — MEDIUM
3. Actual server deployment — LATER, after the app is ready and a real server exists
```

Current recommended local topology:

```text
Developer Machine
├── Laravel / PHP 8.5               → native local
├── Composer                         → native local
├── Vue / Vite / Node 24 LTS        → native local
├── Queue Worker                     → native local when needed
├── Scheduler                        → native/manual when needed
├── Laravel private local storage   → local filesystem
│
└── Local Docker infrastructure
    ├── MySQL 8.4                   → local DB
    └── ClamAV / clamd              → add when Phase 6 begins
```

The application itself does **not** need to run inside Docker for normal development.

A local Docker MySQL 8.4 service may be reused through normal `.env`/Laravel config. The DB connection still obeys the existing `utf8mb4` and `+07:00` session-timezone rules.

---

# 3. Redis Remains Out of Current Runtime

Locked baseline remains:

```text
Session = database
Cache   = database
Queue   = database
```

Redis MUST NOT be added merely because a local Redis container already exists.

A future Redis adoption requires an explicit architecture/technology decision.

---

# 4. Docker Compatibility — LOCKED INTERPRETATION

Docker compatibility remains required as portability support, but it does not mean:

- development must run in Docker;
- Docker Compose is mandatory for every developer;
- production must use Docker;
- success in Docker proves compatibility with every native server.

A future native server must still validate its PHP extensions, permissions, web server/reverse proxy, service management, runtime paths, and external dependencies.

---

# 5. Remove Deployment Over-Engineering From Current MVP — LOCKED

The following are **not current MVP requirements, current blockers, or TBDs that coding agents must solve**:

```text
application uptime SLA / availability percentage
High Availability / active-active
zero-downtime deployment requirement
load balancer architecture
Disaster Recovery architecture
RPO / RTO
backup architecture / backup policy design
production RPS/load target
application performance SLA target
capacity-based server sizing
Kubernetes / orchestration
multi-server scaling architecture
external observability platform selection
```

They may be introduced later only when a real requirement exists and the user explicitly approves it.

Do not invent current server count, VM count, CPU/RAM sizing, hosting provider, production hostname, load balancer, or cluster topology before a real server target exists, except for the simple default future-server topology now explicitly defined by `20`.

### Terminology safety

This cleanup applies to **application/infrastructure** SLA/performance language only.

Do **not** remove or reinterpret workbook/business concepts:

```text
Specific Requirements (SLA)
Performance Information
Target KPI
```

---

# 6. Public `/ispdfvalid` Boundary — LOCKED

`/ispdfvalid` remains public without login for PDF verification only.

The rest of NSCMF remains private/internal, including:

```text
Login / authenticated app
Dashboard
Create / Review / Approval / History
Administration
Attachments
internal export management
Timeline / raw audits
internal JSON endpoints
```

Do not create a separate verifier microservice just because this endpoint is public. It remains part of the same Laravel modular monolith.

---

# 7. ClamAV — LOCKED MVP, LATER PRIORITY

ClamAV remains mandatory for attachment usability:

```text
assembled full file
→ whole-file ClamAV scan
→ explicit CLEAN
→ usable/downloadable
```

It must not be removed, bypassed, or replaced by a fake CLEAN result.

It is **not an early bootstrap priority**. Existing implementation order remains:

```text
identity/auth/RBAC
→ core NSCMF/Draft
→ workflow
→ audit/history
→ Phase 6 attachment/resumable upload + ClamAV
```

For local development, running `clamd` in Docker is the preferred simple direction when Phase 6 starts.

`20` now defines the default future server placement as same-server private `clamd`. A finite scanner timeout is still selected when the real integration is implemented, based on actual behavior rather than an invented number now.

---

# 8. PDF Renderer — LOCKED FIRST CANDIDATE

The first XLSX → PDF renderer candidate is:

```text
LibreOffice Headless
```

This is a **qualification candidate**, not an already-qualified renderer.

When Phase 8 reaches PDF rendering:

```text
correct exact XLSX
→ render with LibreOffice Headless
→ compare official-workbook fidelity/layout/fonts/pages/native-control-visible result
→ PASS: qualify and use it
→ material FAIL: reject it and evaluate the next option
```

Do not pre-build several renderers "just in case".

Do not lower exact fidelity requirements to make LibreOffice pass.

HTML/DomPDF remains forbidden as the authoritative PDF fallback.

Renderer work does not block early local development phases.

---

# 9. Approved PDF Signing Trust — LOCKED

Approved PDF signing remains mandatory:

```text
human Approved By != cryptographic signer
cryptographic signer = System/Organization
```

Signing failure must never produce an unsigned READY Approved PDF.

Current MVP does **not** require the signature to be publicly trusted by Adobe Acrobat or generic PDF readers.

Current trust model is:

```text
System/Organization signing identity
→ cryptographic verification
→ `/ispdfvalid` recognizes trusted verification material
→ exact PDF SHA-256 + issuance/currentness verification
```

A dedicated self-managed/non-public Organization certificate/key is acceptable for MVP.

Current MVP does not require:

```text
public CA procurement
Adobe trust-list integration
TSA
enterprise PKI architecture
```

Exact signing library, key format/container, secret injection, and rotation are implementation-time security decisions when the signing capability is reached; they do not block early local development.

Production private key material remains forbidden from Git, ordinary DB fields, browser, logs/audits, and CI.

---

# 10. CI vs CD — LOCKED

CI remains mandatory and intentionally simple:

```text
push / Pull Request
→ build/install as applicable
→ lint / format
→ static analysis / type checks
→ tests / required integration gates
→ PASS or FAIL
```

Existing TDD/testing/DoD rules remain unchanged. Required failures remain failures; no retry-as-pass.

Automated **Continuous Deployment is not current MVP scope**.

Do not build current infrastructure for automatic staging/production deployment, container-registry promotion, blue/green, canary, GitOps, or automatic production rollback.

A future real server may initially use a controlled/manual deployment procedure.

---

# 11. Environment / Completion Interpretation

Environment vocabulary remains:

```text
local / development
testing
CI
staging
production
```

Interpretation:

- local/development = primary active implementation environment now;
- testing/CI = active verification environments;
- staging/production = future runtime classes; physical servers are not assumed to exist now;
- normal Task/PR or Feature work is not blocked because staging/production servers are absent;
- staging/production evidence applies only when making the corresponding Release/Production-Ready claim.

Removing HA/SLA/DR/RPO/RTO/backup/load architecture does not authorize a false Production-Ready claim. A future real server must still satisfy the actual locked runtime/security dependencies applicable to the product, such as HTTPS, MySQL 8.4, persistent private storage, queue worker, scheduler, real ClamAV, qualified renderer, protected signer, safe secrets, and public-validator isolation.

No HA/SLA/DR/RPO/RTO/backup architecture guarantee is claimed by current MVP documentation.

---

# 12. Effect on Existing Authorities

For deployment-related interpretation:

- `01_PRD.md`: application SLA/availability/DR/performance targets are not current product requirements or open decisions.
- `08_Tech_Stack_Specification.md`: Docker-compatible remains secondary portability support; MySQL + DB session/cache/queue remain locked; Redis is not introduced.
- `09_System_Architecture.md`: logical components do not imply separate physical servers/containers.
- `10_Security_Rules.md`: public CA/Adobe trust is not MVP; ClamAV stays mandatory; backup/DR is not current security/deployment scope.
- `14_Environment_Specification.md`: interpret local-first; local Docker MySQL is valid; local Docker ClamAV starts with Phase 6; hypothetical HA/SLA/DR/RPO/RTO/backup/server-count concerns are not current deployment decisions.
- `15_Coding_Rules_AGENTS.md`: removed enterprise concerns are out of scope, not TBDs to solve.
- `16_Testing_Specification.md`: real integrations become applicable in the phase/capability they prove; CI remains mandatory; CD is not required.
- `18_Definition_of_Done.md`: removed enterprise-infrastructure concerns are not completion blockers; staging/production gates apply only when corresponding release claims are made.
- `19_Task_Implementation_Plan.md`: Phase 0 is native-local first; T03 minimal CI remains; Phase 6 includes ClamAV; Phase 8 tries/qualifies LibreOffice first and uses application-trusted Organization signing; removed infrastructure concerns are not deployment blockers.
- `20_Deployment_Architecture.md`: authoritative current runtime placement/default future native-server topology.

---

# 13. Agent Guardrails

Coding agents MUST NOT:

1. force the whole app into Docker for normal development;
2. add Redis under the current DB session/cache/queue baseline;
3. design HA/load-balancing/DR/RPO/RTO/backup/SLA/load architecture for current MVP;
4. treat missing production server details as early-development blockers;
5. remove/bypass ClamAV because it comes later;
6. mark attachments CLEAN without real whole-file malware proof;
7. treat LibreOffice as qualified before fidelity testing;
8. pre-build multiple renderers without need;
9. require public CA/Adobe trust for current signing MVP;
10. remove cryptographic signing because public trust is deferred;
11. build automated CD when only CI is required;
12. expose internal NSCMF functions publicly because `/ispdfvalid` is public;
13. remove business `Specific Requirements (SLA)` or `Performance Information` while cleaning infrastructure terminology;
14. override the simple current deployment decisions in `20` without explicit requirement change.

---

# 14. Current Handoff

The fixed-order documentation set is now complete through:

```text
20_Deployment_Architecture.md
```

`19A` remains the authoritative local-first cross-document synchronization, while `20` is the authoritative deployment architecture.

The next project step is implementation according to `19_Task_Implementation_Plan.md`, beginning with:

```text
Phase 0
→ T00 Bootstrap Laravel 13 / PHP 8.5 application
```

Do not begin implementation until the user explicitly instructs coding work.
