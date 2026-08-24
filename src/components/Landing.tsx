import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, ArrowRight, CheckCircle2, Loader2, Copy, Check, ShieldCheck, QrCode } from 'lucide-react';
import Hero from './landing/Hero';
import SocialProofStrip from './landing/SocialProofStrip';
import BeforeAfter from './landing/BeforeAfter';
import HowItWorks from './landing/HowItWorks';
import TimeSavingsCalculator from './landing/TimeSavingsCalculator';
import Testimonials from './landing/Testimonials';
import Features from './landing/Features';
import ValueStack from './landing/ValueStack';
import UpdateForever from './landing/UpdateForever';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';
import QrisImage from './QrisImage';

// Anchoring price shown on marketing sections (Hero, Pricing badge). Change
// here to update everywhere it's displayed. This is separate from the actual
// charged amount below (`price.amount`, fetched live from
// /api/payment/config = PRICE_AMOUNT env) which drives the real order/payment
// flow — keep these two in sync manually if the promo price changes.
const PRICE_ORIGINAL = 399000;
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
}

type Step = 'form' | 'paying' | 'success' | 'expired' | 'error';

// Marketing attribution captured from the landing URL on first load, kept in
// sessionStorage (survives reload/scroll, cleared when the tab closes) so
// it's still around by the time the user actually submits the order form.
const UTM_STORAGE_KEY = 'kantongku_utm';
const UTM_PARAM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const;

function captureUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const captured: Record<string, string> = {};
  let hasAny = false;
  UTM_PARAM_KEYS.forEach((key) => {
    const val = params.get(key);
    if (val) {
      captured[key] = val;
      hasAny = true;
    }
  });
  // Only overwrite what's already stored if this load actually carried new UTM
  // params — a plain reload/in-app navigation with a clean URL shouldn't erase
  // attribution captured from the ad click that brought the user here earlier
  // in the same session.
  if (hasAny) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
    } catch {
      // sessionStorage unavailable (private mode, etc.) — attribution is
      // best-effort, never block the page over it.
    }
  }
}

