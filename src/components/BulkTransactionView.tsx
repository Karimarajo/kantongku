import React, { useState } from 'react';
import { Brain, Loader, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Pocket, Account, Category, Transaction } from '../types';
import { formatRupiah, localDateKey, startOfLocalDay } from '../utils';
import { t as tr } from '../i18n';

type BulkSaveResult = { ok: true; count: number } | { ok: false; errors: string[] };

interface BulkTransactionViewProps {
  pockets: Pocket[];
  accounts: Account[];
  categories: Category[];
  onSave: (items: Array<Omit<Transaction, 'id' | 'date'> & { date: string }>) => BulkSaveResult;
  onSaved: () => void;
}

// Satu baris hasil parse AI yang masih bisa diedit user sebelum disimpan.
// `guessed*` = AI tidak menyebutkan nilainya, jadi diisi default dan ditandai
// supaya user mengecek (tidak pernah diam-diam dianggap benar).
interface BulkRow {
  key: number;
  title: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  date: string;
  categoryId: string;
  pocketId: string;
  accountId: string;
  guessedDate: boolean;
  guessedCategory: boolean;
  guessedPocket: boolean;
  guessedAccount: boolean;
}

const selectCls = 'h-9 w-full bg-surface-variant/40 border rounded-lg px-2 text-xs text-on-surface focus:outline-none focus:border-primary/60';
const okBorder = 'border-overlay/10';
const warnBorder = 'border-amber-400/60';

