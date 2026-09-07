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

// landing-page-revisi Task 5 — one headline per ad angle, picked from
// `utm_content` on the landing URL. Replaces an earlier draft that
// literally listed the angle names/variants as on-page text (an internal
// note that leaked into the visual mockup) — this is the actual runtime
// logic that note was describing: render exactly ONE headline, chosen by
// the query param, never the list itself. Copy stays within claims already
// made elsewhere on this page (OCR struk, cicilan reminder, sekali bayar
// selamanya) — no new features/facts introduced.
const HEADLINES_BY_UTM_CONTENT: Record<string, string> = {
  as1_ocr: 'Foto Struk Belanja, Sisanya Biar AI yang Catat',
  as3_cicilan: 'Nggak Kena Denda Lagi Gara-Gara Lupa Bayar Cicilan',
  as4_bayar_sekali: 'Sekali Bayar, Pakai Selamanya — Tanpa Langganan Bulanan',
};
const DEFAULT_HEADLINE = 'Uangmu Ada, Tapi Ke Mana Perginya Kamu Nggak Pernah Tahu?';

// Read synchronously (lazy useState initializer, not an effect) so the
// correct headline is there on the very first render — no default-then-swap
// flash, and no dependency on Landing.tsx's own UTM-capture effect having
// run yet (effect order between a child and its parent isn't guaranteed to
// put this before that).
function resolveHeadline(): string {
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

export default function Hero({ onCtaClick }: HeroProps) {
  const [deadline, setDeadline] = useState<number>(() => getOrInitDeadline());
  const [now, setNow] = useState(() => Date.now());
  const [painPointIndex, setPainPointIndex] = useState(0);
  const [headline] = useState<string>(() => resolveHeadline());

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
    <section className="w-full flex flex-col items-center px-6 pt-14 pb-16 relative overflow-hidden bg-body-bg">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-6 z-10 text-center">
        <div className="w-20 h-20 p-3 bg-surface-variant/40 rounded-3xl border border-overlay/5 flex items-center justify-center">
          <BrandLogo className="w-14 h-14" />
        </div>

        <h1 className="font-display-lg text-3xl sm:text-5xl text-on-surface font-bold tracking-tight leading-tight">
          {headline}
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
            className="text-xs font-semibold text-on-surface-variant bg-overlay/5 border border-overlay/10 rounded-full px-4 py-2 animate-fade-in"
          >
            {PAIN_POINTS[painPointIndex]}
          </span>
        </div>

        {/* landing-page-revisi constraint — CTA/Hero must not show a price
            nominal at all (price first appears down in ValueStack.tsx), so
            this stays a pure urgency badge: promo framing + a countdown,
            no rupiah figure. */}
        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
          🔥 Harga Promo Terbatas — Segera Ambil!
        </span>

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
          Ambil Promo Sekarang
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* TODO: ganti dengan screenshot asli dashboard */}
        <div className="w-full max-w-md mt-6 rounded-2xl border border-overlay/10 bg-surface-variant/40 p-5 flex flex-col gap-3">
          <div className="self-start max-w-[80%] bg-primary/10 border border-primary/20 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-primary">
            "Tadi jajan kopi 15rb"
          </div>
          <div className="self-end w-full bg-surface border border-overlay/10 rounded-xl p-3 flex items-center justify-between">
            <div className="flex flex-col text-left">
              <span className="text-xs text-on-surface-variant/60">Jajan / Kopi</span>
              <span className="text-sm font-semibold text-on-surface">Kopi</span>
            </div>
            <span className="font-mono-data text-sm font-bold text-danger">-Rp15.000</span>
          </div>
        </div>
      </div>
    </section>
  );
}
