import React from 'react';
import { CheckCheck } from 'lucide-react';

// landing-page-revisi-2 Task 11 (revised in landing-page-revisi-4) — 4 REAL
// quotes from actual users, styled as a chat-message bubble (evoking how
// they actually arrived — as WhatsApp messages) rather than a plain quote
// card. Deliberately NOT a pixel recreation of WhatsApp's own app chrome
// (no back-arrow/video-call header, no phone number, no real contact name)
// — the standing constraint from the original prompt is that the sender
// label stays the generic "Pengguna KantongKu" (no real names shown
// publicly), so this reads as "a message-style testimonial card in
// KantongKu's own visual language", not as a genuine captured screenshot
// of a specific person's chat.
const GENERIC_NAME = 'Pengguna KantongKu';

const TESTIMONIALS = [
  'Dengan harga segini worth it banget — fiturnya lengkap, apalagi yang catat pakai suara pakai AI. Ngebantu banget buat yang males input manual.',
  'Murah banget buat harga segitu. Aplikasi lain rata-rata langganan bulanan, ini sekali bayar doang.',
  'Fiturnya bagus dan lengkap, bisa export laporan keuangan juga buat pelaporan ke orang lain.',
  'Sekarang jadi andalan buat tau kondisi keuangan sendiri kayak gimana.',
];

function TestimonialCard({ quote }: { quote: string }) {
  return (
    <div className="flex flex-col gap-3 bg-landing-surface/20 border border-landing-text/10 rounded-2xl p-4">
      {/* Message bubble — rounded-bl-sm gives it the "incoming chat message"
          tail shape, same trick already used for the Hero mockup bubble. */}
      <div className="bg-landing-bg border border-landing-text/10 rounded-2xl rounded-bl-sm px-3.5 py-3 shadow-sm">
        <p className="text-xs text-landing-text/85 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-landing-text">{GENERIC_NAME}</span>
        <CheckCheck className="w-3.5 h-3.5 text-landing-accent" />
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="w-full py-16 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text text-center">Apa Kata Mereka</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((quote, i) => (
            <TestimonialCard key={i} quote={quote} />
          ))}
        </div>
      </div>
    </section>
  );
}
