import React, { useState } from 'react';
import { Debt, DebtPayment } from '../types';
import { formatRupiah, formatDate } from '../utils';
import {
  ChevronLeft, Plus, X, CreditCard, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Trash2, PartyPopper
} from 'lucide-react';

interface DebtManagerViewProps {
  debts: Debt[];
  debtPayments: DebtPayment[];
  onBack: () => void;
  onAddDebt: (input: Omit<Debt, 'id' | 'createdAt' | 'status' | 'reminderId'>) => void;
  onMarkPaid: (debtId: string) => void;
  onDeleteDebt: (debtId: string) => void;
}

export default function DebtManagerView({ debts, debtPayments, onBack, onAddDebt, onMarkPaid, onDeleteDebt }: DebtManagerViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [dueDay, setDueDay] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const resetForm = () => {
    setName('');
    setPrincipalAmount(0);
    setMonthlyInstallment(0);
    setTenorMonths(12);
    setDueDay(5);
    setStartDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Mohon isi nama cicilan/hutang');
    if (principalAmount <= 0) return alert('Total pokok harus lebih besar dari 0');
    if (monthlyInstallment <= 0) return alert('Cicilan per bulan harus lebih besar dari 0');
    if (tenorMonths <= 0) return alert('Tenor harus lebih besar dari 0');
    if (dueDay < 1 || dueDay > 31) return alert('Tanggal jatuh tempo harus antara 1-31');

    onAddDebt({ name: name.trim(), principalAmount, monthlyInstallment, tenorMonths, dueDay, startDate });
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
          <button onClick={() => onDeleteDebt(debt.id)} className="p-1.5 rounded-lg bg-overlay/5 hover:bg-rose-500/10 text-on-surface-variant/50 hover:text-rose-400 transition-colors shrink-0" title="Hapus">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
              className="h-10 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" /> Tandai Sudah Bayar Bulan Ini
            </button>
          )}
          {isPaidOff && (
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-4 h-4" /> Lunas
            </span>
          )}
        </div>

        {payments.length > 0 && (
          <div className="border-t border-overlay/5 pt-2">
            <button onClick={() => setExpandedId(isExpanded ? null : debt.id)} className="flex items-center gap-1.5 text-[11px] text-primary/80 hover:text-primary">
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Riwayat pembayaran ({payments.length})
            </button>
            {isExpanded && (
              <div className="flex flex-col gap-1.5 mt-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[11px] text-on-surface-variant bg-overlay/5 rounded-lg px-3 py-2">
                    <span>{formatDate(p.paidAt)}</span>
                    <span className="font-mono-data text-primary">{formatRupiah(p.paidAmount)}</span>
                  </div>
                ))}
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
        Sekali input, dua manfaat: otomatis diingatkan tiap tanggal jatuh tempo (lewat Pengingat) sekaligus terpantau progresnya di sini.
      </p>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Cicilan/Hutang
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-overlay/10 glass-card">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-label-caps text-primary uppercase">Cicilan/Hutang Baru</h3>
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

          <button type="submit" className="w-full h-12 mt-1 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all">
            <Plus className="w-5 h-5" /> Simpan Cicilan/Hutang
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