export default function BulkTransactionView({ pockets, accounts, categories, onSave, onSaved }: BulkTransactionViewProps) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  const handleParse = async () => {
    if (!text.trim()) return setError(tr('Mohon isi teks terlebih dahulu'));
    setIsProcessing(true);
    setError('');
    setSaveErrors([]);
    try {
      const res = await fetch('/api/parse-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          context: {
            categories: categories.map(c => ({ id: c.id, name: c.name })),
            pockets: pockets.map(p => ({ id: p.id, name: p.name })),
            accounts: accounts.map(a => ({ id: a.id, name: a.name })),
            today: localDateKey(),
          },
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menghubungi asisten AI');
      }
      const data = await res.json();
      const items: any[] = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) throw new Error(tr('AI tidak menemukan transaksi di teks ini. Coba tulis lebih jelas.'));

      const today = localDateKey();
      setRows(items.map((it, i) => {
        const date = /^\d{4}-\d{2}-\d{2}$/.test(it.tanggal || '') ? it.tanggal : '';
        const catOk = categories.some(c => c.id === it.category_id);
        const pocketOk = pockets.some(p => p.id === it.pocket_id);
        const accOk = accounts.some(a => a.id === it.account_id);
        return {
          key: i,
          title: String(it.catatan || '').trim() || tr('Transaksi'),
          amount: Math.max(0, Number(it.nominal) || 0),
          type: it.tipe === 'pemasukan' ? 'incoming' : 'outgoing',
          date: date || today,
          categoryId: catOk ? it.category_id : (categories[0]?.id || ''),
          pocketId: pocketOk ? it.pocket_id : (pockets[0]?.id || ''),
          accountId: accOk ? it.account_id : (accounts[0]?.id || ''),
          guessedDate: !date,
          guessedCategory: !catOk,
          guessedPocket: !pocketOk,
          guessedAccount: !accOk,
        } as BulkRow;
      }));
    } catch (err: any) {
      setError(err.message || 'Gagal memproses input');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateRow = (key: number, patch: Partial<BulkRow>) =>
    setRows(prev => prev && prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const applyToAll = (patch: Partial<BulkRow>) =>
    setRows(prev => prev && prev.map(r => ({ ...r, ...patch })));

  const handleSave = () => {
    if (!rows || rows.length === 0) return;
    const now = new Date();
    const result = onSave(rows.map(r => {
      const d = startOfLocalDay(r.date);
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      return {
        title: r.title.trim(),
        amount: r.amount,
        type: r.type,
        pocketId: r.pocketId,
        accountId: r.accountId,
        category: r.categoryId,
        notes: 'Input banyak sekaligus (AI).',
        date: d.toISOString(),
      };
    }));
    if (result.ok) {
      onSaved();
    } else {
      setSaveErrors((result as { ok: false; errors: string[] }).errors);
    }
  };

  // ---- Langkah 1: ketik teks ----
  if (!rows) {
    return (
      <div className="flex flex-col gap-4 text-left py-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-label-caps text-on-surface-variant uppercase">{tr('Tulis semua transaksi sekaligus')}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr('Cth: beli nasi goreng, kopi, bensin tanggal 25, masing-masing 20rb, pakai BCA, kategori makan, dari kantong pribadi')}
            className="h-32 bg-surface-variant/40 border border-overlay/10 rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:border-primary/60"
          />
          <p className="text-[11px] text-on-surface-variant">
            {tr('Sebut tanggal, nominal, wallet, kategori, dan kantong. Yang tidak disebut bisa Anda isi di langkah berikutnya.')}
          </p>
        </div>
        <button type="button" disabled={isProcessing} onClick={handleParse} className="h-12 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
          {isProcessing ? <Loader className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />} {tr('Uraikan via AI')}
        </button>
        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">{error}</div>}
      </div>
    );
  }

  // ---- Langkah 2: tinjau & edit ----
  const total = rows.reduce((sum, r) => sum + (r.type === 'incoming' ? r.amount : -r.amount), 0);
  const hasGuess = rows.some(r => r.guessedDate || r.guessedCategory || r.guessedPocket || r.guessedAccount);

  return (
    <div className="flex flex-col gap-3 text-left py-2">
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-variant/30 border border-overlay/10">
        <span className="text-[10px] font-label-caps text-on-surface-variant uppercase">{tr('Terapkan ke semua baris')}</span>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label={tr('Tanggal')} defaultValue="" onChange={(e) => e.target.value && applyToAll({ date: e.target.value, guessedDate: false })} className={`${selectCls} ${okBorder}`} />
          <select aria-label={tr('Kategori')} value="" onChange={(e) => e.target.value && applyToAll({ categoryId: e.target.value, guessedCategory: false })} className={`${selectCls} ${okBorder}`}>
            <option value="">{tr('Kategori…')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label={tr('Wallet')} value="" onChange={(e) => e.target.value && applyToAll({ accountId: e.target.value, guessedAccount: false })} className={`${selectCls} ${okBorder}`}>
            <option value="">{tr('Wallet…')}</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select aria-label={tr('Kantong')} value="" onChange={(e) => e.target.value && applyToAll({ pocketId: e.target.value, guessedPocket: false })} className={`${selectCls} ${okBorder}`}>
            <option value="">{tr('Kantong…')}</option>
            {pockets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {hasGuess && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-200">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
          <span>{tr('Kolom bertepi kuning tidak disebut di teks Anda — diisi otomatis dengan nilai awal. Mohon dicek.')}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <div key={r.key} className="p-3 rounded-xl border border-overlay/10 bg-surface-variant/20 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-on-surface-variant font-mono-data w-4">{i + 1}</span>
              <input value={r.title} onChange={(e) => updateRow(r.key, { title: e.target.value })} className={`${selectCls} ${okBorder} flex-1 font-semibold`} />
              <input
                type="number" inputMode="numeric" min={0} value={r.amount || ''}
                onChange={(e) => updateRow(r.key, { amount: Math.max(0, Number(e.target.value) || 0) })}
                placeholder="0"
                className={`${selectCls} ${r.amount > 0 ? okBorder : 'border-rose-400/60'} w-28 font-mono-data text-right`}
              />
              <button type="button" aria-label={tr('Hapus baris')} onClick={() => setRows(prev => prev && prev.filter(x => x.key !== r.key))} className="p-2 text-rose-300 hover:bg-rose-500/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={r.date} onChange={(e) => updateRow(r.key, { date: e.target.value, guessedDate: false })} className={`${selectCls} ${r.guessedDate ? warnBorder : okBorder}`} />
              <select value={r.type} onChange={(e) => updateRow(r.key, { type: e.target.value as 'incoming' | 'outgoing' })} className={`${selectCls} ${okBorder}`}>
                <option value="outgoing">{tr('Pengeluaran')}</option>
                <option value="incoming">{tr('Pemasukan')}</option>
              </select>
              <select value={r.categoryId} onChange={(e) => updateRow(r.key, { categoryId: e.target.value, guessedCategory: false })} className={`${selectCls} ${r.guessedCategory ? warnBorder : okBorder}`}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={r.accountId} onChange={(e) => updateRow(r.key, { accountId: e.target.value, guessedAccount: false })} className={`${selectCls} ${r.guessedAccount ? warnBorder : okBorder}`}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={r.pocketId} onChange={(e) => updateRow(r.key, { pocketId: e.target.value, guessedPocket: false })} className={`${selectCls} col-span-2 ${r.guessedPocket ? warnBorder : okBorder}`}>
                {pockets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      {saveErrors.length > 0 && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex flex-col gap-1">
          <b>{tr('Belum bisa disimpan — tidak ada transaksi yang tersimpan:')}</b>
          {saveErrors.map((e, i) => <span key={i}>• {e}</span>)}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-on-surface-variant px-1">
        <span>{rows.length} {tr('transaksi')}</span>
        <span className="font-mono-data">{tr('Total')}: {total < 0 ? '-' : '+'}{formatRupiah(Math.abs(total))}</span>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setRows(null); setSaveErrors([]); }} className="h-12 px-4 rounded-xl border border-overlay/10 text-on-surface-variant text-sm font-semibold">
          {tr('Ubah teks')}
        </button>
        <button type="button" disabled={rows.length === 0 || rows.some(r => !r.title.trim() || r.amount <= 0)} onClick={handleSave} className="flex-1 h-12 bg-primary text-on-primary font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
          <CheckCircle2 className="w-5 h-5" /> {tr('Simpan')} {rows.length} {tr('Transaksi')}
        </button>
      </div>
    </div>
  );
}
