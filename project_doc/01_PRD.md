# Product Requirements Document (PRD)

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PRD-001  
> **Document Order:** 01 / 20  
> **Status:** Draft for Business Review  
> **Repository:** `rezkym/nscmf_velo`  
> **Primary Business Reference:** NSCMF Form 3.0 (Excel)  
> **Product Flow Reference:** NSCMF FigJam proposal  
> **Last Updated:** 2026-08-21

---

## 1. Purpose of This Document

Dokumen ini mendefinisikan **produk apa yang akan dibangun**, masalah bisnis yang ingin diselesaikan, siapa penggunanya, ruang lingkup produk, fitur yang harus tersedia, batasan MVP, serta acceptance criteria pada level produk.

PRD ini **belum dimaksudkan untuk menjadi dokumen teknis implementasi**. Detail seperti business rules yang otoritatif, permission matrix, state machine, validation rules, UI specification, teknologi, database schema, API contract, project structure, security implementation, dan deployment akan ditetapkan pada dokumen-dokumen berikutnya sesuai urutan dokumentasi proyek.

Urutan dokumentasi proyek yang disepakati adalah:

1. **PRD** — menentukan produk yang dibuat.
2. **Business Rules** — menentukan aturan bisnis yang tidak boleh dilanggar.
3. **User Flow** — menentukan aktivitas user dari awal sampai akhir.
4. **RBAC / Permission Matrix** — menentukan siapa boleh melakukan apa.
5. **State / Status Flow** — menentukan lifecycle setiap proses/data.
6. **Validation Rules** — menentukan data/input yang dianggap valid.
7. **UI/UX Specification** — menentukan bagaimana user berinteraksi dengan fitur.
8. **Tech Stack Specification** — menentukan teknologi yang digunakan.
9. **System Architecture** — menentukan bagaimana teknologi disusun.
10. **Security Rules** — menentukan batas keamanan sejak awal desain.
11. **ERD / Database Schema** — membentuk database berdasarkan requirement.
12. **API Contract** — mendefinisikan komunikasi frontend dan backend.
13. **Project Structure** — menentukan organisasi source code.
14. **Environment Specification** — menentukan local/dev/staging/prod.
15. **Coding Rules / AGENTS.md** — menjadikan keputusan proyek sebagai aturan kerja AI/developer.
16. **Testing Specification** — menentukan bagaimana requirement diverifikasi.
17. **Seed / Dummy Data Specification** — menyiapkan data development/testing.
18. **Definition of Done** — menentukan kapan sebuah task dinyatakan selesai.
19. **Task / Implementation Plan** — memecah pekerjaan menjadi task yang dapat dieksekusi.
20. **Deployment Architecture** — finalisasi bagaimana aplikasi dijalankan di production.

Jika terdapat konflik antara PRD ini dan dokumen yang lebih spesifik yang dibuat setelahnya, perubahan harus dikembalikan ke PRD apabila konflik tersebut mengubah **scope atau perilaku produk**, bukan hanya detail implementasi.

---

## 2. Executive Summary

NSCMF Digital Form & Workflow System adalah aplikasi web internal untuk mengubah proses NSCMF yang saat ini berorientasi pada **template Excel** menjadi proses digital yang terstruktur, dapat dilacak, dan dapat dicari kembali.

Produk ini tidak bertujuan mengubah makna bisnis dari NSCMF Form 3.0. Excel tetap menjadi referensi awal mengenai informasi yang harus dikumpulkan. Aplikasi akan mengubah informasi tersebut menjadi form web yang terstruktur sehingga user tidak lagi bergantung pada pengelolaan file Excel secara manual untuk membuat, mengirim, meninjau, menyetujui, menyimpan, dan mengekspor dokumen NSCMF.

Pada MVP, aplikasi memiliki dua jenis form utama:

- **NSCMF - Activation**
- **NSCMF - Change**

Alur produk pada level tinggi adalah:

`Login → Dashboard → Create New Form / History → Pilih Jenis Form → Isi Form → Submit → Review → Approval → History → Export`

Fungsi utama aplikasi adalah:

- autentikasi user melalui login;
- dashboard sederhana dengan CTA untuk membuat form baru;
- digitalisasi NSCMF Activation dan Change;
- proses sign-off `Request By → Review By → Approved By`;
- penyimpanan record NSCMF secara terstruktur;
- history untuk melihat kembali record;
- export satu record atau beberapa record sekaligus;
- menjaga data form agar dapat ditelusuri berdasarkan record dan statusnya.

---

## 3. Background

### 3.1 Current Situation

NSCMF saat ini direpresentasikan oleh **NSCMF Form 3.0 dalam format Excel**. Template tersebut memiliki dua flow bisnis utama, yaitu Activation dan Change, beserta informasi operasional dan bagian sign-off.

Penggunaan spreadsheet sebagai media utama mempunyai beberapa konsekuensi yang secara umum dapat muncul dalam proses operasional berbasis file:

- data tersebar dalam banyak file;
- sulit mengetahui record mana yang merupakan record terbaru;
- pencarian histori membutuhkan penelusuran file secara manual;
- format atau isi file dapat menjadi tidak konsisten apabila diedit secara bebas;
- sign-off dan status proses sulit dilihat secara terpusat;
- proses export atau pengumpulan banyak record membutuhkan pekerjaan manual;
- tidak tersedia satu tampilan yang menjadi sumber informasi terpusat mengenai seluruh NSCMF.

Aplikasi ini dibuat untuk memindahkan proses tersebut dari **file-centric workflow** menjadi **record-centric workflow**.

### 3.2 Business Reference

Struktur informasi bisnis bersumber dari NSCMF Form 3.0.

Secara garis besar:

#### NSCMF - Activation

Mencakup kelompok informasi:

