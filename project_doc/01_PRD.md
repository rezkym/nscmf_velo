# Product Requirements Document (PRD)

## NSCMF Digital Form & Workflow System

> **Document ID:** NSCMF-PRD-001  
> **Document Order:** 01 / 20  
> **Status:** Draft — Synchronized with confirmed Business Rules / User Flow decisions  
> **Repository:** `rezkym/nscmf_velo`  
> **Primary Business Reference:** NSCMF Form 3.0 (Excel)  
> **Product Flow Reference:** NSCMF FigJam proposal  
> **Last Updated:** 2026-08-21

---

## 1. Purpose

PRD ini mendefinisikan produk yang dibangun, masalah yang diselesaikan, user utama, scope, functional requirements, product boundaries, dan acceptance intent pada level produk.

Dokumen ini bukan source of truth untuk permission detail, state machine, validation field, UI behavior detail, database, API, security implementation, maupun deployment. Detail tersebut dibuat bertahap pada dokumen 02–20.

Urutan dokumentasi proyek:

1. PRD
2. Business Rules
3. User Flow
4. RBAC / Permission Matrix
5. State / Status Flow
6. Validation Rules
7. UI/UX Specification
8. Tech Stack Specification
9. System Architecture
10. Security Rules
11. ERD / Database Schema
12. API Contract
13. Project Structure
14. Environment Specification
15. Coding Rules / AGENTS.md
16. Testing Specification
17. Seed / Dummy Data Specification
18. Definition of Done
19. Task / Implementation Plan
20. Deployment Architecture

---

## 2. Executive Summary

NSCMF Digital Form & Workflow System adalah aplikasi web internal untuk mengganti proses NSCMF yang berbasis file Excel menjadi record digital yang terstruktur, traceable, dapat direview, di-approve, dicari kembali, dan diekspor.

Aplikasi mempertahankan makna bisnis dari NSCMF Form 3.0 tetapi tidak harus menyalin layout spreadsheet secara pixel-perfect.

Dua form family utama:

- **NSCMF - Activation** — konteks instalasi / provisioning;
- **NSCMF - Change** — konteks maintenance / perubahan pada layanan atau environment yang sudah berjalan.

Core product journey:

`Login → Dashboard → Create New Form → Pilih Form Family/Subtype → Draft → Submit → Review → Approval → History / Export`

Flow juga mendukung:

- autosave dan Save Draft;
- Cancel pada Draft;
- Return for Revision;
- repeated revision/resubmission;
- Reviewer/Approver Reject;
- Reopen oleh authority yang sesuai;
- Archive tanpa hard delete;
- detailed audit log;
- multi-role user;
- scoped Reviewer/Approver visibility.

---

## 3. Problem Statement

Workflow berbasis spreadsheet membuat NSCMF bergantung pada file individual sehingga data, status, sign-off, revision history, dan retrieval tidak berada pada satu sistem terpusat.

Produk harus menyelesaikan masalah berikut:

1. membuat NSCMF tanpa membuat file Excel baru secara manual;
2. menjaga field dan konteks bisnis dari NSCMF Form 3.0;
3. menyediakan workflow Request → Review → Approval;
4. mendukung revision tanpa kehilangan history;
5. menyimpan setiap record secara terpusat;
6. menyediakan History dan detail record;
7. menyediakan single/bulk export;
8. mencatat siapa melihat/mengubah/memproses record sesuai requirement audit;
9. mencegah hard delete terhadap NSCMF;
10. menyediakan role/scope configuration yang dapat disesuaikan organisasi.

---

## 4. Product Vision

> Menjadi satu source of truth internal untuk membuat, memproses, menelusuri, mengaudit, dan mengekspor NSCMF tanpa menghilangkan proses bisnis inti yang sudah dikenal dari NSCMF Form 3.0.

---

## 5. Product Principles

### 5.1 Preserve Business Meaning

Field dan konteks bisnis dari workbook harus dipertahankan.

### 5.2 Structured Record Is the Source of Truth

Record aplikasi adalah sumber data utama. PDF/format export adalah output dari record, bukan master data baru.

