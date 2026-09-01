import React, { useState } from 'react';
import { Debt, DebtPayment, Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah, formatDate } from '../utils';
import {
  ChevronLeft, Plus, X, CreditCard, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Trash2, PartyPopper, Edit3, Save
} from 'lucide-react';

interface DebtManagerViewProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  transactions: Transaction[];
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  onBack: () => void;
  onAddDebt: (input: Omit<Debt, 'id' | 'createdAt' | 'status' | 'reminderId'>) => void;
  onEditDebt: (debtId: string, input: Omit<Debt, 'id' | 'createdAt' | 'status' | 'reminderId'>) => void;
  onMarkPaid: (debtId: string) => void;
  onDeleteDebt: (debtId: string) => void;
  // Task: hapus/edit satu baris riwayat pembayaran — Edit membuka transaksi
  // tertautnya lewat modal edit transaksi yang sama dipakai di seluruh app
  // (App.tsx menjaga paidAmount/paidAt tetap sinkron otomatis), Hapus lewat
  // handleDeleteTransaction (App.tsx) supaya saldo/anggaran ikut ter-rollback.
  onDeleteDebtPayment: (paymentId: string) => void;
  onEditTransactionSelect: (transaction: Transaction) => void;
}

export default function DebtManagerView({
  debts, debtPayments, transactions, pockets, accounts, categories, onBack,
  onAddDebt, onEditDebt, onMarkPaid, onDeleteDebt, onDeleteDebtPayment, onEditTransactionSelect
}: DebtManagerViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [dueDay, setDueDay] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pocketId, setPocketId] = useState<string>(pockets[0]?.id || '');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [category, setCategory] = useState<string>(categories[0]?.id || '');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrincipalAmount(0);
    setMonthlyInstallment(0);
    setTenorMonths(12);
    setDueDay(5);
    setStartDate(new Date().toISOString().slice(0, 10));
    setPocketId(pockets[0]?.id || '');
    setAccountId(accounts[0]?.id || '');
    setCategory(categories[0]?.id || '');
  };

  const handleOpenEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setName(debt.name);
    setPrincipalAmount(debt.principalAmount);
    setMonthlyInstallment(debt.monthlyInstallment);
    setTenorMonths(debt.tenorMonths);
    setDueDay(debt.dueDay);
    setStartDate(debt.startDate);
    setPocketId(debt.pocketId || pockets[0]?.id || '');
    setAccountId(debt.accountId || accounts[0]?.id || '');
    setCategory(debt.category || categories[0]?.id || '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Mohon isi nama cicilan/hutang');
    if (principalAmount <= 0) return alert('Total pokok harus lebih besar dari 0');
    if (monthlyInstallment <= 0) return alert('Cicilan per bulan harus lebih besar dari 0');
    if (tenorMonths <= 0) return alert('Tenor harus lebih besar dari 0');
    if (dueDay < 1 || dueDay > 31) return alert('Tanggal jatuh tempo harus antara 1-31');

    const input = { name: name.trim(), principalAmount, monthlyInstallment, tenorMonths, dueDay, startDate, pocketId, accountId, category };
    if (editingId) {
      onEditDebt(editingId, input);
    } else {
      onAddDebt(input);
    }
    resetForm();
    setShowForm(false);
  };

  const activeDebts = debts.filter(d => d.status === 'active');
  const paidOffDebts = debts.filter(d => d.status === 'paid_off');

  const renderDebtCard = (debt: Debt) => {
    const payments = debtPayments.filter(p => p.debtId === debt.id).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
    const paidCount = payments.length;
    const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
    const remaining = Math.max(0, debt.principalAmount - totalPaid);
    const progressPercent = Math.min(100, Math.round((paidCount / debt.tenorMonths) * 100));
    const isExpanded = expandedId === debt.id;
    const isPaidOff = debt.status === 'paid_off';
    const missingPaymentDetail = !debt.accountId || !debt.category;

    return (
      <div key={debt.id} className={`flex flex-col gap-3 p-4 rounded-xl border glass-card ${isPaidOff ? 'border-primary/20 opacity-70' : 'border-overlay/5'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPaidOff ? 'bg-primary/15 border border-primary/30 text-primary' : 'bg-overlay/5 border border-overlay/10 text-on-surface-variant'}`}>
              {isPaidOff ? <PartyPopper className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{debt.name}</p>
              <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 mt-0.5">
                <CalendarClock className="w-3 h-3" /> Jatuh tempo tiap tanggal {debt.dueDay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleOpenEdit(debt)} className="p-1.5 rounded-lg bg-overlay/5 hover:bg-overlay/10 text-on-surface-variant/50 hover:text-primary transition-colors" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDeleteDebt(debt.id)} className="p-1.5 rounded-lg bg-overlay/5 hover:bg-rose-500/10 text-on-surface-variant/50 hover:text-rose-400 transition-colors" title="Hapus">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="w-full h-2 rounded-full bg-overlay/5 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isPaidOff ? 'bg-primary' : 'bg-primary/70'}`} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant/70">
            <span>{paidCount}/{debt.tenorMonths} bulan terbayar</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-[10px] text-on-surface-variant/60 uppercase font-label-caps">Sisa Utang</p>
            <p className="text-base font-bold text-on-surface font-mono-data">{formatRupiah(remaining)}</p>
          </div>
          {!isPaidOff && (
            <button
              onClick={() => onMarkPaid(debt.id)}
              title={missingPaymentDetail ? 'Lengkapi Wallet & Kategori (Edit) dulu' : undefined}
              className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" /> Sudah Bayar Bulan Ini
            </button>
          )}
          {isPaidOff && (
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-4 h-4" /> Lunas
            </span>
          )}
        </div>

        {missingPaymentDetail && !isPaidOff && (
          <p className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            Wallet &amp; Kategori pembayaran belum diisi — buka Edit untuk melengkapinya sebelum menandai sudah bayar.
          </p>
        )}

        {payments.length > 0 && (
          <div className="border-t border-overlay/5 pt-2">
            <button onClick={() => setExpandedId(isExpanded ? null : debt.id)} className="flex items-center gap-1.5 text-[11px] text-primary/80 hover:text-primary">
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Riwayat pembayaran ({payments.length})
            </button>
            {isExpanded && (
              <div className="flex flex-col gap-1.5 mt-2">
                {payments.map(p => {
                  const linkedTransaction = p.transactionId ? transactions.find(t => t.id === p.transactionId) : undefined;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant bg-overlay/5 rounded-lg px-3 py-2">
                      <span className="shrink-0">{formatDate(p.paidAt)}</span>
                      <span className="font-mono-data text-primary flex-grow text-right">{formatRupiah(p.paidAmount)}</span>
                      <div className="flex items-center gap-1 shrink-0 border-l border-overlay/10 pl-2">
                        {linkedTransaction && (
                          <button
                            onClick={() => onEditTransactionSelect(linkedTransaction)}
                            className="p-1 rounded bg-overlay/5 hover:bg-overlay/10 text-on-surface-variant hover:text-primary transition-colors"
                            title="Edit pembayaran"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Hapus riwayat pembayaran ini? Transaksi terkait di Riwayat Transaksi juga akan terhapus.')) {
                              onDeleteDebtPayment(p.id);
                            }
                          }}
                          className="p-1 rounded bg-overlay/5 hover:bg-rose-500/20 text-on-surface-variant hover:text-rose-400 transition-colors"
                          title="Hapus pembayaran (salah pencet)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      <div className="flex items-center gap-4 border-b border-overlay/5 pb-4">
        <button onClick={onBack} className="p-2 bg-overlay/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Kelola Cicilan/Hutang
        </h1>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed -mt-2">
        Sekali input, dua manfaat: otomatis diingatkan tiap tanggal jatuh tempo (lewat Pengingat) sekaligus terpantau progresnya di sini. Tekan "Sudah Bayar" untuk otomatis mencatat transaksinya.
      </p>

      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Cicilan/Hutang
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-overlay/10 glass-card">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-label-caps text-primary uppercase">{editingId ? 'Edit Cicilan/Hutang' : 'Cicilan/Hutang Baru'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-label-caps text-on-surface-variant uppercase">Nama</label>
            <input type="text" required placeholder="Contoh: Cicilan Motor Honda" value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-on-surface text-sm focus:outline-none focus:border-primary/60" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Total Pokok (Rp)</label>
              <input type="number" required min={1} value={principalAmount || ''} onChange={(e) => setPrincipalAmount(Number(e.target.value))} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-on-surface text-sm focus:outline-none focus:border-primary/60 font-mono-data" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Cicilan/Bulan (Rp)</label>
              <input type="number" required min={1} value={monthlyInstallment || ''} onChange={(e) => setMonthlyInstallment(Number(e.target.value))} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-on-surface text-sm focus:outline-none focus:border-primary/60 font-mono-data" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tenor (bulan)</label>
              <input type="number" required min={1} max={360} value={tenorMonths || ''} onChange={(e) => setTenorMonths(Number(e.target.value))} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-on-surface text-sm focus:outline-none focus:border-primary/60 font-mono-data" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tanggal Jatuh Tempo</label>
              <input type="number" required min={1} max={31} value={dueDay || ''} onChange={(e) => setDueDay(Number(e.target.value))} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-on-surface text-sm focus:outline-none focus:border-primary/60 font-mono-data" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-label-caps text-on-surface-variant uppercase">Tanggal Mulai</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60" />
          </div>

          {/* Task: detail transaksi otomatis untuk "Sudah Bayar" */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-overlay/5">
            <label className="text-xs font-label-caps text-on-surface-variant uppercase mt-2">Dibayar Dari (untuk tombol "Sudah Bayar")</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select value={pocketId} onChange={(e) => setPocketId(e.target.value)} className="h-10 bg-surface-variant/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                {pockets.map(p => <option key={p.id} value={p.id} className="bg-surface text-on-surface">{p.name}</option>)}
              </select>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-10 bg-surface-variant/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                {accounts.map(a => <option key={a.id} value={a.id} className="bg-surface text-on-surface">{a.name}</option>)}
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 bg-surface-variant/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                {categories.map(c => <option key={c.id} value={c.id} className="bg-surface text-on-surface">{c.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full h-12 mt-1 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all">
            {editingId ? <><Save className="w-5 h-5" /> Simpan Perubahan</> : <><Plus className="w-5 h-5" /> Simpan Cicilan/Hutang</>}
          </button>
        </form>
      )}

      <div className="flex flex-col gap-3 mt-1">
        <h3 className="text-xs font-label-caps text-on-surface-variant uppercase">Aktif ({activeDebts.length})</h3>
        {activeDebts.length === 0 ? (
          <div className="text-center py-8 text-on-surface/30 flex flex-col items-center gap-2">
            <CreditCard className="w-9 h-9 text-on-surface/20" />
            <p className="text-xs">Belum ada cicilan/hutang aktif.</p>
          </div>
        ) : (
          activeDebts.map(renderDebtCard)
        )}
      </div>

      {paidOffDebts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-label-caps text-on-surface-variant uppercase">Sudah Lunas ({paidOffDebts.length})</h3>
          {paidOffDebts.map(renderDebtCard)}
        </div>
      )}
    </div>
  );
}
