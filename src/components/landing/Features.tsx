import React from 'react';
import { Zap, Wallet, Users, CalendarClock, Target, HeartPulse, Copy, Infinity as InfinityIcon } from 'lucide-react';

// Landing-page-revamp Task 2 — 8 kartu fitur unggulan (menggantikan 6 kartu
// generik sebelumnya), masing-masing icon + judul singkat + 1-2 kalimat
// santai. Urutan & copy persis mengikuti daftar di prompt.
const FEATURES = [
  {
    icon: Zap,
    title: 'Catat Secepat Kilat',
    description: 'Foto struk, rekam suara, atau ketik bebas — AI yang urus sisanya.',
  },
  {
    icon: Wallet,
    title: 'Pisahkan Uang Bisnis, Pribadi & Titipan',
    description: 'Wallet terpisah, gak akan pernah kecampur lagi.',
  },
  {
    icon: Users,
    title: 'Atur Bareng Pasangan/Tim',
    description: 'Kolaborasi real-time, akses penuh untuk yang diundang.',
  },
  {
    icon: CalendarClock,
    title: 'Reminder & Kelola Cicilan/Hutang',
    description: 'Sekali input, otomatis diingatkan & terpantau progresnya.',
  },
  {
    icon: Target,
    title: 'Target Impian & Limit Jajan',
    description: 'Nabung dengan tujuan jelas, kontrol pengeluaran otomatis.',
  },
  {
    icon: HeartPulse,
    title: 'Analisis Kesehatan Keuangan oleh AI',
    description: 'Bukan cuma rekap, tapi kasih tahu kondisi keuanganmu & sarannya.',
  },
  {
    icon: Copy,
    title: 'Simpan Info Rekening, Copy Sekali Klik',
    description: 'Mau kirim info transfer ke siapa pun, tinggal salin.',
  },
  {
    icon: InfinityIcon,
    title: 'Beli Sekali, Pakai Selamanya',
    description: 'Tanpa langganan bulanan, update fitur terus jalan gratis.',
  },
];

export default function Features() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Fitur Unggulan</h2>
          <p className="text-sm text-on-surface-variant max-w-md">Semua yang kamu butuh buat nggak lagi kehilangan jejak uangmu, dalam satu aplikasi.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex flex-col gap-3 bg-surface-variant/30 border border-white/10 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
