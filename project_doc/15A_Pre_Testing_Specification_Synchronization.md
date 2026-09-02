# Pre-Testing-Specification Cross-Document Synchronization Addendum

## NSCMF Digital Form & Workflow System

> **Document Type:** Historical Synchronization Addendum — not a fixed-order project deliverable  
> **Applies To:** implementation/testing interpretation of `08_Tech_Stack_Specification.md`, `13_Project_Structure.md`, `14_Environment_Specification.md`, `15_Coding_Rules_AGENTS.md`, and repository-root `AGENTS.md` before `16` existed  
> **Repository:** `rezkym/nscmf_velo`  
> **Decision Date:** 2026-09-01 through 2026-09-02  
> **Status:** Historical / Integrated into `16_Testing_Specification.md`  
> **Current Testing Authority:** `16_Testing_Specification.md`  
> **Next Fixed-Order Document:** `17_Seed_Dummy_Data_Specification.md` — MUST NOT be created until explicit user instruction

---

## 1. Purpose

Dokumen ini merekam keputusan testing/CI yang dikonfirmasi user setelah `15_Coding_Rules_AGENTS.md` selesai tetapi sebelum `16_Testing_Specification.md` dibuat.

Keputusan di addendum ini sekarang telah diintegrasikan secara authoritative dan lebih lengkap ke:

**`16_Testing_Specification.md`**

Karena itu, dokumen ini dipertahankan sebagai historical synchronization record agar asal keputusan tetap jelas, tetapi **tidak lagi menjadi testing authority utama**.

Jika terdapat perbedaan wording antara addendum ini dan `16`, gunakan `16` untuk testing behavior saat ini.

---

# PART A — DECISIONS THAT WERE LOCKED BEFORE `16`

## 2. TDD / RED Commit

Sebelum `16` dibuat, user telah mengunci:

```text
approved requirement
→ write test first
→ meaningful RED
→ commit RED test
→ minimum production implementation
→ GREEN
→ implementation commit
→ relevant regression suite
```

Feature, bug fix, atau behavior change yang memerlukan RED harus memiliki requirement-derived RED test commit sebelum production implementation commit.

Pure behavior-preserving refactor tidak memerlukan artificial RED ketika existing GREEN tests sudah memadai.

`16` sekarang menjadi authority lengkap untuk detail TDD evidence dan testing workflow.

## 3. Coverage

Locked decision:

```text
minimum global line coverage = 80%
```

Coverage percentage bukan pengganti meaningful behavioral testing dan tidak boleh digame dengan assertion kosong, exclusion berlebihan, atau test yang hanya mengeksekusi line tanpa membuktikan behavior.

`16` sekarang menentukan interpretation dan scope coverage secara authoritative.

## 4. Pull Request Gates

Locked baseline sebelum `16`:

```text
Laravel Pint check
PHPStan/Larastan level max
Pest backend tests
80% minimum line coverage
ESLint
Prettier check
vue-tsc / TypeScript strict
Vitest frontend tests
MySQL 8.4 integration
Playwright Chromium critical journeys
```

Required gate tidak boleh dinonaktifkan/downgrade hanya agar PR menjadi hijau.

`16` sekarang mengatur lengkap gate applicability dan testing matrix.

## 5. MySQL 8.4

Real MySQL 8.4 telah dikunci sebagai integration authority untuk database semantics.

SQLite hanya boleh dipakai pada isolated tests ketika MySQL-specific semantics tidak relevan dan tidak boleh menjadi satu-satunya bukti untuk schema, locking, concurrency, transaction, atau persistence behavior yang bergantung pada MySQL.

## 6. Real Infrastructure Integration

Keputusan yang dikunci sebelum `16`:

- real ClamAV integration mandatory;
- real cryptographic signing/verification menggunakan non-production identity mandatory;
- production signing key/passphrase tidak pernah masuk CI;
- real qualified renderer/golden integration mandatory setelah renderer resmi approved/qualified;
- mocks/fakes boleh untuk isolated tests tetapi tidak boleh menjadi satu-satunya bukti untuk real infrastructure contract;
- storage/queue/concurrency semantics memerlukan real integration ketika behavior tersebut sedang dibuktikan.

## 7. Playwright Browser Scope

Current MVP automated browser baseline telah dikunci sebagai:

```text
Chromium only
```

Firefox/WebKit bukan mandatory current MVP browser certification targets.

## 8. Flaky Test / Retry Policy

User mengunci:

```text
required test FAILS
→ gate remains FAIL
→ diagnose root cause
→ make intentional corrective change
→ run a fresh test/CI execution
```

Forbidden acceptance pattern:

```text
attempt 1 = FAIL
→ automatic retry
attempt 2 = PASS
→ treat overall result as accepted PASS
```

Flaky test harus terlihat dan diperbaiki akar masalahnya.

Automatic diagnostic collection seperti log, trace, screenshot, video, timing, atau failure dump tetap diperbolehkan dan tidak mengubah FAIL menjadi PASS.

`16` sekarang menjadi authority lengkap untuk retry/flaky-test policy.

---

# PART B — AUTHORITY AFTER `16`

## 9. Current Authority Chain

Testing authority sekarang:

```text
01–15 / relevant synchronization addenda
→ 16_Testing_Specification.md = detailed testing authority
→ root AGENTS.md = operational summary for coding agents
```

`15A` tidak boleh dipakai untuk mengalahkan atau melemahkan rule di `16`.

## 10. Upstream Documents

Keputusan testing yang direkam di sini tidak mengubah product/business/API/schema semantics pada:

```text
01_PRD.md
02_Business_Rules.md
03_User_Flow.md
04_RBAC_Permission_Matrix.md
05_State_Status_Flow.md
06_Validation_Rules.md
07_UI_UX_Specification.md
09_System_Architecture.md
10_Security_Rules.md
11_ERD_Database_Schema.md
11A_Resumable_Attachment_Upload_Synchronization.md
12_API_Contract.md
12A_Repository_Service_Architecture_Synchronization.md
```

`08`, `13`, `14`, dan `15` tetap menjadi authority untuk concern masing-masing; `16` mengatur bagaimana behavior dari dokumen-dokumen tersebut dibuktikan melalui testing.

---

# PART C — CURRENT HANDOFF

## 11. Testing Specification Status

`16_Testing_Specification.md` sekarang sudah dibuat dan menjadi authoritative testing specification.

Semua pre-`16` testing-policy decisions yang sebelumnya dicatat di `15A` telah diintegrasikan ke `16`.

## 12. Next Fixed-Order Document

Next fixed-order document:

**`17_Seed_Dummy_Data_Specification.md`**

It MUST NOT be created until the user explicitly instructs its creation.