import React, { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import { User, Mail, ArrowRight, CheckCircle2, Loader2, QrCode, Landmark, Copy, Check } from 'lucide-react';

interface PriceConfig {
  amount: number;
  label: string;
}

type Channel = 'qris_shopee' | 'transfer_bca';

interface OrderDetails {
  order_code: string;
  channel: Channel;
  total_amount: number;
  qrImage?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

type Step = 'form' | 'paying' | 'success' | 'expired' | 'error';

export default function Landing() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<Channel>('qris_shopee');
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
          setError('Order dibatalkan. Silakan daftar ulang.');
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
      setError('Format email tidak valid');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const createRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, channel }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Gagal membuat order pembayaran');
      }

      setOrder(createData);
      setStep('paying');
      startPolling(createData.order_code);
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

        {price && step === 'form' && (
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
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-primary/80 tracking-wider">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('qris_shopee')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${channel === 'qris_shopee' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface-variant/40 text-on-surface-variant hover:text-white'}`}
                >
                  <QrCode className="w-6 h-6" />
                  <span className="text-xs font-semibold">QRIS ShopeePay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('transfer_bca')}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${channel === 'transfer_bca' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface-variant/40 text-on-surface-variant hover:text-white'}`}
                >
                  <Landmark className="w-6 h-6" />
                  <span className="text-xs font-semibold">Transfer BCA</span>
                </button>
              </div>
            </div>

            {error && (
              <span className="text-xs text-rose-400 block px-1 border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                {error}
              </span>
            )}

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

        {step === 'paying' && order && (
          <div className="w-full flex flex-col items-center gap-5 text-center">
            <div className="w-full bg-surface-variant/40 border border-white/10 rounded-2xl p-5">
              <p className="text-xs font-label-caps text-primary/80 tracking-wider uppercase mb-1">
                Total yang harus dibayar
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-4xl font-bold text-white">{formatCurrency(order.total_amount)}</p>
                <button
                  type="button"
                  onClick={handleCopyAmount}
                  className="text-on-surface-variant/60 hover:text-primary transition-colors"
                  title="Salin nominal"
                >
                  {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-rose-400 mt-3 font-semibold">
                ⚠️ Bayar PERSIS nominal ini, jangan dibulatkan — nominal ini yang dipakai untuk mencocokkan pembayaranmu.
              </p>
            </div>

            {order.channel === 'qris_shopee' ? (
              <div className="w-full flex flex-col items-center gap-3">
                <p className="text-sm text-on-surface-variant">Scan QR ini dengan aplikasi ShopeePay</p>
                <img
                  src={order.qrImage}
                  alt="QRIS ShopeePay"
                  className="w-56 h-56 object-contain rounded-2xl border border-white/10 bg-white p-2"
                />
              </div>
            ) : (
              <div className="w-full bg-surface-variant/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                <p className="text-sm text-on-surface-variant">Transfer ke rekening BCA</p>
                <p className="text-2xl font-bold text-white tracking-wider">{order.bankAccountNumber}</p>
                <p className="text-sm text-on-surface-variant">a.n. {order.bankAccountName}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-on-surface-variant">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm">Menunggu konfirmasi admin (order {order.order_code})...</p>
            </div>
            <p className="text-xs text-on-surface-variant/50">
              Order ini berlaku 24 jam. Setelah kamu bayar, admin akan konfirmasi manual — halaman ini otomatis
              update begitu terkonfirmasi.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <p className="text-white font-headline-sm">Pembayaran dikonfirmasi!</p>
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

        {step === 'expired' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
              Order sudah kedaluwarsa (lebih dari 24 jam belum dikonfirmasi). Silakan daftar ulang.
            </span>
            <button
              onClick={handleReset}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-primary text-on-primary"
            >
              Daftar Ulang
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="w-full flex flex-col items-center gap-4 text-center">
            <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
              {error || 'Terjadi kesalahan.'}
            </span>
            <button
              onClick={handleReset}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md bg-primary text-on-primary"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm text-center z-10 mt-auto pt-8">
        <p className="text-[10px] sm:text-xs text-on-surface-variant/40 font-label-caps tracking-wider leading-relaxed uppercase border-t border-white/5 pt-4">
          Pembayaran dikonfirmasi manual oleh admin dalam waktu 24 jam.
        </p>
      </div>
    </div>
  );
}
