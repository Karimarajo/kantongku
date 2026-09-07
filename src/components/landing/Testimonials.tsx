import React from 'react';
import { ImageOff } from 'lucide-react';

// landing-page-revisi-2 Task 11 — replaces the previous 12 illustrative/
// fictional-persona testimonials entirely. These 4 are REAL quotes from
// actual users, shown as a captured screenshot inside each card (not text
// re-styled as a fake chat bubble) — sender label stays the generic
// "Pengguna KantongKu" per the explicit constraint (no real names shown).
//
// No screenshot files exist in the repo yet (the owner provides them
// separately) — each `screenshot` field below is left undefined and the
// card renders a placeholder in its place; drop the real capture into
// src/assets/screenshots/testimonials/, uncomment the matching import, and
// set that testimonial's `screenshot` field to wire it up for real.
// import testimonial1 from '../../assets/screenshots/testimonials/testimoni-1.png';
// import testimonial2 from '../../assets/screenshots/testimonials/testimoni-2.png';
// import testimonial3 from '../../assets/screenshots/testimonials/testimoni-3.png';
// import testimonial4 from '../../assets/screenshots/testimonials/testimoni-4.png';

const GENERIC_NAME = 'Pengguna KantongKu';

interface Testimonial {
  quote: string;
  screenshot?: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Dengan harga segini worth it banget — fiturnya lengkap, apalagi yang catat pakai suara pakai AI. Ngebantu banget buat yang males input manual.',
    screenshot: undefined, // testimonial1,
  },
  {
    quote: 'Murah banget buat harga segitu. Aplikasi lain rata-rata langganan bulanan, ini sekali bayar doang.',
    screenshot: undefined, // testimonial2,
  },
  {
    quote: 'Fiturnya bagus dan lengkap, bisa export laporan keuangan juga buat pelaporan ke orang lain.',
    screenshot: undefined, // testimonial3,
  },
  {
    quote: 'Sekarang jadi andalan buat tau kondisi keuangan sendiri kayak gimana.',
    screenshot: undefined, // testimonial4,
  },
];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex flex-col gap-3 bg-landing-bg border border-landing-text/10 rounded-2xl p-4">
      {/* Real screenshot capture goes here — see the commented imports
          above. Rendered as an image, not text styled to look like one. */}
      <div className="w-full rounded-xl border border-landing-text/10 overflow-hidden bg-landing-surface/30 aspect-[4/5] flex items-center justify-center">
        {t.screenshot ? (
          <img src={t.screenshot} alt={`Testimoni dari ${GENERIC_NAME}`} className="w-full h-full object-cover" />
        ) : (
          // TODO: ganti dengan capturan asli dari owner
          <div className="flex flex-col items-center gap-2 text-landing-text/30 p-4 text-center">
            <ImageOff className="w-6 h-6" />
            <p className="text-[10px] leading-snug">&ldquo;{t.quote}&rdquo;</p>
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-landing-text text-center">{GENERIC_NAME}</p>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="w-full py-16 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text text-center">Apa Kata Mereka</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
