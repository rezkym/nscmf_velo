# Pre-Coding-Rules Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Synchronization Addendum — not a new fixed-order project deliverable  
> **Applies To:** authoritative implementation-facing interpretation of `01_PRD.md` through `14_Environment_Specification.md`, including `11A` and `12A`  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-08-31  
> **Status:** Confirmed / Authoritative pre-`15` synchronization  
> **Next Fixed-Order Document:** `15_Coding_Rules_AGENTS.md` — MUST NOT be created until explicit user instruction

---

## 1. Purpose

Dokumen ini merekam keputusan development-process dan repository-governance yang sudah dikonfirmasi user setelah `14_Environment_Specification.md` selesai tetapi **sebelum** `15_Coding_Rules_AGENTS.md` dibuat.

Tujuan addendum ini adalah memastikan implementasi tidak memulai development dengan asumsi yang sudah outdated, sekaligus menjaga separation of concerns: Product/Business/API/Security documents tidak dipaksa menjadi coding-agent rulebook.

Jika terdapat handoff/progress wording lama pada dokumen 01–14 yang masih menyebut `11`, `13`, atau `14` sebagai dokumen berikutnya, wording tersebut adalah historical progress marker dan **tidak** mengalahkan current project state berikut:

```text
01–14 complete as authoritative draft set
11A and 12A remain authoritative synchronization addenda
14A = current pre-15 synchronization overlay
next fixed-order document = 15_Coding_Rules_AGENTS.md
15 must wait for explicit user instruction
```

Addendum ini tidak mengubah business scope, canonical states, permission model, API contract, schema facts, security behavior, atau environment/runtime product values.

---

# PART A — TEST-DRIVEN DEVELOPMENT

## 2. TDD Is Mandatory

Development menggunakan **Test-Driven Development (TDD)** untuk new behavior, bug fix, dan behavior-changing implementation.

Canonical cycle:

```text
approved specification / requirement
→ test first
→ execute and prove RED for the intended missing/incorrect behavior
→ minimum correct implementation
→ execute and prove GREEN
→ relevant regression suite
→ refactor while remaining GREEN
```

The test follows the specification. The implementation follows the test/specification.

Developer/coding agent MUST NOT:

- write production behavior first and then manufacture a test that merely mirrors the implementation;
- modify expected behavior only so existing code passes;
- weaken/remove assertions to obtain GREEN;
- skip/todo/disable a relevant failing test without an approved reason;
- replace meaningful behavior proof with mocks that no longer validate the required behavior;
- treat `test passes` as permission to violate an upstream project specification.

For a pure behavior-preserving refactor, an artificial RED test is not required when existing passing tests already prove the behavior being preserved.

`08_Tech_Stack_Specification.md` is synchronized directly with this TDD baseline. Exact TDD evidence/PR rules belong to `15`/`16`.

---

# PART B — STATIC TYPES / STATIC ANALYSIS

## 3. PHP Strictness

Project-owned PHP code uses:

```php
declare(strict_types=1);
```

unless a narrow interoperability exception is explicitly justified.

PHPStan/Larastan policy:

```text
level = max
baseline policy = zero-baseline
```

A broad baseline file or mass-ignore strategy MUST NOT be introduced merely to make CI green.

## 4. TypeScript Strictness

TypeScript MUST run with:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Project-owned code MUST NOT normalize `any`, `as any`, blanket `@ts-ignore`, or equivalent escape hatches as a way to bypass type errors.

A narrow external interoperability exception MAY exist only when safer typing is not practical, is local/explicit, and is covered by appropriate tests.

---

# PART C — DEPENDENCY GOVERNANCE

## 5. New Dependency Requires User Approval

A coding agent/developer MUST request explicit user approval before adding a new Composer/npm dependency that is not already approved by the project specifications.

This applies to both runtime and development dependencies.

