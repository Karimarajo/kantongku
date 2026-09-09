import React from 'react';
import { Zap, CalendarClock, Target, PiggyBank, Wallet, Users, HeartPulse, CreditCard } from 'lucide-react';
import {
  CatatKilatMock,
  PisahkanUangMock,
  KolaborasiMock,
  CicilanMock,
  TargetLimitMock,
  TargetNabungMock,
  AnalisisAiMock,
  PaylaterMock,
} from './AppUiMockups';

// landing-page-revisi-4 — RECREATED miniature UI excerpts (AppUiMockups.tsx),
// theme-aware (dark/light) to match the landing page's own toggle — per
// explicit instruction: no screenshot PNGs, redraw the app's UI in code
// instead (verified still true as of this pass — the prompt that asked for
// this section's copy REVISION assumed real screenshots were already wired
// in; they weren't, this recreated-mockup approach is what's actually live
// and is kept as-is, no regression to real PNGs).
// Revisi (prompt final, poin 6) — daftar 8 card diganti total sesuai daftar
// baru. "Pantau Pengeluaran PayLater/Kartu Kredit" sempat pakai placeholder
// (belum ada mockup) — sekarang sudah dibuatkan PaylaterMock sendiri
// (lihat AppUiMockups.tsx), jadi field placeholderSlot yang dulu menandai
// itu sudah tidak dipakai kartu manapun lagi dan dihapus dari sini.
interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  Mock?: React.ComponentType<{ dark: boolean }>;
  rotate?: string; // Tailwind rotate class for the floating-frame tilt
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: 'Catat Secepat Kilat',
    description: 'Foto struk, rekam suara, atau ketik bebas, AI yang urus sisanya.',
    Mock: CatatKilatMock,
    rotate: '-rotate-2',
  },
  {
    icon: CalendarClock,
    title: 'Pengingat Pembayaran & Kelola Cicilan',
    description: 'Sekali input, otomatis diingatkan & terpantau progresnya.',
    Mock: CicilanMock,
    rotate: 'rotate-2',
  },
  {
    icon: Target,
    title: 'Batasan Pengeluaran',
    description: 'Atur limit tiap kategori, kontrol pengeluaran otomatis.',
    Mock: TargetLimitMock,
    rotate: '-rotate-1',
  },
  {
    icon: PiggyBank,
    title: 'Target Nabung',
    description: 'Nabung dengan tujuan jelas, progresnya kelihatan tiap saat.',
    Mock: TargetNabungMock,
    rotate: 'rotate-1',
  },
  {
    icon: Wallet,
    title: 'Pisah Keuangan Pribadi & Bisnis',
    description: 'Wallet terpisah, gak akan pernah kecampur lagi.',
    Mock: PisahkanUangMock,
    rotate: '-rotate-2',
  },
  {
    icon: Users,
    title: 'Atur Keuangan Bareng',
    description: 'Kolaborasi real-time bareng pasangan atau tim.',
    Mock: KolaborasiMock,
    rotate: 'rotate-2',
  },
  {
    icon: HeartPulse,
    title: 'Analisis Kesehatan Keuangan AI',
    description: 'Bukan cuma rekap, tapi kasih tahu kondisi keuanganmu & sarannya.',
    Mock: AnalisisAiMock,
    rotate: '-rotate-1',
  },
  {
    icon: CreditCard,
    title: 'Pantau Pengeluaran PayLater/Kartu Kredit',
    description: 'Catat & pantau tagihan PayLater dan kartu kredit kamu di satu tempat.',
    Mock: PaylaterMock,
    rotate: 'rotate-1',
  },
];

// Small floating "product snippet" frame — rounded corners + soft shadow +
// a slight tilt (straightens on hover) so the recreated mini-UI reads as a
// curated excerpt rather than a chart pasted flat into the card.
//
// Revisi (prompt 2, poin 11): ukuran dipatok EKSPLISIT dalam pixel (bukan
// lagi w-full h-28 yang lebarnya ikut lebar kartu/breakpoint) supaya kalau
// nanti mockup di sini diganti PNG asli, ukuran gambar yang diekspor sudah
// pasti: 240x140px @1x (siapkan juga versi 480x280px @2x untuk layar retina
// kalau perlu, aspek rasio yang sama).
const FEATURE_IMAGE_WIDTH_PX = 240;
const FEATURE_IMAGE_HEIGHT_PX = 140;

function FeatureMockFrame({ dark, rotate, Mock }: { dark: boolean; rotate: string; Mock: React.ComponentType<{ dark: boolean }> }) {
  return (
    <div
      style={{ width: FEATURE_IMAGE_WIDTH_PX, height: FEATURE_IMAGE_HEIGHT_PX, maxWidth: '100%' }}
      className={`mx-auto rounded-xl border border-landing-text/10 shadow-lg overflow-hidden ${rotate} transition-transform duration-300 hover:rotate-0`}
    >
      <Mock dark={dark} />
    </div>
  );
}

interface FeaturesProps {
  theme: 'light' | 'dark';
}

export default function Features({ theme }: FeaturesProps) {
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
                {f.Mock && f.rotate !== undefined && (
                  <div className="mt-1">
                    <FeatureMockFrame dark={theme === 'dark'} rotate={f.rotate} Mock={f.Mock} />
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
