import { NextResponse } from "next/server";
import { callGemini, parseJsonResponse, GENERATE_SCHEMA } from "@/lib/gemini";
import { GENERATE_SYSTEM_PROMPT } from "@/lib/prompts";
import type { GenerateResult } from "@/lib/types";

export const runtime = "nodejs";

type QAPair = { question: string; answer: string };

export async function POST(req: Request) {
  let body: { brainDump?: string; qa?: QAPair[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const brainDump = (body.brainDump ?? "").trim();
  const qa = Array.isArray(body.qa) ? body.qa : [];

  if (brainDump.length < 10) {
    return NextResponse.json(
      { error: "Brain dump terlalu pendek." },
      { status: 400 }
    );
  }

  const qaBlock = qa
    .map((pair, i) => `Q${i + 1}: ${pair.question}\nA${i + 1}: ${pair.answer || "(dilewati)"}`)
    .join("\n\n");

  const userPrompt = `Brain dump user:\n\n${brainDump}\n\n---\n\nJawaban klarifikasi:\n\n${qaBlock}`;

  try {
    const raw = await callGemini(GENERATE_SYSTEM_PROMPT, userPrompt, GENERATE_SCHEMA);
    const parsed = parseJsonResponse<GenerateResult>(raw);

    if (!parsed.prd || !parsed.tasks || !parsed.megaPrompt) {
      throw new Error("Format hasil tidak sesuai.");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
