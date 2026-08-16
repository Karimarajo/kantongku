import React, { useMemo, useState } from 'react';
import { Transaction, Category } from '../types';
import { formatRupiah, formatDate, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import {
  ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, Receipt, Edit3, Trash2
} from 'lucide-react';

interface MonthlyExpenseViewProps {
  transactions: Transaction[];
  categories: Category[];
  onEditTransactionSelect: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBack: () => void;
}

export default function MonthlyExpenseView({
  transactions,
  categories,
  onEditTransactionSelect,
  onDeleteTransaction,
  onBack
}: MonthlyExpenseViewProps) {
  // Tracks only year+month — day/time is irrelevant here, always normalized
  // to the 1st so month math (setMonth ±1) never skips/repeats a month.
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const now = new Date();
  const isCurrentMonth = viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();

  const monthTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth();
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, viewDate]);

  const totalIncoming = monthTransactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
  const totalOutgoing = monthTransactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);

  const goToPrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return; // can't view a month that hasn't happened yet
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCategoryHexColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? getCategoryColorHex(cat.color) : '#64748B';
  };

  const monthLabel = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold">Detail Pengeluaran Bulanan</h1>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goToPrevMonth}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-all active:scale-95"
          title="Bulan sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-headline-sm text-white text-base font-semibold min-w-[160px] text-center capitalize">
          {monthLabel}
        </span>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:text-on-surface-variant"
          title={isCurrentMonth ? 'Belum bisa melihat bulan yang akan datang' : 'Bulan berikutnya'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-emerald-500/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-emerald-400/70 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Pemasukan
          </span>
          <span className="text-sm font-bold text-emerald-400 font-mono-data truncate">{formatRupiah(totalIncoming, false)}</span>
        </div>
        <div className="glass-card p-3 rounded-xl border border-white/5 bg-rose-500/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-rose-400/70 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Pengeluaran
          </span>
          <span className="text-sm font-bold text-rose-400 font-mono-data truncate">{formatRupiah(totalOutgoing, false)}</span>
        </div>
      </div>

      {/* Transaction list for the selected month */}
      <div className="flex flex-col gap-2 mt-2">
        {monthTransactions.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-xs flex flex-col items-center gap-2">
            <Receipt className="w-8 h-8 text-white/20" />
            Tidak ada transaksi di bulan ini.
          </div>
        ) : (
          monthTransactions.map(t => {
            const isExpense = t.type === 'outgoing';
            const cat = categories.find(c => c.id === t.category);
            const colorHex = getCategoryHexColor(t.category);
            return (
              <div key={t.id} className="flex items-center p-3 gap-3 hover:bg-white/5 rounded-xl border border-white/5 glass-card transition-all">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                  <CategoryIcon name={cat?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-white/40 font-mono-data mt-0.5">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold font-mono-data ${isExpense ? 'text-rose-400' : 'text-primary'}`}>
                    {isExpense ? '-' : '+'}{formatRupiah(t.amount, false)}
                  </span>
                  <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                    <button
                      onClick={() => onEditTransactionSelect(t)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-primary transition-all active:scale-95"
                      title="Edit Transaksi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus transaksi "${t.title}"?`)) {
                          onDeleteTransaction(t.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-on-surface-variant hover:text-rose-400 transition-all active:scale-95"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
