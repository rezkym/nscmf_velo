# State / Status Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-STATE-005  
> **Document Order:** 05 / 20  
> **Status:** Approved for Implementation  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`, `03_User_Flow.md`, `04_RBAC_Permission_Matrix.md`  
> **Synchronized With:** `06_Validation_Rules.md`, `08_Tech_Stack_Specification.md`, `09_System_Architecture.md`, `10_Security_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-09-02  

---

## 1. Purpose

Dokumen ini menjadi **source of truth authoritative untuk lifecycle/state NSCMF**.

Dokumen menjawab:

- business status apa saja yang valid;
- action apa yang dapat memindahkan record;
- permission/actor context yang dibutuhkan;
- precondition setiap transition;
- Requester editability;
- revision loop;
- Reopen/Revert;
- workflow iteration semantics;
- Archive/Unarchive;
- concurrent Reviewer/Approver action;
- Change Result treatment tanpa state tambahan.

Field/action validation berada di `06`. Authorization berada di `04`. Team adalah organizational data dan **tidak** menjadi state-transition authorization scope.

---

## 2. Normative Language

- **MUST** — wajib.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan.
- **SHOULD** — recommended default.
- **TBD** — belum final dan tidak boleh ditebak.

---

## 3. State Machine Principles

### STATE-PRINCIPLE-001 — Minimal Business States
Technical/security/view/export conditions MUST NOT become business states.

### STATE-PRINCIPLE-002 — Waiting-State Naming
Active processing states use `PENDING_REVIEW` and `PENDING_APPROVAL`.

### STATE-PRINCIPLE-003 — View Is Not Transition
Reviewer/Approver opening record never changes state.

### STATE-PRINCIPLE-004 — Non-Exclusive Pools
Reviewer/Approver are shared/non-exclusive. No `ASSIGNED_TO_REVIEWER_X`, `UNDER_REVIEW_BY_X`, or similar state.

### STATE-PRINCIPLE-005 — Reopen Is Action
`REOPENED` is not a persistent state.

### STATE-PRINCIPLE-006 — Archive Is Separate
Archive is represented separately from `business_status`.

### STATE-PRINCIPLE-007 — Server-Enforced State
Backend revalidates current state before workflow-changing action.

### STATE-PRINCIPLE-008 — Permission-Based Stage Eligibility
Reviewer/Approver stage eligibility uses required action permission + current state + domain/security prerequisites. No Team/Unit/Division/Reviewer Scope/Approval Scope matching exists.

---

# PART A — CANONICAL STATES

## 4. Canonical State Catalog

```text
DRAFT
PENDING_REVIEW
REVISION_REQUIRED
PENDING_APPROVAL
REJECTED
APPROVED
CANCELLED
```

| State | Meaning | Requester Editability | Normal Outgoing Transition | Classification |
|---|---|---|---|---|
| `DRAFT` | Record prepared before first Submit | Editable own record | Submit, Cancel | Active |
| `PENDING_REVIEW` | Shared permission-based Reviewer pool | General form locked; eligible owner may edit Change Result only | Return, Reject, Forward | Active |
| `REVISION_REQUIRED` | Returned to Requester | Editable own record | Resubmit | Active |
| `PENDING_APPROVAL` | Shared permission-based Approver pool | Locked | Return Reviewer, Return Requester, Reject, Approve | Active |
| `REJECTED` | Normal workflow stopped | Locked | Authorized Reopen only | Recoverable terminal/protected |
| `APPROVED` | Final approval valid for current iteration | Locked | Authorized Reopen/Revert only | Recoverable terminal/protected |
| `CANCELLED` | Draft cancelled before first Submit | Locked | None | Permanent terminal |

---

## 5. Explicit Non-States

| Concept | Treatment |
|---|---|
| `SUBMITTED` | event producing `PENDING_REVIEW` |
| `UNDER_REVIEW` | not used |
| `REVIEWED` | event producing `PENDING_APPROVAL` |
| `REOPENED` | transition event |
| `ARCHIVED` | independent lifecycle flag |
| `UNARCHIVED` | lifecycle event |
| `VIEWED` | access event |
| `SAVED` / `AUTOSAVED` | persistence event |
| export states | technical states only |
| malware/signing/verification states | security/technical states only |

---

# PART B — MAIN FLOW

## 6. Canonical Main Flow

