import React from 'react';
import { X, Check } from 'lucide-react';

const ROWS = [
  { before: 'Buka Excel/notes tiap habis belanja', after: 'Cukup ngomong atau foto struk' },
  { before: 'Sering lupa catat, jadi keuangan buram', after: 'Tercatat otomatis, real-time' },
  { before: 'Ribet pisah dompet pribadi & bisnis', after: 'Multi-pocket & rekening dalam 1 app' },
  { before: 'Ngitung budget manual di kepala', after: 'Reminder & alert otomatis kalau lewat budget' },
];

export default function BeforeAfter() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Sebelum vs Sesudah</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-label-caps uppercase tracking-wider text-on-surface-variant/60 text-center sm:text-left">
              Sebelum (cara lama)
            </h3>
            {ROWS.map((row, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-surface-variant/30 border border-white/5 rounded-xl px-4 py-3">
                <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-sm text-on-surface-variant">{row.before}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-label-caps uppercase tracking-wider text-primary/80 text-center sm:text-left">
              Sesudah (pakai KantongKu)
            </h3>
            {ROWS.map((row, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-white">{row.after}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