- request type;
- service information;
- network / NOC information;
- IP, DNS, routing, bandwidth, dan konfigurasi terkait yang terdapat pada template;
- onsite / customer / POP information;
- sign-off `Request By`, `Review By`, dan `Approved By`.

Request type yang saat ini terlihat pada template meliputi:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

#### NSCMF - Change

Mencakup kelompok informasi:

- request type;
- tujuan atau konteks perubahan;
- identified problem;
- service impact;
- improvement plan;
- KPI;
- execution schedule;
- rollback scenario;
- announcement;
- change result;
- performance;
- status;
- sign-off `Request By`, `Review By`, dan `Approved By`.

Request type yang saat ini terlihat pada template meliputi:

- Maintenance;
- Upgrade;
- Emergency.

Field-level definition akan dipetakan secara penuh pada dokumen **Validation Rules** dan **UI/UX Specification**, sementara aturan hubungan antardata akan ditetapkan pada **Business Rules**.

---

## 4. Product Vision

> Menyediakan satu aplikasi internal yang sederhana untuk membuat, memproses, menyimpan, menelusuri, dan mengekspor NSCMF secara konsisten tanpa mengubah makna bisnis dari template NSCMF yang sudah digunakan.

Produk harus terasa sebagai **pengganti proses pengisian dan pengelolaan file**, bukan sebagai platform workflow generik yang kompleks.

---

## 5. Product Principles

### 5.1 Preserve Business Meaning

Digitalisasi tidak boleh menghilangkan informasi bisnis penting dari NSCMF Form 3.0. Struktur UI boleh dibuat lebih mudah digunakan, tetapi makna data harus tetap dipertahankan.

### 5.2 Simple Before Powerful

MVP harus sederhana. Fitur hanya ditambahkan apabila membantu proses utama NSCMF. Produk tidak boleh berubah menjadi workflow builder atau document management platform yang terlalu luas.

### 5.3 Structured Data Over File Storage

Form harus disimpan sebagai record data terstruktur. File hasil export adalah output dari record tersebut, bukan sumber utama data.

### 5.4 Traceable Process

User harus dapat mengetahui sebuah NSCMF berada pada tahapan apa dan siapa yang melakukan sign-off yang relevan sesuai aturan yang nantinya ditetapkan.

### 5.5 Excel Is a Reference, Not the Future Interface

Tampilan web tidak harus meniru layout spreadsheet secara pixel-perfect. Yang wajib dipertahankan adalah informasi dan konteks bisnisnya.

### 5.6 Clear Separation Between Confirmed and TBD Behavior

Perilaku yang belum disetujui tidak boleh dianggap final hanya karena muncul pada mockup atau diagram. PRD membedakan requirement yang sudah jelas dengan proposal/TBD.

---

## 6. Problem Statement

### 6.1 Primary Problem

Proses NSCMF masih bergantung pada template berbasis file sehingga informasi form, status proses, histori, dan hasil akhir tidak berada dalam satu sistem yang konsisten dan mudah ditelusuri.

### 6.2 Problems to Solve

Produk perlu menyelesaikan kebutuhan berikut:

1. Membuat NSCMF tanpa bergantung pada pembuatan file Excel baru secara manual.
2. Menjaga struktur form agar konsisten dengan NSCMF Form 3.0.
3. Menyediakan proses sign-off digital yang dapat dilacak.
4. Menyimpan seluruh record dalam satu history.
5. Memungkinkan user melihat detail record tanpa membuka banyak file terpisah.
6. Memungkinkan export satu record.
7. Memungkinkan export beberapa record sekaligus.
8. Mengurangi risiko data tidak konsisten akibat penggunaan template/file secara bebas.
9. Memberikan satu sumber informasi mengenai status sebuah NSCMF.

---

## 7. Goals

### G-01 — Digitalize NSCMF Creation

User dapat membuat NSCMF Activation atau Change melalui aplikasi web berdasarkan struktur bisnis NSCMF Form 3.0.

### G-02 — Centralize NSCMF Records

Setiap form yang disimpan melalui aplikasi menjadi record terpusat dan tersedia melalui History sesuai permission user.

### G-03 — Support Digital Sign-off

Aplikasi mendukung alur `Request By → Review By → Approved By` dalam bentuk digital.

### G-04 — Improve Traceability

Status dan informasi sign-off dapat diketahui dari record yang sama tanpa harus memeriksa file secara manual.

### G-05 — Support Single and Bulk Export

User yang memiliki permission dapat mengekspor satu atau beberapa NSCMF.

### G-06 — Keep the Product Operationally Simple

Aplikasi harus dapat digunakan sebagai tool internal tanpa memperkenalkan kompleksitas yang tidak diperlukan untuk proses NSCMF.

---

## 8. Non-Goals for MVP

Kecuali kemudian disetujui sebagai perubahan scope, MVP **tidak ditujukan** untuk:

- menjadi generic form builder;
- menjadi generic BPM/workflow engine;
- menggantikan tool NOC/network management lainnya;
- melakukan provisioning konfigurasi jaringan secara otomatis;
- membuat resource network atau menjalankan perubahan operasional secara otomatis berdasarkan isi form;
- menjadi portal eksternal untuk customer;
- menyediakan self-registration untuk user;
- menyediakan public sharing link tanpa autentikasi;
- menyediakan mobile application native;
- mendefinisikan notification engine kompleks sebelum kebutuhan bisnisnya dikonfirmasi;
- mendefinisikan correction/rejection workflow yang belum disepakati;
- menjadi sistem penyimpanan dokumen umum di luar NSCMF.

Daftar ini dapat berubah setelah Business Rules dan User Flow divalidasi oleh stakeholder.

---

## 9. Product Users and Actors

