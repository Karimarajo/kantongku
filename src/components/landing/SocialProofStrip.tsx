import React from 'react';
import { Users, Repeat, Clock3, ShieldCheck } from 'lucide-react';

const STATS = [
  { icon: Users, text: 'Dipakai 100+ pengguna early access' },
  { icon: Repeat, text: '1.000+ transaksi tercatat otomatis' },
  { icon: Clock3, text: 'Hemat ±5 menit per hari dari pencatatan manual' },
  { icon: ShieldCheck, text: 'Data tersimpan aman di server pribadi' },
];

export default function SocialProofStrip() {
  return (
    <section className="w-full px-6 py-8 border-y border-white/5 bg-surface-variant/20">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 justify-center text-center sm:text-left sm:justify-start">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm text-on-surface-variant">{stat.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
