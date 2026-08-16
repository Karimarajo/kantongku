import React from 'react';
import { Quote } from 'lucide-react';

// Landing-page-revamp Task 4 — 10 testimoni ILUSTRATIF, format aman secara
// etik iklan: nama depan/inisial + profesi + kota, TANPA foto wajah yang
// mengklaim itu orang sungguhan (avatar generik berupa inisial + warna, no
// image asset at all — lebih aman daripada stok foto apa pun). Section ini
// menggantikan versi lama yang sempat pakai foto (Dinda.png/Bambang.png/
// Ayu.png) atas nama orang "sungguhan" — persis pola yang prompt ini minta
// dihindari, jadi sekalian diperbaiki di sini.
const TESTIMONIALS = [
  {
    name: 'Rani',
    role: 'Karyawan Swasta — Bandung',
    quote: 'Gajian awal bulan, tanggal 20 udah bingung duitnya ke mana. Sebulan pakai KantongKu baru ketahuan jajan kopi sama ojol ternyata paling boros.',
  },
  {
    name: 'Budi',
    role: 'Pemilik Warung Kelontong — Yogyakarta',
    quote: 'Dulu uang warung sama uang buat dapur sendiri nyampur di satu dompet. Sekarang dipisah per kantong, baru kelihatan warung ini untung apa cuma muter doang.',
  },
  {
    name: 'Sari',
    role: 'Mahasiswa — Malang',
    quote: 'Niat nabung buat beli laptop tiap bulan selalu gagal karena nggak kelihatan progresnya. Sekarang ada target nabung, jadi kelihatan udah sejauh mana.',
  },
  {
    name: 'A & W',
    role: 'Pasangan Muda — Surabaya',
    quote: 'Kita berdua kerja tapi keuangan rumah tangga tetap dipegang berdua. Fitur kolaborasinya bikin dua-duanya bisa lihat & catat transaksi yang sama tanpa harus lapor manual.',
  },
  {
    name: 'Dewi',
    role: 'Ibu Rumah Tangga — Semarang',
    quote: 'Paling sering kelewat bayar cicilan motor karena lupa tanggal. Sekarang ada pengingat otomatis tiap mendekati jatuh tempo, jadi nggak kena denda lagi.',
  },
  {
    name: 'Rizal',
    role: 'Freelancer Desainer — Jakarta',
    quote: 'Penghasilan naik turun tiap bulan, susah nilai sendiri keuangan lagi sehat apa nggak. Analisis kesehatan keuangannya kasih gambaran jelas, bukan cuma angka doang.',
  },
  {
    name: 'Made',
    role: 'PNS — Denpasar',
    quote: 'Gaji bulanan yang katanya cukup selalu abis duluan sebelum akhir bulan. Setelah dicatat rutin, ternyata jajan online yang paling banyak bocor, langsung saya rem.',
  },
  {
    name: 'Farah',
    role: 'Pelajar — Bekasi',
    quote: 'Uang jajan dari orang tua suka lupa dicatat karena males ribet. Sekarang tinggal foto struk minimarket, otomatis kecatat, nggak perlu ketik manual.',
  },
  {
    name: 'Hendra',
    role: 'Pemilik UMKM Kuliner — Medan',
    quote: 'Tiap pelanggan mau transfer, saya harus ketik ulang nomor rekening satu-satu. Sekarang tinggal salin sekali klik dari aplikasi, jauh lebih cepat.',
  },
  {
    name: 'Nadia',
    role: 'Karyawan Swasta — Depok',
    quote: 'Awalnya ragu soal privasi data keuangan. Ternyata hasil analisisnya cuma bisa saya lihat sendiri, dan sekarang jadi lebih tenang karena tahu kondisi keuangan sendiri jelas.',
  },
];

// Deterministic avatar color per index (Tailwind-safe fixed classes, no
// dynamic class-name construction) — purely a colored initial badge, never
// an image, so there's no risk of it reading as a real person's photo.
const AVATAR_COLORS = [
  'bg-primary/15 text-primary border-primary/30',
  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'bg-violet-500/15 text-violet-300 border-violet-500/30',
];

function TestimonialCard({ t, index }: { t: (typeof TESTIMONIALS)[number]; index: number }) {
  const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className="w-[85vw] max-w-[300px] sm:w-[300px] shrink-0 flex flex-col gap-3 bg-surface-variant/30 border border-white/10 rounded-2xl p-6">
      <Quote className="w-6 h-6 text-primary/60" />
      <p className="text-sm text-on-surface-variant leading-relaxed flex-grow">&ldquo;{t.quote}&rdquo;</p>
      <div className="pt-3 border-t border-white/5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${colorClass}`}>
          {t.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{t.name}</p>
          <p className="text-xs text-on-surface-variant/60">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  // Marquee track = daftar dirender 2x berurutan, animasi geser -50% supaya
  // loop-nya mulus tanpa "lompat" — murni CSS keyframe, tanpa library baru.
  const track = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="w-full py-16">
      <style>{`
        @keyframes kantongku-testimonial-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div className="max-w-6xl mx-auto flex flex-col gap-2 px-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Apa Kata Mereka</h2>
        <p className="text-xs text-on-surface-variant/60 text-center italic">Ilustrasi pengalaman pengguna KantongKu</p>
      </div>

      <div className="w-full overflow-hidden mt-8 group">
        <div
          className="flex gap-5 w-max animate-[kantongku-testimonial-marquee_50s_linear_infinite] group-hover:[animation-play-state:paused]"
        >
          {track.map((t, i) => (
            <TestimonialCard key={i} t={t} index={i % TESTIMONIALS.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
