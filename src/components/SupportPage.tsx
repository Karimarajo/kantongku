import React, { useState } from 'react';
import { User, Mail, MessageSquare, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import BrandLogo from './BrandLogo';

const CATEGORIES = ['Pertanyaan', 'Saran', 'Keluhan', 'Laporan Bug', 'Lainnya'] as const;

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Pertanyaan');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

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
    if (!message.trim()) {
      setError('Harap isi pesan Anda');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim pesan');
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B111E] text-on-surface font-body-md px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-8 z-10 relative">
        <a href="/" className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-white transition-colors w-fit">
          <ChevronLeft className="w-4 h-4" /> Kembali ke Beranda
        </a>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 p-3 bg-surface-variant/40 rounded-2xl border border-white/5 flex items-center justify-center">
            <BrandLogo className="w-10 h-10" glow={false} />
          </div>
          <h1 className="font-headline-md text-2xl text-primary font-bold tracking-tight">Customer Support</h1>
          <p className="text-sm text-on-surface-variant max-w-sm">
            Ada pertanyaan, saran, keluhan, atau nemu bug? Sampaikan di sini, tim kami akan merespons secepatnya.
          </p>
        </div>

        {sent ? (
          <div className="w-full bg-surface-variant/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <p className="text-white font-headline-sm">Pesan Anda terkirim!</p>
            <p className="text-sm text-on-surface-variant">
              Terima kasih sudah menghubungi kami. Kami akan membalas ke email <span className="text-white font-semibold">{email}</span> secepatnya.
            </p>
            <a
              href="/"
              className="mt-2 h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all bg-primary text-on-primary font-semibold text-sm"
            >
              Kembali ke Beranda
            </a>
          </div>
        ) : (
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
                  onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                  className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
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
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  className="w-full h-14 bg-surface-variant/40 border border-white/10 rounded-xl px-12 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-primary/80 tracking-wider">Kategori</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`h-10 rounded-xl border text-xs font-semibold transition-all ${category === c ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-surface-variant/40 text-on-surface-variant hover:text-white'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-label-caps text-primary/80 tracking-wider">Pesan</label>
              <div className="relative flex items-start">
                <span className="absolute left-4 top-4 text-on-surface-variant/60">
                  <MessageSquare className="w-5 h-5" />
                </span>
                <textarea
                  placeholder="Tulis pesan Anda di sini..."
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); if (error) setError(''); }}
                  rows={5}
                  className="w-full bg-surface-variant/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            {error && (
              <span className="text-xs text-rose-400 block px-1 border border-rose-500/10 p-2 rounded-lg bg-rose-500/5 text-center">
                {error}
              </span>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 font-headline-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-md mt-2 bg-primary text-on-primary disabled:opacity-50"
            >
              {loading ? 'Mengirim...' : 'Kirim Pesan'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
