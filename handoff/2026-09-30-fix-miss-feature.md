# Perbaikan temuan audit 2026-09-27 — FE-58, FE-59, BE-150, BE-151 (2026-09-30)

Branch `feat/fix_miss_feature`, lanjutan `e625864`. Semua commit masih lokal: belum ada push, PR, CI GitHub, maupun human review.

## Hasil

| Task | Masalah | Perbaikan | Commit (RED → GREEN) |
| --- | --- | --- | --- |
| FE-59 | Tombol History di header Dashboard selalu tampil; detail record selalu menampilkan "Back to history". | Header History hanya untuk `nscmf.view.history`. Detail record tanpa izin itu kembali ke Dashboard ("Back to dashboard"). | `65cd08f` → `ed716c4` |
| FE-58 | Uploader tidak punya tahap Assembling; `INFECTED`/scan `FAILED` tampil "Processed" dan memicu refresh sukses; pesan resume tidak ada. | Fase terpisah `assembling`, `scanning`, `ready`, `infected`, `scan-failed`, `failed` dari status server. Label 07 §28 kata per kata dari satu sumber (`scanStates.ts`), juga untuk daftar lampiran. `changed` hanya saat CLEAN. Progres hanya tampil selama transport. Baris status `role="status"`. Pesan resume saat server mengembalikan `resumed: true`. | `37adfcd` → `e4ec97a` |
| BE-150 | Byte chunk yang sudah ditulis tertinggal bila transaksi database melempar exception. | Byte yang belum diakui dihapus, baik pada exception maupun race yang sudah ada. Bila penghapusan juga gagal, Technical Log mencatat `upload_id`, `chunk_index`, dan kelas exception tanpa storage key, lalu error asli dilempar ulang. | `aea5adc` → `4345623` |
| BE-151 | Timeout 30 detik ClamAV berlaku per tahap, sehingga satu scan bisa jauh melewati 30 detik. | Satu deadline untuk connect, kirim, dan balasan. Socket non-blocking dan setiap tulis/baca menunggu lewat `stream_select` dengan sisa waktu, sehingga tidak ada operasi yang melewati deadline. | `5d50e35` → `87e4796` |

## Keputusan pemilik (2026-09-30)

1. **BE-150:** tanpa mekanisme sweep baru. Objek yang tersisa bila DB **dan** penghapusan sama-sama gagal adalah batas yang diketahui dan tercatat di log ([G23](../microtask_be/06_GAP_DAN_KEPUTUSAN.md#g23)).
2. **Label lampiran:** daftar lampiran tersimpan ikut memakai label 07 §28.
3. **Record terkunci saat scan:** `ATTACHMENT_PARENT_LOCKED` tampil dengan label 07 apa adanya, "Security scan failed — file not available".
4. **FE-59:** diperluas ke detail record; tanpa izin History, tautan kembali menuju `/dashboard`.
5. **14 §48:** kalimat timeout ClamAV kini "bounds one whole scan". Angka 30 detik tidak berubah. Register G15 ikut disesuaikan.

## Catatan teknis

- **Chromium:** journey Chromium kini mengharapkan "Assembling…" sebelum job antrean dijalankan, lalu "Ready". Ini sesuai status server yang sebenarnya.
- **Test BE-151:** ditempatkan di `tests/Integration/Operations/WorkerTimeBudgetTest.php` supaya memakai ulang helper `timed()`. `FakeClamd` hanya diberi hook opsional `$beforeEachRead`.
- **Input 4 MB:** test BE-151 butuh input lebih besar dari buffer socket loopback. Dengan 1 MB, kode lama tidak menunjukkan cacatnya.
- **Implementasi pertama BE-151:** memakai `stream_set_timeout` dengan sisa deadline, tapi gagal 3 dari 5 run. PHP menghitung timeout per tunggu, sehingga satu `fwrite` ke penerima lambat bisa melewati deadline. Implementasi ini tidak pernah di-commit. Versi `stream_select` lulus 6/6 run berulang dan 2 run Pest penuh.

## Gate (lokal, 2026-09-30, HEAD `87e4796`)

| Gate | Hasil |
| --- | --- |
| Pint, PHPStan max | lulus, 0 error |
| Pest + coverage (MySQL 8.4 `nscmf_testing`, clamd asli menjawab PONG) | 512 lulus, cakupan baris 95,0 % |
| Vitest + coverage | 733 lulus, cakupan baris 94,26 % |
| vue-tsc, ESLint, Prettier, build | lulus |
| Playwright Chromium | 31/31 lulus |
| Runtime config | 5/5 lulus |

Satu run Pest penuh sempat gagal 1 test sebelum perbaikan akhir BE-151. Test-nya tidak tercatat. Kemungkinan besar itu test deadline yang saat itu belum stabil (lihat catatan di atas). Run penuh setelah itu selalu lulus.

`public/hot` di checkout ini milik Vite dev server yang masih aktif (port 5174), bukan file basi. Karena itu Chromium memuat aset dari kode terbaru melalui dev server tersebut.

## Belum dilakukan

- Uji manual di browser oleh pemilik:
  - unggah file biasa (Assembling → Scanning → Ready) dan EICAR (Rejected);
  - login dengan role tanpa `nscmf.view.history`.
- Human implementation review dan human security review (18 §17, §29): private upload/storage, scanner fail-closed, visibilitas izin.
- Push, PR, CI GitHub.
- `microtask_be/catalog.json` tidak diubah, sesuai kebiasaan paket yang tetap mencatat PLANNED/NOT RUN.
- Status di `BE-150/151.md`, `FE-58/59.md`, dan `microtask_be/README.md` sudah diperbarui di working tree tetapi tidak di-commit, karena dokumen itu di-stage dan akan di-commit oleh pemilik.
