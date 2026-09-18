import React, { useEffect, useRef, useState } from 'react';
import { Lock, Loader2, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { t as tr } from '../i18n';

// Task 4 (trial feature) — full-screen lock, rendered as an EARLY RETURN by
// App.tsx (replacing the whole dashboard render, not an overlay on top of
// it) the moment a 'trial' user's 3-day window has passed. Reuses the
// EXISTING /api/payment/create + /api/payment/status/:order_code endpoints
// (same ones the landing page uses) — no new payment flow. User data itself
// is untouched by any of this: it's still sitting in user_app_data server-
// side exactly as the trial left it, this component just blocks the UI that
// would read/show it until payment settles.
interface TrialExpiredLockProps {
  email: string;
  name: string;
  onUnlocked: () => void;
}

type Step = 'idle' | 'creating' | 'paying' | 'error';

const POLL_INTERVAL_MS = 5000;

export default function TrialExpiredLock({ email, name, onUnlocked }: TrialExpiredLockProps) {
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Same polling pattern as Landing.tsx's own order-status polling — once
  // Doku settlement is confirmed, confirmOrderRecord (server.ts) has ALREADY
  // flipped this user's status to 'active' (verified generic for a 'trial'
  // row, see the comment there), so all onUnlocked() needs to do is make
  // App.tsx re-fetch the session — it'll come back 'active' from here on.
  const startPolling = (orderCode: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${orderCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'settlement') {
          if (pollRef.current) clearInterval(pollRef.current);
          onUnlocked();
        } else if (data.status === 'expired' || data.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('error');
          setError(tr('Order dibatalkan/kedaluwarsa. Silakan coba lagi.'));
        }
      } catch {
        // Transient polling error — ignore, same as Landing.tsx's own polling.
      }
    }, POLL_INTERVAL_MS);
  };

  const handlePay = async () => {
    setStep('creating');
    setError('');
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tr('Gagal membuat order pembayaran'));
      setPaymentUrl(data.paymentUrl);
      setStep('paying');
      startPolling(data.order_code);
      window.open(data.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || tr('Terjadi kesalahan. Silakan coba lagi.'));
      setStep('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-body-bg p-6">
      <div className="max-w-sm w-full bg-surface rounded-3xl p-8 flex flex-col items-center gap-4 text-center shadow-2xl border border-overlay/10">
        <BrandLogo className="w-12 h-12" />
        <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center">
          <Lock className="w-7 h-7 text-danger" />
        </div>
        <h2 className="text-lg font-bold text-on-surface">{tr('Masa Coba Gratis Sudah Berakhir')}</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {tr('Masa coba 3 hari kamu sudah habis. Datamu tetap aman tersimpan — lanjutkan berlangganan untuk bisa akses lagi.')}
        </p>

        {step === 'paying' ? (
          <div className="w-full flex flex-col items-center gap-3 pt-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-on-surface-variant">{tr('Menunggu konfirmasi pembayaran...')}</p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2 flex items-center gap-1"
            >
              {tr('Belum diarahkan? Buka halaman pembayaran')}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={step === 'creating'}
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {step === 'creating' ? <Loader2 className="w-5 h-5 animate-spin" /> : tr('Lanjutkan Berlangganan')}
          </button>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
