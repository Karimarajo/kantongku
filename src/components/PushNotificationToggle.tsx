import React, { useEffect, useState } from 'react';
import { BellRing, Loader, CheckCircle2 } from 'lucide-react';
import { enablePushNotifications, isPushEnabled, isPushSupported } from '../lib/pushNotifications';

// "Aktifkan Notifikasi" (cicilan-ai-notifikasi Task 5) — lives inside the
// notification dropdown itself (this app's closest equivalent to a
// "Notifikasi (Settings)" menu; there's no separate settings page for
// notifications). Fully self-contained: never renders anything that blocks
// the rest of the notification panel if push isn't supported/enabled.
export default function PushNotificationToggle() {
  const [status, setStatus] = useState<'checking' | 'unsupported' | 'off' | 'on' | 'loading' | 'error'>('checking');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }
    isPushEnabled().then((enabled) => setStatus(enabled ? 'on' : 'off'));
  }, []);

  const handleEnable = async () => {
    setStatus('loading');
    setError('');
    const result = await enablePushNotifications();
    if (result.ok === true) {
      setStatus('on');
    } else {
      setStatus('error');
      setError(result.error);
    }
  };

  if (status === 'checking') return null;

  if (status === 'on') {
    return (
      <div className="flex items-center gap-2 text-[11px] text-primary bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Notifikasi push aktif di perangkat ini
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <p className="text-[10px] text-on-surface-variant/50 px-1 leading-relaxed">
        Notifikasi push belum didukung di browser ini. Di iPhone, tambahkan KantongKu ke Layar Utama dulu (keterbatasan Apple, bukan bug).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleEnable}
        disabled={status === 'loading'}
        className="w-full h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {status === 'loading' ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
        Aktifkan Notifikasi
      </button>
      {status === 'error' && <p className="text-[10px] text-rose-400 px-1">{error}</p>}
    </div>
  );
}
