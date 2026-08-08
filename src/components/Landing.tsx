import React, { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import { User, Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface PriceConfig {
  amount: number;
  label: string;
  isProduction: boolean;
}

type Step = 'form' | 'paying' | 'success' | 'error';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const SNAP_SCRIPT_ID = 'midtrans-snap-script';

function loadSnapScript(isProduction: boolean, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.getElementById(SNAP_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Snap.js')));
      return;
    }
    const script = document.createElement('script');
    script.id = SNAP_SCRIPT_ID;
    script.src = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Snap.js'));
    document.body.appendChild(script);
  });
}

export default function Landing() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState<PriceConfig | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
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

  const startPolling = (order_id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${order_id}`);
        if (!res.ok) return;
        const data = await res.json();
        setOrderStatus(data.status);
        if (data.status === 'settlement') {
          setStep('success');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (['expire', 'cancel', 'deny'].includes(data.status)) {
          setStep('error');
          setError('Pembayaran tidak berhasil. Silakan coba lagi.');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Ignore transient polling errors
      }
    }, 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Harap masukkan nama Anda');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid');
      return;
    }
    if (!price) {
      setError('Informasi harga belum siap, coba lagi sesaat lagi.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error('Konfigurasi pembayaran belum lengkap (client key hilang).');
      }

      const createRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Gagal membuat transaksi pembayaran');
      }

      setOrderId(createData.order_id);
      setStep('paying');
      startPolling(createData.order_id);

      await loadSnapScript(price.isProduction, clientKey);

      window.snap?.pay(createData.token, {
        onSuccess: () => {
          setStep('success');
          if (pollRef.current) clearInterval(pollRef.current);
        },
        onPending: () => {
          // Keep polling; user may still be completing payment (e.g. QRIS scan)
        },
        onError: () => {
          setStep('error');
          setError('Terjadi kesalahan saat memproses pembayaran.');
        },
        onClose: () => {
          // User closed the Snap popup without finishing — polling keeps checking status
        },
      });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-[#0B111E] text-on-surface px-6 py-12 relative overflow-hidden font-body-md">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="w-full" />

      <div className="w-full max-w-md flex flex-col items-center gap-8 z-10 my-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 p-3 bg-surface-variant/40 rounded-3xl border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-center relative group">
            <BrandLogo className="w-20 h-20" />
          </div>
          <div className="text-center flex flex-col gap-1.5 mt-2">
            <h1 className="font-display-lg text-4xl text-primary font-bold tracking-tight glow-text-primary">
              KantongKu
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-[280px] mx-auto text-center leading-relaxed">
              Daftar sekarang dan kelola keuanganmu lebih cerdas.
            </p>
          </div>
        </div>

        {price && (
          <div className="w-full bg-surface-variant/40 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-xs font-label-caps text-primary/80 tracking-wider uppercase mb-1">Paket Akses</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(price.amount)}</p>
            <p className="text-sm text-on-surface-variant mt-1">{price.label}</p>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-primary/80 tracking-wider">Nama Lengkap</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-on-surface-variant/60">
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
                  className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white font-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-primary/80 tracking-wider">Email</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-on-surface-variant/60">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  placeholder="Masukkan email Anda"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white font-body-md placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
                />
              </div>
              <p className="text-xs text-on-surface-variant/50 px-1">
                Gunakan email yang sama saat login nanti.
              </p>
              {error && (
                <span className="text-xs text-rose-400 mt-1 block px-1 border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !price}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-primary text-on-primary disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Bayar'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {step === 'paying' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-on-surface-variant">
              Menunggu konfirmasi pembayaran{orderId ? ` untuk order ${orderId}` : ''}...
            </p>
            <p className="text-xs text-on-surface-variant/50">Status saat ini: {orderStatus}</p>
          </div>
        )}

        {step === 'success' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="text-white font-headline-sm">Pembayaran berhasil!</p>
            <p className="text-on-surface-variant">
              Akunmu sudah aktif. Silakan login menggunakan akun Google dengan email {email} yang sama.
            </p>
            <a
              href="/app"
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-primary text-on-primary"
            >
              Masuk ke Aplikasi
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        )}

        {step === 'error' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
              {error || 'Pembayaran tidak berhasil.'}
            </span>
            <button
              onClick={() => {
                setStep('form');
                setError('');
              }}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-primary text-on-primary"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm text-center z-10 mt-auto pt-8">
        <p className="text-[10px] sm:text-xs text-on-surface-variant/40 font-label-caps tracking-wider leading-relaxed uppercase border-t border-white/5 pt-4">
          Pembayaran diproses aman melalui Midtrans.
        </p>
      </div>
    </div>
  );
}
