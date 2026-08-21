# Security Rules Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-SEC-010  
> **Document Order:** 10 / 20  
> **Status:** Draft — Confirmed Security Baseline  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`, `05_State_Status_Flow.md`, `06_Validation_Rules.md`, `07_UI_UX_Specification.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`  
> **Organization Model:** Single organization / single application installation  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk security policy dan security-control behavior** NSCMF Digital Form & Workflow System.

Security Rules mengamankan requirement yang telah dikunci pada `01–09` tanpa mengubah:

- product scope;
- business invariant;
- actor permission/scope semantics;
- canonical NSCMF lifecycle;
- business-field validation;
- UI business meaning;
- technology selection;
- logical architecture/concurrency model.

Dokumen ini mengunci:

- authentication/password policy;
- temporary credential/reset behavior;
- login throttling;
- session lifetime dan concurrent-session policy;
- password re-authentication untuk sensitive administration;
- server-side authorization hardening;
- browser/request security baseline;
- input/query/error-handling security;
- private attachment handling;
- ClamAV malware scanning;
- permanent authoritative audit evidence;
- privileged Access/Security Audit visibility;
- secret/private-key handling;
- private export delivery;
- Approved-PDF signing identity/custody/readiness;
- public PDF validation;
- exact final-file SHA-256 verification;
- signing/verification failure behavior;
- security logging and safe disclosure.

Physical database tables/columns belong to `11_ERD_Database_Schema.md`. Exact HTTP payload/status codes belong to `12_API_Contract.md`. Exact folder/class placement belongs to `13_Project_Structure.md`. Exact environment variable names/server paths belong to `14_Environment_Specification.md`. Exact production topology belongs to `20_Deployment_Architecture.md`.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **SHOULD** — strong default recommendation unless an explicit confirmed project decision says otherwise.
- **MAY** — diperbolehkan.
- **FAIL CLOSED** — failure/uncertainty results in denial/unavailability rather than permissive fallback.
- **AUTHORITATIVE AUDIT** — durable Business Audit, Access Audit, or Security Audit evidence that must remain preserved.
- **SIGNING IDENTITY** — private signing key plus corresponding public certificate/public verification material used by the System/Organization PDF signer.

---

# PART A — SECURITY AUTHORITY AND TRUST MODEL

## 3. Authority Precedence

`10_Security_Rules.md` is authoritative for security controls but MUST NOT redefine:

1. `01_PRD.md` — product scope;
2. `02_Business_Rules.md` — business invariants;
3. `03_User_Flow.md` — interaction sequence, except security gates surrounding interactions;
4. `04_RBAC_Permission_Matrix.md` — business permission/scope eligibility;
5. `05_State_Status_Flow.md` — canonical persistent lifecycle;
6. `06_Validation_Rules.md` — business/form validation;
7. `07_UI_UX_Specification.md` — presentation/interaction meaning;
8. `08_Tech_Stack_Specification.md` — selected technology baseline;
9. `09_System_Architecture.md` — component/concurrency/execution topology.

Security checks are additional gates. A security condition/failure MUST NOT create an additional NSCMF business status.

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

Examples that MUST NOT become NSCMF business states:

```text
AUTH_REQUIRED
SESSION_EXPIRED
MFA_REQUIRED
SCANNING
QUARANTINED
MALWARE_DETECTED
SIGNING_FAILED
VALID_CURRENT
VALID_SUPERSEDED
INVALID_MODIFIED
UNKNOWN
```

---

## 4. Core Trust Boundaries

Treat as untrusted until validated/authorized:

- browser/user input;
- URL/path/query/body identifiers;
- filenames;
- browser-declared MIME/content type;
- uploaded file content;
- public PDF-validator uploads;
- client-supplied business state;
- client-supplied role/permission/scope values;
- client-supplied audit actor/timestamp;
- client-supplied version/concurrency values until checked against persisted record;
- export/download identifiers;
- user-controlled text rendered by Vue/Inertia.

Trusted authority resides in:

- authenticated server-side identity/session state;
- Laravel Policies/Gates and domain authorization;
- MySQL persisted business/security state;
- application/domain services;
- protected official template registry;
- protected server signing configuration;
- explicit trusted scanner response from private ClamAV/`clamd` boundary.

---

## 5. Fail-Closed Security Principle

Where security correctness cannot be established, default is denial/unavailability.

Examples:

```text
authorization uncertain    → DENY
record scope uncertain     → DENY
session invalid/expired    → REQUIRE LOGIN
ClamAV no CLEAN result     → FILE NOT USABLE
Approved PDF sign failure  → EXPORT FAILED
signing identity missing   → CRITICAL NOT-READY CONDITION
validator evidence unclear → MUST NOT RETURN VALID_CURRENT
```

Fail-closed behavior MUST NOT be used as a reason to alter or erase existing business history.

---

# PART B — AUTHENTICATION AND PASSWORD POLICY

## 6. Authentication Model — Confirmed Final Decision

Current MVP authentication is exactly:

```text
username
+ password
```

Confirmed boundaries:

- no self-registration;
- no mandatory SSO/LDAP/OAuth;
- **no MFA**;
- no OTP/authenticator requirement;
- no security implementation may silently add MFA without an approved project requirement change.

---

## 7. Password Policy — Confirmed Final Product Decision

Password rule is intentionally simple and MUST be implemented exactly:

- minimum length = **6 characters**;
- no mandatory uppercase;
- no mandatory lowercase;
- no mandatory number;
- no mandatory symbol;
- no mandatory combination/composition requirement;
- any character composition is acceptable if all other credential checks succeed;
- application MUST NOT add a complexity checklist merely because a framework/starter template recommends one;
- no periodic forced password change solely because a fixed amount of time has passed.

This rule is a confirmed project decision and MUST NOT be reopened or strengthened by implementation preference without an explicit product requirement change.

---

## 8. Password Storage and Disclosure

Regardless of the intentionally simple password composition policy, implementation MUST:

- never persist plaintext password;
- use Laravel-supported secure password hashing;
- never log plaintext password;
- never expose password hash to browser/Inertia/API;
- never include current/new/temporary password in Business Audit, Access Audit, Security Audit, stack trace, diagnostic dump, or export;
- never write real passwords into seed code, repository fixtures, README examples, GitHub Actions logs, or screenshots.

Password hashing implementation/configuration is security infrastructure and does not change the min-6/no-composition business decision.

---

## 9. No Periodic Password Expiry

Current MVP does not require users to change password every N days merely because time elapsed.

Password change is required when:

- temporary credential must be replaced;
- administrator resets credential;
- user changes password intentionally;
- a future approved security incident/process explicitly requires reset.

---

# PART C — ACCOUNT CREATION, RESET, TEMPORARY PASSWORD

## 10. No Self-Service Registration

Normal users cannot create their own account. Account creation is an administrative action protected by RBAC + security preconditions.

---

## 11. Admin-Created User Credential Flow

Conceptual flow:

```text
authorized administrator
→ password re-authenticate
→ create eligible normal account
→ system/administrative flow establishes temporary password
→ target authenticates with temporary password
→ mandatory password-change gate
→ normal application access only after successful replacement
```

Temporary password:

- is sensitive;
- MUST NOT appear in audit/log plaintext;
- MUST NOT remain valid after successful replacement;
- MUST NOT be stored in repository/source;
- MUST NOT bypass normal disabled-account/session/security controls.

Exact secure delivery/display mechanism of the temporary password is finalized in API/UI/Environment implementation, but it MUST not create a permanent plaintext credential store.

---

## 12. Administrative Password Reset

Password reset by authorized administrator:

1. acting admin passes current-password re-authentication;
2. target account eligibility/protected invariant is checked;
3. temporary password/reset credential is created;
4. **all active sessions of target user are revoked**;
5. target user authenticates using temporary credential;
6. mandatory password change is completed;
7. security event is audited without plaintext credential content.

Self-service `Forgot Password` email flow is not part of current MVP.

---

# PART D — LOGIN THROTTLING / AUTHENTICATION FAILURE

## 13. Login Throttling

Login MUST apply server-side rate limiting/progressive delay to repeated failed authentication attempts.

Confirmed intent:

- repeated failures are throttled;
- context SHOULD combine target username/account key and source/IP context where technically appropriate;
- use progressive/temporary throttling rather than permanent hard-lock solely because wrong password attempts occurred;
- a successful login MAY reset applicable failure counters;
- exact limiter bucket numbers/decay implementation can be finalized in `12`/`14` while preserving this behavior.

---

## 14. Credential Enumeration Resistance

Authentication failure response MUST NOT disclose whether:

- username exists;
- password alone is wrong;
- account existence can be inferred from materially different error text.

Normal user-facing response remains generic.

Protected administrators may see appropriate security/audit context through privileged Security Audit; public Login UI does not.

---

## 15. Authentication Security Audit

Security Audit SHOULD capture relevant authentication evidence such as:

- successful authentication where required by audit design;
- failed authentication;
- throttling/security delay events;
- disabled-account login attempt where appropriate;
- credential reset/security changes;
- forced temporary-password replacement completion.

Audit MUST NOT store supplied password.

---

# PART E — SESSION SECURITY

## 16. Session Policy — Confirmed Final Decision

```text
idle timeout       = 30 minutes
absolute lifetime  = 8 hours
maximum sessions   = 2 active sessions per account
```

All values are server-enforced.

---

## 17. Idle Timeout

If no qualifying authenticated activity occurs for 30 minutes, the session becomes invalid and user must authenticate again.

Frontend warning/countdown MAY improve UX but is not authoritative.

Persisted Draft is not deleted because session expires.

---

## 18. Absolute Session Lifetime

A session cannot remain valid beyond 8 hours from its security-defined creation/authentication point even if user remains active.

Activity MUST NOT indefinitely extend the session beyond absolute lifetime.

At expiration, re-login is required.

---

## 19. Maximum Two Active Sessions

An account MUST NOT retain more than two active authenticated sessions.

Exact behavior when a third valid login is attempted may be finalized downstream as either deterministic existing-session replacement or denial of the new session, but the result MUST respect:

```text
active_session_count <= 2
```

No implementation may silently permit unlimited sessions.

---

## 20. Session Regeneration

Session identifier MUST be regenerated after successful authentication and after security-sensitive authentication-state changes where appropriate.

Session fixation protections MUST remain enabled.

---

## 21. Logout

Logout MUST invalidate current session server-side.

Deleting only a browser cookie without invalidating authoritative server session is insufficient.

---

## 22. Mandatory Session Revocation

All active sessions of target user MUST be revoked after:

- administrator password reset;
- role assignment/removal;
- direct permission assignment/removal;
- access-changing scope/identity change where effective authorization changes;
- disabling target account;
- equivalent approved security-sensitive access change.

If acting user changes their own applicable password/role/permission/security access, their own sessions are revoked as applicable and UI returns them to Login.

Administrator changing another user is not logged out solely because target sessions were revoked.

---

# PART F — PASSWORD RE-AUTHENTICATION

## 23. Definition

There is no MFA.

**Re-authentication means the currently authenticated actor must enter their current password again** before a sensitive administrative action is executed.

---

## 24. Actions Requiring Re-authentication

At minimum:

- password reset of another user;
- role assignment/removal;
- permission assignment/removal;
- security-sensitive access/scope changes;
- protected signing/security configuration change if exposed through application;
- other equivalent privilege-changing actions later classified as sensitive.

---

## 25. Re-authentication Failure

If current-password re-auth fails:

- sensitive action MUST remain unapplied;
- no partial role/permission/password reset is persisted;
- protected Superadmin invariant remains unchanged;
- failure MAY be recorded in Security Audit;
- user receives non-sensitive failure feedback.

---

## 26. Re-authentication Proof Lifetime

Implementation MAY issue a short-lived server-side proof after successful re-auth to avoid asking password repeatedly within one tightly scoped sensitive operation.

The proof:

- MUST be short-lived;
- MUST be scoped/validated server-side;
- MUST NOT authorize unrelated sensitive actions indefinitely;
- exact duration belongs to API/implementation spec.

---

# PART G — AUTHORIZATION HARDENING

## 27. Deny by Default

Effective authorization remains:

```text
valid authenticated session
+ required permission
+ record/resource visibility
+ ownership / Unit / Reviewer / Approval scope
+ current business state
+ archive treatment
+ validation
+ protected Superadmin invariant
+ security preconditions
```

Any failed prerequisite → DENY.

---

## 28. Backend Enforcement

Every protected operation MUST be authorized server-side, including:

- record detail direct URL;
- History/search/filter results;
- Review/Approval queues;
- attachment view/download;
- export request/status/download;
- Business Timeline;
- raw Access Audit;
- Security Audit;
- user/role/unit/scope administration;
- Reopen/Archive/Unarchive;
- Result-only mutation;
- queued artifact retrieval.

Hidden/disabled frontend controls never replace backend authorization.

---

## 29. IDOR / Broken Object Authorization Protection

Knowing or manipulating a record ID, attachment ID, export ID, audit ID, or object-storage key MUST NOT grant access.

Backend re-checks parent resource and current effective access on every protected fetch/download/mutation.

---

## 30. Mass Assignment / Field Whitelisting

Backend MUST accept only fields allowed for the specific action/profile.

Examples:

- `nscmf.change.result.edit` only accepts Result fields;
- Requester cannot set canonical `business_status` directly;
- normal user cannot inject `approved_by`;
- actor/timestamp/audit identity are server-derived;
- client-supplied role/permission/scope values are validated as administrative inputs, not trusted authority;
- protected flags cannot be mass-assigned through generic payload.

---

## 31. Protected Superadmin Invariant

Security/admin endpoints MUST preserve existing protected Superadmin rules across direct request/API/bulk paths.

No credential reset/role assignment/security path may become a workaround to:

- delete protected Superadmin;
- disable protected Superadmin;
- remove protected role;
- downgrade protected authority contrary to confirmed invariant.

---

# PART H — BROWSER / REQUEST SECURITY

## 32. HTTPS

Production authenticated/private application traffic MUST use HTTPS.

Public PDF verification route MUST also use HTTPS in production because users upload documents and receive authenticity results.

---

## 33. Session Cookie Security

Authentication/session cookies MUST use appropriate protected settings including:

- `HttpOnly`;
- `Secure` in production HTTPS;
- appropriate `SameSite` policy for same-site Laravel/Inertia application;
- appropriately constrained path/domain scope.

Session token SHOULD remain inaccessible to Vue JavaScript where HttpOnly cookie is sufficient.

---

## 34. CSRF

Authenticated state-changing browser requests MUST use Laravel CSRF protection or equivalent correctly scoped same-origin mechanism.

Global CSRF disablement for convenience is forbidden.

Public PDF verification is not an authenticated business mutation, but it still requires upload/rate/security protections.

---

## 35. XSS / Safe Rendering

User-controlled values MUST render as text by default.

Avoid raw `v-html`/equivalent for untrusted content unless explicit sanitization requirement exists.

Particularly protect:

- workflow reasons/comments;
- customer/service values;
- filenames;
- audit text;
- result narratives;
- validation/error reflections.

---

## 36. Security Headers

Production SHOULD use tested baseline headers including:

- Content Security Policy appropriate for Vue/Inertia assets;
- `frame-ancestors`/anti-clickjacking control unless approved embedding exists;
- `X-Content-Type-Options: nosniff`;
- safe Referrer Policy;
- HSTS after correct HTTPS deployment is established.

Exact values must be tested against actual application resources.

---

## 37. CORS

Current same-application Inertia architecture does not require permissive cross-origin CORS.

MUST NOT configure wildcard credentialed origins.

Future integrations require explicit origin/policy change.

---

# PART I — INPUT / DATABASE / ERROR SECURITY

## 38. Server Validation

All business/form validation remains authoritative in `06`. Security validation may add additional gates but MUST NOT weaken business validation.

Browser validation is UX only.

---

## 39. SQL Safety

Use Eloquent, Query Builder, parameter binding, or parameterized raw SQL.

User-controlled values MUST NOT be concatenated into executable SQL.

---

## 40. Database Application Account

Production application uses dedicated least-privilege MySQL account.

Normal application MUST NOT connect as MySQL `root`.

Exact grants/TLS/backup credential details belong to ERD/Environment/Deployment while preserving least privilege.

---

## 41. Error Handling

Production user responses MUST NOT disclose:

- stack traces;
- filesystem paths;
- object-storage paths/credentials;
- DB credentials;
- raw SQL containing sensitive values;
- signing private-key path/content/passphrase;
- application secret keys;
- ClamAV socket/internal daemon details unnecessary to user;
- internal exception data not required for remediation.

User gets actionable but non-sensitive error; protected technical logs get appropriate diagnostic detail.

---

# PART J — ATTACHMENT SECURITY

## 42. Existing Attachment Business Rules Remain

From `06`:

- attachment optional;
- max 10 files/record;
- max 20 MB/file;
- zero-byte rejected;
- allowlist: PDF/XLS/XLSX/DOC/DOCX/PNG/JPG/JPEG/TXT/CSV;
- executable/script/macro-enabled formats outside allowlist rejected.

Security adds controls and never turns attachment mandatory.

---

## 43. File-Type Validation

Do not trust extension or browser MIME alone.

Backend SHOULD combine where technically reliable:

- normalized extension allowlist;
- detected MIME/content type;
- expected file signature/structure;
- file size/count;
- zero-byte check.

Original filename is metadata, not filesystem identity.

Stored object SHOULD use system-generated opaque identifier.

---

## 44. Private Quarantine

Untrusted upload MUST NOT immediately become a normal usable attachment.

Flow:

```text
upload
→ structural validation
→ private quarantine/temp
→ ClamAV scan
→ explicit CLEAN only
→ promote/persist as normal private attachment
```

Files MUST NOT be executable from public webroot.

---

## 45. ClamAV / clamd — Confirmed Baseline

Confirmed malware engine:

```text
ClamAV / clamd
```

Recommended application boundary:

```text
MalwareScanner
  ↓
