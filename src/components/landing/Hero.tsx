import React, { useEffect, useState } from 'react';
import BrandLogo from '../BrandLogo';
import { ArrowRight } from 'lucide-react';

// Task 1 (landing-page-revamp) — secondary pain points, auto-rotated below
// the main headline. Plain setInterval, no new library.
const PAIN_POINTS = [
  'Susah nabung meski niat udah kuat?',
  'Atur keuangan bareng pasangan kok ribet?',
  'Uang bisnis & pribadi keseringan kecampur?',
  'Suka lupa bayar tagihan pas jatuh tempo?',
];
const PAIN_POINT_ROTATE_MS = 3500;

// landing-page-revisi-2 Task 5 — one headline+subheadline PAIR per ad
// angle, picked from `utm_content` on the landing URL. Render exactly ONE
// pair, never a list of all variants. Copy stays within claims already
// made elsewhere on this page (OCR struk, cicilan reminder, sekali bayar
// selamanya) — no new features/facts introduced.
// Revisi (poin 1-3): headline/subheadline DEFAULT sekarang butuh styling per
// kata (background/warna/bold/underline), jadi tipenya diperluas ke
// React.ReactNode (bukan cuma string lagi) — varian utm_content di bawah
// TETAP string biasa (string valid sebagai ReactNode juga), tidak disentuh.
const HEADLINES_BY_UTM_CONTENT: Record<string, { headline: React.ReactNode; subheadline: React.ReactNode }> = {
  as1_ocr: {
    headline: 'Foto Struk Belanja, Sisanya Biar AI yang Catat',
    subheadline: 'Nggak perlu ketik manual satu-satu, jepret struk belanjaanmu, AI KantongKu langsung baca nominal, kategori, dan tanggalnya otomatis.',
  },
  as3_cicilan: {
    headline: 'Nggak Kena Denda Lagi Gara-Gara Lupa Bayar Cicilan',
    subheadline: 'KantongKu otomatis ingetin kamu sebelum tanggal jatuh tempo cicilan/tagihan, sekaligus pantau sisa utang dan progres pembayarannya.',
  },
  as4_bayar_sekali: {
    headline: 'Sekali Bayar, Pakai Selamanya, Tanpa Langganan Bulanan',
    subheadline: 'Nggak ada biaya bulanan berulang. Bayar sekali di awal, update fitur baru ke depannya otomatis kamu dapatkan gratis.',
  },
};
// Task 9 (trial + landing revisi) — headline & subheadline DEFAULT (fallback
// untuk trafik tanpa utm_content/nilai tidak dikenal) diganti mengangkat
// angle "Inclusion Literacy Gap" (konsisten dengan section LiteracyGap.tsx
// di bawah TrustBar), gantikan angle lama "78% Kontrol Pengeluaran". Buka
// dengan pertanyaan senada carousel edukasi, subheadline mengarah ke skor
// kesehatan finansial — TIDAK menyebut harga atau angka "3 hari" sama sekali
// (boleh muncul di dalam app/email, bukan di landing page). Varian per
// utm_content di atas (as1_ocr/as3_cicilan/as4_bayar_sekali) SENGAJA tidak
// disentuh, tetap seperti sudah diimplementasikan.
const DEFAULT_HEADLINE: { headline: React.ReactNode; subheadline: React.ReactNode } = {
  headline: (
    <>
      Kenapa Gaji Berasa{' '}
      <span className="bg-landing-accent/40 rounded px-1.5 box-decoration-clone">Gak Pernah Cukup</span>, Padahal
      Kamu Udah <span className="text-rose-500">Kerja Keras</span>?
    </>
  ),
  subheadline: (
    <>
      <strong className="font-bold">Skor kesehatan finansial orang Indonesia cuma 40,6 dari 100</strong>, padahal
      hampir semua udah melek produk keuangan digital. Bukan soal kurang cuan, tapi soal{' '}
      <strong className="font-bold underline">gak tau ke mana perginya uang kamu tiap bulan</strong>.
    </>
  ),
};

