import React, { useState, useMemo } from 'react';
import { Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, formatDate, getCategoryColorHex, startOfLocalDay, endOfLocalDay } from '../utils';
import CategoryIcon from './CategoryIcon';
import {
  X, Search, Filter, Calendar, Wallet, Tag, ArrowDownLeft, ArrowUpRight,
  Receipt, Trash2, Edit3, ChevronDown, SlidersHorizontal, RotateCcw
} from 'lucide-react';

interface TransactionHistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  initialFilter?: { category?: string };
  onEditTransactionSelect: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function TransactionHistoryView({
  isOpen,
  onClose,
  transactions,
  pockets,
  accounts,
  categories,
  initialFilter,
  onEditTransactionSelect,
  onDeleteTransaction
}: TransactionHistoryViewProps) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilter?.category ? [initialFilter.category] : []
  );
  const [selectedPockets, setSelectedPockets] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [showFilters, setShowFilters] = useState(!!initialFilter?.category);

  const getCategoryColorClasses = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    const hex = cat ? getCategoryColorHex(cat.color) : '#64748B';
    return hex;
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Keyword search
      if (search) {
        const lower = search.toLowerCase();
        if (!t.title.toLowerCase().includes(lower) && !t.notes?.toLowerCase().includes(lower)) return false;
      }
      // Date from
      if (dateFrom) {
        const fromDate = startOfLocalDay(dateFrom);
        if (new Date(t.date) < fromDate) return false;
      }
      // Date to
      if (dateTo) {
        const toDate = endOfLocalDay(dateTo);
        if (new Date(t.date) > toDate) return false;
      }
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      // Pocket filter
      if (selectedPockets.length > 0 && !selectedPockets.includes(t.pocketId)) return false;
      // Account filter
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.accountId)) return false;
      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, dateFrom, dateTo, selectedCategories, selectedPockets, selectedAccounts, typeFilter]);

  const totalIncoming = filteredTransactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
  const totalOutgoing = filteredTransactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const togglePocket = (id: string) => {
    setSelectedPockets(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };
  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelectedCategories([]);
    setSelectedPockets([]);
    setSelectedAccounts([]);
    setTypeFilter('all');
  };

  const hasActiveFilters = search || dateFrom || dateTo || selectedCategories.length > 0 || selectedPockets.length > 0 || selectedAccounts.length > 0 || typeFilter !== 'all';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass-card rounded-2xl w-full max-w-2xl border border-white/10 z-10 overflow-hidden flex flex-col max-h-[92vh] shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/5 shrink-0 bg-surface-variant/20">
          <div>
            <h2 className="font-headline-md text-lg text-white font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Riwayat Transaksi
            </h2>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {filteredTransactions.length} transaksi ditemukan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Filter Toggle */}
        <div className="px-5 pt-4 pb-2 flex flex-col gap-3 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder="Cari nama transaksi, catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-surface-variant/20 border border-white/10 rounded-xl pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Filter toggle row */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-label-caps border transition-all ${showFilters ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Type filter pills */}
            {(['all', 'incoming', 'outgoing'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`h-8 px-3 rounded-lg text-xs font-label-caps border transition-all ${
                  typeFilter === t
                    ? t === 'incoming' ? 'bg-primary/15 border-primary/30 text-primary'
                      : t === 'outgoing' ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                      : 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'
                }`}
              >
                {t === 'all' ? 'Semua' : t === 'incoming' ? '+ Masuk' : '- Keluar'}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="ml-auto flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-label-caps bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="flex flex-col gap-3 p-3 bg-surface-variant/10 border border-white/5 rounded-xl">
              {/* Date range */}
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 bg-[#0B111E]/60 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 bg-[#0B111E]/60 border border-white/10 rounded-lg text-xs text-white px-2 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Category filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Kategori
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => {
                    const hex = getCategoryColorHex(cat.color);
                    const active = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? '' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                        style={active ? { backgroundColor: hex + '25', borderColor: hex + '60', color: hex } : {}}
                      >
                        <CategoryIcon name={cat.icon} className="w-3 h-3" />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pocket filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Kantong
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {pockets.map(p => {
                    const active = selectedPockets.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePocket(p.id)}
                        className={`h-7 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account filter */}
              {accounts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Wallet/Rekening
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {accounts.map(a => {
                      const active = selectedAccounts.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleAccount(a.id)}
                          className={`h-7 px-2.5 rounded-full text-[10px] font-semibold border transition-all ${active ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-on-surface-variant hover:text-white'}`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary pills */}
          {filteredTransactions.length > 0 && (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/5 border border-primary/15 rounded-lg">
                <ArrowDownLeft className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono-data text-primary font-bold">+{formatRupiah(totalIncoming)}</span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-mono-data text-rose-400 font-bold">-{formatRupiah(totalOutgoing)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-5 flex flex-col gap-2 min-h-0">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Receipt className="w-7 h-7 text-on-surface-variant/30" />
              </div>
              <p className="text-sm text-on-surface-variant/50">Tidak ada transaksi yang cocok</p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset filter</button>
              )}
            </div>
          ) : (
            filteredTransactions.map(t => {
              const isExpense = t.type === 'outgoing';
              const sign = isExpense ? '-' : '+';
              const colorClass = isExpense ? 'text-rose-400' : 'text-primary';
              const pocket = pockets.find(p => p.id === t.pocketId);
              const cat = categories.find(c => c.id === t.category);
              const colorHex = getCategoryColorClasses(t.category);

              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/5 transition-all group cursor-pointer"
                  onClick={() => onEditTransactionSelect(t)}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: colorHex + '20', border: `1px solid ${colorHex}40` }}
                  >
                    {cat ? (
                      <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: colorHex }} />
                    ) : (
                      <Receipt className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{t.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {cat && (
                        <span
                          className="text-[9px] font-label-caps px-1.5 py-0.5 rounded border"
                          style={{ color: colorHex, backgroundColor: colorHex + '15', borderColor: colorHex + '40' }}
                        >
                          {cat.name}
                        </span>
                      )}
                      {pocket && (
                        <span className="text-[9px] text-on-surface-variant/60">
                          {pocket.name}
                        </span>
                      )}
                      <span className="text-[9px] font-mono-data text-on-surface-variant/40">{formatDate(t.date)}</span>
                    </div>
                  </div>

                  {/* Amount + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono-data font-bold text-sm ${colorClass}`}>
                      {sign}{formatRupiah(t.amount, false)}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditTransactionSelect(t); }}
                        className="p-1 rounded text-on-surface-variant/50 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Hapus transaksi "${t.title}"?`)) onDeleteTransaction(t.id);
                        }}
                        className="p-1 rounded text-on-surface-variant/50 hover:text-rose-400 transition-colors"
                        title="Hapus"
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
    </div>
  );
}
