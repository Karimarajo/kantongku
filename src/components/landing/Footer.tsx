import React from 'react';
import { Instagram, Facebook } from 'lucide-react';

// lucide-react tidak punya ikon TikTok bawaan (logo bermerek, jarang ada di
// icon set open-source) — path SVG di bawah adalah rekreasi sederhana logo
// TikTok yang umum dipakai, bukan aset berhak cipta pihak ketiga.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82c-.9-.83-1.45-1.98-1.53-3.32h-3.15v13.14c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .58.04.85.13V9.7a6.06 6.06 0 0 0-.85-.06 6.06 6.06 0 0 0-6.06 6.06A6.06 6.06 0 0 0 9.02 21.76a6.06 6.06 0 0 0 6.06-6.06V9.4a9.16 9.16 0 0 0 5.35 1.71V8a5.87 5.87 0 0 1-3.83-2.18z" />
    </svg>
  );
}

// Revisi (prompt 3, poin 4): ikon media sosial di footer, bisa diklik,
// menuju akun resmi Marajo Tech — target=_blank supaya tidak keluar dari
// landing page. Revisi (poin 5): baris disclaimer dihapus.
const SOCIAL_LINKS = [
  { icon: TikTokIcon, href: 'https://www.tiktok.com/@marajotech?lang=id-ID', label: 'TikTok Marajo Tech' },
  { icon: Instagram, href: 'https://www.instagram.com/marajotechid/', label: 'Instagram Marajo Tech' },
  { icon: Facebook, href: 'https://www.facebook.com/marajotechid', label: 'Facebook Marajo Tech' },
];

export default function Footer() {
  return (
    <footer className="w-full px-6 py-10 border-t border-landing-text/10">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="w-9 h-9 rounded-full border border-landing-text/15 flex items-center justify-center text-landing-text hover:bg-landing-text/5 hover:text-landing-accent transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
        <a href="/support" className="text-xs text-landing-text hover:underline font-semibold">
          Customer Support / Bantuan
        </a>
        <p className="text-xs text-landing-text/60">© 2026 KantongKu. Seluruh hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}
