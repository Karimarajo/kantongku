import React, { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';

interface LoginProps {
  onLogin: (email: string) => void;
  defaultEmail?: string;
}

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function Login({ onLogin, defaultEmail = '' }: LoginProps) {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [devLoading, setDevLoading] = useState<boolean>(false);
  // Task 1 fix: `import.meta.env.DEV` (build-time, always false in any
  // `vite build` output) doesn't reflect the SERVER's runtime NODE_ENV —
  // docker-compose.local.yml runs the same production build as the real
  // deploy, just with NODE_ENV=development at runtime specifically so the
  // dev-login-bypass endpoint works. Asking the server at mount time (same
  // gate as the actual endpoint, see GET /api/dev/enabled) is what makes
  // this button's visibility match whether it would actually work, in
  // every environment — `npm run dev`, this Docker setup, and real
  // production alike.
  const [devLoginAvailable, setDevLoginAvailable] = useState<boolean>(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/dev/enabled')
      .then((r) => r.json())
      .then((data) => setDevLoginAvailable(!!data.enabled))
      .catch(() => setDevLoginAvailable(false));
  }, []);

  // Dev-only bypass for testing from a phone on the same WiFi — Google OAuth
  // rejects a LAN IP as an Authorized Origin, so the real Google button can't
  // be tested that way. Server-side this 404s outright in production (see
  // POST /api/dev/login-as-test-user in server.ts) — that's the real gate;
  // devLoginAvailable above just keeps this button's visibility in sync
  // with it at runtime.
  const handleDevLogin = async () => {
    setError('');
    setDevLoading(true);
    try {
      const res = await fetch('/api/dev/login-as-test-user', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login sebagai test user.');
      }
      onLogin(data.user?.email || defaultEmail);
      window.location.hash = 'beranda';
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login dev.');
    } finally {
      setDevLoading(false);
    }
  };

  const handleCredentialResponse = async (response: GoogleCredentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal login dengan Google.');
      }
      onLogin(data.user?.email || defaultEmail);
      window.location.hash = 'beranda';
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Konfigurasi Google Sign-In belum lengkap.');
      return;
    }

    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'signin_with',
        });
      } else {
        setTimeout(tryInit, 200);
      }
    };
    tryInit();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between items-center bg-body-bg text-on-surface px-6 py-12 relative overflow-hidden font-body-md select-none">

      {/* Ambient Radial Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Header spacer */}
      <div className="w-full" />

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col items-center gap-8 z-10 my-auto">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-28 h-28 p-3 bg-surface-variant/40 rounded-3xl border border-overlay/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-xl flex items-center justify-center relative group">
            <BrandLogo className="w-20 h-20" />
          </div>

          <div className="text-center flex flex-col gap-1.5 mt-2">
            <h1 className="font-display-lg text-4xl text-primary font-bold tracking-tight glow-text-primary">
              KantongKu
            </h1>
            <p className="font-body-md text-on-surface-variant max-w-[280px] mx-auto text-center leading-relaxed">
              Solusi Manajemen Keuangan Kamu
            </p>
          </div>
        </div>

        {/* Google Sign-In */}
        <div className="w-full flex flex-col items-center gap-4">
          <div ref={buttonRef} className="flex justify-center" />
          {loading && (
            <span className="text-xs text-on-surface-variant/70">Memproses login...</span>
          )}

          {devLoginAvailable && (
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={devLoading}
              className="text-xs font-label-caps uppercase tracking-wider text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-full px-4 py-2 transition-colors disabled:opacity-50"
            >
              {devLoading ? 'Memproses...' : '[DEV] Login sebagai Test User'}
            </button>
          )}

          {error && (
            <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center max-w-sm">
              {error}
            </span>
          )}
          <p className="text-xs text-on-surface-variant/50 text-center max-w-sm">
            Belum punya akses?{' '}
            <a href="/" className="text-primary hover:underline">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>

      {/* Footer restriction note */}
      <div className="w-full max-w-sm text-center z-10 mt-auto pt-8">
        <p className="text-[10px] sm:text-xs text-on-surface-variant/40 font-label-caps tracking-wider leading-relaxed uppercase border-t border-overlay/5 pt-4">
          Akses masuk dijamin aman menggunakan teknologi autentikasi dari Google.
        </p>
      </div>
    </div>
  );
}
