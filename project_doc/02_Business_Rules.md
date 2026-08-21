# Business Rules

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-BR-002  
> **Document Order:** 02 / 20  
> **Status:** Draft — Confirmed Core Rules + Open Decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Depends On:** `project_doc/01_PRD.md`  
> **Primary Business Reference:** NSCMF Form 3.0  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

Dokumen ini mendefinisikan **aturan bisnis yang wajib dipatuhi oleh aplikasi NSCMF**.

Jika PRD menjawab pertanyaan **"produk apa yang dibuat?"**, maka Business Rules menjawab:

> **"Dalam kondisi apa sebuah aksi boleh atau tidak boleh dilakukan, siapa yang berhak melakukannya, dan aturan apa yang tidak boleh dilanggar oleh UI, backend, database, API, maupun implementasi AI/developer?"**

Aturan pada dokumen ini berlaku lintas implementasi. UI tidak boleh memberikan perilaku yang melanggar rule ini, dan backend tetap wajib melakukan enforcement walaupun UI sudah membatasi aksi tertentu.

Dokumen ini belum menggantikan:

- `03_User_Flow.md` untuk alur interaksi user;
- `04_RBAC_Permission_Matrix.md` untuk permission detail;
- `05_State_Status_Flow.md` untuk state machine authoritative;
- `06_Validation_Rules.md` untuk validitas setiap field;
- dokumen teknis berikutnya untuk cara implementasi.

---

## 2. Normative Language

Dokumen menggunakan istilah berikut:

- **MUST** — wajib dipenuhi.
- **MUST NOT** — dilarang.
- **MAY** — diperbolehkan, tetapi tidak wajib.
- **TBD** — keputusan belum final dan tidak boleh diasumsikan oleh implementasi.

Apabila sebuah rule bertentangan dengan implementasi, maka implementasi yang harus diperbaiki kecuali business owner secara eksplisit mengubah rule tersebut.

---

## 3. Rule Categories

Business Rules dibagi menjadi tiga kategori:

### 3.1 System Invariant

Rule yang tidak boleh berubah melalui konfigurasi normal aplikasi.

Contoh:

- tidak boleh hard delete NSCMF;
- seluruh perubahan data harus tercatat;
- protected Superadmin tidak dapat dihapus atau diturunkan;
- Emergency Change tetap melalui workflow wajib.

### 3.2 Configurable Business Rule

Rule yang tetap memiliki boundary tetap tetapi detailnya dapat dikonfigurasi.

Contoh:

- role template atau manual role configuration;
- reviewer unit/division scope;
- approver scope;
- nomor NSCMF auto atau manual.

### 3.3 Open Decision

Rule yang belum memiliki keputusan cukup kuat. Implementasi MUST NOT memilih perilaku sendiri untuk item tersebut.

---

# PART A — ORGANIZATION, ROLE, AND INITIAL SETUP

## 4. Initial Role Setup

### BR-SETUP-001 — Role Configuration Mode

Pada setup awal aplikasi, sistem **MUST** menyediakan dua pilihan konfigurasi role melalui UI:

1. **Use Role Template**
2. **Manual Role Configuration**

Pilihan tersebut harus terlihat jelas kepada user yang melakukan initial setup.

### BR-SETUP-002 — Standard Role Template

Apabila user memilih **Use Role Template**, sistem MUST menyediakan template minimum berikut:

| Template Role | Business Purpose |
|---|---|
| `Superadmin` | Role tertinggi dan protected system administrator |
| `Requester` | Membuat dan mengajukan NSCMF |
| `Reviewer` | Melakukan review pada NSCMF dalam scope yang diizinkan |
| `Approver` | Melakukan approval pada NSCMF dalam scope yang diizinkan |

Permission exact dari masing-masing role akan didefinisikan pada `04_RBAC_Permission_Matrix.md`.

### BR-SETUP-003 — Manual Role Configuration

Jika user memilih **Manual Role Configuration**, sistem MAY mengizinkan pembuatan nama role dan assignment permission yang berbeda dari template.

Namun konfigurasi manual **MUST NOT** menghapus invariant berikut:

- protected Superadmin tetap tersedia;
- mekanisme Request harus dapat direpresentasikan;
- mekanisme Review harus dapat direpresentasikan;
- mekanisme Approval harus dapat direpresentasikan;
- visibility dan workflow constraints tetap berlaku;
- role buatan user tidak boleh memiliki authority yang lebih tinggi daripada protected Superadmin.

### BR-SETUP-004 — Role Configuration Is Not a Workflow Bypass

Menggunakan konfigurasi role manual MUST NOT menjadi cara untuk melewati state, validation, audit, archive, atau security invariant yang didefinisikan pada project documentation.

---

## 5. Protected Superadmin

### BR-SUPER-001 — Seeded Superadmin

Initial application seeding **MUST** membuat setidaknya satu protected `Superadmin` account.

### BR-SUPER-002 — Highest Role

Protected Superadmin adalah authority tertinggi pada aplikasi.

Tidak ada role hasil template maupun manual configuration yang boleh memiliki hierarchy lebih tinggi daripada protected Superadmin.

### BR-SUPER-003 — Superadmin Cannot Be Deleted

Protected Superadmin account **MUST NOT** dapat di-hard-delete.

### BR-SUPER-004 — Superadmin Cannot Be Soft Deleted