```text
DRAFT
  |-- Cancel --------------------------------------> CANCELLED
  |
  +-- Submit --------------------------------------> PENDING_REVIEW
                                                        |
                                                        |-- Return --> REVISION_REQUIRED
                                                        |                 |
                                                        |                 +-- Resubmit --> PENDING_REVIEW
                                                        |
                                                        |-- Reject --> REJECTED
                                                        |
                                                        +-- Forward --> PENDING_APPROVAL
                                                                          |
                                                                          |-- Return Reviewer --> PENDING_REVIEW
                                                                          |-- Return Requester -> REVISION_REQUIRED
                                                                          |-- Reject -----------> REJECTED
                                                                          +-- Approve ----------> APPROVED
```

Recovery:

```text
REJECTED / APPROVED
  -- Reopen(reason, destination) --> REVISION_REQUIRED or PENDING_REVIEW
  -- successful Reopen starts next workflow iteration

CANCELLED
  -- no Reopen --> terminal
```

---

# PART C — STATE DEFINITIONS

## 7. `DRAFT`

Entry: record creation.

Allowed state-neutral events:

- autosave;
- Save Draft;
- attachment mutation according to permission/security gate;
- editable data/numbering changes.

Requester needs required permission + ownership. Draft MAY be incomplete.

Transitions:

```text
Submit -> PENDING_REVIEW
Cancel -> CANCELLED
```

Reviewer/Approver/Reopen/Archive are forbidden.

## 8. `PENDING_REVIEW`

Entry sources:

- `DRAFT` via Submit;
- `REVISION_REQUIRED` via Resubmit;
- `PENDING_APPROVAL` via Return to Reviewer;
- `REJECTED`/`APPROVED` via authorized Reopen.

Meaning: record is available to the shared Reviewer pool determined by permissions, **not organizational scope**.

Any actor with required action permission MAY perform valid Reviewer action while all other state/domain/security prerequisites pass.

Allowed transitions:

1. Return for Revision → `REVISION_REQUIRED` — mandatory reason.
2. Reject → `REJECTED` — mandatory reason.
3. Forward → `PENDING_APPROVAL` — Forward validation gate.

Requester general editing remains locked.

Change Result exception:

```text
nscmf.change.result.edit
+ owns record
+ family = CHANGE
+ PENDING_REVIEW
```

may edit Result fields only.

## 9. `REVISION_REQUIRED`

Entry:

- Reviewer Return;
- Approver Return to Requester;
- authorized Reopen from Rejected/Approved.

Requester may edit own record with required permission. Autosave/Save/attachment mutation follow normal editable rules.

Only normal transition:

```text
REVISION_REQUIRED -> Resubmit -> PENDING_REVIEW
```

No direct `REVISION_REQUIRED -> PENDING_APPROVAL`.

## 10. `PENDING_APPROVAL`

Entry only through successful Reviewer Forward.

Meaning: record is available to shared Approver pool determined by permissions, not Team/scope.

Action-specific permission required for:

1. Return to Reviewer → `PENDING_REVIEW`;
2. Return to Requester → `REVISION_REQUIRED`;
3. Reject → `REJECTED`;
4. Approve → `APPROVED`.

One valid successful Approve is sufficient. Stale second Approver action denied.

## 11. `REJECTED`

Normal Requester edit locked.

Reopen requires:

```text
nscmf.reopen
+ authorized record access
+ not archived
+ mandatory reason
+ destination in {REVISION_REQUIRED, PENDING_REVIEW}
```

No Team/scope condition.

## 12. `APPROVED`

Final approval valid for current workflow iteration.

`Approved By` = successful final Approve actor.

Reopen/Revert requires same lifecycle prerequisites as Rejected and only targets Revision/Review.

Previous Approval evidence remains preserved.

## 13. `CANCELLED`

Entry only:

```text
DRAFT -> Cancel -> CANCELLED
```

Requires own Draft + never submitted. Permanent terminal. May be archived/unarchived administratively, but never Reopened.

---

# PART D — AUTHORITATIVE TRANSITION MATRIX

## 14. Transition Matrix

