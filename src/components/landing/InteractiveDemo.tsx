import React from 'react';
import { PlayCircle, ArrowRight } from 'lucide-react';

interface InteractiveDemoProps {
  onCtaClick: () => void;
}

export default function InteractiveDemo({ onCtaClick }: InteractiveDemoProps) {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Lihat Bedanya dalam 15 Detik</h2>

        {/* TODO: ganti dengan video/GIF demo asli */}
        <div className="w-full aspect-video rounded-2xl border border-white/10 bg-surface-variant/40 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-primary/60" />
        </div>

        <p className="text-on-surface-variant max-w-md">
          Ini yang bakal kamu rasain tiap hari — nggak perlu buka kalkulator atau ngetik manual lagi.
        </p>

        <button
          onClick={onCtaClick}
          className="flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
        >
          Coba Sekarang <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