PRD menggunakan actor konseptual berikut. Permission final belum ditetapkan di dokumen ini dan akan menjadi tanggung jawab **RBAC / Permission Matrix**.

### 9.1 Requester

User yang memulai NSCMF dan mengisi data yang diperlukan.

Kebutuhan utama:

- login;
- membuka dashboard;
- membuat form baru;
- memilih Activation atau Change;
- mengisi form;
- submit form;
- melihat record yang diperbolehkan;
- melihat status;
- melakukan export apabila memiliki permission.

### 9.2 Reviewer

User yang melakukan tahap review terhadap NSCMF yang telah diajukan.

Kebutuhan utama:

- melihat form yang membutuhkan review sesuai permission;
- memeriksa isi form;
- memberikan sign-off tahap review;
- meneruskan form ke tahap approval sesuai business rules.

### 9.3 Approver

User yang melakukan final approval sesuai struktur sign-off NSCMF.

Kebutuhan utama:

- melihat record yang telah melewati review;
- melakukan final approval;
- memastikan identitas approver dan waktu approval tercatat.

### 9.4 System

Aplikasi yang menjalankan fungsi:

- authentication;
- data persistence;
- validation;
- status tracking;
- history;
- export;
- enforcement terhadap permission dan business rules setelah rule tersebut didefinisikan.

### 9.5 Administrator / User Provisioning Actor — TBD

Aplikasi tidak memiliki self-registration pada requirement saat ini. Oleh karena itu akun user harus berasal dari mekanisme provisioning tertentu. Mekanisme tersebut belum ditetapkan dalam PRD ini.

Pilihan seperti admin-created account, import account, directory integration, atau metode lain harus diputuskan pada dokumen lanjutan dan tidak boleh diasumsikan pada tahap ini.

---

## 10. Product Scope — MVP

### 10.1 Confirmed Core Scope

MVP mencakup:

1. Login.
2. Dashboard sederhana.
3. CTA `Create New Form`.
4. Pilihan form `NSCMF - Activation` dan `NSCMF - Change`.
5. Digital form berdasarkan informasi pada NSCMF Form 3.0.
6. Submit form.
7. Sign-off Request / Review / Approval.
8. Penyimpanan record secara terstruktur.
9. History.
10. Melihat detail record dan statusnya.
11. Single export.
12. Multi/bulk export.
13. PDF sebagai format export yang wajib didukung berdasarkan requirement awal.

### 10.2 Proposed but Not Yet Final

Item berikut muncul sebagai desain/usulan produk tetapi harus dikonfirmasi sebelum dianggap mandatory:

- Save Draft;
- dashboard summary / statistics;
- recent activity pada dashboard;
- search pada History;
- filter pada History;
- export Excel sebagai format tambahan;
- correction / return for revision;
- rejection;
- audit log yang lebih detail daripada status/sign-off history;
- notification;
- additional export formats;
- user administration screen.

Item tersebut harus diberi keputusan `IN`, `OUT`, atau `POST-MVP` pada proses refinement.

---

## 11. High-Level Product Flow

Alur konseptual utama:

```text
Login
  |
  v
Dashboard
  |--------------------------|
  |                          |
  v                          v
Create New Form            History
  |                          |
  v                          v
Choose Form Type          View Records
  |                          |
  +--> Activation            +--> View Detail
  |                          +--> Export
  +--> Change                +--> Bulk Export
  |
  v
Fill Digital Form
  |
  v
Submit
  |
  v
Review
  |
  v
Approval
  |
  v
Stored / Traceable in History
```

Flow koreksi, rejection, resubmission, atau reopening belum menjadi authoritative flow pada PRD ini.

---

## 12. Functional Requirements

Requirement ID pada PRD digunakan sebagai referensi silang untuk dokumen Business Rules, UI/UX, API, Testing, dan Implementation Plan.

### 12.1 Authentication

#### FR-AUTH-001 — Login

Aplikasi harus menyediakan halaman login untuk user yang memiliki akun valid.

**Acceptance intent:** user yang berhasil diautentikasi dapat masuk ke aplikasi dan user yang tidak terautentikasi tidak dapat mengakses halaman internal.

#### FR-AUTH-002 — No Self-Registration

MVP tidak menyediakan self-registration bagi user.

#### FR-AUTH-003 — Authenticated Session

Setelah login berhasil, user harus memiliki session/authentication context yang memungkinkan aplikasi mengidentifikasi user selama penggunaan aplikasi.

Detail session lifetime, login attempt policy, password policy, SSO, dan security control akan ditentukan pada Security Rules dan Tech Stack Specification.

#### FR-AUTH-004 — Logout

Aplikasi harus menyediakan kemampuan logout untuk mengakhiri session user.

---

### 12.2 Dashboard

#### FR-DASH-001 — Dashboard as Landing Page

Setelah login berhasil, user diarahkan ke Dashboard.

#### FR-DASH-002 — Create New Form CTA

Dashboard harus memiliki CTA yang jelas untuk memulai pembuatan NSCMF baru.

#### FR-DASH-003 — History Access

User harus dapat membuka History dari area navigasi aplikasi tanpa harus membuat form baru terlebih dahulu.

#### FR-DASH-004 — Minimal Information Architecture

Dashboard harus tetap sederhana dan berfungsi terutama sebagai entry point ke `Create New Form` dan `History`.

Dashboard metrics atau recent activity adalah enhancement yang belum dianggap wajib sampai dikonfirmasi.

---

### 12.3 Form Selection

#### FR-FORM-001 — Choose Form Type

Ketika membuat form baru, user harus memilih salah satu jenis:

- NSCMF - Activation;
- NSCMF - Change.

#### FR-FORM-002 — Form Type Controls Structure

