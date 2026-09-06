import React, { useState } from 'react';
import { Account, Pocket, PocketShare, SharedPocketBundle } from '../types';
import { formatRupiah } from '../utils';
import { t as tr } from '../i18n';
import { ChevronLeft, Users, Check, X, LogOut, UserPlus, Loader2, Trash2, RotateCcw, Wallet as WalletIcon, ChevronDown } from 'lucide-react';

interface SharedPocketsViewProps {
  pockets: Pocket[]; // my own pockets, to share OUT and to resolve names for myShares
  sharedPockets: SharedPocketBundle[]; // pockets shared TO me
  myAccounts: Account[]; // MY OWN wallets — sumber setor dana ke kantong bersama (poin 9)
  pendingInvitations: any[]; // invitations addressed to me (server-joined with pocket_name/owner_name)
  myShares: PocketShare[]; // shares I've created, across all my pockets
  onBack: () => void;
  onInvite: (pocketId: string, email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
  onDisconnectShare: (id: string) => void;
  // Task (revisi): baris "Diputus" sebelumnya tidak punya aksi apa pun dan
  // netap selamanya di daftar — sekarang bisa dihapus permanen (riwayatnya
  // dibersihkan) atau disambungkan kembali (undang ulang ke email yang sama).
  onDeleteShare: (id: string) => void;
  // Task (revisi Kantong Bersama, poin 9): setor dana dari wallet SAYA
  // SENDIRI ke kantong bersama ini — wajib sebelum bisa mencatat transaksi
  // pengeluaran di sana (lihat AddTransactionModal.tsx).
  onContribute: (shareId: string, accountId: string, amount: number) => Promise<{ ok: true } | { ok: false; error: string }>;
}

// Pure management screen: accept/decline invitations, and share/manage my
// own pockets. Actually USING a shared pocket (viewing its transactions,
// adding a new one) lives on the Home dashboard now, right alongside my
// own pockets — this screen used to duplicate that with its own inline
// transaction list/add-form, which just meant two different places to do
// the same thing.
export default function SharedPocketsView({
  pockets,
  sharedPockets,
  myAccounts,
  pendingInvitations,
  myShares,
  onBack,
  onInvite,
  onAcceptInvitation,
  onDeclineInvitation,
  onDisconnectShare,
  onDeleteShare,
  onContribute,
}: SharedPocketsViewProps) {
  const [invitePocketId, setInvitePocketId] = useState(pockets[0]?.id || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  // Baris mana (per share.id) yang lagi diproses "Sambungkan Kembali" —
  // dipakai untuk nonaktifkan tombolnya sementara request jalan.
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  // Form "Setor Dana" (poin 9) — dibuka per-shareId, satu saja aktif dalam
  // satu waktu (cukup untuk kebutuhan sekarang, tidak perlu state per-baris).
  const [contribShareId, setContribShareId] = useState<string | null>(null);
  const [contribAccountId, setContribAccountId] = useState('');
  const [contribAmount, setContribAmount] = useState<number>(0);
  const [contribError, setContribError] = useState('');
  const [contribLoading, setContribLoading] = useState(false);

  const handleReconnect = async (share: PocketShare) => {
    setReconnectingId(share.id);
    await onInvite(share.pocket_id, share.invited_email);
    setReconnectingId(null);
  };

  const openContribForm = (shareId: string) => {
    setContribShareId(shareId);
    setContribAccountId(myAccounts[0]?.id || '');
    setContribAmount(0);
    setContribError('');
  };

  const handleContribSubmit = async (e: React.FormEvent, shareId: string) => {
    e.preventDefault();
    if (!contribAccountId || contribAmount <= 0) return;
    setContribError('');
    setContribLoading(true);
    const result = await onContribute(shareId, contribAccountId, contribAmount);
    setContribLoading(false);
    if (!result.ok) {
      setContribError((result as { ok: false; error: string }).error);
      return;
    }
    setContribShareId(null);
  };

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
          {tr('Kantong Bersama')}
        </h1>
      </div>

      {/* Undangan masuk */}
      {pendingInvitations.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">{tr('Undangan Menunggu')}</h2>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="text-xs text-on-surface-variant">
                <span className="text-on-surface font-semibold">{inv.owner_name || tr('Seseorang')}</span> {tr('mengajak Anda ke kantong')}{' '}
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

      {/* Kantong yang dibagikan ke saya — ringkasan saja; buka lewat Home
          untuk lihat/tambah transaksinya, sama seperti kantong sendiri. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">{tr('Dibagikan ke Saya')}</h2>
        {sharedPockets.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">{tr('Belum ada kantong yang dibagikan ke Anda.')}</p>
        ) : (
          <>
            <p className="text-[11px] text-on-surface-variant/60 -mt-1">{tr('Buka tab Home untuk lihat transaksi dan mencatat transaksi baru — kantong ini muncul di sana bersama kantong Anda sendiri.')}</p>
            {sharedPockets.map((bundle) => {
              // Task (revisi Kantong Bersama, poin 9): "kontribusi saya" =
              // akun virtual contrib-<shareId> di dalam accounts milik OWNER
              // yang ikut ter-expose lewat bundle ini — lihat komentar
              // contribAccountId di server.ts untuk kenapa modelnya begini.
              const myContribution = bundle.accounts.find(a => a.id === `contrib-${bundle.shareId}`)?.allocations?.[bundle.pocket.id] ?? 0;
              const isContribOpen = contribShareId === bundle.shareId;
              return (
                <div key={bundle.shareId} className="flex flex-col gap-2 p-3 rounded-xl glass-card border border-overlay/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{bundle.pocket.name}</p>
                      <p className="text-[11px] text-on-surface-variant/60">{tr('milik')} {bundle.ownerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono-data text-primary">{formatRupiah(bundle.pocket.balance)}</span>
                      <button
                        onClick={() => {
                          if (confirm(`${tr('Yakin ingin keluar dari kantong')} "${bundle.pocket.name}"? ${tr('Transaksi yang Anda buat di kantong ini akan dihapus, dan sisa kontribusi dana Anda')} (${formatRupiah(myContribution)}) ${tr('akan dikembalikan ke wallet Anda.')}`)) {
                            onDisconnectShare(bundle.shareId);
                          }
                        }}
                        title="Keluar dari kantong"
                        className="w-8 h-8 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-rose-400 flex items-center justify-center"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Kontribusi saya + tombol Setor Dana */}
                  <div className="flex items-center justify-between text-[11px] bg-indigo-500/5 border border-indigo-500/10 rounded-lg px-2.5 py-2">
                    <span className="text-on-surface-variant">{tr('Kontribusi saya:')} <b className="text-on-surface font-mono-data">{formatRupiah(myContribution)}</b></span>
                    <button
                      type="button"
                      onClick={() => (isContribOpen ? setContribShareId(null) : openContribForm(bundle.shareId))}
                      className="flex items-center gap-1 text-primary font-semibold hover:underline"
                    >
                      {tr('Setor Dana')} <ChevronDown className={`w-3 h-3 transition-transform ${isContribOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isContribOpen && (
                    <form onSubmit={(e) => handleContribSubmit(e, bundle.shareId)} className="flex flex-col gap-2 p-2.5 rounded-lg bg-overlay/5 border border-overlay/10">
                      <label className="text-[10px] text-on-surface-variant uppercase font-label-caps flex items-center gap-1"><WalletIcon className="w-3 h-3" /> {tr('Dari Wallet Saya')}</label>
                      <select value={contribAccountId} onChange={(e) => setContribAccountId(e.target.value)} className="h-9 bg-overlay/5 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface">
                        {myAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatRupiah(a.balance)})</option>)}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={contribAmount || ''}
                        onChange={(e) => setContribAmount(Number(e.target.value) || 0)}
                        placeholder="Nominal setoran"
                        className="h-9 bg-overlay/5 border border-overlay/10 rounded-lg px-2 text-xs text-on-surface"
                      />
                      {contribError && <span className="text-[10px] text-rose-400">{contribError}</span>}
                      <button type="submit" disabled={contribLoading || myAccounts.length === 0} className="h-9 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {contribLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tr('Setor')}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* Bagikan kantong saya */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">{tr('Kantong Saya yang Dibagikan')}</h2>

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
            {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> {tr('Bagikan Kantong')}</>}
          </button>
        </form>

        {myShares.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">{tr('Anda belum membagikan kantong apa pun.')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {myShares.map((share) => (
              <div key={share.id} className="flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-overlay/5 border border-overlay/10">
                <div>
                  <p className="text-on-surface font-semibold">{pocketName(share.pocket_id)}</p>
                  <p className="text-on-surface-variant/60">{share.invited_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Task (revisi): badge "Diputus" sebelumnya bg-overlay/5 +
                      text-on-surface-variant/50 — abu di atas abu, nyaris tak
                      terbaca di light mode. Diganti pola warna tetap
                      (rose, bukan token overlay) sama seperti Aktif/Menunggu
                      di atasnya, supaya kontras terjamin di kedua tema. */}
                  <span className={`text-[10px] font-label-caps uppercase px-2 py-1 rounded-md ${
                    share.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' :
                    share.status === 'pending' ? 'bg-amber-500/10 text-amber-300' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {share.status === 'active' ? tr('Aktif') : share.status === 'pending' ? tr('Menunggu') : tr('Diputus')}
                  </span>
                  {share.status === 'revoked' ? (
                    <>
                      <button
                        onClick={() => handleReconnect(share)}
                        disabled={reconnectingId === share.id}
                        title="Sambungkan Kembali"
                        className="w-7 h-7 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all disabled:opacity-40"
                      >
                        {reconnectingId === share.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`${tr('Hapus riwayat berbagi kantong ini dengan')} ${share.invited_email}? ${tr('Tindakan ini tidak bisa dibatalkan.')}`)) onDeleteShare(share.id); }}
                        title="Hapus Data"
                        className="w-7 h-7 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`${tr('Yakin memutus')} ${share.invited_email} ${tr('dari kantong')} "${pocketName(share.pocket_id)}"? ${tr('Transaksi yang mereka buat di kantong ini akan dihapus, dan sisa kontribusi dana mereka akan dikembalikan ke wallet mereka.')}`)) {
                          onDisconnectShare(share.id);
                        }
                      }}
                      title="Putuskan"
                      className="w-7 h-7 rounded-lg bg-overlay/5 text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                    >
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
