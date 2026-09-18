import React, { useEffect, useRef, useState } from 'react';
import { User, ArrowRight, CheckCircle2, Loader2, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { PRODUCT_PRICE_IDR } from '../../lib/constants';

// Task 8 — standalone `/bayar` page. This is the ENTIRE order+Doku flow that
// used to live inline in Landing.tsx's section id="pricing" (form -> POST
// /api/payment/create -> open Doku in a new tab -> poll
// /api/payment/status/:order_code -> success/expired/error) — moved here
// VERBATIM, logic untouched, per the explicit constraint not to change
// /api/payment/create or the Doku flow itself. Reachable two ways: the
// "trial habis" prompt Login.tsx shows right after a trial user gets
// auto-logged-out (see App.tsx's trial-gate effect), linking to
// `/bayar?email=<their email>`, and the trial-expired reminder email
// (sendTrialPaymentReminderEmail in server.ts, same link). This is the one
// deliberate EXCEPTION to "no prices on the main site" (Task 9) — someone
// landing here is already past the free-trial stage and specifically here
// to pay, so the amount must be shown clearly.
//
// Email is read directly from `?email=` and shown READ-ONLY (they already
// registered/were already a customer — no reason to retype it, and it must
// match the account being unlocked). Name stays a normal typed field
// (required server-side by /api/payment/create); WhatsApp was dropped
// entirely — it's optional server-side and was already collected once at
// trial registration (Task 7), no need to ask again.
interface PriceConfig {
  amount: number;
  label: string;
}

interface OrderDetails {
  order_code: string;
  total_amount: number;
  paymentUrl: string;
}

type Step = 'form' | 'paying' | 'success' | 'expired' | 'error';

function readEmailFromQuery(): string {
  try {
    return new URLSearchParams(window.location.search).get('email') || '';
  } catch {
    return '';
  }
}

export default function PaymentPage() {
  const [name, setName] = useState('');
  const [email] = useState(() => readEmailFromQuery());
  const [price, setPrice] = useState<PriceConfig | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/payment/config')
      .then((r) => r.json())
      .then((data) => setPrice(data))
      .catch(() => setError('Gagal memuat informasi harga. Coba muat ulang halaman.'));
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Once settlement is confirmed, auto-redirect to the login page after a
  // short delay so the "Pembayaran dikonfirmasi!" message is actually seen —
  // /app then boots fresh and (per confirmOrderRecord's already-generic
  // status='active' upsert) comes back unlocked, same session or a new one.
  useEffect(() => {
    if (step !== 'success') return;
    const timer = setTimeout(() => {
      window.location.href = '/app';
    }, 2500);
    return () => clearTimeout(timer);
  }, [step]);

  const startPolling = (order_code: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${order_code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'settlement') {
          setStep('success');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'expired') {
          setStep('expired');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'cancelled') {
          setStep('error');
          setError('Order dibatalkan. Silakan coba lagi.');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Ignore transient polling errors
      }
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Harap masukkan nama Anda');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Link ini tidak membawa email yang valid — buka lagi dari email/lock-screen aslinya.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const createRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Gagal membuat order pembayaran');
      }

      // Same event_id (order_code) dedup pattern as the old landing-page
      // flow — see lib/metaCapi.ts / server.ts's "Lead" event.
      if (window.fbq) {
        window.fbq('track', 'Lead', { value: PRODUCT_PRICE_IDR, currency: 'IDR' }, { eventID: createData.order_code });
      } else {
        console.error('[Meta Pixel] window.fbq belum siap — event "Lead" TIDAK terkirim. Cek VITE_META_PIXEL_ID sudah di-set saat build.');
      }

      setOrder(createData);
      setStep('paying');
      startPolling(createData.order_code);
      window.open(createData.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setOrder(null);
    setError('');
  };

  const handleCopyAmount = () => {
    if (!order) return;
    navigator.clipboard?.writeText(String(order.total_amount)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div data-landing-theme="light" className="min-h-screen bg-landing-bg text-landing-text font-body-md overflow-x-hidden">
      <div className="w-full py-4 flex items-center justify-center border-b border-landing-text/10">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 mr-2">
          <BrandLogo className="w-7 h-7" glow={false} />
        </div>
        <span className="text-lg font-bold text-landing-text tracking-tight">KantongKu</span>
      </div>

      <section className="w-full px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-landing-accent/20 blur-[120px]" />
        </div>

        <div className="max-w-md mx-auto flex flex-col items-center gap-8 z-10 relative">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold text-landing-text">Lanjutkan Akses KantongKu</h1>
            <p className="text-sm text-landing-text/70">Sekali bayar, akses selamanya, bukan langganan bulanan.</p>
          </div>

          {price && step === 'form' && (
            <div className="w-full bg-landing-surface/25 border border-landing-text/10 rounded-2xl p-5 text-center">
              <p className="text-xs font-label-caps text-landing-text/70 tracking-wider uppercase mb-1">Paket Akses</p>
              <p className="font-mono-data text-3xl font-bold text-landing-text">{formatCurrency(price.amount)}</p>
              <p className="text-sm text-landing-text/70 mt-1">{price.label}</p>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-landing-text/70 tracking-wider">Nama Lengkap</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-landing-text/50">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Masukkan nama Anda"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full h-14 bg-landing-surface/20 border border-landing-text/15 rounded-xl px-12 text-landing-text font-body-md placeholder:text-landing-text/40 focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-landing-text/70 tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full h-14 bg-landing-surface/10 border border-landing-text/15 rounded-xl px-4 text-landing-text/70 font-body-md cursor-not-allowed"
                />
                <p className="text-xs text-landing-text/50 px-1">
                  Email akun kamu — login nanti wajib pakai email yang sama persis.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-landing-text/60 bg-landing-text/5 border border-landing-text/10 rounded-xl px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-landing-text shrink-0" />
                <span>Pembayaran dikonfirmasi otomatis via Doku.</span>
              </div>

              {error && (
                <span className="text-xs text-rose-600 block px-1 border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                  {error}
                </span>
              )}

              <button
                type="submit"
                disabled={loading || !price || !email}
                className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-landing-accent text-landing-on-accent disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Bayar'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {step === 'paying' && order && (
            <div className="w-full flex flex-col items-center gap-5 text-center">
              <div className="w-full bg-landing-surface/25 border border-landing-text/10 rounded-2xl p-5">
                <p className="text-xs font-label-caps text-landing-text/70 tracking-wider uppercase mb-1">
                  Total yang harus dibayar
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-mono-data text-4xl font-bold text-landing-text">{formatCurrency(order.total_amount)}</p>
                  <button
                    type="button"
                    onClick={handleCopyAmount}
                    className="text-landing-text/50 hover:text-landing-text transition-colors"
                    title="Salin nominal"
                  >
                    {copied ? <Check className="w-5 h-5 text-landing-text" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <a
                href={order.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-landing-accent text-landing-on-accent"
              >
                Bayar Sekarang <ExternalLink className="w-5 h-5" />
              </a>
              <p className="text-xs text-landing-text/60 text-center max-w-xs">
                Halaman pembayaran sudah terbuka di tab baru, pilih QRIS, VA bank, e-wallet, atau kartu apa pun yang paling nyaman.
              </p>

              <div className="flex items-center gap-2 text-landing-text/70">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Menunggu pembayaran (order {order.order_code})...</p>
              </div>
              <p className="text-xs text-landing-text/50">
                Order ini berlaku 24 jam. Halaman ini otomatis update begitu pembayaran berhasil, akun langsung aktif, tanpa perlu menunggu konfirmasi admin.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-landing-text" />
              <p className="text-landing-text font-headline-sm">Pembayaran dikonfirmasi!</p>
              <div className="flex items-center gap-2 text-landing-text/70">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Mengalihkan ke aplikasi...</p>
              </div>
            </div>
          )}

          {step === 'expired' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <span className="text-xs text-rose-600 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                Order sudah kedaluwarsa (lebih dari 24 jam belum dikonfirmasi). Silakan coba lagi.
              </span>
              <button
                onClick={handleReset}
                className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-landing-accent text-landing-on-accent"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <span className="text-xs text-rose-600 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                {error || 'Terjadi kesalahan.'}
              </span>
              <button
                onClick={handleReset}
                className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-landing-accent text-landing-on-accent"
              >
                Coba Lagi
              </button>
            </div>
          )}

          <p className="text-[10px] text-landing-text/40 text-center uppercase tracking-wider">
            Pembayaran diverifikasi otomatis oleh Doku, akun aktif dalam hitungan detik.
          </p>
        </div>
      </section>
    </div>
  );
}
