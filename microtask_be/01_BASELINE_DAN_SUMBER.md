# Baseline dan sumber

Tanggal inspeksi 2026-09-22, Asia/Jakarta. Base repository `main`/HEAD `8f365a8`, working tree awal bersih. Pekerjaan dokumen berada pada branch `docs/backend-microtasks`. Inspeksi read-only source/history, bukan menjalankan aplikasi/business tests atau CI.

| Concern                  | Bukti file/Git                                                                                                         | Implikasi backlog                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Laravel/PHP              | `composer.json`, lockfile, bootstrap; PHP ^8.5, Laravel ^13.17, Inertia PHP ^3.3                                       | T00 rekonsiliasi, bukan regenerate                                                                                |
| Frontend                 | Vue ^3.5, Inertia Vue ^3.7, strict TS, Tailwind4/Vite8/Node24 baseline                                                 | T01 rekonsiliasi; dependensi yang ada bukan usulan baru                                                           |
| Test/coverage            | Pest4/Larastan/Pint; `@vitest/coverage-v8` sudah ada; `vitest.config.ts`                                               | Tidak mencatat provider coverage sebagai belum ada; hasil run saat ini NOT RUN                                    |
| CI                       | `.github/workflows/ci.yml` backend/frontend/browser                                                                    | Job tersedia bukan bukti CI passing; real integration baru sesuai capability                                      |
| Backend bisnis           | `routes/web.php` hanya GET `/`; `/up` framework health; middleware share kosong; app memiliki Controller/User/Provider | Login/Dashboard/NSCMF/admin/export bukan route live; jangan klaim integrasi FE                                    |
| Database                 | Tiga migration shared users/sessions, cache, jobs                                                                      | Immutable; schema business melalui forward migrations                                                             |
| Private disks            | `config/filesystems.php` sudah punya nscmf_private/nscmf_runtime_tmp; public links kosong                              | Adapter/storage security capability belum otomatis selesai                                                        |
| MySQL                    | compose menyebut MySQL8.4; rencana awal melaporkan container berjalan                                                  | Connectivity/runtime tidak diuji ulang saat penyusunan; task MySQL wajib evidence nyata                           |
| ClamAV                   | Tidak ada capability scanner dalam app/config/dependency/compose                                                       | Provision private Docker clamd Phase6; bukan blocker awal                                                         |
| Workbook/renderer/signer | Pencarian repository termasuk ignored paths tidak menemukan official workbook/mapping; no actual integration           | Gate real binary/mapping/qualification/signing tetap terbuka                                                      |
| Browser                  | Playwright menjalankan artisan serve biasa; smoke Welcome saja                                                         | Pest *_testing guard tidak melindungi browser; guard khusus sebelum mutation                                      |
| FE-01–30                 | Kode dan Vitest ada; `microtask_fe/README.md` masih menyebut PLANNED                                                   | Status dokumen FE stale; isi actual code/handoff lebih kuat untuk existence, belum Feature Done                   |
| Draft edit               | Sections+useDraftSave+SubmitPanel tersedia, `Pages/Nscmf/Edit.vue` belum ada                                           | FE-27 owns composition; BE connects read/write contract                                                           |
| Wire mismatch            | Draft composable dan ChangeResults.vue memanggil router.patch Inertia                                                  | JSON endpoint resmi perlu perubahan transport dan actual E2E                                                      |
| One-time response        | UserManager membaca flash temporary_password                                                                           | Server plaintext tidak boleh tersimpan session/flash/cache/history; explicit transient channel dan no-store proof |

## Riwayat relevan

- `26efc7a`: merge FE-01–10.
- `882af2b`: FE-11–25 merge/cleanup.
- `e3c2e25`: merge FE-26–30 setelah review dan silent-bug audit.
- `fcce9ed`: catatan audit mutation-proved; `f2be045`: catatan review FE-26–30.
- `f1e7124`: menghapus working notes FE-26–30 yang telah superseded.
- `8f365a8`: ignore tool directories, base paket ini.

