import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import Header from './landing/Header';
import Hero from './landing/Hero';
import TrustBar from './landing/TrustBar';
import LiteracyGap from './landing/LiteracyGap';
import SocialProofStrip from './landing/SocialProofStrip';
import BeforeAfter from './landing/BeforeAfter';
import HowItWorks from './landing/HowItWorks';
import Testimonials from './landing/Testimonials';
import Features from './landing/Features';
import FounderStory from './landing/FounderStory';
import UpdateForever from './landing/UpdateForever';
import FAQ from './landing/FAQ';
import Footer from './landing/Footer';
import SocialProofToast from './landing/SocialProofToast';

type LandingTheme = 'light' | 'dark';
const LANDING_THEME_KEY = 'kantongku_landing_theme';

// landing-page-revisi-2 Task 3 — dark/light for the LANDING PAGE ONLY, a
// separate toggle from the authenticated app's own theme (see the
// --color-landing-* tokens in index.css). Priority: an explicit choice the
// visitor already made (localStorage) beats prefers-color-scheme, which
// beats a hardcoded default — the same precedence App.tsx's own theme
// bootstrap already uses.
function getInitialLandingTheme(): LandingTheme {
  try {
    const stored = localStorage.getItem(LANDING_THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage unavailable — fall through to media-query/default.
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// Task 9 (trial + landing revisi) — the registration form's own outcome
// states. Much simpler than the old order-flow's Step type (form -> paying
// -> success/expired/error, all moved verbatim to PaymentPage.tsx) since
// there's no payment/polling here anymore, just "submitted" or not.
type RegisterStep = 'form' | 'done';

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

// landing-page-revisi-2 Task 13 — 6 item lama + 4 tambahan (Analisis
// Kesehatan Keuangan AI, Kelola Cicilan/Hutang, Kolaborasi, Info Rekening),
// "via WhatsApp" dihapus dari item support. Task 9 — masih relevan sebagai
// daftar fitur di section "Daftar Gratis" (tidak menyebut harga sama sekali).
const FEATURE_CHECKLIST = [
  'Input transaksi via suara & foto struk (AI)',
  'Multi-pocket & rekening tanpa batas',
  'Budgeting & reminder otomatis',
  'Laporan & riwayat lengkap',
  'Update fitur baru selamanya',
  'Support respon cepat',
  'Analisis Kesehatan Keuangan AI',
  'Kelola Cicilan/Hutang',
  'Kolaborasi bareng pasangan/tim',
  'Simpan info rekening',
];

export default function Landing() {
  const [theme, setTheme] = useState<LandingTheme>(() => getInitialLandingTheme());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [registerMessage, setRegisterMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSupportLink, setShowSupportLink] = useState(false);

  // landing-page-revisi-2 Task 3 — persist the visitor's explicit choice.
  // The attribute itself lives on THIS component's own root element (see
  // the returned JSX below), not <html> — completely separate from the
  // authenticated app's [data-theme] on <html>, so it can never leak into
  // or fight the app's own theme, and vice versa.
  useEffect(() => {
    try {
      localStorage.setItem(LANDING_THEME_KEY, theme);
    } catch {
      // best-effort only
    }

    // <body> itself has its own background rule (`body { background-color:
    // var(--color-body-bg) }` in index.css) driven by the AUTHENTICATED
    // APP's own token, which stays at its dark default here since this
    // page deliberately never touches [data-theme] on <html> (see above).
    // The root div below covers the full viewport visually either way, but
    // devtools would still report document.body's OWN computed background
    // as that dark app default, not this page's actual (light or dark)
    // landing color — set it directly so an inspection of <body> itself
    // shows the real value, matching this page's current theme exactly.
    document.body.style.backgroundColor = theme === 'dark' ? '#0E141F' : '#F8FDF9';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Capture utm_source/medium/campaign/content/term + fbclid from the URL as
  // soon as the landing page loads — before the user scrolls down and fills
  // the order form — so they're available to send along with the order later.
  useEffect(() => {
    captureUtmParams();
  }, []);

  // Fire-and-forget page view tracking for the Admin Console's Analytics tab
  // — never awaited, never blocks/affects the landing page render either
  // way. Also carries `eventId` (set once in src/main.tsx, shared with the
  // fbq('track', 'PageView', ..., { eventID }) call already fired there) so
  // the server's Meta CAPI PageView call in server.ts dedupes against the
  // browser Pixel's PageView instead of double-counting it. `fbclid` ikut
  // dikirim supaya server bisa membentuk fallback cookie `_fbc` (format resmi
  // Meta) untuk pengunjung yang fbevents.js-nya diblokir ad-blocker/DNS
  // filter — lihat handler-nya di server.ts.
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
        fbclid: utm.fbclid,
        eventId: window.__metaPageviewEventId,
      }),
    }).catch(() => {
      // Analytics is best-effort — never surface this to the visitor.
    });
  }, []);

  // Task 9 (trial + landing revisi) — form pendaftaran ini sekarang memicu
  // POST /api/trial/register (Task 7), BUKAN /api/payment/create. Validasi
  // (nama/email/nomor WA) TIDAK berubah dari alur order lama. Tidak ada lagi
  // polling/Doku di sini — itu semua sudah pindah ke PaymentPage.tsx
  // (/bayar), dipakai nanti begitu trial habis.
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
    const whatsappDigits = whatsapp.replace(/[^0-9]/g, '');
    if (whatsappDigits.length < 9) {
      setError('Nomor WhatsApp tidak valid');
      return;
    }

    setError('');
    setShowSupportLink(false);
    setLoading(true);

    try {
      const utm = readStoredUtmParams();
      const registerRes = await fetch('/api/trial/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          whatsapp,
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
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        if (registerData.status === 'blocked') setShowSupportLink(true);
        throw new Error(registerData.error || 'Gagal mendaftar');
      }

      // Standard Meta event for a completed signup — deliberately NOT
      // "Lead" (that stays reserved for /bayar, an actual payment intent —
      // see PaymentPage.tsx) and NO value/currency (this isn't a
      // transaction). Same event_id (the new user's id) on both browser
      // Pixel and server CAPI so Meta dedupes them — see the matching
      // sendMetaCapiEvent("CompleteRegistration", user.id, ...) in server.ts.
      if (registerData.status === 'trial_started' && registerData.userId) {
        if (window.fbq) {
          window.fbq('track', 'CompleteRegistration', {}, { eventID: registerData.userId });
        } else {
          console.error('[Meta Pixel] window.fbq belum siap — event "CompleteRegistration" TIDAK terkirim. Cek VITE_META_PIXEL_ID sudah di-set saat build.');
        }
      }

      setRegisterMessage(registerData.message || 'Cek email kamu untuk link masuk ke aplikasi.');
      setRegisterStep('done');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRegisterStep('form');
    setRegisterMessage('');
    setError('');
    setShowSupportLink(false);
  };

  const scrollToDaftar = () => {
    document.getElementById('daftar')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div data-landing-theme={theme} className="min-h-screen bg-landing-bg text-landing-text font-body-md overflow-x-hidden">
      {/* Revisi (prompt 3, poin 6): notifikasi social proof pojok kiri
          bawah, posisi di JSX tidak penting (elemennya fixed). */}
      <SocialProofToast />

      {/* Task 9 (trial + landing revisi) — banner ini dulu menyebut "Harga
          Promo Terbatas", sekarang diganti ajakan coba gratis, konsisten
          dengan penghapusan semua elemen harga di landing page utama. */}
      <div className="w-full py-2 px-4 bg-landing-accent text-landing-on-accent text-center text-xs sm:text-sm font-bold uppercase tracking-wider">
        🔥 Coba KantongKu Gratis, Akses Penuh Langsung!
      </div>
      <Header theme={theme} onToggleTheme={toggleTheme} onCtaClick={scrollToDaftar} />

      {/* Revisi (reorganisasi 9-blok): Blok 1, Headline. */}
      <Hero theme={theme} onCtaClick={scrollToDaftar} />

      {/* Blok 2, Problem + Trust Bar. */}
      <section className="w-full px-6 py-10 bg-landing-bg">
        <p className="max-w-xl mx-auto text-center text-sm sm:text-base text-landing-text/80 leading-relaxed">
          Masalahnya, kita sering{' '}
          <span className="inline-block border-2 border-landing-accent rounded-full px-2.5 py-0.5">males</span>{' '}
          nyatet pengeluaran kecil. Yang keinget cuma yang gede kayak beli motor atau bayar cicilan, sementara{' '}
          <strong className="font-bold">jajan kopi, ojol, sama langganan aplikasi</strong> yang keliatannya
          receh, itu yang justru numpuk jadi bengkak tanpa disadari.
        </p>
      </section>
      <TrustBar />

      {/* Task 6 (trial+literacy-gap) — "kenapa ini penting" (Inclusion
          Literacy Gap) sebelum "cara kerja produk" (HowItWorks di bawah).
          Evergreen, tampil untuk semua traffic. */}
      <LiteracyGap />

      {/* Task 9 (trial + landing revisi), poin 1 — Features sekarang render
          SEBELUM HowItWorks (dulu sesudah). Paragraf intro + kemudahan di
          bawah TETAP menempel ke HowItWorks seperti sebelumnya, cuma
          posisinya ikut bergeser turun satu slot. */}
      <Features theme={theme} />

      {/* Blok 3, Solution/Services: intro -> How it Works -> Kemudahan. */}
      <section className="w-full px-6 py-10 bg-landing-bg">
        <p className="max-w-xl mx-auto text-center text-sm sm:text-base text-landing-text/80 leading-relaxed">
          Makanya, <strong className="font-bold">Marajo Tech</strong> bikin{' '}
          <span className="bg-landing-accent/40 rounded px-1.5 box-decoration-clone">KantongKu</span>. Bukan
          sekadar aplikasi buat nyatet keuangan, tapi bantu kamu kontrol keuangan pribadi kamu dengan baik.
        </p>
      </section>
      <HowItWorks />
      <section className="w-full px-6 py-10 bg-landing-bg">
        <p className="max-w-xl mx-auto text-center text-sm sm:text-base text-landing-text/80 leading-relaxed">
          <em className="italic">&ldquo;Males emang alasan utama orang gak nyatet keuangan.&rdquo;</em> Makanya
          di <strong className="font-bold">KantongKu</strong>, kamu cuma butuh waktu{' '}
          <span className="bg-landing-accent/40 rounded px-1.5 box-decoration-clone">kurang dari 1 menit</span>{' '}
          buat catat pengeluaran, tinggal ngomong atau foto struk aja, beres.
        </p>
      </section>

      {/* Blok 4, Proof/Portfolio. */}
      <BeforeAfter />

      {/* Blok 5, Proof/Testimonials. */}
      <SocialProofStrip />
      <Testimonials />

      {/* Blok 6, About Us. */}
      <FounderStory />

      {/* Blok 7, FAQ. */}
      <FAQ />

      {/* Task 9 (trial + landing revisi), poin 3 — <ValueStack /> (rincian
          harga vs value) DIHAPUS dari render di sini (file-nya TETAP ada di
          codebase, cuma tidak dipakai di landing page utama lagi). */}
      <UpdateForever />

      {/* Blok 8, Task 9 poin 4-5 — section ini dulu "Pricing & CTA" (form
          order + harga), sekarang jadi "Daftar Gratis" murni: id diganti
          dari "pricing" ke "daftar", form yang sama (nama/email/WA) memicu
          /api/trial/register (bukan /api/payment/create lagi), tombol
          "Bayar" -> "Daftar Gratis", tidak ada lagi tampilan harga/nominal
          di sini sama sekali. */}
      <section id="daftar" className="w-full px-6 py-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-landing-accent/20 blur-[120px]" />
        </div>

        <div className="max-w-md mx-auto flex flex-col items-center gap-8 z-10 relative">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-landing-on-accent bg-landing-accent rounded-full px-4 py-2">
              🔥 Coba Gratis Sekarang!
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">Daftar, Langsung Akses Penuh</h2>
            <p className="text-sm text-landing-text/70">Gak perlu bayar dulu buat mulai nyoba.</p>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {FEATURE_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-landing-text shrink-0" />
                <span className="text-sm text-landing-text/70">{item}</span>
              </div>
            ))}
          </div>

          {registerStep === 'form' && (
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
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-landing-text/50">
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
                    className="w-full h-14 bg-landing-surface/20 border border-landing-text/15 rounded-xl px-12 text-landing-text font-body-md placeholder:text-landing-text/40 focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent/60 transition-all duration-200"
                  />
                </div>
                <p className="text-xs text-landing-text/50 px-1">
                  Gunakan email yang sama saat login nanti.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-label-caps text-landing-text/70 tracking-wider">Nomor WhatsApp</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-landing-text/50">
                    <Phone className="w-5 h-5" />
                  </span>
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full h-14 bg-landing-surface/20 border border-landing-text/15 rounded-xl px-12 text-landing-text font-body-md placeholder:text-landing-text/40 focus:outline-none focus:border-landing-accent focus:ring-1 focus:ring-landing-accent/60 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-landing-text/60 bg-landing-text/5 border border-landing-text/10 rounded-xl px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-landing-text shrink-0" />
                <span>Link masuk otomatis dikirim ke email kamu.</span>
              </div>

              {error && (
                <div className="text-xs text-rose-600 flex flex-col gap-1 px-1 border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                  <span>{error}</span>
                  {showSupportLink && (
                    <a href="/support" className="underline font-semibold">
                      Hubungi Support
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-landing-accent text-landing-on-accent disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Daftar Gratis'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {registerStep === 'done' && (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              <Check className="w-12 h-12 text-landing-text" />
              <p className="text-landing-text font-headline-sm">{registerMessage}</p>
              <button
                onClick={handleReset}
                className="w-full h-12 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all border border-landing-text/15 bg-landing-surface/20 text-landing-text"
              >
                Daftar Email Lain
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Blok 9, Footer. */}
      <Footer />
    </div>
  );
}
