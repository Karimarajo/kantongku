import React, { useMemo, useState } from 'react';
import { Transaction, Category } from '../types';
import { formatRupiah, formatRupiahCompact, formatDate, getCategoryColorHex } from '../utils';
import { t as tr, getActiveLanguage } from '../i18n';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

interface CalendarViewProps {
  transactions: Transaction[];
  categories: Category[];
  onEditTransactionSelect: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

// YYYY-MM-DD di zona waktu LOKAL perangkat (bukan toISOString, yang selalu
// UTC dan bisa menggeser tanggal transaksi malam hari ke hari berikutnya/
// sebelumnya) — sama pola dengan filter "bulan ini" di HomeDashboard.tsx.
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DayEntry {
  income: number;
  expense: number;
  txs: Transaction[];
}

export default function CalendarView({ transactions, categories, onEditTransactionSelect, onDeleteTransaction }: CalendarViewProps) {
  // `cursor` = tanggal 1 dari bulan yang sedang ditampilkan di grid.
  const [cursor, setCursor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDate, setSelectedDate] = useState<string>(() => localDateKey(new Date()));

  const getCategoryHexColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? getCategoryColorHex(cat.color) : '#64748B';
  };

  // Peta agregat per tanggal — dihitung sekali dari SELURUH transaksi
  // (bukan cuma bulan berjalan) supaya pindah bulan tidak perlu hitung ulang.
  const dayMap = useMemo(() => {
    const map = new Map<string, DayEntry>();
    for (const t of transactions) {
      const key = localDateKey(new Date(t.date));
      if (!map.has(key)) map.set(key, { income: 0, expense: 0, txs: [] });
      const entry = map.get(key)!;
      if (t.type === 'incoming') entry.income += t.amount;
      else entry.expense += t.amount;
      entry.txs.push(t);
    }
    return map;
  }, [transactions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-based
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = Minggu
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey(new Date());
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const cells: ({ day: number; key: string } | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: `${monthPrefix}-${String(day).padStart(2, '0')}` });
  }

