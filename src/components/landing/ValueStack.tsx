import React from 'react';
import { Check, Sparkles } from 'lucide-react';

// Landing-page-revamp Task 3 — "Value Stack" (pengganti framing "Bonus").
//
// Revisi dari pemilik produk: total nilai gabungan dibuat pas Rp399.000/bulan
// — angka ini SENGAJA disamakan dengan PRICE_ORIGINAL yang sudah dipakai di
// Hero/section harga (lihat Landing.tsx), supaya "coret Rp399.000 → Rp49.000"
// konsisten di semua tempat harga disebut, bukan angka acak baru.
const VALUE_ITEMS = [
  { label: 'Aplikasi pencatatan AI OCR struk & suara', monthly: 99000 },
  { label: 'Fitur multi-wallet & kolaborasi real-time', monthly: 89000 },
  { label: 'Analisis kesehatan keuangan personal (AI)', monthly: 129000 },
  { label: 'Reminder & pelacakan cicilan/hutang', monthly: 82000 },
];

const PRICE_ORIGINAL = 399000;
const KANTONGKU_PRICE = 49000;

export default function ValueStack() {
  const totalMonthly = VALUE_ITEMS.reduce((sum, item) => sum + item.monthly, 0);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Kalau Semua Ini Kamu Dapat Terpisah-Pisah...</h2>
          <p className="text-sm text-on-surface-variant max-w-md">
            Bandingin sendiri kalau kamu langganan aplikasi berbeda-beda buat tiap kebutuhan ini.
          </p>
        </div>

        <div className="bg-surface-variant/30 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col gap-4">
          {VALUE_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-b-0">
              <div className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-on-surface-variant">{item.label}</span>
              </div>
              <span className="text-sm text-white/70 font-mono-data shrink-0">senilai {formatCurrency(item.monthly)}/bulan</span>
            </div>
          ))}

          <div className="flex items-center justify-between gap-4 pt-3 mt-1 border-t border-white/10">
            <span className="text-sm font-bold text-white">Total kalau terpisah</span>
            <span className="text-lg font-bold text-white/80 font-mono-data">{formatCurrency(totalMonthly)}/bulan</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center bg-primary/10 border border-primary/30 rounded-2xl p-6 sm:p-8">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" /> Harga Promo KantongKu — Segera Ambil!
          </span>
          <span className="text-lg text-on-surface-variant/60 line-through">{formatCurrency(PRICE_ORIGINAL)}</span>
          <span className="text-4xl sm:text-5xl font-bold text-white">{formatCurrency(KANTONGKU_PRICE)}</span>
          <span className="text-sm font-semibold text-primary">SEKALI BAYAR, SELAMANYA — bukan per bulan</span>
        </div>
      </div>
    </section>
  );
}
