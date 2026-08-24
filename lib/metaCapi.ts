import crypto from "crypto";

const META_API_VERSION = "v21.0";

// Meta requires PII (email) to be SHA-256 hashed — lowercased + trimmed first —
// before it's ever sent to the Conversions API. Never send plaintext.
export function hashForMeta(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface MetaCapiUserData {
  email?: string; // plaintext in, hashed below before it leaves this process
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
}

interface MetaCapiOptions {
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  userData?: MetaCapiUserData;
}

// Server-side Meta Conversions API call. Deliberately non-throwing (not
// rejecting) when META_PIXEL_ID/META_CAPI_ACCESS_TOKEN aren't configured —
// tracking is optional, order creation/confirmation must never depend on it.
// When it DOES throw (a real network/API failure), every caller wraps the
// call in its own try/catch so that failure can never block the response to
// the customer/admin.
//
// Every attempt — skipped, succeeded, or failed — is logged unconditionally
// (not just once per process) so a misconfiguration never goes silent in
// `docker compose logs app`. A prior version of this function only warned
// once per server lifetime, which meant the very next event type (e.g.
// "OrderConfirmed" right after "Lead" already tripped the warning) would be
// dropped with ZERO log output — don't reintroduce that.
export async function sendMetaCapiEvent(eventName: string, eventId: string, opts: MetaCapiOptions = {}): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    const missing = [!pixelId && "META_PIXEL_ID", !accessToken && "META_CAPI_ACCESS_TOKEN"].filter(Boolean).join(", ");
    console.error(
      `[Meta CAPI] "${eventName}" (event_id=${eventId}) DILEWATI — ${missing} belum diset di environment. ` +
      `Event ini TIDAK terkirim ke Meta. Set kedua env var ini (lihat .env.example) lalu restart app.`
    );
    return;
  }

  console.log(`[Meta CAPI] Mengirim event "${eventName}" (event_id=${eventId})...`);

  const userData: Record<string, string> = {};
  if (opts.userData?.email) userData.em = hashForMeta(opts.userData.email);
  if (opts.userData?.clientIpAddress) userData.client_ip_address = opts.userData.clientIpAddress;
  if (opts.userData?.clientUserAgent) userData.client_user_agent = opts.userData.clientUserAgent;
  if (opts.userData?.fbp) userData.fbp = opts.userData.fbp;
  if (opts.userData?.fbc) userData.fbc = opts.userData.fbc;

  const eventPayload: Record<string, any> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
  };
  if (opts.eventSourceUrl) eventPayload.event_source_url = opts.eventSourceUrl;
  if (opts.value !== undefined) {
    eventPayload.custom_data = { value: opts.value, currency: opts.currency || "IDR" };
  }

  const body: Record<string, any> = { data: [eventPayload] };
  // Meta Events Manager → Test Events tab picks these up separately from real
  // traffic. Leave META_TEST_EVENT_CODE unset/empty in production.
  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Meta CAPI "${eventName}" gagal (HTTP ${res.status}): ${errText}`);
  }

  const resJson: any = await res.json().catch(() => null);
  console.log(
    `[Meta CAPI] "${eventName}" (event_id=${eventId}) terkirim OK — ` +
    `events_received=${resJson?.events_received ?? "?"} fbtrace_id=${resJson?.fbtrace_id ?? "?"}`
  );
}