Form yang ditampilkan setelah pemilihan jenis harus menggunakan struktur yang sesuai dengan jenis form tersebut.

User tidak boleh mendapatkan field Change ketika sedang membuat Activation kecuali field tersebut memang didefinisikan sebagai shared field pada business rule final, dan sebaliknya.

---

### 12.4 NSCMF - Activation

#### FR-ACT-001 — Activation Request Types

Form Activation harus dapat merepresentasikan request type yang terdapat pada template bisnis saat ini:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

Definisi kapan masing-masing pilihan digunakan akan dijelaskan pada Business Rules.

#### FR-ACT-002 — Service Information Section

Form Activation harus memiliki area untuk seluruh Service Information yang diwajibkan oleh NSCMF Form 3.0.

#### FR-ACT-003 — Network / NOC Information

Form Activation harus memiliki area terstruktur untuk informasi Network/NOC dan konfigurasi terkait yang terdapat pada template, termasuk kategori seperti IP, DNS, routing, bandwidth, serta field lain yang benar-benar terdapat pada sumber form.

PRD tidak menetapkan tipe data atau mandatory field secara individual; hal tersebut akan ditentukan pada Validation Rules.

#### FR-ACT-004 — Onsite / Customer / POP Information

Form Activation harus dapat merepresentasikan informasi onsite, customer, POP, dan kelompok informasi operasional terkait yang terdapat pada template.

#### FR-ACT-005 — Activation Sign-off

Record Activation harus dapat melewati sign-off pada konsep:

`Request By → Review By → Approved By`.

Exact role mapping akan didefinisikan pada RBAC / Permission Matrix dan Business Rules.

---

### 12.5 NSCMF - Change

#### FR-CHG-001 — Change Request Types

Form Change harus dapat merepresentasikan request type yang terdapat pada template bisnis saat ini:

- Maintenance;
- Upgrade;
- Emergency.

#### FR-CHG-002 — Change Context

Form Change harus dapat menyimpan tujuan/konteks perubahan dan identified problem sesuai field pada template.

#### FR-CHG-003 — Service Impact

Form Change harus dapat merepresentasikan service impact sesuai kebutuhan template.

#### FR-CHG-004 — Improvement Plan and KPI

Form Change harus dapat menyimpan improvement plan dan KPI yang terdapat pada template.

#### FR-CHG-005 — Execution Plan

Form Change harus dapat menyimpan informasi execution schedule dan informasi execution-related lainnya yang terdapat pada template.

#### FR-CHG-006 — Rollback Scenario

Form Change harus dapat menyimpan rollback scenario sesuai kebutuhan bisnis pada template.

#### FR-CHG-007 — Announcement

Form Change harus dapat menyimpan informasi announcement apabila field tersebut diperlukan oleh struktur template.

#### FR-CHG-008 — Change Result and Performance

Form Change harus dapat menyimpan hasil perubahan, performance, dan status/result-related information yang terdapat pada template.

#### FR-CHG-009 — Change Sign-off

Record Change harus dapat melewati sign-off:

`Request By → Review By → Approved By`.

---

### 12.6 Form Data Entry

#### FR-ENTRY-001 — Sectioned Web Form

Form harus dibagi ke dalam kelompok/section logis agar user tidak perlu berinteraksi dengan satu lembar spreadsheet besar.

#### FR-ENTRY-002 — Preserve Field Meaning

Label, pilihan, dan konteks field harus mempertahankan makna bisnis dari template sumber.

#### FR-ENTRY-003 — Validation Feedback

Ketika input tidak memenuhi validation rule, aplikasi harus memberikan feedback yang dapat dipahami user dan menunjukkan field yang harus diperbaiki.

Exact rule akan ditetapkan pada Validation Rules.

#### FR-ENTRY-004 — Prevent Invalid Submission

Aplikasi tidak boleh menerima submission yang melanggar mandatory validation rules yang nantinya didefinisikan.

#### FR-ENTRY-005 — Save Draft — TBD

Kemampuan menyimpan form sebelum submit adalah fitur yang diusulkan namun belum final.

Apabila disetujui, perilaku draft harus didefinisikan dalam State / Status Flow dan Business Rules sebelum implementasi.

---

### 12.7 Submission

#### FR-SUB-001 — Submit Completed Form

Requester harus dapat mengirimkan form yang memenuhi validation rules untuk masuk ke tahap proses berikutnya.

#### FR-SUB-002 — Persist Submission

Submission harus menghasilkan record persistent di sistem.

#### FR-SUB-003 — Submission Identity

Sistem harus mengetahui siapa user yang melakukan submission dan kapan submission dilakukan.

#### FR-SUB-004 — Immutable vs Editable After Submit — TBD

Kebijakan apakah field masih dapat diedit setelah submission belum ditentukan pada PRD. Hal ini harus menjadi Business Rule dan State Flow yang eksplisit.

---

### 12.8 Review

#### FR-REV-001 — Review Eligible Form

User yang memiliki permission sebagai reviewer harus dapat membuka form yang memenuhi kondisi untuk direview.

#### FR-REV-002 — View Complete Relevant Data

Reviewer harus dapat melihat data yang diperlukan untuk melakukan review.

#### FR-REV-003 — Record Review Sign-off

Ketika review diselesaikan sesuai business rule, sistem harus menyimpan identitas reviewer dan waktu tindakan tersebut.

#### FR-REV-004 — Forward to Approval

Form yang berhasil melewati tahap review harus dapat masuk ke tahap approval.

#### FR-REV-005 — Correction / Return Behavior — TBD

Mekanisme mengembalikan form ke requester untuk koreksi belum menjadi requirement final dan harus ditetapkan pada Business Rules serta State Flow.

---

### 12.9 Approval

#### FR-APR-001 — Approve Eligible Form