function readStoredUtmParams(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Facebook's own Pixel-set cookies (_fbp always, _fbc only if the user arrived
// via an fbclid link) — plain browser cookies, no library needed to read them.
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const PRICING_CHECKLIST = [
  'Input transaksi via suara & foto struk (AI)',
  'Multi-pocket & rekening tanpa batas',
  'Budgeting & reminder otomatis',
  'Laporan & riwayat lengkap',
  'Update fitur baru selamanya',
  'Support respon cepat via WhatsApp',
];

// Task 2: satu-satunya metode pembayaran sekarang adalah QRIS statis —
// tidak ada lagi pilihan channel di UI (Doku dan Transfer BCA manual sudah
// dihapus total). Backend (createOrderRecord di server.ts) masih menerima
// `channel` sebagai parameter wajib untuk data order — nilai ini dikirim
// diam-diam, bukan pilihan user.
const DEFAULT_CHANNEL: Channel = 'qris_shopee';

export default function Landing() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

  // Capture utm_source/medium/campaign/content/term + fbclid from the URL as
  // soon as the landing page loads — before the user scrolls down and fills
  // the order form — so they're available to send along with the order later.
  useEffect(() => {
    captureUtmParams();
  }, []);

  // Fire-and-forget page view tracking for the Admin Console's Analytics tab —
  // never awaited, never blocks/affects the landing page render either way.
  useEffect(() => {
    const utm = readStoredUtmParams();
    fetch('/api/track/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
      }),
    }).catch(() => {
      // Analytics is best-effort — never surface this to the visitor.
    });
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Once settlement is confirmed, auto-redirect to the login page after a
  // short delay so the "Pembayaran dikonfirmasi!" message is actually seen.
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
      const utm = readStoredUtmParams();
      const createRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          channel: DEFAULT_CHANNEL,
          utm_source: utm.utm_source,
          utm_medium: utm.utm_medium,
          utm_campaign: utm.utm_campaign,
          utm_content: utm.utm_content,
          utm_term: utm.utm_term,
          fbclid: utm.fbclid,
          fbp: readCookie('_fbp'),
          fbc: readCookie('_fbc'),
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Gagal membuat order pembayaran');
      }

      // eventID must match the server-side CAPI "Lead" event's event_id
      // (= order_code) exactly, so Meta dedups the two into a single event
      // instead of double-counting it. Fires only if the Pixel was actually
      // initialized (VITE_META_PIXEL_ID set) — see src/main.tsx.
      if (window.fbq) {
        window.fbq('track', 'Lead', { value: createData.total_amount, currency: 'IDR' }, { eventID: createData.order_code });
      } else {
        // Silently no-op-ing here (via `window.fbq?.(...)`) is exactly how a
        // missing/unbuilt VITE_META_PIXEL_ID goes unnoticed — the only symptom
        // is Meta Events Manager showing an auto-detected "Lead" (cs_est: true,
        // no order data) instead of this explicit one. Log it loudly instead.
        console.error('[Meta Pixel] window.fbq belum siap — event "Lead" TIDAK terkirim. Cek VITE_META_PIXEL_ID sudah di-set saat build.');
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
      <TimeSavingsCalculator />
      <Features />
      <ValueStack />
      <Testimonials />
      <UpdateForever />

      <section id="pricing" className="w-full px-6 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="max-w-md mx-auto flex flex-col items-center gap-8 z-10 relative">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
              🔥 Harga Promo — Hemat {Math.round(((PRICE_ORIGINAL - PRICE_PROMO) / PRICE_ORIGINAL) * 100)}%, Segera Ambil!
            </span>
            <div className="flex flex-col items-center">
              <span className="text-lg text-on-surface-variant/60 line-through">{formatCurrency(PRICE_ORIGINAL)}</span>
              <span className="text-4xl font-bold text-white">{formatCurrency(PRICE_PROMO)}</span>
            </div>
            <p className="text-sm text-on-surface-variant">akses selamanya (bukan langganan bulanan) — harga promo, sewaktu-waktu bisa naik</p>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {PRICING_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-on-surface-variant">{item}</span>
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

              <div className="flex items-center gap-2 text-xs text-on-surface-variant/60 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <QrCode className="w-4 h-4 text-primary shrink-0" />
                <span>Bayar pakai QRIS — scan pakai aplikasi apa saja (GoPay, OVO, DANA, m-banking, dll), langsung muncul di halaman berikutnya.</span>
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
              </div>

              {/* Task 2: satu-satunya jalur pembayaran — QRIS statis + kode
                  unik, dikonfirmasi manual oleh admin lewat Admin Console
                  setelah mencocokkan mutasi. Fixed after live prod test: a
                  small fixed-size QR was too small for a phone camera to
                  focus/scan reliably — QrisImage renders it bigger inline
                  AND offers a genuine full-screen view via tap or the
                  button underneath. */}
              <QrisImage src={order.qrImage} boxClassName="max-w-[340px]" />
              <div className="w-full flex flex-col items-center gap-3">
                <p className="text-xs text-on-surface-variant/60 text-center max-w-xs">
                  Scan pakai aplikasi apa saja yang mendukung QRIS (GoPay, OVO, DANA, ShopeePay, m-banking, dll) — pastikan nominalnya <b>persis sama</b> sampai 3 digit terakhir (kode unik), lalu tunggu konfirmasi.
                </p>
              </div>

              <div className="flex items-center gap-2 text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Menunggu konfirmasi admin (order {order.order_code})...</p>
              </div>
              <p className="text-xs text-on-surface-variant/50">
                Order ini berlaku 24 jam. Halaman ini otomatis update begitu pembayaran dikonfirmasi admin.
              </p>

              <a
                href="/app"
                className="w-full h-12 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all border border-white/10 bg-surface-variant/40 text-white"
              >
                Masuk ke Halaman Login
              </a>
              <p className="text-xs text-on-surface-variant/50">
                Link untuk masuk ke aplikasi juga akan dikirimkan ke email kamu setelah pembayaran dikonfirmasi.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="text-white font-headline-sm">Pembayaran dikonfirmasi!</p>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Mengalihkan ke halaman login...</p>
              </div>
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
            <span className="text-xs">Garansi 3 Hari — Uang kembali 100% kalau nggak cocok</span>
          </div>
          <p className="text-[10px] text-on-surface-variant/40 text-center uppercase tracking-wider">
            Pembayaran dikonfirmasi manual oleh admin — biasanya dalam hitungan menit.
          </p>
        </div>
      </section>

      <FAQ />
      <Footer />
    </div>
  );
}
