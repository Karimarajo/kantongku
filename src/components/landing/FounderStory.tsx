import React from 'react';
import { Sparkles, Code2 } from 'lucide-react';

// landing-page-revisi-2 Task 10 — new credibility/origin-story section,
// placed after ValueStack and before Testimonials (after Before/After,
// before Testimonials, per the acceptance criteria — this slot builds
// trust right before the pricing ask and the social-proof testimonials
// that follow it).
export default function FounderStory() {
  return (
    <section className="w-full px-6 py-16 bg-landing-surface/20">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">
        <div className="w-12 h-12 rounded-full bg-landing-accent/20 border border-landing-accent/40 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-landing-text" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">Kenapa KantongKu Dibuat?</h2>
        <p className="text-sm sm:text-base text-landing-text/80 leading-relaxed max-w-xl">
          KantongKu awalnya dibuat buat kebutuhan pribadi — capek nyatet keuangan manual di Excel/notes dan
          sering kehilangan jejak duit sendiri. Setelah dipakai sehari-hari dan kerasa banget bantunya, baru
          kepikiran ini bisa berguna juga buat orang lain yang punya masalah serupa.
        </p>

        <div className="w-full flex flex-col sm:flex-row items-center gap-4 bg-landing-bg border border-landing-text/10 rounded-2xl p-6 mt-2">
          <div className="w-14 h-14 rounded-full bg-landing-text/10 flex items-center justify-center shrink-0">
            <Code2 className="w-6 h-6 text-landing-text" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-landing-text">Dibangun oleh Marajo Tech</p>
            <p className="text-xs sm:text-sm text-landing-text/70 leading-relaxed mt-1">
              Developer yang sama sebelumnya membangun KasirKu, aplikasi kasir yang masih dipakai beberapa
              brand sampai sekarang — KantongKu dibuat dengan pengalaman yang sama dalam membangun aplikasi
              yang benar-benar dipakai jangka panjang, bukan sekadar proyek coba-coba.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
