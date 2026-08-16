import React, { useState } from 'react';
import { HeartPulse, Loader, AlertTriangle, Sparkles } from 'lucide-react';

interface RatioResult {
  percent?: number;
  multiplier?: number | null;
  healthyThreshold: string;
}

interface FinancialHealthResult {
  category: 'Sehat' | 'Cukup Sehat' | 'Perlu Perhatian';
  ratios: {
    debt: RatioResult;
    savings: RatioResult;
    liquidity: RatioResult;
  };
  narrative: string;
  suggestions: string[];
  aiUnavailable?: boolean;
}

const CATEGORY_STYLE: Record<FinancialHealthResult['category'], { badge: string; dot: string }> = {
  'Sehat': { badge: 'bg-primary/15 border-primary/30 text-primary', dot: 'bg-primary' },
  'Cukup Sehat': { badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' },
  'Perlu Perhatian': { badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300', dot: 'bg-rose-400' },
};

interface FinancialHealthCardProps {
  // Revisi: tombol ini sekarang hidup di halaman Riwayat Transaksi dan
  // memakai rentang tanggal yang SAMA dengan filter tanggal halaman itu
  // (dateFrom/dateTo), bukan date picker terpisah lagi — kalau kedua-duanya
  // kosong (user belum set filter tanggal), endpoint sendiri sudah default
  // ke 1 bulan terakhir. Filter LAIN di halaman itu (kategori/kantong/
  // wallet/tipe) SENGAJA tidak ikut dikirim — rasio kesehatan keuangan perlu
  // total pemasukan/pengeluaran/cicilan APA ADANYA, bukan subset satu
  // kategori, atau hasilnya jadi tidak bermakna.
  startDate?: string;
  endDate?: string;
}

// cicilan-ai-notifikasi Task 4, direvisi ke halaman Riwayat Transaksi —
// tombol "Analisis Kesehatan Keuangan" (revisi: satu-satunya tombol analisis
// di halaman ini sekarang — tombol lama "Kirim Analisis Laporan" export-WA
// sudah dihapus). Real-time only (lihat catatan keputusan
// di server.ts), panggilan AI best-effort: kegagalan tampil sebagai pesan
// jelas, tidak pernah bikin halaman ini crash.
export default function FinancialHealthCard({ startDate, endDate }: FinancialHealthCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FinancialHealthResult | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/analysis/financial-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menganalisis kesehatan keuangan');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Gagal menganalisis kesehatan keuangan. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-xs font-label-caps uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading ? <Loader className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
        {loading ? 'Menganalisis...' : 'Analisis Kesehatan Keuangan'}
      </button>
      {(startDate || endDate) && (
        <p className="text-[10px] text-on-surface-variant/50 -mt-1 px-1">
          Memakai rentang tanggal dari filter di atas{startDate ? ` (${startDate}` : ''}{endDate ? ` s/d ${endDate})` : startDate ? ')' : ''}.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 p-4 glass-card rounded-xl border border-white/5">
          <div className={`self-start flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${CATEGORY_STYLE[result.category].badge}`}>
            <span className={`w-2 h-2 rounded-full ${CATEGORY_STYLE[result.category].dot}`} />
            {result.category}
          </div>

          {result.aiUnavailable && (
            <p className="text-[11px] text-amber-300/80 -mt-2">⚠️ Narasi AI tidak tersedia saat ini — kategori di atas dihitung langsung dari ambang batas rasio.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-0.5">
              <span className="text-[10px] text-on-surface-variant/70 font-label-caps uppercase">Cicilan/Utang</span>
              <span className="text-lg font-bold text-white font-mono-data">{result.ratios.debt.percent}%</span>
              <span className="text-[10px] text-on-surface-variant/50">sehat: {result.ratios.debt.healthyThreshold}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-0.5">
              <span className="text-[10px] text-on-surface-variant/70 font-label-caps uppercase">Menabung</span>
              <span className="text-lg font-bold text-white font-mono-data">{result.ratios.savings.percent}%</span>
              <span className="text-[10px] text-on-surface-variant/50">sehat: {result.ratios.savings.healthyThreshold}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-0.5">
              <span className="text-[10px] text-on-surface-variant/70 font-label-caps uppercase">Likuiditas</span>
              <span className="text-lg font-bold text-white font-mono-data">{result.ratios.liquidity.multiplier !== null ? `${result.ratios.liquidity.multiplier}x` : '—'}</span>
              <span className="text-[10px] text-on-surface-variant/50">sehat: {result.ratios.liquidity.healthyThreshold}</span>
            </div>
          </div>

          {result.narrative && (
            <p className="text-sm text-on-surface-variant leading-relaxed">{result.narrative}</p>
          )}

          {result.suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-label-caps text-primary uppercase flex items-center gap-1"><Sparkles className="w-3 h-3" /> Saran</span>
              <ul className="flex flex-col gap-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-on-surface-variant flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-on-surface-variant/40">Hasil ini hanya terlihat oleh Anda (dan kolaborator jika ada) — tidak dibagikan ke pihak luar.</p>
        </div>
      )}
    </div>
  );
}
