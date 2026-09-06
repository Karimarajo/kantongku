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

  // AddTransactionModal.tsx
  'Mohon isi judul transaksi': 'Please fill in the transaction title',
  'Nominal harus lebih besar dari 0': 'Amount must be greater than 0',
  'Kembali': 'Back',
  'Ubah Transaksi': 'Edit Transaction',
  'Catat Pengeluaran': 'Record Expense',
  'AI Scanner Struk': 'AI Receipt Scanner',
  'Mendikte lewat Suara': 'Dictate by Voice',
  'Input Manual': 'Manual Input',
  'Ketik Apapun': 'Type Anything',
  'Pilih Cara Catat Uang': 'Choose How to Record',
  'Tulis bebas satu kalimat, AI yang urus sisanya': 'Write one free-form sentence, AI handles the rest',
  'Foto Struk Belanja': 'Photo of Receipt',
  'Baca nota instan otomatis pakai AI asli': 'Instantly read your receipt with real AI',
  'Catat Pakai Suara': 'Record by Voice',
  'Rekam suara asli / dikte via AI': 'Record real audio / dictate via AI',
  'Ketik manual nominal & kategori': 'Manually type the amount & category',
  'Menganalisis Struk...': 'Analyzing Receipt...',
  'Ambil Foto atau Klik Upload Struk': 'Take a Photo or Click to Upload Receipt',
  'Kirim file nota belanjaan asli Anda untuk dibongkar AI': 'Send your real receipt file for AI to break down',
  'Atau gunakan demo struk instan:': 'Or use an instant demo receipt:',
  'Selesai & Kirim Ke AI': 'Done & Send to AI',
  'Unggah Berkas Audio Asli': 'Upload Real Audio File',
  'Klik ikon **Mikrofon** untuk mulai merekam suara asli Anda, atau unggah file rekaman dari device Anda.':
    'Tap the **Microphone** icon to start recording your real voice, or upload a recording from your device.',
  'Demo Bicara Instan (Tiruan):': 'Instant Voice Demo (Mock):',
  'Input Teks/Suara Bebas': 'Free Text/Voice Input',
  'Mohon isi teks terlebih dahulu': 'Please fill in the text first',
  'Parse Teks via AI': 'Parse Text via AI',
  'Pengeluaran': 'Expense',
  'Pemasukan': 'Income',
  'Judul Transaksi': 'Transaction Title',
  'Nominal (Rp)': 'Amount',
  'Waktu Catatan': 'Record Time',
  'Hari Ini': 'Today',
  'Kemarin': 'Yesterday',
  'Lusa': 'Day After Tomorrow',
  'Kalender': 'Calendar',
  'Sumber Dana / Kantong': 'Funding Source / Pocket',
  'Bersama': 'Shared',
  'Sumber Dana': 'Funding Source',
  'Dana dari kontribusi Anda sendiri:': 'Funds from your own contribution:',
  'Anda belum menyetor dana ke kantong ini — buka menu': "You haven't deposited funds to this pocket yet — open the",
  'untuk menyetor dulu sebelum mencatat transaksi pengeluaran.': 'menu to deposit first before recording an expense.',
  'Rekening / Dompet Fisik': 'Account / Physical Wallet',
  'Paylater': 'Paylater',
  'Kategori': 'Category',
  'Catatan Tambahan (Opsional)': 'Additional Notes (Optional)',
  'Simpan Perubahan': 'Save Changes',
  'Simpan Transaksi': 'Save Transaction',

  // AccountView.tsx
  'Dompet & Wallet': 'Wallet & Accounts',
  'Kelola simpanan fisik (Bank/E-Wallet/Dompet) dan pantau alokasi kantong di dalamnya.':
    'Manage your physical savings (Bank/E-Wallet/Cash) and track pocket allocations within them.',
  'Tambah Wallet': 'Add Wallet',
  'Tidak Dapat Dihapus': 'Cannot Be Deleted',
  'Saya Mengerti': 'I Understand',
  'Belum ada rekening dibuat. Silakan tambah rekening baru.': 'No account created yet. Please add a new one.',
  'Tagihan Berjalan': 'Current Bill',
  'dari limit': 'of limit',
  'Saldo Total': 'Total Balance',
  'a.n.': 'a/n',
  'Pemberian Alokasi': 'Allocation Breakdown',
  'Bayar Tagihan': 'Pay Bill',
  'Tagihan berjalan': 'Current bill',
  'Tidak ada tagihan yang belum dibayar.': 'No unpaid bills.',
  'Total Terpilih:': 'Total Selected:',
  'Bayar Dengan Wallet': 'Pay With Wallet',
  'Belum ada wallet biasa': 'No regular wallet yet',
  'Bayar': 'Pay',
  'Atur Alokasi Saldo': 'Adjust Balance Allocation',
  'Tentukan alokasi saldo': 'Set the allocation of balance',
  'ke kantong-kantong.': 'across your pockets.',
  'Terhitung Otomatis': 'Auto-Calculated',
  'Total Saldo Wallet:': 'Total Wallet Balance:',
  'Total Dialokasikan:': 'Total Allocated:',
  'Sisa Saldo:': 'Remaining Balance:',
  'Simpan Alokasi': 'Save Allocation',
  'Batal': 'Cancel',
  'Rincian Alokasi Uang': 'Money Allocation Details',
  'Uang di wallet ini belum teralokasi ke kantong mana pun.': 'The money in this wallet is not yet allocated to any pocket.',
  'Klik tombol di bawah untuk menetapkan alokasi awal.': 'Click the button below to set the initial allocation.',
  'dari saldo wallet': 'of wallet balance',
  'Sesuaikan Alokasi Dana': 'Adjust Fund Allocation',
  'Saldo wallet Rp 0. Catat pemasukan baru di wallet ini terlebih dahulu untuk mengalokasikan dana.':
    'Wallet balance is 0. Record new income in this wallet first before allocating funds.',
  'Pilih Wallet': 'Select Wallet',
  'Klik salah satu kartu wallet di samping untuk melihat rincian alokasi kantong di dalamnya.':
    'Click one of the wallet cards on the side to see its pocket allocation details.',
  'Nama Wallet / Dompet': 'Wallet / Account Name',
  'Jenis Wallet': 'Wallet Type',
  'Wallet Biasa': 'Regular Wallet',
  'Paylater / Kartu Kredit': 'Paylater / Credit Card',
  'Transaksi lewat wallet ini tercatat "belum dibayar" dan tidak mengurangi Total Saldo — baru terhitung setelah dilunasi lewat "Bayar Tagihan".':
    'Transactions through this wallet are recorded as "unpaid" and do not reduce your Total Balance — they only count once paid off via "Pay Bill".',
  'No Rekening': 'Account Number',
  'Nama Pemilik Rekening': 'Account Holder Name',
  'Limit Kredit (Rp)': 'Credit Limit',
  'Saldo Awal Wallet (Rp)': 'Initial Wallet Balance',
  'Saldo Wallet (Rp)': 'Wallet Balance',
  'Tema Warna Aksen': 'Accent Color Theme',
  'Pilih Ikon Wallet': 'Choose Wallet Icon',
  'Simpan Wallet': 'Save Wallet',
  'Bank': 'Bank',
  'E-Wallet': 'E-Wallet',
  'Uang Tunai': 'Cash',
  'Dompet Lain': 'Other Wallet',
  'Apakah Anda yakin ingin menghapus rekening': 'Are you sure you want to delete the account',
  'Peringatan: Semua riwayat transaksi yang menggunakan rekening ini juga akan dihapus secara permanen!':
    'Warning: All transaction history using this account will also be permanently deleted!',
  'Total alokasi harus sama dengan total saldo wallet.': 'Total allocation must equal the total wallet balance.',
  'Nama rekening tidak boleh kosong': 'Account name cannot be empty',

  // TransactionHistoryPage.tsx
  'Semua Data': 'All Data',
  'Reset': 'Reset',
  'Opsi Penyaringan Tingkat Lanjut': 'Advanced Filter Options',
  'Export': 'Export',
  'transaksi': 'transactions',
  'Export CSV': 'Export CSV',
  'Export PDF': 'Export PDF',
  'Semua Kas': 'All Cash',
  'Masuk': 'In',
  'Keluar': 'Out',
  'Pilih Kategori': 'Select Category',
  'Pilih Kantong': 'Select Pocket',
  'Pilih Wallet / Rekening': 'Select Wallet / Account',
  'Netto': 'Net',
  'Tidak ada data mutasi yang cocok dengan filter.': 'No matching data found for this filter.',
  'Bukan Transaksi': 'Not a Transaction',
  'Belum Dibayar': 'Unpaid',
  'Hapus transaksi': 'Delete transaction',

  // SharedPocketsView.tsx
  'Undangan Menunggu': 'Pending Invitations',
  'Seseorang': 'Someone',
  'mengajak Anda ke kantong': 'invited you to the pocket',
  'Dibagikan ke Saya': 'Shared With Me',
  'Belum ada kantong yang dibagikan ke Anda.': 'No pocket has been shared with you yet.',
  'Buka tab Home untuk lihat transaksi dan mencatat transaksi baru — kantong ini muncul di sana bersama kantong Anda sendiri.':
    'Open the Home tab to view and record transactions — this pocket appears there alongside your own pockets.',
  'milik': 'owned by',
  'Yakin ingin keluar dari kantong': 'Are you sure you want to leave the pocket',
  'Transaksi yang Anda buat di kantong ini akan dihapus, dan sisa kontribusi dana Anda': 'Transactions you made in this pocket will be deleted, and your remaining contribution',
  'akan dikembalikan ke wallet Anda.': 'will be returned to your wallet.',
  'Kontribusi saya:': 'My contribution:',
  'Setor Dana': 'Deposit Funds',
  'Dari Wallet Saya': 'From My Wallet',
  'Setor': 'Deposit',
  'Kantong Saya yang Dibagikan': 'Pockets I Shared',
  'Bagikan Kantong': 'Share Pocket',
  'Anda belum membagikan kantong apa pun.': "You haven't shared any pocket yet.",
  'Aktif': 'Active',
  'Menunggu': 'Pending',
  'Diputus': 'Disconnected',
  'Hapus riwayat berbagi kantong ini dengan': 'Delete the sharing history for this pocket with',
  'Tindakan ini tidak bisa dibatalkan.': 'This action cannot be undone.',
  'Yakin memutus': 'Are you sure you want to disconnect',
  'dari kantong': 'from the pocket',

  // DebtManagerView.tsx
  'Mohon isi nama cicilan/hutang': 'Please fill in the debt/installment name',
  'Total pokok harus lebih besar dari 0': 'Principal amount must be greater than 0',
  'Cicilan per bulan harus lebih besar dari 0': 'Monthly installment must be greater than 0',
  'Tenor harus lebih besar dari 0': 'Tenor must be greater than 0',
  'Tanggal jatuh tempo harus antara 1-31': 'Due date must be between 1-31',
  'Jatuh tempo tiap tanggal': 'Due every date',
  'bulan terbayar': 'months paid',
  'Sisa Utang': 'Remaining Debt',
  'Sudah Bayar Bulan Ini': 'Paid This Month',
  'Lunas': 'Paid Off',
  'Wallet & Kategori pembayaran belum diisi — buka Edit untuk melengkapinya sebelum menandai sudah bayar.':
    'Payment wallet & category not filled in yet — open Edit to complete it before marking as paid.',
  'Riwayat pembayaran': 'Payment history',
  'Hapus riwayat pembayaran ini? Transaksi terkait di Riwayat Transaksi juga akan terhapus.':
    'Delete this payment history? The related transaction in Transaction History will also be deleted.',
  'Kelola Cicilan/Hutang': 'Manage Debts/Installments',
  'Sekali input, dua manfaat: otomatis diingatkan tiap tanggal jatuh tempo (lewat Pengingat) sekaligus terpantau progresnya di sini. Tekan "Sudah Bayar" untuk otomatis mencatat transaksinya.':
    'One entry, two benefits: automatically reminded on each due date (via Reminders) and its progress tracked here. Tap "Paid" to automatically record the transaction.',
  'Tambah Cicilan/Hutang': 'Add Debt/Installment',
  'Edit Cicilan/Hutang': 'Edit Debt/Installment',
  'Cicilan/Hutang Baru': 'New Debt/Installment',
  'Nama': 'Name',
  'Total Pokok (Rp)': 'Total Principal',
  'Cicilan/Bulan (Rp)': 'Installment/Month',
  'Tenor (bulan)': 'Tenor (months)',
  'Tanggal Jatuh Tempo': 'Due Date',
  'Tanggal Mulai': 'Start Date',
  'Dibayar Dari (untuk tombol "Sudah Bayar")': 'Paid From (for the "Paid" button)',
  'Simpan Cicilan/Hutang': 'Save Debt/Installment',
  'Belum ada cicilan/hutang aktif.': 'No active debts/installments yet.',
  'Sudah Lunas': 'Paid Off',

  // ReminderModal.tsx
  'Sekali Saja': 'Once',
  'Setiap Hari': 'Every Day',
  'Setiap Minggu': 'Every Week',
  'Setiap Bulan': 'Every Month',
  'Pengingat & Alarm Agenda': 'Reminders & Agenda Alarm',
  'Edit Pengingat': 'Edit Reminder',
  'Buat Pengingat Baru': 'Create New Reminder',
  'Batal Edit': 'Cancel Edit',
  'Judul Rencana / Agenda': 'Plan / Agenda Title',
  'Atur Tanggal & Jam': 'Set Date & Time',
  'Tipe Pengulangan': 'Repeat Type',
  'Detail Transaksi (opsional — untuk tombol "Sudah Bayar")': 'Transaction Detail (optional — for the "Paid" button)',
  'Tambah Rencana Pengingat': 'Add Reminder Plan',
  'Daftar Pengingat Aktif': 'Active Reminders List',
  'Belum ada rencana pengingat yang dibuat.': 'No reminder plan has been created yet.',
  'Edit pengingat': 'Edit reminder',
  'Kelola dari menu Cicilan/Hutang': 'Manage from the Debts/Installments menu',
  'Hapus': 'Delete',
  'Terhubung Cicilan/Hutang — kelola & "Sudah Bayar" dari menu Cicilan/Hutang':
    'Linked to a Debt/Installment — manage & "Pay" from the Debts/Installments menu',

  // BudgetModal.tsx
  'Mohon isi nama Aturan Target & Limit': 'Please fill in the Target & Limit rule name',
  'Sediakan batas jajan / target dana alarm yang valid': 'Provide a valid spending limit / target fund amount',
  'Mohon pilih minimal satu kategori untuk target & limit ini': 'Please select at least one category for this target & limit',
  'Mohon isi rentang tanggal kustom secara lengkap': 'Please fill in the full custom date range',
  'Waktu akhir harus lebih besar dari waktu mulai / waktu sekarang!': 'The end time must be later than the start/current time!',
  'Pantau batas pengeluaran alarm dan target tabungan secara otomatis berbasis kategori transaksi riil.':
    'Automatically track spending alarm limits and savings targets based on your real transaction categories.',
  'Atur Target & Limit Baru': 'Set a New Target & Limit',
  'Edit Aturan': 'Edit Rule',
  'Atur Aturan Baru': 'Set a New Rule',
  'Limit Belanja': 'Spending Limit',
  'Target Nabung': 'Savings Target',
  'Nama Aturan / Alarm': 'Rule / Alarm Name',
  'Batas Limit / Target Alarm (Rp)': 'Limit / Target Alarm Amount',
  'Koneksikan Kategori Transaksi': 'Connect Transaction Categories',
  'Siklus Waktu Pemantauan': 'Monitoring Time Cycle',
  '1 Minggu': '1 Week',
  '1 Bulan': '1 Month',
  'Tanggal (Rentang Kustom)': 'Date (Custom Range)',
  'Mulai': 'Start',
  'Selesai': 'End',
  'Aktifkan Alarm': 'Activate Alarm',
  'Belum ada Target & Limit yang dikonfigurasi.': 'No Target & Limit has been configured yet.',
  'Lajur seret atau gunakan tombol navigasi prioritas di bawah': 'Drag the row, or use the priority navigation buttons below',
  'Aman': 'Safe',
  'OVER BUDGET!': 'OVER BUDGET!',
  'ALARM': 'ALARM',
  'LIMIT AMAN': 'SAFE LIMIT',
  'GOAL DICAPAI!': 'GOAL REACHED!',
  'TERKUMPUL': 'COLLECTED',
  'Peringatan Keras: Limit Belanja': 'Hard Warning: Spending Limit',
  'sudah melampaui batas nominal aman!': 'has exceeded the safe amount limit!',
  'Perhatian: Pemakaian jajan kategori ini sudah menyentuh': 'Attention: Spending in this category has reached',
  'Selamat! Target Nabung celengan': 'Congratulations! Your savings target',
  'Anda sudah terpenuhi': 'has been reached',
  'Sedikit lagi! Target menabung Anda sudah mencapai': "Almost there! Your savings target has reached",
  'Limit': 'Limit',
  'Target': 'Target',
  'Sisa': 'Remaining',
  'Over Limit': 'Over Limit',
  'Terkumpul': 'Collected',
  'Hapus aturan Target & Limit': 'Delete the Target & Limit rule',

  // CategoryManagerModal
  'Nama kategori tidak boleh kosong': 'Category name cannot be empty',
  'Apakah Anda yakin ingin menghapus kategori': 'Are you sure you want to delete the category',
  'Peringatan: Semua riwayat transaksi dengan kategori ini juga akan dihapus secara permanen!': 'Warning: All transaction history with this category will also be permanently deleted!',
  'Kelola Kategori Transaksi': 'Manage Transaction Categories',
  'Tambah Kategori Baru': 'Add New Category',
  'Ubah Kategori': 'Edit Category',
  'Peringatan Penghapusan': 'Deletion Warning',
  'Seret ikon': 'Drag the icon',
  'untuk mengubah urutan': 'to reorder',
  'Belum ada kategori yang ditambahkan.': 'No categories added yet.',
  'Naik': 'Up',
  'Turun': 'Down',
  'Nama Kategori': 'Category Name',
  'Contoh: Belanja Bulanan, Jajan Anak': "Example: Monthly Shopping, Kids' Snacks",
  'Tema Warna Kategori (Pilih 1 dari 15)': 'Category Color Theme (Choose 1 of 15)',
  'Pilih Ikon Kategori (Pilih 1 dari 30)': 'Choose Category Icon (Choose 1 of 30)',
  'Simpan Kategori': 'Save Category',
  // Category icon labels
  'Makan': 'Food',
  'Belanja': 'Shopping',
  'Jajan Kopi': 'Coffee',
  'Olahraga': 'Sports',
  'Kesehatan': 'Health',
  'Sosial': 'Social',
  'Pendapatan': 'Income',
  'Rumah/Tagihan': 'Home/Bills',
  'Bensin/Mobil': 'Gas/Car',
  'Liburan': 'Vacation',
  'Hiburan/Game': 'Entertainment/Games',
  'Pendidikan': 'Education',
  'Hadiah': 'Gift',
  'Bisnis': 'Business',
  'Membaca/Buku': 'Reading/Books',
  'Pemeliharaan': 'Maintenance',
  'Listrik': 'Electricity',
  'Internet/Pulsa': 'Internet/Phone Credit',
  'Streaming/TV': 'Streaming/TV',
  'Bioskop': 'Cinema',
  'Pakaian': 'Clothing',
  'Kecantikan': 'Beauty',
  'Bayi': 'Baby',
  'Hewan': 'Pets',
  'Gadget': 'Gadget',
  'Tabungan': 'Savings',
  'Tiket/Event': 'Ticket/Event',
  'Kendaraan Umum': 'Public Transport',
  'Lain-lain': 'Others',
  'Amal/Donasi': 'Charity/Donation',

  // PocketManagerModal
  'Nama kantong tidak boleh kosong': 'Pocket name cannot be empty',
  'Apakah Anda yakin ingin menghapus kantong': 'Are you sure you want to delete the pocket',
  'Peringatan: Semua riwayat transaksi yang menggunakan kantong ini juga akan dihapus secara permanen!': 'Warning: All transaction history using this pocket will also be permanently deleted!',
  'Kelola Kantong Keuangan': 'Manage Financial Pockets',
  'Ubah Detail Kantong': 'Edit Pocket Details',
  'Pindahkan ke atas': 'Move up',
  'Pindahkan ke bawah': 'Move down',
  'Edit kantong': 'Edit pocket',
  'Hapus kantong': 'Delete pocket',
  'Nama Kantong': 'Pocket Name',
  'Contoh: Tabungan Liburan, Belanja Mingguan': 'Example: Vacation Savings, Weekly Shopping',
  'Catatan / Tagline Singkat': 'Note / Short Tagline',
  'Contoh: Tabungan target akhir tahun': 'Example: Year-end savings target',
  'Saldo Awal (Rp)': 'Initial Balance',
  'Tema Warna': 'Color Theme',
  'Pilih Ikon': 'Choose Icon',
  'Simpan Kantong': 'Save Pocket',
  // Pocket icon labels
  'Dompet': 'Wallet',
  'Bendahara/Kas': 'Treasurer/Cash Box',
  'Toko/Bisnis': 'Shop/Business',
  'Jajan/Kafe': 'Snacks/Cafe',
  'Tabungan/Bebas': 'Savings/Free',
  'Celengan': 'Piggy Bank',
  'Kartu': 'Card',
  'Koin/Cash': 'Coins/Cash',
  'Rumah/Sewa': 'Home/Rent',
  'Transport/Bensin': 'Transport/Gas',
  'Travel/Liburan': 'Travel/Vacation',
  'Game/Hiburan': 'Games/Entertainment',
  'Hadiah/Amal': 'Gift/Charity',
  'Pekerjaan/Gaji': 'Work/Salary',

  // MonthlyExpenseView
  'Detail Pengeluaran Bulanan': 'Monthly Expense Detail',
  'Bulan sebelumnya': 'Previous month',
  'Bulan berikutnya': 'Next month',
  'Belum bisa melihat bulan yang akan datang': "Can't view a future month yet",
  'Total Pengeluaran': 'Total Expenses',
  'Tidak ada transaksi di bulan ini.': 'No transactions this month.',
  'Edit Transaksi': 'Edit Transaction',
  'Hapus Transaksi': 'Delete Transaction',

  // ActivityLogView
  'Apakah Anda yakin ingin membersihkan seluruh Log Activity? Riwayat ini tidak dapat dikembalikan.': 'Are you sure you want to clear the entire Activity Log? This history cannot be restored.',
  'Log Activity': 'Activity Log',
  'Catatan riwayat aktivitas Anda di KantongKu. Log ini bersifat informatif saja dan tidak memengaruhi saldo maupun laporan.': 'A record of your activity history in KantongKu. This log is for information only and does not affect balances or reports.',
  'Bersihkan Log': 'Clear Log',
  'Belum ada aktivitas yang tercatat.': 'No activity recorded yet.',

  // QuickActionOrderModal
  'Atur Urutan Aksi Cepat': 'Arrange Quick Action Order',
  'Geser (atau pakai panah) untuk mengatur urutan. 5 teratas yang langsung tampil di Home.': 'Drag (or use the arrows) to reorder. The top 5 show directly on Home.',
  'Tampil': 'Shown',
  'Lainnya': 'Others',
  'Simpan Urutan': 'Save Order',

  // WeeklyTrendChart
  'Total Belanja Bulan Ini': "This Month's Total Spending",
  'Lihat Keseluruhan': 'View All',
  'Grafik Riil': 'Real Chart',
  'Minggu': 'Week',
  'Minggu Riil': 'Real Week',
  'Tidak ada mutasi': 'No activity',
  'Tutup [x]': 'Close [x]',

  // FinancialHealthCard
  'Gagal menganalisis kesehatan keuangan': 'Failed to analyze financial health',
  'Gagal menganalisis kesehatan keuangan. Coba lagi nanti.': 'Failed to analyze financial health. Please try again later.',
  'Menganalisis...': 'Analyzing...',
  'Analisis Kesehatan Keuangan': 'Financial Health Analysis',
  'Memakai rentang tanggal dari filter di atas': 'Using the date range from the filter above',
  's/d': 'to',
  'Sehat': 'Healthy',
  'Cukup Sehat': 'Fairly Healthy',
  'Perlu Perhatian': 'Needs Attention',
  'Narasi AI tidak tersedia saat ini — kategori di atas dihitung langsung dari ambang batas rasio.': 'AI narrative is unavailable right now — the category above was calculated directly from the ratio thresholds.',
  'Cicilan/Utang': 'Installments/Debt',
  'sehat': 'healthy',
  'Menabung': 'Savings',
  'Likuiditas': 'Liquidity',
  'Saran': 'Suggestions',
  'Hasil ini hanya terlihat oleh Anda (dan kolaborator jika ada) — tidak dibagikan ke pihak luar.': 'This result is visible only to you (and collaborators, if any) — it is not shared externally.',

  // DonutChart / CategoryDonutChart
  'Belum ada data bulan ini.': 'No data for this month yet.',
  'Belum ada pengeluaran.': 'No expenses yet.',
  'Belum ada pemasukan.': 'No income yet.',
  'Filter': 'Filter',

  // PushNotificationToggle
  'Notifikasi push aktif di perangkat ini': 'Push notifications are active on this device',
  'Notifikasi push belum didukung di browser ini. Di iPhone, tambahkan KantongKu ke Layar Utama dulu (keterbatasan Apple, bukan bug).': "Push notifications aren't supported in this browser yet. On iPhone, add KantongKu to your Home Screen first (an Apple limitation, not a bug).",
  'Aktifkan Notifikasi': 'Enable Notifications',

  // GuideView — chrome + section titles (accordion bodies stay in Indonesian;
  // see conversation notes on scope for the deep prose content)
  'Panduan Pengguna': 'User Guide',
  'Rangkuman cara pakai semua fitur KantongKu, plus catatan pembaruan setiap kali ada versi baru.': 'A summary of how to use every KantongKu feature, plus update notes for every new version.',
  'Update Terbaru': 'Latest Update',
  'Panduan Fitur': 'Feature Guide',
  'Mulai Cepat & Install ke HP': 'Quick Start & Install to Phone',
  'Catat Transaksi Secepat Kilat': 'Record Transactions in a Flash',
  'Kelola Dompet / Wallet': 'Manage Wallets',
  'Kantong: Target Tabungan & Limit Belanja': 'Pockets: Savings Targets & Spending Limits',
  'Kategori Transaksi': 'Transaction Categories',
  'Reminder Tagihan & Kelola Cicilan/Hutang': 'Bill Reminders & Installment/Debt Management',
  'Kantong Bersama — Bagikan Satu Kantong ke Rekan': 'Shared Pockets — Share a Single Pocket with a Partner',
  'Statistik & Diagram Interaktif': 'Interactive Statistics & Charts',
  'Riwayat Transaksi & Rekap Bulanan': 'Transaction History & Monthly Recap',
  'Analisis Kesehatan Keuangan oleh AI': 'AI Financial Health Analysis',
  'Log Aktivitas': 'Activity Log',
  'Notifikasi Pengingat': 'Reminder Notifications',
  'Mode Gelap/Terang': 'Dark/Light Mode',
  'Bantuan & Dukungan': 'Help & Support',
  'Pertanyaan yang Sering Diajukan (FAQ)': 'Frequently Asked Questions (FAQ)',
};

// Fallback param cuma dipakai untuk teks yang mengandung interpolasi
// dinamis (mis. nama user) — komponen yang butuh itu memanggil t() untuk
// bagian statisnya saja, lalu menyusun sendiri string akhirnya di JSX.
export function t(key: string): string {
  if (activeLang === 'id') return key;
  return EN[key] ?? key;
}
