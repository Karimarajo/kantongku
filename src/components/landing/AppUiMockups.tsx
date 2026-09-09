import React from 'react';
import { Camera, Landmark, Copy, Bell, Mic, BellRing } from 'lucide-react';

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

// Revisi (feedback screenshot Features): tambah baris "Suara" di samping
// "Foto" (sebelumnya cuma foto sendirian) supaya kelihatan dua cara input
// AI-nya, baru di bawahnya hasil scan-nya (baris Kopi -Rp15.000).
export function CatatKilatMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1 rounded-lg px-1.5 py-1" style={{ background: p.surface }}>
          <Camera className="w-2.5 h-2.5 shrink-0" style={{ color: p.primary }} />
          <span className="text-[6.5px] truncate" style={{ color: p.sub }}>Foto</span>
        </div>
        <div className="flex-1 flex items-center gap-1 rounded-lg px-1.5 py-1" style={{ background: p.surface }}>
          <Mic className="w-2.5 h-2.5 shrink-0" style={{ color: p.primary }} />
          <span className="text-[6.5px] truncate" style={{ color: p.sub }}>Suara</span>
        </div>
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
      <div className="flex items-center justify-between gap-1 rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <span className="text-[8px] font-semibold truncate min-w-0" style={{ color: p.text }}>Target Nikah 2028</span>
        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: `${p.primary}33`, color: p.primary }}>Bersama</span>
      </div>
    </Frame>
  );
}

// Revisi (feedback screenshot Features): jadi daftar 3 pengingat (bukan
// cuma satu progress bar cicilan) — Cicilan Motor + 2 tagihan lain, sesuai
// nama fitur "Pengingat Pembayaran & Kelola Cicilan".
export function CicilanMock({ dark }: MockProps) {
  const p = palette(dark);
  const items = [
    { label: 'Cicilan Motor', due: '5 hari lagi' },
    { label: 'Bayar Listrik', due: '3 hari lagi' },
    { label: 'Internet', due: 'Besok' },
  ];
  return (
    <Frame dark={dark} className="gap-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between rounded-md px-2 py-1" style={{ background: p.surface }}>
          <div className="flex items-center gap-1 min-w-0">
            <Bell className="w-2.5 h-2.5 shrink-0" style={{ color: p.primary }} />
            <span className="text-[7px] truncate" style={{ color: p.text }}>{it.label}</span>
          </div>
          <span className="text-[6.5px] shrink-0" style={{ color: p.sub }}>{it.due}</span>
        </div>
      ))}
    </Frame>
  );
}

// Revisi (feedback screenshot Features): bar dibuat PENUH & MERAH (sudah
// melebihi limit, bukan lagi contoh "baru terpakai sedikit"), plus ikon
// lonceng alarm supaya kelihatan ini notifikasi peringatan.
export function TargetLimitMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <BellRing className="w-3 h-3 shrink-0" style={{ color: '#ef4444' }} />
          <span className="text-[8px] font-semibold" style={{ color: p.text }}>Belanja</span>
        </div>
        <span className="text-[7px] font-bold" style={{ color: '#ef4444' }}>1jt/1jt</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: p.surface }}>
        <div className="h-full rounded-full" style={{ width: '100%', background: '#ef4444' }} />
      </div>
      <span className="text-[7px] font-semibold" style={{ color: '#ef4444' }}>Sudah melebihi limit!</span>
    </Frame>
  );
}

// Revisi (prompt final, Features poin "Target Nabung") — beda dari
// TargetLimitMock di atas (yang framing-nya "sisa limit belanja"), yang ini
// framing "terkumpul menuju target tabungan" supaya dua card yang bertetangga
// (Batasan Pengeluaran & Target Nabung) tidak menampilkan mockup identik.
// Revisi (feedback screenshot Features): dibuat "hampir tercapai" (90%,
// sebelumnya cuma 35%) supaya lebih optimis/memotivasi sebagai contoh.
export function TargetNabungMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-semibold" style={{ color: p.text }}>Dana Darurat</span>
        <span className="text-[7px]" style={{ color: p.sub }}>9jt/10jt</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: p.surface }}>
        <div className="h-full rounded-full" style={{ width: '90%', background: p.primary }} />
      </div>
      <span className="text-[7px] font-semibold" style={{ color: p.primary }}>Terkumpul 90%, hampir tercapai!</span>
    </Frame>
  );
}

// Revisi (feedback screenshot Features): tambah 1 baris deskripsi singkat
// di bawah kartu-kartu persen, supaya kelihatan ini bukan cuma angka
// mentah tapi disertai saran/kesimpulan singkat dari AI.
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
      <span className="text-[6.5px] leading-tight" style={{ color: p.sub }}>Rasio cicilan aman, tingkatkan tabungan bulanan.</span>
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

// Revisi (build ulang Features poin "Pantau Pengeluaran PayLater/Kartu
// Kredit") — menggantikan placeholder ImageOff, direkreasi dari screenshot
// modal "Bayar Tagihan" (Paylater) di app asli: ikon bank + judul, baris
// info tagihan/limit, satu baris item tagihan bercentang, tombol Bayar
// hijau. Sama pola dengan mock lain (palette+Frame), bukan PNG.
export function PaylaterMock({ dark }: MockProps) {
  const p = palette(dark);
  return (
    <Frame dark={dark}>
      <div className="flex items-center gap-1.5">
        <Landmark className="w-3 h-3 shrink-0" style={{ color: '#3b82f6' }} />
        <span className="text-[8px] font-semibold" style={{ color: p.text }}>Paylater</span>
      </div>
      <span className="text-[6.5px]" style={{ color: p.sub }}>Tagihan Rp300rb dari limit Rp10jt</span>
      <div className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: p.surface }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-sm border shrink-0" style={{ borderColor: p.sub }} />
          <span className="text-[7px] truncate" style={{ color: p.text }}>Belanja Tas</span>
        </div>
        <span className="text-[7px] font-bold shrink-0" style={{ color: p.text }}>Rp300rb</span>
      </div>
      <div className="rounded-md py-1 flex items-center justify-center" style={{ background: p.primary }}>
        <span className="text-[7px] font-bold" style={{ color: p.onPrimary }}>Bayar</span>
      </div>
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