Baca [handoff](../handoff/README.md), [bootstrap](../handoff/2026-09-16-phase-0-bootstrap.md), [review FE](../handoff/06_fe_26_30_review.md), [audit FE](../handoff/07_fe_26_30_silent_bug_audit.md). Pernyataan lama FE-26–30 belum dimulai telah dilewati source/history. “realwire” Vitest masih memakai test double, bukan server HTTP.

`microtask_fe` ada lokal dan di-ignore Git. Paket ini menyertakan pemetaan FE agar kepemilikan dapat dibaca tanpa mengandalkan folder itu pada clone lain; tidak mengubah `.gitignore`/dokumen FE. Semua rujukan otoritatif menuju `project_doc` tracked.

## Otoritas dan hash sumber

[AGENTS](../AGENTS.md) merupakan entrypoint; [SOUL](../SOUL.md) mengatur cara bekerja, bukan expected behavior. Dokumen berikut dibaca/inventarisasi sesuai concern; addenda hanya mengendalikan concern yang disinkronkan. `14A`/`15A` historical, material rules sekarang di15/16. `19A`/`20` menghapus kebutuhan infrastruktur enterprise dari current MVP. Hash memungkinkan deteksi sumber berubah sebelum task mulai.

| Source                                                                                                                          | Peran                                           | SHA-256 saat inventaris                                            |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| [01_PRD.md](../project_doc/01_PRD.md)                                                                                           | Approved authority / synchronization by concern | `203ecabfc195bb00c2583199da662ccdeab4d542e42d3365d73cb496df4fdff7` |
| [02_Business_Rules.md](../project_doc/02_Business_Rules.md)                                                                     | Approved authority / synchronization by concern | `ddc8fb3aa64bee8de14ef72de5fdf39b7cda1e51b76f1c77ffef3296936659c5` |
| [03_User_Flow.md](../project_doc/03_User_Flow.md)                                                                               | Approved authority / synchronization by concern | `48a0fee87611c5226f20d66a1bd4d874d09677569e03cd6953dcf0bc0c871155` |
| [04_RBAC_Permission_Matrix.md](../project_doc/04_RBAC_Permission_Matrix.md)                                                     | Approved authority / synchronization by concern | `39ce8b4f38bdd8d9598e888360882afe2b45d77dbc11f913a30fbacd10e98488` |
| [05_State_Status_Flow.md](../project_doc/05_State_Status_Flow.md)                                                               | Approved authority / synchronization by concern | `d75d4c8e0ef1ca95a83882b00a9fb4c1725e54002750f02b79ddf3efcf5e219f` |
| [06_Validation_Rules.md](../project_doc/06_Validation_Rules.md)                                                                 | Approved authority / synchronization by concern | `4c5c113da5af3d58b2551c092d24da1502207b2d3525bd70466c1c13fd37c367` |
| [07_UI_UX_Specification.md](../project_doc/07_UI_UX_Specification.md)                                                           | Approved authority / synchronization by concern | `9ead745e0cb7fc8edd80caad2d19309632596b8164f073d40d3141d6dbfcaad3` |
| [08_Tech_Stack_Specification.md](../project_doc/08_Tech_Stack_Specification.md)                                                 | Approved authority / synchronization by concern | `d22953356f53ada0daaec64e7f21d7552f0671527ea8954f3fc2e81f886cbf28` |
| [09_System_Architecture.md](../project_doc/09_System_Architecture.md)                                                           | Approved authority / synchronization by concern | `4c3db41bc16677820d832fb1841c0ce90eecffe9084a54ac8c0a0a404fd855b8` |
| [10_Security_Rules.md](../project_doc/10_Security_Rules.md)                                                                     | Approved authority / synchronization by concern | `e925bd8eeb48eafbf116c7098a78ff90ba2674ad71a49858ec54b22f9b99ca3c` |
| [11A_Resumable_Attachment_Upload_Synchronization.md](../project_doc/11A_Resumable_Attachment_Upload_Synchronization.md)         | Approved authority / synchronization by concern | `3abc397644bda36d74f93b47245a14439ca3c29f06432e03b104f6b2c41b93f8` |
| [11_ERD_Database_Schema.md](../project_doc/11_ERD_Database_Schema.md)                                                           | Approved authority / synchronization by concern | `5a3fcf27fea9c4314f83a1be70347964d294b18fa00f1e91cef26a7b613d40ea` |
| [12A_Repository_Service_Architecture_Synchronization.md](../project_doc/12A_Repository_Service_Architecture_Synchronization.md) | Approved authority / synchronization by concern | `4a588303b9d0eb12df901a3889768bd7de46e1e49ef26da36f2a8999a38d3dbd` |
| [12_API_Contract.md](../project_doc/12_API_Contract.md)                                                                         | Approved authority / synchronization by concern | `857d0fed581eccf0c5a9172f8783a14e1f5980570f044c856687af1344647d0b` |
| [13_Project_Structure.md](../project_doc/13_Project_Structure.md)                                                               | Approved authority / synchronization by concern | `3a9a27e4b88e4c9c6f62165282aece1b78f40c10a83a1060ec223fce1d9e565d` |
| [14A_Pre_Coding_Rules_Synchronization.md](../project_doc/14A_Pre_Coding_Rules_Synchronization.md)                               | Historical synchronization                      | `86ceb27ea8739c3d28835eb24ed3206f87221ee12dc6c73a2103be8b50a8a0a7` |
| [14_Environment_Specification.md](../project_doc/14_Environment_Specification.md)                                               | Approved authority / synchronization by concern | `a65a26ee0d73fed43a7e7462166bcbe139a8181adcaeb169904dbaa9b871e01f` |
| [15A_Pre_Testing_Specification_Synchronization.md](../project_doc/15A_Pre_Testing_Specification_Synchronization.md)             | Historical synchronization                      | `ad977371000781b0abddc2080d3d91e5981afeccf79d4ace085c705cd61fc0cc` |
| [15_Coding_Rules_AGENTS.md](../project_doc/15_Coding_Rules_AGENTS.md)                                                           | Approved authority / synchronization by concern | `ba43fa5a80c2c459fe0c7c83001f193eda1af9a70a0c3e35710bba58f7024df8` |
| [16_Testing_Specification.md](../project_doc/16_Testing_Specification.md)                                                       | Approved authority / synchronization by concern | `9f6938f4a510923369a14e9815d3dca160aeef5ee6afcbdab2205ed005f48a6a` |
| [17_Seed_Dummy_Data_Specification.md](../project_doc/17_Seed_Dummy_Data_Specification.md)                                       | Approved authority / synchronization by concern | `cdf4ae233ed30483feaa438e2045d3b17f8ca0b659ae44dc9be274373660b332` |
| [18_Definition_of_Done.md](../project_doc/18_Definition_of_Done.md)                                                             | Approved authority / synchronization by concern | `902c979c52673b2081a7b405b13adcdb7273c5e42d74fb3384ead3a8750d3a92` |
| [19A_Local_First_MVP_Synchronization.md](../project_doc/19A_Local_First_MVP_Synchronization.md)                                 | Approved authority / synchronization by concern | `545fdb59908a4b33ab9d52f7bc6476a2a3d0adea757aa3d86f15f569f9900d25` |
| [19_Task_Implementation_Plan.md](../project_doc/19_Task_Implementation_Plan.md)                                                 | Approved authority / synchronization by concern | `a4b5b203fa9824410e601b364bba90c56304017da51f6dec8a639fe687f3d7f4` |
| [20_Deployment_Architecture.md](../project_doc/20_Deployment_Architecture.md)                                                   | Approved authority / synchronization by concern | `2c1559e1c16f8a8fa24172da3f36777e2967e1808faee7966e5daab1b943929f` |
