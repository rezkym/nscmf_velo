# System Architecture Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-ARCH-009  
> **Document Order:** 09 / 20  
> **Status:** Draft — Confirmed Architecture Baseline + Security Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Organization Model:** Single organization / single application installation  
> **Engineering Capacity Baseline:** 50 application users  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth untuk logical system architecture, component boundaries, interaction topology, synchronous/asynchronous execution boundaries, transaction/concurrency model, audit separation, attachment flow, dan export/signing/verification subsystem architecture** NSCMF Digital Form & Workflow System.

Dokumen menerjemahkan technology selection `08_Tech_Stack_Specification.md` menjadi bentuk sistem yang dapat diimplementasikan tanpa mengubah product/business decisions pada `01–07`. Confirmed security-control behavior berasal dari `10_Security_Rules.md`; `09` hanya menentukan bagaimana control tersebut ditempatkan pada logical architecture.

Dokumen mengunci antara lain:

- single-organization modular monolith;
- Browser ↔ Laravel/Inertia/Vue topology;
- MySQL source-of-truth responsibility;
- private attachment storage + malware-scan boundary;
- Business Audit vs Access Audit vs Security Audit vs Technical Logs;
- hybrid concurrency;
- asynchronous exact XLSX/PDF export;
- deterministic export snapshot binding;
- qualified spreadsheet renderer;
- Approved-PDF signing boundary;
- public PDF verification boundary;
- seven-day temporary export binary retention;
- permanent age-retention treatment of authoritative audits;
- failure isolation/idempotency;
- component dependency guardrails.

Dokumen ini tidak menentukan exact tables/columns, API payloads, exact folder structure, environment variable names, exact server paths, certificate file format/provider, atau final physical deployment topology.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — strong default.
- **MAY** — diperbolehkan.
- **AUTHORITATIVE** — source of truth untuk concern tersebut.
- **QUALIFIED** — component hanya production-eligible setelah required qualification.
- **FAIL CLOSED** — failure/uncertainty menghasilkan deny/unavailable, bukan permissive fallback.

---

# PART A — ARCHITECTURAL DRIVERS

## 3. Confirmed Drivers

Architecture MUST support:

1. single organization / single installation;
2. standalone username + password;
3. no self-registration;
4. password policy min 6, no composition rule, no MFA;
5. protected Superadmin;
6. multi-role granular RBAC;
7. ownership + Unit/Division Reviewer Scope + Approval Scope;
8. server-side authorization/state/validation/security enforcement;
9. Activation + Change;
10. Draft autosave/manual save;
11. shared Reviewer/Approver pools;
12. one successful eligible final Approver sufficient;
13. exact canonical state machine from `05`;
14. narrow Change Result capture;
15. Business/Access/Security Audit separation;
16. authoritative audits have no age-based purge;
17. private optional attachments with ClamAV CLEAN gate;
18. MySQL History/search;
19. exact XLSX/PDF template export;
20. asynchronous export through DB Queue;
21. deterministic snapshot/version binding;
22. Approved PDF signed by System/Organization;
23. signing identity manually provisioned server-side and required for normal-ready signing capability;
24. public PDF validator using signature + exact SHA-256 + issuance/currentness;
25. 168-hour/7-day generated binary retention;
26. no TSA requirement current MVP;
27. ~10 expected users, 50-user engineering baseline;
28. Docker allowed;
29. no WebSocket/Redis/search-engine requirement for MVP;
30. testing/export/security regression is first-class.

---

## 4. Architectural Priorities

Priority order:

1. business correctness;
2. authorization/security correctness;
3. workflow/state consistency;
4. auditability/traceability;
5. no data loss;
6. exact export fidelity;
7. predictable fail-closed behavior;
8. maintainability;
9. simplicity proportional to scale;
10. evidence-based performance optimization.

---

# PART B — ARCHITECTURE STYLE

## 5. Modular Monolith

```text
Modular Laravel 13 Monolith
+ Inertia 3
+ Vue 3 / TypeScript
+ MySQL 8.4 LTS
+ Database Queue Worker
+ Scheduler
+ Private Storage
+ ClamAV / clamd boundary
+ Exact Export / Renderer / Signing / Verification boundaries
```

