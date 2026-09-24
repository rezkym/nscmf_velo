# Aturan eksekusi bersama

Backlog turunan; [15](../project_doc/15_Coding_Rules_AGENTS.md), [16](../project_doc/16_Testing_Specification.md), [18](../project_doc/18_Definition_of_Done.md), [19](../project_doc/19_Task_Implementation_Plan.md), [19A](../project_doc/19A_Local_First_MVP_Synchronization.md), [20](../project_doc/20_Deployment_Architecture.md) tetap authority. File rencana tidak mengesahkan route, schema, dependency atau keputusan produk baru.

## TDD-01

Sebelum coding baca source task, current code/tests/migrations/config/Git. Status PLANNED berarti belum dikerjakan oleh backlog ini. NEW behavior: requirement → test AC dengan expected externally observable response/state/audit → meaningful RED → commit RED test → minimum code → GREEN → implementation commit → regression. Setup broken/import error bukan RED. Jangan rewrite history, mengurangi assertion, skip required failure, fake provider sebagai proof, atau menambah test-only bypass. Behavior-preserving refactor memakai existing GREEN tanpa artificial RED. Rekonsiliasi bootstrap yang sudah ada tidak mengulang chronology; catat bukti historis terpisah.

Pembuatan dokumen ini tidak menulis kode aplikasi/test. Saat implementasi tiap task, susun test konkret pada target path dengan AC per requirement; arrays of cases harus eksplisit. Decision-only/release-evidence tasks memakai review/artefak nyata, bukan test yang hanya mencari kata “Done”.

## Gate-01 — keputusan dan pemeriksaan evidence

Task DECISION / QUALIFICATION mengumpulkan artefak yang disebut AC, mencatat pilihan konkret beserta dampaknya, lalu memperoleh keputusan pemilik di register gap atau hasil qualification nyata. Simpan approval/measurement dan fixture atau golden yang disetujui; perubahan authority tetap memerlukan approval tersendiri. Perubahan perilaku sesudah gate mengikuti TDD-01.

Task EVIDENCE / REVIEW mengikat evaluasi ke candidate SHA/environment, memeriksa seluruh AC dan gate scope, serta menjalankan ulang verifikasi kapabilitas jika bukti lama tidak berlaku. Evidence yang belum tersedia tetap NOT RUN. Lengkapi review manusia menurut tingkat DoD; jangan membuat test yang sekadar mencari tulisan “Done”.

## Architecture-01

Controller/Form Request → Service → Repository Contracts + Domain Rules + Infrastructure Contracts → Eloquent/adapter. Controller HTTP adapter tipis; Form Request validated/safe allowlist, unknown keys ditolak. Service owns orchestration/transaction, tanpa query bisnis Eloquent/Query Builder atau Request object normal. Repository query/locking/pagination, tanpa permission/state decision. Jobs/Commands call Services. Model relationship/cast sederhana, tidak orchestration. Tidak Actions/DTO/BaseRepository/generic CRUD/God Service. Istilah DTO di12 adalah transport, bukan PHP DTO architecture. Tambahkan interface ketika ada capability nyata, bukan boilerplate per tabel.

## Data-01

Shared/applied tiga migration awal immutable. Seluruh schema business menggunakan forward migration dengan MySQL8.4 type/null/FK/unique/index/CHECK tests; package migration Spatie mengikuti installed8.x. T05 tetap14 slices sequential. No EAV/generic business JSON; immutable export snapshot JSON hanya sesuai11. Invariant “satu current iteration/singleton” tidak otomatis berarti kolom/index baru yang tidak ada authority.

Draft scalar omitted→unchanged, nullable null→clear; collection omitted→unchanged, supplied array→whole-set replacement, []→clear. Duplicate natural keys/unknown keys/row DB id→422. Selection IWO/NOC15 tetap terpilih walau description null; row-only natural key discarded; empty site{} invalid, null clears. Draft incomplete berbeda dengan Submit/Forward gate. Numeric zero bukan null; booleans false bukan absent.

## Mutation-01

Client `record_version` expected server version, bukan HTTP expected_version baru. Service authorize → short transaction → repository lock/read current state/version → validate → mutate aggregate → one version increment + required Business Audit → commit. Stale→409 NSCMF_VERSION_CONFLICT tanpa data/child/audit success. Audit/child failure rollback seluruh mutation. Jangan long ClamAV/render/sign/file I/O under lock. Post-commit queue hanya setelah successful commit. Concurrency separate MySQL connections/processes, target allowed outcomes independent scheduling. Workflow tidak auto retry; chunk identical replay adalah kontrak idempotency tersendiri, bukan universal key.

## Security-01

