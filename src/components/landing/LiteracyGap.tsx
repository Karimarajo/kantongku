import React from 'react';
import { TrendingDown, Smartphone, CheckCircle2, HeartPulse } from 'lucide-react';

// Task 6 (prompt trial+literacy-gap) — new evergreen section, placed right
// after TrustBar and before HowItWorks: "kenapa ini penting" (kesehatan
// finansial) needs to land BEFORE "cara kerja produk". Sourced from the
// 8-slide educational carousel (Meta Ads / organic posts) built around the
// "Inclusion Literacy Gap" narrative. Shown to ALL traffic — unlike Hero's
// utm_content-gated headline variants (a different mechanism for a different
// purpose), this is evergreen content, not an ad-angle experiment.
const BENEFITS = [
  'Tau bisa apa enggak beli barang yang diinginkan',
  'Tau bisa apa enggak nambah cicilan',
  'Tau berapa yang harus ditabung',
  'Tau berapa pengeluaran tiap bulan',
  'Tau berapa dana darurat yang seharusnya ada',
  'Jadi terbuka soal keuangan, gak was-was tiap bulan soal dana darurat',
  'Tau harus distribusiin uang ke pos mana (pendidikan, kesehatan, belanja), kebutuhan utama tetap terpenuhi, keinginan tetap bisa tercapai, goal keuangan tetap sehat',
];

export default function LiteracyGap() {
  return (
    <section className="w-full px-6 py-16 bg-landing-bg">
      <div className="max-w-3xl mx-auto flex flex-col gap-10">
        {/* Bagian 1 — Data pembuka: skor rendah vs melek produk digital tinggi. */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2 text-center bg-landing-surface/25 border border-landing-text/10 rounded-2xl p-6">
              <TrendingDown className="w-6 h-6 text-rose-500" />
              <span className="font-mono-data text-3xl sm:text-4xl font-bold text-landing-text">40,6<span className="text-base font-normal text-landing-text/50">/100</span></span>
              <span className="text-xs sm:text-sm text-landing-text/70">Skor kesehatan finansial orang Indonesia</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center bg-landing-surface/25 border border-landing-text/10 rounded-2xl p-6">
              <Smartphone className="w-6 h-6 text-landing-accent" />
              <span className="font-mono-data text-3xl sm:text-4xl font-bold text-landing-text">92,7%</span>
              <span className="text-xs sm:text-sm text-landing-text/70">Sudah melek produk keuangan digital (rekening, e-wallet, paylater)</span>
            </div>
          </div>
          <p className="text-[11px] text-landing-text/50 text-center">Sumber: OCBC Financial Fitness Index</p>
        </div>

        {/* Bagian 2 — Nama konsep: Inclusion Literacy Gap. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">
            Masalahnya bukan akses, tapi{' '}
            <span className="bg-landing-accent/40 rounded px-1.5 box-decoration-clone">pengelolaan</span>
          </h2>
          <p className="max-w-xl text-sm sm:text-base text-landing-text/80 leading-relaxed">
            Kesenjangan antara akses dan pemahaman finansial ini yang disebut{' '}
            <strong className="font-bold">&ldquo;Inclusion Literacy Gap&rdquo;</strong>. Kita udah gampang banget
            buka rekening, pakai e-wallet, sampai paylater, tapi <strong className="font-bold">bocor alus yang gak kerasa</strong>{' '}
            tetap kejadian, kita kehilangan uang tanpa sadar, tanpa ada yang ngingetin kapan harus rem, kapan bisa gas.
          </p>
        </div>

        {/* Bagian 3 — Manfaat konkret tau kesehatan finansial sendiri. */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-landing-text text-center">Begitu Kamu Tau Kondisi Keuangan Sendiri...</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-start gap-2 bg-landing-surface/25 border border-landing-text/10 rounded-xl p-4">
                <CheckCircle2 className="w-4 h-4 text-landing-accent shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-landing-text/80 leading-relaxed">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bagian 4 — Bridge ke fitur yang SUDAH ADA di Features.tsx, bukan klaim fitur baru. */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center text-center sm:text-left bg-landing-accent/10 border border-landing-accent/30 rounded-2xl p-5">
          <HeartPulse className="w-6 h-6 text-landing-accent shrink-0" />
          <p className="text-sm text-landing-text/80 leading-relaxed">
            Ini persis yang dibantu <strong className="font-bold">Analisis Kesehatan Keuangan AI</strong> di
            KantongKu, biar kamu gak lagi nebak-nebak kondisi keuanganmu sendiri.
          </p>
        </div>
      </div>
    </section>
  );
}