Logical module separation does not mean microservices or separate physical servers.

---

## 6. Single Organization

No tenant switcher, tenant middleware, tenant hostnames, or artificial `tenant_id` everywhere. Unit/Division and Approval Scope are internal authorization scopes, not tenants.

---

## 7. Deployment-Agnostic Logical Components

Logical components MAY be colocated or separated physically later:

- Web/Application Runtime;
- Queue Worker;
- Scheduler;
- MySQL;
- Private Storage;
- ClamAV/clamd;
- Spreadsheet Renderer;
- protected signing identity storage/mount.

Final physical placement belongs to `20_Deployment_Architecture.md`.

---

# PART C — SYSTEM CONTEXT

## 8. High-Level Context

```text
+------------------------------+
| Internal User Browser        |
| Vue 3 + Inertia UI           |
+--------------+---------------+
               | HTTPS
               v
+----------------------------------------------------------------+
| Laravel 13 Application                                         |
|----------------------------------------------------------------|
| Identity / Session / Authorization                             |
| NSCMF Domain / Validation / Workflow                           |
| Business Audit / Access Audit / Security Audit                 |
| History / Attachment / Export / Public PDF Verification        |
+---------+---------------------+-------------------+--------------+
          | SQL                 | private I/O       | queue jobs
          v                     v                   v
+----------------+    +-------------------+   +-------------------+
| MySQL 8.4 LTS  |    | Private Storage   |   | Database Queue    |
| source of truth|    | attachment/export |   | + Queue Worker    |
+----------------+    +---------+---------+   +---------+---------+
                               |                       |
                               | scan                  | export
                               v                       v
                       +---------------+    +-------------------------+
                       | ClamAV/clamd  |    | Exact Export Subsystem  |
                       | private only  |    | OOXML Patcher           |
                       +---------------+    | Spreadsheet Renderer    |
                                            | PdfSigningService       |
                                            +-------------------------+

Public visitor
→ public rate-limited PDF verification route
→ temporary private upload
→ ClamAV CLEAN
→ PdfVerificationService
→ signature + exact SHA-256 + issuance/currentness
```

Scheduler cleans expired generated export binaries; it does **not** age-purge authoritative audits.

---

## 9. Trust Boundaries

Untrusted:

- browser input/IDs/payloads;
- filenames/MIME claims/file content;
- public validator uploads;
- client-supplied permissions/state/version values.

Trusted authority:

- Laravel authorization/domain/security services;
- MySQL persisted business/security state;
- protected official template registry;
- protected signing configuration;
- explicit ClamAV CLEAN result.

Private key never crosses to browser/public validator.

---

# PART D — APPLICATION LAYERS

## 10. Presentation Layer

Vue/Inertia presents UI, local state, autosave feedback, tables/dialogs, attachment scan feedback, export status, public validator result.

It is not authoritative for permission, state, malware trust, signature validity, or audit retention.

---

## 11. HTTP / Inertia Boundary

```text
Browser
→ Laravel route
→ authentication/session
→ Policy/Gate + scope
→ Form Request / action/security preconditions
→ Application Action
→ transaction/persistence or queued side effect
→ Inertia/structured response
```

Public validator uses a dedicated public route but still passes rate limit, file safety, ClamAV, parser/verification boundaries.

---

## 12. Application Action Layer

Conceptual actions/services include:

```text
CreateNscmf
SaveDraft
SubmitNscmf
UpdateChangeResult
ReturnForRevision
RejectNscmf
ForwardToApproval
ApproveNscmf
ReopenNscmf
ArchiveNscmf
RequestNscmfExport
ScanAttachment
SignApprovedPdf
VerifyIssuedPdf
ResetUserCredential
ChangeUserAccess
```

Controllers remain thin.

---

## 13. Domain Rule Layer

Maintains invariants from `02`, `04`, `05`, `06`, while security preconditions from `10` wrap applicable actions.

Security failure MUST NOT create a new NSCMF business state.

---

## 14. Persistence Layer

MySQL/Eloquent/Query Builder persist relational state. Generic repository wrappers are not mandatory unless they provide actual boundary value.

---

# PART E — LOGICAL MODULES

