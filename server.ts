import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Pool } from "pg";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "./lib/email";
import { sendMetaCapiEvent } from "./lib/metaCapi";
import { parseUserAgent } from "./lib/userAgent";
import { isPushConfigured, sendPushToSubscriptions } from "./lib/push";

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

    // Collaboration (Task 2): if this logged-in email is an ACTIVE
    // collaborator on someone else's account, every data read/write for this
    // request must resolve to the OWNER's row, not this user's own — that's
    // the whole point of "full access to the same data as the owner". This
    // must be awaited (not fire-and-forget like last_active_at below) since
    // it's correctness-critical for data isolation, not just cosmetic.
    //
    // requireSession is the single choke point every data-bearing route goes
    // through, so resolving it once here (as req.effectiveUserId) means
    // /api/data and friends never need to know about collaboration at all —
    // they just read/write req.effectiveUserId instead of req.user.id.
    const collabResult = await pool.query(
      `SELECT c.owner_user_id, o.email AS owner_email
       FROM collaborators c
       JOIN users o ON o.id = c.owner_user_id
       WHERE c.email = $1 AND c.status = 'active'`,
      [user.email]
    );
    const collab = collabResult.rows[0];
    (req as any).effectiveUserId = collab ? collab.owner_user_id : user.id;
    (req as any).collaboratorOwnerEmail = collab ? collab.owner_email : null;

    // Best-effort "terakhir aktif" tracking for the Admin Console — this is the
    // busiest authenticated choke point (hit by /api/me and every /api/data
    // call), so it's representative without needing its own middleware on
    // every route. Fire-and-forget: never awaited, has its own .catch(), so a
    // slow/failed UPDATE can never add latency to (let alone fail) the actual
    // request the user is waiting on.
    pool
      .query(`UPDATE users SET last_active_at = now() WHERE id = $1`, [user.id])
      .catch((err: any) => {
        console.error("Gagal memperbarui last_active_at:", err.message);
      });

    next();
  } catch (error: any) {
    console.error("Gagal memeriksa sesi:", error);
    res.status(500).json({ error: "Gagal memeriksa sesi" });
  }
}

// Requires req.user (set by requireSession) to have status 'active'; 403 otherwise.
function requireActiveStatus(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  // A pure collaborator's OWN users.status is deliberately left at 'pending'
  // (never persisted as 'active' — see resolveLoginAccess in server.ts), so
  // req.collaboratorOwnerEmail (set by requireSession, re-checked fresh every
  // request) is what proves they're allowed through here instead.
  const isActiveCollaborator = !!(req as any).collaboratorOwnerEmail;
  if (!user || (user.status !== "active" && !isActiveCollaborator)) {
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
  // options.model is the caller's requested model (now "gemini-3.5-flash-lite"
  // everywhere it's called below) — if that 404s/isn't available on this API
  // key's project yet, fall back to the previous-gen models rather than
  // taking the AI features down entirely.
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
      model: "gemini-3.5-flash-lite",
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
        model: "gemini-3.5-flash-lite",
        contents: promptLengkap
      });

      return res.json({ analisis_laporan_wa: response.text || "" });
    }

    let cleanBase64 = mediaData;
    if (mediaData.includes(";base64,")) {
      cleanBase64 = mediaData.split(";base64,")[1];
    }

    // PERBAIKAN: Menggunakan model stabil 'gemini-3.5-flash-lite' dan skema tipe string
    const response = await generateContentWithRetry(aiInstance, {
      model: "gemini-3.5-flash-lite",
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
// Push Notification (PWA) — cicilan-ai-notifikasi Task 5
// ==========================================
// Fully additive/non-blocking by design: every route here degrades
// gracefully (empty publicKey, 200-with-a-no-op, etc.) when VAPID isn't
// configured, and the reminder-scanning cron below only ever ADDS a push
// send on top of the EXISTING client-side reminder mechanism — it never
// replaces it, so reminders still work exactly as before even if push was
// never enabled by a given user.

app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : null });
});

// Save (or refresh) a browser's push subscription. Keyed by effectiveUserId
// — the OWNER's id, same as every other piece of per-account data in this
// app (see the comment on the push_subscriptions table in db/schema.sql) —
// so a collaborator's own device also gets notified about the owner's
// reminders, consistent with a collaborator already seeing all that data.
app.post("/api/push/subscribe", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const effectiveUserId = (req as any).effectiveUserId;
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Data subscription tidak lengkap" });
    }
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
      [effectiveUserId, String(endpoint), String(keys.p256dh), String(keys.auth)]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menyimpan push subscription:", error);
    res.status(500).json({ error: error.message || "Gagal menyimpan subscription notifikasi" });
  }
});

// Best-effort cleanup when a user explicitly turns notifications back off
// client-side — not required for correctness (the cron below already
// self-heals expired subscriptions on send failure) but avoids leaving a
// stale row around indefinitely if the user disables it well before it
// would ever naturally expire.
app.post("/api/push/unsubscribe", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const effectiveUserId = (req as any).effectiveUserId;
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint wajib diisi" });
    await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [effectiveUserId, String(endpoint)]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menghapus push subscription:", error);
    res.status(500).json({ error: error.message || "Gagal menghapus subscription notifikasi" });
  }
});

// Same due-reminder matching semantics as the client-side checkAlarms effect
// in App.tsx, just coarser (a poll tick, not an exact-minute match) since
// this runs on a multi-minute server interval, not a live browser clock. Once
// a reminder's time-of-day has passed today AND today's date pattern
// matches AND it hasn't already fired today, it's due.
function isReminderDueForPush(reminder: any, now: Date): boolean {
  if (!reminder?.isActive) return false;
  const { dateStr: currentDateStr, hour, minute, dayOfWeek, dayOfMonth } = getWibDateParts(now);
  if (reminder.lastTriggeredDate === currentDateStr) return false;

  const [rh, rm] = String(reminder.time || "00:00").split(":").map((n: string) => parseInt(n, 10) || 0);
  const reminderMinutes = rh * 60 + rm;
  const nowMinutes = hour * 60 + minute;
  if (nowMinutes < reminderMinutes) return false;

  if (reminder.repeatType === "once" || reminder.repeatType === "every_day") return true;
  if (reminder.repeatType === "every_week") return reminder.dayOfWeek === dayOfWeek;
  if (reminder.repeatType === "every_month") return reminder.dayOfMonth === dayOfMonth;
  return false;
}

// Server-side trigger (Task 5): periodically scans every account's
// reminders — this ALREADY covers Task 3's debt reminders too, since a debt
// auto-creates a normal entry in the same `reminders` array (see
// handleAddDebt in App.tsx) rather than a parallel mechanism. Runs
// independently of any browser being open, which is the whole point of a
// "background" push notification.
//
// Known limitation, inherited from this app's existing whole-blob-overwrite
// persistence (GET/PUT /api/data has no field-level merge, see above): if a
// client happens to PUT /api/data at the exact same moment this cron writes
// back an updated `lastTriggeredDate`, one write can clobber the other. This
// is the same last-write-wins tradeoff every other field in this JSONB blob
// already has, not a new risk introduced here — acceptable at this app's
// scale, and worst case is a reminder firing/not firing once, never data loss.
const REMINDER_PUSH_INTERVAL_MS = 5 * 60 * 1000;

async function runReminderPushSweep() {
  if (!isPushConfigured()) return; // nothing to do, no VAPID keys configured

  try {
    const now = new Date();
    const [dataRows, subRows] = await Promise.all([
      pool.query(`SELECT user_id, data FROM user_app_data`),
      pool.query(`SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions`),
    ]);

    const subsByUser = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
    for (const row of subRows.rows) {
      const list = subsByUser.get(row.user_id) || [];
      list.push(row);
      subsByUser.set(row.user_id, list);
    }

    for (const row of dataRows.rows) {
      const data = row.data || {};
      const reminders: any[] = Array.isArray(data.reminders) ? data.reminders : [];
      if (reminders.length === 0) continue;

      const subs = subsByUser.get(row.user_id);
      let anyDue = false;
      const currentDateStr = getWibDateParts(now).dateStr;
      const nextReminders = reminders.map((r) => {
        if (!isReminderDueForPush(r, now)) return r;
        anyDue = true;
        return { ...r, lastTriggeredDate: currentDateStr, isActive: r.repeatType === "once" ? false : r.isActive };
      });
      if (!anyDue) continue;

      // Persist the updated lastTriggeredDate/isActive back — otherwise this
      // sweep would re-fire the same reminder every 5 minutes all day.
      await pool.query(
        `UPDATE user_app_data SET data = $2, updated_at = now() WHERE user_id = $1`,
        [row.user_id, JSON.stringify({ ...data, reminders: nextReminders })]
      );

      if (!subs || subs.length === 0) continue; // no device subscribed for this account
      const dueTitles = nextReminders.filter((r, i) => reminders[i].lastTriggeredDate !== r.lastTriggeredDate).map((r) => r.title);
      for (const title of dueTitles) {
        const { expiredIds } = await sendPushToSubscriptions(subs, {
          title: "Pengingat KantongKu",
          body: title,
          icon: "/logo.png",
        });
        if (expiredIds.length > 0) {
          await pool.query(`DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])`, [expiredIds]);
          // Also drop them from this tick's in-memory list so a second due
          // reminder in the same sweep doesn't retry the same dead subscriptions.
          const stillValid = subs.filter((s) => !expiredIds.includes(s.id));
          subsByUser.set(row.user_id, stillValid);
        }
      }
    }
  } catch (error: any) {
    // Best-effort by design — a failed sweep must never crash the server or
    // block the next tick.
    console.error("Reminder push sweep gagal (akan dicoba lagi tick berikutnya):", error.message);
  }
}

// ==========================================
// Analisis Kesehatan Keuangan AI (cicilan-ai-notifikasi Task 4)
// ==========================================
//
// Decision write-up (prompt explicitly asked for this to be documented):
// history storage was left OPTIONAL by the prompt ("kalau scope-nya
// kebesaran untuk sekarang, cukup tampilkan hasil real-time... TULISKAN
// keputusan mana yang diambil"). Given Task 3/4/5 of this same prompt are
// each already large on their own, this endpoint is REAL-TIME ONLY — no new
// `financial_health_analyses` table, nothing persisted server-side. Every
// call recomputes fresh from the current user_app_data snapshot. Revisit
// later if trend-over-time actually becomes a requested feature.

