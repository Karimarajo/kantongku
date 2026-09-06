import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Landing from './components/Landing.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import SupportPage from './components/SupportPage.tsx';
import './index.css';

// Meta Pixel base code, loaded dynamically here (rather than inline in
// index.html) because only this module has access to import.meta.env at
// runtime. Skips entirely — no script injected, nothing fired, no crash — when
// VITE_META_PIXEL_ID isn't set (e.g. local dev without a Pixel configured).
function initMetaPixel() {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (!pixelId) return;
  if (window.fbq) return; // already initialized (StrictMode double-invoke, HMR, etc.)

  const w = window as any;
  w._fbq = w._fbq || null;
  const n: any = (w.fbq = function (...args: any[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  });
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq!('init', pixelId);
  window.fbq!('track', 'PageView');
}

initMetaPixel();

const path = window.location.pathname;

// Task 1 (prompt-admin-console-perbaikan.md) — give the Admin Console its
// own installable identity, distinct from the customer app. Every route in
// this SPA shares ONE index.html (see the `app.get("*", ...)` fallback in
// server.ts) — there's no separate admin entry point to give its own
// <head> statically — so this swaps the manifest/touch-icon <link> tags at
// runtime, only when the admin route is actually being rendered. Everything
// else (Landing, the customer app, Support) keeps index.html's original
// tags untouched.
if (path === '/admin') {
  const manifestLink = document.querySelector('link[rel="manifest"]') || document.createElement('link');
  manifestLink.setAttribute('rel', 'manifest');
  manifestLink.setAttribute('href', '/admin-manifest.json');
  if (!manifestLink.parentNode) document.head.appendChild(manifestLink);

  const touchIconLink = document.querySelector('link[rel="apple-touch-icon"]') || document.createElement('link');
  touchIconLink.setAttribute('rel', 'apple-touch-icon');
  touchIconLink.setAttribute('href', '/apple-touch-icon-180.png');
  if (!touchIconLink.parentNode) document.head.appendChild(touchIconLink);

  const titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') || document.createElement('meta');
  titleMeta.setAttribute('name', 'apple-mobile-web-app-title');
  titleMeta.setAttribute('content', 'KantongKu Admin');
  if (!titleMeta.parentNode) document.head.appendChild(titleMeta);

  document.title = 'KantongKu Admin';
}

function Root() {
  if (path === '/') return <Landing />;
  if (path === '/admin') return <AdminConsole />;
  if (path === '/support') return <SupportPage />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