## 15. Identity & Authentication Module

Responsibilities:

- username/password login;
- login throttling integration;
- DB-backed sessions;
- temporary-password forced-change state;
- 30m idle / 8h absolute / max2 active-session enforcement;
- logout/session revocation;
- disabled-account enforcement;
- protected Superadmin integration;
- password re-auth proof for sensitive admin actions.

No MFA module is required for current MVP.

---

## 16. User / Role / Organization Administration

Responsibilities:

- users;
- roles/permissions;
- Unit/Division;
- Reviewer/Approval scopes;
- credential reset;
- protected settings.

Access-changing identity mutation triggers target-session revocation through Identity/Session component.

---

## 17. Authorization & Scope

```text
Spatie permission
+ Policy/Gate
+ ownership
+ Unit/Division scope
+ Approval Scope
+ state
+ archive treatment
+ validation
+ security preconditions
+ protected invariants
```

Reusable scope logic MUST serve record read, queues, History, export, attachments, and audit surfaces consistently.

---

## 18. NSCMF Core / Form / Workflow Modules

NSCMF Core owns record identity/current status/version/archive treatment. Activation/Change modules own family-specific data/validation. Workflow Module owns allowed transitions exactly from `05`.

Persistent states remain only:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

No security/export/scan/session technical state becomes a business status.

---

## 19. Business Audit Module

Authoritative append-oriented evidence for persisted business mutation/workflow/lifecycle action. Historical evidence is not overwritten.

No age-based purge.

---

## 20. Access Audit Module

Separate from Business Timeline. Captures configured protected-resource access such as detail view, attachment access/download, export request/download, privileged audit view where defined.

Rules:

- never changes NSCMF business status;
- never creates assignment/ownership;
- not inserted as routine Business Timeline rows;
- no age-based purge;
- privileged raw visibility follows `audit.access.view`, Protected Superadmin default, plus underlying authorized scope.

---

## 21. Security Audit Module

Separate authoritative evidence for security events such as login failures/throttling, credential reset, role/permission/access changes, session revocation, malware security outcomes, signing readiness/failure, privileged security access.

No plaintext password/private key/secret in audit payload. No age-based purge.

Privileged visibility uses `audit.security.view`, Protected Superadmin default.

---

## 22. Technical Logging Module

Runtime errors/queue/renderer/scheduler/storage diagnostics. Technical logs are not authoritative Business/Access/Security Audit. Their operational retention remains downstream.

---

## 23. History / Query Module

Own/scoped History, Review/Approval queues, archive filters, search/pagination, Business Timeline projection. All filters/counts remain within authorized query scope.

---

## 24. Attachment + Malware Module

Logical flow:

```text
Browser upload
→ authenticate/authorize/state check
→ structural validation from 06
→ private quarantine/temp
→ MalwareScanner adapter
→ ClamAvScanner
→ clamd private endpoint
   ├─ CLEAN → promote/persist normal private attachment
   └─ INFECTED / ERROR / TIMEOUT / UNAVAILABLE → fail closed
```

Business logic depends on `MalwareScanner`, not a community package. `clamd` MUST NOT be public internet-facing.

Storage/DB partial failure requires compensating cleanup; filesystem write alone never equals successful attachment mutation.

---

## 25. Export / Signing / Verification Module

Logical export components:

```text
Export Orchestrator
Snapshot / Version Binding
Template Registry
OOXML Template Patcher
Workbook Integrity Validator
SpreadsheetPdfRenderer
PdfSigningService
Issuance Metadata Repository
Export Artifact Repository
Queue Job / Worker
Cleanup Scheduler
```

Logical public validation components:

```text
Public Verification Endpoint
Temporary Upload Store
ClamAV Gate
PdfVerificationService
Issuer Public-Certificate Registry
Issuance/Hash Lookup
Currentness Resolver
```

---

# PART F — DATA OWNERSHIP

## 26. Structured Business Data

MySQL = authoritative content/current-state source. Exported files are derived outputs.

## 27. Official Template

Official versioned XLSX binary = presentation/export source of truth. MySQL determines values; template determines exact export layout.

## 28. Attachments

Binary in private storage; MySQL metadata binds object to record/authorization/security state.

