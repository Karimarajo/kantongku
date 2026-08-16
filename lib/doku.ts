// Doku Checkout (Non-SNAP) integration — see developers.doku.com.
// All signing is native Node `crypto` (SHA256 digest + HMAC-SHA256), no new
// dependency. NEVER log DOKU_CLIENT_ID/DOKU_SECRET_KEY, the computed
// Signature, or any header/config object containing them.
import crypto from "crypto";

function baseUrl(): string {
  return process.env.DOKU_IS_PRODUCTION === "true"
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";
}

function digestOf(bodyString: string): string {
  return crypto.createHash("sha256").update(bodyString, "utf-8").digest("base64");
}

// Non-SNAP signature: HMAC-SHA256 of the newline-joined component string
// (Client-Id / Request-Id / Request-Timestamp / Request-Target / Digest),
// keyed by the Secret Key, base64-encoded, prefixed "HMACSHA256=".
function computeSignature(params: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  digest: string;
  secretKey: string;
}): string {
  const componentString = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.timestamp}`,
    `Request-Target:${params.requestTarget}`,
    `Digest:${params.digest}`,
  ].join("\n");
  const hmac = crypto.createHmac("sha256", params.secretKey).update(componentString, "utf-8").digest("base64");
  return `HMACSHA256=${hmac}`;
}

// ISO8601 UTC without milliseconds — exactly the "2020-08-11T08:45:42Z"
// shape Doku's docs show (Date#toISOString() includes ".123" millis Doku
// doesn't expect, so strip them).
function dokuTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// Doku's `expired_date` comes back as a bare "YYYYMMDDHHmmss" string (e.g.
// "20240712104711") with no separators or timezone marker. Doku is an
// Indonesian PSP and their docs/dashboard are WIB (UTC+7) throughout, so
// that's the assumption here — this field is display-only (KantongKu's own
// `orders.expires_at`, a 24h window set at order creation, is what actually
// governs whether an order is still payable), so a best-effort parse that
// returns null on anything unexpected is acceptable.
export function parseDokuExpiredDate(raw: string | null | undefined): Date | null {
  if (!raw || !/^\d{14}$/.test(raw)) return null;
  const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
  const h = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14);
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`;
  const parsed = new Date(iso);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export interface CreateCheckoutPaymentResult {
  paymentUrl: string;
  tokenId: string;
  expiredDate: string | null; // Doku's raw "YYYYMMDDHHmmss" string, unparsed
}

// Calls Doku Checkout (Non-SNAP)'s create-payment endpoint. Throws with a
// clear message on any failure (network, non-2xx, unexpected shape) — the
// caller (createOrderRecord in server.ts) treats Doku as best-effort and
// must not let a failure here block order creation; the manual BCA/QRIS
// instructions remain a full fallback either way.
export async function createCheckoutPayment(params: {
  orderCode: string;
  amount: number;
  paymentDueDateMinutes?: number;
}): Promise<CreateCheckoutPaymentResult> {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secretKey = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("DOKU_CLIENT_ID / DOKU_SECRET_KEY belum diset di server");
  }

  const requestTarget = "/checkout/v1/payment";
  const body = {
    order: {
      amount: params.amount,
      invoice_number: params.orderCode,
    },
    payment: {
      payment_due_date: params.paymentDueDateMinutes ?? 60,
    },
  };
  const bodyString = JSON.stringify(body);
  const requestId = crypto.randomUUID();
  const timestamp = dokuTimestamp();
  const digest = digestOf(bodyString);
  const signature = computeSignature({ clientId, requestId, timestamp, requestTarget, digest, secretKey });

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${requestTarget}`, {
      method: "POST",
      headers: {
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        "Signature": signature,
        "Content-Type": "application/json",
      },
      body: bodyString,
    });
  } catch (err: any) {
    throw new Error(`Doku create payment gagal (network): ${err.message}`);
  }

  const data: any = await res.json().catch(() => ({}));
  const paymentUrl = data?.response?.payment?.url;
  if (!res.ok || !paymentUrl) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : (data?.message || `HTTP ${res.status}`);
    throw new Error(`Doku create payment gagal: ${message}`);
  }

  return {
    paymentUrl,
    tokenId: data.response.payment.token_id,
    expiredDate: data.response.payment.expired_date || null,
  };
}

// Verifies an incoming Doku webhook notification's signature by recomputing
// it from the exact raw bytes received (must NOT be a re-serialized/parsed
// version — key order and whitespace affect the digest) and the headers
// Doku sent, then comparing (constant-time) against the Signature header.
// `requestTarget` must be the exact path Doku is configured to POST to.
export function verifyDokuNotificationSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer | string,
  requestTarget: string
): boolean {
  const secretKey = process.env.DOKU_SECRET_KEY;
  const ourClientId = process.env.DOKU_CLIENT_ID;
  if (!secretKey || !ourClientId) {
    console.error("DOKU_CLIENT_ID/DOKU_SECRET_KEY belum diset — tidak bisa verifikasi webhook Doku.");
    return false;
  }

  const clientId = headerValue(headers["client-id"]);
  const requestId = headerValue(headers["request-id"]);
  const timestamp = headerValue(headers["request-timestamp"]);
  const receivedSignature = headerValue(headers["signature"]);
  if (!clientId || !requestId || !timestamp || !receivedSignature) {
    return false;
  }
  // Defense in depth: the notification must claim to be for OUR merchant
  // account, not just carry any valid-looking signature shape.
  if (clientId !== ourClientId) {
    return false;
  }

  const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
  const digest = digestOf(bodyString);
  const expectedSignature = computeSignature({ clientId, requestId, timestamp, requestTarget, digest, secretKey });

  const expectedBuf = Buffer.from(expectedSignature);
  const receivedBuf = Buffer.from(receivedSignature);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
