// Admin Console push client helpers (Task 7, prompt-admin-console-perbaikan.md).
// Deliberate near-duplicate of pushNotifications.ts rather than a shared,
// parameterized helper: the two flows target genuinely different server
// endpoints/tables (admin_push_subscriptions has no user_id at all — see
// db/schema.sql) and keeping them as separate small files means a change to
// one can never accidentally affect the other. Same VAPID key endpoint and
// public/sw.js service worker are reused as-is — Task 7 only needed a new
// subscription target, not new push plumbing.

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

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

export async function enableAdminPushNotifications(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Browser ini tidak mendukung notifikasi push. Di iPhone, tambahkan Admin Console ke Layar Utama terlebih dahulu.' };
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
    const res = await fetch('/api/admin/push/subscribe', {
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

export async function isAdminPushEnabled(): Promise<boolean> {
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

export async function disableAdminPushNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.toJSON().endpoint;
    if (endpoint) {
      await fetch('/api/admin/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    await subscription.unsubscribe();
  } catch (err) {
    console.error('Gagal menonaktifkan notifikasi push admin:', err);
  }
}