Protected Superadmin account **MUST NOT** dapat di-soft-delete atau dinonaktifkan melalui mekanisme yang secara efektif menghilangkan account tersebut dari sistem.

### BR-SUPER-005 — Superadmin Cannot Be Downgraded

Protected Superadmin **MUST NOT** dapat kehilangan protected Superadmin role melalui UI, API, bulk operation, import, maupun normal administrative action.

### BR-SUPER-006 — Superadmin Has Global NSCMF Visibility

Protected Superadmin MUST dapat melihat seluruh NSCMF tanpa dibatasi ownership, unit/division reviewer scope, atau approver scope.

### BR-SUPER-007 — Superadmin Controls Approved Reopen

Hanya role tertinggi yang boleh menjalankan business action untuk **reopen/revert** record yang sudah Approved.

Dalam template standar, role tersebut adalah protected Superadmin.

### BR-SUPER-008 — Hardcoded Means Protected Identity, Not Plaintext Credential

Requirement bahwa Superadmin bersifat "hardcoded" pada proyek ini berarti **protected seeded system identity/role yang tidak dapat dihapus atau diturunkan melalui aplikasi**.

Dokumen ini **tidak** mengizinkan penyimpanan plaintext password atau secret di source code. Cara provisioning credential akan ditentukan pada Security Rules dan Environment Specification.

---

## 6. Multi-Role Users

### BR-ROLE-001 — Multiple Roles Allowed

Satu user **MAY** memiliki lebih dari satu role secara bersamaan.

Contoh yang valid:

- Requester + Reviewer;
- Reviewer + Approver;
- Requester + Reviewer + Approver.

### BR-ROLE-002 — Permission Union

Jika user memiliki beberapa role, effective permissions pada prinsipnya merupakan gabungan permission yang dimiliki role-role tersebut, tetap tunduk pada:

- record ownership;
- organizational scope;
- current workflow state;
- validation rules;
- protected system invariant.

### BR-ROLE-003 — Same Person May Participate in Multiple Stages

Current business decision **tidak mewajibkan segregation of duty** antara Requester, Reviewer, dan Approver.

Dengan demikian user yang memiliki permission dan scope yang sesuai MAY menjalankan lebih dari satu tahap pada record yang sama.

Apabila di masa depan organisasi memerlukan aturan `Requester != Reviewer != Approver`, rule tersebut harus menjadi perubahan business rule eksplisit dan tidak boleh diaktifkan diam-diam.

### BR-ROLE-004 — Permission Package Is Not a Business Rule

Model multi-role dan permission boleh diimplementasikan menggunakan package seperti `spatie/laravel-permission`, tetapi pemilihan package tersebut **bukan business invariant** dan akan difinalisasi pada `08_Tech_Stack_Specification.md`.

---

# PART B — FORM CLASSIFICATION

## 7. NSCMF Form Families

### BR-FORM-001 — Two Main Form Families

Aplikasi MUST menyediakan dua business form family utama:

1. `NSCMF - Activation`
2. `NSCMF - Change`

### BR-FORM-002 — Activation Business Context

`NSCMF - Activation` digunakan untuk pekerjaan dalam konteks **instalasi / provisioning / service lifecycle** yang direpresentasikan oleh template Activation.

Template saat ini mencakup request subtype:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

### BR-FORM-003 — Change Business Context

`NSCMF - Change` digunakan untuk pekerjaan dalam konteks **maintenance / perubahan terhadap layanan atau environment yang sudah berjalan**.

Template saat ini mencakup request subtype:

- Maintenance;
- Upgrade;
- Emergency.

### BR-FORM-004 — Upgrade Classification

Karena istilah `Upgrade` muncul pada Activation maupun Change, kata **Upgrade saja tidak cukup** untuk menentukan jenis form.

Classification MUST mengikuti konteks bisnis utama:

- upgrade dalam konteks instalasi/provisioning/service lifecycle → **Activation**;
- upgrade dalam konteks maintenance/perubahan terhadap layanan yang sudah berjalan → **Change**.

### BR-FORM-005 — No Keyword-Only Auto Classification

Aplikasi MUST NOT secara otomatis menentukan Activation atau Change hanya berdasarkan keyword seperti `upgrade`.

User harus memilih business context/form yang sesuai.

Jika terdapat kasus operasional yang tetap ambigu, classification detail harus dikonfirmasi kepada business owner dan kemudian ditambahkan ke Business Rules.

### BR-FORM-006 — Emergency Remains Change

Emergency merupakan subtype pada `NSCMF - Change` dan tetap mengikuti business workflow Change.

---

# PART C — RECORD CREATION AND DRAFT

## 8. Record Ownership

### BR-REC-001 — Requester Ownership

Setiap NSCMF MUST memiliki requester/owner context yang dapat diidentifikasi.

### BR-REC-002 — Creation Actor Is Logged

Sistem MUST mengetahui siapa user yang membuat record dan kapan record dibuat.

### BR-REC-003 — Structured Record Is Source of Truth

Record yang tersimpan dalam aplikasi adalah source of truth untuk data NSCMF digital.

Export merupakan output/snapshot dari record, bukan sumber data utama yang mengubah record aplikasi.

---

## 9. Draft Rules

### BR-DRAFT-001 — Draft Is Supported

Aplikasi MUST mendukung status/phase Draft.

### BR-DRAFT-002 — Draft Is Freely Editable by Eligible Requester

