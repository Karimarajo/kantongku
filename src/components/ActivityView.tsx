import React, { useState } from 'react';
import { Transaction, Pocket, Category } from '../types';
import { formatRupiah, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import CategoryDonutChart, { CategoryDonutFilter } from './CategoryDonutChart';
import {
  TrendingDown,
  Receipt,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ActivityViewProps {
  transactions: Transaction[];
  pockets: Pocket[];
  categories: Category[];
  onOpenHistory: (filter?: { category?: string }) => void;
  onOpenMonthlyDetail: () => void;
}

export default function ActivityView({ transactions, pockets, categories, onOpenHistory, onOpenMonthlyDetail }: ActivityViewProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  // Driven by CategoryDonutChart's onFilterChange below — used here to filter
  // the "Pengeluaran/Pemasukan Terbesar" sections (Task 7's reusable donut
  // widget owns the click/toggle interaction itself, this just reacts to it).
  const [donutFilter, setDonutFilter] = useState<CategoryDonutFilter | null>(null);

  const totalBalance = pockets.reduce((sum, p) => sum + p.balance, 0);

  const now0 = new Date();
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now0.getMonth() && d.getFullYear() === now0.getFullYear();
  });

  // REVISI 1: LOGIKA MINGGU RIIL KALENDER (SENIN - MINGGU) BERJALAN DINAMIS (BISA 4, 5, ATAU 6 MINGGU)
  const getWeeklyTrendData = (): number[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const outgoingThisMonth = transactions.filter(t => {
      if (t.type !== 'outgoing') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (outgoingThisMonth.length === 0) return [0, 0, 0, 0];

    // Cari hari pertama bulan ini jatuh di hari apa (0 = Minggu, 1 = Senin, ..., 6 = Sabtu)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    let dayOfWeek = firstDayOfMonth.getDay();
    // Normalisasi agar Senin = 0, Selasa = 1, ..., Minggu = 6
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Hitung total minggu riil kalender di bulan ini
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalWeeksNeeded = Math.ceil((totalDaysInMonth + dayOfWeek) / 7);

    const liveWeeks = Array(totalWeeksNeeded).fill(0);

    outgoingThisMonth.forEach(t => {
      const day = new Date(t.date).getDate();
      // Tentukan indeks minggu riil (Senin - Minggu)
      const weekIndex = Math.floor((day + dayOfWeek - 1) / 7);
      if (weekIndex >= 0 && weekIndex < liveWeeks.length) {
        liveWeeks[weekIndex] += t.amount;
      }
    });

    return liveWeeks;
  };

  const weeklyTrendData = getWeeklyTrendData();
  const totalWeeklySpent = weeklyTrendData.reduce((sum, val) => sum + val, 0);

  // REVISI 2: AGREGASI PENGELUARAN/PEMASUKAN TERBESAR URUT TURUN & PACKING TRANSAKSI TANPA KATEGORI KE "LAIN-LAIN"
  const getTopCategories = (type: 'incoming' | 'outgoing') => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categoryTotals: Record<string, { spent: number; count: number }> = {};

    const list = transactions.filter(t => {
      if (t.type !== type) return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    list.forEach(t => {
      // Proteksi otomatis: Jika kategori kosong, tidak valid, atau tidak dikenal -> Paksa masuk ke wadah "lainnya"
      const isValidCat = categories.some(c => c.id === t.category);
      const targetCategory = (t.category && isValidCat) ? t.category : 'lainnya';

      if (!categoryTotals[targetCategory]) {
        categoryTotals[targetCategory] = { spent: 0, count: 0 };
      }
      categoryTotals[targetCategory].spent += t.amount;
      categoryTotals[targetCategory].count += 1;
    });

    const totalAmount = list.reduce((s, t) => s + t.amount, 0);

    const categoriesArray = Object.keys(categoryTotals).map(catId => {
      const catInfo = categories.find(c => c.id === catId);
      const data = categoryTotals[catId];
      const percent = totalAmount > 0 ? Math.round((data.spent / totalAmount) * 100) : 0;
      return {
        id: catId,
        name: catInfo?.name || 'Lain-lain',
        icon: catInfo?.icon || 'receipt',
        color: catInfo?.color || 'slate',
        spent: data.spent,
        count: data.count,
        percent,
      };
    });

    // Urutkan mutlak dari yang paling besar ke kecil (Descending Order)
    return categoriesArray.sort((a, b) => b.spent - a.spent);
  };

  const topCategories = getTopCategories('outgoing');
  const topIncomeCategories = getTopCategories('incoming');

  // SVG coordinate calculations untuk mengalirkan curva spline berdasarkan jumlah minggu kalender riil dinamis
  const maxWeeklyHeight = Math.max(...weeklyTrendData, 1);
  const minWeeklyHeight = Math.min(...weeklyTrendData);
  const range = maxWeeklyHeight - minWeeklyHeight || 1;
  
  // Rentang jarak lebar X menyesuaikan total jumlah minggu riil bulan kalender (bisa 4, 5, atau 6 titik)
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

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6 select-none font-body-md min-w-0 w-full text-left">
      
      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Analisis Pengeluaran</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Tinjau statistik peredaran dana terhitung dalam kalender riil — <span className="text-primary font-semibold">{currentMonthName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full min-w-0">

        {/* GRAFIK TREN MINGGU KALENDER RIIL */}
        <section className="flex flex-col gap-2.5 w-full min-w-0">
            <h2 className="font-headline-sm text-base text-white">Tren Pengeluaran Mingguan</h2>
            
            <div className="glass-card rounded-xl p-4 relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-on-surface-variant font-label-caps uppercase tracking-wider">Total Belanja Bulan Ini</p>
                  <p className="font-display-lg text-white font-mono-data text-2xl font-bold">{formatRupiah(totalWeeklySpent)}</p>
                  <button
                    onClick={onOpenMonthlyDetail}
                    className="flex items-center gap-0.5 text-[11px] text-primary hover:underline font-label-caps mt-1"
                  >
                    Lihat Keseluruhan <ChevronRight className="w-3 h-3" />
                  </button>
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
                  <div className="absolute top-1 bg-[#0F172A] border border-white/10 rounded-lg p-2 text-center text-xs shadow-xl left-1/2 -translate-x-1/2 z-10 animate-fade-in">
                    <span className="font-bold text-white block">Minggu Riil {selectedWeek + 1}</span>
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
        </section>

        {/* Pengeluaran & Pemasukan per Kategori: donat chart, di antara Tren Mingguan & Pengeluaran Terbesar */}
        <section className="flex flex-col gap-2.5 w-full min-w-0">
          <h2 className="font-headline-sm text-base text-white">Pengeluaran &amp; Pemasukan per Kategori</h2>
          <CategoryDonutChart
            transactions={currentMonthTransactions}
            categories={categories}
            expenseEmptyLabel="Belum ada pengeluaran bulan ini."
            incomeEmptyLabel="Belum ada pemasukan bulan ini."
            value={donutFilter}
            onChange={setDonutFilter}
          />
        </section>

        {/* AGREGASI PENGELUARAN TERBESAR */}
        <section className="flex flex-col gap-2.5 w-full min-w-0">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h2 className="font-headline-sm text-base text-white">Pengeluaran Terbesar</h2>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Urutan Termahal</span>
            </div>

            <div className="flex flex-col gap-3">
              {(() => {
                const expenseFiltered = donutFilter?.type === 'outgoing'
                  ? topCategories.filter(c => c.id === donutFilter.id)
                  : topCategories.slice(0, 4);

                if (topCategories.length === 0) {
                  return (
                    <div className="text-center py-6 text-on-surface-variant/40 text-xs">
                      Belum ada data sirkulasi pengeluaran bulan ini.
                    </div>
                  );
                }

                return expenseFiltered.map(cat => {
                  const actualCat = categories.find(c => c.id === cat.id);
                  const colorHex = actualCat ? getCategoryColorHex(actualCat.color) : '#64748B';
                  return (
                    <button
                      key={cat.id}
                      onClick={() => onOpenHistory({ category: cat.id })}
                      className="glass-card rounded-lg p-3.5 flex items-center gap-4 group hover:bg-white/5 transition-all text-left w-full border border-white/5"
                      title={`Lihat semua mutasi ${cat.name}`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                        <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: colorHex }} />
                      </div>

                      <div className="flex-grow flex flex-col min-w-0">
                        <span className="font-body-lg text-white font-medium truncate">{cat.name}</span>
                        <span className="font-body-md text-xs text-on-surface-variant">{cat.count} Transaksi</span>
                      </div>

                      <div className="text-right shrink-0 px-2">
                        <span className="font-mono-data text-[#FF4D4D] font-bold block">
                          - {formatRupiah(cat.spent)}
                        </span>
                        <span className="text-[10px] uppercase font-label-caps text-on-surface-variant/60 tracking-wider block mt-0.5">
                          {cat.percent}% total
                        </span>
                      </div>

                      <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  );
                });
              })()}

              {topCategories.length > 0 && !donutFilter && (
                <button onClick={() => onOpenHistory()} className="text-xs text-primary hover:underline font-label-caps text-center py-1" >
                  Lihat Semua Riwayat Mutasi →
                </button>
              )}
            </div>
        </section>

        {/* AGREGASI PEMASUKAN TERBESAR */}
        <section className="flex flex-col gap-2.5 w-full min-w-0">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h2 className="font-headline-sm text-base text-white">Pemasukan Terbesar</h2>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Urutan Terbesar</span>
            </div>

            <div className="flex flex-col gap-3">
              {(() => {
                const incomeFiltered = donutFilter?.type === 'incoming'
                  ? topIncomeCategories.filter(c => c.id === donutFilter.id)
                  : topIncomeCategories.slice(0, 4);

                if (topIncomeCategories.length === 0) {
                  return (
                    <div className="text-center py-6 text-on-surface-variant/40 text-xs">
                      Belum ada data sirkulasi pemasukan bulan ini.
                    </div>
                  );
                }

                return incomeFiltered.map(cat => {
                  const actualCat = categories.find(c => c.id === cat.id);
                  const colorHex = actualCat ? getCategoryColorHex(actualCat.color) : '#64748B';
                  return (
                    <button
                      key={cat.id}
                      onClick={() => onOpenHistory({ category: cat.id })}
                      className="glass-card rounded-lg p-3.5 flex items-center gap-4 group hover:bg-white/5 transition-all text-left w-full border border-white/5"
                      title={`Lihat semua mutasi ${cat.name}`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                        <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: colorHex }} />
                      </div>

                      <div className="flex-grow flex flex-col min-w-0">
                        <span className="font-body-lg text-white font-medium truncate">{cat.name}</span>
                        <span className="font-body-md text-xs text-on-surface-variant">{cat.count} Transaksi</span>
                      </div>

                      <div className="text-right shrink-0 px-2">
                        <span className="font-mono-data text-primary font-bold block">
                          + {formatRupiah(cat.spent)}
                        </span>
                        <span className="text-[10px] uppercase font-label-caps text-on-surface-variant/60 tracking-wider block mt-0.5">
                          {cat.percent}% total
                        </span>
                      </div>

                      <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  );
                });
              })()}

              {topIncomeCategories.length > 0 && !donutFilter && (
                <button onClick={() => onOpenHistory()} className="text-xs text-primary hover:underline font-label-caps text-center py-1" >
                  Lihat Semua Riwayat Mutasi →
                </button>
              )}
            </div>
        </section>

      </div>
    </div>
  );
}