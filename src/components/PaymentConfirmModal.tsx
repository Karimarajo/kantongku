import React, { useState } from 'react';
import { Pocket, Account, Category } from '../types';
import { formatRupiah } from '../utils';
import { t as tr } from '../i18n';
import { X, CheckCircle2, Layers, Wallet, Tag } from 'lucide-react';

// Revisi: Pengingat & Cicilan/Hutang dulu WAJIB mengisi kantong/wallet/
// kategori pembayaran SAAT DIBUAT (dulu itu yang bikin tombol "Sudah Bayar"
// disembunyikan sampai field itu diisi). Sekarang dibalik — kantong/wallet/
// kategori dipilih di sini, SAAT tombol "Bayar" ditekan, bukan lagi di form
// pembuatan reminder/debt (lihat ReminderModal.tsx & DebtManagerView.tsx,
// field-field itu sudah dihapus dari form pembuatan). Amount TETAP dari
// reminder/debt-nya sendiri (read-only di sini) — cuma metode pembayarannya
// yang sekarang ditanya belakangan.
//
// default*Id datang dari pocketId/accountId/category yang tersimpan di
// reminder/debt-nya (kalau ada — peninggalan pembayaran SEBELUMNYA, dipakai
// murni sebagai "hint terakhir dipakai", bukan wajib) supaya user yang bayar
// pakai wallet/kategori yang sama berkali-kali tidak perlu pilih ulang tiap
// kali; App.tsx menyimpan lagi pilihan yang dipakai di sini kembali ke
// reminder/debt-nya setelah "Bayar" ditekan, jadi otomatis jadi default
// berikutnya.
interface PaymentConfirmModalProps {
  title: string;
  amount: number;
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  defaultPocketId?: string;
  defaultAccountId?: string;
  defaultCategory?: string;
  onConfirm: (pocketId: string, accountId: string, category: string) => void;
  onClose: () => void;
}

export default function PaymentConfirmModal({
  title,
  amount,
  pockets,
  accounts,
  categories,
  defaultPocketId,
  defaultAccountId,
  defaultCategory,
  onConfirm,
  onClose,
}: PaymentConfirmModalProps) {
  const [pocketId, setPocketId] = useState<string>(
    defaultPocketId && pockets.some(p => p.id === defaultPocketId) ? defaultPocketId : (pockets[0]?.id || '')
  );
  const [accountId, setAccountId] = useState<string>(
    defaultAccountId && accounts.some(a => a.id === defaultAccountId) ? defaultAccountId : (accounts[0]?.id || '')
  );
  const [category, setCategory] = useState<string>(
    defaultCategory && categories.some(c => c.id === defaultCategory) ? defaultCategory : (categories[0]?.id || '')
  );

  const canConfirm = !!pocketId && !!accountId && !!category;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(pocketId, accountId, category);
  };

  return (
    <div
      className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl w-full max-w-sm border border-overlay/10 p-5 flex flex-col gap-4 text-on-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-sm text-on-surface font-bold">{tr('Konfirmasi Pembayaran')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-overlay/5 border border-overlay/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-overlay/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-on-surface-variant truncate">{title}</p>
          <p className="text-xl font-bold text-primary font-mono-data">{formatRupiah(amount)}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
              <Layers className="w-3 h-3" /> {tr('Kantong')}
            </label>
            <select
              value={pocketId}
              onChange={(e) => setPocketId(e.target.value)}
              className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-sm text-on-surface focus:outline-none focus:border-primary/60"
            >
              {pockets.map(p => <option key={p.id} value={p.id} className="bg-surface text-on-surface">{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
              <Wallet className="w-3 h-3" /> {tr('Wallet/Bank')}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-sm text-on-surface focus:outline-none focus:border-primary/60"
            >
              {accounts.map(a => <option key={a.id} value={a.id} className="bg-surface text-on-surface">{a.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-label-caps text-on-surface-variant uppercase flex items-center gap-1">
              <Tag className="w-3 h-3" /> {tr('Kategori')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-sm text-on-surface focus:outline-none focus:border-primary/60"
            >
              {categories.map(c => <option key={c.id} value={c.id} className="bg-surface text-on-surface">{c.name}</option>)}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="h-11 w-full rounded-lg bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4" /> {tr('Bayar')}
        </button>
      </div>
    </div>
  );
}
