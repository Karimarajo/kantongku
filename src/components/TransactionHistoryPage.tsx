import React, { useState, useMemo } from 'react';
import { Transaction, Pocket, Account, Category, WalletTransferLog } from '../types';
import { formatRupiah, formatDate, getCategoryColorHex, getWeeklyExpenseTrend } from '../utils';
import { buildExportRows, exportTransactionsToCsv, exportTransactionsToPdf } from '../lib/exportTransactions';
import CategoryIcon from './CategoryIcon';
import CategoryDonutChart, { CategoryDonutFilter } from './CategoryDonutChart';
import WeeklyTrendChart from './WeeklyTrendChart';
import FinancialHealthCard from './FinancialHealthCard';
import {
  Search, SlidersHorizontal, ChevronDown, Calendar, Tag, Wallet,
  ArrowDownLeft, ArrowUpRight, Receipt, Edit3, Trash2, RotateCcw,
  ChevronLeft, ArrowLeftRight, Download, FileSpreadsheet, FileText
} from 'lucide-react';

interface TransactionHistoryPageProps {
  transactions: Transaction[];
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  walletTransferLogs?: WalletTransferLog[];
  initialFilter?: { category?: string };
  currentUserEmail?: string;
  // Task (revisi export PDF): "Generated ... oleh siapa (nama dan email)".
  currentUserName?: string;
  onEditTransactionSelect: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBack: () => void;
  // Task: kartu grafik yang sebelumnya ada di menu Analisis (dihapus)
  // sekarang tampil di sini — "Lihat Keseluruhan" membuka Detail Pengeluaran
  // Bulanan, sama seperti dulu.
  onOpenMonthlyDetail: () => void;
}