### 5.3 Traceability by Default

Persisted changes, workflow actions, revision cycles, dan actor/timestamp penting harus dapat ditelusuri.

### 5.4 Simple Operational Product

Produk bukan generic BPM, generic form builder, atau full document-management platform.

### 5.5 Configurable Where Organization-Specific

Role mapping, Unit/Division mapping, dan approval scope dapat disesuaikan tanpa melemahkan core business invariants.

### 5.6 No Silent Assumptions

Hal yang belum diputuskan harus diberi status TBD, bukan diisi berdasarkan tebakan developer/AI.

---

## 6. Product Users

### 6.1 Protected Superadmin

Seeded system account/role dengan authority tertinggi, global visibility, user administration, initial setup, archive, dan protected administration actions.

Protected Superadmin tidak boleh delete, soft-delete, disable, atau downgrade melalui normal application flow.

### 6.2 Requester

Membuat dan mengelola own NSCMF sesuai current state.

### 6.3 Reviewer

Melihat dan memproses record berdasarkan Unit/Division scope. Reviewer tidak dipilih satu per satu oleh requester; semua eligible Reviewer dalam scope dapat melihat record.

### 6.4 Approver

Melakukan approval berdasarkan configured approval scope. Satu Approver dapat memiliki scope beberapa Unit/Division sekaligus.

### 6.5 Multi-Role User

Satu user dapat memiliki lebih dari satu role. Current requirement tidak memaksakan segregation of duty.

---

## 7. Initial Setup Scope

Pada first run, protected Superadmin menjalankan setup wizard.

Wizard minimal mencakup:

1. role configuration: **Use Role Template** atau **Manual Role Configuration**;
2. Unit/Division: pilih predefined template/mapping atau buat manual;
3. configure Reviewer/Approver scope;
4. menyelesaikan initial organization setup.

Template configuration tetap dapat diubah kemudian oleh authorized administrator, kecuali protected invariants.

---

## 8. Product Scope — Confirmed MVP

MVP mencakup:

1. Login/logout; tanpa self-registration.
2. Protected seeded Superadmin.
3. Initial setup wizard.
4. User administration.
5. Role template atau manual role configuration.
6. Unit/Division template/mapping atau manual configuration.
7. Multi-role assignment.
8. Dashboard sederhana.
9. CTA `Create New Form`.
10. Direct access ke History.
11. `NSCMF - Activation`.
12. `NSCMF - Change`.
13. Pemilihan subtype.
14. Pilihan nomor NSCMF `Automatic` atau `Manual` setiap membuat form.
15. Draft.
16. Autosave.
17. Manual `Save Draft`.
18. Optional attachment input.
19. Cancel Draft sebelum Submit.
20. Submit.
21. Review oleh eligible Reviewer.
22. Multiple Reviewer participation.
23. Return for Revision.
24. Unlimited revision/resubmission cycles.
25. Reviewer Reject.
26. Approval.
27. Approver Return to Reviewer.
28. Approver Return to Requester dan kemudian wajib Review ulang.
29. Approver Reject.
30. Authorized Reopen untuk Rejected record.
31. Highest-authority Reopen/Revert untuk Approved record.
32. Detailed audit/change history.
33. History dan detail record.
34. Scoped visibility.
35. Single export.
36. Bulk export.
37. PDF sebagai minimum confirmed export format.
38. Archive sebagai pengganti delete.
39. No hard delete NSCMF.

### Draft / Future Capability

Notification hook direncanakan tetapi **bukan execution priority**. Telegram dan WhatsApp/Baileys adalah candidate integration, bukan final MVP technology commitment.

---

## 9. Non-Goals

MVP tidak ditujukan untuk:

- public/customer portal;
- self-registration;
- native mobile app;
- network provisioning automation;
- generic workflow designer;
- generic form builder;
- hard-delete NSCMF;
- menjadikan notification integration blocker terhadap core MVP;
- membuat service-impact/business classification berdasarkan AI guessing;
- mengubah exported file menjadi source of truth.

---

## 10. Form Families

### 10.1 NSCMF - Activation