Selama record masih Draft, requester yang memiliki permission atas record tersebut MAY mengubah isi form tanpa perlu melalui Review atau Approval.

### BR-DRAFT-003 — Draft Changes Are Audited

Kebebasan mengedit Draft **tidak** berarti perubahan boleh tidak tercatat.

Setiap perubahan Draft yang dipersist MUST masuk ke audit log sesuai aturan audit pada dokumen ini.

### BR-DRAFT-004 — Draft Is Not Yet Reviewed

Draft tidak dianggap sebagai request yang telah melewati review atau approval hanya karena record telah dibuat di sistem.

### BR-DRAFT-005 — Draft Validation vs Submit Validation

Draft MAY berada dalam kondisi belum lengkap.

Validation yang menentukan apakah sebuah Draft boleh disubmit akan ditetapkan secara eksplisit pada `06_Validation_Rules.md`.

---

# PART D — SUBMISSION AND EDITABILITY

## 10. Submit Rules

### BR-SUB-001 — Submit Requires Valid Record

Requester hanya boleh Submit apabila semua validation yang diwajibkan untuk submission telah terpenuhi.

### BR-SUB-002 — Submit Locks Normal Requester Editing

Setelah sebuah record berhasil di-Submit, requester **MUST NOT** dapat mengubah data form secara normal selama record masih menunggu atau sedang berada pada proses Review/Approval.

### BR-SUB-003 — Edit Becomes Available Through Revision Flow

Requester baru MAY mengedit record yang sudah pernah disubmit apabila workflow secara eksplisit mengembalikan record tersebut ke requester untuk revisi.

### BR-SUB-004 — Direct Edit Is Not a Substitute for Return

Reviewer, Approver, atau Requester MUST NOT menggunakan direct edit untuk melewati mekanisme Return/Revision yang seharusnya tercatat pada workflow.

### BR-SUB-005 — Resubmission Is a New Workflow Event

Setelah requester memperbaiki record yang dikembalikan, pengiriman ulang MUST tercatat sebagai event resubmission dan tidak boleh menghapus histori submission sebelumnya.

---

# PART E — REVIEW

## 11. Reviewer Actions

### BR-REV-001 — Reviewer Acts Within Assigned Scope

Reviewer hanya boleh melakukan Review terhadap record yang berada dalam unit/division scope yang diizinkan kepadanya.

### BR-REV-002 — Review Is Mandatory

Record normal maupun Emergency MUST melewati tahap Review sebelum final Approval.

### BR-REV-003 — Reviewer Can Complete Review / Forward

Reviewer MAY menyelesaikan review dan meneruskan record menuju Approval apabila record memenuhi business dan validation requirement yang berlaku.

### BR-REV-004 — Reviewer Can Return for Revision

Reviewer MAY mengembalikan record kepada requester untuk diperbaiki.

Return for Revision MUST menjadi workflow event yang tercatat.

### BR-REV-005 — Reviewer Can Reject

Reviewer MAY menolak/reject record.

Reject MUST menjadi workflow event yang tercatat dan tidak boleh direpresentasikan sebagai deletion.

### BR-REV-006 — Return Enables Requester Editing

Jika Reviewer mengembalikan record kepada requester untuk revision, requester MAY kembali mengedit record tersebut.

### BR-REV-007 — Revision Can Repeat

Tidak ada batas jumlah siklus:

`Submit → Review → Return → Edit → Resubmit`

Siklus tersebut MAY terjadi berulang kali selama business process membutuhkannya.

### BR-REV-008 — Revision History Must Be Preserved

Setiap iteration dalam siklus revision MUST dipertahankan pada audit/workflow history.

Sistem MUST NOT menimpa histori lama sehingga hanya revision terakhir yang terlihat.

---

# PART F — APPROVAL

## 12. Approver Actions

### BR-APR-001 — Approver Acts Within Assigned Scope

Approver hanya boleh melakukan Approval terhadap record yang berada pada scope yang diizinkan kepadanya.

Exact definition dari Approver scope akan difinalisasi pada RBAC/Permission Matrix.

### BR-APR-002 — Approver Can Approve

Approver MAY memberikan final Approval jika record telah memenuhi prerequisite workflow dan validation yang berlaku.

### BR-APR-003 — Approver Can Return to Reviewer

Approver MAY mengembalikan record ke Reviewer untuk tindak lanjut/review ulang.

### BR-APR-004 — Approver Can Return to Requester

Approver MAY mengembalikan record langsung ke Requester untuk revision apabila business process membutuhkannya.

Jika dikembalikan kepada Requester, requester MAY mengedit kembali record tersebut.

### BR-APR-005 — Approver Can Reject

Approver MAY Reject record.

Reject MUST tercatat dan MUST NOT menghapus record.

### BR-APR-006 — Approval Is Logged

Approval MUST merekam setidaknya:

- record yang di-approve;
- actor/approver;
- timestamp;
- workflow event yang menyebabkan status menjadi Approved.

### BR-APR-007 — Approval Does Not Erase Previous Cycles

Jika sebuah record pernah mengalami Return, Revision, Review ulang, atau Resubmit, Approval terakhir MUST mempertahankan seluruh history tersebut.

---

# PART G — REOPEN / REVERT APPROVED RECORD

## 13. Approved Record Protection

### BR-REOPEN-001 — Approved Record Is Protected

Record yang telah Approved tidak boleh kembali editable melalui normal Requester/Reviewer/Approver action.

