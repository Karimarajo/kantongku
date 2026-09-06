// Task (revisi, poin 11): infrastruktur i18n untuk toggle Bahasa ID/EN.
//
// Pola yang dipakai SAMA PERSIS seperti setActiveCurrency di utils.ts —
// module-level variable + fungsi getter/setter, BUKAN React Context/hook.
// Alasannya konsisten: t() dipanggil dari puluhan komponen yang sudah ada
// tanpa lewat props sama sekali; membungkusnya lewat Context berarti
// merombak provider tree DAN setiap consumer, jauh lebih invasif untuk
// manfaat yang sama. Efeknya app-wide & instan karena App.tsx sudah
// me-re-render seluruh tree tiap kali appSettings berubah (lihat
// handleSaveSettings) — persis mekanisme yang membuat pergantian mata uang
// langsung terlihat di semua tempat tanpa perlu context terpisah.
//
// CAKUPAN SAAT INI (jujur, bukan klaim penuh): navigasi (tab bar/sidebar),
// Home Dashboard, dan Profil/Pengaturan — layar dengan traffic tertinggi.
// Modal/halaman lain (AddTransactionModal, AccountView, Riwayat Transaksi,
// Kantong Bersama, Cicilan/Hutang, Panduan Pengguna, dll — ada 20+ file)
// MASIH bahasa Indonesia hard-coded, belum lewat t(). t() sengaja FALLBACK
// ke string Indonesia aslinya kalau key belum terdaftar utk bahasa aktif —
// jadi toggle ke EN tidak pernah menampilkan key mentah di layar yang
// belum diterjemahkan, cuma tetap bahasa Indonesia di situ untuk sementara.
export type Lang = 'id' | 'en';

let activeLang: Lang = 'id';

export function setActiveLanguage(lang: string) {
  if (lang === 'id' || lang === 'en') activeLang = lang;
}

export function getActiveLanguage(): Lang {
  return activeLang;
}

// Dictionary EN saja — ID adalah bahasa sumber asli (string yang sudah ada
// di seluruh JSX), jadi t() untuk activeLang 'id' cukup mengembalikan key
// itu sendiri (dipakai sebagai teks ID aslinya, bukan lookup). Ini kenapa
// setiap pemanggilan t('Home, {name}') dst di JSX menuliskan teks Indonesia
// APA ADANYA sebagai key-nya — kalau typo di key, yang tampil di mode ID
// tetap benar (persis key itu), cuma mode EN yang salah/fallback.
const EN: Record<string, string> = {
  // Navigasi (App.tsx: sidebar desktop + bottom nav mobile)
  'Home': 'Home',
  'Wallet': 'Wallet',
  'Riwayat': 'History',
  'Profil': 'Profile',

  // HomeDashboard.tsx — header
  'Welcome back,': 'Welcome back,',
  'Halo,': 'Hi,',

  // HomeDashboard.tsx — kartu & bagian utama
  'Total Saldo Seluruhnya': 'Total Balance',
  'dari bulan lalu': 'from last month',
  'Total Pengeluaran Bulan Ini': "This Month's Expenses",
  'Lihat Detail': 'View Detail',
  'Aksi Cepat': 'Quick Actions',
  'Atur': 'Edit',
  'Lihat Semua': 'View All',
  'Sembunyikan': 'Hide',
  'Target & Limit': 'Targets & Limits',
  'Aktivitas Terakhir': 'Recent Activity',
  'Aktivitas Kantong': 'Pocket Activity',
  'Notifikasi': 'Notifications',
  'baru': 'new',
  'Tidak ada notifikasi baru': 'No new notifications',

  // Aksi Cepat — label per tombol (HomeDashboard.tsx ALL_ACTIONS)
  'Add Transaksi': 'Add Transaction',
  'Transfer': 'Transfer',
  'Pengingat': 'Reminders',
  'Kelola Kantong': 'Manage Pockets',
  'Kantong Bersama': 'Shared Pockets',
  'Kelola Kategori': 'Manage Categories',
  'Riwayat Transaksi': 'Transaction History',
  'Cicilan/Hutang': 'Debts/Installments',

  // ProfileView.tsx
  'Tampilan': 'Appearance',
  'Mode Terang': 'Light Mode',
  'Mode Gelap': 'Dark Mode',
  'Mata Uang': 'Currency',
  'Tampilkan Sebagai': 'Display As',
  'Hanya mengganti simbol & format angka tampilan, bukan konversi kurs — nominal yang tersimpan tetap sama.':
    'Only changes the display symbol & number format, not a real exchange-rate conversion — stored amounts stay the same.',
  'Bahasa': 'Language',
  'Pengaturan': 'Settings',
  'Keluar dari Aplikasi': 'Log Out',
  'Terdaftar Sejak:': 'Member Since:',
};

// Fallback param cuma dipakai untuk teks yang mengandung interpolasi
// dinamis (mis. nama user) — komponen yang butuh itu memanggil t() untuk
// bagian statisnya saja, lalu menyusun sendiri string akhirnya di JSX.
export function t(key: string): string {
  if (activeLang === 'id') return key;
  return EN[key] ?? key;
}
