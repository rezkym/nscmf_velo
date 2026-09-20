# Handoff — Phase 0 Bootstrap + T04 Runtime Configuration

> **Date:** 2026-09-16
> **Branch:** `chore/bootstrap-application` (based on `docs/sync-local-specification-updates`, which is based on `origin/main`)
> **Status:** Committed locally, **not pushed**, no Pull Request opened yet
> **Scope completed:** `19_Task_Implementation_Plan.md` → Phase 0 (T00, T01, T02, T03) and Phase 1 → T04
> **Scope NOT started:** T05 (relational schema) and everything after it

This folder records what already exists in the repository so the next agent does not have to rediscover it.
It is a status record only. It does **not** define product, business, security, or architecture rules — those stay in
`project_doc/` and `AGENTS.md`, which remain the only authorities.

---

## 1. What exists now

A running Laravel 13 + Vue 3 + Inertia 3 application skeleton with a complete test and quality toolchain, a local
MySQL 8.4 service, a CI workflow, and the locked runtime configuration from `14_Environment_Specification.md`.

There is **no NSCMF business behaviour yet**: no business migrations, no domain models, no workflow, no permissions,
no authentication beyond the framework default. The only route besides `/up` is `/`, which renders a neutral
`Welcome` Inertia page used as a smoke proof.

### Commits on the branch (oldest first)

| Commit    | Message                                              | Task |
| --------- | ---------------------------------------------------- | ---- |
| `43329c3` | docs: synchronize local specification refinements     | —    |
| `a178c11` | chore: bootstrap Laravel 13 application skeleton      | T00  |
| `756e221` | chore: bootstrap Vue 3 TypeScript Inertia frontend    | T01  |
| `16ef9d3` | chore: add local MySQL 8.4 development service        | T00+ |
| `0a82967` | chore: add testing and code-quality harness           | T02  |
| `2baa0a0` | ci: add GitHub Actions quality pipeline               | T03  |
| `6ba8a61` | test: cover runtime environment configuration contract| T04 RED |
| `c6cefce` | feat: configure runtime environment contract          | T04 GREEN |
| `ade2cfc` | docs: add local development setup guide               | —    |

`43329c3` carries five `project_doc` files that were newer on the developer machine than on `origin/main`
(`06`, `11`, `12`, `13`, `19`). All commits are GPG-signed with the owner's Git identity and contain no AI
contributor metadata, as required by `15_Coding_Rules_AGENTS.md` §91.

---

## 2. Installed versions (verified on this machine)

| Component            | Version                                    |
| -------------------- | ------------------------------------------ |
| PHP                  | 8.5.2 (Homebrew), with `pcov` enabled       |
| Composer             | 2.8.11                                      |
| Laravel              | 13.31.0                                     |
| Inertia (server)     | `inertiajs/inertia-laravel` 3.3.4            |
| Pest / PHPUnit       | Pest 4.7.8 (`phpunit/phpunit` is transitive) |
| PHPStan / Larastan   | 2.2.14 / 3.12.1, level max, no baseline      |
| Node.js / npm        | 24.19.0 / 11.17.0                            |
| Vue / Inertia client | 3.5.x / `@inertiajs/vue3` 3.7.1              |
| TypeScript / vue-tsc | 5.9.3 / 3.3.11 (strict)                      |
| Vite / Tailwind CSS  | 8.x / 4.x                                    |
| Vitest               | 4.1.11 with `@vitest/coverage-v8` and jsdom  |
| ESLint / Prettier    | 10.10.0 / 3.9.6                              |
| Playwright           | 1.63.0, Chromium 153.0.8010.12 installed     |
| MySQL (Docker)       | 8.4.11                                       |

`pestphp/pest-plugin-laravel` 4.1.0 is the newest release that still supports Pest 4; Pest 5 exists but
`08_Tech_Stack_Specification.md` locks Pest 4, so Pest 4 was used. Vitest 5 exists for the same reason: the
specification locks Vitest 4.

---

## 3. Local infrastructure state

```text
Docker compose project: nscmf_velo   (compose.yaml at repository root)
Container:              nscmf_mysql  (mysql:8.4, port 3306, volume nscmf_velo_nscmf_mysql_data)
Databases:              nscmf (development)   nscmf_testing (automated tests)
```

