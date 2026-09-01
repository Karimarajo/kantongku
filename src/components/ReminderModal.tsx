import React, { useState } from 'react';
import { Reminder, Debt, Pocket, Account, Category } from '../types';
import { formatRupiah } from '../utils';
import { X, Plus, Trash2, Bell, AlarmClock, CalendarDays, Clock, RefreshCw, Edit3, CheckCircle2, Save, Link2 } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  // Task: cicilan/hutang punya reminder bulanan otomatis (lihat
  // handleAddDebt di App.tsx) — reminder itu dikelola dari menu Cicilan/
  // Hutang sendiri (termasuk "Sudah Bayar"-nya), bukan dari sini, supaya
  // tidak ada dua tombol "Sudah Bayar" berbeda untuk hal yang sama.
  debts: Debt[];
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  onAddReminder: (reminder: Reminder) => void;
  onEditReminder: (reminder: Reminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

export default function ReminderModal({
  isOpen,
  onClose,
  reminders,
  debts,
  pockets,
  accounts,
  categories,
  onAddReminder,
  onEditReminder,
  onToggleReminder,
  onDeleteReminder,
  onMarkPaid
}: ReminderModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  // Menggunakan default string kosong agar HTML5 datetime-local meminta input wajib dari user
  const [targetDateTime, setTargetDateTime] = useState('');
  const [repeatType, setRepeatType] = useState<'once' | 'every_day' | 'every_week' | 'every_month'>('once');

  // Task: detail transaksi otomatis untuk tombol "Sudah Bayar" — opsional,
  // tombolnya sendiri baru muncul di daftar kalau ketiganya terisi.
  const [amount, setAmount] = useState<number>(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [pocketId, setPocketId] = useState<string>(pockets[0]?.id || '');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [category, setCategory] = useState<string>(categories[0]?.id || '');

  if (!isOpen) return null;

  // Sama persis format lastTriggeredDate yang dipakai handleMarkReminderPaid
  // / checkAlarms di App.tsx — dipakai untuk mendeteksi "sudah dibayar hari
  // ini" di bawah.
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setTargetDateTime('');
    setRepeatType('once');
    setAmount(0);
    setAmountDisplay('');
    setPocketId(pockets[0]?.id || '');
    setAccountId(accounts[0]?.id || '');
    setCategory(categories[0]?.id || '');
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    // Rekonstruksi <input type="datetime-local"> dari targetDate (kalau ada)
    // atau tanggal hari ini + jam tersimpan sebagai fallback (reminder lama
    // yang berulang tidak selalu punya targetDate — hanya dipakai buat
    // tampilan awal form, bukan sumber kebenaran repeatType).
    const dateForInput = reminder.targetDate || new Date().toISOString().slice(0, 10);
    setTargetDateTime(`${dateForInput}T${reminder.time}`);
    setRepeatType(reminder.repeatType);
    setAmount(reminder.amount || 0);
    setAmountDisplay(reminder.amount ? new Intl.NumberFormat('id-ID').format(reminder.amount) : '');
    setPocketId(reminder.pocketId || pockets[0]?.id || '');
    setAccountId(reminder.accountId || accounts[0]?.id || '');
    setCategory(reminder.category || categories[0]?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !targetDateTime) return;

    const dateObj = new Date(targetDateTime);

    // 1. Ambil jam dan menit (Format: HH:MM)
    const jam = String(dateObj.getHours()).padStart(2, '0');
    const menit = String(dateObj.getMinutes()).padStart(2, '0');
    const timeFormatted = `${jam}:${menit}`;

    // 2. Ambil tanggal mulai asli (Format: YYYY-MM-DD)
    const dateFormatted = targetDateTime.split('T')[0];

    const detailTransaksi = {
      amount: amount > 0 ? amount : undefined,
      pocketId: amount > 0 ? pocketId : undefined,
      accountId: amount > 0 ? accountId : undefined,
      category: amount > 0 ? category : undefined,
    };

    if (editingId) {
      const existing = reminders.find(r => r.id === editingId);
      if (!existing) return;
      onEditReminder({
        ...existing,
        title,
        time: timeFormatted,
        repeatType,
        dayOfWeek: dateObj.getDay(),
        dayOfMonth: dateObj.getDate(),
        targetDate: dateFormatted,
        ...detailTransaksi,
      });
    } else {
      const newReminder: Reminder = {
        id: `rem-${Date.now()}`,
        title,
        time: timeFormatted,
        repeatType,
        isActive: true,
        createdAt: new Date().toISOString(),
        dayOfWeek: dateObj.getDay(),
        dayOfMonth: dateObj.getDate(),
        targetDate: dateFormatted,
        lastTriggeredDate: "",
        ...detailTransaksi,
      };
      onAddReminder(newReminder);
    }

    resetForm();
  };

  const getRepeatLabel = (type: string) => {
    switch (type) {
      case 'once': return 'Sekali Saja';
      case 'every_day': return 'Setiap Hari';
      case 'every_week': return 'Setiap Minggu';
      case 'every_month': return 'Setiap Bulan';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl w-full max-w-lg border border-overlay/10 relative overflow-hidden flex flex-col my-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-on-surface" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-overlay/5 shrink-0 bg-surface-variant/20">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-primary" />
            <h3 className="font-headline-sm text-lg text-on-surface font-bold">
              Pengingat & Alarm Agenda
            </h3>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-overlay/5 border border-overlay/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-overlay/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">

          {/* Create/Edit Reminder Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-overlay/5 p-4 rounded-xl border border-overlay/5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-label-caps text-primary uppercase font-semibold tracking-wider">
                {editingId ? 'Edit Pengingat' : 'Buat Pengingat Baru'}
              </h4>
              {editingId && (
                <button type="button" onClick={resetForm} className="text-[10px] text-on-surface-variant hover:text-on-surface flex items-center gap-1">
                  <X className="w-3 h-3" /> Batal Edit
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-on-surface-variant/70 font-medium">Judul Rencana / Agenda</label>
              <input
                type="text"
                maxLength={40}
                placeholder="Contoh: Bayar cicilan atau iuran kas..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" /> Atur Tanggal & Jam
                </label>
                <input
                  type="datetime-local"
                  value={targetDateTime}
                  onChange={(e) => setTargetDateTime(e.target.value)}
                  className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-mono-data"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" /> Tipe Pengulangan
                </label>
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as any)}
                  className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="once" className="bg-surface text-on-surface">Sekali Saja</option>
                  <option value="every_day" className="bg-surface text-on-surface">Setiap Hari</option>
                  <option value="every_week" className="bg-surface text-on-surface">Setiap Minggu</option>
                  <option value="every_month" className="bg-surface text-on-surface">Setiap Bulan</option>
                </select>
              </div>
            </div>

            {/* Task: detail transaksi opsional — kalau diisi, tombol "Sudah
                Bayar" muncul di daftar dan otomatis mencatat transaksi ini. */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-overlay/5">
              <label className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Detail Transaksi (opsional — untuk tombol "Sudah Bayar")
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-bold text-primary font-mono-data text-xs">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setAmount(raw ? Number(raw) : 0);
                    setAmountDisplay(raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                  }}
                  className="h-10 w-full bg-body-bg/40 border border-overlay/10 rounded-lg pl-9 pr-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-mono-data"
                />
              </div>

              {amount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                  <select value={pocketId} onChange={(e) => setPocketId(e.target.value)} className="h-9 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                    {pockets.map(p => <option key={p.id} value={p.id} className="bg-surface text-on-surface">{p.name}</option>)}
                  </select>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-9 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                    {accounts.map(a => <option key={a.id} value={a.id} className="bg-surface text-on-surface">{a.name}</option>)}
                  </select>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60">
                    {categories.map(c => <option key={c.id} value={c.id} className="bg-surface text-on-surface">{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="mt-2 h-10 w-full bg-primary text-on-primary font-bold text-xs font-label-caps uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {editingId ? <><Save className="w-4 h-4" /> Simpan Perubahan</> : <><Plus className="w-4 h-4 stroke-[3]" /> Tambah Rencana Pengingat</>}
            </button>
          </form>

          {/* List of Reminders */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-label-caps text-primary uppercase font-semibold tracking-wider">Daftar Pengingat Aktif ({reminders.length})</h4>

            {reminders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant/30 text-xs border border-dashed border-overlay/5 rounded-xl flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-25 animate-pulse" />
                <span>Belum ada rencana pengingat yang dibuat.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto no-scrollbar">
                {reminders.map((reminder) => {
                  const gabunganWaktu = reminder.targetDate
                    ? new Date(`${reminder.targetDate}T${reminder.time}`)
                    : new Date();

                  const formatOpsi: Intl.DateTimeFormatOptions = {
                    day: 'numeric',
                    month: 'short'
                  };

                  const tampilanWaktuLokal = `${gabunganWaktu.toLocaleDateString('id-ID', formatOpsi)} - Pukul ${reminder.time}`;
                  const isDebtLinked = debts.some(d => d.reminderId === reminder.id);
                  const hasPaymentDetail = !!reminder.amount && !!reminder.accountId && !!reminder.category;
                  // Task: sudah dibayar SIKLUS INI — lastTriggeredDate ini
                  // sama persis yang dipakai untuk menekan alarm sampai
                  // siklus berikutnya (lihat handleMarkReminderPaid di
                  // App.tsx), jadi "Sudah Bayar" otomatis kembali jadi
                  // "Bayar" begitu tanggalnya berganti siklus (minggu/bulan).
                  const isPaidThisCycle = hasPaymentDetail && reminder.lastTriggeredDate === todayDateStr;
                  const canMarkPaid = reminder.isActive && !isDebtLinked && hasPaymentDetail && !isPaidThisCycle;

                  return (
                    <div
                      key={reminder.id}
                      className={`flex flex-col gap-2.5 p-3.5 rounded-xl border border-overlay/5 transition-all ${
                        !reminder.isActive ? 'opacity-40 bg-overlay/5' : isPaidThisCycle ? 'bg-body-bg/60' : 'bg-overlay/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            reminder.isActive ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-overlay/5 border border-overlay/5 text-on-surface-variant/40'
                          }`}>
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{reminder.title}</p>
                            <p className="text-[10px] text-on-surface-variant/70 font-mono-data mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <Clock className="w-3 h-3 text-primary/70 shrink-0" /> {tampilanWaktuLokal}
                              <span className="text-on-surface/20">•</span>
                              <RefreshCw className="w-3 h-3 text-primary/70 shrink-0" /> {getRepeatLabel(reminder.repeatType)}
                              {reminder.amount ? (
                                <>
                                  <span className="text-on-surface/20">•</span>
                                  <span className="text-primary">{formatRupiah(reminder.amount, false)}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Custom Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => onToggleReminder(reminder.id)}
                            disabled={isDebtLinked}
                            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center disabled:opacity-40 disabled:cursor-not-allowed ${
                              reminder.isActive ? 'bg-primary' : 'bg-overlay/10'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-slate-900 shadow-md transform transition-transform duration-200 ${
                                reminder.isActive ? 'translate-x-4.5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {!isDebtLinked && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(reminder)}
                              className="w-8 h-8 rounded-lg bg-overlay/5 border border-overlay/10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-overlay/10 active:scale-95 transition-all"
                              title="Edit pengingat"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => onDeleteReminder(reminder.id)}
                            disabled={isDebtLinked}
                            className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isDebtLinked ? 'Kelola dari menu Cicilan/Hutang' : 'Hapus'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isDebtLinked && (
                        <span className="flex items-center gap-1.5 text-[10px] text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 w-fit">
                          <Link2 className="w-3 h-3" /> Terhubung Cicilan/Hutang — kelola &amp; "Sudah Bayar" dari menu Cicilan/Hutang
                        </span>
                      )}

                      {canMarkPaid && (
                        <button
                          type="button"
                          onClick={() => onMarkPaid(reminder.id)}
                          className="h-9 w-full rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Bayar ({formatRupiah(reminder.amount!)})
                        </button>
                      )}

                      {isPaidThisCycle && (
                        <div className="h-9 w-full rounded-lg bg-overlay/5 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Sudah Bayar
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