### BR-REOPEN-002 — Only Highest Role May Reopen

Reopen/Revert terhadap Approved record hanya boleh dilakukan oleh protected highest role.

Dalam standard role template, actor tersebut adalah `Superadmin`.

### BR-REOPEN-003 — Reopen Reason Is Mandatory

Setiap Reopen/Revert dari Approved record **MUST** memiliki alasan yang diisi oleh actor.

Reopen tanpa alasan MUST ditolak.

### BR-REOPEN-004 — Reopen Is Fully Audited

Audit event Reopen MUST merekam setidaknya:

- actor;
- timestamp;
- alasan;
- previous state;
- resulting state;
- record reference.

### BR-REOPEN-005 — Reopen Must Preserve Previous Approval

Reopen MUST NOT menghapus bukti bahwa record sebelumnya pernah Approved.

Previous approval tetap menjadi bagian dari history.

### BR-REOPEN-006 — Reopen Target State Is Defined Later

State tujuan setelah Reopen—misalnya kembali ke Revision, Review, atau state khusus—akan ditetapkan secara authoritative pada `05_State_Status_Flow.md`.

Implementasi MUST NOT memilih target state sendiri sebelum state flow disetujui.

---

# PART H — CANCELLATION

## 14. Requester Cancellation

### BR-CAN-001 — Requester Can Cancel Before Review Completion

Requester MAY membatalkan/cancel request miliknya selama request tersebut **belum melewati Review**.

### BR-CAN-002 — Cancel Is Not Delete

Cancel MUST NOT menghapus record.

Cancelled record tetap menjadi bagian dari history dan audit trail.

### BR-CAN-003 — No Requester Cancel After Review

Setelah record telah melewati tahap Review, requester MUST NOT menggunakan Cancel untuk menghentikan record secara unilateral.

Exception jika diperlukan harus didefinisikan sebagai business rule baru.

### BR-CAN-004 — Cancel Must Be Audited

Cancel MUST merekam actor, timestamp, record, serta transisi workflow yang terjadi.

### BR-CAN-005 — Cancel Reason Requirement Is TBD

Apakah alasan Cancel wajib diisi belum dikonfirmasi.

UI/implementation MUST NOT memaksakan mandatory reason sampai rule tersebut difinalisasi.

---

# PART I — EMERGENCY CHANGE

## 15. Emergency Rules

### BR-EMG-001 — Emergency Does Not Bypass Workflow

`NSCMF - Change / Emergency` MUST tetap mengikuti workflow wajib.

### BR-EMG-002 — Emergency Requires Review

Emergency MUST tetap melalui Review.

### BR-EMG-003 — Emergency Requires Approval

Emergency MUST tetap melalui Approval.

### BR-EMG-004 — No Automatic Emergency Privilege Escalation

Memilih subtype Emergency MUST NOT secara otomatis memberikan permission tambahan, melewati scope, melewati validation, melewati audit, atau melewati approval.

---

# PART J — VISIBILITY AND DATA SCOPE

## 16. Requester Visibility

### BR-VIS-001 — Requester Sees Own Records

Dalam kapasitas sebagai Requester, user hanya dapat melihat NSCMF miliknya sendiri.

### BR-VIS-002 — Multi-Role Visibility Is Additive

Jika Requester juga memiliki role lain, record tambahan yang dapat dilihat berasal dari permission/scope role tersebut.

Contoh: Requester + Reviewer dapat melihat record miliknya sendiri serta record pada Reviewer scope yang diberikan.

---

## 17. Reviewer Visibility

### BR-VIS-003 — Reviewer Visibility Is Unit/Division Scoped

Reviewer dapat melihat record berdasarkan **unit/division scope** yang ditugaskan kepadanya.

### BR-VIS-004 — Reviewer Has No Implicit Global Access

Memiliki role Reviewer saja MUST NOT otomatis memberikan akses seluruh NSCMF.

---

## 18. Approver Visibility

### BR-VIS-005 — Approver Visibility Is Scope Based

Approver dapat melihat record berdasarkan scope approval yang diberikan kepadanya.

### BR-VIS-006 — Approver Scope Definition Is Configurable

Exact scope dimension untuk Approver belum difinalisasi dan akan didefinisikan pada RBAC/Permission Matrix.

### BR-VIS-007 — Approver Has No Implicit Global Access

Memiliki role Approver saja MUST NOT otomatis memberikan akses seluruh NSCMF.

---

## 19. Highest Role Visibility

### BR-VIS-008 — Superadmin Global Visibility

Protected Superadmin MUST dapat melihat seluruh NSCMF.

### BR-VIS-009 — Scope Must Be Enforced Server-Side

Visibility rule MUST diterapkan pada backend/data access layer.

Menyembunyikan record hanya pada UI tidak dianggap memenuhi business rule.

---

# PART K — EXPORT

## 20. Export Authorization

### BR-EXP-001 — View Implies Export

Setiap user yang secara sah dapat **melihat** sebuah NSCMF MAY mengekspor record tersebut.

Tidak diperlukan business role export terpisah selama user memiliki view access terhadap record.

### BR-EXP-002 — No View Means No Export

User MUST NOT dapat mengekspor record yang tidak boleh ia lihat.

### BR-EXP-003 — Bulk Export Respects Per-Record Visibility

Bulk export hanya boleh memproses record yang dapat dilihat oleh user tersebut.