const FINANCIAL_HEALTH_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: ["Sehat", "Cukup Sehat", "Perlu Perhatian"], description: "Klasifikasi kondisi keuangan berdasarkan 3 rasio yang diberikan." },
    narrative: { type: "STRING", description: "Penjelasan naratif personal (2-4 kalimat) yang merujuk ke angka rasio & rupiah nyata milik user ini, bukan generik." },
    suggestions: { type: "ARRAY", items: { type: "STRING" }, description: "2-3 saran actionable, spesifik ke kondisi user ini." }
  },
  required: ["category", "narrative", "suggestions"]
};

function buildFinancialHealthSystemInstruction(): string {
  return `Kamu adalah asisten analisis kesehatan keuangan pribadi untuk aplikasi KantongKu, mengacu ke kerangka 3 rasio keuangan pribadi standar Indonesia (sumber: OJK Sikapi Uangmu & QM Financial). JANGAN mengarang ambang batas lain selain berikut:
1. Rasio Cicilan/Utang (total cicilan bulanan ÷ total pemasukan bulanan) — sehat maksimal 30%.
2. Rasio Menabung/Investasi (setoran tabungan bulanan ÷ total pemasukan bulanan) — sehat minimal 10%.
3. Rasio Likuiditas/Dana Darurat (saldo wallet likuid ÷ rata-rata pengeluaran bulanan) — sehat idealnya 3x-6x pengeluaran bulanan.

Berdasarkan angka rasio yang diberikan user (sudah dihitung oleh server, kamu TIDAK perlu menghitung ulang), klasifikasikan ke salah satu: "Sehat" (semua/mayoritas rasio dalam ambang sehat), "Cukup Sehat" (sebagian rasio sehat, sebagian mendekati/sedikit di luar ambang), atau "Perlu Perhatian" (mayoritas rasio jauh dari ambang sehat, mis. cicilan >50% pemasukan atau dana darurat nyaris kosong).

Tulis narasi personal berbahasa Indonesia santai (2-4 kalimat) yang MERUJUK ANGKA NYATA yang diberikan (persentase & rupiah), bukan kalimat generik yang bisa berlaku untuk siapa saja. Beri 2-3 saran actionable yang spesifik ke kondisi rasio user ini (misal: rasio cicilan tinggi → saran soal itu; dana darurat tipis → saran soal itu), bukan saran umum "rajin menabung" tanpa konteks.`;
}

// Rule-based fallback classification — used both as a starting hint for the
// AI prompt and, more importantly, as the fallback result when the Gemini
// call itself fails, so this endpoint never just errors out with nothing
// useful (constraint: AI stays best-effort, never blocks the feature).
function classifyRatiosLocally(debtRatioPercent: number, savingsRatioPercent: number, liquidityRatioX: number | null): 'Sehat' | 'Cukup Sehat' | 'Perlu Perhatian' {
  const debtOk = debtRatioPercent <= 30;
  const savingsOk = savingsRatioPercent >= 10;
  const liquidityOk = liquidityRatioX !== null && liquidityRatioX >= 3;
  const okCount = [debtOk, savingsOk, liquidityOk].filter(Boolean).length;
  if (okCount === 3) return 'Sehat';
  if (okCount >= 1) return 'Cukup Sehat';
  return 'Perlu Perhatian';
}

