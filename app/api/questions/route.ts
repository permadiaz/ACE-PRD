import { NextResponse } from "next/server";
import { callGemini, parseJsonResponse, QUESTIONS_SCHEMA } from "@/lib/gemini";
import { QUESTIONS_SYSTEM_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";

type QuestionsResponse = { questions: string[] };

export async function POST(req: Request) {
  let body: { brainDump?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const brainDump = (body.brainDump ?? "").trim();
  if (brainDump.length < 10) {
    return NextResponse.json(
      { error: "Brain dump terlalu pendek. Ceritakan idemu minimal beberapa kalimat." },
      { status: 400 }
    );
  }

  try {
    const raw = await callGemini(
      QUESTIONS_SYSTEM_PROMPT,
      `Brain dump user:\n\n${brainDump}`,
      QUESTIONS_SCHEMA
    );
    const parsed = parseJsonResponse<QuestionsResponse>(raw);

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Format pertanyaan tidak sesuai.");
    }

    // Jaga-jaga: batasi tepat 4 pertanyaan.
    return NextResponse.json({ questions: parsed.questions.slice(0, 4) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
