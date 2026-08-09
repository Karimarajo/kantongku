import React from 'react';
import { Quote } from 'lucide-react';

{/* TESTIMONI PLACEHOLDER - FIKTIF, ganti dengan testimoni asli sebelum go-live publik */}
const TESTIMONIALS = [
  {
    name: 'Dinda',
    role: 'Ibu rumah tangga, Bandung',
    quote:
      'Dulu sering lupa catat jajan anak-anak, sekarang tinggal ngomong doang. Akhir bulan baru sadar bocor duit paling banyak di jajan online, langsung saya rem.',
  },
  {
    name: 'Bagus',
    role: 'Pemilik warung kelontong, Yogyakarta',
    quote:
      'Saya pisahin uang warung sama uang pribadi pakai pocket yang beda. Sekarang jelas mana untung warung, mana duit sendiri. Nggak nyampur lagi kayak dulu.',
  },
  {
    name: 'Ayu',
    role: 'Freelancer, Jakarta',
    quote:
      'Suka banget fitur foto struk-nya, tinggal jepret abis belanja bulanan, semua item otomatis kecatat per kategori. Ngirit waktu banget.',
  },
];

export default function Testimonials() {
  return (
    <section className="w-full px-6 py-16">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Apa Kata Mereka</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="flex flex-col gap-3 bg-surface-variant/30 border border-white/10 rounded-2xl p-6">
              <Quote className="w-6 h-6 text-primary/60" />
              <p className="text-sm text-on-surface-variant leading-relaxed flex-grow">"{t.quote}"</p>
              <div className="pt-3 border-t border-white/5">
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs text-on-surface-variant/60">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