User yang memiliki permission approval harus dapat melakukan approval terhadap form yang sudah memenuhi prasyarat approval.

#### FR-APR-002 — Record Approver

Sistem harus merekam identitas approver dan waktu approval.

#### FR-APR-003 — Prevent Unauthorized Approval

User yang tidak memiliki permission atau record yang belum memenuhi kondisi approval tidak boleh dapat melakukan approval.

Detail kondisi merupakan tanggung jawab Business Rules, RBAC, dan State Flow.

#### FR-APR-004 — Rejection Behavior — TBD

Rejection belum didefinisikan secara final.

---

### 12.10 History

#### FR-HIS-001 — Centralized History

Aplikasi harus menyediakan halaman History sebagai daftar record NSCMF yang dapat dilihat user berdasarkan permission.

#### FR-HIS-002 — Record Type Visibility

History harus membedakan sekurang-kurangnya apakah record merupakan Activation atau Change.

#### FR-HIS-003 — Current Status Visibility

History atau halaman detail harus memperlihatkan current status yang relevan untuk mengetahui posisi record pada proses.

#### FR-HIS-004 — Open Record Detail

User harus dapat membuka detail record yang diperbolehkan tanpa bergantung pada file Excel asli.

#### FR-HIS-005 — Persistent Retrieval

Record yang telah dibuat harus tetap dapat ditemukan kembali selama belum melewati retention/deletion policy yang akan didefinisikan kemudian.

#### FR-HIS-006 — Search — Proposed

Kemampuan search merupakan enhancement yang direkomendasikan agar History tetap usable ketika record bertambah, tetapi perlu dikonfirmasi sebagai MVP requirement.

#### FR-HIS-007 — Filter — Proposed

Kemampuan filter berdasarkan atribut seperti type/status/date adalah proposal usability dan belum dianggap business rule final.

---

### 12.11 Export

#### FR-EXP-001 — Single Export

User yang memiliki permission harus dapat mengekspor satu record NSCMF.

#### FR-EXP-002 — Bulk Export

User yang memiliki permission harus dapat memilih beberapa record dan menjalankan export dalam satu operasi.

#### FR-EXP-003 — PDF Support

PDF merupakan format export minimum yang harus tersedia berdasarkan requirement saat ini.

#### FR-EXP-004 — Additional Format — TBD

Flow awal menyebut `PDF/etc`. Board proposal saat ini menggunakan PDF/Excel. Oleh karena itu **Excel dianggap proposed secondary export format** sampai dikonfirmasi eksplisit sebagai requirement bisnis.

#### FR-EXP-005 — Export Reflects Stored Record

Isi export harus berasal dari data record yang tersimpan dalam sistem dan tidak boleh menghasilkan nilai bisnis yang berbeda dari data yang user lihat pada detail record.

#### FR-EXP-006 — Export Sign-off Information

Apabila record sudah memiliki Request/Review/Approval sign-off, hasil export harus dapat menampilkan informasi sign-off yang diwajibkan oleh template/output specification.

Exact layout export akan ditentukan pada UI/UX atau export specification lanjutan.

#### FR-EXP-007 — Bulk Packaging — TBD

Mekanisme teknis bulk export, misalnya satu file gabungan atau kumpulan file terpisah, belum ditentukan oleh PRD.

---

### 12.12 Record Traceability

#### FR-TRC-001 — Created By

Sistem harus dapat mengasosiasikan sebuah record dengan user yang membuat/mengajukannya sesuai model bisnis final.

#### FR-TRC-002 — Relevant Timestamps

Sistem harus menyimpan timestamp yang diperlukan untuk merekonstruksi milestone utama proses seperti submission, review, dan approval.

#### FR-TRC-003 — Status History / Audit Depth — TBD

Minimal current state dan sign-off harus dapat diketahui. Apakah seluruh perubahan field dan seluruh aksi harus disimpan sebagai immutable audit log akan ditentukan pada Business Rules dan Security Rules.

---

## 13. Conceptual Information Model

Bagian ini **bukan ERD**. Tujuannya hanya mendefinisikan objek bisnis utama yang harus ada secara konseptual.

### 13.1 User

Merepresentasikan individu yang login dan melakukan aksi di aplikasi.

### 13.2 NSCMF Record

Representasi satu form NSCMF yang dibuat melalui sistem.

Minimal mempunyai konsep:

- unique identity;
- form type;
- request subtype;
- owner/requester context;
- current status;
- created time;
- submitted time jika sudah submit;
- relevant form data;
- review sign-off jika ada;
- approval sign-off jika ada.

### 13.3 Activation Data

Data khusus yang berasal dari NSCMF - Activation.

### 13.4 Change Data

Data khusus yang berasal dari NSCMF - Change.

### 13.5 Sign-off / Action Record

Konsep yang merepresentasikan tindakan Request, Review, atau Approval. Bentuk database final ditentukan kemudian.

### 13.6 Export

Export adalah output yang dihasilkan dari NSCMF Record, bukan sumber data utama.

---

## 14. Product Status Model — Non-Authoritative Preview

State machine final **belum didefinisikan di PRD** karena akan dibuat pada dokumen nomor 5, yaitu State / Status Flow.

Namun untuk menjelaskan kebutuhan produk, proses saat ini setidaknya memiliki konsep tahap:

- form being prepared;
- submitted;
- reviewed;
- approved.

`Draft` saat ini masih proposal.

`Rejected`, `Returned for Revision`, `Cancelled`, `Completed`, atau status lain tidak boleh dianggap ada sampai Business Rules dan State Flow menetapkannya.

---

## 15. High-Level Business Constraints

Bagian ini hanya memberi boundary pada produk. Business Rules yang lengkap akan berada pada dokumen berikutnya.

### BR-PREVIEW-001

