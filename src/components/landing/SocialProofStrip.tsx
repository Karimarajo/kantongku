import React from 'react';
import { Users, RefreshCw, Target, HeadphonesIcon } from 'lucide-react';

// Revisi (prompt 2, poin 14): daftar diganti total.
const STATS = [
  { icon: Users, text: 'Dipakai 1000+ pengguna' },
  { icon: RefreshCw, text: 'Selalu update fitur terbaru gratis' },
  { icon: Target, text: 'Tujuan keuangan tercapai' },
  { icon: HeadphonesIcon, text: 'Support tim profesional 24 jam' },
];

export default function SocialProofStrip() {
  return (
    <section className="w-full px-6 py-8 border-y border-landing-text/10 bg-landing-surface/15">
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 justify-center text-center sm:text-left sm:justify-start">
              <Icon className="w-4 h-4 text-landing-text/70 shrink-0" />
              <span className="text-xs sm:text-sm text-landing-text/70">{stat.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
