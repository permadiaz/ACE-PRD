import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-2.5-flash di-pensiun Google (404 untuk akun baru, shutdown Okt 2026).
// Pengganti: gemini-3.5-flash — kecerdasan mendekati Pro di tier Flash.
const MODEL_NAME = "gemini-3.5-flash";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum di-set. Isi di .env.local (lokal) atau di Environment Variables dashboard Vercel."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Panggil Gemini dengan system prompt + user prompt.
 * Memaksa output JSON lewat responseMimeType.
 *
 * Catatan: gemini-3.5-flash adalah model "thinking" — sebagian token output
 * dipakai untuk berpikir internal. maxOutputTokens harus longgar supaya JSON
 * akhir tidak kepotong (penyebab umum "gagal parse JSON").
 */
export async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 16384,
    },
  });

  const result = await model.generateContent(userPrompt);
  const response = result.response;

  // Prompt diblokir filter keamanan?
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Permintaan diblokir Gemini (alasan: ${blockReason}).`);
  }

  const finishReason = response.candidates?.[0]?.finishReason;

  let text = "";
  try {
    text = response.text();
  } catch {
    text = "";
  }

  if (!text || text.trim().length === 0) {
    throw new Error(
      `Model tidak mengembalikan teks (finishReason: ${
        finishReason ?? "tidak diketahui"
      }). Kemungkinan output kepotong karena kehabisan token — coba lagi.`
    );
  }

  if (finishReason && finishReason !== "STOP") {
    // Ada teks tapi finish tidak normal (mis. MAX_TOKENS) → JSON kemungkinan kepotong.
    console.warn(
      `callGemini: finishReason=${finishReason}, panjang teks=${text.length}`
    );
  }

  return text;
}

/**
 * Parser JSON defensif. Meski sudah minta JSON murni, model kadang tetap
 * membungkus dengan markdown fence (```json ... ```) atau menambah teks lain.
 * Fungsi ini strip fence dan mengekstrak blok JSON sebelum JSON.parse.
 */
export function parseJsonResponse<T>(raw: string): T {
  let text = (raw ?? "").trim();

  // Strip markdown fence bila ada: ```json ... ``` atau ``` ... ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  // Ekstrak blok JSON: dari kurung pertama sampai pasangannya di akhir.
  if (!text.startsWith("{") && !text.startsWith("[")) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // Log penuh ke server (kelihatan di Vercel logs) + cuplikan ke error UI.
    console.error("parseJsonResponse gagal. Raw response:\n", raw);
    const snippet = (raw ?? "").slice(0, 300).replace(/\s+/g, " ").trim();
    throw new Error(
      `Gagal parse respons AI sebagai JSON. Cuplikan: ${
        snippet || "(respons kosong)"
      }`
    );
  }
}
