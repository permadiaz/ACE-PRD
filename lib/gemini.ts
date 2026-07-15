import { GoogleGenAI, Type, type Schema } from "@google/genai";

// gemini-2.5-flash di-pensiun Google. Pakai gemini-3.5-flash (model "thinking").
const MODEL_NAME = "gemini-3.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum di-set. Isi di .env.local (lokal) atau di Environment Variables dashboard Vercel."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/* ---------------- Skema Structured Output ---------------- */

/** {"questions": ["...", "...", "...", "..."]} */
export const QUESTIONS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["questions"],
  propertyOrdering: ["questions"],
};

/** {prd:{...}, tasks:[{epic, items[]}], megaPrompt} */
export const GENERATE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    prd: {
      type: Type.OBJECT,
      properties: {
        problemStatement: { type: Type.STRING },
        targetUser: { type: Type.STRING },
        coreFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        niceToHave: { type: Type.ARRAY, items: { type: Type.STRING } },
        constraints: { type: Type.STRING },
        successCriteria: { type: Type.STRING },
      },
      required: [
        "problemStatement",
        "targetUser",
        "coreFeatures",
        "niceToHave",
        "constraints",
        "successCriteria",
      ],
      propertyOrdering: [
        "problemStatement",
        "targetUser",
        "coreFeatures",
        "niceToHave",
        "constraints",
        "successCriteria",
      ],
    },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          epic: { type: Type.STRING },
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["epic", "items"],
        propertyOrdering: ["epic", "items"],
      },
    },
    megaPrompt: { type: Type.STRING },
  },
  required: ["prd", "tasks", "megaPrompt"],
  propertyOrdering: ["prd", "tasks", "megaPrompt"],
};

/* ---------------- Pemanggilan model ---------------- */

/**
 * Panggil Gemini dengan system prompt + user prompt, output JSON terstruktur.
 *
 * Catatan penting soal gemini-3.5-flash (model "thinking"):
 * - maxOutputTokens itu budget BERSAMA (thinking + jawaban). Kalau kekecilan,
 *   token habis buat mikir dan JSON kepotong -> gagal parse. Maka dibuat besar.
 * - thinkingBudget dibatasi supaya proses mikir tidak menelan seluruh budget.
 * - responseSchema memaksa struktur JSON sesuai yang app harapkan.
 */
const MAX_ATTEMPTS = 3;

/** Deteksi error jaringan sesaat yang layak di-retry ("fetch failed", dll). */
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("aborted") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("socket") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  responseSchema?: Schema
): Promise<string> {
  const ai = getClient();

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {}),
          thinkingConfig: { thinkingBudget: 4096 },
        },
      });

      const finishReason = response.candidates?.[0]?.finishReason;
      const text = response.text;

      if (!text || text.trim().length === 0) {
        throw new Error(
          `Model tidak mengembalikan teks (finishReason: ${
            finishReason ?? "tidak diketahui"
          }).`
        );
      }

      return text;
    } catch (err) {
      lastErr = err;
      // Hanya retry untuk kegagalan jaringan sesaat, dan bukan percobaan terakhir.
      if (attempt < MAX_ATTEMPTS && isTransient(err)) {
        console.warn(
          `callGemini attempt ${attempt} gagal (${
            err instanceof Error ? err.message : err
          }), retry...`
        );
        await sleep(attempt * 700); // backoff bertahap: 700ms, 1400ms
        continue;
      }
      break;
    }
  }

  // Semua percobaan gagal.
  const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (isTransient(lastErr)) {
    throw new Error(
      `Koneksi ke Gemini bermasalah sesaat (${detail}). Coba lagi sebentar.`
    );
  }
  throw new Error(detail);
}

/**
 * Parser JSON defensif. Dengan responseSchema, output sudah JSON bersih —
 * tapi tetap kita strip fence & ekstrak blok JSON sebagai jaring pengaman.
 */
export function parseJsonResponse<T>(raw: string): T {
  let text = (raw ?? "").trim();

  if (text.startsWith("```")) {
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

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
    console.error("parseJsonResponse gagal. Raw response:\n", raw);
    const snippet = (raw ?? "").slice(0, 300).replace(/\s+/g, " ").trim();
    throw new Error(
      `Gagal parse respons AI sebagai JSON. Cuplikan: ${
        snippet || "(respons kosong)"
      }`
    );
  }
}
