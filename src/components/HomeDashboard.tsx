import React, { useState } from 'react';
import { Pocket, Transaction, Notification, UserProfile, Category, Account, Budget } from '../types';
import BrandLogo from './BrandLogo';
import { formatRupiah, formatDate, getCategoryColorHex } from '../utils';
import CategoryIcon from './CategoryIcon';
import PushNotificationToggle from './PushNotificationToggle';
import {
  RefreshCw,
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
  Plus,
  Send,
  Receipt,
  AlertTriangle,
  AlarmClock,
  Wallet,
  Sliders,
  Sparkles,
  Heart,
  PiggyBank,
  CreditCard,
  Coins,
  ShoppingBag,
  Home as HomeIcon,
  Car,
  Plane,
  Gamepad2,
  GraduationCap,
  Gift,
  X,
  TrendingDown,
  TrendingUp,
  Trash2,
  Coffee,
  Dumbbell,
  Briefcase,
  Utensils,
  Users,
  ChevronRight,
  Target
} from 'lucide-react';

interface HomeDashboardProps {
  pockets: Pocket[];
  accounts: Account[];
  transactions: Transaction[];
  notifications: Notification[];
  userProfile: UserProfile;
  categories: Category[];
  budgets: Budget[];
  onOpenAddModal: () => void;
  onDeleteTransaction: (id: string) => void;
  onTransferBetweenWallets: (fromAccountId: string, toAccountId: string, amount: number, note?: string) => void;
  onTopUpWallet: (accountId: string, amount: number, note?: string) => void;
  onChangeTab: (tab: string) => void;
  onOpenPocketManager: () => void;
  onOpenBudgetModal: () => void;
  onOpenReminderModal: () => void;
  onEditTransactionSelect: (transaction: Transaction) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenHistory: () => void;
  onOpenMonthlyDetail: () => void;
}