  const monthLabel = cursor.toLocaleDateString(getActiveLanguage() === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' });
  const weekdayLabels = getActiveLanguage() === 'en'
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu Senin Selasa Rabu Kamis Jumat Sabtu

  const goPrevMonth = () => setCursor(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  const goNextMonth = () => setCursor(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  const goToday = () => {
    const now = new Date();
    const d = new Date(now); d.setDate(1);
    setCursor(d);
    setSelectedDate(localDateKey(now));
  };

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    dayMap.forEach((v, key) => {
      if (key.startsWith(monthPrefix)) { income += v.income; expense += v.expense; }
    });
    return { income, expense };
  }, [dayMap, monthPrefix]);

  const selectedEntry = dayMap.get(selectedDate);
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const sortedSelectedTxs = useMemo(
    () => (selectedEntry?.txs ?? []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [selectedEntry]
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-headline-md text-2xl text-on-surface font-bold leading-tight">{tr('Kalender')}</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">{tr('Lihat pemasukan & pengeluaran per tanggal.')}</p>
      </div>

      {/* Ringkasan bulan berjalan — gaya sama dengan Card 1/2 di Riwayat
          Transaksi (icon + angka polos, warna yang menandai arahnya). */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card rounded-2xl p-3 border border-overlay/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-on-surface-variant/60 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {tr('Masuk')}
          </span>
          <span className="text-sm font-bold font-mono-data text-blue-400 truncate">{formatRupiah(monthTotals.income, false)}</span>
        </div>
        <div className="glass-card rounded-2xl p-3 border border-overlay/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-on-surface-variant/60 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" /> {tr('Keluar')}
          </span>
          <span className="text-sm font-bold font-mono-data text-rose-400 truncate">{formatRupiah(monthTotals.expense, false)}</span>
        </div>
      </div>

      {/* Grid kalender — tiap tanggal menampilkan angka masuk (biru) &
          keluar (merah) ringkas di bawah nomor tanggalnya (kalau ada). Tap
          tanggal untuk lihat rincian transaksinya di bawah grid. */}
      <section className="glass-card rounded-3xl p-4 flex flex-col gap-3 border border-overlay/5">
        <div className="flex items-center justify-between">
          <button onClick={goPrevMonth} title={tr('Bulan sebelumnya')} className="w-8 h-8 rounded-full bg-overlay/5 flex items-center justify-center hover:bg-overlay/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} title={tr('Kembali ke hari ini')} className="font-headline-sm text-sm text-on-surface font-bold capitalize hover:text-primary transition-colors">
            {monthLabel}
          </button>
          <button onClick={goNextMonth} title={tr('Bulan berikutnya')} className="w-8 h-8 rounded-full bg-overlay/5 flex items-center justify-center hover:bg-overlay/10 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((w, i) => (
            <span key={i} className="text-[10px] font-label-caps text-on-surface-variant/50 uppercase text-center py-1">{w}</span>
          ))}
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} />;
            const entry = dayMap.get(cell.key);
            const isToday = cell.key === todayKey;
            const isSelected = cell.key === selectedDate;
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDate(cell.key)}
                className={`aspect-square min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-0.5 border transition-all ${
                  isSelected ? 'bg-primary/15 border-primary/40' : isToday ? 'bg-overlay/10 border-overlay/20' : 'border-transparent hover:bg-overlay/5'
                }`}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-on-surface'}`}>{cell.day}</span>
                {entry && entry.income > 0 && (
                  <span className="text-[8px] leading-none font-mono-data text-blue-400 truncate max-w-full">+{formatRupiahCompact(entry.income)}</span>
                )}
                {entry && entry.expense > 0 && (
                  <span className="text-[8px] leading-none font-mono-data text-rose-400 truncate max-w-full">-{formatRupiahCompact(entry.expense)}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Drill-down: daftar transaksi tanggal yang dipilih. */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-overlay/5 pb-2 gap-2">
          <h3 className="font-headline-sm text-base text-on-surface capitalize truncate">
            {selectedDateObj.toLocaleDateString(getActiveLanguage() === 'en' ? 'en-US' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {selectedEntry && (selectedEntry.income > 0 || selectedEntry.expense > 0) && (
            <span className="text-xs font-mono-data shrink-0">
              <span className="text-blue-400">+{formatRupiah(selectedEntry.income, false)}</span>
              {' / '}
              <span className="text-rose-400">-{formatRupiah(selectedEntry.expense, false)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {sortedSelectedTxs.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant/40 flex flex-col items-center gap-2">
              <CalendarDays className="w-8 h-8 text-on-surface-variant/30" />
              <p className="text-xs">{tr('Tidak ada transaksi di tanggal ini')}</p>
            </div>
          ) : (
            sortedSelectedTxs.map(t => {
              const isExpense = t.type === 'outgoing';
              const colorHex = getCategoryHexColor(t.category);
              return (
                <div
                  key={t.id}
                  onClick={() => onEditTransactionSelect(t)}
                  className="glass-card rounded-2xl p-3 flex items-center gap-3 border border-overlay/5 hover:bg-overlay/5 transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                    <CategoryIcon name={categories.find(c => c.id === t.category)?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{t.title}</p>
                    <p className="text-[10px] text-on-surface-variant/50 font-mono-data">{formatDate(t.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold font-mono-data ${isExpense ? 'text-rose-400' : 'text-blue-400'}`}>
                      {isExpense ? '-' : '+'}{formatRupiah(t.amount, false)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`${tr('Apakah Anda yakin ingin menghapus transaksi')} "${t.title}"?`)) onDeleteTransaction(t.id);
                      }}
                      className="p-1 text-on-surface-variant/50 hover:text-danger transition-all"
                      title={tr('Hapus transaksi')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
