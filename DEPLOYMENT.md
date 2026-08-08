# Deploy KantongKu (staging test, sebelum pindah ke server rumah)

`server.ts` adalah proses Node/Express biasa (bukan serverless), jadi **jangan pakai Vercel**.
Platform yang cocok: **Railway** (direkomendasikan, addon Postgres built-in) atau **Render**
(Web Service + PostgreSQL addon). Panduan di bawah pakai Railway; bagian akhir mencatat
perbedaan kalau pakai Render.

## 0. Prasyarat

- Repo ini sudah di-push ke GitHub (buat repo baru kalau belum: `git init && git add -A && git commit -m "init"` lalu push).
- Akun Railway (https://railway.app) — login pakai GitHub.
- Akun Google Cloud Console untuk bikin OAuth Client ID.
- Akun Midtrans Sandbox (https://dashboard.sandbox.midtrans.com).

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
| `MIDTRANS_SERVER_KEY` | Server Key **Sandbox** dari dashboard Midtrans |
| `MIDTRANS_CLIENT_KEY` | Client Key **Sandbox** dari dashboard Midtrans |
| `MIDTRANS_IS_PRODUCTION` | `false` |
| `VITE_MIDTRANS_CLIENT_KEY` | sama dengan `MIDTRANS_CLIENT_KEY` |
| `PRICE_AMOUNT` | mis. `49000` |
| `PRICE_LABEL` | mis. `Akses KantongKu Selamanya` |
| `GOOGLE_CLIENT_ID` | dari langkah 4 |
| `VITE_GOOGLE_CLIENT_ID` | sama dengan `GOOGLE_CLIENT_ID` |
| `SESSION_COOKIE_SECRET` | random string panjang, mis. hasil `openssl rand -hex 32` |
| `NODE_ENV` | `production` |

Catatan: variabel `VITE_*` di-inline ke bundle frontend saat `npm run build` berjalan di
Railway — pastikan sudah di-set **sebelum** trigger build/deploy.

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

## 7. Daftarkan webhook URL ke Midtrans Sandbox

1. https://dashboard.sandbox.midtrans.com → **Settings** → **Configuration**.
2. **Payment Notification URL**: isi `{APP_URL}/api/payment/webhook`.
3. Simpan.

## 8. Test end-to-end di URL live

1. Buka `{APP_URL}/` → harus tampil `Landing.tsx` (form nama + email + tombol Bayar), bukan
   `Login.tsx`.
2. Isi nama + email baru → klik **Bayar** → popup Snap QRIS Sandbox muncul.
3. Selesaikan simulasi pembayaran di Midtrans Sandbox (Snap sandbox punya tombol simulasi bayar
   untuk QRIS/VA).
4. Cek di Railway Postgres (tab Query): `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;`
   → `status` harus `settlement`. Lalu `SELECT * FROM users WHERE email = '<email tadi>';` →
   `status` harus `active`.
5. Landing page otomatis pindah ke tampilan sukses dengan link ke `/app`. Buka `{APP_URL}/app`.
6. Klik **Sign in with Google**, login pakai akun Google dengan email **persis sama** dengan yang
   dipakai bayar → harus berhasil masuk ke `App.tsx`.
7. Cek `SELECT current_session_id FROM users WHERE email = '<email tadi>';` → harus terisi UUID.
8. Login lagi dari browser/incognito lain dengan akun yang sama → `current_session_id` di baris
   yang sama berubah ke UUID baru (verifikasi lewat query yang sama).
9. Coba login Google dengan email yang **belum pernah** membayar → harus gagal dengan pesan 403:
   *"Email ini belum terdaftar / pembayaran belum terkonfirmasi..."*.
10. Kirim ulang webhook dengan signature yang salah (mis. `curl -X POST {APP_URL}/api/payment/webhook -d '{"order_id":"x","status_code":"200","gross_amount":"1000","signature_key":"salah"}' -H "Content-Type: application/json"`) → harus 401 dan tidak mengubah data apa pun.

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
- Langkah 6–8 (Google Cloud Console, Midtrans webhook, test end-to-end) sama persis.

File `render.yaml` yang lama sudah dihapus dari repo karena hanya meng-cover `GEMINI_API_KEY` dan
tidak reflect kebutuhan env var yang sekarang jauh lebih banyak — pakai tabel di langkah 3 sebagai
sumber kebenaran env var, baik untuk Railway maupun Render.
