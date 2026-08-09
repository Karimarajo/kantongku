import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, ArrowRight, CheckCircle2, Loader2, QrCode, Landmark, Copy, Check, Gift, ShieldCheck } from 'lucide-react';
import Hero from './landing/Hero';
import SocialProofStrip from './landing/SocialProofStrip';
import BeforeAfter from './landing/BeforeAfter';
import HowItWorks from './landing/HowItWorks';
import InteractiveDemo from './landing/InteractiveDemo';
import TimeSavingsCalculator from './landing/TimeSavingsCalculator';
import Testimonials from './landing/Testimonials';
import Features from './landing/Features';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';

// Anchoring price shown on marketing sections (Hero, Pricing badge). Change
// here to update everywhere it's displayed. This is separate from the actual
// charged amount below (`price.amount`, fetched live from
// /api/payment/config = PRICE_AMOUNT env) which drives the real order/payment
// flow — keep these two in sync manually if the promo price changes.
const PRICE_ORIGINAL = 199000;
const PRICE_PROMO = 49000;

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

const PRICING_CHECKLIST = [
  'Input transaksi via suara & foto struk (AI)',
  'Multi-pocket & rekening tanpa batas',
  'Budgeting & reminder otomatis',
  'Laporan & riwayat lengkap',
  'Update fitur baru selamanya',
  'Support respon cepat via WhatsApp',
];

const PRICING_BONUSES = [
  { title: 'E-book "7 Kebiasaan Kecil Biar Nggak Boncos Akhir Bulan"', value: 'Rp99rb' },
  { title: 'Template kategori budgeting siap pakai', value: 'Rp75rb' },
  { title: 'Panduan pisah keuangan pribadi & usaha kecil', value: 'Rp76rb' },
];

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

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B111E] text-on-surface font-body-md overflow-x-hidden">
      <Hero
        priceOriginal={PRICE_ORIGINAL}
        pricePromo={PRICE_PROMO}
        formatCurrency={formatCurrency}
        onCtaClick={scrollToPricing}
      />
      <SocialProofStrip />
      <BeforeAfter />
      <HowItWorks />
      <InteractiveDemo onCtaClick={scrollToPricing} />
      <TimeSavingsCalculator />
      <Testimonials />
      <Features />

      <section id="pricing" className="w-full px-6 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="max-w-md mx-auto flex flex-col items-center gap-8 z-10 relative">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
              🔥 Promo Peluncuran — Hemat 75%
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg text-on-surface-variant/60 line-through">{formatCurrency(PRICE_ORIGINAL)}</span>
              <span className="text-4xl font-bold text-white">{formatCurrency(PRICE_PROMO)}</span>
            </div>
            <p className="text-sm text-on-surface-variant">akses selamanya (bukan langganan bulanan)</p>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {PRICING_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-on-surface-variant">{item}</span>
              </div>
            ))}
          </div>

          <div className="w-full bg-surface-variant/30 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <p className="text-xs font-label-caps uppercase tracking-wider text-primary/80">
                Bonus (senilai Rp250.000, GRATIS hari ini)
              </p>
            </div>
            {PRICING_BONUSES.map((bonus, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant">{bonus.title}</span>
                <span className="text-xs text-on-surface-variant/50 shrink-0">({bonus.value})</span>
              </div>
            ))}
          </div>

          {/* ===== Form pendaftaran + pembayaran (logic tidak diubah, cuma direposisi ke sini) ===== */}

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

          <div className="w-full flex items-center justify-center gap-2 text-on-surface-variant/60">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs">Garansi 3 Hari — Uang kembali 50% kalau nggak cocok</span>
          </div>
          <p className="text-[10px] text-on-surface-variant/40 text-center uppercase tracking-wider">
            Pembayaran dikonfirmasi manual oleh admin dalam waktu 24 jam.
          </p>
        </div>
      </section>

      <FAQ />
      <Footer />
    </div>
  );
}