The agent MUST NOT install a package merely because it simplifies implementation, avoids writing project-owned code, or suppresses a tooling problem.

Existing approved dependencies may be installed/resolved according to the committed lockfiles and approved compatible versions.

---

# PART D — DATABASE MIGRATION IMMUTABILITY

## 6. Applied Migration Is Immutable

A migration that has already been executed in a shared environment — including CI integration history where relevant, staging, or production — MUST NOT be rewritten to change historical schema behavior.

Required direction:

```text
new schema change
→ create a new forward migration
→ test forward behavior
→ preserve migration history
```

Editing a historical migration is allowed only while it is still genuinely local/unshared and has never become part of shared environment history.

Once shared/applied, the safe rule is **new migration, not rewrite history**.

Developer/coding agent MUST NOT use `migrate:fresh`, destructive rollback/reset, table drop, or equivalent destructive shortcut against a shared/staging/production data environment to avoid writing the correct forward migration.

This rule supplements `11_ERD_Database_Schema.md` and `13_Project_Structure.md` without changing the authoritative target schema defined by `11`.

---

# PART E — DESTRUCTIVE COMMAND SAFETY

## 7. Explicit User Approval Required

The approved policy is **B: the agent must ask the user for approval before executing a destructive command/action**.

A destructive action includes any operation that can materially erase, overwrite, irreversibly rewrite, or bypass review/history, including examples such as:

```text
rm -rf or equivalent broad deletion
DROP/TRUNCATE database objects or data
php artisan migrate:fresh on non-disposable data
force-resetting shared data
force-push / rewriting shared Git history
deleting branches containing unmerged work
deleting authoritative project documents
purging authoritative audit/history
replacing an immutable registered template version
```

Normal safe creation/editing, test execution, linting, static analysis, build, and non-destructive reads do not require this extra approval merely because they change temporary local build/test output.

A coding agent MUST NOT reinterpret `user asked me to implement` as blanket authorization for an unrelated destructive shortcut.

---

# PART F — GIT / BRANCH / PULL REQUEST GOVERNANCE

## 8. Branch + Pull Request Workflow

Normal project changes MUST use:

```text
main
  ↓ branch from current approved base
feature/fix/docs/chore branch
  ↓ commits
Pull Request to main
  ↓ CI/review
human final merge
```

Direct implementation commits to `main` are not the normal workflow.

## 9. Human-Only Final Merge

A coding agent MAY create/update the branch and Pull Request and MAY fix issues found by CI/review.

A coding agent MUST NOT approve or merge its own implementation Pull Request.

Final merge authority belongs to the user/human owner.

## 10. Conventional Commits

Commit messages MUST follow Conventional Commits, for example:

```text
feat: ...
fix: ...
docs: ...
test: ...
refactor: ...
chore: ...
```

Commit scope MAY be used when it improves clarity.

## 11. Commit Identity / No AI Contributor

Commit history MUST NOT add the model, ChatGPT, Codex, another AI model, or an AI agent as contributor/co-author.

Forbidden metadata includes examples such as:

```text
Co-authored-by: ChatGPT ...
Co-authored-by: Codex ...
Generated-by: <model>
AI contributor: <model>
```

Commits MUST be made using the user's configured Git identity / authenticated repository identity, or using the user's configured signing key/GPG mechanism where available.

The absence of an AI co-author trailer does not weaken responsibility: the resulting repository history belongs to the user/project, and final merge remains human-controlled.

---

# PART G — GENERATED ARTIFACTS

## 12. Generated Output Has an Upstream Source

Generated files MUST NOT become an independent handwritten source of truth when they are reproducibly derived from source/config/schema/template definitions.

When a generated artifact is required in Git:

```text
edit authoritative source
→ regenerate artifact with the approved tool/process
→ review generated diff
→ commit source + required generated output consistently
```

Developer/coding agent MUST NOT hand-edit generated output to conceal a mismatch with its authoritative source.