Business context: instalasi/provisioning.

Subtype dari source workbook:

- Activation;
- Upgrade / Downgrade;
- Deactivation.

Main information groups:

- Service Information;
- Reference;
- existing/new service data;
- Service ID/status/description/location;
- Installation Date / SLA;
- NOC configuration;
- IP/DNS/routing;
- bandwidth;
- domain/email/hosting;
- onsite/customer/POP configuration;
- Request/Review/Approved sign-off.

### 10.2 NSCMF - Change

Business context: maintenance/perubahan existing service/environment.

Subtype:

- Maintenance;
- Upgrade;
- Emergency.

Workbook structure yang sudah diverifikasi:

#### Section A — Purpose of Changes

`Purpose of Changes` adalah section, bukan option.

Field/area input:

- Facing Challenges (Upgrade / Emergency);
- Maintenance Purpose;
- Identified Problem (Please elaborate).

`Service Impact` menyediakan selectable values:

- NOC15;
- NOC23;
- NOC361;
- Regional;
- POP;
- Customer;
- Other.

Field lain:

- Maintenance (Improvement) Plan;
- Target KPI;
- Target date of execution;
- Monitoring period;
- Rollback scenario;
- Maintenance Announcement.

Source workbook memiliki announcement options:

- 1 week before;
- 2 weeks before;
- 2 days before (emergency).

#### Section B — Result of Changes

- Result summary;
- Performance information;
- Status.

Exact timing kapan Result of Changes wajib diisi masih TBD dan akan didefinisikan pada downstream workflow/validation specification.

### 10.3 Upgrade Classification

Kata `Upgrade` sendiri tidak menentukan form.

- installation/provisioning context → Activation;
- maintenance/existing-service context → Change.

System tidak boleh memilih hanya berdasarkan keyword.

---

## 11. Functional Requirements

### Authentication / Administration

**FR-AUTH-001** User valid dapat login.  
**FR-AUTH-002** Tidak ada self-registration.  
**FR-AUTH-003** User dapat logout.  
**FR-ADM-001** Seeded Superadmin dibuat pada initial seeding.  
**FR-ADM-002** Superadmin menjalankan initial setup wizard.  
**FR-ADM-003** Authorized admin dapat create/edit/enable/disable normal user, assign role, assign Unit/Division, dan mengelola scope.  
**FR-ADM-004** Protected Superadmin tidak dapat delete/disable/downgrade.

### Dashboard

**FR-DASH-001** Dashboard menjadi landing page setelah login/setup selesai.  
**FR-DASH-002** Dashboard memiliki CTA `Create New Form`.  
**FR-DASH-003** User dapat membuka History tanpa membuat form.

### Create Form

**FR-FORM-001** User memilih Activation atau Change.  
**FR-FORM-002** User memilih subtype.  
**FR-FORM-003** User memilih Auto atau Manual numbering setiap membuat form.  
**FR-FORM-004** UI menampilkan struktur field sesuai form family.  
**FR-FORM-005** Attachment input tersedia dan optional.

### Draft

**FR-DRAFT-001** New record dapat berada pada Draft.  
**FR-DRAFT-002** Draft dapat diedit requester.  
**FR-DRAFT-003** Draft mendukung autosave.  
**FR-DRAFT-004** Tombol `Save Draft` tetap tersedia.  
**FR-DRAFT-005** Persisted draft changes masuk audit.  
**FR-DRAFT-006** Requester dapat Cancel hanya selama Draft sebelum Submit.  
**FR-DRAFT-007** Cancelled record permanent dan tidak dapat Reopen.

### Submit / Review

**FR-SUB-001** Valid Draft dapat Submit.  
**FR-SUB-002** Setelah Submit, requester tidak dapat normal edit.  
**FR-REV-001** Submitted record terlihat oleh semua eligible Reviewer dalam Unit/Division scope.  
**FR-REV-002** Requester tidak perlu memilih Reviewer.  
**FR-REV-003** View Reviewer dapat dicatat sebagai viewer activity.  
**FR-REV-004** Reviewer yang melakukan action dicatat sebagai actor/assigned-or-modified context.  
**FR-REV-005** Lebih dari satu Reviewer dapat berpartisipasi pada record yang sama.  
**FR-REV-006** Reviewer dapat Forward, Return for Revision, atau Reject.

