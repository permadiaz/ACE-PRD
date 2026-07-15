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
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  responseSchema?: Schema
): Promise<string> {
  const ai = getClient();

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
      }). Coba lagi.`
    );
  }

  return text;
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