Sistem MUST NOT membocorkan record inaccessible melalui bulk selection, URL manipulation, API request, direct ID, ataupun generated archive.

### BR-EXP-004 — Export Does Not Change Business Data

Menjalankan export MUST NOT mengubah nilai bisnis, ownership, status, approval, atau workflow state record.

### BR-EXP-005 — Export Reflects Current Stored Record

Generated export harus merepresentasikan data record yang sedang berlaku pada aplikasi sesuai snapshot/export behavior yang nantinya ditetapkan.

### BR-EXP-006 — Export Action Audit Is TBD

Requirement audit untuk setiap event download/export belum dikonfirmasi sebagai mandatory business rule.

Security Rules atau Audit Specification dapat membuatnya mandatory kemudian.

---

# PART L — NSCMF NUMBERING

## 21. Number Assignment

### BR-NUM-001 — Numbering Has Two Modes

Pada form, user MUST memiliki pilihan:

1. **Automatic Number Generation**
2. **Manual Number Entry**

### BR-NUM-002 — Automatic Mode

Pada Automatic mode, sistem menghasilkan nomor NSCMF tanpa user mengetik nomor secara manual.

### BR-NUM-003 — Automatic Format Is TBD

Format final nomor otomatis belum ditetapkan.

Contoh year/unit/running-number tidak boleh dianggap final sampai format resmi dikonfirmasi.

### BR-NUM-004 — Manual Mode

Pada Manual mode, user dapat mengisi nomor NSCMF melalui form.

### BR-NUM-005 — NSCMF Number Must Be Unique

Nomor NSCMF yang digunakan sebagai business reference MUST unik dalam domain yang akan ditentukan oleh Validation/Database Specification.

Sistem MUST mencegah duplicate business reference yang dianggap sama oleh aturan uniqueness final.

### BR-NUM-006 — Manual Number Is Validated

Manual number MUST melewati validation termasuk mandatory presence dan uniqueness sesuai `06_Validation_Rules.md`.

### BR-NUM-007 — Number Changes Are Audited

Jika nomor NSCMF berubah pada state yang masih mengizinkan editing, old value dan new value MUST tercatat pada audit log.

### BR-NUM-008 — Number Immutability Point Is TBD

Pada state kapan nomor menjadi tidak boleh diubah secara permanen belum dikonfirmasi.

State/Validation specification harus memutuskan hal tersebut tanpa menghapus audit history.

---

# PART M — ATTACHMENTS

## 22. Attachment Rules

### BR-ATT-001 — Attachment Input Must Exist

Digital NSCMF form MUST menyediakan kemampuan attachment.

### BR-ATT-002 — Attachment Is Optional

Attachment secara default **tidak wajib** untuk membuat atau Submit NSCMF.

Tidak adanya attachment MUST NOT sendirian menyebabkan submission gagal.

### BR-ATT-003 — Attachment Constraints Are Deferred

Allowed file types, maximum file size, maximum attachment count, filename rule, malware scanning, dan storage mechanism akan didefinisikan pada Validation/Security/Architecture specification.

### BR-ATT-004 — Attachment Changes Are Audited

Penambahan, penggantian, atau penghapusan attachment reference pada record MUST tercatat sebagai perubahan pada audit history.

### BR-ATT-005 — Attachment Visibility Follows Record Visibility

User MUST NOT dapat mengakses attachment dari record yang tidak boleh ia lihat.

---

# PART N — AUDIT AND CHANGE HISTORY

## 23. Audit Invariant

### BR-AUD-001 — Every Persisted Business Change Must Be Logged

Setiap perubahan data bisnis yang berhasil dipersist MUST tercatat secara detail pada audit log.

Ini termasuk perubahan ketika record masih Draft.

### BR-AUD-002 — Minimum Audit Data for Field Changes

Audit untuk perubahan field MUST dapat merepresentasikan setidaknya:

- record identifier;
- actor/user;
- timestamp;
- field/data element yang berubah;
- old value;
- new value;
- action/event context.

### BR-AUD-003 — Workflow Actions Must Be Logged

Action berikut MUST menghasilkan audit/workflow event:

- record creation;
- Draft changes;
- Submit;
- Review completion/forward;
- Return for Revision;
- Resubmit;
- Reject;
- Approve;
- Cancel;
- Reopen/Revert;
- Archive;
- NSCMF number change;
- attachment mutation.

### BR-AUD-004 — Audit Must Preserve Revision Cycles

Siklus revision berulang MUST terlihat sebagai event sequence yang terpisah.

History tidak boleh diringkas dengan cara yang menghilangkan fakta bahwa revision sebelumnya pernah terjadi.

### BR-AUD-005 — Audit Must Preserve Old Approval

Reopen terhadap Approved record MUST tetap mempertahankan approval event sebelumnya.

### BR-AUD-006 — Audit Records Are Not Business-Editable

Normal application user MUST NOT dapat mengedit isi audit record yang sudah tercatat.

### BR-AUD-007 — Audit Records Must Not Be Hard Deleted by Normal Application Flow

Archive, Cancel, Reject, atau Reopen NSCMF MUST NOT menghapus audit history record tersebut.

### BR-AUD-008 — Read/View Audit Is TBD

Logging setiap page view/read access belum diputuskan sebagai mandatory business rule.

### BR-AUD-009 — Audit Detail Presentation Must Be Readable

