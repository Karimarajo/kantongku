import React from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { t as tr } from '../i18n';

// Task 4 (trial feature), simplified per Task 8 — full-screen lock, rendered
// as an EARLY RETURN by App.tsx (replacing the whole dashboard render, not
// an overlay on top of it) the moment a 'trial' user's 3-day window has
// passed. Originally this component created+polled an order itself; now it
// just links OUT to the standalone /bayar page (Task 8) with the user's
// email prefilled — /bayar owns the entire order-creation/Doku/polling flow
// verbatim (moved from Landing.tsx), so there is exactly ONE place that
// logic lives, not two that could drift apart. Once payment settles there,
// /bayar redirects to /app on its own, which re-boots fresh and comes back
// unlocked (confirmOrderRecord's status='active' upsert is already generic
// for a 'trial' row, verified in server.ts). User data itself is untouched
// by any of this: it's still sitting in user_app_data server-side exactly as
// the trial left it, this component just blocks the UI that would read/show
// it until payment settles.
interface TrialExpiredLockProps {
  email: string;
}

export default function TrialExpiredLock({ email }: TrialExpiredLockProps) {
  const payUrl = `/bayar?email=${encodeURIComponent(email)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-body-bg p-6">
      <div className="max-w-sm w-full bg-surface rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-2xl border border-overlay/10">
        <BrandLogo className="w-12 h-12" />
        <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center">
          <Lock className="w-7 h-7 text-danger" />
        </div>
        <h2 className="text-lg font-bold text-on-surface">{tr('Masa Coba Gratis Sudah Berakhir')}</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {tr('Masa coba kamu sudah habis. Datamu tetap aman tersimpan — lanjutkan berlangganan untuk bisa akses lagi.')}
        </p>

        <a
          href={payUrl}
          className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {tr('Lanjutkan Berlangganan')}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
