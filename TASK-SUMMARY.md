# Ringkasan pengerjaan 10 task (2026-08-20, update: live-tested via Docker)

Semua task diverifikasi terhadap source code aktual sebelum diubah. `tsc --noEmit` dan
`npm run build` bersih setelah setiap task.

**Update: Docker Desktop sudah jalan** — `docker compose -f docker-compose.local.yml up --build`
berhasil, dan berikut yang SUDAH live-tested (bukan cuma review kode):
- Task 1: stack jalan, dev-login-bypass 200 OK, seed data dummy muncul via `/api/data`.
- Task 2: order lisensi → gambar QRIS ke-serve (200, image/png) → admin konfirmasi via kode
  unik → user otomatis `status: active`. End-to-end sukses.
- Task 3: diuji di browser sungguhan — isi judul transaksi → buka Kelola Kategori → tambah
  kategori → tutup → judul transaksi TERBUKTI masih ada (`"TEST PERSISTENCE 12345"`), kategori
  baru langsung muncul di form yang sama.
- Task 4: diuji reproduksi bug asli — ketik teks di "Ketik Apapun", tutup modal TANPA submit,
  buka lagi → field TERBUKTI kosong (dulu akan menyisakan teks lama).
- Task 5: buka form edit "Bank BCA" di browser → input saldo TERBUKTI `14.150.000` (bukan 0).
- Task 6: `runActivityLogCleanup()` jalan saat startup tanpa error (0 user punya activityLog
  basi saat ini, jadi no-op — logikanya sudah dikonfirmasi tidak crash di Postgres asli).
- Task 9: hard-delete kolaborator via API — baris hilang total dari `/api/admin/collaborators`.
- **Ditemukan & diperbaiki 1 bug baru** saat live-test: `setupVite()` di server.ts dulu
  branching murni berdasar `NODE_ENV`, jadi image production (isi cuma `dist/`+`public/`, tanpa
  source asli) yang dijalankan dengan `NODE_ENV=development` (demi dev-login-bypass) malah
  mencoba start Vite dev middleware yang butuh source — hasilnya 404 di semua halaman. Fix:
  keputusan static-vs-dev sekarang berdasar ada/tidaknya `dist/index.html` di disk, bukan
  `NODE_ENV` — endpoint dev-login-bypass sendiri TETAP gated murni oleh `NODE_ENV==='production'`
  (tidak dilonggarkan, sesuai constraint).

Yang BELUM live-tested (butuh device/jaringan/kredensial nyata, di luar jangkauan environment
kerja ini):

## 1. Docker Compose lokal — selesai, LIVE-TESTED ✅
`docker-compose.local.yml` + `.env.local.example`, terpisah total dari `docker-compose.yml`
produksi (nama project/network/volume/container semua beda). README ada instruksi run + login
pakai dev-login-bypass. Seed data dummy sudah lengkap sebelumnya (`scripts/seed-dummy-data.ts`).
Sudah dibuktikan jalan: `docker compose -f docker-compose.local.yml up --build`, login tanpa
Google, data dummy muncul.

## 2. Ganti semua pembayaran ke QRIS statis — selesai, LIVE-TESTED ✅
Doku dihapus total (kode, endpoint webhook, kolom DB — lihat `db/migrate_drop_doku_columns.sql`).
BCA manual dihapus dari UI. QRIS statis: `public/qris-statis.png` (dipindah dari
`src/ID1026574258285_A01.png`, bukan "Qris Bwaji.JPG" seperti disebut brief awal). Admin Console
tetap bisa konfirmasi manual, badge "via Doku" dihapus. Alur order→QRIS→konfirmasi admin→akun
aktif sudah dibuktikan jalan end-to-end.

## 3. Navigasi back dari Kelola Kategori — selesai, LIVE-TESTED ✅
Root cause: `AddTransactionModal` di-close/unmount sebelum buka Category Manager, state hilang.
Fix: modal dibiarkan tetap mounted (sudah didesain stack via z-index). Dibuktikan di browser:
draft transaksi bertahan setelah bolak-balik ke Kelola Kategori.

