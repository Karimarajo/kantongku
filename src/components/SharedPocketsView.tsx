import React, { useState } from 'react';
import { Pocket, PocketShare, SharedPocketBundle } from '../types';
import { formatRupiah, formatDate } from '../utils';
import {
  ChevronLeft, Users, Check, X, LogOut, UserPlus, Loader2, Plus, ArrowUpCircle, ArrowDownCircle, Trash2
} from 'lucide-react';

interface SharedPocketsViewProps {
  pockets: Pocket[]; // my own pockets, to share OUT and to resolve names for myShares
  sharedPockets: SharedPocketBundle[]; // pockets shared TO me
  pendingInvitations: any[]; // invitations addressed to me (server-joined with pocket_name/owner_name)
  myShares: PocketShare[]; // shares I've created, across all my pockets
  currentUserEmail: string;
  onBack: () => void;
  onInvite: (pocketId: string, email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
  onDisconnectShare: (id: string) => void;
  onAddSharedTransaction: (
    shareId: string,
    tx: { title: string; amount: number; type: 'incoming' | 'outgoing'; accountId: string; category: string }
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDeleteSharedTransaction: (shareId: string, txId: string) => void;
}

// Per-shared-pocket inline "tambah transaksi" form — deliberately a small,
// dedicated form (not the full AddTransactionModal, which also drives
// camera/voice AI parsing wired to a global window bridge tied to the
// OWNER's own handleAddTransaction — reusing it here for a shared pocket
// would silently misroute those AI paths). Manual entry only, scoped to
// exactly the wallets/categories the owner's share actually exposed.
function AddSharedTransactionForm({
  bundle,
  onSubmit,
  onCancel,
}: {
  bundle: SharedPocketBundle;
  onSubmit: (tx: { title: string; amount: number; type: 'incoming' | 'outgoing'; accountId: string; category: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'incoming' | 'outgoing'>('outgoing');
  const [accountId, setAccountId] = useState(bundle.accounts[0]?.id || '');
  const [category, setCategory] = useState(bundle.categories[0]?.id || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!title.trim() || !numAmount || numAmount <= 0 || !accountId || !category) {
      setError('Lengkapi semua field dengan nominal lebih dari 0.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await onSubmit({ title: title.trim(), amount: numAmount, type, accountId, category });
    setLoading(false);
    if (!result.ok) {
      setError((result as { ok: false; error: string }).error);
      return;
    }
    setTitle('');
    setAmount('');
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 p-3 rounded-xl bg-overlay/5 border border-overlay/10 mt-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setType('outgoing')} className={`flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${type === 'outgoing' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-overlay/5 text-on-surface-variant border border-overlay/10'}`}>
          <ArrowUpCircle className="w-3.5 h-3.5" /> Pengeluaran
        </button>
        <button type="button" onClick={() => setType('incoming')} className={`flex-1 h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${type === 'incoming' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-overlay/5 text-on-surface-variant border border-overlay/10'}`}>
          <ArrowDownCircle className="w-3.5 h-3.5" /> Pemasukan
        </button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul transaksi" className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface placeholder:text-on-surface-variant/40" />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Nominal" className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface placeholder:text-on-surface-variant/40" />
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface">
        {bundle.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface">
        {bundle.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {error && <span className="text-xs text-rose-400">{error}</span>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 h-10 rounded-lg bg-overlay/5 border border-overlay/10 text-xs text-on-surface-variant">Batal</button>
        <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
        </button>
      </div>
    </form>
  );
}

export default function SharedPocketsView({
  pockets,
  sharedPockets,
  pendingInvitations,
  myShares,
  currentUserEmail,
  onBack,
  onInvite,
  onAcceptInvitation,
  onDeclineInvitation,
  onDisconnectShare,
  onAddSharedTransaction,
  onDeleteSharedTransaction,
}: SharedPocketsViewProps) {
  const [addingTxForShareId, setAddingTxForShareId] = useState<string | null>(null);
  const [invitePocketId, setInvitePocketId] = useState(pockets[0]?.id || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePocketId || !inviteEmail.trim()) return;
    setInviteError('');
    setInviteLoading(true);
    const result = await onInvite(invitePocketId, inviteEmail.trim());
    setInviteLoading(false);
    if (!result.ok) {
      setInviteError((result as { ok: false; error: string }).error);
      return;
    }
    setInviteEmail('');
  };

  const pocketName = (id: string) => pockets.find((p) => p.id === id)?.name || id;

  return (
    <div className="flex flex-col gap-6 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      <div className="flex items-center gap-4 border-b border-overlay/5 pb-4">
        <button onClick={onBack} className="p-2 bg-overlay/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Kantong Bersama
        </h1>
      </div>

      {/* Undangan masuk */}
      {pendingInvitations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">Undangan Menunggu</h2>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="text-xs text-on-surface-variant">
                <span className="text-on-surface font-semibold">{inv.owner_name || 'Seseorang'}</span> mengajak Anda ke kantong{' '}
                <span className="text-on-surface font-semibold">{inv.pocket_name}</span>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <button onClick={() => onAcceptInvitation(inv.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center"><Check className="w-4 h-4" /></button>
                <button onClick={() => onDeclineInvitation(inv.id)} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Kantong yang dibagikan ke saya */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">Dibagikan ke Saya</h2>
        {sharedPockets.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">Belum ada kantong yang dibagikan ke Anda.</p>
        ) : (
          sharedPockets.map((bundle) => (
            <div key={bundle.shareId} className="flex flex-col gap-2 p-3 rounded-xl glass-card border border-overlay/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{bundle.pocket.name}</p>
                  <p className="text-[11px] text-on-surface-variant/60">milik {bundle.ownerName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono-data text-primary">{formatRupiah(bundle.pocket.balance)}</span>
                  <button onClick={() => onDisconnectShare(bundle.shareId)} title="Keluar dari kantong" className="w-8 h-8 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-rose-400 flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {bundle.transactions.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/50 py-2">Belum ada transaksi.</p>
                ) : (
                  bundle.transactions.slice(0, 20).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-overlay/[0.03]">
                      <div className="min-w-0">
                        <p className="text-on-surface truncate">{t.title}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{formatDate(t.date)} · {t.inputBy || bundle.ownerName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={t.type === 'incoming' ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.type === 'incoming' ? '+' : '-'}{formatRupiah(t.amount)}
                        </span>
                        <button onClick={() => onDeleteSharedTransaction(bundle.shareId, t.id)} className="text-on-surface-variant/40 hover:text-rose-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {addingTxForShareId === bundle.shareId ? (
                <AddSharedTransactionForm
                  bundle={bundle}
                  onSubmit={(tx) => onAddSharedTransaction(bundle.shareId, tx)}
                  onCancel={() => setAddingTxForShareId(null)}
                />
              ) : (
                <button
                  onClick={() => setAddingTxForShareId(bundle.shareId)}
                  className="h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Transaksi
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {/* Bagikan kantong saya */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">Kantong Saya yang Dibagikan</h2>

        <form onSubmit={handleInviteSubmit} className="flex flex-col gap-2 p-3 rounded-xl bg-overlay/5 border border-overlay/10">
          <select value={invitePocketId} onChange={(e) => setInvitePocketId(e.target.value)} className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface">
            {pockets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); if (inviteError) setInviteError(''); }}
            type="email"
            placeholder="Email rekan (harus sudah punya akun KantongKu aktif)"
            className="h-10 bg-overlay/5 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface placeholder:text-on-surface-variant/40"
          />
          {inviteError && <span className="text-xs text-rose-400">{inviteError}</span>}
          <button type="submit" disabled={inviteLoading} className="h-10 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
            {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Bagikan Kantong</>}
          </button>
        </form>

        {myShares.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">Anda belum membagikan kantong apa pun.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {myShares.map((share) => (
              <div key={share.id} className="flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-overlay/5 border border-overlay/10">
                <div>
                  <p className="text-on-surface font-semibold">{pocketName(share.pocket_id)}</p>
                  <p className="text-on-surface-variant/60">{share.invited_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-label-caps uppercase px-2 py-1 rounded-md ${
                    share.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' :
                    share.status === 'pending' ? 'bg-amber-500/10 text-amber-300' :
                    'bg-overlay/5 text-on-surface-variant/50'
                  }`}>
                    {share.status === 'active' ? 'Aktif' : share.status === 'pending' ? 'Menunggu' : 'Diputus'}
                  </span>
                  {share.status !== 'revoked' && (
                    <button onClick={() => onDisconnectShare(share.id)} className="text-on-surface-variant/50 hover:text-rose-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
