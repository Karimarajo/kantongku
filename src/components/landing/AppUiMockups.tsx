import React from 'react';
import { Camera, Landmark, Copy, Bell } from 'lucide-react';

// landing-page-revisi-4 — recreated (not photographed) miniature UI
// excerpts for the Features cards + Hero device frame. Per explicit
// instruction: no screenshot PNGs here at all — these are small React/
// Tailwind recreations that evoke the REAL app's own dashboard look,
// switched between the app's own actual dark/light hex values (NOT the
// landing page's own mint/navy brand palette — this is a deliberate third,
// self-contained palette representing "what the KantongKu app itself looks
// like"), synced to the landing page's dark/light toggle.
interface MockProps {
  dark: boolean;
}

function palette(dark: boolean) {
  // Same hex values as --color-* in index.css's dark default / light
  // theme override, copied here as plain constants — these mockups are
  // illustrative-only and intentionally isolated from both the app's real
  // theme system and the landing page's own --color-landing-* tokens.
  return dark
    ? { bg: '#111827', surface: '#1f2937', text: '#f3f4f6', sub: '#9ca3af', primary: '#4edea3', onPrimary: '#06281d' }
    : { bg: '#ffffff', surface: '#eaf1ec', text: '#10160f', sub: '#59645d', primary: '#1f7a4d', onPrimary: '#ffffff' };
}

function Frame({ dark, children, className = '' }: MockProps & { children: React.ReactNode; className?: string }) {
  const p = palette(dark);
  return (
    <div className={`w-full h-full flex flex-col justify-center gap-1.5 px-2.5 py-2 ${className}`} style={{ background: p.bg }}>
      {children}
    </div>
  );
}

export function CatatKilatMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <Camera className="w-3 h-3 shrink-0" style={{ color: p.primary }} />
        <span className="text-[8px] truncate" style={{ color: p.sub }}>Foto Struk Belanja</span>
      </div>
      <div className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <span className="text-[9px] font-semibold" style={{ color: p.text }}>Kopi</span>
        <span className="text-[9px] font-bold" style={{ color: p.primary }}>-Rp15.000</span>
      </div>
    </Frame>
  );
}

export function PisahkanUangMock({ dark }: MockProps) {
  const p = palette(dark);
  const rows = [
    { label: 'Kantong Pribadi', amount: 'Rp91jt', color: p.primary },
    { label: 'Kantong Bisnis', amount: 'Rp5,4jt', color: '#3b82f6' },
    { label: 'Kantong Titipan', amount: 'Rp1,3jt', color: '#f59e0b' },
  ];
  return (
    <Frame dark={dark} className="gap-1">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-md pl-2 pr-1.5 py-1 border-l-2" style={{ background: p.surface, borderColor: r.color }}>
          <span className="text-[7.5px] truncate" style={{ color: p.text }}>{r.label}</span>
          <span className="text-[7.5px] font-bold shrink-0" style={{ color: r.color }}>{r.amount}</span>
        </div>
      ))}
    </Frame>
  );
}

export function KolaborasiMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2" style={{ background: `${p.primary}33`, color: p.primary, borderColor: p.bg }}>A</div>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 -ml-1.5" style={{ background: '#a78bfa33', color: '#a78bfa', borderColor: p.bg }}>B</div>
        <span className="text-[8px] ml-1.5" style={{ color: p.sub }}>Kantong Bersama</span>
      </div>
      <div className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <span className="text-[8px] font-semibold" style={{ color: p.text }}>Kas Usaha</span>
        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${p.primary}33`, color: p.primary }}>Bersama</span>
      </div>
    </Frame>
  );
}

export function CicilanMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-semibold" style={{ color: p.text }}>Cicilan Motor</span>
        <span className="text-[8px] font-bold" style={{ color: p.primary }}>33%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: p.surface }}>
        <div className="h-full rounded-full" style={{ width: '33%', background: p.primary }} />
      </div>
      <span className="text-[7px]" style={{ color: p.sub }}>4/12 bulan terbayar</span>
    </Frame>
  );
}

export function TargetLimitMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-semibold" style={{ color: p.text }}>Belanja</span>
        <span className="text-[7px]" style={{ color: p.sub }}>45rb/1jt</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: p.surface }}>
        <div className="h-full rounded-full" style={{ width: '4%', background: p.primary }} />
      </div>
      <span className="text-[7px]" style={{ color: p.sub }}>Sisa 96% dari limit</span>
    </Frame>
  );
}

export function AnalisisAiMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full w-fit" style={{ background: '#f59e0b33', color: '#f59e0b' }}>Cukup Sehat</span>
      <div className="flex gap-1">
        {['14.9%', '0%', '39.1x'].map((v, i) => (
          <div key={i} className="flex-1 rounded-md px-1 py-1 text-center" style={{ background: p.surface }}>
            <span className="text-[8px] font-bold block" style={{ color: p.text }}>{v}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function InfoRekeningMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Landmark className="w-3 h-3 shrink-0" style={{ color: p.primary }} />
          <span className="text-[8px] font-semibold truncate" style={{ color: p.text }}>Bank BCA</span>
        </div>
        <Copy className="w-3 h-3 shrink-0" style={{ color: p.sub }} />
      </div>
      <span className="text-[9px] font-bold" style={{ color: p.text }}>Rp17.000.000</span>
    </Frame>
  );
}

// Hero's device-frame content (Task 6, extended here per the same
// "recreate instead of screenshot" direction) — a compact recreation of the
// Home dashboard: greeting, total-balance card, two pocket chips, a row of
// quick-action icons.
export function HomeScreenMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <div className="w-full h-full flex flex-col gap-2 px-3 py-3" style={{ background: p.bg }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold" style={{ color: p.primary }}>KantongKu</span>
        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: p.surface }}>
          <Bell className="w-2 h-2" style={{ color: p.sub }} />
        </div>
      </div>
      <div className="rounded-xl px-2.5 py-2 flex flex-col gap-0.5" style={{ background: `${p.primary}1a`, border: `1px solid ${p.primary}4d` }}>
        <span className="text-[6.5px] uppercase tracking-wide" style={{ color: p.sub }}>Total Saldo Seluruhnya</span>
        <span className="text-[11px] font-bold" style={{ color: p.primary }}>Rp97.817.400</span>
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
          <span className="text-[6.5px] block truncate" style={{ color: p.primary }}>Pribadi</span>
          <span className="text-[7.5px] font-bold block" style={{ color: p.text }}>Rp91jt</span>
        </div>
        <div className="flex-1 rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
          <span className="text-[6.5px] block truncate" style={{ color: '#3b82f6' }}>Bisnis</span>
          <span className="text-[7.5px] font-bold block" style={{ color: p.text }}>Rp5,4jt</span>
        </div>
      </div>
      <div className="flex justify-between px-1 mt-0.5">
        {['+', '↗', '🎯', '⏰', '⋯'].map((c, i) => (
          <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[7px]" style={{ background: p.surface, color: p.sub }}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