app.post("/api/analysis/financial-health", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const effectiveUserId = (req as any).effectiveUserId;
    const { startDate, endDate } = req.body || {};

    const dataResult = await pool.query(`SELECT data FROM user_app_data WHERE user_id = $1`, [effectiveUserId]);
    const appData = dataResult.rows[0]?.data || {};
    const transactions: any[] = Array.isArray(appData.transactions) ? appData.transactions : [];
    const accounts: any[] = Array.isArray(appData.accounts) ? appData.accounts : [];
    const debts: any[] = Array.isArray(appData.debts) ? appData.debts : [];

    // Default range: last 1 month, per the prompt's own spec.
    const rangeEnd = endDate ? new Date(endDate) : new Date();
    const rangeStart = startDate ? new Date(startDate) : new Date(rangeEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) {
      return res.status(400).json({ error: "Rentang tanggal tidak valid" });
    }

    const inRange = transactions.filter((t) => {
      const d = new Date(t.date);
      return !isNaN(d.getTime()) && d >= rangeStart && d <= rangeEnd;
    });
    const rangeDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const normalizeToMonthly = (total: number) => total * (30 / rangeDays);

    const totalIncome = inRange.filter((t) => t.type === "incoming").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalExpense = inRange.filter((t) => t.type === "outgoing").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthlyIncome = normalizeToMonthly(totalIncome);
    const monthlyExpense = normalizeToMonthly(totalExpense);

    // Rasio 1 — Cicilan/Utang: cicilan aktif dari fitur Kelola Cicilan/Hutang.
    const totalMonthlyInstallments = debts.filter((d) => d.status === "active").reduce((s, d) => s + (Number(d.monthlyInstallment) || 0), 0);
    const debtRatioPercent = monthlyIncome > 0 ? (totalMonthlyInstallments / monthlyIncome) * 100 : (totalMonthlyInstallments > 0 ? 100 : 0);

    // Rasio 2 — Menabung/Investasi: proxy dari transaksi pemasukan berkategori
    // 'topup' ("Top Up Saldo" — satu-satunya kategori setoran dana eksplisit
    // yang ada di data model saat ini; app ini belum punya penanda transaksi
    // "setoran tabungan" yang terpisah dari top-up wallet biasa).
    const topupIncome = inRange.filter((t) => t.type === "incoming" && t.category === "topup").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthlyTopupIncome = normalizeToMonthly(topupIncome);
    const savingsRatioPercent = monthlyIncome > 0 ? (monthlyTopupIncome / monthlyIncome) * 100 : 0;

    // Rasio 3 — Likuiditas/Dana Darurat: seluruh saldo rekening/wallet
    // (aplikasi ini belum membedakan aset likuid vs tidak likuid — semua
    // Account yang ada, mis. Bank/GoPay/Cash, sudah likuid by definition).
    const liquidBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const liquidityRatioX = monthlyExpense > 0 ? liquidBalance / monthlyExpense : null;

    const ratios = {
      debt: { percent: Math.round(debtRatioPercent * 10) / 10, healthyThreshold: "maksimal 30%" },
      savings: { percent: Math.round(savingsRatioPercent * 10) / 10, healthyThreshold: "minimal 10%" },
      liquidity: { multiplier: liquidityRatioX !== null ? Math.round(liquidityRatioX * 10) / 10 : null, healthyThreshold: "idealnya 3x-6x pengeluaran bulanan" },
    };

    // Ringkasan AGGREGATE dikirim ke Gemini — privasi: total per kategori,
    // BUKAN judul/catatan transaksi individual.
    const categoryTotals: Record<string, number> = {};
    inRange.filter((t) => t.type === "outgoing").forEach((t) => {
      const cat = String(t.category || "lainnya");
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
    });

    const localCategory = classifyRatiosLocally(debtRatioPercent, savingsRatioPercent, liquidityRatioX);

    const summaryForAi = {
      periode: { dari: rangeStart.toISOString().slice(0, 10), sampai: rangeEnd.toISOString().slice(0, 10) },
      rasio_cicilan_utang_persen: ratios.debt.percent,
      rasio_menabung_persen: ratios.savings.percent,
      rasio_likuiditas_kali_pengeluaran: ratios.liquidity.multiplier,
      total_pemasukan_bulanan_rp: Math.round(monthlyIncome),
      total_pengeluaran_bulanan_rp: Math.round(monthlyExpense),
      total_cicilan_bulanan_rp: Math.round(totalMonthlyInstallments),
      saldo_likuid_rp: Math.round(liquidBalance),
      ringkasan_pengeluaran_per_kategori: categoryTotals,
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Best-effort: AI belum dikonfigurasi — tetap kembalikan hasil
      // berbasis rasio (fallback rule-based), jangan gagalkan seluruh fitur.
      return res.json({
        category: localCategory,
        ratios,
        narrative: "Analisis AI belum tersedia (API key belum dikonfigurasi di server) — klasifikasi di atas dihitung langsung dari ambang batas rasio standar.",
        suggestions: [],
        aiUnavailable: true,
      });
    }

    try {
      const aiInstance = new GoogleGenAI({
        apiKey: apiKey as string,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const response = await generateContentWithRetry(aiInstance, {
        model: "gemini-3.5-flash-lite",
        contents: [{ role: "user", parts: [{ text: `Data rasio & ringkasan keuangan user:\n${JSON.stringify(summaryForAi, null, 2)}` }] }],
        config: {
          systemInstruction: buildFinancialHealthSystemInstruction(),
          responseMimeType: "application/json",
          responseSchema: FINANCIAL_HEALTH_RESPONSE_SCHEMA,
        },
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json({
        category: parsed.category || localCategory,
        ratios,
        narrative: parsed.narrative || "",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      });
    } catch (aiError: any) {
      console.error("Analisis kesehatan keuangan: panggilan Gemini gagal (fallback ke rule-based):", aiError.message);
      res.json({
        category: localCategory,
        ratios,
        narrative: "AI sedang tidak bisa dihubungi saat ini — klasifikasi di atas dihitung langsung dari ambang batas rasio standar, tanpa narasi personal AI.",
        suggestions: [],
        aiUnavailable: true,
      });
    }
  } catch (error: any) {
    console.error("Gagal menghitung analisis kesehatan keuangan:", error);
    res.status(500).json({ error: error.message || "Gagal menghitung analisis kesehatan keuangan" });
  }
});

// ==========================================
// Payment Routes (manual: QRIS statis, Task 2)
// ==========================================

// Price for a collaborator seat order (Task 2 revision) — deliberately NOT
// PRICE_AMOUNT (that's the main license, defaults Rp49.000, a different
// product). Override via env if needed; 17900 is the agreed default.
const COLLABORATOR_PRICE_AMOUNT = Number(process.env.COLLABORATOR_PRICE_AMOUNT) || 17900;

// Public, non-secret payment config for the frontend (price only — no secrets)
app.get("/api/payment/config", (req, res) => {
  const amount = Number(process.env.PRICE_AMOUNT);
  res.json({
    amount: Number.isFinite(amount) ? amount : 0,
    label: process.env.PRICE_LABEL || "",
    collaboratorAmount: COLLABORATOR_PRICE_AMOUNT,
  });
});

// Task 2: single static QRIS image served from public/ (works with any
// QRIS-compatible scanner — GoPay, OVO, DANA, mobile banking, etc, not just
// ShopeePay) — the only payment method now shown to customers, matched by
// hand against the unique-code total via the Admin Console.
const STATIC_QRIS_IMAGE_PATH = "/qris-statis.png";

// Short, human-readable order reference, e.g. "KK-20260809-4F2A".
function generateOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `KK-${y}${m}${d}-${rand}`;
}

interface CreateOrderParams {
  name: string;
  email: string;
  channel: "qris_shopee" | "transfer_bca";
  baseAmount: number;
  orderType: "license" | "collaborator";
  collaboratorOwnerUserId?: string | null;
  collaboratorEmail?: string | null;
  utm?: {
    source?: string | null; medium?: string | null; campaign?: string | null;
    content?: string | null; term?: string | null; fbclid?: string | null;
    fbp?: string | null; fbc?: string | null;
  };
  requestIp?: string;
  requestUserAgent?: string;
  requestReferer?: string;
}

interface CreateOrderResult {
  order_code: string;
  channel: "qris_shopee" | "transfer_bca";
  total_amount: number;
  qrImage?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

// Shared by POST /api/payment/create (license) and POST /api/collaborators/invite
// (collaborator seat, Task 2 revision) — SAME manual-payment infrastructure
// for both: unique-code generator, order_code generator, orders row insert,
// admin notification email. Meta CAPI ("Lead") is fired ONLY for license
// orders — a collaborator invite isn't part of the ad-funnel being tracked.
async function createOrderRecord(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { name, email, channel, baseAmount, orderType } = params;
  if (!["qris_shopee", "transfer_bca"].includes(channel)) {
    throw Object.assign(new Error("Metode pembayaran tidak dikenali"), { statusCode: 400 });
  }
  if (!baseAmount || baseAmount <= 0) {
    throw Object.assign(new Error("Konfigurasi harga belum diatur di server"), { statusCode: 500 });
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
    throw Object.assign(new Error("Sistem sedang sibuk, coba lagi sebentar lagi"), { statusCode: 503 });
  }

  const totalAmount = baseAmount + uniqueCode;
  const utm = params.utm || {};

  let orderCode = "";
  let inserted = false;
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    orderCode = generateOrderCode();
    try {
      await pool.query(
        `INSERT INTO orders (
           order_code, name, email, channel, base_amount, unique_code, total_amount, status, expires_at,
           utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, fbp, fbc,
           order_type, collaborator_owner_user_id, collaborator_email
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', now() + interval '24 hours', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          orderCode, name, email, channel, baseAmount, uniqueCode, totalAmount,
          utm.source || null, utm.medium || null, utm.campaign || null, utm.content || null,
          utm.term || null, utm.fbclid || null, utm.fbp || null, utm.fbc || null,
          orderType, params.collaboratorOwnerUserId || null, params.collaboratorEmail || null,
        ]
      );
      inserted = true;
    } catch (err: any) {
      if (err.code !== "23505") throw err; // not a unique_violation on order_code, rethrow
    }
  }
  if (!inserted) {
    throw Object.assign(new Error("Gagal membuat kode order, coba lagi"), { statusCode: 503 });
  }

  // --- Best-effort side effects below: Meta CAPI event + admin notification
  // email. Fired-and-forgotten on purpose — NOT awaited — so a slow/failed
  // network call to Meta or a hanging SMTP connection can never add latency
  // to (let alone fail) the order response the customer is waiting on.
  if (orderType === "license") {
    sendMetaCapiEvent("Lead", orderCode, {
      value: totalAmount,
      currency: "IDR",
      eventSourceUrl: params.requestReferer,
      userData: {
        email,
        clientIpAddress: params.requestIp || undefined,
        clientUserAgent: params.requestUserAgent,
        fbp: utm.fbp || undefined,
        fbc: utm.fbc || undefined,
      },
    }).catch((err: any) => {
      console.error("Gagal mengirim event Meta CAPI (Lead):", err.message);
    });
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM;
  if (adminEmail) {
    // Semua channel pembayaran sekarang dibayar lewat QRIS statis yang sama —
    // tidak ada lagi pembedaan Transfer BCA vs ShopeePay.
    const channelLabel = "QRIS";
    const sourceLine = utm.source
      ? `<p><b>Sumber:</b> ${utm.source}${utm.campaign ? ` / ${utm.campaign}` : ""}</p>`
      : "";
    const typeLine = orderType === "collaborator"
      ? `<p><b>Jenis:</b> Kolaborator (untuk akun pemilik: ${name})</p>`
      : "";
    sendEmail(
      adminEmail,
      `[KantongKu] Order baru masuk${orderType === "collaborator" ? " (Kolaborator)" : ""} — ${orderCode}`,
      `<h2>Order Baru${orderType === "collaborator" ? " — Kolaborator" : ""}</h2>
       <p><b>Nama:</b> ${name}</p>
       <p><b>Email:</b> ${email}</p>
       ${typeLine}
       <p><b>Metode Pembayaran:</b> ${channelLabel}</p>
       <p><b>Total Tagihan:</b> Rp${totalAmount.toLocaleString("id-ID")} (harga Rp${baseAmount.toLocaleString("id-ID")} + kode unik ${uniqueCode})</p>
       ${sourceLine}
       <p><a href="${process.env.APP_URL}/admin">Buka Admin Console</a></p>`,
      `Order baru${orderType === "collaborator" ? " (Kolaborator)" : ""}: ${orderCode}\nNama: ${name}\nEmail: ${email}\nMetode: ${channelLabel}\nTotal: Rp${totalAmount.toLocaleString("id-ID")}\nAdmin Console: ${process.env.APP_URL}/admin`
    ).catch((err: any) => {
      console.error("Gagal mengirim email notifikasi order baru:", err.message);
    });
  } else {
    console.warn("ADMIN_NOTIFY_EMAIL (dan EMAIL_FROM) belum diset — notifikasi order baru dilewati.");
  }

  // Customer-facing counterpart to the admin notification above — order
  // confirmation + how much to pay + the QRIS to scan + the 1x24 jam
  // confirmation SLA. See sendOrderPendingPaymentEmail for details.
  sendOrderPendingPaymentEmail({ name, email, orderType, orderCode, totalAmount });

  return {
    order_code: orderCode,
    channel,
    total_amount: totalAmount,
    qrImage: STATIC_QRIS_IMAGE_PATH,
  };
}

// Create a pending manual-payment order for the MAIN LICENSE. A random 0-999
// "kode unik" is added to the base price so the exact total_amount can be
// matched by hand against a QRIS mutation later — no payment gateway
// involved.
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }

    const baseAmount = Number(process.env.PRICE_AMOUNT);
    if (!baseAmount || baseAmount <= 0) {
      return res.status(500).json({ error: "Konfigurasi harga (PRICE_AMOUNT) belum diatur di server" });
    }

    const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const result = await createOrderRecord({
      name, email, channel, baseAmount, orderType: "license",
      utm: { source: utm_source, medium: utm_medium, campaign: utm_campaign, content: utm_content, term: utm_term, fbclid, fbp, fbc },
      requestIp: forwardedFor || req.socket.remoteAddress || undefined,
      requestUserAgent: req.headers["user-agent"] as string | undefined,
      requestReferer: req.headers.referer as string | undefined,
    });
    res.json(result);
  } catch (error: any) {
    console.error("Gagal membuat order pembayaran:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Gagal membuat order pembayaran" });
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

// Task 6 — Activity Log retention (14 days). `activityLog` lives inside each
// account's user_app_data JSONB blob (same read-through as the admin
// endpoint above), so "DELETE ... WHERE created_at < ..." doesn't apply
// directly — there's no separate SQL table/rows to delete, just an array
// field to trim. Mirrors this file's existing background-sweep convention
// (see runReminderPushSweep below): scan, filter in JS, write back only the
// rows that actually changed.
const ACTIVITY_LOG_RETENTION_DAYS = 14;
const ACTIVITY_LOG_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day is plenty for a 14-day window

async function runActivityLogCleanup() {
  try {
    const cutoffMs = Date.now() - ACTIVITY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    // jsonb_array_length guard skips accounts with an empty/missing
    // activityLog entirely — no point pulling their whole data blob just to
    // find nothing to trim.
    const dataRows = await pool.query(
      `SELECT user_id, data FROM user_app_data
       WHERE jsonb_typeof(data->'activityLog') = 'array' AND jsonb_array_length(data->'activityLog') > 0`
    );

    let trimmedUsers = 0;
    for (const row of dataRows.rows) {
      const data = row.data || {};
      const log: any[] = Array.isArray(data.activityLog) ? data.activityLog : [];
      const kept = log.filter((entry) => {
        const t = new Date(entry?.timestamp).getTime();
        // Defensive: an entry with a missing/unparseable timestamp is kept
        // rather than silently discarded — better to over-retain a
        // malformed entry than lose user data to a parsing edge case.
        return !Number.isFinite(t) || t >= cutoffMs;
      });
      if (kept.length === log.length) continue; // nothing older than 14 days here

      await pool.query(
        `UPDATE user_app_data SET data = $2, updated_at = now() WHERE user_id = $1`,
        [row.user_id, JSON.stringify({ ...data, activityLog: kept })]
      );
      trimmedUsers++;
    }
    if (trimmedUsers > 0) {
      console.log(`Activity log cleanup: trimmed entries older than ${ACTIVITY_LOG_RETENTION_DAYS} hari untuk ${trimmedUsers} akun.`);
    }
  } catch (error: any) {
    // Best-effort by design — same footing as runReminderPushSweep: a
    // failed sweep must never crash the server or block the next tick.
    console.error("Activity log cleanup gagal (akan dicoba lagi tick berikutnya):", error.message);
  }
}

// Task 7 — daily 20:00 WIB "sudah input transaksi hari ini?" broadcast to
// EVERY active push subscriber, independent of each account's own
// custom reminders/debts above (those still work exactly the same,
// unaffected by this). One shared in-memory flag tracks the WIB calendar
// date this last fired for, so the 5-minute-granularity sweep tick below
// doesn't double-send within the ~5 minute window it catches 20:00 in —
// resets naturally at WIB midnight since the date string changes. A server
// restart could in theory cause a second send on the same day if it
// happens to restart inside that same 5-minute window — an acceptable,
// extremely rare edge case (same "worst case: fires once extra, never data
// loss" tolerance as the reminder sweep above), not worth a DB-backed flag.
let lastDailyTransactionReminderDateWIB: string | null = null;

// Asia/Jakarta is a fixed UTC+7 offset with no DST — safe to compute by
// hand without a timezone library (constraint: no new dependency for this
// task besides `web-push` itself). Also used by isReminderDueForPush/
// runReminderPushSweep above (function declarations are hoisted, so the
// earlier-in-file usage is fine) — the production container runs Node with
// no TZ set (node:20-slim defaults to UTC), so `now.getHours()` etc. on a
// bare `new Date()` reflect UTC, not WIB. Every reminder time the user picks
// in the UI is a WIB wall-clock time, so any due-check must convert through
// this helper — using bare local getters here previously fired custom/debt
// reminders up to 7 hours late (or on the wrong WIB calendar day).
function getWibDateParts(now: Date): { dateStr: string; hour: number; minute: number; dayOfWeek: number; dayOfMonth: number } {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return {
    dateStr: wib.toISOString().slice(0, 10),
    hour: wib.getUTCHours(),
    minute: wib.getUTCMinutes(),
    dayOfWeek: wib.getUTCDay(),
    dayOfMonth: wib.getUTCDate(),
  };
}

async function runDailyTransactionReminderSweep() {
  if (!isPushConfigured()) return;
  try {
    const { dateStr, hour, minute } = getWibDateParts(new Date());
    // 20:00–20:04 WIB window — matches this sweep's 5-minute tick interval
    // (REMINDER_PUSH_INTERVAL_MS) so it fires exactly once as soon as the
    // window opens, without needing sub-minute precision.
    if (hour !== 20 || minute >= 5) return;
    if (lastDailyTransactionReminderDateWIB === dateStr) return; // already sent today
    lastDailyTransactionReminderDateWIB = dateStr;

    const subsResult = await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions`);
    if (subsResult.rowCount === 0) return;

    const { sent, expiredIds } = await sendPushToSubscriptions(subsResult.rows, {
      title: "Sudah catat transaksi hari ini?",
      body: "Jangan lupa input pemasukan/pengeluaran hari ini biar catatan keuanganmu tetap rapi.",
      icon: "/logo.png",
    });
    if (expiredIds.length > 0) {
      await pool.query(`DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])`, [expiredIds]);
    }
    console.log(`Daily transaction reminder (20:00 WIB) terkirim ke ${sent} subscription.`);
  } catch (error: any) {
    // Best-effort by design, same footing as runReminderPushSweep — never
    // crash the server or block the next tick.
    console.error("Daily transaction reminder sweep gagal:", error.message);
  }
}

// ==========================================
// Landing Page Analytics (public tracking + admin read)
// ==========================================

// Public, anonymous — called fire-and-forget from Landing.tsx on mount.
// Responds immediately; the best-effort geolocation lookup + DB insert happen
// after the response so a slow/failed ip-api.com call can never make a
// visitor's browser wait, and a failure here can never surface as a broken
// landing page.
// True for any IPv4/IPv6 address that's private, loopback, or link-local —
// ip-api.com can never resolve a location for these (dev laptop, LAN phone
// testing, or a proxy header that wasn't actually set), so there's no point
// spending a lookup on them.
function isPrivateOrLocalIp(ipRaw: string): boolean {
  if (!ipRaw) return true;
  const ip = ipRaw.replace(/^::ffff:/i, ""); // unwrap IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  ) {
    return true;
  }
  if (ip === "::1" || /^fe80:/i.test(ip) || /^f[cd][0-9a-f]{2}:/i.test(ip)) {
    return true;
  }
  return false;
}

// Resolves the actual visitor IP behind Cloudflare Tunnel. `CF-Connecting-IP`
// is set by Cloudflare's edge to the real client IP and can't be spoofed by
// the client (Cloudflare overwrites it) — that's the reliable one in
// production. `X-Forwarded-For` (first hop) is the fallback for any other
// proxy setup. `req.socket.remoteAddress` is the LAST resort and is USUALLY
// WRONG in production (it's the tunnel/Docker-internal hop, not the visitor)
// — it only reflects the real visitor when there's no proxy in front at all,
// i.e. plain local dev.
function resolveVisitorIp(req: express.Request): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  if (forwardedStr) {
    const first = forwardedStr.split(",")[0].trim();
    if (first) return first;
  }

  return req.socket.remoteAddress || "";
}

