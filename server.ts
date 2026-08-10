import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Pool } from "pg";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "./lib/email";
import { sendMetaCapiEvent } from "./lib/metaCapi";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser(process.env.SESSION_COOKIE_SECRET));

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Google OAuth verifier client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================
// Session Middleware
// ==========================================

// Attaches req.user when a valid session cookie is present; 401 otherwise.
async function requireSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const sessionId = req.signedCookies?.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: "Tidak ada sesi aktif" });
    }
    const result = await pool.query(`SELECT * FROM users WHERE current_session_id = $1`, [sessionId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Sesi tidak valid atau sudah kedaluwarsa" });
    }
    (req as any).user = user;
    next();
  } catch (error: any) {
    console.error("Gagal memeriksa sesi:", error);
    res.status(500).json({ error: "Gagal memeriksa sesi" });
  }
}

// Requires req.user (set by requireSession) to have status 'active'; 403 otherwise.
function requireActiveStatus(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || user.status !== "active") {
    return res.status(403).json({ error: "Akun belum aktif" });
  }
  next();
}

// Checks the separate admin_session cookie (not tied to the `users` table at
// all). The cookie is signed with SESSION_COOKIE_SECRET via cookie-parser, so
// its mere presence (with a valid signature) is proof of a prior successful
// /api/admin/login — there is no server-side admin session store to look up.
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const adminSession = req.signedCookies?.admin_session;
  if (!adminSession) {
    return res.status(401).json({ error: "Sesi admin tidak valid" });
  }
  next();
}

// Initialize Gemini SDK with telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Robust helper with retries and fallback models for high demand or transient API failures
async function generateContentWithRetry(aiInstance: any, options: any, maxRetries = 2) {
  let attempt = 0;
  // Menyesuaikan dengan daftar model stabil terbaru yang dikenali SDK baru
  const modelsToTry = [options.model, "gemini-2.5-flash-lite", "gemini-2.5-flash"];
  
  while (true) {
    try {
      const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)];
      console.log(`[Gemini API] Attempt ${attempt + 1}: calling model ${currentModel}`);
      
      const response = await aiInstance.models.generateContent({
        ...options,
        model: currentModel
      });
      return response;
    } catch (error: any) {
      attempt++;
      const isTransient = error.message?.includes("503") || 
                          error.message?.includes("UNAVAILABLE") || 
                          error.message?.includes("high demand") ||
                          error.message?.includes("Rate limit") ||
                          error.status === 503;
                          
      if (attempt <= maxRetries && isTransient) {
        console.warn(`[Gemini API] Transient error (attempt ${attempt}): ${error.message}. Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      if (attempt < modelsToTry.length) {
        console.warn(`[Gemini API] Error on model call. Trying fallback model: ${modelsToTry[attempt]}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      
      throw error;
    }
  }
}

// Shared by /api/parse and /api/parse-media: makes the AI map a transaction to
// the requesting user's OWN pockets/accounts/categories (by exact id) instead of
// guessing from a fixed keyword list, and resolves relative time ("hari ini",
// "kemarin") against the client's current clock instead of leaving it unset.
interface ParseContext {
  categories?: { id: string; name: string }[];
  pockets?: { id: string; name: string }[];
  accounts?: { id: string; name: string }[];
  now?: string;
}

function buildTransactionSystemInstruction(context: ParseContext): string {
  const now = context.now || new Date().toISOString();
  const categories = context.categories || [];
  const pockets = context.pockets || [];
  const accounts = context.accounts || [];

  return `Kamu adalah mesin parser transaksi keuangan untuk aplikasi KantongKu. Ubah input pengguna (teks ucapan, transkrip suara, atau foto struk) menjadi data transaksi terstruktur dalam bentuk JSON mentah yang valid.

ATURAN WAJIB:
1. JANGAN mengarang data. Untuk field wajib (nominal, catatan, tipe) yang tidak bisa dipastikan dari input: nominal=0, catatan="Tidak terdeteksi", tipe="pengeluaran".
2. Untuk category_id, pocket_id, account_id, dan waktu: HANYA isi jika informasinya SECARA EKSPLISIT disebutkan atau bisa disimpulkan kuat dari input. Kalau tidak disebutkan sama sekali di input, kembalikan string kosong "" — JANGAN menebak atau memilih default begitu saja.
3. Kalau disebutkan, WAJIB pilih salah satu id PERSIS (bukan bikin id atau nama baru) dari daftar milik pengguna ini:
   - Kategori tersedia: ${JSON.stringify(categories)}
   - Kantong tersedia: ${JSON.stringify(pockets)}
   - Rekening/dompet tersedia: ${JSON.stringify(accounts)}
4. Field "waktu": isi tanggal-waktu transaksi dalam format ISO 8601 lengkap, hasil resolusi dari kata waktu di input (mis. "hari ini", "kemarin", "tadi pagi", tanggal spesifik) RELATIF terhadap waktu sekarang: ${now}. Kalau input sama sekali tidak menyebut waktu, isi dengan waktu sekarang (${now}).`;
}

const TRANSACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer. Jika tidak ada, isi 0." },
    catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi. Jika tidak jelas, tulis 'Tidak terdeteksi'." },
    tipe: { type: "STRING", description: "Pilih wajib antara: 'pemasukan' atau 'pengeluaran'." },
    waktu: { type: "STRING", description: "Tanggal-waktu transaksi format ISO 8601, hasil resolusi kata waktu relatif di input. Isi waktu sekarang jika input tidak menyebut waktu." },
    category_id: { type: "STRING", description: "ID kategori PERSIS dari daftar kategori yang diberikan, hanya jika disebutkan/tersirat di input. String kosong jika tidak disebutkan." },
    pocket_id: { type: "STRING", description: "ID kantong PERSIS dari daftar kantong yang diberikan, hanya jika disebutkan/tersirat di input. String kosong jika tidak disebutkan." },
    account_id: { type: "STRING", description: "ID rekening/dompet PERSIS dari daftar rekening yang diberikan, hanya jika disebutkan/tersirat di input. String kosong jika tidak disebutkan." }
  },
  required: ["nominal", "catatan", "tipe"]
};

// API Routes
app.post("/api/parse", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Layanan AI belum dikonfigurasi di server. Hubungi admin." });
    }
    const aiInstance = new GoogleGenAI({
      apiKey: apiKey as string,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // PERBAIKAN: Struktur parameter 'contents' disesuaikan dengan aturan @google/genai terbaru
    const response = await generateContentWithRetry(aiInstance, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [{ text: `Parse input berikut: "${prompt}"` }]
        }
      ],
      config: {
        systemInstruction: buildTransactionSystemInstruction(context || {}),
        responseMimeType: "application/json",
        responseSchema: TRANSACTION_RESPONSE_SCHEMA
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse:", error);
    res.status(500).json({ error: error.message || "Gagal memproses input dengan AI" });
  }
});