- `docker/mysql/init/01-create-testing-database.sql` creates `nscmf_testing` **only on first volume
  initialization**. If the volume is recreated, the file runs again. A `.sh` variant was tried first and failed
  inside the container (`bad interpreter: Permission denied`), so it is intentionally a `.sql` file with the
  default database and user names hard-coded.
- The owner's pre-existing container `mysql_container` (MySQL **8.0**) was **stopped, not deleted**, with the
  owner's approval. Restarting it will conflict with port 3306.
- `.env` exists locally (gitignored) with a generated `APP_KEY` and a random `DB_PASSWORD`.
- The development database `nscmf` already has the three Laravel framework migrations applied
  (`users`/`password_reset_tokens`/`sessions`, `cache`, `jobs`).

---

## 4. Verification actually performed (2026-09-15/16, local machine)

All of the following passed on the final commit state:

| Gate                                  | Command                             | Result                       |
| ------------------------------------- | ----------------------------------- | ---------------------------- |
| PHP formatting                        | `vendor/bin/pint --test`            | pass                         |
| PHP static analysis                   | `vendor/bin/phpstan analyse`        | 0 errors at level max        |
| PHP tests + coverage                  | `vendor/bin/pest --coverage --min=80` | 15 tests pass, 100% lines  |
| ESLint                                | `npx eslint .`                      | pass                         |
| Prettier                              | `npx prettier --check .`            | pass                         |
| TypeScript                            | `npx vue-tsc --noEmit`              | pass                         |
| Frontend tests + coverage             | `npx vitest run --coverage`         | 9 tests pass, 100% lines     |
| Production build                      | `npm run build`                     | pass                         |
| Browser journey                       | `npx playwright test`               | 1 test pass (Chromium)       |

**Not verified:** the GitHub Actions workflow has never executed, because nothing has been pushed. Treat CI as
unproven until a run is green on GitHub.

TDD evidence for T04: commit `6ba8a61` contains the failing tests (9 failures, each caused by a framework default
such as `UTC`, `lifetime 120`, `after_commit false`, missing private disks, MySQL session timezone `SYSTEM`);
commit `c6cefce` makes them pass. Phase 0 tasks T00–T03 used the greenfield harness exception from
`15_Coding_Rules_AGENTS.md` §13 and have no RED commit, which is allowed because they add no business behaviour.

---

## 5. Decisions taken during bootstrap

Approved explicitly by the project owner:

1. Create a new MySQL 8.4 container and stop (not delete) the existing MySQL 8.0 one.
2. Connect the local folder to `github.com/rezkym/nscmf_velo`; push and PR are done by the owner.
3. Add four dependencies that the specifications do not list: `jsdom` (DOM for Vue component tests),
   `@vitest/coverage-v8` (required by the 80% frontend coverage gate in `16` §20), `pcov` (PHP coverage on the
   local machine), and `concurrently` (already part of the Laravel skeleton, used by `composer dev`).
4. Scope of this work: Phase 0 plus T04.

Taken by the agent, with the reason recorded in the commit or the file itself:

5. `@lucide/vue` replaces `lucide-vue-next`, which npm marks deprecated in favour of it. `07` names
   "Lucide / lucide-vue-next"; this is the same library under its maintained package name.
6. shadcn-vue was configured manually (`components.json`, `resources/js/lib/utils.ts`, CSS tokens fetched from the
   official registry). The CLI `init` requires choosing a web font, which would add an unapproved font package.
   The UI therefore uses the system font stack, and `--font-sans` is the only place to change that later.
7. Brand palette from `07` §7 is mapped onto the shadcn neutral tokens: `--primary` is `#1B2CC1` in light mode and
   `#7692FF` in dark mode.
8. The skeleton's `public` and `s3` filesystem disks and the `storage:link` entry were removed: the MVP keeps every
   binary private and does not use object storage (`08` §42, `10` §60). This also removed a PHPStan error.
9. `session.lifetime` is hard-coded to `30` instead of reading `SESSION_LIFETIME`, and `SESSION_LIFETIME` was left
   out of `.env.example`, because `14` §7.1/§119 forbids exposing locked policy values as environment toggles.
   A test asserts that an environment variable cannot change it.
10. Inertia SSR is disabled (`config/inertia.php`) per `08` §21, and Inertia page components live in
    `resources/js/Pages` per `13` §71 (the package default is lowercase `pages`).