ClamAvScanner
  ↓
clamd
```

A Laravel/community package MAY be used as a client/transport helper, but it MUST NOT define NSCMF business/security semantics.

The `clamd` socket/TCP service MUST remain infrastructure-private and MUST NOT be exposed publicly to the internet.

Virus-definition update/health operation belongs to Environment/Deployment.

---

## 46. ClamAV Fail-Closed Rule

Only explicit scanner result `CLEAN` may make file usable.

These MUST NOT be considered clean:

- malware/infected result;
- scanner timeout;
- ClamAV unavailable;
- scanner/client/protocol error;
- file cannot be scanned/read as required.

Result behavior:

```text
CLEAN              → may promote
INFECTED            → reject/quarantine; no normal download
ERROR/TIMEOUT/DOWN  → fail closed; no normal download
```

Scanner failure MUST NOT silently create a successful attachment.

---

## 47. Attachment Download

Download always re-checks parent NSCMF visibility/authorization.

Only an attachment that completed the required security gate is eligible for normal download.

Private object path/key is never authorization.

Download/view access MAY create Access Audit evidence according to audit policy.

---

# PART K — AUTHORITATIVE AUDIT SECURITY

## 48. Audit Classes

Four concerns are explicitly separated:

```text
Business Audit
→ business data/workflow/lifecycle mutation evidence

