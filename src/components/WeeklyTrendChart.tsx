import React, { useState } from 'react';
import { formatRupiah } from '../utils';
import { TrendingDown, ChevronRight } from 'lucide-react';

interface WeeklyTrendChartProps {
  // Pengeluaran per minggu kalender riil (lihat getWeeklyExpenseTrend di utils.ts).
  weeklyTrendData: number[];
  totalLabel?: string;
  // Dulu tombol "Lihat Keseluruhan" (menu Analisis) membuka Detail Pengeluaran
  // Bulanan — dihilangkan saat dipakai DI DALAM Detail Pengeluaran Bulanan
  // itu sendiri (tidak ada gunanya membuka halaman yang sedang dibuka).
  onOpenMonthlyDetail?: () => void;
}

// Kartu grafik "Tren Pengeluaran Mingguan" — sebelumnya di menu Analisis
// (dihapus, lihat App.tsx), sekarang dipakai di TransactionHistoryPage
// (bulan berjalan) dan MonthlyExpenseView (bulan yang sedang dilihat user).
export default function WeeklyTrendChart({ weeklyTrendData, totalLabel = 'Total Belanja Bulan Ini', onOpenMonthlyDetail }: WeeklyTrendChartProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const totalWeeklySpent = weeklyTrendData.reduce((sum, val) => sum + val, 0);

  // SVG coordinate calculations untuk mengalirkan curva spline berdasarkan jumlah minggu kalender riil dinamis
  const maxWeeklyHeight = Math.max(...weeklyTrendData, 1);
  const minWeeklyHeight = Math.min(...weeklyTrendData);
  const range = maxWeeklyHeight - minWeeklyHeight || 1;

  const chartWidth = 350;
  const coords = weeklyTrendData.map((val, idx) => {
    const x = (idx * (chartWidth / Math.max(1, weeklyTrendData.length - 1))) + 25;
    const factor = (val - minWeeklyHeight) / range;
    const y = 135 - (factor * 85);
    return { x, y, value: val };
  });

  let pathString = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const cp1x = (coords[i].x + coords[i + 1].x) / 2;
    const cp1y = coords[i].y;
    const cp2x = (coords[i].x + coords[i + 1].x) / 2;
    const cp2y = coords[i + 1].y;
    pathString += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${coords[i + 1].x} ${coords[i + 1].y}`;
  }

  return (
    // shrink-0 is load-bearing, not decorative: both call sites (History,
    // MonthlyExpenseView) place this card as a direct child of a scrollable
    // `flex flex-col ... overflow-y-auto` page root. Per the flexbox spec, a
    // flex item's automatic min-height is 0 (not content-based) whenever its
    // own `overflow` isn't `visible` — this card uses `overflow-hidden` (to
    // clip the decorative blur circle to the rounded corners) — so without
    // shrink-0 the browser is free to flex-shrink this whole card down to
    // just its padding whenever the page's total content is taller than the
    // scroll container's max-height, silently clipping the chart to a sliver.
    <div className="glass-card rounded-xl p-4 relative overflow-hidden flex flex-col gap-4 shrink-0">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider">{totalLabel}</p>
          <p className="font-display-lg text-on-surface font-mono-data text-2xl font-bold">{formatRupiah(totalWeeklySpent)}</p>
          {onOpenMonthlyDetail && (
            <button
              onClick={onOpenMonthlyDetail}
              className="flex items-center gap-0.5 text-[11px] text-primary hover:underline font-label-caps mt-1"
            >
              Lihat Keseluruhan <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
          <TrendingDown className="w-4 h-4 shrink-0" />
          <span className="font-mono-data text-xs font-bold">Grafik Riil</span>
        </div>
      </div>

      {/* Curve Chart */}
      <div className="h-44 w-full relative mt-3">
        <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(78, 222, 163, 0.4)" />
              <stop offset="100%" stopColor="rgba(78, 222, 163, 0.0)" />
            </linearGradient>
          </defs>

          <path d={`M ${coords[0].x} 140 ${pathString} L ${coords[coords.length - 1].x} 140 Z`} fill="url(#chartGradient)" />

          <path d={pathString} fill="none" stroke="#4edea3" strokeWidth="3" className="filter drop-shadow-[0_0_5px_rgba(78,222,163,0.6)]" />

          {coords.map((pt, idx) => (
            <g key={idx} className="cursor-pointer" onClick={() => setSelectedWeek(idx === selectedWeek ? null : idx)}>
              <circle cx={pt.x} cy={pt.y} r={selectedWeek === idx ? '7' : '4'} className={`${selectedWeek === idx ? 'fill-primary animate-pulse' : 'fill-surface stroke-primary'} transition-all`} strokeWidth="2" />
              <circle cx={pt.x} cy={pt.y} r="1.5" fill="#0B111E" />
            </g>
          ))}
        </svg>

        {/* X-Axis Legends Dinamis */}
        <div className="absolute bottom-2 left-0 w-full flex justify-between px-4 text-on-surface-variant/60 font-label-caps text-[9px] tracking-wider">
          {weeklyTrendData.map((val, idx) => (
            <span key={idx} className={val === 0 ? 'text-on-surface-variant/30' : 'font-semibold'}>
              Minggu {idx + 1}
            </span>
          ))}
        </div>

        {/* Tooltip Float panel */}
        {selectedWeek !== null && (
          <div className="absolute top-1 bg-surface border border-overlay/10 rounded-lg p-2 text-center text-xs shadow-xl left-1/2 -translate-x-1/2 z-10 animate-fade-in">
            <span className="font-bold text-on-surface block">Minggu Riil {selectedWeek + 1}</span>
            <span className="text-primary font-mono-data font-bold block mt-0.5">
              {weeklyTrendData[selectedWeek] > 0 ? formatRupiah(weeklyTrendData[selectedWeek]) : 'Tidak ada mutasi'}
            </span>
            <button onClick={() => setSelectedWeek(null)} className="text-[9px] font-label-caps uppercase text-rose-400 hover:text-rose-300 mt-1 flex items-center justify-center mx-auto" >
              Tutup [x]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