Walaupun storage implementation ditentukan kemudian, UI audit/history harus dapat menyajikan perubahan secara rapi dan dapat dipahami, bukan hanya raw technical payload.

Exact UI ditentukan pada UI/UX Specification.

---

# PART O — DELETE, ARCHIVE, AND DATA PRESERVATION

## 24. No Hard Delete

### BR-DEL-001 — NSCMF Must Never Be Hard Deleted Through Application

NSCMF record **MUST NOT** dapat di-hard-delete melalui normal application functionality.

### BR-DEL-002 — Superadmin Is Also Subject to No-Hard-Delete Rule

Global privilege Superadmin tidak menjadi exception terhadap business invariant no-hard-delete untuk NSCMF.

### BR-DEL-003 — Archive Replaces Delete

Jika sebuah NSCMF tidak lagi aktif/relevan untuk operational view, mekanisme yang digunakan adalah **Archive**, bukan Delete.

### BR-DEL-004 — Archive Preserves Business History

Archive MUST mempertahankan:

- record data;
- ownership;
- workflow history;
- audit history;
- approval/review history;
- attachment references sesuai retention/security policy.

### BR-DEL-005 — Archive Is Audited

Archive MUST tercatat sebagai event dengan actor dan timestamp.

### BR-DEL-006 — Who May Archive Is Defined in RBAC

Role exact yang dapat menjalankan Archive belum ditetapkan pada Business Rules ini dan harus didefinisikan pada `04_RBAC_Permission_Matrix.md`.

### BR-DEL-007 — Archive Reason Requirement Is TBD

Apakah alasan Archive wajib belum dikonfirmasi.

### BR-DEL-008 — Archived Record Behavior Is Finalized in State Flow

Apakah Archived record dapat di-unarchive, masih dapat diexport, atau menjadi read-only secara total akan difinalisasi pada `05_State_Status_Flow.md`.

---

# PART P — REJECTION AND RETURN SEMANTICS

## 25. Rejection

### BR-REJ-001 — Rejection Is a Business State/Event, Not Deletion

Rejected record tetap ada di sistem dan history.

### BR-REJ-002 — Reviewer and Approver May Reject

Reviewer maupun Approver MAY melakukan Reject sesuai permission dan scope mereka.

### BR-REJ-003 — Rejection Must Be Audited

Reject MUST mencatat actor, timestamp, record, dan resulting workflow state.

### BR-REJ-004 — Reject Reason Requirement Is TBD

Apakah alasan Reject wajib diisi belum dikonfirmasi.

### BR-REJ-005 — Rejected Record Recovery Is TBD

Apakah Rejected record dapat diperbaiki/resubmit atau harus membuat NSCMF baru akan didefinisikan pada State/Status Flow setelah business owner memutuskan.

---

## 26. Return for Revision

### BR-RET-001 — Return Is Different From Reject

Return for Revision berarti record masih berada dalam workflow dan diberikan kesempatan untuk diperbaiki.

Reject adalah action berbeda dan tidak boleh direpresentasikan sebagai Return secara diam-diam.

### BR-RET-002 — Return Must Identify Destination

Workflow Return MUST mengetahui destination actor/stage, misalnya:

- Reviewer → Requester;
- Approver → Reviewer;
- Approver → Requester.

### BR-RET-003 — Return to Requester Enables Editing

Jika destination Return adalah Requester, record kembali menjadi editable bagi eligible requester sesuai State Flow.

### BR-RET-004 — Return Is Audited

Return MUST mencatat actor, timestamp, origin stage, dan destination stage.

### BR-RET-005 — Return Reason Requirement Is TBD

Walaupun reason direkomendasikan untuk traceability, mandatory reason untuk Return belum dikonfirmasi sebagai business invariant.

---

# PART Q — RECORD INTEGRITY AND AUTHORIZATION

## 27. Server-Side Enforcement

### BR-INT-001 — UI Is Not the Authorization Boundary

Business permission dan state restriction MUST tetap divalidasi server-side.

### BR-INT-002 — Direct URL/API Must Respect Rules

User MUST NOT dapat melewati role, scope, ownership, state, atau validation restriction melalui:

- direct URL;
- manipulated record ID;
- direct API call;
- modified frontend payload;
- bulk request;
- hidden UI action invocation.

### BR-INT-003 — State Restriction Overrides Visible Button

Jika sebuah action tidak valid pada current state, request tersebut MUST ditolak walaupun frontend secara salah menampilkan tombolnya.

### BR-INT-004 — Scope Restriction Overrides Role Name

Memiliki nama role tertentu tidak cukup apabila record berada di luar assigned scope actor tersebut.

### BR-INT-005 — Data Changes Must Be Atomic at Business Level

Business action yang gagal MUST NOT meninggalkan record pada kondisi setengah berubah yang terlihat sebagai action sukses.

Technical transaction strategy akan didefinisikan pada System Architecture/API/Database specification.

---

# PART R — HIGH-LEVEL BUSINESS WORKFLOW INVARIANTS

## 28. Mandatory Workflow

### BR-WF-001 — Normal High-Level Sequence

High-level business sequence adalah:

`Draft → Submit → Review → Approval`

Dengan possible business actions:

- Return for Revision;
- Resubmit;
- Reject;
- Cancel sebelum Review;
- Reopen Approved oleh highest role;
- Archive.