Generated temporary/build/runtime artifacts that are not required by the repository contract SHOULD remain uncommitted/ignored.

Production secrets, private signing material, local `.env`, runtime uploads, private generated exports, and other environment data MUST NOT be committed merely because a tool generated them.

Exact generated-file inventory may be finalized by `15`/`17`/`18` as implementation structure becomes concrete.

---

# PART H — AGENTS.md / PROJECT-DOC SYNCHRONIZATION

## 13. Future Root `AGENTS.md`

`15_Coding_Rules_AGENTS.md` will define the authoritative coding/developer/agent rules after explicit user instruction.

When `15` is created, the repository root MUST also expose an `AGENTS.md` entrypoint suitable for coding agents. The exact mechanism may be one of the approved forms defined by `15`, but it MUST remain synchronized with the authoritative coding rules and MUST NOT silently contradict `project_doc`.

The root `AGENTS.md` is an implementation-agent entrypoint, not a replacement for project documentation authority.

## 14. Synchronization Principle

When an approved requirement changes:

```text
identify authoritative upstream concern
→ update affected project_doc authorities
→ update tests/implementation guidance that depend on it
→ keep AGENTS.md synchronized
```

An agent MUST NOT change only code/AGENTS instructions while leaving an affected authoritative project document contradictory.

Conversely, `AGENTS.md` MUST NOT invent a new product/business/security rule that has no authority in the relevant project documentation.

---

# PART I — CURRENT DOCUMENT STATUS

## 15. Current Authoritative Set

Current project documentation state after this synchronization:

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
11A_Resumable_Attachment_Upload_Synchronization.md
12_API_Contract.md
12A_Repository_Service_Architecture_Synchronization.md
13_Project_Structure.md
14_Environment_Specification.md
14A_Pre_Coding_Rules_Synchronization.md
```

Historical `Next Document` wording inside older documents is informational history only where it conflicts with this current status.

## 16. Decisions Now Locked Before `15`

The following are no longer open/TBD for `15`:

- TDD-first development for new behavior, bug fixes, and behavior changes;
- tests must follow specification rather than implementation;
- PHP `strict_types` baseline;
- PHPStan/Larastan `max` with zero-baseline policy;
- TypeScript `strict: true` and no casual `any` bypass;
- new Composer/npm dependency requires explicit user approval;
- shared/applied migrations are immutable; schema evolution uses forward migrations;
- destructive commands/actions require explicit user approval;
- normal Git workflow uses branch + Pull Request;
- Conventional Commits;
- no model/AI contributor/co-author metadata;
- commits use user/project identity or configured signing mechanism;
- coding agent cannot approve/merge its own PR; final merge is human/user-controlled;
- generated output must remain synchronized with its authoritative source and must not be manually falsified;
- root `AGENTS.md` must remain synchronized with `15`/project documentation once created.

---

# PART J — GUARDRAILS BEFORE `15`

## 17. MUST NOT

Until `15_Coding_Rules_AGENTS.md` is explicitly created, developer/coding agent MUST NOT:

1. treat the absence of `15` as permission to ignore the decisions in this addendum;
2. start implementation without TDD where TDD applies;
3. lower static-analysis/type strictness to make code pass;
4. add unapproved dependencies;
5. rewrite shared/applied migration history;
6. execute a destructive command without explicit user approval;
7. commit directly to `main` as the normal implementation workflow;
8. merge/approve its own PR;
9. add AI/model contributor metadata;
10. hand-edit generated output to disagree with its source;
11. create root `AGENTS.md` or `15_Coding_Rules_AGENTS.md` before the user instructs creation;
12. use stale historical handoff wording to claim that `14` does not yet exist.

---

## 18. Next Document

Next fixed-order document remains:

**`15_Coding_Rules_AGENTS.md`**

It MUST NOT be created, drafted into the repository, or treated as completed until the user explicitly instructs its creation.