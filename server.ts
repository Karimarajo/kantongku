import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Pool } from "pg";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import midtransClient from "midtrans-client";
import { OAuth2Client } from "google-auth-library";

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

// Midtrans Snap client
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
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
  const modelsToTry = [options.model, "gemini-2.5-flash", "gemini-1.5-flash"];
  
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

// API Routes
app.post("/api/parse", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Input teks tidak boleh kosong" });
    }

    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "API Key Gemini tidak ditemukan. Harap atur di tab Profil." });
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
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Parse input berikut: "${prompt}"` }]
        }
      ],
      config: {
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: JANGAN mengarang data jika konteks tidak jelas.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer." },
            kategori: { type: "STRING", description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi." },
            tipe: { type: "STRING", description: "Pilih wajib antara: 'pemasukan' atau 'pengeluaran'." }
          },
          required: ["nominal", "kategori", "catatan", "tipe"]
        }
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
    const { mediaData, tipeMedia } = req.body;
    if (!mediaData || !tipeMedia) {
      return res.status(400).json({ error: "Data media dan tipeMedia wajib disertakan" });
    }

    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "API Key Gemini tidak ditemukan. Harap atur di tab Profil." });
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
        model: "gemini-2.5-flash",
        contents: promptLengkap
      });

      return res.json({ analisis_laporan_wa: response.text || "" });
    }

    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    // PERBAIKAN: Menggunakan model stabil 'gemini-2.5-flash' dan skema tipe string
    const response = await generateContentWithRetry(aiInstance, {
      model: "gemini-2.5-flash",
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
        systemInstruction: "Kamu adalah mesin parser JSON untuk aplikasi KantongKu. Tugasmu adalah menerima input (teks ucapan, transkrip suara, atau foto struk) dari user, lalu mengubahnya menjadi format transaksi terstruktur yang siap dimasukkan ke database Firebase. Wajib keluarkan data dalam bentuk JSON mentah yang valid. PENTING: Jika audio tidak terdengar jelas, kosong, atau gambar tidak mengandung transaksi, JANGAN mengarang data. Kembalikan nominal 0, catatan 'Tidak terdeteksi', dan kategori 'Lainnya'.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            nominal: { type: "INTEGER", description: "Jumlah uang dalam bentuk angka integer. Jika tidak ada, isi 0." },
            kategori: { type: "STRING", description: "Kategori pengeluaran/pemasukan. Jika tidak tahu, isi 'Lainnya'." },
            catatan: { type: "STRING", description: "Keterangan singkat tentang transaksi. Jika suara tidak jelas, tulis 'Tidak terdeteksi'." },
            sumber_dana: { type: "STRING", description: "Sumber dana (Bank_BCA / Dana / GoPay / Cash). Default: 'Cash'." },
            kepemilikan: { type: "STRING", description: "Pilih wajib antara: 'Uangku' (pribadi), 'Uang Orang' (grup/kas), atau 'Uang Bisnis'." },
            tipe: { type: "STRING", description: "Pilih wajib antara: 'pemasukan' atau 'pengeluaran'." }
          },
          required: ["nominal", "kategori", "catatan", "sumber_dana", "kepemilikan", "tipe"]
        }
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
// Payment Routes (Midtrans Snap)
// ==========================================

// Public, non-secret payment config for the frontend (price + sandbox/production flag)
app.get("/api/payment/config", (req, res) => {
  const amount = Number(process.env.PRICE_AMOUNT);
  res.json({
    amount: Number.isFinite(amount) ? amount : 0,
    label: process.env.PRICE_LABEL || "",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  });
});

// Create a pending order and a Snap payment token
app.post("/api/payment/create", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Nama dan email wajib diisi" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }

    const amount = Number(process.env.PRICE_AMOUNT);
    if (!amount || amount <= 0) {
      return res.status(500).json({ error: "Konfigurasi harga (PRICE_AMOUNT) belum diatur di server" });
    }

    const orderId = `KANTONGKU-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    await pool.query(
      `INSERT INTO orders (email, midtrans_order_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [email, orderId, amount]
    );

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: name,
        email,
      },
    });

    res.json({ token: transaction.token, order_id: orderId });
  } catch (error: any) {
    console.error("Gagal membuat transaksi pembayaran:", error);
    res.status(500).json({ error: error.message || "Gagal membuat transaksi pembayaran" });
  }
});

// Midtrans notification webhook
app.post("/api/payment/webhook", async (req, res) => {
  try {
    const notification = req.body || {};
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = notification;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return res.status(400).json({ error: "Payload notifikasi tidak lengkap" });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const expectedSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    if (expectedSignature !== signature_key) {
      console.warn("[Midtrans Webhook] Signature tidak cocok untuk order:", order_id);
      return res.status(401).json({ error: "Signature tidak valid" });
    }

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE midtrans_order_id = $1`,
      [order_id]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    const isPaid =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isPaid) {
      // Upsert user: create if not exists, activate regardless
      await pool.query(
        `INSERT INTO users (email, status, activated_at)
         VALUES ($1, 'active', now())
         ON CONFLICT (email) DO UPDATE SET status = 'active', activated_at = now()`,
        [order.email]
      );

      await pool.query(
        `UPDATE orders SET status = 'settlement', paid_at = now(), raw_notification = $2
         WHERE midtrans_order_id = $1`,
        [order_id, notification]
      );
    } else if (["expire", "cancel", "deny"].includes(transaction_status)) {
      await pool.query(
        `UPDATE orders SET status = $2, raw_notification = $3
         WHERE midtrans_order_id = $1`,
        [order_id, transaction_status, notification]
      );
    } else {
      // Pending or other in-progress statuses: just record the raw notification
      await pool.query(
        `UPDATE orders SET raw_notification = $2 WHERE midtrans_order_id = $1`,
        [order_id, notification]
      );
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Gagal memproses webhook Midtrans:", error);
    res.status(500).json({ error: error.message || "Gagal memproses notifikasi" });
  }
});

// Poll order status from frontend
app.get("/api/payment/status/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;
    const result = await pool.query(
      `SELECT status FROM orders WHERE midtrans_order_id = $1`,
      [order_id]
    );
    const order = result.rows[0];
    if (!order) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }
    res.json({ status: order.status });
  } catch (error: any) {
    console.error("Gagal mengambil status order:", error);
    res.status(500).json({ error: error.message || "Gagal mengambil status order" });
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