Access Audit
→ protected resource view/download/access evidence

Security Audit
→ authentication/credential/authorization/security-control evidence

Technical Logs
→ software/runtime diagnostics
```

Technical logs are not authoritative audit replacement.

---

## 49. No Time-Based Audit Deletion — Confirmed Final Decision

There is **no 12-month retention policy** and no other age-based expiry for authoritative audit evidence.

Business Audit, Access Audit, and Security Audit:

- MUST remain stored regardless of age;
- MUST NOT be deleted automatically after 12 months;
- MUST NOT be deleted automatically after 24 months;
- MUST NOT be purged by scheduler because old;
- MUST NOT expose routine normal application delete/purge-by-age action;
- SHOULD be append-oriented so history is not overwritten by current value.

This is a final confirmed project decision.

---

## 50. Audit Preservation vs Export Binary Cleanup

These are intentionally different:

```text
Generated XLSX/PDF binary
→ temporary
→ 168 hours / 7 days
→ delete binary

Business/Access/Security Audit
→ authoritative evidence
→ no age-based deletion

Issued-PDF verification metadata
→ required historical evidence
→ preserved beyond export binary cleanup
```

Deleting expired generated binary MUST NOT delete audit or issuance evidence.

---

## 51. Business Audit

Business Audit contains authoritative persisted business change/workflow/lifecycle evidence as defined in `02/09`.

Normal application users MUST NOT edit/delete historical rows.

---

## 52. Access Audit

Access Audit SHOULD capture configured events such as:

- record detail view;
- attachment view/download;
- export request;
- export artifact download;
- privileged audit access where applicable.

Access Audit does not become a Business Timeline workflow row.

---

## 53. Access Audit Visibility

Raw/privileged Access Audit is not automatically visible to every user who can view a record.

Baseline:

```text
Protected Superadmin
→ default eligible