## 29. Generated Export Binary

Temporary derived artifact, 168h/7d retention.

## 30. Issuance / Verification Metadata

For Approved signed PDFs, authoritative metadata required for historical verification MUST survive 7-day binary cleanup. At minimum conceptually includes export/issuance identity, bound record/version, approval iteration, issued timestamp, signer/certificate identity/fingerprint reference, and SHA-256 of final signed PDF bytes.

## 31. Audit Evidence

Business, Access, and Security Audit are authoritative and have **no age-based automatic deletion**. They are not temporary artifacts.

---

# PART G — SYNCHRONOUS REQUEST PATHS

## 32. Login

```text
Browser
→ login route
→ throttle/progressive delay
→ resolve username + active account
→ verify password
→ if valid regenerate/create DB session
→ enforce max2 sessions
→ temporary-password gate if applicable
→ Dashboard/application
```

No MFA step.

---

## 33. Record Read

```text
Browser
→ auth/session
→ Policy + scope
→ scoped query
→ Access Audit evidence
→ Inertia detail
```

No business state change.

---

## 34. Sensitive Administration

```text
Authenticated admin
→ sensitive action
→ current-password re-authentication
→ permission + protected invariant checks
→ transaction/mutation
→ Security/Business Audit as appropriate
→ revoke all target-user sessions when access-changing
```

Failed re-auth leaves target action unapplied.

---

# PART H — HYBRID CONCURRENCY

## 35. Strategy

```text
Workflow / lifecycle transition
→ short DB transaction + row-level pessimistic lock

Draft / Revision / Result persistence
→ optimistic version check
```

---

## 36. Workflow Transaction

Within locked transaction re-check actor, permission, scope, archive flag, current state, validation, destination, security preconditions; persist mutation + required Business Audit atomically.

No long scan/render/sign call inside this transaction.

---

## 37. Optimistic Persistence

Draft/Revision/Result update sends expected version; stale version yields explicit conflict and cannot silently overwrite newer data.

---

# PART I — SIDE EFFECT BOUNDARIES

## 38. After-Commit / Long Work

Notifications, exports, render/sign work, and other long-running side effects occur after business transaction commit or via queue as appropriate.

Malware scanning may be synchronous to the upload request or separately orchestrated, but file remains unavailable until explicit CLEAN and scan does not hold workflow row lock.

---

# PART J — ATTACHMENT FAILURE ISOLATION

## 39. Partial Failure

Pattern:

1. authorize/validate;
2. private quarantine write;
3. ClamAV scan;
4. on CLEAN, persist/promote metadata/object in a controlled sequence;
5. compensate/remove orphan if DB/storage persistence fails;
6. never expose untrusted/orphan object publicly.

---

## 40. Download

Only CLEAN-promoted normal attachment is downloadable through parent-record authorization. Private object path is never sufficient authorization.

---

# PART K — EXPORT ARCHITECTURE

## 41. Formats

User chooses XLSX or PDF. Both derive from official XLSX template + bound structured snapshot.

XLSX is not PDF-signed. Approved PDF is mandatory signed. Non-Approved PDF has no mandatory organization signature current rule.

---

## 42. Asynchronous Export

```text
User request
→ authorize
→ create export request
→ bind deterministic snapshot/version
→ queue DB job
→ immediate queued response

Worker
→ exact generation/render/sign
→ READY/FAILED metadata
```

Technical states such as QUEUED/PROCESSING/READY/FAILED/EXPIRED are not NSCMF business states.

---

## 43. Template Registry / OOXML Patcher

Resolve immutable template version + integrity hash + matching explicit mapping. Copy template to private workspace and modify only mapped OOXML cells/native controls. Preserve unrelated package parts. Generic rewrite that strips Form Controls is forbidden.

---

## 44. Workbook Integrity / Renderer

Integrity failure → export FAILED. PDF renderer must be qualified by golden exact-fidelity test. HTML/DomPDF approximation is not fallback.

---

## 45. Approved PDF Path

```text
APPROVED snapshot
→ exact filled XLSX
→ integrity validation
→ qualified renderer
→ exact PDF
→ PdfSigningService
→ final signed PDF bytes
→ compute SHA-256(final signed bytes)
→ persist issuance metadata
→ private artifact READY + expires_at +168h
```