export default function TransactionHistoryPage({
  transactions,
  pockets,
  accounts,
  categories,
  walletTransferLogs = [],
  initialFilter,
  currentUserEmail = '',
  currentUserName = '',
  onEditTransactionSelect,
  onDeleteTransaction,
  onBack,
  onOpenMonthlyDetail
}: TransactionHistoryPageProps) {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialFilter?.category ? [initialFilter.category] : []);
  const [selectedPockets, setSelectedPockets] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [showFilters, setShowFilters] = useState(!!initialFilter?.category);
  // Separate from `selectedCategories` (the multi-select chips below) on
  // purpose — Task 7's donut chart is single-select-with-toggle-off, a
  // different interaction, and ANDing it in as one more independent
  // condition means neither filter has to know about the other to combine
  // correctly.
  const [donutFilter, setDonutFilter] = useState<CategoryDonutFilter | null>(null);
  const [showExportChoice, setShowExportChoice] = useState(false);

  const getCategoryHexColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? getCategoryColorHex(cat.color) : '#64748B';
  };

  // Everything EXCEPT the donut filter itself — this is what feeds the donut
  // chart's own breakdown, so selecting a slice can't circularly shrink the
  // chart down to 100% of itself.
  const preDonutFilteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.notes?.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false;
      if (selectedPockets.length > 0 && !selectedPockets.includes(t.pocketId)) return false;
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(t.accountId)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, search, dateFrom, dateTo, selectedCategories, selectedPockets, selectedAccounts, typeFilter]);

  // The list/totals actually shown — same as above, plus the donut filter as
  // one more AND condition.
  const filteredTransactions = useMemo(() => {
    return preDonutFilteredTransactions
      .filter(t => !donutFilter || t.category === donutFilter.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [preDonutFilteredTransactions, donutFilter]);

  // Tren mingguan bulan berjalan — SELALU seluruh transaksi bulan ini
  // (bukan hasil filter di atas), sama seperti perilaku menu Analisis lama:
  // ini ringkasan tetap "bulan ini", bukan mengikuti pencarian/tanggal yang
  // sedang aktif.
  const weeklyTrendData = useMemo(() => {
    const now = new Date();
    return getWeeklyExpenseTrend(transactions, now.getFullYear(), now.getMonth());
  }, [transactions]);

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Wallet';

  // Deliberately NOT part of `filteredTransactions` / the Masuk-Keluar-Netto
  // totals below — a wallet transfer is an internal movement, not income or
  // expense, and must stay excluded from those reports.
  const sortedTransferLogs = useMemo(() => {
    return [...walletTransferLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [walletTransferLogs]);

  const totalIncoming = filteredTransactions.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
  const totalOutgoing = filteredTransactions.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);
  const netCashFlow = totalIncoming - totalOutgoing;

  const hasActiveFilters = !!(search || dateFrom || dateTo || selectedCategories.length > 0 || selectedPockets.length > 0 || selectedAccounts.length > 0 || typeFilter !== 'all' || donutFilter);

  const toggleCategory = (id: string) => setSelectedCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const togglePocket = (id: string) => setSelectedPockets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAccount = (id: string) => setSelectedAccounts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const resetFilters = () => {
    setSearch(''); setDateFrom(''); setDateTo(''); setSelectedCategories([]); setSelectedPockets([]); setSelectedAccounts([]); setTypeFilter('all'); setDonutFilter(null);
  };

  // "Judul tanggal kemudian tabel" — reflects the currently-applied date
  // filter (or "Semua Data" when none), exactly the data actually shown in
  // filteredTransactions below.
  const exportTitle = useMemo(() => {
    const rangeLabel = dateFrom || dateTo
      ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '...'} – ${dateTo ? new Date(dateTo).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '...'}`
      : 'Semua Data';
    return `Riwayat Transaksi — ${rangeLabel}`;
  }, [dateFrom, dateTo]);

  const handleExport = (format: 'csv' | 'pdf') => {
    setShowExportChoice(false);
    const rows = buildExportRows(filteredTransactions, pockets, accounts, categories, currentUserEmail);
    if (format === 'csv') {
      exportTransactionsToCsv(rows, exportTitle);
    } else {
      exportTransactionsToPdf(rows, exportTitle, {
        name: currentUserName || 'Pengguna KantongKu',
        email: currentUserEmail || '-',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-overlay/5 pb-4">
        <button onClick={onBack} className="p-2 bg-overlay/5 rounded-lg"><ChevronLeft className="w-5 h-5"/></button>
        <h1 className="text-xl font-bold">Riwayat Transaksi</h1>
      </div>

      {/* Grafik Tren Pengeluaran Mingguan — dipindah dari menu Analisis
          (dihapus, lihat App.tsx) ke sini. */}
      <WeeklyTrendChart weeklyTrendData={weeklyTrendData} onOpenMonthlyDetail={onOpenMonthlyDetail} />

      {/* Donut chart pengeluaran/pemasukan + klik-untuk-filter (Task 7) —
          dihitung dari transaksi yang sudah lolos filter lain (search/
          tanggal/tipe/kantong/wallet/kategori chip), TIDAK termasuk filter
          donut itu sendiri supaya tidak melingkar. */}
      <CategoryDonutChart
        transactions={preDonutFilteredTransactions}
        categories={categories}
        value={donutFilter}
        onChange={setDonutFilter}
      />

      {/* Filter UI */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input type="text" placeholder="Cari deskripsi..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-11 bg-overlay/5 border border-overlay/10 rounded-xl px-4 text-sm focus:outline-none" />
          {hasActiveFilters && (
            <button onClick={resetFilters} className="absolute right-3 top-3.5 text-rose-400 text-xs flex items-center gap-1"><RotateCcw className="w-3 h-3"/> Reset</button>
          )}
        </div>
        
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between px-4 h-11 bg-overlay/5 rounded-xl text-xs border border-overlay/5">
          <span className="flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5 text-primary"/> Opsi Penyaringan Tingkat Lanjut</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
        </button>

        {/* Export — satu tombol, membuka pilihan CSV/PDF. Selalu mengekspor
            filteredTransactions APA ADANYA (hasil filter yang sedang aktif
            di atas), bukan query terpisah. */}
        <div className="relative">
          <button
            onClick={() => setShowExportChoice(v => !v)}
            disabled={filteredTransactions.length === 0}
            className="w-full flex items-center justify-between px-4 h-11 bg-overlay/5 rounded-xl text-xs border border-overlay/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2"><Download className="w-3.5 h-3.5 text-primary"/> Export ({filteredTransactions.length} transaksi)</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showExportChoice ? 'rotate-180' : ''}`}/>
          </button>
          {showExportChoice && (
            <div className="absolute z-10 top-[calc(100%+4px)] left-0 right-0 bg-surface border border-outline rounded-xl overflow-hidden shadow-xl animate-fade-in">
              <button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-4 h-11 text-xs text-on-surface hover:bg-overlay/5 transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
              </button>
              <button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-4 h-11 text-xs text-on-surface hover:bg-overlay/5 transition-colors border-t border-overlay/5">
                <FileText className="w-4 h-4 text-rose-400" /> Export PDF
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <div className="bg-overlay/5 p-4 rounded-xl flex flex-col gap-4 border border-overlay/5 animate-fade-in">
            <div className="flex gap-2">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full h-9 bg-body-bg/40 rounded px-2 text-xs text-on-surface border border-overlay/10" />
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full h-9 bg-body-bg/40 rounded px-2 text-xs text-on-surface border border-overlay/10" />
            </div>
            
            <div className="flex gap-2 items-center my-1">
              {(['all', 'incoming', 'outgoing'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`h-8 px-3 rounded-lg text-xs border transition-all ${typeFilter === t ? 'bg-primary text-on-primary font-bold border-primary' : 'bg-overlay/5 border-overlay/10 text-on-surface/70'}`}>
                  {t === 'all' ? 'Semua Kas' : t === 'incoming' ? 'Masuk' : 'Keluar'}
                </button>
              ))}
            </div>

            <div>
              <p className="text-[10px] text-on-surface/50 uppercase tracking-wider mb-2">Pilih Kategori</p>
              <div className="flex flex-wrap gap-1">
                {categories.map(c => (
                  <button key={c.id} type="button" onClick={()=>toggleCategory(c.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedCategories.includes(c.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-overlay/5 border-overlay/10 text-on-surface/70'}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-on-surface/50 uppercase tracking-wider mb-2">Pilih Kantong</p>
              <div className="flex flex-wrap gap-1">
                {pockets.map(p => (
                  <button key={p.id} type="button" onClick={()=>togglePocket(p.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedPockets.includes(p.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-overlay/5 border-overlay/10 text-on-surface/70'}`}>{p.name}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-on-surface/50 uppercase tracking-wider mb-2">Pilih Wallet / Rekening</p>
              <div className="flex flex-wrap gap-1">
                {accounts.map(a => (
                  <button key={a.id} type="button" onClick={()=>toggleAccount(a.id)} className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${selectedAccounts.includes(a.id) ? 'bg-primary border-primary text-black font-bold' : 'bg-overlay/5 border-overlay/10 text-on-surface/70'}`}>{a.name}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Summary Cards Panel */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {/* Card 1: Total Masuk */}
        <div className="glass-card p-3 rounded-xl border border-overlay/5 bg-emerald-500/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-emerald-400/70 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Masuk
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono-data truncate">
            {formatRupiah(totalIncoming, false)}
          </span>
        </div>

        {/* Card 2: Total Keluar */}
        <div className="glass-card p-3 rounded-xl border border-overlay/5 bg-rose-500/5 flex flex-col gap-0.5">
          <span className="text-[9px] font-label-caps text-rose-400/70 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" /> Keluar
          </span>
          <span className="text-xs font-bold text-rose-400 font-mono-data truncate">
            {formatRupiah(totalOutgoing, false)}
          </span>
        </div>

        {/* Card 3: Arus Kas Bersih (Total Transaksi) */}
        <div className={`glass-card p-3 rounded-xl border border-overlay/5 flex flex-col gap-0.5 ${netCashFlow >= 0 ? 'bg-primary/5' : 'bg-amber-500/5'}`}>
          <span className={`text-[9px] font-label-caps uppercase tracking-wider flex items-center gap-1 truncate ${netCashFlow >= 0 ? 'text-primary/70' : 'text-amber-400/70'}`}>
            <Receipt className="w-3.5 h-3.5 shrink-0" /> Netto
          </span>
          <span className={`text-xs font-bold font-mono-data truncate ${netCashFlow >= 0 ? 'text-primary' : 'text-amber-400'}`}>
            {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow, false)}
          </span>
        </div>
      </div>

      {/* Analisis Kesehatan Keuangan AI (cicilan-ai-notifikasi Task 4, revisi:
          dipindah dari halaman Statistik ke sini; revisi lanjutan: tombol
          "Kirim Analisis Laporan" (export WA) DIHAPUS, hanya satu tombol
          analisis yang dipertahankan — ini, memakai filter tanggal
          (dateFrom/dateTo) yang sama dengan halaman ini). */}
      <FinancialHealthCard startDate={dateFrom || undefined} endDate={dateTo || undefined} />

      {/* Riwayat Transfer Antar Wallet — dipisah dari daftar transaksi agar
          tidak tertukar dengan transaksi biasa (bukan income/expense). */}
      {sortedTransferLogs.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-on-surface">Transfer Antar Wallet</h2>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-label-caps uppercase tracking-wider">
              Bukan Transaksi
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {sortedTransferLogs.map(log => (
              <div key={log.id} className="flex items-center p-3 gap-3 rounded-xl border border-indigo-500/10 bg-indigo-500/5 glass-card">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-indigo-500/15 border border-indigo-500/30">
                  <ArrowLeftRight className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {getAccountName(log.fromAccountId)} → {getAccountName(log.toAccountId)}
                  </p>
                  <p className="text-[10px] text-on-surface/40 font-mono-data mt-0.5 truncate">
                    {formatDate(log.date)}{log.note ? ` • ${log.note}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold font-mono-data text-indigo-300 shrink-0">
                  {formatRupiah(log.amount, false)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List Rendering Transaksi */}
      <div className="flex flex-col gap-2 mt-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 text-on-surface/30 text-xs">Tidak ada data mutasi yang cocok dengan filter.</div>
        ) : (
          filteredTransactions.map(t => {
            const isExpense = t.type === 'outgoing';
            const cat = categories.find(c => c.id === t.category);
            const colorHex = getCategoryHexColor(t.category);
            return (
              <div key={t.id} className="flex items-center p-3 gap-3 hover:bg-overlay/5 rounded-xl border border-overlay/5 glass-card transition-all">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs shrink-0" style={{ backgroundColor: colorHex + '15', border: `1px solid ${colorHex}30` }}>
                  <CategoryIcon name={cat?.icon || 'receipt'} className="w-4 h-4" style={{ color: colorHex }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{t.title}</p>
                  <p className="text-[10px] text-on-surface/40 font-mono-data mt-0.5">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold font-mono-data ${isExpense ? 'text-rose-400' : 'text-primary'}`}>
                    {isExpense ? '-' : '+'}{formatRupiah(t.amount, false)}
                  </span>
                  <div className="flex items-center gap-1 border-l border-overlay/10 pl-2">
                    <button 
                      onClick={() => onEditTransactionSelect(t)} 
                      className="p-1.5 rounded-lg bg-overlay/5 hover:bg-overlay/10 text-on-surface-variant hover:text-primary transition-all active:scale-95"
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
                      className="p-1.5 rounded-lg bg-overlay/5 hover:bg-rose-500/20 text-on-surface-variant hover:text-rose-400 transition-all active:scale-95"
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