explicit audit.access.view
→ MAY be delegated
→ still requires applicable underlying audit/resource scope
```

The permission does not by itself grant `nscmf.view.all`, Review, Approval, Reopen, or export authority.

---

## 54. Security Audit

Security Audit SHOULD capture at least relevant:

- login success/failure/throttling;
- credential reset;
- temporary-password replacement completion;
- role/permission/access changes;
- session revocation;
- enable/disable security events;
- malware detection/scan-security failures;
- signing-identity readiness/failure events;
- privileged security/audit access where appropriate.

Never store plaintext password/private key/secret.

---

## 55. Security Audit Visibility

Baseline:

```text
Protected Superadmin
→ default eligible

explicit audit.security.view
→ MAY be delegated
→ applicable administrative/security scope required
```

No normal application role can edit/delete authoritative Security Audit.

---

## 56. Technical Log Retention

Technical application logs remain operational, not authoritative audit evidence.

The user's permanent-audit decision applies to Business/Access/Security Audit, not automatically to every runtime log file forever.

Exact technical-log rotation/retention is finalized downstream in Environment/Deployment.

---

# PART L — PRIVATE EXPORT SECURITY

## 57. Export Authorization

Export request/status/download re-checks current user authorization against related NSCMF record.

Knowing export ID or storage key is insufficient.

Bulk export checks every selected record individually.

---

## 58. Deterministic Snapshot Security

Queued export MUST remain bound to the deterministic record snapshot/version established when the export request is created.

Worker MUST NOT silently export a newer record version because processing happens later.

---

## 59. Private Generated Artifacts

Generated XLSX/PDF remain private.

They MUST NOT be served from predictable public URL as authorization mechanism.

Download uses authorized application response or appropriately scoped/time-limited storage delivery after backend authorization.

---

## 60. Seven-Day Binary Lifetime

Confirmed:

```text
READY generated binary
→ authorized re-download for 168 hours / 7 days
→ binary removed automatically after expiry
```

The expiry does not delete:

- NSCMF source record;
- business history;
- Business Audit;
- Access Audit;
- Security Audit;
- Approval evidence;
- issuance/verification metadata required for historical signed-PDF verification.

---

# PART M — APPROVED PDF SIGNING

## 61. Signing Scope

Confirmed:

- XLSX is not cryptographically signed by this PDF signing flow;
- non-Approved PDF does not receive mandatory organization signature under current rule;
- PDF representing an `APPROVED` snapshot MUST be cryptographically signed;
- logical signer identity = **System/Organization**;
- human `Approved By` remains the human Approver who successfully performed final workflow transition.

---

## 62. Human Approver vs Cryptographic Signer

These identities MUST remain separate:

```text
Approved By
= human workflow actor

