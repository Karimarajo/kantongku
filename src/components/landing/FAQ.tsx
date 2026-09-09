import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Revisi (prompt final) — 16 Q&A, verbatim content dari task, urutan tetap.
const FAQS = [
  {
    question: 'Aman gak data keuangan saya di KantongKu?',
    answer: 'Aman, dibangun dengan standar keamanan ketat dan tersertifikasi, data gak dibagikan ke pihak manapun.',
  },
  {
    question: 'Ini aplikasi berlangganan atau sekali bayar?',
    answer: 'Sekali bayar, langsung pakai selamanya, gak ada biaya bulanan.',
  },
  {
    question: 'Kalau saya beli terus gak cocok, gimana?',
    answer: 'Ada garansi uang kembali 3 hari.',
  },
  {
    question: 'Siapa yang bisa lihat data transaksi saya?',
    answer: 'Gak ada, termasuk pemilik aplikasi sendiri.',
  },
  {
    question: 'Login-nya aman gak?',
    answer: 'Aman, pakai verifikasi dua langkah via Google Authenticator.',
  },
  {
    question: 'Cara paling cepat catat transaksi gimana?',
    answer: 'Foto struk, AI langsung catat otomatis, kurang dari 1 menit.',
  },
  {
    question: 'Bisa catat transaksi pakai suara?',
    answer: 'Bisa, tinggal dikte lewat suara.',
  },
  {
    question: 'Apa itu Analisis Kesehatan Keuangan AI?',
    answer: 'Menganalisis rasio cicilan, menabung, dan likuiditas kamu, kasih saran juga.',
  },
  {
    question: 'Bisa diingetin soal cicilan/tagihan?',
    answer: 'Bisa, ada fitur Kelola Cicilan/Hutang.',
  },
  {
    question: 'Bisa pantau pengeluaran PayLater atau kartu kredit?',
    answer: 'Bisa.',
  },
  {
    question: 'Bisa pisahin uang usaha dan pribadi?',
    answer: 'Bisa.',
  },
  {
    question: 'Bisa export laporan keuangan?',
    answer: 'Bisa.',
  },
  {
    question: 'Bisa dipakai bareng pasangan atau tim?',
    answer: 'Bisa, lewat fitur Kantong Bersama.',
  },
  {
    question: 'Ada mode gelap/terang?',
    answer: 'Ada, toggle asli di pengaturan.',
  },
  {
    question: 'Bayarnya pakai apa?',
    answer: 'Doku, dikonfirmasi otomatis.',
  },
  {
    question: 'Kalau ada masalah/bug, saya hubungi siapa?',
    answer: 'Ada kolom bantuan di app, tim merespons 1x24 jam.',
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