// Read synchronously (lazy useState initializer, not an effect) so the
// correct headline is there on the very first render — no default-then-swap
// flash, and no dependency on Landing.tsx's own UTM-capture effect having
// run yet (effect order between a child and its parent isn't guaranteed to
// put this before that).
function resolveHeadline(): { headline: React.ReactNode; subheadline: React.ReactNode } {
  const utmContent = new URLSearchParams(window.location.search).get('utm_content');
  return (utmContent && HEADLINES_BY_UTM_CONTENT[utmContent]) || DEFAULT_HEADLINE;
}

interface HeroProps {
  theme: 'light' | 'dark';
  onCtaClick: () => void;
}

// Revisi — mockup Home-screen hasil recreate kode (AppUiMockups.tsx) diganti
// screenshot ASLI aplikasi yang dikasih owner (public/mockups/app-desktop.png
// & app-hp.png, sudah difoto dalam frame laptop/HP dengan background
// transparan). Disusun komposit: laptop di belakang lebih lebar, HP menumpuk
// di depan pojok kanan bawah, gaya umum hero section SaaS. Bukan theme-aware
// lagi (dark/light) karena ini foto asli, bukan digambar ulang di kode.
function HeroDeviceComposite() {
  return (
    <div className="relative w-full max-w-[640px] mx-auto mt-2">
      <img
        src="/mockups/app-desktop.png"
        alt="Tampilan dashboard KantongKu di desktop"
        className="w-full h-auto select-none pointer-events-none"
        draggable={false}
      />
      <img
        src="/mockups/app-hp.png"
        alt="Tampilan dashboard KantongKu di HP"
        className="absolute bottom-0 right-0 sm:right-4 w-[26%] sm:w-[24%] h-auto select-none pointer-events-none drop-shadow-2xl"
        draggable={false}
      />
    </div>
  );
}

export default function Hero({ theme, onCtaClick }: HeroProps) {
  const [painPointIndex, setPainPointIndex] = useState(0);
  const [{ headline, subheadline }] = useState(() => resolveHeadline());

  useEffect(() => {
    const rotateId = setInterval(() => {
      setPainPointIndex((i) => (i + 1) % PAIN_POINTS.length);
    }, PAIN_POINT_ROTATE_MS);
    return () => clearInterval(rotateId);
  }, []);

  return (
    <section className="w-full flex flex-col items-center px-6 pt-14 pb-16 relative overflow-hidden bg-landing-bg">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-landing-accent/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-6 z-10 text-center">
        <div className="w-20 h-20 p-3 bg-landing-surface/40 rounded-3xl border border-landing-text/10 flex items-center justify-center">
          <BrandLogo className="w-14 h-14" />
        </div>

        <h1 className="font-display-lg text-3xl sm:text-5xl text-landing-text font-bold tracking-tight leading-tight">
          {headline}
        </h1>

        <p className="text-landing-text/75 text-base sm:text-lg max-w-xl leading-relaxed">
          {subheadline}
        </p>

        {/* Task 1 — badge pain point sekunder, auto-rotate tiap ~3.5 detik.
            key={painPointIndex} memicu ulang animasi fade-in tiap pergantian. */}
        <div className="h-8 flex items-center justify-center">
          <span
            key={painPointIndex}
            className="text-xs font-semibold text-landing-text/70 bg-landing-text/5 border border-landing-text/10 rounded-full px-4 py-2 animate-fade-in"
          >
            {PAIN_POINTS[painPointIndex]}
          </span>
        </div>

        {/* Task 9 (trial + landing revisi) — badge countdown promo harga
            dihapus (landing page utama sekarang tidak menyebut harga/hari
            sama sekali). CTA diganti mengajak coba gratis. */}
        <button
          onClick={onCtaClick}
          className="h-14 px-8 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-landing-accent text-landing-on-accent"
        >
          Coba Gratis Sekarang
          <ArrowRight className="w-5 h-5" />
        </button>

        <HeroDeviceComposite />
      </div>
    </section>
  );
}