PDF signer
= System / Organization signing identity
```

The organization certificate/private key MUST NOT overwrite or impersonate human Approval evidence.

---

## 63. Signing Identity Components

Conceptually:

```text
private key
+ corresponding public certificate / public verification material
```

- private key is secret and used for signing;
- public certificate/key is used for verification and is not treated as the private secret.

Exact certificate/key file format may be PEM/PFX/PKCS#12 or another suitable form chosen downstream, provided this security model is preserved.

---

## 64. Manual Server Provisioning — Confirmed Final Decision

Signing identity MUST be provisioned/uploaded/installed manually on the target server/environment by an authorized operator.

Private key:

- MUST NOT be committed to GitHub;
- MUST NOT be embedded in source code;
- MUST NOT be stored inside ordinary repository configuration;
- MUST NOT travel as an ordinary application deployment artifact;
- MUST NOT be persisted as ordinary application DB content;
- MUST NOT be exposed to browser/public validator;
- MUST be readable only by the runtime identity/process that requires signing.

Repository templates/examples use placeholders only.

Exact protected file path/mount and ownership/mode belong to `14`/`20`.

---

## 65. Required Signing Readiness — Confirmed Final Decision

The application requires usable configured signing identity to be considered **normal-ready/healthy for its intended production operation**.

Readiness/startup configuration check MUST detect at least, where technically applicable:

- missing private key;
- missing public certificate/verification material;
- unreadable key;
- unusable certificate;
- private key/certificate mismatch;
- invalid signing configuration.

Required behavior:

```text
missing/unusable required signing identity
→ CRITICAL configuration/readiness failure
→ application MUST NOT silently advertise normal-ready signing capability
→ Approved PDF MUST NOT fall back to unsigned output
```

Exact decision whether the HTTP process literally refuses startup versus starts only in explicit critical-not-ready mode is finalized in Environment/Deployment; either implementation MUST preserve the user's intent that the system cannot operate as normally healthy while required signing identity is absent.

---

## 66. Development / Test Signing Identity

Development/test MAY use a dedicated non-production self/test signing identity.

Rules:

- never reuse production private key casually in local/CI;
- test material must be clearly non-production;
- production readiness may require different trust/configuration;
- tests still verify same signing/verification semantics.

---

## 67. Approved-PDF Signing Failure

If business record is already `APPROVED` and later export signing fails:

- business status remains `APPROVED`;
- final Approver Business Audit remains intact;
- export request becomes `FAILED`;
- unsigned intermediate PDF MUST NOT be delivered as equivalent final Approved PDF;
- error is logged/audited appropriately;
- user MAY retry after technical/security issue is resolved.

Security/export failure does not retroactively undo valid Approval.

---

## 68. Issuance Metadata

For each successful Approved signed PDF issuance, system MUST preserve enough authoritative metadata for future validation.

Conceptually includes:

- issuance/export identifier;
- NSCMF record identity;
- bound record version/snapshot;
- approval iteration/context;
- issued timestamp;
- signer/certificate identity/fingerprint/reference;
- SHA-256 of **final signed PDF bytes**;
- information required to resolve current/superseded status later.

Exact schema belongs to `11`.

---

## 69. Key Rotation / Historical Validation

Future rotation MUST NOT make previously issued PDFs unverifiable merely because active signing key changed.

Historical public verification material/certificate reference required to validate old issuances MUST remain resolvable.

Retired private key handling/rotation ceremony is downstream operational detail.

---

## 70. TSA — Not Required for Current MVP

Trusted Timestamp Authority (TSA) is **not required** for current MVP.

Current issuer/validator model uses application issuance timestamp + signature + exact final SHA-256 + authoritative issuance metadata.

System/UI/documentation MUST NOT claim an independent trusted third-party timestamp if no TSA is used.

A TSA may be introduced only through future approved compliance/legal/long-term independent timestamp requirement.

---

# PART N — PUBLIC PDF VALIDATION

## 71. Purpose

NSCMF acts as both:

- **issuer** of Approved signed PDF;
- **authoritative application validator** for NSCMF-issued PDFs.

Application MUST expose a narrow public no-login validation capability conceptually like:

```text
/ispdfvalid
```

Exact route may be finalized in API/UI, but capability itself is confirmed.

---

## 72. Public Access Boundary

Validator:

- does not require account login;
- accepts PDF only;
- is rate-limited;
- does not grant History/record/attachment/audit access;
- uses private temporary upload processing;
- deletes temporary validation upload after processing;
- MUST NOT store uploaded public validation file as normal NSCMF attachment.

---

## 73. Upload Safety Before PDF Parsing

Before deep PDF parsing/verification:

1. validate request/file type and safe size;
2. write into private temporary/quarantine area;
3. scan with ClamAV;
4. continue only on explicit `CLEAN`.

`INFECTED`, timeout, scanner error, scanner unavailable → verification request fails closed.

The validator MUST NOT become a convenient public malware upload storage service.

---

## 74. Verification Layer A — Recognized Cryptographic Issuer

Validator checks:

- PDF signature structure/verification;
- signer/public certificate material is recognized as an NSCMF System/Organization issuer identity;
- signature verification does not indicate invalid unauthorized modification;
- historical certificate/public material may be selected based on issuance metadata when key rotation exists.

Private signing key is NOT needed to verify.

---

## 75. Verification Layer B — Exact Final Artifact SHA-256

At successful issuance, system calculates:

```text
SHA-256(final signed PDF bytes)
```

Public validator calculates SHA-256 of uploaded PDF exact bytes and compares with authoritative issuance metadata.

This deliberately makes validation strict:

```text
one-byte difference
→ different SHA-256
→ not the exact issued artifact
```

This exact-hash layer complements PDF signature verification and avoids relying solely on permissive incremental-update semantics.

---

## 76. Verification Layer C — Issuance / Workflow Currentness

Validator resolves, as applicable:

- issuance identity;
- record identity;
- bound snapshot/version;
- approval iteration;
- issued timestamp;
- signer/certificate reference;
- stored final SHA-256;
- current NSCMF approval/issuance context.

This is required because a genuine PDF can remain byte-for-byte authentic while later becoming outdated after Reopen/Revert or newer Approved issuance.

---

## 77. Canonical Public Verification Outcomes

### `VALID_CURRENT`

All required conditions hold:

- recognized NSCMF issuer;
- signature valid;
- exact SHA-256 matches issued final artifact;
- issuance metadata matches;
- related Approved issuance is still current.

User-facing meaning: **Valid — Current**.

### `VALID_SUPERSEDED`

- recognized genuine issued artifact;
- signature valid;
- exact SHA-256 matches;
- issuance known;
- but related approval/issuance is no longer current because record was Reopened/Reverted or a newer Approved issuance superseded it.

User-facing meaning: **Valid — Superseded**.

A superseded PDF MUST NOT be classified as modified/forged solely because workflow later changed.

### `INVALID_MODIFIED`

Integrity/signature/hash evidence indicates uploaded file is not the exact issued artifact or invalid modification occurred.

User-facing meaning: **Invalid — Modified**.

### `UNKNOWN`

System cannot match/validate file as a known NSCMF-issued artifact/recognized issuer.

User-facing meaning: **Unknown / Not recognized**.

`UNKNOWN` is not automatically a claim of malicious forgery.

---

## 78. Minimum Public Disclosure

Public validation result MUST NOT disclose private application information merely because a PDF is uploaded.

Do not expose:

- full private NSCMF fields;
- attachments;
- History/Business Timeline;
- raw Access Audit;
- Security Audit;
- storage paths;
- private signing-key details;
- unnecessary private actor information.

Exact safe public response fields belong to `12_API_Contract.md`.

---

## 79. Public Validator Abuse Controls

At minimum:

- rate limiting;
- PDF-only allowlist;
- safe maximum request/file size;
- private temporary storage;
- ClamAV CLEAN gate;
- request timeout/resource limits where appropriate;
- cleanup after processing;
- safe non-enumerating/minimum-disclosure errors.

Public endpoint MUST NOT allow arbitrary file retrieval or arbitrary server path access.

---

# PART O — SECRET MANAGEMENT

## 80. Repository Secret Rule

The following MUST NOT be committed to GitHub/source control:

- production DB password;
- Laravel production secret/application key;
- real user password;
- temporary password;
- signing private key;
- signing-key passphrase;
- production storage credentials;
- future third-party secret tokens;
- any equivalent production secret.

`.env.example` or documentation uses placeholders only.

---

## 81. Environment Secret Provisioning

Real environment secrets are provisioned outside source control.

Exact mechanism may be:

- protected server environment/config;
- protected file/mount;
- future secret manager/KMS/HSM if deployment requires it.

Current signing-key decision explicitly uses manual protected server/environment provisioning; adding KMS/HSM later must preserve logical signer behavior and does not change Approved By semantics.

---

## 82. Secret Access Scope

Runtime/process/service identity receives only secrets it requires.

Examples:

- public validator needs public certificate/issuance metadata, **not private signing key**;
- browser never receives DB credentials/private key;
- ClamAV does not need application DB root credential;
- renderer does not decide authorization.

---

# PART P — LOGGING AND SAFE DIAGNOSTICS

## 83. Logging Sanitization

Do not indiscriminately log full request payloads for:

- Login;
- password change/reset;
- re-authentication;
- secret/settings endpoints;
- signing operations;
- public validator uploads;
- attachment uploads.

Sensitive fields are redacted/omitted.

---

## 84. Technical Error Correlation

Implementation MAY use correlation/request identifiers to connect safe user-facing error with protected technical logs.

Correlation identifier MUST NOT itself expose a secret or authorization token.

---

## 85. Debug Mode

Production MUST NOT expose Laravel debug pages/stack traces to normal users.

Production debug configuration must remain disabled/appropriately controlled.

---

# PART Q — SECURITY FAILURE BEHAVIOR

## 86. Failure Matrix

| Failure | Required Security Behavior |
|---|---|
| Invalid/expired session | Require authentication; no NSCMF state change |
| Failed sensitive re-auth | Action unapplied |
| Unauthorized object ID | Deny without data leakage |
| ClamAV infected | File not usable/downloadable |
| ClamAV error/timeout/unavailable | Fail closed; file not clean |
| Missing required signing identity | Critical not-ready/configuration failure |
| Approved PDF signing failure | Export FAILED; no unsigned fallback |
| Public signature/hash mismatch | Never return `VALID_CURRENT` |
| Unknown PDF | Return minimum-disclosure UNKNOWN |
| Audit write failure inside required atomic business transition | Transaction must not claim successful business transition if audit is mandatory in same atomic action |

---

## 87. Business History Preservation

A later technical/security side-effect failure MUST NOT erase a business action that already validly committed outside that side-effect transaction.

Example:

```text
record already APPROVED
→ later export/sign job fails
→ business status stays APPROVED
→ export FAILED
```

---

# PART R — SECURITY TEST REQUIREMENTS

## 88. Password / Authentication Tests

- [ ] length 5 is rejected.
- [ ] length 6 is accepted regardless of uppercase/lowercase/number/symbol composition when all other checks pass.
- [ ] application does not require any composition combination.
- [ ] no MFA step is required.
- [ ] plaintext password/hash is not exposed.
- [ ] repeated failed login is throttled/progressively delayed.
- [ ] login error does not enumerate username existence.
- [ ] disabled account cannot login.

---

## 89. Temporary Credential Tests

- [ ] admin-created/reset credential enters temporary-password flow.
- [ ] normal application navigation is blocked until mandatory replacement.
- [ ] successful replacement invalidates temporary credential.
- [ ] password reset revokes all target sessions.
- [ ] plaintext temporary password is absent from audit/log payload.

---

## 90. Session Tests

- [ ] idle session expires after 30 minutes inactivity.
- [ ] active session cannot exceed 8-hour absolute lifetime.
- [ ] account never retains >2 active sessions.
- [ ] logout invalidates server-side session.
- [ ] role change revokes all target sessions.
- [ ] permission change revokes all target sessions.
- [ ] disable/access-changing identity mutation revokes applicable target sessions.

---

## 91. Re-authentication Tests

- [ ] password reset requires acting-user current-password re-auth.
- [ ] role/permission sensitive mutation requires re-auth.
- [ ] failed re-auth leaves action unapplied.
- [ ] no MFA is introduced into re-auth flow.

---

## 92. Authorization Tests

- [ ] direct URL/ID manipulation cannot bypass visibility.
- [ ] attachment/export/audit endpoints re-check authorization.
- [ ] Result-only endpoint cannot modify planning fields.
- [ ] client cannot assign canonical state/approved_by/audit actor.
- [ ] protected Superadmin cannot be disabled/downgraded through alternate path.

---

## 93. Browser / Request Tests

- [ ] CSRF remains active on authenticated mutations.
- [ ] session cookie flags correct in production profile.
- [ ] dangerous untrusted text renders safely.
- [ ] security headers do not break required Vue/Inertia resources.
- [ ] production does not expose debug stack trace/secrets.

---

## 94. Attachment / ClamAV Tests

- [ ] invalid count/size/type/zero-byte rejected.
- [ ] accepted upload starts non-usable private state.
- [ ] explicit ClamAV CLEAN permits promotion.
- [ ] malware detection blocks file.
- [ ] timeout/unavailable/error fails closed.
- [ ] unscanned/failed file cannot be downloaded normally.
- [ ] `clamd` is not publicly exposed in deployment tests.

---

## 95. Audit Tests

- [ ] Business Audit not age-purged.
- [ ] Access Audit not age-purged.
- [ ] Security Audit not age-purged.
- [ ] seven-day export binary cleanup does not remove audit.
- [ ] normal user cannot edit/delete audit evidence.
- [ ] raw Access Audit follows `audit.access.view` + scope.
- [ ] Security Audit follows `audit.security.view` + applicable scope.
- [ ] technical logs remain separate.

---

## 96. Approved PDF Signing Tests

- [ ] production private key absent from repository.
- [ ] required signing identity absence/unreadability/mismatch produces critical not-ready/configuration outcome.
- [ ] Approved-PDF signing failure never exposes unsigned equivalent.
- [ ] human Approved By remains distinct from cryptographic signer.
- [ ] final signed PDF SHA-256 saved at issuance.
- [ ] historical public verification material can resolve old issuance after key rotation scenario.
- [ ] no TSA is required/claimed current MVP.

---

## 97. Public PDF Verification Tests

- [ ] page works without account Login.
- [ ] route is rate-limited.
- [ ] non-PDF rejected.
- [ ] uploaded PDF passes ClamAV before deep verification.
- [ ] temporary upload is deleted after processing.
- [ ] current exact issued PDF → `VALID_CURRENT`.
- [ ] genuine old exact PDF after Reopen/new Approved issuance → `VALID_SUPERSEDED` where applicable.
- [ ] one-byte modified exact-issued file cannot remain current-valid because SHA-256 differs.
- [ ] signature/hash/integrity modification path → `INVALID_MODIFIED`.
- [ ] unrecognized file → `UNKNOWN`.
- [ ] public response does not expose private NSCMF data/audit/storage secrets.

---

# PART S — CONFIRMED SECURITY DECISIONS

## 98. Locked Decisions

The following are confirmed and MUST NOT return to TBD without explicit requirement change:

1. password minimum 6 characters;
2. no password-composition requirement;
3. no MFA;
4. no self-registration;
5. temporary password + mandatory change for admin create/reset;
6. login throttling/progressive delay;
7. idle session 30 minutes;
8. absolute session lifetime 8 hours;
9. max 2 active sessions/account;
10. current-password re-authentication for sensitive administration;
11. target-session revocation after password/role/permission/access-changing identity mutation;
12. server-side deny-by-default authorization;
13. private attachment storage/quarantine;
14. ClamAV/`clamd` malware scanner baseline;
15. only explicit CLEAN makes file usable;
16. Business Audit has no age-based purge;
17. Access Audit has no age-based purge;
18. Security Audit has no age-based purge;
19. raw Access Audit protected by `audit.access.view`, Protected Superadmin default;
20. Security Audit protected by `audit.security.view`, Protected Superadmin default;
21. generated export binary remains temporary 168h/7d;
22. audit/issuance evidence survives binary cleanup;
23. Approved PDF signer = System/Organization;
24. human Approved By remains separate;
25. signing identity manually provisioned server-side/environment;
26. private key never in GitHub/source/ordinary deployment artifact/ordinary DB/browser;
27. missing/unusable required signing identity = critical not-ready/configuration condition;
28. no unsigned Approved-PDF fallback;
29. final signed PDF SHA-256 stored as issuance evidence;
30. NSCMF acts as issuer + authoritative application validator;
31. public no-login PDF validation capability;
32. public validator verifies signature + exact SHA-256 + issuance/currentness;
33. canonical validator results current/superseded/modified-invalid/unknown;
34. genuine superseded PDF is not considered modified merely because workflow later changed;
35. TSA is not required for current MVP.

---

# PART T — INTENTIONALLY DOWNSTREAM / NOT INVENTED HERE

## 99. Data / API / Environment Details Still Downstream

Security behavior is confirmed, but these exact implementation details remain downstream:

- exact user/session/audit/signing tables/columns/indexes;
- exact username pattern/length if not already finalized elsewhere;
- exact API payload/status-code names;
- exact Login limiter numeric bucket/decay values while preserving progressive throttling;
- exact short-lived re-auth proof lifetime;
- exact behavior for selecting which existing session is replaced/denied on third login, while preserving max 2;
- exact certificate/private-key file/container format;
- exact protected signing-key server path/mount;
- exact certificate provider/CA if external trust outside NSCMF's issuer/validator model is later required;
- exact cryptographic signing library/implementation chosen after compatibility/testing;
- exact private-key rotation/retirement ceremony;
- exact technical-log retention;
- exact ClamAV process/container topology and resource allocation;
- exact production object-storage provider;
- exact backup/restore/DR/RPO/RTO;
- exact production hosting/cloud/on-prem topology;
- exact performance/SLA/availability targets;
- notification provider/timing/events;
- exact public validator safe response metadata fields;
- exact public-validator polling/interaction implementation.

These downstream choices MUST NOT weaken the confirmed rules in this document.

---

# PART U — RETENTION TERMINOLOGY CLARIFICATION

## 100. Do Not Merge Different Retention Concepts

The system has intentionally different lifetime policies:

```text
AUTHORITATIVE BUSINESS / ACCESS / SECURITY AUDIT
→ no age-based automatic deletion

