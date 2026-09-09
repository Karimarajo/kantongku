import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck } from 'lucide-react';

// Revisi (prompt 3, poin 6) — popup "baru saja beli/pakai" di pojok kiri
// bawah, muncul random tiap 15-37 detik, nama ganti-ganti acak dari daftar
// di bawah (campuran nama umum & username gaya bebas, sesuai instruksi).
const NAMES = [
  'Marisa', 'Andi', 'Budi', 'Citra', 'Dewi', 'Eka', 'Fajar', 'Gita', 'Hendra', 'Indah',
  'Joko', 'Kartika', 'Lina', 'Made', 'Nadia', 'Oscar', 'Putri', 'Qori', 'Rizky', 'Sari',
  'Tono', 'Umi', 'Vina', 'Wawan', 'Yanti', 'Zaki', 'Jabal35', 'Rian_92', 'Dimas.id', 'Sasa88',
  'Bagus99', 'Nina_k', 'Teguh01', 'Ayu.p', 'Farhan_id', 'Melly23', 'Rafi.a', 'Sinta77', 'Yoga_id', 'Tari19',
  'Ari Wijaya', 'Bella Putri', 'Chandra S', 'Dian Permata', 'Erlangga', 'Fitri Anisa', 'Galih P', 'Hana Salsabila', 'Irfan M', 'Kiki Amelia',
];

const MIN_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 37_000;
const VISIBLE_DURATION_MS = 5_000;

function randomDelay(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

// Web Audio API bawaan browser (bukan file audio/dependency baru) — nada
// "ding" pendek disintesis lewat oscillator. Sebagian besar browser
// memblokir audio sebelum ada interaksi pengguna sama sekali di halaman
// (autoplay policy) — best-effort, dibungkus try/catch supaya kegagalan
// suara tidak pernah mengganggu notifikasi visualnya.
function playDing() {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio API tidak tersedia/diblokir — abaikan, notifikasi visual tetap tampil tanpa suara.
  }
}

export default function SocialProofToast() {
  const [visibleName, setVisibleName] = useState<string | null>(null);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleNext() {
      scheduleRef.current = setTimeout(() => {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        setVisibleName(name);
        playDing();
        hideRef.current = setTimeout(() => setVisibleName(null), VISIBLE_DURATION_MS);
        scheduleNext();
      }, randomDelay());
    }
    scheduleNext();
    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, []);

  if (!visibleName) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-[280px] toast-slide-in" role="status" aria-live="polite">
      <div className="flex items-center gap-3 bg-landing-bg border border-landing-text/10 shadow-xl rounded-2xl px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-landing-accent/20 flex items-center justify-center shrink-0">
          <BadgeCheck className="w-5 h-5 text-landing-accent" />
        </div>
        <p className="text-xs text-landing-text/80 leading-snug">
          <strong className="font-bold text-landing-text">{visibleName}</strong>{' '}
          <em className="italic">berhasil melakukan pembelian</em>,{' '}
          <em className="italic">pembayaran</em>{' '}
          <strong className="font-bold text-landing-text">telah terkonfirmasi</strong>.
        </p>
      </div>
    </div>
  );
}
