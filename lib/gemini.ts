import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

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
    },
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

/**
 * Parser JSON defensif. Meski sudah minta JSON murni, model kadang tetap
 * membungkus dengan markdown fence (```json ... ```). Fungsi ini strip fence
 * itu sebagai fallback sebelum JSON.parse.
 */
export function parseJsonResponse<T>(raw: string): T {
  let text = raw.trim();

  // Strip markdown fence bila ada: ```json ... ``` atau ``` ... ```
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    text = text.trim();
  }

  // Fallback terakhir: ambil dari kurung kurawal pertama sampai terakhir.
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
    throw new Error("Gagal parse respons AI sebagai JSON. Coba lagi.");
  }
}
