import React from 'react';
import { Mic, Wallet, Bell, LineChart, ShieldCheck, Gift } from 'lucide-react';

const FEATURES = [
  {
    icon: Mic,
    title: 'Input Suara & Foto Struk (AI)',
    description: 'cukup ngomong atau foto, AI yang proses jadi transaksi terstruktur.',
  },
  {
    icon: Wallet,
    title: 'Multi-Pocket & Rekening',
    description: 'pisahkan dompet pribadi, bisnis, tabungan dalam satu akun.',
  },
  {
    icon: Bell,
    title: 'Budgeting & Reminder Otomatis',
    description: 'set batas pengeluaran per kategori, dapat notifikasi sebelum kebablasan.',
  },
  {
    icon: LineChart,
    title: 'Laporan Rapi Otomatis',
    description: 'riwayat & ringkasan transaksi per kategori/periode, tanpa perlu rekap manual.',
  },
  {
    icon: ShieldCheck,
    title: 'Login Aman via Google',
    description: 'tanpa password tambahan yang gampang lupa/dibobol, satu sesi aktif per akun.',
  },
  {
    icon: Gift,
    title: 'Update Fitur Gratis Selamanya',
    description: 'sekali beli, dapat semua update & fitur baru tanpa biaya tambahan.',
  },
];

export default function Features() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
