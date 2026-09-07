import React from 'react';
import { ServerCog, ShieldCheck, EyeOff, RotateCcw } from 'lucide-react';

// landing-page-revisi-2 Task 8 — new section, placed right after Hero and
// before How It Works. Claims match exactly what's already stated
// elsewhere on this page (FAQ items 1, 4, 5, 3) — nothing new introduced.
const TRUST_ITEMS = [
  { icon: ServerCog, text: 'Server sendiri, nyala 24 jam' },
  { icon: ShieldCheck, text: 'Login 2FA via Google Authenticator' },
  { icon: EyeOff, text: 'Data tidak bisa dilihat owner' },
  { icon: RotateCcw, text: 'Garansi uang kembali 3 hari' },
];

export default function TrustBar() {
  return (
    <section className="w-full px-6 py-6 bg-landing-surface/25 border-y border-landing-text/10">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TRUST_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-2 justify-center text-center sm:text-left sm:justify-start">
              <Icon className="w-4 h-4 text-landing-text/70 shrink-0" />
              <span className="text-xs sm:text-sm text-landing-text/80 font-medium">{item.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
