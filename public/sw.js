// KantongKu — manual Service Worker (cicilan-ai-notifikasi Task 5).
// This project doesn't use vite-plugin-pwa (verified in Task 0 — no
// existing service worker/manifest), so this is a small, hand-written SW
// with a single job: show a push notification, with sound, even when the
// app/tab is closed. Deliberately does NOT do offline caching or anything
// else a full PWA setup would — that's out of scope for this task.

self.addEventListener('push', (event) => {
  let data = { title: 'KantongKu', body: 'Ada pengingat baru dari KantongKu.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    // Payload wasn't JSON — fall back to the default text above instead of
    // failing the whole push event.
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    // silent:false (the default) is what actually lets the OS play its
    // normal notification sound — kept explicit here so the intent is clear.
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'KantongKu', options));
});

// Clicking the notification focuses an already-open KantongKu tab if there
// is one, otherwise opens a new one straight into the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/app');
    })
  );
});
