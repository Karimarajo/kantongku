// Sends transactional email via Resend's HTTPS API (https://resend.com)
// instead of raw SMTP. Railway blocks outbound SMTP ports (587/465 both hang
// until "Connection timeout") — HTTPS on 443 isn't affected, so an HTTP-based
// provider is the only practical option from this host.
const RESEND_API_URL = "https://api.resend.com/emails";

// Reusable low-level sender — any feature that needs to email a user goes
// through this (currently just the Admin Console's "Kirim Link Login").
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY belum diatur di environment");
  }
  // Until a custom domain is verified in Resend, this must stay on their
  // shared sandbox domain (onboarding@resend.dev) — see .env.example.
  const from = process.env.EMAIL_FROM || "KantongKu <onboarding@resend.dev>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${body || res.statusText}`);
  }
}