Activation dan Change adalah dua jenis NSCMF yang berbeda dan aplikasi harus menjaga field/context masing-masing.

### BR-PREVIEW-002

Review dan approval tidak boleh dilakukan oleh user yang tidak memiliki permission yang sesuai.

### BR-PREVIEW-003

Form tidak boleh dinyatakan melewati suatu tahap apabila prasyarat tahap tersebut belum terpenuhi.

### BR-PREVIEW-004

Export tidak boleh mengubah isi record bisnis.

### BR-PREVIEW-005

Field wajib harus lolos validation sebelum aksi yang membutuhkan kelengkapan form dapat dilakukan.

Semua rule di atas harus dipindahkan/diperinci pada dokumen Business Rules sebelum dianggap authoritative.

---

## 16. UX Requirements at Product Level

Detail UI akan berada pada UI/UX Specification, namun PRD menetapkan experience berikut:

### UX-001 — Low Learning Curve

User yang sudah familiar dengan NSCMF Excel harus dapat mengenali informasi yang diminta pada versi web tanpa mempelajari domain bisnis dari nol.

### UX-002 — Clear Form Type

User harus selalu dapat mengetahui apakah sedang bekerja pada Activation atau Change.

### UX-003 — Clear Progress Context

User harus dapat mengetahui apakah record masih dalam proses input, sudah dikirim, direview, atau disetujui sesuai state final.

### UX-004 — Clear Error Feedback

Kesalahan input harus ditampilkan dekat dengan konteks data yang salah dan tidak hanya dalam pesan error generik.

### UX-005 — Clear Primary Actions

Action seperti Create New Form, Submit, Review, Approve, History, dan Export harus mudah ditemukan sesuai hak akses user.

### UX-006 — Avoid Spreadsheet-like Overload

Walaupun sumber berasal dari Excel, UI web sebaiknya membagi data menjadi section yang dapat dipahami, bukan menampilkan grid spreadsheet besar jika tidak diperlukan.

---

## 17. Product-Level Non-Functional Requirements

Detail teknis dan security control tidak ditetapkan di PRD, tetapi produk harus memenuhi intent berikut.

### NFR-001 — Reliability

Data yang sudah berhasil disimpan tidak boleh hilang karena navigasi normal user.

### NFR-002 — Data Consistency

History, detail form, dan export harus merepresentasikan record yang sama secara konsisten.

### NFR-003 — Authorization

Server-side behavior nantinya harus memastikan user hanya dapat melakukan aksi yang diizinkan. UI hiding saja tidak cukup sebagai security boundary.

### NFR-004 — Usability

Form harus usable pada desktop browser sebagai penggunaan utama internal.

### NFR-005 — Maintainability

Produk harus cukup sederhana untuk dipelihara oleh tim internal tanpa memerlukan arsitektur distributed system yang tidak diperlukan oleh scope.

### NFR-006 — Traceability

Aksi bisnis penting seperti submission, review, dan approval harus dapat ditelusuri ke user dan waktu yang relevan.

### NFR-007 — Export Integrity

Output export tidak boleh mengandung data yang tidak sesuai dengan source record.

### NFR-008 — Performance Target — TBD

Target response time, jumlah concurrent user, volume record, dan ukuran export belum diberikan. Angka final harus ditetapkan sebelum performance testing.

### NFR-009 — Availability Target — TBD

SLA/availability target belum ditentukan.

### NFR-010 — Data Retention — TBD

Lama penyimpanan NSCMF, archive policy, dan deletion policy belum ditentukan.

---

## 18. Success Criteria

Produk dianggap memenuhi tujuan awal apabila stakeholder dapat menjalankan skenario berikut tanpa menggunakan file Excel sebagai media proses utama:

1. User login.
2. User membuka Dashboard.
3. User membuat NSCMF baru.
4. User memilih Activation atau Change.
5. User mengisi informasi sesuai template bisnis.
6. User submit form yang valid.
7. Reviewer dapat melakukan review sesuai haknya.
8. Approver dapat melakukan approval sesuai haknya.
9. Record tersimpan dan dapat ditemukan kembali.
10. Current status/sign-off dapat diketahui.
11. User yang berhak dapat melakukan single export.
12. User yang berhak dapat melakukan bulk export.
13. Export merepresentasikan data yang sama dengan record pada aplikasi.

---

## 19. Product Metrics

Belum ada target angka bisnis yang disepakati. Namun setelah aplikasi tersedia, indikator berikut dapat digunakan:

| Metric | Purpose | Target |
|---|---|---|
| Digital NSCMF adoption rate | Mengukur seberapa banyak NSCMF diproses melalui aplikasi | TBD |
| Successful form submission rate | Menilai apakah form/validation dapat digunakan dengan baik | TBD |
| Median time to retrieve an old NSCMF | Mengukur perbaikan kemampuan pencarian dibanding proses file | TBD |
| Export success rate | Menilai reliability output | TBD |
| Average processing time from submit to approval | Melihat efisiensi workflow | TBD |
| Percentage of records with complete sign-off metadata | Mengukur traceability | TBD |
| Number of duplicate/manual files required outside system | Mengukur keberhasilan pengurangan file-centric process | Target arah: menurun; angka TBD |

Metric dan target final harus dikonfirmasi bersama stakeholder bisnis.

---

## 20. Assumptions

PRD dibuat dengan asumsi sementara berikut:

1. Aplikasi adalah aplikasi internal.
2. Primary usage adalah desktop web browser.
3. User harus login sebelum menggunakan fitur internal.
4. Tidak ada self-registration pada MVP.
5. NSCMF Form 3.0 adalah referensi bisnis untuk data yang didigitalisasi.
6. Activation dan Change tetap menjadi dua form utama.
7. Sign-off Request, Review, dan Approval harus dipertahankan.
8. History merupakan sumber utama untuk menemukan record yang sudah tersimpan.
9. PDF merupakan minimum export format.
10. Exact role mapping, correction/rejection flow, field-level validation, dan permission detail belum final.

