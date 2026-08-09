import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    question: 'Apakah data keuangan saya aman?',
    answer:
      'Data tersimpan di server pribadi (bukan dibagikan ke pihak ketiga), login pakai Google jadi tidak ada password tambahan yang bisa dibobol.',
  },
  {
    question: 'Bisa dipakai di berapa device?',
    answer:
      'Satu akun aktif di satu device dalam satu waktu — kalau login di HP baru, sesi lama otomatis logout demi keamanan.',
  },
  {
    question: 'Cocok buat usaha kecil, bukan cuma pribadi?',
    answer: 'Cocok — fitur multi-pocket bisa dipakai pisahin uang usaha dan uang pribadi.',
  },
  {
    question: 'Kalau nggak puas gimana?',
    answer: 'Ada garansi uang kembali 50% dalam 3 hari pertama.',
  },
  {
    question: 'Perlu langganan bulanan?',
    answer: 'Tidak — sekali bayar, akses selamanya termasuk update fitur baru.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full px-6 py-16 bg-surface-variant/20 border-y border-white/5">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">FAQ</h2>
        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="bg-[#0B111E] border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-primary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-on-surface-variant leading-relaxed">{item.answer}</p>
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