app.post("/api/track/pageview", (req, res) => {
  res.json({ success: true });

  (async () => {
    try {
      const path = typeof req.body?.path === "string" ? req.body.path.slice(0, 500) : "/";
      const ip = resolveVisitorIp(req);
      const { deviceType, browser, os } = parseUserAgent(req.headers["user-agent"] as string | undefined);
      const referrer = (req.headers["referer"] as string | undefined)?.slice(0, 500) || null;
      const utm_source = typeof req.body?.utm_source === "string" ? req.body.utm_source.slice(0, 200) : null;
      const utm_medium = typeof req.body?.utm_medium === "string" ? req.body.utm_medium.slice(0, 200) : null;
      const utm_campaign = typeof req.body?.utm_campaign === "string" ? req.body.utm_campaign.slice(0, 200) : null;

      // Best-effort geolocation. Private/local IPs (dev laptop, LAN phone
      // testing) are recorded explicitly as "Lokal/Dev" instead of NULL, so
      // it's obvious from the Analytics tab that this is expected test
      // traffic rather than a broken lookup. Only a REAL public IP (which
      // only shows up once this is actually deployed behind Cloudflare) ever
      // reaches ip-api.com.
      let country: string | null = null;
      let city: string | null = null;
      if (isPrivateOrLocalIp(ip)) {
        country = "Lokal/Dev";
      } else {
        try {
          const geoController = new AbortController();
          const geoTimeout = setTimeout(() => geoController.abort(), 3000);
          const geoRes = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
            signal: geoController.signal,
          });
          clearTimeout(geoTimeout);
          if (!geoRes.ok) {
            console.warn(`Lookup geolokasi IP gagal — ip-api.com merespons HTTP ${geoRes.status} untuk IP ${ip}`);
          } else {
            const geo: any = await geoRes.json();
            if (geo.status === "success") {
              country = geo.country || null;
              city = geo.city || null;
            } else {
              console.warn(`Lookup geolokasi IP gagal — ip-api.com: ${geo.message || geo.status} untuk IP ${ip}`);
            }
          }
        } catch (geoErr: any) {
          console.warn(`Lookup geolokasi IP gagal (timeout/exception) untuk IP ${ip}:`, geoErr.message);
        }
      }

      await pool.query(
        `INSERT INTO page_views (path, ip_address, country, city, device_type, browser, os, referrer, utm_source, utm_medium, utm_campaign)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [path, ip || null, country, city, deviceType, browser, os, referrer, utm_source, utm_medium, utm_campaign]
      );
    } catch (error: any) {
      console.error("Gagal mencatat page view:", error.message);
    }
  })();
});

// Aggregated + detail landing-page analytics for the Admin Console's
// Analytics tab. `from`/`to` are optional YYYY-MM-DD query params (default:
// last 30 days). "Unique visitor" = distinct (ip, day) pairs — a simple,
// storage-free approximation; good enough for directional traffic reading,
// not exact dedup across VPNs/shared IPs.
app.get("/api/admin/analytics/pageviews", requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = typeof from === "string" && from ? from : null;
    const toDate = typeof to === "string" && to ? to : null;

    const whereClauses: string[] = [];
    const params: any[] = [];
    if (fromDate) {
      params.push(fromDate);
      whereClauses.push(`visited_at >= $${params.length}::date`);
    } else {
      whereClauses.push(`visited_at >= now() - interval '30 days'`);
    }
    if (toDate) {
      params.push(toDate);
      whereClauses.push(`visited_at < ($${params.length}::date + interval '1 day')`);
    }
    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*) AS total_views,
         COUNT(DISTINCT (ip_address, date_trunc('day', visited_at))) AS unique_visitors
       FROM page_views
       ${whereSql}`,
      params
    );

    // Capped at the 300 most recent matching rows — the summary counts above
    // are NOT capped (computed via SQL aggregates over the full filtered set).
    const rowsResult = await pool.query(
      `SELECT id, path, ip_address, country, city, device_type, browser, os, referrer, utm_source, utm_medium, utm_campaign, visited_at
       FROM page_views
       ${whereSql}
       ORDER BY visited_at DESC
       LIMIT 300`,
      params
    );

    // Breakdown charts for the Analytics tab (location/browser/device) — each
    // computed via SQL GROUP BY over the FULL filtered set (same whereSql/
    // params as the summary counts above), not just the capped 300 rows the
    // table shows. NULL country/browser/device_type (geo lookup failed, or a
    // browser UA we don't recognize) is grouped under "Tidak diketahui"
    // rather than dropped, so the breakdown total still matches totalViews.
    const [countryBreakdown, browserBreakdown, deviceBreakdown] = await Promise.all([
      pool.query(
        `SELECT COALESCE(country, 'Tidak diketahui') AS label, COUNT(*) AS count
         FROM page_views ${whereSql}
         GROUP BY label ORDER BY count DESC LIMIT 8`,
        params
      ),
      pool.query(
        `SELECT COALESCE(browser, 'Tidak diketahui') AS label, COUNT(*) AS count
         FROM page_views ${whereSql}
         GROUP BY label ORDER BY count DESC LIMIT 8`,
        params
      ),
      pool.query(
        `SELECT COALESCE(device_type, 'Tidak diketahui') AS label, COUNT(*) AS count
         FROM page_views ${whereSql}
         GROUP BY label ORDER BY count DESC LIMIT 8`,
        params
      ),
    ]);

    res.json({
      totalViews: Number(summaryResult.rows[0].total_views),
      uniqueVisitors: Number(summaryResult.rows[0].unique_visitors),
      rows: rowsResult.rows,
      rowsTruncated: rowsResult.rowCount === 300,
      countryBreakdown: countryBreakdown.rows.map((r) => ({ label: r.label, count: Number(r.count) })),
      browserBreakdown: browserBreakdown.rows.map((r) => ({ label: r.label, count: Number(r.count) })),
      deviceBreakdown: deviceBreakdown.rows.map((r) => ({ label: r.label, count: Number(r.count) })),
    });
  } catch (error: any) {
    console.error("Gagal memuat analitik page view:", error);
    res.status(500).json({ error: error.message || "Gagal memuat analitik page view" });
  }
});