### Revision

**FR-REVISION-001** Return ke Requester mengaktifkan kembali editing.  
**FR-REVISION-002** Revision cycle dapat berulang tanpa fixed maximum.  
**FR-REVISION-003** Resubmit mempertahankan reviewer continuity tetapi tetap visible oleh reviewer lain.  
**FR-REVISION-004** Seluruh revision history dipertahankan.

### Approval

**FR-APR-001** Approver melihat record berdasarkan configured scope.  
**FR-APR-002** Satu Approver dapat memiliki scope beberapa unit.  
**FR-APR-003** Review wajib sebelum Approval, termasuk Emergency.  
**FR-APR-004** Approver dapat Approve, Return to Reviewer, Return to Requester, atau Reject.  
**FR-APR-005** Jika Return ke Requester, revision yang di-Resubmit wajib melalui Review lagi sebelum Approval.

### Reopen

**FR-REOPEN-001** Rejected record dapat Reopen oleh authorized highest role atau explicit permission sesuai RBAC.  
**FR-REOPEN-002** Approved record dapat Reopen/Revert oleh highest authority.  
**FR-REOPEN-003** Reopen membutuhkan reason.  
**FR-REOPEN-004** Reopen actor memilih valid target destination.  
**FR-REOPEN-005** Historical Reject/Approval tidak dihapus.

### History / Export / Archive

**FR-HIS-001** History menampilkan records sesuai visibility.  
**FR-HIS-002** Requester melihat own records; Reviewer berdasarkan Unit/Division; Approver berdasarkan scope; Superadmin global.  
**FR-HIS-003** Record detail menyediakan status/history yang relevan.  
**FR-EXP-001** View access memberikan export access terhadap record yang sama.  
**FR-EXP-002** Bulk export hanya memasukkan records yang visible.  
**FR-EXP-003** PDF minimum supported format.  
**FR-ARC-001** NSCMF tidak dapat hard delete.  
**FR-ARC-002** Highest authority dapat Archive record.  
**FR-ARC-003** Archive mengeluarkan record dari default active view tetapi mempertahankan business history.

### Audit

**FR-AUD-001** Persisted business changes memiliki detailed audit.  
**FR-AUD-002** Field change audit dapat menyimpan actor, timestamp, field, old value, new value, dan event context.  
**FR-AUD-003** Workflow event dan revision cycle tidak boleh overwrite historical event.  
**FR-AUD-004** Reviewer viewer activity harus dapat dibedakan dari modifier/action actor.

---

## 12. Product-Level Workflow

```text
Draft
  |-- Autosave / Save Draft
  |-- Cancel -> Cancelled (permanent)
  |
  +-- Submit
        |
        v
      Review
        |-- Return -> Requester Revision -> Resubmit -> Review
        |-- Reject -> Rejected -> Authorized Reopen (optional)
        |
        +-- Forward
              |
              v
           Approval
              |-- Return to Reviewer -> Review
              |-- Return to Requester -> Revision -> Resubmit -> Review
              |-- Reject -> Rejected -> Authorized Reopen (optional)
              |
              +-- Approve -> Approved
                               |
                               +-- Highest-authority Reopen/Revert with reason
```

Emergency mengikuti Review dan Approval yang sama.

Exact state names/transitions tetap menjadi tanggung jawab `05_State_Status_Flow.md`.

---

## 13. Visibility Model — Product Intent

| Actor Context | Visibility Intent |
|---|---|
| Requester | Own records |
| Reviewer | Records dalam assigned Unit/Division scope |
| Approver | Records dalam configured approval scope; dapat multi-unit |
| Protected Superadmin | Seluruh records |
| Multi-role user | Gabungan visibility sesuai role/scope |

Permission final akan difinalisasi pada RBAC.

---

## 14. Non-Functional Product Requirements

### NFR-001 — Reliability
Persisted data tidak hilang karena normal navigation.