If signing fails, export FAILED; NSCMF remains APPROVED; no unsigned fallback.

---

# PART L — SIGNING ARCHITECTURE

## 46. Signer Identity

Logical signer = **System / Organization**.

Human `Approved By` = eligible actor who performed `PENDING_APPROVAL -> APPROVED`.

These identities are intentionally distinct.

---

## 47. Signing Identity Custody

Confirmed security architecture:

- private key + corresponding public certificate/verification material manually provisioned/installed on server/environment;
- private key absent from GitHub, source code, normal deployment artifact, browser, and ordinary DB content;
- PdfSigningService reads protected server/environment material;
- exact file format/path/provider belongs to Environment/Deployment;
- historical public verification material required to validate old issued PDFs must remain resolvable after key rotation.

---

## 48. Required Readiness

Missing/unreadable/mismatched/unusable required signing identity:

```text
→ CRITICAL configuration/readiness failure
→ application not considered normal signing-ready/healthy
→ Approved PDF cannot silently fall back unsigned
```

Exact process-level readiness endpoint/startup behavior is finalized in Environment/Deployment while preserving this invariant.

---

## 49. TSA

Trusted Timestamp Authority is **not required for current MVP**. Application/issuance timestamp MUST NOT be advertised as independent third-party TSA evidence.

---

# PART M — PUBLIC PDF VERIFICATION ARCHITECTURE

## 50. Public Boundary

Conceptual route:

```text
/ispdfvalid
```

No login required. This is a narrow validation utility, not a public NSCMF portal.

---

## 51. Verification Flow

```text
Visitor
→ rate-limited public request
→ PDF-only temporary private upload
→ structural/size checks
→ ClamAV CLEAN
→ PdfVerificationService
   ├─ recognized issuer signature/public certificate verification
   ├─ SHA-256 exact uploaded bytes
   ├─ compare authoritative final-issued SHA-256
   ├─ resolve issuance/version/approval iteration
   └─ resolve current approval issuance context
→ minimum-disclosure result
→ delete temporary upload
```

No private key is used for validation.

---

## 52. Canonical Result Semantics

```text
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

- `VALID_CURRENT`: exact genuine issued artifact and current Approved issuance.
- `VALID_SUPERSEDED`: exact genuine issued artifact but no longer current due Reopen/Revert/newer approval issuance.
- `INVALID_MODIFIED`: integrity/signature/hash evidence indicates uploaded bytes are not exact issued artifact / invalid modification.
- `UNKNOWN`: cannot be recognized as known NSCMF-issued artifact; not automatically proof of malicious forgery.

---

## 53. Minimum Disclosure

Public validator MUST NOT expose private form data, attachments, Business Timeline, raw audits, internal storage paths, or privileged actor details merely because a PDF was uploaded.

---

# PART N — EXPORT BINARY RETENTION

## 54. Seven-Day Binary Window

```text
READY artifact
→ authorized re-download for 168 hours / 7 days
→ binary removed by scheduled cleanup
```

This cleanup does not remove source record, approval evidence, authoritative audits, or historical issuance/verification metadata.

---

## 55. Re-Export

After binary expiry, eligible user may request a new export bound to a new deterministic snapshot/version. Old issuance metadata remains historical evidence for previously distributed signed PDFs.

---

# PART O — QUEUE / SCHEDULER

## 56. Database Queue

Export jobs are retry-aware/idempotent and cannot mutate NSCMF business state merely due retry/failure.

Partial artifacts remain private and never READY until all mandatory stages complete.

---

## 57. Scheduler

Responsibilities include expired export-binary cleanup, orphan export workspace cleanup, and future maintenance. It MUST NOT:

- auto-advance Review/Approval;
- age-purge Business/Access/Security Audit;
- delete historical issuance metadata needed for validation.

---

# PART P — FAILURE ISOLATION

## 58. Database / Storage / Scan / Renderer / Signing Failure

- DB workflow transaction fail → no partial business transition/audit success.
- storage/metadata fail → attachment/export not falsely successful.
- ClamAV detection/error/timeout/unavailable → file not CLEAN/not usable.
- template/patcher/integrity fail → export FAILED.
- renderer fail/fidelity fail → PDF export FAILED, no HTML fallback.
- signing fail → Approved-PDF export FAILED, NSCMF Approval remains.
- public verification uncertainty → never claim `VALID_CURRENT`.

---

# PART Q — MODULE DEPENDENCY RULES

## 59. Preferred Direction

```text
Presentation / HTTP
        ↓
