import React, { useEffect, useState } from 'react';
import BrandLogo from '../BrandLogo';
import { ArrowRight, ImageOff } from 'lucide-react';

// No screenshot file exists in the repo yet (owner provides it separately)
// — see the placeholder device frame below. Once the file lands in
// src/assets/screenshots/, uncomment this import and pass it as `src` to
// <HeroDeviceFrame>.
// import heroHomeScreenshot from '../../assets/screenshots/hero-home.png';

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

// landing-page-revisi-2 Task 5 — one headline+subheadline PAIR per ad
// angle, picked from `utm_content` on the landing URL. Render exactly ONE
// pair, never a list of all variants. Copy stays within claims already
// made elsewhere on this page (OCR struk, cicilan reminder, sekali bayar
// selamanya) — no new features/facts introduced.
const HEADLINES_BY_UTM_CONTENT: Record<string, { headline: string; subheadline: string }> = {
  as1_ocr: {
    headline: 'Foto Struk Belanja, Sisanya Biar AI yang Catat',
    subheadline: 'Nggak perlu ketik manual satu-satu — jepret struk belanjaanmu, AI KantongKu langsung baca nominal, kategori, dan tanggalnya otomatis.',
  },
  as3_cicilan: {
    headline: 'Nggak Kena Denda Lagi Gara-Gara Lupa Bayar Cicilan',
    subheadline: 'KantongKu otomatis ingetin kamu sebelum tanggal jatuh tempo cicilan/tagihan, sekaligus pantau sisa utang dan progres pembayarannya.',
  },
  as4_bayar_sekali: {
    headline: 'Sekali Bayar, Pakai Selamanya — Tanpa Langganan Bulanan',
    subheadline: 'Nggak ada biaya bulanan berulang. Bayar sekali di awal, update fitur baru ke depannya otomatis kamu dapatkan gratis.',
  },
};
const DEFAULT_HEADLINE = {
  headline: 'Uangmu Ada, Tapi Ke Mana Perginya Kamu Nggak Pernah Tahu?',
  subheadline: 'KantongKu bantu kamu balik pegang kendali — cukup ucapkan atau foto struk belanjaanmu, AI yang urus sisanya. Kelola dompet pribadi & bisnis kamu dalam satu aplikasi.',
};

// Read synchronously (lazy useState initializer, not an effect) so the
// correct headline is there on the very first render — no default-then-swap
// flash, and no dependency on Landing.tsx's own UTM-capture effect having
// run yet (effect order between a child and its parent isn't guaranteed to
// put this before that).
function resolveHeadline(): { headline: string; subheadline: string } {
  const utmContent = new URLSearchParams(window.location.search).get('utm_content');
  return (utmContent && HEADLINES_BY_UTM_CONTENT[utmContent]) || DEFAULT_HEADLINE;
}

interface HeroProps {
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

// landing-page-revisi-2 Task 6 — replaces the old fake CSS chat-bubble
// mockup with a phone device frame meant to hold a real Home-screen
// screenshot. No asset exists in the repo yet (see the commented import at
// the top of this file), so this renders a placeholder inside the same
// frame until the real file lands.
function HeroDeviceFrame({ src }: { src?: string }) {
  return (
    <div className="w-[220px] sm:w-[240px] mx-auto mt-4 rounded-[2rem] border-[6px] border-landing-text bg-landing-text p-1.5 shadow-2xl">
      <div className="w-full aspect-[9/19] rounded-[1.5rem] overflow-hidden bg-landing-surface/40">
        {src ? (
          <img src={src} alt="Tampilan Home KantongKu" className="w-full h-full object-cover" />
        ) : (
          // TODO: ganti dengan asset screenshot final dari owner
          <div className="w-full h-full flex items-center justify-center text-landing-text/25">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero({ onCtaClick }: HeroProps) {
  const [deadline, setDeadline] = useState<number>(() => getOrInitDeadline());
  const [now, setNow] = useState(() => Date.now());
  const [painPointIndex, setPainPointIndex] = useState(0);
  const [{ headline, subheadline }] = useState(() => resolveHeadline());

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

        {/* landing-page-revisi constraint — CTA/Hero must not show a price
            nominal at all (price first appears down in ValueStack.tsx), so
            this stays a pure urgency badge: promo framing + a countdown,
            no rupiah figure. */}
        <span className="text-xs font-bold uppercase tracking-wider text-landing-on-accent bg-landing-accent rounded-full px-4 py-2">
          🔥 Harga Promo Terbatas — Segera Ambil!
        </span>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-landing-text/60 uppercase tracking-wider">Promo berakhir dalam</span>
          <span className="text-2xl font-bold text-landing-text font-mono tracking-widest">
            {formatCountdown(deadline - now)}
          </span>
        </div>

        <button
          onClick={onCtaClick}
          className="h-14 px-8 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-landing-accent text-landing-on-accent"
        >
          Ambil Promo Sekarang
          <ArrowRight className="w-5 h-5" />
        </button>

        <HeroDeviceFrame />
      </div>
    </section>
  );
}