### NFR-002 — Consistency
Form detail, History, audit, dan export harus merepresentasikan record yang konsisten.

### NFR-003 — Server-Side Authorization
UI hiding bukan authorization boundary.

### NFR-004 — Desktop-First Internal UX
Primary target adalah internal desktop web browser.

### NFR-005 — Traceability
Critical workflow actions dan changes dapat ditelusuri.

### NFR-006 — Maintainability
Arsitektur MVP tidak boleh dibuat lebih kompleks dari kebutuhan bisnis.

### NFR-007 — Performance Target — TBD
Concurrency, latency target, data volume, dan export performance belum ditentukan.

### NFR-008 — Availability / Retention — TBD
Availability target dan retention period belum ditentukan.

---

## 15. Success Criteria

Produk memenuhi tujuan awal jika stakeholder dapat:

1. login sebagai authorized user;
2. menyelesaikan first-time setup;
3. membuat user/role/scope;
4. membuat Activation atau Change;
5. memilih numbering mode;
6. menyimpan Draft melalui autosave/manual Save Draft;
7. Submit valid form;
8. melakukan Review melalui eligible Reviewer;
9. melakukan revision cycle berulang bila diperlukan;
10. melakukan Approval;
11. menjalankan Return/Reject sesuai business rules;
12. mengetahui viewer/modifier/workflow history yang relevan;
13. Reopen record sesuai authority;
14. menemukan record pada History sesuai scope;
15. export visible records;
16. Archive tanpa menghapus history;
17. memastikan tidak tersedia hard-delete NSCMF.

---

## 16. Confirmed vs Deferred

### Confirmed

- Save Draft + autosave;
- multi-role users;
- initial setup wizard;
- template/manual role config;
- template/manual Unit/Division mapping;
- multiple-unit Approver scope;
- Reviewer non-exclusive visibility;
- multiple Reviewer participation;
- detailed audit;
- Return/Reject/Reopen flows;
- Cancel Draft-only and permanent;
- no hard delete;
- Archive;
- optional attachment;
- view implies export;
- Emergency does not bypass workflow.

### Deferred / TBD

- auto-number format;
- exact Unit/Division default template entries;
- exact permission matrix;
- exact workflow state names;
- exact validation/cardinality per field;
- timing requirement for Change Result of Changes;
- export format selain PDF;
- notification implementation/provider;
- attachment limits;
- audit retention;
- performance/SLA/retention targets.

---

## 17. Notification Roadmap Note

Notification merupakan future capability. Candidate yang disebut dalam requirement discussion:

- Telegram;
- WhatsApp menggunakan Baileys.

Ini hanya roadmap/draft note. Notification tidak boleh menjadi dependency yang menghambat implementasi core workflow pada tahap awal.

---

## 18. Document Precedence

- PRD → product scope dan functional intent.
- Business Rules → aturan bisnis authoritative.
- User Flow → urutan interaksi user authoritative.
- RBAC → permission authoritative.
- State Flow → lifecycle authoritative.
- Validation Rules → validitas input authoritative.
- UI/UX → presentation/interactions authoritative.
- Dokumen teknis → implementation detail.

Jika requirement berubah, dokumen yang terkait harus disinkronkan; perubahan tidak boleh hanya hidup di code.

---

## 19. Open Product Decisions

- [ ] Automatic NSCMF number format.
- [ ] Exact default Unit/Division template data.
- [ ] Exact permission matrix.
- [ ] Exact state names dan Reopen targets.
- [ ] Result of Changes timing/ownership.
- [ ] Return/Reject/Cancel/Archive reason requirement selain Reopen.
- [ ] Search/filter requirement final.
- [ ] Additional export format dan bulk packaging.
- [ ] Audit retention dan export audit.
- [ ] Attachment constraints.
- [ ] Notification implementation.

---

## 20. Next Documentation

Business Rules sudah tersedia pada `02_Business_Rules.md`.

Dokumen berikutnya adalah:

**`03_User_Flow.md`** — menerjemahkan product scope dan rules menjadi urutan interaksi user dari initial setup sampai record lifecycle selesai.