Application Actions
        ↓
Domain / Authorization / Validation / Security Preconditions
        ↓
Persistence / Audit / Storage / Scanner / Renderer / Signing adapters
```

External/runtime adapters do not decide business authorization or state.

---

## 60. Forbidden Coupling

MUST NOT:

- let Vue determine final permission/state/security truth;
- make storage path authorization;
- let OOXML patcher/renderer/signing/ClamAV change NSCMF state;
- let Access Audit change workflow;
- let technical log replace audit;
- let PDF signature replace human `Approved By`;
- let public verification endpoint bypass private-data authorization;
- let community ClamAV package define business semantics.

---

# PART R — SIGN-OFF / EVIDENCE

## 61. Workflow Sign-Off

```text
Requested By → first successful Submit actor/timestamp
Reviewed By  → current-iteration successful Forward actor/timestamp
Approved By  → final successful Approve actor/timestamp
```

## 62. PDF Integrity Evidence

Approved exported PDF adds:

```text
System/Organization cryptographic signature
+ exact final-file SHA-256 issuance evidence
```

This is document-integrity/authenticity evidence and does not redefine workflow approval.

---

# PART S — SCALE / OBSERVABILITY

## 63. 50-User Baseline

MySQL + database queue/session/cache + modular monolith remain appropriate initial architecture. ClamAV and renderer resource cost must be considered in deployment sizing.

## 64. Minimum Signals

Observe at least application errors, auth/throttle/security failures, stale conflicts, queue depth/failure, malware scanner health/failures, export stage/duration, template/renderer/signing failures, public validator failures/abuse rate, scheduler/storage failures.

Exact metrics/log platform/technical-log retention is downstream.

---

# PART T — IMPORTANT SEQUENCE FLOWS

## 65. Happy Path

```text
Requester Submit
→ locked transaction
→ DRAFT -> PENDING_REVIEW + Business Audit

Reviewer Forward
→ locked transaction
→ PENDING_REVIEW -> PENDING_APPROVAL + Business Audit

Approver Approve
→ locked transaction
→ PENDING_APPROVAL -> APPROVED + approved_by + Business Audit
```

## 66. Draft Autosave

```text
expected_version
→ authorize + DRAFT_PERSIST
→ optimistic update + Business Audit
→ version++