// ==========================================
// Customer Support (public contact form + admin inbox)
// ==========================================

const SUPPORT_CATEGORIES = ["Pertanyaan", "Saran", "Keluhan", "Laporan Bug", "Lainnya"];

app.post("/api/support/submit", async (req, res) => {
  try {
    const { name, email, category, message } = req.body || {};
    if (!name || !email || !category || !message) {
      return res.status(400).json({ error: "Nama, email, kategori, dan pesan wajib diisi" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    if (!SUPPORT_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Kategori tidak dikenali" });
    }
    if (String(message).length > 5000) {
      return res.status(400).json({ error: "Pesan terlalu panjang (maksimal 5000 karakter)" });
    }

    await pool.query(
      `INSERT INTO support_messages (name, email, category, message) VALUES ($1, $2, $3, $4)`,
      [String(name).slice(0, 200), String(email).slice(0, 200), category, String(message).slice(0, 5000)]
    );

    res.json({ success: true });

    // Best-effort, fired-and-forgotten (not awaited) — same reasoning as the
    // order-notification email: the visitor already got their success
    // response, they shouldn't wait on an SMTP round-trip too.
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_FROM;
    if (adminEmail) {
      sendEmail(
        adminEmail,
        `[KantongKu] Pesan Support baru — ${category}`,
        `<h2>Pesan Support Baru</h2>
         <p><b>Nama:</b> ${name}</p>
         <p><b>Email:</b> ${email}</p>
         <p><b>Kategori:</b> ${category}</p>
         <p><b>Pesan:</b></p>
         <p>${String(message).replace(/\n/g, "<br/>")}</p>
         <p><a href="${process.env.APP_URL}/admin">Buka Admin Console</a></p>`,
        `Pesan support baru (${category})\nNama: ${name}\nEmail: ${email}\nPesan: ${message}\nAdmin Console: ${process.env.APP_URL}/admin`
      ).catch((err: any) => {
        console.error("Gagal mengirim email notifikasi pesan support:", err.message);
      });
    } else {
      console.warn("ADMIN_NOTIFY_EMAIL (dan EMAIL_FROM) belum diset — notifikasi pesan support dilewati.");
    }
  } catch (error: any) {
    console.error("Gagal menyimpan pesan support:", error);
    res.status(500).json({ error: error.message || "Gagal mengirim pesan" });
  }
});

app.get("/api/admin/support", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM support_messages ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat pesan support:", error);
    res.status(500).json({ error: error.message || "Gagal memuat pesan support" });
  }
});

app.patch("/api/admin/support/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!["new", "read", "replied"].includes(status)) {
      return res.status(400).json({ error: "Status tidak dikenali" });
    }
    const result = await pool.query(`UPDATE support_messages SET status = $1 WHERE id = $2 RETURNING id`, [status, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pesan tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal memperbarui status pesan support:", error);
    res.status(500).json({ error: error.message || "Gagal memperbarui status pesan support" });
  }
});

// Admin's reply to a support message — saved to the DB either way, then
// emailed to the customer. UNLIKE the best-effort/silent notification emails
// elsewhere in this file (order confirmation, new-support-message alert),
// this send is AWAITED and its outcome reported back to the admin: they're
// actively replying to a real person and need to know immediately if it
// didn't go out, not days later when the customer says they never heard back.
app.post("/api/admin/support/:id/reply", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Isi balasan tidak boleh kosong" });
    }
    if (message.length > 5000) {
      return res.status(400).json({ error: "Balasan terlalu panjang (maksimal 5000 karakter)" });
    }

    const msgResult = await pool.query(`SELECT * FROM support_messages WHERE id = $1`, [id]);
    const supportMsg = msgResult.rows[0];
    if (!supportMsg) {
      return res.status(404).json({ error: "Pesan tidak ditemukan" });
    }

    const replyText = message.trim();
    await pool.query(
      `UPDATE support_messages SET admin_reply = $1, replied_at = now(), status = 'replied' WHERE id = $2`,
      [replyText, id]
    );

    try {
      await sendEmail(
        supportMsg.email,
        `Re: [KantongKu Support] ${supportMsg.category || "Balasan"}`,
        `<p>Halo ${supportMsg.name},</p>
         <p>Terima kasih sudah menghubungi KantongKu Support. Berikut balasan kami untuk pesan Anda:</p>
         <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;margin-left:0;">${String(supportMsg.message).replace(/\n/g, "<br/>")}</blockquote>
         <p><b>Balasan:</b></p>
         <p>${replyText.replace(/\n/g, "<br/>")}</p>`,
        `Halo ${supportMsg.name},\n\nTerima kasih sudah menghubungi KantongKu Support. Pesan Anda:\n${supportMsg.message}\n\nBalasan kami:\n${replyText}`
      );
      res.json({ success: true, emailSent: true });
    } catch (emailErr: any) {
      console.error("Gagal mengirim email balasan support:", emailErr.message);
      // Balasan tetap tersimpan di DB — hanya pengiriman emailnya yang gagal.
      // Status 200 karena aksi utama (simpan balasan) berhasil; emailSent:false
      // + emailError memberi tahu admin secara eksplisit lewat UI, bukan silent.
      res.json({
        success: true,
        emailSent: false,
        emailError: emailErr.message || "Gagal mengirim email balasan",
      });
    }
  } catch (error: any) {
    console.error("Gagal menyimpan balasan pesan support:", error);
    res.status(500).json({ error: error.message || "Gagal menyimpan balasan pesan support" });
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
// LEFT JOINs the owner's email for order_type='collaborator' rows so the
// Admin Console can show "untuk akun owner mana" without a second round-trip.
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const baseQuery = `
      SELECT o.*, ow.email AS collaborator_owner_email
      FROM orders o
      LEFT JOIN users ow ON ow.id = o.collaborator_owner_user_id
    `;
    const result =
      typeof status === "string" && status
        ? await pool.query(`${baseQuery} WHERE o.status = $1 ORDER BY o.created_at DESC`, [status])
        : await pool.query(`${baseQuery} ORDER BY o.created_at DESC`);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar order:", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar order" });
  }
});

// Manually confirm a pending order after checking the QRIS mutation by hand.
// Atomically idempotent: the UPDATE's `WHERE status != 'settlement'` guard
// means a double-click (or any other concurrent caller) never double-
// activates/double-emails — the loser just observes `alreadyConfirmed: true`
// and does nothing more.
// Guide PDF (cicilan-ai-notifikasi Task 6) — lives in public/, NOT a bare
// assets/ folder as the prompt's own suggested path assumed: Task 0
// verification of the Dockerfile showed only `dist/` and `public/` get
// copied into the production image's final stage, so anything outside
// those two would silently never exist on the live server. Read lazily
// (not cached) and existence-checked every send — constraint requires a
// missing file to degrade the email gracefully, never fail it.
const GUIDE_PDF_PATH = path.join(process.cwd(), "public", "Panduan-Penggunaan-KantongKu.pdf");

function getGuidePdfAttachment(): { filename: string; path: string }[] | undefined {
  if (!fs.existsSync(GUIDE_PDF_PATH)) {
    console.warn(`Panduan PDF tidak ditemukan di ${GUIDE_PDF_PATH} — email dikirim tanpa lampiran.`);
    return undefined;
  }
  return [{ filename: "Panduan-Penggunaan-KantongKu.pdf", path: GUIDE_PDF_PATH }];
}

// Same public/ asset the frontend shows at STATIC_QRIS_IMAGE_PATH — reused
// here as an inline (cid) attachment so the QRIS code renders directly in
// the pending-payment email body, not just as a download.
const QRIS_ABS_PATH = path.join(process.cwd(), "public", "qris-statis.png");
const QRIS_CID = "kantongku-qris";

function getQrisAttachment(): { filename: string; path: string; cid: string; contentDisposition: "inline" }[] | undefined {
  if (!fs.existsSync(QRIS_ABS_PATH)) {
    console.warn(`Gambar QRIS tidak ditemukan di ${QRIS_ABS_PATH} — email order dikirim tanpa gambar QRIS.`);
    return undefined;
  }
  return [{ filename: "qris-kantongku.png", path: QRIS_ABS_PATH, cid: QRIS_CID, contentDisposition: "inline" }];
}

