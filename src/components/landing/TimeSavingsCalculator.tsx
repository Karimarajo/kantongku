import React, { useState } from 'react';
import { Clock3 } from 'lucide-react';

export default function TimeSavingsCalculator() {
  const [transaksiPerHari, setTransaksiPerHari] = useState(5);
  const [menitPerTransaksi, setMenitPerTransaksi] = useState(4);

  const totalMenitPerBulan = transaksiPerHari * menitPerTransaksi * 30;
  const totalJamPerBulan = Math.round((totalMenitPerBulan / 60) * 10) / 10;

  let contextSentence: string;
  if (totalJamPerBulan < 5) {
    contextSentence =
      'Lumayan — itu udah cukup buat nonton beberapa episode drama favoritmu tanpa mikirin nyatet manual.';
  } else if (totalJamPerBulan >= 15) {
    contextSentence =
      'Itu setara sehari penuh waktu luang yang bisa kamu pakai buat hal lain, bukan buat ngetik manual.';
  } else {
    contextSentence = `Dengan ${transaksiPerHari} transaksi/hari, kamu hemat ±${totalJamPerBulan} jam sebulan cuma dari nggak perlu ngetik manual.`;
  }

  return (
    <section className="w-full px-6 py-16 bg-surface-variant/20 border-y border-white/5">
      <div className="max-w-xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">Kalkulator Hemat Waktu</h2>

        <div className="flex flex-col gap-6 bg-[#0B111E] border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-on-surface-variant flex justify-between">
              <span>Berapa transaksi kamu catat per hari?</span>
              <span className="text-primary font-bold">{transaksiPerHari}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={transaksiPerHari}
              onChange={(e) => setTransaksiPerHari(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-on-surface-variant flex justify-between">
              <span>Berapa menit biasanya buat catat manual per transaksi?</span>
              <span className="text-primary font-bold">{menitPerTransaksi} menit</span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={menitPerTransaksi}
              onChange={(e) => setMenitPerTransaksi(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5 text-center">
            <Clock3 className="w-6 h-6 text-primary" />
            <p className="text-sm text-on-surface-variant">Total waktu dihemat per bulan</p>
            <p className="text-3xl font-bold text-white">{totalJamPerBulan} jam</p>
            <p className="text-sm text-on-surface-variant mt-2">{contextSentence}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