| From | Action | To | Core Permission | Key Preconditions |
|---|---|---|---|---|
| `DRAFT` | Submit | `PENDING_REVIEW` | `nscmf.submit` | owns record + validation |
| `DRAFT` | Cancel | `CANCELLED` | `nscmf.cancel` | owns record + never submitted |
| `PENDING_REVIEW` | Return | `REVISION_REQUIRED` | `nscmf.review.return` | current state + mandatory reason |
| `PENDING_REVIEW` | Reject | `REJECTED` | `nscmf.review.reject` | current state + mandatory reason |
| `PENDING_REVIEW` | Forward | `PENDING_APPROVAL` | `nscmf.review.forward` | current state + Forward gate |
| `REVISION_REQUIRED` | Resubmit | `PENDING_REVIEW` | `nscmf.submit` | owns record + validation |
| `PENDING_APPROVAL` | Return Reviewer | `PENDING_REVIEW` | `nscmf.approval.return_reviewer` | current state + mandatory reason |
| `PENDING_APPROVAL` | Return Requester | `REVISION_REQUIRED` | `nscmf.approval.return_requester` | current state + mandatory reason |
| `PENDING_APPROVAL` | Reject | `REJECTED` | `nscmf.approval.reject` | current state + mandatory reason |
| `PENDING_APPROVAL` | Approve | `APPROVED` | `nscmf.approve` | review prerequisite + current state |
| `REJECTED` | Reopen | `REVISION_REQUIRED` | `nscmf.reopen` | authorized access + not archived + reason |
| `REJECTED` | Reopen | `PENDING_REVIEW` | `nscmf.reopen` | authorized access + not archived + reason |
| `APPROVED` | Reopen/Revert | `REVISION_REQUIRED` | `nscmf.reopen` | authorized access + not archived + reason |
| `APPROVED` | Reopen/Revert | `PENDING_REVIEW` | `nscmf.reopen` | authorized access + not archived + reason |

No Team, Unit, Division, Reviewer Scope, or Approval Scope column exists.

## 15. State-Neutral Events

Subject to appropriate authorization/validation:

- View;
- autosave;
- Save Draft;
- editable field persistence;
- Change Result narrow persistence;
- attachment mutation;
- timeline read;
- Export;
- reviewer/approver view;
- Archive/Unarchive flag changes.

State-neutral does not mean audit-neutral.

---

# PART E — WORKFLOW ITERATION

## 16. Iteration Definition

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

---

# PART F — REVISION / REOPEN / ARCHIVE

## 17. Unlimited Revision

No fixed maximum revision loop.

## 18. Approver Return to Requester

```text
PENDING_APPROVAL
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
```

Same workflow iteration until terminal outcome/Reopen.

## 19. Approver Return to Reviewer

```text
PENDING_APPROVAL -> PENDING_REVIEW
```

Requester general form remains locked.

## 20. Reviewer Continuity

Reviewer continuity is metadata/audit context, not exclusive authorization. Any actor with required Review permission remains eligible when current state permits.

## 21. Reopen Rules

Only `REJECTED`, `APPROVED` are Reopen-eligible. `CANCELLED` never.

Destination only:

1. `REVISION_REQUIRED`
2. `PENDING_REVIEW`

No `DRAFT` or `PENDING_APPROVAL` target.

Successful Reopen requires required permission, authorized record access, not archived, mandatory reason, valid destination, current-state recheck, and starts a new workflow iteration.

## 22. Archive

Archive independent from business status:

```text
business_status = <canonical state>
is_archived = false|true
```

Only `APPROVED`, `REJECTED`, `CANCELLED` can archive.

Archive/Unarchive require `nscmf.archive`, authorized record access, mandatory reason, state/flag validity.

Team is not an archive visibility rule.

---

# PART G — CHANGE RESULT

## 23. Result Does Not Create State

No `EXECUTION_PENDING`, `RESULT_PENDING`, `COMPLETED`.

## 24. First Submit

Zero Result rows allowed. Started row must be complete at applicable validation gate.

## 25. Forward Gate

Before Change `PENDING_REVIEW -> PENDING_APPROVAL`:

- minimum one complete Result row;
- all started rows complete;
- maximum five rows capacity;
- applicable validation passes.

## 26. Result Editing

Default actor:

```text
Requester/owner
+ nscmf.change.result.edit
+ owns Change
+ PENDING_REVIEW
```

Only Result Summary, Performance Information, Status fields. Planning/general fields remain locked. Persisted changes audited and optimistic version protected.

---

# PART H — CONCURRENCY

## 27. Reviewer Race

Several permission-eligible Reviewers may open same candidate. First valid transition wins through row-lock/current-state transaction. Later stale conflicting Reviewer action fails.

## 28. Approver Race

Several permission-eligible Approvers may open same candidate. First valid final Approve changes state to Approved; later stale Approver actions fail. Only successful actor is `Approved By` for that iteration.

## 29. Atomic Transition

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

---

# PART I — EDITABILITY / INVALID TRANSITIONS

## 30. State Editability

| State | General Requester Edit | Change Result Narrow Edit | Save Draft | Reviewer Actions | Approver Actions | Reopen | Archive |
|---|---:|---:|---:|---:|---:|---:|---:|
| `DRAFT` | Yes own | normal form | Yes | No | No | No | No |
| `PENDING_REVIEW` | No | Yes eligible owner | No general | Yes permission-based | No | No | No |
| `REVISION_REQUIRED` | Yes own | normal form | Yes | No | No | No | No |
| `PENDING_APPROVAL` | No | No | No | No | Yes permission-based | No | No |
| `REJECTED` | No | No | No | No | No | Yes | Yes |
| `APPROVED` | No | No | No | No | No | Yes | Yes |
| `CANCELLED` | No | No | No | No | No | Never | Yes |