// Fired right after a new order is created (both license and collaborator
// orders) — the customer-facing counterpart to the admin "Order baru masuk"
// notification above. Tells the payer exactly how much to pay (the unique-
// coded total, not the round base price — paying the wrong amount is the
// #1 cause of manual-match confusion), shows the QRIS to scan, and sets the
// expectation that confirmation is manual (up to 1x24 jam), so they don't
// panic when the account doesn't activate instantly. Best-effort/fire-and-
// forget, same footing as the admin email and Meta CAPI calls right above
// this function's call site — a failed send here must never fail order
// creation itself.
function sendOrderPendingPaymentEmail(order: {
  name: string;
  email: string;
  orderType: "license" | "collaborator";
  orderCode: string;
  totalAmount: number;
}) {
  const { name, email, orderType, orderCode, totalAmount } = order;
  const totalFormatted = `Rp${totalAmount.toLocaleString("id-ID")}`;
  const productLabel = orderType === "collaborator" ? "akses kolaborator KantongKu" : "akses KantongKu";
  const greetingName = orderType === "collaborator" ? "" : name ? ` ${name}` : "";

  sendEmail(
    email,
    `[KantongKu] Selesaikan Pembayaran Kamu — ${orderCode}`,
    `<p>Halo${greetingName},</p>
     <p>Terima kasih! Order kamu untuk <b>${productLabel}</b> sudah kami terima dengan kode <b>${orderCode}</b>.</p>
     <p>Silakan selesaikan pembayaran sejumlah:</p>
     <p style="font-size:22px;font-weight:bold;margin:8px 0;">${totalFormatted}</p>
     <p><b>Penting:</b> transfer harus PERSIS sejumlah nominal di atas (termasuk 3 digit kode unik di belakang) — jangan dibulatkan, supaya pembayaran kamu bisa langsung cocok saat kami verifikasi.</p>
     <p>Scan QRIS di bawah ini pakai GoPay, OVO, DANA, ShopeePay, atau m-banking apa pun yang mendukung QRIS:</p>
     <p><img src="cid:${QRIS_CID}" alt="QRIS KantongKu" style="max-width:280px;width:100%;height:auto;display:block;" /></p>
     <p>Setelah kami terima pembayarannya, verifikasi &amp; konfirmasi akan diproses maksimal <b>1x24 jam</b> — begitu dikonfirmasi, akun kamu otomatis aktif dan kamu akan menerima email terpisah untuk login.</p>
     <p>Order ini berlaku 24 jam sejak dibuat. Kalau ada kendala pembayaran, balas email ini saja.</p>`,
    `Halo${greetingName},\n\nTerima kasih! Order kamu untuk ${productLabel} sudah kami terima dengan kode ${orderCode}.\n\nSilakan selesaikan pembayaran sejumlah ${totalFormatted} (transfer PERSIS nominal ini, termasuk kode unik di belakang) via QRIS — lihat gambar QRIS terlampir di email ini.\n\nSetelah pembayaran kami terima, konfirmasi diproses maksimal 1x24 jam. Akun kamu otomatis aktif setelah dikonfirmasi, dan kamu akan menerima email terpisah untuk login.\n\nOrder ini berlaku 24 jam sejak dibuat.`,
    getQrisAttachment()
  ).catch((err: any) => {
    console.error(`Gagal mengirim email pending-payment untuk order ${orderCode}:`, err.message);
  });
}

// Task 6 — the actual "here's your login info" email to the paying customer.
// Task 0 verification found this DIDN'T EXIST before this change: the only
// customer-facing email anywhere in this codebase was the admin's manual
// "Kirim Link Login" button (send-login-link below), triggered per-user, not
// tied to order confirmation at all — even though Landing.tsx's payment step
// already told customers "link ini juga akan dikirim ke email kamu". This
// fills that real gap, on the SAME best-effort/fire-and-forget footing as
// the Meta CAPI call right below it: never awaited, a failure here must
// never affect the order confirmation itself.
function sendOrderConfirmationEmail(order: any) {
  const loginUrl = `${process.env.APP_URL}/app`;

  if (order.order_type === "collaborator") {
    // No PDF — a collaborator doesn't need the purchase guide, just proof
    // they can log in now (constraint: applies ONLY to license emails).
    sendEmail(
      order.collaborator_email,
      "Akses Kolaborator KantongKu Kamu Sudah Aktif",
      `<p>Halo,</p>
       <p>Kamu sekarang punya akses kolaborator penuh (baca &amp; tulis) ke data KantongKu pemilik akun yang mengundangmu.</p>
       <p>Masuk pakai akun Google dengan email ini di: <a href="${loginUrl}">${loginUrl}</a></p>`,
      `Akses kolaborator KantongKu kamu sudah aktif. Masuk pakai akun Google dengan email ini di: ${loginUrl}`
    ).catch((err: any) => {
      console.error("Gagal mengirim email konfirmasi kolaborator:", err.message);
    });
    return;
  }

  sendEmail(
    order.email,
    "Pembayaran KantongKu Dikonfirmasi — Akun Kamu Sudah Aktif",
    `<p>Halo${order.name ? ` ${order.name}` : ""},</p>
     <p>Pembayaran kamu sudah dikonfirmasi. Akun KantongKu kamu sudah aktif dan siap dipakai.</p>
     <p>Masuk pakai akun Google dengan email yang sama saat memesan (<b>${order.email}</b>) di: <a href="${loginUrl}">${loginUrl}</a></p>
     <p>Kami lampirkan juga panduan penggunaan KantongKu di email ini — kalau ada yang masih bingung soal fitur mana pun, cek dulu di situ.</p>`,
    `Halo${order.name ? ` ${order.name}` : ""},\n\nPembayaran kamu sudah dikonfirmasi. Akun KantongKu kamu sudah aktif.\nMasuk pakai akun Google dengan email yang sama saat memesan (${order.email}) di: ${loginUrl}\n\nPanduan penggunaan terlampir di email ini.`,
    getGuidePdfAttachment()
  ).catch((err: any) => {
    console.error("Gagal mengirim email konfirmasi order lisensi:", err.message);
  });
}

async function confirmOrderRecord(
  orderCode: string
): Promise<
  | { ok: true; order: any; alreadyConfirmed: boolean }
  | { ok: false; error: string; statusCode: number }