Exact state names dan transitions akan menjadi authoritative pada `05_State_Status_Flow.md`.

### BR-WF-002 — Review Cannot Be Silently Skipped

Tidak ada current business rule yang memperbolehkan bypass Review.

### BR-WF-003 — Approval Cannot Be Silently Skipped

Tidak ada current business rule yang memperbolehkan bypass Approval.

### BR-WF-004 — Emergency Does Not Modify Mandatory Sequence

Emergency Change tetap tunduk pada Review dan Approval.

### BR-WF-005 — Revision Has No Fixed Maximum Count

Sistem MUST dapat mendukung revision cycle berkali-kali tanpa kehilangan history.

### BR-WF-006 — Previous Actions Are Historical Facts

Perubahan state berikutnya MUST NOT menghapus fakta bahwa action sebelumnya pernah terjadi.

---

# PART S — DEFAULT ROLE TEMPLATE BEHAVIOR

## 29. Template Role Business Capabilities

Bagian ini adalah **business-level template**, bukan permission matrix teknis final.

### 29.1 Requester Template

Secara default Requester membutuhkan kemampuan bisnis untuk:

- membuat NSCMF;
- memilih Activation atau Change;
- mengedit own Draft;
- mengelola optional attachment pada state editable;
- memilih Auto/Manual number mode;
- Submit own eligible record;
- melihat own records;
- mengedit record yang dikembalikan kepadanya;
- Resubmit;
- Cancel own request sebelum Review;
- Export record yang dapat dilihat.

### 29.2 Reviewer Template

Secara default Reviewer membutuhkan kemampuan bisnis untuk:

- melihat record dalam assigned unit/division scope;
- melakukan Review;
- Forward menuju Approval;
- Return ke Requester;
- Reject;
- melihat workflow/history yang diperlukan untuk review;
- Export record yang dapat dilihat.

### 29.3 Approver Template

Secara default Approver membutuhkan kemampuan bisnis untuk:

- melihat record dalam assigned approval scope;
- Approve;
- Return ke Reviewer;
- Return ke Requester;
- Reject;
- melihat workflow/history yang diperlukan untuk approval;
- Export record yang dapat dilihat.

### 29.4 Protected Superadmin Template

Secara default Superadmin membutuhkan kemampuan bisnis untuk:

- global visibility;
- user/role administration sesuai RBAC final;
- initial/setup configuration;
- seluruh operational permissions yang memang diberikan oleh RBAC;
- Reopen/Revert Approved record dengan mandatory reason;
- protected account guarantees yang dijelaskan pada Part A.

Hak `hard delete NSCMF` **tidak pernah termasuk** dalam Superadmin capability.

---

# PART T — CONFIGURATION BOUNDARIES

## 30. Configurable vs Non-Configurable

### 30.1 Configurable

Item berikut MAY dikonfigurasi melalui sistem sesuai specification lanjutan:

- use template vs manual role setup;
- role names selain protected Superadmin;
- role-permission assignment;
- multi-role assignment;
- reviewer unit/division scope;
- approver scope;
- Auto vs Manual NSCMF number selection.

### 30.2 Non-Configurable Without Business Rule Change

Item berikut MUST NOT bisa dimatikan hanya melalui konfigurasi normal:

- protected Superadmin existence;
- Superadmin cannot be deleted/soft-deleted/downgraded;
- no hard delete NSCMF;
- detailed audit untuk persisted business changes;
- revision history preservation;
- Emergency still requires Review and Approval;
- approved Reopen restricted to highest role and requires reason;
- record visibility enforcement;
- inaccessible records cannot be exported.

---

# PART U — OPEN DECISIONS

## 31. Business Decisions Still TBD

Item berikut sengaja **tidak ditebak** pada dokumen ini:

### Roles / Scope

- [ ] Exact organizational model untuk `unit/division` Reviewer scope.
- [ ] Exact dimension untuk Approver scope.
- [ ] Apakah manual role configuration dapat mengubah template setelah initial setup dan melalui action apa.

### Workflow

- [ ] Exact state setelah Reviewer Return.
- [ ] Exact state setelah Approver Return to Reviewer.
- [ ] Exact state setelah Approver Return to Requester.
- [ ] Exact state setelah Reopen Approved.
- [ ] Apakah Rejected dapat diperbaiki/resubmit atau harus membuat request baru.
- [ ] Apakah Return wajib memiliki reason.
- [ ] Apakah Reject wajib memiliki reason.
- [ ] Apakah Cancel wajib memiliki reason.
- [ ] Apakah Archive wajib memiliki reason.

### Numbering

- [ ] Format resmi Automatic NSCMF Number.
- [ ] Scope uniqueness nomor: global, per tahun, per unit, atau model lain.
- [ ] State ketika nomor menjadi immutable.

### Archive

- [ ] Role yang boleh Archive.
- [ ] Apakah Archive dapat di-unarchive.
- [ ] Apakah Archived record tetap exportable.

### Audit

- [ ] Apakah view/read event wajib dicatat.
- [ ] Apakah export/download event wajib dicatat.
- [ ] Retention period audit log.

### Attachments

- [ ] Allowed file types.
- [ ] Maximum file size.
- [ ] Maximum attachment count.

Open Decision di atas harus diselesaikan pada dokumen yang sesuai atau melalui business confirmation sebelum implementasi fitur yang bergantung padanya dianggap final.

---

# PART V — RULE PRECEDENCE