## 4. Reset input teks bebas — selesai, LIVE-TESTED ✅
`inputText` ("Ketik Apapun") tidak pernah direset — sekarang direset tiap modal dibuka.
`CategoryManagerModal`/`PocketManagerModal` juga direset saat ditutup (keduanya dirender permanen,
tidak unmount). Sekalian dijaga dari regresi Task 3. Dibuktikan di browser: ketik teks → tutup
tanpa submit → buka lagi → field kosong.

## 5. Bug edit saldo wallet = 0 — selesai, LIVE-TESTED ✅
`handleOpenEdit` di `AccountView.tsx` set `initialBalance` tapi lupa set `initialBalanceExpr`
(field yang benar-benar ditampilkan di input). Dibuktikan di browser: form edit "Bank BCA"
menampilkan `14.150.000`, bukan 0.

## 6. Retensi Activity Log 14 hari — selesai, jalan tanpa error di Postgres asli
`activityLog` ada di dalam JSONB `user_app_data`, bukan tabel terpisah — dibuat sweep job
(`runActivityLogCleanup`, jalan tiap 24 jam) yang trim entri >14 hari. Confirmed no-crash saat
startup container; belum ada skenario data >14 hari untuk diuji trim-nya secara langsung.

## 7. Push notification 20:00 WIB — selesai (infra sudah 90% ada sebelumnya), belum live-test
Infra (VAPID, service worker, subscribe/unsubscribe, toggle UI di HomeDashboard) sudah ada dari
task sebelumnya. Yang ditambahkan: broadcast harian jam 20:00 WIB ke semua subscriber
(`runDailyTransactionReminderSweep`), dan auto-unsubscribe browser+server saat logout.
**Bab 13 Panduan Penggunaan (PDF) TIDAK disentuh** — sesuai arahan Anda, di-skip.

## 8. Diagnosa loading lambat (~10 detik) — selesai (diagnosa + fix), belum diukur real
Root cause terkonfirmasi: `express.static` tanpa cache header (`max-age=0` default) — bundle
705KB (JS+CSS+logo) di-download ulang SETIAP buka app. Fix: `Cache-Control: max-age=31536000,
immutable` untuk `dist/assets/*` (sudah diverifikasi via curl, header benar berubah).
Sekalian paralelkan `/api/me` + `/api/data` (dulu sequential). Code-splitting (bundle 543KB
single chunk) diidentifikasi tapi TIDAK diubah — risiko lebih tinggi tanpa bisa test browser
nyata di sini. **Angka before/after wall-clock nyata perlu diukur di device/jaringan asli.**

## 9. Admin hapus permanen kolaborator — selesai, LIVE-TESTED ✅
`DELETE /api/admin/collaborators/:id` (hard delete) + tombol "Hapus Permanen" terpisah dari
"Disconnect" di Admin Console, dengan dialog konfirmasi eksplisit. Dibuktikan via API: baris
kolaborator hilang total dari daftar setelah dihapus.

## 10. Semua notifikasi admin baca `ADMIN_NOTIFY_EMAIL` — selesai
Audit bersih, tidak ada hardcode email di manapun. `SMTP_USER` sudah baca dari env var (nilai
aktual di server tetap Anda ubah manual via SSH). `.env.example` diperbaiki — sebelumnya
dokumentasikan `RESEND_API_KEY` yang sudah tidak dipakai kode (`lib/email.ts` pakai SMTP polos).

## Yang masih perlu Anda lakukan
1. Test push notification jam 20:00 WIB di device asli (Task 7) — butuh VAPID keys diisi
   (`npx web-push generate-vapid-keys`) dan HTTPS asli (push API butuh secure context).
2. Ukur loading time reopen sebelum/sesudah di deployment nyata dengan jaringan sungguhan
   (Task 8) — di sini cuma terbukti header cache-nya benar via curl, bukan wall-clock nyata.
3. Setelah semua lolos test, jalankan `db/migrate_drop_doku_columns.sql` di DB production (kalau
   pernah sempat deploy versi Doku), lalu ubah `ADMIN_NOTIFY_EMAIL` via SSH sesuai rencana Anda.
4. Stack Docker lokal masih jalan di container `kantongku-app-local`/`kantongku-db-local` —
   matikan dengan `docker compose -f docker-compose.local.yml down` kalau sudah selesai dicek.