> {
  const existingResult = await pool.query(`SELECT * FROM orders WHERE order_code = $1`, [orderCode]);
  const existing = existingResult.rows[0];
  if (!existing) {
    return { ok: false, error: "Order tidak ditemukan", statusCode: 404 };
  }
  if (existing.status === "settlement") {
    return { ok: true, order: existing, alreadyConfirmed: true };
  }

  const updateResult = await pool.query(
    `UPDATE orders SET status = 'settlement', confirmed_at = now(), confirmed_by = $2
     WHERE order_code = $1 AND status != 'settlement'
     RETURNING *`,
    [orderCode, "admin"]
  );
  if (updateResult.rowCount === 0) {
    // Lost a race to a concurrent confirm (admin + webhook at nearly the same
    // instant) — treat exactly like already-confirmed, no further action.
    return { ok: true, order: existing, alreadyConfirmed: true };
  }
  const order = updateResult.rows[0];

  if (order.order_type === "collaborator") {
    // Task 2 revision: a collaborator order activates the `collaborators`
    // row, NOT the collaborator's own `users.status` — their access to the
    // app is derived entirely from this row being 'active' (see
    // resolveLoginAccess), so it must never be persisted as a standalone
    // 'active' users.status that would outlive a later disconnect.
    await pool.query(
      `INSERT INTO collaborators (owner_user_id, email, status, activated_at, order_id)
       VALUES ($1, $2, 'active', now(), $3)
       ON CONFLICT (owner_user_id, email)
       DO UPDATE SET status = 'active', activated_at = now(), order_id = $3, disconnected_at = NULL, disconnected_by = NULL`,
      [order.collaborator_owner_user_id, order.collaborator_email, order.id]
    );
    // No Meta CAPI event here — an internal collaborator seat isn't part of
    // the ad-funnel "Lead" this event type represents.
    sendOrderConfirmationEmail(order);
    return { ok: true, order, alreadyConfirmed: false };
  }

  // order_type === 'license' (default) — unchanged behavior.
  await pool.query(
    `INSERT INTO users (email, status, activated_at)
     VALUES ($1, 'active', now())
     ON CONFLICT (email) DO UPDATE SET status = 'active', activated_at = now()`,
    [order.email]
  );

  // Best-effort, fired-and-forgotten (not awaited) — the admin confirming an
  // order shouldn't sit waiting on a Meta API round-trip. Server-
  // to-server either way, so user_data is just the hashed email + whatever
  // fbp/fbc were captured on the original order — helps Meta match this to
  // the earlier "Lead" event for a better match rate. A separate event_id
  // (order_code + "-confirmed") keeps this a distinct event from "Lead"
  // instead of deduping with it.
  sendMetaCapiEvent("OrderConfirmed", `${orderCode}-confirmed`, {
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

  sendOrderConfirmationEmail(order);

  return { ok: true, order, alreadyConfirmed: false };
}

// Manually confirm a pending order after checking the QRIS mutation by
// hand. Safe to click twice — confirmOrderRecord is idempotent — but the
// Admin Console also hides this button once an order shows `settlement`,
// as a first line of defense against double-clicks.
app.post("/api/admin/orders/:order_code/confirm", requireAdmin, async (req, res) => {
  try {
    const { order_code } = req.params;
    const outcome = await confirmOrderRecord(order_code);
    if (outcome.ok === false) {
      return res.status(outcome.statusCode).json({ error: outcome.error });
    }
    res.json({ success: true, alreadyConfirmed: outcome.alreadyConfirmed });
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
      `SELECT id, email, status, joined_at, activated_at, last_active_at FROM users ORDER BY joined_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar users:", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar users" });
  }
});

// Read-only view into one user's Activity Log (client-side feature — stored in
// their user_app_data JSONB under `activityLog`, same shape as ActivityLogEntry
// in src/types.ts). Absent entirely for users on an app version older than the
// Log Activity feature, or who never triggered a loggable action yet.
app.get("/api/admin/users/:id/activity-log", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }
    const dataResult = await pool.query(`SELECT data FROM user_app_data WHERE user_id = $1`, [id]);
    const activityLog = dataResult.rows[0]?.data?.activityLog ?? [];
    res.json(Array.isArray(activityLog) ? activityLog : []);
  } catch (error: any) {
    console.error("Gagal memuat log aktivitas user:", error);
    res.status(500).json({ error: error.message || "Gagal memuat log aktivitas user" });
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
       <p>Gunakan akun Google yang sama dengan yang Anda daftarkan sebelumnya. Jika Anda tidak meminta email ini, abaikan pesan ini.</p>
       <p>Kami lampirkan juga panduan penggunaan KantongKu di email ini — kalau ada yang masih bingung soal fitur mana pun, cek dulu di situ.</p>`,
      `Berikut tautan resmi untuk masuk ke akun KantongKu Anda: ${loginUrl}\n\nGunakan akun Google yang sama dengan yang Anda daftarkan sebelumnya. Jika Anda tidak meminta email ini, abaikan pesan ini.\n\nPanduan penggunaan terlampir di email ini.`,
      getGuidePdfAttachment()
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

// Shared login-eligibility gate — used by BOTH the real Google login below
// and the dev-only bypass (when it's given an explicit email), so local
// testing exercises the exact same access rule production does.
//
// Task 2 revision: a pure collaborator's OWN `users.status` is deliberately
// left at its default ('pending') and NEVER persisted as 'active' — their
// access is entirely derived from an ACTIVE `collaborators` row, re-checked
// fresh on every login attempt. This is what makes disconnect actually lock
// them out of the whole app (not just leave their data empty): once
// `isActiveCollaborator` goes false, `user.status` was never 'active' to
// begin with, so `allowed` becomes false too — same as an email that never
// bought a license. A user with their OWN paid license (status='active' from
// their own order) keeps that access regardless of any collaboration.
async function resolveLoginAccess(
  email: string
): Promise<{ allowed: true; user: any } | { allowed: false }> {
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  let user = result.rows[0];

  const collabCheck = await pool.query(
    `SELECT 1 FROM collaborators WHERE email = $1 AND status = 'active'`,
    [email]
  );
  const isActiveCollaborator = (collabCheck.rowCount ?? 0) > 0;

  if (!user) {
    if (!isActiveCollaborator) return { allowed: false };
    // First-ever login for this collaborator email — provision a
    // login-only `users` row (status stays at the table default, 'pending')
    // so the normal session mechanism works. Deliberately NEVER creates a
    // `user_app_data` row for them: requireSession resolves
    // req.effectiveUserId to the OWNER's id for every data read/write, so
    // this row's own app data simply never gets written.
    const insertResult = await pool.query(`INSERT INTO users (email) VALUES ($1) RETURNING *`, [email]);
    user = insertResult.rows[0];
  }

  const allowed = user.status === "active" || isActiveCollaborator;
  return allowed ? { allowed: true, user } : { allowed: false };
}

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

    const access = await resolveLoginAccess(email);
    if (!access.allowed) {
      return res.status(403).json({
        error:
          "Email ini belum terdaftar / pembayaran belum terkonfirmasi. Hubungi admin atau selesaikan pembayaran.",
      });
    }
    const user = access.user;

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

// ==========================================
// Dev-only login bypass (LAN/mobile testing without Google OAuth)
// ==========================================
// Google OAuth rejects a LAN IP (192.168.x.x) as an Authorized Origin, so
// there is no way to test the real Google Sign-In flow from a phone on the
// same WiFi as the dev laptop. This creates/reuses one fixed dummy 'active'
// user and starts a normal session — same session mechanism as
// /api/auth/google below, no shortcuts on the session itself, just skips the
// Google token verification step.
//
// HARD-BLOCKED in production: returns a plain 404 (not 401/403) when
// NODE_ENV === 'production' so the route's very existence isn't
// distinguishable from "doesn't exist" by scanning for it.
// Accepts an optional `{ email }` in the body — lets local testing switch
// between whichever dummy users scripts/seed-dummy-data.ts created (owner
// accounts + the collaborator email) without needing a real Google login for
// each. Defaults to the original single fixed test user when omitted, so the
// plain "[DEV] Login sebagai Test User" button in Login.tsx keeps working
// unchanged.
// Task 1 (docker-compose.local.yml) fix: Login.tsx used to gate its
// "[DEV] Login sebagai Test User" button on `import.meta.env.DEV` — a Vite
// BUILD-TIME constant that's `false` in any `vite build` output regardless
// of runtime NODE_ENV. That made the button silently never render against
// the local Docker image (which runs the same production build as the real
// deploy, just with NODE_ENV=development at runtime for this exact reason)
// — the backend bypass endpoint below worked fine, there was just no way to
// reach it from the UI without opening devtools. This tiny public endpoint
// lets the frontend ask at runtime instead; same NODE_ENV gate as the actual
// bypass endpoint, so the button's visibility always matches whether it
// would actually work.
app.get("/api/dev/enabled", (req, res) => {
  res.json({ enabled: process.env.NODE_ENV !== "production" });
});

app.post("/api/dev/login-as-test-user", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).end();
  }
  try {
    const requestedEmail = typeof req.body?.email === "string" && req.body.email.trim()
      ? req.body.email.trim().toLowerCase()
      : null;

    let user: any;
    if (!requestedEmail) {
      // Default convenience path (no email in the body) — the plain "[DEV]
      // Login sebagai Test User" button. Always force-active: this is just a
      // quick single-account smoke-test login, not a collaboration scenario.
      const upsertResult = await pool.query(
        `INSERT INTO users (email, name, status, activated_at)
         VALUES ('dev-test-user@kantongku.local', 'Test User (Dev)', 'active', now())
         ON CONFLICT (email) DO UPDATE SET status = 'active'
         RETURNING *`
      );
      user = upsertResult.rows[0];
    } else {
      // Explicit email override — routes through the SAME resolveLoginAccess
      // gate as a real Google login, so this accurately tests collaborator
      // access INCLUDING a disconnected collaborator being rejected outright
      // (403), not just seeing empty data.
      const access = await resolveLoginAccess(requestedEmail);
      if (!access.allowed) {
        return res.status(403).json({
          error: "Email ini tidak punya akses aktif (belum ada lisensi / kolaborasi tidak aktif) — sesuai perilaku login asli.",
        });
      }
      user = access.user;
    }

    const sessionId = crypto.randomUUID();
    await pool.query(`UPDATE users SET current_session_id = $2 WHERE id = $1`, [user.id, sessionId]);

    res.cookie("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      signed: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { email: user.email, name: user.name, avatarUrl: user.avatar_url } });
  } catch (error: any) {
    console.error("Gagal login sebagai test user (dev):", error);
    res.status(500).json({ error: error.message || "Gagal login sebagai test user" });
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
    // Non-null when this login is an active collaborator on someone else's
    // account — the frontend uses this to show the "you're viewing X's data"
    // banner. Their own identity (email/name above) is still their own.
    collaboratorOwnerEmail: (req as any).collaboratorOwnerEmail || null,
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
    // effectiveUserId = the OWNER's id when the caller is an active
    // collaborator (see requireSession) — this is what makes a collaborator
    // see the exact same data as the account owner, not their own empty row.
    const effectiveUserId = (req as any).effectiveUserId;
    const result = await pool.query(`SELECT data FROM user_app_data WHERE user_id = $1`, [effectiveUserId]);
    res.json(result.rows[0]?.data || {});
  } catch (error: any) {
    console.error("Gagal memuat data pengguna:", error);
    res.status(500).json({ error: error.message || "Gagal memuat data" });
  }
});

// Persist the current user's application data (full snapshot overwrite)
app.put("/api/data", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const effectiveUserId = (req as any).effectiveUserId;
    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ error: "Payload data tidak valid" });
    }
    await pool.query(
      `INSERT INTO user_app_data (user_id, data, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()`,
      [effectiveUserId, JSON.stringify(data)]
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menyimpan data pengguna:", error);
    res.status(500).json({ error: error.message || "Gagal menyimpan data" });
  }
});

// ==========================================
// Collaboration (Task 2, revised) — invite now goes through the SAME manual
// payment flow as the main license (see createOrderRecord above), confirmed
// by an admin. Disconnect/reconnect stay free after the first payment: a
// reconnect is legitimate proof-of-purchase re-use (order_id IS NOT NULL),
// not a new charge.
// ==========================================
// Owner-facing routes below check `owner_user_id === req.user.id` — the
// LITERAL logged-in account, never req.effectiveUserId. This is intentional:
// a collaborator has full read/write access to the owner's financial data,
// but managing WHO else has that access stays exclusive to the real owner.
// If this checked effectiveUserId instead, a collaborator could
// invite/disconnect other collaborators on the owner's behalf — not what
// "akses penuh ke data, bukan ke pengelolaan akun" implies.

app.get("/api/collaborators", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const ownerId = (req as any).user.id;
    const result = await pool.query(
      `SELECT id, email, status, invited_at, activated_at, disconnected_at, disconnected_by, order_id
       FROM collaborators WHERE owner_user_id = $1 ORDER BY invited_at DESC`,
      [ownerId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar kolaborator:", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar kolaborator" });
  }
});

// Body: { email, channel }. Creates a 'collaborator'-type order (SAME
// manual-payment infrastructure as the main license) and a `collaborators`
// row in 'pending_payment'. No limit on how many collaborators one owner can
// have — nothing here caps it.
app.post("/api/collaborators/invite", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const ownerId = (req as any).user.id;
    const ownerEmail = (req as any).user.email;
    const { email, channel } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email wajib diisi" });
    }
    if (!["qris_shopee", "transfer_bca"].includes(channel)) {
      return res.status(400).json({ error: "Metode pembayaran tidak dikenali" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    if (cleanEmail === ownerEmail.toLowerCase()) {
      return res.status(400).json({ error: "Tidak bisa mengundang email sendiri sebagai kolaborator" });
    }

    const existingResult = await pool.query(
      `SELECT * FROM collaborators WHERE owner_user_id = $1 AND email = $2`,
      [ownerId, cleanEmail]
    );
    const existing = existingResult.rows[0];

    if (existing?.status === "active") {
      return res.status(400).json({ error: "Kolaborator ini sudah aktif" });
    }
    if (existing?.status === "revoked") {
      return res.status(400).json({
        error: "Email ini sudah pernah jadi kolaborator. Gunakan tombol \"Sambungkan Lagi\" (gratis, tanpa bayar ulang).",
      });
    }

    const order = await createOrderRecord({
      name: `Kolaborator untuk ${ownerEmail}`,
      email: cleanEmail,
      channel,
      baseAmount: COLLABORATOR_PRICE_AMOUNT,
      orderType: "collaborator",
      collaboratorOwnerUserId: ownerId,
      collaboratorEmail: cleanEmail,
    });

    // existing?.status === 'pending_payment' falls through to here too —
    // re-inviting before the first order is confirmed just creates a fresh
    // order (e.g. the previous one expired/was cancelled) rather than
    // erroring; the row itself is upserted back to pending_payment either way.
    await pool.query(
      `INSERT INTO collaborators (owner_user_id, email, status)
       VALUES ($1, $2, 'pending_payment')
       ON CONFLICT (owner_user_id, email) DO UPDATE SET status = 'pending_payment'`,
      [ownerId, cleanEmail]
    );

    res.json(order);
  } catch (error: any) {
    console.error("Gagal mengundang kolaborator:", error);
    res.status(error.statusCode || 500).json({ error: error.message || "Gagal mengundang kolaborator" });
  }
});

