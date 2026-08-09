# Deploy KantongKu (staging test, sebelum pindah ke server rumah)

`server.ts` adalah proses Node/Express biasa (bukan serverless), jadi **jangan pakai Vercel**.
Platform yang cocok: **Railway** (direkomendasikan, addon Postgres built-in) atau **Render**
(Web Service + PostgreSQL addon). Panduan di bawah pakai Railway; bagian akhir mencatat
perbedaan kalau pakai Render.

## 0. Prasyarat

- Repo ini sudah di-push ke GitHub (buat repo baru kalau belum: `git init && git add -A && git commit -m "init"` lalu push).
- Akun Railway (https://railway.app) — login pakai GitHub.
- Akun Google Cloud Console untuk bikin OAuth Client ID.
- Gambar QR statis ShopeePay (`public/qris-shopee.png`) dan nomor rekening BCA — pembayaran di
  sini manual (bukan payment gateway), lihat bagian 3.

## 1. Buat project di Railway

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pilih repo `kantongku-main`.
2. Railway otomatis mendeteksi Node. Set build/start command secara eksplisit di tab **Settings**
   project (Service → Settings → Deploy):
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Di project yang sama: **New** → **Database** → **Add PostgreSQL**. Railway langsung
   menyediakan instance dan variabel `DATABASE_URL` di service Postgres tersebut.

## 2. Sambungkan DATABASE_URL

Di tab **Variables** service Postgres, salin nilai `DATABASE_URL` (atau reference variable
Railway: `${{Postgres.DATABASE_URL}}`). Tempel ke **Variables** service web app kamu sebagai
`DATABASE_URL`.

## 3. Set semua environment variable

Di service **web app** → tab **Variables**, tambahkan seluruh isi `.env.example`:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | API key Gemini kamu |
| `APP_URL` | domain HTTPS Railway, mis. `https://kantongku-production.up.railway.app` (isi setelah deploy pertama sukses dan domain ter-generate) |
| `DATABASE_URL` | dari langkah 2 |
| `PRICE_AMOUNT` | harga dasar sebelum kode unik, mis. `49000` |
| `PRICE_LABEL` | mis. `Akses KantongKu Selamanya` |
| `BANK_BCA_ACCOUNT_NUMBER` | nomor rekening BCA kamu |
| `BANK_BCA_ACCOUNT_NAME` | nama pemilik rekening |
| `ADMIN_PASSWORD` | password untuk masuk ke `/admin` — string acak yang cuma kamu tahu |
| `GOOGLE_CLIENT_ID` | dari langkah 6 |
| `VITE_GOOGLE_CLIENT_ID` | sama dengan `GOOGLE_CLIENT_ID` |
| `SESSION_COOKIE_SECRET` | random string panjang, mis. hasil `openssl rand -hex 32` — dipakai untuk sign cookie sesi customer maupun admin |
| `NODE_ENV` | `production` |

Selain env var, upload juga gambar QR statis ShopeePay kamu sebagai `public/qris-shopee.png` di
repo (commit filenya) sebelum build — halaman landing me-referensikan path itu langsung, jadi
kalau filenya belum ada, gambar QR akan broken di halaman instruksi bayar.

Catatan: variabel `VITE_*` di-inline ke bundle frontend saat `npm run build` berjalan di
Railway — pastikan sudah di-set **sebelum** trigger build/deploy.

> **Gotcha (Docker build):** Repo ini punya `Dockerfile`, dan Railway akan pakai itu
> (bukan Nixpacks/Railpack) kalau terdeteksi. Docker build berjalan terisolasi dari env
> var runtime — variabel `VITE_*` **tidak otomatis kebawa** ke dalam `RUN npm run build`
> kecuali di-declare sebagai `ARG` di Dockerfile (lihat `ARG VITE_GOOGLE_CLIENT_ID` dkk).
> Railway otomatis meneruskan service variable yang namanya cocok sebagai build arg —
> tapi hanya untuk `ARG` yang memang dideklarasikan. Kalau nambah variabel `VITE_*` baru,
> tambahkan juga pasangan `ARG`/`ENV`-nya di Dockerfile sebelum baris `RUN npm run build`.

## 4. Jalankan schema.sql ke database

Ambil connection string Postgres dari Railway (tab **Connect** di service Postgres, pakai yang
"Public Network" agar bisa diakses dari laptop kamu), lalu jalankan sekali dari lokal:

```bash
psql "postgresql://<user>:<pass>@<host>:<port>/<db>" -f db/schema.sql
```

Atau gunakan tab **Query** bawaan Railway (buka service Postgres → Data → Query) dan tempel isi
`db/schema.sql` langsung ke situ.

## 5. Set APP_URL ke domain final

Setelah deploy pertama sukses, Railway kasih domain publik (Settings → Networking → Generate
Domain kalau belum ada). Update variabel `APP_URL` di service web app dengan domain HTTPS itu,
lalu redeploy (Railway auto-redeploy saat variable berubah).

## 6. Daftarkan APP_URL ke Google Cloud Console

1. https://console.cloud.google.com/apis/credentials → buat/pilih OAuth 2.0 Client ID (tipe
   **Web application**) kalau belum ada — inilah sumber `GOOGLE_CLIENT_ID`.
