import React from 'react';
import { Zap, Wallet, Users, CalendarClock, Target, HeartPulse, Copy, Infinity as InfinityIcon } from 'lucide-react';
import {
  CatatKilatMock,
  PisahkanUangMock,
  KolaborasiMock,
  CicilanMock,
  TargetLimitMock,
  AnalisisAiMock,
  InfoRekeningMock,
} from './AppUiMockups';

// landing-page-revisi-4 — replaces the earlier screenshot-slot placeholders
// with RECREATED miniature UI excerpts (AppUiMockups.tsx), theme-aware
// (dark/light) to match the landing page's own toggle — per explicit
// instruction: no screenshot PNGs, redraw the app's UI in code instead. 7
// of the 8 cards carry a small floating/tilted frame; "Beli Sekali, Pakai
// Selamanya" has no such slot (it's a pricing claim, not a UI feature).
interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  Mock?: React.ComponentType<{ dark: boolean }>;
  rotate?: string; // Tailwind rotate class for the floating-frame tilt; omitted = no mockup slot at all
}

const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: 'Catat Secepat Kilat',
    description: 'Foto struk, rekam suara, atau ketik bebas — AI yang urus sisanya.',
    Mock: CatatKilatMock,
    rotate: '-rotate-2',
  },
  {
    icon: Wallet,
    title: 'Pisahkan Uang Bisnis, Pribadi & Titipan',
    description: 'Wallet terpisah, gak akan pernah kecampur lagi.',
    Mock: PisahkanUangMock,
    rotate: 'rotate-2',
  },
  {
    icon: Users,
    title: 'Atur Bareng Pasangan/Tim',
    description: 'Kolaborasi real-time, akses penuh untuk yang diundang.',
    Mock: KolaborasiMock,
    rotate: '-rotate-1',
  },
  {
    icon: CalendarClock,
    title: 'Reminder & Kelola Cicilan/Hutang',
    description: 'Sekali input, otomatis diingatkan & terpantau progresnya.',
    Mock: CicilanMock,
    rotate: 'rotate-1',
  },
  {
    icon: Target,
    title: 'Target Impian & Limit Jajan',
    description: 'Nabung dengan tujuan jelas, kontrol pengeluaran otomatis.',
    Mock: TargetLimitMock,
    rotate: '-rotate-2',
  },
  {
    icon: HeartPulse,
    title: 'Analisis Kesehatan Keuangan oleh AI',
    description: 'Bukan cuma rekap, tapi kasih tahu kondisi keuanganmu & sarannya.',
    Mock: AnalisisAiMock,
    rotate: 'rotate-2',
  },
  {
    icon: Copy,
    title: 'Simpan Info Rekening, Copy Sekali Klik',
    description: 'Mau kirim info transfer ke siapa pun, tinggal salin.',
    Mock: InfoRekeningMock,
    rotate: '-rotate-1',
  },
  {
    // No mockup slot at all for this one — it's a product/pricing claim,
    // not a UI feature to show a snippet of.
    icon: InfinityIcon,
    title: 'Beli Sekali, Pakai Selamanya',
    description: 'Tanpa langganan bulanan, update fitur terus jalan gratis.',
  },
];

// Small floating "product snippet" frame — rounded corners + soft shadow +
// a slight tilt (straightens on hover) so the recreated mini-UI reads as a
// curated excerpt rather than a chart pasted flat into the card.
function FeatureMockFrame({ dark, rotate, Mock }: { dark: boolean; rotate: string; Mock: React.ComponentType<{ dark: boolean }> }) {
  return (
    <div
      className={`w-full h-28 rounded-xl border border-landing-text/10 shadow-lg overflow-hidden ${rotate} transition-transform duration-300 hover:rotate-0`}
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