## 31. Forbidden Transitions

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

---

# PART J — ACTION EVALUATION

## 32. Server-Side Transition Evaluation

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

---

# PART K — EXAMPLES

## 33. Happy Path

```text
Create -> DRAFT -> Submit -> PENDING_REVIEW -> Forward -> PENDING_APPROVAL -> Approve -> APPROVED
```

## 34. Reviewer Revision Loop

```text
DRAFT
-> PENDING_REVIEW
-> Return
-> REVISION_REQUIRED
-> Resubmit
-> PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
-> Approve
-> APPROVED
```

All still workflow iteration 1.

## 35. Approved Then Reopened

```text
Iteration 1:
APPROVED
-> Reopen(reason, PENDING_REVIEW)

Iteration 2:
PENDING_REVIEW
-> Forward
-> PENDING_APPROVAL
-> Approve
-> APPROVED
```

Previous Approval remains historical.

## 36. Archive / Unarchive

```text
APPROVED + false
-> Archive(reason)
-> APPROVED + true
-> Unarchive(reason)
-> APPROVED + false
```

---

# PART L — CONFIRMED DECISIONS

## 37. Confirmed State Decisions

| Area | Decision |
|---|---|
| Canonical states | exactly seven states listed above |
| Review eligibility | required permission + state/domain rules; no scope |
| Approval eligibility | required permission + state/domain rules; no scope |
| Team | no state/authorization effect |
| Review pool | shared/non-exclusive |
| Approval pool | shared/non-exclusive |
| Revision | unlimited |
| Workflow iteration | first Submit starts 1; returns/revisions stay current; Reopen increments |
| Final approval | one eligible Approver sufficient |
| Reopen | Rejected/Approved only; Review/Revision target; mandatory reason |
| Cancelled | permanent |
| Archive | independent flag |
| Change Result | owner narrow edit in Pending Review; min one complete row before Forward |
| Emergency | same state machine |
| Concurrency | stale state-changing actions rejected |

---

# PART M — DOWNSTREAM / ACCEPTANCE

## 38. Technical Items Deferred to ERD/API

- physical business-status representation;
- workflow-iteration table/columns;
- transition-event schema;
- optimistic version field;
- immutable export snapshot relationship;
- DB constraints/indexes;
- stale-action API error shape.

No Unit/Division or Reviewer/Approval scope representation is needed.

## 39. State Flow Acceptance Criteria

- [ ] new record starts Draft;
- [ ] Draft incomplete save allowed;
- [ ] Submit → Pending Review;
- [ ] permission-eligible Reviewer can act without Team/scope matching;
- [ ] Reviewer view no state/ownership change;
- [ ] Return/Reject reasons enforced;
- [ ] Revision editable own record and Resubmit returns Review;
- [ ] Change Forward blocked until Result gate;
- [ ] permission-eligible Approver can act without Team/scope matching;
- [ ] one final Approve sufficient;
- [ ] stale second Approve denied;
- [ ] first Submit creates workflow iteration 1;
- [ ] normal Return/Revision/Resubmit stays same iteration;
- [ ] Reopen starts next iteration;
- [ ] previous approval/rejection preserved;
- [ ] Cancel permanent;
- [ ] Archive does not change business status;
- [ ] concurrent stale actions rejected.

## 40. Relationship / Documentation Handoff

| Concern | Authority |
|---|---|
| Product | `01_PRD.md` |
| Business | `02_Business_Rules.md` |
| User Flow | `03_User_Flow.md` |
| Permission authorization | `04_RBAC_Permission_Matrix.md` |
| **State / workflow iteration** | **`05_State_Status_Flow.md`** |
| Validation | `06_Validation_Rules.md` |
| UI | `07_UI_UX_Specification.md` |
| Technology | `08_Tech_Stack_Specification.md` |
| Architecture | `09_System_Architecture.md` |
| Security | `10_Security_Rules.md` |

Fixed-order project documentation is complete and **Approved for Implementation** through `20_Deployment_Architecture.md`.

Current project handoff: implementation follows `19_Task_Implementation_Plan.md`, beginning with **Phase 0 / T00** only after explicit user instruction.

This document remains authoritative for its own concern and may only be changed through an explicit, synchronized, approved requirement change.