// For the "Lanjutkan Pembayaran" button on a pending_payment collaborator —
// re-opens the same payment instructions without creating a duplicate order.
app.get("/api/collaborators/:id/pending-order", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const ownerId = (req as any).user.id;
    const { id } = req.params;
    const collabResult = await pool.query(`SELECT * FROM collaborators WHERE id = $1`, [id]);
    const collab = collabResult.rows[0];
    if (!collab) {
      return res.status(404).json({ error: "Kolaborator tidak ditemukan" });
    }
    if (collab.owner_user_id !== ownerId) {
      return res.status(403).json({ error: "Anda bukan pemilik akun ini" });
    }
    const orderResult = await pool.query(
      `SELECT order_code, channel, total_amount FROM orders
       WHERE order_type = 'collaborator' AND collaborator_owner_user_id = $1 AND collaborator_email = $2 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [ownerId, collab.email]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: "Tidak ada order pending untuk kolaborator ini — undang ulang untuk membuat order baru" });
    }
    res.json({
      order_code: order.order_code,
      channel: order.channel,
      total_amount: Number(order.total_amount),
      qrImage: STATIC_QRIS_IMAGE_PATH,
    });
  } catch (error: any) {
    console.error("Gagal memuat order pending kolaborator:", error);
    res.status(500).json({ error: error.message || "Gagal memuat order pending kolaborator" });
  }
});

// Shared by the owner-facing reconnect route below AND the admin "Connect"
// override — free (no new order), only legitimate for a row that was
// genuinely paid for at least once (order_id IS NOT NULL) and is currently
// revoked.
async function reconnectCollaboratorRow(id: string): Promise<{ ok: true; row: any } | { ok: false; error: string; statusCode: number }> {
  const existingResult = await pool.query(`SELECT * FROM collaborators WHERE id = $1`, [id]);
  const existing = existingResult.rows[0];
  if (!existing) {
    return { ok: false, error: "Kolaborator tidak ditemukan", statusCode: 404 };
  }
  if (existing.status !== "revoked") {
    return { ok: false, error: "Kolaborator ini tidak dalam status terputus", statusCode: 400 };
  }
  if (!existing.order_id) {
    return { ok: false, error: "Kolaborator ini belum pernah dibayar — undang sebagai kolaborator baru", statusCode: 400 };
  }
  const result = await pool.query(
    `UPDATE collaborators SET status = 'active', activated_at = now(), disconnected_at = NULL, disconnected_by = NULL
     WHERE id = $1
     RETURNING id, email, status, invited_at, activated_at, disconnected_at, disconnected_by, order_id`,
    [id]
  );
  return { ok: true, row: result.rows[0] };
}

// Free reconnect — no new order/payment. Owner-only, and only for a row
// that's `revoked` AND was previously actually paid for (order_id set).
app.post("/api/collaborators/:id/reconnect", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const ownerId = (req as any).user.id;
    const { id } = req.params;
    const existing = await pool.query(`SELECT owner_user_id FROM collaborators WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Kolaborator tidak ditemukan" });
    }
    if (existing.rows[0].owner_user_id !== ownerId) {
      return res.status(403).json({ error: "Anda bukan pemilik akun ini" });
    }
    const outcome = await reconnectCollaboratorRow(id);
    if (outcome.ok === false) {
      return res.status(outcome.statusCode).json({ error: outcome.error });
    }
    res.json(outcome.row);
  } catch (error: any) {
    console.error("Gagal menyambungkan kembali kolaborator:", error);
    res.status(500).json({ error: error.message || "Gagal menyambungkan kembali kolaborator" });
  }
});

app.post("/api/collaborators/:id/disconnect", requireSession, requireActiveStatus, async (req, res) => {
  try {
    const ownerId = (req as any).user.id;
    const { id } = req.params;

    const existing = await pool.query(`SELECT owner_user_id FROM collaborators WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Kolaborator tidak ditemukan" });
    }
    if (existing.rows[0].owner_user_id !== ownerId) {
      return res.status(403).json({ error: "Anda bukan pemilik akun ini" });
    }

    const result = await pool.query(
      `UPDATE collaborators SET status = 'revoked', disconnected_at = now(), disconnected_by = 'owner'
       WHERE id = $1
       RETURNING id, email, status, invited_at, activated_at, disconnected_at, disconnected_by, order_id`,
      [id]
    );
    // Collaborator loses ALL app access on their NEXT request (login or
    // otherwise), not instantly for any request already in flight —
    // resolveLoginAccess/requireSession re-check the `collaborators` table
    // fresh every time (no caching), so this takes effect immediately.
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Gagal memutuskan sambungan kolaborator:", error);
    res.status(500).json({ error: error.message || "Gagal memutuskan sambungan kolaborator" });
  }
});

// ==========================================
// Admin override for collaborators — independent of the owner, for
// support/moderation. Reuses the exact same reconnect logic as the owner
// route above; disconnect is separately tagged disconnected_by='admin'.
// ==========================================

app.get("/api/admin/collaborators", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.owner_user_id, ow.email AS owner_email, c.email, c.status,
              c.invited_at, c.activated_at, c.disconnected_at, c.disconnected_by, c.order_id
       FROM collaborators c
       JOIN users ow ON ow.id = c.owner_user_id
       ORDER BY c.invited_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error("Gagal memuat daftar kolaborator (admin):", error);
    res.status(500).json({ error: error.message || "Gagal memuat daftar kolaborator" });
  }
});

app.post("/api/admin/collaborators/:id/connect", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const outcome = await reconnectCollaboratorRow(id);
    if (outcome.ok === false) {
      return res.status(outcome.statusCode).json({ error: outcome.error });
    }
    res.json(outcome.row);
  } catch (error: any) {
    console.error("Gagal connect kolaborator (admin):", error);
    res.status(500).json({ error: error.message || "Gagal connect kolaborator" });
  }
});

app.post("/api/admin/collaborators/:id/disconnect", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE collaborators SET status = 'revoked', disconnected_at = now(), disconnected_by = 'admin'
       WHERE id = $1
       RETURNING id, email, status, invited_at, activated_at, disconnected_at, disconnected_by, order_id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Kolaborator tidak ditemukan" });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Gagal disconnect kolaborator (admin):", error);
    res.status(500).json({ error: error.message || "Gagal disconnect kolaborator" });
  }
});

// Task 9 — HARD delete, separate from "Disconnect" above. Disconnect just
// flips status to 'revoked' (row stays, keeps its order_id as proof of past
// payment — that's what makes "Sambungkan Lagi" free later). This instead
// removes the row entirely: requireSession's collaborator lookup (SELECT ...
// WHERE c.email = $1 AND c.status = 'active') then finds nothing at all, so
// access is blocked immediately, same as disconnect — but with no order_id
// left behind, a future invite of the same email hits the "no existing row"
// branch in POST /api/collaborators/invite, i.e. treated as a brand new
// collaborator who has to pay again, not a free reconnect. Irreversible by
// design — the UI (AdminConsole) is expected to confirm before calling this.
app.delete("/api/admin/collaborators/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`DELETE FROM collaborators WHERE id = $1 RETURNING id`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Kolaborator tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Gagal menghapus permanen kolaborator (admin):", error);
    res.status(500).json({ error: error.message || "Gagal menghapus permanen kolaborator" });
  }
});

// Vite Middleware Setup
//
// Task 1 fix: this used to branch purely on NODE_ENV !== "production", which
// broke docker-compose.local.yml's setup — that image is built the SAME way
// as production (only dist/ + public/ get copied into the final stage, see
// Dockerfile), but deliberately runs with NODE_ENV=development so
// POST /api/dev/login-as-test-user stays enabled (its own gate, checked
// there — completely unrelated to and unaffected by this change). With the
// old branching, that combination made THIS function try to start Vite's
// dev middleware, which needs the actual source (src/, root index.html) —
// absent from that image — and silently served 404s for everything.
//
// The real signal for "was this a `npm run build` output, or a live
// tsx/`npm run dev` source checkout" is simply whether dist/index.html
// exists on disk — checking that directly decouples static-vs-dev serving
// from NODE_ENV entirely. The dev-login-bypass endpoint's own guard
// (`NODE_ENV === "production"` → 404) is untouched by this and still the
// only thing gating it — it still 404s in real production, unconditionally.
async function setupVite() {
  const distPath = path.join(process.cwd(), "dist");
  const hasBuiltDist = fs.existsSync(path.join(distPath, "index.html"));

  if (!hasBuiltDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Task 8: diagnosed root cause of the slow (~10s) reopen — express.static
    // with no options defaults to `maxAge: 0`, so the browser never cached
    // dist/assets/* at all and had to fully re-download the JS/CSS bundle
    // (~540KB/~80KB) on every single visit, not just the first. Vite content-
    // hashes every filename under dist/assets/ (e.g. index-BhcMwqO-.js) — a
    // given filename can only ever refer to one exact set of bytes, so it's
    // safe to tell the browser to cache it forever and skip the network
    // entirely on repeat visits. `index.html` itself (and anything outside
    // assets/, e.g. public/'s unhashed files copied in by `vite build`) must
    // NOT get this treatment — it has to be re-fetched every time so the
    // browser sees the latest hashed asset filenames after each deploy.
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.split(path.sep).includes("assets")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Task 5 — background reminder→push sweep. Started here (not at module
  // load) so it only ever runs once the HTTP server itself is actually up.
  // No-ops instantly every tick if VAPID isn't configured (see
  // runReminderPushSweep), so this is safe to always start.
  setInterval(runReminderPushSweep, REMINDER_PUSH_INTERVAL_MS);

  // Task 7 — daily 20:00 WIB transaction-input reminder, same interval/
  // no-op-if-unconfigured footing as the reminder sweep right above.
  setInterval(runDailyTransactionReminderSweep, REMINDER_PUSH_INTERVAL_MS);

  // Task 6 — Activity Log retention sweep. Same "start after listen, run
  // once immediately then on an interval" pattern as the reminder sweep
  // above — the immediate first run means a server restart doesn't leave
  // stale entries sitting for up to 24h before the first cleanup happens.
  runActivityLogCleanup();
  setInterval(runActivityLogCleanup, ACTIVITY_LOG_CLEANUP_INTERVAL_MS);
}

setupVite();