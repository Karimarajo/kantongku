import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Revisi (build ulang) — 4 screenshot WhatsApp ASLI dari pengguna nyata,
// sudah ditaruh owner di public/testimonials/testi-1.png s/d testi-4.png
// (ditampilkan apa adanya, bukan direkreasi/didesain ulang). `quote` di
// bawah HANYA dipakai sebagai alt text gambar & teks fallback kalau
// filenya gagal dimuat — bukan lagi konten utama yang ditampilkan.
const TESTIMONIALS = [
  { src: '/testimonials/testi-1.png', quote: 'Fitur export laporan keuangannya kepake banget buat lapor ke pimpinan.' },
  { src: '/testimonials/testi-2.png', quote: 'Setelah sebulan pemakaian, jadi salah satu apps andalan buat tau kondisi keuangan sendiri.' },
  { src: '/testimonials/testi-3.png', quote: 'Worth it banget dengan harga segini, apalagi fitur catat pakai suara, AI-nya beneran ngebantu.' },
  { src: '/testimonials/testi-4.png', quote: 'Sekali bayar doang, akses selamanya, murah banget dibanding app lain yang langganan bulanan.' },
];

// Frame ukuran EKSPLISIT dalam pixel (poin 15, revisi sebelumnya) — dulu
// ditebak 260x360 (rasio 0.72) sebelum aset asli ada; sekarang 4 file asli
// sudah ditaruh owner, dimensi aslinya rata-rata 1179x1270 (rasio ~0.9),
// framenya disesuaikan ke 260x300 (rasio 0.87) mendekati itu. Revisi lagi:
// object-contain (bukan object-cover) di bawah — screenshot ditampilkan
// UTUH tanpa terpotong, kalau rasionya tidak pas persis sisanya cuma
// letterbox kosong (background sama dengan card, bg-landing-bg), bukan
// bagian percakapan yang hilang.
const TESTIMONIAL_IMAGE_WIDTH_PX = 260;
const TESTIMONIAL_IMAGE_HEIGHT_PX = 300;

function TestimonialCard({ src, quote }: { src: string; quote: string }) {
  // Fallback ke placeholder kalau file belum ditaruh owner di public/
  // testimonials/ atau gagal dimuat — supaya tidak nampilkan ikon broken
  // image ke pengunjung.
  const [failed, setFailed] = useState(false);

  return (
    <div
      style={{ width: TESTIMONIAL_IMAGE_WIDTH_PX, height: TESTIMONIAL_IMAGE_HEIGHT_PX, maxWidth: '100%' }}
      className="mx-auto rounded-2xl border border-landing-text/10 shadow-sm overflow-hidden bg-landing-bg"
    >
      {failed ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 border border-dashed border-landing-text/20">
          <ImageOff className="w-6 h-6 text-landing-text/30" />
          <p className="text-[10px] text-landing-text/50 px-4 text-center leading-relaxed">&ldquo;{quote}&rdquo;</p>
        </div>
      ) : (
        <img
          src={src}
          alt={quote}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="w-full py-16 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">Apa Kata Mereka</h2>
          <p className="text-sm text-landing-text/70 max-w-md">
            Testimoni asli dari pengguna KantongKu, langsung dari chat WhatsApp mereka.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={i} src={t.src} quote={t.quote} />
          ))}
        </div>
      </div>
    </section>
  );
}
