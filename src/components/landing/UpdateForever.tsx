import React from 'react';
import { Infinity as InfinityIcon, Users } from 'lucide-react';

// Landing-page-revamp Task 6 — Section singkat penegas "update selamanya",
// dibuat berdiri sendiri (bukan digabung ke Features) supaya pengecualian
// fitur kolaborator bisa dijelaskan tanpa bikin copy Features jadi panjang.
export default function UpdateForever() {
  return (
    <section className="w-full px-6 py-12">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center bg-surface-variant/20 border border-white/10 rounded-2xl p-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <InfinityIcon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white">Sekali Beli, Update Selamanya</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed max-w-lg">
          Nggak ada biaya langganan bulanan. Semua fitur baru KantongKu ke depannya — termasuk yang belum ada
          sekarang — otomatis kamu dapatkan gratis, selama aplikasinya masih kamu pakai.
        </p>
        <div className="flex items-center gap-2 text-xs text-on-surface-variant/70 bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <Users className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Pengecualian: menambah kolaborator (mengundang orang lain akses akunmu) tetap berbayar terpisah, sekali per kolaborator.</span>
        </div>
      </div>
    </section>
  );
}