HISTORICAL PDF ISSUANCE / VERIFICATION METADATA
→ preserved beyond temporary binary cleanup so distributed PDFs remain verifiable

GENERATED XLSX/PDF BINARY IN APPLICATION STORAGE
→ 168 hours / 7 days
→ scheduled binary cleanup after expiry

TECHNICAL APPLICATION LOGS
→ separate operational concern
→ exact retention downstream
```

No generic `retention_days` setting may be applied indiscriminately to all four concerns.

---

# PART V — IMPLEMENTATION GUARDRAILS

## 101. Developer / AI Must Not

Implementation MUST NOT:

1. increase password minimum beyond 6 by default implementation preference;
2. require uppercase/lowercase/number/symbol composition;
3. add MFA current MVP;
4. enable self-registration;
5. store/log plaintext password;
6. allow unlimited active sessions;
7. ignore 30m idle/8h absolute session policy;
8. execute sensitive admin mutation after failed password re-auth;
9. preserve target sessions after password/role/permission/access-changing mutation;
10. treat frontend button hiding as authorization;
11. allow IDOR through record/attachment/export/audit IDs;
12. mass-assign state/approved_by/protected fields;
13. disable CSRF globally for convenience;
14. render untrusted HTML/script unsafely;
15. store normal attachments in publicly executable path;
16. trust extension/MIME claim alone where stronger checking is feasible;
17. make structurally valid upload usable before ClamAV CLEAN;
18. treat ClamAV error/timeout/unavailable as CLEAN;
19. expose `clamd` publicly;
20. change attachment optionality into mandatory due security scanning;
21. age-purge Business Audit;
22. age-purge Access Audit;
23. age-purge Security Audit;
24. present 12-month audit retention as current rule;
25. delete audit/issuance evidence when 7-day export binary expires;
26. expose raw Access Audit merely because user can view Business Timeline;
27. put production private signing key in GitHub/source/ordinary deployment artifact/ordinary DB/browser;
28. consider application normal-ready while required signing identity is silently absent/unusable;
29. provide unsigned Approved PDF fallback;
30. equate cryptographic signer with human Approved By;
31. claim TSA/trusted independent timestamp current MVP;
32. let public validator expose private History/form/audit/attachment data;
33. use private signing key in browser/public validation path;
34. classify genuine superseded PDF as modified solely because Reopen/new approval happened;
35. return `VALID_CURRENT` when signature/hash/issuance/currentness cannot all be established;
36. retain public-validator uploads as normal attachments;
37. expose stack trace/private key path/secrets in user errors;
38. let Security Rules introduce a new NSCMF business state.

---

# PART W — TRACEABILITY

## 102. Authority Matrix

| Concern | Authoritative Source |
|---|---|
| Product scope | `01_PRD.md` |
| Business invariant | `02_Business_Rules.md` |
| User interaction | `03_User_Flow.md` |
| Permission/scope | `04_RBAC_Permission_Matrix.md` |
| Lifecycle/state | `05_State_Status_Flow.md` |
| Business/input validation | `06_Validation_Rules.md` |
| Presentation/interaction | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Logical architecture/concurrency | `09_System_Architecture.md` |
| **Security controls** | **`10_Security_Rules.md`** |
| Database schema | `11_ERD_Database_Schema.md` |
| API | `12_API_Contract.md` |
| Project structure | `13_Project_Structure.md` |
| Environment | `14_Environment_Specification.md` |
| Coding rules | `15_Coding_Rules_AGENTS.md` |
| Testing | `16_Testing_Specification.md` |
| Seed data | `17_Seed_Dummy_Data_Specification.md` |
| Definition of Done | `18_Definition_of_Done.md` |
| Implementation plan | `19_Task_Implementation_Plan.md` |
| Deployment | `20_Deployment_Architecture.md` |

---

## 103. Security-to-Architecture Mapping

```text
Password/session policy
→ Identity & Authentication Module