Apabila salah satu asumsi berubah, PRD harus direview kembali untuk mengetahui dampaknya terhadap scope.

---

## 21. Dependencies

### 21.1 Business Dependency

- Final review terhadap NSCMF Form 3.0.
- Konfirmasi siapa Requester, Reviewer, dan Approver untuk masing-masing kondisi.
- Konfirmasi correction/rejection behavior.
- Konfirmasi apakah Save Draft diperlukan.
- Konfirmasi format export selain PDF.
- Konfirmasi retention dan audit requirement.

### 21.2 Documentation Dependency

PRD perlu diteruskan dengan dokumen berikut sebelum implementation plan dianggap final:

- Business Rules;
- User Flow;
- RBAC / Permission Matrix;
- State / Status Flow;
- Validation Rules;
- UI/UX Specification;
- Tech Stack Specification;
- System Architecture;
- Security Rules;
- ERD;
- API Contract.

---

## 22. Risks

### RISK-001 — Excel Ambiguity

Beberapa bagian spreadsheet dapat mengandalkan visual layout atau kebiasaan operasional yang tidak terdokumentasi eksplisit.

**Mitigation:** setiap field harus dipetakan dan divalidasi bersama business owner sebelum Validation Rules dianggap selesai.

### RISK-002 — Unclear Approval Rules

Sign-off terlihat pada template, tetapi exact permission, segregation of duty, dan exception behavior belum didefinisikan.

**Mitigation:** Business Rules dan RBAC harus selesai sebelum workflow diimplementasikan penuh.

### RISK-003 — Hidden Manual Process

Ada kemungkinan pekerjaan nyata memiliki langkah tambahan yang tidak terlihat pada form Excel.

**Mitigation:** validasi User Flow dengan user operasional sebelum implementation plan.

### RISK-004 — Scope Expansion

Karena aplikasi menyentuh form, workflow, history, dan export, scope dapat berkembang menjadi document management/workflow platform umum.

**Mitigation:** gunakan Non-Goals dan MVP Scope sebagai boundary.

### RISK-005 — Premature Technical Decisions

Keputusan implementation detail yang dibuat sebelum business rule stabil dapat menyebabkan rework.

**Mitigation:** ikuti urutan dokumentasi 1–20 yang telah disepakati.

### RISK-006 — Export Becomes a Second Source of Truth

User dapat kembali mengedit hasil export dan memperlakukannya sebagai data utama.

**Mitigation:** aplikasi tetap menjadi source record; export diperlakukan sebagai output/snapshot.

---

## 23. Open Questions / Decisions Required

Item berikut harus mendapatkan keputusan sebelum spesifikasi downstream selesai:

### Product / Business

- [ ] Apakah `Save Draft` termasuk MVP?
- [ ] Apakah reviewer dapat mengembalikan form untuk revisi?
- [ ] Apakah reviewer dapat reject?
- [ ] Apakah approver dapat reject atau return?
- [ ] Apakah record Approved masih dapat diedit?
- [ ] Apakah record dapat dibatalkan/cancelled?
- [ ] Apakah ada kondisi bypass review/approval tertentu?
- [ ] Apakah requester hanya dapat melihat record miliknya atau ada visibility berdasarkan unit/divisi?
- [ ] Siapa yang boleh melihat seluruh History?
- [ ] Apakah dashboard memerlukan metrics atau hanya navigation/CTA?
- [ ] Apakah search/filter wajib di MVP?

### User / Permission

- [ ] Exact mapping role `Request By`.
- [ ] Exact mapping role `Review By`.
- [ ] Exact mapping role `Approved By`.
- [ ] Apakah satu user dapat memiliki lebih dari satu role?
- [ ] Bagaimana user account dibuat karena self-registration tidak tersedia?

### Form

- [ ] Final inventory seluruh field Activation.
- [ ] Final inventory seluruh field Change.
- [ ] Field mana yang mandatory?
- [ ] Field mana yang conditional berdasarkan request subtype?
- [ ] Apakah attachment dibutuhkan?
- [ ] Apakah ada numbering format resmi untuk NSCMF record?

### Export

- [ ] Selain PDF, apakah Excel wajib?
- [ ] Apakah bulk export menghasilkan ZIP, combined PDF, atau opsi lainnya?
- [ ] Apakah hasil export harus mempertahankan visual layout Excel lama?
- [ ] Apakah nama reviewer/approver dan timestamp wajib tampil pada export?

### Audit / Retention

- [ ] Apakah semua perubahan field harus memiliki audit trail?
- [ ] Berapa lama record harus disimpan?
- [ ] Apakah deletion diperbolehkan?
- [ ] Siapa yang boleh melakukan archive/delete jika ada?

### Notification

- [ ] Apakah requester/reviewer/approver membutuhkan in-app atau email notification?

Open question tidak boleh diselesaikan dengan asumsi diam-diam pada implementasi. Keputusannya harus masuk ke dokumen downstream yang relevan.

---

## 24. Acceptance Criteria — MVP Product Level

MVP dapat dinilai sesuai PRD apabila seluruh kriteria berikut terpenuhi atau secara eksplisit dipindahkan keluar scope oleh stakeholder:

### Authentication

- [ ] User valid dapat login.
- [ ] User tidak terautentikasi tidak dapat mengakses halaman internal.
- [ ] Tidak tersedia self-registration.
- [ ] User dapat logout.

### Dashboard

- [ ] Setelah login user masuk ke dashboard.
- [ ] Dashboard memiliki CTA Create New Form.
- [ ] History dapat diakses dari navigasi aplikasi.

