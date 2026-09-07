import React from 'react';
import { Sun, Moon } from 'lucide-react';
import BrandLogo from '../BrandLogo';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCtaClick: () => void;
}

// landing-page-revisi-2 Task 4 — logo icon + text wordmark (previously the
// landing page had no header at all, just Hero's centered logo mark) + the
// dark/light toggle (Task 3) + a small CTA, all using the new
// --color-landing-* tokens (see index.css) rather than the app's own theme.
export default function Header({ theme, onToggleTheme, onCtaClick }: HeaderProps) {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between border-b border-landing-text/10">
      <div className="flex items-center gap-2">
        <BrandLogo className="w-8 h-8" glow={false} />
        <span className="text-lg font-bold text-landing-text tracking-tight">KantongKu</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-landing-text/15 text-landing-text hover:bg-landing-text/5 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onCtaClick}
          className="h-9 px-4 rounded-full text-xs font-bold bg-landing-accent text-landing-on-accent hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Mulai Sekarang
        </button>
      </div>
    </header>
  );
}
