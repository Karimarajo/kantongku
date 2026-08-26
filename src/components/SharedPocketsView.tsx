import React, { useState } from 'react';
import { Pocket, PocketShare, SharedPocketBundle } from '../types';
import { formatRupiah } from '../utils';
import { ChevronLeft, Users, Check, X, LogOut, UserPlus, Loader2 } from 'lucide-react';

interface SharedPocketsViewProps {
  pockets: Pocket[]; // my own pockets, to share OUT and to resolve names for myShares
  sharedPockets: SharedPocketBundle[]; // pockets shared TO me
  pendingInvitations: any[]; // invitations addressed to me (server-joined with pocket_name/owner_name)
  myShares: PocketShare[]; // shares I've created, across all my pockets
  onBack: () => void;
  onInvite: (pocketId: string, email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onAcceptInvitation: (id: string) => void;
  onDeclineInvitation: (id: string) => void;
  onDisconnectShare: (id: string) => void;
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
  pendingInvitations,
  myShares,
  onBack,
  onInvite,
  onAcceptInvitation,
  onDeclineInvitation,
  onDisconnectShare,
}: SharedPocketsViewProps) {
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

      {/* Kantong yang dibagikan ke saya — ringkasan saja; buka lewat Home
          untuk lihat/tambah transaksinya, sama seperti kantong sendiri. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-label-caps text-primary/80 tracking-wider uppercase">Dibagikan ke Saya</h2>
        {sharedPockets.length === 0 ? (
          <p className="text-xs text-on-surface-variant/60">Belum ada kantong yang dibagikan ke Anda.</p>
        ) : (
          <>
            <p className="text-[11px] text-on-surface-variant/60 -mt-1">Buka tab Home untuk lihat transaksi dan mencatat transaksi baru — kantong ini muncul di sana bersama kantong Anda sendiri.</p>
            {sharedPockets.map((bundle) => (
              <div key={bundle.shareId} className="flex items-center justify-between p-3 rounded-xl glass-card border border-overlay/5">
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
            ))}
          </>
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
