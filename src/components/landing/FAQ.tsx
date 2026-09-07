import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// landing-page-revisi Task 4 — 15 Q&A, verbatim content from the prompt
// (wording tidied for consistent phrasing/punctuation only — no claim
// added, removed, or changed).
const FAQS = [
  {
    question: 'Aman gak data keuangan saya di KantongKu?',
    answer: 'Server milik sendiri, nyala 24 jam, bukan cloud pihak ketiga. Data tidak dibagikan ke pihak manapun.',
  },
  {
    question: 'Ini aplikasi berlangganan atau sekali bayar?',
    answer: 'Sekali bayar, langsung pakai selamanya, tanpa biaya bulanan.',
  },
  {
    question: 'Kalau saya beli terus ternyata gak cocok, gimana?',
    answer: 'Ada garansi uang kembali dalam 3 hari.',
  },
  {
    question: 'Siapa yang bisa lihat data transaksi saya?',
    answer: 'Tidak ada, termasuk pemilik aplikasi sendiri tidak bisa melihat data pengguna.',
  },
  {
    question: 'Login-nya aman gak?',
    answer: 'Aman, pakai verifikasi dua langkah (2FA) via Google Authenticator.',
  },
  {
    question: 'Cara paling cepat catat transaksi gimana?',
    answer: 'Foto struk belanja, AI langsung catat otomatis.',
  },
  {
    question: 'Bisa catat transaksi pakai suara?',
    answer: 'Bisa, tinggal dikte lewat suara, AI yang memproses jadi catatan transaksi.',
  },
  {
    question: 'Apa itu Analisis Kesehatan Keuangan AI?',
    answer: 'Fitur yang menganalisis rasio cicilan/utang, menabung, dan likuiditas keuanganmu, lalu kasih penilaian dan saran.',
  },
  {
    question: 'Bisa diingetin soal cicilan/tagihan?',
    answer: 'Bisa, lewat fitur Kelola Cicilan/Hutang yang otomatis mengingatkan sebelum jatuh tempo.',
  },
  {
    question: 'Bisa pisahin uang usaha dan pribadi?',
    answer: 'Bisa, KantongKu punya kantong terpisah untuk pribadi, bisnis, dan titipan.',
  },
  {
    question: 'Bisa export laporan keuangan?',
    answer: 'Bisa, transaksi bisa di-export untuk kebutuhan pelaporan ke pihak lain.',
  },
  {
    question: 'Bisa dipakai bareng pasangan atau tim?',
    answer: 'Bisa, lewat fitur Kantong Bersama (fitur kolaborator ini berbayar terpisah dari lisensi utama).',
  },
  {
    question: 'Ada mode gelap/terang?',
    answer: 'Ada, toggle Mode Terang/Gelap asli di pengaturan aplikasi.',
  },
  {
    question: 'Bayarnya pakai apa?',
    answer: 'Pembayaran lewat Doku, konfirmasi otomatis setelah bayar.',
  },
  {
    question: 'Kalau ada masalah/bug, saya hubungi siapa?',
    answer: 'Ada kolom bantuan/support di dalam aplikasi, tim merespons dalam 1x24 jam — bukan aplikasi yang ditinggal setelah dibeli.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full px-6 py-16 bg-landing-surface/15 border-y border-landing-text/10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-landing-text text-center">FAQ</h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="bg-landing-bg border border-landing-text/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-landing-text">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-landing-text/60 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-landing-text/70 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
