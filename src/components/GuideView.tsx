import React, { useState } from 'react';
import { APP_VERSION, CHANGELOG } from '../version';
import {
  ChevronLeft, ChevronDown, BookOpen, Sparkles, Rocket, Camera, Mic, Keyboard,
  Wallet, PiggyBank, Tag, AlarmClock, CreditCard, Users, LineChart, Receipt,
  BrainCircuit, History, Bell, LifeBuoy, HelpCircle, Share, MoreVertical,
} from 'lucide-react';

interface GuideViewProps {
  onBack: () => void;
}

interface GuideSection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

// Bagian di bawah 'H4' — <p> untuk paragraf, <ul>/<li> untuk langkah — biar
// konsisten dipakai berulang tanpa menulis className panjang tiap kali.
const P = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-xs text-on-surface-variant leading-relaxed ${className}`}>{children}</p>
);
const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="flex flex-col gap-1.5">
    {items.map((item, idx) => (
      <li key={idx} className="text-xs text-on-surface-variant leading-relaxed flex gap-2">
        <span className="shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
        <span>{item}</span>
      </li>
    ))}
  </ol>
);
const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="flex flex-col gap-1.5">
    {items.map((item, idx) => (
      <li key={idx} className="text-xs text-on-surface-variant leading-relaxed flex gap-2">
        <span className="shrink-0 w-1 h-1 rounded-full bg-primary mt-1.5" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);
const H4 = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[11px] font-label-caps text-white font-bold uppercase tracking-wider mt-1">{children}</h4>
);

// Konten panduan — mengacu ke fitur nyata di aplikasi (bukan aspirasional),
// mencakup semua menu yang ada di Profil + Dashboard + tab utama.
const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'mulai',
    icon: Rocket,
    title: 'Mulai Cepat & Install ke HP',
    body: (
      <div className="flex flex-col gap-3">
        <H4>Login &amp; Setup Pertama</H4>
        <Steps
          items={[
            'Buka kantongku.site dari browser HP atau laptop.',
            <>Klik <b className="text-white">Masuk dengan Google</b>, pilih akun Google dengan email yang sama seperti saat pembelian.</>,
            'Setelah masuk, langsung diarahkan ke Dashboard utama.',
            <>Buat wallet pertama (misalnya "Cash" atau "Rekening BCA") lewat menu <b className="text-white">Wallet</b>.</>,
            'Mulai catat transaksi pertama — boleh langsung coba fitur foto struk atau ketik bebas.',
          ]}
        />

        <H4>Install ke Layar Utama (iPhone)</H4>
        <Steps
          items={[
            <>Buka kantongku.site lewat <b className="text-white">Safari</b> (wajib Safari, bukan Chrome — ketentuan Apple).</>,
            <>Tekan tombol <Share className="w-3 h-3 inline text-primary" /> <b className="text-white">Share/Bagikan</b> di bagian bawah layar.</>,
            <>Scroll dan pilih <b className="text-white">Add to Home Screen / Tambah ke Layar Utama</b>.</>,
            'Tekan "Tambah" — ikon KantongKu akan muncul di layar utama seperti aplikasi biasa.',
          ]}
        />

        <H4>Install ke Layar Utama (Android)</H4>
        <Steps
          items={[
            <>Buka kantongku.site lewat <b className="text-white">Chrome</b>.</>,
            <>Tekan menu titik tiga <MoreVertical className="w-3 h-3 inline text-primary" /> di pojok kanan atas.</>,
            <>Pilih <b className="text-white">Install app</b> atau <b className="text-white">Add to Home screen</b> (kadang muncul otomatis sebagai pop-up banner "Install KantongKu").</>,
            'Konfirmasi install — KantongKu akan tampil sebagai aplikasi mandiri, lengkap dengan ikon di app drawer.',
          ]}
        />
        <P>Install ke layar utama <b className="text-white">wajib</b> supaya notifikasi pengingat bisa berfungsi, terutama di iPhone.</P>
      </div>
    ),
  },
  {
    id: 'catat',
    icon: Camera,
    title: 'Catat Transaksi Secepat Kilat',
    body: (
      <div className="flex flex-col gap-3">
        <P>Fitur andalan KantongKu — tidak perlu mengetik detail satu per satu. Pilih salah satu cara, AI yang membaca dan mengisikan detailnya (nominal, kategori, deskripsi).</P>
        <H4><Camera className="w-3 h-3 inline mr-1 text-primary" />Foto Struk Belanja</H4>
        <P>Buka menu <b className="text-white">Ketik Apapun</b>, ambil atau upload foto struk. AI membaca isi struk dan otomatis mengisi nominal, tanggal, dan kategori. Cek sekali lagi lalu simpan.</P>
        <H4><Mic className="w-3 h-3 inline mr-1 text-primary" />Rekam Suara</H4>
        <P>Rekam lewat suara, contoh: "Beli kopi tiga puluh lima ribu pakai cash". AI mengubahnya jadi transaksi lengkap otomatis.</P>
        <H4><Keyboard className="w-3 h-3 inline mr-1 text-primary" />Ketik Bebas</H4>
        <P>Ketik bahasa sehari-hari, misalnya "bayar listrik 250rb dari BCA" — AI memahami maksudnya tanpa perlu pilih kategori/dompet satu-satu.</P>
        <P><b className="text-white">Selalu cek sebelum simpan</b> — terutama untuk nominal yang penting.</P>
      </div>
    ),
  },
  {
    id: 'wallet',
    icon: Wallet,
    title: 'Kelola Dompet / Wallet',
    body: (
      <div className="flex flex-col gap-3">
        <P>Wallet adalah representasi tempat uangmu berada — rekening bank, e-wallet, atau tunai. Buat sebanyak apa pun sesuai kebutuhan.</P>
        <H4>Pisahkan Uang Bisnis, Pribadi, Titipan</H4>
        <Bullets
          items={[
            <><b className="text-white">Kas Pribadi</b> — pengeluaran sehari-hari.</>,
            <><b className="text-white">Kas Usaha</b> — semua transaksi bisnis/usaha kecil.</>,
            <><b className="text-white">Dana Titipan</b> — uang orang lain yang dititipkan sementara.</>,
          ]}
        />
        <H4>Info Rekening &amp; Salin Cepat</H4>
        <P>Isi No. Rekening dan Nama Pemilik Rekening di setiap wallet. Tombol salin cepat di kartu wallet menyalin nama bank, nama pemilik, dan nomor rekening sekaligus — tinggal tempel ke chat.</P>
        <H4>Urutkan Wallet</H4>
        <P>Tekan lama (tahan) kartu wallet, lalu geser untuk mengatur urutan sesuai prioritas.</P>
        <H4>Transfer Antar Wallet &amp; Top Up</H4>
        <P><b className="text-white">Transfer</b> memindahkan saldo antar wallet sendiri (tidak dihitung pemasukan/pengeluaran). <b className="text-white">+ Tambah Dana</b> menambah saldo (dicatat sebagai pemasukan kategori Top Up Saldo).</P>
      </div>
    ),
  },
  {
    id: 'target-limit',
    icon: PiggyBank,
    title: 'Kantong: Target Tabungan & Limit Belanja',
    body: (
      <div className="flex flex-col gap-3">
        <P>Menu <b className="text-white">Target &amp; Limit</b> punya dua mode: <b className="text-white">Target Nabung</b> (menabung menuju nominal tujuan) dan <b className="text-white">Limit Belanja</b> (batas pengeluaran per kategori supaya lebih disiplin).</P>
        <Steps
          items={[
            <>Buka tombol <b className="text-white">Target & Limit</b> di Dashboard, tekan "Atur Target & Limit Baru".</>,
            'Pilih jenisnya: Target Nabung atau Limit Belanja.',
            'Beri nama, tentukan nominal target/limit, dan hubungkan ke kategori transaksi terkait.',
            'Pilih siklus waktu pemantauan: 1 minggu, 1 bulan, atau rentang tanggal kustom.',
          ]}
        />
        <P>Progresnya dihitung otomatis dari transaksi riil — ada alarm bertahap (70%, 80%, 90%, 100%) buat limit belanja, dan notifikasi saat target nabung tercapai.</P>
        <P><Sparkles className="w-3 h-3 inline text-primary mr-1" /><b className="text-white">Baru:</b> sampai 3 Target &amp; Limit yang sedang aktif kini juga tampil langsung di Dashboard, di bawah tombol Add Dana/Transfer, jadi progresnya kelihatan tanpa buka menu ini.</P>
      </div>
    ),
  },
  {
    id: 'kategori',
    icon: Tag,
    title: 'Kategori Transaksi',
    body: (
      <div className="flex flex-col gap-3">
        <P>Kategori membantu KantongKu (dan AI) mengelompokkan transaksi supaya laporan dan diagram bermakna. Kategori bawaan sudah tersedia (Makanan, Transportasi, Belanja, Tagihan, dst).</P>
        <P>Tambah kategori sendiri lewat <b className="text-white">Profil → Kelola Kategori</b>.</P>
        <P>Semakin rapi kategori yang dipakai, semakin akurat juga Analisis Kesehatan Keuangan oleh AI.</P>
      </div>
    ),
  },
  {
    id: 'reminder',
    icon: AlarmClock,
    title: 'Reminder Tagihan & Kelola Cicilan/Hutang',
    body: (
      <div className="flex flex-col gap-3">
        <H4>Reminder Tagihan</H4>
        <P>Tambahkan pengingat untuk tagihan rutin (listrik, internet, sewa, dll) lengkap tanggal jatuh tempo — KantongKu mengingatkan sebelum tanggal tersebut tiba.</P>
        <H4><CreditCard className="w-3 h-3 inline mr-1 text-primary" />Kelola Cicilan/Hutang</H4>
        <P>Untuk cicilan/utang (motor, KPR, pinjaman), gunakan menu <b className="text-white">Kelola Cicilan/Hutang</b> di Profil. Satu kali input, dapat dua manfaat: reminder otomatis tiap jatuh tempo, dan pelacakan progres (pokok, cicilan terbayar, sisa utang).</P>
        <Bullets
          items={[
            'Nama Cicilan/Hutang — mis. "Cicilan Motor Honda"',
            'Total Pokok — mis. Rp24.000.000',
            'Cicilan per Bulan — mis. Rp1.000.000',
            'Tenor — mis. 24 bulan',
            'Tanggal Jatuh Tempo — mis. tanggal 5 tiap bulan',
          ]}
        />
        <P>Data ini juga otomatis dipakai sebagai bahan Analisis Kesehatan Keuangan oleh AI.</P>
      </div>
    ),
  },
  {
    id: 'kolaborasi',
    icon: Users,
    title: 'Kolaborasi — Atur Keuangan Bareng',
    body: (
      <div className="flex flex-col gap-3">
        <P>Fitur Kolaborasi memberi akses penuh (baca &amp; tulis) ke orang lain untuk melihat dan mengelola data yang sama, secara real-time — cocok untuk pasangan, keluarga, atau partner usaha.</P>
        <Steps
          items={[
            <>Buka <b className="text-white">Profil → Kelola Kolaborator</b>.</>,
            'Masukkan alamat email orang yang diundang.',
            'Selesaikan pembayaran biaya kolaborator (sekali bayar per kolaborator, berlaku selamanya selama tidak diputuskan).',
            'Setelah dikonfirmasi, email yang diundang bisa langsung login dan melihat data yang sama persis.',
          ]}
        />
        <P>Bisa <b className="text-white">Putuskan Sambungan</b> kapan saja, dan <b className="text-white">Sambungkan Lagi</b> nanti gratis tanpa bayar ulang.</P>
        <P className="text-amber-400">Kolaborator dapat akses penuh — pastikan hanya mengundang orang yang benar-benar dipercaya.</P>
      </div>
    ),
  },
  {
    id: 'statistik',
    icon: LineChart,
    title: 'Statistik & Diagram Interaktif',
    body: (
      <div className="flex flex-col gap-3">
        <P>Menu <b className="text-white">Analisis</b> menampilkan tren pengeluaran dari waktu ke waktu, lengkap dua diagram donat: pengeluaran per kategori dan pemasukan per kategori.</P>
        <P>Klik salah satu bagian diagram untuk langsung memfilter daftar transaksi di bawahnya — cara cepat lihat "ke mana saja uang jajan bulan ini pergi". Fitur klik-untuk-filter ini juga ada di halaman Riwayat Transaksi.</P>
      </div>
    ),
  },
  {
    id: 'riwayat',
    icon: Receipt,
    title: 'Riwayat Transaksi & Rekap Bulanan',
    body: (
      <div className="flex flex-col gap-3">
        <P>Semua transaksi bisa dilihat lengkap di menu <b className="text-white">Riwayat</b>, dengan diagram interaktif di atasnya untuk memfilter cepat.</P>
        <P>Di Dashboard, kartu <b className="text-white">Total Pengeluaran Bulan Ini</b> → tekan "Lihat Detail" untuk rekap bulanan lengkap, lalu gunakan panah kiri/kanan untuk menjelajahi bulan-bulan sebelumnya.</P>
      </div>
    ),
  },
  {
    id: 'ai-analisis',
    icon: BrainCircuit,
    title: 'Analisis Kesehatan Keuangan oleh AI',
    body: (
      <div className="flex flex-col gap-3">
        <P>Bukan sekadar rekap angka. Berdasarkan data transaksi, tabungan, dan cicilan/hutang, AI menganalisis kondisi keuangan dan memberi kategori mudah dipahami — <b className="text-white">Sehat</b>, <b className="text-white">Cukup Sehat</b>, atau <b className="text-white">Perlu Perhatian</b> — lengkap penjelasan dan saran perbaikan yang relevan, bukan saran generik.</P>
        <P>Buka <b className="text-white">Analisis → Analisis Kesehatan Keuangan</b>, pilih rentang waktu, tekan "Analisis Sekarang".</P>
        <P>Privasi terjaga — hasil analisis ini hanya bisa dilihat kamu (dan kolaborator jika ada), tidak pernah dibagikan ke pihak lain.</P>
      </div>
    ),
  },
  {
    id: 'log-aktivitas',
    icon: History,
    title: 'Log Aktivitas',
    body: (
      <div className="flex flex-col gap-3">
        <P>Menu <b className="text-white">Log Activity</b> (Profil → Pengaturan) mencatat aktivitas di akun — termasuk siapa yang melakukannya kalau ada kolaborator, misalnya "Budi menambahkan transaksi Rp50.000 di kategori Makanan".</P>
        <P>Murni untuk transparansi, tidak memengaruhi saldo atau data keuangan. Bisa dibersihkan kapan saja lewat tombol "Bersihkan Log".</P>
      </div>
    ),
  },
  {
    id: 'notifikasi',
    icon: Bell,
    title: 'Notifikasi Pengingat',
    body: (
      <div className="flex flex-col gap-3">
        <P>KantongKu bisa mengirim notifikasi pengingat (lengkap bunyi) langsung ke HP — misalnya tagihan yang akan jatuh tempo — <b className="text-white">bahkan saat aplikasi sedang tidak dibuka.</b></P>
        <Steps
          items={[
            'Tambahkan KantongKu ke layar utama HP dulu (lihat bagian "Mulai Cepat & Install ke HP" di atas).',
            <>Buka notifikasi lonceng <Bell className="w-3 h-3 inline text-primary" /> di Dashboard, tekan <b className="text-white">Aktifkan Notifikasi</b>, izinkan saat diminta browser/HP.</>,
            'Selesai — pengingat otomatis muncul sesuai jadwal reminder tagihan/cicilan/kantong yang diatur.',
          ]}
        />
        <P className="text-amber-400">Pengguna iPhone: notifikasi hanya berfungsi kalau KantongKu sudah ditambahkan ke Layar Utama (bukan cuma dibuka lewat Safari) — ketentuan dari Apple untuk semua aplikasi web, bukan batasan KantongKu.</P>
      </div>
    ),
  },
  {
    id: 'bantuan',
    icon: LifeBuoy,
    title: 'Bantuan & Dukungan',
    body: (
      <div className="flex flex-col gap-3">
        <P>Ada pertanyaan, kendala, atau saran? Hubungi tim KantongKu lewat halaman Bantuan &amp; Saran — pilih kategori pertanyaan, tulis pesan, tim akan membalas langsung ke email.</P>
        <a
          href="https://kantongku.site/support"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-[0.98] transition-all"
        >
          <LifeBuoy className="w-4 h-4" /> Buka Halaman Bantuan &amp; Dukungan
        </a>
        <P>Menu yang sama juga ada permanen di <b className="text-white">Profil → Bantuan &amp; Dukungan</b>.</P>
      </div>
    ),
  },
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'Pertanyaan yang Sering Diajukan (FAQ)',
    body: (
      <div className="flex flex-col gap-3.5">
        <div>
          <H4>Apakah saya perlu bayar lagi setelah pembelian pertama?</H4>
          <P>Tidak. KantongKu produk sekali bayar — pakai selamanya, termasuk update fitur baru tanpa biaya tambahan. Biaya tambahan hanya berlaku kalau menambahkan kolaborator.</P>
        </div>
        <div>
          <H4>Data saya aman tidak kalau disimpan di KantongKu?</H4>
          <P>Data tersimpan di server KantongKu dan hanya bisa diakses lewat akun Google yang terverifikasi. Jangan bagikan akses akun ke orang yang tidak dipercaya sepenuhnya — fitur kolaborasi memberi akses penuh.</P>
        </div>
        <div>
          <H4>Bagaimana kalau hasil baca AI dari foto struk/suara salah?</H4>
          <P>Selalu bisa diedit sebelum disimpan, atau diedit kapan saja setelah tersimpan lewat menu Riwayat Transaksi.</P>
        </div>
        <div>
          <H4>Saya lupa cara login, harus bagaimana?</H4>
          <P>KantongKu memakai Login dengan Google — pastikan login memakai email Google yang sama dengan yang dipakai saat pembelian.</P>
        </div>
        <div>
          <H4>Bisakah saya menghapus akun kolaborator saya sendiri?</H4>
          <P>Penghapusan/pemutusan akses kolaborator dilakukan oleh pemilik akun (yang mengundang), bukan oleh kolaborator itu sendiri.</P>
        </div>
      </div>
    ),
  },
];

export default function GuideView({ onBack }: GuideViewProps) {
  const [openId, setOpenId] = useState<string | null>('mulai');

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Panduan Pengguna
        </h1>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed -mt-2">
        Rangkuman cara pakai semua fitur KantongKu, plus catatan pembaruan setiap kali ada versi baru.
      </p>

      {/* Update Terbaru — HANYA entri paling baru (CHANGELOG[0]), bukan
          seluruh histori: ini notifikasi "apa yang baru", bukan log
          perjalanan versi. CHANGELOG di src/version.ts tetap menyimpan
          entri-entri lama sebagai arsip internal (memudahkan maintenance),
          tapi GuideView sengaja hanya menampilkan yang terkini. */}
      {CHANGELOG.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Update Terbaru
          </span>
          <div className="glass-card rounded-xl p-3.5 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold font-mono-data">
                V{CHANGELOG[0].version}
              </span>
              <span className="text-[10px] text-on-surface-variant/60">{CHANGELOG[0].date}</span>
            </div>
            <Bullets items={CHANGELOG[0].changes} />
          </div>
        </section>
      )}

      {/* Panduan Fitur — daftar accordion, satu section terbuka per waktu */}
      <section className="flex flex-col gap-2.5 mt-1">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">
          Panduan Fitur
        </span>
        <div className="flex flex-col gap-2">
          {GUIDE_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isOpen = openId === section.id;
            return (
              <div key={section.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <button
                  onClick={() => setOpenId(isOpen ? null : section.id)}
                  className="w-full h-12 flex items-center justify-between px-4 hover:bg-white/5 active:scale-[0.99] transition-all"
                >
                  <span className="flex items-center gap-2 text-white font-label-caps text-xs">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    {section.title}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-on-surface-variant/50 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5">
                    {section.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-[10px] text-on-surface-variant/40 font-mono-data pb-1 mt-2">
        KantongKu V{APP_VERSION}
      </p>
    </div>
  );
}