// Parse Media (Image/Audio Base64) Secure Proxy Route
app.post("/api/parse-media", async (req, res) => {
  try {
    const { mediaData, tipeMedia, context } = req.body;
    if (!mediaData || !tipeMedia) {
      return res.status(400).json({ error: "Data media dan tipeMedia wajib disertakan" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Layanan AI belum dikonfigurasi di server. Hubungi admin." });
    }
    const aiInstance = new GoogleGenAI({
      apiKey: apiKey as string,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    if (tipeMedia === "text/json") {
      const payloadObj = JSON.parse(mediaData);
      const promptLengkap = `${payloadObj.instruksi}\n\nData Transaksi Terfilter:\n${JSON.stringify(payloadObj.data_transaksi, null, 2)}`;

      const response = await generateContentWithRetry(aiInstance, {
        model: "gemini-2.5-flash-lite",
        contents: promptLengkap
      });

      return res.json({ analisis_laporan_wa: response.text || "" });
    }

    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    // PERBAIKAN: Menggunakan model stabil 'gemini-2.5-flash-lite' dan skema tipe string
    const response = await generateContentWithRetry(aiInstance, {
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Bongkar input ini menjadi data JSON transaksi keuangan sesuai instruksi sistem." },
            {
              inlineData: {
                mimeType: tipeMedia,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: buildTransactionSystemInstruction(context || {}),
        responseMimeType: "application/json",
        responseSchema: TRANSACTION_RESPONSE_SCHEMA
      }
    });

    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse media:", error);
    res.status(500).json({ error: error.message || "Gagal memproses struk/suara via AI" });
  }
});

// ==========================================
// Payment Routes (manual: QRIS ShopeePay statis / Transfer BCA)
// ==========================================

// Public, non-secret payment config for the frontend (price only — no secrets)
app.get("/api/payment/config", (req, res) => {
  const amount = Number(process.env.PRICE_AMOUNT);
  res.json({
    amount: Number.isFinite(amount) ? amount : 0,
    label: process.env.PRICE_LABEL || "",
  });
});

// Short, human-readable order reference, e.g. "KK-20260809-4F2A".
function generateOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `KK-${y}${m}${d}-${rand}`;
}

// Create a pending manual-payment order. A random 0-999 "kode unik" is added to
// the base price so the exact total_amount can be matched by hand against a
// ShopeePay/BCA mutation later — no payment gateway involved.
app.post("/api/payment/create", async (req, res) => {
  try {
    const {
      name,
      email,
      channel,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      fbp,
      fbc,
    } = req.body;
    if (!name || !email || !channel) {
      return res.status(400).json({ error: "Nama, email, dan metode pembayaran wajib diisi" });
    }
    if (!["qris_shopee", "transfer_bca"].includes(channel)) {
      return res.status(400).json({ error: "Metode pembayaran tidak dikenali" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }

    const baseAmount = Number(process.env.PRICE_AMOUNT);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(500).json({ error: "Konfigurasi harga (PRICE_AMOUNT) belum diatur di server" });
    }

    // Find a unique_code not currently used by another still-pending,
    // not-yet-expired order. Retry on collision (low odds, cheap to retry).
    let uniqueCode: number | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = crypto.randomInt(0, 1000);
      const clash = await pool.query(
        `SELECT 1 FROM orders WHERE unique_code = $1 AND status = 'pending' AND expires_at > now()`,
        [candidate]
      );
      if (clash.rowCount === 0) {
        uniqueCode = candidate;
        break;
      }
    }
    if (uniqueCode === null) {
      return res.status(503).json({ error: "Sistem sedang sibuk, coba lagi sebentar lagi" });
    }

    const totalAmount = baseAmount + uniqueCode;

    let orderCode = "";
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      orderCode = generateOrderCode();
      try {
        await pool.query(
          `INSERT INTO orders (
             order_code, name, email, channel, base_amount, unique_code, total_amount, status, expires_at,
             utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, fbp, fbc
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now() + interval '24 hours', $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            orderCode, name, email, channel, baseAmount, uniqueCode, totalAmount,
            utm_source || null, utm_medium || null, utm_campaign || null, utm_content || null,
            utm_term || null, fbclid || null, fbp || null, fbc || null,
          ]
        );
        inserted = true;
      } catch (err: any) {
        if (err.code !== "23505") throw err; // not a unique_violation on order_code, rethrow
      }
    }
    if (!inserted) {
      return res.status(503).json({ error: "Gagal membuat kode order, coba lagi" });
    }

    // --- Best-effort side effects below: Meta CAPI event + admin notification
    // email. Fired-and-forgotten on purpose — NOT awaited — so a slow/failed
    // network call to Meta or a hanging SMTP connection can never add latency
    // to (let alone fail) the order response the customer is waiting on. The
    // order is already committed to the database at this point; each promise
    // has its own .catch() so a rejection here can't become an unhandled
    // rejection or bubble into the request's own try/catch.
    const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    sendMetaCapiEvent("Lead", orderCode, {
      value: totalAmount,
      currency: "IDR",
      eventSourceUrl: req.headers.referer as string | undefined,
      userData: {
        email,
        clientIpAddress: forwardedFor || req.socket.remoteAddress || undefined,
        clientUserAgent: req.headers["user-agent"] as string | undefined,
        fbp: fbp || undefined,
        fbc: fbc || undefined,
      },
    }).catch((err: any) => {
      console.error("Gagal mengirim event Meta CAPI (Lead):", err.message);
    });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM;
    if (adminEmail) {
      const channelLabel = channel === "qris_shopee" ? "QRIS ShopeePay" : "Transfer BCA";
      const sourceLine = utm_source
        ? `<p><b>Sumber:</b> ${utm_source}${utm_campaign ? ` / ${utm_campaign}` : ""}</p>`
        : "";
      sendEmail(
        adminEmail,
        `[KantongKu] Order baru masuk — ${orderCode}`,
        `<h2>Order Baru</h2>
         <p><b>Nama:</b> ${name}</p>
         <p><b>Email:</b> ${email}</p>
         <p><b>Metode Pembayaran:</b> ${channelLabel}</p>
         <p><b>Total Tagihan:</b> Rp${totalAmount.toLocaleString("id-ID")} (harga Rp${baseAmount.toLocaleString("id-ID")} + kode unik ${uniqueCode})</p>
         ${sourceLine}
         <p><a href="${process.env.APP_URL}/admin">Buka Admin Console</a></p>`,
        `Order baru: ${orderCode}\nNama: ${name}\nEmail: ${email}\nMetode: ${channelLabel}\nTotal: Rp${totalAmount.toLocaleString("id-ID")}\nAdmin Console: ${process.env.APP_URL}/admin`
      ).catch((err: any) => {
        console.error("Gagal mengirim email notifikasi order baru:", err.message);
      });
    } else {
      console.warn("ADMIN_NOTIFY_EMAIL (dan EMAIL_FROM) belum diset — notifikasi order baru dilewati.");
    }

    const instructions =
      channel === "qris_shopee"
        ? { qrImage: "/qris-shopee.png" }
        : {
            bankAccountNumber: process.env.BANK_BCA_ACCOUNT_NUMBER || "",
            bankAccountName: process.env.BANK_BCA_ACCOUNT_NAME || "",
          };

    res.json({
      order_code: orderCode,
      channel,
      total_amount: totalAmount,
      ...instructions,
    });
  } catch (error: any) {
    console.error("Gagal membuat order pembayaran:", error);
    res.status(500).json({ error: error.message || "Gagal membuat order pembayaran" });
  }
});

// Poll order status from the landing page. Lazily flips a stale pending order to
// 'expired' the moment it's checked past its expires_at — no cron job needed.
app.get("/api/payment/status/:order_code", async (req, res) => {
  try {
    const { order_code } = req.params;
    const result = await pool.query(`SELECT * FROM orders WHERE order_code = $1`, [order_code]);
    let order = result.rows[0];
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    if (order.status === "pending" && new Date(order.expires_at).getTime() < Date.now()) {
      const updateResult = await pool.query(
        `UPDATE orders SET status = 'expired' WHERE order_code = $1 AND status = 'pending' RETURNING *`,
        [order_code]
      );
      order = updateResult.rows[0] || order;
    }

    res.json({
      order_code: order.order_code,
      status: order.status,
      channel: order.channel,
      total_amount: Number(order.total_amount),
    });
  } catch (error: any) {
    console.error("Gagal mengambil status order:", error);
    res.status(500).json({ error: error.message || "Gagal mengambil status order" });
  }
});

// ==========================================
// Admin Console (manual payment confirmation + user management)
// ==========================================

// Single shared password, unrelated to the `users` table / Google OAuth.
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password || !process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Password salah" });
  }
  res.cookie("admin_session", crypto.randomUUID(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    signed: true,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  });
  res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_session");
  res.json({ success: true });
});

// List orders, optionally filtered by status (e.g. ?status=pending).
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const result =
      typeof status === "string" && status
        ? await pool.query(`SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC`, [status])
        : await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar order:", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar order" });
  }
});

// Manually confirm a pending order after checking the ShopeePay/BCA mutation by hand.
app.post("/api/admin/orders/:order_code/confirm", requireAdmin, async (req, res) => {
  try {
    const { order_code } = req.params;
    const orderResult = await pool.query(`SELECT * FROM orders WHERE order_code = $1`, [order_code]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    await pool.query(
      `UPDATE orders SET status = 'settlement', confirmed_at = now(), confirmed_by = 'admin' WHERE order_code = $1`,
      [order_code]
    );

    await pool.query(
      `INSERT INTO users (email, status, activated_at)
       VALUES ($1, 'active', now())
       ON CONFLICT (email) DO UPDATE SET status = 'active', activated_at = now()`,
      [order.email]
    );

    // Best-effort, fired-and-forgotten (not awaited) — same reasoning as the
    // "Lead" event in POST /api/payment/create: the admin shouldn't sit
    // waiting on a Meta API round-trip for a click that already succeeded.
    // This is server-to-server (admin clicking in the Admin Console, no
    // browser/Pixel involved here), so user_data is just the hashed email +
    // whatever fbp/fbc were captured on the original order — helps Meta match
    // this to the earlier "Lead" event for a better match rate. A separate
    // event_id (order_code + "-confirmed") keeps this a distinct event from
    // "Lead" instead of deduping with it.
    sendMetaCapiEvent("OrderConfirmed", `${order_code}-confirmed`, {
      value: Number(order.total_amount),
      currency: "IDR",
      userData: {
        email: order.email,
        fbp: order.fbp || undefined,
        fbc: order.fbc || undefined,
      },
    }).catch((err: any) => {
      console.error("Gagal mengirim event Meta CAPI (OrderConfirmed):", err.message);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal konfirmasi order:", error);
    res.status(500).json({ error: error.message || "Gagal konfirmasi order" });
  }
});

app.post("/api/admin/orders/:order_code/cancel", requireAdmin, async (req, res) => {
  try {
    const { order_code } = req.params;
    const result = await pool.query(
      `UPDATE orders SET status = 'cancelled' WHERE order_code = $1 RETURNING id`,
      [order_code]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal membatalkan order:", error);
    res.status(500).json({ error: error.message || "Gagal membatalkan order" });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, status, joined_at, activated_at FROM users ORDER BY joined_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar users:", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar users" });
  }
});

// Grant access directly (no order involved) — e.g. free/manual access grants.
app.post("/api/admin/users/manual-activate", requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    await pool.query(
      `INSERT INTO users (email, status, activated_at)
       VALUES ($1, 'active', now())
       ON CONFLICT (email) DO UPDATE SET status = 'active', activated_at = now()`,
      [email]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal aktivasi akun manual:", error);
    res.status(500).json({ error: error.message || "Gagal aktivasi akun manual" });
  }
});

app.post("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`UPDATE users SET status = 'suspended' WHERE id = $1 RETURNING id`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal suspend user:", error);
    res.status(500).json({ error: error.message || "Gagal suspend user" });
  }
});

app.post("/api/admin/users/:id/reactivate", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE users SET status = 'active', activated_at = now() WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal mengaktifkan kembali user:", error);
    res.status(500).json({ error: error.message || "Gagal mengaktifkan kembali user" });
  }
});

// Email the user a plain link to the login page. No token, no auto-session —
// they still log in manually with Google after clicking it. Sending is always
// a manual, explicit admin action — never triggered automatically by order
// confirmation.
app.post("/api/admin/users/:id/send-login-link", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const loginUrl = `${process.env.APP_URL}/app`;
    await sendEmail(
      user.email,
      "Akses Masuk ke Akun KantongKu Anda",
      `<p>Halo${user.name ? ` ${user.name}` : ""},</p>
       <p>Berikut tautan resmi untuk masuk ke akun KantongKu Anda:</p>
       <p><a href="${loginUrl}">${loginUrl}</a></p>
       <p>Gunakan akun Google yang sama dengan yang Anda daftarkan sebelumnya. Jika Anda tidak meminta email ini, abaikan pesan ini.</p>`,
      `Berikut tautan resmi untuk masuk ke akun KantongKu Anda: ${loginUrl}\n\nGunakan akun Google yang sama dengan yang Anda daftarkan sebelumnya. Jika Anda tidak meminta email ini, abaikan pesan ini.`
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal mengirim link login:", error);
    res.status(500).json({ error: error.message || "Gagal mengirim link login" });
  }
});

// Permanently delete a user (cascades to their user_app_data row via FK).
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menghapus user:", error);
    res.status(500).json({ error: error.message || "Gagal menghapus user" });
  }
});

// Aggregate stats for the Admin Console dashboard. Every number is computed
// with SQL aggregates (COUNT/SUM/FILTER/GROUP BY) — no fetching raw rows and
// counting them in JS.
app.get("/api/admin/dashboard-stats", requireAdmin, async (req, res) => {
  try {
    const orderStats = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'settlement'), 0) AS total_revenue,
        COUNT(*) FILTER (WHERE status = 'settlement') AS successful_orders,
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > now()) AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
        COUNT(*) AS total_orders
      FROM orders
    `);

    const userStats = await pool.query(`SELECT COUNT(*) AS active_users FROM users WHERE status = 'active'`);

    const dailySignups = await pool.query(`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM orders
      WHERE created_at >= now() - interval '7 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY day ASC
    `);

    const o = orderStats.rows[0];
    const totalOrders = Number(o.total_orders);
    const successfulOrders = Number(o.successful_orders);
    const conversionRate = totalOrders > 0 ? Math.round((successfulOrders / totalOrders) * 1000) / 10 : 0;

    res.json({
      totalRevenue: Number(o.total_revenue),
      successfulOrders,
      activeUsers: Number(userStats.rows[0].active_users),
      pendingOrders: Number(o.pending_orders),
      expiredOrders: Number(o.expired_orders),
      cancelledOrders: Number(o.cancelled_orders),
      totalOrders,
      conversionRate,
      dailySignups: dailySignups.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
    });
  } catch (error: any) {
    console.error("Gagal memuat statistik dashboard:", error);
    res.status(500).json({ error: error.message || "Gagal memuat statistik dashboard" });
  }
});

// ==========================================
// Auth Routes (Google Identity Services + Session)
// ==========================================

// Verify a Google ID token, check activation status, and start a new session
// (this automatically invalidates any previous session, enforcing 1 device active at a time).
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Credential Google tidak ditemukan" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      return res.status(400).json({ error: "Token Google tidak valid" });
    }

    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = result.rows[0];

    if (!user || user.status !== "active") {
      return res.status(403).json({
        error:
          "Email ini belum terdaftar / pembayaran belum terkonfirmasi. Hubungi admin atau selesaikan pembayaran.",
      });
    }

    const sessionId = crypto.randomUUID();
    const updateResult = await pool.query(
      `UPDATE users
       SET current_session_id = $2,
           google_id = COALESCE(google_id, $3),
           name = COALESCE($4, name),
           avatar_url = COALESCE($5, avatar_url)
       WHERE id = $1
       RETURNING *`,
      [user.id, sessionId, payload.sub, payload.name || null, payload.picture || null]
    );
    const updatedUser = updateResult.rows[0];

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      signed: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      user: {
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatar_url,
      },
    });
  } catch (error: any) {
    console.error("Gagal verifikasi login Google:", error);
    res.status(401).json({ error: "Gagal memverifikasi token Google" });
  }
});