## 32. Enforcement Precedence

Jika beberapa rule berlaku pada action yang sama, gunakan urutan berikut:

1. **Protected system invariant**
2. **Current record state restriction**
3. **Record visibility/scope restriction**
4. **Permission/RBAC**
5. **Ownership restriction**
6. **Validation rule**
7. **Requested user action**

Contoh:

User mungkin memiliki permission `approve`, tetapi approval tetap ditolak jika record belum memenuhi prerequisite state.

User mungkin memiliki permission `export`, tetapi export tetap ditolak jika record berada di luar visibility scope user.

Superadmin memiliki global visibility, tetapi tetap tidak mendapatkan capability untuk hard delete NSCMF karena no-hard-delete adalah system invariant.

---

# PART W — BUSINESS RULE TRACEABILITY

## 33. Relationship to PRD

Business Rules ini terutama memperjelas requirement PRD berikut:

| PRD Area | Business Rule Coverage |
|---|---|
| Authentication / users | Protected Superadmin, role setup, multi-role |
| Form selection | Activation vs Change classification |
| Draft | Draft editable + fully audited |
| Submission | Submit locks normal editing |
| Review | Forward / Return / Reject |
| Approval | Approve / Return / Reject |
| History | ownership and scoped visibility |
| Export | view implies export |
| Traceability | detailed immutable-style audit history |
| Record lifecycle | cancel, reopen, archive, no hard delete |

Exact mapping ke functional requirement IDs dapat ditambahkan setelah seluruh dokumen 01–06 stabil.

---

# PART X — IMPLEMENTATION GUARDRAILS FOR FUTURE AI/DEVELOPERS

## 34. Rules That Must Not Be Assumed Differently

Developer atau AI implementation agent MUST NOT:

1. menambahkan self-registration tanpa requirement baru;
2. menghilangkan protected Superadmin;
3. membuat Superadmin bisa dihapus/downgrade/soft-delete;
4. menambahkan hard-delete NSCMF;
5. membuat Emergency melewati Review/Approval;
6. membuat Submitted record editable bebas oleh Requester;
7. membatasi revision menjadi satu kali saja;
8. menimpa audit history lama ketika revision terjadi;
9. membuat Reviewer otomatis dapat melihat seluruh record;
10. membuat Approver otomatis dapat melihat seluruh record;
11. membatasi export hanya berdasarkan tombol UI tanpa server-side visibility check;
12. menentukan Activation vs Change hanya dari keyword `Upgrade`;
13. membuat attachment wajib tanpa business rule baru;
14. menetapkan format nomor otomatis berdasarkan tebakan;
15. menghapus Approved history saat record direopen;
16. menganggap role harus mutually exclusive;
17. memaksakan segregation of duty yang saat ini tidak menjadi business rule;
18. menganggap package permission tertentu sebagai business requirement final sebelum Tech Stack Specification.

---

## 35. Business Rule Review Checklist

Sebelum dokumen ini diberi status Approved, business owner sebaiknya memastikan:

- [ ] Template role Superadmin/Requester/Reviewer/Approver sudah sesuai.
- [ ] Pilihan setup Template vs Manual sudah sesuai.
- [ ] Multi-role dan same-user multi-stage action memang diperbolehkan.
- [ ] Draft dapat diedit bebas dan semua perubahan tercatat.
- [ ] Setelah Submit, Requester hanya dapat edit melalui Return/Revision flow.
- [ ] Reviewer boleh Forward, Return, dan Reject.
- [ ] Approver boleh Approve, Return to Reviewer, Return to Requester, dan Reject.
- [ ] Revision boleh berulang tanpa limit dan seluruh cycle dicatat.
- [ ] Approved hanya dapat direopen oleh highest role dengan mandatory reason.
- [ ] Requester dapat Cancel sebelum Review.
- [ ] Requester visibility = own records.
- [ ] Reviewer visibility = assigned unit/division.
- [ ] Approver visibility = assigned scope.
- [ ] Superadmin visibility = all NSCMF.
- [ ] Emergency tetap wajib Review dan Approval.
- [ ] Activation = installation/provisioning context dan Change = maintenance context.
- [ ] Upgrade classification berdasarkan context, bukan keyword.
- [ ] Auto dan Manual numbering keduanya tersedia.
- [ ] Attachment tersedia tetapi optional.
- [ ] Seluruh persisted changes memiliki detailed audit.
- [ ] NSCMF tidak dapat hard delete dan menggunakan Archive.
- [ ] Semua user yang dapat melihat record juga dapat export record tersebut.
- [ ] Protected seeded Superadmin tidak dapat dihapus, downgrade, atau soft-delete.

---

## 36. Next Document

Dokumen berikutnya dalam urutan proyek adalah:

**`03_User_Flow.md`**

User Flow harus menggunakan Business Rules ini untuk memetakan secara eksplisit:

- initial setup flow;
- login;
- dashboard;
- create Activation/Change;
- Draft editing;
- Submit;
- Review success;
- Return for Revision;
- repeated revision/resubmission;
- Reject;
- Approval;
- Approver return paths;
- Cancel before Review;
- History/view/export;
- Approved Reopen oleh Superadmin;
- Archive.

State name final yang masih TBD tidak boleh dibuat seolah-olah sudah confirmed. User Flow dapat menggunakan semantic action terlebih dahulu sampai `05_State_Status_Flow.md` difinalisasi.
