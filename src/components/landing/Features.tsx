import React from 'react';
import { Zap, Wallet, Users, CalendarClock, Target, HeartPulse, Copy, Infinity as InfinityIcon, ImageOff } from 'lucide-react';

// landing-page-revisi-2 Task 9 — same card-based "curated product snippet"
// structure as before, re-themed onto the new --color-landing-* tokens
// (see index.css) instead of the app's own theme tokens. 7 of the 8 cards
// carry a small floating/tilted frame meant to hold a CROPPED excerpt of a
// real app screenshot — "Beli Sekali, Pakai Selamanya" has no such slot.
//
// No screenshot files exist in the repo yet (the owner provides them
// separately) — every import below is commented out (a real import of a
// missing file would break the Vite build) and every `screenshot` field is
// left undefined for now; FeatureScreenshotFrame renders a placeholder in
// that case. To wire up a real asset: drop the file in
// src/assets/screenshots/, uncomment its import line, and set the
// matching feature's `screenshot` field to the imported value.
// import screenshotCatatKilat from '../../assets/screenshots/catat-kilat.png';
// import screenshotPisahkanUang from '../../assets/screenshots/pisahkan-uang.png';
// import screenshotKantongBersama from '../../assets/screenshots/kantong-bersama.png';
// import screenshotCicilan from '../../assets/screenshots/cicilan.png';
// import screenshotTargetLimit from '../../assets/screenshots/target-limit.png';
// import screenshotAnalisisAi from '../../assets/screenshots/analisis-ai.png';
// import screenshotInfoRekening from '../../assets/screenshots/info-rekening.png';

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  screenshot?: string; // a CROPPED excerpt, never a full-page screenshot
  rotate?: string; // Tailwind rotate class for the floating-frame tilt; omitted = no screenshot slot at all
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: 'Catat Secepat Kilat',
    description: 'Foto struk, rekam suara, atau ketik bebas — AI yang urus sisanya.',
    screenshot: undefined, // screenshotCatatKilat,
    rotate: '-rotate-2',
  },
  {
    icon: Wallet,
    title: 'Pisahkan Uang Bisnis, Pribadi & Titipan',
    description: 'Wallet terpisah, gak akan pernah kecampur lagi.',
    screenshot: undefined, // screenshotPisahkanUang,
    rotate: 'rotate-2',
  },
  {
    icon: Users,
    title: 'Atur Bareng Pasangan/Tim',
    description: 'Kolaborasi real-time, akses penuh untuk yang diundang.',
    screenshot: undefined, // screenshotKantongBersama,
    rotate: '-rotate-1',
  },
  {
    icon: CalendarClock,
    title: 'Reminder & Kelola Cicilan/Hutang',
    description: 'Sekali input, otomatis diingatkan & terpantau progresnya.',
    screenshot: undefined, // screenshotCicilan,
    rotate: 'rotate-1',
  },
  {
    icon: Target,
    title: 'Target Impian & Limit Jajan',
    description: 'Nabung dengan tujuan jelas, kontrol pengeluaran otomatis.',
    screenshot: undefined, // screenshotTargetLimit,
    rotate: '-rotate-2',
  },
  {
    icon: HeartPulse,
    title: 'Analisis Kesehatan Keuangan oleh AI',
    description: 'Bukan cuma rekap, tapi kasih tahu kondisi keuanganmu & sarannya.',
    screenshot: undefined, // screenshotAnalisisAi,
    rotate: 'rotate-2',
  },
  {
    icon: Copy,
    title: 'Simpan Info Rekening, Copy Sekali Klik',
    description: 'Mau kirim info transfer ke siapa pun, tinggal salin.',
    screenshot: undefined, // screenshotInfoRekening,
    rotate: '-rotate-1',
  },
  {
    // No screenshot slot at all for this one — it's a product/pricing
    // claim, not a UI feature to show a snippet of.
    icon: InfinityIcon,
    title: 'Beli Sekali, Pakai Selamanya',
    description: 'Tanpa langganan bulanan, update fitur terus jalan gratis.',
  },
];

// Small floating "product snippet" frame — rounded corners + soft shadow +
// a slight tilt (straightens on hover) so a screenshot crop reads as a
// curated excerpt rather than a screenshot pasted flat into the card.
function FeatureScreenshotFrame({ src, alt, rotate }: { src?: string; alt: string; rotate: string }) {
  return (
    <div
      className={`w-full h-28 rounded-xl border border-landing-text/10 shadow-lg overflow-hidden bg-landing-surface/30 ${rotate} transition-transform duration-300 hover:rotate-0`}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        // TODO: ganti dengan asset screenshot final dari owner
        <div className="w-full h-full flex items-center justify-center text-landing-text/25">
          <ImageOff className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

export default function Features() {
  return (
    <section className="w-full px-6 py-16 bg-landing-bg">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">Fitur Unggulan</h2>
          <p className="text-sm text-landing-text/70 max-w-md">Semua yang kamu butuh buat nggak lagi kehilangan jejak uangmu, dalam satu aplikasi.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex flex-col gap-3 bg-landing-surface/20 border border-landing-text/10 rounded-2xl p-6 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-landing-accent/20 border border-landing-accent/40 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-landing-text" />
                </div>
                <h3 className="text-sm font-bold text-landing-text">{f.title}</h3>
                <p className="text-xs text-landing-text/70 leading-relaxed">{f.description}</p>
                {f.rotate !== undefined && (
                  <div className="mt-1">
                    <FeatureScreenshotFrame src={f.screenshot} alt={f.title} rotate={f.rotate} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
