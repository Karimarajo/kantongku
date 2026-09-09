import React from 'react';
import { Sparkles, Code2 } from 'lucide-react';

// landing-page-revisi-2 Task 10 — new credibility/origin-story section.
// Revisi (reorganisasi 9-blok): sekarang jadi Blok 6 "About Us", posisinya
// setelah Testimonials dan sebelum FAQ (lihat Landing.tsx) — bukan lagi
// setelah ValueStack seperti komentar lama di atas.
export default function FounderStory() {
  return (
    <section className="w-full px-6 py-16 bg-landing-surface/20">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">
        <div className="w-12 h-12 rounded-full bg-landing-accent/20 border border-landing-accent/40 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-landing-text" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text">Tentang KantongKu</h2>
        <p className="text-sm sm:text-base text-landing-text/80 leading-relaxed max-w-xl">
          <strong className="font-bold">KantongKu</strong> dibangun oleh developer berpengalaman yang
          sebelumnya juga bikin <strong className="font-bold">KasirKu</strong>, sistem kasir yang sampai
          sekarang masih dipakai beberapa brand. Dengan fitur-fitur lengkapnya,{' '}
          <span className="text-landing-accent font-semibold">KantongKu bukan cuma buat nyatet</span>, tapi
          bantu kamu ambil keputusan keuangan dengan lebih bijak. Soal keamanan, kamu gak usah ragu,
          aplikasinya dibangun dengan standar keamanan yang{' '}
          <strong className="font-bold">ketat dan tersertifikasi</strong>, data kamu disimpan aman, bahkan
          kami sebagai pemilik aplikasi gak bisa lihat data kamu.
        </p>

        <div className="w-full flex flex-col sm:flex-row items-center gap-4 bg-landing-bg border border-landing-text/10 rounded-2xl p-6 mt-2">
          <div className="w-14 h-14 rounded-full bg-landing-text/10 flex items-center justify-center shrink-0">
            <Code2 className="w-6 h-6 text-landing-text" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-landing-text">Dibangun oleh Marajo Tech</p>
            <p className="text-xs sm:text-sm text-landing-text/70 leading-relaxed mt-1">
              Tim developer yang sama di balik KasirKu, sistem kasir yang masih dipakai berbagai brand.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
