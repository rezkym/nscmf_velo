# Desain UI NSCMF — arah redesign

> Status: disetujui pemilik 2026-09-24 dan disinkronkan ke `project_doc/` 01 (§8), 04 (§12.1, §21, §36), 07 (§7.1, §17.1), 12 (§44.1), dan 17 (§339); keputusan tercatat sebagai gap G22. `project_doc/` tetap menjadi otoritas. Rencana lengkap, kontrak, urutan kerja, serta acceptance berada di [design/plan.md](design/plan.md).

## Arah visual

Referensi pengguna adalah `reference.webp` di root proyek: dashboard SaaS terang dengan sidebar putih, header ringkas, kartu bervariasi, satu kartu unggulan, dan ruang yang lega. Adaptasi NSCMF memakai `brand-950 #091540`, `brand-700 #1B2CC1`, `brand-400 #7692FF`, `brand-200 #ABD2FA` dari `project_doc/07_UI_UX_Specification.md`; semantik hijau/amber/merah tetap untuk status. Kanvas terang, panel putih, teks gelap yang kontras, ikon Lucide, font sistem, radius lembut, dan grid responsif menjadi bahasa visual semua layar. Tidak ada gambar referensi atau aset eksternal yang dimuat sebagai bagian aplikasi.

Shell desktop mempunyai sidebar sekitar 256 px dan header sekitar 72 px; ponsel memakai navigasi panel yang aksesibel. Dashboard menampilkan My Drafts, Revision Required, serta Pending Review/Approval hanya bila permission efektif mengizinkan. Grid mengisi dua, tiga, atau empat kolom sesuai kartu yang hadir; tablet maksimal dua dan ponsel satu. Di bawahnya ada grafik aktivitas, distribusi status, daftar pekerjaan yang membutuhkan perhatian, serta tindakan cepat yang benar-benar tersedia. Semua layar kerja, administrasi, autentikasi, dan validator publik memakai sistem visual yang sama. Validator publik tetap halaman mandiri tanpa navigasi atau data internal.

## Metrik dan permission yang diusulkan

`GET /dashboard` tetap menjadi route. Prop `analytics` yang baru memuat `mine` untuk metrik record milik pengguna dan `organization` opsional. Periode aktivitas ialah 28 hari kalender terakhir menurut Asia/Jakarta, dibagi empat kelompok tujuh hari. Metrik pribadi menghitung record dibuat, *first submission*, dan keputusan approval; metrik organisasi menghitung *first submission* dan keputusan approval. Keputusan approval menghitung setiap iterasi yang disetujui, sehingga approval ulang adalah keputusan baru. Distribusi status menghitung record aktif saat ini; organisasi hanya mencakup record yang pernah disubmit dan belum diarsipkan. Grafik selalu menampilkan label dan angka yang dapat dipahami tanpa warna atau hover.

Permission baru yang diusulkan adalah `nscmf.analytics.view`. Bundle bawaan **Superadmin saja** mendapatkannya. Role kustom dapat diberi permission itu melalui administrasi role; panel organisasi hanya dikirim server bila aktor mempunyai `nscmf.analytics.view` **dan** `nscmf.view.history`. Team tidak pernah menjadi syarat akses. Pengguna tanpa kedua izin itu tidak menerima properti `organization`, bukan menerima angka nol palsu. Panel Mine dan empat kartu perhatian tetap mengikuti visibilitas/permission yang sudah berlaku.

Keputusan metrik, permission, bundle, dan prop ini harus disinkronkan ke `project_doc/01_PRD.md`, `04_RBAC_Permission_Matrix.md`, `07_UI_UX_Specification.md`, `12_API_Contract.md`, dan `17_Seed_Dummy_Data_Specification.md`. `microtask_fe/` dan `microtask_be/` diperbarui sebagai turunan bila terdampak. Tidak direncanakan migrasi, endpoint baru, pustaka grafik, React/ReUI, atau perubahan template XLSX/PDF.

## Prinsip penerapan

Komposisi referensi adalah panduan visual, bukan sumber fungsi: tidak ada pencarian global, notifikasi, avatar foto, promosi aplikasi, time tracker, atau angka pertumbuhan buatan. Form panjang tetap punya navigator bagian, validasi server, dan save/konflik yang jujur. Status bisnis memakai tujuh nilai canonical; Archived, scan, dan ekspor tetap status terpisah. Tampilan harus tetap jelas pada lebar 320, 768, dan 1280 px, bisa dipakai dengan keyboard, menghormati reduced motion, dan memenuhi arah keterbacaan WCAG-AA-like proyek.

Rincian token, kontrak TypeScript, penerapan per layar, urutan TDD, dan skenario pengujian ada di [rencana lengkap](design/plan.md).
