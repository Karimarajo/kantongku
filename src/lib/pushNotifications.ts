// Web Push client helpers (cicilan-ai-notifikasi Task 5). Plain browser
// APIs only — no new dependency, matches the constraint that `web-push`
// (server-side only) is the sole new package this prompt allows.

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Web Push requires the VAPID public key as a Uint8Array, but the server
// hands it over as a URL-safe base64 string — standard conversion snippet
// (no library needed for this either).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('Gagal mendaftarkan service worker:', err);
    return null;
  }
}

// Full flow: minta izin browser → daftar service worker → subscribe ke
// PushManager → kirim subscription ke server. Setiap langkah bisa gagal
// tanpa membuat fitur lain di aplikasi ikut rusak (constraint: non-blocking).
export async function enablePushNotifications(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Browser ini tidak mendukung notifikasi push. Di iPhone, tambahkan KantongKu ke Layar Utama terlebih dahulu (keterbatasan Apple untuk semua web app, bukan cuma KantongKu).' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Izin notifikasi tidak diberikan.' };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, error: 'Gagal mendaftarkan service worker.' };
  }

  try {
    const keyRes = await fetch('/api/push/vapid-public-key');
    const keyData = await keyRes.json();
    if (!keyData.publicKey) {
      return { ok: false, error: 'Notifikasi push belum dikonfigurasi di server.' };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const subJson = subscription.toJSON();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || 'Gagal mendaftarkan notifikasi ke server.' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Gagal mengaktifkan notifikasi.' };
  }
}

// Best-effort status check for the UI (e.g. show "Notifikasi Aktif" instead
// of the enable button) — never throws, defaults to "not enabled" on any
// unsupported/error case.
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// Task 7 — called from handleLogout in App.tsx, BEFORE the session cookie is
// cleared by POST /api/auth/logout (this itself needs requireSession, same
// as /api/push/subscribe). Best-effort/never-throws by design: logout must
// never be blocked or fail just because this cleanup step had trouble —
// the server-side push cron also self-heals a stale/expired subscription on
// its own the next time it tries to send to it anyway.
//
// Unsubscribes the BROWSER's PushManager too (not just the server-side
// row) — otherwise the browser would keep holding a subscription with
// nothing on the server to receive it, and a next-login on the same device
// would see a "subscription" that silently goes nowhere until re-enabled.
export async function disablePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.toJSON().endpoint;
    if (endpoint) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint }),
      }).catch(() => {
        // Best-effort — the server-side row going stale is self-healing
        // (see comment above), never worth surfacing to the user at logout.
      });
    }
    await subscription.unsubscribe();
  } catch (err) {
    console.error('Gagal menonaktifkan notifikasi push saat logout:', err);
  }
}
