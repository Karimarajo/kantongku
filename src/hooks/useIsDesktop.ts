import { useEffect, useState } from 'react';

// Matches Tailwind's `lg` breakpoint (1024px) — the same breakpoint
// HomeDashboard.tsx already uses for its `lg:` desktop layout classes, so
// this hook's true/false switches at exactly the same width the CSS layout
// itself switches at.
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

// Task: "di tampilan desktop, aktivitas terakhir tampilkan semua sampai
// bawah" — mobile keeps showing a short, fixed-height list (existing
// behavior), only desktop needs to know to render the full list instead of
// slicing it. Pure CSS can't express "show all on desktop, only 5 on
// mobile" for a JS-sliced array, so this reads the actual viewport.
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    try {
      return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
    } catch {
      return false; // SSR/no matchMedia — default to the mobile (safer, shorter) layout
    }
  });

  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    } catch {
      return;
    }
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
