import nodemailer from "nodemailer";

// Self-hosted deployment (CT 101 / Docker) sends email directly via SMTP —
// unlike Railway, outbound SMTP ports (587/465) are NOT blocked here, so we
// don't need Resend's HTTPS API workaround. Configured from SMTP_* env vars.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465; STARTTLS on 587/others
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export interface EmailAttachment {
  filename: string;
  path: string; // absolute filesystem path — nodemailer reads it itself, no need to preload the buffer
}

// Reusable low-level sender — any feature that needs to email a user goes
// through this (Admin Console's "Kirim Link Login", the post-order
// confirmation email, support replies, etc). `attachments` is optional and
// native to nodemailer (cicilan-ai-notifikasi Task 6) — no new dependency.
export async function sendEmail(to: string, subject: string, html: string, text?: string, attachments?: EmailAttachment[]): Promise<void> {
  const from = process.env.EMAIL_FROM || "KantongKu <no-reply@kantongku.app>";
  await getTransporter().sendMail({ from, to, subject, html, text, attachments });
}
