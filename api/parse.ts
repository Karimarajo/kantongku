import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateContentWithRetry(aiInstance: any, options: any, maxRetries = 2) {
  let attempt = 0;
  // Menyesuaikan model rilis stabil terkini untuk performa terbaik
  const modelsToTry = [options.model, "gemini-2.5-flash-lite", "gemini-2.5-flash"];
  
  while (true) {
    try {
      const currentModel = modelsToTry[Math.min(attempt, modelsToTry.length - 1)];
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      
      if (attempt < modelsToTry.length) {
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Perbaikan struktur parameter payload sesuai standar SDK @google/genai terbaru
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
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("Gagal melakukan parse teks:", error);
    return res.status(500).json({ error: error.message || "Gagal memproses input dengan AI" });
  }
}