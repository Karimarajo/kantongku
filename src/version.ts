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
export const APP_VERSION = '7.4';

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
    version: '7.4',
    date: '6 September 2026',
    changes: [
      'Peningkatan sistem back-end & Admin Console (tidak ada perubahan tampilan untuk pengguna) — notifikasi order/pembayaran ke tim kami sekarang lebih cepat lewat push notification, follow-up otomatis untuk pembayaran yang belum selesai, dan Log Aktivitas kini menampilkan nominal lama/baru saat mengedit transaksi.',
    ],
  },
  {
    version: '7.3',
    date: '6 September 2026',
    changes: [
      'Selesai (tahap akhir): toggle Bahasa ID/EN kini mencakup hampir seluruh aplikasi — Wallet, Riwayat Transaksi, Kantong Bersama, Cicilan/Hutang, Target & Limit, Reminder, Kelola Kategori/Kantong, Detail Pengeluaran Bulanan, Log Aktivitas, Urutan Aksi Cepat, grafik Tren Mingguan & Analisis Kesehatan Keuangan, diagram donat, notifikasi push, dan Panduan Pengguna.',
      'Sengaja tidak berubah bahasa: halaman sebelum login (Landing, Login, Bantuan & Dukungan publik) karena setting bahasa baru dimuat setelah masuk akun; isi detail Panduan Pengguna dan narasi AI tetap Indonesia; Log Aktivitas lama tetap tercatat dalam bahasa saat kejadian.',
    ],
  },
  {
    version: '7.2',
    date: '6 September 2026',
    changes: [
      'Baru (tahap 1): toggle Bahasa ID/EN di menu Profil. Navigasi utama, Home Dashboard, dan Profil/Pengaturan sudah berbahasa Inggris penuh saat EN dipilih — menu/modal lain (Wallet, Riwayat Transaksi, Kantong Bersama, Cicilan/Hutang, Panduan Pengguna, dll) masih menyusul secara bertahap.',
    ],
  },
  {
    version: '7.1',
    date: '6 September 2026',
    changes: [
      'Baru: wallet Paylater/Kartu Kredit — logic terpisah dari wallet biasa. Transaksi lewat wallet ini tercatat "Belum Dibayar" dan tidak mengurangi Total Saldo, sampai dilunasi lewat "Bayar Tagihan" (pilih transaksi mana saja + wallet pembayar), baru saat itu benar-benar memotong saldo wallet pembayar.',
      'Baru: pilihan mata uang tampilan di menu Profil (dropdown — Rupiah, Dolar AS, Euro, dan lainnya). Mengganti simbol & format angka di seluruh app secara instan; murni tampilan, bukan konversi kurs — nominal yang tersimpan tidak berubah.',
    ],
  },
  {
    version: '7.0',
    date: '6 September 2026',
    changes: [
      'Perbaikan besar: pencatatan transaksi sekarang WAJIB memakai wallet yang sudah dialokasikan ke kantong yang dipilih — mencegah data saldo & alokasi jadi tidak sinkron antar wallet/kantong. Ditolak dengan info jelas kalau belum, mengarahkan ke "Atur Alokasi Saldo" di menu Wallet.',
      'Perbaikan besar: Kantong Bersama dirombak — transaksi yang dibuat rekan sekarang memakai kontribusi dana MEREKA SENDIRI (wajib disetor dulu dari wallet mereka lewat menu Kantong Bersama), bukan lagi otomatis membebani wallet pemilik kantong. Transaksi juga cuma bisa diedit/dihapus oleh pembuatnya sendiri.',
      'Baru: saat berbagi kantong diputus, seluruh transaksi yang dibuat rekan tersebut di kantong itu terhapus otomatis dan sisa kontribusi dananya dikembalikan penuh ke wallet mereka, lengkap dengan notifikasi pemberitahuan. Tombol putus hubungan juga sekarang menampilkan peringatan dulu sebelum dieksekusi.',
    ],
  },
  {
    version: '6.10',
    date: '6 September 2026',
    changes: [
      'Baru: KantongKu sekarang otomatis mendeteksi kalau ada versi baru — muncul notifikasi di lonceng dan banner "Muat Ulang" di atas layar, tidak perlu tebak-tebak kapan harus refresh. Panduan Pengguna juga ditambah cara update manual per platform kalau banner belum muncul.',
      'Perbaikan: Riwayat Transaksi — transfer antar wallet digabung jadi satu daftar dengan transaksi biasa, diurutkan campur dari yang terbaru (sebelumnya dua blok terpisah). Tetap tidak dihitung sebagai pemasukan/pengeluaran, cuma perpindahan dana.',
      'Perbaikan: Kantong Bersama — baris "Diputus" yang sebelumnya netap selamanya sekarang punya tombol Hapus Data dan Sambungkan Kembali (ikon, bukan kalimat). Undangan berbagi kantong baru juga otomatis muncul tanpa perlu refresh manual (dicek berkala setiap ±45 detik).',
      'Perbaikan: kontras badge status "Diputus" di Kantong Bersama yang sempat samar di mode Terang (abu di atas abu) — sekarang pakai warna merah muda yang jelas terbaca di kedua tema.',
    ],
  },
  {
    version: '6.9',
    date: '4 September 2026',
    changes: [
      'Perbaikan: Export PDF Riwayat Transaksi dirombak total — format Potrait A4, kop surat logo & "KantongKu", keterangan dibuat pada tanggal/jam berapa dan oleh siapa (nama & email), dan tabel baru bergaya buku kas/mutasi rekening: No, Tanggal, Transaksi, Kredit (hijau), Debit (merah), Balance (saldo berjalan, hitam tegas), Kategori, Catatan.',
    ],
  },
  {
    version: '6.8',
    date: '4 September 2026',
    changes: [
      'Perbaikan: palet warna mode Terang diperbarui ("Cool Sage") — kontras antara teks dan kartu yang sebelumnya samar sekarang jauh lebih tegas.',
      'Perbaikan: pencatatan pengeluaran sekarang ditolak (dengan keterangan saldo tersedia vs dibutuhkan) kalau nominalnya melebihi saldo akun/wallet yang dipakai — mencegah saldo jadi salah hitung kalau transaksi yang salah input itu dihapus/diedit lagi.',
      'Perbaikan: tombol "Add Dana" di Aksi Cepat Home diganti jadi "Add Transaksi" — fungsinya sekarang sama seperti tombol "+" di bawah layar (mobile), langsung membuka pilihan cara mencatat transaksi.',
    ],
  },
  {
    version: '6.5',
    date: '1 September 2026',
    changes: [
      'Perbaikan: tombol Aksi Cepat di Home dipadatkan (5 tombol per baris, tampil 5 teratas + "Lihat Semua"), urutannya sekarang bisa diatur sendiri lewat geser/drag & drop. Tombol Log Activity dihapus dari Home (tetap ada di Profil).',
      'Perbaikan: tombol kembali di Kantong Bersama, Cicilan/Hutang, dan Detail Pengeluaran Bulanan sekarang menuju halaman TEMPAT tombolnya ditekan (Home atau Profil) — sebelumnya selalu menuju Profil/Home tetap, tidak peduli dari mana dibuka.',
      'Perbaikan: SEMUA notifikasi sekarang bisa diklik dan diarahkan ke asalnya (Pencatatan Berhasil → transaksinya, peringatan Target & Limit → menu Target & Limit, dst) — bar "Pengingat Aktif" terpisah di panel notifikasi dihapus lagi.',
      'Perbaikan: notifikasi push sempat gagal diaktifkan di server lokal ("belum dikonfigurasi") — kunci VAPID untuk environment dev sekarang sudah diisi.',
      'Perbaikan: di Pengingat, tombol "Sudah Bayar" diganti jadi "Bayar" — begitu ditekan baru berubah keterangannya jadi "Sudah Bayar" dan kartunya meredup, sampai siklus pengingat berikutnya.',
      'Perbaikan: kontras teks pada tombol/kartu hijau (mis. tombol submit, "Bayar") yang sempat sulit dibaca di beberapa tempat — warna teks di atas warna primary sekarang benar-benar ditetapkan (gelap di atas hijau terang, terang di atas hijau gelap), bukan ikut warna teks sekitarnya.',
    ],
  },
  {
    version: '6.4',
    date: '1 September 2026',
    changes: [
      'Baru: Pengingat sekarang bisa diedit, dan punya tombol "Sudah Bayar" — kalau diisi detail nominal/wallet/kategori saat membuat pengingat, satu tekan otomatis mencatat transaksinya dan pengingatnya otomatis nonaktif sampai siklus berikutnya (minggu/bulan depan, tergantung tipe pengulangan).',
      'Baru: Cicilan/Hutang juga punya wallet & kategori pembayaran (bisa diedit), dan "Sudah Bayar" otomatis mencatat transaksi. Riwayat pembayaran tiap cicilan sekarang bisa diedit atau dihapus langsung (kalau salah pencet) — otomatis ikut mengubah/menghapus transaksinya di Riwayat Transaksi juga, dan sebaliknya.',
      'Baru: fitur-fitur di menu Profil (Kelola Kantong, Kantong Bersama, Kelola Kategori, Riwayat Transaksi, Log Activity, Cicilan/Hutang) sekarang juga tersedia sebagai tombol bulat langsung di Home, sama seperti Add Dana/Transfer/Target & Limit/Pengingat.',
      'Baru: ikon lonceng notifikasi sekarang juga menampilkan daftar Pengingat Aktif, dan setiap notifikasi/pengingat bisa ditekan untuk langsung menuju transaksi, Pengingat, atau Cicilan/Hutang yang bersangkutan.',
    ],
  },
  {
    version: '6.3',
    date: '1 September 2026',
    changes: [
      'Baru: sidebar desktop sekarang bisa diciutkan (tombol panah di pojok atas) supaya area kerja lebih lega.',
      'Perbaikan: tampilan Home di desktop — kartu Saldo, Pengeluaran Bulan Ini, Kantong, dan tombol Add Dana/Transfer/Target & Limit/Pengingat sekarang melebar penuh sampai ujung kanan; Target & Limit dan Aktivitas Terakhir pindah ke baris di bawahnya, dan Aktivitas Terakhir menampilkan semua transaksi (tidak lagi dipotong 5 teratas) di layar desktop.',
      'Baru: menu "Analisis" dihapus — grafik Tren Pengeluaran Mingguan dan diagram kategori sekarang tampil langsung di halaman Riwayat Transaksi, dan grafik mingguan juga tampil di Detail Pengeluaran Bulanan (di bawah pilihan bulan) saat menekan "Lihat Keseluruhan".',
      'Perbaikan: notifikasi pengingat (tagihan, cicilan, kantong custom) kini mengikuti zona waktu PERANGKAT masing-masing pengguna secara otomatis, bukan selalu WIB — pengguna WITA/WIT (atau di luar Indonesia) tidak lagi menerima pengingat yang melesat jamnya.',
      'Perbaikan: di PC/laptop, baris pilihan kategori saat input transaksi sekarang bisa digeser dengan klik-tahan-geser mouse atau scroll — sebelumnya cuma bisa digeser lewat layar sentuh.',
      'Perbaikan: satu akun sekarang bisa login aktif di 3 jenis perangkat sekaligus (1 PC + 1 HP + 1 tablet) — sebelumnya login baru di perangkat mana pun langsung mengeluarkan sesi di perangkat lain, sekarang hanya perangkat dengan JENIS yang sama yang saling gantian.',
    ],
  },
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