Sensitive re-auth + session revocation
→ Identity/Admin/Authorization boundary

ClamAV
→ Attachment MalwareScanner boundary

Permanent Business/Access/Security Audit
→ separate authoritative audit modules/tables

Approved-PDF key custody/readiness
→ PdfSigningService + protected environment configuration

Public PDF verification
→ public route + temporary upload + ClamAV + PdfVerificationService

Exact SHA-256 issuance evidence
→ persistent issuance metadata
```

---

## 104. Security-to-UI Mapping

UI must represent, without becoming authority:

- temporary password change;
- Login throttling feedback;
- session expiry/revocation;
- password re-auth dialog;
- attachment `Scanning/Ready/Rejected` states;
- privileged audit read-only surfaces;
- signing critical readiness/failure;
- queued export/expiry;
- public validator result semantics.

---

# PART X — FINAL CONSISTENCY STATEMENTS

## 105. Security Does Not Change Workflow

This document does **not** introduce:

- MFA step in business workflow;
- extra Review/Approval level;
- exclusive Reviewer/Approver ownership;
- additional NSCMF state;
- mandatory attachment;
- personal Approver certificate;
- public NSCMF portal;
- TSA requirement;
- permanent generated export binary storage.

---

## 106. Audit and Export Lifetimes Are Intentionally Different

Final explicit interpretation:

> Audit evidence is permanent from an age-retention perspective. Generated export binaries are temporary for 7 days. These rules are not contradictory because they apply to different data classes.

---

## 107. Issuer and Validator Model

Final explicit interpretation:

> NSCMF signs Approved PDFs using the System/Organization signing identity and also provides its own public validation service. The public validator uses public verification material, exact final-file SHA-256, issuance metadata, and current business context; it never requires the private signing key in the public/browser path.

---

## 108. Superseded Is a Business-Currentness Result

Final explicit interpretation:

> A genuine byte-exact signed PDF can remain cryptographically authentic but become `VALID_SUPERSEDED` after Reopen/Revert or a newer Approved issuance. Superseded does not mean the PDF was modified.

---

## 109. Next Document

Next document in the fixed project sequence:

**`11_ERD_Database_Schema.md`**

ERD MUST materialize these confirmed security requirements without merging Business Audit, Access Audit, Security Audit, export binary storage, issuance metadata, session records, and NSCMF business state into ambiguous structures.