mismatch → conflict, no overwrite
```

## 67. Attachment

```text
upload
→ authorize/state + 06 validation
→ private quarantine
→ ClamAV
→ CLEAN only
→ persist/promote attachment
→ Business/Security Audit as applicable
```

## 68. Approved PDF Export

```text
request APPROVED PDF
→ authorize + bind snapshot
→ queue
→ OOXML patch + integrity
→ qualified renderer
→ PdfSigningService
→ final SHA-256 + issuance metadata
→ private READY artifact for 168h
→ authorized download + Access Audit
```

## 69. Public Verify

```text
public PDF upload
→ rate limit
→ ClamAV CLEAN
→ issuer signature verify
→ exact SHA-256 lookup
→ issuance/currentness resolve
→ CURRENT / SUPERSEDED / MODIFIED / UNKNOWN
→ temp upload deleted
```

---

# PART U — CONFIRMED ARCHITECTURE DECISIONS

## 70. Summary

| Concern | Confirmed Architecture Decision |
|---|---|
| Organization | Single organization / installation |
| Style | Modular Laravel monolith |
| Frontend | Vue 3 + Inertia 3 |
| DB | MySQL 8.4 LTS |
| Session/cache | DB-backed baseline |
| Async jobs | Laravel DB Queue |
| Realtime | None required MVP |
| Workflow concurrency | Short transaction + row lock/current-state revalidation |
| Draft/Result concurrency | Optimistic version check |
| Business Audit | authoritative, separate, no age purge |
| Access Audit | separate from Timeline, no age purge |
| Security Audit | separate authoritative security evidence, no age purge |
| Technical Logs | separate operational concern |
| Attachment | private quarantine/storage + ClamAV CLEAN gate |
| Export | XLSX/PDF, all async, deterministic snapshot |
| XLSX | official template + targeted OOXML patching |
| PDF renderer | qualified spreadsheet renderer |
| Approved PDF | mandatory cryptographic signing |
| Signer | System/Organization, not human Approver |
| Key custody | manually provisioned protected server/environment; never GitHub/source/deployment/ordinary DB |
| Signing readiness | missing/unusable required identity = critical readiness failure |
| TSA | not required current MVP |
| Public validator | signature + exact SHA-256 + issuance/currentness |
| Validator semantics | current / superseded / modified-invalid / unknown |
| Export binary retention | 168 hours / 7 days |
| Audit retention | no age-based purge |
| Kubernetes/microservices | not required |

---

# PART V — ARCHITECTURE GUARDRAILS

## 71. Developer / AI Must Not

Implementation MUST NOT:

1. add hidden multi-tenancy;
2. split frontend/backend or make microservices by preference;
3. let frontend authorize;
4. bypass Policy/scope for History/export/download/audit;
5. hold DB lock during user interaction/upload/scan/render/sign;
6. silently overwrite stale Draft/Result;
7. execute workflow transition without locked current-state revalidation;
8. commit successful workflow without required Business Audit;
9. pollute Business Timeline with routine access;
10. age-purge Business/Access/Security Audit;
11. expose attachment/export via public predictable path;
12. use storage path as permission;
13. treat structural upload validation as enough without ClamAV CLEAN;
14. treat scan error/timeout/unavailable as CLEAN;
15. expose `clamd` publicly;
16. render export synchronously in workflow transaction;
17. let async worker use later record version than bound snapshot;
18. generic-rewrite official XLSX if native controls may be stripped;
19. replace native controls with approximations;
20. use HTML/DomPDF fallback;
21. promote unqualified renderer;
22. treat export/scan/security state as NSCMF business state;
23. sign XLSX under PDF rule;
24. require personal Approver certificate by assumption;
25. put private signing key in browser/GitHub/source/deployment/ordinary DB;
26. deliver unsigned Approved PDF on signing failure;
27. treat missing signing identity as normal-ready state;
28. equate System/Organization signer with `Approved By`;
29. age-delete issuance metadata needed to validate historical PDF;
30. claim TSA assurance current MVP;
31. make `/ispdfvalid` a public record/history portal;
32. classify a genuine superseded PDF as modified solely because record was later Reopened/Reverted;
33. persist generated binary indefinitely by default;
34. delete source/audit when binary expires;
35. make scheduler advance business workflow;
36. add Redis/Kafka/search cluster without demonstrated need.

---

# PART W — TESTABLE ARCHITECTURE ACCEPTANCE

## 72. Application / Authorization

- [ ] One modular Laravel application; no tenant layer.
- [ ] Vue/Inertia is presentation; Laravel server authority.
- [ ] Every protected record/resource path checks server permission/scope.
- [ ] public validator exposes only narrow minimum-disclosure verification.

## 73. Concurrency

- [ ] workflow uses row-lock current-state transaction;
- [ ] Reviewer/Approver race yields one valid transition;
- [ ] Draft/Result stale version cannot overwrite.

## 74. Audit

- [ ] Business/Access/Security/Technical concerns separate;
- [ ] Business Timeline not flooded by Views;
- [ ] authoritative audits are not age-purged;
- [ ] normal user cannot mutate historical audit.

## 75. Attachment / ClamAV

- [ ] upload is private before scan;
- [ ] only CLEAN promotes;
- [ ] infected/error/timeout/unavailable fails closed;
- [ ] `clamd` private;
- [ ] object/DB partial failures compensated.

## 76. Export / Signing / Validation

- [ ] all exports queued and bound to deterministic snapshot;
- [ ] immutable template + targeted OOXML patching;
- [ ] native controls preserved;
- [ ] PDF renderer golden-qualified;
- [ ] Approved PDF goes through PdfSigningService;
- [ ] final signed bytes SHA-256 + issuance metadata persisted;
- [ ] missing/unusable signing identity causes critical readiness state;
- [ ] signing failure gives FAILED, no unsigned fallback;
- [ ] public verifier can return current/superseded/modified/unknown;
- [ ] public temp upload is deleted;
- [ ] no TSA requirement/claim.

## 77. Binary Retention / Failure

- [ ] READY binary 168h/7d then scheduler removes it;
- [ ] audit/issuance/source data remains;
- [ ] renderer/signing/scheduler failures do not rewrite NSCMF state.

---

# PART X — DOWNSTREAM HANDOFFS

## 78. `10_Security_Rules.md`

Security authority finalizes and constrains:

- exact confirmed password/session/re-auth behavior;
- browser/request hardening;
- authorization/IDOR/mass-assignment protection;
- ClamAV fail-closed controls;
- privileged audit visibility/preservation;
- secret/key handling;
- signing readiness/custody;
- public verification controls;
- safe errors/logging.

It MUST NOT change architecture or canonical business state semantics.

## 79. `11_ERD_Database_Schema.md`

Must materialize at least record/version, scopes, business/access/security audits, attachment metadata/security state, session-related data as required, export/issuance metadata, final SHA-256, signer/certificate reference, expiry timestamps, and constraints/indexes.

## 80. `12_API_Contract.md`

Must define optimistic conflict/stale action, session/re-auth errors, attachment scan outcomes, export request/status/download, and public PDF verification payloads.

## 81. `13_Project_Structure.md`

Must place actions/services/adapters (`MalwareScanner`, `PdfSigningService`, `PdfVerificationService`, renderer, audit modules) without changing responsibility.

## 82. `14_Environment_Specification.md`

Must define MySQL/queue/scheduler/storage/ClamAV/template/renderer/signing configuration paths and readiness checks without committing secrets.

## 83. `20_Deployment_Architecture.md`

Must place logical components physically and define backup/DR/availability/security operations proportional to scale.

---

# PART Y — AUTHORITY MATRIX

## 84. Authority Matrix

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariant | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| Permission/scope | `04_RBAC_Permission_Matrix.md` |
| Lifecycle/state | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| Presentation/interaction | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| **Logical architecture / concurrency / execution boundaries** | **`09_System_Architecture.md`** |
| Security controls | `10_Security_Rules.md` |
| Physical schema | `11_ERD_Database_Schema.md` |
| HTTP contract | `12_API_Contract.md` |
| Code layout | `13_Project_Structure.md` |
| Environment | `14_Environment_Specification.md` |
| Coding/AI | `15_Coding_Rules_AGENTS.md` |
| Testing | `16_Testing_Specification.md` |
| Seed | `17_Seed_Dummy_Data_Specification.md` |
| DoD | `18_Definition_of_Done.md` |
| Implementation plan | `19_Task_Implementation_Plan.md` |
| Physical production topology | `20_Deployment_Architecture.md` |

---

# PART Z — REMAINING ARCHITECTURE-ADJACENT TBDs

## 85. Still Deferred

- exact relational tables/columns;
- exact optimistic version field naming/type;
- exact API status/payloads;
- exact export-job table/enums;
- exact bulk packaging;
- exact workbook cell/control mapping;
- exact Docker/container count/placement;
- exact cron cadence after 168h eligibility;
- exact S3-compatible provider;
- exact technical-log/observability platform and retention;
- exact certificate file format/server path/provider/CA if external trust beyond NSCMF issuer/validator model is later required;
- exact key-rotation operational ceremony;
- backup/restore/DR/RPO/RTO;
- notification provider/timing;
- official company numbering SOP/sample;
- Unit/Division master data;
- final production topology;
- performance/SLA/availability targets.

The following are no longer TBD: password/MFA/session baseline, re-auth/session revocation, ClamAV technology/fail-closed behavior, authoritative audit age-retention, signing-key custody/readiness, no TSA MVP, public PDF validator semantics, exact-template export, async export, and 7-day binary retention.

---

## 86. Next Document

Next document in fixed order:

**`10_Security_Rules.md`**

It secures these architecture boundaries without changing business semantics.