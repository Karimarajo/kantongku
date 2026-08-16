import { createRequire } from "module";
import type * as WebPushTypes from "web-push";

// Loaded via require, NOT `import ... from "web-push"` — verified live (not
// just type-checked) that a plain ESM import of this package resolves to an
// object missing its named functions under this project's dev runtime (tsx,
// which loads .ts files as real Node ESM): `webpush.setVapidDetails` came
// back `undefined` at request time, a CJS/ESM interop gap that only showed
// up when actually hitting the route, not at `tsc --noEmit`.
//
// Two DIFFERENT runtimes need to work here, so neither a bare `require` nor
// a bare `createRequire(import.meta.url)` alone is enough:
//   - `npm run dev` (tsx) executes server.ts as real Node ESM — no native
//     `require` global exists, but `import.meta.url` is valid, so
//     createRequire is the only option.
//   - `npm run build`'s esbuild step (`--format=cjs`) bundles this into
//     dist/server.cjs — genuine CommonJS, where `import.meta.url` is empty
//     (esbuild warns about exactly this), but a native `require` global IS
//     available, being plain CJS.
// Prefer the native `require` when present (production bundle) and only
// fall back to createRequire for the real-ESM dev runtime.
function loadWebPush(): typeof WebPushTypes {
  if (typeof require === "function") {
    return require("web-push");
  }
  return createRequire(import.meta.url)("web-push");
}

const webpush = loadWebPush();

// Web Push (cicilan-ai-notifikasi Task 5) — thin wrapper around the `web-push`
// package, the ONE npm dependency this whole prompt explicitly allowed
// (VAPID/encryption isn't realistic to hand-roll). Mirrors this project's
// existing lib/*.ts pattern (doku.ts, email.ts, metaCapi.ts): one concern per
// file, configuration read lazily from env so a missing VAPID key pair never
// crashes the server at boot — push is purely additive, every other feature
// must keep working with it fully unconfigured.
let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@kantongku.site",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendPushResult {
  sent: number;
  // Subscription ids the caller should DELETE from push_subscriptions — the
  // push service told us these are gone (unsubscribed/expired), no point
  // retrying them again next time.
  expiredIds: string[];
}

// Best-effort, fire-and-forget by design (constraint: a failed/expired
// subscription must never fail the reminder process it's attached to) — one
// subscription failing never affects the others, each is caught individually.
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; icon?: string }
): Promise<SendPushResult> {
  if (!ensureConfigured() || subscriptions.length === 0) {
    return { sent: 0, expiredIds: [] };
  }

  const expiredIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Gone/NotFound — the push service confirms this subscription no
          // longer exists (browser unsubscribed, uninstalled, etc).
          expiredIds.push(sub.id);
        } else {
          console.error(`Gagal mengirim push notification ke subscription ${sub.id}:`, err.message);
        }
      }
    })
  );

  return { sent, expiredIds };
}