11. `composer.json` is listed in `.prettierignore` because Composer rewrites that file in its own style.
12. The Laravel skeleton ships its own `AGENTS.md` and `CLAUDE.md` (Laravel Boost bootstrap instructions). Both were
    excluded; the project's own files are untouched, and Laravel Boost was not installed.

---

## 6. Things the next agent must know before touching code

1. **`users` table and `App\Models\User` are still Laravel defaults** (`name`, `email`, `email_verified_at`,
   `password`, `remember_token`). They do **not** match `11` §9. T05-1 replaces them. Two tests in
   `tests/Feature/Auth/UserModelTest.php` describe only the framework's hashing/serialization behaviour and will
   need rewriting together with the model.
2. **Migrations are not shared history yet.** Nothing is pushed, so the three framework migrations may still be
   edited in place while designing T05. Once the branch is pushed and merged, `15` §42 applies and only forward
   migrations are allowed. The local `nscmf` database already has them applied; recreating the local development
   database is the developer's call, and `nscmf_testing` is rebuilt by the test suite anyway.
3. **Tests refuse any database whose name does not end in `_testing`.** The guard is in `tests/TestCase.php`
   (`createApplication()`); `phpunit.xml` points tests at `nscmf_testing` on MySQL 8.4, with database session,
   cache, and queue so tests exercise the real drivers.
4. **Playwright runs `php artisan serve` on port 8010 against the `.env` database**, not the test database, and it
   needs built assets. Run `npm run build` before `npm run test:e2e`. Retries are set to `0` on purpose
   (`16` §83): a failing browser test stays failing.
5. **Frontend coverage currently covers 4 files** (`app.ts`, `lib/inertia.ts`, `lib/utils.ts`, `Pages/Welcome.vue`).
   The 80% line threshold is enforced in `vitest.config.ts`; do not widen `coverage.exclude` to keep it green.
6. **PHPStan runs at level max over `app`, `bootstrap/app.php`, `config`, `database`, `routes`, `tests`** with no
   baseline. Pest tests use `Pest\Laravel\get()` style function helpers rather than `$this`, because PHPStan cannot
   type `$this` inside Pest closures; arch tests use the closure form `arch('...', function () { expect(...) })`
   for the same reason. Keep that style so the analysis stays clean without suppressions.
7. **`env()` is forbidden in `app/`** and an architecture test enforces it. Read configuration through `config()`.
8. **Not installed on purpose:** ClamAV (Phase 6), LibreOffice Headless and the PDF signing identity (Phase 8),
   the official XLSX template (Phase 7). Redis is installed nowhere and must stay unused.
9. **Unresolved detail deliberately left open:** whether the "20 MB" attachment/validator limit means
   20,000,000 bytes or 20 × 1024 × 1024. It is not needed before Phase 6 and must not be guessed silently; the
   5 MiB chunk size is unambiguous and already documented as `5,242,880` bytes in `12` §54.

---

## 7. Next task

`19_Task_Implementation_Plan.md` → **T05, subtasks T05-1 … T05-14**, one Pull Request per subtask, each with its
MySQL 8.4 schema test. `T05-1` (`teams`, `users`) is first; `T05A` (domain enums), `T05B` (repository contracts and
architecture tests), and `T05C` (application shell and error conventions) follow inside Phase 1.

Mandatory process for every behavioural change (`15` §11, `16` §6-§11, `18`):

```text
read the authorities → write the test first → prove a meaningful RED → commit the RED test
→ minimum implementation → GREEN → commit → run the relevant regression gates → human review → human merge
```

The agent may open and update a Pull Request but must never approve or merge its own implementation PR.

---

## 8. Command reference

```bash
# One-time setup on a fresh machine
composer install && npm ci
cp .env.example .env            # then set DB_PASSWORD
php artisan key:generate
docker compose up -d            # MySQL 8.4 (nscmf, nscmf_testing)
php artisan migrate
npx playwright install chromium

# Daily
composer dev                    # serve + queue worker + logs + Vite

# Gates (same as CI)
composer lint && composer analyse && composer test:coverage
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage
npm run build && npm run test:e2e
```

## 9. Authorities

Read these, not this file, for any rule: `AGENTS.md`, `SOUL.md`, and `project_doc/01` … `project_doc/20`
including the synchronization addenda `11A`, `12A`, `19A`. Where this handoff and a `project_doc` file disagree,
`project_doc` wins and this file is wrong.
