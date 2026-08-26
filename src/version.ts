// Single source of truth for the version shown at the bottom of Profil
// (ProfileView.tsx) and for the changelog at the top of Panduan Pengguna
// (GuideView.tsx). Convention (2026-08-22, per user request): bump this —
// AND add a matching CHANGELOG entry — as part of the SAME commit that
// ships each deploy:
//   - small fix / incremental feature → MINOR + 1        (5.2 → 5.3)
//   - large overhaul / major feature   → MAJOR + 1, MINOR resets to 0
//                                         (5.9 → 6.0)
// There's no CI/build step in this repo to derive this automatically from
// commit history, so it's maintained by hand here — this file's whole job
// is to be the one place that needs editing. GuideView reads CHANGELOG[0]
// ONLY to render "Update Terbaru" (a "what's new" notice, not a full
// history log — per user request) and uses APP_VERSION to decide the
// unseen-update badge (see GUIDE_VERSION_STORAGE_KEY in GuideView.tsx) —
// that's the "otomatis terdeteksi ada push baru" behavior: the badge
// compares APP_VERSION against what's saved in localStorage, not a live
// check against a server. Older entries stay in this array purely as an
// internal maintenance archive — add new ones to the FRONT (index 0).
export const APP_VERSION = '6.1';

export interface ChangelogEntry {
  version: string;
  date: string; // human-readable, Indonesian, e.g. "22 Agustus 2026"
  changes: string[];
}

// Newest first. History starts at 5.3 — the first entry made once this
// version-tracking convention itself existed; earlier fixes were shipped
// before there was a version number to attach them to, so they're not
// backfilled here rather than guessed at.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '6.1',
    date: '26 Agustus 2026',
    changes: [
      'Perbaikan: "Kantong Bersama" sekarang tampil langsung di Dashboard seperti kantong lain (label "Milik ..."), dan jadi pilihan kantong biasa (badge "Bersama") saat rekan menambah transaksi — sebelumnya cuma bisa diakses lewat menu terpisah di Profil.',
      'Baru: Export PDF Riwayat Transaksi kini menampilkan ringkasan Total Transaksi, Total Pemasukan, dan Total Pengeluaran di bagian atas.',
      'Perbaikan: Export CSV sekarang terbuka rapi sebagai tabel di Excel (kolom tidak lagi menyatu jadi satu), lengkap dengan ringkasan total yang sama seperti PDF.',
      'Panduan Pengguna diperbarui menyesuaikan fitur Kantong Bersama, Export CSV/PDF, dan Mode Gelap/Terang.',
    ],
  },
  {
    version: '6.0',
    date: '26 Agustus 2026',
    changes: [
      'Baru: "Kantong Bersama" menggantikan fitur Kolaborator lama — sekarang Anda membagikan satu kantong tertentu (misal Kantong Bisnis) ke rekan yang sudah punya akun KantongKu sendiri, bukan seluruh data akun. Rekan bisa terima/tolak undangan, dan transaksi yang mereka catat di kantong bersama otomatis memotong wallet Anda. Gratis, tanpa pembayaran.',
      'Baru: tombol Export di halaman Riwayat Transaksi — unduh data yang sedang tampil (sesuai filter aktif) sebagai CSV atau PDF, lengkap dengan kolom kantong, wallet, kategori, dan siapa yang menginput.',
      'Baru: mode tampilan Terang/Gelap, bisa diganti lewat toggle di halaman Profil (default: Gelap).',
    ],
  },
  {
    version: '5.4',
    date: '22 Agustus 2026',
    changes: [
      'Baru: halaman Panduan Pengguna di dalam aplikasi (yang sedang Anda baca ini) — rangkuman semua fitur plus catatan pembaruan setiap ada versi baru.',
      'Baru: menu "Bantuan & Dukungan" di halaman Profil, langsung terhubung ke tim support.',
      'Perbaikan: di versi desktop/laptop, sekarang ada tombol "Tambah Transaksi" langsung di sidebar kiri — sebelumnya cuma bisa lewat HP.',
      'Perbaikan: menu sidebar di desktop sempat ikut bergeser saat halaman digulir — sekarang diam di tempat.',
    ],
  },
  {
    version: '5.3',
    date: '21 Agustus 2026',
    changes: [
      'Baru: ringkasan Target & Limit langsung tampil di Dashboard (di bawah tombol Add Dana/Transfer/Target & Limit/Pengingat), jadi progres tabungan dan batas belanja terlihat tanpa buka menu lain.',
      'Baru (Admin): diagram lokasi dan browser pengunjung di Analytics.',
      'Perbaikan: label metode pembayaran yang sempat salah tampil sebagai "Transfer BCA"/"ShopeePay" di beberapa tempat — sekarang konsisten "QRIS" (satu-satunya metode bayar aplikasi ini).',
      'Perbaikan: notifikasi pengingat (tagihan, cicilan, kantong custom) yang sempat meleset jamnya — sekarang selalu mengacu waktu WIB dengan benar, kapan pun servernya di-deploy ulang.',
    ],
  },
];
