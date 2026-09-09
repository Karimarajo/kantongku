import React from 'react';
import { X, Check } from 'lucide-react';

// Revisi (prompt 2, poin 12-13; prompt 3, poin 1): daftar Sebelum & Sesudah
// jadi dua array terpisah (bukan satu ROWS berpasangan per-index seperti
// sebelumnya) — 2 item baru ditambahkan ke Sebelum, sekarang sama-sama 6.
const BEFORE_ITEMS = [
  'Pengeluaran melebihi pemasukan',
  'Gak tau berapa total income setiap bulan',
  'Males nyatet karena ribet',
  'Lupa bayar cicilan atau tagihan',
  'Uang bisnis dan pribadi kecampur',
  'Berselisih sama pasangan karena pengeluaran bocor',
];

const AFTER_ITEMS = [
  'Hitungan detik transaksi kecatet',
  'Tau kondisi keuangan real time',
  'Kepercayaan antar pasangan',
  'Selalu tepat bayar tagihan',
  'Rem pengeluaran',
  'Rajin nabung karena ada target capaian',
];

export default function BeforeAfter() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text text-center">Sebelum vs Sesudah</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-label-caps uppercase tracking-wider text-landing-text/50 text-center sm:text-left">
              Sebelum (cara lama)
            </h3>
            {BEFORE_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-landing-text/5 border border-landing-text/10 rounded-xl px-4 py-3">
                <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-sm text-landing-text/70">{item}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-label-caps uppercase tracking-wider text-landing-text/80 text-center sm:text-left">
              Sesudah (pakai KantongKu)
            </h3>
            {AFTER_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-landing-accent/10 border border-landing-accent/30 rounded-xl px-4 py-3">
                <Check className="w-4 h-4 text-landing-text shrink-0 mt-0.5" />
                <span className="text-sm text-landing-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