### Form Creation

- [ ] User dapat memilih Activation.
- [ ] User dapat memilih Change.
- [ ] Form Activation merepresentasikan informasi bisnis Activation dari template.
- [ ] Form Change merepresentasikan informasi bisnis Change dari template.
- [ ] Invalid mandatory input tidak dapat disubmit setelah Validation Rules final diterapkan.

### Workflow

- [ ] Form dapat disubmit.
- [ ] Submission tersimpan sebagai record.
- [ ] Reviewer yang berhak dapat melakukan review.
- [ ] Approver yang berhak dapat melakukan approval.
- [ ] Identitas dan waktu sign-off penting tersimpan.
- [ ] Unauthorized user tidak dapat menjalankan action yang dilindungi.

### History

- [ ] Record yang tersimpan dapat ditemukan melalui History sesuai permission.
- [ ] User dapat membuka detail record.
- [ ] Jenis form dapat diketahui.
- [ ] Status/sign-off relevant dapat diketahui.

### Export

- [ ] Single PDF export berfungsi.
- [ ] Multi/bulk export berfungsi.
- [ ] Data hasil export konsisten dengan record tersimpan.
- [ ] Sign-off yang diwajibkan tampil dengan benar sesuai specification final.

### Traceability

- [ ] Created/submitted/reviewed/approved action yang relevan dapat dihubungkan ke user dan timestamp yang sesuai requirement final.

---

## 25. Post-MVP Candidates

Daftar berikut bukan komitmen scope dan hanya candidate apabila business value-nya terbukti:

- advanced dashboard analytics;
- advanced search and saved filters;
- notifications;
- configurable workflow;
- richer audit viewer;
- advanced bulk operations;
- additional export formats;
- integration dengan corporate identity/SSO;
- integration dengan system lain;
- automated reporting;
- record archival management.

Tidak ada item Post-MVP yang boleh menghalangi MVP kecuali stakeholder memindahkannya menjadi requirement resmi.

---

## 26. Requirement Traceability Strategy

Dokumen lanjutan sebaiknya mereferensikan ID PRD agar keputusan tetap traceable.

Contoh:

- Business Rule `BR-APR-003` dapat menyatakan kondisi spesifik untuk memenuhi `FR-APR-001`.
- Permission `RBAC-REV-002` dapat mendefinisikan siapa yang dapat menjalankan `FR-REV-003`.
- Validation Rule `VAL-ACT-010` dapat mendefinisikan mandatory field yang mendukung `FR-ENTRY-004`.
- API `POST /...` nantinya dapat mereferensikan functional requirement yang dilayaninya.
- Test Case `TC-APR-001` dapat memverifikasi `FR-APR-003`.

Tujuannya adalah mencegah implementasi yang tidak memiliki requirement asal serta mencegah requirement yang tidak memiliki test.

---

## 27. Source of Truth and Document Precedence

Untuk menjaga proyek tetap konsisten:

1. **PRD** menjadi source of truth untuk tujuan, scope, dan functional product requirement.
2. **Business Rules** menjadi source of truth untuk aturan bisnis.
3. **User Flow** menjadi source of truth untuk urutan interaksi user.
4. **RBAC** menjadi source of truth permission.
5. **State / Status Flow** menjadi source of truth lifecycle.
6. **Validation Rules** menjadi source of truth validitas input.
7. **UI/UX Specification** menjadi source of truth interaction/display behavior.
8. Dokumen teknis setelahnya menjadi source of truth implementasi sesuai domain masing-masing.
9. **NSCMF Form 3.0** tetap menjadi referensi domain untuk field yang sedang didigitalisasi sampai seluruh mapping bisnisnya telah ditransfer ke dokumentasi proyek.

Jika implementasi berbeda dari dokumen karena requirement berubah, dokumentasi harus diperbarui; perubahan tidak boleh hanya hidup di source code.

---

## 28. PRD Review Checklist

Sebelum PRD berstatus `Approved`, stakeholder sebaiknya memastikan:

- [ ] Product vision benar.
- [ ] Dua form utama Activation dan Change sudah benar.
- [ ] Scope MVP sudah benar.
- [ ] Non-goals tidak menghilangkan kebutuhan bisnis penting.
- [ ] Request → Review → Approval benar sebagai high-level sign-off.
- [ ] History dan export sesuai kebutuhan.
- [ ] Semua proposed/TBD item sudah dikenali dan tidak dianggap final diam-diam.
- [ ] Open Questions sudah memiliki owner untuk dijawab.
- [ ] Tidak ada field atau proses penting pada NSCMF Form 3.0 yang terlewat pada conceptual scope.

---

## 29. Approval Status

| Role | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Product / Business Owner | TBD | Pending | — | — |
| Operational Representative | TBD | Pending | — | — |
| Technical Representative | TBD | Pending | — | — |

> Dokumen tetap berstatus **Draft for Business Review** sampai keputusan produk dan open questions utama divalidasi.

---

## 30. Next Document

Setelah PRD direview, dokumen berikutnya adalah:

**`02_Business_Rules.md`**

Tujuannya adalah mengubah requirement produk yang masih high-level menjadi aturan bisnis yang tegas, termasuk:

- siapa dapat memulai masing-masing jenis request;
- kondisi submission;
- urutan review dan approval;
- kondisi edit setelah submission;
- correction/rejection/resubmission;
- ownership dan visibility;
- aturan sign-off;
- aturan perubahan status;
- aturan export;
- exception dan edge case bisnis.

Business Rules tidak boleh dibuat dengan mengasumsikan jawaban atas seluruh TBD di PRD. Open Questions harus dikonfirmasi terlebih dahulu atau ditandai eksplisit sebagai unresolved rule.