Permission-centric, shared Review/Approver pools, Team metadata only, ownership where required. Spatie web/Teams=false/wildcards=false. No universal Superadmin bypass, no mandatory SoD, Emergency ikut workflow. Tujuh business states persis; archive/upload/export/security terpisah. Password min6 tanpa composition/expiry/MFA; idle30m/absolute8h/max2/third login revoke oldest; sensitive proof15m. Session/CSRF server authority; allowed_actions hanya UI hint. Private secrets/file locators/hash credentials tidak masuk props/error/log/fixtures.

One-time temporary password generated server-side in memory, hash persistence, reveal setelah commit hanya immediate acting-admin context, no-store. Tidak session/flash/DB/cache/browser history/localStorage/log/response body diagnostic. Lost reveal→new authorized reset; no retrieval. Access-changing mutations revoke affected sessions; Team-only change tidak revoke. Required human security review untuk kategori18 §17; agent tidak self-certify.

## Capability-01

Attachment optional/max10/max20MB dengan exact byte gate G06; 5MiB=5,242,880/index1; newly accepted progress memperbarui24h, duplicate tidak. Durable write+metadata sebelum acknowledge; final server SHA/whole-file real ClamAV CLEAN sebelum usability. INFECTED/timeout/unavailable/error fail closed. Transport COMPLETED bukan CLEAN.

Workbook immutable/versioned/private; targeted OOXML menjaga VML/controls/relationships/unrelated members. Real template/mapping dahulu; immutable snapshot/version/iteration/template; worker tidak reread live data. READY retention168h binary only, metadata/issuance/audits tetap. LibreOffice first candidate wajib qualification, tidak HTML fallback/alternate tanpa keputusan. Approved PDF mandatory Organization crypto; human Approved By berbeda; failure→FAILED export, record tetap APPROVED, tidak unsigned fallback. Historical public certificates/issuance retained; private key nonprod di test/CI. Public only validator no-login, minimal disclosure; whole-file CLEAN+signature+exact uploaded hash+issuance+currentness.

Authoritative Business/Access/Security Audits tidak age purge. Technical Logs separate typed ON/30/DAY missing-only default, positive DAY/MONTH/no fixed max, OFF preserves values; scheduler menerapkan calendar Jakarta tanpa menghapus source/history/issuance atau auto-advance workflow.

## Runtime-01

Native PHP8.5/Laravel13/Composer/Node24/Vue/Vite primary; MySQL8.4 Docker; private storage; native worker/scheduler when capability needs. Database session/cache/queue; no Redis. Private Docker clamd baru Phase6, LO/signing Phase8. Docker compatibility secondary, future one native Linux server; server detail hanya saat host nyata. CI mandatory simple, automated CD di luar scope. HA/load-balancer/DR/RPO/RTO/backup architecture/app SLA/load targets/Kubernetes/multi-server/observability selection bukan gap atau blocker. Business Specific Requirements (SLA), Performance Information, Target KPI tetap disimpan.

## V-01

Perintah berikut rencana implementasi mendatang, bukan telah dijalankan untuk backlog. Jalankan setelah guard disposable menyatakan APP_ENV testing + identity database/host isolated + storage khusus, bukan sekadar suffix. Playwright server harus punya guard sendiri; jangan `composer setup` atau migrate/reset development DB sebagai jalan pintas.

```bash
vendor/bin/pint --test
vendor/bin/phpstan analyse --memory-limit=1G --no-progress
vendor/bin/pest --coverage --min=80
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
npx playwright test --project=chromium
```

Target test per task tersedia dalam dokumennya; regression capability test directories di16. PHP/FE coverage masing-masing>=80%; PHPStan max zero baseline, TS strict. MySQL/ClamAV/private filesystem/DB queue/renderer/signature tidak cukup mock. Required FAIL tetap FAIL tanpa retry-as-pass/continue-on-error. Local check bukan CI PASS; CI SHA/run/evidence terpisah. Documentation-only boleh omit app runtime suites menurut16 §92 jika diff benar-benar hanya dokumen.

## Git, scope dan DoD

Scoped branch→Conventional Commit→PR→CI/review→human final merge. No AI coauthor/generated-by metadata; signing hanya jika Git melaporkan. Tidak self-approve/merge. New dependency belum approved harus persetujuan user; no unrelated lockfile churn. Destructive operation membutuhkan explicit approval; disposable test exception hanya target yang terbukti isolated. Human review bukan alasan berhenti menyusun hasil konkret; untuk implementasi mendatang status Done tetap menunggu gate18 yang berlaku. Task Done ≠ Feature Done ≠ Release/Production-Ready; staging required untuk release claim, bukan setiap local task.
