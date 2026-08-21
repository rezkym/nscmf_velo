# User Flow Specification

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-UF-003  
> **Document Order:** 03 / 20  
> **Status:** Draft — Confirmed User Flows + Explicit TBDs  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `01_PRD.md`, `02_Business_Rules.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **apa yang dilakukan user dari awal sampai akhir** ketika menggunakan NSCMF Digital Form & Workflow System.

PRD menjawab *apa yang dibangun*. Business Rules menjawab *aturan apa yang tidak boleh dilanggar*. User Flow menjawab:

> **"User masuk dari mana, melakukan action apa, sistem merespons bagaimana, lalu user bergerak ke tahap mana berikutnya?"**

Dokumen ini tidak menetapkan permission matrix final atau nama state teknis final. Permission akan difinalisasi pada `04_RBAC_Permission_Matrix.md` dan lifecycle/state authoritative akan difinalisasi pada `05_State_Status_Flow.md`.

---

## 2. Actors

### 2.1 Protected Superadmin

Actor tertinggi yang:

- login menggunakan seeded protected account;
- menjalankan first-time setup;
- mengelola user/role/unit/scope;
- memiliki global NSCMF visibility;
- dapat Archive;
- dapat Reopen/Revert Approved record;
- tidak dapat dihapus, didisable, atau didowngrade melalui normal application flow.

### 2.2 Requester

Actor yang:

- membuat NSCMF;
- mengisi Draft;
- memilih numbering mode;
- menambahkan optional attachment;
- Submit;
- melakukan revision jika record dikembalikan;
- Cancel hanya selama Draft sebelum Submit;
- melihat own record;
- Export record yang dapat dilihat.

### 2.3 Reviewer

Actor yang:

- melihat Submitted record dalam Unit/Division scope;
- tidak perlu ditentukan oleh Requester;
- dapat menjadi salah satu dari beberapa Reviewer yang memproses record;
- Forward menuju Approval;
- Return for Revision;
- Reject.

### 2.4 Approver

Actor yang:

- melihat record dalam configured approval scope;
- dapat memiliki scope beberapa Unit/Division;
- Approve;
- Return to Reviewer;
- Return to Requester;
- Reject.

### 2.5 Authorized Reopen Actor

Untuk Rejected record dapat berupa highest role atau role/user yang diberi explicit permission sesuai RBAC.

Untuk Approved record, current business rule membatasi Reopen/Revert ke highest authority.

---

## 3. Flow Conventions

Dokumen menggunakan istilah semantic seperti `Draft`, `Submitted`, `Review`, `Rejected`, dan `Approved` untuk menjelaskan flow.

Nama state teknis dan transition matrix final belum authoritative sampai `05_State_Status_Flow.md` selesai.

### 3.1 Flow Result Types

- **Continue** — user tetap berada dalam workflow aktif.
- **Return** — record dikembalikan ke stage sebelumnya.
- **Terminal for normal flow** — normal actor tidak dapat melanjutkan record tanpa privileged action.
- **Administrative treatment** — tidak mengubah business facts, misalnya Archive.

---

# PART A — FIRST-TIME SETUP

## 4. UF-SETUP-001 — First Login Setup Wizard

### Trigger

Aplikasi baru selesai di-deploy/seed dan protected Superadmin pertama kali login ketika organization setup belum complete.

### Primary Flow

1. Superadmin membuka aplikasi.
2. Sistem menampilkan Login.
3. Superadmin berhasil login.
4. Sistem mendeteksi initial setup belum selesai.
5. Sistem mengarahkan Superadmin ke **Setup Wizard**.
6. Wizard menampilkan overview langkah konfigurasi.
7. Superadmin melanjutkan ke **Role Configuration**.
8. Superadmin memilih salah satu:
   - `Use Role Template`; atau
   - `Manual Role Configuration`.
9. Jika `Use Role Template`, sistem menyiapkan template minimum:
   - Superadmin;
   - Requester;
   - Reviewer;
   - Approver.
10. Jika `Manual`, Superadmin membuat/configure role sesuai kebutuhan tanpa dapat menghapus protected Superadmin invariant.
11. Wizard berlanjut ke **Unit / Division Setup**.
12. Superadmin memilih:
   - predefined Unit/Division template/mapping; atau
   - manual Unit/Division configuration.
13. Superadmin meninjau/mengubah hasil mapping jika diperlukan.
14. Wizard berlanjut ke **Scope Configuration**.
15. Superadmin menentukan Reviewer Unit/Division scope model.
16. Superadmin menentukan Approver scope.
17. Approver dapat diberikan lebih dari satu Unit/Division.
18. Sistem menampilkan **Review Setup**.
19. Superadmin memeriksa konfigurasi.
20. Superadmin memilih `Finish Setup`.
21. Sistem mencatat setup completion dan relevant administrative audit event.
22. Sistem mengarahkan Superadmin ke Dashboard.

### Alternate Flow A — Template Modified Before Finish

1. Superadmin memilih Role/Unit template.
2. Template dimuat.
3. Superadmin mengubah konfigurasi sebelum menyelesaikan wizard.
4. Sistem menggunakan hasil final configuration, bukan template original yang immutable.

### Alternate Flow B — Setup Later Configuration

Setelah setup selesai, authorized administrator tetap dapat mengubah normal role, Unit/Division, mapping, dan scope melalui Settings/Administration.

### Constraints

- Protected Superadmin tidak dapat dihapus/didisable/downgrade.
- Exact default Unit/Division template data masih TBD.
- Wizard tidak boleh menjadi cara melewati protected business invariants.

---

# PART B — AUTHENTICATION AND DASHBOARD

## 5. UF-AUTH-001 — Normal Login

1. User membuka aplikasi.
2. Sistem menampilkan Login.
3. User memasukkan credential.
4. Sistem melakukan authentication.
5. Jika valid, sistem membuat authenticated session.
6. Jika initial setup sudah complete, user diarahkan ke Dashboard.
7. Dashboard menampilkan action/navigation sesuai permission user.

### Failed Login

1. Authentication gagal.
2. User tetap berada di Login.
3. Sistem menampilkan error yang tidak membocorkan informasi sensitif.
4. Security-specific behavior seperti rate limit/lockout akan didefinisikan pada Security Rules.

## 6. UF-AUTH-002 — Logout

1. User memilih Logout.
2. Sistem mengakhiri authenticated session sesuai security implementation.
3. User diarahkan kembali ke Login.

---

## 7. UF-DASH-001 — Dashboard

### Primary Purpose

Dashboard adalah entry point sederhana, bukan analytics platform kompleks.

### Flow

1. User login.
2. Dashboard terbuka.
3. User dapat melihat action yang relevan, minimal:
   - `Create New Form` jika memiliki permission;
   - `History`;
   - administrative navigation jika memiliki permission.
4. User memilih salah satu tujuan.

### Branch A — Create New Form

`Dashboard → Create New Form → Form Family Selection`

### Branch B — History

`Dashboard → History → Record List`

### Branch C — Administration

`Dashboard → Administration/Settings` untuk authorized administrator.

Dashboard metrics/recent activity dapat ditambahkan kemudian tetapi tidak menjadi blocker User Flow inti.

---

# PART C — USER ADMINISTRATION

## 8. UF-ADMIN-001 — Create User

1. Authorized administrator membuka `Administration → Users`.
2. Sistem menampilkan user list.
3. Admin memilih `Create User`.
4. Admin mengisi data user yang diperlukan.
5. Admin memilih Unit/Division mapping jika relevan.
6. Admin assign satu atau lebih role.
7. Admin mengatur scope yang diperlukan sesuai role.
8. Admin menyimpan user.
9. Sistem melakukan validation.
10. Jika valid, user dibuat.
11. Sistem mencatat administrative audit event.

## 9. UF-ADMIN-002 — Edit User

Authorized administrator dapat:

1. membuka user detail;
2. edit profile yang diizinkan;
3. assign/remove normal role;
4. move/assign Unit/Division;
5. mengubah scope;
6. enable/disable normal user;
7. menjalankan credential/password-reset flow sesuai security specification;
8. Save;
9. sistem mencatat perubahan.

### Protected Superadmin Exception

Jika target adalah protected Superadmin, UI/API harus menolak action yang mencoba:

- delete;
- soft-delete;
- disable;
- downgrade;
- remove protected role.

---

# PART D — CREATE NEW NSCMF

## 10. UF-CREATE-001 — Start New Form

### Entry Point

`Dashboard → Create New Form`

### Flow

1. Requester memilih `Create New Form`.
2. Sistem menampilkan pilihan Form Family:
   - `NSCMF - Activation`;
   - `NSCMF - Change`.
3. Requester memilih family.
4. Sistem menampilkan subtype sesuai family.
5. Requester memilih subtype.
6. Sistem menampilkan pilihan `NSCMF Number Mode`:
   - Automatic;
   - Manual.
7. Jika Automatic:
   - sistem menyiapkan/generate number mengikuti numbering rule final;
   - format exact masih TBD.
8. Jika Manual:
   - user mengisi nomor;
   - validation format/uniqueness mengikuti Validation Rules final.
9. Sistem membuat Draft record ketika diperlukan untuk autosave/persistence.
10. Creator/requester identity dan timestamp tercatat.
11. User masuk ke Digital Form.

### Important Rule

Pilihan Auto/Manual muncul **setiap membuat form**, bukan hanya sebagai global setting.

---

## 11. UF-CREATE-002 — Activation Form Entry

### Selected Family

`NSCMF - Activation`

### Subtype Options

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### Primary Data Entry Journey

UI mengelompokkan source workbook menjadi logical sections seperti:

1. **Service Information**
   - Reference;
   - Customer Name;
   - Contact Name;
   - Existing/New Service;
   - Service ID;
   - Service Status;
   - Service Description;
   - Service Location;
   - Installation Date (RFS);
   - SLA / specific requirements.
2. **NOC Configuration**
   - LAN IP;
   - WAN IP;
   - Gateway;
   - POP;
   - Regional;
   - Preferred/Secondary Upstream;
   - Primary/Secondary Link to NOC;
   - bandwidth configuration;
   - priority destination;
   - DNS/domain/email/hosting/migration information.
3. **Onsite Configuration for Installation**
   - direct customer site information;
   - local loops;
   - BWA/antenna-related fields;
   - latency/link quality;
   - router/UTP/UPS/stabilizer;
   - POP/switch/port/VLAN/CPE information.
4. Optional attachments.

Exact required/conditional fields adalah tanggung jawab Validation Rules.

---

## 12. UF-CREATE-003 — Change Form Entry

### Selected Family

`NSCMF - Change`

### Subtype Options

- Maintenance;
- Upgrade;
- Emergency.

### Critical Workbook Mapping

Source Excel sudah dibaca ulang. Implementasi MUST membedakan **field input** dan **selectable choices** dengan benar.

### Section A — Purpose of Changes

1. User masuk ke `(A) Purpose of Changes`.
2. User mengisi **Facing Challenges (Upgrade / Emergency)** sebagai input/narrative content.
   - Ini **bukan** pilihan `Upgrade` atau `Emergency`.
3. User mengisi **Maintenance Purpose** sebagai input content.
4. User mengisi **Identified Problem (Please elaborate)** sebagai input/narrative content.
5. User masuk ke **Service Impact**.
6. Sistem menampilkan selectable options yang berasal dari workbook:
   - NOC15;
   - NOC23;
   - NOC361;
   - Regional;
   - POP;
   - Customer;
   - Other.
7. User memilih Service Impact sesuai business context.
8. Exact single-select vs multi-select akan difinalisasi pada Validation/UI specification.
9. User mengisi **Maintenance (Improvement) Plan**.
10. User mengisi **Target KPI**.
11. User mengisi **Target date of execution**.
12. User mengisi **Monitoring period**.
13. User mengisi **Rollback scenario**.
14. User mengisi **Maintenance Announcement** sesuai behavior UI final.
15. Source workbook menyediakan reference options:
   - 1 week before;
   - 2 weeks before;
   - 2 days before (emergency).
16. User dapat menambahkan attachment secara optional.

### Section B — Result of Changes

Source workbook memiliki:

- Result summary;
- Performance information;
- Status.

**TBD:** kapan tepatnya Section B wajib diisi dalam operational workflow belum dikonfirmasi. User Flow ini tidak mengarang bahwa Section B selalu wajib sebelum Submit/Review. Timing final harus dikunci pada Validation/User Flow refinement berikutnya.

---

## 13. UF-CREATE-004 — Upgrade Classification Guidance

Jika user memilih konteks `Upgrade`, aplikasi tidak boleh menebak form hanya dari kata Upgrade.

Flow pemilihan didasarkan pada business context:

- instalasi / provisioning → Activation;
- maintenance / perubahan existing service/environment → Change.

Jika user tidak yakin, UI dapat memberikan contextual help, tetapi automated classification tidak boleh menjadi business authority tanpa rule tambahan.

---

# PART E — DRAFT, AUTOSAVE, SAVE DRAFT, CANCEL

## 14. UF-DRAFT-001 — Autosave

### Trigger

Requester sedang mengedit Draft.

### Flow

1. User mengubah field.
2. UI menandai terdapat perubahan belum dipersist.
3. Autosave mechanism mencoba menyimpan perubahan berdasarkan behavior UI/technical spec final.
4. Jika save berhasil:
   - Draft diperbarui;
   - modified timestamp diperbarui;
   - actor dicatat;
   - changed field + old/new value dicatat pada audit.
5. UI menunjukkan save state yang sesuai.

### Failure

Jika autosave gagal, UI harus memberi indication bahwa perubahan belum aman tersimpan dan tidak boleh menampilkan seolah-olah save berhasil.

Exact retry/timing berada pada UI/Architecture specification.

---

## 15. UF-DRAFT-002 — Manual Save Draft

1. Requester mengisi sebagian form.
2. Requester memilih `Save Draft`.
3. Sistem menyimpan seluruh perubahan yang valid untuk draft persistence.
4. Draft boleh tetap incomplete.
5. Sistem mencatat change audit.
6. User dapat:
   - lanjut mengedit;
   - kembali ke Dashboard/History;
   - logout;
   - kembali lagi kemudian.

---

## 16. UF-DRAFT-003 — Resume Draft

1. Requester membuka History/Own Records.
2. Requester membuka own Draft.
3. Sistem memverifikasi ownership/permission.
4. Form terbuka dalam editable mode.
5. Requester melanjutkan pengisian.
6. Autosave dan Save Draft tetap aktif.

---

## 17. UF-DRAFT-004 — Cancel Draft

### Preconditions

- record masih Draft;
- belum pernah di-Submit untuk Review;
- requester memiliki ownership/permission.

### Flow

1. Requester memilih `Cancel Request`.
2. UI dapat meminta confirmation agar tidak accidental.
3. Mandatory cancel reason masih TBD.
4. Requester mengonfirmasi.
5. Sistem melakukan cancellation.
6. Cancel event dicatat.
7. Record tetap disimpan di History.
8. Record menjadi permanent Cancelled untuk normal business flow.
9. Record **tidak dapat Reopen**.
10. Jika user masih membutuhkan request, user harus membuat NSCMF baru.

### Forbidden Flow

Jika record sudah pernah Submit, normal `Cancel Request` tidak tersedia dan backend menolak direct cancellation request.

---

# PART F — SUBMIT

## 18. UF-SUBMIT-001 — Submit Draft for Review

### Preconditions

- requester memiliki permission;
- Draft memenuhi submission validation final;
- record tidak Cancelled/Archived/terminal.

### Flow

1. Requester memilih `Submit`.
2. Sistem menjalankan submission validation.
3. Jika gagal:
   - submission dibatalkan;
   - UI menunjukkan field/error yang harus diperbaiki;
   - record tetap Draft.
4. Jika berhasil:
   - sistem persist latest data;
   - submission event dicatat;
   - requester normal editing dikunci;
   - record masuk ke Review flow.
5. Requester **tidak memilih Reviewer tertentu**.
6. Record otomatis menjadi visible bagi semua Reviewer yang memiliki Unit/Division scope relevan.
7. Future notification hook MAY dipanggil, tetapi notification delivery bukan core priority saat ini.

---

# PART G — REVIEWER FLOW

## 19. UF-REVIEW-001 — Reviewer Opens Review Queue

1. Reviewer login.
2. Reviewer membuka area Review/History/Queue sesuai UI final.
3. Sistem mengambil record yang berada dalam Reviewer Unit/Division scope dan relevant workflow stage.
4. Reviewer melihat list.
5. Reviewer membuka salah satu record.
6. Sistem melakukan scope check server-side.
7. View event dicatat sebagai **viewer activity**.
8. Membuka record saja **tidak** menjadikan Reviewer exclusive owner.
9. Reviewer lain dalam scope tetap dapat melihat record.

---

## 20. UF-REVIEW-002 — Reviewer Performs Action

1. Reviewer membaca form, attachments, dan relevant history.
2. Reviewer dapat menjalankan salah satu action:
   - `Forward / Complete Review`;
   - `Return for Revision`;
   - `Reject`.
3. Reviewer yang melakukan action dicatat sebagai action actor.
4. Data model nanti dapat merepresentasikan actor sebagai assigned/current reviewer dan/atau modified-by context.
5. Assignment/context tersebut tidak menghilangkan visibility Reviewer lain.

---

## 21. UF-REVIEW-003 — Forward to Approval

1. Reviewer memilih `Forward to Approval`.
2. Sistem memeriksa permission, scope, current workflow condition, dan relevant validation.
3. Jika valid:
   - review event dicatat;
   - actor/timestamp dicatat;
   - record bergerak ke Approval flow.
4. Approver dalam configured scope dapat melihat record.
5. Future notification hook MAY dibuat untuk Approver.

---

## 22. UF-REVIEW-004 — Return to Requester for Revision

1. Reviewer memilih `Return for Revision`.
2. UI meminta information/comment sesuai UI rule final.
3. Apakah reason mandatory masih TBD kecuali nantinya dikunci.
4. Sistem mencatat Return event.
5. Requester editing diaktifkan kembali.
6. Record tetap menyimpan:
   - previous submission;
   - reviewer viewer history;
   - reviewer action actor;
   - return event.
7. Requester membuka record dan melakukan revision.
8. Semua changes masuk audit old/new value.
9. Requester memilih Resubmit.
10. Resubmit event dicatat.
11. Record kembali ke Review stage.
12. Reviewer context sebelumnya dipertahankan sebagai continuity/default assigned reference.
13. **Reviewer lain dalam Unit/Division scope tetap dapat melihat dan bertindak.**
14. Reviewer yang sama atau eligible Reviewer lain dapat:
   - Forward;
   - Return lagi;
   - Reject.
15. Siklus dapat berulang berkali-kali tanpa fixed limit.

---

## 23. UF-REVIEW-005 — Reviewer Reject

1. Reviewer memilih `Reject`.
2. System melakukan permission/scope/state validation.
3. Mandatory reject reason masih TBD.
4. Jika valid:
   - Reject event dicatat;
   - requester tidak dapat normal edit/resubmit;
   - record tetap berada di History;
   - normal workflow berhenti.
5. Rejected record hanya dapat masuk flow lagi melalui authorized Reopen.

---

# PART H — APPROVER FLOW

## 24. UF-APPROVAL-001 — Approver Opens Approval Queue

1. Approver login.
2. Approver membuka Approval/History area.
3. Sistem mengambil records dalam configured approval scope.
4. Scope dapat mencakup lebih dari satu Unit/Division.
5. Approver membuka record.
6. Sistem melakukan scope/state validation.
7. Approver melihat form, audit/workflow history, reviewer activity, dan attachments yang diperbolehkan.

---

## 25. UF-APPROVAL-002 — Approve

1. Approver memilih `Approve`.
2. Sistem memvalidasi:
   - permission;
   - scope;
   - review prerequisite;
   - current state;
   - relevant validation.
3. Jika valid:
   - Approval event dicatat;
   - approver identity/timestamp dicatat;
   - record menjadi Approved secara semantic.
4. Record tetap tersedia di History.
5. Normal requester/reviewer edit tidak tersedia.
6. Future notification hook MAY memberi tahu relevant actor.

### Emergency

Emergency Change mengikuti flow yang sama dan tidak dapat bypass Review atau Approval.

---

## 26. UF-APPROVAL-003 — Return to Reviewer

1. Approver memilih `Return to Reviewer`.
2. Sistem mencatat actor, timestamp, origin dan destination stage.
3. Record kembali ke Review flow.
4. Eligible Reviewer dalam scope dapat melihatnya.
5. Reviewer dapat melakukan Review kembali dan Forward lagi ketika siap.

---

## 27. UF-APPROVAL-004 — Return to Requester

1. Approver memilih `Return to Requester`.
2. Return event dicatat.
3. Requester editing diaktifkan.
4. Requester melakukan revision.
5. Semua changes dicatat old/new value.
6. Requester memilih `Resubmit`.
7. **Record wajib masuk Review lagi.**
8. Reviewer melakukan review terhadap revision terbaru.
9. Hanya setelah Reviewer Forward, record dapat kembali ke Approval.

### Forbidden Shortcut

`Approver → Requester → Resubmit → langsung Approver` adalah flow yang tidak diizinkan.

---

## 28. UF-APPROVAL-005 — Approver Reject

1. Approver memilih `Reject`.
2. Sistem melakukan validation.
3. Reject event dicatat.
4. Record tetap di History.
5. Requester tidak dapat normal edit/resubmit.
6. Record dapat kembali ke workflow hanya melalui authorized Reopen.

---

# PART I — REJECTED REOPEN

## 29. UF-REOPEN-001 — Reopen Rejected Record

### Preconditions

- record Rejected;
- actor adalah protected highest authority atau memiliki explicit reopen-rejected permission sesuai RBAC final.

### Flow

1. Authorized actor membuka Rejected record.
2. Actor memilih `Reopen`.
3. Sistem meminta **mandatory reason**.
4. Sistem meminta actor memilih **destination** yang valid.
5. Allowed destination exact akan dikunci pada State Flow.
6. Actor mengonfirmasi.
7. Sistem mencatat:
   - actor;
   - timestamp;
   - reason;
   - previous state;
   - selected destination;
   - previous rejection history.
8. Record bergerak ke destination yang dipilih.
9. History Reject sebelumnya tetap ada dan tidak dihapus.

---

# PART J — APPROVED REOPEN / REVERT

## 30. UF-REOPEN-002 — Reopen Approved Record

### Preconditions

- record Approved;
- actor memiliki highest-authority permission untuk Approved Reopen/Revert.

### Flow

1. Highest-authority actor membuka Approved record.
2. Actor memilih `Reopen / Revert`.
3. Sistem meminta **mandatory reason**.
4. Sistem menampilkan valid destination choices sesuai State Flow final.
5. Actor memilih destination.
6. Actor mengonfirmasi.
7. Sistem mencatat:
   - actor;
   - timestamp;
   - mandatory reason;
   - previous Approved state;
   - selected destination;
   - previous approval evidence.
8. Record bergerak ke destination.
9. Previous Approval tidak dihapus atau overwrite.
10. Workflow dapat berjalan kembali sesuai destination.

---

# PART K — HISTORY AND EXPORT

## 31. UF-HISTORY-001 — Open History

1. User memilih `History` dari navigation/dashboard.
2. Sistem menentukan effective visibility berdasarkan role, ownership, Unit/Division, dan approval scope.
3. Sistem menampilkan hanya records yang boleh dilihat user.
4. Visibility intent:

| Actor Context | Records Visible |
|---|---|
| Requester | Own records |
| Reviewer | Unit/Division scoped records |
| Approver | Configured approval scope, dapat multi-unit |
| Protected Superadmin | All NSCMF |
| Multi-role user | Union sesuai role/scope |

5. User dapat membuka record detail.
6. Record detail menampilkan data dan history sesuai permission/UI specification.

Search/filter behavior final akan ditentukan di UI/UX specification.

---

## 32. UF-EXPORT-001 — Single Export

1. User membuka visible NSCMF.
2. User memilih `Export`.
3. Backend memverifikasi user masih memiliki view access.
4. Jika tidak memiliki access, export ditolak.
5. Jika memiliki access, sistem generate output.
6. PDF adalah minimum confirmed format.
7. Generated output harus merepresentasikan stored record.
8. Export tidak mengubah workflow state.

---

## 33. UF-EXPORT-002 — Bulk Export

1. User membuka History.
2. User memilih beberapa visible records.
3. User memilih `Bulk Export`.
4. Backend melakukan visibility check terhadap setiap selected record.
5. Record inaccessible tidak boleh ikut export atau bocor melalui generated package.
6. Sistem generate bulk output sesuai export specification final.
7. Exact packaging seperti combined PDF/ZIP masih TBD.

---

# PART L — ARCHIVE

## 34. UF-ARCHIVE-001 — Archive NSCMF

### Preconditions

- actor adalah Superadmin/highest authority atau authority yang nantinya didefinisikan secara eksplisit pada RBAC;
- record eligible untuk Archive sesuai state rule final.

### Flow

1. Authorized actor membuka record atau administrative History view.
2. Actor memilih `Archive`.
3. UI meminta confirmation.
4. Mandatory Archive reason masih TBD.
5. Actor mengonfirmasi.
6. Sistem mencatat Archive event.
7. Record tidak di-hard-delete.
8. Business status terakhir tetap dipertahankan.
9. Record dikeluarkan dari default active view.
10. Record tetap tersedia pada authorized archived/history view.
11. Audit/workflow/approval/rejection/revision history tetap tersedia.

### TBD

Apakah record dapat `Unarchive` belum dikonfirmasi.

---

# PART M — NOTIFICATION HOOK (DRAFT / FUTURE)

## 35. UF-NOTIF-001 — Future Notification Events

Notification flow **didokumentasikan sebagai future hook dan tidak menjadi current implementation priority**.

Candidate events:

- Submit;
- Return for Revision;
- Reviewer Reject;
- Forward to Approval;
- Approver Return;
- Approver Reject;
- Approve;
- Reopen.

Candidate future channels yang pernah dibahas:

- Telegram;
- WhatsApp melalui Baileys.

### Important

User Flow core harus tetap berfungsi penuh walaupun notification integration belum diimplementasikan.

Provider, authentication, message template, delivery retry, failure handling, opt-in/out, dan security belum ditentukan.

---

# PART N — END-TO-END FLOWS

## 36. Happy Path — Activation

```text
Login
→ Dashboard
→ Create New Form
→ Activation
→ pilih Activation / Upgrade-Downgrade / Deactivation
→ pilih Auto / Manual Number
→ Fill Form
→ Autosave / Save Draft
→ Submit
→ Eligible Reviewer membuka record
→ viewer log tercatat
→ Reviewer Forward
→ Approver membuka record
→ Approver Approve
→ History
→ Export
```

---

## 37. Happy Path — Change

```text
Login
→ Dashboard
→ Create New Form
→ Change
→ pilih Maintenance / Upgrade / Emergency
→ pilih Auto / Manual Number
→ isi Purpose of Changes fields
→ isi Identified Problem
→ pilih Service Impact
→ isi Improvement Plan / KPI / execution information
→ optional attachment
→ Autosave / Save Draft
→ Submit
→ Review
→ Approval
→ History / Export
```

`Result of Changes` timing masih TBD dan tidak diasumsikan sebagai mandatory pre-submit field pada flow ini.

---

## 38. Revision Loop — Reviewer Return

```text
Requester Submit
→ Reviewer A View
→ Reviewer A Return for Revision
→ Requester Edit
→ Autosave + Audit
→ Requester Resubmit
→ reviewer continuity mengarah ke Reviewer A
→ record tetap visible Reviewer B/C yang eligible
→ Reviewer A atau eligible Reviewer lain Review
→ Forward / Return lagi / Reject
```

Loop dapat berulang tanpa fixed maximum.

---

## 39. Revision Loop — Approver Return to Requester

```text
Submit
→ Review
→ Forward
→ Approval
→ Approver Return to Requester
→ Requester Edit
→ Resubmit
→ Review lagi
→ Forward
→ Approval lagi
```

Review ulang adalah mandatory.

---

## 40. Reviewer/Approver Reject + Reopen

```text
Review / Approval
→ Reject
→ Rejected record tetap di History
→ normal Requester flow berhenti
→ authorized Reopen actor memilih Reopen
→ mandatory reason
→ pilih valid destination
→ workflow berjalan dari destination baru
```

---

## 41. Draft Cancel

```text
Create Draft
→ Edit / Autosave
→ Cancel
→ Cancelled permanent
→ History only
→ tidak bisa Reopen
→ jika masih perlu, Create New Form
```

---

## 42. Approved Reopen

```text
Approved
→ highest authority membuka record
→ Reopen/Revert
→ mandatory reason
→ pilih valid destination
→ previous Approval tetap di History
→ workflow berjalan lagi dari destination
```

---

# PART O — AUDIT TOUCHPOINTS IN USER FLOW

## 43. Minimum User-Visible Business Events to Log

Flow harus menghasilkan audit/history event untuk:

1. user/organization administrative changes yang relevan;
2. record creation;
3. autosave persistence;
4. Save Draft;
5. field change old/new value;
6. attachment add/remove/replace;
7. numbering change;
8. Draft Cancel;
9. Submit;
10. Reviewer View;
11. Reviewer Forward;
12. Reviewer Return;
13. Reviewer Reject;
14. Requester Revision;
15. Resubmit;
16. Approver View/action sesuai audit rule final;
17. Approve;
18. Approver Return;
19. Approver Reject;
20. Reopen/Revert;
21. Archive.

Reviewer history harus dapat membedakan:

- **Viewer** — membuka/melihat;
- **Actor / Modified By** — benar-benar melakukan action/perubahan.

Exact storage fields ditentukan pada ERD/Database Schema.

---

# PART P — FLOW GUARDRAILS

## 44. Forbidden Flows

Implementation MUST NOT memungkinkan flow berikut:

### UF-GUARD-001

`Draft → Cancel → Reopen`

Cancelled permanent. User harus membuat request baru.

### UF-GUARD-002

`Submitted → Requester Edit langsung`

Requester harus mendapatkan Return/Revision terlebih dahulu.

### UF-GUARD-003

`Approver Return to Requester → Resubmit → langsung Approver`

Harus Review ulang.

### UF-GUARD-004

`Emergency → langsung Approval tanpa Review`

Emergency tetap wajib Review.

### UF-GUARD-005

`Reviewer pertama membuka → Reviewer lain kehilangan visibility`

Review bukan exclusive lock.

### UF-GUARD-006

`Reject/Approve/Reopen → history lama dihapus`

Historical fact harus dipertahankan.

### UF-GUARD-007

`User tidak bisa view record → masih bisa export via URL/API`

Tidak diizinkan.

### UF-GUARD-008

`Change Purpose of Changes / Identified Problem → dipaksa menjadi dropdown berdasarkan asumsi`

Tidak diizinkan karena workbook menunjukkan field input.

### UF-GUARD-009

`Upgrade keyword → system otomatis memilih Activation/Change`

Tidak diizinkan tanpa contextual business rule.

### UF-GUARD-010

`Archive → hard delete`

Tidak diizinkan.

---

# PART Q — OPEN FLOW DECISIONS

## 45. Still TBD

User Flow berikut belum cukup dikunci dan tidak boleh ditebak:

### Change Form

- [ ] Kapan `Result of Changes` mulai editable/wajib diisi?
- [ ] Siapa actor utama yang mengisi Result of Changes?
- [ ] Apakah Service Impact single-select atau multi-select?

### Numbering

- [ ] Automatic number format.
- [ ] Exact uniqueness scope.

### Action Reasons

- [ ] Return reason mandatory atau optional?
- [ ] Reject reason mandatory atau optional?
- [ ] Cancel reason mandatory atau optional?
- [ ] Archive reason mandatory atau optional?

`Reopen` reason sudah confirmed mandatory.

### Reopen Destination

- [ ] Daftar exact destination yang valid untuk Rejected Reopen.
- [ ] Daftar exact destination yang valid untuk Approved Reopen/Revert.

### Archive

- [ ] Apakah Unarchive didukung?

### Notification

- [ ] Provider final.
- [ ] Telegram vs WhatsApp/Baileys vs lainnya.
- [ ] Event yang benar-benar mengirim notification.
- [ ] Message template dan delivery semantics.

### History / Export

- [ ] Final search/filter behavior.
- [ ] Additional export format.
- [ ] Bulk packaging.
- [ ] Apakah export/download event wajib masuk audit.

Open decisions di atas tidak menghalangi dokumentasi RBAC selama permission untuk action yang sudah confirmed dapat didefinisikan.

---

# PART R — TRACEABILITY TO BUSINESS RULES

## 46. Flow-to-Rule Mapping

| User Flow | Main Business Rules |
|---|---|
| Setup Wizard | BR-SETUP-* |
| User Admin | BR-USER-* / BR-SUPER-* |
| Form Selection | BR-FORM-* |
| Change Field Mapping | BR-CHG-* |
| Draft / Autosave | BR-DRAFT-* |
| Cancel | BR-CAN-* |
| Submit | BR-SUB-* |
| Reviewer Queue/Actions | BR-REV-* |
| Revision | BR-RET-* |
| Approval | BR-APR-* |
| Reject | BR-REJ-* |
| Reopen | BR-REOPEN-* |
| Visibility | BR-VIS-* |
| Export | BR-EXP-* |
| Audit | BR-AUD-* |
| Archive | BR-DEL-* |
| Notification Draft | BR-NOTIF-* |

---

## 47. User Flow Acceptance Checklist

Sebelum User Flow dianggap Approved, stakeholder harus dapat menyetujui bahwa:

- [ ] Initial setup menggunakan wizard.
- [ ] Role dapat template atau manual.
- [ ] Unit/Division dapat template/mapping atau manual.
- [ ] Template dapat dimodifikasi setelah setup.
- [ ] Approver dapat mencakup beberapa unit.
- [ ] Form selection mengikuti family lalu subtype.
- [ ] Auto/Manual number dipilih setiap membuat form.
- [ ] Change Purpose/Identified Problem adalah input, bukan choice.
- [ ] Service Impact adalah selectable options.
- [ ] Autosave dan Save Draft keduanya tersedia.
- [ ] Cancel hanya Draft dan permanent.
- [ ] Requester tidak memilih Reviewer.
- [ ] Semua eligible Reviewer dapat melihat.
- [ ] Reviewer View dicatat sebagai viewer.
- [ ] Reviewer action dicatat sebagai actor/assigned/modified context.
- [ ] Multiple Reviewer supported.
- [ ] Return/Revision dapat berulang.
- [ ] Resubmit kembali ke reviewer continuity tetapi reviewer lain tetap dapat bertindak.
- [ ] Approver Return ke Requester wajib Review lagi.
- [ ] Reviewer/Approver dapat Reject.
- [ ] Rejected dapat Reopen oleh authorized actor.
- [ ] Approved dapat Reopen/Revert oleh highest authority.
- [ ] Reopen membutuhkan reason dan actor memilih destination.
- [ ] Emergency tidak bypass Review/Approval.
- [ ] History menggunakan scoped visibility.
- [ ] View implies Export.
- [ ] Archive menggantikan Delete.
- [ ] Notification tetap draft/future dan bukan priority blocker.

---

## 48. Next Document

Dokumen berikutnya adalah:

**`04_RBAC_Permission_Matrix.md`**

RBAC harus menerjemahkan User Flow ini menjadi permission yang eksplisit, termasuk sekurang-kurangnya:

- setup/manage roles;
- manage Unit/Division;
- manage users;
- create/edit own Draft;
- cancel own Draft;
- submit;
- view own/scoped/all records;
- review;
- return;
- reject;
- approve;
- reopen rejected;
- reopen approved;
- archive;
- export;
- view audit/history.

RBAC juga harus membedakan `role name` dari `permission + scope`, karena reviewer/approver access bergantung pada scope dan user dapat memiliki multiple roles.
