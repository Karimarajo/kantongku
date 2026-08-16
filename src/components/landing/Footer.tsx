import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full px-6 py-10 border-t border-white/5">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-3 text-center">
        <a href="/support" className="text-xs text-primary hover:underline font-semibold">
          Customer Support / Bantuan
        </a>
        <p className="text-xs text-on-surface-variant/60">© 2026 KantongKu. Seluruh hak cipta dilindungi.</p>
        <p className="text-[11px] text-on-surface-variant/40 max-w-md">
          Disclaimer: Hasil pengelolaan keuangan tergantung konsistensi penggunaan masing-masing pengguna.
        </p>
      </div>
    </footer>
  );
}
