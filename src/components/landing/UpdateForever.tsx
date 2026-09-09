import React from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';

// Landing-page-revamp Task 6 — Section singkat penegas "update selamanya".
// landing-page-revisi-2 Task 12 — the "Pengecualian: menambah kolaborator
// ..." caveat line (and its Users icon) has been removed entirely per the
// explicit instruction; nothing else about this section changed besides
// that removal and the re-theme onto --color-landing-* tokens.
export default function UpdateForever() {
  return (
    <section className="w-full px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center bg-landing-surface/20 border border-landing-text/10 rounded-2xl p-8">
        <div className="w-12 h-12 rounded-full bg-landing-accent/20 border border-landing-accent/40 flex items-center justify-center">
          <InfinityIcon className="w-6 h-6 text-landing-text" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-landing-text">Sekali Beli, Update Selamanya</h3>
        <p className="text-sm text-landing-text/70 leading-relaxed max-w-lg">
          Nggak ada biaya langganan bulanan. Semua fitur baru KantongKu ke depannya, termasuk yang belum ada
          sekarang, otomatis kamu dapatkan gratis, selama aplikasinya masih kamu pakai.
        </p>
      </div>
    </section>
  );
}