// Return the currently authenticated user
app.get("/api/me", requireSession, (req, res) => {
  const user = (req as any).user;
  res.json({
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    status: user.status,
    joinedAt: user.joined_at,
  });
});

// Clear the active session (server-side + cookie)
app.post("/api/auth/logout", async (req, res) => {
  try {
    const sessionId = req.signedCookies?.session_id;
    if (sessionId) {
      await pool.query(
        `UPDATE users SET current_session_id = NULL WHERE current_session_id = $1`,
        [sessionId]
      );
    }
    res.clearCookie("session_id");
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal logout:", error);
    res.status(500).json({ error: error.message || "Gagal logout" });
  }
});

// ==========================================
// App Data (per-account state, replaces browser localStorage)
// ==========================================

// Load the current user's saved application data (pockets, transactions, etc.)
app.get("/api/data", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await pool.query(`SELECT data FROM user_app_data WHERE user_id = $1`, [user.id]);
    res.json(result.rows[0]?.data || {});
  } catch (error: any) {
    console.error("Gagal memuat data pengguna:", error);
    res.status(500).json({ error: error.message || "Gagal memuat data" });
  }
});

// Persist the current user's application data (full snapshot overwrite)
app.put("/api/data", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const user = (req as any).user;
    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ error: "Payload data tidak valid" });
    }
    await pool.query(
      `INSERT INTO user_app_data (user_id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
      [user.id, JSON.stringify(data)]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menyimpan data pengguna:", error);
    res.status(500).json({ error: error.message || "Gagal menyimpan data" });
  }
});

// Vite Middleware Setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();