# NSCMF Digital Form & Workflow System

Internal Laravel 13 / Vue 3 application that replaces the Excel-based NSCMF Form 3.0 process.

- Specifications (authoritative): [`project_doc/`](project_doc/)
- Operational rules for developers and coding agents: [`AGENTS.md`](AGENTS.md)
- Implementation order: [`project_doc/19_Task_Implementation_Plan.md`](project_doc/19_Task_Implementation_Plan.md)

This README only explains how to run the project locally. It does not define product rules.

## Requirements

| Tool         | Version                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| PHP          | 8.5 with `pdo_mysql`, `mbstring`, `intl`, `zip`, `fileinfo`, `dom`, `curl` |
| PHP coverage | `pcov` extension (for local coverage reports)                            |
| Composer     | 2.x                                                                      |
| Node.js      | 24 LTS with npm                                                          |
| Docker       | Runs the local MySQL 8.4 database only                                   |

The application runs natively. Docker is used only for local infrastructure (MySQL 8.4 now, ClamAV from Phase 6).
Redis is not used: session, cache, and queue are database-backed.

## First-time setup

```bash
composer install
npm ci

cp .env.example .env
# Set DB_PASSWORD in .env to any local password, then:
php artisan key:generate

docker compose up -d          # MySQL 8.4 with databases nscmf and nscmf_testing
php artisan migrate

npx playwright install chromium
```

`docker/mysql/init/` creates `nscmf_testing` only when the MySQL volume is first created.

## Daily development

```bash
composer dev                  # Laravel server, queue worker, logs, and Vite together
```

Or run them separately with `php artisan serve` and `npm run dev`.

## Quality gates

The same gates run in GitHub Actions (`.github/workflows/ci.yml`).

| Check                            | Command                  |
| -------------------------------- | ------------------------ |
| PHP formatting (Pint)            | `composer lint`          |
| PHP static analysis (level max)  | `composer analyse`       |
| PHP tests (Pest, MySQL 8.4)      | `composer test`          |
| PHP tests with 80% coverage      | `composer test:coverage` |
| ESLint                           | `npm run lint`           |
| Prettier                         | `npm run format:check`   |
| TypeScript strict (vue-tsc)      | `npm run typecheck`      |
| Frontend tests (Vitest)          | `npm test`               |
| Frontend tests with 80% coverage | `npm run test:coverage`  |
| Browser tests (Playwright)       | `npm run test:e2e`       |

PHP tests always use the disposable `nscmf_testing` database and refuse to run against any other database.
Browser tests start `php artisan serve` on port 8010 against the database in `.env`, so build assets first with `npm run build`.

## Not installed yet

These are required later and are intentionally not part of the initial setup:

- ClamAV (`clamd`) for attachment malware scanning, added in Phase 6.
- LibreOffice Headless (PDF renderer candidate) and the Organization PDF signing identity, added in Phase 8.