2. **Authorized JavaScript origins**: tambahkan `{APP_URL}` (mis.
   `https://kantongku-production.up.railway.app`).
3. **Authorized redirect URIs**: Google Identity Services (GIS) button flow yang dipakai di sini
   tidak butuh redirect URI server-side (pakai credential callback langsung di JS), tapi tambahkan
   `{APP_URL}/app` juga untuk jaga-jaga kalau nanti pindah ke redirect-based flow.
4. Simpan, lalu pastikan `GOOGLE_CLIENT_ID` di Railway sama persis dengan Client ID ini.

## 7. Test end-to-end di URL live

1. Buka `{APP_URL}/` → harus tampil `Landing.tsx` (form nama + email + pilihan channel bayar),
   bukan `Login.tsx`.
2. Isi nama + email baru, pilih **QRIS ShopeePay** → klik **Bayar** → muncul halaman instruksi
   dengan gambar QR dan nominal (harga dasar + kode unik). Ulangi juga dengan **Transfer BCA**.
3. Cek di Railway Postgres (tab Query): `SELECT * FROM orders ORDER BY created_at DESC LIMIT 2;`
   → dua order tadi ada, `status = 'pending'`, `unique_code` beda satu sama lain,
   `total_amount = PRICE_AMOUNT + unique_code`.
4. Buka `{APP_URL}/admin` → tanpa login harus muncul form password, bukan daftar order. Login
   pakai `ADMIN_PASSWORD` → masuk ke tab **Order Pending**, dua order tadi muncul.
5. Klik **Konfirmasi** pada salah satu order → cek `orders.status` jadi `settlement` dan
   `users.status` untuk email itu jadi `active`.
6. Halaman landing (yang masih polling di tab lain) otomatis pindah ke tampilan sukses dengan
   link ke `/app`. Buka `{APP_URL}/app`.
7. Klik **Sign in with Google**, login pakai akun Google dengan email **persis sama** dengan yang
   dikonfirmasi → harus berhasil masuk ke `App.tsx`.
8. Cek `SELECT current_session_id FROM users WHERE email = '<email tadi>';` → harus terisi UUID.
9. Login lagi dari browser/incognito lain dengan akun yang sama → `current_session_id` di baris
   yang sama berubah ke UUID baru (verifikasi lewat query yang sama).
10. Coba login Google dengan email yang **belum pernah** dikonfirmasi → harus gagal dengan pesan
    403: *"Email ini belum terdaftar / pembayaran belum terkonfirmasi..."*.
11. Di tab **Daftar Akun** di `/admin`, coba **Tambah Akun Manual** dengan email baru → langsung
    `status = 'active'` tanpa ada row `orders` terkait. Coba juga **Suspend** salah satu akun.
12. Buat order baru, jangan dikonfirmasi, lalu cek lagi setelah `expires_at` lewat (atau update
    manual `expires_at` ke masa lalu via Query) → `GET /api/payment/status/:order_code` harus
    otomatis mengubah status jadi `expired`.

Setelah semua poin di atas lolos di server live, baru pertimbangkan pindah `DATABASE_URL` ke
Postgres self-hosted di CT 101 Proxmox (di luar scope dokumen ini).

## Kalau pakai Render (alternatif)

- Buat **New Web Service**, connect repo, Build Command `npm install && npm run build`, Start
  Command `npm start`.
- Buat **New PostgreSQL** instance terpisah di Render, salin **Internal Database URL**-nya ke
  variabel `DATABASE_URL` di Web Service.
- Environment variables: sama seperti tabel di langkah 3, diisi lewat tab **Environment** Render.
- Domain HTTPS default Render (`https://<service>.onrender.com`) dipakai sebagai `APP_URL` — set
  setelah deploy pertama sukses, sama seperti langkah 5.
- Jalankan `db/schema.sql` lewat `psql` ke **External Database URL** yang Render sediakan (tab
  **Connect** di database), atau lewat Render Shell kalau tersedia di plan kamu.
- Langkah 6–7 (Google Cloud Console, test end-to-end) sama persis.

File `render.yaml` yang lama sudah dihapus dari repo karena hanya meng-cover `GEMINI_API_KEY` dan
tidak reflect kebutuhan env var yang sekarang jauh lebih banyak — pakai tabel di langkah 3 sebagai
sumber kebenaran env var, baik untuk Railway maupun Render.
