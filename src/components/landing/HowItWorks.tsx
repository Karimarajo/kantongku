import React from 'react';
import { Mic, Sparkles, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    icon: Mic,
    title: 'Ucapkan atau foto struk',
    description: 'buka app, ngomong "beli galon 20rb" atau foto struk belanja.',
  },
  {
    icon: Sparkles,
    title: 'AI proses otomatis',
    description: 'AI baca konteksnya, isi nominal, kategori, dan catatan otomatis dalam hitungan detik.',
  },
  {
    icon: CheckCircle2,
    title: 'Cek & simpan',
    description: 'tinggal konfirmasi, transaksi masuk ke pocket yang sesuai. Selesai.',
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full px-6 py-16 bg-surface-variant/20 border-y border-white/5">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Cara Kerja</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center gap-3 bg-[#0B111E] border border-white/10 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-sm text-on-surface-variant">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
