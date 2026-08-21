# Security Rules Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-SEC-010  
> **Document Order:** 10 / 20  
> **Status:** Draft — Confirmed Security Baseline + Team/Permission Synchronization  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`  
> **Organization Model:** Single organization / single application installation  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk security policy dan security-control behavior** NSCMF Digital Form & Workflow System.

Security Rules mengamankan decisions 01–09 tanpa mengubah product scope, business invariants, permission semantics, canonical lifecycle, business-field validation, UI business meaning, technology selection, atau logical architecture.

Current authorization synchronization:

- Team is organizational/profile data only;
- there is no Unit/Division;
- there is no Reviewer Scope or Approval Scope;
- required permission is the RBAC capability gate;
- explicit ownership remains only where business rule requires own-record behavior;
- current state/archive/validation/protected invariants/security/concurrency remain additional gates;
- Spatie Teams is disabled and MUST NOT be introduced through security middleware;
- Team changes alone do not change authorization.

Security Rules cover authentication/password, temporary credentials, throttling, sessions, sensitive-action re-authentication, backend authorization hardening, browser/request security, attachment/ClamAV, permanent audits, secrets, private export, Approved-PDF signing, public PDF validation, final-file SHA-256, safe errors/logging.

---

## 2. Normative Language

- **MUST** — mandatory.
- **MUST NOT** — forbidden.
- **SHOULD** — strong default unless explicit project decision differs.
- **MAY** — allowed.
- **FAIL CLOSED** — uncertainty results in denial/unavailability.
- **AUTHORITATIVE AUDIT** — durable Business/Access/Security evidence with no age-based purge.
- **SIGNING IDENTITY** — private signing key + corresponding public certificate/verification material.

---

# PART A — SECURITY AUTHORITY / TRUST

## 3. Authority Precedence

Security MUST NOT redefine:

1. Product scope (`01`);
2. Business invariants (`02`);
3. User Flow (`03`) except security gates;
4. permission-centric authorization (`04`);
5. State/workflow iteration (`05`);
6. business validation (`06`);
7. UI meaning (`07`);
8. technology/package baseline (`08`);
9. architecture/concurrency (`09`).

Canonical business states remain exactly:

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

Authentication/session/malware/export/signing/verification conditions are not NSCMF states.

## 4. Untrusted Inputs

Treat as untrusted until validated/authorized:

- browser input, IDs, URL/query/body;
- filenames/MIME/file contents;
- public PDF uploads;
- client-supplied state/version;
- client-supplied actor/timestamp;
- client-supplied role/permission/Team assignment admin inputs;
- export/download IDs/keys;
- user text rendered in Vue.

Trusted authority resides in:

- authenticated server session;
- Spatie/Laravel permission resolution;
- Policies/Gates + domain authorization;
- MySQL persisted business/security state;
- application/domain services;
- protected template registry;
- protected signing configuration;
- explicit trusted ClamAV CLEAN response.

Team membership is trusted data only after validation but is **not authorization authority**.

## 5. Fail Closed

Examples:

```text
authorization uncertain      → DENY
required permission missing  → DENY
resource/ownership uncertain → DENY
session invalid/expired      → REQUIRE LOGIN
ClamAV no CLEAN              → FILE NOT USABLE
Approved PDF sign failure    → EXPORT FAILED
signing identity missing     → CRITICAL NOT-READY
verification unclear         → MUST NOT RETURN VALID_CURRENT
```

---

# PART B — AUTHENTICATION / PASSWORD

## 6. Authentication Model

Exactly:

```text
username + password
```

- no self-registration;
- no mandatory SSO/LDAP/OAuth;
- no MFA;
- no OTP/authenticator requirement.

Login/logout are authentication/session operations and MUST NOT depend on Spatie `session.login`/`session.logout` permission rows.

## 7. Password Policy

Final product decision:

- minimum length **6**;
- no required uppercase;
- no required lowercase;
- no required number;
- no required symbol;
- no composition combination;
- no periodic forced expiry solely by age.

Implementation MUST NOT strengthen this policy by preference without explicit requirement change.

## 8. Password Storage / Disclosure

MUST:

- never persist plaintext password;
- use Laravel-supported secure hashing;
- never log plaintext;
- never expose password hash to browser/API;
- never include current/new/temp password in Business/Access/Security Audit, stack trace, dump, export;
- never commit real passwords to repository/fixtures/docs.

## 9. Password Change Triggers

Required for temporary credential replacement, admin reset, intentional user password change, or future approved incident process. Not time-based periodic expiration.

---

# PART C — ACCOUNT CREATION / RESET

## 10. No Self-Service Registration

Normal users cannot create own account.

## 11. Admin-Created User Flow

```text
authorized admin
→ current-password re-auth
→ create eligible account
→ establish temporary password
→ target authenticates
→ forced password replacement
→ normal app access
```

Temporary password sensitive, no plaintext audit/log/repository storage.

## 12. Admin Password Reset

1. acting admin re-authenticates current password;
2. target eligibility/protected invariant checked;
3. temp reset credential created;
4. **all target active sessions revoked**;
5. target authenticates with temporary credential;
6. mandatory password change;
7. safe Security Audit.

No self-service Forgot Password email baseline.

---

# PART D — LOGIN THROTTLING

## 13. Throttling

Server-side rate limiting/progressive temporary delay for repeated failures. Context SHOULD combine username/account key and source/IP where appropriate. No permanent hard-lock solely for wrong attempts. Successful login MAY reset applicable counters.

## 14. Enumeration Resistance

Failure must not disclose username existence vs wrong password. Public Login remains generic.

## 15. Auth Security Audit

Capture appropriate success/failure/throttling/disabled-account/reset/temp-password-replacement evidence without supplied password.

---

# PART E — SESSION SECURITY

## 16. Confirmed Policy

```text
idle timeout      = 30 minutes
absolute lifetime = 8 hours
maximum sessions  = 2 active sessions/account
```

Server enforced.

## 17. Idle Timeout

After 30m qualifying inactivity session invalid → login required. Persisted Draft not deleted.

## 18. Absolute Lifetime

No session valid beyond 8h security-defined creation/auth point even if active.

## 19. Max Two Sessions

Account MUST NOT retain >2 active authenticated sessions. Exact third-login replacement/denial policy downstream, invariant `active_session_count <= 2`.

## 20. Session Regeneration

Regenerate identifier after successful authentication and security-sensitive auth-state changes as appropriate.

## 21. Logout

Invalidate current server-side session; deleting browser cookie only is insufficient.

## 22. Mandatory Session Revocation

All active sessions of target user MUST be revoked after:

- admin password reset;
- role assignment/removal;
- role-permission mutation that changes target user's effective permissions;
- direct permission assignment/removal **if a future approved feature uses it**;
- disabling target account;
- equivalent authorization-changing identity/security mutation.

**Team assignment/change alone is not an authorization change and MUST NOT be treated as a permission revocation/grant.**

If acting user changes own applicable credential/effective authorization, own sessions revoked as applicable.

---

# PART F — SENSITIVE-ACTION PASSWORD RE-AUTH

## 23. Definition

No MFA. Re-auth means acting authenticated user enters current password again before sensitive administration.

## 24. Actions Requiring Re-auth

At minimum:

- password reset of another user;
- role assignment/removal;
- permission assignment/removal on roles;
- protected signing/security configuration mutation if exposed;
- other equivalent privilege-changing actions.

Team-only organizational changes do not need to be classified as privilege-changing merely because Team changes, although ordinary admin authorization still applies.

## 25. Failure

Failed re-auth → action unapplied, no partial role/permission/reset mutation; failure MAY be Security Audited.

## 26. Proof Lifetime

MAY issue short-lived server-side proof scoped to tightly related sensitive operations. Exact duration downstream.

---

# PART G — AUTHORIZATION HARDENING

## 27. Deny by Default

Effective authorization:

```text
valid session
+ required permission
+ resource authorization
+ explicit ownership where the business rule requires ownership
+ current business state
+ archive treatment
+ validation
+ protected invariant
+ security preconditions
+ concurrency/current-state revalidation
```

**Team is intentionally absent.**

## 28. Backend Enforcement

Every protected operation server-authorized, including:

- direct record URL;
- History/search/filter;
- Review/Approval queue and action;
- attachment view/download;
- export request/status/download;
- Business Timeline;
- raw Access/Security Audit;
- user/role/permission/Team administration;
- Reopen/Archive/Unarchive;
- Result-only mutation;
- queued artifact retrieval.

Hidden frontend controls never replace backend checks.

## 29. IDOR Protection

Knowing/manipulating record/attachment/export/audit/storage IDs never grants access. Backend rechecks related resource authorization.

## 30. Mass Assignment / Whitelisting

Specific action whitelist only.

Examples:

- Result endpoint accepts only Result fields;
- Requester cannot set business status;
- normal user cannot inject approved_by;
- actor/timestamp/audit identity server-derived;
- role/permission/Team admin inputs validated but not trusted authority;
- protected flags not generic mass-assigned.

## 31. Protected Superadmin

No API/bulk/security path may delete/disable/remove protected role/downgrade protected Superadmin.

Protected Superadmin authority MUST NOT bypass impossible domain actions such as Reopen Cancelled or hard-delete NSCMF.

## 32. Team / Spatie Boundary

Security implementation MUST preserve:

```text
business Team = organizational data only
Spatie teams = false
```

MUST NOT:

- enable Spatie Teams;
- use Team ID in Review/Approval permission decisions;
- call `setPermissionsTeamId()` for normal authorization;
- add scope middleware based on Team;
- infer privilege from Team name such as `NOC`.

---

# PART H — BROWSER / REQUEST SECURITY

## 33. HTTPS

Production private app and public PDF verification MUST use HTTPS.

## 34. Session Cookies

Appropriate HttpOnly, Secure in production, SameSite, constrained domain/path.

## 35. CSRF

Authenticated state-changing browser requests use Laravel CSRF protection. No global disablement.

## 36. XSS / Rendering

User-controlled text rendered safely by default; avoid raw `v-html` without explicit sanitization. Protect reasons/comments, customer/service values, filenames, audit text, results, validation reflections.

## 37. Headers

Tested baseline CSP, anti-clickjacking/frame-ancestors, nosniff, safe Referrer Policy, HSTS after correct HTTPS deployment.

## 38. CORS

No permissive cross-origin CORS needed for same-app Inertia. No wildcard credentialed origins.

---

# PART I — INPUT / DB / ERROR SECURITY

## 39. Server Validation

`06` remains business validation authority. Security may add gates but never weaken it.

## 40. SQL Safety

Eloquent/Query Builder/parameter binding only; no user-value SQL concatenation.

## 41. DB Application Account

Production app uses dedicated least-privilege MySQL account, not root.

## 42. Error Handling

Production response never discloses stack traces, filesystem/object paths, DB credentials/raw sensitive SQL, signing key path/content/passphrase, app secrets, unnecessary ClamAV internals.

---

# PART J — ATTACHMENT SECURITY

## 43. Existing Business Rules

Attachment optional; max10/record; max20MB/file; zero-byte rejected; allowlist PDF/XLS/XLSX/DOC/DOCX/PNG/JPG/JPEG/TXT/CSV; executable/script/macro-enabled types outside allowlist rejected.

## 44. File-Type Validation

Do not trust extension/browser MIME alone. Combine normalized allowlist, detected MIME/content, signatures where reliable, size/count/zero-byte.

## 45. Private Quarantine

```text
upload
→ structural validation
→ private quarantine
→ ClamAV
→ explicit CLEAN only
→ promote private attachment
```

No public executable path.

## 46. ClamAV

`MalwareScanner → ClamAvScanner → clamd`, private endpoint. Community package may be transport glue only.

## 47. Fail Closed

Only explicit CLEAN passes. INFECTED/timeout/unavailable/error/unreadable → no normal usability/download.

## 48. Download

Always recheck parent record authorization. Storage key is never authorization. Download MAY create Access Audit.

---

# PART K — AUTHORITATIVE AUDIT SECURITY

## 49. Audit Classes

```text
Business Audit → business mutation/workflow/lifecycle
Access Audit   → protected resource access
Security Audit → auth/credential/authorization/security-control
Technical Logs→ runtime diagnostics
```

## 50. No Age-Based Deletion

Business/Access/Security Audit:

- stored regardless of age;
- no 12-month or 24-month automatic purge;
- scheduler MUST NOT age-delete;
- no routine delete/purge-by-age UI;
- append-oriented.

## 51. Different Lifetimes

```text
Generated XLSX/PDF binary → 168h/7d then cleanup
Business/Access/Security Audit → no age purge
PDF issuance/verification metadata → preserve for historical validation
Technical Logs → separate downstream operational retention
```

## 52. Business Audit

Historical business evidence read-only to normal user.

## 53. Access Audit

Configured events include record view, attachment view/download, export request/download, privileged audit access. Does not become Business Timeline row.

## 54. Access Audit Visibility

```text
Protected Superadmin default
or audit.access.view
+ applicable resource/admin authorization
```

No Team scope.

## 55. Security Audit

Capture login/security events, credential reset, temp-password replacement, role/permission changes, session revocation, enable/disable, malware failures, signing readiness/failure, privileged security access.

Team changes MAY be audited as administrative/business data changes as appropriate but MUST NOT be labeled an authorization grant/revoke solely due Team membership.

## 56. Security Audit Visibility

```text
Protected Superadmin default
or audit.security.view
+ applicable admin/security authorization
```

No Team scope.

## 57. Technical Logs

Operational, not authoritative audit replacement. Retention downstream.

---

# PART L — PRIVATE EXPORT

## 58. Export Authorization

Export request/status/download rechecks `nscmf.export` + related record authorization. Bulk checks each record. Team not authorization.

## 59. Immutable Snapshot Security

Export request MUST bind to immutable deterministic record snapshot/version/workflow-iteration/template context. Worker MUST NOT export later mutable record data.

Snapshot is immutable after creation. Later export request creates a new snapshot rather than overwriting old one.

## 60. Private Artifacts

Generated XLSX/PDF private. No predictable public URL as authorization.

## 61. Seven-Day Binary Lifetime

READY binary authorized re-download 168h/7d then binary cleanup. Cleanup does not delete source/history/audits/approval/issuance metadata.

---

# PART M — APPROVED PDF SIGNING

## 62. Scope

- XLSX not signed by PDF flow;
- non-Approved PDF no mandatory organization signature;
- Approved snapshot PDF MUST be cryptographically signed;
- logical signer System/Organization;
- human Approved By remains human actor.

## 63. Human vs Cryptographic Identity

Never merge/impersonate. `Approved By` and System signer remain separate evidence.

## 64. Signing Identity

Private key + corresponding public certificate/verification material.

## 65. Manual Provisioning

Signing identity manually installed/provisioned protected server/environment. Private key never GitHub/source/ordinary config/deployment artifact/ordinary DB/browser/public validator. Runtime-only minimum access.

## 66. Required Readiness

Missing private key/cert, unreadable key, unusable cert, mismatch, invalid config → critical not-ready/configuration failure. No unsigned Approved PDF fallback.

## 67. Development/Test Identity

Use dedicated non-production test signing identity; never casually reuse production key.

## 68. Signing Failure

If record already Approved and export signing fails:

- business status stays Approved;
- approval audit remains;
- export becomes Failed;
- unsigned intermediate not delivered as final;
- retry allowed after technical fix.

## 69. Issuance Metadata

Preserve at least conceptual issuance/export ID, record, immutable snapshot/version, workflow iteration, issued timestamp, signer/cert identity/fingerprint/reference, SHA-256 of final signed bytes, currentness resolution data.

## 70. Rotation

Historical public verification material remains resolvable after active key rotation.

## 71. TSA

Not required current MVP; no independent timestamp claim.

---

# PART N — PUBLIC PDF VALIDATION

## 72. Purpose / Boundary

NSCMF = issuer + authoritative application validator. Public no-login narrow `/ispdfvalid`-style capability, not public record portal.

## 73. Upload Safety

PDF only, rate limited, safe size, private temp/quarantine, ClamAV CLEAN before deep parsing, cleanup afterward.

## 74. Layer A — Cryptographic Issuer

Validate PDF signature and recognized current/historical System/Organization public certificate material. Private key not used.

## 75. Layer B — Exact SHA-256

Issuance stores:

```text
SHA-256(final signed PDF exact bytes)
```

Validator hashes uploaded exact bytes and compares. One-byte difference changes hash.

## 76. Layer C — Issuance / Workflow Currentness

Resolve issuance, record, immutable snapshot/version, workflow iteration, issued time, certificate reference, stored hash, current approval/issuance context.

## 77. Outcomes

### `VALID_CURRENT`
Recognized issuer + valid signature + exact hash + known issuance + still-current Approved issuance.

### `VALID_SUPERSEDED`
Exact genuine issued artifact, but old workflow iteration/issuance is no longer current after Reopen/new Approved issuance.

### `INVALID_MODIFIED`
Integrity/signature/hash indicates not the exact issued artifact / invalid modification.

### `UNKNOWN`
Cannot recognize/match as known issued artifact. Not automatically accusation of forgery.

## 78. Minimum Disclosure

No full private fields, attachments, timeline, raw audits, storage paths, private key details, unnecessary actor info.

## 79. Abuse Controls

Rate limit, PDF-only, file-size/resource limits, private temp, CLEAN gate, timeout, cleanup, safe non-enumerating errors.

---

# PART O — SECRET MANAGEMENT / LOGGING

## 80. Repository Secrets

Never commit production DB password, Laravel app key, real passwords/temp passwords, signing private key/passphrase, storage credentials, third-party secrets.

## 81. Environment Provisioning

Real secrets outside source control via protected environment/file/mount or future secret manager/KMS/HSM if needed.

## 82. Least Secret Access

Public verifier needs public cert/issuance metadata, not private key. Browser never DB credentials/private key. Renderer/ClamAV do not decide authorization.

## 83. Logging Sanitization

Do not indiscriminately log full Login/password/re-auth/secret/signing/public-upload/attachment payloads.

## 84. Correlation

Safe correlation IDs allowed, never secret/token.

## 85. Debug

Production debug/stack trace exposure disabled.

---

# PART P — FAILURE MATRIX

## 86. Required Behavior

| Failure | Behavior |
|---|---|
| Invalid/expired session | Login required; no state change |
| Failed sensitive re-auth | Action unapplied |
| Missing permission | Deny |
| Team mismatch/difference | **No authorization effect** |
| Unauthorized resource ID | Deny without leak |
| ClamAV infected/error/timeout/down | file not usable |
| Missing signing identity | critical not-ready |
| Approved signing failure | export Failed, no unsigned fallback |
| Signature/hash mismatch | never Valid Current |
| Unknown PDF | minimum-disclosure Unknown |
| Required atomic audit write failure | transaction cannot claim success |

## 87. Business History Preservation

Later technical/security side-effect failure never erases already valid business action outside that side-effect transaction.

---

# PART Q — SECURITY TEST REQUIREMENTS

## 88. Password / Auth

- [ ] length5 rejected; length6 accepted regardless composition;
- [ ] no composition/MFA;
- [ ] no plaintext/hash exposure;
- [ ] repeated failure throttled;
- [ ] no username enumeration;
- [ ] disabled account denied;
- [ ] Login/logout do not require Spatie permission rows.

## 89. Temporary Credential

- [ ] admin create/reset temp flow;
- [ ] normal navigation blocked until replacement;
- [ ] replacement invalidates temp;
- [ ] reset revokes sessions;
- [ ] no plaintext audit/log.

## 90. Session

- [ ] 30m idle;
- [ ] 8h absolute;
- [ ] max2;
- [ ] server-side logout;
- [ ] role change revokes affected sessions;
- [ ] role-permission change revokes affected sessions;
- [ ] Team-only change does not falsely change authorization.

## 91. Re-auth

- [ ] password reset requires current-password re-auth;
- [ ] role/permission mutation requires re-auth;
- [ ] failure leaves action unapplied;
- [ ] no MFA.

## 92. Authorization / Team

- [ ] direct URL/ID cannot bypass authorization;
- [ ] attachment/export/audit endpoints recheck authorization;
- [ ] Result endpoint field whitelist;
- [ ] protected fields server-derived;
- [ ] protected Superadmin invariant;
- [ ] Reviewer/Approver permissions are not Team-scoped;
- [ ] Team name/membership alone never grants Review/Approval;
- [ ] Spatie Teams remains disabled.

## 93. Browser / Request

CSRF, cookie flags, safe rendering, headers, no debug secrets.

## 94. Attachment

Limits/type/zero-byte; private untrusted state; CLEAN promotion; malware/failure blocked; no download before CLEAN; clamd private.

## 95. Audit

No age purge across three authoritative classes; binary cleanup does not remove audit; no normal edit/delete; privileged visibility uses permission + resource/admin authorization without Team scope.

## 96. Signing

Private key absent repo; missing identity critical; no unsigned fallback; human Approved By distinct; final hash stored; historical cert resolvable; no TSA claim.

## 97. Public Verification

No-login; rate limit; PDF-only; CLEAN before deep verify; temp deleted; Current/Superseded/Modified/Unknown semantics; one-byte modification not current-valid; no private leakage.

---

# PART R — LOCKED SECURITY DECISIONS

## 98. Confirmed

1. password min6;
2. no composition;
3. no MFA;
4. no self-registration;
5. temp password + mandatory change;
6. login throttling;
7. idle30m;
8. absolute8h;
9. max2 sessions;
10. password re-auth for sensitive privilege admin;
11. affected-session revocation after password/role/effective-permission/disablement changes;
12. Team-only change does not modify authorization;
13. server-side deny-by-default permission/resource/state security;
14. no Unit/Division/Reviewer Scope/Approval Scope;
15. Spatie Teams disabled;
16. private attachment/quarantine;
17. ClamAV baseline;
18. CLEAN only usability;
19. Business Audit no age purge;
20. Access Audit no age purge;
21. Security Audit no age purge;
22. privileged audit permission model without Team scope;
23. generated binary 168h/7d;
24. audit/issuance survives binary cleanup;
25. Approved PDF System/Organization signer;
26. human Approved By separate;
27. signing identity manual protected provisioning;
28. private key never source/ordinary DB/browser;
29. missing identity critical;
30. no unsigned fallback;
31. final signed SHA-256 issuance evidence;
32. public no-login validation;
33. signature + exact hash + issuance/workflow-currentness;
34. current/superseded/modified/unknown semantics;
35. superseded not modified solely due Reopen;
36. no TSA MVP;
37. immutable export snapshot prevents worker from using later data.

---

# PART S — DOWNSTREAM / RETENTION / GUARDRAILS

## 99. Exact Details Downstream

- exact user/session/audit/signing/schema/index definitions;
- immutable snapshot physical structure;
- exact API payload/status codes;
- limiter numeric buckets;
- re-auth proof lifetime;
- third-login behavior;
- signing key/cert format/path/provider;
- key rotation ceremony;
- technical-log retention;
- ClamAV topology/sizing;
- production object storage;
- backup/DR;
- hosting topology;
- performance/SLA;
- notification;
- public validator safe metadata.

## 100. Retention Classes

```text
Business/Access/Security Audit → no age deletion
PDF issuance/verification metadata → preserved beyond binary cleanup
Generated XLSX/PDF binary → 168h/7d then cleanup
Technical logs → separate downstream retention
```

No generic `retention_days` applied to all.

## 101. Developer / AI MUST NOT

1. increase password min by preference;
2. add composition/MFA/register;
3. store plaintext credential;
4. allow unlimited/expired sessions;
5. execute sensitive mutation after failed re-auth;
6. preserve affected sessions after effective permission/credential disablement change;
7. treat Team change as permission grant/revoke;
8. enable Spatie Teams;
9. reintroduce Unit/Division/scope security middleware;
10. trust frontend authorization;
11. allow IDOR;
12. mass-assign protected fields;
13. disable CSRF globally;
14. render untrusted HTML unsafely;
15. public-store normal attachments;
16. trust MIME/extension alone where stronger checking feasible;
17. expose attachment before CLEAN;
18. treat scanner failure as CLEAN;
19. expose clamd publicly;
20. make attachment mandatory;
21. age-purge authoritative audit;
22. claim 12-month audit retention;
23. delete audit/issuance with binary expiry;
24. expose raw audit merely because normal record view exists;
25. put production private signing key in source/DB/browser;
26. consider missing signing identity healthy;
27. provide unsigned Approved PDF fallback;
28. equate signer with Approved By;
29. claim TSA current MVP;
30. expose private data through public validator;
31. use private key in browser/validator;
32. classify genuine superseded PDF as modified solely due later workflow;
33. return Valid Current without all required evidence;
34. retain public uploads as attachments;
35. expose stack/key path/secrets in errors;
36. create new business state from security condition;
37. let async export worker ignore bound immutable snapshot.

---

# PART T — TRACEABILITY / NEXT

## 102. Authority Matrix

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| Permission/Spatie/Team boundary | `04_RBAC_Permission_Matrix.md` |
| State/iteration | `05_State_Status_Flow.md` |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| **Security** | **`10_Security_Rules.md`** |
| Schema | `11_ERD_Database_Schema.md` |

## 103. Security-to-Architecture Mapping

```text
Password/session → Identity module
Sensitive re-auth/session revocation → Identity/Admin/Authorization
Spatie permissions → RBAC primitives
Team → ordinary organization/profile data, no security scope
ClamAV → MalwareScanner boundary
Permanent audits → separate authoritative audit modules
Approved-PDF key custody → PdfSigningService + protected environment
Public verification → public route + temp upload + CLEAN + PdfVerificationService
Final SHA-256 → issuance metadata
Immutable export snapshot → persistent export snapshot boundary
```

## 104. Security Does Not Change Workflow

No MFA step, extra Review level, exclusive Reviewer/Approver, extra NSCMF state, mandatory attachment, personal Approver certificate, public record portal, TSA, permanent export binary storage, Unit/Division, or Team-based authorization.

## 105. Next Document

Next fixed-order document:

**`11_ERD_Database_Schema.md`**.

ERD MUST materialize these security rules while reusing Spatie package-owned authorization tables, modeling Team separately, and avoiding all Reviewer/Approval scope schema.