export default function HomeDashboard({
  pockets,
  accounts,
  transactions,
  notifications,
  userProfile,
  categories,
  budgets,
  onOpenAddModal,
  onDeleteTransaction,
  onTransferBetweenWallets,
  onTopUpWallet,
  onChangeTab,
  onOpenPocketManager,
  onOpenBudgetModal,
  onOpenReminderModal,
  onEditTransactionSelect,
  onMarkAllNotificationsRead,
  onOpenHistory,
  onOpenMonthlyDetail
}: HomeDashboardProps) {
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFromAcc, setTransferFromAcc] = useState<string>('');
  const [transferToAcc, setTransferToAcc] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferAmountDisplay, setTransferAmountDisplay] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAccountId, setTopUpAccountId] = useState<string>('');
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [topUpAmountDisplay, setTopUpAmountDisplay] = useState<string>('');
  const [topUpNote, setTopUpNote] = useState<string>('');

  // Keep the transfer wallet selections valid as `accounts` changes — the
  // destination always excludes whichever wallet is currently the source.
  React.useEffect(() => {
    if (accounts.length === 0) return;
    if (!transferFromAcc || !accounts.some(a => a.id === transferFromAcc)) {
      setTransferFromAcc(accounts[0].id);
      return;
    }
    if (!transferToAcc || !accounts.some(a => a.id === transferToAcc) || transferToAcc === transferFromAcc) {
      const alt = accounts.find(a => a.id !== transferFromAcc);
      setTransferToAcc(alt ? alt.id : accounts[0].id);
    }
  }, [accounts, transferFromAcc, transferToAcc]);

  // Keep the top up wallet selection valid as `accounts` changes.
  React.useEffect(() => {
    if (accounts.length > 0 && (!topUpAccountId || !accounts.some(a => a.id === topUpAccountId))) {
      setTopUpAccountId(accounts[0].id);
    }
  }, [accounts, topUpAccountId]);

  // Calculate dynamic totals
  const totalBalance = pockets.reduce((sum, p) => sum + p.balance, 0);

  // Total Pengeluaran Bulan Ini (Task 6) — sum of every 'outgoing'
  // transaction in the current calendar month/year, the entry point into
  // MonthlyExpenseView.tsx.
  const monthlyExpenseTotal = (() => {
    const now = new Date();
    return transactions
      .filter(t => {
        if (t.type !== 'outgoing') return false;
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  })();

  // Calculate trend percentage over the last 30 days
  const getTrendPercentage = () => {
    if (transactions.length === 0) return 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentTrans = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    
    const recentChange = recentTrans.reduce((sum, t) => {
      const delta = t.type === 'incoming' ? t.amount : -t.amount;
      return sum + delta;
    }, 0);

    const balanceBefore30Days = totalBalance - recentChange;
    if (balanceBefore30Days <= 0) {
      return balanceBefore30Days === 0 && totalBalance > 0 ? 100 : 0;
    }

    return Number(((recentChange / balanceBefore30Days) * 100).toFixed(1));
  };

  const trendPercent = getTrendPercentage();
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    if (!cat) return <Receipt className="w-5 h-5 text-zinc-400" />;
    const colorHex = getCategoryColorHex(cat.color);
    return <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: colorHex }} />;
  };

  const getPocketIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'group': return Users;
      case 'storefront': return Store;
      case 'coffee': return Coffee;
      case 'heart': return Heart;
      case 'sparkles': return Sparkles;
      case 'piggy': return PiggyBank;
      case 'creditcard': return CreditCard;
      case 'coins': return Coins;
      case 'shopping': return ShoppingBag;
      case 'home': return HomeIcon;
      case 'car': return Car;
      case 'plane': return Plane;
      case 'game': return Gamepad2;
      case 'education': return GraduationCap;
      case 'food': return Utensils;
      case 'gift': return Gift;
      case 'briefcase': return Briefcase;
      default: return Wallet;
    }
  };

  const getPocketColorHexAndTextClass = (colorName: string) => {
    switch (colorName) {
      case 'indigo': return { hex: '#3B82F6', textClass: 'text-blue-400' };
      case 'amber': return { hex: '#F59E0B', textClass: 'text-amber-400' };
      case 'rose': return { hex: '#EF4444', textClass: 'text-rose-400' };
      case 'purple': return { hex: '#8B5CF6', textClass: 'text-purple-400' };
      case 'teal': return { hex: '#14B8A6', textClass: 'text-teal-400' };
      case 'orange': return { hex: '#F97316', textClass: 'text-orange-400' };
      case 'cyan': return { hex: '#06B6D4', textClass: 'text-cyan-400' };
      case 'pink': return { hex: '#EC4899', textClass: 'text-pink-400' };
      case 'yellow': return { hex: '#EAB308', textClass: 'text-yellow-400' };
      case 'sky': return { hex: '#0EA5E9', textClass: 'text-sky-400' };
      case 'lime': return { hex: '#84CC16', textClass: 'text-lime-400' };
      default: return { hex: '#10B981', textClass: 'text-emerald-400' };
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromAcc === transferToAcc) {
      alert('Wallet asal dan tujuan harus berbeda');
      return;
    }
    if (transferAmount <= 0) {
      alert('Ketik nominal transfer yang valid');
      return;
    }
    onTransferBetweenWallets(transferFromAcc, transferToAcc, transferAmount, transferNote.trim() || undefined);
    setTransferAmount(0);
    setTransferAmountDisplay('');
    setTransferNote('');
    setTransferModalOpen(false);
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpAccountId) return;
    if (topUpAmount <= 0) {
      alert('Ketik nominal top up yang valid');
      return;
    }
    onTopUpWallet(topUpAccountId, topUpAmount, topUpNote.trim() || undefined);
    setTopUpAmount(0);
    setTopUpAmountDisplay('');
    setTopUpNote('');
    setTopUpModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-5 relative select-none">
      
      {/* HEADER BAR */}
      <header className="flex justify-between items-center w-full bg-transparent z-40 relative pt-1 pb-1 md:justify-end md:pt-0">
        <div className="flex items-center gap-3 md:hidden">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-overlay/10 flex-shrink-0">
            <img 
              alt="User Avatar" 
              className="w-full h-full object-cover" 
              src={userProfile.avatarUrl}
            />
          </div>
          <div>
            <p className="font-label-caps text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
              Welcome back,
            </p>
            <h1 className="font-headline-sm text-on-surface text-base font-semibold leading-tight">
              Halo, {userProfile.name}
            </h1>
          </div>
        </div>

        {/* NOTIFICATION BUTTON */}
        <div className="relative">
          <button
            onClick={() => {
              const newOpen = !isNotifOpen;
              setIsNotifOpen(newOpen);
              if (newOpen) {
                onMarkAllNotificationsRead();
              }
            }}
            className="w-10 h-10 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary hover:bg-overlay/5 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border border-background animate-pulse" />
            )}
          </button>

          {/* NOTIFICATION PANEL DRAWER */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 glass-card rounded-xl p-4 z-50 border border-overlay/10 shadow-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-overlay/5 pb-2">
                <span className="font-label-caps text-xs text-primary uppercase">Notifikasi</span>
                <span className="text-[10px] text-on-surface-variant font-mono-data">{unreadNotifCount} baru</span>
              </div>
              <PushNotificationToggle />
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                {notifications.length === 0 ? (
                  <p className="text-xs text-on-surface-variant/40 py-4 text-center">Tidak ada notifikasi baru</p>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-2.5 rounded-lg text-xs flex flex-col gap-1 ${notif.type === 'warning' ? 'bg-danger/10 border-l-2 border-l-[#EF4444]' : 'bg-primary/5 border-l-2 border-l-primary'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-on-surface flex items-center gap-1">
                          {notif.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/50">{notif.time}</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Dasbor Actions Header Row */}
      <div className="flex justify-end w-full">
        <button
          onClick={onOpenPocketManager}
          className="flex items-center gap-2 px-4 py-2 bg-overlay/5 border border-overlay/10 hover:border-primary/40 hover:bg-overlay/10 text-xs font-bold font-label-caps text-on-surface-variant hover:text-on-surface rounded-xl transition-all active:scale-95"
        >
          <Sliders className="w-3.5 h-3.5 text-primary" />
          Kelola Kantong
        </button>
      </div>

      {/* GRID RESPONSIVE DASHBOARD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: Pockets & Quick Actions */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full min-w-0">

          {/* Hero Section: Total Balance */}
          <section className="glass-card rounded-xl p-card_padding glow-primary relative overflow-hidden flex flex-col gap-2">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <p className="font-label-caps text-on-surface-variant uppercase flex items-center gap-[12px]">
              <Wallet className="w-5 h-5 text-primary" />
              Total Saldo Seluruhnya
            </p>
            <h2 className="font-display-lg text-primary tracking-tight glow-text-primary text-2xl font-bold">
              {formatRupiah(totalBalance)}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {trendPercent > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-mono-data text-xs flex items-center gap-1 border border-primary/20">
                  <TrendingUp className="w-3 h-3" /> +{trendPercent}%
                </span>
              )}
              {trendPercent < 0 && (
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded font-mono-data text-xs flex items-center gap-1 border border-rose-500/20">
                  <TrendingDown className="w-3 h-3" /> {trendPercent}%
                </span>
              )}
              {trendPercent === 0 && (
                <span className="px-2 py-0.5 bg-overlay/5 text-on-surface-variant rounded font-mono-data text-xs flex items-center gap-1 border border-overlay/10">
                  0.0%
                </span>
              )}
              <span className="text-on-surface-variant text-xs">dari bulan lalu</span>
            </div>
          </section>

          {/* Total Pengeluaran Bulan Ini — entry point ke drill-down bulanan (Task 6) */}
          <button
            onClick={onOpenMonthlyDetail}
            className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 text-left hover:bg-overlay/5 transition-all border border-overlay/5 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider">Total Pengeluaran Bulan Ini</p>
                <p className="font-mono-data text-on-surface font-bold text-base truncate">{formatRupiah(monthlyExpenseTotal)}</p>
              </div>
            </div>
            <span className="flex items-center gap-0.5 text-[11px] text-primary font-label-caps shrink-0 group-hover:underline">
              Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          {/* Sub Pockets Carousel */}
          <div className="w-full overflow-x-auto pb-2 pt-1 flex gap-3 no-scrollbar scroll-smooth snap-x">
            {pockets.map(p => {
              const IconComponent = getPocketIconComponent(p.icon);
              const { hex: colorHex, textClass: colorTextClass } = getPocketColorHexAndTextClass(p.color);
              const isSelected = selectedPocketId === p.id;
              
              let activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#10B981]';
              if (p.color === 'indigo') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#3B82F6]';
              else if (p.color === 'amber') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#F59E0B]';
              else if (p.color === 'rose') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#EF4444]';
              else if (p.color === 'purple') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#8B5CF6]';
              else if (p.color === 'teal') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#14B8A6]';
              else if (p.color === 'orange') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#F97316]';
              else if (p.color === 'cyan') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#06B6D4]';
              else if (p.color === 'pink') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#EC4899]';
              else if (p.color === 'yellow') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#EAB308]';
              else if (p.color === 'sky') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#0EA5E9]';
              else if (p.color === 'lime') activeRingClass = 'ring-2 ring-offset-2 ring-offset-[#0B111E] ring-[#84CC16]';

              return (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedPocketId(isSelected ? null : p.id)}
                  className={`glass-card rounded-xl p-3.5 flex flex-col gap-0.5 border-l-2 shrink-0 w-[155px] sm:w-[175px] relative snap-start hover:bg-overlay/5 cursor-pointer transition-all duration-200 select-none ${isSelected ? activeRingClass : 'border-overlay/5'}`}
                  style={{ borderLeftColor: colorHex }}
                >
                  <div className="absolute top-3.5 right-3.5" style={{ color: colorHex + 'd1' }}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider truncate pr-6 ${colorTextClass}`}>
                    {p.name}
                  </p>
                  <p className="text-md font-bold text-on-surface font-mono mt-0.5">{formatRupiah(p.balance)}</p>
                  <span className="text-[9px] text-on-surface-variant/50 italic truncate mt-0.5 block">{p.tag}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Action Matrix Grid - 4 KOLOM */}
          <section className="py-2">
            <div className="grid grid-cols-4 gap-2 w-full">
              <button
                onClick={() => setTopUpModalOpen(true)}
                className="flex flex-col items-center gap-2 group w-full"
              >
                <div className="w-14 h-14 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary group-hover:bg-primary/20 group-active:scale-95 transition-all shadow-[0_0_10px_rgba(78,222,163,0.05)]">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-label-caps text-on-surface-variant text-center text-[10px]">Add Dana</span>
              </button>
              
              <button 
                onClick={() => setTransferModalOpen(true)}
                className="flex flex-col items-center gap-2 group w-full"
              >
                <div className="w-14 h-14 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary group-hover:bg-primary/10 group-active:scale-95 transition-all shadow-[0_0_10px_rgba(78,222,163,0.05)]">
                  <Send className="w-5 h-5" />
                </div>
                <span className="font-label-caps text-on-surface-variant text-center text-[10px]">Transfer</span>
              </button>

              <button 
                onClick={onOpenBudgetModal}
                className="flex flex-col items-center gap-2 group w-full"
              >
                <div className="w-14 h-14 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary group-hover:bg-primary/10 group-active:scale-95 transition-all shadow-[0_0_10px_rgba(78,222,163,0.05)]">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="font-label-caps text-on-surface-variant text-center text-[10px]">Target & Limit</span>
              </button>

              <button 
                onClick={onOpenReminderModal}
                className="flex flex-col items-center gap-2 group w-full"
              >
                <div className="w-14 h-14 rounded-full bg-surface-variant border border-overlay/10 flex items-center justify-center text-primary group-hover:bg-primary/10 group-active:scale-95 transition-all shadow-[0_0_10px_rgba(78,222,163,0.05)]">
                  <AlarmClock className="w-5 h-5" />
                </div>
                <span className="font-label-caps text-on-surface-variant text-center text-[10px]">Pengingat</span>
              </button>
            </div>
          </section>

          {/* Ringkasan Target & Limit aktif — biar user langsung tahu progresnya
              tanpa buka modal Target & Limit. Pakai budget.spent/sisaPercent
              yang sudah di-maintain live di App.tsx setiap transaksi berubah,
              bukan dihitung ulang di sini. */}
          {budgets.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-overlay/5 pb-2">
                <h3 className="font-headline-sm text-lg text-on-surface flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary" /> Target &amp; Limit
                </h3>
                <button
                  onClick={onOpenBudgetModal}
                  className="font-label-caps text-xs text-primary hover:opacity-80 transition-opacity shrink-0"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {budgets.slice(0, 3).map((budget) => {
                  const percentage = budget.limit > 0 ? Math.min(100, Math.max(0, (budget.spent / budget.limit) * 100)) : 0;
                  const isOver = budget.type === 'expense_limit' && budget.spent >= budget.limit;
                  const isDone = budget.type === 'target_funding' && budget.spent >= budget.limit;
                  const barColor = budget.type === 'expense_limit'
                    ? (isOver ? 'bg-rose-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-400')
                    : (isDone ? 'bg-blue-500' : 'bg-sky-400');

                  return (
                    <button
                      key={budget.id}
                      onClick={onOpenBudgetModal}
                      className="glass-card rounded-xl p-3.5 flex flex-col gap-2 border border-overlay/5 hover:bg-overlay/5 transition-all text-left"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface truncate">{budget.title}</span>
                        <span className="text-[10px] font-mono-data text-on-surface-variant shrink-0">
                          {formatRupiah(budget.spent, false)} / {formatRupiah(budget.limit, false)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-overlay/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-[10px] text-on-surface-variant/70">
                        {budget.type === 'expense_limit'
                          ? (isOver ? 'Sudah melebihi limit' : `Sisa ${budget.sisaPercent}% dari limit`)
                          : (isDone ? 'Target tercapai 🎉' : `Terkumpul ${Math.round(percentage)}% dari target`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Recent Transactions */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full min-w-0">
          <section className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-overlay/5 pb-2">
              <div className="flex items-center gap-2 max-w-[70%]">
                <h3 className="font-headline-sm text-lg text-on-surface truncate">
                  {selectedPocketId ? 'Aktivitas Kantong' : 'Aktivitas Terakhir'}
                </h3>
                {selectedPocketId && (
                  <button 
                    onClick={() => setSelectedPocketId(null)}
                    className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10.5px] rounded-full flex items-center gap-1 hover:bg-primary/20 transition-all font-semibold font-sans active:scale-95 shrink-0"
                    title="Hapus filter"
                  >
                    <span className="truncate max-w-[80px]">
                      {pockets.find(p => p.id === selectedPocketId)?.name}
                    </span>
                    <X className="w-3 h-3 text-primary shrink-0" />
                  </button>
                )}
              </div>
              <button 
                onClick={onOpenHistory}
                className="font-label-caps text-xs text-primary hover:opacity-80 transition-opacity shrink-0"
              >
                Lihat Semua
              </button>
            </div>

            <div className="flex flex-col gap-3 select-none max-h-[360px] lg:max-h-[500px] overflow-y-auto no-scrollbar">
              {(() => {
                const filteredTrans = selectedPocketId 
                  ? transactions.filter(t => t.pocketId === selectedPocketId)
                  : transactions;
                const displayedTrans = filteredTrans.slice(0, 5);

                if (filteredTrans.length === 0) {
                  return (
                    <div className="text-center py-12 text-on-surface-variant/40 flex flex-col items-center gap-2">
                      <Receipt className="w-10 h-10 text-on-surface-variant/30" />
                      <p className="text-xs">Tidak ada riwayat transaksi di kantong ini</p>
                    </div>
                  );
                }

                return displayedTrans.map(t => {
                  const sign = t.type === 'incoming' ? '+' : '-';
                  const isExpense = t.type === 'outgoing';
                  const pocket = pockets.find(p => p.id === t.pocketId);
                  const pocketLabel = pocket ? pocket.name : 'Kantong Lainnya';
                  const catColorClass = isExpense ? 'text-danger' : 'text-primary';

                  return (
                    <div 
                      key={t.id}
                      id={`transaksi-${t.id}`}
                      onClick={() => onEditTransactionSelect(t)}
                      className="glass-card rounded-xl p-3 flex justify-between items-center hover:bg-overlay/5 transition-all group relative cursor-pointer border border-overlay/5"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="w-10 h-10 rounded-full bg-overlay/10 flex items-center justify-center text-on-surface-variant group-hover:scale-105 transition-transform shrink-0">
                          {getCategoryIcon(t.category)}
                        </div>
                        <div>
                          <p className="font-body-md text-on-surface font-medium">{t.title}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {pocketLabel} • <span className="font-mono-data text-[10px]">{formatDate(t.date)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-mono-data font-bold ${catColorClass}`}>
                          {sign}{formatRupiah(t.amount, false)}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if ((window as any).hapusDataPermanen) {
                              (window as any).hapusDataPermanen('Daftar_Transaksi', t.id, `transaksi-${t.id}`);
                            } else {
                              if (confirm(`Apakah Anda yakin ingin menghapus transaksi "${t.title}"?`)) {
                                onDeleteTransaction(t.id);
                              }
                            }
                          }}
                          className="p-1 text-on-surface-variant/50 hover:text-danger transition-all"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        </div>

      </div>

      {/* TRANSFER ANTAR WALLET MODAL DIALOG */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTransferModalOpen(false)} />
          <div className="relative glass-card rounded-xl p-card_padding w-full max-w-sm border border-overlay/10 z-10">
            <h3 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Transfer Antar Wallet
            </h3>

            <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
              <div className="flex justify-between items-center gap-2">
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Dari</label>
                  <select
                    value={transferFromAcc}
                    onChange={(e) => setTransferFromAcc(e.target.value)}
                    className="h-10 bg-body-bg rounded-lg text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary px-2"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <span className="text-on-surface-variant/35 mt-4">➔</span>

                <div className="flex flex-col gap-1 w-full">
                  <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Ke</label>
                  <select
                    value={transferToAcc}
                    onChange={(e) => setTransferToAcc(e.target.value)}
                    className="h-10 bg-body-bg rounded-lg text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary px-2"
                  >
                    {accounts.filter(a => a.id !== transferFromAcc).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nominal Transfer</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-primary font-mono-data text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    required
                    value={transferAmountDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTransferAmount(raw ? Number(raw) : 0);
                      setTransferAmountDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                    }}
                    className="h-10 bg-surface rounded-lg w-full text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary pl-9 pr-2 font-mono-data"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Isi ulang GoPay"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="h-10 bg-surface rounded-lg w-full text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary px-3"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="w-full h-10 rounded-lg text-xs font-label-caps bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg text-xs font-label-caps bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(78,222,163,0.2)]"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOP UP WALLET MODAL DIALOG */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setTopUpModalOpen(false)} />
          <div className="relative glass-card rounded-xl p-card_padding w-full max-w-sm border border-overlay/10 z-10">
            <h3 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              Top Up Wallet
            </h3>

            <form onSubmit={handleTopUpSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-label-caps text-on-surface-variant uppercase">Wallet Tujuan</label>
                <select
                  value={topUpAccountId}
                  onChange={(e) => setTopUpAccountId(e.target.value)}
                  className="h-10 bg-body-bg rounded-lg text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary px-2"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nominal Top Up</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-primary font-mono-data text-xs">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    required
                    value={topUpAmountDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setTopUpAmount(raw ? Number(raw) : 0);
                      setTopUpAmountDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                    }}
                    className="h-10 bg-surface rounded-lg w-full text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary pl-9 pr-2 font-mono-data"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label-caps text-on-surface-variant uppercase">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Setor tunai dari ATM"
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  className="h-10 bg-surface rounded-lg w-full text-xs text-on-surface border border-overlay/10 focus:outline-none focus:border-primary px-3"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  className="w-full h-10 rounded-lg text-xs font-label-caps bg-overlay/5 border border-overlay/10 text-on-surface-variant hover:text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg text-xs font-label-caps bg-primary text-on-primary font-bold shadow-[0_2px_10px_rgba(78,222,163,0.2)]"
                >
                  Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}