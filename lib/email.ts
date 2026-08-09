import nodemailer from "nodemailer";

// Lazily-created singleton transporter, configured from SMTP_* env vars.
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

// Reusable low-level sender — any feature that needs to email a user goes
// through this (currently just the Admin Console's "Kirim Link Login").
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const from = process.env.EMAIL_FROM || "KantongKu <no-reply@kantongku.app>";
  await getTransporter().sendMail({ from, to, subject, html, text });
}
