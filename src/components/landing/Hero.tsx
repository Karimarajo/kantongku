import React, { useEffect, useState } from 'react';
import BrandLogo from '../BrandLogo';
import { ArrowRight } from 'lucide-react';

const PROMO_DEADLINE_KEY = 'kantongku_promo_deadline';
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

// Task 1 (landing-page-revamp) — secondary pain points, auto-rotated below
// the main headline. Plain setInterval, no new library.
const PAIN_POINTS = [
  'Susah nabung meski niat udah kuat?',
  'Atur keuangan bareng pasangan kok ribet?',
  'Uang bisnis & pribadi keseringan kecampur?',
  'Suka lupa bayar tagihan pas jatuh tempo?',
];
const PAIN_POINT_ROTATE_MS = 3500;

interface HeroProps {
  priceOriginal: number;
  pricePromo: number;
  formatCurrency: (amount: number) => string;
  onCtaClick: () => void;
}

// Reads the promo deadline from localStorage, or starts a fresh 5h window if
// it's missing/expired — so the countdown survives a reload but still resets
// periodically rather than being hardcoded to a date that would eventually look stale.
function getOrInitDeadline(): number {
  const stored = localStorage.getItem(PROMO_DEADLINE_KEY);
  const now = Date.now();
  if (stored) {
    const deadline = Number(stored);
    if (Number.isFinite(deadline) && deadline > now) {
      return deadline;
    }
  }
  const deadline = now + FIVE_HOURS_MS;
  localStorage.setItem(PROMO_DEADLINE_KEY, String(deadline));
  return deadline;
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function Hero({ priceOriginal, pricePromo, formatCurrency, onCtaClick }: HeroProps) {
  const [deadline, setDeadline] = useState<number>(() => getOrInitDeadline());
  const [now, setNow] = useState(() => Date.now());
  const [painPointIndex, setPainPointIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (now >= deadline) {
      setDeadline(getOrInitDeadline());
    }
  }, [now, deadline]);

  useEffect(() => {
    const rotateId = setInterval(() => {
      setPainPointIndex((i) => (i + 1) % PAIN_POINTS.length);
    }, PAIN_POINT_ROTATE_MS);
    return () => clearInterval(rotateId);
  }, []);

  return (
    <section className="w-full flex flex-col items-center px-6 pt-14 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-6 z-10 text-center">
        <div className="w-20 h-20 p-3 bg-surface-variant/40 rounded-3xl border border-white/5 flex items-center justify-center">
          <BrandLogo className="w-14 h-14" />
        </div>

        <h1 className="font-display-lg text-3xl sm:text-5xl text-white font-bold tracking-tight leading-tight">
          Uangmu Ada, Tapi Ke Mana Perginya Kamu Nggak Pernah Tahu?
        </h1>

        <p className="text-on-surface-variant text-base sm:text-lg max-w-xl leading-relaxed">
          KantongKu bantu kamu balik pegang kendali — cukup ucapkan atau foto struk belanjaanmu, AI yang urus
          sisanya. Kelola dompet pribadi & bisnis kamu dalam satu aplikasi.
        </p>

        {/* Task 1 — badge pain point sekunder, auto-rotate tiap ~3.5 detik.
            key={painPointIndex} memicu ulang animasi fade-in tiap pergantian. */}
        <div className="h-8 flex items-center justify-center">
          <span
            key={painPointIndex}
            className="text-xs font-semibold text-on-surface-variant bg-white/5 border border-white/10 rounded-full px-4 py-2 animate-fade-in"
          >
            {PAIN_POINTS[painPointIndex]}
          </span>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
          🔥 Harga Promo — Hemat <span className="font-mono-data">{formatCurrency(priceOriginal - pricePromo)}</span>, Segera Ambil!
        </span>

        <div className="flex flex-col items-center gap-1">
          <span className="font-mono-data text-lg text-on-surface-variant/60 line-through">{formatCurrency(priceOriginal)}</span>
          <span className="font-mono-data text-4xl font-bold text-white">{formatCurrency(pricePromo)}</span>
          <span className="text-xs text-on-surface-variant/60">akses selamanya — harga promo, sewaktu-waktu bisa naik</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-on-surface-variant/60 uppercase tracking-wider">Promo berakhir dalam</span>
          <span className="text-2xl font-bold text-primary font-mono tracking-widest">
            {formatCountdown(deadline - now)}
          </span>
        </div>

        <button
          onClick={onCtaClick}
          className="h-14 px-8 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-primary text-on-primary"
        >
          Ambil Promo Sekarang — Rp49rb
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* TODO: ganti dengan screenshot asli dashboard */}
        <div className="w-full max-w-md mt-6 rounded-2xl border border-white/10 bg-surface-variant/40 p-5 flex flex-col gap-3">
          <div className="self-start max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-primary">
            "Tadi jajan kopi 15rb"
          </div>
          <div className="self-end w-full bg-[#0B111E] border border-white/10 rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-xs text-on-surface-variant/60">Jajan / Kopi</span>
              <span className="text-sm font-semibold text-white">Kopi</span>
            </div>
            <span className="font-mono-data text-sm font-bold text-rose-400">-Rp15.000</span>
          </div>
        </div>
      </div>
    </section>
  );
}
